export const MODULES = {
  // Targeting Modules — highest-value early category
  executionerLens: {
    id: 'executionerLens',
    name: 'Executioner Lens',
    description: 'Prioritize lowest-health target.',
    category: 'Targeting',
    color: '#d0021b',
    archetype: null, // available to all
  },
  echoHunter: {
    id: 'echoHunter',
    name: 'Echo Hunter',
    description: 'Prioritize Echo-class enemies first.',
    category: 'Targeting',
    color: '#7ed321',
    archetype: null,
  },
  packInstinct: {
    id: 'packInstinct',
    name: 'Pack Instinct',
    description: 'Focus targets allies are already attacking.',
    category: 'Targeting',
    color: '#4a90d9',
    archetype: null,
  },
  bulwarkProtocol: {
    id: 'bulwarkProtocol',
    name: 'Bulwark Protocol',
    description: 'Always target highest-attack enemy.',
    category: 'Targeting',
    color: '#ff6b35',
    archetype: null,
  },

  // Positioning Modules
  anchor: {
    id: 'anchor',
    name: 'Anchor',
    description: 'Unit cannot be displaced. Gain defense while stationary.',
    category: 'Positioning',
    color: '#4a90d9',
    archetype: null,
  },
  skirmisher: {
    id: 'skirmisher',
    name: 'Skirmisher',
    description: 'Reposition after attacking.',
    category: 'Positioning',
    color: '#d0021b',
    archetype: null,
  },

  // Tempo Modules
  openingGambit: {
    id: 'openingGambit',
    name: 'Opening Gambit',
    description: 'First attack deals bonus damage.',
    category: 'Tempo',
    color: '#f5a623',
    archetype: null,
  },
  slowBurn: {
    id: 'slowBurn',
    name: 'Slow Burn',
    description: 'Gain attack each round alive.',
    category: 'Tempo',
    color: '#f5a623',
    archetype: null,
  },

  // Information Modules — comprehension before complexity
  threatScanner: {
    id: 'threatScanner',
    name: 'Threat Scanner',
    description: 'Reveal enemy targeting priority.',
    category: 'Information',
    color: '#7ed321',
    archetype: null,
  },
  weakpointAnalysis: {
    id: 'weakpointAnalysis',
    name: 'Weakpoint Analysis',
    description: 'Show execute thresholds visually.',
    category: 'Information',
    color: '#7ed321',
    archetype: null,
  },
  pulseTracker: {
    id: 'pulseTracker',
    name: 'Pulse Tracker',
    description: 'Display upcoming Echo timings.',
    category: 'Information',
    color: '#7ed321',
    archetype: null,
  },
};

export const MODULES_BY_CATEGORY = Object.values(MODULES).reduce((acc, mod) => {
  if (!acc[mod.category]) acc[mod.category] = [];
  acc[mod.category].push(mod);
  return acc;
}, {});

export const MODULES_BY_ID = MODULES;
