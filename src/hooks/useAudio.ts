import { useEffect, useRef, useState } from 'react'

const WIND_VOL   = 0.55
const NATURE_VOL = 0.45

/**
 * Wind while the camera flies in, then nature ambience once it has landed.
 *
 * Both tracks are streamed <audio> elements routed through Web Audio gain nodes:
 * - streaming keeps memory low (the nature track is 13 minutes long),
 * - gain nodes fade smoothly everywhere (iOS ignores <audio>.volume, so element fades jump straight to full),
 * - one audio path for both tracks, so they behave the same on every phone.
 */
export function useAudio() {
  const ctxRef    = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const windRef   = useRef<{ el: HTMLAudioElement; gain: GainNode | null } | null>(null)
  const natureRef = useRef<{ el: HTMLAudioElement; gain: GainNode | null } | null>(null)
  const natureStarted = useRef(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const make = (src: string, preload: '' | 'auto' | 'metadata') => {
      const el = new Audio(src)
      el.loop = true
      el.preload = preload
      el.setAttribute('playsinline', '')
      return { el, gain: null as GainNode | null }
    }
    windRef.current   = make('/music/wind.mp3', 'auto')
    // the wind clip has its own swell and dies away by ~18 s, about when the flight lands: play it once, never loop
    windRef.current.el.loop = false
    natureRef.current = make('/music/nature2.mp3', 'metadata')
    return () => {
      for (const t of [windRef.current, natureRef.current]) { t?.el.pause(); t?.el.removeAttribute('src'); t?.el.load() }
      ctxRef.current?.close()
    }
  }, [])

  const fadeTo = (gain: GainNode, to: number, seconds: number) => {
    const ctx = ctxRef.current!
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(to, now + seconds)
  }

  // called from the ASCEND tap: everything that needs a user gesture happens here
  const startWind = () => {
    if (!windRef.current || !natureRef.current) return
    // iOS: play through the ringer/silent switch like a media app instead of being muted by it
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session) { try { session.type = 'playback' } catch { /* older Safari */ } }

    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = ctxRef.current ?? new Ctx()
    ctxRef.current = ctx
    if (!masterRef.current) {
      masterRef.current = ctx.createGain()
      masterRef.current.gain.value = muted ? 0 : 1
      masterRef.current.connect(ctx.destination)
    }
    for (const t of [windRef.current, natureRef.current]) {
      if (t.gain) continue
      t.gain = ctx.createGain()
      t.gain.gain.value = 0
      ctx.createMediaElementSource(t.el).connect(t.gain).connect(masterRef.current)
    }
    void ctx.resume()

    const wind = windRef.current
    wind.el.currentTime = 0
    void wind.el.play().catch(() => {})
    fadeTo(wind.gain!, WIND_VOL, 1.2)

    // unlock the nature element inside this same tap (silent, its gain is 0) so it can start later without one
    const nature = natureRef.current
    nature.el.play().then(() => { if (!natureStarted.current) nature.el.pause() }).catch(() => {})
  }

  // called when the camera has settled
  const startNature = () => {
    const wind = windRef.current, nature = natureRef.current
    if (!ctxRef.current || !wind?.gain || !nature?.gain) return
    natureStarted.current = true
    fadeTo(wind.gain, 0, 3.5)
    setTimeout(() => wind.el.pause(), 3700)

    const dur = nature.el.duration
    if (Number.isFinite(dur) && dur > 0) nature.el.currentTime = Math.random() * dur * 0.6 // vary where the ambience picks up
    nature.gain.gain.setValueAtTime(0, ctxRef.current.currentTime)
    nature.el.play().then(() => fadeTo(nature.gain!, NATURE_VOL, 4)).catch(() => {})
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    const master = masterRef.current
    if (master && ctxRef.current) fadeTo(master, next ? 0 : 1, 0.25)
  }

  return { startWind, startNature, muted, toggleMute }
}
