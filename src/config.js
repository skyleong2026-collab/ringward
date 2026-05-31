// ─── Game config ──────────────────────────────────────────────────────────────
// Cross-cutting tuning constants live here so they have one source of truth.

// Squad size cap. Lowered from 8 → 3 (vC-E): with 4 archetypes you can't cover
// everything, so every pick is a real tradeoff and contract modifiers bite. This
// is the core tension dial — raise it if fights feel too punishing, lower it for
// even harder constraint.
export const MAX_SQUAD = 3;
