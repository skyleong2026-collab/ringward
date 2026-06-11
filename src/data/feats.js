// FEATS — objective milestones across every system in Ringward. They are a PURE
// projection of what a player's save already proves: no live hooks into the run loop,
// no new persisted state. The Feats screen just evaluates the current snapshot. That
// keeps this zero-risk (it can't affect a run) and machine-verifiable.
//
// Each feat declares need(n) and reads one number off the snapshot via `have`. Tiers
// chain (Bronze → Silver → Gold) so there's always a next rung to chase.

// The snapshot the evaluator reads — assembled in SeamLab from existing localStorage.
//   deepestRing   : furthest ring reached (1..8)
//   reclaimed     : deepest ring boss ever beaten (0..8)
//   caught        : creatures owned (count)
//   rosterSize    : total catchable creatures (for the "catch 'em all" feat)
//   gauntletBest  : furthest Gauntlet round cleared (0..)
//   wardsSolved   : wards solved (count)
//   relicsOwned   : relics owned (count)
//   keystonesOwned: keystones forged/owned (count)
//   crossings     : times stepped through the Drop (NG+ level)
//   typesMastered : distinct Types ever fielded in a ring clear (0..8) — the one stat
//                   backed by its own persisted set (8gents_seam_types), recorded in
//                   SeamLab on a boss clear. Still read here as a plain projection.

export const FEATS = [
  // ── The climb ──
  { id: 'first_boss', group: 'Climb', tier: 'Bronze', icon: '⛰', name: 'First Blood',
    desc: 'Beat a ring boss.', stat: 'reclaimed', need: 1 },
  { id: 'midway', group: 'Climb', tier: 'Silver', icon: '⛰', name: 'Trailblazer',
    desc: 'Reach the 4th ring inward.', stat: 'deepestRing', need: 4 },
  { id: 'the_drop', group: 'Climb', tier: 'Gold', icon: '✦', name: 'Reach the Drop',
    desc: 'Beat the final ring and stand at the Drop.', stat: 'reclaimed', need: 8 },
  { id: 'crossing', group: 'Climb', tier: 'Gold', icon: '🌀', name: 'Step Through',
    desc: 'Cross through the Drop into a harder world.', stat: 'crossings', need: 1 },

  // ── Collection ──
  { id: 'collector_5', group: 'Collection', tier: 'Bronze', icon: '🪺', name: 'A Handful',
    desc: 'Catch 5 grunlings.', stat: 'caught', need: 5 },
  { id: 'collector_10', group: 'Collection', tier: 'Silver', icon: '🪺', name: 'Menagerie',
    desc: 'Catch 10 grunlings.', stat: 'caught', need: 10 },
  { id: 'collector_all', group: 'Collection', tier: 'Gold', icon: '🏅', name: 'Gathered All',
    desc: 'Catch every grunling.', stat: 'caught', needStat: 'rosterSize' },

  // ── The Gauntlet ──
  { id: 'gauntlet_1', group: 'Gauntlet', tier: 'Bronze', icon: '♾️', name: 'Into the Gauntlet',
    desc: 'Clear a Gauntlet round.', stat: 'gauntletBest', need: 1 },
  { id: 'gauntlet_5', group: 'Gauntlet', tier: 'Silver', icon: '♾️', name: 'Gauntlet-Holder',
    desc: 'Clear 5 Gauntlet rounds.', stat: 'gauntletBest', need: 5 },
  { id: 'gauntlet_10', group: 'Gauntlet', tier: 'Gold', icon: '♾️', name: 'Tide-Holder',
    desc: 'Clear 10 Gauntlet rounds.', stat: 'gauntletBest', need: 10 },

  // ── Lore / craft ──
  { id: 'ward_solved', group: 'Mastery', tier: 'Silver', icon: '🜸', name: "Warden's Bane",
    desc: 'Solve a Warden riddle.', stat: 'wardsSolved', need: 1 },
  { id: 'relics_5', group: 'Mastery', tier: 'Bronze', icon: '✧', name: 'Relic Hunter',
    desc: 'Own 5 relics.', stat: 'relicsOwned', need: 5 },
  { id: 'keystone', group: 'Mastery', tier: 'Gold', icon: '✦', name: 'Forge-True',
    desc: 'Forge a Keystone.', stat: 'keystonesOwned', need: 1 },

  // ── Type mastery (squad rotation — the same muscle R8's law trains) ──
  { id: 'types_3', group: 'Mastery', tier: 'Bronze', icon: '🎭', name: 'Many Hands',
    desc: 'Clear a ring fielding 3 different Types.', stat: 'typesMastered', need: 3 },
  { id: 'types_5', group: 'Mastery', tier: 'Silver', icon: '🎭', name: 'Versatile',
    desc: 'Clear rings fielding 5 different Types.', stat: 'typesMastered', need: 5 },
  { id: 'types_all', group: 'Mastery', tier: 'Gold', icon: '🎭', name: 'Every Hand',
    desc: 'Clear rings fielding all 8 Types.', stat: 'typesMastered', need: 8 },

  // ── Cook the Book (Team Recipe rotation — R4) ──
  { id: 'recipes_3', group: 'Recipes', tier: 'Bronze', icon: '🍳', name: 'First Dishes',
    desc: 'Field a complete Team Recipe in 3 different ring clears.', stat: 'recipesCooked', need: 3 },
  { id: 'recipes_6', group: 'Recipes', tier: 'Silver', icon: '🍳', name: 'Short-Order',
    desc: 'Cook 6 distinct Team Recipes.', stat: 'recipesCooked', need: 6 },
  { id: 'recipes_all', group: 'Recipes', tier: 'Gold', icon: '📖', name: 'Cook the Book',
    desc: 'Cook every Team Recipe at least once.', stat: 'recipesCooked', needStat: 'recipesTotal' },
];

export const FEAT_GROUPS = ['Climb', 'Collection', 'Gauntlet', 'Mastery', 'Recipes'];

// Evaluate one feat against a snapshot → { have, need, done, pct }.
export function evalFeat(feat, snap) {
  const have = Math.max(0, Number(snap[feat.stat] || 0));
  const need = Math.max(1, feat.needStat ? Number(snap[feat.needStat] || 0) || 1 : feat.need);
  const done = have >= need;
  return { have: Math.min(have, need), rawHave: have, need, done, pct: Math.max(0, Math.min(1, have / need)) };
}

// Evaluate them all, in declaration order.
export function evalFeats(snap) {
  return FEATS.map((f) => ({ ...f, ...evalFeat(f, snap) }));
}

// How many are done (for the "7/13" header + a completion percent).
export function featTally(snap) {
  const all = evalFeats(snap);
  const done = all.filter((f) => f.done).length;
  return { done, total: all.length, pct: all.length ? done / all.length : 0 };
}

export const TIER_COLOR = { Bronze: '#c08552', Silver: '#b8c2cc', Gold: '#e8c14a' };
