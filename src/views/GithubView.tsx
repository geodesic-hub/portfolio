export default function GithubView() {
  const open = (url: string) => window.open(url, '_blank')

  return (
    <div className="hud-view">
      <div className="hud-label">
        SELECT GITHUB PROFILE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="crt-btn-green"
          style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
          onClick={() => open('https://github.com/geodesic-hub?tab=repositories')}
        >
          Repo-1
        </button>
        <button
          className="crt-btn-green"
          style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
          onClick={() => open('https://github.com/harsh1930?tab=repositories')}
        >
          Repo-2(deactivated)
        </button>
      </div>
    </div>
  )
}
