import { useEffect, useState } from 'react'
import './LoadingScreen.css'

const MESSAGES = [
  "ARRIVED AT HARSH'S HOME",
  "ERROR: ROOM NOT FOUND AT EXPECTED COORDINATES",
  "ANOMALY DETECTED — SPACE-TIME DISPLACEMENT EVENT",
  ", THE ROOM HAS BEEN TELEPORTED TO A POCKET DIMENSION",
  "INITIATING COORDINATE RELOCATION SEQUENCE...",
]

const FINAL = {
  x: (Math.random() * 1800 - 900).toFixed(4),
  y: (Math.random() * 1800 - 900).toFixed(4),
  z: (Math.random() * 1800 - 900).toFixed(4),
}

type Phase = 'messages' | 'searching' | 'lockX' | 'lockY' | 'lockZ' | 'locked'

function randCoord() { return (Math.random() * 1999 - 999).toFixed(4) }

function Bar({ value }: { value: number }) {
  const total = 14
  const filled = Math.round(value * total)
  return (
    <span className="ls-bar">
      <span className="ls-bar-filled">{'█'.repeat(filled)}</span>
      <span className="ls-bar-empty">{'░'.repeat(total - filled)}</span>
    </span>
  )
}

interface Props { isLoaded: boolean; onFadeStart: () => void; onHide: () => void }

export default function LoadingScreen({ isLoaded, onFadeStart, onHide }: Props) {
  const [msgStep, setMsgStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('messages')
  const [coords, setCoords] = useState({ x: randCoord(), y: randCoord(), z: randCoord() })
  const [status, setStatus] = useState({ signal: 0.4, stability: 0.75, anomaly: 0.95 })
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    MESSAGES.forEach((_, i) => {
      if (i > 0) timers.push(setTimeout(() => setMsgStep(i), i * 1500))
    })
    timers.push(setTimeout(() => setPhase('searching'), MESSAGES.length * 1500))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const next: Partial<Record<Phase, [Phase, number]>> = {
      searching: ['lockX', 3500],
      lockX:     ['lockY', 2000],
      lockY:     ['lockZ', 2000],
      lockZ:     ['locked', 2000],
    }
    const entry = next[phase]
    if (!entry) return
    const t = setTimeout(() => setPhase(entry[0]), entry[1])
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (!['searching', 'lockX', 'lockY', 'lockZ'].includes(phase)) return
    const xLocked = phase === 'lockX' || phase === 'lockY' || phase === 'lockZ'
    const yLocked = phase === 'lockY' || phase === 'lockZ'
    const zLocked = phase === 'lockZ'
    const interval = setInterval(() => {
      setCoords({
        x: xLocked ? FINAL.x : randCoord(),
        y: yLocked ? FINAL.y : randCoord(),
        z: zLocked ? FINAL.z : randCoord(),
      })
    }, 80)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === 'locked') {
        setStatus({ signal: 1, stability: 0.15, anomaly: 0 })
      } else if (phase !== 'messages') {
        setStatus({
          signal: 0.2 + Math.random() * 0.6,
          stability: 0.1 + Math.random() * 0.5,
          anomaly: 0.5 + Math.random() * 0.5,
        })
      }
    }, 350)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (!isLoaded || phase !== 'locked') return
    const t = setTimeout(() => { setFading(true); onFadeStart(); setTimeout(onHide, 900) }, 1500)
    return () => clearTimeout(t)
  }, [isLoaded, phase])

  const showCoords = phase !== 'messages'
  const xLocked = ['lockX', 'lockY', 'lockZ', 'locked'].includes(phase)
  const yLocked = ['lockY', 'lockZ', 'locked'].includes(phase)
  const zLocked = ['lockZ', 'locked'].includes(phase)

  return (
    <div className="ls-overlay" style={{ opacity: fading ? 0 : 1 }}>

      <div className="ls-container">

        {/* Header */}
        <div className="ls-header">
          <div className="ls-header-label">SYSTEM ALERT</div>
          <div className="ls-header-title">SPATIAL ANOMALY RESPONSE</div>
        </div>

        {/* Top row: incident log + coordinates */}
        <div className="ls-top-row">

          {/* Incident log */}
          <div className="ls-panel ls-panel--wide">
            <div className="ls-panel-title">INCIDENT LOG</div>
            {MESSAGES.slice(0, msgStep + 1).map((msg, i) => (
              <div key={i} className={`ls-log-message ${i === msgStep ? 'ls-log-message--active' : 'ls-log-message--inactive'}`}>
                <span className="ls-log-icon">{i === msgStep ? '▶' : '·'}</span>
                {msg}
                {i === msgStep && <span className="ls-blink">_</span>}
              </div>
            ))}
          </div>

          {/* Coordinates */}
          <div className="ls-panel ls-panel--narrow">
            <div className="ls-panel-title">COORDINATES</div>
            {!showCoords ? (
              <div className="ls-awaiting-signal">AWAITING SIGNAL...</div>
            ) : (
              <>
                {([['X', coords.x, FINAL.x, xLocked], ['Y', coords.y, FINAL.y, yLocked], ['Z', coords.z, FINAL.z, zLocked]] as [string, string, string, boolean][]).map(
                  ([axis, live, final, locked]) => (
                    <div key={axis} className="ls-axis-row">
                      <div className="ls-axis-label">{axis} AXIS</div>
                      <div className={`ls-axis-value ${locked ? 'ls-axis-value--locked' : 'ls-axis-value--unlocked'}`}>
                        {locked ? final : live}
                        {locked && <span className="ls-axis-lock-badge">LOCKED</span>}
                      </div>
                    </div>
                  )
                )}
                <div className="ls-target-status">
                  {phase === 'locked' ? '● INITIATING WARP' : '○ SCANNING...'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status bars */}
        <div className="ls-panel">
          <div className="ls-panel-title">SYSTEM STATUS</div>
          <div className="ls-status-row">
            {[
              ['SIGNAL INTEGRITY', status.signal],
              ['DIMENSIONAL STABILITY', status.stability],
              ['ANOMALY STRENGTH', status.anomaly],
            ].map(([label, val]) => (
              <div key={label as string} className="ls-status-col">
                <div className="ls-status-label">{label as string}</div>
                <Bar value={val as number} />
                <span className="ls-status-value">{Math.round((val as number) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
