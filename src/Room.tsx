import { useGLTF } from '@react-three/drei'
import Smoke from './Smoke'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { useRoomTextures } from './hooks/useRoomTextures'
import Animals from './Animals'
import PodReveal from './PodReveal'
import ClickMarkers from './ClickMarkers'
import { clickHints } from './clickHints'
import Rocket from './Rocket'

// touch screens have no hover: the pointer stays where the last tap landed, which would leave
// tapped objects stuck enlarged. They rely on the periodic pop instead.
const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

interface RoomProps {
  lightsOn: boolean
  podOpen: boolean
  onLoaded: () => void
  onSketchClick: () => void
  onPhotoClick: () => void
}

function Room({ lightsOn, podOpen, onLoaded, onSketchClick, onPhotoClick }: RoomProps) {
  const { scene } = useGLTF('/model/room.glb', '/draco/') // self-hosted Draco decoder (public/draco), no CDN
  const { invalidate } = useThree()

  const {
    groupRef,
    smokePos,
    meshesReady,
    coolerRef,
    sketchRef,
    sketchBaseRef,
    githubRef,
    linkedinRef,
    photoRef,
    frameRef,
  } = useRoomTextures({ scene, lightsOn, onLoaded })

  const sketchHovered   = useRef(false)
  const photoHovered    = useRef(false)

  // the old GitHub / LinkedIn tablets stay hidden; links live in the on-screen dock now
  useEffect(() => {
    if (!meshesReady) return
    for (const mesh of [githubRef.current, linkedinRef.current]) {
      if (!mesh) continue
      mesh.visible = false
      mesh.raycast = () => {}
    }
    invalidate()
  }, [meshesReady])

  // Pulse all clickable meshes every 10 seconds once loaded
  useEffect(() => {
    if (!meshesReady) return

    const pop = (mesh: THREE.Mesh | null, max: number, delay = 0) => {
      if (!mesh) return
      gsap.to(mesh.scale, {
        x: max, y: max, z: max, duration: 0.3, ease: 'back.out(2)', delay, overwrite: true, onUpdate: invalidate,
        onComplete: () => gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.in', delay: 0.1, onUpdate: invalidate }),
      })
    }

    const r = () => Math.random() * 1.2

    const pulse = () => {
      const sketchDelay = r()
      const photoDelay  = r()
      pop(sketchRef.current,     1.45, sketchDelay)
      pop(sketchBaseRef.current, 1.45, sketchDelay)
      pop(photoRef.current,      1.3,  photoDelay)
      pop(frameRef.current,      1.3,  photoDelay)
    }

    pulse()
    const id = setInterval(pulse, 10000)
    return () => clearInterval(id)
  }, [meshesReady])

  // Hover scale + cooler rotation
  useFrame((state) => {
    const hoverScale = (mesh: THREE.Mesh, s: number, ease: string) =>
      gsap.to(mesh.scale, { x: s, y: s, z: s, duration: 0.25, ease, overwrite: true, onUpdate: invalidate })

    if (coolerRef.current) {
      coolerRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * (Math.PI / 4)
    }

    if (sketchRef.current) {
      const hit = CAN_HOVER && state.raycaster.intersectObject(sketchRef.current, false).length > 0
      if (hit !== sketchHovered.current) {
        sketchHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        const s = hit ? 1.25 : 1; const ease = hit ? 'power2.out' : 'power2.in'
        hoverScale(sketchRef.current, s, ease)
        if (sketchBaseRef.current) hoverScale(sketchBaseRef.current, s, ease)
      }
    }

    if (photoRef.current) {
      const hit = CAN_HOVER && state.raycaster.intersectObject(photoRef.current, false).length > 0
      if (hit !== photoHovered.current) {
        photoHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        const s = hit ? 1.25 : 1; const ease = hit ? 'power2.out' : 'power2.in'
        hoverScale(photoRef.current, s, ease)
        if (frameRef.current) hoverScale(frameRef.current, s, ease)
      }
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.object.name === 'sketch_target')      { e.stopPropagation(); clickHints.mark('sketch'); onSketchClick() }
          if (e.object.name === 'photo_target')       { e.stopPropagation(); clickHints.mark('photo'); onPhotoClick() }
          // click handlers live on a parent for multi-part objects (the rocket's fins/nose are child meshes)
          for (let o: THREE.Object3D | null = e.object; o; o = o.parent) {
            if (o.userData.onClick) { e.stopPropagation(); o.userData.onClick(); break }
          }
        }}
      />
      <Animals scene={scene} />
      <Rocket scene={scene} />
      <PodReveal scene={scene} open={podOpen} ready={meshesReady} />
      <ClickMarkers scene={scene} ready={meshesReady} />
      {smokePos && <Smoke position={smokePos} />}
    </group>
  )
}
useGLTF.preload('/model/room.glb', '/draco/')

export default Room
