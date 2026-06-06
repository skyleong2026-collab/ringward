// SeamLab.jsx — the §26 ENGINE SEAM proving ground.
//
// The ONE surface wired to the NEW manual-combat engine (src/engine/combat). It is
// deliberately separate from ReactorSandbox.jsx and shares nothing with
// battleStepEngine.js / resolveBattle. Two top-level modes:
//   • ⚔ RUN     — pick your own squad, fight 3 escalating waves; HP carries between
//                 fights, you patch up between them, win the run or get wiped.
//   • 🔬 SANDBOX — the original fixed matchups: PLAY one, or WATCH AI-vs-AI replay a
//                 blessed golden. Kept as the per-Type showcase + verification surface.
//
// One engine, two drivers: the human driver awaits these clicks; the AI driver answers
// instantly. The same <FightView> + useFight() power both modes.

import { useState, useRef, useEffect } from 'react';
import * as sfx from '../sfx.js';
import {
  createBattleState,
  runBattle,
  createAIDriver,
  createHumanDriver,
  getSkill,
  legalSkills,
  enemiesOf,
  alliesOf,
  makeUnitDef,
  COMBAT_CREATURES,
  COMBAT_ROSTER,
} from '../engine/combat/index.js';

const ACCENT = '#e8a040';
const CHG = '#f5a623';
const BURN = '#ff5a2a';
const AMP = '#b06bff';
const WIN = '#7ed321';
const LOSS = '#d0021b';
const DIM = '#8a8a9a';
const PANEL = '#12121c';
const LINE = '#2a2a3a';
const SEL = '#9cd1ff';
const T = { micro: 11, small: 13, body: 15, label: 16, sub: 18, head: 21, huge: 30 };
const PATCHUP = 0.3; // between-wave heal (fraction of max HP)
// Input-locking beat after each action — the hit animates, THEN the next actor is
// asked. Weighted by move size for a Summoners-War-style feel (~1.2–1.9s/turn): a
// big payoff lands heavier than a chip builder, so the spend FEELS mighty without
// making every routine turn drag (per turn-RPG animation-timing guidance).
const HOLD_MS = { builder: 1200, payoff: 1900, wildcard: 1600 };
const TICK_HOLD_MS = 800; // end-of-round burn/regen ticks — shorter; they're not a turn

// Per-Type identity — color + shape + a plain-language nickname so a creature is
// recognizable by FEEL, not by name. `focal` crops the concept-art strip to one
// clear pose (these PNGs are wide turnaround sheets, ~4–7 poses each).
const TYPE_INFO = {
  Reactor: { glyph: '🔥', accent: BURN, nick: 'The Hothead', role: 'Powers up, then blows up.' },
  Bulwark: { glyph: '🛡', accent: '#7fd6ff', nick: 'The Wall', role: 'Soaks hits and guards the team.' },
  Mender: { glyph: '🌿', accent: WIN, nick: 'The Healer', role: 'Keeps the squad alive.' },
  Booster: { glyph: '✦', accent: AMP, nick: 'The Hype', role: 'Makes an ally hit way harder.' },
  Striker: { glyph: '⚔', accent: '#ffd166', nick: 'The Brawler', role: 'Fast — lots of quick hits.' },
  Assassin: { glyph: '🗡', accent: '#ff7a9c', nick: 'The Killer', role: 'Hunts and finishes the weak.' },
};

function useViewport() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    window.addEventListener('resize', f);
    window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  return w;
}

