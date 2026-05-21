import { useRef, useEffect, useCallback } from 'react'
import './Joystick.css'

interface JoystickProps {
  deltaRef: React.MutableRefObject<{ x: number; y: number }>
}

const RADIUS = 38

export default function Joystick({ deltaRef }: JoystickProps) {
  const outerRef     = useRef<HTMLDivElement>(null)
  const knobRef      = useRef<HTMLDivElement>(null)
  const activeTouchId = useRef<number | null>(null)
  const origin       = useRef({ x: 0, y: 0 })

  const applyDelta = useCallback((dx: number, dy: number) => {
    const dist  = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)
    const r     = Math.min(dist, RADIUS)
    const cx    = Math.cos(angle) * r
    const cy    = Math.sin(angle) * r
    if (knobRef.current)
      knobRef.current.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`
    deltaRef.current = { x: cx / RADIUS, y: cy / RADIUS }
  }, [deltaRef])

  const reset = useCallback(() => {
    if (knobRef.current)
      knobRef.current.style.transform = 'translate(-50%, -50%)'
    deltaRef.current = { x: 0, y: 0 }
  }, [deltaRef])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      if (activeTouchId.current !== null) return
      const t = e.changedTouches[0]
      activeTouchId.current = t.identifier
      const rect = el.getBoundingClientRect()
      origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }

    const onMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === activeTouchId.current) {
          e.preventDefault()
          applyDelta(t.clientX - origin.current.x, t.clientY - origin.current.y)
          break
        }
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          activeTouchId.current = null
          reset()
          break
        }
      }
    }

    el.addEventListener('touchstart',  onStart, { passive: false })
    el.addEventListener('touchmove',   onMove,  { passive: false })
    el.addEventListener('touchend',    onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart',  onStart)
      el.removeEventListener('touchmove',   onMove)
      el.removeEventListener('touchend',    onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [applyDelta, reset])

  return (
    <div ref={outerRef} className="joystick-outer">
      <span className="joystick-tick joystick-tick-n">▲</span>
      <span className="joystick-tick joystick-tick-s">▼</span>
      <span className="joystick-tick joystick-tick-e">▶</span>
      <span className="joystick-tick joystick-tick-w">◀</span>
      <div ref={knobRef} className="joystick-knob" />
    </div>
  )
}
