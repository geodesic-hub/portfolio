import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { bakeMap } from './bakeMap'

// Bake atlases: one lights-off (day) and one lights-on (night) texture per group.
// bakeMap.ts is generated from the Blender export's bake-map.json and maps every baked object to its atlas.
type TextureKey = keyof typeof bakeMap.atlases
type TextureSet = Record<TextureKey, THREE.Texture>
const KEYS = Object.keys(bakeMap.atlases) as TextureKey[]
// GLTFLoader sanitizes node names ("rocket_target_t3.001" -> "rocket_target_t3001"), so match on that form
const OBJECT_ATLAS = new Map<string, TextureKey>(
  Object.entries(bakeMap.objects).map(([name, key]) => [THREE.PropertyBinding.sanitizeNodeName(name), key as TextureKey]),
)

const LIGHT_FADE_SECONDS = 0.6

// Phones / tablets get 2048px KTX2 (Basis) bakes that stay compressed on the GPU
// instead of hundreds of MB of raw pixels; desktop keeps the 4096px WebP set.
const IS_MOBILE = typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || Math.min(window.screen.width, window.screen.height) < 820)

// MeshBasicMaterial that samples the lights-off bake (map) and the lights-on bake (mapOn)
// and blends them with a shared uniform, so the lights fade instead of snapping.
function makeBlendedBakeMaterial(off: THREE.Texture, on: THREE.Texture, mix: { value: number }) {
  const mat = new THREE.MeshBasicMaterial({ map: off, side: THREE.FrontSide })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.mapOn = { value: on }
    shader.uniforms.uLightMix = mix
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D mapOn;\nuniform float uLightMix;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = mix( texture2D( map, vMapUv ), texture2D( mapOn, vMapUv ), uLightMix );
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      )
  }
  // one compiled program for every blended material
  mat.customProgramCacheKey = () => 'blended-bake'
  return mat
}

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
  const lightMixRef        = useRef({ value: lightsOn ? 1 : 0 })

  const [smokePos, setSmokePos]       = useState<[number, number, number] | null>(null)
  const [meshesReady, setMeshesReady] = useState(false)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const keys = KEYS

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

    let ktx2: KTX2Loader | null = null
    if (IS_MOBILE) {
      ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl)
    }
    const configureCompressed = (t: THREE.Texture) => {
      t.flipY = false
      t.colorSpace = THREE.SRGBColorSpace
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy())
      gl.initTexture(t)
      return t
    }
    const loadBake = (name: string) => ktx2
      ? ktx2.loadAsync(`/textures/mobile/${name}.ktx2`).then(configureCompressed)
      : loader.loadAsync(`/textures/${name}.webp`).then(configure)

    const loads          = keys.flatMap(k => [loadBake(`${k}-on`), loadBake(`${k}-off`)])
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

      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return

        if (child.name === 'inc_target_t3' && groupRef.current) {
          // smoke rises from the tip of the incense stick: the highest vertex of the holder mesh
          child.updateWorldMatrix(true, false)
          const pos = child.geometry.attributes.position as THREE.BufferAttribute
          const v = new THREE.Vector3(), tip = new THREE.Vector3(0, -Infinity, 0)
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld)
            if (v.y > tip.y) tip.copy(v)
          }
          groupRef.current.worldToLocal(tip)
          setSmokePos([tip.x, tip.y + 0.02, tip.z])
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
          // the quad's exported UVs point at a tiny, sideways window of the bake atlas:
          // rebuild them from the quad's geometry so the whole photo shows upright (top of the photo = up)
          const uv = child.geometry.attributes.uv as THREE.BufferAttribute | undefined
          const pos = child.geometry.attributes.position as THREE.BufferAttribute
          if (uv && pos.count >= 3 && !child.userData.uvFixed) {
            const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i)
            const idx = child.geometry.index
            const [i0, i1, i2] = idx ? [idx.getX(0), idx.getX(1), idx.getX(2)] : [0, 1, 2]
            const a = P(i0), n = P(i1).sub(a).cross(P(i2).sub(a)).normalize() // visible side (local space)
            child.updateWorldMatrix(true, false)
            const worldUp = new THREE.Vector3(0, 1, 0).transformDirection(child.matrixWorld.clone().invert())
            const up = worldUp.sub(n.clone().multiplyScalar(worldUp.dot(n))).normalize()
            const right = new THREE.Vector3().crossVectors(up, n).normalize()
            let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity
            for (let i = 0; i < pos.count; i++) {
              const q = P(i), x = q.dot(right), y = q.dot(up)
              r0 = Math.min(r0, x); r1 = Math.max(r1, x); u0 = Math.min(u0, y); u1 = Math.max(u1, y)
            }
            for (let i = 0; i < pos.count; i++) {
              const q = P(i)
              // flipY is off for these textures, so v = 0 is the top row of the image
              uv.setXY(i, (q.dot(right) - r0) / (r1 - r0), (u1 - q.dot(up)) / (u1 - u0))
            }
            uv.needsUpdate = true
            child.userData.uvFixed = true
          }
          child.material = new THREE.MeshBasicMaterial({ map: familyTex, side: THREE.FrontSide })
          return
        }
        if (child.name === 'screensaver_target') {
          screensaverRef.current = child
          child.material = new THREE.MeshBasicMaterial({ map: wallpaperTextures[0], side: THREE.FrontSide, transparent: true })
          return
        }

        // multi-primitive nodes load as a Group of meshes: fall back to the parent's name
        const key = OBJECT_ATLAS.get(child.name) ?? (child.parent ? OBJECT_ATLAS.get(child.parent.name) : undefined)
        // only baked GLB meshes get the bake material. Meshes added at runtime (rocket shadow and
        // exhaust, etc.) keep their own materials; overwriting them painted the rocket's shadow white.
        if (key) {
          meshTextureKeysRef.current.set(child, key)
          child.material = makeBlendedBakeMaterial(off[key], on[key], lightMixRef.current)
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

    return () => { cancelled = true; clearInterval(cycleId); ktx2?.dispose() }
  }, [scene])

  useEffect(() => {
    if (!texturesRef.current) return
    // fade between the two bakes (all blended materials share this one uniform)
    gsap.to(lightMixRef.current, {
      value: lightsOn ? 1 : 0,
      duration: LIGHT_FADE_SECONDS,
      ease: lightsOn ? 'power2.out' : 'power2.in',
      overwrite: true,
      onUpdate: invalidate,
    })

    // lightsOn = night (lamps on); off = daytime, so screens only dim slightly
    const dimColor    = lightsOn ? 1    : 0.8
    const sketchColor = lightsOn ? 0.55 : 0.45

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
    lightMix: lightMixRef.current,
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
