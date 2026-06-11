// ── UPGRADES — the between-fight draft pool, ONE shared source (vF-CH, S7). ──
// The roguelike "pick 1 of 3" upgrades that compound into a run build. This module is the
// SINGLE source of truth, imported by BOTH the live game (src/screens/SeamLab.jsx, which
// renders the icon/name/desc/color) AND the balance sim (scripts/sim/run-sim-tier2.mjs,
// which reads id/scope/needsType/needsCap/chain/apply). Killing the old hand-mirrored copy
// kills the drift-bug class the waves.js extraction already closed for wave-gen.
//
// PLAIN JS — no React, no engine imports — so the sim can import it without pulling in the UI.
// Colors are inline hex (identical values to SeamLab's ACCENT/CHG/BURN/AMP/WIN constants).
//
// ⚠ apply() form: additive UNIT-scope fields use the defensive `(m.x || 0) + n` form so the
// applies work whether the mod object pre-initialises the field (the game's EMPTY_UNIT_MODS,
// all 0) or starts bare `{}` (the sim's per-unit mods). Mathematically identical to a bare
// `+=` when the field starts at 0, which it always does — so goldens + live play are unchanged.
// Multiplicative fields stay `*=` (both sides initialise them to 1).

const BURN = '#ff5a2a';
const AMP = '#b06bff';
const WIN = '#7ed321';
const CHG = '#f5a623';

