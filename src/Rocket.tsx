import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type CameraControlsImpl from 'camera-controls'
import { rocketSoundStart, rocketSoundStop } from './hooks/useAudio'
import { rocketFlight } from './rocketFlight'
import { clickHints } from './clickHints'
import * as THREE from 'three'

// touch screens have no hover: the pointer stays where the last tap landed, which would leave
// tapped objects stuck enlarged. They rely on the periodic pop instead.
const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

// Click the toy rocket in the pod: the camera hops onto it (chase view), it lifts out of the open pod,
// tours the whole island (front edge, past the bird's nest, round the back and the left side)
// and lands tail-first on its spot, then the camera returns to where the visitor was.
const ROCKET = 'rocket_target_t3'
// clickable cue: grow on hover and pop every PULSE_EVERY seconds while parked (scales about its base)
const HOVER_SCALE = 1.3
const PULSE_SCALE = 1.45
const PULSE_EVERY = 10
const PULSE_LEN = 0.45
const ROCKET_PARTS = ['rocket_target_t3001', 'rocket_target_t3002', 'rocket_target_t3003'] // GLTFLoader drops the dots
const IGNITION = 1.6      // s of rumble + smoke before lift-off (camera moves onto the rocket meanwhile)
const V_MAX    = 9        // m/s cruise speed
const V_LAND   = 1.2      // m/s at touchdown
const NEST = new THREE.Vector3(8.76, 5.78, -8.19) // bird on the tree (after the nest offset in Animals)
const SETTLE   = 0.8      // s of engine shut-down after touchdown
const CHASE_BACK = 4.5    // m behind the rocket
const CHASE_UP   = 1.1    // m above it (low enough to stay under the canopy on the nest pass)
// orbit limits used after the intro (ThreeView), restored after the flight
const BOUNDARY = new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(80, 50, 80))

// tour waypoints (island space, y up): pod top is ~7 m, tree canopy spans x 2..16 / z -15..-2 above y 6.5,
// cliffs reach ~19 m out and down to y -11.5
const TOUR: [number, number, number][] = [
  [2.4, 12, 1.8],      // out through the open roof
  [1, 16, 5],          // up above the pod
  [-10, 13, 12],       // over the front
  [-6, 4, 19],         // low along the front edge
  [8, 3.5, 19],
  [19, 3, 10],         // round the front-right
  [20, 3, 0],          // right side
  [15.5, 5, -2.5],     // towards the tree, outside its trunk and branches
  [11.8, 5.5, -6.5],   // slow fly-by ~3.5 m off the bird, on the side it faces
  [14.5, 5, -11],      // swing wide round the tree
  [8, 5, -16.5],
  [-2, 5, -16],        // along the back
  [-12, 4, -11],       // back-left
  [-15, 3.5, 2],       // up the left side
  [-9, 4, 12],         // low over the front-left
  [-1, 11, 10],        // over the front lawn
  [2.4, 9, 1.6],       // dropping back in
]
const SMOKE_COUNT = 48

function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.5, 'rgba(255,255,255,0.45)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

type Puff = { sp: THREE.Sprite; vel: THREE.Vector3; age: number; life: number; size: number }

