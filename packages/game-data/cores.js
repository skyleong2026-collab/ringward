export const CORES = {
  ironhide: {
    id: 'ironhide',
    name: 'Ironhide',
    description: 'First broken Shield reforms at 50% strength.',
    callout: 'Shield Reformed',
    archetype: 'Guardian',
    color: '#4a90d9',
  },
  lastwall: {
    id: 'lastwall',
    name: 'Lastwall',
    description: "Cannot fall below 1 HP once per battle. After surviving, reflects 30% of incoming damage to the attacker.",
    callout: 'LAST STAND',
    archetype: 'Guardian',
    color: '#ff6b35',
  },
  resonator: {
    id: 'resonator',
    name: 'Resonator',
    description: 'First Echo each round fires at full power instead of 50%.',
    callout: 'Resonance',
    archetype: 'Echo',
    color: '#7ed321',
  },
  chainlink: {
    id: 'chainlink',
    name: 'Chain Link',
    description: 'Echo jumps once to the nearest enemy after the original target.',
    callout: 'Echo Jump',
    archetype: 'Echo',
    color: '#a0d060',
  },
  quickstrike: {
    id: 'quickstrike',
    name: 'Quickstrike',
    description: 'On kill, immediately take one bonus attack action (once per round).',
    callout: 'EXTRA ACTION',
    archetype: 'Swift',
    color: '#d0021b',
  },
  kindling: {
    id: 'kindling',
    name: 'Kindling',
    description: 'When any ally falls in battle, gain +2 Stoke stacks immediately.',
    callout: 'Flame Inherited',
    archetype: 'Spark',
    color: '#f5a623',
  },
};

export const CORES_BY_ARCHETYPE = Object.values(CORES).reduce((acc, core) => {
  if (!acc[core.archetype]) acc[core.archetype] = [];
  acc[core.archetype].push(core);
  return acc;
}, {});
