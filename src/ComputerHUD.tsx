import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import './ComputerHUD.css'
import { Minus, Plus, RotateCcw, LightbulbOff, Lightbulb, Volume2, VolumeX } from 'lucide-react'

interface HUDProps {
  visible: boolean
  content: React.ReactNode
  lightsOn?: boolean
  muted?: boolean
  onReset?: () => void
  onToggleLights?: () => void
  onToggleMute?: () => void
}

export default function ComputerHUD({ visible, content, lightsOn, muted, onReset, onToggleLights, onToggleMute }: HUDProps) {
  const [expanded, setExpanded]     = useState(false)
  const panelRef      = useRef<HTMLDivElement>(null)
  const screenWrapRef = useRef<HTMLDivElement>(null)
  const contentRef    = useRef<HTMLDivElement>(null)

  const squeeze = (el: HTMLElement) =>
    gsap.fromTo(el, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })

  useEffect(() => {
    if (content) setExpanded(true)
  }, [content])

  useEffect(() => {
    if (!expanded) return
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setExpanded(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [expanded])

  useEffect(() => {
    const wrap = screenWrapRef.current
    const body = contentRef.current
    if (!wrap || !body) return

    if (expanded) {
      const tl = gsap.timeline()
      tl.to(wrap, { height: 'auto', duration: 0.4, ease: 'power3.out' })
      tl.fromTo(body, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, '-=0.1')
    } else {
      gsap.to(body, { opacity: 0, y: 4, duration: 0.15, ease: 'power1.in' })
      gsap.to(wrap, { height: 0,    duration: 0.28, ease: 'power2.in', delay: 0.1 })
    }
  }, [expanded])

  if (!visible) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div ref={panelRef} className="crt-bezel" style={{ pointerEvents: 'auto', width: '100%', maxWidth: 480 }}>

        <div className="crt-titlebar" onClick={() => setExpanded(e => !e)}>
          <div className="crt-titlebar-left">
            <span className="crt-led" />
          </div>
          <span className="crt-model">Terminal</span>
          <div className="crt-titlebar-right">
            <div className="crt-titlebar-actions" onClick={e => e.stopPropagation()}>
              {onReset && (
                <button className="crt-titlebar-btn" onClick={e => { squeeze(e.currentTarget); onReset() }} title="Reset camera">
                  <RotateCcw size={18} />
                </button>
              )}
              {onToggleLights && (
                <button
                  className={`crt-titlebar-btn ${lightsOn ? 'crt-titlebar-btn--lit' : ''}`}
                  onClick={e => { squeeze(e.currentTarget); onToggleLights() }}
                  title={lightsOn ? 'Lights off' : 'Lights on'}
                >
                  {lightsOn ? <LightbulbOff size={18} /> : <Lightbulb size={18} />}
                </button>
              )}
              {onToggleMute && (
                <button
                  className={`crt-titlebar-btn ${muted ? '' : 'crt-titlebar-btn--lit'}`}
                  onClick={e => { squeeze(e.currentTarget); onToggleMute() }}
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </div>
            <button className="crt-collapse-btn">
              {expanded ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </div>

        <div ref={screenWrapRef} style={{ overflow: 'hidden', height: 0 }}>
          <div className="crt-screen">
            <div ref={contentRef} className="crt-content" style={{ opacity: 0 }}>
              {content
                ? <><div className="crt-transmission">&gt; INCOMING TRANSMISSION...</div>{content}</>
                : <div className="crt-idle">AWAITING INPUT, PLEASE CLICK ON OBJECTS TO RECIEVE DATA<span className="hud-cursor">▌</span></div>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
