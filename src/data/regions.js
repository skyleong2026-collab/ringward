// ─── Regions (World Layer — vC-J data / vC-O board) ───────────────────────────
// Each region is a named territory. The Ironfield is the home territory and
// holds every current contract; frontier territories are the visible horizon —
// they OPEN once you've built enough combined faction standing, then host the
// operations that ship into them. Contracts carry a `region` id (see
// contracts.js) so future content drops into a frontier just by tagging it.
//
// "Combined standing" = Shadow rep + Light rep. It is the world-progression
// gauge: doing work anywhere pushes the frontier open. The per-faction rep
// LADDERS (below) still gate which contracts unlock WITHIN a region.

export const REGIONS = [
  {
    id: 'ironfield',
    name: 'The Ironfield',
    sigil: '▰',
    status: 'home', // always open — the starting territory
    factions: ['Shadow', 'Light'],
    tagline: 'Contested rail yards, relay towers, and shadow operations. Both factions move here.',
  },
  {
    id: 'saltmarsh-verge',
    name: 'Saltmarsh Verge',
    sigil: '◷',
    status: 'frontier',
    unlockAt: 6, // combined standing
    factions: ['Light'],
    lean: 'Light',
    tagline: 'Flooded causeways the Light is fighting to keep open. Standing here is earned in mud.',
  },
  {
    id: 'ashfall-reach',
    name: 'Ashfall Reach',
    sigil: '◢',
    status: 'frontier',
    unlockAt: 12, // combined standing
    factions: ['Shadow'],
    lean: 'Shadow',
    tagline: 'Burned-out substations past the perimeter. Only the Shadow still operates this far out.',
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// Combined faction standing — the gauge that opens frontier territory.
export function combinedStanding(reputation = {}) {
  return Object.values(reputation).reduce((sum, v) => sum + (v || 0), 0);
}

// A region is open if it's home, or its combined-standing threshold is met.
export function regionUnlocked(region, standing) {
  if (!region) return false;
  if (region.status === 'home') return true;
  return standing >= (region.unlockAt ?? Infinity);
}

// ─── Reputation ladders ───────────────────────────────────────────────────────
// 5 rungs per faction. Each rung unlocks at a rep threshold.
// `contractIds` = contracts available from this rung onward.
// `unlockLabel` = brief description of what opens.

export const REP_LADDERS = {
  Shadow: [
    { rep: 0,  label: 'Unknown',   unlockLabel: 'Shadow contracts open',       contractIds: ['quiet-the-signal'] },
    { rep: 2,  label: 'Noticed',   unlockLabel: '"Crack the Formation" opens',  contractIds: ['crack-the-formation'] },
    { rep: 4,  label: 'Trusted',   unlockLabel: '"Ghost the Relay" opens',      contractIds: ['ghost-the-relay'] },
    { rep: 7,  label: 'Embedded',  unlockLabel: '"The Last Threshold" opens',   contractIds: ['the-last-threshold'] },
    { rep: 10, label: 'Operative', unlockLabel: 'Full Shadow access',           contractIds: [] },
  ],
  Light: [
    { rep: 0,  label: 'Unknown',   unlockLabel: 'Light contracts open',         contractIds: ['hold-the-crossing'] },
    { rep: 2,  label: 'Noticed',   unlockLabel: 'More Light work coming',       contractIds: [] },
    { rep: 4,  label: 'Trusted',   unlockLabel: 'Deep access',                  contractIds: [] },
    { rep: 7,  label: 'Embedded',  unlockLabel: 'Senior contracts',             contractIds: [] },
    { rep: 10, label: 'Champion',  unlockLabel: 'Full Light access',            contractIds: [] },
  ],
};

// Index of the highest unlocked rung (0-based) for a given rep.
export function currentRung(faction, rep) {
  const ladder = REP_LADDERS[faction];
  if (!ladder) return 0;
  let rung = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (rep >= ladder[i].rep) rung = i;
  }
  return rung;
}

// All contract ids available to the player at the given faction rep.
export function availableContractIds(faction, rep) {
  const ladder = REP_LADDERS[faction];
  if (!ladder) return [];
  const ids = [];
  for (const rung of ladder) {
    if (rep >= rung.rep) ids.push(...rung.contractIds);
  }
  return ids;
}

// The rep threshold of the NEXT locked rung (or null if fully unlocked).
export function nextRungThreshold(faction, rep) {
  const ladder = REP_LADDERS[faction];
  if (!ladder) return null;
  for (const rung of ladder) {
    if (rep < rung.rep) return rung.rep;
  }
  return null;
}
