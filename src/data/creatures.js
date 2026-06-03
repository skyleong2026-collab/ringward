// 12 placeholder creatures — 3 per archetype
// Stats: HP 100–500 | Attack 10–50 | Armor 5–25 | Speed 1–10

export const ARCHETYPES = {
  Guardian: { color: '#4a90d9', label: 'Guardian' },
  Echo:     { color: '#7ed321', label: 'Booster' }, // key stays 'Echo' (engine/goldens); display = Booster (vC-W rename)
  Swift:    { color: '#d0021b', label: 'Swift' },
  Spark:    { color: '#f5a623', label: 'Reactor' }, // key stays 'Spark' (engine/goldens); display = Reactor (vC-Q rename)
};

// Display helpers — the internal archetype KEY ('Spark') is engine/golden-bound
// and never shown; everything player-facing routes through these so a rename is
// a one-line label change (vC-Q).
const ARCHETYPE_ABBR = { Guardian: 'GRD', Echo: 'BST', Swift: 'SWT', Spark: 'RCT' };
export function archetypeLabel(key) { return ARCHETYPES[key]?.label ?? key; }
export function archetypeAbbr(key) { return ARCHETYPE_ABBR[key] ?? (key ?? '').slice(0, 3).toUpperCase(); }

export const CREATURES = [
  // ── Guardians: High HP, High Armor, Low Attack ──
  {
    id: 'vault',
    name: 'Stoneback',
    archetype: 'Guardian',
    hp: 480,
    attack: 12,
    armor: 24,
    speed: 2,
    flavor: 'Immovable.',
    signature: { id: 'bank', name: 'Bank', kind: 'active', live: true,
      text: 'Stores overflow shielding. Active: spend an intervention to release the bank as a barrier across the whole squad.' },
  },
  {
    id: 'bastion',
    name: 'Ironscale',
    archetype: 'Guardian',
    hp: 440,
    attack: 14,
    armor: 22,
    speed: 3,
    flavor: 'The wall holds.',
    signature: { id: 'intercept', name: 'Intercept', kind: 'passive', live: true,
      text: 'Bodyblocks the single biggest incoming hit aimed at an ally each round — the dedicated bodyguard.' },
  },
  {
    id: 'bulwark',
    name: 'Mosshorn',
    archetype: 'Guardian',
    hp: 400,
    attack: 16,
    armor: 20,
    speed: 4,
    flavor: 'Slow. Relentless.',
    signature: { id: 'aegis', name: 'Aegis', kind: 'passive', live: true,
      text: 'While it lives, spread and detonation damage to the whole squad is reduced — the anti-Reactor anchor.' },
  },

  // ── Echos: Moderate everything ──
  {
    id: 'conduit',
    name: 'Buzzline',
    archetype: 'Echo',
    hp: 260,
    attack: 26,
    armor: 12,
    speed: 6,
    flavor: 'Amplifies everything.',
    signature: { id: 'amplify', name: 'Amplify', kind: 'passive', live: true,
      text: 'Its echo of the strongest ally action lands at full power, not half — drafts to double your carry.' },
  },
  {
    id: 'nexus',
    name: 'Tanglewing',
    archetype: 'Echo',
    hp: 240,
    attack: 28,
    armor: 11,
    speed: 7,
    flavor: 'Everything connects here.',
    signature: { id: 'cascade', name: 'Cascade', kind: 'active', live: true,
      text: 'Active: spend an intervention to make every ally immediately repeat their last action — the burst turn.' },
  },
  {
    id: 'link',
    name: 'Threadbit',
    archetype: 'Echo',
    hp: 280,
    attack: 24,
    armor: 13,
    speed: 5,
    flavor: 'The network holds.',
    signature: { id: 'tether', name: 'Tether', kind: 'passive', live: true,
      text: 'A defensive Booster — each round it extends a protective shield to your most-wounded ally.' },
  },

  // ── Swifts: High Attack, Low HP, Low Armor ──
  {
    id: 'fang',
    name: 'Zipsnap',
    archetype: 'Swift',
    hp: 140,
    attack: 50,
    armor: 5,
    speed: 10,
    flavor: 'First. Always.',
    signature: { id: 'flank', name: 'Flank', kind: 'passive', live: true,
      text: 'Ignores enemy taunt and strikes the protected backline — the tank-bypass assassin.' },
  },
  {
    id: 'striker',
    name: 'Quicktalon',
    archetype: 'Swift',
    hp: 160,
    attack: 46,
    armor: 6,
    speed: 9,
    flavor: 'Precision over power.',
    signature: { id: 'sunder', name: 'Sunder', kind: 'passive', live: true,
      text: 'Its hits strip armor and shielding from the target — the shield-breaker for cracking enemy tanks.' },
  },
  {
    id: 'claw',
    name: 'Skitter',
    archetype: 'Swift',
    hp: 180,
    attack: 42,
    armor: 7,
    speed: 8,
    flavor: 'Waits for the wound.',
    signature: { id: 'bloodscent', name: 'Bloodscent', kind: 'passive', live: true,
      text: 'Always hunts the lowest-HP enemy, ignoring taunt, with a wider execute window — the closer.' },
  },

  // ── Sparks: Low HP, Low starting Attack — dangerous late ──
  {
    id: 'spark',
    name: 'Fizzpop',
    archetype: 'Spark',
    hp: 150,
    attack: 14,
    armor: 8,
    speed: 7,
    flavor: 'Small. Growing.',
    signature: { id: 'chainIgniter', name: 'Chain Igniter', kind: 'passive', live: true,
      text: 'When it detonates, allied Reactors gain charge — the build-around glue for a multi-Reactor squad.' },
  },
  {
    id: 'flicker',
    name: 'Glowtail',
    archetype: 'Spark',
    hp: 170,
    attack: 12,
    armor: 7,
    speed: 6,
    flavor: 'Give it time.',
    signature: { id: 'sputter', name: 'Sputter', kind: 'passive', live: true,
      text: 'Detonates early and often for less each time — sustained pressure instead of one big blast.' },
  },
  {
    id: 'cinder',
    name: 'Ashwing',
    archetype: 'Spark',
    hp: 190,
    attack: 10,
    armor: 9,
    speed: 5,
    flavor: 'Patient. Patient. Lethal.',
    signature: { id: 'bankedHeat', name: 'Banked Heat', kind: 'passive', live: true,
      text: 'Charges slowly but detonates huge — the delayed nuke you play around.' },
  },
];

