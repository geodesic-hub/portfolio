import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LoadingScreen from './LoadingScreen'
import ComputerHUD from './ComputerHUD'
import ContactView from './views/ContactView'
import IntroView from './views/IntroView'
import SketchView from './views/SketchView'
import GithubView from './views/GithubView'
import LinkedinView from './views/LinkedinView'
import AboutView from './views/AboutView'
import { Mouse } from 'lucide-react'
import Joystick from './Joystick'
import ThreeView from './ThreeView'
import { useAudio } from './hooks/useAudio'
import gsap from 'gsap'
import './Scene.css'

type HUDView = 'intro' | 'contact' | 'sketch' | 'github' | 'linkedin' | 'about' | null

export default function Scene() {
  const { playLoading, fadeOutLoading, startAmbient, muted, toggleMute } = useAudio()

  const [lightsOn, setLightsOn]           = useState(true)
  const [isLoaded, setIsLoaded]           = useState(false)
  const [showLoading, setShowLoading]     = useState(true)
  const [, setCameraStarted]              = useState(false)
  const [hudVisible, setHudVisible]       = useState(false)
  const [hudView, setHudView]             = useState<HUDView>(null)
  const [wipVisible, setWipVisible]       = useState(true)
  const squeeze = (el: EventTarget) =>
    gsap.fromTo(el as HTMLElement, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })

  const cameraActiveRef = useRef(false)
  const cameraResetRef  = useRef<(() => void) | null>(null)
  const joystickRef     = useRef({ x: 0, y: 0 })
  const wipRef          = useRef<HTMLDivElement>(null)
  const controlsRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showLoading || !wipRef.current) return
    gsap.fromTo(wipRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.2 })
  }, [showLoading])

  useEffect(() => {
    if (!hudVisible || !controlsRef.current) return
    gsap.fromTo(controlsRef.current.children,
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.08, delay: 0.1 }
    )
  }, [hudVisible])

  const handleLoaded         = useCallback(() => setIsLoaded(true), [])
  const handleDishClick      = useCallback(() => setHudView('contact'), [])
  const handleSketchClick    = useCallback(() => setHudView('sketch'), [])
  const handleGithubClick    = useCallback(() => setHudView('github'), [])
  const handleLinkedinClick  = useCallback(() => setHudView('linkedin'), [])
  const handleCameraAnimDone = useCallback(() => { startAmbient(); setHudVisible(true); setHudView('intro') }, [])

  const hudContent = useMemo(() => {
    if (hudView === 'intro')   return <IntroView onDone={() => setHudView(null)} />
    if (hudView === 'contact') return <ContactView />
    if (hudView === 'sketch')  return <SketchView />
    if (hudView === 'github')   return <GithubView />
    if (hudView === 'linkedin') return <LinkedinView />
    if (hudView === 'about')   return <AboutView />
    return null
  }, [hudView])

  return (
    <div className="scene-root">
      <ThreeView
        lightsOn={lightsOn}
        joystickRef={joystickRef}
        onLoaded={handleLoaded}
        onDishClick={handleDishClick}
        onSketchClick={handleSketchClick}
        onGithubClick={handleGithubClick}
        onLinkedinClick={handleLinkedinClick}
        onCameraAnimDone={handleCameraAnimDone}
        cameraActiveRef={cameraActiveRef}
        cameraResetRef={cameraResetRef}
      />

      {showLoading && (
        <LoadingScreen
          isLoaded={isLoaded}
          onStart={playLoading}
          onFadeStart={() => { fadeOutLoading(); cameraActiveRef.current = true; setCameraStarted(true) }}
          onHide={() => { setShowLoading(false) }}
        />
      )}

      <div className="scene-bottom-overlay">
        {!showLoading && (
          <div className="scene-joystick-row">
            <div className="scene-joystick">
              <Joystick deltaRef={joystickRef} />
              <div className="scene-joystick-label">PAN</div>
            </div>
          </div>
        )}
        <div className="scene-terminal-row">
          <ComputerHUD
            visible={hudVisible}
            content={hudContent}
            lightsOn={lightsOn}
            muted={muted}
            onReset={() => cameraResetRef.current?.()}
            onToggleLights={() => setLightsOn(p => !p)}
            onToggleMute={toggleMute}
          />
          {hudVisible && (
            <div className="scene-hint">
              <Mouse size={18} className="scene-hint-icon" />
              <div className="scene-hint-panel">
                <div className="scene-hint-row"><span>LEFT DRAG</span><span>ROTATE</span></div>
                <div className="scene-hint-row"><span>RIGHT DRAG</span><span>PAN</span></div>
                <div className="scene-hint-row"><span>SCROLL</span><span>ZOOM</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {wipVisible && !showLoading && (
        <div ref={wipRef} className="scene-wip-badge">
          ⚠ WORK IN PROGRESS. The website is not finished yet, sounds and rocket physics to be implemented. Thank you!
          <button className="scene-wip-close" onClick={() => setWipVisible(false)}>✕</button>
        </div>
      )}

      {hudVisible && (
        <div ref={controlsRef} className="scene-controls">
          <button className="crt-btn" onClick={e => { squeeze(e.currentTarget); setHudView(v => v === 'about' ? null : 'about') }}>
            ABOUT
          </button>
        </div>
      )}

    </div>
  )
}
