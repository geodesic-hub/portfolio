import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LoadingScreen from './LoadingScreen'
import ComputerHUD from './ComputerHUD'
import ContactView from './views/ContactView'
import IntroView from './views/IntroView'
import type { IntroAction } from './views/IntroView'
import SketchView from './views/SketchView'
import GithubView from './views/GithubView'
import LinkedinView from './views/LinkedinView'
import AboutView from './views/AboutView'
import FamilyView from './views/FamilyView'
import { Mouse } from 'lucide-react'
import Joystick from './Joystick'
import ThreeView from './ThreeView'
import LinkDock from './LinkDock'
import type { LinkView } from './LinkDock'
import { useAudio } from './hooks/useAudio'
import gsap from 'gsap'
import './Scene.css'

type HUDView = 'intro' | 'contact' | 'sketch' | 'github' | 'linkedin' | 'about' | 'family' | null

export default function Scene() {
  const { startWind, startNature, muted, toggleMute } = useAudio()

  const [lightsOn, setLightsOn]           = useState(true)
  const [podOpen, setPodOpen]             = useState(false)
  const [isLoaded, setIsLoaded]           = useState(false)
  const [showLoading, setShowLoading]     = useState(true)
  const [, setCameraStarted]              = useState(false)
  const [hudVisible, setHudVisible]       = useState(false)
  const [hudView, setHudView]             = useState<HUDView>(null)
  const squeeze = (el: EventTarget) =>
    gsap.fromTo(el as HTMLElement, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })

  const cameraActiveRef = useRef(false)
  const cameraResetRef  = useRef<(() => void) | null>(null)
  const joystickRef     = useRef({ x: 0, y: 0 })
  const controlsRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hudVisible || !controlsRef.current) return
    gsap.fromTo(controlsRef.current.children,
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.08, delay: 0.1 }
    )
  }, [hudVisible])

  const handleLoaded         = useCallback(() => setIsLoaded(true), [])
  const handleSketchClick    = useCallback(() => setHudView('sketch'), [])
  const selectLink           = useCallback((v: LinkView) => setHudView(cur => (cur === v ? null : v)), [])
  const handlePhotoClick     = useCallback(() => setHudView('family'), [])
  const handleCameraAnimDone = useCallback(() => { startNature(); setHudVisible(true); setHudView('intro') }, [])

  const handleIntro = useCallback((a: IntroAction) => {
    if (a === 'about')   setHudView('about')
    if (a === 'contact') setHudView('contact')
    if (a === 'pod')     { setPodOpen(true); setHudView(null) }
    if (a === 'explore') setHudView(null)
  }, [])

  const hudContent = useMemo(() => {
    if (hudView === 'intro')   return <IntroView onAction={handleIntro} />
    if (hudView === 'contact') return <ContactView />
    if (hudView === 'sketch')  return <SketchView />
    if (hudView === 'github')   return <GithubView />
    if (hudView === 'linkedin') return <LinkedinView />
    if (hudView === 'about')   return <AboutView />
    if (hudView === 'family')  return <FamilyView />
    return null
  }, [hudView, handleIntro])

  return (
    <div className="scene-root">
      <ThreeView
        lightsOn={lightsOn}
        podOpen={podOpen}
        joystickRef={joystickRef}
        onLoaded={handleLoaded}
        onSketchClick={handleSketchClick}
        onPhotoClick={handlePhotoClick}
        onCameraAnimDone={handleCameraAnimDone}
        cameraActiveRef={cameraActiveRef}
        cameraResetRef={cameraResetRef}
      />

      {showLoading && (
        <LoadingScreen
          isLoaded={isLoaded}
          onStart={startWind}
          onFadeStart={() => { cameraActiveRef.current = true; setCameraStarted(true) }}
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
        {hudVisible && <LinkDock variant="bar" active={hudView} onSelect={selectLink} />}
      </div>


      {hudVisible && (
        <div ref={controlsRef} className="scene-controls">
          <button className="crt-btn-green scene-pod-btn" onClick={e => { squeeze(e.currentTarget); setPodOpen(o => !o) }}>
            {podOpen ? 'CLOSE POD' : 'OPEN POD'}
          </button>
          <LinkDock variant="side" active={hudView} onSelect={selectLink} />
        </div>
      )}

    </div>
  )
}
