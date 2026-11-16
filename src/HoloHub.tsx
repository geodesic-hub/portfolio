import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'

/** One hologram terminal that lists every link: Contact, GitHub, LinkedIn, About Me. */

export interface HoloItem {
  label: string
  sublabel: string
  glyph: 'mail' | 'code' | 'profile' | 'info'
  color: string
  onClick: () => void
}

interface HoloHubProps {
  position: [number, number, number]
  items: HoloItem[]
  title?: string
  /** panel centre height above the emitter */
  lift?: number
  /** panel width in metres (height follows the canvas aspect) */
  width?: number
}

const CW = 640, CH = 760
const TITLE_H = 150
const ROW_H = 128, ROW_GAP = 16
const BEAM_COLOR = '#7fe6ff'
const PARTICLES = 36

function rowTop(i: number) { return TITLE_H + i * (ROW_H + ROW_GAP) }

function drawGlyph(g: CanvasRenderingContext2D, glyph: HoloItem['glyph'], cx: number, cy: number) {
  g.lineWidth = 7
  if (glyph === 'code') {
    g.beginPath(); g.moveTo(cx - 14, cy - 22); g.lineTo(cx - 38, cy); g.lineTo(cx - 14, cy + 22); g.stroke()
    g.beginPath(); g.moveTo(cx + 14, cy - 22); g.lineTo(cx + 38, cy); g.lineTo(cx + 14, cy + 22); g.stroke()
    g.beginPath(); g.moveTo(cx + 7, cy - 28); g.lineTo(cx - 7, cy + 28); g.stroke()
  } else if (glyph === 'mail') {
    g.strokeRect(cx - 36, cy - 24, 72, 48)
    g.beginPath(); g.moveTo(cx - 36, cy - 24); g.lineTo(cx, cy + 6); g.lineTo(cx + 36, cy - 24); g.stroke()
  } else if (glyph === 'info') {
    g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx, cy + 16); g.stroke()
    g.beginPath(); g.arc(cx, cy - 13, 4, 0, Math.PI * 2); g.fill()
  } else {
    g.beginPath(); g.arc(cx, cy - 10, 13, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.arc(cx, cy + 30, 25, Math.PI * 1.15, Math.PI * 1.85); g.stroke()
    g.lineWidth = 4; g.strokeRect(cx - 36, cy - 32, 72, 64)
  }
}

function drawHub(canvas: HTMLCanvasElement, title: string, items: HoloItem[], hoverIdx: number) {
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, CW, CH)
  g.lineCap = 'round'; g.lineJoin = 'round'

  // corner brackets
  g.strokeStyle = '#bff6ff'; g.lineWidth = 6
  const m = 16, L = 54
  ;[[m, m, 1, 1], [CW - m, m, -1, 1], [m, CH - m, 1, -1], [CW - m, CH - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke()
  })

  // title
  g.fillStyle = '#e8fdff'
  g.font = 'bold 56px "Courier New", monospace'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(title, CW / 2, 70)
  g.globalAlpha = 0.6; g.font = '24px "Courier New", monospace'
  g.fillText('> select a channel', CW / 2, 116)
  g.globalAlpha = 1

  items.forEach((it, i) => {
    const y = rowTop(i), x0 = 44, x1 = CW - 44
    const hot = i === hoverIdx
    g.strokeStyle = it.color; g.fillStyle = it.color
    // row frame (filled faintly when hovered)
    if (hot) { g.globalAlpha = 0.28; g.fillRect(x0, y, x1 - x0, ROW_H); g.globalAlpha = 1 }
    g.lineWidth = hot ? 6 : 3
    g.strokeRect(x0, y, x1 - x0, ROW_H)
    // glyph
    drawGlyph(g, it.glyph, x0 + 70, y + ROW_H / 2)
    // texts
    g.textAlign = 'left'
    g.font = 'bold 50px "Courier New", monospace'
    g.fillText(it.label, x0 + 135, y + 50)
    g.globalAlpha = 0.75; g.font = '26px "Courier New", monospace'
    g.fillText(it.sublabel, x0 + 137, y + 94)
    g.globalAlpha = 1
    // arrow
    g.textAlign = 'center'; g.font = 'bold 48px "Courier New", monospace'
    g.fillText(hot ? '>>' : '>', x1 - 46, y + ROW_H / 2 + 2)
  })
}

const panelVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const panelFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  varying vec2 vUv;
  float rand(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    float glitchOn = step(0.97, rand(floor(uTime * 6.0)));
    uv.x += glitchOn * (rand(floor(uv.y * 30.0) + floor(uTime * 40.0)) - 0.5) * 0.015;
    vec4 tex = texture2D(uMap, uv);
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float rim = 1.0 - smoothstep(0.0, 0.025, edge);
    float scan = 0.94 + 0.06 * sin(uv.y * 420.0 - uTime * 8.0);
    float sweep = exp(-pow((uv.y - (1.0 - fract(uTime * 0.25))) * 14.0, 2.0)) * 0.12;
    // dark glass backing so the text reads against the sky and island
    vec3 glass = vec3(0.02, 0.07, 0.10) + vec3(0.2, 0.7, 0.9) * (rim * 0.6 + sweep);
    vec3 col = mix(glass, tex.rgb * 1.15, tex.a) * scan;
    float alpha = max(0.86, tex.a);
    gl_FragColor = vec4(col, alpha);
  }
`
const beamFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
  void main() {
    float fade = pow(1.0 - vUv.y, 1.3) * smoothstep(0.0, 0.06, vUv.y + 0.02);
    float streaks = 0.55 + 0.45 * sin(vUv.x * 90.0 + uTime * 1.5) * sin(vUv.x * 31.0 - uTime);
    float a = fade * streaks * (0.85 + 0.15 * sin(uTime * 3.0 - vUv.y * 10.0)) * 0.32;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`

export default function HoloHub({ position, items, title = 'HARSH.LINK', lift = 3.1, width = 2.4 }: HoloHubProps) {
  const { invalidate } = useThree()
  const height = width * (CH / CW)
  const beamH = lift - height / 2
  const topR = width * 0.45, botR = 0.32

  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c }, [])
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t }, [canvas])
  const hoverIdx = useRef(-1)
  const redraw = () => { drawHub(canvas, title, items, hoverIdx.current); tex.needsUpdate = true; invalidate() }
  useEffect(redraw, [items, title])

  const panelMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: panelVert, fragmentShader: panelFrag,
    uniforms: { uMap: { value: tex }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }), [tex])
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: panelVert, fragmentShader: beamFrag,
    uniforms: { uColor: { value: new THREE.Color(BEAM_COLOR) }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), [])

  const { geometry, motes } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3))
    const motes = Array.from({ length: PARTICLES }, () => ({ a: Math.random() * 6.283, r: Math.random(), y: Math.random() * beamH, v: 0.25 + Math.random() * 0.35 }))
    return { geometry: geo, motes }
  }, [beamH])

  const panelRef = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    panelMat.uniforms.uTime.value = t
    beamMat.uniforms.uTime.value = t
    if (panelRef.current) panelRef.current.position.y = lift + Math.sin(t * 1.2) * 0.06
    const attr = geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < PARTICLES; i++) {
      const p = motes[i]
      p.y += p.v * delta
      if (p.y > beamH) { p.y = 0; p.a = Math.random() * 6.283; p.r = Math.random() }
      const rad = (botR + (topR - botR) * (p.y / beamH)) * Math.sqrt(p.r) * 0.85
      attr.setXYZ(i, Math.cos(p.a + t * 0.4) * rad, p.y, Math.sin(p.a + t * 0.4) * rad)
    }
    attr.needsUpdate = true
  })

  // which row is under the pointer (uv.y = 0 at the bottom of the panel)
  const rowAt = (uv?: THREE.Vector2) => {
    if (!uv) return -1
    const y = (1 - uv.y) * CH
    for (let i = 0; i < items.length; i++) if (y >= rowTop(i) && y <= rowTop(i) + ROW_H) return i
    return -1
  }
  const setHover = (i: number) => {
    if (i === hoverIdx.current) return
    hoverIdx.current = i
    document.body.style.cursor = i >= 0 ? 'pointer' : 'auto'
    redraw()
  }

  return (
    <group position={position}>
      {/* emitter */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 0.1, 40]} />
        <meshBasicMaterial color="#0b0d12" />
      </mesh>
      <mesh position={[0, 0.102, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 48]} />
        <meshBasicMaterial color={BEAM_COLOR} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.1 + beamH / 2, 0]} material={beamMat} raycast={() => null}>
        <cylinderGeometry args={[topR, botR, beamH, 48, 1, true]} />
      </mesh>
      <points geometry={geometry} position={[0, 0.1, 0]} raycast={() => null}>
        <pointsMaterial size={0.05} color={BEAM_COLOR} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      <group ref={panelRef} position={[0, lift, 0]}>
        <Billboard lockX lockZ>
          <mesh
            material={panelMat}
            onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(rowAt(e.uv)) }}
            onPointerOut={() => setHover(-1)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              const i = rowAt(e.uv)
              if (i >= 0) { e.stopPropagation(); items[i].onClick() }
            }}
          >
            <planeGeometry args={[width, height]} />
          </mesh>
        </Billboard>
      </group>
    </group>
  )
}
