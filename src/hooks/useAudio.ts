import { useEffect, useRef, useState } from 'react'

const WIND_VOL   = 0.55
const NATURE_VOL = 0.45
const ROCKET_VOL = 0.5
const NATURE_DUCK = 0.15 // nature level while the rocket flies

// shared with the rocket (it lives inside the 3D canvas, outside this hook)
const shared: { ctx: AudioContext | null; master: GainNode | null; natureGain: GainNode | null; natureOn: boolean } =
  { ctx: null, master: null, natureGain: null, natureOn: false }
let rocketBuf: Promise<AudioBuffer> | null = null
let rocket: { src: AudioBufferSourceNode; gain: GainNode } | null = null

const ramp = (p: AudioParam, to: number, seconds: number) => {
  const now = shared.ctx!.currentTime
  p.cancelScheduledValues(now)
  p.setValueAtTime(p.value, now)
  p.linearRampToValueAtTime(to, now + seconds)
}

/** Engine loop for the rocket flight: spools up on ignition and ducks the nature track. */
export async function rocketSoundStart() {
  const ctx = shared.ctx
  if (!ctx || !shared.master || rocket) return
  // seamless 5.5 s loop cut from the steady part of the engine recording (wav, so it loops without a gap)
  rocketBuf ??= fetch('/music/rocket-loop.wav').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
  const buf = await rocketBuf.catch(() => null)
  if (!buf || rocket) return
  const gain = ctx.createGain(); gain.gain.value = 0
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
  src.playbackRate.value = 0.8
  src.connect(gain).connect(shared.master)
  src.start()
  rocket = { src, gain }
  ramp(gain.gain, ROCKET_VOL, 1.2)
  ramp(src.playbackRate, 1, 1.8) // engine spooling up
  if (shared.natureGain && shared.natureOn) ramp(shared.natureGain.gain, NATURE_DUCK, 1)
}

/** Engine shut-down on touchdown: the hum winds down and the nature track comes back. */
export function rocketSoundStop() {
  if (!shared.ctx || !rocket) return
  const r = rocket; rocket = null
  ramp(r.gain.gain, 0, 2)
  ramp(r.src.playbackRate, 0.7, 2)
  r.src.stop(shared.ctx.currentTime + 2.1)
  if (shared.natureGain && shared.natureOn) ramp(shared.natureGain.gain, NATURE_VOL, 2.5)
}

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
    shared.ctx = ctx; shared.master = masterRef.current; shared.natureGain = natureRef.current.gain
    rocketBuf ??= fetch('/music/rocket-loop.wav').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)) // warm up

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
    shared.natureOn = true
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
