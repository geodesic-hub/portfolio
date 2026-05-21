import * as THREE from 'three'

export default class CloudMaterial extends THREE.MeshBasicMaterial {
  constructor() { super({ side: THREE.DoubleSide, depthWrite: false, transparent: true }) }
}
