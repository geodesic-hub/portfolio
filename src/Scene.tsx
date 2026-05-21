import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Room from './Room'
import LoadingScreen from './LoadingScreen'
import ComputerHUD from './ComputerHUD'
import ContactView from './views/ContactView'
import IntroView from './views/IntroView'
import SketchView from './views/SketchView'
import GithubView from './views/GithubView'
import AboutView from './views/AboutView'
import { LightbulbOff, Lightbulb } from 'lucide-react'
import './Scene.css'

const CAM_START: [number, number, number] = [500, 500, 500]
const CAM_START_VEC = new THREE.Vector3(...CAM_START)
const CAM_END = new THREE.Vector3(45, 15, 25)
const CAM_DURATION = 5

function easeOut(t: number) { return 1 - (1 - t) ** 3 }

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
  orbitRef,
  onDone,
}: {
  cameraActiveRef: { current: boolean }
  orbitRef: { current: any }
  onDone: () => void
}) {
  const { camera } = useThree()
  const progress    = useRef(0)
  const orbitDisabled = useRef(false)

  useEffect(() => {
    camera.lookAt(0, 0, 0)
  }, [camera])

  useFrame((_, delta) => {
    if (!cameraActiveRef.current) return

    if (!orbitDisabled.current && orbitRef.current) {
      orbitRef.current.enableRotate = false
      orbitRef.current.enableZoom = false
      orbitRef.current.enablePan = false
      orbitDisabled.current = true
    }

    progress.current = Math.min(progress.current + delta / CAM_DURATION, 1)
    camera.position.lerpVectors(CAM_START_VEC, CAM_END, easeOut(progress.current))
    camera.lookAt(0, 0, 0)

    if (progress.current >= 1) {
      cameraActiveRef.current = false
      progress.current = 0
      orbitDisabled.current = false
      if (orbitRef.current) {
        orbitRef.current.enableRotate = true
        orbitRef.current.enableZoom = true
        orbitRef.current.enablePan = true
      }
      setTimeout(onDone, 0)
    }
  })

  return null
}

const ThreeView = memo(function ThreeView({
  lightsOn,
  onLoaded,
  onDishClick,
  onSketchClick,
  onGithubClick,
  onLinkedinClick,
  onCameraAnimDone,
  cameraActiveRef,
}: {
  lightsOn: boolean
  onLoaded: () => void
  onDishClick: () => void
  onSketchClick: () => void
  onGithubClick: () => void
  onLinkedinClick: () => void
  onCameraAnimDone: () => void
  cameraActiveRef: { current: boolean }
}) {
  const orbitRef = useRef<any>(null)

  return (
    <Canvas
      camera={{ position: CAM_START, fov: 45 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'black' }}
      gl={{ toneMapping: THREE.NoToneMapping, antialias: true }}
      frameloop="demand"
    >
      <FrameCapper fps={60} />
      <OrbitControls
        ref={orbitRef}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.52}
        minAzimuthAngle={0}
        maxAzimuthAngle={Math.PI * 0.50}
        minDistance={5}
        maxDistance={55}
        panSpeed={0.3}
        zoomToCursor
        enableDamping
        dampingFactor={0.08}
      />
      <Stars radius={80} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
      <Clouds material={THREE.MeshBasicMaterial} limit={10}>
        {/* <Float speed={0.4} floatIntensity={0.6} floatingRange={[-0.4, 0.4]}> */}
          <Cloud position={[1, -8, 1]} speed={0.1} opacity={0.05} color="#aaffcc" segments={20} scale={[4, 4, 4]} rotation={[0, Math.PI * 0.3, 0]} />
        {/* </Float> */}
      </Clouds>
      <Room lightsOn={lightsOn} onLoaded={onLoaded} onDishClick={onDishClick} onSketchClick={onSketchClick} onGithubClick={onGithubClick} onLinkedinClick={onLinkedinClick} />
      <CameraIntro cameraActiveRef={cameraActiveRef} orbitRef={orbitRef} onDone={onCameraAnimDone} />
    </Canvas>
  )
})

type HUDView = 'intro' | 'contact' | 'sketch' | 'github' | 'about' | null

export default function Scene() {
  const [lightsOn, setLightsOn]           = useState(true)
  const [isLoaded, setIsLoaded]           = useState(false)
  const [showLoading, setShowLoading]     = useState(true)
  const [, setCameraStarted] = useState(false)
  const [hudVisible, setHudVisible]       = useState(false)
  const [hudView, setHudView]             = useState<HUDView>(null)
  const [wipVisible, setWipVisible]       = useState(true)
  const cameraActiveRef = useRef(false)

  const handleLoaded         = useCallback(() => setIsLoaded(true), [])
  const handleDishClick      = useCallback(() => setHudView('contact'), [])
  const handleSketchClick    = useCallback(() => setHudView('sketch'), [])
  const handleGithubClick    = useCallback(() => setHudView('github'), [])
  const handleLinkedinClick  = useCallback(() => window.open('https://www.linkedin.com/in/harshvardhan-singh-chouhan-670a75156/', '_blank'), [])
  const handleCameraAnimDone = useCallback(() => { setHudVisible(true); setHudView('intro') }, [])

  const hudContent = useMemo(() => {
    if (hudView === 'intro')   return <IntroView onDone={() => setHudView(null)} />
    if (hudView === 'contact') return <ContactView />
    if (hudView === 'sketch')  return <SketchView />
    if (hudView === 'github')  return <GithubView />
    if (hudView === 'about')   return <AboutView />
    return null
  }, [hudView])

  return (
    <div className="scene-root">
      <ThreeView
        lightsOn={lightsOn}
        onLoaded={handleLoaded}
        onDishClick={handleDishClick}
        onSketchClick={handleSketchClick}
        onGithubClick={handleGithubClick}
        onLinkedinClick={handleLinkedinClick}
        onCameraAnimDone={handleCameraAnimDone}
        cameraActiveRef={cameraActiveRef}
      />

      {showLoading && (
        <LoadingScreen
          isLoaded={isLoaded}
          onFadeStart={() => { cameraActiveRef.current = true; setCameraStarted(true) }}
          onHide={() => { setShowLoading(false) }}
        />
      )}

      <ComputerHUD visible={hudVisible} content={hudContent} />

      {wipVisible && !showLoading && (
        <div className="scene-wip-badge">
          ⚠ WORK IN PROGRESS. The website is not finished yet, so if you see things that feel incomplete, its because they are, thank you!
          <button className="scene-wip-close" onClick={() => setWipVisible(false)}>✕</button>
        </div>
      )}

      {hudVisible && (
        <div className="scene-controls">
          <button className="crt-btn" onClick={() => setHudView(v => v === 'about' ? null : 'about')}>
            ABOUT
          </button>
          <button
            className={`scene-light-btn ${lightsOn ? 'scene-light-btn-on' : 'scene-light-btn-off'}`}
            onClick={() => setLightsOn(p => !p)}
          >
            {lightsOn ? <LightbulbOff size={32} /> : <Lightbulb size={32} />}
          </button>
        </div>
      )}
    </div>
  )
}
