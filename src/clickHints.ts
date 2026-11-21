// Which clickable objects the visitor has already tried this visit. Kept in memory only,
// so every marker comes back on reload.
export type HintId = 'rocket' | 'sketch' | 'photo'
const clicked = new Set<HintId>()

export const clickHints = {
  has: (id: HintId) => clicked.has(id),
  mark: (id: HintId) => { clicked.add(id) },
}
