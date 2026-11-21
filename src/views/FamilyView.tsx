import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const PHOTO = '/photo/family.webp'

export default function FamilyView() {
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <>
      <div className="hud-view">
        <div className="hud-label">
          FAMILY INSPIRATIONS
        </div>

        <div
          onClick={() => setLightbox(true)}
          title="Click to enlarge"
          className="hud-frame" style={{ marginBottom: 14 }}
        >
          <img src={PHOTO} alt="My niece and nephew" style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
        </div>

        <p style={{ margin: '0 0 12px' }}>
          My niece and nephew bring so much joy, energy, and curiosity into my life.
        </p>
        <p className="hud-muted" style={{ margin: '0 0 12px' }}>
          My nephew is a spirited basketball player with a wonderful love for multicultural
          cooking and recipes. Whether he is on the court practicing his game or exploring
          flavors from around the world, he brings enthusiasm, creativity, and an open mind
          to everything he does.
        </p>
        <p className="hud-muted" style={{ margin: 0 }}>
          My niece is equally inspiring, with a natural talent for lawn tennis. Her focus,
          discipline, and bright competitive spirit make her a joy to watch and cheer for.
          Together, they remind me how beautiful it is to grow with curiosity, confidence,
          and passion.
        </p>
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
            className="crt-btn-green"
            onClick={e => { e.stopPropagation(); setLightbox(false) }}
            style={{ position: 'absolute', top: 20, right: 24, fontSize: 18, padding: '4px 12px' }}
          >
            ×
          </button>

          <img
            src={PHOTO}
            alt="My niece and nephew"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 0 40px rgba(127,230,255,0.15)' }}
          />

          <div style={{ position: 'absolute', bottom: 20, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1.5, color: '#f5f7fb', opacity: 0.7 }}>
            ESC TO CLOSE
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
