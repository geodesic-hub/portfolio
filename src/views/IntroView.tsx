import { useTypewriter } from '../hooks/useTypewriter'

const SCRIPT = [
  { text: 'Hello there, visitor.',                                                      pauseBefore: 0,   speed: 40 },
  { text: 'You must be here to visit Harsh.',                                           pauseBefore: 700, speed: 35 },
  { text: 'Sorry — he got lost in another dimension and left me to guide visitors.',    pauseBefore: 800, speed: 30 },
  { text: 'He has also left clues for communication,',                                 pauseBefore: 700, speed: 30 },
  { text: 'in case you are trying to reach him.',                                       pauseBefore: 200, speed: 30 },
  { text: 'Since you are in a higher dimension than me,',                               pauseBefore: 800, speed: 30 },
  { text: 'just click on things — the information will be transmitted to you.',         pauseBefore: 200, speed: 28 },
]

export default function IntroView({ onDone }: { onDone: () => void }) {
  const { displayed, activeIdx, done } = useTypewriter(SCRIPT)

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

      <img
        src="/textures/turtle.png"
        alt=""
        style={{
          width: 72,
          height: 72,
          objectFit: 'contain',
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.45))',
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, fontFamily: '"Segoe UI", system-ui, sans-serif', fontSize: 13, lineHeight: 1.75, color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.55)' }}>
        {SCRIPT.map((line, i) => {
          if (i > activeIdx && !displayed[i]) return null
          const isActive = activeIdx === i
          return (
            <div key={i} style={{ opacity: !isActive && i < activeIdx ? 0.6 : 1, marginBottom: 2 }}>
              {i === 0 ? '▶ ' : '  '}{displayed[i]}
              {isActive && <span className="hud-cursor">▌</span>}
            </div>
          )
        })}

        {done && (
          <button
            onClick={onDone}
            style={{
              marginTop: 10,
              display: 'block',
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid rgba(0,255,65,0.4)',
              color: '#00ff41',
              fontFamily: '"Courier New", monospace',
              fontSize: 9,
              letterSpacing: 3,
              padding: '4px 10px',
              cursor: 'pointer',
              textShadow: '0 0 6px rgba(0,255,65,0.6)',
              boxShadow: '0 0 8px rgba(0,255,65,0.15)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.9)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(0,255,65,0.35)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.4)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 8px rgba(0,255,65,0.15)'
            }}
          >
            [ UNDERSTOOD ]
          </button>
        )}
      </div>

    </div>
  )
}
