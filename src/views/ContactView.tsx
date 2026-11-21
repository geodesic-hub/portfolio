import { useTypewriter } from '../hooks/useTypewriter'

const SCRIPT = [
  { text: 'harshchouhancoding@gmail.com', pauseBefore: 0, speed: 28 },
]

export default function ContactView() {
  const { displayed, activeIdx } = useTypewriter(SCRIPT)

  return (
    <div className="hud-view">
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
        <span className="hud-label" style={{ margin: 0, minWidth: 50 }}>Email</span>
        <span style={{ color: 'var(--hud-accent)', fontSize: 15, fontWeight: 600 }}>
          {displayed[0]}{activeIdx === 0 && <span className="hud-cursor">▌</span>}
        </span>
      </div>
    </div>
  )
}
