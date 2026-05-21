import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './ComputerHUD.css'
import { Minus, Plus } from 'lucide-react'

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
    <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>

      <div ref={panelRef} className="crt-bezel" style={{ pointerEvents: 'auto', width: '100%', maxWidth: 480 }}>

        <div className="crt-titlebar" onClick={() => setExpanded(e => !e)}>
          <span className="crt-led" />
          <span className="crt-model">Terminal</span>
          <button className="crt-collapse-btn" >
            {expanded ? <Minus size={20} /> : <Plus size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="screen"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 36 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="crt-screen">
                <div className="crt-content">
                  {content
                    ? <><div className="crt-transmission">&gt; INCOMING TRANSMISSION...</div>{content}</>
                    : <div className="crt-idle">AWAITING INPUT, PLEASE CLICK ON OBJECTS TO RECIEVE DATA<span className="hud-cursor">▌</span></div>
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  )
}
