import { useEffect, useRef, useState } from 'react'
import { Howl, Howler } from 'howler'

const WIND_VOL   = 0.55
const NATURE_VOL = 0.45

/** Wind while the camera flies in, then nature ambience once it has landed. */
export function useAudio() {
  const windRef   = useRef<Howl | null>(null)
  const natureRef = useRef<Howl | null>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    windRef.current = new Howl({ src: ['/music/wind.mp3'], volume: 0, loop: true })
    // long track: stream it so it starts without downloading the whole file first
    natureRef.current = new Howl({ src: ['/music/nature.mp3'], volume: 0, loop: true, html5: true, preload: 'metadata' })
    return () => {
      windRef.current?.unload()
      natureRef.current?.unload()
    }
  }, [])

  // called from the ASCEND click (a user gesture, so the browser lets audio start)
  const startWind = () => {
    const wind = windRef.current
    if (!wind) return
    wind.volume(0)
    wind.play()
    wind.fade(0, WIND_VOL, 1200)
    // unlock the streamed nature track inside the same gesture so it can start later without a click
    const nature = natureRef.current
    if (nature && !nature.playing()) {
      nature.once('play', () => nature.pause())
      nature.play()
    }
  }

  // called when the camera has settled
  const startNature = () => {
    const wind = windRef.current
    if (wind?.playing()) {
      wind.fade(wind.volume(), 0, 3500)
      wind.once('fade', () => wind.stop())
    }
    const nature = natureRef.current
    if (!nature) return
    const dur = nature.duration()
    if (dur > 0) nature.seek(Math.random() * dur * 0.6) // vary where the ambience picks up
    nature.volume(0)
    // html5 audio starts asynchronously; a fade issued before it is actually playing is dropped
    nature.once('play', () => nature.fade(0, NATURE_VOL, 4000))
    nature.play()
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    Howler.mute(next)
  }

  return { startWind, startNature, muted, toggleMute }
}
