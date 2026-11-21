import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rocketFlight } from './rocketFlight'
import { clickHints, type HintId } from './clickHints'

// Floating amber chevrons over everything clickable. They keep the same size on screen at any zoom,
// are hidden by walls / the tree like real objects, bob gently, and fade once that object is clicked
// (until the page is reloaded).
const TARGETS: { id: HintId; names: string[] }[] = [
  { id: 'rocket', names: ['rocket_target_t3'] },
  { id: 'sketch', names: ['sketch_target', 'sketch_base_target'] },
  { id: 'photo',  names: ['photo_target', 'frame_target_t1'] },
]
const SCREEN_SIZE = 0.045 // fraction of the viewport height
const LIFT = 0.35         // world units above the object's top
const TOWARD_CAM = 0.45   // pulled toward the camera so the wall behind a frame doesn't clip it

// warm amber with a dark navy outline: reads against the white room walls by day and the dark sky at night
const MARKER = '#ffb31f'
const OUTLINE = '#141846'
function markerTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  glow.addColorStop(0, 'rgba(255,179,31,0.4)'); glow.addColorStop(1, 'rgba(255,179,31,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 128, 128)
  g.lineCap = 'round'; g.lineJoin = 'round'
  const shape = () => {
    g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.moveTo(44, 54); g.lineTo(64, 76); g.lineTo(84, 54); g.stroke()
  }
  g.strokeStyle = OUTLINE; g.lineWidth = 17; shape()
  g.strokeStyle = MARKER; g.lineWidth = 9; g.shadowColor = MARKER; g.shadowBlur = 10; shape()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

const _box = new THREE.Box3(), _tmp = new THREE.Box3(), _p = new THREE.Vector3(), _d = new THREE.Vector3(), _s = new THREE.Vector3()

export default function ClickMarkers({ scene, ready }: { scene: THREE.Object3D; ready: boolean }) {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(markerTexture, [])
  const markers = useMemo(() => TARGETS.map(t => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, sizeAttenuation: false, toneMapped: false, fog: false, opacity: 0,
    }))
    sp.renderOrder = 20
    sp.raycast = () => null
    sp.userData.phase = Math.random() * Math.PI * 2
    return { ...t, sp }
  }), [tex])

  useFrame((s, dt) => {
    const root = group.current
    if (!root || !ready) return
    if (root.children.length === 0) markers.forEach(m => root.add(m.sp))
    root.getWorldScale(_s)
    const t = s.clock.elapsedTime
    for (const m of markers) {
      const objs = m.names.map(n => scene.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o)
      const mat = m.sp.material as THREE.SpriteMaterial
      const show = objs.length > 0 && !clickHints.has(m.id) && !(m.id === 'rocket' && rocketFlight.get())
      mat.opacity = THREE.MathUtils.damp(mat.opacity, show ? 0.75 + 0.25 * Math.sin(t * 3 + m.sp.userData.phase) : 0, 6, dt)
      m.sp.visible = mat.opacity > 0.01
      if (!m.sp.visible) continue
      _box.makeEmpty()
      for (const o of objs) _box.union(_tmp.setFromObject(o))
      _box.getCenter(_p); _p.y = _box.max.y + LIFT + Math.sin(t * 2.2 + m.sp.userData.phase) * 0.08
      _d.copy(s.camera.position).sub(_p).normalize()
      _p.addScaledVector(_d, TOWARD_CAM)
      m.sp.position.copy(root.worldToLocal(_p))
      m.sp.scale.setScalar(SCREEN_SIZE / _s.x)
    }
  })

  return <group ref={group} />
}
