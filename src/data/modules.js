// ─── Modules = tuning dials ───────────────────────────────────────────────────
// A dial does NOTHING on its own. Each one tunes a parameter of a behavior the
// unit ALREADY has — its archetype mechanic or its equipped gear. Never a flat
// stat buff, never a standalone behavior. The tuning vocabulary is:
//   Earlier · Wider · Stronger · Repeat.
// (Standalone behaviors and topology/preference tuning are parked as future GEAR.)

export const MODULES = {
  // ── Earlier — shift a trigger's timing ─────────────────────────────────────
  earlyWall: {
    id: 'earlyWall', name: 'Early Wall',
    description: 'Your Guardian shield raises earlier — at 60% health instead of 50%.',
    callout: 'EARLY WALL',
    category: 'Earlier', rarity: 'Common',
    content: 'Rail yards', color: '#4a90d9', archetype: 'Guardian',
  },

  // ── Wider — widen a threshold or reach ─────────────────────────────────────
  deepCut: {
    id: 'deepCut', name: 'Deep Cut',
    description: 'Your execute window widens — finish targets up to 42% health, not 30%.',
    callout: 'DEEP CUT',
    category: 'Wider', rarity: 'Rare',
    content: 'Urban loops', color: '#d0021b', archetype: 'Swift',
  },
  longEcho: {
    id: 'longEcho', name: 'Long Echo',
    description: 'Your chains jump to one additional target.',
    callout: 'LONG ECHO',
    category: 'Wider', rarity: 'Rare',
    content: 'Long walks', color: '#7ed321', archetype: 'Echo',
  },

  // ── Stronger — raise a behavior's magnitude ────────────────────────────────
  hardplate: {
    id: 'hardplate', name: 'Hardplate',
    description: 'Your Guardian shield and shield-gear absorb noticeably more.',
    callout: 'HARDPLATE',
    category: 'Stronger', rarity: 'Common',
    content: 'Rail yards', color: '#2980b9', archetype: 'Guardian',
  },
  pureTone: {
    id: 'pureTone', name: 'Pure Tone',
    description: 'Your echoes ring at 65% power instead of 50%.',
    callout: 'PURE TONE',
    category: 'Stronger', rarity: 'Common',
    content: 'Long walks', color: '#27ae60', archetype: 'Echo',
  },
  bankedHeat: {
    id: 'bankedHeat', name: 'Banked Heat',
    description: 'Every Stoke you gain comes with an extra stack.',
    callout: 'BANKED HEAT',
    category: 'Stronger', rarity: 'Common',
    content: 'Dungeons', color: '#f5a623', archetype: 'Spark',
  },
  backdraft: {
    id: 'backdraft', name: 'Backdraft',
    description: 'Your Stoke scales harder and Pyre detonations hit wider.',
    callout: 'BACKDRAFT',
    category: 'Stronger', rarity: 'Rare',
    content: 'Dungeons', color: '#f39c12', archetype: 'Spark',
  },

  // ── Repeat — let a one-shot trigger fire again ─────────────────────────────
  secondWind: {
    id: 'secondWind', name: 'Second Wind',
    description: 'Your kill-triggered gear can fire one extra time each round.',
    callout: 'SECOND WIND',
    category: 'Repeat', rarity: 'Rare',
    content: 'Urban loops', color: '#e74c3c', archetype: 'Swift',
  },
  hairTrigger: {
    id: 'hairTrigger', name: 'Hair Trigger',
    description: 'Your once-per-battle survival gear can fire a second time.',
    callout: 'HAIR TRIGGER',
    category: 'Repeat', rarity: 'Rare',
    content: 'Night routes', color: '#c9a84c', archetype: null,
  },
};

export const MODULES_BY_CATEGORY = Object.values(MODULES).reduce((acc, mod) => {
  if (!acc[mod.category]) acc[mod.category] = [];
  acc[mod.category].push(mod);
  return acc;
}, {});

export const MODULES_BY_ID = MODULES;

export const MODULE_POOLS = {
  'Rail yards':   ['earlyWall', 'hardplate', 'hairTrigger'],
  'Urban loops':  ['deepCut', 'secondWind', 'hairTrigger'],
  'Long walks':   ['longEcho', 'pureTone', 'earlyWall'],
  'Dungeons':     ['bankedHeat', 'backdraft', 'deepCut'],
  'Night routes': ['hairTrigger', 'pureTone', 'secondWind'],
};
