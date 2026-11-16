import { useMemo } from 'react'
import * as THREE from 'three'

// Stone slab under the entrance ramp. It hides the ramp's baked ground shadow
// once the ramp flies away. Unlit like the baked scene; fades day <-> night with the light switch.
const DAY   = new THREE.Color(0.42, 0.39, 0.34)
const NIGHT = new THREE.Color(0.075, 0.068, 0.09)

export default function PorchSlab({ lightMix }: { lightMix: { value: number } }) {
  const { geometry, material } = useMemo(() => {
    // centred on the ramp (Blender x -1.26..0.9), tucked under the pod plinth (y -3.4) to past the ramp foot (y -8.15)
    const g = new THREE.BoxGeometry(2.9, 0.1, 4.75, 4, 1, 5).toNonIndexed()
    const pos = g.getAttribute('position')
    const nrm = g.getAttribute('normal')
    const col = new Float32Array(pos.count * 3)
    // slight per-face variation for a low-poly stone look; sides darker than the top
    for (let f = 0; f < pos.count; f += 3) {
      const up = nrm.getY(f) > 0.5
      const shade = (up ? 1 : 0.72) * (0.94 + 0.06 * Math.sin(f * 12.9898) ** 2)
      for (let k = 0; k < 3; k++) col.set([shade, shade, shade], (f + k) * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const m = new THREE.MeshBasicMaterial({ vertexColors: true })
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLightMix = lightMix
      sh.uniforms.uDay = { value: DAY }
      sh.uniforms.uNight = { value: NIGHT }
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLightMix;\nuniform vec3 uDay;\nuniform vec3 uNight;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(uDay, uNight, uLightMix);')
    }
    m.customProgramCacheKey = () => 'porch-slab'
    return { geometry: g, material: m }
  }, [lightMix])

  // three.js = (blender x, blender z, -blender y); ground slopes ~0.21 m down toward the ramp foot
  // entry step against the plinth's front face (that face baked black behind the ramp's top end)
  const step = useMemo(() => {
    const g = new THREE.BoxGeometry(2.9, 0.34, 0.34, 3, 1, 1).toNonIndexed()
    const n = g.getAttribute('normal'); const c = new Float32Array(n.count * 3)
    for (let i = 0; i < n.count; i++) { const v = n.getY(i) > 0.5 ? 1 : 0.72; c.set([v, v, v], i * 3) }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])

  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        position={[-0.18, -0.465, 5.775]}
        rotation={[0.061, 0, 0]}
        raycast={() => null}
      />
      <mesh geometry={step} material={material} position={[-0.18, -0.15, 3.97]} raycast={() => null} />
    </>
  )
}
