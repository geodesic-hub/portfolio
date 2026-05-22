export default function LinkedinView() {
  return (
    <div style={{ fontFamily: '"Courier New", monospace', color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.5)' }}>
      <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 14 }}>
        LINKEDIN PROFILE
      </div>
      <button
        className="crt-btn"
        style={{ width: '100%', textAlign: 'left', fontSize: 13 }}
        onClick={() => window.open('https://www.linkedin.com/in/harshvardhan-singh-chouhan-670a75156/', '_blank')}
      >
        Harshvardhan Singh Chouhan
      </button>
    </div>
  )
}
