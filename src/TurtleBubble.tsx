import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'

const MESSAGES = [
  "Hey! Harsh built this 👋",
]

export default function TurtleBubble({ position }: { position: [number, number, number] }) {
  const [visible, setVisible] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const schedule = () => {
      const hideDelay = 5000 + Math.random() * 5000
      const showTimer = setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length)
        setVisible(true)
        const hideTimer = setTimeout(() => {
          setVisible(false)
          schedule()
        }, 3500)
        return () => clearTimeout(hideTimer)
      }, hideDelay)
      return () => clearTimeout(showTimer)
    }
    schedule()
  }, [])

  if (!visible) return null

  return (
    <Html position={position} center distanceFactor={10}>
      <div style={{
        background: 'white',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: 13,
        fontFamily: 'sans-serif',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'bubblePop 0.2s ease-out',
        pointerEvents: 'none',
      }}>
        {MESSAGES[msgIdx]}
        <div style={{
          position: 'absolute',
          bottom: -8, left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white',
        }} />
      </div>
      <style>{`@keyframes bubblePop { from { transform:scale(0.5); opacity:0 } to { transform:scale(1); opacity:1 } }`}</style>
    </Html>
  )
}
