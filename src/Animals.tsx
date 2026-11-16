import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Data exported from Blender (three.js coordinates, Y up)
// ---------------------------------------------------------------------------

// Closed loop around the front-right meadow, sampled on the ground surface.
const TURTLE_PATH: [number, number, number][] = [[6.5,-0.54,8.15],[6.54,-0.53,7.98],[6.55,-0.52,7.81],[6.51,-0.52,7.65],[6.42,-0.52,7.5],[6.28,-0.52,7.36],[6.09,-0.53,7.23],[5.87,-0.53,7.12],[5.62,-0.54,7.02],[5.36,-0.55,6.95],[5.1,-0.56,6.89],[4.84,-0.57,6.86],[4.6,-0.58,6.85],[4.38,-0.59,6.86],[4.19,-0.6,6.89],[4.02,-0.6,6.95],[3.88,-0.6,7.02],[3.74,-0.6,7.12],[3.62,-0.6,7.23],[3.5,-0.61,7.36],[3.38,-0.61,7.5],[3.27,-0.61,7.65],[3.17,-0.62,7.81],[3.07,-0.62,7.98],[3.0,-0.63,8.15],[2.96,-0.63,8.32],[2.95,-0.64,8.49],[2.99,-0.65,8.65],[3.08,-0.65,8.8],[3.22,-0.66,8.94],[3.41,-0.67,9.07],[3.63,-0.67,9.18],[3.87,-0.68,9.28],[4.14,-0.68,9.35],[4.4,-0.69,9.41],[4.66,-0.69,9.44],[4.9,-0.68,9.45],[5.12,-0.67,9.44],[5.31,-0.66,9.41],[5.48,-0.64,9.35],[5.62,-0.63,9.28],[5.76,-0.62,9.18],[5.88,-0.61,9.07],[6.0,-0.6,8.94],[6.12,-0.58,8.8],[6.23,-0.57,8.65],[6.33,-0.56,8.49],[6.43,-0.55,8.32]]


// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
const TURTLE_SPEED = 0.22          // world units / second
const TURTLE_WALK_MIN = 7          // seconds walking before a pause
const TURTLE_WALK_MAX = 14
const TURTLE_PAUSE_MIN = 2         // seconds paused (looks around)
const TURTLE_PAUSE_MAX = 4


const rand = (a: number, b: number) => a + Math.random() * (b - a)

