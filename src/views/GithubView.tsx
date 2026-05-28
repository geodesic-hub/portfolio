export default function GithubView() {
  const open = (url: string) => window.open(url, '_blank')

  return (
    <div style={{ fontFamily: '"Courier New", monospace', color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.5)' }}>
      <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 14 }}>
        SELECT GITHUB PROFILE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="crt-btn-green"
          style={{ width: '100%', textAlign: 'left', fontSize: 13 }}
          onClick={() => open('https://github.com/geodesic-hub?tab=repositories')}
        >
          Repo-1
        </button>
        <button
          className="crt-btn-green"
          style={{ width: '100%', textAlign: 'left', fontSize: 13 }}
          onClick={() => open('https://github.com/harsh1930?tab=repositories')}
        >
          Repo-2(deactivated)
        </button>
      </div>
    </div>
  )
}
