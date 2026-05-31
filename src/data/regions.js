// ─── Regions (World Layer — vC-J) ─────────────────────────────────────────────
// Each region is a named territory with faction tracks and a rep ladder.
// The rep ladder gates contract availability — progression without a walkable map.
//
// vC-J: one region ("The Ironfield"), two faction tracks (Shadow / Light).
// Region select screen (world board with multiple territories) is vC-K.

export const REGIONS = [
  {
    id: 'ironfield',
    name: 'The Ironfield',
    tagline: 'Contested rail yards, relay towers, and shadow operations. Both factions move here.',
  },
];

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
