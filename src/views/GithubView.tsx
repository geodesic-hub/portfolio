import React from 'react'

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(0,255,65,0.35)',
  color: '#00ff41',
  fontFamily: '"Courier New", monospace',
  fontSize: 13,
  padding: '8px 16px',
  cursor: 'pointer',
  textShadow: '0 0 6px rgba(0,255,65,0.6)',
  letterSpacing: 2,
  width: '100%',
  textAlign: 'left',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export default function GithubView() {
  const open = (url: string) => window.open(url, '_blank')

  return (
    <div style={{ fontFamily: '"Courier New", monospace', color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.5)' }}>
      <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 14 }}>
        SELECT GITHUB PROFILE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          style={btnStyle}
          onClick={() => open('https://github.com/geodesic-hub?tab=repositories')}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.9)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(0,255,65,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.35)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
        >
          ▶ geodesic-hub
        </button>
        <button
          style={btnStyle}
          onClick={() => open('https://github.com/harsh1930?tab=repositories')}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.9)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(0,255,65,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,65,0.35)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
        >
          ▶ harsh1930
        </button>
      </div>
    </div>
  )
}
