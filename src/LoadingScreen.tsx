import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import './LoadingScreen.css'

/** Ascent screen: real asset progress drives an altitude counter, then ASCEND starts the camera flight. */

const TARGET_ALT = 1200 // metres shown when everything has loaded

// cycled under the title so the range shows at a glance
const CAPABILITIES = [
  'full-stack apps',
  'cloud data pipelines',
  'AI & LLM tools',
  '3D worlds in Blender',
  'sketches & visual design',
  'Android apps',
]

interface Props { isLoaded: boolean; onFadeStart: () => void; onHide: () => void; onStart?: () => void }

export default function LoadingScreen({ isLoaded, onFadeStart, onHide, onStart }: Props) {
  const { progress } = useProgress()
  const [alt, setAlt] = useState(0)
  const [ready, setReady] = useState(false)
  const [cap, setCap] = useState(0)
  const capRef = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const leaving = useRef(false)

  // asset progress tops out at 95% until the room reports it is fully set up
  const target = isLoaded ? 100 : Math.min(progress, 95)

  // ease the displayed value toward the real one so the counter climbs smoothly
  useEffect(() => {
    let raf = 0
    const tick = () => {
      shown.current += (target - shown.current) * 0.08
      if (Math.abs(target - shown.current) < 0.05) shown.current = target
      setAlt(shown.current)
      if (shown.current < target) raf = requestAnimationFrame(tick)
      else if (target >= 100) setReady(true)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    const id = setInterval(() => {
      const el = capRef.current
      if (!el) return
      gsap.to(el, { opacity: 0, y: -6, duration: 0.25, ease: 'power2.in', onComplete: () => {
        setCap(i => (i + 1) % CAPABILITIES.length)
        gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
      } })
    }, 2200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (ready && ctaRef.current)
      gsap.fromTo(ctaRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
  }, [ready])

  const ascend = () => {
    if (leaving.current) return
    leaving.current = true
    onStart?.()
    onFadeStart()
    gsap.to(overlayRef.current, { opacity: 0, duration: 1.1, ease: 'power2.inOut', onComplete: onHide })
  }

  const metres = Math.round((alt / 100) * TARGET_ALT)

  return (
    <div ref={overlayRef} className="as-overlay">
      <div className="as-stars" />
      <div className="as-horizon" />

      <div className="as-center">
        <div className="as-kicker">PORTFOLIO</div>
        <h1 className="as-name">HARSH</h1>
        <div className="as-role">Software &amp; Data Engineer</div>
        <div className="as-caps">
          <span className="as-caps-lead">builds </span>
          <span ref={capRef} className="as-caps-item">{CAPABILITIES[cap]}</span>
        </div>

        <div className="as-gauge">
          <div className="as-alt">
            <span className="as-alt-label">ALTITUDE</span>
            <span className="as-alt-value">{metres.toLocaleString('en-US')}<span className="as-alt-unit"> m</span></span>
          </div>
          <div className="as-bar"><div className="as-bar-fill" style={{ width: `${alt}%` }} /></div>
          <div className="as-status">{ready ? 'READY FOR ASCENT' : 'PREPARING ASCENT…'}</div>
        </div>

        {ready && (
          <button ref={ctaRef} className="as-cta" onClick={ascend}>
            ASCEND
          </button>
        )}
      </div>
    </div>
  )
}
