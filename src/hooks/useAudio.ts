import { useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'

export function useAudio() {
  const loadingRef    = useRef<Howl | null>(null)
  const ambientRef    = useRef<Howl | null>(null)
  const loadingDurRef = useRef(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const randomStart = (dur: number) => Math.random() * dur * 0.6

    loadingRef.current = new Howl({
      src: ['/music/loading.mp3'],
      volume: 0.6,
      onload: () => { loadingDurRef.current = loadingRef.current!.duration() },
      onend: () => {
        loadingRef.current!.seek(randomStart(loadingDurRef.current))
        loadingRef.current!.play()
      },
    })
    ambientRef.current = new Howl({ src: ['/music/music1.mp3'], volume: 0, loop: true })
    return () => {
      loadingRef.current?.unload()
      ambientRef.current?.unload()
    }
  }, [])

  const playLoading = () => {
    const howl = loadingRef.current
    if (!howl) return
    howl.once('play', () => {
      const dur = loadingDurRef.current || howl.duration()
      if (dur > 0) howl.seek(Math.random() * dur * 0.6)
    })
    howl.play()
  }

  const fadeOutLoading = () => {
    const loading = loadingRef.current
    if (loading?.playing()) loading.fade(loading.volume(), 0, 1500)
  }

  const startAmbient = () => {
    const ambient = ambientRef.current
    if (ambient) { ambient.play(); ambient.fade(0, 0.4, 3000) }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    Howler.mute(next)
  }

  return { playLoading, fadeOutLoading, startAmbient, muted, toggleMute }
}
