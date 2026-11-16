import * as THREE from 'three'

// The island bake (t6) was made with the flying front/right walls standing, so the ground
// under them baked black. When the pod opens and the walls fly off, that footprint shows as
// a dark outline. This builds a thin strip over the footprint that re-uses the island
// material, sampling the ground texture just outside the line, so it matches day and night.
const WALLS = ['hut_wall_front_t7', 'hut_wall_right_t7']
const PUSH_OUT = 0.22   // widen the strip past the outer face (covers the contact shadow)
const PUSH_IN = 0.35    // and inward over the dark gap behind the wall
const SAMPLE_SHIFT = 0.8 // copy the ground texture from this far outward (clean grass)
const LIFT = 0.012

export function addWallFootprintPatch(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true)
  const ground = scene.getObjectByName('t6') as THREE.Mesh | undefined
  if (!ground || !ground.geometry.getAttribute('uv')) return null

  // bottom-cap triangles of the walls, in world space
  const tris: THREE.Vector3[][] = []
  for (const name of WALLS) {
    const wall = scene.getObjectByName(name) as THREE.Mesh | undefined
    if (!wall) continue
    const g = wall.geometry
    const p = g.getAttribute('position')
    const w = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(wall.matrixWorld))
    const minY = Math.min(...w.map(v => v.y))
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: p.count }, (_, i) => i)
    for (let i = 0; i < idx.length; i += 3) {
      const t = [w[idx[i]], w[idx[i + 1]], w[idx[i + 2]]]
      if (t.every(v => v.y < minY + 0.02)) tris.push(t)
    }
  }
  if (!tris.length) return null

  // classify each footprint vertex as outer/inner edge by comparing its radius to its neighbours
  const pts = tris.flat()
  const radius = (v: THREE.Vector3) => Math.hypot(v.x, v.z)
  const edgeOffset = (v: THREE.Vector3) => {
    const near = pts.filter(q => Math.hypot(q.x - v.x, q.z - v.z) < 0.4).map(radius).sort((a, b) => a - b)
    const med = near[Math.floor(near.length / 2)]
    return radius(v) >= med ? PUSH_OUT : -PUSH_IN
  }

  const ray = new THREE.Raycaster()
  const down = new THREE.Vector3(0, -1, 0)
  const hit = (x: number, z: number) => {
    ray.set(new THREE.Vector3(x, 0.4, z), down); ray.far = 2
    return ray.intersectObject(ground, false)[0]
  }

  const pos: number[] = []
  const uv: number[] = []
  for (const t of tris) {
    const verts: number[] = []; const uvs: number[] = []
    let ok = true
    for (const v of t) {
      const r = radius(v) || 1
      const dx = v.x / r, dz = v.z / r
      const o = edgeOffset(v)
      const x = v.x + dx * o, z = v.z + dz * o
      const h = hit(x, z)
      // copy the texture from a band outside the wall: every vertex shifted by the same radial amount
      const s = hit(x + dx * SAMPLE_SHIFT, z + dz * SAMPLE_SHIFT)
      if (!h || !s || !s.uv) { ok = false; break }
      let y = h.point.y + LIFT
      // inside the porch slab footprint (PorchSlab.tsx) keep the strip under the slab's top
      if (x > -1.65 && x < 1.29 && z > 3.35 && z < 8.2) y = Math.min(y, -0.415 - 0.061 * (z - 5.775) - 0.08)
      verts.push(x, y, z); uvs.push(s.uv.x, s.uv.y)
    }
    if (ok) { pos.push(...verts); uv.push(...uvs) }
  }
  if (!pos.length) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  const mat = (ground.material as THREE.Material).clone()
  mat.side = THREE.DoubleSide
  ;(mat as THREE.MeshBasicMaterial).polygonOffset = true
  ;(mat as THREE.MeshBasicMaterial).polygonOffsetFactor = -2
  // keep the shared day/night shader hookup from the island material
  mat.onBeforeCompile = (ground.material as THREE.Material).onBeforeCompile
  mat.customProgramCacheKey = (ground.material as THREE.Material).customProgramCacheKey
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'wall_footprint_patch'
  mesh.raycast = () => {}
  // geometry is in world space; parent it so it stays put
  const parentInv = new THREE.Matrix4().copy(scene.matrixWorld).invert()
  mesh.applyMatrix4(parentInv)
  scene.add(mesh)
  return mesh
}
