import * as THREE from 'three'

// The low leaf clump on the west side of the tree floats ~1.2 m off its branch stub.
// Find that loose clump inside the merged t6 mesh and slide it onto the stub tip.
const BOX = new THREE.Box3(new THREE.Vector3(4.9, 3.1, -10.9), new THREE.Vector3(7.7, 4.8, -8.4))
const OFFSET = new THREE.Vector3(0.39, -0.37, 0.04) // world space

export function fixCanopyClump(scene: THREE.Object3D) {
  const mesh = scene.getObjectByName('t6') as THREE.Mesh | undefined
  if (!mesh?.isMesh || mesh.userData.clumpFixed) return
  scene.updateMatrixWorld(true)
  const geo = mesh.geometry
  const pos = geo.attributes.position as THREE.BufferAttribute
  const n = pos.count
  const world: THREE.Vector3[] = []
  for (let i = 0; i < n; i++) world.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))

  // union-find over welded positions + triangles
  const parent = new Int32Array(n).map((_, i) => i)
  const find = (a: number): number => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] } return a }
  const union = (a: number, b: number) => { a = find(a); b = find(b); if (a !== b) parent[a] = b }
  const weld = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const p = world[i]
    const k = `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)},${Math.round(p.z * 1000)}`
    const j = weld.get(k)
    if (j === undefined) weld.set(k, i); else union(i, j)
  }
  const idx = geo.index
  const triCount = idx ? idx.count / 3 : n / 3
  for (let t = 0; t < triCount; t++) {
    const a = idx ? idx.getX(t * 3) : t * 3
    const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1
    const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
    union(a, b); union(b, c)
  }

  // components fully inside the box = the floating clump
  const inside = new Map<number, boolean>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const ok = BOX.containsPoint(world[i])
    inside.set(r, (inside.get(r) ?? true) && ok)
  }
  const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
  const v = new THREE.Vector3()
  let moved = 0
  for (let i = 0; i < n; i++) {
    if (!inside.get(find(i))) continue
    v.copy(world[i]).add(OFFSET).applyMatrix4(inv)
    pos.setXYZ(i, v.x, v.y, v.z)
    moved++
  }
  if (moved) {
    pos.needsUpdate = true
    geo.computeBoundingBox()
    geo.computeBoundingSphere()
  }
  mesh.userData.clumpFixed = true
  if (import.meta.env.DEV) console.log('[canopyClumpFix] moved verts:', moved)
}