export default function Rocket({ scene }: { scene: THREE.Object3D }) {
  const state = useRef({ phase: 'idle' as 'idle' | 'ignite' | 'fly' | 'settle', t: 0, spawn: 0, dist: 0, shadowTick: 0 })
  const hovered = useRef(false)
  const pulse = useRef({ requested: false, until: 0 })
  const invalidate = useThree(s => s.invalidate)
  // frameloop is on demand: the timer asks for frames, useFrame plays the pop
  useEffect(() => {
    const id = setInterval(() => { pulse.current.requested = true; invalidate() }, PULSE_EVERY * 1000)
    return () => clearInterval(id)
  }, [invalidate])
  const controls = useThree(s => s.controls) as unknown as CameraControlsImpl | null
  const cam = useRef({
    savedPos: new THREE.Vector3(), savedTarget: new THREE.Vector3(),
    pos: new THREE.Vector3(), look: new THREE.Vector3(),
    heading: new THREE.Vector3(1, 0, 0),
    limits: null as null | Record<string, number>,
  })

  const rig = useMemo(() => {
    const rocket = scene.getObjectByName(ROCKET) as THREE.Mesh | undefined
    if (!rocket?.parent) return null
    // the rocket is exported as four meshes: hang the other three under the main one so they fly together
    for (const n of ROCKET_PARTS) {
      const p = scene.getObjectByName(n)
      if (p && p.parent !== rocket) rocket.attach(p)
    }
    const parent = rocket.parent
    parent.updateWorldMatrix(true, true)
    // pivot at the bottom-centre of the rocket so it stands, tilts and lands about its base
    const box = new THREE.Box3().setFromObject(rocket)
    const baseWorld = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2)
    const base = parent.worldToLocal(baseWorld.clone())
    const height = box.max.y - box.min.y

    const group = new THREE.Group()
    group.name = 'rocket_rig'
    group.position.copy(base)

    // exhaust: two additive cones under the nozzle
    const tex = softDot()
    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.6, 16, 1, true).rotateX(Math.PI).translate(0, -0.3, 0),
      new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    )
    const flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.38, 16, 1, true).rotateX(Math.PI).translate(0, -0.19, 0),
      new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    )
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffa860', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    glow.position.y = -0.15
    glow.scale.setScalar(0.9)
    const exhaust = new THREE.Group()
    exhaust.add(flameOuter, flameInner, glow)
    exhaust.visible = false
    for (const m of [flameOuter, flameInner]) m.raycast = () => {}
    glow.raycast = () => {}
    group.add(exhaust)

    // soft contact shadow: a dark blurred disc dropped onto whatever is below the rocket
    const shadowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64
      const g = c.getContext('2d')!
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      grd.addColorStop(0, 'rgba(0,0,0,1)')
      grd.addColorStop(0.45, 'rgba(0,0,0,0.6)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    )
    shadow.name = 'rocket_shadow'
    shadow.raycast = () => {}
    shadow.renderOrder = 2

    // smoke puffs live in the parent's space so they stay where they were puffed out
    const puffs: Puff[] = []
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#d9d4e6', transparent: true, opacity: 0, depthWrite: false }))
      sp.visible = false
      sp.raycast = () => {}
      puffs.push({ sp, vel: new THREE.Vector3(), age: 0, life: 1, size: 1 })
    }

    // flight path: straight up out of the pod, the island tour, straight back down onto the pad
    const B = base.clone()
    const pts = [B.clone(), B.clone().add(new THREE.Vector3(0, 3, 0)), ...TOUR.map(p => new THREE.Vector3(...p)), B.clone().add(new THREE.Vector3(0, 2, 0)), B.clone()]
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal')

    return { rocket, parent, group, exhaust, flameOuter, flameInner, glow, puffs, path, length: path.getLength(), base, height, tex, shadow, shadowTex }
  }, [scene])

  useEffect(() => {
    if (!rig) return
    const { rocket, parent, group, puffs } = rig
    parent.add(group)
    group.attach(rocket)
    puffs.forEach(p => parent.add(p.sp))
    parent.add(rig.shadow)
    rocket.userData.onClick = () => {
      if (state.current.phase === 'idle') { clickHints.mark('rocket'); state.current = { phase: 'ignite', t: 0, spawn: 0, dist: 0, shadowTick: 0 }; rocketFlight.set(true) }
    }
    return () => {
      delete rocket.userData.onClick
      rocketFlight.set(false)
      parent.attach(rocket)
      parent.remove(group)
      puffs.forEach(p => { parent.remove(p.sp); p.sp.material.dispose() })
      rig.tex.dispose()
      parent.remove(rig.shadow); rig.shadowTex.dispose(); rig.shadow.geometry.dispose(); rig.shadow.material.dispose()
    }
  }, [rig])

  const _p = useMemo(() => new THREE.Vector3(), [])
  const _tan = useMemo(() => new THREE.Vector3(), [])
  const _up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const _q = useMemo(() => new THREE.Quaternion(), [])
  const _nozzle = useMemo(() => new THREE.Vector3(), [])
  const _cp = useMemo(() => new THREE.Vector3(), [])
  const _ray = useMemo(() => new THREE.Raycaster(), [])
  const _o = useMemo(() => new THREE.Vector3(), [])
  const _down = useMemo(() => new THREE.Vector3(), [])
  const _n = useMemo(() => new THREE.Vector3(), [])
  const _cl = useMemo(() => new THREE.Vector3(), [])

  useFrame((s, dt) => {
    if (!rig) return
    const { rocket, group, exhaust, flameOuter, flameInner, glow, puffs, path, length, base, parent } = rig
    dt = Math.min(dt, 0.05)
    const st = state.current

    // hover cue
    const hit = CAN_HOVER && st.phase === 'idle' && s.raycaster.intersectObject(rocket, true).length > 0
    if (hit !== hovered.current) {
      hovered.current = hit
      document.body.style.cursor = hit ? 'pointer' : 'auto'
    }

    // scale cue (group pivot is the rocket's base, so it grows upward from where it stands)
    const now = s.clock.elapsedTime
    if (pulse.current.requested) { pulse.current.requested = false; pulse.current.until = now + PULSE_LEN }
    const pulsing = now < pulse.current.until
    const targetScale = st.phase !== 'idle' ? 1 : hit ? HOVER_SCALE : pulsing ? PULSE_SCALE : 1
    if (Math.abs(group.scale.x - targetScale) > 1e-4) {
      group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, targetScale, 14, dt))
      invalidate()
    }

    let thrust = 0
    if (st.phase !== 'idle') st.t += dt
    const c = cam.current

    const startRide = () => {
      void rocketSoundStart()
      // hand the camera over to the rocket: remember the visitor's view and lift the orbit limits
      if (!controls) return
      controls.getPosition(c.savedPos); controls.getTarget(c.savedTarget)
      c.limits = {
        minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle,
        minAzimuthAngle: controls.minAzimuthAngle, maxAzimuthAngle: controls.maxAzimuthAngle,
        minDistance: controls.minDistance, maxDistance: controls.maxDistance,
      }
      controls.enabled = false
      controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI
      controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity
      controls.minDistance = 0; controls.maxDistance = Infinity
      controls.setBoundary()
      c.heading.set(base.x - c.savedPos.x, 0, base.z - c.savedPos.z).normalize()
      c.pos.copy(c.savedPos); c.look.copy(c.savedTarget)
    }
    const endRide = () => {
      rocketSoundStop()
      if (!controls) return
      controls.setLookAt(c.savedPos.x, c.savedPos.y, c.savedPos.z, c.savedTarget.x, c.savedTarget.y, c.savedTarget.z, true)
      // restore the limits once the camera is back
      setTimeout(() => {
        if (c.limits) Object.assign(controls, c.limits)
        controls.setBoundary(BOUNDARY)
        controls.enabled = true
      }, 1400)
    }
    // chase point: behind the rocket along its horizontal heading, a little above, looking ahead of it
    const chase = (rocketPos: THREE.Vector3, dir: THREE.Vector3, outPos: THREE.Vector3, outLook: THREE.Vector3) => {
      const hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz)
      if (hl > 0.25) c.heading.set(hx / hl, 0, hz / hl) // keep the last heading while climbing / dropping vertically
      // near the nest: pull in close and turn the camera onto the bird
      const w = 1 - THREE.MathUtils.smoothstep(rocketPos.distanceTo(NEST), 2, 9)
      outPos.copy(rocketPos).addScaledVector(c.heading, -CHASE_BACK * (1 - 0.55 * w)); outPos.y += CHASE_UP * (1 - 0.4 * w)
      outLook.copy(rocketPos).addScaledVector(dir, 3); outLook.y += 0.4
      outLook.lerp(NEST, 0.9 * w)
    }

    if (st.phase === 'ignite') {
      if (st.t === dt) startRide()
      const k = st.t / IGNITION
      thrust = Math.min(1, k * 1.3)
      group.position.copy(base)
      group.position.x += (Math.random() - 0.5) * 0.02 * k
      group.position.z += (Math.random() - 0.5) * 0.02 * k
      // glide from the visitor's view onto the rocket
      _up.set(0, 1, 0)
      chase(base, _up, _cp, _cl)
      const e = k * k * (3 - 2 * k)
      c.pos.lerpVectors(c.savedPos, _cp, e); c.look.lerpVectors(c.savedTarget, _cl, e)
      controls?.setLookAt(c.pos.x, c.pos.y, c.pos.z, c.look.x, c.look.y, c.look.z, false)
      if (st.t >= IGNITION) { st.phase = 'fly'; st.t = 0 }
    } else if (st.phase === 'fly') {
      // speed: ramp up off the pad, slow right down past the nest, brake for touchdown
      const uNow = Math.min(1, st.dist / length)
      path.getPointAt(uNow, _p)
      const nearNest = THREE.MathUtils.smoothstep(_p.distanceTo(NEST), 2.5, 8)
      const remaining = length - st.dist
      const v = Math.max(nearNest < 0.5 ? 0.45 : V_LAND, V_MAX * Math.min(1, 0.15 + st.t / 3) * (0.06 + 0.94 * nearNest) * Math.min(1, remaining / 14)) // ~0.5 m/s drifting past the bird
      st.dist = Math.min(length, st.dist + v * dt)
      const u = st.dist / length
      const k = u
      path.getPointAt(u, _p)
      path.getTangentAt(Math.min(u, 0.999), _tan)
      group.position.copy(_p)
      chase(_p, _tan, _cp, _cl)
      const f = 1 - Math.exp(-3.5 * dt)
      c.pos.lerp(_cp, f); c.look.lerp(_cl, f)
      controls?.setLookAt(c.pos.x, c.pos.y, c.pos.z, c.look.x, c.look.y, c.look.z, false)
      // lean into the direction of travel but stay nose-up (it comes down tail-first, like a lander)
      _tan.set(_tan.x, Math.abs(_tan.y) + 0.6, _tan.z).normalize()
      _q.setFromUnitVectors(_up.set(0, 1, 0), _tan)
      group.quaternion.slerp(_q, 1 - Math.exp(-8 * dt))
      thrust = k > 0.9 ? 0.6 : 1 // throttle back for the landing burn
      if (k >= 1) { st.phase = 'settle'; st.t = 0; group.position.copy(base); endRide() }
    } else if (st.phase === 'settle') {
      thrust = Math.max(0, 0.6 * (1 - st.t / SETTLE))
      group.quaternion.slerp(_q.identity(), 1 - Math.exp(-10 * dt))
      if (st.t >= SETTLE) { rig.shadow.userData.placed = false; st.phase = 'idle'; st.t = 0; group.quaternion.identity(); group.position.copy(base); rocketFlight.set(false) }
    }

    // shadow: cast straight down from the rocket's base onto the island (skip the rocket's own parts)
    st.shadowTick = (st.shadowTick + 1) % 3
    const sh = rig.shadow
    if (st.phase === 'idle' ? !sh.userData.placed : st.shadowTick === 0) {
      sh.userData.placed = st.phase === 'idle'
      _ray.set(group.getWorldPosition(_o).add(_down.set(0, 0.05, 0)), _down.set(0, -1, 0))
      _ray.far = 40
      const hits = _ray.intersectObject(parent, true)
      const hitAt = hits.find(h => {
        let o: THREE.Object3D | null = h.object
        while (o) { if (o === group) return false; o = o.parent }
        return (h.object as THREE.Mesh).isMesh && h.object.visible
      })
      if (hitAt) {
        const height = hitAt.distance
        sh.visible = true
        sh.position.copy(parent.worldToLocal(hitAt.point.clone()))
        if (hitAt.face) {
          _n.copy(hitAt.face.normal).transformDirection(hitAt.object.matrixWorld)
          sh.quaternion.setFromUnitVectors(_up.set(0, 1, 0), _n)
        }
        sh.scale.setScalar(0.45 + height * 0.09)
        sh.material.opacity = 0.35 * (1 - THREE.MathUtils.smoothstep(height, 1, 14))
      } else {
        sh.visible = false
      }
    }

    // flame flicker
    exhaust.visible = thrust > 0.02
    if (exhaust.visible) {
      const f = 0.85 + Math.random() * 0.3
      flameOuter.scale.set(thrust, thrust * f, thrust)
      flameInner.scale.set(thrust, thrust * (0.9 + Math.random() * 0.25), thrust)
      glow.material.opacity = 0.6 * thrust
      glow.scale.setScalar(0.6 + 0.5 * thrust)
    }

    // smoke
    st.spawn -= dt
    if (thrust > 0.25 && st.spawn <= 0) {
      st.spawn = st.phase === 'fly' ? 0.06 : 0.04
      const puff = puffs.find(p => !p.sp.visible)
      if (puff) {
        _nozzle.set(0, -0.1, 0)
        group.localToWorld(_nozzle); parent.worldToLocal(_nozzle)
        puff.sp.position.copy(_nozzle)
        puff.vel.set((Math.random() - 0.5) * 0.6, st.phase === 'fly' ? -0.3 : 0.15, (Math.random() - 0.5) * 0.6)
        puff.age = 0; puff.life = 1.4 + Math.random() * 0.8; puff.size = 0.35 + Math.random() * 0.25
        puff.sp.visible = true
      }
    }
    for (const p of puffs) {
      if (!p.sp.visible) continue
      p.age += dt
      const k = p.age / p.life
      if (k >= 1) { p.sp.visible = false; continue }
      p.sp.position.addScaledVector(p.vel, dt)
      p.vel.multiplyScalar(1 - 1.5 * dt)
      p.sp.scale.setScalar(p.size * (1 + k * 2.5))
      p.sp.material.opacity = 0.55 * (1 - k) * Math.min(1, k * 6)
    }
  })

  return null
}
