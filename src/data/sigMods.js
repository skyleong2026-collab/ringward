// ─── Signature Modifiers (vC-K) ────────────────────────────────────────────────
// The PoE support-gem analog. Each creature has 2 signature modifier slots;
// modifiers bend how the signature (and general combat behavior) plays out.
// These are equip-in-slots items, SEPARATE from gear (one archetype-specific
// passive) and modules (numeric dials on gear). Modifiers shape the signature.
//
// Design rule (from the build brief): "a modifier does nothing on its own" —
// like a support gem it only makes sense in the context of the unit it's on.
//
// Engine reads these via creature.sigModIds → merged into unit.dials Set in
// initUnit. The dials.has('modId') checks are opt-in; no existing golden unit
// has sigModIds, so all goldens continue to pass untouched.

export const SIG_MODS = [
  {
    id: 'chain',
    name: 'Chain',
    glyph: '⟿',
    color: '#f5a623',
    text: 'After each hit, 50% of the damage splashes to a random other enemy.',
    flavor: 'The impact travels.',
    bestOn: ['Swift', 'Guardian'], // archetypes that benefit most
  },
  {
    id: 'echoStrike',
    name: 'Echo Strike',
    glyph: '◫',
    color: '#4a90d9',
    text: 'After each hit, replays the strike at 40% damage on the same target.',
    flavor: 'Every blow lands twice.',
    bestOn: ['Swift', 'Echo'],
  },
  {
    id: 'pierce',
    name: 'Pierce',
    glyph: '▸',
    color: '#e06060',
    text: 'Attacks ignore 8 points of armor.',
    flavor: 'Find the gap.',
    bestOn: ['Swift', 'Spark'],
  },
  {
    id: 'fortify',
    name: 'Fortify',
    glyph: '◆',
    color: '#7ed321',
    text: '+20% maximum HP.',
    flavor: 'More to give.',
    bestOn: ['Guardian', 'Echo'],
  },
  {
    id: 'surge',
    name: 'Surge',
    glyph: '⚡',
    color: '#f5a623',
    text: 'Reactor: detonates 1 stoke earlier. Others: +1 speed.',
    flavor: 'Push the threshold.',
    bestOn: ['Spark'],
  },
  {
    id: 'resilient',
    name: 'Resilient',
    glyph: '◎',
    color: '#9b6bd6',
    text: 'Survives the first lethal hit at 1 HP (once per battle).',
    flavor: 'Not yet.',
    bestOn: ['Guardian', 'Spark'],
  },
];

export const SIG_MODS_BY_ID = Object.fromEntries(SIG_MODS.map((m) => [m.id, m]));

// ─── Signature Rank (vC-M) ───────────────────────────────────────────────────
// A 2nd per-creature progression axis. A creature's signature has a rank 1→5;
// higher rank = stronger expression of whatever modifiers it has slotted. Rank
// is per-instance (creature.sigRank, default 1) and scales ALL its equipped
// mods at once — "rank the signature, the dials get louder."
//
// CRITICAL: rank-1 values below are byte-identical to the vC-K hardcoded
// magnitudes, so every existing creature (all default to rank 1) and every
// golden fixture behaves exactly as before. Goldens stay green untouched.

export const SIG_RANK_MAX = 5;

// Per-rank magnitude for each modifier. Index 0 == rank 1.
const RANK_TABLE = {
  chain:      [0.50, 0.575, 0.65, 0.725, 0.80],  // splash fraction of the hit
  echoStrike: [0.40, 0.45,  0.50, 0.55,  0.60],  // replay fraction on same target
  pierce:     [8,    10,    12,   14,    16],     // flat armor ignored
  fortify:    [1.20, 1.24,  1.28, 1.32,  1.36],  // max-HP multiplier
  surge:      [1,    1,     2,    2,     3],      // +speed (non-Spark) / -stoke (Spark)
  resilient:  [0,    0.10,  0.20, 0.30,  0.40],  // revive HP frac of max (rank 1 → 1 HP token)
};

// The scaled magnitude of `modId` at the given signature rank.
export function sigModValue(modId, rank = 1) {
  const row = RANK_TABLE[modId];
  if (!row) return undefined;
  const i = Math.max(0, Math.min(row.length - 1, ((rank | 0) || 1) - 1));
  return row[i];
}

// Human-readable effect text for a mod at a given rank — keeps the live number
// in the tooltip in sync with the unit's actual rank.
export function sigModRankedText(modId, rank = 1) {
  const v = sigModValue(modId, rank);
  switch (modId) {
    case 'chain':      return `After each hit, ${Math.round(v * 100)}% of the damage splashes to a random other enemy.`;
    case 'echoStrike': return `After each hit, replays the strike at ${Math.round(v * 100)}% damage on the same target.`;
    case 'pierce':     return `Attacks ignore ${v} points of armor.`;
    case 'fortify':    return `+${Math.round((v - 1) * 100)}% maximum HP.`;
    case 'surge':      return `Reactor: detonates ${v} stoke${v > 1 ? 's' : ''} earlier. Others: +${v} speed.`;
    case 'resilient':  return v > 0
      ? `Survives the first lethal hit, reviving at ${Math.round(v * 100)}% HP (once per battle).`
      : 'Survives the first lethal hit at 1 HP (once per battle).';
    default:           return SIG_MODS_BY_ID[modId]?.text ?? '';
  }
}

// Shard cost to advance FROM `rank` to `rank + 1`. Rising curve; rank 5 is max.
const RANK_UP_COST = [4, 8, 14, 22]; // 1→2, 2→3, 3→4, 4→5
export function sigRankUpCost(rank) {
  if (rank >= SIG_RANK_MAX) return null; // maxed
  return RANK_UP_COST[Math.max(0, (rank | 0) - 1)];
}
