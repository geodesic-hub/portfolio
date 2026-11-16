import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'

type Glyph = 'code' | 'profile' | 'mail' | 'info'

interface HologramProps {
  position: [number, number, number]
  label: string
  sublabel: string
  glyph: Glyph
  color: string
  onClick: () => void
  /** Phase offset so multiple holograms don't flicker/bob in sync */
  seed?: number
  /** Panel centre height above the emitter */
  lift?: number
  /** Overall size multiplier */
  scale?: number
}

const PANEL_W = 0.62
const PANEL_H = 0.5
const BEAM_BOTTOM_R = 0.12
const BEAM_TOP_R = 0.3
const PARTICLES = 18

/* ---------------- canvas texture (white on transparent; tinted in shader) ---------------- */

function drawPanel(label: string, sublabel: string, glyph: Glyph) {
  const W = 512, H = 412
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.strokeStyle = g.fillStyle = '#fff'
  g.lineCap = 'round'

  // corner brackets
  const m = 18, L = 46
  g.lineWidth = 5
  ;[[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke()
  })

  // glyph
  const cx = W / 2, cy = 150
  g.lineWidth = 12
  if (glyph === 'code') {
    g.beginPath(); g.moveTo(cx - 70, cy - 55); g.lineTo(cx - 130, cy); g.lineTo(cx - 70, cy + 55); g.stroke()
    g.beginPath(); g.moveTo(cx + 70, cy - 55); g.lineTo(cx + 130, cy); g.lineTo(cx + 70, cy + 55); g.stroke()
    g.beginPath(); g.moveTo(cx + 28, cy - 70); g.lineTo(cx - 28, cy + 70); g.stroke()
  } else if (glyph === 'mail') {
    g.strokeRect(cx - 120, cy - 75, 240, 150)
    g.beginPath(); g.moveTo(cx - 120, cy - 75); g.lineTo(cx, cy + 15); g.lineTo(cx + 120, cy - 75); g.stroke()
  } else if (glyph === 'info') {
    g.beginPath(); g.arc(cx, cy, 92, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 52); g.stroke()
    g.beginPath(); g.arc(cx, cy - 42, 9, 0, Math.PI * 2); g.fill()
  } else {
    g.beginPath(); g.arc(cx, cy - 30, 38, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.arc(cx, cy + 82, 72, Math.PI * 1.12, Math.PI * 1.88); g.stroke()
    g.lineWidth = 6
    g.strokeRect(cx - 120, cy - 95, 240, 190)
  }

  // label
  g.font = 'bold 60px "Courier New", monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(label, cx, 300)

  // divider + sublabel
  g.lineWidth = 3
  g.beginPath(); g.moveTo(cx - 140, 340); g.lineTo(cx + 140, 340); g.stroke()
  g.font = '28px "Courier New", monospace'
  g.globalAlpha = 0.75
  g.fillText(sublabel, cx, 372)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  return tex
}

/* ---------------- shaders ---------------- */

const panelVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const panelFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uHover;
  uniform float uSeed;
  varying vec2 vUv;

  float rand(float x) { return fract(sin(x * 12.9898 + uSeed) * 43758.5453); }

  void main() {
    vec2 uv = vUv;

    // occasional horizontal glitch slices
    float glitchOn = step(0.93, rand(floor(uTime * 8.0)));
    uv.x += glitchOn * (rand(floor(uv.y * 24.0) + floor(uTime * 40.0)) - 0.5) * 0.06;

    float content = texture2D(uMap, uv).a;

    // panel body: faint fill, brighter towards edges
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float fill = 0.06 + 0.22 * (1.0 - smoothstep(0.0, 0.06, edge));

    float scan    = 0.7 + 0.3 * sin(uv.y * 260.0 - uTime * 8.0);
    float sweepY  = fract(uTime * 0.35 + uSeed);
    float sweep   = exp(-pow((uv.y - (1.0 - sweepY)) * 18.0, 2.0)) * 0.35;
    float flicker = 0.9 + 0.1 * sin(uTime * 41.0 + uSeed) * sin(uTime * 17.0);

    float intensity = (fill + content * (1.1 + uHover * 0.6)) * scan * flicker + sweep;
    intensity *= 0.85 + uHover * 0.35;

    // slight chromatic tint on content
    vec3 col = mix(uColor, vec3(1.0), content * 0.35) * intensity;
    gl_FragColor = vec4(col, 1.0);
  }
`

const beamVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const beamFrag = /* glsl */ `
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    float fade    = pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.08, vUv.y + 0.02);
    float streaks = 0.55 + 0.45 * sin(vUv.x * 70.0 + uTime * 1.5) * sin(vUv.x * 23.0 - uTime);
    float pulse   = 0.85 + 0.15 * sin(uTime * 3.0 - vUv.y * 12.0);
    float a = fade * streaks * pulse * (0.28 + uHover * 0.2);
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`

/* ---------------- component ---------------- */

export default function Hologram({ position, label, sublabel, glyph, color, onClick, seed = 0, lift = 0.7, scale = 1 }: HologramProps) {
  const panelGroup = useRef<THREE.Group>(null)
  const hover = useRef(0)
  const hovered = useRef(false)
  const pointsRef = useRef<THREE.Points>(null)

  const col = useMemo(() => new THREE.Color(color), [color])
  const map = useMemo(() => drawPanel(label, sublabel, glyph), [label, sublabel, glyph])

  const panelMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: panelVert,
    fragmentShader: panelFrag,
    uniforms: {
      uMap: { value: map },
      uColor: { value: col },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uSeed: { value: seed * 7.31 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [map, col, seed])

  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    uniforms: { uColor: { value: col }, uTime: { value: 0 }, uHover: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [col])

  const beamHeight = lift - PANEL_H / 2 + 0.04

  // rising motes inside the beam
  const { geometry, motes } = useMemo(() => {
    const pos = new Float32Array(PARTICLES * 3)
    const motes = Array.from({ length: PARTICLES }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random(),
      y: Math.random() * beamHeight,
      v: 0.08 + Math.random() * 0.12,
    }))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geometry: geo, motes }
  }, [beamHeight])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + seed * 3.7
    hover.current = THREE.MathUtils.damp(hover.current, hovered.current ? 1 : 0, 8, delta)

    panelMat.uniforms.uTime.value = t
    panelMat.uniforms.uHover.value = hover.current
    beamMat.uniforms.uTime.value = t
    beamMat.uniforms.uHover.value = hover.current

    if (panelGroup.current) {
      panelGroup.current.position.y = lift + Math.sin(t * 1.4) * 0.025
      const s = 1 + hover.current * 0.12
      panelGroup.current.scale.setScalar(s)
    }

    const attr = geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < PARTICLES; i++) {
      const p = motes[i]
      p.y += p.v * delta
      if (p.y > beamHeight) { p.y = 0; p.a = Math.random() * Math.PI * 2; p.r = Math.random() }
      const k = p.y / beamHeight
      const rad = (BEAM_BOTTOM_R + (BEAM_TOP_R - BEAM_BOTTOM_R) * k) * Math.sqrt(p.r) * 0.85
      attr.setXYZ(i, Math.cos(p.a + t * 0.4) * rad, p.y, Math.sin(p.a + t * 0.4) * rad)
    }
    attr.needsUpdate = true
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hovered.current = true; document.body.style.cursor = 'pointer' }
  const onOut  = () => { hovered.current = false; document.body.style.cursor = 'auto' }
  const onDown = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick() }

  return (
    <group position={position} scale={scale}>
      {/* emitter puck */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 32]} />
        <meshBasicMaterial color="#0b0d12" />
      </mesh>
      <mesh position={[0, 0.043, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.09, 0.125, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.044, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {/* light cone */}
      <mesh position={[0, 0.04 + beamHeight / 2, 0]} material={beamMat} raycast={() => null}>
        <cylinderGeometry args={[BEAM_TOP_R, BEAM_BOTTOM_R, beamHeight, 40, 1, true]} />
      </mesh>

      {/* motes */}
      <points ref={pointsRef} geometry={geometry} position={[0, 0.04, 0]} raycast={() => null}>
        <pointsMaterial size={0.025} color={color} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* floating panel — rotates around Y only so it always faces the camera */}
      <group ref={panelGroup} position={[0, lift, 0]}>
        <Billboard lockX lockZ>
          <mesh material={panelMat} onPointerOver={onOver} onPointerOut={onOut} onClick={onDown}>
            <planeGeometry args={[PANEL_W, PANEL_H]} />
          </mesh>
        </Billboard>
      </group>
    </group>
  )
}
