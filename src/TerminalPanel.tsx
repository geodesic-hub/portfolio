import { AnimatePresence, motion } from 'framer-motion'

export default function TerminalPanel({
  objectName,
  onClose,
}: {
  objectName: string | null
  onClose: () => void
}) {
  if (!objectName) return null

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', top: '50%', right: 32, transform: 'translateY(-50%)', zIndex: 50 }}>
        <motion.div
          key={objectName}
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          exit={{   x: 340, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          style={{
            width: 300,
            background: '#0a0400',
            border: '2px solid #ff8c00',
            borderRadius: 4,
            fontFamily: 'monospace',
            color: '#ff8c00',
          }}
        >
          {/* Header */}
          <div style={{ background: '#ff8c00', padding: '6px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, letterSpacing: 3, color: '#0a0400' }}>INFO</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a0400' }}>✕</button>
          </div>

          {/* Content — add your own here */}
          <div style={{ padding: '18px 20px' }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 1 }}>Clicked: {objectName}</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