export const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));

// ─── Roles (vC-U) ─────────────────────────────────────────────────────────────
// The one-line FUNCTIONAL identity of each species — its job in a fight — surfaced
// on the card + PreBattle so a unit's PURPOSE reads at a glance, not just its name.
// Display-only: the engine reads archetype + signature, never role. `tag` is the
// short handle the card shows; `line` is the player-fantasy one-liner. Each role is
// distinct — no two units share a job. Names are downstream of these (a name should
// earn its meaning from the role, e.g. Shield-Breaker → "Sunderclaw").
export const ROLES = {
  vault:   { tag: 'Squad Shield',     line: 'Banks shielding, then barriers the whole squad.' },
  bastion: { tag: 'Bodyguard',        line: 'Throws itself in front of the biggest hit each round.' },
  bulwark: { tag: 'Blast Damper',     line: 'Soaks spread & detonation for the squad — the anti-Reactor.' },
  conduit: { tag: 'Carry Amplifier',  line: 'Mirrors your carry at full force — doubles its damage.' },
  nexus:   { tag: 'Burst Enabler',    line: 'On command, the whole squad repeats its last turn.' },
  link:    { tag: 'Field Medic',      line: 'Each round, shields whoever is hurt worst.' },
  fang:    { tag: 'Assassin',         line: 'Ignores taunt — strikes the protected backline.' },
  striker: { tag: 'Shield-Breaker',   line: 'Strips armor & shields off the target for the team.' },
  claw:    { tag: 'Closer',           line: 'Hunts the lowest-HP enemy and executes.' },
  spark:   { tag: 'Reactor Battery',  line: 'Its blast charges every allied Reactor.' },
  flicker: { tag: 'Sustained Burner', line: 'Small detonations, early and often — relentless.' },
  cinder:  { tag: 'Delayed Nuke',     line: 'Charges slow, then ends the round in one blast.' },
};

export function roleOf(idOrCreature) {
  const id = typeof idOrCreature === 'string' ? idOrCreature : idOrCreature?.id;
  return ROLES[id] ?? null;
}

// ─── Recruitment (vC-N) ──────────────────────────────────────────────────────
// Most species start owned. A small "rare finds" set starts LOCKED: each is
// first DISCOVERED by winning a thematically-matched contract (contracts.js
// `discovers`), then RECRUITED into the stable by spending Shards. One per
// DPS archetype so the locked roster reads as a clear progression goal.
export const RECRUITABLE = {
  link:   { cost: 10, hint: 'Discovered by holding the Light crossing.' },   // Echo
  claw:   { cost: 12, hint: 'Discovered by cracking a Shadow formation.' },  // Swift
  cinder: { cost: 14, hint: 'Discovered by quieting the Signal.' },          // Spark
};
export const RECRUITABLE_IDS = Object.keys(RECRUITABLE);