// Soft round shadow texture shared by the blob shadows
function useBlobShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(0,0,0,0.55)')
    grad.addColorStop(0.6, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

// ---------------------------------------------------------------------------
// Turtle
// ---------------------------------------------------------------------------
function Turtle({ scene, shadowTex }: { scene: THREE.Object3D; shadowTex: THREE.Texture }) {
  const shadowRef = useRef<THREE.Mesh>(null)

  const rig = useMemo(() => {
    const body = scene.getObjectByName('turtle_body_t8')
    if (!body) return null
    const part = (n: string) => scene.getObjectByName(n) ?? null
    const legs = {
      fl: part('turtle_leg_fl_t8'), fr: part('turtle_leg_fr_t8'),
      bl: part('turtle_leg_bl_t8'), br: part('turtle_leg_br_t8'),
    }
    const head = part('turtle_head_t8')
    const curve = new THREE.CatmullRomCurve3(TURTLE_PATH.map(p => new THREE.Vector3(...p)), true, 'centripetal')
    return {
      body, head, legs, curve,
      length: curve.getLength(),
      headRest: head?.rotation.clone(),
      legRest: Object.fromEntries(Object.entries(legs).map(([k, o]) => [k, o?.rotation.clone()])) as Record<string, THREE.Euler | undefined>,
    }
  }, [scene])

  const state = useRef({ u: 0, walking: true, phaseEnds: rand(TURTLE_WALK_MIN, TURTLE_WALK_MAX), gait: 0, pauseStart: 0 })
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), tan: new THREE.Vector3(), look: new THREE.Vector3() }), [])

  useFrame((s, delta) => {
    if (!rig) return
    const st = state.current
    const t = s.clock.elapsedTime
    const dt = Math.min(delta, 0.05)

    // walk / pause state machine
    if (t > st.phaseEnds) {
      st.walking = !st.walking
      st.pauseStart = t
      st.phaseEnds = t + (st.walking ? rand(TURTLE_WALK_MIN, TURTLE_WALK_MAX) : rand(TURTLE_PAUSE_MIN, TURTLE_PAUSE_MAX))
    }

    // ease speed in/out around pauses
    const sinceSwitch = t - st.pauseStart
    const speedFactor = st.walking ? Math.min(1, sinceSwitch / 0.8) : Math.max(0, 1 - sinceSwitch / 0.5)
    st.u = (st.u + (TURTLE_SPEED * speedFactor * dt) / rig.length) % 1
    st.gait += dt * 7 * speedFactor

    rig.curve.getPointAt(st.u, tmp.p)
    rig.curve.getTangentAt(st.u, tmp.tan)
    rig.body.position.copy(tmp.p)
    rig.body.position.y += Math.abs(Math.sin(st.gait)) * 0.015 // tiny waddle bob
    tmp.look.copy(tmp.p).add(tmp.tan)
    rig.body.lookAt(tmp.look)                                   // +Z faces the walking direction, pitches with the slope
    rig.body.rotateZ(Math.sin(st.gait) * 0.03)                  // side-to-side waddle

    // legs: diagonal pairs paddle together (front-left with back-right)
    const swing = Math.sin(st.gait) * 0.55 * speedFactor
    const lift = Math.max(0, Math.cos(st.gait)) * 0.25 * speedFactor
    const setLeg = (k: 'fl' | 'fr' | 'bl' | 'br', sgn: number) => {
      const leg = rig.legs[k]; const rest = rig.legRest[k]
      if (!leg || !rest) return
      leg.rotation.set(rest.x - lift * sgn * 0.5, rest.y + swing * sgn, rest.z)
    }
    setLeg('fl', 1); setLeg('br', 1); setLeg('fr', -1); setLeg('bl', -1)

    // head: gentle bob while walking, looks left/right while paused
    if (rig.head && rig.headRest) {
      const look = st.walking ? 0 : Math.sin((t - st.pauseStart) * 1.6) * 0.6
      rig.head.rotation.set(
        rig.headRest.x + Math.sin(st.gait * 2) * 0.05 * speedFactor,
        THREE.MathUtils.damp(rig.head.rotation.y, rig.headRest.y + look, 4, dt),
        rig.headRest.z,
      )
    }

    if (shadowRef.current) {
      shadowRef.current.position.set(tmp.p.x, tmp.p.y + 0.03, tmp.p.z)
    }
  })

  if (!rig) return null
  return (
    <mesh ref={shadowRef} rotation-x={-Math.PI / 2} renderOrder={1} raycast={() => null}>
      <planeGeometry args={[1.3, 1.3]} />
      <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Satellite: slow orbit around the pod, above the tree and the dome
// ---------------------------------------------------------------------------
const SAT_CENTER = new THREE.Vector3(-0.18, 0, -0.02) // pod centre (three.js coords)
const SAT_RADIUS = 12
const SAT_HEIGHT = 14.5  // above the tree canopy (top ~11.5)
const SAT_BOB = 0.8          // gentle up/down over one lap (tilted orbit)
const SAT_SPEED = 0.12       // radians / second (~52 s per lap)

function Satellite({ scene }: { scene: THREE.Object3D }) {
  const sat = useMemo(() => scene.getObjectByName('satellite_t8') ?? null, [scene])
  const angle = useRef(0.5)
  useFrame((s, delta) => {
    if (!sat) return
    const t = s.clock.elapsedTime
    angle.current += SAT_SPEED * Math.min(delta, 0.05)
    const a = angle.current
    sat.position.set(
      SAT_CENTER.x + Math.cos(a) * SAT_RADIUS,
      SAT_HEIGHT + Math.sin(a) * SAT_BOB,
      SAT_CENTER.z + Math.sin(a) * SAT_RADIUS,
    )
    // slow spin on its own axis with a lazy tumble
    sat.rotation.set(Math.sin(t * 0.21) * 0.25, t * 0.3, Math.sin(t * 0.17) * 0.2)
  })
  return null
}


// ---------------------------------------------------------------------------
// Nest bird: breathes, looks around, pecks, flutters its wings, hops and turns
// ---------------------------------------------------------------------------
const _w = new THREE.Vector3()
const _d = new THREE.Vector3()
function NestBird({ scene }: { scene: THREE.Object3D }) {
  const rig = useMemo(() => {
    const body = scene.getObjectByName('bird_body_t3')
    if (!body) return null
    const part = (n: string) => scene.getObjectByName(n) ?? null
    const head = part('bird_head_t3'), wl = part('bird_wing_l_t3'), wr = part('bird_wing_r_t3')
    // the trunk was rebuilt slimmer, so pull the nest + bird back against the bark (once)
    if (!body.userData.nestShifted) {
      // move the nest (and the bird on it) up into the fork where the trunk splits into branches
      const off = new THREE.Vector3(-0.38, 1.79, -1.01)
      body.position.add(off)
      part('nest_target_t3')?.position.add(off)
      body.userData.nestShifted = true
    }
    return {
      body, head, wl, wr,
      bodyPos: body.position.clone(), bodyRot: body.rotation.clone(),
      headRot: head?.rotation.clone(), wlRot: wl?.rotation.clone(), wrRot: wr?.rotation.clone(),
    }
  }, [scene])

  // soft warm halo so the bird reads from a distance
  const halo = useMemo(() => {
    if (!rig?.body.parent) return null
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,240,205,0.85)')
    grd.addColorStop(0.3, 'rgba(255,228,180,0.4)')
    grd.addColorStop(0.65, 'rgba(255,215,160,0.1)')
    grd.addColorStop(1, 'rgba(255,210,150,0)')
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7, fog: false })
    const sp = new THREE.Sprite(mat)
    sp.name = 'bird_halo'
    // centre the glow on the bird's visible body + head, not on the body's pivot (which sits low, in the nest)
    rig.body.updateWorldMatrix(true, true)
    const bb = new THREE.Box3().setFromObject(rig.body)
    if (rig.head) bb.union(new THREE.Box3().setFromObject(rig.head))
    const centre = rig.body.parent.worldToLocal(bb.getCenter(new THREE.Vector3()))
    sp.userData.centreOffset = centre.sub(rig.bodyPos)
    sp.position.copy(rig.bodyPos).add(sp.userData.centreOffset)
    sp.scale.setScalar(2)
    sp.renderOrder = 10
    sp.frustumCulled = false
    sp.raycast = () => null
    return sp
  }, [rig])
  useEffect(() => {
    if (!halo || !rig?.body.parent) return
    const parent = rig.body.parent
    parent.add(halo)
    return () => { parent.remove(halo); halo.material.map?.dispose(); halo.material.dispose() }
  }, [halo, rig])

  const st = useRef({
    yaw: 0, yawT: 0, tilt: 0, tiltT: 0, nextLook: 1,
    turn: 0, turnT: 0, nextTurn: rand(6, 12),
    peckStart: -10, nextPeck: rand(3, 7),
    flapStart: -10, nextFlap: rand(4, 9),
    hopStart: -10,
  })

  useFrame((s, delta) => {
    if (!rig) return
    const t = s.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const b = st.current

    // look around: new head target every 1-3 s
    if (t > b.nextLook) {
      b.yawT = rand(-0.9, 0.9)
      b.tiltT = Math.random() < 0.35 ? rand(-0.35, 0.35) : 0
      b.nextLook = t + rand(1, 3)
    }
    b.yaw = THREE.MathUtils.damp(b.yaw, b.yawT, 10, dt)     // quick, bird-like head snaps
    b.tilt = THREE.MathUtils.damp(b.tilt, b.tiltT, 8, dt)

    // peck at the nest now and then
    if (t > b.nextPeck) { b.peckStart = t; b.nextPeck = t + rand(4, 9) }
    const pk = t - b.peckStart
    const peck = pk < 0.6 ? Math.sin((pk / 0.6) * Math.PI * 2) ** 2 * 0.55 : 0

    // occasional hop + turn on the nest
    if (t > b.nextTurn) { b.turnT = rand(-0.7, 0.7); b.hopStart = t; b.nextTurn = t + rand(8, 15) }
    b.turn = THREE.MathUtils.damp(b.turn, b.turnT, 6, dt)
    const hp = t - b.hopStart
    const hop = hp < 0.35 ? Math.sin((hp / 0.35) * Math.PI) * 0.08 : 0

    // wing flutter bursts
    if (t > b.nextFlap) { b.flapStart = t; b.nextFlap = t + rand(5, 11) }
    const fp = t - b.flapStart
    const flap = fp < 0.7 ? Math.abs(Math.sin(fp * 28)) * 0.9 * (1 - fp / 0.7) : 0
    const flapHop = hp < 0.35 ? Math.sin((hp / 0.35) * Math.PI) * 0.6 : 0 // wings open during a hop

    // body: breathing + hop + turn
    const breathe = Math.sin(t * 3.2) * 0.025
    if (halo) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6)
      halo.material.opacity = 0.45 + 0.2 * pulse
      halo.scale.setScalar(1.0 + 0.2 * pulse)
      // brighten the bird itself so it reads against the bark (materials are assigned after the textures load)
      for (const o of [rig.body, rig.head, rig.wl, rig.wr]) {
        const m = (o as THREE.Mesh | null)?.material as THREE.MeshBasicMaterial | undefined
        if (m && !m.userData.birdLit) { m.color.setScalar(2.4); m.userData.birdLit = true }
      }
      // pull the glow toward the camera so the fork's bark doesn't clip it, but the pod / canopy still hide it from behind
      const parent = halo.parent
      if (parent) {
        _w.copy(rig.bodyPos).add(halo.userData.centreOffset); _w.y += hop
        parent.localToWorld(_w)
        _d.copy(s.camera.position).sub(_w).normalize()
        _w.addScaledVector(_d, 0.6)
        halo.position.copy(parent.worldToLocal(_w))
      }
    }
    rig.body.position.set(rig.bodyPos.x, rig.bodyPos.y + hop, rig.bodyPos.z)
    rig.body.rotation.set(rig.bodyRot.x, rig.bodyRot.y + b.turn, rig.bodyRot.z)
    rig.body.scale.set(1, 1 + breathe, 1 + breathe * 0.6)

    if (rig.head && rig.headRot) {
      rig.head.rotation.set(rig.headRot.x + b.tilt, rig.headRot.y + b.yaw * (1 - peck), rig.headRot.z - peck)
    }
    const w = Math.max(flap, flapHop)
    if (rig.wl && rig.wlRot) rig.wl.rotation.set(rig.wlRot.x + w, rig.wlRot.y, rig.wlRot.z)
    if (rig.wr && rig.wrRot) rig.wr.rotation.set(rig.wrRot.x - w, rig.wrRot.y, rig.wrRot.z)
  })
  return null
}

// ---------------------------------------------------------------------------
export default function Animals({ scene }: { scene: THREE.Object3D }) {
  const shadowTex = useBlobShadowTexture()
  // the animals move, so they must not be frustum-culled at their exported rest position
  useEffect(() => {
    scene.traverse((o) => {
      if (/^(turtle_|satellite_|bird_)/.test(o.name)) o.frustumCulled = false
    })
  }, [scene])

  return (
    <>
      <Turtle scene={scene} shadowTex={shadowTex} />
      <Satellite scene={scene} />
      <NestBird scene={scene} />
    </>
  )
}
