import { useTypewriter } from '../hooks/useTypewriter'

const SCRIPT = [
  { text: 'Hello there, visitor.',                                                      pauseBefore: 0,   speed: 40 },
  { text: 'You must be here to visit Harsh.',                                           pauseBefore: 700, speed: 35 },
  { text: 'Sorry, he got lost in another dimension and left me to guide visitors.',    pauseBefore: 800, speed: 30 },
  { text: 'He has also left clues for communication, in case you are trying to reach him.', pauseBefore: 200, speed: 30 },
  { text: 'Since you are in a higher dimension than me, objects that are clickable will change size periodically.', pauseBefore: 200, speed: 28 },
  { text: 'Please click on them to find out about Harsh', pauseBefore: 200, speed: 28 },
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
        {SCRIPT.map((_, i) => {
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
            className="crt-btn-red"
            onClick={onDone}
            style={{ marginTop: 10, display: 'block', marginLeft: 'auto' }}
          >
            UNDERSTOOD
          </button>
        )}
      </div>

    </div>
  )
}
