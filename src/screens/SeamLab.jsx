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
import { Cutscene, OPENING_SCENES, RingVignette, HoldfastVignette, EventVignette } from './Cutscene.jsx';
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
const PATCHUP = 0.18; // between-wave heal (fraction of max HP) — small, so a run is a war of attrition
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
  Warden: { glyph: '❄', accent: '#8fd8ff', nick: 'The Jailer', role: 'Freezes enemies out of their turns.' },
  Hexer: { glyph: '💀', accent: '#b06bff', nick: 'The Curse', role: 'Makes enemies take more from the whole squad.' },
};

// ── Rumors of the grunlings still out there (preview/hint lore). Folk-mystery tone:
// each is a whisper about a creature you haven't caught yet + where it's said to roam.
// Surfaced on the pick screen so the unknown roster feels like a place to explore.
// (Seeds the future discovery system — rings/areas raise the odds of meeting one.)
const CREATURE_LORE = {
  fizzpop:    { rumor: 'A spark that never settles — it hoards fire, then lets it all go at once.', where: 'the crackling outer ring' },
  glowtail:   { rumor: 'Its tail-light pulses brighter the longer a fight drags on.', where: 'dusk-lit hollows near the edge' },
  cinderpaw:  { rumor: 'Walks on embers; whatever it touches smolders for days.', where: 'old burn-scars on the approach' },
  stoneward:  { rumor: 'A walking wall. They say siege engines broke against it and it never moved.', where: 'the rubble of a fallen gate' },
  ironwall:   { rumor: 'Older than the blight. It guards, it does not attack — and it does not fall.', where: 'a sealed keep, deeper in' },
  mossback:   { rumor: 'Where it sleeps, the wounded wake whole. Hunters leave it be.', where: 'a green seam between the rings' },
  dewleaf:    { rumor: 'It weeps a water that knits flesh. Rare, and quick to flee.', where: 'mist-fed glades at first light' },
  buzzline:   { rumor: 'Latches onto a stronger creature and makes its blows land twice as hard.', where: 'storm-wire thickets' },
  tanglewing: { rumor: 'Hums a note that lifts a whole pack at once — never fights alone.', where: 'wind-tunnels between cliffs' },
  swiftpaw:   { rumor: 'Gone before you see it move. Strikes a dozen times in a breath.', where: 'the fast, narrow trails' },
  dartwing:   { rumor: 'Always acts first. The fastest thing anyone has lived to describe.', where: 'high ledges on the inner climb' },
  shadefang:  { rumor: 'Hunts only the wounded. It waits for the kill, then takes it.', where: 'the deep dark past the Warden' },
  veilclaw:   { rumor: 'A killer wrapped in shadow — the weaker you are, the harder it bites.', where: 'the lightless inner rings' },
  frostwarden:{ rumor: 'A cold so total it stops a creature mid-step. Time seems to freeze around it.', where: 'the frostbound deep, far inward' },
  rimecaller: { rumor: 'It calls down a stillness over a whole battlefield. Few have seen one and moved again.', where: 'the silent rings near the Drop' },
  blightcap:  { rumor: 'Where it treads, armor rots and wounds refuse to close. The blight seems to wear its face.', where: 'the witherfen, where the blight pools' },
  hexmoth:    { rumor: 'Its dust settles on you like a mark — and everything that strikes you after bites deeper.', where: 'the spore-choked dark' },
};

// ── Hunting grounds — WHERE you push biases WHO you draw out (directed farming). ──
// The world is concentric rings (outer → inner = stronger, deeper, newer types). Each
// ground leans toward one Type-cluster's creatures; clearing the ring while hunting it
// makes those creatures far likelier to be the one you catch — but never hard-locks, so
// any uncaught grunling can still appear. Ordered outer (gentle) → inner (the deep).
// `depth` (1 = outer/gentle → 8 = the deep) scales the run the ring sends you on:
// enemies are the ring's own locals, stat-scaled by depth (see wavesForGround). Outer
// rings are an auto-able warm-up for little slag/Cores; the deep is a real wall worth more.
const HUNTING_GROUNDS = [
  { id: 'outer-ring',  name: 'The Crackling Outer Ring', tag: 'outer ring',     depth: 1, boss: 'The Cinder Maw',  biasIds: ['fizzpop', 'glowtail', 'cinderpaw'] },
  { id: 'fallen-gate', name: 'The Fallen Gate',          tag: 'the ruined gate', depth: 2, boss: 'The Gatebreaker', biasIds: ['stoneward', 'ironwall'] },
  { id: 'green-seam',  name: 'The Green Seam',           tag: 'between the rings', depth: 3, boss: 'The Old Grove',  biasIds: ['mossback', 'dewleaf'] },
  { id: 'storm-wire',  name: 'Storm-Wire Thickets',      tag: 'the storm-wire',  depth: 4, boss: 'The Live Wire',   biasIds: ['buzzline', 'tanglewing'] },
  { id: 'fast-trails', name: 'The Fast Trails',          tag: 'the narrow trails', depth: 5, boss: 'The Blur',       biasIds: ['swiftpaw', 'dartwing'] },
  { id: 'lightless',   name: 'The Lightless Deep',       tag: 'past the Warden', depth: 6, boss: 'The Throat-Cutter', biasIds: ['shadefang', 'veilclaw'] },
  { id: 'witherfen',   name: 'The Witherfen',            tag: 'where the blight pools', depth: 7, boss: 'The Blight-Heart', biasIds: ['blightcap', 'hexmoth'] },
  { id: 'frostbound',  name: 'The Frostbound Deep',      tag: 'far inward, near the Drop', depth: 8, boss: 'The Stillness', biasIds: ['frostwarden', 'rimecaller'] },
];
const GROUND_BY_ID = Object.fromEntries(HUNTING_GROUNDS.map((g) => [g.id, g]));
const GROUND_KEY = '8gents_seam_ground';

// ── THE SPINE (vF-Z): crossing into a ring is a moment, not a menu. Each ring gets a
// threshold beat — the feel of the PLACE, deepening toward the Drop. Shown when you
// step in (the upgrade screen, wave 0). These are about the land; the Holdfast beats
// are about home. Together they give the climb a story that points somewhere.
const RING_INTRO = {
  'outer-ring': 'The rim. Embers drift up from the cracks like the ground is breathing. Easy country — but it\'s the last place the air still feels clean.',
  'fallen-gate': 'They built a gate to hold the blight out. It fell. You climb over what\'s left of it, and nobody\'s rebuilt it in your lifetime.',
  'green-seam': 'A seam of green between the rings, where things still grow — just wrong. Too bright. Too eager. Your grunlings\' cores hum louder here.',
  'storm-wire': 'Old power-lines run inward, still live after seventy-five years, singing in the wind. Whatever fell never cut the current.',
  'fast-trails': 'The trails narrow and quicken. This is as far as most ever come back from. Past here, the maps your mentor left just say: careful.',
  'lightless': 'Past the Warden the light gives out. You go by the glow of your own grunlings\' hearts. Something down here remembers being looked at.',
  'witherfen': 'The blight stops spreading and starts pooling — thick, patient, almost peaceful. You\'re close now. You can feel it deciding whether to let you by.',
  'frostbound': 'Everything goes still and cold and clear. The rings end ahead. And past the last of them, faint and steady, something is waiting at the Drop.',
};

// ── Tiers: ring depth IS character tier. Deeper ring = higher tier = a STRONGER
// creature (Foundation 1-3 / Specialist 4-6 / Apex 7-8). Higher tiers are both much
// harder to reach (strict inward unlock + steep depth scaling) AND straight-up better
// (a player-side power multiplier), so there's a real pull to fight inward and switch
// to them. The multiplier is player-only (enemies/goldens never read it).
const GROUND_OF_CREATURE = {};
HUNTING_GROUNDS.forEach((g) => g.biasIds.forEach((id) => { GROUND_OF_CREATURE[id] = g; }));

// ── RARITY is the ONE power/collection axis (Sky, locked): Common → Rare → Legendary →
// Unique. It replaces the old depth-tier — a creature's grade sets BOTH how strong it is
// (player-side mult) AND how it's acquired (pull weight, or challenge for Uniques). Rings
// still gate ACCESS + difficulty by depth; deeper rings just hold richer creatures. The
// mult is player-only (enemies/goldens never read it → byte-identical).
const RARITY_OF = {
  fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary',
  stoneward: 'Common', ironwall: 'Rare',
  mossback: 'Common', dewleaf: 'Rare',
  buzzline: 'Common', tanglewing: 'Rare',
  swiftpaw: 'Rare', dartwing: 'Legendary',
  shadefang: 'Rare', veilclaw: 'Legendary',
  blightcap: 'Legendary', hexmoth: 'Unique',
  frostwarden: 'Legendary', rimecaller: 'Unique',
};
const RARITY_INFO = {
  Common:    { mult: 1.0,  weight: 60, color: '#9a9aae', pips: '●',   dupeCores: 15,  startCores: 0 },
  Rare:      { mult: 1.2,  weight: 28, color: '#7ec8ff', pips: '◆',   dupeCores: 40,  startCores: 20 },
  Legendary: { mult: 1.45, weight: 10, color: '#ffd166', pips: '★',   dupeCores: 120, startCores: 60 },
  Unique:    { mult: 1.7,  weight: 0,  color: '#ff7ad9', pips: '✦',   dupeCores: 300, startCores: 120 },
};
const rarityOf = (id) => RARITY_OF[id] || 'Common';
const rarityMult = (id) => RARITY_INFO[rarityOf(id)].mult;
const PITY_AT = 15; // a Legendary is guaranteed by this many pulls without one

// ── Strict inward progression: you start at the outer ring and earn your way in —
// beating a ring's boss opens the next ring (and its higher tier) inward. Persist the
// deepest ring unlocked (1..8). The beta switch can fast-forward this for testing.
const UNLOCKED_KEY = '8gents_seam_unlocked';
function loadUnlocked() {
  try { const n = parseInt(localStorage.getItem(UNLOCKED_KEY), 10); return Number.isFinite(n) ? Math.min(8, Math.max(1, n)) : 1; }
  catch { return 1; }
}
function saveUnlocked(n) { try { localStorage.setItem(UNLOCKED_KEY, String(n)); } catch { /* best-effort */ } }

// ── THE HOLDFAST: the home you return to between runs — your mentor's place at the
// rim, half-swallowed by the blight. It RECLAIMS one stage each time you beat a ring's
// boss for the first time (so reclaim depth = deepest ring boss ever beaten, 1..8). Each
// stage heals a part of the home, drips a fragment of the story (mentor's voice / the
// blight's truth), and grants ONE standing boon. The boons funnel through the same run
// mods as perks — opt-in, so combat goldens stay byte-identical. Stage 8 = you stand at
// the Drop itself: the destination the whole climb points toward.
const HOLDFAST_STAGES = [
  { depth: 1, part: 'The Hearth',        boon: { icon: '🔥', name: 'Hearthlight',  desc: '+8% max HP, every run.',                  apply: (m) => { m.hpMult *= 1.08; } },
    beat: '"You lit it. Good." His voice, first night home. "A holdfast with a cold hearth is just a grave with walls." Three cores he left you, humming on the mantel.' },
  { depth: 2, part: 'The Storeroom',     boon: { icon: '🌿', name: 'Full Stores',  desc: 'Healing is 25% stronger, every run.',     apply: (m) => { m.healMult *= 1.25; } },
    beat: 'Behind the fallen gate, his old caches — dried feed, spare core-casings. "Never raid hungry," he used to say. "The blight\'s got nothing but time. Don\'t you forget it."' },
  { depth: 3, part: 'The Drill-Yard',    boon: { icon: '⚔️', name: 'Old Drills',   desc: '+8% squad damage, every run.',            apply: (m) => { m.dmgMult *= 1.08; } },
    beat: 'The green seam, where things still grow wrong. He drilled his grunlings here. "Grown, not made — earth and old machine. That glow in their chest is the heart. Mind it."' },
  { depth: 4, part: "The Menders' Well", boon: { icon: '💧', name: 'Clean Water',  desc: '+6% max HP, every run.',                  apply: (m) => { m.hpMult *= 1.06; } },
    beat: 'The well still runs clean — the one thing the blight never fouled. "It fell seventy-five years back," he told you once. "Out of a clear sky. We\'ve called it the Drop ever since."' },
  { depth: 5, part: 'The Watchtower',    boon: { icon: '⚡', name: 'The Watch',    desc: 'One grunling starts each run already Primed.', apply: (m) => { m.chargeStart += 2; } },
    beat: 'From the tower you can finally see inward — ring on ring, closing like a wound. "He went in," says the wind, or memory. "Past the fifth. Came back wrong. Then went in again."' },
  { depth: 6, part: 'The Deep Cellar',   boon: { icon: '🗡️', name: 'Cold Edge',    desc: '+8% squad damage, every run.',            apply: (m) => { m.dmgMult *= 1.08; } },
    beat: "Past the Warden, the cold gets honest. You understand now why he kept climbing. Down here the blight isn't spreading. It's remembering — and it remembers you." },
  { depth: 7, part: 'The Map-Room',      boon: { icon: '❤️', name: "Hunter's Heart", desc: '+6% max HP, every run.',                 apply: (m) => { m.hpMult *= 1.06; } },
    beat: 'His last map — every ring marked, annotated, crossed out. Except the center. By the Drop he\'d written one word, twice: "Not it. Not it."' },
  { depth: 8, part: "The Drop's Edge",   boon: { icon: '✦', name: "The Drop's Edge", desc: '+10% damage AND +10% max HP, every run.', apply: (m) => { m.dmgMult *= 1.10; m.hpMult *= 1.10; } },
    beat: "Frostbound. The rings end. You stand where he stood. The Drop isn't a crater — it's a door, and it's been open the whole time, waiting on someone to come the rest of the way." },
];
const HOLDFAST_MAX = HOLDFAST_STAGES.length; // 8 — reaching the Drop
const stageAtDepth = (d) => HOLDFAST_STAGES.find((s) => s.depth === d) || null;
const HOLDFAST_KEY = '8gents_seam_holdfast'; // deepest ring boss ever beaten (0..8) = reclaim depth
function loadReclaimed() { try { const n = parseInt(localStorage.getItem(HOLDFAST_KEY), 10); return Number.isFinite(n) ? Math.min(HOLDFAST_MAX, Math.max(0, n)) : 0; } catch { return 0; } }
function saveReclaimed(n) { try { localStorage.setItem(HOLDFAST_KEY, String(n)); } catch { /* best-effort */ } }
// Fold every reclaimed stage's standing boon into a run's opening mods (mutates m).
function holdfastMods(reclaimed, m) { HOLDFAST_STAGES.forEach((s) => { if (s.depth <= reclaimed) s.boon.apply(m); }); }

// ── Beta / test switch. Fast-forwards content (unlocks every ring + grant buttons) so
// the deep game can be tested from the start; toggle it OFF to play the real gated build.
// Flip BETA_AVAILABLE to false to strip the panel entirely from a public deploy.
const BETA_AVAILABLE = true;
const BETA_KEY = '8gents_seam_beta';
function loadBeta() { try { return localStorage.getItem(BETA_KEY) === '1'; } catch { return false; } }
function saveBeta(b) { try { localStorage.setItem(BETA_KEY, b ? '1' : '0'); } catch { /* best-effort */ } }

// The ground you can actually run: the chosen ring if it's unlocked, else the deepest
// ring you've earned. Keeps a stale/locked selection from sending you somewhere barred.
function accessibleGround(groundId, accessDepth) {
  const g = GROUND_BY_ID[groundId];
  if (g && g.depth <= accessDepth) return g;
  return HUNTING_GROUNDS.filter((x) => x.depth <= accessDepth).sort((a, b) => b.depth - a.depth)[0] || HUNTING_GROUNDS[0];
}
function loadGround() {
  try { const id = localStorage.getItem(GROUND_KEY); return GROUND_BY_ID[id] ? id : HUNTING_GROUNDS[0].id; }
  catch { return HUNTING_GROUNDS[0].id; }
}
function saveGround(id) { try { localStorage.setItem(GROUND_KEY, id); } catch { /* best-effort */ } }

