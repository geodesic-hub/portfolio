// Tiny shared flag: is the rocket flying? (set inside the 3D canvas, read by the HUD buttons)
let flying = false
const listeners = new Set<() => void>()

export const rocketFlight = {
  get: () => flying,
  set: (v: boolean) => { if (v !== flying) { flying = v; listeners.forEach(l => l()) } },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
}
