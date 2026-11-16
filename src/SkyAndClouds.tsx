import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Billboard, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'
import CloudMaterial from './CloudMaterial'

// ---------------------------------------------------------------------------
// "High above Earth at night": twilight sky with a hazy horizon, a dark
// landscape far below with town lights, clouds below and around the island,
// and a moon. Everything here is unlit, so no re-bake is needed.
// ---------------------------------------------------------------------------

export const GROUND_Y = -150 // the Earth's surface, far below the island
export const HAZE = '#4a3f78' // horizon haze; also used as the fog colour

const SKY = {
  zenith: '#151a3a',
  upper: '#34336f',
  horizon: '#8d6aa8',
  below: '#4a3f78',
}
// daytime palette (the light switch flips the whole scene between night and day)
const SKY_DAY = {
  zenith: '#2f6fcf',
  upper: '#69a3e8',
  horizon: '#e9dcc6',
  below: '#a9bfd6',
}
export const HAZE_DAY = '#b9c9dc'

// 0 = night, 1 = day; shared by every sky element so they fade together
const dayU = { value: 0 }

const MOON_DIR = new THREE.Vector3(-6, 26, 32).normalize() // same direction as the Blender moonlight

// ---------------------------------------------------------------------------
function GradientSky({ radius = 1500 }: { radius?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new THREE.Color(SKY.zenith) },
          uUpper: { value: new THREE.Color(SKY.upper) },
          uHorizon: { value: new THREE.Color(SKY.horizon) },
          uBelow: { value: new THREE.Color(SKY.below) },
          uZenithD: { value: new THREE.Color(SKY_DAY.zenith) },
          uUpperD: { value: new THREE.Color(SKY_DAY.upper) },
          uHorizonD: { value: new THREE.Color(SKY_DAY.horizon) },
          uBelowD: { value: new THREE.Color(SKY_DAY.below) },
          uDay: dayU,
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith; uniform vec3 uUpper; uniform vec3 uHorizon; uniform vec3 uBelow;
          uniform vec3 uZenithD; uniform vec3 uUpperD; uniform vec3 uHorizonD; uniform vec3 uBelowD;
          uniform float uDay;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 zen = mix(uZenith, uZenithD, uDay); vec3 upp = mix(uUpper, uUpperD, uDay);
            vec3 hor = mix(uHorizon, uHorizonD, uDay); vec3 bel = mix(uBelow, uBelowD, uDay);
            vec3 col = h < 0.0
              ? mix(hor, bel, smoothstep(0.0, 0.12, -h))
              : mix(mix(hor, upp, smoothstep(0.0, 0.16, h)), zen, smoothstep(0.16, 0.7, h));
            col += hor * (0.35 - 0.2 * uDay) * exp(-abs(h) * 30.0); // glowing band of atmosphere at the horizon
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  return (
    <mesh material={material} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Night landscape: patchwork fields, darker forests and a river, fading into the haze
function Ground() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uHaze: { value: new THREE.Color(HAZE) }, uHazeD: { value: new THREE.Color(HAZE_DAY) }, uDay: dayU },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uHaze; uniform vec3 uHazeD; uniform float uDay;
          varying vec3 vWorld;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
          }
          void main() {
            vec2 p = vWorld.xz;
            vec2 cell = floor(p / 22.0 + vec2(noise(p * 0.01) * 2.0));            // patchwork fields
            vec3 field = mix(vec3(0.045, 0.07, 0.05), vec3(0.09, 0.085, 0.06), hash(cell));
            float forest = smoothstep(0.55, 0.7, noise(p * 0.006 + 7.0));          // forests
            field = mix(field, vec3(0.025, 0.045, 0.035), forest);
            float river = abs(sin(p.x * 0.004 + noise(p * 0.003) * 3.0) * 260.0 - p.y + 120.0);
            field = mix(field, vec3(0.16, 0.14, 0.3), 1.0 - smoothstep(3.0, 7.0, river)); // river reflecting the sky
            field = mix(field, field * 4.5 + vec3(0.04, 0.08, 0.02), uDay);            // daylight fields
            float d = length(vWorld - cameraPosition);
            vec3 col = mix(field, mix(uHaze, uHazeD, uDay), smoothstep(150.0, 1100.0, d));             // fade into the horizon haze
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  return (
    <mesh material={material} position={[0, GROUND_Y, 0]} rotation-x={-Math.PI / 2} frustumCulled={false}>
      <circleGeometry args={[1400, 64]} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Town lights: clusters of warm points plus lights along roads, twinkling slightly
function TownLights({ count = 3200 }: { count?: number }) {
  const geometry = useMemo(() => {
    let s = 7
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    const pos: number[] = []
    const col: number[] = []
    const seed: number[] = []
    const towns: { x: number; z: number; r: number }[] = []
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2
      const d = 90 + rnd() * 700
      towns.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 8 + rnd() * 30 })
    }
    const palette = [new THREE.Color('#ffb35a'), new THREE.Color('#ffd27a'), new THREE.Color('#ff8a3d'), new THREE.Color('#cfe6ff')]
    for (let i = 0; i < count; i++) {
      let x: number
      let z: number
      if (i < count * 0.8) {
        const t = towns[Math.floor(rnd() * towns.length)]
        const a = rnd() * Math.PI * 2
        const d = Math.pow(rnd(), 1.8) * t.r
        x = t.x + Math.cos(a) * d
        z = t.z + Math.sin(a) * d
      } else {
        const a = towns[Math.floor(rnd() * towns.length)]
        const b = towns[Math.floor(rnd() * towns.length)]
        const k = rnd()
        x = a.x + (b.x - a.x) * k
        z = a.z + (b.z - a.z) * k
      }
      pos.push(x, GROUND_Y + 0.5, z)
      const c = palette[rnd() < 0.85 ? Math.floor(rnd() * 3) : 3]
      col.push(c.r, c.g, c.b)
      seed.push(rnd() * 100)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uDay: dayU },
        vertexShader: /* glsl */ `
          attribute float seed;
          uniform float uTime;
          varying vec3 vColor; varying float vFade;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float d = -mv.z;
            vColor = color * (0.75 + 0.25 * sin(uTime * 2.0 + seed));
            vFade = 1.0 - smoothstep(500.0, 1300.0, d);
            gl_PointSize = clamp(900.0 / d, 1.0, 6.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uDay;
          varying vec3 vColor; varying float vFade;
          void main() {
            float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vFade * (1.0 - uDay);
            gl_FragColor = vec4(vColor * a, a);
          }
        `,
        vertexColors: true,
      }),
    [],
  )

  useFrame((st) => {
    material.uniforms.uTime.value = st.clock.elapsedTime
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ---------------------------------------------------------------------------
function Moon() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const glow = g.createRadialGradient(128, 128, 30, 128, 128, 128)
    glow.addColorStop(0, 'rgba(230,225,255,0.55)')
    glow.addColorStop(1, 'rgba(230,225,255,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#efeaff'
    g.beginPath(); g.arc(128, 128, 36, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(160,150,200,0.35)' // soft craters
    for (const [x, y, r] of [[116, 118, 8], [140, 136, 6], [122, 144, 5], [142, 114, 4]]) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const p = useMemo(() => MOON_DIR.clone().multiplyScalar(1200), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }), [tex])
  useFrame(() => { mat.opacity = 1 - dayU.value })
  return (
    <Billboard position={p}>
      <mesh renderOrder={-1} material={mat}>
        <planeGeometry args={[260, 260]} />
      </mesh>
    </Billboard>
  )
}

// ---------------------------------------------------------------------------
// Clouds: a sea below the island (with gaps to see the towns), one bank on the
// intro flight path to fly through, and a few at island height far out.
type CloudDef = {
  position: [number, number, number]; scale: number; color: string; seed: number
  opacity?: number; bounds?: [number, number, number]
}
const CLOUDS: CloudDef[] = [
  { position: [0, -24, 0], scale: 1.6, color: '#b9a3d6', seed: 1 },
  { position: [22, -26, 10], scale: 1.4, color: '#c7a6c9', seed: 2 },
  { position: [-20, -25, 14], scale: 1.4, color: '#a99bd4', seed: 3 },
  { position: [10, -27, -22], scale: 1.5, color: '#b6a0d8', seed: 4 },
  { position: [-18, -26, -18], scale: 1.3, color: '#c2a9d2', seed: 5 },
  { position: [38, -28, -10], scale: 1.6, color: '#d0aac8', seed: 6 },
  { position: [-36, -28, -2], scale: 1.6, color: '#a596cf', seed: 8 },
  { position: [2, -28, 38], scale: 1.5, color: '#bfa7d4', seed: 9 },
  { position: [46, -26, 40], scale: 1.4, color: '#c9aed6', seed: 10 }, // the intro camera flies through this one
  { position: [-80, 4, -40], scale: 2.2, color: '#9d8cc4', seed: 21, opacity: 0.35, bounds: [22, 3, 10] },
  { position: [60, 9, -95], scale: 2.4, color: '#a493c9', seed: 22, opacity: 0.3, bounds: [24, 3, 10] },
  { position: [-40, 12, 90], scale: 2.0, color: '#9a8bc2', seed: 23, opacity: 0.3, bounds: [20, 3, 10] },
  { position: [110, -4, 30], scale: 2.4, color: '#a896cb', seed: 24, opacity: 0.32, bounds: [24, 3, 12] },
]

const DAY_CLOUD = ['#ffffff', '#f3f5fa', '#e9eef7', '#f7f3ee']
const fogNight = new THREE.Color(HAZE)
const fogDay = new THREE.Color(HAZE_DAY)

export default function SkyAndClouds({ night = true }: { night?: boolean }) {
  const { scene, invalidate } = useThree()
  useEffect(() => {
    gsap.to(dayU, { value: night ? 0 : 1, duration: 0.8, ease: 'power2.inOut', overwrite: true, onUpdate: invalidate })
  }, [night])
  useFrame(() => {
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogNight).lerp(fogDay, dayU.value)
  })
  return (
    <>
      <fog attach="fog" args={[HAZE, 160, 1100]} />
      <GradientSky />
      <Moon />
      <Ground />
      <TownLights />
      <Clouds material={CloudMaterial} limit={500} frustumCulled={false}>
        {CLOUDS.map((c) => (
          <Cloud
            key={c.seed}
            seed={c.seed}
            position={c.position}
            scale={c.scale}
            bounds={c.bounds ?? [14, 2.5, 14]}
            segments={c.bounds ? 18 : 28}
            volume={10}
            growth={4}
            speed={0.08}
            opacity={c.opacity ?? 0.55}
            fade={60}
            color={night ? c.color : DAY_CLOUD[c.seed % DAY_CLOUD.length]}
          />
        ))}
      </Clouds>
    </>
  )
}
