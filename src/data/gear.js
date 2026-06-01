// Layer 2 — Gear. Behavioral transforms, 1 slot per unit. See GDD §6.1.
// Each gear GRANTS or REWRITES a behavior (Trigger × Effect). Behaviors are
// wired into battleStepEngine.js (PHASE_G_PLAN.md Step 4) — this file is data only.
// `trigger`/`effect` tags are the readable grammar; `description` is the one-sentence
// player-facing read (GDD §10 — no raw stat numbers).

export const GEAR = {
  // ── Starter gear (migrated from the old "Cores" — same effects, retagged) ──
  ironhide: {
    id: 'ironhide', name: 'Ironhide', slot: 'gear', archetype: 'Guardian',
    trigger: 'onShieldBreak', effect: 'reform',
    description: 'First broken shield reforms at half strength.',
    callout: 'Shield Reformed', color: '#4a90d9', starter: true,
  },
  lastwall: {
    id: 'lastwall', name: 'Lastwall', slot: 'gear', archetype: 'Guardian',
    trigger: 'onWouldFall', effect: 'reflect',
    description: 'Survives a lethal hit once, then reflects damage back to attackers.',
    callout: 'LAST STAND', color: '#ff6b35', starter: true,
  },
  resonator: {
    id: 'resonator', name: 'Resonator', slot: 'gear', archetype: 'Echo',
    trigger: 'onEcho', effect: 'empower',
    description: 'The first echo each round fires at full power. Opens an extra channel for operator focus (+1 intervention).',
    callout: 'Resonance', color: '#7ed321', starter: true,
    grantsFocus: 1, // FOCUS layer (vC-P) — read by data/focus.js, never by the engine
  },
  chainlink: {
    id: 'chainlink', name: 'Chain Link', slot: 'gear', archetype: 'Echo',
    trigger: 'onEcho', effect: 'chain',
    description: 'Echoes jump once to a second enemy.',
    callout: 'Echo Jump', color: '#a0d060', starter: true,
  },
  quickstrike: {
    id: 'quickstrike', name: 'Quickstrike', slot: 'gear', archetype: 'Swift',
    trigger: 'onKill', effect: 'reset',
    description: 'On a kill, immediately take one more attack (once per round).',
    callout: 'EXTRA ACTION', color: '#d0021b', starter: true,
  },
  kindling: {
    id: 'kindling', name: 'Kindling', slot: 'gear', archetype: 'Spark',
    trigger: 'onAllyFall', effect: 'inherit',
    description: 'When an ally falls, this unit inherits power from the loss.',
    callout: 'Flame Inherited', color: '#f5a623', starter: true,
  },

  // ── Overwatch probe (Phase 18 — reaction topology, XCOM import) ──
  sentinel: {
    id: 'sentinel', name: 'Sentinel', slot: 'gear', archetype: 'Guardian',
    trigger: 'onAllyTargeted', effect: 'intercept',
    description: 'Once a round, throws itself in front of the first ally attacked — taking the hit instead.',
    callout: 'INTERCEPT', color: '#4a90d9',
  },

  // ── Launch gear (GDD §6.1 — behavioral transforms, balance TBD) ──
  mirrorplate: {
    id: 'mirrorplate', name: 'Mirrorplate', slot: 'gear', archetype: 'Guardian',
    trigger: 'onShieldBreak', effect: 'reflect',
    description: 'Stores the damage it absorbs, then releases it as a burst when its shield breaks.',
    callout: 'MIRROR BURST', color: '#5bc0de',
  },
  killingMomentum: {
    id: 'killingMomentum', name: 'Killing Momentum', slot: 'gear', archetype: 'Swift',
    trigger: 'onKill', effect: 'reset',
    description: 'Each kill refunds the action and widens its execute window for the rest of the round.',
    callout: 'MOMENTUM', color: '#e74c3c',
  },
  openChannel: {
    id: 'openChannel', name: 'Open Channel', slot: 'gear', archetype: 'Echo',
    trigger: 'onEcho', effect: 'chain',
    description: 'Echoes chain to a second target and mark it, empowering the next ally to hit it.',
    callout: 'OPEN CHANNEL', color: '#2ecc71',
  },
  pyreHeart: {
    id: 'pyreHeart', name: 'Pyre Heart', slot: 'gear', archetype: 'Spark',
    trigger: 'onWouldFall', effect: 'inherit',
    description: 'When it would fall, it passes all its built-up power to an ally and detonates.',
    callout: 'PASS THE FLAME', color: '#f39c12',
  },
  glassworkCore: {
    id: 'glassworkCore', name: 'Glasswork Core', slot: 'gear', archetype: null,
    trigger: 'onInit', effect: 'convert',
    description: 'Turns all of its armor into raw attack — a glass cannon.',
    callout: 'GLASSWORK', color: '#bdc3c7',
  },
};

export const GEAR_BY_ARCHETYPE = Object.values(GEAR).reduce((acc, g) => {
  const key = g.archetype ?? 'Any';
  if (!acc[key]) acc[key] = [];
  acc[key].push(g);
  return acc;
}, {});

export const STARTER_GEAR = Object.values(GEAR).filter((g) => g.starter);

export const GEAR_BY_ID = GEAR;