export const UPGRADES = [
  { id: 'sharpen',    scope: 'squad', icon: '⚔️', color: '#ff8a4a', name: 'Sharpened Edge', desc: '+30% damage from every attack.',            apply: (m) => { m.dmgMult   *= 1.3; } },
  { id: 'wellspring', scope: 'squad', needsCap: 'heal',  icon: '💚', color: WIN,        name: 'Wellspring',     desc: 'Heals are 40% stronger.',                    apply: (m) => { m.healMult  *= 1.4; } },
  { id: 'bastion',    scope: 'squad', needsCap: 'shield', icon: '🛡️', color: '#7fd6ff',  name: 'Bastion',        desc: 'Shields hold 40% more.',                     apply: (m) => { m.blockMult *= 1.4; } },
  { id: 'primed',     scope: 'squad', icon: '⚡', color: CHG,        name: 'Primed',         desc: 'Start every fight with +2 charge.',          apply: (m) => { m.chargeStart += 2; } },
  { id: 'thickhide',  scope: 'squad', icon: '❤️', color: '#ff6b6b',  name: 'Thick Hide',     desc: '+20% max HP for the whole squad.',           apply: (m) => { m.hpMult    *= 1.2; } },
  { id: 'wildfire',   scope: 'squad', icon: '🔥', color: BURN,       name: 'Wildfire',       desc: 'Your Burns land +1 extra stack.',            apply: (m) => { m.burnBonus += 1; } },
  { id: 'overhype',   scope: 'squad', icon: '✦',  color: AMP,        name: 'Overhype',       desc: 'Your Amp lands +1 extra stack.',             apply: (m) => { m.ampBonus  += 1; } },
  // ── Verb upgrades: squad-wide RULES (not flat stats), via the universal combat verbs.
  //    Mid-run access to the same mechanics relics grant, so a draft can pivot your build. ──
  { id: 'firststrike', scope: 'squad', icon: '🎯', color: '#ffd166', name: 'Opening Strike', desc: 'First hit on a full-HP enemy: +25% damage.',  apply: (m) => { m.opener = true; } },
  { id: 'leech',       scope: 'squad', icon: '🩸', color: '#c83a5a', name: 'Leeching Strikes', desc: 'Heal 12% of all damage you deal.',           apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.12; } },
  { id: 'killingblow', scope: 'squad', icon: '☠️', color: '#c0c0d8', name: 'Killing Blow',   desc: '+30% damage to enemies already below half HP.', apply: (m) => { m.executioner = (m.executioner || 0) + 0.3; } },
  { id: 'secondwind',  scope: 'squad', icon: '🪶', color: WIN,        name: 'Second Wind',    desc: 'Each grunling cheats death once per fight — survives a lethal blow at 30% HP.', apply: (m) => { m.phoenix = true; } },
  { id: 'bloodrush',   scope: 'squad', icon: '🌀', color: CHG,        name: 'Bloodrush',      desc: 'Every kill banks +2 charge on the grunling that landed it.', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
  // ── Move-bend upgrades: scope:'unit' — you PICK which creature gets this, so
  // bends define your carry rather than spreading thin across the squad. Only
  // offered when you brought the matching Type (no dead drafts). ──
  { id: 'embertrail', scope: 'unit', icon: '🔥', color: BURN,       name: 'Ember Trail',  needsType: 'Reactor',  desc: "ONE creature: Overload also sets the target ablaze (+2 Burn).",    apply: (m) => { m.overloadBurn  = (m.overloadBurn || 0) + 2; } },
  { id: 'twinstrike', scope: 'unit', icon: '⚔',  color: '#ffd166',  name: 'Twin Strike',  needsType: 'Striker',  desc: "ONE creature: Jab and Flurry each throw +1 extra hit.",            apply: (m) => { m.extraHits     = (m.extraHits || 0) + 1; } },
  { id: 'huntersmark',scope: 'unit', icon: '🗡',  color: '#ff7a9c',  name: "Hunter's Mark",needsType: 'Assassin', desc: "ONE creature: Execute triggers below 60% HP, not 45%.",           apply: (m) => { m.executeWindow = (m.executeWindow || 0) + 0.15; } },
  { id: 'aegisreflex',scope: 'unit', icon: '🛡',  color: '#7fd6ff',  name: 'Aegis Reflex', needsType: 'Bulwark',  desc: "ONE creature: Brace shields your WHOLE team, not just itself.",   apply: (m) => { m.braceTeam     = 1; } },
  { id: 'lifebloom',  scope: 'unit', icon: '🌿', color: WIN,        name: 'Lifebloom',    needsType: 'Mender',   desc: "ONE creature: Mend leaves a regen ward on whoever it heals.",     apply: (m) => { m.mendRegen     = (m.mendRegen || 0) + 1; } },
  { id: 'powerchord', scope: 'unit', icon: '✦',  color: AMP,        name: 'Power Chord',  needsType: 'Booster',  desc: "ONE creature: Prime amps your WHOLE team, not just the strongest.",apply: (m) => { m.primeTeam     = 1; } },
  // ── Tier-2 chain bends: only offered if the creature already has the tier-1 prereq ──
  { id: 'combustion',  scope: 'unit', icon: '💥', color: BURN,       name: 'Combustion',   needsType: 'Reactor',  chain: 'embertrail',  desc: "ONE creature: Overload erupts across the WHOLE enemy line.",           apply: (m) => { m.overloadAOE   = true; } },
  { id: 'blitzstorm',  scope: 'unit', icon: '⚡', color: '#ffd166',  name: 'Blitz Storm',  needsType: 'Striker',  chain: 'twinstrike',  desc: "ONE creature: Blitz becomes a 3-hit barrage instead of one strike.",   apply: (m) => { m.blitzMulti    = true; } },
  { id: 'bloodhunt',   scope: 'unit', icon: '🩸', color: '#ff7a9c',  name: 'Blood Hunt',   needsType: 'Assassin', chain: 'huntersmark', desc: "ONE creature: Execute auto-hunts the most wounded enemy regardless of target.", apply: (m) => { m.executeHunt = true; } },
  { id: 'ironbastion', scope: 'unit', icon: '✨', color: '#7fd6ff',  name: 'Iron Bastion', needsType: 'Bulwark',  chain: 'aegisreflex', desc: "ONE creature: Brace seeds regen on everyone it shields.",              apply: (m) => { m.braceRegen    = true; } },
  { id: 'fullbloom',   scope: 'unit', icon: '🌸', color: WIN,        name: 'Full Bloom',   needsType: 'Mender',   chain: 'lifebloom',   desc: "ONE creature: Bloom washes over the WHOLE team at once.",             apply: (m) => { m.bloomAll       = true; } },
  { id: 'surge',       scope: 'unit', icon: '⬆️', color: AMP,        name: 'Surge',        needsType: 'Booster',  chain: 'powerchord',  desc: "ONE creature: Overdrive floods ALL allies with Amp, not just your hardest hitter.",apply: (m) => { m.overdriveAll  = true; } },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
