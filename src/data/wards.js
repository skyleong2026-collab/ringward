// wards.js — WARD GATES data + pure decision logic (vF-BK; extracted from SeamLab so it's
// headlessly testable, see scripts/ward-gates.mjs).
//
// Some thresholds inward won't open to a boss kill alone. A Ward bars the way and sets a
// RIDDLE: solve its DEED (a clue you decode) to earn the key and pass. A deed wants a SQUAD
// SHAPE (e.g. two Types climbing together), not raw power — so you can't out-farm the wall —
// but it's always doable in rings you've already opened, and beta bypasses wards entirely,
// so no one ever soft-locks. Pure progression-gating; the combat engine is never touched.
// More wards + chained clues + crafted keys layer on later.

export const WARDS = [
  { atDepth: 4, id: 'paired', name: "The Warden's Lock", glyph: '🜸', tint: '#9be7ff',
    // The story shown the first time you reach the sealed gate — the reason WHY it asks this.
    story: "The way out of the Storm-Wire ends at a gate older than the blight: two iron sockets where a single core should lock, not one. Your people built it back when the rim was held in pairs — a Bulwark to hold the line, a Reactor to break what came at it — never one climber alone. The mentor's mark is cut fresh beside the sockets: “It still remembers how we did it. Show it, and it'll let you by.”",
    clue: 'A shield and a flame, set in the old gate together. Bring a 🛡 Bulwark and a 🔥 Reactor back through the Fallen Gate side by side — twice over — and the lock will know its own.',
    deed: { ring: 'fallen-gate', types: ['Bulwark', 'Reactor'], count: 2,
      told: 'Clear the Fallen Gate with a 🛡 Bulwark AND a 🔥 Reactor in your squad' } },
];

// Ward keyed by the depth it gates (clearing ring D's boss → tries to open ring D+1).
export const WARD_AT = Object.fromEntries(WARDS.map((w) => [w.atDepth, w]));

// The ward (if any) that bars advancing from `unlocked` → unlocked+1, given current ward
// state. Returns the ward object when it's present and NOT yet solved, else null (open).
export function wardBlocking(unlocked, wards = {}) {
  const w = WARD_AT[unlocked];
  return w && !wards[w.id]?.solved ? w : null;
}

// Mark a ward ACTIVE (its riddle is now revealed + tracking), preserving any prior progress.
// Returns a new wards map.
export function activateWard(wards = {}, wardId) {
  const cur = wards[wardId] || {};
  return { ...wards, [wardId]: { active: true, progress: cur.progress || 0, solved: !!cur.solved } };
}

// Advance every ACTIVE, unsolved ward whose DEED matches this clear — the right ring AND all
// the required Types fielded (squadTypes = the Types present in the squad that cleared it).
// Pure: returns { wards, solved: [wardId...], changed }. `wards` is the same ref if nothing
// changed (so callers can skip a needless persist/re-render).
export function advanceWardDeeds(wards = {}, ringId, squadTypes = []) {
  const types = new Set(squadTypes);
  const next = { ...wards };
  const solved = [];
  let changed = false;
  for (const w of WARDS) {
    const ws = next[w.id];
    if (!ws?.active || ws.solved) continue;
    const d = w.deed;
    if (d.ring !== ringId) continue;
    const need = d.types || [d.type];
    if (!need.every((t) => types.has(t))) continue;
    const progress = (ws.progress || 0) + 1;
    const isSolved = progress >= d.count;
    next[w.id] = { ...ws, progress, solved: isSolved };
    changed = true;
    if (isSolved) solved.push(w.id);
  }
  return { wards: changed ? next : wards, solved, changed };
}
