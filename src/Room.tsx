import { useGLTF } from '@react-three/drei'
import Smoke from './Smoke'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { useRoomTextures } from './hooks/useRoomTextures'

interface RoomProps {
  lightsOn: boolean
  onLoaded: () => void
  onDishClick: () => void
  onSketchClick: () => void
  onGithubClick: () => void
  onLinkedinClick: () => void
  onPhotoClick: () => void
}

function Room({ lightsOn, onLoaded, onDishClick, onSketchClick, onGithubClick, onLinkedinClick, onPhotoClick }: RoomProps) {
  const { scene } = useGLTF('/model/room.glb')
  const { invalidate } = useThree()

  const {
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
  } = useRoomTextures({ scene, lightsOn, onLoaded })

  const dishHovered     = useRef(false)
  const sketchHovered   = useRef(false)
  const githubHovered   = useRef(false)
  const linkedinHovered = useRef(false)
  const photoHovered    = useRef(false)

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
      const dishDelay   = r()
      const sketchDelay = r()
      const photoDelay  = r()
      pop(dishRef.current,       1.3,  dishDelay)
      pop(dishStandRef.current,  1.5,  dishDelay)
      pop(sketchRef.current,     1.3,  sketchDelay)
      pop(sketchBaseRef.current, 1.3,  sketchDelay)
      pop(photoRef.current,      1.15, photoDelay)
      pop(frameRef.current,      1.15, photoDelay)
      pop(githubRef.current,     1.5,  r())
      pop(linkedinRef.current,   1.5,  r())
    }

    pulse()
    const id = setInterval(pulse, 10000)
    return () => clearInterval(id)
  }, [meshesReady])

  // Hover scale + dish/cooler rotation
  useFrame((state, delta) => {
    const hoverScale = (mesh: THREE.Mesh, s: number, ease: string) =>
      gsap.to(mesh.scale, { x: s, y: s, z: s, duration: 0.25, ease, overwrite: true, onUpdate: invalidate })

    if (dishRef.current) {
      dishRef.current.rotation.y += delta * 0.8
      const hit = state.raycaster.intersectObject(dishRef.current, false).length > 0
      if (hit !== dishHovered.current) {
        dishHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        const s = hit ? 1.2 : 1; const ease = hit ? 'power2.out' : 'power2.in'
        hoverScale(dishRef.current, s, ease)
        if (dishStandRef.current) hoverScale(dishStandRef.current, s, ease)
      }
    }

    if (coolerRef.current) {
      coolerRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * (Math.PI / 4)
    }

    if (sketchRef.current) {
      const hit = state.raycaster.intersectObject(sketchRef.current, false).length > 0
      if (hit !== sketchHovered.current) {
        sketchHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        const s = hit ? 1.15 : 1; const ease = hit ? 'power2.out' : 'power2.in'
        hoverScale(sketchRef.current, s, ease)
        if (sketchBaseRef.current) hoverScale(sketchBaseRef.current, s, ease)
      }
    }

    if (photoRef.current) {
      const hit = state.raycaster.intersectObject(photoRef.current, false).length > 0
      if (hit !== photoHovered.current) {
        photoHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        const s = hit ? 1.15 : 1; const ease = hit ? 'power2.out' : 'power2.in'
        hoverScale(photoRef.current, s, ease)
        if (frameRef.current) hoverScale(frameRef.current, s, ease)
      }
    }

    if (githubRef.current) {
      const hit = state.raycaster.intersectObject(githubRef.current, false).length > 0
      if (hit !== githubHovered.current) {
        githubHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        hoverScale(githubRef.current, hit ? 1.2 : 1, hit ? 'power2.out' : 'power2.in')
      }
    }

    if (linkedinRef.current) {
      const hit = state.raycaster.intersectObject(linkedinRef.current, false).length > 0
      if (hit !== linkedinHovered.current) {
        linkedinHovered.current = hit
        document.body.style.cursor = hit ? 'pointer' : 'auto'
        hoverScale(linkedinRef.current, hit ? 1.2 : 1, hit ? 'power2.out' : 'power2.in')
      }
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.object.name === 'dish_target_t1')     { e.stopPropagation(); onDishClick() }
          if (e.object.name === 'sketch_target')      { e.stopPropagation(); onSketchClick() }
          if (e.object.name === 'git_target_t1')      { e.stopPropagation(); onGithubClick() }
          if (e.object.name === 'linkedin_target_t1') { e.stopPropagation(); onLinkedinClick() }
          if (e.object.name === 'photo_target')       { e.stopPropagation(); onPhotoClick() }
        }}
      />
      {smokePos && <Smoke position={smokePos} />}
    </group>
  )
}
useGLTF.preload('/model/room.glb')

export default Room