// ── The climb: three escalating packs, then the boss (fresh each fight). ──
const WAVES = [
  { name: 'Scouts', blurb: 'A pair of jumpy Reactors. Warm up.', seed: 101,
    enemies: () => [makeUnitDef('glowtail', 'Balanced'), makeUnitDef('fizzpop', 'Balanced')] },
  { name: 'The Pack', blurb: 'A Striker backed by a Mender — kill the healer first.', seed: 202,
    enemies: () => [makeUnitDef('swiftpaw', 'Balanced'), makeUnitDef('mossback', 'Balanced')] },
  { name: 'The Warden', blurb: 'A Bulwark wall guarding an Assassin. Break through.', seed: 303,
    enemies: () => [makeUnitDef('stoneward', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')] },
  // The peak: a single huge Reactor that HOARDS charge for one ruinous Overload,
  // kept standing by a tender. Race it down or cut the healer. AOE + your bends shine.
  { name: 'The Hollow King', boss: true, seed: 404,
    blurb: 'The thing the others were guarding. It hoards fire for one ruinous blast — and a tender keeps it standing. Burn it down, or cut the healer first.',
    enemies: () => [
      { ...makeUnitDef('cinderpaw', 'Greedy'), name: 'The Hollow King', hp: 720, maxHp: 720, atk: 40, speed: 7 },
      { ...makeUnitDef('mossback', 'Balanced'), name: 'Ashen Tender', hp: 240, maxHp: 240 },
    ] },
];

// Sandbox matchups, each pinned to a blessed golden seed so WATCH reproduces a fight.
const MATCHUPS = {
  mirror: { label: 'Reactor mirror', glyph: '⚡', accent: BURN, seed: 1337,
    desc: 'Two charge-and-nuke squads trade Overloads — the baseline fight.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')] },
  bulwark: { label: 'Bulwark wall', glyph: '🛡', accent: '#7fd6ff', seed: 4242,
    desc: 'Reactors batter a shielded wall — block soaks damage before HP.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('stoneward', 'Balanced'), makeUnitDef('ironwall', 'Balanced')] },
  mender: { label: 'Mender sustain', glyph: '🌿', accent: WIN, seed: 7777,
    desc: 'A Mender out-heals the burst — win by outlasting, not out-damaging.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced'), makeUnitDef('mossback', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')] },
  booster: { label: 'Booster combo', glyph: '✦', accent: AMP, seed: 9001,
    desc: 'A Booster stacks Amp (⚡) on its carry, then the buffed hit lands huge.',
    a: () => [makeUnitDef('buzzline', 'Greedy'), makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('cinderpaw', 'Balanced')],
    b: () => [makeUnitDef('glowtail', 'Greedy'), makeUnitDef('cinderpaw', 'Greedy')] },
  striker: { label: 'Striker tempo', glyph: '⟡', accent: '#ffd166', seed: 7,
    desc: 'Fast Strikers — one Flurry is a barrage of hits in a single turn.',
    a: () => [makeUnitDef('swiftpaw', 'Greedy'), makeUnitDef('dartwing', 'Greedy')],
    b: () => [makeUnitDef('shadefang', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')] },
  assassin: { label: 'Assassin hunt', glyph: '☠', accent: '#ff7a9c', seed: 7,
    desc: 'Glass cannons hunt the weakest — Execute spikes ×2.5 on the wounded.',
    a: () => [makeUnitDef('shadefang', 'Balanced'), makeUnitDef('veilclaw', 'Balanced')],
    b: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')] },
};

// The run's accumulated upgrade modifiers (no-op defaults). Combat reads these off
// each unit; they bake in BETWEEN fights, so combat itself stays deterministic.
const EMPTY_MODS = {
  dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0,
  // move-bend mods (read directly by the matching skill; 0 = move behaves normally)
  extraHits: 0, executeWindow: 0, overloadBurn: 0, braceTeam: 0, mendRegen: 0, primeTeam: 0,
};
// Per-creature bend defaults. Squad members each carry their own copy so bends
// can be applied to ONE named creature rather than the whole squad.
const EMPTY_UNIT_MODS = {
  extraHits: 0, executeWindow: 0, overloadBurn: 0, braceTeam: 0, mendRegen: 0, primeTeam: 0,
};

// The upgrade pool — pick 1 of 3 between fights; they compound into a build.
// scope:'squad' = applies to every creature in your run; scope:'unit' = you pick
// ONE creature to receive it, so you build a named carry instead of a flat buff.
const UPGRADES = [
  { id: 'sharpen',    scope: 'squad', icon: '⚔️', color: '#ff8a4a', name: 'Sharpened Edge', desc: '+30% damage from every attack.',            apply: (m) => { m.dmgMult   *= 1.3; } },
  { id: 'wellspring', scope: 'squad', icon: '💚', color: WIN,        name: 'Wellspring',     desc: 'Heals are 40% stronger.',                    apply: (m) => { m.healMult  *= 1.4; } },
  { id: 'bastion',    scope: 'squad', icon: '🛡️', color: '#7fd6ff',  name: 'Bastion',        desc: 'Shields hold 40% more.',                     apply: (m) => { m.blockMult *= 1.4; } },
  { id: 'primed',     scope: 'squad', icon: '⚡', color: CHG,        name: 'Primed',         desc: 'Start every fight with +2 charge.',          apply: (m) => { m.chargeStart += 2; } },
  { id: 'thickhide',  scope: 'squad', icon: '❤️', color: '#ff6b6b',  name: 'Thick Hide',     desc: '+20% max HP for the whole squad.',           apply: (m) => { m.hpMult    *= 1.2; } },
  { id: 'wildfire',   scope: 'squad', icon: '🔥', color: BURN,       name: 'Wildfire',       desc: 'Your Burns land +1 extra stack.',            apply: (m) => { m.burnBonus += 1; } },
  { id: 'overhype',   scope: 'squad', icon: '✦',  color: AMP,        name: 'Overhype',       desc: 'Your Amp lands +1 extra stack.',             apply: (m) => { m.ampBonus  += 1; } },
  // ── Move-bend upgrades: scope:'unit' — you PICK which creature gets this, so
  // bends define your carry rather than spreading thin across the squad. Only
  // offered when you brought the matching Type (no dead drafts). ──
  { id: 'embertrail', scope: 'unit', icon: '🔥', color: BURN,       name: 'Ember Trail',  needsType: 'Reactor',  desc: "ONE creature: Overload also sets the target ablaze (+2 Burn).",    apply: (m) => { m.overloadBurn  += 2; } },
  { id: 'twinstrike', scope: 'unit', icon: '⚔',  color: '#ffd166',  name: 'Twin Strike',  needsType: 'Striker',  desc: "ONE creature: Jab and Flurry each throw +1 extra hit.",            apply: (m) => { m.extraHits     += 1; } },
  { id: 'huntersmark',scope: 'unit', icon: '🗡',  color: '#ff7a9c',  name: "Hunter's Mark",needsType: 'Assassin', desc: "ONE creature: Execute triggers below 60% HP, not 45%.",           apply: (m) => { m.executeWindow += 0.15; } },
  { id: 'aegisreflex',scope: 'unit', icon: '🛡',  color: '#7fd6ff',  name: 'Aegis Reflex', needsType: 'Bulwark',  desc: "ONE creature: Brace shields your WHOLE team, not just itself.",   apply: (m) => { m.braceTeam     = 1; } },
  { id: 'lifebloom',  scope: 'unit', icon: '🌿', color: WIN,        name: 'Lifebloom',    needsType: 'Mender',   desc: "ONE creature: Mend leaves a regen ward on whoever it heals.",     apply: (m) => { m.mendRegen     += 1; } },
  { id: 'powerchord', scope: 'unit', icon: '✦',  color: AMP,        name: 'Power Chord',  needsType: 'Booster',  desc: "ONE creature: Prime amps your WHOLE team, not just the strongest.",apply: (m) => { m.primeTeam     = 1; } },
];

// ── Permanent PERKS (§ meta) — bought once with slag, they persist across runs and
// apply at the START of every run. This is what makes a run leave something behind:
// you bank slag, buy a lasting edge, and the next run begins stronger. ──
const PERKS = [
  { id: 'p_hardy', icon: '❤️', color: '#ff6b6b', name: 'Hardy Stock', cost: 60, desc: 'Every run begins with +12% max HP.', apply: (m) => { m.hpMult *= 1.12; } },
  { id: 'p_spark', icon: '⚡', color: CHG, name: 'Live Wire', cost: 50, desc: 'Start every fight with +1 charge banked.', apply: (m) => { m.chargeStart += 1; } },
  { id: 'p_edge', icon: '⚔️', color: '#ff8a4a', name: 'Honed Edge', cost: 60, desc: '+12% attack damage, every run.', apply: (m) => { m.dmgMult *= 1.12; } },
  { id: 'p_foresight', icon: '👁', color: ACCENT, name: 'Foresight', cost: 80, desc: 'See 4 upgrade choices each pick, not 3.', apply: () => {} },
  { id: 'p_medic', icon: '🌿', color: WIN, name: 'Field Medic', cost: 70, desc: 'Patch up +15% more between fights.', apply: () => {} },
];
const PERKS_KEY = '8gents_seam_perks';
function loadPerks() {
  try { return JSON.parse(localStorage.getItem(PERKS_KEY) || '[]'); } catch { return []; }
}
function savePerks(ids) {
  try { localStorage.setItem(PERKS_KEY, JSON.stringify(ids)); } catch { /* best-effort */ }
}

// ── Stable: the creatures you've caught — grows every time you clear the ring. ──
// You start with three (one of three Types) and win one more per clear. Once you
// have all 13 the stable is full; extra wins still pay slag.
const STABLE_KEY = '8gents_seam_stable';
const STARTER_IDS = ['cinderpaw', 'ironwall', 'swiftpaw'];
function loadStable() {
  try {
    const s = JSON.parse(localStorage.getItem(STABLE_KEY) || 'null');
    return Array.isArray(s) && s.length > 0 ? s : [...STARTER_IDS];
  } catch { return [...STARTER_IDS]; }
}
function saveStable(ids) {
  try { localStorage.setItem(STABLE_KEY, JSON.stringify(ids)); } catch { /* best-effort */ }
}
// Build the starting mods for a run from the perks you own (vs. EMPTY_MODS before).
function perkBaseMods(owned) {
  const m = { ...EMPTY_MODS };
  PERKS.forEach((p) => { if (owned.includes(p.id)) p.apply(m); });
  return m;
}

// Slag a run pays out — a full clear banks a lot; a wipe still leaves a little, so
// every run feeds the meta. Loss scales with how far you pushed.
const WIN_SLAG = 100;
const lossSlag = (wavesCleared) => Math.max(5, wavesCleared * 15);
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
const maxHpOf = (member, mods) => Math.round(COMBAT_CREATURES[member.id].hp * (mods?.hpMult ?? 1));

// A player creature carried through a run: wounds persist (separate maxHp), and the
// run's upgrade mods + Primed starting charge are baked onto the unit def.
// Squad-wide flat buffs come from `squadMods`; move-bends come from `member.unitMods`
// so each creature can have its own signature build.
function playerDef(member, squadMods) {
  const base = COMBAT_CREATURES[member.id];
  const maxHp = maxHpOf(member, squadMods);
  const u = member.unitMods ?? EMPTY_UNIT_MODS;
  return {
    ...base, temperament: 'Balanced', maxHp, hp: Math.min(member.hp, maxHp),
    charge: Math.min(base.maxCharge ?? 6, squadMods?.chargeStart ?? 0),
    mods: {
      // squad-wide flat buffs:
      dmgMult:   squadMods?.dmgMult   ?? 1,
      healMult:  squadMods?.healMult  ?? 1,
      blockMult: squadMods?.blockMult ?? 1,
      burnBonus: squadMods?.burnBonus ?? 0,
      ampBonus:  squadMods?.ampBonus  ?? 0,
      // per-creature bends (only the designated creature has non-zero values):
      extraHits:     u.extraHits     ?? 0,
      executeWindow: u.executeWindow ?? 0,
      overloadBurn:  u.overloadBurn  ?? 0,
      braceTeam:     u.braceTeam     ?? 0,
      mendRegen:     u.mendRegen     ?? 0,
      primeTeam:     u.primeTeam     ?? 0,
    },
  };
}

// ── Friendly feed line from a raw engine event (the engine emits pure data). ──
function feedLine(e) {
  if (e.type === 'round-start') return { kind: 'round', text: `Round ${e.round} — ${e.firstSide} side moves first` };
  if (e.type === 'battle-end') return { kind: 'end', text: `${e.winner === 'draw' ? 'Draw' : e.winner + ' wins'} — ${e.rounds} rounds` };
  if (e.type === 'burn') return { kind: 'burn', text: `${e.target.name} burns for ${e.dmg}${e.killed ? ' — KO' : ''} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  if (e.type === 'regen') return { kind: 'regen', text: `${e.target.name} regenerates +${e.healed} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  const hits = (e.hits || []).filter((h) => h.dmg > 0 || h.killed).map((h) => `${h.dmg} → ${h.name}${h.killed ? ' (KO)' : ''}`).join(', ');
  const chg = e.chargeBefore !== e.chargeAfter ? ` · charge ${e.chargeBefore}→${e.chargeAfter}` : '';
  const amp = e.amplifiedByBurn ? ' · 🔥×2' : '';
  const shields = (e.shields || []).filter((s) => s.block > 0).map((s) => `🛡${s.block}`).join(' ');
  const heals = (e.heals || []).filter((h) => h.healed > 0).map((h) => `💚${h.healed}→${h.name}`).join(' ');
  const wards = (e.regens || []).length ? `🌿ward ×${e.regens.length}` : '';
  const amps = (e.amps || []).map((a) => `⚡${a.amp}→${a.name}`).join(' ');
  const extra = [shields, heals, wards, amps].filter(Boolean).join(' · ');
  return { kind: 'turn', side: e.actor.side, text: `${e.actor.name} — ${e.skill.name}${amp}${hits ? `: ${hits}` : ''}${extra ? ` · ${extra}` : ''}${chg}` };
}

function snapshot(state) {
  const map = (u) => ({
    uid: u.uid, name: u.name, side: u.side, spriteId: u.spriteId, type: u.type,
    hp: u.hp, maxHp: u.maxHp, charge: u.charge, maxCharge: u.maxCharge,
    burn: u.statuses.burn || 0, block: u.statuses.block || 0, regen: u.statuses.regen || 0, amp: u.statuses.amp || 0, alive: u.alive,
  });
  return { A: state.units.A.map(map), B: state.units.B.map(map), round: state.round };
}

function Bar({ value, max, color, h = 10 }) {
  return (
    <div style={{ background: '#1a1a26', borderRadius: 5, height: h, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
      <div style={{ width: `${Math.max(0, (value / max) * 100)}%`, height: '100%', background: color, transition: 'width .25s ease' }} />
    </div>
  );
}

// Battle animation keyframes (injected once at the SeamLab root).
const FX_STYLE = `
@keyframes seam-idle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes seam-attack { 0%{transform:translateX(0) scale(1)} 45%{transform:translateX(11px) scale(1.09)} 100%{transform:translateX(0) scale(1)} }
@keyframes seam-damaged { 0%,100%{filter:none;opacity:1} 30%{filter:drop-shadow(0 0 9px rgba(255,70,45,.95));opacity:.65} }
@keyframes seam-defeated { 0%{transform:scaleY(1) rotate(0);opacity:1} 100%{transform:scaleY(.22) rotate(7deg);opacity:.3} }
@keyframes seam-float { 0%{transform:translate(-50%,4px);opacity:0} 18%{opacity:1} 100%{transform:translate(-50%,-38px);opacity:0} }
@keyframes seam-hitring { 0%{transform:translate(-50%,-50%) scale(.5);opacity:.9} 100%{transform:translate(-50%,-50%) scale(1.7);opacity:0} }
@keyframes seam-ready { 0%,100%{box-shadow:0 0 0 0 rgba(232,160,64,0)} 50%{box-shadow:0 0 14px 3px rgba(232,160,64,.7)} }
@keyframes seam-targetpulse { 0%,100%{box-shadow:0 0 0 0 rgba(126,211,33,0)} 50%{box-shadow:0 0 14px 3px rgba(126,211,33,.75)} }
@keyframes seam-aoepulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,122,58,0)} 50%{box-shadow:0 0 16px 4px rgba(255,122,58,.85)} }
@keyframes seam-iconpop { 0%{transform:translate(-50%,-50%) scale(.3);opacity:0} 28%{opacity:1} 100%{transform:translate(-50%,-115%) scale(1.7);opacity:0} }
@keyframes seam-castglow { 0%{opacity:0} 35%{opacity:.85} 100%{opacity:0} }
/* a thrown bolt streaks ACROSS the arena into the target (direction by side) */
@keyframes seam-bolt-L { 0%{opacity:0;transform:translate(-50%,-50%) translateX(-104px) scale(.45)} 18%{opacity:1} 78%{opacity:1;transform:translate(-50%,-50%) translateX(0) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) translateX(0) scale(1.25)} }
@keyframes seam-bolt-R { 0%{opacity:0;transform:translate(-50%,-50%) translateX(104px) scale(.45)} 18%{opacity:1} 78%{opacity:1;transform:translate(-50%,-50%) translateX(0) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) translateX(0) scale(1.25)} }
/* a melee slash swipes across the target */
@keyframes seam-slash { 0%{opacity:0;transform:translate(-50%,-50%) rotate(-28deg) scaleX(.15)} 26%{opacity:1} 60%{opacity:1;transform:translate(-50%,-50%) rotate(-28deg) scaleX(1)} 100%{opacity:0;transform:translate(-50%,-50%) rotate(-28deg) scaleX(1.2)} }
/* fire embers rise off a Reactor hit / a Burn tick */
@keyframes seam-ember { 0%{opacity:0;transform:translate(-50%,-50%) translateY(8px) scale(.6)} 22%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) translateY(-36px) scale(.15)} }
/* persistent status overlays — these read the creature's CONDITION at a glance, no numbers needed */
@keyframes seam-shield { 0%,100%{opacity:.42;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.8;transform:translate(-50%,-50%) scale(1.04)} }
@keyframes seam-shieldspin { 0%{transform:translate(-50%,-50%) rotate(0)} 100%{transform:translate(-50%,-50%) rotate(360deg)} }
@keyframes seam-hurtshake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 60%{transform:translateX(2px)} }
@keyframes seam-hurtring { 0%,100%{opacity:.18;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.6;transform:translate(-50%,-50%) scale(1.14)} }
@keyframes seam-alert { 0%,100%{transform:translate(-50%,0) scale(1)} 50%{transform:translate(-50%,-4px) scale(1.18)} }
@keyframes seam-rise { 0%{opacity:0;transform:translateY(2px) scale(.5)} 25%{opacity:1} 100%{opacity:0;transform:translateY(-30px) scale(.2)} }
@keyframes seam-aura { 0%,100%{opacity:.35} 50%{opacity:.8} }
@keyframes seam-point { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-7px)} }
@keyframes seam-hintglow { 0%,100%{box-shadow:0 0 0 0 rgba(232,160,64,.15)} 50%{box-shadow:0 0 16px 3px rgba(232,160,64,.85)} }
/* bend proc callout — pill that floats up off the actor, distinct from damage numbers */
@keyframes seam-procfloat { 0%{transform:translate(-50%,6px) scale(.75);opacity:0} 20%{opacity:1;transform:translate(-50%,-4px) scale(1)} 100%{transform:translate(-50%,-52px) scale(.9);opacity:0} }
`;

// Horizontal focal point (0–1) to crop ONE clear pose out of each wide turnaround
// sheet. Default leftmost works for most; override where a later pose reads better.
const FOCAL_X = {
  spark: 0.04, flicker: 0.04, cinder: 0.04,
  vault: 0.02, bastion: 0.02, bulwark: 0.02,
  link: 0.04, nexus: 0.04, conduit: 0.04,
  striker: 0.04, fang: 0.04, claw: 0.04,
};

// One creature, cropped big out of its concept-art strip and framed in its type
// color with a shape badge — so you read it by color + silhouette, not by name.
// Falls back to the big glyph if the PNG is missing.
function Sprite({ spriteId, color, glyph = '✦', anim = 'idle', facing = 1, size = 64 }) {
  const animCss = {
    idle: 'seam-idle 1.7s ease-in-out infinite',
    attack: 'seam-attack .5s ease-out',
    damaged: 'seam-damaged .45s ease-in-out',
    defeated: 'seam-defeated .7s ease-out forwards',
  }[anim] || 'seam-idle 1.7s ease-in-out infinite';
  const focal = (FOCAL_X[spriteId] ?? 0.04) * 100;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 14, overflow: 'hidden', position: 'relative', background: `radial-gradient(circle at 50% 38%, ${color}33 0%, #0b0b14 72%)`, border: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}44, inset 0 0 16px ${color}22` }}>
      {/* fallback glyph sits behind the art */}
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, opacity: 0.5 }}>{glyph}</span>
      <div style={{ position: 'absolute', inset: 0, transform: `scaleX(${facing})` }}>
        <div style={{ width: '100%', height: '100%', animation: animCss }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `url(/sprites/${spriteId}.png)`,
            backgroundSize: 'auto 122%',
            backgroundPosition: `${focal}% 38%`,
            backgroundRepeat: 'no-repeat',
          }} />
        </div>
      </div>
      {/* shape badge — the type's color + glyph, bottom-right */}
      <span style={{ position: 'absolute', right: 2, bottom: 1, fontSize: size * 0.26, filter: 'drop-shadow(0 1px 2px #000)' }}>{glyph}</span>
    </div>
  );
}

// What a move DOES, for instant color-reading (independent of which creature owns it).
const SKILL_EFFECT = {
  chargeUp: 'attack', overload: 'attack', backdraft: 'attack',
  jab: 'attack', flurry: 'attack', blitz: 'attack',
  mark: 'attack', execute: 'attack', ambush: 'attack',
  brace: 'shield', aegis: 'shield', bodyguard: 'shield',
  mend: 'heal', bloom: 'heal', ward: 'heal',
  prime: 'boost', overdrive: 'boost', resonate: 'boost',
};
const EFFECT = {
  attack: { color: '#ff8a4a', bg: '#2a160d', icon: '⚔️', label: 'Attack' },
  shield: { color: '#7fd6ff', bg: '#0d1f2a', icon: '🛡️', label: 'Shield' },
  heal: { color: '#7ed321', bg: '#0f2010', icon: '💚', label: 'Heal' },
  boost: { color: '#b06bff', bg: '#1c1230', icon: '⬆️', label: 'Boost' },
};
const effectOf = (sid) => EFFECT[SKILL_EFFECT[sid]] || EFFECT.attack;

// Each move gets its OWN impact read so "the move matches the look" — a signature
// icon, and how its hit travels: fire-types THROW a bolt across the arena,
// physical strikers/assassins SWIPE a slash on the target. Color still comes from
// the effect bucket (attack=orange, etc.) so the learned color language holds.
const MOVE_ICON = {
  chargeUp: '🔥', overload: '🔥', backdraft: '💥',
  jab: '👊', flurry: '⚔️', blitz: '⚡',
  mark: '🎯', execute: '🗡️', ambush: '🗡️',
  brace: '🛡️', aegis: '🛡️', bodyguard: '🛡️',
  mend: '💚', bloom: '🌸', ward: '🌿',
  prime: '⬆️', overdrive: '🚀', resonate: '🎶',
};
// 'bolt' = travels across the arena; 'slash' = melee swipe on the target. Support
// moves have no streak (they resolve on the ally with the cast glow + ring).
const MOVE_STREAK = {
  chargeUp: 'bolt', overload: 'bolt', backdraft: 'bolt',
  jab: 'slash', flurry: 'slash', blitz: 'slash',
  mark: 'slash', execute: 'slash', ambush: 'slash',
};
// Reactor (fire) moves throw embers off the hit — and so does a Burn DOT tick.
const FIRE_MOVES = new Set(['chargeUp', 'overload', 'backdraft']);
const EMBER_COLORS = ['#ffd24a', '#ff8a3a', '#ff5a2a', '#ffb347']; // warm flame palette

// Who a move reaches — derived from the engine's targetMode — so you can read at a
// glance whether it's single-target or hits everyone (AOE).
const TARGET_TAG = {
  enemy: { label: 'Single', icon: '🎯', aoe: false },
  ally: { label: 'One ally', icon: '🎯', aoe: false },
  allEnemies: { label: 'All enemies', icon: '💥', aoe: true },
  allAllies: { label: 'Whole team', icon: '💥', aoe: true },
};

// What a move DOES, as a strip of icons instead of a sentence — so a kid can read
// the kit at a glance. ⚡▲ builds charge, ⚡▼ spends it; then the effect glyphs.
// (Presentation only; the engine is the source of truth — these just mirror it.)
const MOVE_FX = {
  chargeUp: ['⚡▲2', '🔥', '👊'],            overload: ['⚡▼', '💥 big', '🔥×2'],     backdraft: ['⚡▼', '💥 all', '🔥'],
  brace: ['⚡▲', '🛡 self', '👊'],          aegis: ['⚡▼', '🛡 team'],               bodyguard: ['⚡▼', '🛡 ally'],
  mend: ['⚡▲', '💚 heal', '👊'],           bloom: ['⚡▼', '💚 big'],                ward: ['⚡▼', '🌿 team'],
  prime: ['⚡▲', '✦ ally', '👊'],           overdrive: ['⚡▼', '✦ carry'],           resonate: ['⚡▼', '✦ team'],
  jab: ['⚡▲', '👊👊'],                      flurry: ['⚡▼', '👊 lots'],               blitz: ['⚡▼', '💥 fast'],
  mark: ['⚡▲', '🎯 hurt'],                 execute: ['⚡▼', '💀 low HP'],            ambush: ['⚡▼', '🗡 weakest'],
};

// Charge as fill-up dots under a unit — no number to read.
function ChargeDots({ value, max }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < value ? CHG : '#2c2c3a', boxShadow: i < value ? `0 0 4px ${CHG}` : 'none', transition: 'background .2s' }} />
      ))}
    </span>
  );
}

// A combatant on the arena stage: big animated sprite, HP/charge, status pips, and
// floating damage/heal numbers (popups) that pop on each hit.
function StageUnit({ u, anim, isActor, isTarget, selectable, onPick, onSelect, popups, big, burst, cast, fxN, boss, targetLabel, targetMark, aoe, move, hitN, fire }) {
  const dead = !u.alive;
  const hurt = u.alive && u.maxHp > 0 && u.hp / u.maxHp <= 0.3; // badly wounded — show distress so the player KNOWS to heal/guard it
  const ti = TYPE_INFO[u.type] || { accent: DIM, glyph: '✦' };
  const size = boss ? (big ? 122 : 108) : big ? 92 : 78; // the boss looms larger
  const burstEf = burst ? EFFECT[burst] : null; // colored impact on whoever was affected
  const castEf = cast ? EFFECT[cast] : null; // the actor briefly glows the move's color
  const impactIcon = (move && MOVE_ICON[move]) || (burstEf && burstEf.icon); // signature per-move icon
  const streak = burst === 'attack' ? MOVE_STREAK[move] : null; // bolt travels in, slash swipes
  const fromLeft = u.side === 'B'; // your squad (side A) is on the left, so attacks on enemies fly in from the left
  const trailX = fromLeft ? -1 : 1;
  const STAGGER = 0.13; // seconds between staggered hits of a multi-hit move (Jab/Flurry barrage)
  const nStreaks = streak ? Math.min(hitN || 1, 5) : 0; // a Flurry lands as several quick swipes, not one
  const ringDelay = `${0.18 + Math.max(0, nStreaks - 1) * STAGGER}s`; // ring blooms after the last hit lands
  const clickable = isTarget || selectable;
  // The unit you're DRIVING (isActor) flashes; other ready units get a calm static
  // outline. The eye should land on who's acting, not on everyone who could act.
  const ring = isTarget ? (aoe ? '#ff7a3a' : WIN) : isActor ? ACCENT : selectable ? '#6e5526' : 'transparent';
  const pulse = isActor ? 'seam-ready 1.2s ease-in-out infinite' : isTarget ? (aoe ? 'seam-aoepulse 1s ease-in-out infinite' : 'seam-targetpulse 1.2s ease-in-out infinite') : 'none';
  const label = isActor ? '▶ ACTING' : selectable ? '▷ TAP TO ACT' : isTarget ? (targetLabel || '◀ TAP TO HIT') : null;
  return (
    <div
      onClick={clickable ? () => (isTarget ? onPick(u.uid) : onSelect(u.uid)) : undefined}
      style={{
        position: 'relative', cursor: clickable ? 'pointer' : 'default', textAlign: 'center',
        padding: '6px 6px 8px', borderRadius: 12, width: size + 26,
        border: `2px solid ${boss && !isTarget ? LOSS : ring}`,
        background: isTarget ? '#10261a66' : boss ? '#1a0d0f66' : isActor ? '#1a140866' : selectable ? '#15120a55' : 'transparent',
        boxShadow: boss ? `0 0 20px ${LOSS}55` : 'none',
        animation: pulse, opacity: dead ? 0.55 : 1, transition: 'opacity .3s',
      }}
    >
      {boss && <div style={{ position: 'absolute', top: -9, right: 6, fontSize: T.micro, fontWeight: 900, letterSpacing: 0.5, color: '#ffb38a', background: '#2a0d0d', border: `1px solid ${LOSS}`, padding: '0 5px', borderRadius: 4, zIndex: 8 }}>💀 BOSS</div>}
      {label && <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', fontSize: T.micro, fontWeight: 800, letterSpacing: 0.5, color: isTarget ? (aoe ? '#ff7a3a' : WIN) : ACCENT, background: '#0b0b14', padding: '0 5px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 7 }}>{label}</div>}
      {/* target marker — a kid can read 🎯 "pick one" vs 💥 "hits ALL of them" without words */}
      {isTarget && targetMark && <div style={{ position: 'absolute', top: size * 0.16, left: '50%', fontSize: size * 0.42, animation: 'seam-alert .8s ease-in-out infinite', pointerEvents: 'none', zIndex: 7, filter: 'drop-shadow(0 1px 3px #000)' }}>{targetMark}</div>}
      {/* floating damage/heal numbers */}
      <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 0, pointerEvents: 'none', zIndex: 6 }}>
        {popups.map((p) => p.isProc
          ? <div key={p.id} style={{ position: 'absolute', left: '50%', fontSize: T.micro, fontWeight: 900, color: '#fff', background: p.color + 'dd', border: `1px solid ${p.color}`, borderRadius: 10, padding: '2px 7px', textShadow: '0 1px 3px #000', animation: 'seam-procfloat 1.3s ease-out forwards', whiteSpace: 'nowrap' }}>{p.text}</div>
          : <div key={p.id} style={{ position: 'absolute', left: '50%', fontSize: T.label, fontWeight: 900, color: p.color, textShadow: '0 1px 4px #000, 0 0 2px #000', animation: 'seam-float .95s ease-out forwards', whiteSpace: 'nowrap' }}>{p.text}</div>
        )}
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {castEf && <div key={`c${fxN}`} style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)', width: size * 1.15, height: size * 1.15, borderRadius: '50%', background: `radial-gradient(circle, ${castEf.color}cc 0%, transparent 70%)`, animation: 'seam-castglow .55s ease-out forwards', pointerEvents: 'none', zIndex: 3 }} />}
        {streak === 'bolt' && Array.from({ length: nStreaks }).map((_, i) => (
          <div key={`b${fxN}-${i}`} style={{ position: 'absolute', top: '46%', left: '50%', width: size * 0.36, height: size * 0.36, borderRadius: '50%', background: `radial-gradient(circle, #fff 0%, ${burstEf.color} 45%, transparent 74%)`, boxShadow: `0 0 16px 4px ${burstEf.color}, ${trailX * -20}px 0 22px ${burstEf.color}aa`, animation: `${fromLeft ? 'seam-bolt-L' : 'seam-bolt-R'} .4s ease-in forwards`, animationDelay: `${i * STAGGER}s`, pointerEvents: 'none', zIndex: 4 }} />
        ))}
        {streak === 'slash' && Array.from({ length: nStreaks }).map((_, i) => (
          <div key={`s${fxN}-${i}`} style={{ position: 'absolute', top: `${44 + (i % 2 ? 7 : -3)}%`, left: '50%', width: size * 0.98, height: Math.max(4, size * 0.07), borderRadius: 4, background: `linear-gradient(90deg, transparent, #fff, ${burstEf.color}, transparent)`, boxShadow: `0 0 14px 3px ${burstEf.color}`, animation: 'seam-slash .32s ease-out forwards', animationDelay: `${i * STAGGER}s`, pointerEvents: 'none', zIndex: 4 }} />
        ))}
        {burstEf && <div key={`r${fxN}`} style={{ position: 'absolute', top: '46%', left: '50%', width: size * 0.85, height: size * 0.85, borderRadius: '50%', border: `3px solid ${burstEf.color}`, boxShadow: `0 0 12px ${burstEf.color}`, animation: 'seam-hitring .5s ease-out forwards', animationDelay: ringDelay, pointerEvents: 'none', zIndex: 4 }} />}
        {burstEf && <div key={`i${fxN}`} style={{ position: 'absolute', top: '42%', left: '50%', fontSize: size * 0.46, animation: 'seam-iconpop .6s ease-out forwards', animationDelay: ringDelay, pointerEvents: 'none', zIndex: 5, filter: 'drop-shadow(0 1px 3px #000)' }}>{impactIcon}</div>}
        {/* fire embers — warm flecks that flicker up off a Reactor hit or a Burn tick */}
        {fire && burst === 'attack' && Array.from({ length: 6 }).map((_, i) => {
          const c = EMBER_COLORS[i % EMBER_COLORS.length];
          const dx = ((i * 37) % 50) - 25; // scattered horizontal spread, deterministic
          return <div key={`e${fxN}-${i}`} style={{ position: 'absolute', top: '50%', left: `calc(50% + ${dx}px)`, width: size * 0.13, height: size * 0.13, borderRadius: '50%', background: `radial-gradient(circle, #fff 0%, ${c} 50%, transparent 75%)`, boxShadow: `0 0 7px 2px ${c}`, animation: 'seam-ember .7s ease-out forwards', animationDelay: `${i * 0.06}s`, pointerEvents: 'none', zIndex: 5 }} />;
        })}
        {/* ── persistent CONDITION overlays — show how the creature FEELS without numbers ── */}
        {/* hurt: low on HP → a red distress halo + a bobbing ❗ that says "I need help" */}
        {hurt && <div style={{ position: 'absolute', top: '48%', left: '50%', width: size * 0.95, height: size * 0.95, borderRadius: '50%', background: `radial-gradient(circle, transparent 52%, ${LOSS}66 100%)`, animation: 'seam-hurtring 1s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />}
        {hurt && <div style={{ position: 'absolute', top: -size * 0.16, left: '50%', fontSize: size * 0.3, animation: 'seam-alert .8s ease-in-out infinite', pointerEvents: 'none', zIndex: 6, filter: 'drop-shadow(0 1px 2px #000)' }}>❗</div>}
        {/* burning: flames keep licking up the WHOLE time it burns, not just on the hit */}
        {u.burn > 0 && !dead && Array.from({ length: 4 }).map((_, i) => {
          const c = EMBER_COLORS[i % EMBER_COLORS.length];
          const dx = ((i * 29) % 40) - 20;
          return <div key={`bn${i}`} style={{ position: 'absolute', bottom: size * 0.12, left: `calc(50% + ${dx}px)`, width: size * 0.12, height: size * 0.12, borderRadius: '50%', background: `radial-gradient(circle, #fff 0%, ${c} 55%, transparent 78%)`, boxShadow: `0 0 6px 2px ${c}`, animation: `seam-rise 1.1s ease-out ${i * 0.28}s infinite`, pointerEvents: 'none', zIndex: 5 }} />;
        })}
        {/* amped: a rising violet power aura + sparks climbing — "charged up to hit big" */}
        {u.amp > 0 && !dead && <div style={{ position: 'absolute', bottom: size * 0.02, left: '50%', transform: 'translateX(-50%)', width: size * 0.8, height: size * 0.5, borderRadius: '50%', background: `radial-gradient(ellipse at bottom, ${AMP}88 0%, transparent 70%)`, animation: 'seam-aura 1.3s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />}
        {u.amp > 0 && !dead && Array.from({ length: 3 }).map((_, i) => (
          <div key={`am${i}`} style={{ position: 'absolute', bottom: size * 0.15, left: `calc(50% + ${(i * 31 % 36) - 18}px)`, fontSize: size * 0.16, animation: `seam-rise 1.2s ease-out ${i * 0.4}s infinite`, pointerEvents: 'none', zIndex: 5, color: AMP }}>✦</div>
        ))}
        {/* regen: soft green motes drifting up — "mending" */}
        {u.regen > 0 && !dead && Array.from({ length: 3 }).map((_, i) => (
          <div key={`rg${i}`} style={{ position: 'absolute', bottom: size * 0.18, left: `calc(50% + ${(i * 23 % 34) - 17}px)`, fontSize: size * 0.16, animation: `seam-rise 1.4s ease-out ${i * 0.45}s infinite`, pointerEvents: 'none', zIndex: 5, color: WIN }}>🌿</div>
        ))}
        <div style={{ animation: hurt ? 'seam-hurtshake .5s ease-in-out infinite' : 'none' }}>
          <Sprite spriteId={u.spriteId} color={ti.accent} glyph={ti.glyph} anim={dead ? 'defeated' : (anim || 'idle')} facing={u.side === 'A' ? 1 : -1} size={size} />
        </div>
        {/* shield: a glowing blue dome wrapping the body — clearly "protected", over everything */}
        {u.block > 0 && !dead && <div style={{ position: 'absolute', top: '47%', left: '50%', width: size * 1.18, height: size * 1.18, borderRadius: '50%', border: `2px solid #bfeaff`, background: `radial-gradient(circle, transparent 55%, #7fd6ff33 80%, #7fd6ff66 100%)`, boxShadow: '0 0 14px #7fd6ffaa, inset 0 0 18px #7fd6ff55', animation: 'seam-shield 1.6s ease-in-out infinite', pointerEvents: 'none', zIndex: 6 }} />}
      </div>
      <div style={{ fontSize: T.small, fontWeight: 800, color: isActor ? ACCENT : '#eee', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ti.glyph} {u.name}
      </div>
      <div style={{ marginTop: 3 }}><Bar value={u.hp} max={u.maxHp} color={dead ? LOSS : u.side === 'A' ? '#3ec9a0' : '#e07a7a'} h={7} /></div>
      <div style={{ fontSize: T.micro, color: dead ? LOSS : '#aab', marginTop: 2, fontWeight: 700 }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}><ChargeDots value={u.charge} max={u.maxCharge} /></div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', minHeight: 15 }}>
        {u.burn > 0 && <span style={{ fontSize: T.micro, color: BURN, fontWeight: 700 }}>🔥{u.burn}</span>}
        {u.block > 0 && <span style={{ fontSize: T.micro, color: '#7fd6ff', fontWeight: 700 }}>🛡{u.block}</span>}
        {u.regen > 0 && <span style={{ fontSize: T.micro, color: WIN, fontWeight: 700 }}>🌿{u.regen}</span>}
        {u.amp > 0 && <span style={{ fontSize: T.micro, color: AMP, fontWeight: 700 }}>✦{u.amp}</span>}
      </div>
    </div>
  );
}

// A PLAY-mode wrapper around the AI brain that waits out the shared "action hold"
// before each enemy moves — so the previous hit finishes animating and you can see
// what the enemy does and who it targets. Pure presentation: it only awaits the
// hold, then defers to the real createAIDriver(). WATCH and the goldens use the raw,
// instant driver, so determinism + byte-identical transcripts are untouched.
function pacedAIDriver(holdRef) {
  const ai = createAIDriver();
  return {
    async chooseNextActor(pool, state) { await holdRef.current; return ai.chooseNextActor(pool, state); },
    decide: (actor, state) => ai.decide(actor, state),
  };
}

let POP_ID = 0; // unique id for floating-number popups
let FX_NONCE = 0; // bumped per action so the burst/cast animations remount + replay

// Floating numbers to spawn for one event (damage red, heal green, etc.).
function popupsForEvent(event) {
  const out = [];
  if (event.type === 'turn') {
    (event.hits || []).forEach((h) => { if (h.dmg > 0 || h.killed) out.push({ uid: h.uid, text: h.killed ? `−${h.dmg} KO` : `−${h.dmg}`, color: h.killed ? '#ff3b30' : '#ff8a6a' }); });
    (event.heals || []).forEach((h) => { if (h.healed > 0) out.push({ uid: h.uid, text: `+${h.healed}`, color: WIN }); });
    (event.amps || []).forEach((a) => out.push({ uid: a.uid, text: `✦${a.amp}`, color: AMP }));
  } else if (event.type === 'burn') out.push({ uid: event.target.uid, text: `−${event.dmg}🔥`, color: BURN });
  else if (event.type === 'regen') out.push({ uid: event.target.uid, text: `+${event.healed}🌿`, color: WIN });
  return out;
}

// ── useFight — one battle's UI state + the human-driver promise machinery. ──
// The engine asks for an actor, then a decision. We MERGE both into one free
// "select" phase: tap any ready unit to PREVIEW its moves (switch as often as you
// like, read every kit) — nothing commits until you pick a move (and target). Only
// then do we resolve the actor and stash the decision for the engine's decide().
function useFight(opts = {}) {
  const autoSkip = opts.autoSkip !== false; // default ON; LEARN turns it off to teach the pick
  const [snap, setSnap] = useState(null);
  const [feed, setFeed] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | select | select-target | done
  const [pool, setPool] = useState([]); // uids that can still act this block
  const [previewUid, setPreviewUid] = useState(null); // unit whose moves are shown
  const [pendingSkill, setPendingSkill] = useState(null); // skill awaiting an enemy target
  const [fx, setFx] = useState({ actor: null, cast: null, bursts: {}, n: 0 });
  const [popups, setPopups] = useState([]);

  const stateRef = useRef(null);
  const poolRef = useRef([]); // current block's unit objects
  const battleRef = useRef(null); // engine state (for legalSkills/enemiesOf)
  const previewRef = useRef(null); // current preview uid (for handlers)
  const commitRef = useRef(null); // resolve(actor) for the active requestActor
  const decisionRef = useRef(null); // stashed decision for the next decide()
  const feedRef = useRef([]);
  const feedBoxRef = useRef(null);
  const onDoneRef = useRef(null);
  const holdRef = useRef(Promise.resolve()); // the current "action hold"; transitions await it

  useEffect(() => { if (feedBoxRef.current) feedBoxRef.current.scrollTop = feedBoxRef.current.scrollHeight; }, [feed]);

  // Open a fresh action hold: the next actor-request (either side) awaits this, so
  // the hit animates and input stays locked until the beat passes.
  function startHold(ms) { holdRef.current = new Promise((r) => setTimeout(r, ms)); }

  // Look up the actor's mods from the live engine state so we can detect which
  // bend (if any) fired on this turn without touching the engine event format.
  function detectProcs(event) {
    if (event.type !== 'turn') return [];
    const st = stateRef.current;
    const actorUnit = st ? (st.units.A.find((u) => u.uid === event.actor.uid) || st.units.B.find((u) => u.uid === event.actor.uid)) : null;
    const mods = actorUnit?.mods ?? {};
    const sid = event.skill.id;
    const hitCounts = {};
    (event.hits || []).forEach((h) => { if (h.dmg > 0 || h.killed) hitCounts[h.uid] = (hitCounts[h.uid] || 0) + 1; });
    const anyHit = Object.keys(hitCounts).length > 0;
    const procs = [];
    if (mods.extraHits > 0 && (sid === 'jab' || sid === 'flurry') && anyHit)
      procs.push({ text: '⚔ TWIN STRIKE', color: '#ffd166' });
    if (mods.overloadBurn > 0 && sid === 'overload')
      procs.push({ text: '🔥 EMBER TRAIL', color: BURN });
    if (mods.executeWindow > 0 && sid === 'execute' && anyHit)
      procs.push({ text: '🗡 MARK', color: '#ff7a9c' });
    if (mods.braceTeam > 0 && sid === 'brace')
      procs.push({ text: '🛡 AEGIS REFLEX', color: '#7fd6ff' });
    if (mods.mendRegen > 0 && sid === 'mend')
      procs.push({ text: '🌿 LIFEBLOOM', color: WIN });
    if (mods.primeTeam > 0 && sid === 'prime')
      procs.push({ text: '✦ POWER CHORD', color: AMP });
    return procs;
  }

  function emit(event) {
    feedRef.current = [...feedRef.current, feedLine(event)];
    setFeed(feedRef.current);
    // Theme a colored impact burst onto each affected unit by WHAT happened to it,
    // and glow the actor in the move's own color. Then hold so it all plays out.
    if (event.type === 'turn') {
      const bursts = {};
      const hitCounts = {}; // a multi-hit move (Jab/Flurry) lands several hits on one uid — count them so the streak staggers into a real barrage
      (event.hits || []).forEach((h) => { if (h.dmg > 0 || h.killed) { bursts[h.uid] = 'attack'; hitCounts[h.uid] = (hitCounts[h.uid] || 0) + 1; } });
      (event.shields || []).forEach((s) => { if (s.block > 0 && s.uid) bursts[s.uid] = 'shield'; });
      (event.heals || []).forEach((h) => { if (h.healed > 0) bursts[h.uid] = 'heal'; });
      (event.amps || []).forEach((a) => { if (a.uid) bursts[a.uid] = 'boost'; });
      setFx({ actor: event.actor.uid, cast: SKILL_EFFECT[event.skill.id] || 'attack', bursts, move: event.skill.id, hitCounts, fire: FIRE_MOVES.has(event.skill.id), n: ++FX_NONCE });
      startHold(HOLD_MS[event.skill.kind] ?? 1300); // big payoffs land heavier than chip builders
      // ── Sound: cast type sets the signature, then secondary effects layer on top ──
      const kind = event.skill.kind;
      if (kind === 'builder') sfx.chargeUp();
      else if (kind === 'payoff') sfx.payoff();
      else if (kind === 'wildcard') sfx.wildcard();
      if ((event.shields || []).some((s) => s.block > 0)) sfx.shieldAbsorb();
      if ((event.heals  || []).some((h) => h.healed > 0)) sfx.healLand();
      if ((event.amps   || []).length)                     sfx.ampStack();
    } else if (event.type === 'burn') {
      setFx({ actor: null, cast: null, bursts: { [event.target.uid]: 'attack' }, fire: true, n: ++FX_NONCE });
      startHold(TICK_HOLD_MS);
      sfx.burnTick();
    } else if (event.type === 'regen') {
      setFx({ actor: null, cast: null, bursts: { [event.target.uid]: 'heal' }, n: ++FX_NONCE });
      startHold(TICK_HOLD_MS);
      sfx.regenTick();
    }
    const adds = [
      ...popupsForEvent(event).map((a) => ({ ...a, id: ++POP_ID })),
      ...detectProcs(event).map((a) => ({ ...a, uid: event.actor.uid, id: ++POP_ID, isProc: true })),
    ];
    if (adds.length) {
      setPopups((p) => [...p, ...adds].slice(-50));
      adds.forEach((a) => setTimeout(() => setPopups((p) => p.filter((x) => x.id !== a.id)), a.isProc ? 1400 : 1100));
    }
    if (stateRef.current) setSnap(snapshot(stateRef.current));
  }
  async function requestActor(livingPool, state) {
    await holdRef.current; // let the prior action finish animating before opening input
    return new Promise((resolve) => {
      poolRef.current = livingPool; battleRef.current = state;
      const first = livingPool[0].uid;
      previewRef.current = first; setPreviewUid(first);
      setPool(livingPool.map((u) => u.uid));
      setPendingSkill(null);
      setPhase('select');
      commitRef.current = (unit, decision) => {
        decisionRef.current = decision;
        setPhase('idle'); setPool([]); setPreviewUid(null); previewRef.current = null; setPendingSkill(null);
        resolve(unit);
      };
      if (autoSkip) maybeAutoSkill(first); // one usable move → skip straight to targeting
    });
  }
  function requestDecision() { return Promise.resolve(decisionRef.current); }

  // If the previewed unit has exactly ONE usable move, skip the redundant "pick a
  // move" step: jump to target-pick (enemy moves) or just commit (auto-targeting
  // moves). Switching is preserved — you can still tap another ready unit to read it.
  function maybeAutoSkill(uid) {
    const unit = poolRef.current.find((u) => u.uid === uid);
    if (!unit || !battleRef.current || !commitRef.current) return;
    const legal = legalSkills(unit, battleRef.current);
    if (legal.length !== 1) return;
    // One usable move → skip the pick, but still show the target-confirm beat.
    setPendingSkill(legal[0].id); setPhase('select-target');
  }

  function previewUnit(uid) {
    previewRef.current = uid; setPreviewUid(uid); setPendingSkill(null); setPhase('select');
    if (autoSkip) maybeAutoSkill(uid);
  }
  // Every move now routes through one confirm beat — single, AOE, and ally alike.
  function chooseSkill(skillId) { setPendingSkill(skillId); setPhase('select-target'); }
  // Resolve targets from the move's scope: a single tap on the chosen side, or the
  // whole side for AOE / whole-team moves (tap any to confirm).
  function chooseTarget(uid) {
    const unit = poolRef.current.find((u) => u.uid === previewRef.current);
    const mode = getSkill(pendingSkill).targetMode;
    let targetIds;
    if (mode === 'allEnemies') targetIds = enemiesOf(battleRef.current, unit).map((u) => u.uid);
    else if (mode === 'allAllies') targetIds = alliesOf(battleRef.current, unit).map((u) => u.uid);
    else targetIds = [uid]; // single enemy or single ally
    commitRef.current(unit, { skillId: pendingSkill, targetIds });
  }
  function cancelTarget() { setPendingSkill(null); setPhase('select'); } // back to move-pick
  // What the center move-panel needs for the previewed unit.
  function previewMoves() {
    const unit = poolRef.current.find((u) => u.uid === previewUid);
    if (!unit || !battleRef.current) return null;
    return {
      unit,
      skillIds: unit.skillIds,
      legalIds: legalSkills(unit, battleRef.current).map((s) => s.id),
      enemyUids: enemiesOf(battleRef.current, unit).map((u) => u.uid),
      allyUids: alliesOf(battleRef.current, unit).map((u) => u.uid),
    };
  }

  function begin(aDefs, bDefs, seed, mode, onComplete) {
    feedRef.current = []; setFeed([]); setPool([]); setPreviewUid(null); previewRef.current = null; setPendingSkill(null); setPopups([]); setFx({ actor: null, cast: null, bursts: {}, n: 0 });
    holdRef.current = Promise.resolve();
    onDoneRef.current = onComplete || null;
    const state = createBattleState(aDefs, bDefs, seed);
    stateRef.current = state;
    setSnap(snapshot(state));
    setPhase('idle');
    const drivers = mode === 'watch'
      ? { A: createAIDriver(), B: createAIDriver() }
      : { A: createHumanDriver({ requestActor, requestDecision }), B: pacedAIDriver(holdRef) };
    runBattle(state, drivers, emit).then((res) => { setPhase('done'); if (onDoneRef.current) onDoneRef.current(res, state); });
  }
  function reset() { setSnap(null); setFeed([]); feedRef.current = []; setPhase('idle'); setPool([]); setPreviewUid(null); setPendingSkill(null); setFx({ actor: null, cast: null, bursts: {}, n: 0 }); setPopups([]); holdRef.current = Promise.resolve(); }

  return { snap, feed, phase, pool, previewUid, pendingSkill, fx, popups, feedBoxRef, previewUnit, chooseSkill, chooseTarget, cancelTarget, previewMoves, begin, reset };
}

// The move panel that lives in the center "VS" lane — between your squad and the
// enemy — for whichever unit you're previewing. Tapping a move commits (or asks for
// a target). Floating it here keeps your eyes in the arena, not in a panel below.
function CenterMoves({ moves, pendingSkill, phase, onSkill, onBack, tgtAllies, tgtAll, hintSkill }) {
  if (!moves) return <span style={{ color: DIM, fontWeight: 900, fontSize: T.head, opacity: 0.5 }}>VS</span>;
  const { unit, skillIds, legalIds } = moves;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: T.small, color: ACCENT, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>{unit.name} — pick a move</div>
      {skillIds.map((sid) => {
        const sk = getSkill(sid);
        const usable = legalIds.includes(sid);
        const chosen = pendingSkill === sid;
        const ef = effectOf(sid);
        const tt = TARGET_TAG[sk.targetMode];
        const hinted = hintSkill === sid && usable && !chosen; // LEARN points a finger at the move to tap
        return (
          <button key={sid} onClick={usable ? () => onSkill(sid) : undefined} disabled={!usable} title={sk.blurb}
            style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'left', marginBottom: 6, background: usable ? ef.bg : '#14141c', border: `2px solid ${chosen ? '#fff' : hinted ? ACCENT : usable ? ef.color : '#1d1d28'}`, color: usable ? '#eee' : '#555', borderRadius: 9, padding: '8px 10px', cursor: usable ? 'pointer' : 'not-allowed', opacity: usable ? 1 : 0.55, animation: hinted ? 'seam-hintglow 1s ease-in-out infinite' : 'none' }}>
            {hinted && <span style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', fontSize: T.head, animation: 'seam-point .7s ease-in-out infinite', pointerEvents: 'none', zIndex: 8, filter: 'drop-shadow(0 1px 3px #000)' }}>👈</span>}
            <span style={{ fontSize: T.label, lineHeight: 1, marginTop: 1, filter: usable ? 'none' : 'grayscale(1)' }}>{ef.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: T.small, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{sk.name}</span>
                <span style={{ fontSize: T.micro, color: usable ? ef.color : '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>· {ef.label}</span>
                {tt && <span style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 0.3, padding: '0 6px', borderRadius: 10, whiteSpace: 'nowrap', border: `1px solid ${tt.aoe ? '#ff7a4a' : '#55556a'}`, background: tt.aoe ? '#3a1d10' : 'transparent', color: !usable ? '#555' : tt.aoe ? '#ffb38a' : '#9a9aaa' }}>{tt.icon} {tt.aoe ? 'AOE' : 'SINGLE'}</span>}
              </div>
              {/* effect strip — icons instead of a sentence, so the kit reads at a glance */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {(MOVE_FX[sid] || [sk.blurb]).map((chip, i) => (
                  <span key={i} style={{ fontSize: T.micro, fontWeight: 800, color: usable ? '#d8d8e2' : '#555', background: usable ? '#00000038' : 'transparent', border: `1px solid ${usable ? ef.color + '55' : '#2a2a36'}`, borderRadius: 7, padding: '1px 6px', whiteSpace: 'nowrap' }}>{chip}</span>
                ))}
              </div>
            </span>
          </button>
        );
      })}
      {phase === 'select-target' && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: T.micro, color: WIN, textAlign: 'center', fontWeight: 800, marginBottom: 6 }}>
            {tgtAll ? `↓ tap to confirm — ${tgtAllies ? 'whole team' : 'all enemies'}` : `↓ tap ${tgtAllies ? 'an ally' : 'an enemy'}`}
          </div>
          <button onClick={onBack} style={{ width: '100%', background: 'transparent', border: `1px solid ${LINE}`, color: DIM, borderRadius: 8, padding: '5px 0', cursor: 'pointer', fontSize: T.micro, fontWeight: 800 }}>↩ Back</button>
        </div>
      )}
    </div>
  );
}

// ── FightView — the shared battlefield + center moves + feed for a live battle. ──
function FightView({ fight, narrow, banner, bossUid, hintSkill }) {
  const { snap, feed, phase, pool, previewUid, fx, popups, feedBoxRef, previewUnit, chooseTarget, chooseSkill, cancelTarget } = fight;
  if (!snap) return null;
  const selecting = phase === 'select' || phase === 'select-target';
  const moves = selecting ? fight.previewMoves() : null;
  const enemyUids = moves?.enemyUids ?? [];
  const allyUids = moves?.allyUids ?? [];
  // Targeting context for the confirm beat (single/AOE × enemies/allies).
  const tgtMode = phase === 'select-target' && fight.pendingSkill ? getSkill(fight.pendingSkill).targetMode : null;
  const tgtAllies = tgtMode === 'ally' || tgtMode === 'allAllies';
  const tgtAll = tgtMode === 'allEnemies' || tgtMode === 'allAllies';
  const tgtUids = tgtAllies ? allyUids : enemyUids;
  const verb = !fight.pendingSkill ? 'HIT'
    : tgtAllies ? ({ heal: 'HEAL', shield: 'SHIELD', boost: 'BUFF' }[SKILL_EFFECT[fight.pendingSkill]] || 'BUFF')
    : 'HIT';
  const targetLabel = tgtAll ? `◀ ${verb} ALL` : `◀ TAP TO ${verb}`;
  const animOf = (u) => !u.alive ? 'defeated' : fx.actor === u.uid ? 'attack' : fx.bursts?.[u.uid] === 'attack' ? 'damaged' : 'idle';
  const popsFor = (uid) => popups.filter((p) => p.uid === uid);
  const side = (units, isEnemy) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: T.small, color: isEnemy ? '#e07a7a' : '#3ec9a0', fontWeight: 800, letterSpacing: 1 }}>{isEnemy ? 'ENEMY' : 'YOUR SQUAD'}</div>
      {units.map((u) => {
        const onTargetSide = tgtAllies ? !isEnemy : isEnemy;
        const isTgt = phase === 'select-target' && u.alive && onTargetSide && tgtUids.includes(u.uid);
        const isAct = !isEnemy && selecting && previewUid === u.uid && !isTgt;
        const canSwitch = !isEnemy && (phase === 'select' || (phase === 'select-target' && !tgtAllies)) && pool.includes(u.uid) && previewUid !== u.uid && !isTgt;
        // a picture for who gets hit: 🎯 pick ONE of these · 💥 hits ALL enemies · ✨ buffs the whole team
        const mark = isTgt ? (tgtAll ? (tgtAllies ? '✨' : '💥') : '🎯') : null;
        return (
          <StageUnit key={u.uid} u={u} anim={animOf(u)} big={units.length <= 2}
            isActor={isAct} selectable={canSwitch} isTarget={isTgt} targetLabel={targetLabel}
            targetMark={mark} aoe={isTgt && tgtAll && !tgtAllies}
            burst={fx.bursts?.[u.uid]} cast={fx.actor === u.uid ? fx.cast : null} fxN={fx.n} move={fx.move} hitN={fx.hitCounts?.[u.uid]} fire={fx.fire}
            boss={u.uid === bossUid}
            onSelect={previewUnit}
            onPick={chooseTarget} popups={popsFor(u.uid)} />
        );
      })}
    </div>
  );
  const prompt = phase === 'select' ? '👆 Tap a unit (switch freely), then pick its move in the middle'
    : phase === 'select-target' ? (tgtAll ? `🎯 Tap to confirm — ${verb.toLowerCase()}s ${tgtAllies ? 'your whole team' : 'ALL enemies'}` : `🎯 Tap ${tgtAllies ? 'an ally' : 'an enemy'} to ${verb.toLowerCase()}`)
    : null;
  return (
    <div>
      {prompt && <div style={{ textAlign: 'center', fontSize: T.body, fontWeight: 800, color: ACCENT, marginBottom: 8 }}>{prompt}</div>}
      {/* The arena: your squad — center move lane — the enemy */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6, background: 'radial-gradient(ellipse at center, #14141f 0%, #0b0b14 100%)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px 8px', marginBottom: 14, minHeight: 210 }}>
        {side(snap.A, false)}
        <div style={{ flex: moves ? 1.5 : 0.5, minWidth: moves ? 150 : 28, alignSelf: 'center', display: 'flex', justifyContent: 'center' }}>
          <CenterMoves moves={moves} pendingSkill={fight.pendingSkill} phase={phase} onSkill={chooseSkill} onBack={cancelTarget} tgtAllies={tgtAllies} tgtAll={tgtAll} hintSkill={hintSkill} />
        </div>
        {side(snap.B, true)}
      </div>
      {/* Banner + log below the arena */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div>{banner}</div>
        <div>
          <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>BATTLE LOG</div>
          <div ref={feedBoxRef} style={{ background: '#0a0a12', border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, maxHeight: narrow ? 300 : 440, overflowY: 'auto' }}>
            {feed.length === 0 && <div style={{ fontSize: T.body, color: '#555' }}>Battle log…</div>}
            {feed.map((f, i) => (
              <div key={i} style={{ fontSize: T.body, padding: '3px 0', lineHeight: 1.5,
                color: f.kind === 'round' ? ACCENT : f.kind === 'end' ? WIN : f.kind === 'burn' ? BURN : f.kind === 'regen' ? WIN : f.side === 'A' ? '#9cd' : '#e0a0b8',
                fontWeight: f.kind === 'round' || f.kind === 'end' ? 800 : 500,
                borderTop: f.kind === 'round' ? `1px solid ${LINE}` : 'none', marginTop: f.kind === 'round' ? 6 : 0, paddingTop: f.kind === 'round' ? 6 : 3 }}>{f.text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// The accumulated build, shown as chips so you SEE your run getting stronger.
// Squad upgrades show as flat chips; unit bends show "Icon Name → CreatureName"
// so you can read your carry's build at a glance.
function BuildStrip({ taken }) {
  if (!taken.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1 }}>YOUR BUILD:</span>
      {taken.map((u, i) => (
        <span key={i} title={u.desc} style={{ fontSize: T.small, fontWeight: 700, color: u.color, background: '#15151f', border: `1px solid ${u.color}66`, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>
          {u.icon} {u.name}{u.targetName ? <span style={{ color: '#9a9aaa', fontWeight: 600, fontSize: T.micro }}> → {u.targetName}</span> : null}
        </span>
      ))}
    </div>
  );
}

// Between-wave squad condition — see who's hurt and what bends each creature has
// stacked before you pick the next upgrade. Makes the decision legible: "Swiftpaw
// is at 60% HP with Twin Strike — give her Thick Hide or a second bend?"
function SquadState({ squad, runMods }) {
  if (!squad || !squad.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      {squad.map((mem) => {
        const c = COMBAT_CREATURES[mem.id];
        const ti = TYPE_INFO[c.type];
        const maxHp = maxHpOf(mem, runMods);
        const pct = maxHp > 0 ? Math.max(0, mem.hp / maxHp) : 0;
        const dead = mem.hp <= 0;
        const hpColor = dead ? '#3a1a1a' : pct < 0.3 ? LOSS : pct < 0.6 ? ACCENT : '#3ec9a0';
        return (
          <div key={mem.id} style={{ flex: 1, minWidth: 120, background: PANEL, border: `1.5px solid ${dead ? '#2a1414' : ti.accent + '55'}`, borderRadius: 10, padding: '8px 10px', opacity: dead ? 0.45 : 1 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 5 }}>
              <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.small, fontWeight: 900, color: ti.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: T.micro, color: dead ? LOSS : '#aaa', fontWeight: 700 }}>{dead ? 'KO' : `${mem.hp}/${maxHp} HP`}</div>
              </div>
            </div>
            <Bar value={dead ? 0 : mem.hp} max={maxHp} color={hpColor} h={5} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6, minHeight: 16 }}>
              {(mem.bends ?? []).map((b, i) => (
                <span key={i} title={b.name} style={{ fontSize: 10, fontWeight: 800, color: b.color, background: b.color + '22', border: `1px solid ${b.color}44`, borderRadius: 6, padding: '1px 5px' }}>{b.icon}</span>
              ))}
              {!(mem.bends ?? []).length && <span style={{ fontSize: T.micro, color: '#3a3a4a', fontStyle: 'italic' }}>no bends</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The slag a run banked — the thing it left behind. Shown big on win/loss so the
// reward reads, with the new wallet total beside it.
function SlagBanked({ earned, balance }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#15150c', border: `1px solid #c9c98a55`, borderRadius: 10, padding: '9px 12px', marginBottom: 12 }}>
      <span style={{ fontSize: T.sub, fontWeight: 900, color: '#e8e89a' }}>⚒ +{earned} slag</span>
      <span style={{ fontSize: T.small, color: DIM, fontWeight: 700 }}>banked · {balance} total</span>
    </div>
  );
}

// End-of-run recap: per-creature build cards + team buffs + aggregate stats.
// The carry's bends are the story — show them front and centre.
function RunRecap({ taken, stats, squad }) {
  const survivors = squad.filter((m) => m.hp > 0).length;
  const teamBuffs = taken.filter((u) => !u.targetName); // squad-wide upgrades
  const cell = (label, value) => (
    <div style={{ flex: 1, minWidth: 84, background: '#0c0c14', border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 6px' }}>
      <div style={{ fontSize: T.head, fontWeight: 900, color: '#eee' }}>{value}</div>
      <div style={{ fontSize: T.micro, color: DIM, fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Per-creature build: who carried what bends across the run */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {squad.map((mem) => {
          const c = COMBAT_CREATURES[mem.id];
          const ti = TYPE_INFO[c.type];
          const dead = mem.hp <= 0;
          return (
            <div key={mem.id} style={{ flex: 1, minWidth: 130, background: '#0c0c14', border: `1.5px solid ${dead ? '#2a1414' : ti.accent + '44'}`, borderRadius: 10, padding: '9px 10px', opacity: dead ? 0.5 : 1 }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={34} />
                <div>
                  <div style={{ fontSize: T.small, fontWeight: 900, color: ti.accent }}>{ti.glyph} {c.name}</div>
                  <div style={{ fontSize: T.micro, fontWeight: 800, color: dead ? LOSS : WIN }}>{dead ? '✕ KO' : '✓ Survived'}</div>
                </div>
              </div>
              {(mem.bends ?? []).length > 0 ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(mem.bends ?? []).map((b, i) => (
                    <span key={i} title={b.name} style={{ fontSize: T.micro, fontWeight: 800, color: b.color, background: b.color + '22', border: `1px solid ${b.color}44`, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>{b.icon} {b.name}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: T.micro, color: '#383848', fontStyle: 'italic' }}>no bends</div>
              )}
            </div>
          );
        })}
      </div>
      {/* Squad-wide buffs that helped everyone */}
      {teamBuffs.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1 }}>TEAM:</span>
          {teamBuffs.map((u, i) => (
            <span key={i} style={{ fontSize: T.micro, fontWeight: 700, color: u.color, background: '#15151f', border: `1px solid ${u.color}55`, borderRadius: 8, padding: '2px 7px', whiteSpace: 'nowrap' }}>{u.icon} {u.name}</span>
          ))}
        </div>
      )}
      {/* Aggregate run stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cell('WAVES', `${stats.waves}/${WAVES.length}`)}
        {cell('DAMAGE DEALT', stats.dmg.toLocaleString())}
        {cell('BIGGEST HIT', stats.biggest)}
        {cell('SURVIVORS', `${survivors}/${squad.length}`)}
      </div>
    </div>
  );
}

// ── RUN MODE — squad pick → (upgrade → wave) ×3 → boss, HP carries, win or wipe. ──
function RunMode({ narrow, slag = 0, onSlag }) {
  const fight = useFight();
  const [runPhase, setRunPhase] = useState('pick'); // pick | upgrade | fighting | won | lost
  const [picked, setPicked] = useState([]); // creature ids (2–3)
  const [squad, setSquad] = useState([]); // [{id, hp}] persistent across waves
  const [waveIdx, setWaveIdx] = useState(0); // the wave about to be fought
  const [runMods, setRunMods] = useState({ ...EMPTY_MODS });
  const [taken, setTaken] = useState([]); // upgrades chosen this run (for the build strip)
  const [offer, setOffer] = useState([]); // 3 upgrade ids on the table now
  const [stats, setStats] = useState({ dmg: 0, biggest: 0, waves: 0 }); // run recap tally
  const [owned, setOwned] = useState(loadPerks); // permanent perks bought with slag
  const [earned, setEarned] = useState(0); // slag this run banked (for the recap)
  const [stable, setStable] = useState(loadStable); // creature IDs you've caught
  const [caughtNow, setCaughtNow] = useState(null); // creature caught this run (for reveal)
  const [pendingUpgrade, setPendingUpgrade] = useState(null); // unit-scope upgrade awaiting a target pick

  // Perk-driven dials, recomputed from what you own.
  const offerCount = owned.includes('p_foresight') ? 4 : 3;
  const patchup = PATCHUP + (owned.includes('p_medic') ? 0.15 : 0);

  function buyPerk(p) {
    if (owned.includes(p.id) || slag < p.cost || !onSlag) return;
    onSlag(-p.cost);
    const next = [...owned, p.id];
    setOwned(next); savePerks(next);
  }

  function toggle(id) {
    if (!stable.includes(id)) return; // can't pick locked creatures
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p);
  }
  // Only offer a move-bend when the matching Type is still alive — pass aliveTypes
  // after each wave so a dead creature's bend can't appear in the next offer.
  function rollOffer(aliveTypes) {
    const types = aliveTypes ?? new Set(picked.map((id) => COMBAT_CREATURES[id].type));
    const pool = UPGRADES.filter((u) => !u.needsType || types.has(u.needsType));
    const out = [];
    for (let k = 0; k < offerCount && pool.length; k++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    setOffer(out);
  }

  function startWave(idx, sq, mods) {
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i], mods));
    fight.begin(aDefs, WAVES[idx].enemies(), WAVES[idx].seed, 'play', (res, finalState) => {
      const next = sq.map((m) => ({ ...m }));
      fielded.forEach((mi, i) => { next[mi].hp = finalState.units.A[i].hp; });
      const youLive = next.some((m) => m.hp > 0) && finalState.units.A.some((u) => u.hp > 0);
      const won = youLive && res.winner !== 'B';
      // Tally what your squad did this fight, for the end-of-run recap.
      let fightDmg = 0, fightBig = 0;
      finalState.log.forEach((e) => { if (e.type === 'turn' && e.actor.side === 'A') (e.hits || []).forEach((h) => { fightDmg += h.dmg || 0; if ((h.dmg || 0) > fightBig) fightBig = h.dmg; }); });
      setStats((s) => ({ dmg: s.dmg + fightDmg, biggest: Math.max(s.biggest, fightBig), waves: s.waves + (won ? 1 : 0) }));
      if (!won) {
        const got = lossSlag(idx); onSlag?.(got); setEarned(got); // even a wipe banks a little
        setSquad(next); sfx.squadDown(); setRunPhase('lost'); return;
      }
      // Patch survivors up a little for the next push.
      const patched = next.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, mods), m.hp + Math.round(maxHpOf(m, mods) * patchup)) } : m);
      setSquad(patched);
      if (idx === WAVES.length - 1) {
        onSlag?.(WIN_SLAG); setEarned(WIN_SLAG);
        // Catch one random creature from those not yet in your stable.
        const locked = COMBAT_ROSTER.filter((c) => !stable.includes(c.id));
        const caught = locked.length > 0 ? locked[Math.floor(Math.random() * locked.length)] : null;
        if (caught) { const next = [...stable, caught.id]; setStable(next); saveStable(next); }
        setCaughtNow(caught);
        sfx.ringTaken();
        if (caught) setTimeout(() => sfx.caughtCreature(), 720);
        setRunPhase('won'); return;
      }
      const aliveTypes = new Set(patched.filter((m) => m.hp > 0).map((m) => COMBAT_CREATURES[m.id].type));
      sfx.waveClear();
      setWaveIdx(idx + 1); rollOffer(aliveTypes); setRunPhase('upgrade');
    });
    setWaveIdx(idx);
    setRunPhase('fighting');
  }

  function startRun() {
    sfx.resume(); // unlock AudioContext on first user gesture (browser autoplay policy)
    const base = perkBaseMods(owned); // permanent perks set the run's opening mods
    const sq = picked.map((id) => ({ id, hp: maxHpOf({ id }, base), unitMods: { ...EMPTY_UNIT_MODS }, bends: [] }));
    setSquad(sq); setRunMods(base); setTaken([]); setWaveIdx(0); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0);
    rollOffer(); setRunPhase('upgrade');
  }
  function applyUpgrade(up) {
    sfx.upgradePick();
    if (up.scope === 'unit') {
      // Unit-scope: pause and ask the player to pick which creature gets this bend.
      setPendingUpgrade(up);
      setRunPhase('pick-target');
      return;
    }
    // Squad-scope: apply to the shared runMods, then start the wave.
    const m = { ...runMods }; up.apply(m);
    let sq = squad;
    if (m.hpMult !== runMods.hpMult) {
      sq = squad.map((mem) => mem.hp > 0 ? { ...mem, hp: mem.hp + (maxHpOf(mem, m) - maxHpOf(mem, runMods)) } : mem);
    }
    setRunMods(m); setSquad(sq); setTaken((t) => [...t, up]);
    startWave(waveIdx, sq, m);
  }
  // Apply a unit-scope bend to exactly one creature, then start the wave.
  function pickTarget(memberId) {
    if (!pendingUpgrade) return;
    const up = pendingUpgrade;
    const sq = squad.map((mem) => {
      if (mem.id !== memberId) return mem;
      const unitMods = { ...(mem.unitMods ?? EMPTY_UNIT_MODS) };
      up.apply(unitMods); // mutates the copy; original is unaffected
      const targetName = COMBAT_CREATURES[memberId].name;
      return { ...mem, unitMods, bends: [...(mem.bends ?? []), { id: up.id, icon: up.icon, name: up.name, color: up.color }] };
    });
    const targetName = COMBAT_CREATURES[memberId].name;
    setSquad(sq);
    setTaken((t) => [...t, { ...up, targetName }]);
    setPendingUpgrade(null);
    startWave(waveIdx, sq, runMods);
  }
  function newRun() { fight.reset(); setRunPhase('pick'); setPicked([]); setSquad([]); setWaveIdx(0); setRunMods({ ...EMPTY_MODS }); setTaken([]); setOffer([]); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setCaughtNow(null); setPendingUpgrade(null); }

  // ── Squad picker ──
  if (runPhase === 'pick') {
    return (
      <div>
        <div style={{ background: '#15100a', border: `1px solid ${ACCENT}55`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: T.sub, color: ACCENT, fontWeight: 900, letterSpacing: 0.5 }}>⛰ TAKE THE APPROACH</div>
          <div style={{ fontSize: T.small, color: '#d8c4a8', lineHeight: 1.5, marginTop: 4 }}>
            Three packs guard the edge of the ring — Scouts, the Pack, the Warden — and behind them waits the <b style={{ color: '#ffb38a' }}>Hollow King</b>. Clear all four in one push and the approach is yours. Wounds carry between fights; you only patch up a little. Choose who goes in.
          </div>
        </div>
        {/* ── THE FORGE: spend slag banked from past runs on a permanent edge ── */}
        <div style={{ background: '#0c1016', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: T.sub, color: '#cdb6ff', fontWeight: 900, letterSpacing: 0.5 }}>⚒ THE FORGE</div>
            <div style={{ fontSize: T.small, fontWeight: 800, color: '#c9c98a' }}>⚒ {slag} slag</div>
          </div>
          <div style={{ fontSize: T.micro, color: DIM, marginBottom: 10, lineHeight: 1.4 }}>Slag you bank from runs buys a <b style={{ color: '#cdb6ff' }}>permanent</b> edge — it carries into every run from here on. This is what a run leaves behind.</div>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
            {PERKS.map((p) => {
              const have = owned.includes(p.id);
              const afford = slag >= p.cost;
              return (
                <button key={p.id} onClick={() => buyPerk(p)} disabled={have || !afford}
                  style={{ textAlign: 'left', borderRadius: 10, padding: '9px 10px', cursor: have || !afford ? 'default' : 'pointer',
                    background: have ? '#10231a' : PANEL, border: `1.5px solid ${have ? WIN : afford ? `${p.color}99` : LINE}`, opacity: !have && !afford ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: T.body }}>{p.icon}</span>
                    <span style={{ fontSize: T.small, fontWeight: 900, color: have ? WIN : p.color }}>{p.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: have ? WIN : afford ? '#c9c98a' : DIM }}>{have ? '✓ OWNED' : `${p.cost} ⚒`}</span>
                  </div>
                  <div style={{ fontSize: T.micro, color: have ? '#bfe8cf' : '#9a9aaa', lineHeight: 1.35 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: T.body, color: '#ddd', fontWeight: 700, marginBottom: 10 }}>
          Pick <b style={{ color: ACCENT }}>2–3</b> creatures <span style={{ color: DIM, fontWeight: 600 }}>({picked.length} chosen)</span>
          <span style={{ float: 'right', fontSize: T.micro, color: DIM, fontWeight: 700, lineHeight: '22px' }}>{stable.length}/{COMBAT_ROSTER.length} caught</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {COMBAT_ROSTER.filter((c) => stable.includes(c.id)).map((c) => {
            const ti = TYPE_INFO[c.type];
            const on = picked.includes(c.id);
            const full = !on && picked.length >= 3;
            return (
              <button key={c.id} onClick={() => toggle(c.id)} disabled={full}
                style={{ textAlign: 'left', cursor: full ? 'not-allowed' : 'pointer', borderRadius: 12, padding: '11px 12px',
                  background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`, opacity: full ? 0.4 : 1, boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={68} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: T.label, fontWeight: 900, color: ti.accent }}>{ti.glyph} {ti.nick}</span>
                      {on && <span style={{ marginLeft: 'auto', fontSize: T.body, color: SEL, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: T.small, color: on ? '#eaf2ff' : '#cfcfda', fontWeight: 700, margin: '1px 0 3px' }}>{c.name} <span style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>· {c.type}</span></div>
                    <div style={{ fontSize: T.micro, color: DIM }}>HP {c.hp} · ATK {c.atk} · SPD {c.speed}</div>
                  </div>
                </div>
                <div style={{ fontSize: T.small, color: on ? '#cdd8e4' : '#9a9aaa', lineHeight: 1.4, marginTop: 7 }}>{ti.role}</div>
              </button>
            );
          })}
        </div>
        {(() => {
          const lockedCount = COMBAT_ROSTER.length - stable.length;
          if (lockedCount === 0) return null;
          return (
            <div style={{ borderRadius: 10, border: `1px dashed ${LINE}`, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🔒</span>
              <div>
                <div style={{ fontSize: T.small, fontWeight: 900, color: DIM }}>{lockedCount} creature{lockedCount !== 1 ? 's' : ''} still out there</div>
                <div style={{ fontSize: T.micro, color: '#666' }}>Clear the ring to catch one. Win runs to fill your stable.</div>
              </div>
            </div>
          );
        })()}
        <div style={{ marginBottom: 18 }} />
        <button onClick={startRun} disabled={picked.length < 2}
          style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: picked.length >= 2 ? ACCENT : '#222', color: picked.length >= 2 ? '#1a1408' : '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: picked.length >= 2 ? 'pointer' : 'default' }}>
          {picked.length < 2 ? 'PICK AT LEAST 2' : `START RUN — ${picked.length} creatures →`}
        </button>
      </div>
    );
  }

  // ── Pick-target: a unit-scope bend was chosen — now pick which creature gets it. ──
  if (runPhase === 'pick-target' && pendingUpgrade) {
    const up = pendingUpgrade;
    const eligible = squad.filter((m) => m.hp > 0 && (!up.needsType || COMBAT_CREATURES[m.id].type === up.needsType));
    const fighters = eligible.length > 0 ? eligible : squad.filter((m) => m.hp > 0);
    return (
      <div>
        <BuildStrip taken={taken} />
        {/* The bend card — what you just picked */}
        <div style={{ textAlign: 'center', background: PANEL, border: `2px solid ${up.color}`, borderRadius: 14, padding: '18px 16px', marginBottom: 18, boxShadow: `0 0 18px ${up.color}33` }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>{up.icon}</div>
          <div style={{ fontSize: T.sub, fontWeight: 900, color: up.color, marginTop: 6 }}>{up.name}</div>
          <div style={{ fontSize: T.small, color: '#cdd2dd', lineHeight: 1.45, marginTop: 6, maxWidth: 340, margin: '6px auto 0' }}>{up.desc}</div>
          <div style={{ fontSize: T.body, color: ACCENT, fontWeight: 900, marginTop: 12, letterSpacing: 0.5 }}>↓ Who gets it?</div>
        </div>
        {/* Squad member picker */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : `repeat(${fighters.length}, 1fr)`, gap: 12 }}>
          {fighters.map((mem) => {
            const c = COMBAT_CREATURES[mem.id];
            const ti = TYPE_INFO[c.type];
            return (
              <button key={mem.id} onClick={() => pickTarget(mem.id)}
                style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: '14px 12px', background: PANEL, border: `2.5px solid ${ti.accent}88`, boxShadow: `0 0 16px ${ti.accent}22`, transition: 'border-color .15s' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={68} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.label, fontWeight: 900, color: ti.accent }}>{ti.glyph} {c.name}</div>
                    <div style={{ fontSize: T.small, color: '#ccc', fontWeight: 700 }}>{ti.nick}</div>
                    <div style={{ fontSize: T.micro, color: '#888', marginTop: 2 }}>{mem.hp}/{maxHpOf(mem, runMods)} HP</div>
                  </div>
                </div>
                {/* Bends already on this creature */}
                {(mem.bends ?? []).length > 0 && (
                  <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 7, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(mem.bends ?? []).map((b, i) => (
                      <span key={i} style={{ fontSize: T.micro, color: b.color, background: '#0a0a14', border: `1px solid ${b.color}55`, borderRadius: 8, padding: '2px 6px', fontWeight: 700 }}>{b.icon} {b.name}</span>
                    ))}
                  </div>
                )}
                {(mem.bends ?? []).length === 0 && (
                  <div style={{ fontSize: T.micro, color: '#555', fontStyle: 'italic' }}>No bends yet</div>
                )}
                <div style={{ marginTop: 8, padding: '7px 10px', background: `${up.color}18`, border: `1px solid ${up.color}55`, borderRadius: 8, textAlign: 'center', fontSize: T.small, fontWeight: 800, color: up.color }}>Give this one {up.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Upgrade choice: pick 1 of 3 before each wave. ──
  if (runPhase === 'upgrade') {
    const nextWave = WAVES[waveIdx];
    return (
      <div>
        <BuildStrip taken={taken} />
        <SquadState squad={squad} runMods={runMods} />
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: T.head, fontWeight: 900, color: ACCENT }}>{waveIdx === 0 ? '⛰ Gear up for the approach' : `✓ Wave ${waveIdx} cleared — patched up (+${Math.round(patchup * 100)}% HP)`}</div>
          {nextWave.boss && <div style={{ fontSize: T.sub, fontWeight: 900, color: LOSS, marginTop: 6 }}>💀 FINAL STAND — choose your last upgrade well.</div>}
          <div style={{ fontSize: T.body, color: '#cfcfda', marginTop: 5 }}>Pick <b style={{ color: ACCENT }}>one upgrade</b> for your squad — then face <b style={{ color: nextWave.boss ? '#ffb38a' : '#ddd' }}>{nextWave.name}</b>.</div>
          <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>{nextWave.blurb}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
          {offer.map((id) => {
            const up = UPGRADE_BY_ID[id];
            return (
              <button key={id} onClick={() => applyUpgrade(up)} style={{ textAlign: 'center', cursor: 'pointer', borderRadius: 14, padding: '20px 14px', background: PANEL, border: `2px solid ${up.color}`, boxShadow: `0 0 14px ${up.color}33` }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{up.icon}</div>
                <div style={{ fontSize: T.label, fontWeight: 900, color: up.color, marginTop: 8 }}>{up.name}</div>
                <div style={{ fontSize: T.small, color: '#cdd2dd', lineHeight: 1.45, marginTop: 6 }}>{up.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── In a run: progress bar + the fight (+ result banner). ──
  const wave = WAVES[waveIdx];
  const banner = (() => {
    if (runPhase === 'won') {
      const ti = caughtNow ? TYPE_INFO[caughtNow.type] : null;
      return (
        <div style={{ background: '#0d1a0d', border: `2px solid ${WIN}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: WIN }}>RING TAKEN</div>
          <div style={{ fontSize: T.body, color: '#cfe8c0', margin: '4px 0 12px' }}>You broke <b>The Hollow King</b> and cleared the approach.</div>
          {caughtNow && ti && (
            <div style={{ margin: '14px 0', background: '#091a12', border: `2px solid ${ti.accent}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>CAUGHT</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Sprite spriteId={caughtNow.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={64} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: T.sub, fontWeight: 900, color: ti.accent }}>{ti.glyph} {caughtNow.name}</div>
                  <div style={{ fontSize: T.small, color: '#cdd', fontWeight: 700 }}>{ti.nick}</div>
                  <div style={{ fontSize: T.micro, color: DIM, marginTop: 2 }}>{ti.role}</div>
                  <div style={{ fontSize: T.micro, color: '#888', marginTop: 3 }}>Now in your stable — {stable.length}/{COMBAT_ROSTER.length} caught.</div>
                </div>
              </div>
            </div>
          )}
          {!caughtNow && (
            <div style={{ fontSize: T.small, color: DIM, margin: '10px 0', fontStyle: 'italic' }}>Your stable is full — all {COMBAT_ROSTER.length} creatures caught.</div>
          )}
          <SlagBanked earned={earned} balance={slag} />
          <RunRecap taken={taken} stats={stats} squad={squad} />
          <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
        </div>
      );
    }
    if (runPhase === 'lost') return (
      <div style={{ background: '#1a0d0d', border: `2px solid ${LOSS}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: LOSS }}>SQUAD DOWN</div>
        <div style={{ fontSize: T.body, color: DIM, margin: '4px 0 12px' }}>Fell at {wave.boss ? '💀 ' : ''}{wave.name} — wave {waveIdx + 1}/{WAVES.length}.</div>
        <SlagBanked earned={earned} balance={slag} />
        <RunRecap taken={taken} stats={stats} squad={squad} />
        <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
      </div>
    );
    return null;
  })();

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {WAVES.map((w, i) => (
          <div key={i} title={w.name} style={{ flex: w.boss ? 1.4 : 1, height: 8, borderRadius: 3,
            background: i < waveIdx || runPhase === 'won' ? WIN : i === waveIdx ? (w.boss ? LOSS : ACCENT) : '#26263a',
            border: w.boss ? `1px solid ${LOSS}99` : 'none' }} />
        ))}
      </div>
      <div style={{ fontSize: T.small, color: DIM, marginBottom: 10 }}>
        <b style={{ color: wave.boss ? '#ffb38a' : '#ddd' }}>{wave.boss ? '💀 ' : ''}Wave {waveIdx + 1}/{WAVES.length} · {wave.name}</b> — {wave.blurb}
      </div>
      <BuildStrip taken={taken} />
      <FightView fight={fight} narrow={narrow} banner={banner} bossUid={wave.boss ? 'B0' : null} />
    </div>
  );
}

// ── SANDBOX — fixed matchups; PLAY one or WATCH the golden replay. ──
function Sandbox({ narrow }) {
  const fight = useFight();
  const [matchup, setMatchup] = useState('mirror');
  const cfg = MATCHUPS[matchup];
  const [mode, setMode] = useState(null);

  function start(which) { setMode(which); const { a, b, seed } = MATCHUPS[matchup]; fight.begin(a(), b(), seed, which); }

  const modeBtn = (which, glyph, title, sub) => (
    <button onClick={() => start(which)} style={{ flex: 1, background: mode === which ? ACCENT : PANEL, color: mode === which ? '#1a1408' : '#eee', border: `2px solid ${ACCENT}`, borderRadius: 12, padding: narrow ? '14px 10px' : '16px 14px', cursor: 'pointer', textAlign: 'center' }}>
      <div style={{ fontSize: T.sub, fontWeight: 800 }}>{glyph} {title}</div>
      <div style={{ fontSize: T.small, marginTop: 3, opacity: 0.85, fontWeight: 600 }}>{sub}</div>
    </button>
  );

  const banner = fight.phase === 'done' && (
    <div style={{ background: PANEL, border: `2px solid ${WIN}`, borderRadius: 12, padding: 14, marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: T.sub, fontWeight: 800, color: WIN }}>Fight over</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PICK A FIGHT</div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {Object.entries(MATCHUPS).map(([m, c]) => {
          const on = matchup === m;
          return (
            <button key={m} onClick={() => setMatchup(m)} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '13px 14px', background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`, boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span style={{ fontSize: T.sub, color: c.accent }}>{c.glyph}</span>
                <span style={{ fontSize: T.label, fontWeight: 800, color: on ? '#eaf2ff' : '#ddd' }}>{c.label}</span>
                {on && <span style={{ marginLeft: 'auto', fontSize: T.micro, color: SEL, fontWeight: 800, letterSpacing: 1 }}>● SET</span>}
              </div>
              <div style={{ fontSize: T.small, color: on ? '#b9c6d6' : '#8f8f9f', lineHeight: 1.45 }}>{c.desc}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {modeBtn('play', '▶', 'PLAY', 'you drive side A vs the AI')}
        {modeBtn('watch', '⏵', 'WATCH', 'AI vs AI — replays the golden')}
      </div>
      {!fight.snap
        ? <div style={{ color: DIM, fontSize: T.body, textAlign: 'center', padding: '32px 16px', background: PANEL, border: `1px dashed ${LINE}`, borderRadius: 12 }}>
            <div style={{ fontSize: T.sub, color: '#bbb', fontWeight: 700, marginBottom: 6 }}>{cfg.glyph} {cfg.label}</div>
            <div style={{ lineHeight: 1.5, maxWidth: 460, margin: '0 auto' }}>{cfg.desc}</div>
            <div style={{ marginTop: 14, color: ACCENT, fontWeight: 700 }}>Press PLAY or WATCH to start.</div>
          </div>
        : <FightView fight={fight} narrow={narrow} banner={banner} />}
    </div>
  );
}

// Marrow's coaching line — the gradual-teaching voice.
function CoachBar({ text }) {
  return (
    <div style={{ background: '#15100a', border: `2px solid ${ACCENT}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: T.sub }}>🗣️</span>
      <div>
        <div style={{ fontSize: T.micro, color: ACCENT, fontWeight: 800, letterSpacing: 1 }}>MARROW</div>
        <div style={{ fontSize: T.body, color: '#f0e2cc', lineHeight: 1.45, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}

// ── LEARN — a guided first fight: one creature, one harmless target, Marrow
// walking you through the charge loop and tying the creature's LOOK to its moves. ──
function LearnMode({ narrow, onGraduate }) {
  const fight = useFight({ autoSkip: false }); // teach the move-pick explicitly here
  const [stage, setStage] = useState('intro'); // intro | fight | won
  const ti = TYPE_INFO.Reactor;

  function start() {
    const cre = COMBAT_CREATURES.cinderpaw;
    const you = [{ ...cre, temperament: 'Balanced', maxHp: cre.hp, hp: cre.hp }];
    const dummy = { ...COMBAT_CREATURES.glowtail, name: 'Straw Target', spriteId: 'flicker', hp: 90, maxHp: 90, atk: 6, speed: 1 };
    fight.begin(you, [dummy], 11, 'play', () => setStage('won'));
    setStage('fight');
  }

  if (stage === 'intro') {
    // Wordless on-ramp: the creature, then the ONE idea as a picture —
    // fill ⚡ ⚡, then it becomes a 💥. No paragraph to read.
    const chip = (bg, brd, children) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, border: `2px solid ${brd}`, borderRadius: 12, padding: '10px 14px' }}>{children}</div>
    );
    return (
      <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Sprite spriteId="cinder" color={ti.accent} glyph={ti.glyph} size={140} />
        </div>
        <div style={{ fontSize: T.sub, fontWeight: 900, color: ti.accent, marginBottom: 16 }}>🔥 Cinderpaw</div>
        {/* the whole game, as a picture: fill charge → spend it big */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          {chip('#15120a', CHG, <><ChargeDots value={2} max={2} /><span style={{ fontSize: T.small, fontWeight: 800, color: CHG }}>fill up</span></>)}
          <span style={{ fontSize: T.head, color: DIM }}>→</span>
          {chip('#1f0f08', BURN, <><span style={{ fontSize: T.sub }}>💥</span><span style={{ fontSize: T.small, fontWeight: 800, color: '#ff9a5a' }}>BIG HIT</span></>)}
        </div>
        <button onClick={start} style={{ width: '100%', padding: '16px 0', border: 'none', borderRadius: 12, background: ACCENT, color: '#1a1408', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>▶ START 👆</button>
      </div>
    );
  }

  const charge = fight.snap?.A?.[0]?.charge ?? 0;
  // Short, picture-led prompts. The finger (hintSkill) points at the exact move to
  // tap, so a kid can play by following 👈 — no sentence to read.
  let tip, hintSkill = null;
  if (stage === 'won') tip = '⚡ build → 💥 spend. You did it! 🎉';
  else if (fight.phase === 'select-target') tip = '👇 Tap the target!';
  else if (fight.phase === 'select') {
    if (charge >= 2) { tip = '💥 Now hit BIG — tap 👈'; hintSkill = 'overload'; }
    else { tip = '⚡ Fill your power — tap 👈'; hintSkill = 'chargeUp'; }
  } else tip = '⚡ Watch the dots fill up';

  const banner = (
    <div>
      <CoachBar text={tip} />
      {stage === 'won' && <button onClick={onGraduate} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: WIN, color: '#06120a', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', marginBottom: 12 }}>START A REAL RUN →</button>}
    </div>
  );
  return <FightView fight={fight} narrow={narrow} banner={banner} hintSkill={hintSkill} />;
}

export function SeamLab({ onClose, slag = 0, onSlag }) {
  const vw = useViewport();
  const narrow = vw < 760;
  const [tab, setTab] = useState('run'); // 'learn' | 'run' | 'sandbox'

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ background: tab === key ? '#16202e' : PANEL, color: tab === key ? '#eaf2ff' : '#999', border: `2px solid ${tab === key ? SEL : LINE}`, borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontSize: T.body, fontWeight: 800 }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.98)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{FX_STYLE}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: narrow ? '14px 12px 48px' : '18px 18px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: T.head, fontWeight: 900, color: '#e86040', letterSpacing: 2 }}>RINGWARD</div>
            <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>Manual combat · charge, spend, build.</div>
          </div>
          <button onClick={onClose} style={{ background: PANEL, border: `1px solid ${LINE}`, color: '#9a9aaa', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: T.small, fontWeight: 700 }}>← ROSTER</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {tabBtn('learn', '🎓 LEARN')}
          {tabBtn('run', '⚔ RUN')}
          {tabBtn('sandbox', '🔬 Sandbox')}
        </div>
        {tab === 'learn' ? <LearnMode narrow={narrow} onGraduate={() => setTab('run')} /> : tab === 'run' ? <RunMode narrow={narrow} slag={slag} onSlag={onSlag} /> : <Sandbox narrow={narrow} />}
      </div>
    </div>
  );
}

export default SeamLab;
