import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Room from './Room'
import LoadingScreen from './LoadingScreen'
import PocketDimension from './PocketDimension'
import ComputerHUD from './ComputerHUD'
import ContactView from './views/ContactView'
import IntroView from './views/IntroView'
import SketchView from './views/SketchView'
import GithubView from './views/GithubView'
import AboutView from './views/AboutView'
import { LightbulbOff, Lightbulb } from 'lucide-react'

const CAM_START: [number, number, number] = [500, 500, 500]
const CAM_START_VEC = new THREE.Vector3(...CAM_START)
const CAM_END = new THREE.Vector3(35, 15, 25)
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
  sceneReady,
  onLoaded,
  onDishClick,
  onSketchClick,
  onGithubClick,
  onLinkedinClick,
  onCameraAnimDone,
  cameraActiveRef,
}: {
  lightsOn: boolean
  sceneReady: boolean
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
        maxDistance={60}
        enableDamping
        dampingFactor={0.08}
      />
      <PocketDimension sceneReady={sceneReady} />
      <Room lightsOn={lightsOn} onLoaded={onLoaded} onDishClick={onDishClick} onSketchClick={onSketchClick} onGithubClick={onGithubClick} onLinkedinClick={onLinkedinClick} />
      <CameraIntro cameraActiveRef={cameraActiveRef} orbitRef={orbitRef} onDone={onCameraAnimDone} />
      <EffectComposer multisampling={8}>
        <ChromaticAberration offset={new THREE.Vector2(0.0004, 0.0004)} />
        {/* <Glitch
          delay={new THREE.Vector2(20, 20)}
          duration={new THREE.Vector2(0.1, 0.1)}
          strength={new THREE.Vector2(0.01, 0.02)}
          mode={GlitchMode.DISABLED}
          active
          ratio={0.85}
        /> */}
      </EffectComposer>
    </Canvas>
  )
})

type HUDView = 'intro' | 'contact' | 'sketch' | 'github' | 'about' | null

export default function Scene() {
  const [lightsOn, setLightsOn]         = useState(true)
  const [isLoaded, setIsLoaded]         = useState(false)
  const [showLoading, setShowLoading]   = useState(true)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [hudVisible, setHudVisible]     = useState(false)
  const [hudView, setHudView]           = useState<HUDView>(null)
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
    <div style={{ width: '100%', height: '100%' }}>
      <ThreeView
        lightsOn={lightsOn}
        sceneReady={cameraStarted}
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

      <div style={{
        position: 'fixed', top: 20, left: 20, zIndex: 9999,
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: 12,
        color: '#ff6b35',
        textShadow: '0 0 6px rgba(255,107,53,0.7)',
        border: '1px solid rgba(255,107,53,0.35)',
        padding: '6px 12px',
        pointerEvents: 'none',
      }}>
        ⚠ WORK IN PROGRESS. The website is not finished yet, so if you see things that feel incomplete, its because they are, thank you!
      </div>

      {hudVisible && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setHudView(v => v === 'about' ? null : 'about')}
            style={{
              background: 'none',
              border: '1px solid rgba(0,255,65,0.35)',
              cursor: 'pointer',
              color: '#00ff41',
              fontFamily: '"Courier New", monospace',
              fontSize: 10,
              letterSpacing: 3,
              padding: '5px 10px',
              textShadow: '0 0 6px rgba(0,255,65,0.6)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.9)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(0,255,65,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.35)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
          >
            ABOUT
          </button>
          <button
            onClick={() => setLightsOn(p => !p)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: lightsOn ? '#00ff41' : '#ff6b35',
              filter: lightsOn
                ? 'drop-shadow(0 0 6px #00ff41)'
                : 'drop-shadow(0 0 6px #ff6b35)',
              transition: 'color 0.3s, filter 0.3s',
              padding: 4,
            }}
          >
            {lightsOn ? <LightbulbOff size={32} /> : <Lightbulb size={32} />}
          </button>
        </div>
      )}
    </div>
  )
}
