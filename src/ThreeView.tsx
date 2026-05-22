import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stars, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'
import { memo, useEffect, useRef } from 'react'
import Room from './Room'
import CloudMaterial from './CloudMaterial'
import gsap from 'gsap'

export const CAM_START: [number, number, number] = [500, 500, 500]
export const CAM_END    = new THREE.Vector3(25, 15, 25)
export const CAM_DURATION = 5

function FrameCapper({ fps = 60 }: { fps?: number }) {
  const { invalidate } = useThree()

  useEffect(() => {
    const interval = 1000 / fps
    let last = 0
    let raf: number
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last >= interval) { last = now; invalidate() }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fps, invalidate])

  return null
}

function CameraIntro({
  cameraActiveRef,
  controlsRef,
  cameraResetRef,
  onDone,
}: {
  cameraActiveRef: { current: boolean }
  controlsRef: { current: any }
  cameraResetRef: { current: (() => void) | null }
  onDone: () => void
}) {
  const { camera, invalidate } = useThree()

  useEffect(() => { camera.lookAt(0, 0, 0) }, [camera])

  useFrame(() => {
    if (!cameraActiveRef.current) return
    cameraActiveRef.current = false

    if (controlsRef.current) controlsRef.current.enabled = false

    const pos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }

    gsap.to(pos, {
      x: CAM_END.x, y: CAM_END.y, z: CAM_END.z,
      duration: CAM_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (controlsRef.current) controlsRef.current.setLookAt(pos.x, pos.y, pos.z, 0, 0, 0, false)
        invalidate()
      },
      onComplete: () => {
        if (controlsRef.current) {
          controlsRef.current.setLookAt(CAM_END.x, CAM_END.y, CAM_END.z, 0, 0, 0, false)
          controlsRef.current.setBoundary(new THREE.Box3(
            new THREE.Vector3(-5, 0, -5),
            new THREE.Vector3(80, 50, 80)
          ))
          controlsRef.current.enabled = true
        }
        cameraResetRef.current = () =>
          controlsRef.current?.setLookAt(CAM_END.x, CAM_END.y, CAM_END.z, 0, 0, 0, true)
        setTimeout(onDone, 0)
      },
    })
  })

  return null
}

function JoystickCameraDriver({
  joystickRef,
  controlsRef,
}: {
  joystickRef: { current: { x: number; y: number } }
  controlsRef: { current: any }
}) {
  useFrame((_, delta) => {
    const { x, y } = joystickRef.current
    if ((Math.abs(x) > 0.04 || Math.abs(y) > 0.04) && controlsRef.current) {
      controlsRef.current.truck(x * delta * 8, y * delta * 8, false)
    }
  })
  return null
}

const ThreeView = memo(function ThreeView({
  lightsOn,
  joystickRef,
  onLoaded,
  onDishClick,
  onSketchClick,
  onGithubClick,
  onLinkedinClick,
  onCameraAnimDone,
  cameraActiveRef,
  cameraResetRef,
}: {
  lightsOn: boolean
  joystickRef: { current: { x: number; y: number } }
  onLoaded: () => void
  onDishClick: () => void
  onSketchClick: () => void
  onGithubClick: () => void
  onLinkedinClick: () => void
  onCameraAnimDone: () => void
  cameraActiveRef: { current: boolean }
  cameraResetRef: { current: (() => void) | null }
}) {
  const controlsRef = useRef<any>(null)

  return (
    <Canvas
      camera={{ position: CAM_START, fov: 45 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'black' }}
      gl={{ toneMapping: THREE.NoToneMapping, antialias: true }}
      frameloop="demand"
    >
      <FrameCapper fps={60} />
      <CameraControls
        ref={controlsRef}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.52}
        minAzimuthAngle={0}
        maxAzimuthAngle={Math.PI * 0.50}
        minDistance={5}
        maxDistance={60}
        dollyToCursor
        truckSpeed={.8}
        dampingFactor={0.08}
      />
      <Stars radius={80} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
      <Clouds material={CloudMaterial} limit={10}>
        <Cloud position={[1, -8, 1]} speed={0.1} opacity={0.05} color="#aaffcc" segments={20} scale={[4, 4, 4]} rotation={[0, Math.PI * 0.3, 0]} />
      </Clouds>
      <Room lightsOn={lightsOn} onLoaded={onLoaded} onDishClick={onDishClick} onSketchClick={onSketchClick} onGithubClick={onGithubClick} onLinkedinClick={onLinkedinClick} />
      <CameraIntro cameraActiveRef={cameraActiveRef} controlsRef={controlsRef} cameraResetRef={cameraResetRef} onDone={onCameraAnimDone} />
      <JoystickCameraDriver joystickRef={joystickRef} controlsRef={controlsRef} />
    </Canvas>
  )
})

export default ThreeView
