import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const FILENAMES = [
  'naturo.webp',
  'WhatsApp Image 2019-09-29 at 1.31.35 AM.jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.35 AM (1).jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM.jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM (1).jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM (2).jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM (3).jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM (4).jpeg',
  'WhatsApp Image 2019-09-29 at 1.31.36 AM (5).jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.01 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.01 PM (1).jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.02 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.04 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.05 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.07 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.08 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.09 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.10 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.10 PM (1).jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.12 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.13 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.13 PM (1).jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.13 PM (2).jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.15 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.16 PM.jpeg',
  'WhatsApp Image 2019-09-29 at 7.26.17 PM.jpeg',
  'WhatsApp Image 2019-09-30 at 12.45.43 AM.jpeg',
]

const SKETCHES = FILENAMES.map(f => `/sketches/${encodeURIComponent(f)}`)

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(0,255,65,0.35)',
  color: '#00ff41',
  fontFamily: '"Courier New", monospace',
  fontSize: 14,
  lineHeight: 1,
  padding: '3px 8px',
  cursor: 'pointer',
  textShadow: '0 0 6px rgba(0,255,65,0.6)',
}

export default function SketchView() {
  const [idx, setIdx]           = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      setLightbox(false)
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(i + 1, SKETCHES.length - 1))
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <>
      <div style={{ fontFamily: '"Courier New", monospace', color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.5)' }}>

        <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 10 }}>
          SKETCH ARCHIVE — FILE {idx + 1} OF {SKETCHES.length}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btnStyle} disabled={idx === 0}                    onClick={() => setIdx(i => i - 1)}>◀</button>

          <div
            onClick={() => setLightbox(true)}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,65,0.1)', minHeight: 140, cursor: 'zoom-in' }}
          >
            <img
              key={SKETCHES[idx]}
              src={SKETCHES[idx]}
              alt={`sketch ${idx + 1}`}
              style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>

          <button style={btnStyle} disabled={idx === SKETCHES.length - 1} onClick={() => setIdx(i => i + 1)}>▶</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {SKETCHES.map((_, i) => (
            <span key={i} onClick={() => setIdx(i)} style={{ cursor: 'pointer', fontSize: 8, opacity: i === idx ? 1 : 0.25, color: '#00ff41' }}>●</span>
          ))}
        </div>

      </div>

      {lightbox && createPortal(
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightbox(false) }}
            style={{ ...btnStyle, position: 'absolute', top: 20, right: 24, fontSize: 18, padding: '4px 12px' }}
          >
            ×
          </button>

          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.max(i - 1, 0)) }}
            style={{ ...btnStyle, position: 'absolute', left: 24, fontSize: 22, padding: '8px 14px', opacity: idx === 0 ? 0.2 : 1 }}
            disabled={idx === 0}
          >
            ◀
          </button>

          <img
            key={SKETCHES[idx]}
            src={SKETCHES[idx]}
            alt={`sketch ${idx + 1}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 0 40px rgba(0,255,65,0.15)' }}
          />

          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.min(i + 1, SKETCHES.length - 1)) }}
            style={{ ...btnStyle, position: 'absolute', right: 24, fontSize: 22, padding: '8px 14px', opacity: idx === SKETCHES.length - 1 ? 0.2 : 1 }}
            disabled={idx === SKETCHES.length - 1}
          >
            ▶
          </button>

          <div style={{ position: 'absolute', bottom: 20, fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: 4, color: '#00ff41', opacity: 0.4 }}>
            {idx + 1} / {SKETCHES.length} — ESC TO CLOSE
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
