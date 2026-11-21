import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The pod's front wall, right wall, stairs and dome lift up and away to reveal the room, and come back.
// Names match the exported GLB. The island bakes were made with these four pieces hidden, so no shadow stays behind.
const PIECES: Record<string, { lift: number; drift: [number, number, number]; tilt: [number, number, number]; delay: number }> = {
  hut_wall_front_t5: { lift: 10, drift: [0, 0, 5], tilt: [0.35, 0, 0], delay: 0.0 },
  hut_wall_right_t5: { lift: 10, drift: [5, 0, 0], tilt: [0, 0, -0.35], delay: 0.12 },
  hut_roof_t5:       { lift: 15, drift: [0, 0, 0], tilt: [0, 0.6, 0], delay: 0.24 },
  pod_ramp_t5:       { lift: 7,  drift: [0, 0, 6], tilt: [0.5, 0, 0], delay: 0.06 },
}
const LAST_DELAY = 0.24

// critically-damped smoothing toward a target (same feel as maath's easing.damp)
const damp = (a: number, b: number, smoothTime: number, dt: number) => THREE.MathUtils.damp(a, b, 4 / smoothTime, dt)

export default function PodReveal({ scene, open, ready, speed = 0.45 }: { scene: THREE.Object3D; open: boolean; ready: boolean; speed?: number }) {
  const toggledAt = useRef(0)
  const now = useRef(0)

  const pieces = useMemo(() => {
    if (!ready) return []
    return Object.entries(PIECES)
      .map(([name, cfg]) => {
        const obj = scene.getObjectByName(name)
        if (!obj) { console.warn(`[PodReveal] "${name}" not found in the GLB`); return null }
        const meshes: THREE.Mesh[] = []
        obj.traverse((c) => { if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh) })
        // each baked mesh already has its own material instance, so fade it in place
        meshes.forEach((m) => { (m.material as THREE.Material).transparent = true })
        return {
          obj, cfg, meshes,
          homePos: obj.position.clone(), homeRot: obj.rotation.clone(),
          targetPos: new THREE.Vector3(), targetRot: new THREE.Euler(),
          raycast: meshes.map((m) => m.raycast),
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
  }, [scene, ready])

  useEffect(() => { toggledAt.current = now.current }, [open])

  useFrame((s, delta) => {
    now.current = s.clock.elapsedTime
    const since = now.current - toggledAt.current
    for (const p of pieces) {
      const delay = open ? p.cfg.delay : LAST_DELAY - p.cfg.delay // roof leaves last, comes back first
      if (since < delay) continue
      const { lift, drift, tilt } = p.cfg
      const k = open ? 1 : 0
      p.targetPos.set(p.homePos.x + drift[0] * k, p.homePos.y + lift * k, p.homePos.z + drift[2] * k)
      p.targetRot.set(p.homeRot.x + tilt[0] * k, p.homeRot.y + tilt[1] * k, p.homeRot.z + tilt[2] * k)
      p.obj.position.set(
        damp(p.obj.position.x, p.targetPos.x, speed, delta),
        damp(p.obj.position.y, p.targetPos.y, speed, delta),
        damp(p.obj.position.z, p.targetPos.z, speed, delta),
      )
      p.obj.rotation.set(
        damp(p.obj.rotation.x, p.targetRot.x, speed, delta),
        damp(p.obj.rotation.y, p.targetRot.y, speed, delta),
        damp(p.obj.rotation.z, p.targetRot.z, speed, delta),
      )

      let faded = true
      p.meshes.forEach((m, i) => {
        const mat = m.material as THREE.MeshBasicMaterial
        mat.opacity = damp(mat.opacity, open ? 0 : 1, speed * 0.8, delta)
        mat.depthWrite = mat.opacity > 0.98
        if (mat.opacity > 0.02) faded = false
        // stop catching clicks as soon as they start leaving, so the room inside is clickable
        m.raycast = open ? () => {} : p.raycast[i]
      })
      p.obj.visible = !(open && faded)
    }
  })

  return null
}