// ── Tiering & gather-to-recruit (§ master-plan items 3+4). ──
// The deepest rings hold APEX creatures — they are NOT drawn from a normal clear.
// Hunting their ring drops a SIGIL toward one of them; collect enough and you can
// CHALLENGE it in a dedicated fight — beat it to recruit (catch-by-defeat). Commons
// (everything else) stay clear-caught as before.
// APEX = the Uniques — the rarest grade, won by CHALLENGE (sigils), never pulled.
const APEX_IDS = new Set(Object.keys(RARITY_OF).filter((id) => RARITY_OF[id] === 'Unique'));
const isApex = (id) => APEX_IDS.has(id);
const APEX_SIGILS = 3; // sigils needed before a Unique can be challenged
const SIGILS_KEY = '8gents_seam_sigils';
function loadSigils() { try { return JSON.parse(localStorage.getItem(SIGILS_KEY) || '{}') || {}; } catch { return {}; } }
function saveSigils(m) { try { localStorage.setItem(SIGILS_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
const PITY_KEY = '8gents_seam_pity'; // pulls since the last Legendary (drives the pity guarantee)
function loadPity() { try { const n = parseInt(localStorage.getItem(PITY_KEY), 10); return Number.isFinite(n) ? n : 0; } catch { return 0; } }
function savePity(n) { try { localStorage.setItem(PITY_KEY, String(n)); } catch { /* best-effort */ } }

// Which apex creature a clear of this ring drops a sigil toward: an uncaught, not-yet-
// challengeable apex in the hunted ring, fewest sigils first (focus one at a time), then
// ring order. Returns its id, or null if the ring has no apex still being gathered.
function sigilTarget(ground, stableIds, sigils) {
  if (!ground) return null;
  const pool = ground.biasIds.filter(
    (id) => isApex(id) && !stableIds.includes(id) && (sigils[id] || 0) < APEX_SIGILS
  );
  if (pool.length === 0) return null;
  return pool.slice().sort((a, b) => (sigils[a] || 0) - (sigils[b] || 0))[0];
}

// A weighted PULL from the ring you raided — the "Summoners-War scroll." The pool is the
// ring's own locals (reachable, non-Unique — Uniques are challenge-won), weighted by
// rarity: Commons fall often, Legendaries rarely. OWNED creatures stay in the pool, so a
// repeat is a dupe (which melts to Cores, never wasted). `pity` = pulls since the last
// Legendary; at PITY_AT the Legendary is guaranteed. Returns { id, rarity, isDupe } | null.
function pullFrom(ground, stableIds, accessDepth, pity = 0, rand = Math.random) {
  if (!ground) return null;
  const pool = ground.biasIds.filter((id) => !isApex(id) && (GROUND_OF_CREATURE[id]?.depth ?? 1) <= accessDepth);
  if (pool.length === 0) return null;
  const leg = pool.find((x) => rarityOf(x) === 'Legendary');
  let id;
  if (leg && pity >= PITY_AT) id = leg; // pity: guarantee the Legendary
  else {
    const w = pool.map((x) => RARITY_INFO[rarityOf(x)].weight || 1);
    let roll = rand() * w.reduce((s, x) => s + x, 0);
    id = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { roll -= w[i]; if (roll < 0) { id = pool[i]; break; } }
  }
  return { id, rarity: rarityOf(id), isDupe: stableIds.includes(id) };
}

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

// ── The climb inward (vF-O): the RING you hunt builds the run. Four waves — a fast
// easy→hard ramp, then the ring's boss — fielding the ring's own LOCALS (its biasIds,
// so a Warden ring fights Wardens that freeze you, a Hexer ring fights curses), with
// HP/ATK scaled by the ring's depth. Outer rings (depth 1) are a gentle, auto-able
// warm-up; the Frostbound Deep (depth 8) is a real wall auto can't faceroll. Stats are
// per-wave ROLE values × depth — NOT the roster base — so fights stay short and punchy
// and the curve is controllable. SeamLab-only; the goldens use untouched roster stats.
// Difficulty dials (vF-S pass — the starter trio was smashing everything). ATK is the
// lever that actually threatens the squad (low enemy ATK = nobody dies = trivial), so
// it's bumped hardest, with a steeper depth curve. All one-line, feel-check freely.
// Difficulty dials (vF-W pass — base starters were still clearing without upgrades). The
// curve is steeper now (so deep rings are a real wall) and the base bumped so even the
// outer ring makes you sweat — though it stays beatable, since you bootstrap your first
// Cores there. Paired with a smaller between-wave patch-up so damage actually accrues.
// FRONT-LOAD pass (vF-AC — Sky: "rings 3-4 weren't difficult, 5 was"). The old curve was
// LINEAR, so the squad outgrew the soft mid before the deep rings caught up. These are now
// CONCAVE (diminishing): the biggest per-ring jump lands EARLY, so rings 2-4 bite while
// the depth-1 bootstrap (×1.0) and the depth-8 wall (≈×2.5 HP / ×2.2 ATK) stay put. ATK is
// the lever that actually threatens the squad, so it's front-loaded hardest. Feel-check freely.
const D_HP = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;  // d1 ×1.0, d3 ×1.61, d4 ×1.87, d8 ×2.55
const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2; // d1 ×1.0, d3 ×1.53, d4 ×1.74, d8 ×2.22
function foe(id, temperament, roleHp, roleAtk, depth, extra = {}) {
  const hp = Math.round(roleHp * D_HP(depth));
  return { ...makeUnitDef(id, temperament), hp, maxHp: hp, atk: Math.round(roleAtk * D_ATK(depth)), ...extra };
}
// Generate a run's four waves from the chosen ring. Enemy IDENTITY (kit/behavior) comes
// from the ring's locals; HP/ATK come from the wave role scaled by depth.
function wavesForGround(g) {
  const d = g.depth, pool = g.biasIds, at = (i) => pool[i % pool.length];
  return [
    { name: 'Scouts', seed: 101, blurb: `The edge of ${g.name} — a jumpy pair. Warm up, hit fast.`,
      enemies: () => [ foe(at(0), 'Cautious', 110, 26, d), foe(at(1), 'Cautious', 105, 26, d) ] },
    { name: 'The Pack', seed: 202, blurb: 'Deeper in — three of the locals, and they hit back hard.',
      enemies: () => [ foe(at(0), 'Balanced', 175, 40, d), foe(at(1), 'Balanced', 175, 38, d), foe(at(2), 'Balanced', 165, 40, d) ] },
    { name: 'The Pack-Lord', seed: 303, blurb: 'The two meanest things in here, paired up. Break through.',
      enemies: () => [ foe(at(0), 'Greedy', 300, 50, d), foe(at(1), 'Greedy', 220, 62, d) ] },
    { name: g.boss, boss: true, seed: 404,
      blurb: `The heart of ${g.name} — and something keeps it standing. Race it down, or cut the tender first.`,
      enemies: () => [ foe(at(0), 'Greedy', 540, 68, d, { name: g.boss, speed: 7 }), foe('mossback', 'Balanced', 240, 24, d, { name: 'Tender' }) ] },
  ];
}
const WAVE_COUNT = 4; // every generated run is four waves (used for progress display)

// ── WAYSIDE EVENTS (vF-AB) — not every step is a fight. Between non-boss waves the
// trail sometimes offers a CHOICE: a flavored situation + 2-3 options with real stakes
// (Cores / slag / HP / a run-buff / a primed start). Each choice's `apply(ctx)` runs the
// effect and returns the outcome line to show. ctx is built in RunMode with the live
// setters. Gambles read ctx.rng(). Pure run-meta — never touches the combat engine.
const WAYSIDE_EVENTS = [
  { id: 'cache', glyph: '🜲', tint: '#7ec88a', title: 'The Blighted Cache',
    text: 'A sealed core-casing lies half-eaten by rot at the trailside. Something inside it still hums, faintly.',
    choices: [
      { label: 'Pry it open', detail: 'Risky — it might bite.', apply: (c) => c.rng() < 0.6 ? (c.cores(24), '✦ It splits open — old Cores spill into your hands. +24 ⬡ to the squad.') : (c.hurt(0.18), '🜲 The rot bites back. The squad takes a hit prying it loose.') },
      { label: 'Strip it for slag', detail: 'Safe, smaller.', apply: (c) => (c.slag(25), '⚒ You strip the casing for slag instead. +25 ⚒.') },
    ] },
  { id: 'mender', glyph: '✚', tint: '#9be7c0', title: 'The Wayside Mender',
    text: 'An old healer tends a low fire at the crossfire, humming a tune your mentor used to whistle. She looks up, unsurprised.',
    choices: [
      { label: 'Let her tend the squad', detail: 'Heal up.', apply: (c) => (c.heal(0.4), '✚ Wounds close under her hands. The squad breathes easier.') },
      { label: 'Take her blessing instead', detail: 'Power, not patching.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.12; }), '🔥 She marks your grunlings. +12% damage for the rest of the climb.') },
    ] },
  { id: 'fallen', glyph: '⚰', tint: '#9a9aae', title: 'The Fallen Climber',
    text: 'Someone climbed this far and no further. Their pack remains, and beside it a grunling’s core, gone cold and grey.',
    choices: [
      { label: 'Take the cold core', detail: 'Wake it for the next fight.', apply: (c) => (c.cores(18), c.prime(2), '⚡ You coax a last spark from it — Cores banked, and a grunling starts the next fight Primed.') },
      { label: 'Bury them, take the rations', detail: 'Rest and supplies.', apply: (c) => (c.heal(0.3), c.slag(15), '✚ You do right by them. The squad recovers a little. +15 ⚒.') },
    ] },
  { id: 'whisper', glyph: '👁', tint: '#b06bff', title: 'The Whispering Seam',
    text: 'The blight murmurs as you pass. It knows your name — your mentor’s name. It offers something, the way it must have offered him.',
    choices: [
      { label: 'Listen close', detail: 'It always costs.', apply: (c) => (c.hurt(0.15), c.buff((m) => { m.dmgMult *= 1.2; }), '👁 It costs you blood — but you climb angrier. +20% damage, and some HP gone.') },
      { label: 'Keep your head down', detail: 'Refuse it.', apply: (c) => (c.slag(10), '⚒ You refuse it and keep walking. +10 ⚒ from what you scavenge.') },
    ] },
  { id: 'shrine', glyph: '🔥', tint: '#ffae5a', title: 'The Ember Shrine',
    text: 'A shrine your people raised at the rim, long gone cold. The old wards still hold. You could wake it.',
    choices: [
      { label: 'Stoke the embers', detail: 'Charge up.', apply: (c) => (c.prime(3), '⚡ The shrine flares. Your grunlings start the next fight well Primed.') },
      { label: 'Leave an offering', detail: 'For luck and Cores.', apply: (c) => (c.cores(30), '✦ You leave what you can. The old wards answer. +30 ⬡ to the squad.') },
    ] },
  { id: 'fork', glyph: '⋔', tint: '#7ec8ff', title: 'The Forked Trail',
    text: 'The trail splits. One way is short and mean, scraping along a live seam; the other long and quiet, the slow road around.',
    choices: [
      { label: 'The short, mean way', detail: 'Fast, costly.', apply: (c) => (c.hurt(0.12), c.slag(40), '⚒ Rough going, but you make good time and strip a lot of slag. +40 ⚒, some scrapes.') },
      { label: 'The long, quiet way', detail: 'Slow, restful.', apply: (c) => (c.heal(0.25), '✚ Quiet miles. The squad recovers a little on the long road.') },
    ] },
  { id: 'stillpool', glyph: '💧', tint: '#7fd6ff', title: 'The Stillpool',
    text: 'A pool of clear water sits impossibly still amid the blight, untouched. It looks clean. Out here, that is reason enough to be careful.',
    choices: [
      { label: 'Drink deep', detail: 'A gamble — clean, or tainted?', apply: (c) => c.rng() < 0.65 ? (c.heal(0.5), '💧 It is clean and cold. The squad drinks deep and recovers well.') : (c.hurt(0.1), '🜲 A wrongness under the sweetness. It turns in your gut — a little blight for your trouble.') },
      { label: 'Fill the canteens', detail: 'Cautious, smaller.', apply: (c) => (c.heal(0.2), '✚ You skim only the surface and move on. A small mercy on the climb.') },
    ] },
  { id: 'forge', glyph: '⚙', tint: '#ffae5a', title: 'The Cracked Forge',
    text: 'An old field-forge, cold a long time, its anvil split clean down the middle. There is still salvage in it — or a last fire you could coax up.',
    choices: [
      { label: 'Strip it for slag', detail: 'Tools, plate, scrap.', apply: (c) => (c.slag(38), '⚒ You break it down for everything worth carrying. +38 ⚒.') },
      { label: 'Temper your edges', detail: 'Sharpen the whole squad.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.15; }), '⚔️ You wake one last fire and put an edge on every claw and tooth. +15% damage for the rest of the climb.') },
    ] },
  { id: 'caged', glyph: '🕸', tint: '#9be7c0', title: 'The Caged Thing',
    text: 'Something is tangled in a knot of old live-wire by the path — small, half-grown, still alive. Its little core flickers, weak and afraid.',
    choices: [
      { label: 'Cut it free', detail: 'Kindness has a price out here.', apply: (c) => c.rng() < 0.6 ? (c.cores(20), c.prime(2), '✦ It bolts into the dark — but leaves its gathered Cores at your feet, and one grunling starts the next fight Primed, emboldened.') : (c.hurt(0.18), '🜲 Cornered and terrified, it lashes out as the wire parts. The squad takes a few wounds freeing it.') },
      { label: 'Strip the wire', detail: 'Hard, but sure.', apply: (c) => (c.slag(30), '⚒ You leave it and take the wire. Live copper is worth a lot. +30 ⚒.') },
    ] },
  { id: 'beacon', glyph: '🔆', tint: '#ffd166', title: 'The Watch-Beacon',
    text: 'A signal-post from when the rim still watched the rings — a rusted brazier on a pole. From up here, a fire would be seen all the way home.',
    choices: [
      { label: 'Light it', detail: 'Fight bold; they can see you.', apply: (c) => (c.prime(2), c.buff((m) => { m.dmgMult *= 1.1; }), '🔥 The beacon catches. Knowing home can see the light, the squad climbs bolder — Primed, and +10% damage onward.') },
      { label: 'Take the lamp-oil', detail: 'Slag and a little rest.', apply: (c) => (c.slag(22), c.heal(0.15), '⚒ You drain the old oil and rest a moment in its shelter. +22 ⚒, a little recovered.') },
    ] },
  { id: 'mentorcache', glyph: '📜', tint: '#cba6ff', title: "The Mentor's Cache",
    text: 'A stone cairn, marked the way he marked things. He cached supplies on his own climb — and left this one for whoever came after. For you.',
    choices: [
      { label: 'Take the supplies', detail: 'He thought of you.', apply: (c) => (c.heal(0.35), c.cores(15), '✚ Food, salve, a few banked Cores. The squad recovers, and you feel less alone on the trail. +15 ⬡.') },
      { label: 'Read his last note', detail: 'His climb, sharpened to advice.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.1; m.healMult *= 1.2; }), "📜 Everything he learned going up, in a few hard lines. You climb smarter for it — +10% damage and +20% healing onward.") },
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
  overloadAOE: false, blitzMulti: false, executeHunt: false, braceRegen: false, bloomAll: false, overdriveAll: false,
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
  { id: 'embertrail', scope: 'unit', icon: '🔥', color: BURN,       name: 'Ember Trail',  needsType: 'Reactor',  desc: "ONE creature: Overload also sets the target ablaze (+2 Burn).",    apply: (m) => { m.overloadBurn  += 2; } },
  { id: 'twinstrike', scope: 'unit', icon: '⚔',  color: '#ffd166',  name: 'Twin Strike',  needsType: 'Striker',  desc: "ONE creature: Jab and Flurry each throw +1 extra hit.",            apply: (m) => { m.extraHits     += 1; } },
  { id: 'huntersmark',scope: 'unit', icon: '🗡',  color: '#ff7a9c',  name: "Hunter's Mark",needsType: 'Assassin', desc: "ONE creature: Execute triggers below 60% HP, not 45%.",           apply: (m) => { m.executeWindow += 0.15; } },
  { id: 'aegisreflex',scope: 'unit', icon: '🛡',  color: '#7fd6ff',  name: 'Aegis Reflex', needsType: 'Bulwark',  desc: "ONE creature: Brace shields your WHOLE team, not just itself.",   apply: (m) => { m.braceTeam     = 1; } },
  { id: 'lifebloom',  scope: 'unit', icon: '🌿', color: WIN,        name: 'Lifebloom',    needsType: 'Mender',   desc: "ONE creature: Mend leaves a regen ward on whoever it heals.",     apply: (m) => { m.mendRegen     += 1; } },
  { id: 'powerchord', scope: 'unit', icon: '✦',  color: AMP,        name: 'Power Chord',  needsType: 'Booster',  desc: "ONE creature: Prime amps your WHOLE team, not just the strongest.",apply: (m) => { m.primeTeam     = 1; } },
  // ── Tier-2 chain bends: only offered if the creature already has the tier-1 prereq ──
  { id: 'combustion',  scope: 'unit', icon: '💥', color: BURN,       name: 'Combustion',   needsType: 'Reactor',  chain: 'embertrail',  desc: "ONE creature: Overload erupts across the WHOLE enemy line.",           apply: (m) => { m.overloadAOE   = true; } },
  { id: 'blitzstorm',  scope: 'unit', icon: '⚡', color: '#ffd166',  name: 'Blitz Storm',  needsType: 'Striker',  chain: 'twinstrike',  desc: "ONE creature: Blitz becomes a 3-hit barrage instead of one strike.",   apply: (m) => { m.blitzMulti    = true; } },
  { id: 'bloodhunt',   scope: 'unit', icon: '🩸', color: '#ff7a9c',  name: 'Blood Hunt',   needsType: 'Assassin', chain: 'huntersmark', desc: "ONE creature: Execute auto-hunts the most wounded enemy regardless of target.", apply: (m) => { m.executeHunt = true; } },
  { id: 'ironbastion', scope: 'unit', icon: '✨', color: '#7fd6ff',  name: 'Iron Bastion', needsType: 'Bulwark',  chain: 'aegisreflex', desc: "ONE creature: Brace seeds regen on everyone it shields.",              apply: (m) => { m.braceRegen    = true; } },
  { id: 'fullbloom',   scope: 'unit', icon: '🌸', color: WIN,        name: 'Full Bloom',   needsType: 'Mender',   chain: 'lifebloom',   desc: "ONE creature: Bloom washes over the WHOLE team at once.",             apply: (m) => { m.bloomAll       = true; } },
  { id: 'surge',       scope: 'unit', icon: '⬆️', color: AMP,        name: 'Surge',        needsType: 'Booster',  chain: 'powerchord',  desc: "ONE creature: Overdrive floods ALL allies with Amp, not just the carry.",apply: (m) => { m.overdriveAll  = true; } },
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

// ── RELICS (vF-AE) — the loot chase. Unlike PERKS (bought with slag, gentle always-on)
// these are FOUND: every ring boss drops one. You collect them permanently, then equip a
// LOADOUT of up to RELIC_SLOTS before a run. The point isn't raw power — relics carry
// TRADE-OFFS (glass-cannon, bloodpact), so your equipped three DEFINE a build: go fragile
// and lethal, or slow and unkillable. They funnel through perkBaseMods → the run-wide mod
// channel (same opt-in path as perks/Holdfast), so the engine + goldens stay byte-identical.
const RELICS = [
  // Commons — one clean stat, the bread-and-butter of a loadout.
  { id: 'r_ironwood',  icon: '🌰', color: '#c9a06a', name: 'Ironwood Charm', rarity: 'Common', desc: '+18% max HP.',                       lore: 'Blight-hardened heartwood. Heavy — and it makes you heavy too.',  apply: (m) => { m.hpMult *= 1.18; } },
  { id: 'r_quickcore', icon: '⚡', color: CHG,       name: 'Quick Core',     rarity: 'Common', desc: 'Start every fight +2 charge.',       lore: 'Still warm to the touch. It wants to go.',                       apply: (m) => { m.chargeStart += 2; } },
  { id: 'r_menderknot',icon: '💚', color: WIN,       name: "Mender's Knot",  rarity: 'Common', desc: 'Healing is +50% stronger.',          lore: 'Tied by a healer who climbed these rings before you.',           apply: (m) => { m.healMult *= 1.5; } },
  // Rares — bigger, most with a small second edge.
  { id: 'r_whetfang',   icon: '⚔️', color: '#ff8a4a', name: 'Whetstone Fang', rarity: 'Rare', desc: '+35% damage.',                        lore: 'A tooth filed to an edge that never seems to dull.',             apply: (m) => { m.dmgMult *= 1.35; } },
  { id: 'r_emberbrand', icon: '🔥', color: BURN,      name: 'Ember Brand',    rarity: 'Rare', desc: 'Burns +2 stacks, +10% damage.',       lore: 'It smoulders against the cold of the deep rings.',              apply: (m) => { m.burnBonus += 2; m.dmgMult *= 1.1; } },
  { id: 'r_bulwark',    icon: '🛡️', color: '#7fd6ff', name: 'Bulwark Stone',  rarity: 'Rare', desc: '+30% max HP and +30% shields.',       lore: 'A shard of the Fallen Gate that still remembers holding.',       apply: (m) => { m.hpMult *= 1.3; m.blockMult *= 1.3; } },
  { id: 'r_reckless',   icon: '🩸', color: '#ff6b6b', name: 'Reckless Charm', rarity: 'Rare', desc: '+55% damage, −18% max HP.',           lore: 'Climb angry, climb fast — and mind the long way down.',         apply: (m) => { m.dmgMult *= 1.55; m.hpMult *= 0.82; } },
  // Legendaries — run-defining, with a real trade.
  { id: 'r_bloodpact', icon: '❤️‍🔥', color: '#ff4d6d', name: 'Bloodpact',    rarity: 'Legendary', desc: '+30% damage, +40% healing, −10% HP.', lore: 'What you pour out comes back doubled. Some of you stays behind.', apply: (m) => { m.dmgMult *= 1.3; m.healMult *= 1.4; m.hpMult *= 0.9; } },
  { id: 'r_glassedge', icon: '🗡️', color: '#e8e2ff', name: 'Glass Edge',     rarity: 'Legendary', desc: '+70% damage, −30% max HP.',          lore: 'It cuts through anything. Including the hand that holds it.',     apply: (m) => { m.dmgMult *= 1.7; m.hpMult *= 0.7; } },
  { id: 'r_dropshard', icon: '✦',  color: ACCENT,    name: 'Drop-Shard',     rarity: 'Legendary', desc: '+18% damage, +18% HP, +1 charge.',   lore: 'A splinter of whatever fell. It hums in tune with your cores.',   apply: (m) => { m.dmgMult *= 1.18; m.hpMult *= 1.18; m.chargeStart += 1; } },
  // VERB relics (vF-AF) — not a stat, a RULE. Conditional and build-defining; they hook
  // the shared combat path (opener/apex/shatter) so the whole squad gets the verb.
  { id: 'r_ambush',    icon: '🎯', color: '#ffd166',  name: "Ambusher's Edge",rarity: 'Rare',      desc: 'First hit on a full-HP enemy: +25% damage.', lore: 'Strike before they know you are even there.',                  apply: (m) => { m.opener = true; } },
  { id: 'r_frostbite', icon: '❄️', color: '#7fd6ff',  name: 'Frostbite Charm',rarity: 'Rare',      desc: 'Hits on a FROZEN enemy deal +50%. Pairs with a Warden.',     lore: 'Cold makes a thing brittle. Then you break it.',               apply: (m) => { m.shatter = true; } },
  { id: 'r_totem',     icon: '🐺', color: '#ff7a9c',  name: "Hunter's Totem", rarity: 'Legendary', desc: 'Every kill sharpens that grunling +8% damage — stacks all fight.', lore: 'Blood remembers. The pack grows keener with every fall.',     apply: (m) => { m.apex = true; } },
  { id: 'r_vampiric',  icon: '🩸', color: '#c83a5a',  name: 'Vampiric Edge',  rarity: 'Legendary', desc: 'Heal 15% of all damage you deal.',             lore: 'It takes a little life each time it bites — and gives it to you.', apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.15; } },
  // More stat/trade relics — widen the build space (a healer kit, a berserker kit, tempo).
  { id: 'r_stoneblood',icon: '🪨', color: '#a89070',  name: 'Stoneblood',     rarity: 'Common',    desc: '+22% max HP.',                               lore: 'Slow to bleed, slower to fall.',                              apply: (m) => { m.hpMult *= 1.22; } },
  { id: 'r_wrathcore', icon: '😤', color: '#ff5a3c',  name: 'Wrathcore',      rarity: 'Rare',      desc: '+42% damage, −12% healing.',                 lore: 'All forward. Mending is for after — if there is an after.',    apply: (m) => { m.dmgMult *= 1.42; m.healMult *= 0.88; } },
  { id: 'r_surgeon',   icon: '🧰', color: '#7be0a0',  name: "Surgeon's Kit",  rarity: 'Rare',      desc: '+70% healing, −12% damage.',                 lore: 'Keep everyone standing and the rest sorts itself out.',        apply: (m) => { m.healMult *= 1.7; m.dmgMult *= 0.88; } },
  { id: 'r_frenzy',    icon: '🔆', color: '#ffb84d',  name: 'Frenzy Totem',   rarity: 'Legendary', desc: '+20% damage and start every fight +1 charge.', lore: 'It will not let you wait. Neither will what is coming.',       apply: (m) => { m.dmgMult *= 1.2; m.chargeStart += 1; } },
  { id: 'r_reaper',    icon: '☠️', color: '#c0c0d8',  name: "Reaper's Mark",  rarity: 'Legendary', desc: '+40% damage to enemies already below half HP.', lore: 'Finish what the climb started. Leave nothing standing.',      apply: (m) => { m.executioner = (m.executioner || 0) + 0.4; } },
  { id: 'r_bramble',   icon: '🌵', color: '#7fae5a',  name: 'Bramble Hide',   rarity: 'Rare',      desc: 'Attackers take 25% of their hit straight back.', lore: 'Touch a thornbush and it touches you back.',                  apply: (m) => { m.thorns = (m.thorns || 0) + 0.25; } },
  { id: 'r_phoenix',   icon: '🪶', color: '#ffb84d',  name: 'Phoenix Feather', rarity: 'Legendary', desc: 'Each grunling survives one lethal blow per fight (revives at 30% HP).', lore: 'A single bright feather, warm to the touch. It does not burn — it remembers how to come back.', apply: (m) => { m.phoenix = true; } },
  { id: 'r_reservoir', icon: '🌀', color: CHG,        name: 'Reservoir Core',  rarity: 'Rare',      desc: 'Every kill banks +2 charge on the grunling that landed it.', lore: 'It drinks the last spark of whatever falls to you, and saves it for the next blow.', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
];
const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
const RELIC_SLOTS = 3; // how many you can equip into a run loadout at once
const RELIC_KEY = '8gents_seam_relics';          // owned relic ids (the collection)
const RELIC_LOADOUT_KEY = '8gents_seam_relic_kit'; // equipped subset, capped at RELIC_SLOTS
const RELIC_DROP_WEIGHT = { Common: 50, Rare: 34, Legendary: 16 };
function loadRelics() { try { return JSON.parse(localStorage.getItem(RELIC_KEY) || '[]') || []; } catch { return []; } }
function saveRelics(ids) { try { localStorage.setItem(RELIC_KEY, JSON.stringify(ids)); } catch { /* best-effort */ } }
function loadRelicKit() { try { return JSON.parse(localStorage.getItem(RELIC_LOADOUT_KEY) || '[]') || []; } catch { return []; } }
function saveRelicKit(ids) { try { localStorage.setItem(RELIC_LOADOUT_KEY, JSON.stringify(ids)); } catch { /* best-effort */ } }
// Apply the equipped relic loadout into a run's mod object (opt-in, golden-safe).
function relicMods(equippedIds, m) { (equippedIds || []).forEach((id) => { const r = RELIC_BY_ID[id]; if (r) r.apply(m); }); }
// A ring boss offers a CHOICE of up to n relics — a weighted draw of DISTINCT relics from
// what you don't yet own. You pick one on the won screen. Empty = collection full → slag.
function rollRelicChoices(owned, n = 3) {
  const work = RELICS.filter((r) => !owned.includes(r.id));
  const w = work.map((r) => RELIC_DROP_WEIGHT[r.rarity]);
  const out = [];
  while (out.length < n && work.length) {
    const total = w.reduce((s, x) => s + x, 0);
    let x = Math.random() * total, i = 0;
    for (; i < work.length; i++) { x -= w[i]; if (x <= 0) break; }
    if (i >= work.length) i = work.length - 1;
    out.push(work[i]); work.splice(i, 1); w.splice(i, 1);
  }
  return out;
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
// Build the starting mods for a run from the perks you own AND the Holdfast stages
// you've reclaimed (vs. EMPTY_MODS before). Both are opt-in mods — goldens never set
// them, so combat stays byte-identical.
function perkBaseMods(owned, reclaimed = 0, relicKit = []) {
  const m = { ...EMPTY_MODS };
  PERKS.forEach((p) => { if (owned.includes(p.id)) p.apply(m); });
  holdfastMods(reclaimed, m);
  relicMods(relicKit, m); // equipped relic loadout — found gear, opt-in, golden-safe
  return m;
}

// Slag a run pays out — a full clear banks a lot; a wipe still leaves a little, so
// every run feeds the meta. Loss scales with how far you pushed.
const WIN_SLAG = 100;
const lossSlag = (wavesCleared) => Math.max(5, wavesCleared * 15);
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
// Player creature max HP — scaled by the run's mods AND its TIER (deeper-ring creatures
// are simply tankier; that's the pull to chase them). Tier mult is player-side only.
const maxHpOf = (member, mods) => Math.round(COMBAT_CREATURES[member.id].hp * (mods?.hpMult ?? 1) * rarityMult(member.id));

// ── PERMANENT SKILL TREES (§ progression) — the long game. ─────────────────────
// Each creature carves its OWN tree with Cores (⬡) earned from runs. Per-creature,
// persisted, never resets — this is the accumulation a run leaves behind. Two paths
// are anchored by the shipped bends (now permanent capstones); deeper tiers are
// SEALED and revealed by play, so there's always a goal ahead. Node effects are
// opt-in actor.mods (the same frozen-engine-safe path the run bends use).
const CORES_KEY = '8gents_creature_cores';
const TREE_KEY = '8gents_creature_tree';   // UNLOCKED nodes (permanent — what you've bought)
const EQUIP_KEY = '8gents_creature_equip'; // EQUIPPED nodes (the loadout — a subset, swappable)
// Model B: you UNLOCK nodes permanently with Cores, but only EQUIP a loadout at a time.
// Accumulation never lost; build choice survives forever even on a maxed creature.
// The loadout GROWS with investment: more nodes unlocked → more slots (4 → 8), so deep
// investment keeps raising your POWER, not just your options.
const RANKS_KEY = '8gents_creature_ranks'; // {creatureId: {nodeId: rank}} for repeatable nodes
const slotsForUnlocked = (n) => Math.min(8, 4 + Math.floor((n || 0) / 4));
function loadCores() { try { return JSON.parse(localStorage.getItem(CORES_KEY) || '{}') || {}; } catch { return {}; } }
function saveCores(m) { try { localStorage.setItem(CORES_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
function loadTreeAlloc() { try { return JSON.parse(localStorage.getItem(TREE_KEY) || '{}') || {}; } catch { return {}; } }
function saveTreeAlloc(m) { try { localStorage.setItem(TREE_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
function loadEquip() { try { return JSON.parse(localStorage.getItem(EQUIP_KEY) || '{}') || {}; } catch { return {}; } }
function saveEquip(m) { try { localStorage.setItem(EQUIP_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
function loadRanks() { try { return JSON.parse(localStorage.getItem(RANKS_KEY) || '{}') || {}; } catch { return {}; } }
function saveRanks(m) { try { localStorage.setItem(RANKS_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
const AUTO_KEY = '8gents_seam_auto';
function loadAuto() { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch { return false; } }
function saveAuto(on) { try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch { /* best-effort */ } }
// AUTO playback speed — how many times faster than normal an AUTO fight runs. Only the
// between-action hold is shortened (the engine math is unchanged), so it just fast-forwards
// the show. 1× = watchable, 2× = default, 4× = quick-skip for grinding. Persisted.
const AUTO_SPEEDS = [1, 2, 4];
const AUTO_SPEED_KEY = '8gents_seam_autospeed';
function loadAutoSpeed() { try { const n = parseInt(localStorage.getItem(AUTO_SPEED_KEY), 10); return AUTO_SPEEDS.includes(n) ? n : 2; } catch { return 2; } }
function saveAutoSpeed(n) { try { localStorage.setItem(AUTO_SPEED_KEY, String(n)); } catch { /* best-effort */ } }
// Ambient music toggle — default ON, but only ever sounds after a user gesture (the
// AudioContext stays suspended until then), so nothing autoplays uninvited.
const MUSIC_KEY = '8gents_seam_music';
function loadMusic() { try { return localStorage.getItem(MUSIC_KEY) !== '0'; } catch { return true; } }
function saveMusic(on) { try { localStorage.setItem(MUSIC_KEY, on ? '1' : '0'); } catch { /* best-effort */ } }
// The opening cutscene plays once on a fresh save (no flag), then is re-watchable.
const INTRO_KEY = '8gents_seam_intro';
function introSeen() { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } }
function saveIntroSeen() { try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* best-effort */ } }

// Progressive Cores: a deeper wave pays more, so pushing the climb funds the tree.
// Front-loaded so a build forms FAST early: Scouts→4, Pack→5, Warden→6, King→7+10.
// A full clear ≈ 32 ⬡ per survivor — run one already buys a couple of nodes.
const coresForWave = (idx, isBoss) => (4 + idx) + (isBoss ? 10 : 0);
// Deeper rings pay more Cores; the gentle outer ring pays LESS than before, so easy
// auto-farming no longer floods you (depth 1 → ×0.7, depth 8 → ×2.1).
const depthCoreMult = (depth) => 0.7 + 0.2 * ((depth || 1) - 1);
// Diminishing returns on RE-farming a ring you've already cleared — the first clear pays
// full; repeats taper to a floor, so pushing into a fresh ring always pays more than
// grinding a mastered one. `n` = times this ring was cleared BEFORE this run.
const REPEAT_MULT = [1.0, 0.6, 0.45, 0.35]; // 1st clear, 2nd, 3rd, 4th+
const repeatMult = (n) => REPEAT_MULT[Math.min(n, REPEAT_MULT.length - 1)];
const CLEARS_KEY = '8gents_seam_clears';
function loadClears() { try { return JSON.parse(localStorage.getItem(CLEARS_KEY) || '{}') || {}; } catch { return {}; } }
function saveClears(m) { try { localStorage.setItem(CLEARS_KEY, JSON.stringify(m)); } catch { /* best-effort */ } }
// Your last squad — remembered so it's pre-selected every run (no re-picking each time).
const SQUAD_KEY = '8gents_seam_squad';
function loadSquad() { try { const s = JSON.parse(localStorage.getItem(SQUAD_KEY) || '[]'); return Array.isArray(s) ? s.slice(0, 3) : []; } catch { return []; } }
function saveSquad(ids) { try { localStorage.setItem(SQUAD_KEY, JSON.stringify(ids)); } catch { /* best-effort */ } }
// The saved squad, kept to creatures you still own (a reset/uncatch can't leave a ghost).
function savedSquadIn(stableIds) { return loadSquad().filter((id) => stableIds.includes(id)); }
// A legible difficulty read for a ring's depth — lead with what the player can SEE.
const diffOf = (depth) => depth <= 1 ? { label: 'easy', color: '#7ed321' }
  : depth <= 3 ? { label: 'fair', color: '#9be7ff' }
  : depth <= 6 ? { label: 'hard', color: '#e8a040' }
  : { label: 'brutal', color: '#ff6b6b' };

function emptyTreeMods() {
  return { dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0,
    overloadMult: 1, overloadBurn: 0, overloadAOE: false,
    extraHits: 0, executeWindow: 0, braceTeam: 0, mendRegen: 0, primeTeam: 0,
    braceRegen: false, bloomAll: false, overdriveAll: false, blitzMulti: false, executeHunt: false,
    freezeBonus: 0, nipFreeze: false,
    singularity: false, overloadRefund: false, deathsDoor: false, cull: false, absoluteZero: false, shatter: false,
    doomAll: false, jinxSpread: false,
    // Reactor deep tree (vF-N): PYRE tier 4-5 + the CINDER survival path.
    backdraftBurn: 0, wildfire: false, chargeUpBonus: 0, cinderskin: false, backdraftShield: false, smolder: false, phoenix: false,
    // ── Deep trees for the other 7 Types (vF-N). Every flag is opt-in (off by default);
    // the engine reads each as `actor.mods?.X ?? default`, so a creature with none of
    // these equipped is byte-identical to before and all goldens hold. ──
    // Bulwark — GUARDIAN tier 4-5 + the RETRIBUTION reflect path.
    overbank: false, bastion: false, intercept: false, unbreakable: false,
    spikes: false, heavyHold: false, riposte: false, spite: false, ironMaiden: false,
    // Mender — BLOOM/VERDANT tier 4-5 + the LIFEBOND carry path.
    overgrowth: false, lifesurge: false, symbiosis: false, evergreen: false,
    wellspring: false, cleanse: false, sanctuary: false, channel: false, lifebond: false,
    // Booster — RESONANCE/OVERDRIVE tier 4-5 + the CONDUCTOR tempo path.
    fullHarmony: false, crescendo: false, powerSpike: false, criticalMass: false,
    pull: false, quicken: false, tempoTheft: false, doubleTime: false, maestro: false,
    // Striker — BARRAGE/TEMPO tier 4-5 + the DUELIST single-target path.
    momentum: false, thousandCuts: false, actAgainOnKill: false, blur: false,
    opener: false, markVuln: false, duelStance: false, bloodlust: false,
    // Assassin — BLOODHOUND tier 4-5 + the VENOM poison path.
    packTactics: false, apex: false,
    toxin: false, potent: false, virulence: false, toxicShock: false, plague: false,
    // Warden — RIME tier 4-5 + the BLIZZARD lockdown path.
    whiteout: false, eternalWinter: false,
    hush: false, numb: false, silence: false, brittle: false, timeLock: false,
    // Hexer — CURSE/DECAY tier 4-5 + the DOOM death-sentence path.
    wither: false, hexmaster: false, entropy: false, pandemic: false,
    doomMark: false, hasten: false, deathSentence: false, inevitable: false, armageddon: false };
}

// Trees keyed by Type — every creature of a Type shares the tree SHAPE; allocation is
// per-creature. Reactor is fully authored (Fizzpop's prototype); other Types come next.
const TYPE_TREES = {
  Reactor: {
    blurb: 'Charge and fire. Burn them down over time, blow them up all at once, or learn to outlast the heat.',
    paths: [
      { id: 'pyre', name: 'PYRE', tag: 'burn over time', icon: '🔥', color: BURN, nodes: [
        { id: 'pyre1', tier: 1, cost: 4, costStep: 3, ranks: 2, name: 'Kindling', desc: 'Every burn you apply lands +1 extra stack per rank (max +2).', apply: (m, r) => { m.burnBonus += r; } },
        { id: 'pyre2', tier: 2, cost: 5, costStep: 3, ranks: 3, name: 'Heat',     desc: '+8% damage from all your attacks per rank (max +24%).',     apply: (m, r) => { m.dmgMult *= (1 + 0.08 * r); } },
        { id: 'pyre3', tier: 3, cost: 14, capstone: true, name: 'Ember Trail', desc: 'Overload also sets the target ablaze (+2 burn).',         apply: (m) => { m.overloadBurn += 2; } },
        { id: 'pyre4', tier: 4, cost: 22, name: 'Conflagration', desc: 'Backdraft drenches the whole line in fire (+2 extra Burn to every enemy).', apply: (m) => { m.backdraftBurn += 2; } },
        { id: 'pyre5', tier: 5, cost: 36, keystone: true, name: 'Wildfire Heart', desc: 'Overload stops just doubling burning targets — instead it hits +50% harder for EACH stack of Burn on them. Stack the fire, then detonate.', apply: (m) => { m.wildfire = true; } },
      ] },
      { id: 'deto', name: 'DETONATOR', tag: 'big single blast', icon: '💥', color: '#ff8a4a', nodes: [
        { id: 'deto1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Focus',     desc: '+6% Overload damage per rank (max +18%).',                  apply: (m, r) => { m.overloadMult *= (1 + 0.06 * r); } },
        { id: 'deto2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Capacitor', desc: 'Start every fight with +1 charge banked per rank (max +2).', apply: (m, r) => { m.chargeStart += r; } },
        { id: 'deto3', tier: 3, cost: 14, capstone: true, name: 'Combustion', desc: 'Overload erupts across the whole enemy line.',           apply: (m) => { m.overloadAOE = true; } },
        { id: 'deto4', tier: 4, cost: 22, name: 'Chain Reaction', desc: 'Overload refunds 2 charge whenever it lands a kill.', apply: (m) => { m.overloadRefund = true; } },
        { id: 'deto5', tier: 5, cost: 36, keystone: true, name: 'Singularity', desc: 'Overload hits ~2.5× as hard — but you can no longer use Backdraft.', apply: (m) => { m.singularity = true; } },
      ] },
      { id: 'cinder', name: 'CINDER', tag: 'survive the heat', icon: '🜂', color: WIN, hiddenUntilCapstone: true, nodes: [
        { id: 'cinder1', tier: 1, cost: 4,  name: 'Cinderskin',     desc: 'Charge Up heals you for the chip damage it deals — stay topped up while you build.', apply: (m) => { m.cinderskin = true; } },
        { id: 'cinder2', tier: 2, cost: 8,  name: 'Backdraft Ward', desc: 'Backdraft throws a shield onto you as it vents — blow up and brace at once.', apply: (m) => { m.backdraftShield = true; } },
        { id: 'cinder3', tier: 3, cost: 14, capstone: true, name: 'Smolder', desc: 'Begin every fight with the whole enemy line already smouldering (+2 Burn each).', apply: (m) => { m.smolder = true; } },
        { id: 'cinder4', tier: 4, cost: 22, name: 'Heat Exchange', desc: 'Charge Up builds +1 extra charge — keep the fire fed and never run dry.', apply: (m) => { m.chargeUpBonus += 1; } },
        { id: 'cinder5', tier: 5, cost: 36, keystone: true, name: 'Phoenix', desc: 'The first time you would fall, blaze back to life at 30% HP with a full charge bar.', apply: (m) => { m.phoenix = true; } },
      ] },
    ],
  },

  Bulwark: {
    blurb: 'A wall that charges into shields, not damage. Guard the whole line, knit the team back up, or turn enemy blows against them.',
    paths: [
      { id: 'aegis', name: 'AEGIS', tag: 'shield the team', icon: '🛡', color: '#7fd6ff', nodes: [
        { id: 'aegis1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Reinforce', desc: '+15% to every shield you raise per rank (max +45%).',     apply: (m, r) => { m.blockMult *= (1 + 0.15 * r); } },
        { id: 'aegis2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Hold Fast', desc: 'Start every fight with +1 charge banked per rank (max +2).', apply: (m, r) => { m.chargeStart += r; } },
        { id: 'aegis3', tier: 3, cost: 14, capstone: true, name: 'Aegis Reflex', desc: 'Brace shields your WHOLE team, not just yourself.', apply: (m) => { m.braceTeam = 1; } },
        { id: 'aegis4', tier: 4, cost: 22, name: 'Overbank', desc: 'Aegis also banks a regenerating barrier on the whole team (+1 regen each).', apply: (m) => { m.overbank = true; } },
        { id: 'aegis5', tier: 5, cost: 36, keystone: true, name: 'Bastion Wall', desc: 'Aegis hardens into a Bastion Wall — every shield it raises is +50% stronger.', apply: (m) => { m.bastion = true; } },
      ] },
      { id: 'guard', name: 'GUARDIAN', tag: 'protect the hurt', icon: '🤲', color: '#9ec5ff', nodes: [
        { id: 'guard1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Bracing Chip', desc: '+12% damage from your attacks per rank (max +36%).',        apply: (m, r) => { m.dmgMult *= (1 + 0.12 * r); } },
        { id: 'guard2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Steadfast', desc: 'Start every fight with +1 charge banked per rank (max +2).',    apply: (m, r) => { m.chargeStart += r; } },
        { id: 'guard3', tier: 3, cost: 14, capstone: true, name: 'Iron Bastion', desc: 'Brace seeds regen on everyone it shields.', apply: (m) => { m.braceRegen = true; } },
        { id: 'guard4', tier: 4, cost: 22, name: 'Intercept', desc: 'Brace also slams cover onto your most-wounded ally — take the blow for them.', apply: (m) => { m.intercept = true; } },
        { id: 'guard5', tier: 5, cost: 36, keystone: true, name: 'Unbreakable', desc: 'Allies cannot drop below 1 HP while you still stand.', apply: (m) => { m.unbreakable = true; } },
      ] },
      { id: 'retri', name: 'RETRIBUTION', tag: 'turn blows back', icon: '⚡', color: '#7fd6ff', hiddenUntilCapstone: true, nodes: [
        { id: 'retri1', tier: 1, cost: 4,  name: 'Spikes', desc: 'Allies you shield reflect 15% of the damage their shield eats back at the attacker.', apply: (m) => { m.spikes = true; } },
        { id: 'retri2', tier: 2, cost: 8,  name: 'Heavy Hold', desc: 'Brace chips harder the more block you are already holding (up to ×2).', apply: (m) => { m.heavyHold = true; } },
        { id: 'retri3', tier: 3, cost: 14, capstone: true, name: 'Riposte', desc: 'Your shields counter harder — reflected damage climbs to 30% of what they block.', apply: (m) => { m.riposte = true; } },
        { id: 'retri4', tier: 4, cost: 22, name: 'Spite', desc: 'Reflected damage ignores the attacker’s own shields — it bites straight into HP.', apply: (m) => { m.spite = true; } },
        { id: 'retri5', tier: 5, cost: 36, keystone: true, name: 'Iron Maiden', desc: 'You deal no direct damage — but allies you shield reflect 100% of all damage they block.', apply: (m) => { m.ironMaiden = true; } },
      ] },
    ],
  },

  Mender: {
    blurb: 'Wins by outlasting, not out-damaging. Burst-heal the team, lay down endless regen, or bind your life to a carry.',
    paths: [
      { id: 'bloom', name: 'BLOOM', tag: 'burst heal', icon: '🌸', color: WIN, nodes: [
        { id: 'bloom1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Greenheart', desc: '+15% to all your healing per rank (max +45%).',            apply: (m, r) => { m.healMult *= (1 + 0.15 * r); } },
        { id: 'bloom2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Deep Roots', desc: 'Start every fight with +1 charge banked per rank (max +2).', apply: (m, r) => { m.chargeStart += r; } },
        { id: 'bloom3', tier: 3, cost: 14, capstone: true, name: 'Full Bloom', desc: 'Bloom heals your WHOLE team at once.',       apply: (m) => { m.bloomAll = true; } },
        { id: 'bloom4', tier: 4, cost: 22, name: 'Overgrowth', desc: 'Healing past full pours into a shield instead of being wasted.', apply: (m) => { m.overgrowth = true; } },
        { id: 'bloom5', tier: 5, cost: 36, keystone: true, name: 'Lifesurge', desc: 'Bloom can drag a fallen ally back to life at half HP — once per fight.', apply: (m) => { m.lifesurge = true; } },
      ] },
      { id: 'verdant', name: 'VERDANT', tag: 'heal over time', icon: '🌿', color: '#a6e05a', nodes: [
        { id: 'verdant1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Thornroot', desc: '+12% damage from your attacks per rank (max +36%).',         apply: (m, r) => { m.dmgMult *= (1 + 0.12 * r); } },
        { id: 'verdant2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Patient', desc: 'Start every fight with +1 charge banked per rank (max +2).',     apply: (m, r) => { m.chargeStart += r; } },
        { id: 'verdant3', tier: 3, cost: 14, capstone: true, name: 'Lifebloom', desc: 'Mend leaves a regen ward on whoever it heals.', apply: (m) => { m.mendRegen += 1; } },
        { id: 'verdant4', tier: 4, cost: 22, name: 'Symbiosis', desc: 'Your mending also chips the enemy line — sustain that bites.', apply: (m) => { m.symbiosis = true; } },
        { id: 'verdant5', tier: 5, cost: 36, keystone: true, name: 'Evergreen', desc: 'Your regen never expires — the team is always healing.', apply: (m) => { m.evergreen = true; } },
      ] },
      { id: 'lifebond', name: 'LIFEBOND', tag: 'fuel a carry', icon: '🔗', color: WIN, hiddenUntilCapstone: true, nodes: [
        { id: 'lifebond1', tier: 1, cost: 4,  name: 'Wellspring', desc: 'Mend also gifts 1 charge to the ally it heals — fuel their payoff.', apply: (m) => { m.wellspring = true; } },
        { id: 'lifebond2', tier: 2, cost: 8,  name: 'Cleansing Touch', desc: 'Your heal also strips one debuff (poison/burn/curse/freeze) off the ally.', apply: (m) => { m.cleanse = true; } },
        { id: 'lifebond3', tier: 3, cost: 14, capstone: true, name: 'Sanctuary', desc: 'A healthy ally (above 80% HP) is gifted Amp instead of wasted healing.', apply: (m) => { m.sanctuary = true; } },
        { id: 'lifebond4', tier: 4, cost: 22, name: 'Channel', desc: 'Mend pours 2 charge into the ally it heals — pure fuel for the carry.', apply: (m) => { m.channel = true; } },
        { id: 'lifebond5', tier: 5, cost: 36, keystone: true, name: 'Lifebond', desc: 'You share in every mend — patch yourself for half of whatever you heal an ally.', apply: (m) => { m.lifebond = true; } },
      ] },
    ],
  },

  Booster: {
    blurb: 'Makes someone else hit like a truck. Spread amp across the team, load a single carry, or steal the enemy tempo.',
    paths: [
      { id: 'reso', name: 'RESONANCE', tag: 'amp the team', icon: '✦', color: AMP, nodes: [
        { id: 'reso1', tier: 1, cost: 4, costStep: 4, ranks: 2, name: 'Harmonize', desc: 'Your Amp lands +1 extra stack per rank (max +2).',             apply: (m, r) => { m.ampBonus += r; } },
        { id: 'reso2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Tuning', desc: 'Start every fight with +1 charge banked per rank (max +2).',       apply: (m, r) => { m.chargeStart += r; } },
        { id: 'reso3', tier: 3, cost: 14, capstone: true, name: 'Power Chord', desc: 'Prime amps your WHOLE team, not just the carry.', apply: (m) => { m.primeTeam = 1; } },
        { id: 'reso4', tier: 4, cost: 22, name: 'Full Harmony', desc: 'Your Amp also hardens — every ally it touches gains a small shield.', apply: (m) => { m.fullHarmony = true; } },
        { id: 'reso5', tier: 5, cost: 36, keystone: true, name: 'Crescendo', desc: 'Your Amp never fades — every round the whole team only hits harder.', apply: (m) => { m.crescendo = true; } },
      ] },
      { id: 'odrive', name: 'OVERDRIVE', tag: 'load a carry', icon: '⬆️', color: '#c89bff', nodes: [
        { id: 'odrive1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Live Current', desc: '+12% damage from your attacks per rank (max +36%).',        apply: (m, r) => { m.dmgMult *= (1 + 0.12 * r); } },
        { id: 'odrive2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Capacitor', desc: 'Start every fight with +1 charge banked per rank (max +2).',    apply: (m, r) => { m.chargeStart += r; } },
        { id: 'odrive3', tier: 3, cost: 14, capstone: true, name: 'Surge', desc: 'Overdrive floods ALL allies with Amp, not just one.', apply: (m) => { m.overdriveAll = true; } },
        { id: 'odrive4', tier: 4, cost: 22, name: 'Power Spike', desc: 'The first Overdrive each fight spikes with +2 extra Amp.', apply: (m) => { m.powerSpike = true; } },
        { id: 'odrive5', tier: 5, cost: 36, keystone: true, name: 'Critical Mass', desc: 'Overdrive dumps a FULL bar of Amp onto the carry — feast or famine.', apply: (m) => { m.criticalMass = true; } },
      ] },
      { id: 'cond', name: 'CONDUCTOR', tag: 'steal the tempo', icon: '🎼', color: AMP, hiddenUntilCapstone: true, nodes: [
        { id: 'cond1', tier: 1, cost: 4,  name: 'Pull', desc: "Resonate pulls the carry's strike forward — it also gifts them a charge.", apply: (m) => { m.pull = true; } },
        { id: 'cond2', tier: 2, cost: 8,  name: 'Quicken', desc: 'Prime also nudges the carry +1 charge — get their payoff online sooner.', apply: (m) => { m.quicken = true; } },
        { id: 'cond3', tier: 3, cost: 14, capstone: true, name: 'Tempo Theft', desc: "Overdrive saps 2 charge from the enemy's fastest — steal their tempo.", apply: (m) => { m.tempoTheft = true; } },
        { id: 'cond4', tier: 4, cost: 22, name: 'Double Time', desc: 'Overdrive pours an extra +3 charge into the carry — load them to swing again now.', apply: (m) => { m.doubleTime = true; } },
        { id: 'cond5', tier: 5, cost: 36, keystone: true, name: 'Maestro', desc: 'Every round, gift the carry a free stack of Amp — the band never stops.', apply: (m) => { m.maestro = true; } },
      ] },
    ],
  },

  Striker: {
    blurb: 'Tempo and a thousand small cuts. Pile on extra hits, weaponize moving first, or funnel everything into one target.',
    paths: [
      { id: 'barrage', name: 'BARRAGE', tag: 'extra hits', icon: '⚔', color: '#ffd166', nodes: [
        { id: 'barrage1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Quick Hands', desc: '+10% damage from your attacks per rank (max +30%).',       apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'barrage2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Footwork', desc: 'Start every fight with +1 charge banked per rank (max +2).',    apply: (m, r) => { m.chargeStart += r; } },
        { id: 'barrage3', tier: 3, cost: 14, capstone: true, name: 'Twin Strike', desc: 'Jab and Flurry each throw +1 extra hit.', apply: (m) => { m.extraHits += 1; } },
        { id: 'barrage4', tier: 4, cost: 22, name: 'Momentum', desc: 'Each consecutive hit on the same target lands +5% harder.', apply: (m) => { m.momentum = true; } },
        { id: 'barrage5', tier: 5, cost: 36, keystone: true, name: 'Thousand Cuts', desc: 'Every hit leaves a stacking bleed — single targets melt over time.', apply: (m) => { m.thousandCuts = true; } },
      ] },
      { id: 'tempo', name: 'TEMPO', tag: 'move first', icon: '⚡', color: '#ffe08a', nodes: [
        { id: 'tempo1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Edge', desc: '+10% damage from your attacks per rank (max +30%).',                apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'tempo2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Sprint', desc: 'Start every fight with +1 charge banked per rank (max +2).',        apply: (m, r) => { m.chargeStart += r; } },
        { id: 'tempo3', tier: 3, cost: 14, capstone: true, name: 'Blitz Storm', desc: 'Blitz becomes a 3-hit barrage instead of one strike.', apply: (m) => { m.blitzMulti = true; } },
        { id: 'tempo4', tier: 4, cost: 22, name: 'Quickstep', desc: 'Land a kill and act again this round (once per round).', apply: (m) => { m.actAgainOnKill = true; } },
        { id: 'tempo5', tier: 5, cost: 36, keystone: true, name: 'Blur', desc: 'You always move first, and your opening Blitz of the round bites 50% deeper.', apply: (m) => { m.blur = true; } },
      ] },
      { id: 'duel', name: 'DUELIST', tag: 'one target, dead', icon: '🗡', color: '#ffd166', hiddenUntilCapstone: true, nodes: [
        { id: 'duel1', tier: 1, cost: 4,  name: 'Opener', desc: '+25% damage against a target still at full HP — strike first, strike hardest.', apply: (m) => { m.opener = true; } },
        { id: 'duel2', tier: 2, cost: 8,  name: 'Mark', desc: 'Jab brands the target with a stack of vulnerability — it takes more from everyone.', apply: (m) => { m.markVuln = true; } },
        { id: 'duel3', tier: 3, cost: 14, capstone: true, name: 'Riposte', desc: 'Jab leaves you poised — a guard that reflects 30% of what it blocks.', apply: (m) => { m.duelStance = true; } },
        { id: 'duel4', tier: 4, cost: 22, name: 'Bloodlust', desc: 'A kill patches you up (+10% max HP) and refunds 2 charge — chain the cuts.', apply: (m) => { m.bloodlust = true; } },
        { id: 'duel5', tier: 5, cost: 36, keystone: true, name: 'Sword Saint', desc: 'You funnel everything into the blade — +40% damage on every strike.', apply: (m) => { m.dmgMult *= 1.4; } },
      ] },
    ],
  },

  Assassin: {
    blurb: 'The weaker the prey, the harder you hit. Widen the kill-zone, hunt the wounded automatically, or drown them in poison.',
    paths: [
      { id: 'reaper', name: 'REAPER', tag: 'execute', icon: '🗡', color: '#ff7a9c', nodes: [
        { id: 'reaper1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Killer Instinct', desc: '+10% damage from your attacks per rank (max +30%).', apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'reaper2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Patience', desc: 'Start every fight with +1 charge banked per rank (max +2).',   apply: (m, r) => { m.chargeStart += r; } },
        { id: 'reaper3', tier: 3, cost: 14, capstone: true, name: "Hunter's Mark", desc: 'Execute triggers below 60% HP, not 45%.', apply: (m) => { m.executeWindow += 0.15; } },
        { id: 'reaper4', tier: 4, cost: 22, name: 'Cull', desc: 'A kill refunds full charge — chain executions across the line.', apply: (m) => { m.cull = true; } },
        { id: 'reaper5', tier: 5, cost: 36, keystone: true, name: "Death's Door", desc: 'Instakill anything below 25% HP — but -50% to healthy targets.', apply: (m) => { m.deathsDoor = true; } },
      ] },
      { id: 'hound', name: 'BLOODHOUND', tag: 'hunt the weak', icon: '🩸', color: '#ff9bb5', nodes: [
        { id: 'hound1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Bloodscent', desc: '+10% damage from your attacks per rank (max +30%).',          apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'hound2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Stalk', desc: 'Start every fight with +1 charge banked per rank (max +2).',          apply: (m, r) => { m.chargeStart += r; } },
        { id: 'hound3', tier: 3, cost: 14, capstone: true, name: 'Blood Hunt', desc: 'Execute auto-hunts the most wounded enemy.', apply: (m) => { m.executeHunt = true; } },
        { id: 'hound4', tier: 4, cost: 22, name: 'Pack Tactics', desc: 'An Execute kill brands the next-weakest enemy with vulnerability — line them up.', apply: (m) => { m.packTactics = true; } },
        { id: 'hound5', tier: 5, cost: 36, keystone: true, name: 'Apex', desc: 'Every kill permanently sharpens your blade — +8% damage apiece, for the rest of the run.', apply: (m) => { m.apex = true; } },
      ] },
      { id: 'venom', name: 'VENOM', tag: 'poison everything', icon: '☠', color: '#ff7a9c', hiddenUntilCapstone: true, nodes: [
        { id: 'venom1', tier: 1, cost: 4,  name: 'Toxin', desc: 'Mark and Execute seed a lingering poison that never fades on its own.', apply: (m) => { m.toxin = true; } },
        { id: 'venom2', tier: 2, cost: 8,  name: 'Potent', desc: 'Your poison hits thicker — +1 extra stack on every dose.', apply: (m) => { m.potent = true; } },
        { id: 'venom3', tier: 3, cost: 14, capstone: true, name: 'Virulence', desc: 'An Execute kill spreads poison (+2) to the whole enemy line.', apply: (m) => { m.virulence = true; } },
        { id: 'venom4', tier: 4, cost: 22, name: 'Toxic Shock', desc: 'An Execute kill detonates every poisoned enemy for a burst of its own stacks.', apply: (m) => { m.toxicShock = true; } },
        { id: 'venom5', tier: 5, cost: 36, keystone: true, name: 'Plague', desc: 'You deal NO direct damage — but your poison is heavy, ignores shields, and never fades.', apply: (m) => { m.plague = true; } },
      ] },
    ],
  },

  Warden: {
    blurb: 'Control — charge into freeze, not damage. Lock one threat solid, ice the whole line, or learn to shut their big moves down.',
    paths: [
      { id: 'frost', name: 'FROST', tag: 'lock one solid', icon: '❄', color: '#8fd8ff', nodes: [
        { id: 'frost1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Biting Cold', desc: '+10% damage from your attacks per rank (max +30%).',         apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'frost2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Cold Store', desc: 'Start every fight with +1 charge banked per rank (max +2).',    apply: (m, r) => { m.chargeStart += r; } },
        { id: 'frost3', tier: 3, cost: 14, capstone: true, name: 'Deep Freeze', desc: 'Your freezes last 1 turn longer.',          apply: (m) => { m.freezeBonus += 1; } },
        { id: 'frost4', tier: 4, cost: 22, name: 'Shatter', desc: 'Your hits on a frozen enemy land 50% harder.', apply: (m) => { m.shatter = true; } },
        { id: 'frost5', tier: 5, cost: 36, keystone: true, name: 'Absolute Zero', desc: 'Glaciate freezes for the full 3 turns.', apply: (m) => { m.absoluteZero = true; } },
      ] },
      { id: 'rime', name: 'RIME', tag: 'ice the line', icon: '🌨', color: '#bfeaff', nodes: [
        { id: 'rime1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Frostfall', desc: '+10% damage from your attacks per rank (max +30%).',            apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'rime2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Deep Cold', desc: 'Start every fight with +1 charge banked per rank (max +2).',     apply: (m, r) => { m.chargeStart += r; } },
        { id: 'rime3', tier: 3, cost: 14, capstone: true, name: 'Frostbite', desc: 'Frost Nip also freezes its target — control every turn.', apply: (m) => { m.nipFreeze = true; } },
        { id: 'rime4', tier: 4, cost: 22, name: 'Whiteout', desc: 'Cold Snap hits the whole line twice as hard.', apply: (m) => { m.whiteout = true; } },
        { id: 'rime5', tier: 5, cost: 36, keystone: true, name: 'Eternal Winter', desc: 'Cold Snap freezes the whole line for 2 turns instead of 1.', apply: (m) => { m.eternalWinter = true; } },
      ] },
      { id: 'blizzard', name: 'BLIZZARD', tag: 'shut them down', icon: '🌬', color: '#8fd8ff', hiddenUntilCapstone: true, nodes: [
        { id: 'blizzard1', tier: 1, cost: 4,  name: 'Hush', desc: 'Frost Nip leaves the chilled brittle — +1 vulnerability, so they take more from everyone.', apply: (m) => { m.hush = true; } },
        { id: 'blizzard2', tier: 2, cost: 8,  name: 'Numb', desc: 'Glaciate also locks the enemy beside the target for a turn.', apply: (m) => { m.numb = true; } },
        { id: 'blizzard3', tier: 3, cost: 14, capstone: true, name: 'Silence', desc: 'Your freezes drain the target dry — it cannot build to its payoff.', apply: (m) => { m.silence = true; } },
        { id: 'blizzard4', tier: 4, cost: 22, name: 'Brittle', desc: 'A deep freeze leaves frost shards — a lingering damage-over-time on the frozen.', apply: (m) => { m.brittle = true; } },
        { id: 'blizzard5', tier: 5, cost: 36, keystone: true, name: 'Time Lock', desc: 'Each round, the weakest enemy is caught in stasis — held frozen while you stand.', apply: (m) => { m.timeLock = true; } },
      ] },
    ],
  },

  Hexer: {
    blurb: 'Curse — charge into vulnerability, not raw damage. Make one enemy take far more, spread the curse across the line, or doom them outright.',
    paths: [
      { id: 'curse', name: 'CURSE', tag: 'one heavy curse', icon: '💀', color: '#b06bff', nodes: [
        { id: 'curse1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Ill Omen', desc: '+10% damage from your attacks per rank (max +30%).',           apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'curse2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Patience', desc: 'Start every fight with +1 charge banked per rank (max +2).',      apply: (m, r) => { m.chargeStart += r; } },
        { id: 'curse3', tier: 3, cost: 14, capstone: true, name: 'Spreading Hex', desc: 'Doom curses your WHOLE enemy line, not just one.', apply: (m) => { m.doomAll = true; } },
        { id: 'curse4', tier: 4, cost: 22, name: 'Wither', desc: 'Your curses also seed a creeping rot — cursed enemies take damage-over-time.', apply: (m) => { m.wither = true; } },
        { id: 'curse5', tier: 5, cost: 36, keystone: true, name: 'Hexmaster', desc: 'Your curses run deeper (+1–2 vuln) and Doom hexes the whole enemy line at once.', apply: (m) => { m.hexmaster = true; } },
      ] },
      { id: 'decay', name: 'DECAY', tag: 'spread the rot', icon: '🦠', color: '#c89bff', nodes: [
        { id: 'decay1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Creeping Rot', desc: '+10% damage from your attacks per rank (max +30%).',        apply: (m, r) => { m.dmgMult *= (1 + 0.10 * r); } },
        { id: 'decay2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Steady', desc: 'Start every fight with +1 charge banked per rank (max +2).',        apply: (m, r) => { m.chargeStart += r; } },
        { id: 'decay3', tier: 3, cost: 14, capstone: true, name: 'Contagion', desc: 'Jinx also curses a second enemy — the rot spreads.', apply: (m) => { m.jinxSpread = true; } },
        { id: 'decay4', tier: 4, cost: 22, name: 'Entropy', desc: 'Your curses also strip the enemy’s shield clean off as they land.', apply: (m) => { m.entropy = true; } },
        { id: 'decay5', tier: 5, cost: 36, keystone: true, name: 'Pandemic', desc: 'Doom rots the whole line — every cursed enemy also takes a spreading poison.', apply: (m) => { m.pandemic = true; } },
      ] },
      { id: 'doomp', name: 'DOOM', tag: 'a death sentence', icon: '☠', color: '#b06bff', hiddenUntilCapstone: true, nodes: [
        { id: 'doomp1', tier: 1, cost: 4,  name: 'Mark of Doom', desc: 'Doom brands the target — after a few rounds it detonates for a huge, unblockable burst.', apply: (m) => { m.doomMark = true; } },
        { id: 'doomp2', tier: 2, cost: 8,  name: 'Hasten', desc: 'The doom mark counts down one round faster.', apply: (m) => { m.hasten = true; } },
        { id: 'doomp3', tier: 3, cost: 14, capstone: true, name: 'Death Sentence', desc: 'A doom detonation washes a fresh curse over the rest of the enemy line.', apply: (m) => { m.deathSentence = true; } },
        { id: 'doomp4', tier: 4, cost: 22, name: 'Inevitable', desc: 'Doom marks hit 50% harder — there is no cleanse, no outhealing it.', apply: (m) => { m.inevitable = true; } },
        { id: 'doomp5', tier: 5, cost: 36, keystone: true, name: 'Armageddon', desc: 'Doom brands EVERY enemy at once — the whole line is on a timer.', apply: (m) => { m.armageddon = true; } },
      ] },
    ],
  },
};

// ── Refinement: an INFINITE repeatable node per open path, so there's always a next
// purchase (answers "I ran out of power-ups"). Unlocked once you take the path's
// capstone, then bought again and again — one loadout slot, effect scales with rank,
// cost climbs each rank. A multiplicative stat keeps it useful forever without runaway.
const REFINE_STAT = { // path id → which multiplicative stat its Refinement grows
  deto: 'overloadMult', aegis: 'blockMult', guard: 'blockMult',
  bloom: 'healMult', verdant: 'healMult',
  // everything else sharpens raw damage
};
const REFINE_LABEL = { overloadMult: 'Overload power', blockMult: 'shield strength', healMult: 'healing' };
function applyRefine(m, stat, rank) { if (rank > 0) m[stat] = (m[stat] ?? 1) * Math.pow(1.06, rank); }
function refineCost(node, rank) { return node.baseCost + node.costStep * rank; } // rank = ranks ALREADY bought
// Ranked stat node: cumulative steps (cheap rank-1 entry → higher ceiling). More
// incremental purchases + a deeper Core sink, with no new nodes. `rank` = ranks owned.
function rankedCost(node, rank) { return node.cost + (node.costStep ?? Math.ceil(node.cost / 2)) * rank; }

// Inject one Refinement node at the end of every NON-hidden path (the two open paths
// per Type). Reachable via `requires` = that path's capstone, independent of keystones.
Object.values(TYPE_TREES).forEach((t) => t.paths.forEach((p) => {
  if (p.hiddenUntilCapstone) return;
  const capstone = p.nodes.find((n) => n.capstone);
  const stat = REFINE_STAT[p.id] || 'dmgMult';
  const what = REFINE_LABEL[stat] || 'damage';
  p.nodes.push({
    id: `${p.id}_refine`, tier: 6, repeatable: true, refineStat: stat,
    baseCost: 10, costStep: 6, requires: capstone ? capstone.id : undefined,
    name: 'Refinement', desc: `+6% ${what} per rank. Buy it again and again — one slot, grows forever.`,
  });
}));

// Flat node lookup + per-creature helpers.
const NODE_BY_ID = {};
Object.values(TYPE_TREES).forEach((t) => t.paths.forEach((p) => p.nodes.forEach((n) => { NODE_BY_ID[n.id] = { ...n, pathId: p.id }; })));
const treeForCreature = (id) => TYPE_TREES[COMBAT_CREATURES[id]?.type] ?? null;
// Combat reads only the EQUIPPED loadout. Normal nodes apply(); repeatable Refinement
// nodes scale by their rank (from the ranks map).
function treeModsFor(id, equipMap, ranksMap) {
  const active = (equipMap?.[id]) ?? [];
  const ranks = (ranksMap?.[id]) ?? {};
  const m = emptyTreeMods();
  active.forEach((nid) => {
    const n = NODE_BY_ID[nid];
    if (!n) return;
    if (n.repeatable) applyRefine(m, n.refineStat, ranks[nid] || 0);
    else if (n.ranks) { if (n.apply) n.apply(m, ranks[nid] || 1); } // ranked node: effect scales by rank
    else if (n.apply) n.apply(m);
  });
  return m;
}

// A player creature carried through a run: wounds persist (separate maxHp), and the
// run's upgrade mods + Primed starting charge are baked onto the unit def.
// Squad-wide flat buffs come from `squadMods`; move-bends come from `member.unitMods`
// so each creature can have its own signature build.
function playerDef(member, squadMods, perm) {
  const base = COMBAT_CREATURES[member.id];
  const maxHp = maxHpOf(member, squadMods);
  const u = member.unitMods ?? EMPTY_UNIT_MODS;
  const p = perm ?? emptyTreeMods(); // permanent skill-tree mods for THIS creature
  return {
    ...base, temperament: 'Balanced', maxHp, hp: Math.min(member.hp, maxHp),
    atk: Math.round(base.atk * rarityMult(member.id)), // higher-tier creatures also hit harder
    charge: Math.min(base.maxCharge ?? 6, (squadMods?.chargeStart ?? 0) + (p.chargeStart ?? 0)),
    mods: {
      // Every permanent tree flag passes straight through (the deep-tree opt-ins read by
      // the engine). The blended squad×tree keys below then OVERRIDE the ones that also
      // take a squad-wide / per-unit contribution — order matters, so they come last.
      ...p,
      // squad-wide flat buffs × permanent tree:
      dmgMult:   (squadMods?.dmgMult   ?? 1) * (p.dmgMult   ?? 1),
      healMult:  (squadMods?.healMult  ?? 1) * (p.healMult  ?? 1),
      blockMult: (squadMods?.blockMult ?? 1) * (p.blockMult ?? 1),
      burnBonus: (squadMods?.burnBonus ?? 0) + (p.burnBonus ?? 0),
      ampBonus:  (squadMods?.ampBonus  ?? 0) + (p.ampBonus  ?? 0),
      overloadMult: (p.overloadMult ?? 1), // tree-only for now
      freezeBonus: (p.freezeBonus ?? 0),   // Warden tree — extends freezes
      nipFreeze:   p.nipFreeze || false,   // Warden tree — builder also freezes
      // Reactor deep tree (vF-N):
      backdraftBurn:   (p.backdraftBurn ?? 0),
      chargeUpBonus:   (p.chargeUpBonus ?? 0),
      wildfire:        p.wildfire || false,
      cinderskin:      p.cinderskin || false,
      backdraftShield: p.backdraftShield || false,
      smolder:         p.smolder || false,
      phoenix:         (squadMods?.phoenix || false) || p.phoenix || false, // squad route = "Second Wind" upgrade (vF-AQ)
      // Keystones (deep tree, opt-in flags):
      singularity:    p.singularity    || false,
      overloadRefund: p.overloadRefund || false,
      deathsDoor:     p.deathsDoor     || false,
      cull:           p.cull           || false,
      absoluteZero:   p.absoluteZero   || false,
      // Universal VERB flags — read in the shared combatMath path (dealDamage), so they
      // fire for ANY creature. OR'd with the tree value AND the run-wide channel, which
      // lets a RELIC grant the verb squad-wide (vF-AF). Goldens never set squadMods and
      // don't use playerDef, so combat stays byte-identical.
      shatter:        (squadMods?.shatter || false) || p.shatter || false,
      opener:         (squadMods?.opener  || false) || p.opener  || false,
      apex:           (squadMods?.apex    || false) || p.apex    || false,
      lifesteal:      (squadMods?.lifesteal ?? 0) + (p.lifesteal ?? 0), // relic-sourced drain-on-hit
      executioner:    (squadMods?.executioner ?? 0) || (p.executioner ?? 0), // relic — bonus vs low-HP
      thorns:         (squadMods?.thorns ?? 0) || (p.thorns ?? 0),           // relic — reflect when struck
      killCharge:     (squadMods?.killCharge ?? 0) + (p.killCharge ?? 0),     // upgrade — bank charge on a kill
      doomAll:        p.doomAll        || false, // Hexer tree — Doom curses the line
      jinxSpread:     p.jinxSpread     || false, // Hexer tree — Jinx curses a 2nd enemy
      // per-creature bends (run-scoped) + permanent tree, combined:
      extraHits:     (u.extraHits     ?? 0) + (p.extraHits     ?? 0),
      executeWindow: (u.executeWindow ?? 0) + (p.executeWindow ?? 0),
      overloadBurn:  (u.overloadBurn  ?? 0) + (p.overloadBurn  ?? 0),
      mendRegen:     (u.mendRegen     ?? 0) + (p.mendRegen     ?? 0),
      braceTeam:     u.braceTeam   || p.braceTeam   || 0,
      primeTeam:     u.primeTeam   || p.primeTeam   || 0,
      overloadAOE:   u.overloadAOE || p.overloadAOE || false,
      blitzMulti:    u.blitzMulti   || p.blitzMulti   || false,
      executeHunt:   u.executeHunt  || p.executeHunt  || false,
      braceRegen:    u.braceRegen   || p.braceRegen   || false,
      bloomAll:      u.bloomAll     || p.bloomAll     || false,
      overdriveAll:  u.overdriveAll || p.overdriveAll || false,
    },
  };
}

// ── Friendly feed line from a raw engine event (the engine emits pure data). ──
function feedLine(e) {
  if (e.type === 'round-start') return { kind: 'round', text: `Round ${e.round} — ${e.firstSide} side moves first` };
  if (e.type === 'battle-end') return { kind: 'end', text: `${e.winner === 'draw' ? 'Draw' : e.winner + ' wins'} — ${e.rounds} rounds` };
  if (e.type === 'burn') return { kind: 'burn', text: `${e.target.name} burns for ${e.dmg}${e.killed ? ' — KO' : ''} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  if (e.type === 'poison') return { kind: 'burn', text: `☠ ${e.target.name} festers for ${e.dmg}${e.killed ? ' — KO' : ''} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  if (e.type === 'doom') return { kind: 'burn', text: `💀 ${e.target.name}'s doom erupts for ${e.dmg}${e.killed ? ' — KO' : ''}` };
  if (e.type === 'regen') return { kind: 'regen', text: `${e.target.name} regenerates +${e.healed} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  if (e.type === 'frozen') return { kind: 'freeze', text: `❄ ${e.actor.name} is frozen — skips its turn${e.stacksLeft > 0 ? ` (${e.stacksLeft} more)` : ''}` };
  const hits = (e.hits || []).filter((h) => h.dmg > 0 || h.killed).map((h) => `${h.dmg} → ${h.name}${h.killed ? ' (KO)' : ''}`).join(', ');
  const chg = e.chargeBefore !== e.chargeAfter ? ` · charge ${e.chargeBefore}→${e.chargeAfter}` : '';
  const amp = e.amplifiedByBurn ? ' · 🔥×2' : '';
  const shields = (e.shields || []).filter((s) => s.block > 0).map((s) => `🛡${s.block}`).join(' ');
  const heals = (e.heals || []).filter((h) => h.healed > 0).map((h) => `💚${h.healed}→${h.name}`).join(' ');
  const wards = (e.regens || []).length ? `🌿ward ×${e.regens.length}` : '';
  const amps = (e.amps || []).map((a) => `⚡${a.amp}→${a.name}`).join(' ');
  const vulns = (e.vulns || []).length ? `💀curse ×${e.vulns.length}` : '';
  const extra = [shields, heals, wards, amps, vulns].filter(Boolean).join(' · ');
  return { kind: 'turn', side: e.actor.side, text: `${e.actor.name} — ${e.skill.name}${amp}${hits ? `: ${hits}` : ''}${extra ? ` · ${extra}` : ''}${chg}` };
}

function snapshot(state) {
  const map = (u) => ({
    uid: u.uid, name: u.name, side: u.side, spriteId: u.spriteId, type: u.type,
    hp: u.hp, maxHp: u.maxHp, charge: u.charge, maxCharge: u.maxCharge,
    burn: u.statuses.burn || 0, block: u.statuses.block || 0, regen: u.statuses.regen || 0, amp: u.statuses.amp || 0, freeze: u.statuses.freeze || 0, vuln: u.statuses.vuln || 0, alive: u.alive,
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
/* ── The Drop ending ceremony (vF-Z) ── */
@keyframes seam-drop-portal { 0%{transform:scale(.2);opacity:0;box-shadow:0 0 0 0 rgba(176,107,255,0)} 30%{opacity:1} 100%{transform:scale(1);opacity:1;box-shadow:0 0 60px 18px rgba(176,107,255,.5),inset 0 0 50px 8px rgba(232,220,255,.6)} }
@keyframes seam-drop-ring { 0%{transform:translate(-50%,-50%) scale(.3);opacity:0} 18%{opacity:.7} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
@keyframes seam-drop-bloom { 0%{opacity:0} 50%{opacity:0} 78%{opacity:1} 100%{opacity:.85} }
@keyframes seam-mote { 0%{transform:translateY(40px) scale(.4);opacity:0} 20%{opacity:1} 100%{transform:translateY(-220px) scale(.1);opacity:0} }
@keyframes seam-drop-text { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes seam-threshold { 0%{opacity:0;transform:translateY(-6px)} 12%{opacity:1;transform:translateY(0)} 88%{opacity:1} 100%{opacity:.92} }
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
        {/* freeze: a pale ice slab encasing the body + a ❄ — clearly "can't act", over everything */}
        {u.freeze > 0 && !dead && <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%,-50%)', width: size * 1.05, height: size * 1.05, borderRadius: 14, border: '2px solid #cdeeff', background: 'linear-gradient(135deg, #cdeeff33 0%, #8fd8ff55 100%)', boxShadow: '0 0 16px #8fd8ffcc, inset 0 0 20px #cdeeff66', pointerEvents: 'none', zIndex: 7 }} />}
        {u.freeze > 0 && !dead && <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', fontSize: size * 0.34, pointerEvents: 'none', zIndex: 8, textShadow: '0 0 6px #8fd8ff' }}>❄</div>}
        {/* vulnerability (Hexer curse): a creeping violet haze + 💀 — "takes more from everyone" */}
        {u.vuln > 0 && !dead && <div style={{ position: 'absolute', top: '47%', left: '50%', transform: 'translate(-50%,-50%)', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: 'radial-gradient(circle, transparent 50%, #b06bff22 72%, #b06bff55 100%)', boxShadow: 'inset 0 0 18px #b06bff66', pointerEvents: 'none', zIndex: 5 }} />}
        {u.vuln > 0 && !dead && <div style={{ position: 'absolute', top: '6%', right: '12%', fontSize: size * 0.26, pointerEvents: 'none', zIndex: 8, textShadow: '0 0 6px #b06bff' }}>💀</div>}
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
        {u.freeze > 0 && <span style={{ fontSize: T.micro, color: '#8fd8ff', fontWeight: 700 }}>❄{u.freeze}</span>}
        {u.vuln > 0 && <span style={{ fontSize: T.micro, color: '#b06bff', fontWeight: 700 }}>💀{u.vuln}</span>}
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
  const autoRef = useRef(false); // is the AI driving side A right now? (live-switchable mid-fight)
  const aiRef = useRef(createAIDriver()); // persistent AI brain for AUTO / take-over
  const [autoLive, setAutoLive] = useState(false); // mirror of autoRef for the in-battle button
  const speedRef = useRef(loadAutoSpeed()); // AUTO playback speed multiplier (read live in startHold)
  const [autoSpeed, setAutoSpeedState] = useState(speedRef.current);
  function setAutoSpeed(n) { speedRef.current = n; setAutoSpeedState(n); saveAutoSpeed(n); }

  useEffect(() => { if (feedBoxRef.current) feedBoxRef.current.scrollTop = feedBoxRef.current.scrollHeight; }, [feed]);

  // Open a fresh action hold: the next actor-request (either side) awaits this, so the
  // hit animates and input stays locked until the beat passes. AUTO runs ~2× faster.
  function startHold(ms) { holdRef.current = new Promise((r) => setTimeout(r, Math.round(ms * (autoRef.current ? 1 / speedRef.current : 1)))); }

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
    // AUTO drives side A with the AI; MANUAL hands it to you. The SAME driver decides
    // per turn by reading autoRef, so you can flip mid-battle (see setLiveAuto). Holds
    // run ~2× faster while auto. WATCH = instant AI-vs-AI (unchanged).
    autoRef.current = (mode === 'auto');
    const ai = aiRef.current;
    const switchable = {
      async chooseNextActor(pool, st) {
        if (autoRef.current) {
          await holdRef.current;
          if (autoRef.current) return ai.chooseNextActor(pool, st); // re-check: may have flipped during the hold
        }
        return requestActor(pool, st);
      },
      decide(actor, st) { return autoRef.current ? ai.decide(actor, st) : requestDecision(); },
    };
    const drivers = mode === 'watch'
      ? { A: createAIDriver(), B: createAIDriver() }
      : { A: switchable, B: pacedAIDriver(holdRef) };
    runBattle(state, drivers, emit).then((res) => { setPhase('done'); if (onDoneRef.current) onDoneRef.current(res, state); });
  }

  // Flip side A between AI (auto) and you (manual) MID-BATTLE. Turning auto ON while
  // the engine is waiting for your tap resolves that pending turn with an AI move so
  // play resumes immediately; turning it OFF just hands you the next turn.
  function setLiveAuto(on) {
    autoRef.current = on;
    setAutoLive(on);
    if (on && commitRef.current && poolRef.current && battleRef.current) {
      const ai = aiRef.current;
      const actor = ai.chooseNextActor(poolRef.current, battleRef.current);
      const decision = ai.decide(actor, battleRef.current);
      const commit = commitRef.current; commitRef.current = null;
      commit(actor, decision);
    }
  }
  function reset() { setSnap(null); setFeed([]); feedRef.current = []; setPhase('idle'); setPool([]); setPreviewUid(null); setPendingSkill(null); setFx({ actor: null, cast: null, bursts: {}, n: 0 }); setPopups([]); holdRef.current = Promise.resolve(); }

  return { snap, feed, phase, pool, previewUid, pendingSkill, fx, popups, feedBoxRef, previewUnit, chooseSkill, chooseTarget, cancelTarget, previewMoves, begin, reset, setLiveAuto, autoLive, autoSpeed, setAutoSpeed };
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
function FightView({ fight, narrow, banner, bossUid, hintSkill, auto, onToggleAuto }) {
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
  const live = phase !== 'done'; // an active fight — show the in-battle auto/manual switch
  return (
    <div>
      {/* In-battle switch: take over an auto fight, or hand it back. Flips instantly. */}
      {onToggleAuto && live && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button onClick={() => onToggleAuto(!auto)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderRadius: 9, padding: '6px 14px',
              background: auto ? '#14233a' : '#1a1410', border: `2px solid ${auto ? '#5aa9ff' : ACCENT}`,
              color: auto ? '#9be7ff' : ACCENT, fontSize: T.small, fontWeight: 900 }}>
            {auto ? '⚡ AUTO — tap to 🎮 TAKE OVER' : '🎮 MANUAL — tap to ⚡ go AUTO'}
          </button>
          {/* AUTO playback speed — only matters while the AI is driving. Fast-forwards the
              show without touching the engine math. */}
          {auto && fight.setAutoSpeed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0d1622', border: '1px solid #2a3a52', borderRadius: 9, padding: '4px 6px' }}>
              <span style={{ fontSize: T.micro, color: '#6f86a8', fontWeight: 800, marginRight: 2 }}>speed</span>
              {AUTO_SPEEDS.map((s) => (
                <button key={s} onClick={() => fight.setAutoSpeed(s)}
                  style={{ cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: T.micro, fontWeight: 900,
                    background: fight.autoSpeed === s ? '#1f3a5c' : 'transparent',
                    border: `1px solid ${fight.autoSpeed === s ? '#5aa9ff' : 'transparent'}`,
                    color: fight.autoSpeed === s ? '#9be7ff' : '#6f86a8' }}>
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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

// Per-creature Cores earned this run — the permanent progress a run leaves on each
// creature. Spend it on their skill tree from the squad-pick screen.
function CoresBanked({ coresRun }) {
  const ids = Object.keys(coresRun || {}).filter((id) => coresRun[id] > 0);
  if (ids.length === 0) return null;
  return (
    <div style={{ background: '#0c1620', border: `1px solid #2a4a5a`, borderRadius: 10, padding: '9px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: T.micro, color: '#9be7ff', fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>⬡ CORES EARNED — spend on skill paths</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
        {ids.map((id) => {
          const c = COMBAT_CREATURES[id]; const ti = TYPE_INFO[c.type];
          return (
            <span key={id} style={{ fontSize: T.small, fontWeight: 800, color: '#cfe6f2', background: '#0a0f16', border: `1px solid ${ti.accent}44`, borderRadius: 8, padding: '3px 9px' }}>
              {ti.glyph} {c.name} <b style={{ color: '#9be7ff' }}>+{coresRun[id]} ⬡</b>
            </span>
          );
        })}
      </div>
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
        {cell('WAVES', `${stats.waves}/${WAVE_COUNT}`)}
        {cell('DAMAGE DEALT', stats.dmg.toLocaleString())}
        {cell('BIGGEST HIT', stats.biggest)}
        {cell('SURVIVORS', `${survivors}/${squad.length}`)}
      </div>
    </div>
  );
}

// AUTO vs MANUAL toggle — pick who drives YOUR squad this wave. AUTO lets the AI
// fight (paced, ~2× speed) so you blitz content you've mastered; flip to MANUAL for
// the fights that actually need you. This is the auto-battler-with-spikes loop.
function AutoToggle({ auto, setAuto }) {
  const opt = (on, icon, label, sub) => (
    <button onClick={() => setAuto(on)}
      style={{ flex: 1, textAlign: 'center', cursor: 'pointer', borderRadius: 10, padding: '8px 10px',
        background: auto === on ? (on ? '#14233a' : '#1a1410') : PANEL,
        border: `2px solid ${auto === on ? (on ? '#5aa9ff' : ACCENT) : LINE}`, opacity: auto === on ? 1 : 0.7 }}>
      <div style={{ fontSize: T.small, fontWeight: 900, color: auto === on ? (on ? '#9be7ff' : ACCENT) : '#9a9aaa' }}>{icon} {label}</div>
      <div style={{ fontSize: T.micro, color: DIM, marginTop: 1 }}>{sub}</div>
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
      {opt(true, '⚡', 'AUTO', 'AI fights for you')}
      {opt(false, '🎮', 'MANUAL', 'you drive every turn')}
    </div>
  );
}

// ── RingMap — the 8 hunting grounds as concentric rings closing on the Drop. Cleared
// rings glow in their home-Type color; the frontier (deepest unlocked, uncleared) pulses;
// locked rings are dark + dashed. A spiral of Type glyphs marks each ring's identity.
// Tap a reachable ring to select it. Makes the "march inward" something you can see. ──
function RingMap({ accessDepth, selectedId, clears, onSelect }) {
  const C = 160, maxR = 150, minR = 36;
  const step = (maxR - minR) / 7;
  const rings = HUNTING_GROUNDS.map((g) => {
    const r = maxR - (g.depth - 1) * step;
    const locked = g.depth > accessDepth;
    const cleared = !locked && (clears[g.id] || 0) > 0;
    const frontier = !locked && !cleared && g.depth === accessDepth;
    const sel = g.id === selectedId;
    const ti = TYPE_INFO[COMBAT_CREATURES[g.biasIds[0]].type];
    const color = locked ? '#2c2c3a' : cleared ? ti.accent : frontier ? ACCENT : '#5a5a6e';
    const a = (-90 + (g.depth - 1) * 40) * Math.PI / 180;
    return { g, r, locked, cleared, frontier, sel, glyph: ti.glyph, color, gx: C + r * Math.cos(a), gy: C + r * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto 8px' }}>
      <circle cx={C} cy={C} r={maxR + 8} fill="#08080e" stroke="#17171f" />
      {/* the Drop at the heart */}
      <circle cx={C} cy={C} r={17} fill="#150e22" stroke="#6a4a9a" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={6} fill="#b06bff">
        <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <text x={C} y={C + 4} fontSize="7" fill="#d9c2ff" textAnchor="middle" opacity="0.0">·</text>
      {rings.map(({ g, r, locked, cleared, frontier, sel, glyph, color, gx, gy }) => (
        <g key={g.id}>
          <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={sel ? 6 : cleared ? 4 : 3}
            strokeDasharray={locked ? '2 6' : undefined} opacity={locked ? 0.55 : 1} strokeLinecap="round" />
          {sel && <circle cx={C} cy={C} r={r} fill="none" stroke={SEL} strokeWidth="1.4" opacity="0.85" />}
          {/* transparent fat band = easy tap target */}
          <circle cx={C} cy={C} r={r} fill="none" stroke="transparent" strokeWidth={Math.max(13, step)}
            style={{ cursor: locked ? 'default' : 'pointer' }} onClick={() => !locked && onSelect(g.id)} />
          {/* identity badge */}
          <circle cx={gx} cy={gy} r={sel ? 11 : 9} fill="#0b0b14" stroke={sel ? SEL : color} strokeWidth={sel ? 2 : 1.2} opacity={locked ? 0.6 : 1}
            style={{ cursor: locked ? 'default' : 'pointer' }} onClick={() => !locked && onSelect(g.id)} />
          <text x={gx} y={gy} fontSize="10" textAnchor="middle" dominantBaseline="central" opacity={locked ? 0.7 : 1}
            style={{ pointerEvents: 'none' }}>{locked ? '🔒' : glyph}</text>
          {frontier && (
            <circle cx={gx} cy={gy} r="11" fill="none" stroke={ACCENT} strokeWidth="1.5" style={{ pointerEvents: 'none' }}>
              <animate attributeName="r" values="9;16;9" dur="1.7s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur="1.7s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      ))}
      <text x={C} y={313} fontSize="8.5" fill="#5a5a70" textAnchor="middle" letterSpacing="1.5">OUTER RING → THE DROP</text>
    </svg>
  );
}

// ── RUN MODE — squad pick → (upgrade → wave) ×3 → boss, HP carries, win or wipe. ──
function RunMode({ narrow, slag = 0, onSlag }) {
  const fight = useFight();
  const [runPhase, setRunPhase] = useState('pick'); // pick | upgrade | fighting | won | lost
  const [picked, setPicked] = useState(() => savedSquadIn(loadStable())); // creature ids (2–3) — defaults to last squad
  const [squad, setSquad] = useState([]); // [{id, hp}] persistent across waves
  const [waveIdx, setWaveIdx] = useState(0); // the wave about to be fought
  const [runMods, setRunMods] = useState({ ...EMPTY_MODS });
  const [taken, setTaken] = useState([]); // upgrades chosen this run (for the build strip)
  const [offer, setOffer] = useState([]); // 3 upgrade ids on the table now
  const [stats, setStats] = useState({ dmg: 0, biggest: 0, waves: 0 }); // run recap tally
  const [owned, setOwned] = useState(loadPerks); // permanent perks bought with slag
  const [earned, setEarned] = useState(0); // slag this run banked (for the recap)
  const [stable, setStable] = useState(loadStable); // creature IDs you've caught
  const [ground, setGround] = useState(loadGround); // hunting ground — biases who you catch
  const [runWaves, setRunWaves] = useState(() => wavesForGround(GROUND_BY_ID[loadGround()] || HUNTING_GROUNDS[0])); // the ring's run
  const [runDepth, setRunDepth] = useState(() => (GROUND_BY_ID[loadGround()] || HUNTING_GROUNDS[0]).depth); // scales Cores
  const [clears, setClears] = useState(loadClears); // {ringId: times cleared} — diminishing core farm
  const [runRepeat, setRunRepeat] = useState(1); // this run's repeat-clear core multiplier (fixed at start)
  const [sigils, setSigils] = useState(loadSigils); // {apexId: count} — gathered toward a challenge
  const [unlocked, setUnlocked] = useState(loadUnlocked); // deepest ring earned (strict inward)
  const [unlockedNow, setUnlockedNow] = useState(null); // ring depth just opened (won-screen beat)
  const [beta, setBeta] = useState(loadBeta); // test switch — fast-forwards the gate
  const accessDepth = beta ? 8 : unlocked; // the deepest ring you may enter right now
  const [challenge, setChallenge] = useState(null); // apex creature def currently being challenged
  const [reclaimed, setReclaimed] = useState(loadReclaimed); // deepest ring boss ever beaten (0..8) = Holdfast reclaim depth
  const [holdfastNow, setHoldfastNow] = useState(null); // a Holdfast stage just reclaimed this clear (won-screen reveal)
  const [enteredRing, setEnteredRing] = useState(null); // the ring you just stepped into (threshold beat on wave 0)
  const [pendingEvent, setPendingEvent] = useState(null); // a wayside event awaiting a choice (or null)
  const [eventOutcome, setEventOutcome] = useState(null); // the outcome line after a choice is made
  const eventsSeenRef = useRef([]); // event ids already shown THIS run — no repeats within a run
  const [music, setMusic] = useState(loadMusic); // ambient pad on/off (user toggle, persisted)
  const [showIntro, setShowIntro] = useState(() => !introSeen()); // opening cutscene (first launch + replay)
  const [relics, setRelics] = useState(loadRelics);        // owned relic ids (the collection — found from boss clears)
  const [relicKit, setRelicKit] = useState(loadRelicKit);  // equipped relic loadout (subset, capped at RELIC_SLOTS)
  const [relicChoices, setRelicChoices] = useState([]);    // pending boss-drop picks — choose one on the won screen
  const [relicDrop, setRelicDrop] = useState(null);        // the relic you chose this clear (won-screen reveal)
  const [showVault, setShowVault] = useState(false);       // the relic VAULT overlay — the full collection to chase
  // Ambient pad follows the toggle; stays silent until a user gesture resumes audio, and
  // fades out when the SEAM closes. Combat/UI sfx are unaffected by this.
  useEffect(() => { if (music) sfx.startAmbient(); else sfx.stopAmbient(); return () => sfx.stopAmbient(); }, [music]);
  const [sigilGain, setSigilGain] = useState(null); // {id, count, ready} — sigil earned this clear (reveal)
  const [pity, setPity] = useState(loadPity); // pulls since the last Legendary
  const [pullNow, setPullNow] = useState(null); // { id, rarity, isDupe, gainedCores } — this clear's pull
  const [caughtFrom, setCaughtFrom] = useState(null); // the ground it was drawn from (for reveal)
  const [pendingUpgrade, setPendingUpgrade] = useState(null); // unit-scope upgrade awaiting a target pick
  const [targetChoice, setTargetChoice] = useState(null); // who's tentatively selected on the target-pick screen (confirm to commit)
  const [upgradeChoice, setUpgradeChoice] = useState(null); // which upgrade is tentatively selected (confirm to commit)
  const [cores, setCores] = useState(loadCores); // {creatureId: unspent Cores ⬡} — permanent
  const [treeAlloc, setTreeAlloc] = useState(loadTreeAlloc); // {creatureId: [nodeId]} unlocked — permanent
  const [treeEquip, setTreeEquip] = useState(loadEquip); // {creatureId: [nodeId]} equipped loadout
  const [treeRanks, setTreeRanks] = useState(loadRanks); // {creatureId: {nodeId: rank}} for Refinement
  const [treeFor, setTreeFor] = useState(null); // creatureId whose skill tree is open (overlay)
  const [coresRun, setCoresRun] = useState({}); // {creatureId: Cores earned THIS run} for recap
  const [auto, setAutoState] = useState(loadAuto); // AUTO: let the AI fight your squad
  const setAuto = (on) => { setAutoState(on); saveAuto(on); };

  // Perk-driven dials, recomputed from what you own.
  const offerCount = owned.includes('p_foresight') ? 4 : 3;
  const patchup = PATCHUP + (owned.includes('p_medic') ? 0.15 : 0);

  function buyPerk(p) {
    if (owned.includes(p.id) || slag < p.cost || !onSlag) return;
    onSlag(-p.cost);
    const next = [...owned, p.id];
    setOwned(next); savePerks(next);
  }

  // Equip / bench a relic into the run loadout (capped at RELIC_SLOTS). You can only
  // equip relics you own; the equipped set persists and feeds the next run's mods.
  function toggleRelic(id) {
    setRelicKit((cur) => {
      let next;
      if (cur.includes(id)) next = cur.filter((x) => x !== id);
      else if (cur.length >= RELIC_SLOTS) return cur; // loadout full — bench one first
      else next = [...cur, id];
      saveRelicKit(next); sfx.upgradePick(); return next;
    });
  }

  // Take one of the boss-drop relic choices into the permanent collection (won screen).
  function chooseRelic(r) {
    if (!r || relics.includes(r.id)) return;
    const nr = [...relics, r.id]; setRelics(nr); saveRelics(nr);
    setRelicDrop(r); setRelicChoices([]); sfx.caughtCreature();
  }

  // Award Cores to each listed creature (banked permanently + tracked for the recap).
  function awardCores(ids, amt) {
    if (!ids.length || amt <= 0) return;
    setCores((c) => { const n = { ...c }; ids.forEach((id) => { n[id] = (n[id] || 0) + amt; }); saveCores(n); return n; });
    setCoresRun((c) => { const n = { ...c }; ids.forEach((id) => { n[id] = (n[id] || 0) + amt; }); return n; });
  }
  // How many loadout slots a creature has — grows as you unlock more nodes (4 → 8).
  const slotsForCreature = (creatureId) => slotsForUnlocked((treeAlloc[creatureId] || []).length);

  // Spend Cores on a node. Normal nodes UNLOCK once (auto-equip if the loadout has room).
  // Repeatable Refinement nodes can be bought again and again — each rank costs more and
  // adds to its stacked effect; the first purchase also unlocks + auto-equips it.
  function buyNode(creatureId, node) {
    const owned = treeAlloc[creatureId] || [];
    const isUnlocked = owned.includes(node.id);
    // Ranked stat node — buy the next cumulative rank (capped at node.ranks).
    if (node.ranks) {
      const rank = (treeRanks[creatureId]?.[node.id]) || 0;
      if (rank >= node.ranks) return; // maxed
      const cost = rankedCost(node, rank);
      if ((cores[creatureId] || 0) < cost) return;
      setCores((c) => { const n = { ...c, [creatureId]: (c[creatureId] || 0) - cost }; saveCores(n); return n; });
      setTreeRanks((r) => { const cur = { ...(r[creatureId] || {}) }; cur[node.id] = (cur[node.id] || 0) + 1; const n = { ...r, [creatureId]: cur }; saveRanks(n); return n; });
      if (!isUnlocked) {
        setTreeAlloc((a) => { const n = { ...a, [creatureId]: [...(a[creatureId] || []), node.id] }; saveTreeAlloc(n); return n; });
        setTreeEquip((e) => { const cur = e[creatureId] || []; if (cur.length >= slotsForUnlocked(owned.length + 1)) return e; const n = { ...e, [creatureId]: [...cur, node.id] }; saveEquip(n); return n; });
      }
      sfx.upgradePick();
      return;
    }
    if (node.repeatable) {
      const rank = (treeRanks[creatureId]?.[node.id]) || 0;
      const cost = refineCost(node, rank);
      if ((cores[creatureId] || 0) < cost) return;
      setCores((c) => { const n = { ...c, [creatureId]: (c[creatureId] || 0) - cost }; saveCores(n); return n; });
      setTreeRanks((r) => { const cur = { ...(r[creatureId] || {}) }; cur[node.id] = (cur[node.id] || 0) + 1; const n = { ...r, [creatureId]: cur }; saveRanks(n); return n; });
      if (!isUnlocked) {
        setTreeAlloc((a) => { const n = { ...a, [creatureId]: [...(a[creatureId] || []), node.id] }; saveTreeAlloc(n); return n; });
        setTreeEquip((e) => { const cur = e[creatureId] || []; if (cur.length >= slotsForUnlocked(owned.length + 1)) return e; const n = { ...e, [creatureId]: [...cur, node.id] }; saveEquip(n); return n; });
      }
      sfx.upgradePick();
      return;
    }
    if (isUnlocked) return;
    if ((cores[creatureId] || 0) < node.cost) return;
    setCores((c) => { const n = { ...c, [creatureId]: (c[creatureId] || 0) - node.cost }; saveCores(n); return n; });
    setTreeAlloc((a) => { const n = { ...a, [creatureId]: [...(a[creatureId] || []), node.id] }; saveTreeAlloc(n); return n; });
    setTreeEquip((e) => {
      const cur = e[creatureId] || [];
      if (cur.length >= slotsForUnlocked(owned.length + 1)) return e; // loadout full — unlock only, equip manually
      const n = { ...e, [creatureId]: [...cur, node.id] }; saveEquip(n); return n;
    });
    sfx.upgradePick();
  }
  // Toggle a node in/out of the creature's equipped loadout (capped at its slot count).
  function toggleEquip(creatureId, node) {
    if (!(treeAlloc[creatureId] || []).includes(node.id)) return; // must be unlocked first
    const cap = slotsForCreature(creatureId);
    setTreeEquip((e) => {
      const cur = e[creatureId] || [];
      let next;
      if (cur.includes(node.id)) next = cur.filter((x) => x !== node.id);
      else if (cur.length < cap) next = [...cur, node.id];
      else return e; // loadout full
      const n = { ...e, [creatureId]: next }; saveEquip(n); return n;
    });
    sfx.upgradePick();
  }

  function toggle(id) {
    if (!stable.includes(id)) return; // can't pick locked creatures
    setPicked((p) => { const next = p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p; saveSquad(next); return next; });
  }
  // Only offer a move-bend when the matching Type is still alive — pass aliveTypes
  // after each wave so a dead creature's bend can't appear in the next offer.
  // Chain bends only enter the pool if some alive creature already owns the prereq.
  function rollOffer(aliveTypes, currentSquad) {
    const types = aliveTypes ?? new Set(picked.map((id) => COMBAT_CREATURES[id].type));
    const sq = currentSquad ?? squad;
    const pool = UPGRADES.filter((u) => {
      if (u.needsType && !types.has(u.needsType)) return false;
      if (u.chain) return sq.some((m) => m.hp > 0 && COMBAT_CREATURES[m.id].type === u.needsType && (m.bends ?? []).some((b) => b.id === u.chain));
      return true;
    });
    const out = [];
    for (let k = 0; k < offerCount && pool.length; k++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    setOffer(out); setUpgradeChoice(null); // fresh choice each upgrade screen
  }

  // Roll a wayside event for this between-waves step (~55%), never repeating one in a run.
  function maybeWaysideEvent() {
    if (Math.random() > 0.55) return null;
    const pool = WAYSIDE_EVENTS.filter((e) => !eventsSeenRef.current.includes(e.id));
    if (!pool.length) return null;
    const ev = pool[Math.floor(Math.random() * pool.length)];
    eventsSeenRef.current = [...eventsSeenRef.current, ev.id];
    return ev;
  }
  // Apply a chosen option's effect via a ctx bound to the live run state, then show the outcome.
  function chooseEvent(choice) {
    if (eventOutcome) return; // already chosen — wait for PRESS ON
    const aliveIds = squad.filter((m) => m.hp > 0).map((m) => m.id);
    const ctx = {
      rng: Math.random,
      cores: (n) => awardCores(aliveIds, n),
      slag: (n) => onSlag?.(n),
      heal: (frac) => setSquad((sq) => sq.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, runMods), Math.round(m.hp + maxHpOf(m, runMods) * frac)) } : m)),
      hurt: (frac) => setSquad((sq) => sq.map((m) => m.hp > 0 ? { ...m, hp: Math.max(1, Math.round(m.hp - maxHpOf(m, runMods) * frac)) } : m)),
      buff: (fn) => setRunMods((rm) => { const n = { ...rm }; fn(n); return n; }),
      prime: (n = 2) => setRunMods((rm) => ({ ...rm, chargeStart: (rm.chargeStart || 0) + n })),
    };
    sfx.upgradePick();
    setEventOutcome(choice.apply(ctx) || 'You press on.');
  }
  function eventPressOn() { setPendingEvent(null); setEventOutcome(null); setRunPhase('upgrade'); }

  function startWave(idx, sq, mods) {
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i], mods, treeModsFor(sq[i].id, treeEquip, treeRanks)));
    fight.begin(aDefs, runWaves[idx].enemies(), runWaves[idx].seed, auto ? 'auto' : 'play', (res, finalState) => {
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
      // Progressive Cores: each surviving fielded creature banks ⬡ for clearing this wave.
      const clearedIds = fielded.filter((mi) => next[mi].hp > 0).map((mi) => next[mi].id);
      awardCores(clearedIds, Math.max(1, Math.round(coresForWave(idx, !!runWaves[idx].boss) * depthCoreMult(runDepth) * runRepeat)));
      // Patch survivors up a little for the next push.
      const patched = next.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, mods), m.hp + Math.round(maxHpOf(m, mods) * patchup)) } : m);
      setSquad(patched);
      if (idx === WAVE_COUNT - 1) {
        onSlag?.(WIN_SLAG); setEarned(WIN_SLAG);
        const hunted = accessibleGround(ground, accessDepth); // the ring you actually raided
        setCaughtFrom(hunted);
        // Record the clear — repeats of this ring pay diminishing Cores from here on.
        setClears((c) => { const n = { ...c, [hunted.id]: (c[hunted.id] || 0) + 1 }; saveClears(n); return n; });
        // Strict inward: beating a ring's boss at your current frontier opens the next ring
        // (and its higher tier). Beta mode skips the gate, so it never re-unlocks.
        if (!beta && hunted.depth === unlocked && unlocked < 8) {
          const nd = unlocked + 1; setUnlocked(nd); saveUnlocked(nd); setUnlockedNow(nd);
        } else setUnlockedNow(null);
        // THE HOLDFAST reclaims a stage the first time you beat a ring's boss (works in
        // beta too — pushing deeper heals more of the home + drips the next story beat).
        if (hunted.depth > reclaimed) {
          setReclaimed(hunted.depth); saveReclaimed(hunted.depth);
          setHoldfastNow(stageAtDepth(hunted.depth));
        } else setHoldfastNow(null);
        // PULL — a weighted draw from the ring (new creature, or a dupe → Cores).
        const pull = pullFrom(hunted, stable, accessDepth, pity);
        if (pull) {
          const info = RARITY_INFO[pull.rarity];
          if (pull.isDupe) {
            awardCores([pull.id], info.dupeCores); // dupe melts to that creature's Cores
            setPullNow({ ...pull, gainedCores: info.dupeCores });
          } else {
            const ns = [...stable, pull.id]; setStable(ns); saveStable(ns);
            if (info.startCores > 0) awardCores([pull.id], info.startCores); // rarity head-start
            setPullNow({ ...pull, gainedCores: info.startCores });
            setTimeout(() => sfx.caughtCreature(), 720);
          }
          const np = pull.rarity === 'Legendary' ? 0 : pity + 1; // pity: reset on a Legendary
          setPity(np); savePity(np);
        } else setPullNow(null);
        // Deep rings ALSO drip a SIGIL toward their uncaught Unique (won by challenge).
        const apexId = sigilTarget(hunted, stable, sigils);
        if (apexId) {
          const count = Math.min(APEX_SIGILS, (sigils[apexId] || 0) + 1);
          const nextSig = { ...sigils, [apexId]: count };
          setSigils(nextSig); saveSigils(nextSig);
          setSigilGain({ id: apexId, count, ready: count >= APEX_SIGILS });
        } else setSigilGain(null);
        // THE DROP — clearing the final ring for the first time is the ending. The whole
        // climb has pointed here; play the theme and run the ceremony instead of the
        // ordinary won-screen. (reclaimed still holds the PRE-clear value here.)
        if (hunted.depth === HOLDFAST_MAX && reclaimed < HOLDFAST_MAX) {
          sfx.theDrop(); setRunPhase('drop'); return;
        }
        // RELIC DROP — every ring boss offers a CHOICE of relics (the loot chase). You
        // pick one on the won screen; a weighted draw of distinct unowned relics. Once the
        // collection is full, there's nothing left to offer, so it pays slag instead.
        const choices = rollRelicChoices(relics, 3);
        if (choices.length) { setRelicChoices(choices); setRelicDrop(null); }
        else { onSlag?.(35); setRelicChoices([]); setRelicDrop(null); }
        sfx.ringTaken();
        setRunPhase('won'); return;
      }
      const aliveTypes = new Set(patched.filter((m) => m.hp > 0).map((m) => COMBAT_CREATURES[m.id].type));
      sfx.waveClear();
      setWaveIdx(idx + 1); rollOffer(aliveTypes, patched);
      // Wayside event — between non-boss waves the trail sometimes offers a choice.
      // (Offer is already rolled, so the event sits in front of the upgrade screen.)
      const nextIsBoss = (idx + 1) === WAVE_COUNT - 1;
      const ev = nextIsBoss ? null : maybeWaysideEvent();
      if (ev) { setPendingEvent(ev); setEventOutcome(null); sfx.upgradePick(); setRunPhase('event'); }
      else setRunPhase('upgrade');
    });
    setWaveIdx(idx);
    setRunPhase('fighting');
  }

  function startRun() {
    sfx.resume(); // unlock AudioContext on first user gesture (browser autoplay policy)
    const g = accessibleGround(ground, accessDepth); // run the chosen ring, clamped to what's unlocked
    setRunWaves(wavesForGround(g)); setRunDepth(g.depth);
    setEnteredRing(g); sfx.ringThreshold(g.depth); // crossing the threshold — a beat + a deepening swell
    setRunRepeat(repeatMult(clears[g.id] || 0)); // diminishing cores for re-farming a cleared ring
    const base = perkBaseMods(owned, reclaimed, relicKit); // perks + Holdfast boons + equipped relics set the run's opening mods
    const sq = picked.map((id) => ({ id, hp: maxHpOf({ id }, base), unitMods: { ...EMPTY_UNIT_MODS }, bends: [] }));
    setSquad(sq); setRunMods(base); setTaken([]); setWaveIdx(0); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setCoresRun({});
    eventsSeenRef.current = []; setPendingEvent(null); setEventOutcome(null); // fresh wayside-event pool per run
    rollOffer(); setRunPhase('upgrade');
  }
  // ── Apex challenge: a one-off fight against a gathered apex creature. Win → recruit. ──
  function startChallenge(apexId) {
    sfx.resume();
    const base = perkBaseMods(owned, reclaimed, relicKit);
    const sq = picked.map((id) => ({ id, hp: maxHpOf({ id }, base), unitMods: { ...EMPTY_UNIT_MODS }, bends: [] }));
    const aDefs = sq.map((m) => playerDef(m, base, treeModsFor(m.id, treeEquip, treeRanks)));
    const apex = COMBAT_CREATURES[apexId];
    setChallenge(apex);
    setSquad(sq); setRunMods(base);
    // The apex stands alone but hits like a boss — a genuine wall (first-pass dials).
    const enemy = { ...makeUnitDef(apexId, 'Greedy'), name: apex.name,
      hp: Math.round(apex.hp * 2.4), maxHp: Math.round(apex.hp * 2.4), atk: Math.round(apex.atk * 1.5) };
    fight.begin(aDefs, [enemy], 808, auto ? 'auto' : 'play', (res, finalState) => {
      const won = finalState.units.A.some((u) => u.hp > 0) && res.winner !== 'B';
      if (won) {
        if (!stable.includes(apexId)) {
          const ns = [...stable, apexId]; setStable(ns); saveStable(ns);
          awardCores([apexId], RARITY_INFO.Unique.startCores); // a Unique arrives with a Core bank
        }
        const nextSig = { ...sigils }; delete nextSig[apexId]; setSigils(nextSig); saveSigils(nextSig);
        sfx.ringTaken(); setTimeout(() => sfx.caughtCreature(), 720);
        setRunPhase('challenge-won');
      } else { sfx.squadDown(); setRunPhase('challenge-lost'); }
    });
    setRunPhase('challenge-fighting');
  }
  function applyUpgrade(up) {
    sfx.upgradePick();
    setUpgradeChoice(null);
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
  function newRun() { fight.reset(); setRunPhase('pick'); setPicked(savedSquadIn(stable)); setSquad([]); setWaveIdx(0); setRunMods({ ...EMPTY_MODS }); setTaken([]); setOffer([]); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setPullNow(null); setCaughtFrom(null); setSigilGain(null); setUnlockedNow(null); setHoldfastNow(null); setEnteredRing(null); setPendingEvent(null); setEventOutcome(null); setRelicChoices([]); setRelicDrop(null); setChallenge(null); setPendingUpgrade(null); setTargetChoice(null); setUpgradeChoice(null); setTreeFor(null); setCoresRun({}); }

  // ── Skill tree overlay — a creature's permanent paths (fog-of-war reveal) ──
  if (treeFor) {
    const c = COMBAT_CREATURES[treeFor];
    const ti = TYPE_INFO[c.type];
    const tree = treeForCreature(treeFor);
    const owned = treeAlloc[treeFor] || [];     // unlocked
    const equipped = treeEquip[treeFor] || [];  // active loadout
    const bal = cores[treeFor] || 0;
    const ranks = treeRanks[treeFor] || {};
    const isOwned = (id) => owned.includes(id);
    const isEq = (id) => equipped.includes(id);
    const slotMax = slotsForUnlocked(owned.length); // loadout grows with what you've unlocked
    const slotsUsed = equipped.length;
    const slotsFull = slotsUsed >= slotMax;
    // A path locked "until a capstone" opens once you've UNLOCKED any tier-3 capstone.
    const hasCapstone = tree ? tree.paths.some((p) => p.nodes.some((n) => n.capstone && isOwned(n.id))) : false;

    if (!tree) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: T.body, color: DIM, marginBottom: 16 }}>{ti.glyph} {c.name}'s paths are still being charted.</div>
          <button onClick={() => setTreeFor(null)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, cursor: 'pointer' }}>← BACK</button>
        </div>
      );
    }
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button onClick={() => setTreeFor(null)} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, fontSize: T.small, cursor: 'pointer' }}>←</button>
          <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: T.head, fontWeight: 900, color: ti.accent, lineHeight: 1.1 }}>{ti.glyph} {c.name}</div>
            <div style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>{c.type} · {ti.nick}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: T.head, fontWeight: 900, color: '#9be7ff' }}>{bal} ⬡</div>
            <div style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>cores to spend</div>
          </div>
        </div>
        {/* Loadout meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0c1620', border: `1px solid ${slotsFull ? '#3a6a4a' : '#2a4a5a'}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: T.small, fontWeight: 900, color: '#9be7ff' }}>⚡ LOADOUT</span>
          <span style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: slotMax }).map((_, i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: i < slotsUsed ? WIN : '#1a2630', border: `1px solid ${i < slotsUsed ? WIN : '#2a3a44'}` }} />
            ))}
          </span>
          <span style={{ fontSize: T.micro, color: DIM, fontWeight: 700, marginLeft: 'auto' }}>{slotsUsed}/{slotMax} active{slotsFull ? ' · full' : ''}{slotMax < 8 ? ' · unlock more for +slots' : ''}</span>
        </div>
        <div style={{ fontSize: T.small, color: '#cdb6ff', background: '#0c0c16', border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 12px', marginBottom: 14, lineHeight: 1.45 }}>
          {tree.blurb} <span style={{ color: DIM }}>Unlocking is forever; you run <b style={{ color: '#9be7ff' }}>{slotMax}</b> at once (more slots as you unlock more). Tap an unlocked path to equip or bench it. <b style={{ color: '#9be7ff' }}>Refinement</b> nodes can be bought again and again.</span>
        </div>
        {/* Paths */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
          {tree.paths.map((path) => {
            const locked = path.hiddenUntilCapstone && !hasCapstone;
            const keystoneNode = path.nodes.find((n) => n.keystone);
            if (locked) {
              return (
                <div key={path.id} style={{ background: '#0a0a12', border: `1.5px dashed ${path.color}55`, borderRadius: 14, padding: '16px 13px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 180, opacity: 0.92 }}>
                  <div style={{ fontSize: 26, opacity: 0.6 }}>{path.icon}</div>
                  <div style={{ fontSize: T.label, fontWeight: 900, color: '#7a7a8a', marginTop: 6, letterSpacing: 1 }}>🔒 {path.name}</div>
                  <div style={{ fontSize: T.micro, color: path.color, fontWeight: 800, opacity: 0.8 }}>{path.tag}</div>
                  {keystoneNode && (
                    <div style={{ fontSize: T.micro, color: '#ffd166', fontWeight: 800, marginTop: 8 }}>★ ends in {keystoneNode.name}</div>
                  )}
                  <div style={{ fontSize: T.micro, color: DIM, marginTop: 8, lineHeight: 1.4 }}>Take either open path to its <b style={{ color: '#cdb6ff' }}>◆ capstone</b> to unlock this third way.</div>
                </div>
              );
            }
            const ownedTiers = path.nodes.filter((n) => isOwned(n.id)).map((n) => n.tier);
            const maxOwnedTier = ownedTiers.length ? Math.max(...ownedTiers) : 0;
            return (
              <div key={path.id} style={{ background: PANEL, border: `1.5px solid ${path.color}44`, borderRadius: 14, padding: '12px 11px' }}>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 22 }}>{path.icon}</div>
                  <div style={{ fontSize: T.label, fontWeight: 900, color: path.color, letterSpacing: 1 }}>{path.name}</div>
                  <div style={{ fontSize: T.micro, color: path.color, fontWeight: 800, opacity: 0.85 }}>{path.tag}</div>
                  {keystoneNode && (
                    <div style={{ fontSize: T.micro, color: '#9a9aaa', fontWeight: 700, marginTop: 3 }}>builds toward <span style={{ color: '#ffd166', fontWeight: 800 }}>★ {keystoneNode.name}</span></div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {path.nodes.map((node, i) => {
                    const ownedNode = isOwned(node.id);
                    const equippedNode = isEq(node.id);
                    // Prereq: explicit `requires` (Refinement → capstone) else the prior tier.
                    const prereqId = node.requires ?? (i > 0 ? path.nodes[i - 1].id : null);
                    const prereqOwned = prereqId ? isOwned(prereqId) : true;
                    const prereqName = prereqId ? (NODE_BY_ID[prereqId]?.name ?? '') : '';

                    // ── Ranked nodes: Refinement (infinite ♾) OR a capped stat node (II/III).
                    // Both buy cumulative ranks from the same machinery; ranked ones cap out. ──
                    if (node.repeatable || node.ranks) {
                      const isRanked = !!node.ranks;
                      const rank = ranks[node.id] || 0;
                      const maxRank = node.ranks ?? Infinity;
                      const maxed = rank >= maxRank;
                      const cost = isRanked ? rankedCost(node, rank) : refineCost(node, rank);
                      const accent = isRanked ? path.color : '#9be7ff';
                      const canBuy = prereqOwned && !maxed && bal >= cost;
                      return (
                        <div key={node.id}>
                          {i > 0 && <div style={{ width: 2, height: 6, background: prereqOwned ? WIN : LINE, margin: '0 auto' }} />}
                          <div style={{ borderRadius: 10, padding: '8px 9px', background: equippedNode ? '#10231a' : '#0e1812', border: `1.5px solid ${equippedNode ? accent : prereqOwned ? `${accent}55` : LINE}`, opacity: prereqOwned ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: T.small }}>{isRanked ? '▮' : '♾'}</span>
                              <span style={{ fontSize: T.small, fontWeight: 900, color: accent }}>{node.name}</span>
                              {rank > 0 && <span style={{ fontSize: T.micro, fontWeight: 800, color: maxed ? WIN : '#cdd' }}>· {isRanked ? `${rank}/${maxRank}` : `Rank ${rank}`}</span>}
                              {ownedNode && <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: equippedNode ? WIN : DIM }}>{equippedNode ? '● equipped' : '○ benched'}</span>}
                            </div>
                            <div style={{ fontSize: T.micro, color: '#9a9aaa', lineHeight: 1.35, margin: '3px 0 6px' }}>
                              {prereqOwned ? node.desc : `🔒 buy ${prereqName} first to open this.`}
                            </div>
                            {prereqOwned && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => canBuy && buyNode(treeFor, node)} disabled={!canBuy}
                                  style={{ flex: 1, borderRadius: 8, padding: '5px 0', cursor: canBuy ? 'pointer' : 'default', background: canBuy ? `${accent}22` : PANEL, border: `1px solid ${canBuy ? accent : LINE}`, color: canBuy ? accent : '#6a6a7a', fontSize: T.micro, fontWeight: 900 }}>
                                  {maxed ? '✓ MAXED' : `${rank > 0 ? `RANK ${rank + 1}` : 'UNLOCK'} · ${cost} ⬡`}
                                </button>
                                {ownedNode && (
                                  <button onClick={() => (equippedNode || !slotsFull) && toggleEquip(treeFor, node)} disabled={!equippedNode && slotsFull}
                                    style={{ width: 78, borderRadius: 8, padding: '5px 0', cursor: (equippedNode || !slotsFull) ? 'pointer' : 'default', background: equippedNode ? '#10231a' : PANEL, border: `1px solid ${equippedNode ? WIN : LINE}`, color: equippedNode ? WIN : (slotsFull ? DIM : '#9be7ff'), fontSize: T.micro, fontWeight: 800 }}>
                                    {equippedNode ? 'bench' : slotsFull ? 'full' : 'equip'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── Normal node ──
                    // Desc visibility (fog): see two tiers ahead, and ALWAYS show the
                    // capstone (◆) + keystone (★) — a column must advertise its payoff.
                    const revealed = node.tier <= maxOwnedTier + 2 || node.capstone || node.keystone || ownedNode;
                    const afford = bal >= node.cost;
                    const buyable = prereqOwned && !node.sealed && !ownedNode && afford;
                    const clickable = buyable || (ownedNode && (equippedNode || !slotsFull));
                    const onClick = () => {
                      if (!ownedNode) { if (buyable) buyNode(treeFor, node); }
                      else toggleEquip(treeFor, node);
                    };
                    const border = equippedNode ? WIN : ownedNode ? `${WIN}66` : node.keystone ? '#ffd166' : node.sealed ? LINE : revealed ? `${path.color}66` : LINE;
                    const bg = equippedNode ? '#10231a' : ownedNode ? '#0e1812' : '#0c0c14';
                    const op = (!revealed && !ownedNode) ? 0.6 : node.sealed && !ownedNode ? 0.78 : 1;
                    const tag = equippedNode ? '● EQUIPPED'
                      : ownedNode ? (slotsFull ? '○ benched' : '+ equip')
                      : node.sealed ? '🚧 SOON' : `${node.cost} ⬡`;
                    const tagColor = equippedNode ? WIN : ownedNode ? (slotsFull ? DIM : '#9be7ff') : node.sealed ? DIM : afford ? '#9be7ff' : '#6a6a7a';
                    return (
                      <div key={node.id}>
                        {i > 0 && <div style={{ width: 2, height: 6, background: prereqOwned ? WIN : LINE, margin: '0 auto' }} />}
                        <button
                          onClick={onClick}
                          disabled={!clickable}
                          style={{ width: '100%', textAlign: 'left', borderRadius: 10, padding: '8px 9px', cursor: clickable ? 'pointer' : 'default',
                            background: bg, border: `1.5px solid ${border}`, opacity: op }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {node.keystone && <span style={{ fontSize: T.small }}>★</span>}
                            {node.capstone && !node.keystone && <span style={{ fontSize: T.small }}>◆</span>}
                            <span style={{ fontSize: T.small, fontWeight: 900, color: equippedNode ? WIN : node.keystone ? '#ffd166' : revealed ? '#e8e8f0' : '#7a7a8a' }}>{node.name}</span>
                            <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: tagColor }}>{tag}</span>
                          </div>
                          <div style={{ fontSize: T.micro, color: ownedNode ? '#bfe8cf' : revealed ? '#9a9aaa' : '#5a5a6a', lineHeight: 1.35, marginTop: 3 }}>
                            {revealed ? node.desc : `🔒 deeper down this path`}
                            {node.sealed && revealed && <span style={{ color: '#7a7a8a', fontStyle: 'italic' }}> — this Type's deep path is still being charted (coming soon). Reactor's is fully open now.</span>}
                            {revealed && !node.sealed && !ownedNode && !prereqOwned && <span style={{ color: '#6a6a7a' }}> — buy {prereqName} first to open this.</span>}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setTreeFor(null)} style={{ width: '100%', marginTop: 16, padding: '13px 0', borderRadius: 12, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>← BACK TO SQUAD</button>
      </div>
    );
  }

  // ── The opening cutscene — the story's beginning. Plays once on a fresh save, then
  // re-watchable from the home screen. A full-screen takeover above every phase. ──
  if (showIntro) {
    return <Cutscene scenes={OPENING_SCENES} onDone={() => { setShowIntro(false); saveIntroSeen(); }} />;
  }

  // ── THE RELIC VAULT (vF-AK) — the whole collection to chase. Owned relics show in full;
  // the rest are undiscovered silhouettes with just a rarity tease. A full-screen overlay. ──
  if (showVault) {
    const byRarity = { Common: [], Rare: [], Legendary: [] };
    RELICS.forEach((r) => byRarity[r.rarity]?.push(r));
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: '#cba6ff', letterSpacing: 0.5 }}>✦ THE RELIC VAULT</div>
          <button onClick={() => setShowVault(false)} style={{ fontSize: T.small, fontWeight: 800, color: DIM, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 13px', cursor: 'pointer' }}>← back</button>
        </div>
        <div style={{ fontSize: T.small, color: DIM, marginBottom: 14 }}>Found <b style={{ color: '#cba6ff' }}>{relics.length}</b> of <b style={{ color: '#cba6ff' }}>{RELICS.length}</b> — every ring boss leaves another. Deeper rings hold the rarer ones.</div>
        {['Legendary', 'Rare', 'Common'].map((rar) => {
          const info = RARITY_INFO[rar] || {};
          return (
            <div key={rar} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: T.small, fontWeight: 900, color: info.color, letterSpacing: 1, marginBottom: 7 }}>{rar.toUpperCase()} <span style={{ color: DIM, fontWeight: 700 }}>· {byRarity[rar].filter((r) => relics.includes(r.id)).length}/{byRarity[rar].length}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {byRarity[rar].map((r) => {
                  const have = relics.includes(r.id);
                  const eq = relicKit.includes(r.id);
                  return (
                    <div key={r.id} title={have ? r.lore : 'Undiscovered — found on a ring boss.'}
                      style={{ borderRadius: 10, padding: '9px 10px', background: have ? PANEL : '#0b0b10', border: `1.5px solid ${have ? (eq ? '#b06bff' : `${r.color}66`) : LINE}`, opacity: have ? 1 : 0.55 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: T.body, filter: have ? 'none' : 'grayscale(1) brightness(0.5)' }}>{have ? r.icon : '✦'}</span>
                        <span style={{ fontSize: T.small, fontWeight: 900, color: have ? r.color : '#54506a' }}>{have ? r.name : '? ? ?'}</span>
                        {eq && <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: '#cba6ff' }}>●</span>}
                      </div>
                      <div style={{ fontSize: T.micro, color: have ? '#bfb0d6' : '#454056', lineHeight: 1.35, fontStyle: have ? 'normal' : 'italic' }}>{have ? r.desc : 'Undiscovered.'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Squad picker ──
  if (runPhase === 'pick') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
          <button onClick={() => { sfx.resume(); setShowIntro(true); }}
            title="Watch the opening again"
            style={{ fontSize: T.micro, fontWeight: 800, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', border: '1px solid #4a3a66', background: '#160f1d', color: '#cba6ff' }}>
            ❖ The Story
          </button>
          <button onClick={() => { sfx.resume(); const m = !music; setMusic(m); saveMusic(m); }}
            title={music ? 'Ambient music on' : 'Ambient music off'}
            style={{ fontSize: T.micro, fontWeight: 800, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${music ? '#4a3a66' : '#33333f'}`, background: music ? '#160f1d' : 'transparent', color: music ? '#cba6ff' : '#777' }}>
            {music ? '🔊 Music' : '🔇 Music'}
          </button>
        </div>
        {/* ── THE HOLDFAST — your home + the destination. Reclaims one stage per ring boss. ── */}
        {(() => {
          const ringsToDrop = HOLDFAST_MAX - reclaimed;
          const latest = stageAtDepth(reclaimed);   // most recent beat (null before any clear)
          const next = stageAtDepth(reclaimed + 1);  // the part still under the blight
          const boons = HOLDFAST_STAGES.filter((s) => s.depth <= reclaimed);
          return (
            <div style={{ background: 'linear-gradient(180deg,#160f1d,#0e0a14)', border: '1px solid #4a3a66', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: T.sub, color: '#cba6ff', fontWeight: 900, letterSpacing: 0.5 }}>🏚 THE HOLDFAST</span>
                <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: '#9a7fc0' }}>
                  {reclaimed === 0 ? 'half-swallowed by the blight' : reclaimed >= HOLDFAST_MAX ? 'reclaimed — you stand at the Drop' : `reclaimed ${reclaimed}/${HOLDFAST_MAX}`}
                </span>
              </div>
              {/* destination bar: the rim → 8 rings inward → the Drop */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '10px 0 6px' }}>
                <span style={{ fontSize: 13 }} title="The rim — your home">🏚</span>
                {HOLDFAST_STAGES.map((s) => {
                  const done = s.depth <= reclaimed;
                  const frontier = s.depth === reclaimed + 1;
                  return (
                    <div key={s.depth} title={done ? `${s.part} — reclaimed` : `${s.part} — still blighted`}
                      style={{ flex: 1, height: 9, borderRadius: 3,
                        background: done ? '#b06bff' : frontier ? '#3a2a52' : '#1c1726',
                        border: frontier ? '1px solid #7a5aa0' : '1px solid transparent',
                        boxShadow: done ? '0 0 6px #b06bff88' : 'none' }} />
                  );
                })}
                <span style={{ fontSize: 13 }} title="The Drop — the destination">✦</span>
              </div>
              <div style={{ fontSize: T.small, color: '#bfa8da', fontWeight: 700 }}>
                {ringsToDrop > 0
                  ? <>The Drop lies <b style={{ color: '#eadcff' }}>{ringsToDrop} ring{ringsToDrop !== 1 ? 's' : ''}</b> inward. {next && <span style={{ color: '#8f78b0' }}>Take {next.part === "The Drop's Edge" ? 'the last ring' : `ring ${next.depth}`} to reclaim <b style={{ color: '#cba6ff' }}>{next.part}</b>.</span>}</>
                  : <span style={{ color: '#eadcff' }}>The rings are walked. The door is open — and waiting.</span>}
              </div>
              {latest && <div style={{ fontSize: T.micro, color: '#9a7fc0', fontStyle: 'italic', lineHeight: 1.5, marginTop: 6 }}>“{latest.beat.replace(/^"|"$/g, '')}”</div>}
              {boons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {boons.map((s) => (
                    <span key={s.depth} title={s.boon.desc} style={{ fontSize: T.micro, fontWeight: 800, color: '#cba6ff', background: '#0e0a14', border: '1px solid #4a3a66', borderRadius: 7, padding: '3px 7px' }}>
                      {s.boon.icon} {s.boon.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        <div style={{ background: '#15100a', border: `1px solid ${ACCENT}55`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: T.sub, color: ACCENT, fontWeight: 900, letterSpacing: 0.5 }}>⛰ TAKE THE APPROACH</div>
          <div style={{ fontSize: T.small, color: '#d8c4a8', lineHeight: 1.5, marginTop: 4 }}>
            Four trials guard each ring — clear them in one push and the approach is yours. Beat a ring's boss and the next ring <b style={{ color: '#9be7ff' }}>inward</b> opens, with stronger, higher-tier creatures to win over. Wounds carry between fights; you only patch up a little. Choose who goes in.
          </div>
        </div>
        {/* ── β BETA: a removable dev switch — fast-forward the gate for content testing. ── */}
        {BETA_AVAILABLE && (
          <div style={{ border: `1px dashed ${beta ? '#ff5cf0' : '#33333f'}`, background: beta ? '#190a17' : '#0b0b11', borderRadius: 10, padding: '9px 12px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { const b = !beta; setBeta(b); saveBeta(b); }}
                style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 0.5, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                  border: `1.5px solid ${beta ? '#ff5cf0' : '#444'}`, background: beta ? '#ff5cf022' : 'transparent', color: beta ? '#ff9cf5' : '#888' }}>
                β BETA · {beta ? 'ON' : 'OFF'}
              </button>
              <span style={{ fontSize: T.micro, color: beta ? '#ff9cf5' : '#777', fontWeight: 700 }}>
                {beta ? '⚠ TEST MODE — every ring open. Turn off to play the real gated build.' : 'Dev fast-forward — unlock all rings + grants for content testing.'}
              </span>
            </div>
            {beta && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {[
                  ['Catch all 17', () => { const all = COMBAT_ROSTER.map((c) => c.id); setStable(all); saveStable(all); }],
                  ['+300 ⬡ to squad', () => setCores((c) => { const n = { ...c }; stable.forEach((id) => { n[id] = (n[id] || 0) + 300; }); saveCores(n); return n; })],
                  ['Max apex sigils', () => { const s = {}; [...APEX_IDS].forEach((id) => { s[id] = APEX_SIGILS; }); setSigils(s); saveSigils(s); }],
                  ['Reset ALL progress', () => {
                    const st = [...STARTER_IDS];
                    setUnlocked(1); saveUnlocked(1);
                    setReclaimed(0); saveReclaimed(0);           // the Holdfast falls back to the blight
                    setStable(st); saveStable(st);
                    setClears({}); saveClears({});
                    setSigils({}); saveSigils({});
                    setPity(0); savePity(0);
                    setCores({}); saveCores({});                 // wipe the OP trees — Cores,
                    setTreeAlloc({}); saveTreeAlloc({});          // unlocked nodes,
                    setTreeEquip({}); saveEquip({});              // equipped loadout,
                    setTreeRanks({}); saveRanks({});              // and node ranks.
                    setOwned([]); savePerks([]);                 // Forge perks too.
                    setGround('outer-ring'); saveGround('outer-ring');
                    setPicked([]); saveSquad([]);
                  }],
                ].map(([label, fn]) => (
                  <button key={label} onClick={fn} style={{ fontSize: T.micro, fontWeight: 800, padding: '5px 9px', borderRadius: 7, cursor: 'pointer', border: '1px solid #5a3a5a', background: '#1f0f1d', color: '#ff9cf5' }}>{label}</button>
                ))}
              </div>
            )}
          </div>
        )}
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
        {/* ── RELICS: the loot you find on the climb. Equip up to RELIC_SLOTS into a run. ── */}
        <div style={{ background: '#0c0e16', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: T.sub, color: '#cba6ff', fontWeight: 900, letterSpacing: 0.5 }}>✦ RELICS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowVault(true)} style={{ fontSize: T.micro, fontWeight: 800, color: '#9a7fc0', background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer' }}>📖 vault {relics.length}/{RELICS.length}</button>
              <div style={{ fontSize: T.small, fontWeight: 800, color: relicKit.length ? '#cba6ff' : DIM }}>kit {relicKit.length}/{RELIC_SLOTS}</div>
            </div>
          </div>
          <div style={{ fontSize: T.micro, color: DIM, marginBottom: 10, lineHeight: 1.4 }}>Found gear — <b style={{ color: '#cba6ff' }}>every ring boss drops one</b>. Equip up to <b style={{ color: '#cba6ff' }}>{RELIC_SLOTS}</b> for a run. Most carry a trade — your kit is your <b style={{ color: '#cba6ff' }}>build</b>.</div>
          {relics.length === 0 ? (
            <div style={{ fontSize: T.small, color: DIM, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No relics yet. Beat a ring's boss to find your first.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
              {RELICS.filter((r) => relics.includes(r.id)).map((r) => {
                const eq = relicKit.includes(r.id);
                const full = !eq && relicKit.length >= RELIC_SLOTS;
                const rc = (RARITY_INFO[r.rarity] || {}).color || r.color;
                return (
                  <button key={r.id} onClick={() => toggleRelic(r.id)} disabled={full}
                    title={r.lore}
                    style={{ textAlign: 'left', borderRadius: 10, padding: '9px 10px', cursor: full ? 'default' : 'pointer',
                      background: eq ? '#1a1230' : PANEL, border: `1.5px solid ${eq ? '#b06bff' : full ? LINE : `${r.color}77`}`, opacity: full ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: T.body }}>{r.icon}</span>
                      <span style={{ fontSize: T.small, fontWeight: 900, color: eq ? '#cba6ff' : r.color }}>{r.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: eq ? '#cba6ff' : full ? DIM : rc }}>{eq ? '● equipped' : full ? 'kit full' : `equip`}</span>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: rc, letterSpacing: 0.3, marginBottom: 2 }}>{r.rarity.toUpperCase()}</div>
                    <div style={{ fontSize: T.micro, color: eq ? '#d8c8f0' : '#9a9aaa', lineHeight: 1.35 }}>{r.desc}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ fontSize: T.body, color: '#ddd', fontWeight: 700, marginBottom: 10 }}>
          Pick <b style={{ color: ACCENT }}>2–3</b> creatures <span style={{ color: DIM, fontWeight: 600 }}>({picked.length} chosen)</span>
          <span style={{ float: 'right', fontSize: T.micro, color: DIM, fontWeight: 700, lineHeight: '22px' }}>{stable.length}/{COMBAT_ROSTER.length} caught</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {COMBAT_ROSTER.filter((c) => stable.includes(c.id)).map((c) => {
            const ti = TYPE_INFO[c.type];
            const rar = rarityOf(c.id); const tnf = RARITY_INFO[rar]; const tm = tnf.mult; // rarity power
            const on = picked.includes(c.id);
            const full = !on && picked.length >= 3;
            const cBal = cores[c.id] || 0;
            const nodeCount = (treeAlloc[c.id] || []).length;
            const hasTree = !!treeForCreature(c.id);
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => toggle(c.id)} disabled={full}
                  style={{ flex: 1, textAlign: 'left', cursor: full ? 'not-allowed' : 'pointer', borderRadius: 12, padding: '11px 12px',
                    background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`, opacity: full ? 0.4 : 1, boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none' }}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={68} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: T.label, fontWeight: 900, color: ti.accent }}>{ti.glyph} {ti.nick}</span>
                        <span style={{ fontSize: 9, fontWeight: 900, color: tnf.color, letterSpacing: 0.3 }} title={`${rar}`}>{tnf.pips}</span>
                        {on && <span style={{ marginLeft: 'auto', fontSize: T.body, color: SEL, fontWeight: 800 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: T.small, color: on ? '#eaf2ff' : '#cfcfda', fontWeight: 700, margin: '1px 0 3px' }}>{c.name} <span style={{ fontSize: T.micro, color: tnf.color, fontWeight: 700 }}>· {rar}</span></div>
                      <div style={{ fontSize: T.micro, color: DIM }}>HP {Math.round(c.hp * tm)} · ATK {Math.round(c.atk * tm)} · SPD {c.speed}{tm > 1 && <span style={{ color: tnf.color, fontWeight: 800 }}> · ×{tm.toFixed(2)}</span>}{nodeCount > 0 && <span style={{ color: WIN, fontWeight: 800 }}> · {nodeCount} path{nodeCount !== 1 ? 's' : ''}</span>}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: T.small, color: on ? '#cdd8e4' : '#9a9aaa', lineHeight: 1.4, marginTop: 7 }}>{ti.role}</div>
                </button>
                <button onClick={() => setTreeFor(c.id)} disabled={!hasTree}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 9, cursor: hasTree ? 'pointer' : 'default',
                    background: cBal > 0 ? '#101a22' : '#0c0c14', border: `1px solid ${cBal > 0 ? '#2a4a5a' : LINE}`, opacity: hasTree ? 1 : 0.4 }}>
                  <span style={{ fontSize: T.small, fontWeight: 900, color: hasTree ? '#9be7ff' : DIM }}>🌳 PATHS</span>
                  {hasTree && <span style={{ fontSize: T.micro, fontWeight: 800, color: cBal > 0 ? '#9be7ff' : DIM }}>{cBal} ⬡{cBal > 0 ? ' to spend' : ''}</span>}
                </button>
              </div>
            );
          })}
        </div>
        {(() => {
          // The ring picker is the RUN selector — it always shows (even with everything
          // caught, you still pick a ring to raid for Cores + boss clears that open the
          // way inward). It just stops being a "hunt" once the catch pool is empty.
          const lockedIds = COMBAT_ROSTER.map((c) => c.id).filter((id) => !stable.includes(id));
          const lockedSet = new Set(lockedIds);
          // Uncaught creatures this ground leans toward — what you're hunting for.
          const targetsOf = (g) => g.biasIds.filter((id) => lockedSet.has(id));
          // The ring you'll actually hunt — clamped to what you've unlocked (strict inward).
          const sel = accessibleGround(ground, accessDepth);
          const selTargets = targetsOf(sel);
          return (
            <div style={{ borderRadius: 10, border: `1px dashed ${LINE}`, padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>🧭</span>
                <div style={{ fontSize: T.small, fontWeight: 900, color: '#ddd' }}>WHERE TO RAID</div>
                <span style={{ marginLeft: 'auto', fontSize: T.micro, color: '#666', fontStyle: 'italic' }}>{lockedIds.length > 0 ? `${lockedIds.length} grunling${lockedIds.length !== 1 ? 's' : ''} still out there` : 'all grunlings caught'}</span>
              </div>
              {/* The map — tap a ring to select where you raid. */}
              <RingMap accessDepth={accessDepth} selectedId={sel.id} clears={clears}
                onSelect={(id) => { setGround(id); saveGround(id); }} />
              {/* The selected ring, spelled out (the map shows state by colour; this is the detail). */}
              {(() => {
                const diff = diffOf(sel.depth);
                const n = clears[sel.id] || 0; const m = repeatMult(n);
                const ringRars = [...new Set(sel.biasIds.map(rarityOf))].sort((a, b) => RARITY_INFO[b].mult - RARITY_INFO[a].mult);
                return (
                  <div style={{ background: '#10131c', border: `1px solid ${SEL}33`, borderRadius: 10, padding: '9px 11px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: T.small, fontWeight: 900, color: '#eaf2ff' }}>{sel.name}</span>
                      <span style={{ fontSize: 10 }}>{ringRars.map((r) => <span key={r} title={r} style={{ color: RARITY_INFO[r].color, fontWeight: 900, marginRight: 1 }}>{RARITY_INFO[r].pips}</span>)}</span>
                      <span style={{ fontSize: T.micro, fontWeight: 800, color: diff.color }}>· {diff.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 700, color: n === 0 ? WIN : '#b58a3a' }}>{n === 0 ? '✦ fresh: full Cores' : `farmed ×${n} — Cores ×${m.toFixed(2)}`}</span>
                    </div>
                    <div style={{ fontSize: T.micro, color: '#9be7ff', fontWeight: 700, marginTop: 3 }}>
                      Raiding {sel.tag} — pull weighted by rarity{(() => { const u = sel.biasIds.find((id) => rarityOf(id) === 'Unique'); return u ? <span style={{ color: RARITY_INFO.Unique.color }}> · ✦ {COMBAT_CREATURES[u].name} (challenge)</span> : ''; })()}.
                    </div>
                  </div>
                );
              })()}
              {selTargets.map((id) => CREATURE_LORE[id] && (
                <div key={id} style={{ fontSize: T.micro, color: '#8a8a76', lineHeight: 1.45, padding: '3px 0 3px 24px' }}>
                  <span style={{ color: '#cdd', fontWeight: 700 }}>{COMBAT_CREATURES[id].name}:</span>{' '}
                  <span style={{ color: '#a99' }}>“{CREATURE_LORE[id].rumor}”</span>
                </div>
              ))}
            </div>
          );
        })()}
        {(() => {
          // Apex quarry — creatures you're gathering sigils toward. Full bar → challenge.
          const gathering = [...APEX_IDS].filter((id) => !stable.includes(id) && (sigils[id] || 0) > 0);
          if (gathering.length === 0) return null;
          const ringOf = (id) => HUNTING_GROUNDS.find((g) => g.biasIds.includes(id));
          return (
            <div style={{ borderRadius: 10, border: `1px solid #2a3a5a`, background: '#0a1018', padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>★</span>
                <div style={{ fontSize: T.small, fontWeight: 900, color: '#9be7ff' }}>APEX QUARRY</div>
                <span style={{ marginLeft: 'auto', fontSize: T.micro, color: '#666', fontStyle: 'italic' }}>gather sigils, then win it over</span>
              </div>
              {gathering.map((id) => {
                const ac = COMBAT_CREATURES[id]; const ati = TYPE_INFO[ac.type];
                const have = Math.min(APEX_SIGILS, sigils[id] || 0);
                const ready = have >= APEX_SIGILS;
                const ring = ringOf(id);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid #18203044` }}>
                    <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: T.small, fontWeight: 900, color: ati.accent }}>{ati.glyph} {ac.name} <span style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>· {ac.type}</span></div>
                      <div style={{ fontSize: T.small, color: '#9be7ff', fontWeight: 800 }}>{'✦'.repeat(have)}{'·'.repeat(APEX_SIGILS - have)} <span style={{ color: DIM, fontWeight: 600 }}>{have}/{APEX_SIGILS}{!ready && ring ? ` — hunt ${ring.name}` : ''}</span></div>
                    </div>
                    {ready && (
                      <button onClick={() => picked.length >= 2 && startChallenge(id)} disabled={picked.length < 2}
                        title={picked.length < 2 ? 'Pick at least 2 creatures first' : `Challenge ${ac.name}`}
                        style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${picked.length >= 2 ? ati.accent : LINE}`,
                          background: picked.length >= 2 ? `${ati.accent}22` : '#111', color: picked.length >= 2 ? ati.accent : DIM,
                          fontSize: T.small, fontWeight: 900, cursor: picked.length >= 2 ? 'pointer' : 'default', letterSpacing: 0.5 }}>
                        ⚔ CHALLENGE
                      </button>
                    )}
                  </div>
                );
              })}
              {gathering.some((id) => (sigils[id] || 0) >= APEX_SIGILS) && picked.length < 2 && (
                <div style={{ fontSize: T.micro, color: ACCENT, marginTop: 8, fontWeight: 700 }}>Pick a squad above, then call out your challenge.</div>
              )}
            </div>
          );
        })()}
        <div style={{ marginBottom: 18 }} />
        {(() => { const g = accessibleGround(ground, accessDepth); const diff = diffOf(g.depth); return (
        <button onClick={startRun} disabled={picked.length < 2}
          style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: picked.length >= 2 ? ACCENT : '#222', color: picked.length >= 2 ? '#1a1408' : '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: picked.length >= 2 ? 'pointer' : 'default' }}>
          {picked.length < 2 ? 'PICK AT LEAST 2' : <>RAID {g.name} <span style={{ color: '#1a1408', opacity: 0.7 }}>· {diff.label} →</span></>}
        </button>
        ); })()}
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
        <button onClick={() => { setTargetChoice(null); setPendingUpgrade(null); setRunPhase('upgrade'); }}
          style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${LINE}`, background: PANEL, color: '#bbb', fontSize: T.small, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
          ← Back · pick a different upgrade
        </button>
        <BuildStrip taken={taken} />
        {/* The bend card — what you just picked */}
        <div style={{ textAlign: 'center', background: PANEL, border: `2px solid ${up.color}`, borderRadius: 14, padding: '18px 16px', marginBottom: 18, boxShadow: `0 0 18px ${up.color}33` }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>{up.icon}</div>
          <div style={{ fontSize: T.sub, fontWeight: 900, color: up.color, marginTop: 6 }}>{up.name}</div>
          <div style={{ fontSize: T.small, color: '#cdd2dd', lineHeight: 1.45, marginTop: 6, maxWidth: 340, margin: '6px auto 0' }}>{up.desc}</div>
          <div style={{ fontSize: T.body, color: ACCENT, fontWeight: 900, marginTop: 12, letterSpacing: 0.5 }}>↓ Who gets it?</div>
        </div>
        {/* Squad member picker — tap to SELECT, then CONFIRM (avoids mis-taps, esp. with
            two of the same Type). */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : `repeat(${fighters.length}, 1fr)`, gap: 12 }}>
          {fighters.map((mem) => {
            const c = COMBAT_CREATURES[mem.id];
            const ti = TYPE_INFO[c.type];
            const chosen = targetChoice === mem.id;
            return (
              <button key={mem.id} onClick={() => setTargetChoice(mem.id)}
                style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: '14px 12px', background: chosen ? '#16202e' : PANEL, border: `2.5px solid ${chosen ? up.color : `${ti.accent}88`}`, boxShadow: chosen ? `0 0 18px ${up.color}66` : `0 0 16px ${ti.accent}22`, transition: 'border-color .15s' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={68} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.label, fontWeight: 900, color: ti.accent }}>{ti.glyph} {c.name}{chosen && <span style={{ color: up.color }}> ✓</span>}</div>
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
                <div style={{ marginTop: 8, padding: '7px 10px', background: chosen ? up.color : `${up.color}18`, border: `1px solid ${up.color}55`, borderRadius: 8, textAlign: 'center', fontSize: T.small, fontWeight: 800, color: chosen ? '#0a0a14' : up.color }}>{chosen ? `✓ ${c.name} selected` : `Give this one ${up.name}`}</div>
              </button>
            );
          })}
        </div>
        {/* Confirm the selection */}
        <button onClick={() => { if (targetChoice) { const t = targetChoice; setTargetChoice(null); pickTarget(t); } }} disabled={!targetChoice}
          style={{ width: '100%', marginTop: 14, padding: '14px 0', borderRadius: 12, border: 'none', background: targetChoice ? up.color : '#222', color: targetChoice ? '#0a0a14' : '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 0.5, cursor: targetChoice ? 'pointer' : 'default' }}>
          {targetChoice ? `CONFIRM — give ${COMBAT_CREATURES[targetChoice].name} ${up.name} →` : 'TAP A CREATURE ABOVE'}
        </button>
      </div>
    );
  }

  // ── Wayside event: a choice on the trail between waves (vF-AB). ──
  if (runPhase === 'event' && pendingEvent) {
    const ev = pendingEvent;
    return (
      <div>
        <div style={{ animation: 'seam-threshold .9s ease-out', maxWidth: 560, margin: '8px auto 0', background: 'linear-gradient(180deg,#120e1a,#0b0810)', border: `1px solid ${ev.tint}55`, borderRadius: 14, padding: narrow ? '16px 15px' : '20px 22px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            <EventVignette tint={ev.tint} glyph={ev.glyph} size={narrow ? 70 : 88} />
            <div>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2, color: ev.tint }}>⋯ A WAYSIDE</div>
              <div style={{ fontSize: T.head, fontWeight: 900, color: '#eadcff', marginTop: 2 }}>{ev.title}</div>
            </div>
          </div>
          <div style={{ fontSize: T.body, color: '#cdc2dd', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 16 }}>{ev.text}</div>
          {!eventOutcome ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {ev.choices.map((ch, k) => (
                <button key={k} onClick={() => chooseEvent(ch)}
                  style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 11, padding: '13px 15px', background: '#16111f', border: `1.5px solid ${ev.tint}66` }}>
                  <div style={{ fontSize: T.body, fontWeight: 900, color: '#eadcff' }}>{ch.label}</div>
                  <div style={{ fontSize: T.small, color: '#9a8fb0', marginTop: 2 }}>{ch.detail}</div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: T.body, color: '#e8dcf6', lineHeight: 1.6, background: '#16111f', border: `1px solid ${ev.tint}44`, borderRadius: 11, padding: '13px 15px', marginBottom: 14 }}>{eventOutcome}</div>
              <button onClick={eventPressOn}
                style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ev.tint, color: '#160f1d', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>
                PRESS ON →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Upgrade choice: pick 1 of 3 before each wave. ──
  if (runPhase === 'upgrade') {
    const nextWave = runWaves[waveIdx];
    return (
      <div>
        {/* THE THRESHOLD (vF-Z): stepping into a ring is a story beat, not a menu. */}
        {waveIdx === 0 && enteredRing && RING_INTRO[enteredRing.id] && (() => {
          const di = diffOf(enteredRing.depth);
          return (
            <div style={{ animation: 'seam-threshold 1s ease-out', display: 'flex', gap: 13, alignItems: 'stretch', background: 'linear-gradient(180deg,#0e1320,#0b0d16)', border: `1px solid ${SEL}44`, borderLeft: `3px solid ${di.color}`, borderRadius: 12, padding: '12px 15px', marginBottom: 14 }}>
              <RingVignette depth={enteredRing.depth} size={narrow ? 64 : 84} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#8fa7c8' }}>⛰ YOU CROSS INTO</span>
                  <span style={{ fontSize: T.sub, fontWeight: 900, color: '#eaf2ff' }}>{enteredRing.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: di.color }}>ring {enteredRing.depth}/8 · {di.label}</span>
                </div>
                <div style={{ fontSize: T.small, color: '#bcc6d8', lineHeight: 1.55, fontStyle: 'italic', marginTop: 5 }}>{RING_INTRO[enteredRing.id]}</div>
              </div>
            </div>
          );
        })()}
        <BuildStrip taken={taken} />
        <SquadState squad={squad} runMods={runMods} />
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: T.head, fontWeight: 900, color: ACCENT }}>{waveIdx === 0 ? '⛰ Gear up for the approach' : `✓ Wave ${waveIdx} cleared — patched up (+${Math.round(patchup * 100)}% HP)`}</div>
          {nextWave.boss && <div style={{ fontSize: T.sub, fontWeight: 900, color: LOSS, marginTop: 6 }}>💀 FINAL STAND — choose your last upgrade well.</div>}
          <div style={{ fontSize: T.body, color: '#cfcfda', marginTop: 5 }}>Pick <b style={{ color: ACCENT }}>one upgrade</b> for your squad — then face <b style={{ color: nextWave.boss ? '#ffb38a' : '#ddd' }}>{nextWave.name}</b>.</div>
          <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>{nextWave.blurb}</div>
        </div>
        <AutoToggle auto={auto} setAuto={setAuto} />
        {/* Tap an upgrade to SELECT it (highlights), then CONFIRM — so a whole-squad / AOE
            pick can't be committed by a stray tap that starts the next wave. */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
          {offer.map((id) => {
            const up = UPGRADE_BY_ID[id];
            const chosen = upgradeChoice === id;
            const aoe = up.scope !== 'unit'; // squad-wide / AOE upgrade
            return (
              <button key={id} onClick={() => setUpgradeChoice(id)} style={{ textAlign: 'center', cursor: 'pointer', borderRadius: 14, padding: '20px 14px', background: chosen ? '#16202e' : PANEL, border: `${chosen ? 3 : 2}px solid ${up.color}`, boxShadow: chosen ? `0 0 20px ${up.color}77` : `0 0 14px ${up.color}33` }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{up.icon}</div>
                <div style={{ fontSize: T.label, fontWeight: 900, color: up.color, marginTop: 8 }}>{up.name}{chosen && ' ✓'}</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: aoe ? '#9be7ff' : DIM, letterSpacing: 0.5, marginTop: 3 }}>{aoe ? '💥 WHOLE SQUAD' : '🎯 ONE CREATURE'}</div>
                <div style={{ fontSize: T.small, color: '#cdd2dd', lineHeight: 1.45, marginTop: 6 }}>{up.desc}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => { if (upgradeChoice) applyUpgrade(UPGRADE_BY_ID[upgradeChoice]); }} disabled={!upgradeChoice}
          style={{ width: '100%', marginTop: 14, padding: '14px 0', borderRadius: 12, border: 'none', background: upgradeChoice ? ACCENT : '#222', color: upgradeChoice ? '#1a1408' : '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 0.5, cursor: upgradeChoice ? 'pointer' : 'default' }}>
          {upgradeChoice ? ((UPGRADE_BY_ID[upgradeChoice].scope !== 'unit') ? `CONFIRM ${UPGRADE_BY_ID[upgradeChoice].name} → ${nextWave.name}` : `CONFIRM — choose who gets ${UPGRADE_BY_ID[upgradeChoice].name} →`) : 'TAP AN UPGRADE ABOVE'}
        </button>
      </div>
    );
  }

  // ── Apex challenge: the gathered-creature fight + its win/lose screens. ──
  if (challenge && (runPhase === 'challenge-fighting' || runPhase === 'challenge-won' || runPhase === 'challenge-lost')) {
    const cti = TYPE_INFO[challenge.type];
    if (runPhase === 'challenge-won') {
      return (
        <div style={{ background: '#0d1a0d', border: `2px solid ${WIN}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: WIN }}>WON OVER</div>
          <div style={{ fontSize: T.body, color: '#cfe8c0', margin: '4px 0 12px' }}>You bested <b>{challenge.name}</b> — it joins your stable.</div>
          <div style={{ margin: '14px 0', background: '#091a12', border: `2px solid ${cti.accent}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>★ APEX RECRUITED</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Sprite spriteId={challenge.spriteId} color={cti.accent} glyph={cti.glyph} anim="idle" size={64} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: T.sub, fontWeight: 900, color: cti.accent }}>{cti.glyph} {challenge.name}</div>
                <div style={{ fontSize: T.small, color: '#cdd', fontWeight: 700 }}>{cti.nick}</div>
                <div style={{ fontSize: T.micro, color: DIM, marginTop: 2 }}>{cti.role}</div>
                <div style={{ fontSize: T.micro, color: '#888', marginTop: 3 }}>Now in your stable — {stable.length}/{COMBAT_ROSTER.length} caught.</div>
              </div>
            </div>
          </div>
          <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>BACK →</button>
        </div>
      );
    }
    if (runPhase === 'challenge-lost') {
      return (
        <div style={{ background: '#1a0d0d', border: `2px solid ${LOSS}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: LOSS }}>IT SLIPPED AWAY</div>
          <div style={{ fontSize: T.body, color: DIM, margin: '4px 0 12px' }}>{challenge.name} broke off and vanished — your sigils keep. Build up and try again.</div>
          <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>BACK →</button>
        </div>
      );
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: T.small, color: DIM, flex: 1 }}>
            <b style={{ color: cti.accent }}>★ APEX CHALLENGE · {cti.glyph} {challenge.name}</b> — beat it to win it over. It stands alone, but it hits like a wall.
          </div>
          {auto && <span style={{ flexShrink: 0, fontSize: T.micro, fontWeight: 900, color: '#9be7ff', background: '#14233a', border: '1px solid #5aa9ff', borderRadius: 8, padding: '3px 8px' }}>⚡ AUTO</span>}
        </div>
        <FightView fight={fight} narrow={narrow} banner={null} bossUid={'B0'}
          auto={auto} onToggleAuto={(n) => { setAuto(n); fight.setLiveAuto(n); }} />
      </div>
    );
  }

  // ── In a run: progress bar + the fight (+ result banner). ──
  // ── THE DROP — the ending ceremony (vF-Z). A full-screen takeover when the final
  // ring falls for the first time: the door, the mentor's last truth, the step through. ──
  if (runPhase === 'drop') {
    const motes = [{ l: 10, d: 0 }, { l: 22, d: 1.1 }, { l: 35, d: 0.5 }, { l: 48, d: 1.7 }, { l: 60, d: 0.3 }, { l: 72, d: 1.3 }, { l: 84, d: 0.8 }, { l: 92, d: 2.0 }];
    const lines = [
      'You walk the last ring to its end, and the Drop opens — not a pit but a doorway, light spilling up out of the dark.',
      'Your mentor stood exactly here. Went in. You understand it now: he was never lost. He was the first one through.',
      'Three cores hum at your chest. The grunlings press close and warm. Seventy-five years of blight — and the answer to all of it is one step away.',
    ];
    return (
      <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
        {/* the portal stage */}
        <div style={{ position: 'relative', height: 224, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: 130, height: 130, borderRadius: '50%', border: '2px solid #b06bff', animation: `seam-drop-ring 3s ease-out ${i}s infinite` }} />
          ))}
          <div style={{ position: 'relative', zIndex: 2, width: 116, height: 168, borderRadius: '58px 58px 10px 10px', background: 'radial-gradient(ellipse at 50% 38%, #f3ecff, #b06bff 56%, #4a2a7a 100%)', animation: 'seam-drop-portal 2.6s ease-out both' }} />
          {motes.map((m, i) => (
            <span key={i} style={{ position: 'absolute', bottom: 0, left: `${m.l}%`, width: 5, height: 5, borderRadius: '50%', background: '#e8dcff', boxShadow: '0 0 6px 1px #cba6ff', animation: `seam-mote ${3.2 + m.d}s linear ${m.d}s infinite` }} />
          ))}
        </div>
        <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2.5, color: '#cba6ff', animation: 'seam-drop-text .8s ease-out both' }}>✦ YOU REACHED THE DROP ✦</div>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: '#eadcff', margin: '6px 0 18px', animation: 'seam-drop-text .8s ease-out .2s both' }}>The First Climb</div>
        <div style={{ maxWidth: 470, margin: '0 auto', textAlign: 'left' }}>
          {lines.map((ln, i) => (
            <div key={i} style={{ fontSize: T.small, color: '#cdbbe6', lineHeight: 1.62, fontStyle: 'italic', marginBottom: 10, animation: `seam-drop-text 1s ease-out ${0.5 + i * 0.6}s both` }}>{ln}</div>
          ))}
          <div style={{ fontSize: T.sub, fontWeight: 900, color: '#fff', textAlign: 'center', letterSpacing: 1, margin: '14px 0', animation: `seam-drop-text 1s ease-out ${0.5 + lines.length * 0.6}s both` }}>You take it.</div>
        </div>
        {pullNow && (() => {
          const ac = COMBAT_CREATURES[pullNow.id]; const ati = TYPE_INFO[ac.type]; const ri = RARITY_INFO[pullNow.rarity];
          return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, margin: '4px auto 0', background: '#160f1d', border: `1px solid ${ri.color}66`, borderRadius: 10, padding: '7px 12px', animation: `seam-drop-text 1s ease-out ${0.5 + (lines.length + 1) * 0.6}s both` }}>
              <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={34} />
              <div style={{ textAlign: 'left', fontSize: T.micro, color: '#cdd' }}>
                <b style={{ color: ri.color }}>{ri.pips} {pullNow.rarity}</b> · {pullNow.isDupe ? `${ac.name} → +${pullNow.gainedCores} ⬡` : `${ac.name} joins you`}
              </div>
            </div>
          );
        })()}
        <div style={{ maxWidth: 470, margin: '20px auto 0', animation: `seam-drop-text 1s ease-out ${0.9 + (lines.length + 1) * 0.6}s both` }}>
          <div style={{ fontSize: T.small, color: '#9a7fc0', lineHeight: 1.55, marginBottom: 12 }}>The way is yours now. The Drop will keep — come again, stronger. There&apos;s more here than one crossing can hold.</div>
          <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: '#b06bff', color: '#160f1d', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>↩ CARRY IT HOME</button>
        </div>
      </div>
    );
  }

  const wave = runWaves[waveIdx];
  const banner = (() => {
    if (runPhase === 'won') {
      return (
        <div style={{ background: '#0d1a0d', border: `2px solid ${WIN}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: WIN }}>RING TAKEN</div>
          <div style={{ fontSize: T.body, color: '#cfe8c0', margin: '4px 0 12px' }}>You cleared <b>{caughtFrom ? caughtFrom.name : 'the ring'}</b> to its heart.</div>
          {pullNow && (() => {
            const ac = COMBAT_CREATURES[pullNow.id]; const ati = TYPE_INFO[ac.type]; const ri = RARITY_INFO[pullNow.rarity];
            return (
              <div style={{ margin: '14px 0', background: '#091a12', border: `2px solid ${ri.color}`, borderRadius: 12, padding: '14px 16px', boxShadow: `0 0 16px ${ri.color}33` }}>
                <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, marginBottom: 6, color: ri.color }}>{ri.pips} {pullNow.rarity.toUpperCase()} {pullNow.isDupe ? 'DUPE' : 'PULL'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={64} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: T.sub, fontWeight: 900, color: ati.accent }}>{ati.glyph} {ac.name} <span style={{ fontSize: T.small, color: ri.color }}>{ri.pips}</span></div>
                    <div style={{ fontSize: T.small, color: '#cdd', fontWeight: 700 }}>{ati.nick}</div>
                    {pullNow.isDupe
                      ? <div style={{ fontSize: T.small, color: WIN, fontWeight: 800, marginTop: 3 }}>Already yours → melted to <b>+{pullNow.gainedCores} ⬡</b> for {ac.name}</div>
                      : <div style={{ fontSize: T.micro, color: '#9be7ff', marginTop: 3 }}>NEW! Joins your stable{pullNow.gainedCores > 0 ? ` with +${pullNow.gainedCores} ⬡` : ''} — {stable.length}/{COMBAT_ROSTER.length} caught.</div>}
                    {caughtFrom && <div style={{ fontSize: T.micro, color: '#888', marginTop: 2 }}>from {caughtFrom.name}</div>}
                  </div>
                </div>
              </div>
            );
          })()}
          {sigilGain && (() => {
            const ac = COMBAT_CREATURES[sigilGain.id]; const ati = TYPE_INFO[ac.type];
            return (
              <div style={{ margin: '14px 0', background: '#0b1426', border: `2px solid ${ati.accent}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>✦ SIGIL FOUND</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={56} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: T.body, fontWeight: 900, color: ati.accent }}>{ati.glyph} {ac.name}'s sigil</div>
                    <div style={{ fontSize: T.small, color: '#9be7ff', fontWeight: 800, marginTop: 2 }}>{'✦'.repeat(sigilGain.count)}{'·'.repeat(APEX_SIGILS - sigilGain.count)} {sigilGain.count}/{APEX_SIGILS}</div>
                    <div style={{ fontSize: T.micro, color: sigilGain.ready ? WIN : DIM, marginTop: 3, fontWeight: sigilGain.ready ? 800 : 400 }}>
                      {sigilGain.ready ? '★ Ready to challenge — pick a squad and call it out.' : `Keep hunting ${caughtFrom ? caughtFrom.name : 'the ring'} for more.`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {!pullNow && !sigilGain && (
            <div style={{ fontSize: T.small, color: DIM, margin: '10px 0', fontStyle: 'italic' }}>Nothing new stirred from this ring.</div>
          )}
          {unlockedNow && (() => { const g = HUNTING_GROUNDS.find((x) => x.depth === unlockedNow); return (
            <div style={{ margin: '12px 0', padding: '12px 14px', borderRadius: 12, background: '#1a1407', border: `2px solid ${ACCENT}` }}>
              <div style={{ fontSize: T.small, fontWeight: 900, color: ACCENT, letterSpacing: 0.5 }}>🔓 THE WAY INWARD OPENS</div>
              <div style={{ fontSize: T.small, color: '#f0e2c8', marginTop: 4 }}>You cleared the ring — <b>{g?.name}</b> now lies open, with rarer creatures to pull within.</div>
            </div>
          ); })()}
          {holdfastNow && (
            <div style={{ margin: '12px 0', padding: '14px 16px', borderRadius: 12, background: '#160f1d', border: '2px solid #b06bff', boxShadow: '0 0 16px #b06bff33', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                <HoldfastVignette size={narrow ? 66 : 84} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff' }}>🏚 THE HOLDFAST RECLAIMS</div>
                  <div style={{ fontSize: T.sub, fontWeight: 900, color: '#eadcff', margin: '3px 0 6px' }}>{holdfastNow.part} <span style={{ fontSize: T.micro, fontWeight: 700, color: '#9a7fc0' }}>· stage {holdfastNow.depth}/{HOLDFAST_MAX}</span></div>
                  <div style={{ fontSize: T.small, color: '#cdbbe6', lineHeight: 1.5, fontStyle: 'italic' }}>{holdfastNow.beat}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 10px', borderRadius: 9, background: '#0e0a14', border: '1px solid #4a3a66' }}>
                <span style={{ fontSize: T.body }}>{holdfastNow.boon.icon}</span>
                <div>
                  <div style={{ fontSize: T.small, fontWeight: 900, color: '#cba6ff' }}>Standing boon — {holdfastNow.boon.name}</div>
                  <div style={{ fontSize: T.micro, color: '#bfa8da' }}>{holdfastNow.boon.desc}</div>
                </div>
              </div>
            </div>
          )}
          {relicChoices.length > 0 && (
            <div style={{ background: '#120a1e', border: '1.5px solid #b06bff', borderRadius: 11, padding: '12px 13px', margin: '10px 0', boxShadow: '0 0 22px #b06bff22' }}>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff', marginBottom: 8 }}>✦ CHOOSE A RELIC <span style={{ color: DIM, fontWeight: 700, letterSpacing: 0 }}>— the boss leaves spoils. Take one.</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {relicChoices.map((r) => {
                  const rc = (RARITY_INFO[r.rarity] || {}).color || r.color;
                  return (
                    <button key={r.id} onClick={() => chooseRelic(r)} title={r.lore}
                      style={{ textAlign: 'left', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', background: PANEL, border: `1.5px solid ${r.color}88` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: T.body }}>{r.icon}</span>
                        <span style={{ fontSize: T.small, fontWeight: 900, color: r.color }}>{r.name}</span>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: rc, letterSpacing: 0.3, marginBottom: 2 }}>{r.rarity.toUpperCase()}</div>
                      <div style={{ fontSize: T.micro, color: '#bfb0d6', lineHeight: 1.35 }}>{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {relicDrop && (
            <div style={{ background: '#150d22', border: '1.5px solid #b06bff', borderRadius: 11, padding: '11px 13px', margin: '10px 0', boxShadow: '0 0 22px #b06bff22' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ fontSize: 30 }}>{relicDrop.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff' }}>✦ RELIC TAKEN</div>
                  <div style={{ fontSize: T.sub, fontWeight: 900, color: '#eadcff', margin: '2px 0' }}>{relicDrop.name} <span style={{ fontSize: T.micro, fontWeight: 800, color: (RARITY_INFO[relicDrop.rarity] || {}).color }}>· {relicDrop.rarity}</span></div>
                  <div style={{ fontSize: T.small, color: '#cba6ff', fontWeight: 700 }}>{relicDrop.desc}</div>
                  <div style={{ fontSize: T.micro, color: '#9a7fc0', lineHeight: 1.45, fontStyle: 'italic', marginTop: 3 }}>{relicDrop.lore} <span style={{ color: DIM, fontStyle: 'normal' }}>— equip it in ✦ RELICS before your next run.</span></div>
                </div>
              </div>
            </div>
          )}
          {runRepeat < 1 && (
            <div style={{ fontSize: T.micro, color: '#b58a3a', margin: '8px 0', fontWeight: 700 }}>↻ Repeat clear — Cores paid at ×{runRepeat.toFixed(2)}. Push a fresh ring inward for full ⬡.</div>
          )}
          <SlagBanked earned={earned} balance={slag} />
          <CoresBanked coresRun={coresRun} />
          <RunRecap taken={taken} stats={stats} squad={squad} />
          <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
        </div>
      );
    }
    if (runPhase === 'lost') return (
      <div style={{ background: '#1a0d0d', border: `2px solid ${LOSS}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: LOSS }}>SQUAD DOWN</div>
        <div style={{ fontSize: T.body, color: DIM, margin: '4px 0 12px' }}>Fell at {wave.boss ? '💀 ' : ''}{wave.name} — wave {waveIdx + 1}/{WAVE_COUNT}.</div>
        <SlagBanked earned={earned} balance={slag} />
        <CoresBanked coresRun={coresRun} />
        <RunRecap taken={taken} stats={stats} squad={squad} />
        <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
      </div>
    );
    return null;
  })();

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {runWaves.map((w, i) => (
          <div key={i} title={w.name} style={{ flex: w.boss ? 1.4 : 1, height: 8, borderRadius: 3,
            background: i < waveIdx || runPhase === 'won' ? WIN : i === waveIdx ? (w.boss ? LOSS : ACCENT) : '#26263a',
            border: w.boss ? `1px solid ${LOSS}99` : 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: T.small, color: DIM, flex: 1 }}>
          <b style={{ color: wave.boss ? '#ffb38a' : '#ddd' }}>{wave.boss ? '💀 ' : ''}Wave {waveIdx + 1}/{WAVE_COUNT} · {wave.name}</b> — {wave.blurb}
        </div>
        {runPhase === 'fighting' && auto && <span style={{ flexShrink: 0, fontSize: T.micro, fontWeight: 900, color: '#9be7ff', background: '#14233a', border: '1px solid #5aa9ff', borderRadius: 8, padding: '3px 8px' }}>⚡ AUTO</span>}
      </div>
      <BuildStrip taken={taken} />
      <FightView fight={fight} narrow={narrow} banner={banner} bossUid={wave.boss ? 'B0' : null}
        auto={auto} onToggleAuto={(n) => { setAuto(n); fight.setLiveAuto(n); }} />
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

export function SeamLab({ onClose, slag = 0, onSlag, version }) {
  const vw = useViewport();
  const narrow = vw < 760;
  const [tab, setTab] = useState('run'); // 'learn' | 'run' | 'sandbox'

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ background: tab === key ? '#16202e' : PANEL, color: tab === key ? '#eaf2ff' : '#999', border: `2px solid ${tab === key ? SEL : LINE}`, borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontSize: T.body, fontWeight: 800 }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.98)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{FX_STYLE}</style>
      {/* Version badge pinned to the viewport so it's visible everywhere — including
          mid-battle when the header has scrolled away. */}
      {version && <div style={{ position: 'fixed', top: 6, right: 8, zIndex: 10000, fontSize: 10, color: '#cfcfd8', background: 'rgba(26,26,34,0.92)', padding: '3px 8px', borderRadius: 4, letterSpacing: 1, fontFamily: 'monospace', border: '1px solid #444', fontWeight: 600, pointerEvents: 'none' }}>{version}</div>}
      <div style={{ maxWidth: 920, margin: '0 auto', padding: narrow ? '14px 12px 48px' : '18px 18px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: T.head, fontWeight: 900, color: '#e86040', letterSpacing: 2 }}>RINGWARD</div>
            <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>Manual combat · charge, spend, build.</div>
          </div>
          {/* Version shown as a fixed corner badge (above) so it survives battle scroll.
              No "← ROSTER" exit — the run IS the game. */}
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
