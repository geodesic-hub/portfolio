import { useTypewriter } from '../hooks/useTypewriter'

const SCRIPT = [
  { text: 'INCOMING TRANSMISSION...', pauseBefore: 0,   speed: 45 },
  { text: 'harshchouhancoding@gmail.com', pauseBefore: 500, speed: 28 },
]

export default function ContactView() {
  const { displayed, activeIdx } = useTypewriter(SCRIPT)

  const showEmail = activeIdx >= 1 || displayed[1]?.length > 0

  return (
    <div style={{ fontFamily: '"Courier New", monospace', fontSize: 11, lineHeight: 2, color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.6)' }}>

      <div style={{ letterSpacing: 3, marginBottom: 16 }}>
        &gt; {displayed[0]}{activeIdx === 0 && <span className="hud-cursor">▌</span>}
      </div>

      {showEmail && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, borderBottom: '1px solid rgba(0,255,65,0.15)', paddingBottom: 8, marginBottom: 12 }}>
            TRANSMISSION DATA
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 9, letterSpacing: 3, opacity: 0.5, minWidth: 50, paddingTop: 2 }}>EMAIL</span>
            <span style={{ color: '#ccffdd', textShadow: '0 0 8px rgba(0,255,65,0.8)' }}>
              {displayed[1]}{activeIdx === 1 && <span className="hud-cursor">▌</span>}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
