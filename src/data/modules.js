export const MODULES = {
  // Targeting Modules — visible behavior
  weakpoint: {
    id: 'weakpoint',
    name: 'Weakpoint',
    description: 'Hunts weakened enemies.',
    category: 'Targeting',
    color: '#d0021b',
    archetype: null,
  },
  echoHunter: {
    id: 'echoHunter',
    name: 'Echo Hunter',
    description: 'Targets Echoes first.',
    category: 'Targeting',
    color: '#7ed321',
    archetype: null,
  },
  packCall: {
    id: 'packCall',
    name: 'Pack Call',
    description: 'Friends attack the same target.',
    category: 'Targeting',
    color: '#4a90d9',
    archetype: null,
  },
  protector: {
    id: 'protector',
    name: 'Protector',
    description: 'Intercepts threats to allies.',
    category: 'Targeting',
    color: '#ff6b35',
    archetype: null,
  },

  // Positioning Modules
  rooted: {
    id: 'rooted',
    name: 'Rooted',
    description: 'Stands firm. Stronger while in place.',
    callout: 'ROOTED',
    category: 'Positioning',
    color: '#4a90d9',
    archetype: null,
  },
  dart: {
    id: 'dart',
    name: 'Dart',
    description: 'Dashes away after attacking.',
    callout: 'DART',
    category: 'Positioning',
    color: '#d0021b',
    archetype: null,
  },

  // Tempo Modules
  fastStart: {
    id: 'fastStart',
    name: 'Fast Start',
    description: 'First hit hits harder.',
    callout: 'FAST START',
    category: 'Tempo',
    color: '#f5a623',
    archetype: null,
  },
  slowBurn: {
    id: 'slowBurn',
    name: 'Slow Burn',
    description: 'Gets stronger each round.',
    callout: 'SLOW BURN',
    category: 'Tempo',
    color: '#f5a623',
    archetype: null,
  },

  // Information Modules — reserved for future phases, hidden from equip UI
  exposed: {
    id: 'exposed',
    name: 'Exposed',
    description: '[Reserved]',
    category: 'Information',
    color: '#7ed321',
    archetype: null,
    hidden: true,
  },
  synchronized: {
    id: 'synchronized',
    name: 'Synchronized',
    description: '[Reserved]',
    category: 'Information',
    color: '#7ed321',
    archetype: null,
    hidden: true,
  },
};

export const MODULES_BY_CATEGORY = Object.values(MODULES).reduce((acc, mod) => {
  if (!acc[mod.category]) acc[mod.category] = [];
  acc[mod.category].push(mod);
  return acc;
}, {});

export const MODULES_BY_ID = MODULES;
