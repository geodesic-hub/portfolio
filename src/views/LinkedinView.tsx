export default function LinkedinView() {
  return (
    <div className="hud-view">
      <div className="hud-label">
        LINKEDIN PROFILE
      </div>
      <button
        className="crt-btn-green"
        style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
        onClick={() => window.open('https://www.linkedin.com/in/harshvardhan-singh-chouhan-670a75156/', '_blank')}
      >
        Harshvardhan Singh Chouhan
      </button>
    </div>
  )
}
