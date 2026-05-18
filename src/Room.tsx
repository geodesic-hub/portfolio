import { useGLTF } from '@react-three/drei'
import Smoke from './Smoke'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type TextureKey = 't1' | 't2' | 't3' | 't4' | 't5'
type TextureSet = Record<TextureKey, THREE.Texture>

interface RoomProps {
  lightsOn: boolean
  onLoaded: () => void
  onDishClick: () => void
  onSketchClick: () => void
  onGithubClick: () => void
  onLinkedinClick: () => void
}

const SCALE_NORMAL        = new THREE.Vector3(1, 1, 1)
const SCALE_HOVER         = new THREE.Vector3(2, 2, 2)
const SCALE_HOVER_SKETCH  = new THREE.Vector3(1.4, 1.4, 1.4)

function Room({ lightsOn, onLoaded, onDishClick, onSketchClick, onGithubClick, onLinkedinClick }: RoomProps) {
  const { scene } = useGLTF('/model/room.glb')
  const { gl } = useThree()

  const groupRef           = useRef<THREE.Group>(null)
  const texturesRef        = useRef<{ on: TextureSet; off: TextureSet } | null>(null)
  const meshTextureKeysRef = useRef<Map<THREE.Mesh, TextureKey>>(new Map())
  const dishRef            = useRef<THREE.Mesh | null>(null)
  const dishStandRef       = useRef<THREE.Mesh | null>(null)
  const coolerRef          = useRef<THREE.Mesh | null>(null)
  const sketchRef          = useRef<THREE.Mesh | null>(null)
  const githubRef          = useRef<THREE.Mesh | null>(null)
  const linkedinRef        = useRef<THREE.Mesh | null>(null)
  const dishHovered        = useRef(false)
  const coolerHovered      = useRef(false)
  const sketchHovered      = useRef(false)
  const githubHovered      = useRef(false)
  const linkedinHovered    = useRef(false)
  const [smokePos, setSmokePos] = useState<[number, number, number] | null>(null)

  useFrame((state, delta) => {
    if (dishRef.current) {
      dishRef.current.rotation.y += delta * 0.8
      const dishScale = dishHovered.current ? SCALE_HOVER : SCALE_NORMAL
      dishRef.current.scale.lerp(dishScale, delta * 6)
      dishStandRef.current?.scale.lerp(dishScale, delta * 6)
    }

    if (coolerRef.current) {
      coolerRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * (Math.PI / 4)
      coolerRef.current.scale.lerp(coolerHovered.current ? SCALE_HOVER : SCALE_NORMAL, delta * 6)
    }

    if (sketchRef.current) {
      const hit = state.raycaster.intersectObject(sketchRef.current, false).length > 0
      if (hit !== sketchHovered.current) {
        sketchHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
      }
      sketchRef.current.scale.lerp(hit ? SCALE_HOVER_SKETCH : SCALE_NORMAL, delta * 6)
    }

    if (githubRef.current) {
      const hit = state.raycaster.intersectObject(githubRef.current, false).length > 0
      if (hit !== githubHovered.current) {
        githubHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
      }
      githubRef.current.scale.lerp(hit ? SCALE_HOVER_SKETCH : SCALE_NORMAL, delta * 6)
    }

    if (linkedinRef.current) {
      const hit = state.raycaster.intersectObject(linkedinRef.current, false).length > 0
      if (hit !== linkedinHovered.current) {
        linkedinHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
      }
      linkedinRef.current.scale.lerp(hit ? SCALE_HOVER_SKETCH : SCALE_NORMAL, delta * 6)
    }
  })

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const keys: TextureKey[] = ['t1', 't2', 't3', 't4', 't5']

    const configure = (t: THREE.Texture) => {
      t.flipY = false
      t.colorSpace = THREE.SRGBColorSpace
      t.generateMipmaps = true
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.anisotropy = gl.capabilities.getMaxAnisotropy()
      gl.initTexture(t)
      return t
    }

    const loads = keys.flatMap(k => [
      loader.loadAsync(`/textures/${k}-on.webp`).then(configure),
      loader.loadAsync(`/textures/${k}-off.webp`).then(configure),
    ])
    const naturoLoad   = loader.loadAsync('/sketches/naturo.webp').then(configure)

    Promise.all([...loads, naturoLoad]).then(results => {
      const on  = {} as TextureSet
      const off = {} as TextureSet
      keys.forEach((k, i) => {
        on[k]  = results[i * 2]
        off[k] = results[i * 2 + 1]
      })
      const naturoTex = results[results.length - 1]

      texturesRef.current = { on, off }
      const activeSet = lightsOn ? on : off

      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return

        if (child.name === 'inc_target_t3' && groupRef.current) {
          const worldPos = child.getWorldPosition(new THREE.Vector3())
          groupRef.current.worldToLocal(worldPos)
          setSmokePos([worldPos.x, worldPos.y + 0.50, worldPos.z])
        }

        if (child.name === 'dish_target_t1')     dishRef.current     = child
        if (child.name === 'dish_stand_target_t1') dishStandRef.current = child
        if (child.name === 'cooler_target_t1')   coolerRef.current   = child
        if (child.name === 'git_target_t1')   githubRef.current   = child
        if (child.name === 'linkedin_target_t1') linkedinRef.current = child
        if (child.name === 'sketch_base_target') {
          child.material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
          return
        }
        if (child.name === 'sketch_target') {
          sketchRef.current = child
          child.material = new THREE.MeshBasicMaterial({ map: naturoTex, color: new THREE.Color(0.55, 0.55, 0.55), side: THREE.FrontSide })
          return
        }

        const key = keys.find(k => child.name === k || child.name.endsWith(`_${k}`))

        if (key) {
          meshTextureKeysRef.current.set(child, key)
          child.material = new THREE.MeshBasicMaterial({ map: activeSet[key], side: THREE.FrontSide })
        } else {
          child.material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide })
        }
      })

      onLoaded()
    })
  }, [scene])

  useEffect(() => {
    if (!texturesRef.current) return
    const textureSet = lightsOn ? texturesRef.current.on : texturesRef.current.off
    meshTextureKeysRef.current.forEach((key, mesh) => {
      if (!(mesh.material instanceof THREE.MeshBasicMaterial)) return
      mesh.material.map = textureSet[key]
      mesh.material.needsUpdate = true
    })
  }, [lightsOn])

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.object.name === 'dish_target_t1')     { e.stopPropagation(); onDishClick() }
          if (e.object.name === 'sketch_target')      { e.stopPropagation(); onSketchClick() }
          if (e.object.name === 'git_target_t1')   { e.stopPropagation(); onGithubClick() }
          if (e.object.name === 'linkedin_target_t1') { e.stopPropagation(); onLinkedinClick() }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.object.name === 'dish_target_t1') { dishHovered.current = true;  document.body.style.cursor = 'pointer' }
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          if (e.object.name === 'dish_target_t1') { dishHovered.current = false; document.body.style.cursor = 'auto' }
        }}
      />
      {smokePos && <Smoke position={smokePos} />}
    </group>
  )
}
useGLTF.preload('/model/room.glb')

export default Room
