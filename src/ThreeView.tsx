import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stars, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'
import { memo, useEffect, useRef } from 'react'
import Room from './Room'
import CloudMaterial from './CloudMaterial'
import SkyAndClouds from './SkyAndClouds'
import gsap from 'gsap'

// Intro flight: starts far out near the ground, rises up through the clouds and lands on the island view.
const INTRO_PATH = [
  { pos: [200, -135, 270], look: [0, -35, 0] },  // far out, skimming above the ground (GROUND_Y -150), island ahead
  { pos: [145, -127, 195], look: [0, -30, 0] },
  { pos: [95, -108, 125],  look: [0, -24, 0] },
  { pos: [60, -80, 62],    look: [0, -18, 0] },
  { pos: [48, -40, 46],    look: [0, -12, 0] },
  { pos: [46, -26, 40],    look: [0, -6, 0] },    // through the cloud bank
  { pos: [45, -8, 28],     look: [0, -1, 0] },
  { pos: [35, 15, 18],     look: [0, 0, 0] },     // CAM_END
] as const
const introPos  = new THREE.CatmullRomCurve3(INTRO_PATH.map(p => new THREE.Vector3(...p.pos)), false, 'centripetal')
const introLook = new THREE.CatmullRomCurve3(INTRO_PATH.map(p => new THREE.Vector3(...p.look)), false, 'centripetal')

export const CAM_START: [number, number, number] = [...INTRO_PATH[0].pos]
export const CAM_END    = new THREE.Vector3(35, 15, 18)
export const CAM_DURATION = 15

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

  useEffect(() => { camera.lookAt(...INTRO_PATH[0].look) }, [camera])

  useFrame(() => {
    if (!cameraActiveRef.current) return
    cameraActiveRef.current = false

    const controls = controlsRef.current
    // the flight goes far below the island and looks up, so lift the orbit limits until it lands
    const saved = controls && {
      minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle,
      minAzimuthAngle: controls.minAzimuthAngle, maxAzimuthAngle: controls.maxAzimuthAngle,
      minDistance: controls.minDistance, maxDistance: controls.maxDistance,
    }
    if (controls) {
      controls.enabled = false
      controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI
      controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity
      controls.minDistance = 0; controls.maxDistance = Infinity
    }

    const progress = { t: 0 }
    const p = new THREE.Vector3()
    const l = new THREE.Vector3()

    gsap.to(progress, {
      t: 1,
      duration: CAM_DURATION,
      ease: 'power1.inOut',
      onUpdate: () => {
        introPos.getPointAt(progress.t, p)
        introLook.getPointAt(progress.t, l)
        if (controlsRef.current) controlsRef.current.setLookAt(p.x, p.y, p.z, l.x, l.y, l.z, false)
        invalidate()
      },
      onComplete: () => {
        if (controlsRef.current) {
          if (saved) Object.assign(controlsRef.current, saved)
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
  podOpen,
  joystickRef,
  onLoaded,
  onSketchClick,
  onPhotoClick,
  onCameraAnimDone,
  cameraActiveRef,
  cameraResetRef,
}: {
  lightsOn: boolean
  podOpen: boolean
  joystickRef: { current: { x: number; y: number } }
  onLoaded: () => void
  onSketchClick: () => void
  onPhotoClick: () => void
  onCameraAnimDone: () => void
  cameraActiveRef: { current: boolean }
  cameraResetRef: { current: (() => void) | null }
}) {
  const controlsRef = useRef<any>(null)

  return (
    <Canvas
      camera={{ position: CAM_START, fov: 45, far: 4000 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: '#1b2142' }}
      gl={{ toneMapping: THREE.NoToneMapping, antialias: true }}
      frameloop="demand"
    >
      <FrameCapper fps={60} />
      <CameraControls
        ref={controlsRef}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.52}
        minAzimuthAngle={-Infinity}
        maxAzimuthAngle={Infinity}
        minDistance={5}
        maxDistance={60}
        dollyToCursor
        truckSpeed={.8}
        dampingFactor={0.08}
      />
      <SkyAndClouds night={lightsOn} />
      {lightsOn && <Stars radius={400} depth={200} count={1500} factor={3} saturation={0} fade speed={0.5} />}
      <Clouds material={CloudMaterial} limit={10}>
        <Cloud position={[1, -8, 1]} speed={0.1} opacity={0.05} color="#aaffcc" segments={20} scale={[4, 4, 4]} rotation={[0, Math.PI * 0.3, 0]} />
      </Clouds>
      <Room lightsOn={lightsOn} podOpen={podOpen} onLoaded={onLoaded} onSketchClick={onSketchClick} onPhotoClick={onPhotoClick} />
      <CameraIntro cameraActiveRef={cameraActiveRef} controlsRef={controlsRef} cameraResetRef={cameraResetRef} onDone={onCameraAnimDone} />
      <JoystickCameraDriver joystickRef={joystickRef} controlsRef={controlsRef} />
    </Canvas>
  )
})

export default ThreeView
