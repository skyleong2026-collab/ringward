// ─── Signature Modifiers (vC-K) ────────────────────────────────────────────────
// The PoE support-gem analog. Each creature has 2 signature modifier slots;
// modifiers bend how the signature (and general combat behavior) plays out.
// These are equip-in-slots items, SEPARATE from gear (one archetype-specific
// passive) and modules (numeric dials on gear). Modifiers shape the signature.
//
// Design rule (from the build brief): "a modifier does nothing on its own" —
// like a support gem it only makes sense in the context of the unit it's on.
//
// Engine reads these via creature.sigModIds → merged into unit.dials Set in
// initUnit. The dials.has('modId') checks are opt-in; no existing golden unit
// has sigModIds, so all goldens continue to pass untouched.

export const SIG_MODS = [
  {
    id: 'chain',
    name: 'Chain',
    glyph: '⟿',
    color: '#f5a623',
    text: 'After each hit, 50% of the damage splashes to a random other enemy.',
    flavor: 'The impact travels.',
    bestOn: ['Swift', 'Guardian'], // archetypes that benefit most
  },
  {
    id: 'echoStrike',
    name: 'Echo Strike',
    glyph: '◫',
    color: '#4a90d9',
    text: 'After each hit, replays the strike at 40% damage on the same target.',
    flavor: 'Every blow lands twice.',
    bestOn: ['Swift', 'Echo'],
  },
  {
    id: 'pierce',
    name: 'Pierce',
    glyph: '▸',
    color: '#e06060',
    text: 'Attacks ignore 8 points of armor.',
    flavor: 'Find the gap.',
    bestOn: ['Swift', 'Spark'],
  },
  {
    id: 'fortify',
    name: 'Fortify',
    glyph: '◆',
    color: '#7ed321',
    text: '+20% maximum HP.',
    flavor: 'More to give.',
    bestOn: ['Guardian', 'Echo'],
  },
  {
    id: 'surge',
    name: 'Surge',
    glyph: '⚡',
    color: '#f5a623',
    text: 'Spark: detonates 1 stoke earlier. Others: +1 speed.',
    flavor: 'Push the threshold.',
    bestOn: ['Spark'],
  },
  {
    id: 'resilient',
    name: 'Resilient',
    glyph: '◎',
    color: '#9b6bd6',
    text: 'Survives the first lethal hit at 1 HP (once per battle).',
    flavor: 'Not yet.',
    bestOn: ['Guardian', 'Spark'],
  },
];

export const SIG_MODS_BY_ID = Object.fromEntries(SIG_MODS.map((m) => [m.id, m]));
