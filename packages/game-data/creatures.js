// 12 placeholder creatures — 3 per archetype
// Stats: HP 100–500 | Attack 10–50 | Armor 5–25 | Speed 1–10

export const ARCHETYPES = {
  Guardian: { color: '#4a90d9', label: 'Guardian' },
  Echo:     { color: '#7ed321', label: 'Echo' },
  Swift:    { color: '#d0021b', label: 'Swift' },
  Spark:    { color: '#f5a623', label: 'Spark' },
};

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
  },

  // ── Sparks: Low HP, Low starting Attack — dangerous late ──
  {
    id: 'spark',
    name: 'Fizzpop',
    archetype: 'Spark',
    hp: 110,
    attack: 14,
    armor: 8,
    speed: 7,
    flavor: 'Small. Growing.',
  },
  {
    id: 'flicker',
    name: 'Glowtail',
    archetype: 'Spark',
    hp: 130,
    attack: 12,
    armor: 7,
    speed: 6,
    flavor: 'Give it time.',
  },
  {
    id: 'cinder',
    name: 'Ashwing',
    archetype: 'Spark',
    hp: 150,
    attack: 10,
    armor: 9,
    speed: 5,
    flavor: 'Patient. Patient. Lethal.',
  },
];
