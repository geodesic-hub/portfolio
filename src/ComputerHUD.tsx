import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './ComputerHUD.css'

interface HUDProps {
  visible: boolean
  content: React.ReactNode
}

export default function ComputerHUD({ visible, content }: HUDProps) {
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (content) setExpanded(true)
  }, [content])

  useEffect(() => {
    if (!expanded) return
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [expanded])

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 480, pointerEvents: 'none' }}>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="panel"
            ref={panelRef}
            className="crt-bezel"
            style={{ pointerEvents: 'auto', width: '100%' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            {/* Title bar */}
            <div className="crt-titlebar">
              <span className="crt-led" />
              <span className="crt-model">Terminal</span>
              <button className="crt-collapse-btn" onClick={() => setExpanded(false)}>─</button>
            </div>

            {/* Screen */}
            <div className="crt-screen">
              <div className="crt-content">
                {content ?? <div className="crt-idle">AWAITING INPUT, PLEASE CLICK ON OBJECTS TO RECIEVE DATA<span className="hud-cursor">▌</span></div>}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <button className="crt-tab" style={{ pointerEvents: 'auto' }} onClick={() => setExpanded(true)}>
          ▶ TERMINAL
        </button>
      )}

    </div>
  )
}
