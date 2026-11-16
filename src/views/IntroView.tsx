import { useEffect, useRef, useState } from 'react'
import './IntroView.css'

/** Noty the turtle greets visitors with a short chat, then offers quick replies that act. */

export type IntroAction = 'about' | 'pod' | 'contact' | 'explore'

const LINES = [
  'Oh! A visitor! Welcome aboard.',
  "I'm Noty, keeper of this little floating island.",
  "That pod is Harsh's home. 1,200 m above Earth, best view in the neighbourhood.",
  'Anything that pulses up here is clickable. Go on, poke around.',
  'So, what brings you up here?',
]

const REPLIES: { label: string; action: IntroAction }[] = [
  { label: "Who's Harsh?", action: 'about' },
  { label: 'Show me inside', action: 'pod' },
  { label: 'How do I reach him?', action: 'contact' },
  { label: 'Just exploring', action: 'explore' },
]

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export default function IntroView({ onAction }: { onAction: (a: IntroAction) => void }) {
  const [shown, setShown] = useState(0)          // bubbles visible
  const [typing, setTyping] = useState(false)    // "..." indicator
  const [showReplies, setShowReplies] = useState(false)
  const [talking, setTalking] = useState(false)  // turtle bounce while a bubble lands
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await sleep(350)
      for (let i = 0; i < LINES.length; i++) {
        if (cancelled) return
        setTyping(true)
        await sleep(450 + Math.min(LINES[i].length * 14, 900))
        if (cancelled) return
        setTyping(false)
        setShown(i + 1)
        setTalking(true)
        setTimeout(() => !cancelled && setTalking(false), 380)
        await sleep(520)
      }
      if (!cancelled) setShowReplies(true)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [shown, typing, showReplies])

  return (
    <div className="kurma">
      <div className={`kurma-avatar ${talking ? 'kurma-avatar--talk' : ''}`}>
        <img src="/textures/turtle.png" alt="Noty the turtle" />
        <div className="kurma-name">NOTY</div>
      </div>

      <div className="kurma-chat">
        {LINES.slice(0, shown).map((line, i) => (
          <div key={i} className="kurma-bubble">{line}</div>
        ))}

        {typing && (
          <div className="kurma-bubble kurma-bubble--typing" aria-label="Noty is typing">
            <span /><span /><span />
          </div>
        )}

        {showReplies && (
          <div className="kurma-replies">
            {REPLIES.map((r, i) => (
              <button key={r.action} className="kurma-reply" style={{ animationDelay: `${i * 70}ms` }} onClick={() => onAction(r.action)}>
                {r.label}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
