import { useState, useEffect } from 'react'

export interface TypewriterLine {
  text: string
  pauseBefore?: number  // ms to wait before typing this line starts
  speed?: number        // ms per character
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

export function useTypewriter(lines: TypewriterLine[]) {
  const [displayed, setDisplayed] = useState<string[]>(lines.map(() => ''))
  const [activeIdx, setActiveIdx] = useState(-1)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      for (let i = 0; i < lines.length; i++) {
        const { text, pauseBefore = 400, speed = 35 } = lines[i]

        if (pauseBefore > 0) await sleep(pauseBefore)
        if (cancelled) return

        setActiveIdx(i)

        for (let c = 1; c <= text.length; c++) {
          if (cancelled) return
          const slice = text.slice(0, c)
          setDisplayed(prev => {
            const next = [...prev]
            next[i] = slice
            return next
          })
          await sleep(speed)
        }
      }

      if (!cancelled) { setActiveIdx(-1); setDone(true) }
    })()

    return () => { cancelled = true }
  }, [])

  return { displayed, activeIdx, done }
}