import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

type TextureKey = 't1' | 't2' | 't3' | 't4' | 't5'
type TextureSet = Record<TextureKey, THREE.Texture>

interface UseRoomTexturesOptions {
  scene: THREE.Group
  lightsOn: boolean
  onLoaded: () => void
}

export function useRoomTextures({ scene, lightsOn, onLoaded }: UseRoomTexturesOptions) {
  const { gl, invalidate } = useThree()

  const groupRef           = useRef<THREE.Group>(null)
  const texturesRef        = useRef<{ on: TextureSet; off: TextureSet } | null>(null)
  const meshTextureKeysRef = useRef<Map<THREE.Mesh, TextureKey>>(new Map())
  const dishRef            = useRef<THREE.Mesh | null>(null)
  const dishStandRef       = useRef<THREE.Mesh | null>(null)
  const coolerRef          = useRef<THREE.Mesh | null>(null)
  const sketchRef          = useRef<THREE.Mesh | null>(null)
  const githubRef          = useRef<THREE.Mesh | null>(null)
  const linkedinRef        = useRef<THREE.Mesh | null>(null)
  const sketchBaseRef      = useRef<THREE.Mesh | null>(null)
  const screensaverRef     = useRef<THREE.Mesh | null>(null)
  const wallpaperIndexRef  = useRef(0)
  const photoRef           = useRef<THREE.Mesh | null>(null)
  const frameRef           = useRef<THREE.Mesh | null>(null)

  const [smokePos, setSmokePos]       = useState<[number, number, number] | null>(null)
  const [meshesReady, setMeshesReady] = useState(false)

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

    const WALLPAPERS = ['jiraya', 'rengoku', 'maki', 'itachi', 'yuji']

    const loads          = keys.flatMap(k => [
      loader.loadAsync(`/textures/${k}-on.webp`).then(configure),
      loader.loadAsync(`/textures/${k}-off.webp`).then(configure),
    ])
    const naturoLoad     = loader.loadAsync('/sketches/naturo.webp').then(configure)
    const familyLoad     = loader.loadAsync('/photo/family.webp').then(configure)
    const wallpaperLoads = WALLPAPERS.map(n => loader.loadAsync(`/wallpaper/${n}.webp`).then(configure))

    let cancelled = false
    let cycleId: ReturnType<typeof setInterval>

    Promise.all([...loads, naturoLoad, familyLoad, ...wallpaperLoads]).then(results => {
      if (cancelled) return
      const on  = {} as TextureSet
      const off = {} as TextureSet
      keys.forEach((k, i) => {
        on[k]  = results[i * 2]
        off[k] = results[i * 2 + 1]
      })
      const base              = keys.length * 2
      const naturoTex         = results[base] as THREE.Texture
      const familyTex         = results[base + 1] as THREE.Texture
      const wallpaperTextures = results.slice(base + 2) as THREE.Texture[]

      texturesRef.current = { on, off }
      const activeSet = lightsOn ? on : off

      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return

        if (child.name === 'inc_target_t3' && groupRef.current) {
          const worldPos = child.getWorldPosition(new THREE.Vector3())
          groupRef.current.worldToLocal(worldPos)
          setSmokePos([worldPos.x, worldPos.y + .68, worldPos.z + (-.09)])
        }

        if (child.name === 'dish_target_t1')       dishRef.current      = child
        if (child.name === 'dish_stand_target_t1') dishStandRef.current = child
        if (child.name === 'cooler_target_t1')     coolerRef.current    = child
        if (child.name === 'git_target_t1')        githubRef.current    = child
        if (child.name === 'linkedin_target_t1')   linkedinRef.current  = child
        if (child.name === 'frame_target_t1')      frameRef.current     = child

        if (child.name === 'sketch_base_target') {
          sketchBaseRef.current = child
          child.material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
          return
        }
        if (child.name === 'sketch_target') {
          sketchRef.current = child
          child.material = new THREE.MeshBasicMaterial({ map: naturoTex, color: new THREE.Color(0.55, 0.55, 0.55), side: THREE.FrontSide })
          return
        }
        if (child.name === 'photo_target') {
          photoRef.current = child
          child.material = new THREE.MeshBasicMaterial({ map: familyTex, side: THREE.FrontSide })
          return
        }
        if (child.name === 'screensaver_target') {
          screensaverRef.current = child
          child.material = new THREE.MeshBasicMaterial({ map: wallpaperTextures[0], side: THREE.FrontSide, transparent: true })
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

      const CYCLE_INTERVAL = 8000
      const FADE_DURATION  = 1.0

      const crossfade = () => {
        const mesh = screensaverRef.current
        if (!mesh) return
        const mat = mesh.material as THREE.MeshBasicMaterial
        gsap.to(mat, {
          opacity: 0, duration: FADE_DURATION, ease: 'power2.in', onUpdate: invalidate,
          onComplete: () => {
            wallpaperIndexRef.current = (wallpaperIndexRef.current + 1) % wallpaperTextures.length
            mat.map = wallpaperTextures[wallpaperIndexRef.current]
            mat.needsUpdate = true
            gsap.to(mat, { opacity: 1, duration: FADE_DURATION, ease: 'power2.out', onUpdate: invalidate })
          },
        })
      }

      cycleId = setInterval(crossfade, CYCLE_INTERVAL)

      setMeshesReady(true)
      onLoaded()
    })

    return () => { cancelled = true; clearInterval(cycleId) }
  }, [scene])

  useEffect(() => {
    if (!texturesRef.current) return
    const textureSet = lightsOn ? texturesRef.current.on : texturesRef.current.off
    meshTextureKeysRef.current.forEach((key, mesh) => {
      if (!(mesh.material instanceof THREE.MeshBasicMaterial)) return
      mesh.material.map = textureSet[key]
      mesh.material.needsUpdate = true
    })

    const dimColor    = lightsOn ? 1    : 0.12
    const sketchColor = lightsOn ? 0.55 : 0.08

    const tint = (mesh: THREE.Mesh | null, brightness: number) => {
      if (!mesh) return
      const mat = mesh.material as THREE.MeshBasicMaterial
      gsap.to(mat.color, { r: brightness, g: brightness, b: brightness, duration: 0.5, ease: 'power2.out', onUpdate: invalidate })
    }

    tint(photoRef.current,       dimColor)
    tint(screensaverRef.current, dimColor)
    tint(sketchRef.current,      sketchColor)
  }, [lightsOn])

  return {
    groupRef,
    smokePos,
    meshesReady,
    dishRef,
    dishStandRef,
    coolerRef,
    sketchRef,
    sketchBaseRef,
    githubRef,
    linkedinRef,
    photoRef,
    frameRef,
  }
}
