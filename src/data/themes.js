// themes.js — §28 Cosmetic Theme System: DATA LAYER ONLY.
//
// A theme is 100% cosmetic (§28 hard constraint #1: "No power, ever"). Nothing in
// here is a stat, slot, or advantage — it is the VFX material on a creature's three
// skills plus its core-glow color. The combat engine NEVER imports this file; that
// independence is what guarantees "combat results are identical with any theme."
//
// This is the data/logic layer the brief asks for — it stays visually INERT until
// the 18 base animations (§3) exist. No VFX/animation here, by design.

// ── 5 launch themes (§28 §4), each with 3 additive tiers (§28 §5) ──────────────
// Tiers LAYER, never replace: t1 base particles → t2 +glow bloom on Payoff →
// t3 +brief screen-level flourish on Payoff ("grander as you go", zero power).
const TIERS = [
  { tier: 1, name: 'base', adds: 'core particle set' },
  { tier: 2, name: 'bloom', adds: 'secondary particle layer + glow bloom on the Payoff' },
  { tier: 3, name: 'flourish', adds: 'brief screen-level effect on the Payoff' },
];

export const THEMES = {
  light: { id: 'light', label: 'Light', coreGlow: '#f5efcf', tiers: TIERS },
  fire:  { id: 'fire',  label: 'Fire',  coreGlow: '#e8602a', tiers: TIERS },
  water: { id: 'water', label: 'Water', coreGlow: '#2a9de8', tiers: TIERS },
  stone: { id: 'stone', label: 'Stone', coreGlow: '#9a8a6a', tiers: TIERS },
  vine:  { id: 'vine',  label: 'Vine',  coreGlow: '#5aa84a', tiers: TIERS },
};

export const THEME_IDS = Object.keys(THEMES);
export const isThemeId = (id) => Object.prototype.hasOwnProperty.call(THEMES, id);
export const MAX_TIER = TIERS.length;

// ── Motion grammar (§28 §3) — the shape-language locked in PvE so a skill reads
// true regardless of theme. Keyed by the §23 six-Type vocabulary. Material themes
// tint these; PvE never lets them be swapped (that's the PvE legibility guarantee).
export const MOTION_GRAMMAR = {
  Reactor:  { builder: 'core pulses brighter, gathering inward', payoff: 'full-body flare bursting outward (detonation)', wildcard: 'a vent/recoil — effect snaps back inward' },
  Bulwark:  { builder: 'low planted brace, effect hugs the body', payoff: 'shield-sweep spreading sideways across allies', wildcard: 'step in front of an ally, effect arcs to cover them' },
  Mender:   { builder: 'soft motes rise from the creature', payoff: 'a bloom that travels inward to settle on an ally', wildcard: 'a ward-ring expands outward then holds' },
  Striker:  { builder: 'quick forward jab, effect leads the motion', payoff: 'rapid multi-hit flurry, effect strikes outward', wildcard: 'tempo-break — effect snaps at target then recoils' },
  Assassin: { builder: 'low crouch/gather, effect tightens to a point', payoff: 'single sharp lunge, effect spikes at one target', wildcard: 'dissolve/blink, effect collapses then vanishes' },
  Booster:  { builder: 'effect reaches toward an ally (tether forming)', payoff: 'beam/pulse travels to an ally and amplifies them', wildcard: 'effect splits to two allies at once' },
};

// The current code roster uses the legacy archetype names; the §23 roster (Crystal
// Guardian, Crest, Driftstone Anchor, …) isn't in code yet. Map legacy → §23 Type
// so grammar/defaults resolve today and slot straight onto the §23 roster later.
export const ARCHETYPE_TO_TYPE = {
  Guardian: 'Bulwark',
  Echo: 'Booster',   // display-renamed to Booster (vC-W); engine key still 'Echo'
  Swift: 'Assassin',
  Spark: 'Reactor',  // display-renamed to Reactor (vC-Q)
};

// ── Per-Type default theme (§28 §4: "a default matching its nature, so opting out
// always looks coherent"). PLACEHOLDER mapping until the §23 per-creature table
// (Crystal Guardian→Light, Crest→Water, …) lands; per-creature overrides win.
export const TYPE_DEFAULT_THEME = {
  Reactor: 'fire',
  Bulwark: 'stone',
  Mender: 'vine',
  Striker: 'stone',
  Assassin: 'light',
  Booster: 'water',
};

// Optional per-creature overrides keyed by creature id (the §28 §4 default table,
// as far as the current roster maps onto it). Sparse on purpose — anything absent
// falls back to its Type default.
export const CREATURE_DEFAULT_THEME = {
  spark: 'fire',     // Reactor — Cracked Void → Fire
  flicker: 'vine',   // Reactor — Rooted Coil → Vine
  conduit: 'water',  // Booster — Crest → Water
  link: 'stone',     // Booster — Driftstone Anchor → Stone
  // combat-module roster (new §26 engine)
  fizzpop: 'fire',
  glowtail: 'vine',
  cinderpaw: 'fire',
};

// Tier unlock dials (§28 §8 open dial #2, rec: skill level). Placeholder — Lab-tuned.
export const TIER_UNLOCK_LEVEL = { 2: 3, 3: 6 };
