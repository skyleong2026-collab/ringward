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
import { Cutscene, OPENING_SCENES, RingVignette, HoldfastVignette, EventVignette, WaysideScene } from './Cutscene.jsx';
import { WARDS, wardBlocking, activateWard, advanceWardDeeds } from '../data/wards.js';
import { KEYSTONE_TIERS, shardYield, resolveCraft } from '../data/keystones.js';
import { FeedbackButton } from './Feedback.jsx';
import { setLiveContext } from '../data/feedback.js';
import { endlessWaveSpec, endlessRoundSlag, endlessReached } from '../data/endless.js';
import { evalFeats, featTally, FEAT_GROUPS, TIER_COLOR } from '../data/feats.js';
import { UPGRADES, UPGRADE_BY_ID } from '../data/upgrades.js';
import { RELICS, RELIC_BY_ID, cutsFor, cutEffect } from '../data/relics.js';
import { detectRecipes, memberFits, pullReveal, slotLabel, recipesForCreature, RECIPE_BY_ID, RECIPES } from '../data/recipes.js';
import { GlossaryDot } from '../components/GlossaryPopover.jsx';
import {
  createBattleState,
  runBattle,
  createAIDriver,
  getSkill,
  legalSkills,
  enemiesOf,
  alliesOf,
  makeUnitDef,
  COMBAT_CREATURES,
  COMBAT_ROSTER,
} from '../engine/combat/index.js';
import {
  HUNTING_GROUNDS, D_HP, D_ATK, crossMult, foe, wavesForGround,
  ringLawFor, applyRingLaw, ringLawMods, LAW_RECIPE,
} from '../engine/waves.js';
// Read-only imports for the combat legibility cues (manual-verb audit §5): the
// doctrine walk that predicts an enemy's next move, and the dials the cues quote.
import { applyTemperament } from '../engine/combat/doctrines.js';
import { ASSASSIN, STRIKER } from '../engine/combat/dials.js';
import { DEEP_INSCRIPTIONS, loadStones, saveStones } from '../data/lore.js';

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
// The BUILD each Type opens — shown on a pull so a NEW creature reads as a new build
// PATH opening, not just a sticker (the collection → buildcraft bridge). Short + plain.
const BUILD_LINE = {
  Reactor: 'Burn-stacking', Bulwark: 'Wall + thorns', Mender: 'Sustain engine', Booster: 'Carry buffer',
  Striker: 'Fast-hits', Assassin: 'Finisher', Warden: 'Freeze-lock', Hexer: 'Curse-spread',
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
// HUNTING_GROUNDS now lives in ../engine/waves.js (vF-CC) — ONE source of truth shared
// with the balance sims, so the live game and the harness can never drift apart again.

// WARD GATES — data + pure logic now live in ../data/wards.js (imported above) so the
// gating is headlessly testable (scripts/ward-gates.mjs). The component just orchestrates.
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

// ── RING-CLEAR BEATS (vF-AY): felling a ring's boss is a STORY moment, not just a reward.
// Each clear is the mentor's trail, one ring deeper — his notes getting shorter, stranger,
// braver, closing on the Drop. Shown on the won screen (the boss falls → a beat → the
// spoils). Together with RING_INTRO (entry) they bracket each ring with story; together
// across the 8 they ARE the mentor's through-line toward what he found at the Drop.
const RING_CLEAR = {
  'outer-ring': { boss: 'The Cinder Maw', beat: 'The Cinder Maw goes out like a snuffed coal. The outer ring is yours — the easy country, the part everyone survives. Your mentor barely wrote about it. His note just says: “Past here, start paying attention.”' },
  'fallen-gate': { boss: 'The Gatebreaker', beat: 'The Gatebreaker falls across the rubble of the gate it was named for. Your people built that gate to hold the blight out, and it didn\'t hold. But you got through where it couldn\'t — the way he must have, climbing alone.' },
  'green-seam': { boss: 'The Old Grove', beat: 'The Old Grove stills, and the wrong-green light dims with it. Your grunlings\' cores have been humming louder the deeper you go, like they remember something older than you. He felt it here too. He wrote one word, underlined: “Closer.”' },
  'storm-wire': { boss: 'The Live Wire', beat: 'The Live Wire gutters out, and the old power-lines fall quiet for the first time in seventy-five years. Whatever fell never cut the current — it\'s been calling inward all this time. You\'re following it now. He did too.' },
  'fast-trails': { boss: 'The Blur', beat: 'The Blur finally holds still. This is as far as most ever come back from, and you\'re still climbing. Past here his notes get shorter, then stranger. The last few aren\'t instructions at all. They\'re just questions he never got to answer.' },
  'lightless': { boss: 'The Throat-Cutter', beat: 'The Throat-Cutter falls in the dark, and you go on by the light of your own grunlings\' hearts. Something down here has been watching you climb the whole way. He knew it was there. His note: “It remembers being looked at. Don\'t look back. Keep going.”' },
  'witherfen': { boss: 'The Blight-Heart', beat: 'The Blight-Heart bursts, and the pooled rot goes slack and quiet around you. You\'re nearly there. You can feel the Drop deciding whether to let you pass — the same choice it must have offered him. He chose to go on. You find that you already have.' },
  'frostbound': { boss: 'The Stillness', beat: 'The Stillness ends. The cold goes silent, and the last ring opens ahead of you. Past it, faint and steady, something waits at the Drop — patient, and somehow familiar. He walked into it and never came back down. Now, finally, you\'re going to find out why.' },
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
  Keystone:  { mult: 2.0,  weight: 0,  color: '#5ff0d0', pips: '✦',   dupeCores: 0,   startCores: 0 }, // relic-only: forged, never dropped
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
  { depth: 1, part: 'The Hearth',
    boon: { icon: '🔥', name: 'Hearthlight',   desc: '+8% max HP, every run.',         apply: (m) => { m.hpMult *= 1.08; } },
    alt:  { icon: '⚔️', name: 'First Mark',     desc: '+5% squad damage, every run.',   apply: (m) => { m.dmgMult *= 1.05; } },
    beat: '"You lit it. Good." His voice, first night home. "A holdfast with a cold hearth is just a grave with walls." Three cores he left you, humming on the mantel.' },
  { depth: 2, part: 'The Storeroom',
    boon: { icon: '🌿', name: 'Full Stores',    desc: 'Healing is 25% stronger, every run.',        apply: (m) => { m.healMult *= 1.25; } },
    alt:  { icon: '⚡', name: 'Quick Cache',    desc: 'Squad starts each run with +2 extra charge.', apply: (m) => { m.chargeStart += 2; } },
    beat: 'Behind the fallen gate, his old caches — dried feed, spare core-casings. "Never raid hungry," he used to say. "The blight\'s got nothing but time. Don\'t you forget it."' },
  { depth: 3, part: 'The Drill-Yard',
    boon: { icon: '⚔️', name: 'Old Drills',    desc: '+8% squad damage, every run.',   apply: (m) => { m.dmgMult *= 1.08; } },
    alt:  { icon: '🛡', name: 'Stone Posts',   desc: '+8% max HP, every run.',          apply: (m) => { m.hpMult *= 1.08; } },
    beat: 'The green seam, where things still grow wrong. He drilled his grunlings here. "Grown, not made — earth and old machine. That glow in their chest is the heart. Mind it."' },
  { depth: 4, part: "The Menders' Well",
    boon: { icon: '💧', name: 'Clean Water',   desc: '+6% max HP, every run.',           apply: (m) => { m.hpMult *= 1.06; } },
    alt:  { icon: '🌿', name: "Tender's Shelf", desc: 'Healing is 15% stronger, every run.', apply: (m) => { m.healMult *= 1.15; } },
    beat: 'The well still runs clean — the one thing the blight never fouled. "It fell seventy-five years back," he told you once. "Out of a clear sky. We\'ve called it the Drop ever since."' },
  { depth: 5, part: 'The Watchtower',
    boon: { icon: '⚡', name: 'The Watch',     desc: 'The squad starts every fight with +2 charge already banked.', apply: (m) => { m.chargeStart += 2; } },
    alt:  { icon: '🗡️', name: 'Murder Holes',  desc: '+6% squad damage, every run.',                 apply: (m) => { m.dmgMult *= 1.06; } },
    beat: 'From the tower you can finally see inward — ring on ring, closing like a wound. "He went in," says the wind, or memory. "Past the fifth. Came back wrong. Then went in again."' },
  { depth: 6, part: 'The Deep Cellar',
    boon: { icon: '🗡️', name: 'Cold Edge',     desc: '+8% squad damage, every run.',   apply: (m) => { m.dmgMult *= 1.08; } },
    alt:  { icon: '❤️', name: 'Wrapped Wool',  desc: '+6% max HP, every run.',          apply: (m) => { m.hpMult *= 1.06; } },
    beat: "Past the Warden, the cold gets honest. You understand now why he kept climbing. Down here the blight isn't spreading. It's remembering — and it remembers you." },
  { depth: 7, part: 'The Map-Room',
    boon: { icon: '❤️', name: "Hunter's Heart", desc: '+6% max HP, every run.',          apply: (m) => { m.hpMult *= 1.06; } },
    alt:  { icon: '🌿', name: 'Honed Hands',   desc: 'Healing is 20% stronger, every run.', apply: (m) => { m.healMult *= 1.20; } },
    beat: 'His last map — every ring marked, annotated, crossed out. Except the center. By the Drop he\'d written one word, twice: "Not it. Not it."' },
  { depth: 8, part: "The Drop's Edge",
    boon: { icon: '✦', name: "The Drop's Edge", desc: '+10% damage AND +10% max HP, every run.',   apply: (m) => { m.dmgMult *= 1.10; m.hpMult *= 1.10; } },
    alt:  { icon: '⚔️', name: 'The Vigil',       desc: '+14% damage AND +6% max HP, every run.',    apply: (m) => { m.dmgMult *= 1.14; m.hpMult *= 1.06; } },
    beat: "Frostbound. The rings end. You stand where he stood. The Drop isn't a crater — it's a door, and it's been open the whole time, waiting on someone to come the rest of the way." },
];
const HOLDFAST_MAX = HOLDFAST_STAGES.length; // 8 — reaching the Drop
const stageAtDepth = (d) => HOLDFAST_STAGES.find((s) => s.depth === d) || null;
const HOLDFAST_KEY = '8gents_seam_holdfast'; // deepest ring boss ever beaten (0..8) = reclaim depth
const LEARN_DONE_KEY = 'ringward_learn_done'; // set on first LEARN graduation; gates default-tab + onboarding copy
function loadReclaimed() { try { const n = parseInt(localStorage.getItem(HOLDFAST_KEY), 10); return Number.isFinite(n) ? Math.min(HOLDFAST_MAX, Math.max(0, n)) : 0; } catch { return 0; } }
function saveReclaimed(n) { try { localStorage.setItem(HOLDFAST_KEY, String(n)); } catch { /* best-effort */ } }
const HOLDFAST_PICKS_KEY = '8gents_seam_holdfast_picks';
function loadHoldfastPicks() { return loadJson(HOLDFAST_PICKS_KEY, {}); }
function saveHoldfastPicks(p) { saveJson(HOLDFAST_PICKS_KEY, p); }
const TEMPERING_KEY = '8gents_seam_tempering';
const TEMPERING_CAP = 10;
function loadTempering() { try { const n = parseInt(localStorage.getItem(TEMPERING_KEY), 10); return Number.isFinite(n) ? Math.min(TEMPERING_CAP, Math.max(0, n)) : 0; } catch { return 0; } }
function saveTempering(n) { try { localStorage.setItem(TEMPERING_KEY, String(n)); } catch { /* best-effort */ } }
const temperCost = (tier) => Math.round(40 * Math.pow(1.5, tier));
// Fold every reclaimed stage's standing boon into a run's opening mods (mutates m).
// picks = {depth: 0|1} — 0 (or absent) = main boon, 1 = alt boon.
function holdfastMods(reclaimed, m, picks = {}) { HOLDFAST_STAGES.forEach((s) => { if (s.depth <= reclaimed) (picks[s.depth] === 1 && s.alt ? s.alt : s.boon).apply(m); }); }

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
// Generic JSON persistence helpers — used by the plain-object and array load/save pairs below.
function loadJson(key, fallback) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; } }
function saveJson(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* best-effort */ } }

function loadSigils() { return loadJson(SIGILS_KEY, {}); }
function saveSigils(m) { saveJson(SIGILS_KEY, m); }
const PITY_KEY = '8gents_seam_pity'; // pulls since the last Legendary (drives the pity guarantee)
function loadPity() { try { const n = parseInt(localStorage.getItem(PITY_KEY), 10); return Number.isFinite(n) ? n : 0; } catch { return 0; } }
function savePity(n) { try { localStorage.setItem(PITY_KEY, String(n)); } catch { /* best-effort */ } }
// Distinct Types ever fielded in a ring clear (drives the Type-mastery feat). Stored as a
// Type-string array; the feat reads its length (0..8). Recorded on a boss clear.
const TYPES_MASTERED_KEY = '8gents_seam_types';
function loadTypesMastered() { const a = loadJson(TYPES_MASTERED_KEY, []); return Array.isArray(a) ? a : []; }
function saveTypesMastered(a) { saveJson(TYPES_MASTERED_KEY, a); }

// COOKED RECIPES (R4) — set of recipe ids the player has fielded a complete squad for in a
// ring clear. Recorded once per unique recipe at the boss-clear moment (projection-safe: a
// pure subset of what the save already proved). Never mutated inside a run.
const RECIPES_COOKED_KEY = '8gents_seam_recipes';
function loadRecipesCooked() { const a = loadJson(RECIPES_COOKED_KEY, []); return Array.isArray(a) ? a : []; }
function saveRecipesCooked(a) { saveJson(RECIPES_COOKED_KEY, a); }

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

// ── SUMMON / GACHA (vF-BJ): a deliberate pull you SPEND slag on, drawn from the whole
// wild roster (not a single ring), weighted by rarity, sharing the same PITY as ring-pulls.
// New → caught (+ a rarity Core head-start); dupe → melts to that creature's Cores. Gives
// breadth (creatures + Cores), never a shortcut past the climb. Returns {id,rarity,isDupe}.
const SUMMON_COST = 50;    // slag for a single call
const SUMMON5_COST = 220;  // slag for a five-fold call (a small discount + a guaranteed Rare+)
const SUMMON10_COST = 420; // slag for a ten-fold call (bigger discount + a guaranteed Legendary)
// Summon banners (vF-BJ2): a choice of pool. Deep Call costs more but pulls Legendaries far
// more often (boosts their weight). Cost of any draw = base × the banner's costMult.
const SUMMON_BANNERS = [
  { id: 'wild', name: 'The Wild Call', legBoost: 1,   costMult: 1,   blurb: 'the full roster, at base odds' },
  { id: 'deep', name: 'The Deep Call', legBoost: 2.2, costMult: 1.5, blurb: 'costs more — Legendaries answer ~2× as often' },
  { id: 'near', name: 'The Near Call', legBoost: 1,   costMult: 1,   biasMult: 5, blurb: 'leans toward where you stand' },
];
// `biasIds` + `biasMult` = a "Near Call": the camped ring's locals get their weight
// multiplied, so pulls lean toward where you stand (the Pokémon-GO half of the gacha).
// The pity guarantee is unchanged — if the camped ring owns a Legendary, the bias prefers
// it among the guaranteed picks so "camp the Frostbound, pull the rimecaller" holds on pity too.
function summonPull(stableIds, pity = 0, rand = Math.random, legBoost = 1, biasIds = null, biasMult = 1) {
  const pool = COMBAT_ROSTER.map((c) => c.id).filter((id) => !isApex(id));
  if (!pool.length) return null;
  const biased = (id) => !!(biasIds && biasMult > 1 && biasIds.includes(id));
  const legs = pool.filter((x) => rarityOf(x) === 'Legendary');
  let id;
  if (legs.length && pity >= PITY_AT) {                 // pity: guarantee a Legendary (prefer an unowned one; then a camped local)
    const fresh = legs.filter((x) => !stableIds.includes(x));
    let ls = fresh.length ? fresh : legs;
    const local = ls.filter(biased); if (local.length) ls = local; // a camped Legendary wins the tie
    id = ls[Math.floor(rand() * ls.length)];
  } else {
    // legBoost > 1 = a "Deep Call" banner: Legendary weight is multiplied, so rares pull more.
    // biasMult > 1 = a "Near Call": the camped ring's locals are weighted up.
    const w = pool.map((x) => { let b = RARITY_INFO[rarityOf(x)].weight || 1; if (rarityOf(x) === 'Legendary') b *= legBoost; if (biased(x)) b *= biasMult; return b; });
    let roll = rand() * w.reduce((s, x) => s + x, 0);
    id = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { roll -= w[i]; if (roll < 0) { id = pool[i]; break; } }
  }
  return { id, rarity: rarityOf(id), isDupe: stableIds.includes(id) };
}
// The chance a single Near Call lands one of the camped ring's locals (folk-honest odds for
// the summon screen). Mirrors summonPull's weighting exactly; pity calls are excluded (they
// guarantee a Legendary), so this is the steady-state per-call probability.
function localPullChance(biasIds, biasMult) {
  const pool = COMBAT_ROSTER.map((c) => c.id).filter((id) => !isApex(id));
  if (!pool.length || !biasIds) return 0;
  const localSet = new Set(biasIds.filter((id) => pool.includes(id)));
  let total = 0, local = 0;
  for (const id of pool) { const w = (RARITY_INFO[rarityOf(id)].weight || 1) * (localSet.has(id) ? biasMult : 1); total += w; if (localSet.has(id)) local += w; }
  return total ? local / total : 0;
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
// D_HP / D_ATK / crossMult / KIT_THREAT / foe / wavesForGround now live in
// ../engine/waves.js (vF-CC) — ONE shared source with the balance sims, so the live
// game and the harness can never drift apart. Calibration notes: RINGWARD-DEPTH-LADDER.md.
const WAVE_COUNT = 4; // every generated run is four waves (used for progress display)
// ── THE CROSSINGS (vF-BA NG+) — the story past the Drop. Reaching the Drop at crossing N
// shows beat[N]; STEP THROUGH advances to crossing N+1 (rings reform harder). The mentor's
// trail continues on the far side and his fate unfolds, crossing by crossing.
const CROSSING_BEATS = [
  { title: 'The First Climb', lines: [
    'You walk the last ring to its end, and the Drop opens — not a pit but a doorway, light spilling up out of the dark.',
    'Your mentor stood exactly here. Went in. You understand it now: he was never lost. He was the first one through.',
    'Three cores hum at your chest. Seventy-five years of blight — and the answer to all of it is one step away.',
  ], take: 'You take it.', step: 'STEP THROUGH →' },
  { title: 'The Second Crossing', lines: [
    'Through the door, the rings are still here — but wrong-side-out, reformed harder behind you, the blight thicker and older.',
    'And there, scratched into the first stone past the threshold, in a hand you know: "Keep climbing. It gets worse. Keep climbing anyway."',
    'He came this far and kept going. So will you.',
  ], take: 'You go on.', step: 'DEEPER →' },
  { title: 'The Third Crossing', lines: [
    'Deeper than your mentor\'s notes ever reached. The grunlings\' cores burn bright and certain now, leading you, like they\'ve come home.',
    'You start to understand what he understood: the Drop was never a wound in the world. It was a door someone left open. And someone has to close it — or walk all the way through.',
  ], take: 'You choose to walk through.', step: 'FARTHER STILL →' },
  { title: 'The Fourth Crossing', lines: [
    'You find him at last — or what the climb made of him. Not dead. Changed. Still climbing, somewhere ahead, a light that never quite stops moving.',
    '"You came," he says, without turning. "I hoped you wouldn\'t. I hoped you would." He hands you nothing. He\'s already given you everything: the cores, the holdfast, the long road up.',
  ], take: 'You climb on, together now.', step: 'TO THE END →' },
  { title: 'The Deep Crossing', lines: [
    'There is no bottom to it. There never was. Just the climb, and the ones you climb it for, and the light you carry into the dark so the next one can follow.',
    'You stopped counting crossings a while ago. So did he. You just keep going up — which, this far in, is the only way that\'s left.',
  ], take: 'You keep climbing.', step: 'AGAIN →' },
];
const crossingBeat = (c) => CROSSING_BEATS[Math.min(c, CROSSING_BEATS.length - 1)];
const CROSSING_KEY = '8gents_seam_crossing'; // how many times you've stepped through the Drop (NG+ level)
function loadCrossing() { try { return Math.max(0, parseInt(localStorage.getItem(CROSSING_KEY), 10) || 0); } catch { return 0; } }
function saveCrossing(n) { try { localStorage.setItem(CROSSING_KEY, String(n)); } catch { /* best-effort */ } }
const WARDS_KEY = '8gents_seam_wards'; // {wardId: {active, progress, solved}} — gate-riddle state
function loadWards() { return loadJson(WARDS_KEY, {}); }
function saveWards(w) { saveJson(WARDS_KEY, w); }
const SHARDS_KEY = '8gents_seam_shards'; // relic-shards — salvaged from relics, spent forging Keystones
function loadShards() { try { const n = parseInt(localStorage.getItem(SHARDS_KEY), 10); return Number.isFinite(n) ? Math.max(0, n) : 0; } catch { return 0; } }
function saveShards(n) { try { localStorage.setItem(SHARDS_KEY, String(n)); } catch { /* best-effort */ } }
const ENDLESS_BEST_KEY = '8gents_seam_endless_best'; // furthest round ever cleared in the Gauntlet
function loadEndlessBest() { try { const n = parseInt(localStorage.getItem(ENDLESS_BEST_KEY), 10); return Number.isFinite(n) ? Math.max(0, n) : 0; } catch { return 0; } }
function saveEndlessBest(n) { try { localStorage.setItem(ENDLESS_BEST_KEY, String(n)); } catch { /* best-effort */ } }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']; // crossing numeral
const roman = (n) => ROMAN[n] || ('×' + n);

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
    text: 'An old healer tends a low fire at the crossroads, humming a tune your mentor used to whistle. She looks up, unsurprised.',
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
  { id: 'watcher', glyph: '🔭', tint: '#9be7ff', title: 'The Rim-Watcher',
    text: "An old watcher keeps a cold vigil here, her scope trained inward at the rings. She doesn't turn as you pass. “You've got his walk,” she says. “He'd stop right here too. Said the rings were listening. Said you could hear the Drop think, if you got quiet enough.”",
    choices: [
      { label: 'Ask about him', detail: 'How did he climb?', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.08; }), '👁 She tells it plain: patient, never cornered, never proud. He treated every ring like it could kill him, because it could. You climb a little wiser for the telling. +8% damage onward.') },
      { label: 'Share the watch', detail: 'Sit a while.', apply: (c) => (c.heal(0.3), '✚ You take an hour at the scope beside her, saying nothing. The squad rests. For one hour the blight holds still, almost respectful.') },
    ] },
  { id: 'cairn', glyph: '🪦', tint: '#b8b8c8', title: 'The First Cairn',
    text: 'A cairn older than the blight, names cut into every stone — the first climbers, from when the Drop was new and the rings were only one ring. None of them came back down. Your mentor’s name is here too, cut fresh, in his own hand, the day before he went up for the last time.',
    choices: [
      { label: 'Add your name', detail: 'Say you were here.', apply: (c) => (c.prime(2), c.buff((m) => { m.dmgMult *= 1.05; }), "🪦 You cut your name beneath his. Whatever waits at the Drop, it will know you came on purpose. The squad climbs with that purpose in them — Primed, +5% damage.") },
      { label: 'Take a stone for luck', detail: 'Carry them with you.', apply: (c) => (c.cores(20), '✦ You pocket one small stone, still warm from the sun. +20 ⬡ — and something steadier sitting in your chest for the climb ahead.') },
    ] },
  // ── BRANCHING TALES (vF-BG): multi-step choose-your-own-path passages. A `steps` map
  // (start → step ids) replaces the single text/choices. A choice with `goto` advances to
  // another step (running any `apply` for effects on the way); a choice with no `goto` is
  // terminal — its `apply(ctx)` returns the outcome line, same as a one-shot event. `scene`
  // names a WaysideScene backdrop. Per-choice `icon` shows a glyph on the button. Pure
  // run-meta like every wayside — never touches the engine. ──
  { id: 'tale_fire', kind: 'story', glyph: '🔥', tint: '#ffae5a', title: 'The Fire and the Stranger', scene: 'camp', image: '/art/wayside/camp.jpg', start: 'meet',
    steps: {
      meet: {
        text: "A fire burns low off the trail, and a figure sits beside it — another climber, older, hands scarred. They lift a hand, unhurried. “Long way to come alone,” they say. “Sit. The fire’s warm and I’ve talked to no one in days.”",
        choices: [
          { icon: '🔥', label: 'Sit with them', detail: 'Trust costs nothing yet.', apply: (c) => c.heal(0.2), goto: 'sit' },
          { icon: '👁', label: 'Hang back in the dark', detail: 'Watch before you trust.', goto: 'watch' },
          { icon: '🚶', label: 'Nod and keep walking', detail: 'No time for fires.', apply: (c) => (c.slag(14), '🚶 You raise a hand and pass on. They don’t call after you. You strip a little slag from the trailside as you go. +14 ⚒.') },
        ] },
      sit: {
        text: "You sit. They share dried meat and a tin of something bitter and good, and the squad eases by the warmth. After a while the stranger studies you. “You’ve got a mentor’s look. I knew one like that — went up and didn’t come down.” They turn a small worn token over in their hands. “I can tell you what he taught me, or I can give you this. Not both. A body’s got to keep something back.”",
        choices: [
          { icon: '📜', label: 'Hear what he taught', detail: '+12% damage onward.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.12; }), '📜 They talk low into the fire — how he read a ring, where he never stepped twice. You climb sharper for it. +12% damage onward.') },
          { icon: '🎴', label: 'Take the token', detail: 'A found relic.', apply: (c) => { const r = c.relic(); if (r) return `🎴 They press it into your hand — ${r.name}. “He’d want it moving,” they say. Yours now.`; c.cores(30); return '🎴 You reach for it — but it’s a thing you already carry the like of. They give you Cores from their own pack instead. +30 ⬡.'; } },
        ] },
      watch: {
        text: "You stay in the dark and watch. The stranger only sits, feeding the fire twig by twig, talking quiet — to a grunling’s cold grey core set in the dirt beside them, you realize. Grieving it. After a while they bank the fire and sleep, their pack lying open and unguarded.",
        choices: [
          { icon: '🤝', label: 'Step into the light anyway', detail: 'Share the watch. Heal well.', apply: (c) => (c.heal(0.34), '🤝 You sit across the fire. They don’t startle — maybe they knew. You keep the watch together till dawn, saying little. The squad rests deep.') },
          { icon: '🎒', label: 'Take from the pack, slip away', detail: 'Slag, no thanks owed.', apply: (c) => (c.slag(34), '🎒 You lift what won’t be missed and go. It’s the trail’s way, you tell yourself. +34 ⚒ — and a small weight that isn’t slag.') },
        ] },
    } },
  { id: 'tale_door', kind: 'story', glyph: '🚪', tint: '#b06bff', title: 'The Sealed Door', scene: 'ruin', image: '/art/wayside/ruin.jpg', start: 'door',
    steps: {
      door: {
        text: "Set into a ruined wall is a vault door, blight-eaten at the hinges but whole. Behind it something hums — low and patient, the sound a charged core makes. Sealed this deep in, it was sealed for a reason. Or sealed to keep it safe.",
        choices: [
          { icon: '💪', label: 'Force it with the squad', detail: 'Hard work, some wounds.', apply: (c) => c.hurt(0.14), goto: 'forced' },
          { icon: '🔍', label: 'Find the mechanism', detail: 'Slower, careful.', goto: 'mech' },
          { icon: '🚫', label: 'Leave it sealed', detail: 'Some doors stay shut.', apply: (c) => (c.buff((m) => { m.healMult *= 1.15; }), '🚫 You leave it be. Caution has kept you alive this far, and the discipline of walking away steadies the squad. +15% healing onward.') },
        ] },
      forced: {
        text: "The grunlings set their shoulders and the door grinds inward, rust raining down. The wounds were worth it: a dry vault, untouched, the hum coming from a core-casing on a stone shelf — and beside it a climber’s kit, long abandoned.",
        choices: [
          { icon: '🎴', label: 'Take the humming casing', detail: 'A found relic.', apply: (c) => { const r = c.relic(); if (r) return `🎴 You pry the casing open — ${r.name} inside, still warm. Yours.`; c.cores(42); return '🎴 The casing holds only spent Cores — but plenty of them. +42 ⬡.'; } },
          { icon: '⬡', label: 'Strip the whole vault', detail: 'Cores and scrap.', apply: (c) => (c.cores(28), c.slag(20), '⬡ You take everything not bolted down — banked Cores, good scrap. +28 ⬡, +20 ⚒.') },
        ] },
      mech: {
        text: "You don’t force it. You trace the door’s edge until you find it — a core-lock, the kind your people built before the blight, made to open for a living core and no other key. Your grunlings carry exactly that. You could power it clean… or pry the lock for parts and never know what hummed inside.",
        choices: [
          { icon: '⚡', label: 'Power the lock with a core', detail: 'It opens clean. A relic.', apply: (c) => { const r = c.relic(); if (r) return `⚡ The lock drinks the charge and the door sighs open — ${r.name} on the shelf within, left for someone who knew the old way. Yours.`; c.cores(46); return '⚡ The door opens on a stripped vault — but a good cache of Cores remains. +46 ⬡.'; } },
          { icon: '🔧', label: 'Pry the lock for parts', detail: 'Sure slag, no risk.', apply: (c) => (c.slag(40), '🔧 You take the lock apart for its old, good metal and leave the door to its humming. +40 ⚒ — and you’ll wonder, later, what was behind it.') },
        ] },
    } },
  { id: 'tale_tree', kind: 'story', glyph: '🌳', tint: '#7ec88a', title: 'The Hollow Tree', scene: 'grove', image: '/art/wayside/grove.jpg', start: 'tree',
    steps: {
      tree: {
        text: "In a stand of pale dead trees, one trunk has grown wrong — half-fused to a grunling that wandered in years ago and never left, the two grown into each other. Its little core still flickers in the hollow of the wood: weak, alive, afraid of you.",
        choices: [
          { icon: '✂️', label: 'Try to free its core', detail: 'Careful, costly work.', apply: (c) => c.hurt(0.12), goto: 'free' },
          { icon: '📜', label: 'Read the carvings on the bark', detail: 'Someone marked this place.', goto: 'carve' },
          { icon: '🔥', label: 'Burn it clean, move on', detail: 'A hard mercy.', apply: (c) => (c.prime(2), c.buff((m) => { m.dmgMult *= 1.06; }), '🔥 You give it the only kindness left and set the hollow alight. The squad watches it go quiet and climbs on harder-eyed. Primed, +6% damage onward.') },
        ] },
      free: {
        text: "You work the core loose splinter by splinter, the wood fighting you, your own hands torn for it. At last it comes free — a small, frightened, living thing pulsing in your palm. It looks at you. It has a choice to make too, and so do you.",
        choices: [
          { icon: '⚡', label: 'Let it ride with the squad', detail: 'It imprints. Primed + edge.', apply: (c) => (c.prime(3), c.buff((m) => { m.dmgMult *= 1.05; }), '⚡ It settles against your grunlings like it always belonged. The squad climbs Primed and a little bolder for the company. +5% damage onward.') },
          { icon: '✚', label: 'Set it loose toward home', detail: 'Send it down. Its gift.', apply: (c) => (c.cores(30), c.heal(0.2), '✚ You point it downhill and it goes — but not before its core sheds what it gathered over those long years. +30 ⬡, and the squad eases watching it run.') },
        ] },
      carve: {
        text: "Cut into the bark, weathered but clear, is a mark you know — your mentor’s, the same hand as the cairn. He stood here. Below it, more cuts: a few hard lines of advice, and an arrow pointing to a flat stone at the roots.",
        choices: [
          { icon: '📜', label: 'Follow his lines', detail: '+10% dmg & +15% heal.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.10; m.healMult *= 1.15; }), '📜 What he learned this deep, cut where only someone climbing would find it. You climb smarter and gentler on the squad. +10% damage, +15% healing onward.') },
          { icon: '🪨', label: 'Lift the stone at the roots', detail: 'He cached something.', apply: (c) => (c.cores(24), c.heal(0.3), '🪨 Under it, wrapped against the rot: rations, salve, a handful of banked Cores he left for whoever came after. For you. +24 ⬡, the squad recovers.') },
        ] },
    } },
  { id: 'tale_bell', kind: 'story', glyph: '🔔', tint: '#7fd6ff', title: 'The Drowned Bell', scene: 'water', start: 'pool',
    steps: {
      pool: {
        text: "A still pool, and rising from its center a rusted iron bell on a leaning post — a warning-bell, from when the rim still watched this far in. The water around it is black and very deep. Something pale rests at the bottom, just under the surface of seeing.",
        choices: [
          { icon: '🔔', label: 'Ring the bell', detail: 'Call out. Who answers?', goto: 'ring' },
          { icon: '🤿', label: 'Wade for what sank', detail: 'Cold, deep, uncertain.', apply: (c) => c.hurt(0.1), goto: 'wade' },
          { icon: '🚶', label: 'Leave the dead their quiet', detail: 'Some things stay sunk.', apply: (c) => (c.buff((m) => { m.healMult *= 1.12; }), '🚶 You let it lie and move on, lighter for the respect. The squad climbs a little gentler. +12% healing onward.') },
        ] },
      ring: {
        text: "You strike the bell once. The note rolls out flat across the water and keeps going, far longer than a sound should. When it finally dies the pool has gone glass-still — and a voice, or the memory of one, says only: thank you. Whoever was waiting to hear that bell is at rest now.",
        choices: [
          { icon: '✚', label: 'Sit with the quiet', detail: 'Rest in the peace.', apply: (c) => (c.heal(0.4), '✚ You sit a while where the bell still hums in the stone. The squad rests deep in the stillness it leaves behind.') },
          { icon: '⚡', label: "Take the bell's tongue", detail: 'Old iron, still ringing.', apply: (c) => (c.prime(3), c.cores(15), '⚡ You work the iron tongue free — it carries the note in it still, a thing that wants to wake. The squad starts the next fights Primed. +15 ⬡.') },
        ] },
      wade: {
        text: "You wade in to your chest, the cold a living thing, and your fingers close on it: a climber's core-lamp, sealed, the light inside never gone out. And beneath, the climber, at peace. Your mentor's mark is scratched on the lamp's base — he came this far, and left it for the next.",
        choices: [
          { icon: '🏮', label: 'Take the lamp', detail: 'His light, passed on.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.1; m.chargeStart += 1; }), '🏮 The lamp wakes warm in your hands. You climb by his light now — +10% damage and start every fight +1 charge, the rest of the way.') },
          { icon: '✦', label: 'Take only the cores', detail: 'Leave him his lamp.', apply: (c) => (c.cores(35), '✦ You leave the lamp lit beside him and take only the spare cores from his pack. +35 ⬡ — and the small comfort of doing right by a stranger who did right by you.') },
        ] },
    } },
  { id: 'tale_dark', kind: 'story', glyph: '🕳', tint: '#b06bff', title: 'The Long Dark', scene: 'hollow', start: 'mouth',
    steps: {
      mouth: {
        text: "The trail runs straight into the mouth of a cave and does not come out the other side that you can see. Cold air breathes from it, and far back a glow — not firelight. Something is lit down there. The way around is a long, exposed climb. The way through is short, and dark, and certain of nothing.",
        choices: [
          { icon: '🔦', label: 'Go through the dark', detail: 'Short, blind, faster.', goto: 'through' },
          { icon: '⛰', label: 'Take the long way around', detail: 'Safe, slow, tiring.', apply: (c) => (c.slag(30), '⛰ You take the exposed high road. Hard miles, but you strip good salvage off the old wreckage up there. +30 ⚒.') },
        ] },
      through: {
        text: "Inside, the dark is total but for that glow — and it resolves, as you near it, into a grunling. Wild, alone, its core burning bright enough to light the whole cavern, curled around something it is guarding. It watches you come. It does not run. It has been waiting down here for someone a long time.",
        choices: [
          { icon: '🤝', label: 'Approach slow, open-handed', detail: 'Trust the lonely thing.', apply: (c) => (c.prime(2), c.buff((m) => { m.dmgMult *= 1.08; }), '🤝 You crouch and wait, and after a long moment it comes to you, and lights your way out the far side before slipping back into its dark. The squad climbs Primed and bolder for the company. +8% damage onward.') },
          { icon: '✦', label: 'Take what it guards', detail: "It can't stop you.", apply: (c) => (c.cores(45), c.hurt(0.12), "✦ You take the cores it was curled around. It doesn't fight you — just watches, and that's worse. +45 ⬡, and a few scrapes finding the exit alone in the dark.") },
        ] },
    } },
  { id: 'tale_cairn', kind: 'story', glyph: '🪨', tint: '#e8b06a', title: 'The Crossroads Cairn', scene: 'trail', start: 'fork',
    steps: {
      fork: {
        text: "The trail splits clean in two around a cairn of stacked stones — old, deliberate, the topmost rock marked with a hand you've come to know: your mentor's. One fork climbs into the wind. The other drops into close, green dark. He left no word on which. Only the stones, and the choosing.",
        choices: [
          { icon: '⬆️', label: 'Take the high fork', detail: 'Into the wind.', goto: 'high' },
          { icon: '⬇️', label: 'Take the low fork', detail: 'Into the green dark.', goto: 'low' },
          { icon: '🪨', label: 'Add a stone first', detail: 'Mark that you passed.', goto: 'cairn' },
        ] },
      high: {
        text: "The high road is all teeth and weather — bare rock, wind that wants you off it. But up here you can see: the rings laid out below like ripples in a pond, and the Drop at the dead center, patient. It steadies something in you to look at it plain.",
        choices: [
          { icon: '⚡', label: 'Climb it hard, eyes ahead', detail: 'Primed, +8% damage.', apply: (c) => (c.prime(2), c.buff((m) => { m.dmgMult *= 1.08; }), '⚡ You take the wind head-on and let the sight of the Drop pull you up. The squad climbs Primed and harder-eyed. +8% damage onward.') },
          { icon: '✚', label: 'Shelter in the lee a while', detail: 'Rest out of the wind.', apply: (c) => (c.heal(0.35), c.buff((m) => { m.healMult *= 1.08; }), '✚ You tuck the squad into a wind-shadow and let them breathe. They come down rested and steadier. +8% healing onward.') },
        ] },
      low: {
        text: "The low fork sinks into a green hush, the air close and wet, the light gone soft. Half-swallowed in the moss off the path is a pack — a climber's, long set down, the buckles gone green but the canvas holding. Whoever left it here did not come back to lift it.",
        choices: [
          { icon: '🎒', label: 'Open the pack', detail: 'Take what they left.', apply: (c) => { const r = c.relic(); return r ? `🎒 Wrapped in oilcloth at the bottom: ${r.name}. Their climb ended here; yours carries it on.` : (c.cores(30), '🎒 The gear has long rotted, but a handful of banked cores spill from a side pocket. +30 ⬡.'); } },
          { icon: '🪦', label: 'Leave it, mark the spot', detail: 'Respect the dead.', apply: (c) => (c.buff((m) => { m.healMult *= 1.12; }), '🪦 You stack a few stones over the pack and leave it to the moss. The squad climbs gentler for the small decency. +12% healing onward.') },
        ] },
      cairn: {
        text: "You set a stone on the pile, and the shift of it tips the marked top-rock aside — and under it, dry in a fold of waxed cloth, a few lines in his hand. Not a map. Just what he had learned this far in, set down for whoever came after with the sense to add a stone.",
        choices: [
          { icon: '📜', label: 'Read, and take his road', detail: '+10% damage & healing.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.10; m.healMult *= 1.10; }), '📜 Hard-won lines, plainly put. You climb both harder and kinder for them, the way he must have meant. +10% damage and +10% healing onward.') },
          { icon: '✦', label: 'Take what he cached with it', detail: 'Cores left for you.', apply: (c) => (c.cores(28), c.heal(0.2), '✦ Folded in with the note: cores he carried up and chose not to spend, saved for the next hand. +28 ⬡, and the squad eases reading it.') },
        ] },
    } },
  { id: 'tale_salt', kind: 'story', glyph: '⚪', tint: '#cfd6e0', title: 'The Salt Ring', scene: 'ruin', start: 'ring',
    steps: {
      ring: {
        text: "A ring of white salt, poured careful on bare stone, mostly unbroken after who knows how long — a warding circle, the old kind, meant to keep something out. Or in. At its center sits a single grunling core, dark and cold and still, set down with intention. The salt line is the only thing between you and it.",
        choices: [
          { icon: '👣', label: 'Step over the salt', detail: 'Break the ward, take the core.', goto: 'cross' },
          { icon: '🧂', label: 'Mend the salt line', detail: "Hold the ward — keep what it kept.", apply: (c) => (c.buff((m) => { m.blockMult *= 1.12; }), "🧂 You pour your own ration of salt to close the gaps and leave the ward whole. Some doors you don't open. The squad climbs warier, harder to crack. +12% block onward.") },
          { icon: '👁', label: 'Read the ward', detail: 'Learn what it warns.', goto: 'read' },
        ] },
      cross: {
        text: "You break the line with your boot and nothing happens — no rush of cold, no waking thing. Just an old dark core, and as you lift it, warmth: it is not dead. It was only sleeping, sealed, waiting out the long blight the way the smart things learned to. It looks at you, very old, not afraid.",
        choices: [
          { icon: '🤝', label: 'Wake it the rest of the way', detail: 'Primed, +7% damage.', apply: (c) => (c.prime(3), c.buff((m) => { m.dmgMult *= 1.07; }), '🤝 You warm it back to itself and it falls in beside your squad like it had been waiting for exactly you. Primed, +7% damage onward.') },
          { icon: '✦', label: 'Take its banked light', detail: 'Cores; let it sleep on.', apply: (c) => (c.cores(40), '✦ You draw off the light it banked over all those sealed years and set it gently down to sleep again. +40 ⬡, and no harm done to the old thing.') },
        ] },
      read: {
        text: "The salt is not just poured — it is written, words spiraling inward, your mentor's hand among older ones. Not a warning against what is inside. A warning to whoever climbs past: of what waits deeper, the thing he names but you cannot quite read, the ink gone where his pen pressed hardest.",
        choices: [
          { icon: '📜', label: 'Learn what he warns of', detail: '+15% damage onward.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.15; }), '📜 You cannot read the name, but you read the shape of his fear, and you sharpen for it. The squad climbs ready for worse. +15% damage onward.') },
          { icon: '🏮', label: 'Take the warding for your own', detail: 'Old protection.', apply: (c) => { const r = c.relic(); return r ? `🏮 You lift the ward's anchor-stone from the salt — ${r.name}, old protection, yours now.` : (c.buff((m) => { m.blockMult *= 1.10; }), '🏮 You take the ward\'s habit if not its stone — the squad climbs harder to break. +10% block onward.'); } },
        ] },
    } },
  // ── MERCHANT nodes (vF-BB): spend the slag you'd otherwise hoard for the Forge on an
  // immediate edge for THIS run. A real trade — power now vs. a permanent perk later. ──
  { id: 'trader', kind: 'merchant', glyph: '🛒', tint: '#c9c98a', title: 'The Wayside Trader',
    text: 'A trader has set a blanket of wares across a flat stone — salves, whetstones, odd bright things. "Long climb ahead," she says. "I take slag. You won\'t carry it through the door anyway."',
    choices: [
      { label: 'Buy a mending', cost: 25, detail: 'Patch the whole squad up.', apply: (c) => (c.heal(0.5), '🛒 She works salve into every crack and wound. The squad stands easier. (−25 ⚒)') },
      { label: 'Buy a whetted edge', cost: 35, detail: '+15% damage, rest of the climb.', apply: (c) => (c.buff((m) => { m.dmgMult *= 1.15; }), '🛒 She hones every claw and tooth to a wicked point. +15% damage onward. (−35 ⚒)') },
      { label: 'Just passing', detail: 'Keep your slag.', apply: () => '🛒 You nod and move on, slag still in your pocket.' },
    ] },
  { id: 'dealer', kind: 'merchant', glyph: '🛒', tint: '#c9c98a', title: 'The Scrap-Dealer',
    text: 'A wiry dealer crouches over a hoard of salvage, sorting cores from junk by feel. "Everyone\'s broke this deep in," he mutters, not looking up. "But everyone needs something. What\'s it gonna be?"',
    choices: [
      { label: 'Buy a jolt', cost: 20, detail: 'Start the next fights Primed.', apply: (c) => (c.prime(3), '🛒 He cracks a spare core against yours and the squad lights up — well Primed for what\'s coming. (−20 ⚒)') },
      { label: 'Buy a found charm', cost: 50, detail: 'A relic, sight unseen.', apply: (c) => { const r = c.relic(); if (r) return `🛒 He digs it out of the pile — ${r.name}. Yours now. (−50 ⚒)`; c.slag(50); return '🛒 He roots through the lot and comes up empty — you already own everything worth selling. Your slag, returned.'; } },
      { label: 'Walk on', detail: 'Save it for the Forge.', apply: () => '🛒 You leave him to his sorting and keep your slag for home.' },
    ] },
  // ── TREASURE nodes (vF-BB): a generous cache — no cost, just a good choice. ──
  { id: 'cache2', kind: 'treasure', glyph: '💎', tint: '#7fd6ff', title: 'A Hidden Cache',
    text: 'Tucked into a hollow off the trail, sealed and dry against the blight: a climber\'s cache, forgotten or left on purpose. Whoever stowed it isn\'t coming back for it.',
    choices: [
      { label: 'Take the relic', detail: 'Gear for the collection.', apply: (c) => { const r = c.relic(); if (r) return `💎 Wrapped in oilcloth — a relic, ${r.name}. It's yours.`; c.cores(40); return '💎 You own every relic it could hold — so you take the Cores stashed beside them instead. +40 ⬡.'; } },
      { label: 'Take the supplies', detail: 'Cores and a good rest.', apply: (c) => (c.cores(25), c.heal(0.35), '💎 Food, salve, a handful of banked Cores. The squad recovers and you climb on heavier in the pack. +25 ⬡.') },
    ] },
  { id: 'hoard', kind: 'treasure', glyph: '💎', tint: '#7fd6ff', title: "The Climber's Hoard",
    text: 'A whole shelf of stone, stacked with what the lost left behind — cores in little cairns, gear gone green at the edges, a lifetime of climbs that ended here. You can carry only so much.',
    choices: [
      { label: 'Pocket the cores', detail: 'A big haul of Cores.', apply: (c) => (c.cores(50), '💎 You fill your pack with banked Cores — a fortune by rim standards. +50 ⬡.') },
      { label: 'Take the best relic', detail: 'One good piece of gear.', apply: (c) => { const r = c.relic(); if (r) return `💎 You pick the finest piece — ${r.name}.`; c.cores(50); return '💎 Nothing here you don\'t already own — so you take the Cores. +50 ⬡.'; } },
    ] },
  // ── ELITE node (vF-BC): an OPTIONAL extra fight. A marked hunter blocks the trail —
  // fight it (harder than a normal pack) for a GUARANTEED relic, or slip past and lose
  // nothing but the prize. Lose the fight and the run ends, like any wipe. Handled by a
  // dedicated render + startEliteFight (no `choices` — it's fight-or-flee). ──
  { id: 'elite_hunter', kind: 'elite', glyph: '💀', tint: '#ff6b6b', title: 'A Marked Hunter', foeId: 'veilclaw',
    text: 'Something has been pacing you for the last mile — bigger than the locals, scarred, unhurried. It steps into the trail ahead and simply waits, the way a thing waits when it has done this before and the climbers always ran. There is a way around. There is always a way around.' },
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

// The upgrade pool — pick 1 of 3 between fights; they compound into a build. scope:'squad' =
// applies to every creature in your run; scope:'unit' = you pick ONE creature to receive it.
// MOVED to ../data/upgrades.js (vF-CH, S7) — ONE shared source with the balance sim, so the
// 25-upgrade pool can never drift between game and sim (same pattern as engine/waves.js).
// (UPGRADES + UPGRADE_BY_ID imported at the top.)

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
// MOVED to ../data/relics.js (vF-CH, S7) — RELICS + RELIC_BY_ID + RELIC_CUTS + cutsFor/cutEffect
// are now a shared source with the balance sim (same pattern as engine/waves.js + data/upgrades.js),
// so the §31 recut numbers can never drift between game and sim. The React-coupled relic logic
// (state, persistence, RELIC_SETS bonuses, relicMods, rollRelicChoices) stays below.
// (RELICS, RELIC_BY_ID, RELIC_CUTS, cutsFor, cutEffect imported at the top.)
const KEYSTONE_IDS = RELICS.filter((r) => r.keystone).map((r) => r.id); // craft-only top tier
const RELIC_SLOTS = 3; // how many you can equip into a run loadout at once
const RELIC_KEY = '8gents_seam_relics';          // owned relic ids (the collection)
const RELIC_LOADOUT_KEY = '8gents_seam_relic_kit'; // equipped subset, capped at RELIC_SLOTS
const RELIC_DROP_WEIGHT = { Common: 50, Rare: 34, Legendary: 16 };
function loadRelics() { return loadJson(RELIC_KEY, []); }
function saveRelics(ids) { saveJson(RELIC_KEY, ids); }
function loadRelicKit() { return loadJson(RELIC_LOADOUT_KEY, []); }
function saveRelicKit(ids) { saveJson(RELIC_LOADOUT_KEY, ids); }
// ── RELIC SETS (vF-AT) — thematic synergies. Equip 2+ relics from a set into your kit and
// it activates a bonus on top of the relics themselves. With only RELIC_SLOTS=3 to spend,
// this makes the loadout a real decision: chase a set synergy, or just take your best three.
// Relics can belong to more than one set, so some kits light up two at once. Opt-in mods.
const RELIC_SETS = [
  { id: 'berserker', name: 'Berserker', icon: '🔥', need: 2, desc: '+12% damage',
    members: ['r_whetfang', 'r_reckless', 'r_wrathcore', 'r_glassedge', 'r_bloodpact', 'r_frenzy'],
    apply: (m) => { m.dmgMult *= 1.12; } },
  { id: 'warden', name: 'Stonehide', icon: '🛡️', need: 2, desc: '+12% max HP',
    members: ['r_ironwood', 'r_stoneblood', 'r_bulwark', 'r_bramble'],
    apply: (m) => { m.hpMult *= 1.12; } },
  { id: 'lifeblood', name: 'Lifeblood', icon: '🩸', need: 2, desc: '+8% lifesteal',
    members: ['r_vampiric', 'r_bloodpact', 'r_menderknot', 'r_surgeon', 'r_reckless'],
    apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.08; } },
  { id: 'tempo', name: 'Tempo', icon: '⚡', need: 2, desc: 'Start every fight +1 charge',
    members: ['r_quickcore', 'r_reservoir', 'r_frenzy', 'r_dropshard'],
    apply: (m) => { m.chargeStart += 1; } },
];
// Which sets are active for an equipped kit (>= the set's `need` members present).
function activeRelicSets(equippedIds) {
  const ids = equippedIds || [];
  return RELIC_SETS.filter((s) => s.members.filter((id) => ids.includes(id)).length >= s.need);
}
// RELIC RECUT (§31) — the build-EXPRESSION slag sink. RELIC_CUTS[id] + cutsFor + cutEffect are
// imported from ../data/relics.js (shared with the sim). The local state/persistence stays here.
const RELIC_CUT_KEY = '8gents_seam_relic_cut';        // {relicId: activeCutIdx} — 0 = default
const RELIC_CUT_OWN_KEY = '8gents_seam_relic_cut_own'; // {relicId: [unlockedIdx,…]} — slag-unlocked cuts
function loadCutMap() { return loadJson(RELIC_CUT_KEY, {}); }
function saveCutMap(o) { saveJson(RELIC_CUT_KEY, o); }
function loadCutOwn() { return loadJson(RELIC_CUT_OWN_KEY, {}); }
function saveCutOwn(o) { saveJson(RELIC_CUT_OWN_KEY, o); }
const recutCost = (rarity) => ({ Common: 40, Rare: 70, Legendary: 90 }[rarity] || 60); // slag to UNLOCK a cut

// Apply the equipped relic loadout into a run's mod object (opt-in, golden-safe) — each
// relic's ACTIVE cut (default unless recut), then any active SET bonuses on top.
function relicMods(equippedIds, m, cutMap = {}) {
  (equippedIds || []).forEach((id) => { const r = RELIC_BY_ID[id]; if (r) cutEffect(r, cutMap[id] || 0).apply(m); });
  activeRelicSets(equippedIds).forEach((s) => s.apply(m));
}
// A ring boss offers a CHOICE of up to n relics — a weighted draw of DISTINCT relics from
// what you don't yet own. You pick one on the won screen. Empty = collection full → slag.
function rollRelicChoices(owned, n = 3) {
  const work = RELICS.filter((r) => !owned.includes(r.id) && !r.craftOnly); // keystones are forged, never dropped
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
// Renders a relic's icon: a painted image if the relic carries an `img` path (art-instance
// drop-in), else the emoji fallback. So adding relic art = just set `img:` on the relic +
// drop the file; no render change needed. `size` is the emoji font-size; the image scales to it.
function RelicIcon({ r, size = 16, dim = false }) {
  const f = dim ? 'grayscale(1) brightness(0.5)' : 'none';
  if (r?.img) return <img src={r.img} alt="" style={{ width: Math.round(size * 1.15), height: Math.round(size * 1.15), objectFit: 'contain', display: 'block', filter: f }} />;
  return <span style={{ fontSize: size, filter: f }}>{r?.icon ?? '✦'}</span>;
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
function perkBaseMods(owned, reclaimed = 0, relicKit = [], cutMap = {}, temperingTier = 0, holdfastPicks = {}) {
  const m = { ...EMPTY_MODS };
  PERKS.forEach((p) => { if (owned.includes(p.id)) p.apply(m); });
  holdfastMods(reclaimed, m, holdfastPicks);
  if (temperingTier > 0) m.hpMult *= (1 + 0.01 * temperingTier);
  relicMods(relicKit, m, cutMap); // equipped relic loadout (with active cuts) — opt-in, golden-safe
  return m;
}

// Slag a run pays out — a full clear banks a lot; a wipe still leaves a little, so
// every run feeds the meta. Loss scales with how far you pushed.
const WIN_SLAG = 100;
const lossSlag = (wavesCleared) => Math.max(5, wavesCleared * 15);
// ── Reward recommendation (teaches drafting): score each OFFERED upgrade for THIS squad +
//    build so the card can flag a ★ pick and a one-line "why". Mirrors the sim-validated
//    `greedy` draft heuristic (which hits the ~47% ceiling); honest — derived from the squad's
//    live Types + current run mods, never hand-waved. The auto-pick AI stays dumb; this just
//    SHOWS the player what's good so a beginner can out-draft it (and learn the game). ──
function upgradeScore(up, ctx) {
  const has = (t) => ctx.types.has(t), m = ctx.mods || {}, boss = ctx.boss;
  if (up.scope === 'unit') return has(up.needsType) ? (up.chain ? 6 : 5) : 0;
  switch (up.id) {
    case 'sharpen':     return 10;
    case 'thickhide':   return 8;
    case 'secondwind':  return boss ? 9 : 7;
    case 'killingblow': return 6 + (m.executioner ? 1.5 : 0);
    case 'leech':       return has('Mender') ? 4 : 6;                       // sustain matters more without a healer
    case 'wildfire':    return has('Reactor') ? 7 + (m.burnBonus ? 1.5 : 0) : 2;
    case 'overhype':    return has('Booster') ? 6 + (m.ampBonus ? 1 : 0) : 1;
    case 'bastion':     return has('Bulwark') ? 5 : 1;                      // (gated, so usually relevant)
    case 'wellspring':  return (has('Mender') || m.lifesteal) ? 6 : 1;      // (gated)
    case 'primed':      return 4 + (m.chargeStart ? 0.5 : 0);
    case 'firststrike': return 4;
    case 'bloodrush':   return 3;
    default:            return 3;
  }
}
function upgradeWhy(up, ctx) {
  const has = (t) => ctx.types.has(t), m = ctx.mods || {}, boss = ctx.boss;
  if (up.scope === 'unit') return has(up.needsType) ? `Empowers your ${up.needsType}` : null;
  switch (up.id) {
    case 'sharpen':     return 'Most raw damage';
    case 'thickhide':   return 'Tankier whole squad';
    case 'secondwind':  return boss ? 'Cheats death — clutch vs the boss' : 'Cheats death once';
    case 'killingblow': return m.executioner ? 'Stacks your execute' : 'Finishes wounded foes';
    case 'leech':       return has('Mender') ? 'Extra sustain' : 'Sustain — no healer needed';
    case 'wildfire':    return m.burnBonus ? 'Stacks your burn build' : (has('Reactor') ? 'Feeds your Reactors' : 'Burn — no source yet');
    case 'overhype':    return has('Booster') ? 'Feeds your Booster' : null;
    case 'bastion':     return 'Hardens your shields';
    case 'wellspring':  return 'Stronger heals';
    case 'primed':      return 'Faster payoffs';
    case 'firststrike': return 'Big opening hits';
    case 'bloodrush':   return 'Snowballs charge on kills';
    default:            return null;
  }
}
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
// ONE KEYSTONE PER CREATURE (vF-CF): the tier-5 ★ is the build's oath — a creature swears
// one. Buying a second offers a SWAP instead: the old ★ refunds in full, the new one costs
// its price plus this fee. Lower tiers stay stackable (dabbling is how builds are found);
// only the keystone is the commitment. Legacy saves with 2+ keystones get a one-time
// pick-one (full refund on the rest) when that creature's tree is next opened.
const RESPEC_FEE = 12;
const slotsForUnlocked = (n) => Math.min(8, 4 + Math.floor((n || 0) / 4));
function loadCores() { return loadJson(CORES_KEY, {}); }
function saveCores(m) { saveJson(CORES_KEY, m); }
function loadTreeAlloc() { return loadJson(TREE_KEY, {}); }
function saveTreeAlloc(m) { saveJson(TREE_KEY, m); }
function loadEquip() { return loadJson(EQUIP_KEY, {}); }
function saveEquip(m) { saveJson(EQUIP_KEY, m); }
function loadRanks() { return loadJson(RANKS_KEY, {}); }
function saveRanks(m) { saveJson(RANKS_KEY, m); }
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
// AUTO-PICK (vF-AZ) — on rings you've ALREADY cleared (farming), auto-resolve the upgrade
// draft + wayside events instead of prompting, so re-clears are a true fast-forward. It NEVER
// fires on a fresh/deeper ring (depth > reclaimed) — the climb stays a hands-on decision.
const AUTO_PICK_KEY = '8gents_seam_autopick';
function loadAutoPick() { try { return localStorage.getItem(AUTO_PICK_KEY) === '1'; } catch { return false; } }
function saveAutoPick(on) { try { localStorage.setItem(AUTO_PICK_KEY, on ? '1' : '0'); } catch { /* best-effort */ } }
// Ambient music toggle — default ON, but only ever sounds after a user gesture (the
// AudioContext stays suspended until then), so nothing autoplays uninvited.
const MUSIC_KEY = '8gents_seam_music';
function loadMusic() { try { return localStorage.getItem(MUSIC_KEY) !== '0'; } catch { return true; } }
function saveMusic(on) { try { localStorage.setItem(MUSIC_KEY, on ? '1' : '0'); } catch { /* best-effort */ } }
const SFX_KEY = '8gents_seam_sfx'; // combat/UI sound effects on/off (music has its own toggle)
function loadSfxOn() { try { return localStorage.getItem(SFX_KEY) !== '0'; } catch { return true; } }
function saveSfxOn(on) { try { localStorage.setItem(SFX_KEY, on ? '1' : '0'); } catch { /* best-effort */ } }
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
const LAST_SQUAD_KEY = '8gents_seam_lastsquad'; // the PREVIOUS run's squad — read by the R8 ring law "The Cold Remembers"
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
    blurb: 'Wins by outlasting, not out-damaging. Burst-heal the team, lay down endless regen, or fuel your hardest hitter.',
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
      { id: 'lifebond', name: 'LIFEBOND', tag: 'fuel your hitter', icon: '🔗', color: WIN, hiddenUntilCapstone: true, nodes: [
        { id: 'lifebond1', tier: 1, cost: 4,  name: 'Wellspring', desc: 'Mend also gifts 1 charge to the ally it heals — fuel their payoff.', apply: (m) => { m.wellspring = true; } },
        { id: 'lifebond2', tier: 2, cost: 8,  name: 'Cleansing Touch', desc: 'Your heal also strips one debuff (poison/burn/curse/freeze) off the ally.', apply: (m) => { m.cleanse = true; } },
        { id: 'lifebond3', tier: 3, cost: 14, capstone: true, name: 'Sanctuary', desc: 'A healthy ally (above 80% HP) is gifted Amp instead of wasted healing.', apply: (m) => { m.sanctuary = true; } },
        { id: 'lifebond4', tier: 4, cost: 22, name: 'Channel', desc: 'Mend pours 2 charge into the ally it heals — pure fuel for their payoff.', apply: (m) => { m.channel = true; } },
        { id: 'lifebond5', tier: 5, cost: 36, keystone: true, name: 'Lifebond', desc: 'You share in every mend — patch yourself for half of whatever you heal an ally.', apply: (m) => { m.lifebond = true; } },
      ] },
    ],
  },

  Booster: {
    blurb: 'Makes someone else hit like a truck. Spread Amp across the team, load your hardest hitter, or steal the enemy tempo.',
    paths: [
      { id: 'reso', name: 'RESONANCE', tag: 'amp the team', icon: '✦', color: AMP, nodes: [
        { id: 'reso1', tier: 1, cost: 4, costStep: 4, ranks: 2, name: 'Harmonize', desc: 'Your Amp lands +1 extra stack per rank (max +2).',             apply: (m, r) => { m.ampBonus += r; } },
        { id: 'reso2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Tuning', desc: 'Start every fight with +1 charge banked per rank (max +2).',       apply: (m, r) => { m.chargeStart += r; } },
        { id: 'reso3', tier: 3, cost: 14, capstone: true, name: 'Power Chord', desc: 'Prime amps your WHOLE team, not just your hardest hitter.', apply: (m) => { m.primeTeam = 1; } },
        { id: 'reso4', tier: 4, cost: 22, name: 'Full Harmony', desc: 'Your Amp also hardens — every ally it touches gains a small shield.', apply: (m) => { m.fullHarmony = true; } },
        { id: 'reso5', tier: 5, cost: 36, keystone: true, name: 'Crescendo', desc: 'Your Amp never fades — every round the whole team only hits harder.', apply: (m) => { m.crescendo = true; } },
      ] },
      { id: 'odrive', name: 'OVERDRIVE', tag: 'load your hitter', icon: '⬆️', color: '#c89bff', nodes: [
        { id: 'odrive1', tier: 1, cost: 4, costStep: 3, ranks: 3, name: 'Live Current', desc: '+12% damage from your attacks per rank (max +36%).',        apply: (m, r) => { m.dmgMult *= (1 + 0.12 * r); } },
        { id: 'odrive2', tier: 2, cost: 6, costStep: 4, ranks: 2, name: 'Capacitor', desc: 'Start every fight with +1 charge banked per rank (max +2).',    apply: (m, r) => { m.chargeStart += r; } },
        { id: 'odrive3', tier: 3, cost: 14, capstone: true, name: 'Surge', desc: 'Overdrive floods ALL allies with Amp, not just one.', apply: (m) => { m.overdriveAll = true; } },
        { id: 'odrive4', tier: 4, cost: 22, name: 'Power Spike', desc: 'The first Overdrive each fight spikes with +2 extra Amp.', apply: (m) => { m.powerSpike = true; } },
        { id: 'odrive5', tier: 5, cost: 36, keystone: true, name: 'Critical Mass', desc: 'Overdrive dumps a FULL bar of Amp onto your hardest hitter — feast or famine.', apply: (m) => { m.criticalMass = true; } },
      ] },
      { id: 'cond', name: 'CONDUCTOR', tag: 'steal the tempo', icon: '🎼', color: AMP, hiddenUntilCapstone: true, nodes: [
        { id: 'cond1', tier: 1, cost: 4,  name: 'Pull', desc: "Resonate pulls your hardest hitter's strike forward — it also gifts them a charge.", apply: (m) => { m.pull = true; } },
        { id: 'cond2', tier: 2, cost: 8,  name: 'Quicken', desc: 'Prime also nudges your hardest hitter +1 charge — get their payoff online sooner.', apply: (m) => { m.quicken = true; } },
        { id: 'cond3', tier: 3, cost: 14, capstone: true, name: 'Tempo Theft', desc: "Overdrive saps 2 charge from the enemy's fastest — steal their tempo.", apply: (m) => { m.tempoTheft = true; } },
        { id: 'cond4', tier: 4, cost: 22, name: 'Double Time', desc: 'Overdrive pours an extra +3 charge into your hardest hitter — load them to swing again now.', apply: (m) => { m.doubleTime = true; } },
        { id: 'cond5', tier: 5, cost: 36, keystone: true, name: 'Maestro', desc: 'Every round, gift your hardest hitter a free stack of Amp — the band never stops.', apply: (m) => { m.maestro = true; } },
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
// The ★ Oath a creature has sworn = the one keystone node in its EQUIPPED loadout (vF-CF
// allows only one). Feeds Team Recipe detection (sworn recipes key on it). null = unsworn.
const swornOathNode = (id, equipMap) => (equipMap?.[id] || []).find((nid) => NODE_BY_ID[nid]?.keystone) || null;
// A creature → the { id, type, oath } member shape the recipe matcher reads.
const recipeMember = (id, equipMap) => ({ id, type: COMBAT_CREATURES[id]?.type, oath: swornOathNode(id, equipMap) });

// ── INNATES (vF-CG) — one born-in quirk per CREATURE, so a creature is distinct BEFORE any
//    cores are spent. The collection unit shifts from Type → Creature: a second Reactor is no
//    longer a stat reskin of the first. The build-identity equation is now:
//        creature = INNATE (born) × KEYSTONE (sworn, one) × LOADOUT (chosen)
//    Each innate is an apply(m) that mutates the SAME run-layer mods object the skill tree uses
//    (see treeModsFor) — so every channel here is one the engine already reads, every innate is
//    always-on + AI-agnostic, and goldens are byte-identical (goldens never touch treeModsFor).
//    Design bar (the fake-variety test, docs/RINGWARD-COLLECTION-DESIGN.md): an innate earns its
//    slot only if it would change a relic/keystone/squad choice — not "+20% vs +25%" reskins.
//    Channels verified read by their skills (2026-06-10): burnBonus, chargeStart, overloadMult,
//    blockMult(addBlock), thorns, healMult(heal), mendRegen(mender lifebloom), ampBonus(applyAmp),
//    opener, executioner, lifesteal, apex, shatter, freezeBonus(warden), jinxSpread(hexer).
const INNATES = {
  // Reactor — fire & charge
  fizzpop:     { name: 'Sputter',      line: 'Every burn it lands carries an extra stack.',        apply: (m) => { m.burnBonus += 1; } },
  glowtail:    { name: 'Slow Fuse',    line: 'It steps into every fight already part-charged.',    apply: (m) => { m.chargeStart += 1; } },
  cinderpaw:   { name: 'Eager Ember',  line: 'Its Overload always blooms 15% hotter.',             apply: (m) => { m.overloadMult *= 1.15; } },
  // Bulwark — shields & spite
  stoneward:   { name: 'Old Stone',    line: 'Any shield it raises holds 18% harder.',             apply: (m) => { m.blockMult *= 1.18; } },
  ironwall:    { name: 'Spite Plating', line: 'Whatever strikes it bleeds for 15% of the blow.',   apply: (m) => { m.thorns = Math.max(m.thorns || 0, 0.15); } },
  // Mender — sustain
  mossback:    { name: 'Deep Roots',   line: 'Its mends close 15% more of the wound.',             apply: (m) => { m.healMult *= 1.15; } },
  dewleaf:     { name: 'Lifebloom',    line: 'Every mend it gives leaves a lingering regen.',      apply: (m) => { m.mendRegen += 1; } },
  // Booster — tempo
  buzzline:    { name: 'Hum',          line: 'Every amp it gifts lands a stack stronger.',         apply: (m) => { m.ampBonus += 1; } },
  tanglewing:  { name: 'Tailwind',     line: 'It comes off the line already part-charged.',        apply: (m) => { m.chargeStart += 1; } },
  // Striker — opener vs finisher (complementary pair)
  swiftpaw:    { name: 'First Pounce', line: 'Its first blow on an unwounded foe cuts 25% deeper.', apply: (m) => { m.opener = true; } },
  dartwing:    { name: 'Finisher',     line: 'Hits 25% harder against anything below half HP.',    apply: (m) => { m.executioner = Math.max(m.executioner || 0, 0.25); } },
  // Assassin — blood
  shadefang:   { name: 'Bloodthirst',  line: 'Drains a tenth of every wound back into itself.',    apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.12; } },
  veilclaw:    { name: 'Bloodhound',   line: 'Every kill this run permanently sharpens its blade.', apply: (m) => { m.apex = true; } },
  // Warden — cold
  frostwarden: { name: 'Killing Frost', line: 'Its blows land 50% harder on the frozen.',          apply: (m) => { m.shatter = true; } },
  rimecaller:  { name: 'Deep Cold',    line: 'The ice it calls clings a round longer.',            apply: (m) => { m.freezeBonus += 1; } },
  // Hexer — curse
  blightcap:   { name: 'Sporehide',    line: 'Strike it and the spores strike back for 12%.',      apply: (m) => { m.thorns = Math.max(m.thorns || 0, 0.12); } },
  hexmoth:     { name: 'Mothlight',    line: 'Its hex leaps to a second victim.',                  apply: (m) => { m.jinxSpread = true; } },
};
const innateFor = (id) => INNATES[id] || null;
// ── Build identity (visibility): name a creature's build from its EQUIPPED loadout's dominant
//    path — using the path's OWN name + tag, never invented. Honest by construction (the label
//    can't lie: it's whatever you actually equipped). null = no build yet; 'VERSATILE' = spread
//    across paths. This turns "12 nodes unlocked" into "this is my PYRE Cinderpaw". ──
function deriveArchetype(type, equippedNodeIds) {
  const tree = TYPE_TREES[type];
  if (!tree || !equippedNodeIds || !equippedNodeIds.length) return null;
  const counts = {};
  for (const nid of equippedNodeIds) { const p = NODE_BY_ID[nid]?.pathId; if (p) counts[p] = (counts[p] || 0) + 1; }
  let domId = null, domN = 0, total = 0;
  for (const pid in counts) { total += counts[pid]; if (counts[pid] > domN) { domN = counts[pid]; domId = pid; } }
  if (!total) return null;
  const path = tree.paths.find((p) => p.id === domId);
  if (path && domN / total >= 0.6 && domN >= 2) return { name: path.name, tag: path.tag, icon: path.icon, color: path.color };
  return { name: 'VERSATILE', tag: 'a little of each path', icon: '✦', color: '#9fb0c4' };
}
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
  // INNATE (vF-CG): born-in, always-on, regardless of loadout — applied AFTER nodes so it
  // composes with whatever's equipped. Only player units reach treeModsFor, so goldens (which
  // build via makeUnitDef) never see this and stay byte-identical.
  const innate = innateFor(id);
  if (innate?.apply) innate.apply(m);
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
  // Support/curse chip ticks (vF-CA engine events) — no `skill` (thorns/blight) and no `actor`
  // (hexbleed), so they MUST resolve before the turn-shaped fall-through below or it throws.
  if (e.type === 'thorns') return { kind: 'turn', side: 'A', text: `🌵 ${e.actor.name}'s thorns chip ${e.target.name} for ${e.dmg}${e.killed ? ' — KO' : ''}` };
  if (e.type === 'blight') return { kind: 'turn', side: 'A', text: `🌿 ${e.actor.name}'s bloom sears ${e.target.name} for ${e.dmg}${e.killed ? ' — KO' : ''}` };
  if (e.type === 'hexbleed') return { kind: 'burn', text: `🩸 ${e.target.name} bleeds ${e.dmg} from the curse${e.killed ? ' — KO' : ''}` };
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

// ── Combat legibility cues (manual-verb audit §5) — three honest reads, no engine
// change. predictSpend walks the SAME doctrine ladder the AI driver will walk on
// this unit's next turn, but only the `when` conditions and `canUse` charge gates —
// never a selector. Selectors are the only doctrine code that draws state.rng, so
// the seeded stream is untouched and transcripts stay byte-identical.
function predictSpend(u, state) {
  if (!u.alive || (u.statuses.freeze || 0) > 0) return null; // frozen — it has no next move to telegraph
  const doctrine = applyTemperament(u.type, u.temperament);
  for (const rule of doctrine.rules) {
    const skill = getSkill(rule.skillId);
    if (rule.when(u, state) && skill.canUse(u, state)) {
      return rule.skillId === u.skillIds[0] ? null : skill.name; // builder = quiet turn, no cue
    }
  }
  return null;
}

function snapshot(state) {
  // Execute kill-line: drawn on enemy HP bars only while a living squad unit can Execute.
  const execLine = state.units.A.some((a) => a.alive && a.skillIds.includes('execute'));
  const map = (u) => ({
    uid: u.uid, name: u.name, side: u.side, spriteId: u.spriteId, type: u.type,
    hp: u.hp, maxHp: u.maxHp, charge: u.charge, maxCharge: u.maxCharge,
    burn: u.statuses.burn || 0, block: u.statuses.block || 0, regen: u.statuses.regen || 0, amp: u.statuses.amp || 0, freeze: u.statuses.freeze || 0, vuln: u.statuses.vuln || 0, alive: u.alive,
    // enemy-intent telegraph: the payoff this AI unit will open with if it acts now
    nextMove: u.side === 'B' ? predictSpend(u, state) : null,
    // strike-first window: a squad Striker with Blitz legal before anyone has acted this round
    strikeFirst: u.side === 'A' && u.alive && !state.firstActionDone && (u.statuses.freeze || 0) === 0
      && u.skillIds.includes('blitz') && getSkill('blitz').canUse(u, state),
    execMark: u.side === 'B' && execLine ? ASSASSIN.execute.executeThreshold : null,
  });
  return { A: state.units.A.map(map), B: state.units.B.map(map), round: state.round };
}

function Bar({ value, max, color, h = 10, mark }) {
  return (
    <div style={{ position: 'relative', background: '#1a1a26', borderRadius: 5, height: h, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
      <div style={{ width: `${Math.max(0, (value / max) * 100)}%`, height: '100%', background: color, transition: 'width .25s ease' }} />
      {/* breakpoint notch (e.g. the Assassin's 45% execute line) — a faint cut in the bar */}
      {mark != null && <div style={{ position: 'absolute', left: `${mark * 100}%`, top: 0, bottom: 0, width: 2, background: '#0b0b14', boxShadow: '0 0 3px #ff3b30aa' }} />}
    </div>
  );
}

// ── THE WORLD MAP (vF-CE) — the whole world, code-drawn: eight rings around the Drop.
// Pure SVG, no assets. Visual canon (LORE-BIBLE §IV): the world is circles — the only
// direction that exists is INWARD. Unlocked rings lit, locked rings dark; found carved
// stones marked on their bands; the Drop breathes (a held note, ~4s); the blight reads
// as a soft pooling toward the center — a bandage, never a monster.
function WorldMap({ unlocked = 1, stones = [], size = 320 }) {
  const C = 200;
  const bands = HUNTING_GROUNDS.map((g, i) => ({ g, rOut: 190 - i * 17 })); // depth 1 = outermost
  const litColor = (d) => (d <= 2 ? '#7ed321' : d <= 4 ? '#9be7ff' : d <= 6 ? '#e8a040' : '#ff6b6b');
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: 'block', margin: '0 auto' }} role="img" aria-label="Map of the eight rings around the Drop">
      <defs>
        <radialGradient id="wm-drop"><stop offset="0%" stopColor="#f2e8ff" /><stop offset="45%" stopColor="#b06bff" /><stop offset="100%" stopColor="#1a0f2a" /></radialGradient>
        <radialGradient id="wm-blight"><stop offset="55%" stopColor="rgba(95,240,208,0)" /><stop offset="100%" stopColor="rgba(95,240,208,0.07)" /></radialGradient>
      </defs>
      <circle cx={C} cy={C} r={197} fill="#0a0c12" stroke="#2a2a3a" strokeWidth="1" />
      {bands.map(({ g, rOut }) => {
        const open = g.depth <= unlocked; const col = open ? litColor(g.depth) : '#23232f';
        const a = -Math.PI / 2 + g.depth * 0.75; // stone markers spiral inward, clear of the label column
        return (
          <g key={g.id}>
            <circle cx={C} cy={C} r={rOut} fill="none" stroke={col} strokeOpacity={open ? 0.5 : 0.6} strokeWidth={open ? 2 : 1.2} />
            <text x={C} y={C - rOut + 12} fontSize="8.5" fill={open ? '#9aa7b8' : '#3a3a4a'} textAnchor="middle" fontWeight="700">{g.name.replace('The ', '')}</text>
            {stones.includes(g.id) && <text x={C + Math.cos(a) * (rOut - 8)} y={C + Math.sin(a) * (rOut - 8)} fontSize="9" fill="#cfc6ae" textAnchor="middle">🪨</text>}
          </g>
        );
      })}
      <circle cx={C} cy={C} r={120} fill="url(#wm-blight)" pointerEvents="none" />
      <circle cx={C} cy={C} r={24} fill="url(#wm-drop)">
        <animate attributeName="r" values="22;27;22" dur="4s" repeatCount="indefinite" />
      </circle>
      <text x={C} y={C + 3} fontSize="9" fill="#eadcff" textAnchor="middle" fontWeight="900" letterSpacing="2">DROP</text>
      <text x={C} y={16} fontSize="9" fill="#6f86a8" textAnchor="middle" fontWeight="800" letterSpacing="3">THE RIM</text>
    </svg>
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
@keyframes seam-loaded { 0%,100%{opacity:.55} 50%{opacity:1} }
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
/* ── impact juice (vF-CA) — hits LAND: arena kicks, struck unit pops, big swings bloom, KOs shatter ── */
@keyframes seam-arenashake { 0%{transform:translate(0,0)} 15%{transform:translate(-5px,2px)} 30%{transform:translate(5px,-2px)} 45%{transform:translate(-4px,-2px)} 60%{transform:translate(4px,2px)} 78%{transform:translate(-2px,1px)} 100%{transform:translate(0,0)} }
@keyframes seam-arenashake-sm { 0%{transform:translate(0,0)} 25%{transform:translate(-2px,1px)} 50%{transform:translate(2px,-1px)} 75%{transform:translate(-1px,1px)} 100%{transform:translate(0,0)} }
@keyframes seam-hitpop { 0%{transform:scale(1)} 35%{transform:scale(1.1)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
@keyframes seam-hitpop-big { 0%{transform:scale(1)} 22%{transform:scale(1.18)} 55%{transform:scale(.9)} 78%{transform:scale(1.04)} 100%{transform:scale(1)} }
@keyframes seam-bigflash { 0%{opacity:0;transform:translate(-50%,-50%) scale(.5)} 22%{opacity:.95} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)} }
@keyframes seam-koburst { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(calc(-50% + var(--kx)),calc(-50% + var(--ky))) scale(.25)} }
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
  fizzpop: 0.5, glowtail: 0.5, cinderpaw: 0.5,
  stoneward: 0.5, ironwall: 0.5,
  mossback: 0.5, dewleaf: 0.5,
  buzzline: 0.5, tanglewing: 0.5,
  swiftpaw: 0.5, dartwing: 0.5,
  shadefang: 0.5, veilclaw: 0.5,
  blightcap: 0.5, hexmoth: 0.5,
  frostwarden: 0.5, rimecaller: 0.5,
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
            backgroundImage: `url(/sprites/${spriteId}.jpg)`,
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
  prime: ['⚡▲', '✦ ally', '👊'],           overdrive: ['⚡▼', '✦ ally'],            resonate: ['⚡▼', '✦ team'],
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
function StageUnit({ u, anim, isActor, isTarget, selectable, onPick, onSelect, popups, big, bigger, burst, cast, fxN, boss, targetLabel, targetMark, aoe, move, hitN, fire, heavy, justKilled }) {
  const dead = !u.alive;
  const struck = burst === 'attack'; // taking a hit this action → pop the sprite
  const hurt = u.alive && u.maxHp > 0 && u.hp / u.maxHp <= 0.3; // badly wounded — show distress so the player KNOWS to heal/guard it
  const ti = TYPE_INFO[u.type] || { accent: DIM, glyph: '✦' };
  const baseSize = boss ? (big ? 122 : 108) : big ? 92 : 78; // the boss looms larger
  const size = bigger ? baseSize + 26 : baseSize; // landscape (U6): the stage has room — sprites grow
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
        {/* heavy-hit bloom — a big swing reads as a SPIKE, a white flash that blooms out in the type color */}
        {heavy && struck && !dead && <div key={`bf${fxN}`} style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)', width: size * 1.3, height: size * 1.3, borderRadius: '50%', background: `radial-gradient(circle, #ffffffee 0%, ${ti.accent}aa 36%, transparent 70%)`, animation: 'seam-bigflash .4s ease-out forwards', pointerEvents: 'none', zIndex: 6 }} />}
        {/* KO shatter — the core bursts apart in its type color the instant it dies */}
        {justKilled && Array.from({ length: 9 }).map((_, i) => {
          const ang = (i / 9) * Math.PI * 2;
          const dx = Math.round(Math.cos(ang) * size * 0.72);
          const dy = Math.round(Math.sin(ang) * size * 0.72);
          return <div key={`ko${fxN}-${i}`} style={{ position: 'absolute', top: '48%', left: '50%', width: size * 0.16, height: size * 0.16, borderRadius: '50%', background: `radial-gradient(circle, #fff 0%, ${ti.accent} 55%, transparent 78%)`, boxShadow: `0 0 9px 2px ${ti.accent}`, '--kx': `${dx}px`, '--ky': `${dy}px`, animation: 'seam-koburst .6s ease-out forwards', pointerEvents: 'none', zIndex: 7 }} />;
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
          <div key={struck && !dead ? `hp${fxN}` : 'sprite'} style={{ animation: struck && !dead ? (heavy ? 'seam-hitpop-big .34s ease-out' : 'seam-hitpop .26s ease-out') : 'none' }}>
            <Sprite spriteId={u.spriteId} color={ti.accent} glyph={ti.glyph} anim={dead ? 'defeated' : (anim || 'idle')} facing={u.side === 'A' ? 1 : -1} size={size} />
          </div>
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
      <div style={{ marginTop: 3 }}><Bar value={u.hp} max={u.maxHp} color={dead ? LOSS : u.side === 'A' ? '#3ec9a0' : '#e07a7a'} h={7} mark={dead ? null : u.execMark} /></div>
      <div style={{ fontSize: T.micro, color: dead ? LOSS : '#aab', marginTop: 2, fontWeight: 700 }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}><ChargeDots value={u.charge} max={u.maxCharge} /></div>
      {/* legibility cues (manual-verb audit §5): what the enemy will do next, and the
          Striker's open strike-first window — shown only while you're picking who acts */}
      {u.nextMove && !dead && <div style={{ fontSize: T.micro, fontWeight: 800, color: '#ffb38a', marginTop: 2, animation: 'seam-loaded 1.2s ease-in-out infinite', whiteSpace: 'nowrap' }}>⚠ {u.nextMove} next</div>}
      {u.strikeFirst && !dead && (selectable || isActor) && <div style={{ fontSize: T.micro, fontWeight: 800, color: CHG, marginTop: 2, animation: 'seam-loaded 1.2s ease-in-out infinite', whiteSpace: 'nowrap' }}>⚡ ×{STRIKER.blitz.firstStrikeBonus} Blitz now</div>}
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
const HEAVY_HIT_FRAC = 0.25; // a single hit ≥ this share of the target's max HP reads as a "big swing" (pop + bloom + arena shake)

// Floating numbers to spawn for one event (damage red, heal green, etc.).
function popupsForEvent(event) {
  const out = [];
  if (event.type === 'turn') {
    (event.hits || []).forEach((h) => { if (h.dmg > 0 || h.killed) out.push({ uid: h.uid, text: h.killed ? `−${h.dmg} KO` : `−${h.dmg}`, color: h.killed ? '#ff3b30' : '#ff8a6a' }); });
    (event.heals || []).forEach((h) => { if (h.healed > 0) out.push({ uid: h.uid, text: `+${h.healed}`, color: WIN }); });
    (event.amps || []).forEach((a) => out.push({ uid: a.uid, text: `✦${a.amp}`, color: AMP }));
  } else if (event.type === 'burn') out.push({ uid: event.target.uid, text: `−${event.dmg}🔥`, color: BURN });
  else if (event.type === 'regen') out.push({ uid: event.target.uid, text: `+${event.healed}🌿`, color: WIN });
  else if (event.type === 'poison') out.push({ uid: event.target.uid, text: `−${event.dmg}🧪`, color: '#9acd32' });
  else if (event.type === 'doom') out.push({ uid: event.target.uid, text: `−${event.dmg}💀`, color: '#c77dff' });
  else if (event.type === 'hexbleed') out.push({ uid: event.target.uid, text: `−${event.dmg}🩸`, color: AMP });
  else if (event.type === 'thorns') out.push({ uid: event.target.uid, text: `−${event.dmg}🌵`, color: '#7fae5a' });
  else if (event.type === 'blight') out.push({ uid: event.target.uid, text: `−${event.dmg}🌿`, color: WIN });
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
      const heavy = {}; const killed = {}; // big swings + KOs get amplified (pop, bloom, shatter, arena kick)
      const findU = (uid) => stateRef.current ? (stateRef.current.units.A.find((u) => u.uid === uid) || stateRef.current.units.B.find((u) => u.uid === uid)) : null;
      (event.hits || []).forEach((h) => {
        if (h.dmg > 0 || h.killed) { bursts[h.uid] = 'attack'; hitCounts[h.uid] = (hitCounts[h.uid] || 0) + 1; }
        if (h.killed) { killed[h.uid] = true; heavy[h.uid] = true; }
        else if (h.dmg > 0) { const t = findU(h.uid); if (t && t.maxHp > 0 && h.dmg >= t.maxHp * HEAVY_HIT_FRAC) heavy[h.uid] = true; }
      });
      (event.shields || []).forEach((s) => { if (s.block > 0 && s.uid) bursts[s.uid] = 'shield'; });
      (event.heals || []).forEach((h) => { if (h.healed > 0) bursts[h.uid] = 'heal'; });
      (event.amps || []).forEach((a) => { if (a.uid) bursts[a.uid] = 'boost'; });
      const anyDmg = (event.hits || []).some((h) => h.dmg > 0 || h.killed);
      const shake = (Object.keys(killed).length || Object.keys(heavy).length) ? 'big' : anyDmg ? 'small' : null;
      setFx({ actor: event.actor.uid, cast: SKILL_EFFECT[event.skill.id] || 'attack', bursts, move: event.skill.id, hitCounts, heavy, killed, shake, fire: FIRE_MOVES.has(event.skill.id), n: ++FX_NONCE });
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
      const koMap = event.killed ? { [event.target.uid]: true } : {};
      setFx({ actor: null, cast: null, bursts: { [event.target.uid]: 'attack' }, killed: koMap, heavy: koMap, shake: event.killed ? 'big' : null, fire: true, n: ++FX_NONCE });
      startHold(TICK_HOLD_MS);
      sfx.burnTick();
    } else if (event.type === 'regen') {
      setFx({ actor: null, cast: null, bursts: { [event.target.uid]: 'heal' }, n: ++FX_NONCE });
      startHold(TICK_HOLD_MS);
      sfx.regenTick();
    } else if (event.type === 'poison' || event.type === 'doom' || event.type === 'hexbleed' || event.type === 'thorns' || event.type === 'blight') {
      // Damage-over-time ticks read like any other hit now — an impact + a floating number,
      // and the KO shatter when they finish a unit off (was silent before).
      const koMap = event.killed ? { [event.target.uid]: true } : {};
      setFx({ actor: null, cast: null, bursts: { [event.target.uid]: 'attack' }, killed: koMap, heavy: koMap, shake: event.killed ? 'big' : null, n: ++FX_NONCE });
      startHold(TICK_HOLD_MS);
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
      firstWindow: !battleRef.current.firstActionDone, // nobody has acted this round → Blitz's ×1.6 is live
    };
  }

  function begin(aDefs, bDefs, seed, mode, onComplete, onState) {
    feedRef.current = []; setFeed([]); setPool([]); setPreviewUid(null); previewRef.current = null; setPendingSkill(null); setPopups([]); setFx({ actor: null, cast: null, bursts: {}, n: 0 });
    holdRef.current = Promise.resolve();
    onDoneRef.current = onComplete || null;
    const state = createBattleState(aDefs, bDefs, seed);
    // Optional caller hook (vF-CC ring laws): mutate the fresh state BEFORE battle —
    // seed statuses/charge. Goldens/WATCH/challenges never pass it → byte-identical.
    if (onState) onState(state);
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
function CenterMoves({ moves, pendingSkill, phase, onSkill, onBack, tgtAllies, tgtAll, allyAim, placeVerb, hintSkill }) {
  const [legendSeen, setLegendSeen] = useState(() => !!localStorage.getItem('ringward_charge_legend_seen'));
  if (!moves) return <span style={{ color: DIM, fontWeight: 900, fontSize: T.head, opacity: 0.5 }}>VS</span>;
  const { unit, skillIds, legalIds } = moves;
  const handleSkill = (sid) => {
    if (!legendSeen) { setLegendSeen(true); localStorage.setItem('ringward_charge_legend_seen', '1'); }
    onSkill(sid);
  };
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: T.small, color: ACCENT, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>{unit.name} — pick a move</div>
      {!legendSeen && phase === 'select' && (
        <div style={{ fontSize: T.micro, color: '#8a8a9e', textAlign: 'center', marginBottom: 6, fontWeight: 700 }}>⚡▲ banks charge · ⚡▼ spends it</div>
      )}
      {skillIds.map((sid) => {
        const sk = getSkill(sid);
        const usable = legalIds.includes(sid);
        const chosen = pendingSkill === sid;
        const ef = effectOf(sid);
        const tt = TARGET_TAG[sk.targetMode];
        const hinted = hintSkill === sid && usable && !chosen; // LEARN points a finger at the move to tap
        return (
          <button key={sid} onClick={usable ? () => handleSkill(sid) : undefined} disabled={!usable} title={sk.blurb}
            style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'left', marginBottom: 6, background: usable ? ef.bg : '#14141c', border: `2px solid ${chosen ? '#fff' : hinted ? ACCENT : usable ? ef.color : '#1d1d28'}`, color: usable ? '#eee' : '#555', borderRadius: 9, padding: '8px 10px', cursor: usable ? 'pointer' : 'not-allowed', opacity: usable ? 1 : 0.55, animation: hinted ? 'seam-hintglow 1s ease-in-out infinite' : 'none' }}>
            {hinted && <span style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', fontSize: T.head, animation: 'seam-point .7s ease-in-out infinite', pointerEvents: 'none', zIndex: 8, filter: 'drop-shadow(0 1px 3px #000)' }}>👈</span>}
            <span style={{ fontSize: T.label, lineHeight: 1, marginTop: 1, filter: usable ? 'none' : 'grayscale(1)' }}>{ef.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: T.small, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{sk.name}</span>
                <span style={{ fontSize: T.micro, color: usable ? ef.color : '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>· {ef.label}</span>
                {tt && <span style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 0.3, padding: '0 6px', borderRadius: 10, whiteSpace: 'nowrap', border: `1px solid ${tt.aoe ? '#ff7a4a' : '#55556a'}`, background: tt.aoe ? '#3a1d10' : 'transparent', color: !usable ? '#555' : tt.aoe ? '#ffb38a' : '#9a9aaa' }}>{tt.icon} {tt.aoe ? 'AOE' : 'SINGLE'}</span>}
              </div>
              {/* effect strip — icons for at-a-glance scan */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {MOVE_FX[sid] && MOVE_FX[sid].map((chip, i) => (
                  <span key={i} style={{ fontSize: T.micro, fontWeight: 800, color: usable ? '#d8d8e2' : '#555', background: usable ? '#00000038' : 'transparent', border: `1px solid ${usable ? ef.color + '55' : '#2a2a36'}`, borderRadius: 7, padding: '1px 6px', whiteSpace: 'nowrap' }}>{chip}</span>
                ))}
                {!usable && (sk.kind === 'payoff' || sk.kind === 'wildcard') && (
                  <span style={{ fontSize: T.micro, fontWeight: 800, color: '#666', background: '#1a1a28', border: '1px solid #2e2e40', borderRadius: 7, padding: '1px 6px', whiteSpace: 'nowrap' }}>needs ⚡⚡</span>
                )}
                {/* the Blitz tempo window, live: nobody has moved yet, so the ×1.6 is on the table */}
                {sid === 'blitz' && usable && moves.firstWindow && (
                  <span style={{ fontSize: T.micro, fontWeight: 900, color: '#0b0b14', background: CHG, borderRadius: 7, padding: '1px 6px', whiteSpace: 'nowrap', animation: 'seam-loaded 1.2s ease-in-out infinite' }}>⚡ ×{STRIKER.blitz.firstStrikeBonus} NOW</span>
                )}
              </div>
              {/* blurb — plain-English one-liner, always visible (not tooltip-only) */}
              <div style={{ fontSize: T.micro, color: usable ? '#7a7a8e' : '#383848', marginTop: 3, lineHeight: 1.3 }}>{sk.blurb}</div>
            </span>
          </button>
        );
      })}
      {phase === 'select-target' && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: T.micro, color: WIN, textAlign: 'center', fontWeight: 800, marginBottom: 6 }}>
            {allyAim ? `↓ tap an ally to ${(placeVerb || 'place').toLowerCase()} them — or an enemy to poke it (${(placeVerb || 'effect').toLowerCase()} still lands)` : tgtAll ? `↓ tap to confirm — ${tgtAllies ? 'whole team' : 'all enemies'}` : `↓ tap ${tgtAllies ? 'an ally' : 'an enemy'}`}
          </div>
          <button onClick={onBack} style={{ width: '100%', background: 'transparent', border: `1px solid ${LINE}`, color: DIM, borderRadius: 8, padding: '5px 0', cursor: 'pointer', fontSize: T.micro, fontWeight: 800 }}>↩ Back</button>
        </div>
      )}
    </div>
  );
}

// ── FightView — the shared battlefield + center moves + feed for a live battle. ──
function FightView({ fight, narrow, banner, bossUid, hintSkill, auto, onToggleAuto, bgImg }) {
  const { snap, feed, phase, pool, previewUid, fx, popups, feedBoxRef, previewUnit, chooseTarget, chooseSkill, cancelTarget } = fight;
  // Kick the whole arena on a heavy hit / KO — replay the shake without remounting the
  // units (style toggle + forced reflow), so floating numbers and sprites don't reset.
  const arenaRef = useRef(null);
  useEffect(() => {
    const el = arenaRef.current;
    if (!el || !fx.shake) return;
    el.style.animation = 'none';
    void el.offsetWidth; // force reflow so the next assignment restarts the animation
    el.style.animation = fx.shake === 'big' ? 'seam-arenashake .42s ease-out' : 'seam-arenashake-sm .26s ease-out';
  }, [fx.n, fx.shake]);
  if (!snap) return null;
  const selecting = phase === 'select' || phase === 'select-target';
  const moves = selecting ? fight.previewMoves() : null;
  const enemyUids = moves?.enemyUids ?? [];
  const allyUids = moves?.allyUids ?? [];
  // Targeting context for the confirm beat (single/AOE × enemies/allies).
  const tgtMode = phase === 'select-target' && fight.pendingSkill ? getSkill(fight.pendingSkill).targetMode : null;
  // "Point it" verb (manual builder, audit §5): mend/brace can land on EITHER line —
  // tap an ally to place the heal/wall, or an enemy for the old chip. Both sides tappable.
  const allyAim = phase === 'select-target' && fight.pendingSkill ? !!getSkill(fight.pendingSkill).allyAim : false;
  const placeVerb = { mend: 'MEND', brace: 'WALL' }[fight.pendingSkill] || 'PLACE';
  const placeMark = fight.pendingSkill === 'mend' ? '💚' : fight.pendingSkill === 'brace' ? '🛡' : '🎯';
  const tgtAllies = tgtMode === 'ally' || tgtMode === 'allAllies';
  const tgtAll = tgtMode === 'allEnemies' || tgtMode === 'allAllies';
  const tgtUids = allyAim ? [...enemyUids, ...allyUids] : tgtAllies ? allyUids : enemyUids;
  const verb = !fight.pendingSkill ? 'HIT'
    : tgtAllies ? ({ heal: 'HEAL', shield: 'SHIELD', boost: 'BUFF' }[SKILL_EFFECT[fight.pendingSkill]] || 'BUFF')
    : 'HIT';
  const targetLabel = tgtAll ? `◀ ${verb} ALL` : `◀ TAP TO ${verb}`;
  const animOf = (u) => !u.alive ? 'defeated' : fx.actor === u.uid ? 'attack' : fx.bursts?.[u.uid] === 'attack' ? 'damaged' : 'idle';
  const popsFor = (uid) => popups.filter((p) => p.uid === uid);
  // Landscape (U6): the fight becomes a TABLE of three panes — squad column | center
  // (moves + log) | enemy column — instead of a portrait river with the log below. Bigger
  // sprites, the log beside the moves. Portrait (narrow) is unchanged, byte-for-byte.
  const wide = !narrow;
  const side = (units, isEnemy) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: T.small, color: isEnemy ? '#e07a7a' : '#3ec9a0', fontWeight: 800, letterSpacing: 1 }}>{isEnemy ? 'ENEMY' : 'YOUR SQUAD'}</div>
      {units.map((u) => {
        const onTargetSide = allyAim ? true : tgtAllies ? !isEnemy : isEnemy;
        const isTgt = phase === 'select-target' && u.alive && onTargetSide && tgtUids.includes(u.uid);
        const isAct = !isEnemy && selecting && previewUid === u.uid && !isTgt;
        const canSwitch = !isEnemy && (phase === 'select' || (phase === 'select-target' && !tgtAllies && !allyAim)) && pool.includes(u.uid) && previewUid !== u.uid && !isTgt;
        // a picture for who gets hit: 🎯 pick ONE of these · 💥 hits ALL enemies · ✨ buffs the whole team.
        // For an aimed builder, an ally shows the place-mark (💚/🛡) and an enemy shows the chip 👊.
        const mark = isTgt ? (allyAim ? (isEnemy ? '👊' : placeMark) : tgtAll ? (tgtAllies ? '✨' : '💥') : '🎯') : null;
        const tLabel = isTgt && allyAim ? (isEnemy ? '◀ CHIP' : `◀ ${placeVerb} HERE`) : targetLabel;
        return (
          <StageUnit key={u.uid} u={u} anim={animOf(u)} big={units.length <= 2} bigger={wide}
            isActor={isAct} selectable={canSwitch} isTarget={isTgt} targetLabel={tLabel}
            targetMark={mark} aoe={isTgt && tgtAll && !tgtAllies}
            burst={fx.bursts?.[u.uid]} cast={fx.actor === u.uid ? fx.cast : null} fxN={fx.n} move={fx.move} hitN={fx.hitCounts?.[u.uid]} fire={fx.fire}
            heavy={fx.heavy?.[u.uid]} justKilled={fx.killed?.[u.uid]}
            boss={u.uid === bossUid}
            onSelect={previewUnit}
            onPick={chooseTarget} popups={popsFor(u.uid)} />
        );
      })}
    </div>
  );
  const prompt = phase === 'select' ? '👆 Tap a unit (any of yours — costs nothing), then pick its move in the middle'
    : phase === 'select-target' ? (allyAim ? `🎯 Tap an ALLY to ${placeVerb.toLowerCase()} them — or an enemy to poke it (${placeVerb.toLowerCase()} still lands)`
      : tgtAll ? `🎯 Tap to confirm — ${verb.toLowerCase()}s ${tgtAllies ? 'your whole team' : 'ALL enemies'}` : `🎯 Tap ${tgtAllies ? 'an ally' : 'an enemy'} to ${verb.toLowerCase()}`)
    : null;
  const live = phase !== 'done'; // an active fight — show the in-battle auto/manual switch
  // The battle log, extracted so it can sit BESIDE the moves (landscape) or below (portrait).
  const logPane = (
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
  );
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
      <div ref={arenaRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6, background: bgImg ? `radial-gradient(ellipse at center, rgba(20,20,31,0.72) 0%, rgba(11,11,20,0.85) 100%), url(${bgImg}) center/cover no-repeat` : 'radial-gradient(ellipse at center, #14141f 0%, #0b0b14 100%)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px 8px', marginBottom: 14, minHeight: 210 }}>
        {side(snap.A, false)}
        <div style={wide
          ? { flex: 2, minWidth: 280, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 12 }
          : { flex: moves ? 1.5 : 0.5, minWidth: moves ? 150 : 28, alignSelf: 'center', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CenterMoves moves={moves} pendingSkill={fight.pendingSkill} phase={phase} onSkill={chooseSkill} onBack={cancelTarget} tgtAllies={tgtAllies} tgtAll={tgtAll} allyAim={allyAim} placeVerb={placeVerb} hintSkill={hintSkill} />
          </div>
          {/* Landscape: the log lives in the center pane, beside the two creature columns. */}
          {wide && <div style={{ flex: 1, minHeight: 0 }}>{logPane}</div>}
        </div>
        {side(snap.B, true)}
      </div>
      {/* Below the arena: the banner full-width; in portrait the log stacks under it. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div>{banner}</div>
        {!wide && logPane}
      </div>
    </div>
  );
}

// Ring-law display, three sizes:
//  'detail' — boxed chip with full line + ask (ring-select screen)
//  'line'   — inline bold text (first-wave pre-battle reveal)
//  'pill'   — compact badge with title tooltip (upgrade header)
function RingLawChip({ law, lawId, variant = 'detail' }) {
  if (!law) return null;
  if (variant === 'line') return (
    <div style={{ fontSize: T.micro, fontWeight: 800, color: '#ffd166', marginTop: 7 }}>
      {law.icon} {law.name} — <span style={{ color: '#d8cba0', fontWeight: 600 }}>{law.line}</span>
    </div>
  );
  if (variant === 'pill') return (
    <div title={law.line} style={{ display: 'inline-block', fontSize: T.micro, fontWeight: 800, color: '#ffd166', background: '#16130a', border: '1px solid #4a3f1c', borderRadius: 999, padding: '2px 9px', marginTop: 5 }}>
      {law.icon} {law.name}
    </div>
  );
  // 'detail' variant — full chip with law text + optional recipe pointer (R4)
  const pointers = (lawId && LAW_RECIPE[lawId]) || [];
  const firstPointer = pointers.length > 0 ? pointers[0] : null;
  const rec = firstPointer ? RECIPE_BY_ID[firstPointer.recipe] : null;
  return (
    <div style={{ marginTop: 6, padding: '6px 9px', borderRadius: 8, background: '#16130a', border: '1px solid #4a3f1c' }}>
      <div style={{ fontSize: T.micro, fontWeight: 900, color: '#ffd166' }}>{law.icon} RING LAW — {law.name}</div>
      <div style={{ fontSize: T.micro, color: '#d8cba0', lineHeight: 1.4, marginTop: 2 }}>{law.line} <span style={{ color: '#9a8c5a', fontStyle: 'italic' }}>{law.ask}</span></div>
      {rec && (
        <div style={{ fontSize: T.micro, color: '#8a9a6a', marginTop: 4, fontStyle: 'italic' }}>
          ↳ {rec.icon} {rec.name} — {firstPointer.hint}.
        </div>
      )}
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
          <div key={mem.id} style={{ flex: 1, minWidth: 120, background: 'rgba(17,18,27,0.55)', border: `1px solid ${dead ? '#2a1414' : ti.accent + '4d'}`, boxShadow: dead ? 'none' : `0 0 10px ${ti.accent}1f`, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', borderRadius: 10, padding: '8px 10px', opacity: dead ? 0.45 : 1 }}>
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
// On a FRONTIER ring (never cleared), AUTO is locked — first clears are walked by hand
// (vF-CF); pass `locked` and the AUTO half goes dim with the Spotter's line under it.
function AutoToggle({ auto, setAuto, locked }) {
  const opt = (on, icon, label, sub) => {
    const dead = locked && on; // AUTO half, locked out on new ground
    return (
      <button onClick={dead ? undefined : () => setAuto(on)}
        style={{ flex: 1, textAlign: 'center', cursor: dead ? 'default' : 'pointer', borderRadius: 10, padding: '8px 10px',
          background: auto === on ? (on ? '#14233a' : '#1a1410') : PANEL,
          border: `2px solid ${auto === on ? (on ? '#5aa9ff' : ACCENT) : LINE}`, opacity: dead ? 0.35 : auto === on ? 1 : 0.7 }}>
        <div style={{ fontSize: T.small, fontWeight: 900, color: auto === on ? (on ? '#9be7ff' : ACCENT) : '#9a9aaa' }}>{dead ? '🔒' : icon} {label}</div>
        <div style={{ fontSize: T.micro, color: DIM, marginTop: 1 }}>{dead ? 'after first clear' : sub}</div>
      </button>
    );
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {opt(true, '⚡', 'AUTO', 'AI fights for you')}
        {opt(false, '🎮', 'MANUAL', 'you drive every turn')}
      </div>
      {locked && (
        <div style={{ fontSize: T.micro, color: '#9a8a6a', fontStyle: 'italic', textAlign: 'center', marginTop: 5 }}>
          “New ground. Walk it yourself the first time — once it's yours, I'll mind the reins.”
        </div>
      )}
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
      <defs>
        <clipPath id="ring-map-clip">
          <circle cx={C} cy={C} r={maxR + 8} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={maxR + 8} fill="#08080e" stroke="#17171f" />
      <image href="/art/cutscene/scene-rings.jpg" x={C - (maxR + 8)} y={C - (maxR + 8)} width={(maxR + 8) * 2} height={(maxR + 8) * 2} clipPath="url(#ring-map-clip)" preserveAspectRatio="xMidYMid slice" opacity="0.22" />
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

// A titled block in the character sheet (module-level so it isn't re-created each render).
function SheetSection({ title, accent = '#9aa3b2', children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.2, color: accent, marginBottom: 7, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  );
}

// ── CHARACTER SHEET (U5) — the full read on one creature: identity, innate, sworn ★ Oath,
// the kit (each skill's plain one-liner), the team recipes it belongs to, and its lore. The
// long copy for vocabulary lives behind ⓘ dots (the Spotter glossary), never in tooltips.
// Self-contained + prop-driven so U6's landscape master-detail can drop the SAME component
// into a right pane (one component, two shells — HANDHELD-DIRECTION.md). The big art slot
// shows the battle sprite scaled now; a fuller `portrait` is reserved for the art instance.
function CharacterSheet({ id, swornNodeId, coresBal = 0, hasTree = false, narrow = true, onClose, onOpenTree }) {
  const c = COMBAT_CREATURES[id];
  if (!c) return null;
  const ti = TYPE_INFO[c.type];
  const rar = rarityOf(id); const rinfo = RARITY_INFO[rar]; const tm = rinfo.mult;
  const inn = innateFor(id);
  const oath = swornNodeId ? NODE_BY_ID[swornNodeId] : null;
  const skills = (c.skillIds || []).map((sid) => getSkill(sid)).filter(Boolean);
  const teams = recipesForCreature(id, c.type);
  const lore = CREATURE_LORE[id];
  const KIND = { builder: { label: 'BUILDER', color: '#9be7ff' }, payoff: { label: 'PAYOFF', color: ACCENT }, wildcard: { label: 'WILDCARD', color: '#cba6ff' } };
  // Which seat this creature fills in a given recipe — for the "teams" list.
  const seatIn = (r) => {
    const s = r.slots.find((sl) => sl.c === id || (sl.oneOf && sl.oneOf.includes(id)) || sl.t === c.type);
    return s ? slotLabel(s) : c.type;
  };
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, fontSize: T.small, cursor: 'pointer', marginBottom: 12 }}>← back</button>

      {/* Identity header — big art, name, rarity, Type, role */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flexShrink: 0, background: `radial-gradient(circle at 50% 40%, ${ti.accent}22, #0c0c14)`, borderRadius: 14, border: `1px solid ${ti.accent}44`, padding: 6 }}>
          <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={narrow ? 88 : 116} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: T.head, fontWeight: 900, color: ti.accent }}>{c.name}</span>
            <span style={{ fontSize: T.small, fontWeight: 900, color: rinfo.color }} title={rar}>{rinfo.pips}</span>
          </div>
          <div style={{ fontSize: T.small, fontWeight: 800, color: '#cfd6e2', marginTop: 2 }}>{ti.glyph} {c.type} <span style={{ color: DIM, fontWeight: 600 }}>· {ti.nick} · {rar}</span></div>
          <div style={{ fontSize: T.small, color: '#9aa3b2', lineHeight: 1.4, marginTop: 5 }}>{ti.role}</div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: ti.accent, marginTop: 5, letterSpacing: 0.3 }}>⮑ plays the {BUILD_LINE[c.type] || ti.nick} build</div>
          <div style={{ fontSize: T.micro, color: DIM, marginTop: 6 }}>HP {Math.round(c.hp * tm)} · ATK {Math.round(c.atk * tm)} · SPD {c.speed}{tm > 1 && <span style={{ color: rinfo.color, fontWeight: 800 }}> · ×{tm.toFixed(2)}</span>}</div>
        </div>
      </div>

      {/* Innate — born-in, always on */}
      {inn && (
        <SheetSection title="✦ Innate — born in, always on" accent="#7ee0c0">
          <div style={{ background: '#0a1c16', border: '1px solid #2a5040', borderRadius: 9, padding: '9px 12px' }}>
            <div style={{ fontSize: T.small, fontWeight: 900, color: '#7ee0c0' }}>{inn.name}</div>
            <div style={{ fontSize: T.micro, color: '#9fb4ad', lineHeight: 1.45, marginTop: 2 }}>{inn.line}</div>
          </div>
        </SheetSection>
      )}

      {/* Sworn ★ Oath — one per creature, the build's commitment */}
      <SheetSection title={<>★ Sworn Oath <GlossaryDot term="Oath" /></>} accent="#ffd166">
        {oath ? (
          <div style={{ background: 'linear-gradient(180deg,#1c1810,#13110a)', border: '1px solid #6a5a2a', borderRadius: 9, padding: '9px 12px' }}>
            <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffe08a' }}>★ {oath.name}</div>
            <div style={{ fontSize: T.micro, color: '#c9b98a', lineHeight: 1.45, marginTop: 2 }}>{oath.desc}</div>
          </div>
        ) : (
          <div style={{ fontSize: T.micro, color: DIM, fontStyle: 'italic' }}>No Oath sworn yet — the ★ at the end of a path in PATHS.</div>
        )}
      </SheetSection>

      {/* The kit — three skills, each plain one-liner */}
      <SheetSection title="The kit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {skills.map((sk) => { const k = KIND[sk.kind] || { label: (sk.kind || '').toUpperCase(), color: DIM }; return (
            <div key={sk.id} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: T.small, fontWeight: 900, color: '#e6e6ef' }}>{sk.name}</span>
                <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: 0.6, color: k.color, border: `1px solid ${k.color}66`, borderRadius: 6, padding: '1px 5px' }}>{k.label}</span>
              </div>
              <div style={{ fontSize: T.micro, color: '#9aa3b2', lineHeight: 1.45, marginTop: 3 }}>{sk.blurb}</div>
            </div>
          ); })}
        </div>
      </SheetSection>

      {/* Teams it belongs to — the recipe lane (R1) */}
      {teams.length > 0 && (
        <SheetSection title={<>Teams it belongs to <GlossaryDot term="Team Recipe" /></>} accent="#ffd166">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teams.map((r) => (
              <div key={r.id} title={r.how} style={{ background: '#13110a', border: '1px dashed #6a5a2a', borderRadius: 9, padding: '7px 11px' }}>
                <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffe08a' }}>{r.icon} {r.name}{r.tier === 'sworn' && <span style={{ fontSize: 8.5, color: '#cdb6ff', fontWeight: 800, marginLeft: 6 }}>★ sworn</span>}</div>
                <div style={{ fontSize: T.micro, color: '#c9b98a', fontStyle: 'italic', marginTop: 1 }}>{r.line} <span style={{ color: DIM, fontStyle: 'normal' }}>— as {seatIn(r)}</span></div>
              </div>
            ))}
          </div>
        </SheetSection>
      )}

      {/* Lore — folk-voice fiction (CREATURE_LORE rumor) */}
      {lore && (
        <SheetSection title="Field notes" accent="#9a8fb0">
          <div style={{ fontSize: T.small, color: '#bcc3d0', lineHeight: 1.55, fontStyle: 'italic' }}>“{lore.rumor}”</div>
          {lore.where && <div style={{ fontSize: T.micro, color: DIM, marginTop: 4 }}>Said to roam {lore.where}.</div>}
        </SheetSection>
      )}

      {/* Through to PATHS */}
      <button onClick={() => onOpenTree?.(id)} disabled={!hasTree}
        style={{ width: '100%', marginTop: 4, padding: '12px 0', borderRadius: 11, border: `1px solid ${hasTree ? '#2a4a5a' : LINE}`, background: hasTree ? '#101a22' : '#0c0c14', color: hasTree ? '#9be7ff' : DIM, fontSize: T.body, fontWeight: 900, letterSpacing: 0.5, cursor: hasTree ? 'pointer' : 'default' }}>
        🌳 PATHS{coresBal > 0 ? ` · ${coresBal} ⬡ to spend` : ''}
      </button>
    </div>
  );
}

// ── RUN MODE — squad pick → (upgrade → wave) ×3 → boss, HP carries, win or wipe. ──
function RunMode({ narrow, slag = 0, onSlag }) {
  const [draftCoachSeen, setDraftCoachSeen] = useState(() => !!localStorage.getItem('ringward_draft_seen'));
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
  // ── THE GAUNTLET (endless) — a parallel survival flow; never enters the climb's win-handler. ──
  const [endless, setEndless] = useState(false);          // is this run an endless Gauntlet?
  const [endlessRound, setEndlessRound] = useState(0);    // round currently being fought (1-indexed)
  const [endlessBest, setEndlessBest] = useState(loadEndlessBest); // furthest round ever cleared
  const [endlessResult, setEndlessResult] = useState(null); // {reached, best, isRecord, slag} on a fall
  const [clears, setClears] = useState(loadClears); // {ringId: times cleared} — diminishing core farm
  const [runRepeat, setRunRepeat] = useState(1); // this run's repeat-clear core multiplier (fixed at start)
  const [sigils, setSigils] = useState(loadSigils); // {apexId: count} — gathered toward a challenge
  const [unlocked, setUnlocked] = useState(loadUnlocked); // deepest ring earned (strict inward)
  const [unlockedNow, setUnlockedNow] = useState(null); // ring depth just opened (won-screen beat)
  const [wards, setWards] = useState(loadWards);        // {wardId: {active, progress, solved}} — gate riddles
  const [wardBlock, setWardBlock] = useState(null);     // a Ward just barred the way (won-screen reveal)
  const [wardSolvedNow, setWardSolvedNow] = useState(null); // a Ward's riddle just completed (won-screen reveal)
  const [beta, setBeta] = useState(loadBeta); // test switch — fast-forwards the gate
  const accessDepth = beta ? 8 : unlocked; // the deepest ring you may enter right now
  const [challenge, setChallenge] = useState(null); // apex creature def currently being challenged
  const [reclaimed, setReclaimed] = useState(loadReclaimed); // deepest ring boss ever beaten (0..8) = Holdfast reclaim depth
  const [crossing, setCrossing] = useState(loadCrossing);    // NG+ level — times stepped through the Drop (0 = first climb)
  const [holdfastNow, setHoldfastNow] = useState(null); // a Holdfast stage just reclaimed this clear (won-screen reveal)
  const [holdfastPicks, setHoldfastPicks] = useState(loadHoldfastPicks); // {depth: 0|1} — 0=main boon, 1=alt boon
  const [temperingTier, setTemperingTier] = useState(loadTempering);     // Forge Tempering level (0..TEMPERING_CAP, resets per crossing)
  const [pendingHoldfastPick, setPendingHoldfastPick] = useState(0);     // depth of freshly-reclaimed stage waiting for a pick (0=none)
  const [enteredRing, setEnteredRing] = useState(null); // the ring you just stepped into (threshold beat on wave 0)
  const [pendingEvent, setPendingEvent] = useState(null); // a wayside event awaiting a choice (or null)
  const [eventStep, setEventStep] = useState(null); // current step id within a branching TALE (null = start / not a tale)
  const [pendingElite, setPendingElite] = useState(null); // an ELITE node awaiting fight-or-flee (or null)
  const [eventOutcome, setEventOutcome] = useState(null); // the outcome line after a choice is made
  const eventsSeenRef = useRef([]); // event ids already shown THIS run — no repeats within a run
  const [music, setMusic] = useState(loadMusic); // ambient pad on/off (user toggle, persisted)
  const [sfxOn, setSfxOn] = useState(loadSfxOn); // combat/UI SFX on/off (persisted; music is separate)
  useEffect(() => { sfx.setMuted(!sfxOn); }, [sfxOn]); // keep the sound module in sync
  const [showIntro, setShowIntro] = useState(() => !introSeen()); // opening cutscene (first launch + replay)
  const [relics, setRelics] = useState(loadRelics);        // owned relic ids (the collection — found from boss clears)
  const [relicKit, setRelicKit] = useState(loadRelicKit);  // equipped relic loadout (subset, capped at RELIC_SLOTS)
  const [relicChoices, setRelicChoices] = useState([]);    // pending boss-drop picks — choose one on the won screen
  const [relicDrop, setRelicDrop] = useState(null);        // the relic you chose this clear (won-screen reveal)
  const [showVault, setShowVault] = useState(false);       // the relic VAULT overlay — the full collection to chase
  const [shards, setShards] = useState(loadShards);        // relic-shards — salvage relics → forge Keystones
  const [salvageMode, setSalvageMode] = useState(false);   // Relics tab: tapping a relic melts it for shards
  const [relicCut, setRelicCut] = useState(loadCutMap);    // {relicId: activeCutIdx} — which cut is live (0 = default)
  const [relicCutOwn, setRelicCutOwn] = useState(loadCutOwn); // {relicId: [unlockedIdx,…]} — slag-unlocked cuts
  const [recutMode, setRecutMode] = useState(false);       // Relics tab: tapping a relic opens its cut chooser
  const [recutFor, setRecutFor] = useState(null);          // relic id whose cut chooser is open
  const [craftResult, setCraftResult] = useState(null);    // last Keystone craft outcome (reveal on the Forge tab)
  const [showCodex, setShowCodex] = useState(false);       // THE CHRONICLE — a lore codex that fills as you climb
  const [homeTab, setHomeTab] = useState('raid');          // home shell page: raid | forge | relics | holdfast
  const [showSettings, setShowSettings] = useState(false); // ⚙ settings menu overlay (music/auto-pick/beta/reset)
  const [confirmReset, setConfirmReset] = useState(false); // two-tap guard on the tester "Start Over" wipe
  // Ambient pad follows the toggle; stays silent until a user gesture resumes audio, and
  // fades out when the SEAM closes. Combat/UI sfx are unaffected by this.
  useEffect(() => { if (music) sfx.startAmbient(); else sfx.stopAmbient(); return () => sfx.stopAmbient(); }, [music]);
  // Surface where the player is so the feedback button can attach it to a report.
  useEffect(() => {
    setLiveContext({ screen: runPhase === 'pick' ? `home:${homeTab}` : runPhase, phase: runPhase, squad: squad.map((m) => m.id) });
  }, [runPhase, homeTab, squad]);
  const [sigilGain, setSigilGain] = useState(null); // {id, count, ready} — sigil earned this clear (reveal)
  const [pity, setPity] = useState(loadPity); // pulls since the last Legendary
  const [typesMastered, setTypesMastered] = useState(loadTypesMastered); // Types ever fielded in a ring clear (drives the mastery feat)
  const [recipesCooked, setRecipesCooked] = useState(loadRecipesCooked); // recipe ids cooked in a ring clear (drives the Cook the Book feat)
  const [pullNow, setPullNow] = useState(null); // { id, rarity, isDupe, gainedCores } — this clear's pull
  const [wonStep, setWonStep] = useState(0);    // staged result reveal: 0 = payoff, 1..n = one spoil at a time, last = onward
  const [resultDetails, setResultDetails] = useState(false); // "▸ run details" expander on the result screens
  const runGroundRef = useRef(null);            // the active run's ring — ring laws read it at each battle start
  const repeatIdsRef = useRef(new Set());       // creatures repeated from LAST run ("The Cold Remembers")
  const [stones, setStones] = useState(loadStones); // CARVED STONES found (ring ids) — the deep-past lore collection
  const [stoneNow, setStoneNow] = useState(null);   // the stone found on THIS clear (first clear of a ring), for the reveal
  const [summonResults, setSummonResults] = useState(null); // [{id,rarity,isDupe,gainedCores}] — last Summon's pulls
  const [bannerId, setBannerId] = useState('wild');         // chosen Summon banner (wild | deep)
  const [caughtFrom, setCaughtFrom] = useState(null); // the ground it was drawn from (for reveal)
  const [pendingUpgrade, setPendingUpgrade] = useState(null); // unit-scope upgrade awaiting a target pick
  const [targetChoice, setTargetChoice] = useState(null); // who's tentatively selected on the target-pick screen (confirm to commit)
  const [upgradeChoice, setUpgradeChoice] = useState(null); // which upgrade is tentatively selected (confirm to commit)
  const [cores, setCores] = useState(loadCores); // {creatureId: unspent Cores ⬡} — permanent
  const [treeAlloc, setTreeAlloc] = useState(loadTreeAlloc); // {creatureId: [nodeId]} unlocked — permanent
  const [treeEquip, setTreeEquip] = useState(loadEquip); // {creatureId: [nodeId]} equipped loadout
  const [treeRanks, setTreeRanks] = useState(loadRanks); // {creatureId: {nodeId: rank}} for Refinement
  const [treeFor, setTreeFor] = useState(null); // creatureId whose skill tree is open (overlay)
  const [sheetFor, setSheetFor] = useState(null); // creatureId whose character sheet is open (overlay)
  const [keystoneSwap, setKeystoneSwap] = useState(null); // {creatureId, from, to} — pending ★ swap awaiting confirm
  const [coresRun, setCoresRun] = useState({}); // {creatureId: Cores earned THIS run} for recap
  const [auto, setAutoState] = useState(loadAuto); // AUTO: let the AI fight your squad
  const setAuto = (on) => { setAutoState(on); saveAuto(on); };
  // FIRST-CLEARS ARE MANUAL (vF-CF): a ring you haven't beaten yet is walked by hand —
  // AUTO is locked until its boss falls, then unlocks for re-farming. New ground is where
  // the kits, laws, and targeting actually teach; auto is for mastery, not discovery.
  // The saved AUTO preference is never mutated — it's just overridden for frontier runs.
  const frontierRun = runDepth > reclaimed;
  const runAuto = auto && !frontierRun;
  const [autoPick, setAutoPickState] = useState(loadAutoPick); // auto-resolve upgrade/event screens on FARMED rings
  const setAutoPick = (on) => { setAutoPickState(on); saveAutoPick(on); };
  const farmedRef = useRef(false); // is THIS run a re-clear of an already-beaten ring? (set at run start)
  const featsAtRunStartRef = useRef(new Set()); // feat ids already earned when THIS run began (for "newly earned" celebration)
  const apTimer = useRef(null);    // the single pending auto-pick action timer
  const apSig = useRef(null);      // signature of the actionable state we've already scheduled for
  // AUTO-PICK: on a farmed ring (already cleared), auto-resolve the upgrade draft + wayside
  // events with a brief beat (so you can still SEE each pick fly by) instead of prompting.
  // NOTE: this screen re-renders rapidly, so we DON'T clear the timer on every effect run —
  // we only (re)schedule when the actionable STATE changes (tracked by `apSig`). Otherwise a
  // self-cancelling setTimeout would be wiped before its delay elapsed and never fire.
  useEffect(() => {
    let sig = null, act = null;
    if (autoPick && farmedRef.current) {
      if (runPhase === 'upgrade' && offer.length && !upgradeChoice) {
        sig = 'u' + waveIdx;
        // `offer` holds upgrade IDS. Farming auto-pick now DRAFTS BY THE SAME Build-Advisor score
        // that drives the manual ★ (was: "first squad-scope" — which left 15–27pp on the table per
        // the tier-2 sim). So auto-runs draft like a competent player instead of grabbing the first
        // whole-squad card. A higher-scored UNIT upgrade routes cleanly through the pick-target
        // branch below (the target detour is already automated), so unit picks are safe here.
        const apCtx = { types: new Set(squad.filter((u) => u.hp > 0).map((u) => COMBAT_CREATURES[u.id].type)), mods: runMods, boss: !!(runWaves[waveIdx] && runWaves[waveIdx].boss) };
        const bestId = offer.reduce((b, id) => upgradeScore(UPGRADE_BY_ID[id], apCtx) > upgradeScore(UPGRADE_BY_ID[b], apCtx) ? id : b, offer[0]);
        const pick = UPGRADE_BY_ID[bestId];
        if (pick) act = () => applyUpgrade(pick);
      } else if (runPhase === 'pick-target' && pendingUpgrade) {
        sig = 'pt' + waveIdx;
        // A unit-scope bend must land on a creature whose KIT reads it — match needsType
        // first (strongest eligible, like the sim), else any living member.
        const eligible = squad.filter((m) => m.hp > 0 && (!pendingUpgrade.needsType || COMBAT_CREATURES[m.id]?.type === pendingUpgrade.needsType));
        const tgt = (eligible.length ? eligible : squad.filter((m) => m.hp > 0)).reduce((b, m) => (b && COMBAT_CREATURES[b.id]?.atk >= (COMBAT_CREATURES[m.id]?.atk || 0) ? b : m), eligible[0] || squad.find((m) => m.hp > 0)) || squad[0];
        if (tgt) act = () => pickTarget(tgt.id);
      } else if (runPhase === 'event' && pendingElite && !eventOutcome) {
        sig = 'el' + waveIdx;
        act = () => eventPressOn(); // farming: slip past elites (don't risk the run on auto)
      } else if (runPhase === 'event' && pendingEvent && !eventOutcome) {
        const ev = pendingEvent;
        const step = ev.steps ? ev.steps[eventStep || ev.start] : ev; // TALE: the live step
        sig = 'ev' + ev.id + (eventStep || ''); // include step so auto re-fires through a branching tale
        const choices = step.choices || [];
        // farming: prefer a FREE TERMINAL choice (ends the tale fast, no auto-spend); else a
        // free advancing choice; else the first available.
        const ch = choices.find((c) => !c.cost && !c.goto) || choices.find((c) => !c.cost) || choices[0];
        if (ch) act = () => chooseEvent(ch);
      } else if (runPhase === 'event' && eventOutcome) {
        sig = 'eo' + waveIdx;
        act = () => eventPressOn();
      }
    }
    if (sig === apSig.current) return; // same actionable state (incl. both null) — let any pending timer ride
    apSig.current = sig;
    if (apTimer.current) { clearTimeout(apTimer.current); apTimer.current = null; }
    if (act) apTimer.current = setTimeout(() => { apTimer.current = null; act(); }, sig && sig.startsWith('eo') ? 650 : 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPick, runPhase, offer, upgradeChoice, pendingUpgrade, pendingEvent, eventStep, eventOutcome, squad, waveIdx]);

  // Perk-driven dials, recomputed from what you own.
  const offerCount = owned.includes('p_foresight') ? 4 : 3;
  // healMult ALSO scales the between-wave patch-up (Subject-2 fix B): gives every "+healing" reward
  // a universal floor — even a no-healer squad that took a wayside "+heal" now patches a little more,
  // so heal-scaling is never fully dead. Modest by design (base is only 18%); healers still scale heals
  // in combat far more. (Pairs with fix A: the dead heal *upgrades* are already gated out of the draft.)
  // patchupFor reads the CALLER's mods (not the render closure) — startWave's onComplete fires
  // after a draft may have changed healMult, so deriving from `mods` keeps patch-up exact.
  const patchupFor = (m) => (PATCHUP + (owned.includes('p_medic') ? 0.15 : 0)) * (m.healMult ?? 1);
  const patchup = patchupFor(runMods); // for the prep-header label

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

  // ── RECUT (§31): set a relic's active cut. Cut 0 (default) is always free; an alternate
  // cut UNLOCKS once with slag, then swapping among unlocked cuts is free. ──
  function chooseCut(r, idx) {
    if (idx > 0 && !(relicCutOwn[r.id] || []).includes(idx)) {
      const cost = recutCost(r.rarity);
      if ((slag || 0) < cost) return; // can't afford the unlock
      onSlag?.(-cost); sfx.forgeBuy?.();
      const no = { ...relicCutOwn, [r.id]: [...(relicCutOwn[r.id] || []), idx] };
      setRelicCutOwn(no); saveCutOwn(no);
    } else {
      sfx.upgradePick?.();
    }
    const nm = { ...relicCut, [r.id]: idx }; setRelicCut(nm); saveCutMap(nm);
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
    // One ★ per creature: buying a second keystone routes to a SWAP confirm instead.
    if (node.keystone) {
      const other = owned.map((id) => NODE_BY_ID[id]).find((n) => n?.keystone && n.id !== node.id);
      if (other) { setKeystoneSwap({ creatureId, from: other, to: node }); return; }
    }
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
  // Commit a pending ★ swap: the old keystone refunds in full; the new one costs its
  // price + RESPEC_FEE. Net cores: -(to.cost + fee - from.cost). If the old ★ was in the
  // loadout, the new one takes its slot; otherwise it auto-equips if there's room.
  function swapKeystone({ creatureId, from, to }) {
    const delta = to.cost + RESPEC_FEE - from.cost;
    // Stale confirm (the old ★ was already let go some other way) → just dismiss.
    if (!(treeAlloc[creatureId] || []).includes(from.id)) { setKeystoneSwap(null); return; }
    if ((cores[creatureId] || 0) < delta) return;
    setCores((c) => { const n = { ...c, [creatureId]: (c[creatureId] || 0) - delta }; saveCores(n); return n; });
    setTreeAlloc((a) => { const cur = (a[creatureId] || []).filter((id) => id !== from.id); const n = { ...a, [creatureId]: [...cur, to.id] }; saveTreeAlloc(n); return n; });
    setTreeEquip((e) => {
      const cur = e[creatureId] || [];
      let next;
      if (cur.includes(from.id)) next = cur.map((id) => (id === from.id ? to.id : id));
      else if (cur.length < slotsForUnlocked((treeAlloc[creatureId] || []).length)) next = [...cur, to.id];
      else return e;
      const n = { ...e, [creatureId]: next }; saveEquip(n); return n;
    });
    setKeystoneSwap(null); sfx.upgradePick();
  }
  // Legacy-save migration: a creature holding 2+ keystones picks ONE to keep; the rest
  // refund in full (no fee — the rule changed, not the player's choice).
  function resolveKeystoneOath(creatureId, keepId) {
    const ownedIds = treeAlloc[creatureId] || [];
    const drop = ownedIds.map((id) => NODE_BY_ID[id]).filter((n) => n?.keystone && n.id !== keepId);
    if (!drop.length) return;
    const dropIds = new Set(drop.map((n) => n.id));
    const refund = drop.reduce((s, n) => s + n.cost, 0);
    setCores((c) => { const n = { ...c, [creatureId]: (c[creatureId] || 0) + refund }; saveCores(n); return n; });
    setTreeAlloc((a) => { const n = { ...a, [creatureId]: (a[creatureId] || []).filter((id) => !dropIds.has(id)) }; saveTreeAlloc(n); return n; });
    setTreeEquip((e) => { const cur = e[creatureId] || []; if (!cur.some((id) => dropIds.has(id))) return e; const n = { ...e, [creatureId]: cur.filter((id) => !dropIds.has(id)) }; saveEquip(n); return n; });
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
    // A squad-wide reward that can't function for this squad is a DEAD draft — gate it out,
    // exactly like needsType does for move-bends. heal = a Mender (or active lifesteal); shield
    // = a Bulwark. (Fixes "Wellspring offered to a healer-less squad" — never a useful pick.)
    const hasCap = (cap) =>
      cap === 'heal'   ? (types.has('Mender') || (runMods.lifesteal > 0)) :
      cap === 'shield' ? types.has('Bulwark') : true;
    const pool = UPGRADES.filter((u) => {
      if (u.needsType && !types.has(u.needsType)) return false;
      if (u.needsCap && !hasCap(u.needsCap)) return false;
      if (u.chain) return sq.some((m) => m.hp > 0 && COMBAT_CREATURES[m.id].type === u.needsType && (m.bends ?? []).some((b) => b.id === u.chain));
      return true;
    });
    const out = [];
    for (let k = 0; k < offerCount && pool.length; k++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    setOffer(out); setUpgradeChoice(null); // fresh choice each upgrade screen
  }

  // Roll a wayside event for this between-waves step (~55%), never repeating one in a run.
  function maybeWaysideEvent() {
    if (Math.random() > 0.7) return null; // ~70% of non-boss steps are a NODE, not just a fight
    const unseen = WAYSIDE_EVENTS.filter((e) => !eventsSeenRef.current.includes(e.id));
    if (!unseen.length) return null;
    // Roll a node KIND (weighted), then an unseen node of that kind; fall back to any unseen.
    const kindOf = (e) => e.kind || 'story';
    const roll = Math.random() * 100;
    const kind = roll < 50 ? 'story' : roll < 69 ? 'merchant' : roll < 88 ? 'treasure' : 'elite';
    const ofKind = unseen.filter((e) => kindOf(e) === kind);
    const pickPool = ofKind.length ? ofKind : unseen;
    const ev = pickPool[Math.floor(Math.random() * pickPool.length)];
    eventsSeenRef.current = [...eventsSeenRef.current, ev.id];
    return ev;
  }
  // Apply a chosen option's effect via a ctx bound to the live run state, then show the outcome.
  function chooseEvent(choice) {
    if (eventOutcome) return; // already chosen — wait for PRESS ON
    if (choice.cost && slag < choice.cost) return; // can't afford this ware (button is also disabled)
    if (choice.cost) onSlag?.(-choice.cost); // merchant: pay before the goods
    const aliveIds = squad.filter((m) => m.hp > 0).map((m) => m.id);
    const ctx = {
      rng: Math.random,
      cores: (n) => awardCores(aliveIds, n),
      slag: (n) => onSlag?.(n),
      heal: (frac) => setSquad((sq) => sq.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, runMods), Math.round(m.hp + maxHpOf(m, runMods) * frac)) } : m)),
      hurt: (frac) => setSquad((sq) => sq.map((m) => m.hp > 0 ? { ...m, hp: Math.max(1, Math.round(m.hp - maxHpOf(m, runMods) * frac)) } : m)),
      buff: (fn) => setRunMods((rm) => { const n = { ...rm }; fn(n); return n; }),
      prime: (n = 2) => setRunMods((rm) => ({ ...rm, chargeStart: (rm.chargeStart || 0) + n })),
      // grant a relic into the permanent collection (a weighted unowned draw); null if full.
      relic: () => { const rd = rollRelicChoices(relics, 1)[0]; if (!rd) return null; const nr = [...relics, rd.id]; setRelics(nr); saveRelics(nr); return rd; },
    };
    sfx.upgradePick();
    const res = choice.apply ? choice.apply(ctx) : null; // run effects (terminal choices also return the outcome line)
    if (choice.goto) setEventStep(choice.goto);          // a TALE continues — advance to the next step, no outcome yet
    else setEventOutcome(res || 'You press on.');         // terminal — show the outcome + PRESS ON
  }
  function eventPressOn() { setPendingEvent(null); setPendingElite(null); setEventOutcome(null); setEventStep(null); setRelicDrop(null); setRunPhase('upgrade'); }
  // ELITE node: an optional standalone fight vs a marked hunter (tough: depth × crossing ×
  // an elite bump). Win → a guaranteed relic + a brief reveal; lose → the run ends like any
  // wipe. Squad HP carries in and out. Reuses the run's auto/manual mode.
  function startEliteFight() {
    if (!pendingElite) return;
    const elite = pendingElite, sq = squad, mods = runMods;
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i], mods, treeModsFor(sq[i].id, treeEquip, treeRanks)));
    const base = COMBAT_CREATURES[elite.foeId], cm = crossMult(crossing);
    const eHp = Math.round(base.hp * D_HP(runDepth) * cm * 2.0), eAtk = Math.round(base.atk * D_ATK(runDepth) * cm * 1.4);
    const foeDef = { ...makeUnitDef(elite.foeId, 'Greedy'), name: elite.title, hp: eHp, maxHp: eHp, atk: eAtk, speed: 7 };
    setPendingElite(null);
    fight.begin(aDefs, [foeDef], 555, runAuto ? 'auto' : 'play', (res, finalState) => {
      const next = sq.map((m) => ({ ...m }));
      fielded.forEach((mi, i) => { next[mi].hp = finalState.units.A[i].hp; });
      const won = next.some((m) => m.hp > 0) && finalState.units.A.some((u) => u.hp > 0) && res.winner !== 'B';
      if (!won) { const got = lossSlag(waveIdx); onSlag?.(got); setEarned(got); setSquad(next); sfx.squadDown(); setResultDetails(false); setRunPhase('lost'); return; }
      setSquad(next);
      const rd = rollRelicChoices(relics, 1)[0]; // guaranteed relic for felling the hunter
      if (rd) { const nr = [...relics, rd.id]; setRelics(nr); saveRelics(nr); setRelicDrop(rd); } else { onSlag?.(40); }
      sfx.ringTaken();
      setEventOutcome('💀 The Marked Hunter falls. It will not pace anyone again. You take its prize.');
      setPendingElite(elite); setRunPhase('event'); // back to the node screen to show the spoils
    }, (st) => applyRingLaw(st, runGroundRef.current, { repeatIds: repeatIdsRef.current })); // elites obey the ring's law too ("every fight")
    setRunPhase('fighting');
  }

  function startWave(idx, sq, mods) {
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i], mods, treeModsFor(sq[i].id, treeEquip, treeRanks)));
    fight.begin(aDefs, runWaves[idx].enemies(), runWaves[idx].seed, runAuto ? 'auto' : 'play', (res, finalState) => {
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
        setSquad(next); sfx.squadDown(); setResultDetails(false); setRunPhase('lost'); return;
      }
      // Progressive Cores: each surviving fielded creature banks ⬡ for clearing this wave.
      const clearedIds = fielded.filter((mi) => next[mi].hp > 0).map((mi) => next[mi].id);
      awardCores(clearedIds, Math.max(1, Math.round(coresForWave(idx, !!runWaves[idx].boss) * depthCoreMult(runDepth) * runRepeat * (1 + 0.25 * crossing))));
      // Patch survivors up a little for the next push.
      const patched = next.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, mods), m.hp + Math.round(maxHpOf(m, mods) * patchupFor(mods))) } : m);
      setSquad(patched);
      if (idx === WAVE_COUNT - 1) {
        const winSlag = Math.round(WIN_SLAG * (1 + 0.25 * crossing)); // deeper crossings pay more
        onSlag?.(winSlag); setEarned(winSlag);
        const hunted = accessibleGround(ground, accessDepth); // the ring you actually raided
        setCaughtFrom(hunted);
        // CARVED STONE (vF-CE): the FIRST clear of each ring uncovers the old folk's stone —
        // the deep-past lore drip, one quiet revelation per ring.
        if (DEEP_INSCRIPTIONS[hunted.id] && !stones.includes(hunted.id)) {
          const ns = [...stones, hunted.id]; setStones(ns); saveStones(ns);
          setStoneNow({ ringId: hunted.id, ...DEEP_INSCRIPTIONS[hunted.id] });
        } else setStoneNow(null);
        // Record the clear — repeats of this ring pay diminishing Cores from here on.
        setClears((c) => { const n = { ...c, [hunted.id]: (c[hunted.id] || 0) + 1 }; saveClears(n); return n; });
        // Strict inward + WARD GATES: beating a ring's boss at your frontier opens the next
        // ring — UNLESS a Ward bars that threshold. A sealed Ward reveals its riddle and the
        // way stays shut until its deed is done. Beta skips wards (and the gate) entirely.
        const frontierWin = !beta && hunted.depth === unlocked && unlocked < 8;
        const blockingWard = frontierWin ? wardBlocking(unlocked, wards) : null;
        if (blockingWard) {                       // sealed: reveal the riddle, the way stays shut
          const nw = activateWard(wards, blockingWard.id); setWards(nw); saveWards(nw);
          setWardBlock(blockingWard); setUnlockedNow(null);
        } else if (frontierWin) {                 // open: the next ring inward unlocks
          const nd = unlocked + 1; setUnlocked(nd); saveUnlocked(nd); setUnlockedNow(nd);
        } else setUnlockedNow(null);
        // WARD DEEDS: any clear can advance an ACTIVE ward's riddle — the right ring with the
        // right squad shape (e.g. a Bulwark + a Reactor fielded together). Complete it and the
        // ward opens (its gated ring unlocks) + drops a key relic. Never touches the engine.
        setWardSolvedNow(null);
        const squadTypes = squad.map((m) => COMBAT_CREATURES[m.id]?.type).filter(Boolean);
        // TYPE MASTERY (feat): every Type you fielded in this ring clear earns its check —
        // collect all 8 across runs (pushes squad rotation, the muscle R8's law trains).
        setTypesMastered((prev) => {
          const merged = [...new Set([...prev, ...squadTypes])];
          if (merged.length !== prev.length) saveTypesMastered(merged);
          return merged.length !== prev.length ? merged : prev;
        });
        // COOK THE BOOK (feat, R4) — record any recipe the fielded squad cooked this clear.
        // Pure projection: detectRecipes reads the squad state that already determined the run.
        const squadMembers = squad.map((m) => recipeMember(m.id, treeEquip));
        const cookedIds = detectRecipes(squadMembers).lit.map((r) => r.id);
        if (cookedIds.length > 0) {
          setRecipesCooked((prev) => {
            const merged = [...new Set([...prev, ...cookedIds])];
            if (merged.length !== prev.length) saveRecipesCooked(merged);
            return merged.length !== prev.length ? merged : prev;
          });
        }
        const deed = advanceWardDeeds(wards, hunted.id, squadTypes);
        if (deed.changed) { setWards(deed.wards); saveWards(deed.wards); }
        if (deed.solved.length) {
          const wd = WARDS.find((w) => w.id === deed.solved[0]);
          setWardSolvedNow(wd);
          if (unlocked === wd.atDepth && unlocked < 8) { const nd = unlocked + 1; setUnlocked(nd); saveUnlocked(nd); }
          const rd = rollRelicChoices(relics, 1)[0]; if (rd) { const nr = [...relics, rd.id]; setRelics(nr); saveRelics(nr); } // the key, made manifest
        }
        // THE HOLDFAST reclaims a stage the first time you beat a ring's boss (works in
        // beta too — pushing deeper heals more of the home + drips the next story beat).
        if (hunted.depth > reclaimed) {
          setReclaimed(hunted.depth); saveReclaimed(hunted.depth);
          setHoldfastNow(stageAtDepth(hunted.depth));
          setPendingHoldfastPick(hunted.depth);
        } else { setHoldfastNow(null); setPendingHoldfastPick(0); }
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
        // THE DROP — clearing the final ring reaches the Drop. The first time it's the ending;
        // after that (in NG+) every ring-8 clear returns you to the door, with this crossing's
        // beat + the choice to STEP THROUGH into a harder crossing. Ceremony instead of won-screen.
        if (hunted.depth === HOLDFAST_MAX) {
          sfx.theDrop(); setRunPhase('drop'); return;
        }
        // RELIC DROP — every ring boss offers a CHOICE of relics (the loot chase). You
        // pick one on the won screen; a weighted draw of distinct unowned relics. Once the
        // collection is full, there's nothing left to offer, so it pays slag instead.
        const choices = rollRelicChoices(relics, 3);
        if (choices.length) { setRelicChoices(choices); setRelicDrop(null); }
        else { onSlag?.(35); setRelicChoices([]); setRelicDrop(null); }
        sfx.ringTaken();
        setWonStep(0); setResultDetails(false); setRunPhase('won'); return;
      }
      const aliveTypes = new Set(patched.filter((m) => m.hp > 0).map((m) => COMBAT_CREATURES[m.id].type));
      sfx.waveClear();
      setWaveIdx(idx + 1); rollOffer(aliveTypes, patched);
      // Wayside event — between non-boss waves the trail sometimes offers a choice.
      // (Offer is already rolled, so the event sits in front of the upgrade screen.)
      const nextIsBoss = (idx + 1) === WAVE_COUNT - 1;
      const ev = nextIsBoss ? null : maybeWaysideEvent();
      if (ev && ev.kind === 'elite') { setPendingElite(ev); setEventOutcome(null); sfx.eliteGrowl(); setRunPhase('event'); }
      else if (ev) { setPendingEvent(ev); setEventOutcome(null); setEventStep(null); (ev.kind === 'merchant' ? sfx.merchantBell() : ev.kind === 'treasure' ? sfx.treasureChime() : sfx.upgradePick()); setRunPhase('event'); }
      else setRunPhase('upgrade');
    }, (st) => applyRingLaw(st, runGroundRef.current, { repeatIds: repeatIdsRef.current })); // the ring's LAW seeds the fresh battle (vF-CC)
    setWaveIdx(idx);
    setRunPhase('fighting');
  }

  function startRun() {
    sfx.resume(); // unlock AudioContext on first user gesture (browser autoplay policy)
    const g = accessibleGround(ground, accessDepth); // run the chosen ring, clamped to what's unlocked
    setRunWaves(wavesForGround(g, crossMult(crossing))); setRunDepth(g.depth);
    setEnteredRing(g); sfx.ringThreshold(g.depth); // crossing the threshold — a beat + a deepening swell
    runGroundRef.current = g; // the run's ring, for ring-law application at each battle start
    // RING LAW bookkeeping (vF-CC): "The Cold Remembers" needs to know who you brought LAST
    // run — read the previous squad, then record this one for next time.
    try {
      const lastSq = JSON.parse(localStorage.getItem(LAST_SQUAD_KEY) || '[]') || [];
      repeatIdsRef.current = new Set(picked.filter((id) => lastSq.includes(id)));
      localStorage.setItem(LAST_SQUAD_KEY, JSON.stringify(picked));
    } catch { repeatIdsRef.current = new Set(); }
    farmedRef.current = g.depth <= reclaimed; // a re-clear of an already-beaten ring → auto-pick eligible
    featsAtRunStartRef.current = doneFeatIds(); // remember what's already earned, to celebrate new ones
    setRunRepeat(repeatMult(clears[g.id] || 0)); // diminishing cores for re-farming a cleared ring
    const base = perkBaseMods(owned, reclaimed, relicKit, relicCut, temperingTier, holdfastPicks); // perks + Holdfast boons + equipped relics set the run's opening mods
    ringLawMods(g, base); // the ring's LAW bends the run (e.g. Witherfen: healing halved)
    const sq = picked.map((id) => ({ id, hp: maxHpOf({ id }, base), unitMods: { ...EMPTY_UNIT_MODS }, bends: [] }));
    setSquad(sq); setRunMods(base); setTaken([]); setWaveIdx(0); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setCoresRun({});
    eventsSeenRef.current = []; setPendingEvent(null); setEventOutcome(null); setEventStep(null); // fresh wayside-event pool per run
    rollOffer(); setRunPhase('upgrade');
  }
  // ── Apex challenge: a one-off fight against a gathered apex creature. Win → recruit. ──
  function startChallenge(apexId) {
    sfx.resume();
    featsAtRunStartRef.current = doneFeatIds();
    const base = perkBaseMods(owned, reclaimed, relicKit, relicCut, temperingTier, holdfastPicks);
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
  // ── THE GAUNTLET (endless) ────────────────────────────────────────────────────────
  // A self-contained survival loop: enter with a squad, fight escalating rounds with
  // HP carrying over, until you fall. Score = rounds cleared; best persists. It reuses
  // the frozen combat engine + foe() builder but NEVER touches the climb's win-handler,
  // its rewards, wards, or unlocks — so the normal run is unaffected.
  function endlessWave(round) {
    const spec = endlessWaveSpec(round);
    const g = HUNTING_GROUNDS[(round - 1) % HUNTING_GROUNDS.length]; // cycle identities for variety
    const pool = g.biasIds, at = (i) => pool[i % pool.length];
    const enemies = () => spec.roles.map((r, i) =>
      foe(at(i), r.temper, r.hp, r.atk, spec.identityDepth, r.anchor ? { name: g.boss, speed: 7 } : {}, spec.cm));
    return {
      name: spec.warden ? g.boss : `${g.name} press`, boss: spec.warden, seed: spec.seed, round,
      blurb: spec.warden ? 'A warden of the deep bars the way — break it to press on.' : `The blight thickens — round ${round}.`,
      enemies,
    };
  }
  function startEndlessRound(round, sq, mods) {
    const wave = endlessWave(round);
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i], mods, treeModsFor(sq[i].id, treeEquip, treeRanks)));
    setEndlessRound(round); setRunWaves([wave]); setWaveIdx(0);
    fight.begin(aDefs, wave.enemies(), wave.seed, runAuto ? 'auto' : 'play', (res, finalState) => {
      const next = sq.map((m) => ({ ...m }));
      fielded.forEach((mi, i) => { next[mi].hp = finalState.units.A[i].hp; });
      const youLive = next.some((m) => m.hp > 0) && finalState.units.A.some((u) => u.hp > 0);
      const won = youLive && res.winner !== 'B';
      let fightDmg = 0, fightBig = 0;
      finalState.log.forEach((e) => { if (e.type === 'turn' && e.actor.side === 'A') (e.hits || []).forEach((h) => { fightDmg += h.dmg || 0; if ((h.dmg || 0) > fightBig) fightBig = h.dmg; }); });
      setStats((s) => ({ dmg: s.dmg + fightDmg, biggest: Math.max(s.biggest, fightBig), waves: s.waves + (won ? 1 : 0) }));
      if (!won) {
        const reached = endlessReached(round); // you fell ON this round → cleared round-1
        const isRecord = reached > endlessBest;
        if (isRecord) { setEndlessBest(reached); saveEndlessBest(reached); }
        setSquad(next); sfx.squadDown();
        setEndlessResult({ reached, best: Math.max(reached, endlessBest), isRecord });
        setRunPhase('endless-over');
        return;
      }
      const got = endlessRoundSlag(round); onSlag?.(got); setEarned((e) => e + got); // bank a little each round
      const patched = next.map((m) => m.hp > 0 ? { ...m, hp: Math.min(maxHpOf(m, mods), m.hp + Math.round(maxHpOf(m, mods) * patchupFor(mods))) } : m);
      setSquad(patched); sfx.waveClear();
      startEndlessRound(round + 1, patched, mods); // press on — round/sq/mods passed so no stale closure
    });
    setRunPhase('fighting');
  }
  function startEndless() {
    if (picked.length < 2) return;
    sfx.resume();
    const base = perkBaseMods(owned, reclaimed, relicKit, relicCut, temperingTier, holdfastPicks); // same opening mods a climb would use
    const sq = picked.map((id) => ({ id, hp: maxHpOf({ id }, base), unitMods: { ...EMPTY_UNIT_MODS }, bends: [] }));
    setEndless(true); setEndlessResult(null);
    featsAtRunStartRef.current = doneFeatIds();
    setSquad(sq); setRunMods(base); setTaken([]); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setRunDepth(3);
    sfx.ringThreshold(3);
    startEndlessRound(1, sq, base);
  }
  function exitEndless() { setEndless(false); setEndlessResult(null); setRunPhase('pick'); }
  // ── FEATS — a snapshot of progress + which were freshly earned this run. ──
  function featSnapshot() {
    return {
      deepestRing: unlocked,
      reclaimed,
      caught: stable.length,
      rosterSize: COMBAT_ROSTER.length,
      gauntletBest: endlessBest,
      wardsSolved: Object.values(wards).filter((w) => w && w.solved).length,
      relicsOwned: relics.length,
      keystonesOwned: KEYSTONE_IDS.filter((id) => relics.includes(id)).length,
      crossings: crossing,
      typesMastered: typesMastered.length,
      recipesCooked: recipesCooked.length,
      recipesTotal: RECIPES.length,
    };
  }
  const doneFeatIds = () => new Set(evalFeats(featSnapshot()).filter((f) => f.done).map((f) => f.id));
  // Feats that became done DURING this run (compared to the snapshot taken at run start).
  // Used to celebrate milestones on the result screens — pure read, no side effects.
  const newlyEarnedFeats = () => evalFeats(featSnapshot()).filter((f) => f.done && !featsAtRunStartRef.current.has(f.id));
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
      return { ...mem, unitMods, bends: [...(mem.bends ?? []), { id: up.id, icon: up.icon, name: up.name, color: up.color }] };
    });
    const targetName = COMBAT_CREATURES[memberId].name;
    setSquad(sq);
    setTaken((t) => [...t, { ...up, targetName }]);
    setPendingUpgrade(null);
    startWave(waveIdx, sq, runMods);
  }
  // SUMMON: spend slag to pull `times` grunlings from the wild roster (shared pity). New →
  // caught + Core head-start; dupe → that creature's Cores. A five-fold call guarantees a
  // Rare+. Collection breadth only — no run-power, so it never shortcuts the Wards.
  // SALVAGE: melt an owned relic into shards (by rarity). Removes it from the collection +
  // kit. The shard source that feeds Keystone crafting — a real "give up gear → forge gear".
  function salvageRelic(id) {
    const r = RELIC_BY_ID[id]; if (!r || !relics.includes(id)) return;
    const yld = shardYield(r.rarity);
    const nr = relics.filter((x) => x !== id); setRelics(nr); saveRelics(nr);
    if (relicKit.includes(id)) { const nk = relicKit.filter((x) => x !== id); setRelicKit(nk); saveRelicKit(nk); }
    const ns = shards + yld; setShards(ns); saveShards(ns);
    sfx.upgradePick();
  }
  // CRAFT: gamble shards + slag at a chosen heat for a Keystone (the % is real — see
  // src/data/keystones.js, proven in scripts/keystones.mjs). Fail → half the shards back.
  function craftKeystone(tier) {
    if (shards < tier.shards || (slag || 0) < tier.slag) return;
    let ns = shards - tier.shards; onSlag?.(-tier.slag); sfx.resume();
    const owned = relics.filter((id) => KEYSTONE_IDS.includes(id));
    const res = resolveCraft(tier, owned, KEYSTONE_IDS, Math.random);
    ns += res.refund || 0;
    if (res.success && res.granted) {
      const nr = [...relics, res.granted]; setRelics(nr); saveRelics(nr);
      setTimeout(() => sfx.caughtCreature(), 150);
    }
    setShards(ns); saveShards(ns);
    setCraftResult({ ...res, tier: tier.id });
  }
  function doSummon(times, ban = SUMMON_BANNERS[0]) {
    const base = times >= 10 ? SUMMON10_COST : times >= 5 ? SUMMON5_COST : SUMMON_COST;
    const cost = Math.round(base * (ban.costMult || 1));
    if ((slag || 0) < cost) return;
    onSlag?.(-cost); sfx.resume();
    // The Near Call biases toward the ring you're camped at (its reachable, non-apex locals).
    const campRing = accessibleGround(ground, accessDepth);
    const biasIds = ban.biasMult ? campRing.biasIds.filter((id) => !isApex(id)) : null;
    let curStable = [...stable]; let curPity = pity; const results = [];
    // Bank a creature into the result + stable/cores. Returns the result row.
    const take = (p) => {
      const info = RARITY_INFO[p.rarity]; let gainedCores;
      if (p.isDupe) { gainedCores = info.dupeCores; awardCores([p.id], info.dupeCores); }
      else { curStable = [...curStable, p.id]; gainedCores = info.startCores; if (info.startCores > 0) awardCores([p.id], info.startCores); }
      curPity = p.rarity === 'Legendary' ? 0 : curPity + 1;
      return { ...p, gainedCores };
    };
    for (let k = 0; k < times; k++) {
      const p = summonPull(curStable, curPity, Math.random, ban.legBoost || 1, biasIds, ban.biasMult || 1); if (!p) break;
      results.push(take(p));
    }
    // GUARANTEES: a ten-fold call lands at least a Legendary; a five-fold at least a Rare+.
    const upgradeTo = (rarity) => {
      const pool = COMBAT_ROSTER.map((c) => c.id).filter((id) => !isApex(id) && rarityOf(id) === rarity);
      if (!pool.length || !results.length) return;
      const rid = pool[Math.floor(Math.random() * pool.length)];
      results[results.length - 1] = take({ id: rid, rarity, isDupe: curStable.includes(rid) });
    };
    if (times >= 10 && !results.some((r) => RARITY_INFO[r.rarity].mult >= RARITY_INFO.Legendary.mult)) upgradeTo('Legendary');
    else if (times >= 5 && results.every((r) => r.rarity === 'Common')) upgradeTo('Rare');
    setStable(curStable); saveStable(curStable);
    setPity(curPity); savePity(curPity);
    setSummonResults(results);
    const bestMult = results.reduce((m, r) => Math.max(m, RARITY_INFO[r.rarity].mult), 0);
    if (bestMult >= RARITY_INFO.Legendary.mult) setTimeout(() => sfx.caughtCreature(), 200); else sfx.upgradePick();
  }
  function newRun() { fight.reset(); setRunPhase('pick'); setEndless(false); setEndlessResult(null); setEndlessRound(0); setPicked(savedSquadIn(stable)); setSquad([]); setWaveIdx(0); setRunMods({ ...EMPTY_MODS }); setTaken([]); setOffer([]); setStats({ dmg: 0, biggest: 0, waves: 0 }); setEarned(0); setPullNow(null); setCaughtFrom(null); setSigilGain(null); setUnlockedNow(null); setWardBlock(null); setWardSolvedNow(null); setHoldfastNow(null); setEnteredRing(null); setPendingEvent(null); setPendingElite(null); setEventOutcome(null); setEventStep(null); setRelicChoices([]); setRelicDrop(null); setChallenge(null); setPendingUpgrade(null); setTargetChoice(null); setUpgradeChoice(null); setTreeFor(null); setSheetFor(null); setCoresRun({}); setStoneNow(null); }

  // ── Character sheet overlay (U5) — the full read on one creature; routes to PATHS. ──
  if (sheetFor) {
    return (
      <CharacterSheet
        id={sheetFor}
        swornNodeId={swornOathNode(sheetFor, treeEquip)}
        coresBal={cores[sheetFor] || 0}
        hasTree={!!treeForCreature(sheetFor)}
        narrow={narrow}
        onClose={() => setSheetFor(null)}
        onOpenTree={(id) => { setSheetFor(null); setTreeFor(id); }}
      />
    );
  }

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
    // ★ oath state: which keystone (if any) this creature has sworn; 2+ = legacy save → migrate.
    const ownedKeystones = owned.map((id) => NODE_BY_ID[id]).filter((n) => n?.keystone);
    const swornKeystone = ownedKeystones[0] || null;

    if (!tree) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: T.body, color: DIM, marginBottom: 16 }}>{ti.glyph} {c.name}'s paths are still being charted.</div>
          <button onClick={() => setTreeFor(null)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, cursor: 'pointer' }}>← BACK</button>
        </div>
      );
    }
    // ── Legacy migration: 2+ keystones owned → pick the one oath before the tree opens. ──
    if (ownedKeystones.length > 1) {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} size={48} />
            <div style={{ fontSize: T.head, fontWeight: 900, color: ti.accent }}>{ti.glyph} {c.name}</div>
          </div>
          <div style={{ background: '#16130a', border: '1.5px solid #ffd166', borderRadius: 14, padding: '14px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: T.body, fontWeight: 900, color: '#ffd166', marginBottom: 4 }}>★ A CORE SWEARS ONE OATH</div>
            <div style={{ fontSize: T.small, color: '#d8cba0', lineHeight: 1.5, marginBottom: 12 }}>
              The deep paths have settled: a creature carries <b>one</b> keystone now. {c.name} holds {ownedKeystones.length} — choose which to keep. The rest refund in full.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {ownedKeystones.map((ks) => (
                <button key={ks.id} onClick={() => resolveKeystoneOath(treeFor, ks.id)}
                  style={{ textAlign: 'left', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: '#0c0c14', border: '1.5px solid #ffd16688' }}>
                  <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffd166' }}>★ KEEP {ks.name.toUpperCase()}</div>
                  <div style={{ fontSize: T.micro, color: '#9a9aaa', marginTop: 2, lineHeight: 1.35 }}>{ks.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setTreeFor(null)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, fontSize: T.small, cursor: 'pointer' }}>← decide later</button>
        </div>
      );
    }
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button onClick={() => { setTreeFor(null); setKeystoneSwap(null); }} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${LINE}`, background: PANEL, color: '#ddd', fontWeight: 800, fontSize: T.small, cursor: 'pointer' }}>←</button>
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
        {/* INNATE — the born-in trait this creature carries into every build (not bought, can't
            be swapped). Shown above the tree because it's the foundation the loadout builds on. */}
        {innateFor(treeFor) && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, background: '#0c1a16', border: '1px solid #2a5a4a', borderRadius: 10, padding: '7px 12px', marginBottom: 8 }}>
            <span style={{ fontSize: T.small, fontWeight: 900, color: '#7ee0c0', flexShrink: 0 }}>✦ {innateFor(treeFor).name}</span>
            <span style={{ fontSize: T.micro, color: '#a8c4bc', fontWeight: 600, lineHeight: 1.35 }}>{innateFor(treeFor).line} <i style={{ color: DIM }}>· born-in, always on</i></span>
          </div>
        )}
        {/* Build identity — derived live from the equipped loadout (honest; can't lie) */}
        {(() => {
          const arch = deriveArchetype(c.type, equipped);
          return (
            <div style={{ textAlign: 'center', background: arch ? `${arch.color || ti.accent}14` : '#10141c', border: `1px solid ${arch ? (arch.color || ti.accent) : LINE}`, borderRadius: 10, padding: '7px 12px', marginBottom: 10 }}>
              {arch ? (
                <>
                  <div style={{ fontSize: T.sub, fontWeight: 900, color: arch.color || ti.accent, letterSpacing: 0.5 }}>{arch.icon} {arch.name} {c.name.toUpperCase()}</div>
                  <div style={{ fontSize: T.micro, color: '#aeb6c4', fontStyle: 'italic', marginTop: 1 }}>{arch.tag}</div>
                </>
              ) : (
                <div style={{ fontSize: T.small, color: DIM, fontWeight: 700 }}>No build yet — equip path nodes to forge an identity.</div>
              )}
            </div>
          );
        })()}
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
          {tree.blurb} <span style={{ color: DIM }}>Unlocking is forever; you run <b style={{ color: '#9be7ff' }}>{slotMax}</b> at once (more slots as you unlock more). Tap an unlocked path to equip or bench it. <b style={{ color: '#9be7ff' }}>Refinement</b> nodes can be bought again and again. A creature swears <b style={{ color: '#ffd166' }}>one ★ Oath</b> — swapping refunds the old one ({RESPEC_FEE} ⬡ fee).</span>
        </div>
        {/* ★ SWAP confirm — trading the sworn keystone for another. */}
        {keystoneSwap && keystoneSwap.creatureId === treeFor && (() => {
          const { from, to } = keystoneSwap;
          const delta = to.cost + RESPEC_FEE - from.cost;
          const can = bal >= delta;
          return (
            <div style={{ background: '#16130a', border: '1.5px solid #ffd166', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffd166', marginBottom: 3 }}>↔ TRADE THE OATH?</div>
              <div style={{ fontSize: T.micro, color: '#d8cba0', lineHeight: 1.5, marginBottom: 10 }}>
                Let <b>★ {from.name}</b> go ({from.cost} ⬡ back) and swear <b>★ {to.name}</b> ({to.cost} ⬡ + {RESPEC_FEE} ⬡ fee) — <b style={{ color: can ? '#9be7ff' : LOSS }}>{delta} ⬡ all told</b>.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => can && swapKeystone(keystoneSwap)} disabled={!can}
                  style={{ flex: 1, borderRadius: 9, padding: '8px 0', cursor: can ? 'pointer' : 'default', background: can ? '#ffd16622' : PANEL, border: `1.5px solid ${can ? '#ffd166' : LINE}`, color: can ? '#ffd166' : '#6a6a7a', fontSize: T.small, fontWeight: 900 }}>
                  {can ? `↔ SWAP · ${delta} ⬡` : `need ${delta} ⬡`}
                </button>
                <button onClick={() => setKeystoneSwap(null)}
                  style={{ width: 90, borderRadius: 9, padding: '8px 0', cursor: 'pointer', background: PANEL, border: `1px solid ${LINE}`, color: '#9a9aaa', fontSize: T.small, fontWeight: 800 }}>keep it</button>
              </div>
            </div>
          );
        })()}
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
                    // Another ★ already sworn → this keystone is a SWAP (old refunds, fee applies).
                    const ksSwap = node.keystone && !ownedNode && swornKeystone && swornKeystone.id !== node.id ? swornKeystone : null;
                    const buyCost = ksSwap ? node.cost + RESPEC_FEE - ksSwap.cost : node.cost;
                    const afford = bal >= buyCost;
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
                      : node.sealed ? '🚧 SOON' : ksSwap ? `↔ swap ★ · ${buyCost} ⬡` : `${node.cost} ⬡`;
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

  // ── THE CHRONICLE (vF-AZ) — a lore codex that fills in as you climb. Every story fragment
  // in the game — the opening, each ring, the Holdfast, the Drop, the grunlings — gathered in
  // one re-readable place. Entries unlock as you reach them, so it's a record of YOUR climb. ──
  if (showCodex) {
    const cEntry = (key, title, text, unlocked) => (
      <div key={key} style={{ borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: unlocked ? '#0e0b16' : '#0a0a0e', border: `1px solid ${unlocked ? '#2a2438' : LINE}`, opacity: unlocked ? 1 : 0.5 }}>
        <div style={{ fontSize: T.small, fontWeight: 900, color: unlocked ? '#d8cfe6' : '#54506a' }}>{unlocked ? title : '? ? ?'}</div>
        <div style={{ fontSize: T.micro, color: unlocked ? '#b0a8c4' : '#454056', lineHeight: 1.6, fontStyle: 'italic', marginTop: 4 }}>{unlocked ? text : 'Not yet reached on the climb.'}</div>
      </div>
    );
    const cHead = (txt) => <div style={{ fontSize: T.small, fontWeight: 900, color: '#cba6ff', letterSpacing: 1.5, margin: '18px 0 8px' }}>{txt}</div>;
    const dropText = 'You walk the last ring to its end, and the Drop opens — not a pit but a doorway, light spilling up out of the dark. Your mentor stood exactly here. Went in. You understand it now: he was never lost. He was the first one through. Three cores hum at your chest. Seventy-five years of blight — and the answer to all of it is one step away. You take it.';
    // count discovered
    let found = OPENING_SCENES.length; let total = OPENING_SCENES.length;
    HUNTING_GROUNDS.forEach((g) => { total += 2; if (g.depth <= unlocked) found++; if (g.depth <= reclaimed) found++; });
    HOLDFAST_STAGES.forEach((s) => { total++; if (s.depth <= reclaimed) found++; });
    total++; if (reclaimed >= HOLDFAST_MAX) found++; // the Drop
    COMBAT_ROSTER.forEach((c) => { total++; if (stable.includes(c.id)) found++; });
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: '#cba6ff', letterSpacing: 0.5 }}>❖ THE CHRONICLE</div>
          <button onClick={() => setShowCodex(false)} style={{ fontSize: T.small, fontWeight: 800, color: DIM, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 13px', cursor: 'pointer' }}>← back</button>
        </div>
        <div style={{ fontSize: T.small, color: DIM, marginBottom: 6 }}>The story so far — <b style={{ color: '#cba6ff' }}>{found}</b> of <b style={{ color: '#cba6ff' }}>{total}</b> remembered. It fills as you climb.</div>
        <div style={{ background: '#0a0c12', border: `1px solid ${LINE}`, borderRadius: 14, padding: '10px 0 4px', margin: '8px 0 4px' }}>
          <WorldMap unlocked={unlocked} stones={stones} size={narrow ? 300 : 360} />
          <div style={{ textAlign: 'center', fontSize: T.micro, color: '#6f86a8', padding: '4px 0 8px' }}>Eight rings. One direction. {stones.length > 0 ? `🪨 ${stones.length}/8 stones read.` : 'The old folk left stones — clear a ring to find its words.'}</div>
        </div>
        {cHead('THE CARVED STONES — the deep past')}
        {HUNTING_GROUNDS.map((g) => DEEP_INSCRIPTIONS[g.id] &&
          cEntry('st' + g.id, DEEP_INSCRIPTIONS[g.id].title + ' · ' + g.name, DEEP_INSCRIPTIONS[g.id].text, stones.includes(g.id))
        )}
        {cHead('THE OPENING')}
        {OPENING_SCENES.map((s, i) => cEntry('op' + i, s.title, s.text, true))}
        {cHead('THE RINGS')}
        {HUNTING_GROUNDS.map((g) => [
          cEntry('ri' + g.id, `${g.name} — you cross in`, RING_INTRO[g.id], g.depth <= unlocked),
          RING_CLEAR[g.id] && cEntry('rc' + g.id, `${RING_CLEAR[g.id].boss} falls`, RING_CLEAR[g.id].beat, g.depth <= reclaimed),
        ])}
        {cHead('THE HOLDFAST')}
        {HOLDFAST_STAGES.map((s) => cEntry('hf' + s.depth, s.part, s.beat, s.depth <= reclaimed))}
        {cHead('THE DROP')}
        {cEntry('drop', 'The First Climb', dropText, reclaimed >= HOLDFAST_MAX)}
        {(crossing > 0 || reclaimed >= HOLDFAST_MAX) && cHead('THE CROSSINGS')}
        {(crossing > 0 || reclaimed >= HOLDFAST_MAX) && CROSSING_BEATS.map((b, i) =>
          cEntry('cx' + i, b.title, b.lines.join(' ') + ' ' + b.take, crossing > i || (i === 0 && reclaimed >= HOLDFAST_MAX))
        )}
        {cHead('THE GRUNLINGS')}
        {COMBAT_ROSTER.map((c) => cEntry('cr' + c.id, c.name, CREATURE_LORE[c.id] ? `${CREATURE_LORE[c.id].rumor} (Said to roam ${CREATURE_LORE[c.id].where}.)` : '', stable.includes(c.id)))}
      </div>
    );
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
                        {have ? <RelicIcon r={r} size={T.body} /> : <span style={{ fontSize: T.body, filter: 'grayscale(1) brightness(0.5)' }}>✦</span>}
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
        {/* ── SETS reference — what synergies exist to chase ── */}
        <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffd166', letterSpacing: 1, marginBottom: 7 }}>⚜ SETS <span style={{ color: DIM, fontWeight: 700, letterSpacing: 0 }}>· equip {RELIC_SETS[0].need}+ from a set to activate its bonus</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 8 }}>
            {RELIC_SETS.map((s) => (
              <div key={s.id} style={{ borderRadius: 10, padding: '9px 11px', background: '#161204', border: '1px solid #4a3f1c' }}>
                <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffe08a', marginBottom: 1 }}>{s.icon} {s.name}</div>
                <div style={{ fontSize: T.micro, color: '#c9b87a', marginBottom: 5 }}>{s.desc}</div>
                <div style={{ fontSize: T.micro, color: DIM, lineHeight: 1.5 }}>
                  {s.members.map((id, k) => {
                    const r = RELIC_BY_ID[id]; const have = relics.includes(id);
                    return <span key={id} style={{ color: have ? (RELIC_BY_ID[id].color) : '#54506a' }}>{r ? r.name : id}{k < s.members.length - 1 ? ' · ' : ''}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── FEAT CELEBRATION — milestones crossed THIS run, shown on the result screens. ──
  const RESULT_PHASES = ['won', 'lost', 'drop', 'endless-over', 'challenge-won', 'challenge-lost'];
  const earnedFeats = RESULT_PHASES.includes(runPhase) ? newlyEarnedFeats() : [];
  const featCelebration = earnedFeats.length > 0 ? (
    <div style={{ margin: '0 0 14px', padding: '12px 14px', borderRadius: 12, background: 'linear-gradient(180deg,#1c1708,#120e06)', border: '1.5px solid #e8c14a', boxShadow: '0 0 16px #e8c14a33', animation: 'seam-threshold 0.7s ease-out' }}>
      <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#e8c14a', marginBottom: earnedFeats.length ? 7 : 0, textAlign: 'center' }}>★ FEAT{earnedFeats.length > 1 ? 'S' : ''} EARNED</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {earnedFeats.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0e0a04', border: `1px solid ${TIER_COLOR[f.tier]}66`, borderRadius: 9, padding: '7px 11px' }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: T.small, fontWeight: 900, color: TIER_COLOR[f.tier] }}>{f.name} <span style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>· {f.tier}</span></div>
              <div style={{ fontSize: T.micro, color: '#b8a87a' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // ── Squad picker ──
  if (runPhase === 'pick') {
    const HOME_TABS = [
      ['raid', '⚔', 'Raid'],
      ['summon', '✨', 'Summon'],
      ['forge', '⚒', 'Forge'],
      ['relics', '✦', 'Relics'],
      ['holdfast', '🏚', '🏚 Home'],
    ];
    const tabTitle = { raid: 'Take the Approach', summon: 'Summon', forge: 'The Cracked Forge', relics: 'Relics', holdfast: 'The Holdfast' }[homeTab];
    return (
      <div style={{ paddingBottom: 84 }}>
        {/* ── Top utility bar: page title + NG+ pill + ⚙ settings ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: T.sub, fontWeight: 900, color: '#eaf2ff', letterSpacing: 0.5 }}>{tabTitle}</span>
          {crossing > 0 && (
            <span title={`The Deep Crossing — every ring +${Math.round((crossMult(crossing) - 1) * 100)}% stronger`}
              style={{ fontSize: T.micro, fontWeight: 900, color: '#cba6ff', background: '#1a0f2a', border: '1px solid #6a4a9a', borderRadius: 999, padding: '3px 9px' }}>
              ✦ Crossing {roman(crossing)}
            </span>
          )}
          <button onClick={() => setShowSettings(true)} title="Settings — music, auto-pick, dev tools"
            style={{ marginLeft: 'auto', fontSize: T.body, lineHeight: 1, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: PANEL, color: '#cfcfda' }}>
            ⚙
          </button>
        </div>

        {/* ═══════════════ RAID — the play loop ═══════════════ */}
        {homeTab === 'raid' && (
          <>
            {/* Compact Holdfast progress strip → taps through to the full Holdfast page. */}
            {(() => {
              const ringsToDrop = HOLDFAST_MAX - reclaimed;
              return (
                <button onClick={() => setHomeTab('holdfast')}
                  style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(180deg,#160f1d,#0e0a14)', border: '1px solid #4a3a66', borderRadius: 10, padding: '8px 12px', marginBottom: 14, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13 }}>🏚</span>
                    {HOLDFAST_STAGES.map((s) => {
                      const done = s.depth <= reclaimed;
                      const frontier = s.depth === reclaimed + 1;
                      return (
                        <div key={s.depth} style={{ flex: 1, height: 7, borderRadius: 3,
                          background: done ? '#b06bff' : frontier ? '#3a2a52' : '#1c1726',
                          border: frontier ? '1px solid #7a5aa0' : '1px solid transparent',
                          boxShadow: done ? '0 0 6px #b06bff88' : 'none' }} />
                      );
                    })}
                    <span style={{ fontSize: 13 }}>✦</span>
                  </div>
                  <div style={{ fontSize: T.micro, color: '#9a7fc0', fontWeight: 700, marginTop: 5 }}>
                    {ringsToDrop > 0
                      ? <>The Drop lies <b style={{ color: '#eadcff' }}>{ringsToDrop} ring{ringsToDrop !== 1 ? 's' : ''}</b> inward · tap for the Holdfast →</>
                      : <span style={{ color: '#eadcff' }}>The door is open — and waiting. Tap for the Holdfast →</span>}
                  </div>
                </button>
              );
            })()}
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
                        background: on ? `linear-gradient(180deg, ${SEL}1c, #11141c)` : PANEL, border: `1px solid ${on ? SEL : LINE}`, opacity: full ? 0.4 : 1, boxShadow: on ? `0 0 18px ${SEL}55, inset 0 0 18px ${SEL}14` : 'none', transition: 'box-shadow .15s, border-color .15s' }}>
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
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: ti.accent, lineHeight: 1.3, marginTop: 4, letterSpacing: 0.3 }}>⮑ plays the {BUILD_LINE[c.type] || ti.nick} build</div>
                      {/* INNATE — the per-creature differentiator (born-in, not bought). This is the
                          line that makes THIS creature ≠ the others of its Type at a glance. */}
                      {innateFor(c.id) && (
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: '#7ee0c0', lineHeight: 1.3, marginTop: 3, letterSpacing: 0.2 }}>
                          ✦ {innateFor(c.id).name} <span style={{ color: '#8fa0a0', fontWeight: 600 }}>— {innateFor(c.id).line}</span>
                        </div>
                      )}
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSheetFor(c.id)}
                        style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', background: '#0c0c14', border: `1px solid ${LINE}` }}>
                        <span style={{ fontSize: T.small, fontWeight: 900, color: '#cfd6e2' }}>ⓘ SHEET</span>
                      </button>
                      <button onClick={() => setTreeFor(c.id)} disabled={!hasTree}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 9, cursor: hasTree ? 'pointer' : 'default',
                          background: cBal > 0 ? '#101a22' : '#0c0c14', border: `1px solid ${cBal > 0 ? '#2a4a5a' : LINE}`, opacity: hasTree ? 1 : 0.4 }}>
                        <span style={{ fontSize: T.small, fontWeight: 900, color: hasTree ? '#9be7ff' : DIM }}>🌳 PATHS</span>
                        {hasTree && <span style={{ fontSize: T.micro, fontWeight: 800, color: cBal > 0 ? '#9be7ff' : DIM }}>{cBal} ⬡{cBal > 0 ? ' to spend' : ''}</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ── TEAM RECIPES (R1) — name the squad you're building. Lit when your picks cook
                a recipe; an actionable near-miss when one bench creature would finish it. The
                synergy is REAL before any seasoning — the chip just names what the kits do. ── */}
            {picked.length >= 2 && (() => {
              const equip = treeEquip;
              const pickedMembers = picked.map((id) => recipeMember(id, equip));
              const { lit, near } = detectRecipes(pickedMembers);
              // Turn near-misses into "you have the piece" prompts: only show a near-miss when a
              // creature you OWN (but haven't picked) would complete it, and you have a slot free.
              const benchIds = stable.filter((id) => !picked.includes(id));
              const actionable = picked.length < 3
                ? near.map((n) => {
                    const fit = benchIds.map((id) => recipeMember(id, equip)).find((m) => memberFits(m, n.missing));
                    return fit ? { recipe: n.recipe, addId: fit.id } : null;
                  }).filter(Boolean).slice(0, 2)
                : [];
              if (!lit.length && !actionable.length) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {lit.map((r) => (
                    <div key={r.id} title={r.how} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 10,
                      background: 'linear-gradient(180deg,#1c1810,#13110a)', border: '1px solid #6a5a2a', boxShadow: '0 0 14px #6a5a2a33' }}>
                      <span style={{ fontSize: 17, lineHeight: 1 }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffd166', letterSpacing: 0.3 }}>🍳 {r.name}{r.tier === 'sworn' && <span style={{ fontSize: 9, color: '#cdb6ff', fontWeight: 800, marginLeft: 6 }}>★ sworn</span>}</div>
                        <div style={{ fontSize: T.micro, color: '#c9b98a', fontStyle: 'italic', marginTop: 1 }}>{r.line}</div>
                      </div>
                    </div>
                  ))}
                  {actionable.map(({ recipe, addId }) => (
                    <div key={recipe.id} title={recipe.how} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 10,
                      background: '#101019', border: `1px dashed ${LINE}` }}>
                      <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.5 }}>{recipe.icon}</span>
                      <div style={{ fontSize: T.micro, color: '#9a9aac', lineHeight: 1.4 }}>
                        one short of <b style={{ color: '#cbb98a' }}>{recipe.name}</b> — add <button onClick={() => toggle(addId)} style={{ display: 'inline', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#9be7ff', fontWeight: 800, fontSize: T.micro, textDecoration: 'underline' }}>{COMBAT_CREATURES[addId].name}</button> to finish it.
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* ── THE GAUNTLET — endless survival end-game; enter with the picked squad. ── */}
            {(() => {
              const gauntletReady = picked.length >= 2 && reclaimed >= 1;
              const gauntletLocked = reclaimed < 1;
              return (
            <button onClick={gauntletReady ? startEndless : undefined} disabled={!gauntletReady}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, marginBottom: 16, cursor: gauntletReady ? 'pointer' : 'default',
                background: 'linear-gradient(180deg,#1a1020,#100a16)', border: '1px solid #5a3a7a', opacity: gauntletReady ? 1 : 0.5 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>♾️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.small, fontWeight: 900, color: '#cba6ff' }}>THE GAUNTLET <span style={{ color: DIM, fontWeight: 700 }}>· endless</span></div>
                <div style={{ fontSize: T.micro, color: '#9a8fb0', lineHeight: 1.4 }}>{gauntletLocked ? 'Opens after your first ring — clear one ring boss to unlock.' : picked.length >= 2 ? 'Rounds rise until they break you — no upgrades, just your build. How far can you get?' : 'Pick a squad above to enter.'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: T.micro, color: DIM, fontWeight: 700, letterSpacing: 0.5 }}>BEST</div>
                <div style={{ fontSize: T.body, fontWeight: 900, color: endlessBest > 0 ? '#cba6ff' : '#555' }}>{endlessBest > 0 ? `R${endlessBest}` : '—'}</div>
              </div>
            </button>
              ); })()}
            {/* ── Active WARD riddles — the wall ahead + how to solve it (always visible). ── */}
            {WARDS.filter((w) => wards[w.id]?.active && !wards[w.id]?.solved).map((w) => (
              <div key={w.id} style={{ borderRadius: 10, border: `1px solid ${w.tint}66`, background: 'linear-gradient(180deg,#0c1620,#0a0e16)', padding: '11px 13px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{w.glyph}</span>
                  <span style={{ fontSize: T.small, fontWeight: 900, color: w.tint }}>{w.name} <span style={{ color: DIM, fontWeight: 700 }}>· bars the way inward</span></span>
                  <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 900, color: '#9be7ff' }}>{(wards[w.id]?.progress) || 0}/{w.deed.count}</span>
                </div>
                <div style={{ fontSize: T.micro, color: '#bcd0e0', lineHeight: 1.45 }}>{w.deed.told}. <span style={{ color: DIM, fontStyle: 'italic' }}>Solve the riddle and the gate opens.</span></div>
              </div>
            ))}
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
                    const diff = diffOf(sel.depth + crossing); // crossing-aware: rings read harder in NG+
                    const n = clears[sel.id] || 0; const m = repeatMult(n);
                    const ringRars = [...new Set(sel.biasIds.map(rarityOf))].sort((a, b) => RARITY_INFO[b].mult - RARITY_INFO[a].mult);
                    return (
                      <div style={{ background: '#10131c', border: `1px solid ${SEL}33`, borderRadius: 10, padding: '9px 11px', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: T.small, fontWeight: 900, color: '#eaf2ff' }}>{sel.name}</span>
                          <span style={{ fontSize: 10 }}>{ringRars.map((r) => <span key={r} title={r} style={{ color: RARITY_INFO[r].color, fontWeight: 900, marginRight: 1 }}>{RARITY_INFO[r].pips}</span>)}</span>
                          <span style={{ fontSize: T.micro, fontWeight: 800, color: diff.color }}>· {diff.label}</span>
                          <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 700, color: n === 0 ? WIN : '#b58a3a' }}>{n === 0 ? '✦ fresh: full Cores' : `repeat clear ×${n} — Cores ×${m.toFixed(2)}`}</span>
                        </div>
                        <div style={{ fontSize: T.micro, color: '#9be7ff', fontWeight: 700, marginTop: 3 }}>
                          Raiding {sel.tag} — pull weighted by rarity{(() => { const u = sel.biasIds.find((id) => rarityOf(id) === 'Unique'); return u ? <span style={{ color: RARITY_INFO.Unique.color }}> · ✦ {COMBAT_CREATURES[u].name} (challenge)</span> : ''; })()}.
                        </div>
                        {/* RING LAW (vF-CC) — the ring's one rule, read BEFORE you pick a squad. */}
                        <RingLawChip law={ringLawFor(sel)} lawId={sel.id} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>★</span>
                    <div style={{ fontSize: T.small, fontWeight: 900, color: '#9be7ff' }}>APEX QUARRY</div>
                    <span style={{ marginLeft: 'auto', fontSize: T.micro, color: '#666', fontStyle: 'italic' }}>the rarest — won by fight, not luck</span>
                  </div>
                  <div style={{ fontSize: T.micro, color: DIM, marginBottom: 10 }}>Clear their ring for sigils ({APEX_SIGILS}) → challenge it. Beat it, it joins.</div>
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
            {/* When a squad isn't ready yet, the in-flow hint lives here. Once 2+ are
                picked the CTA moves to a sticky bar pinned above the nav (below) so a
                new player never has to scroll past the ring map to find "go". */}
            {picked.length < 2 && (
              <button disabled
                style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: '#222', color: '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: 'default' }}>
                PICK AT LEAST 2
              </button>
            )}
          </>
        )}

        {/* ═══════════════ SUMMON — spend slag to call a wild grunling (gacha) ═══════════════ */}
        {homeTab === 'summon' && (() => {
          const toLeg = Math.max(0, PITY_AT - pity); // pulls until a Legendary is guaranteed
          const rates = [['Common', 60], ['Rare', 30], ['Legendary', 10]];
          return (
            <div>
              {(() => {
                const ban = SUMMON_BANNERS.find((b) => b.id === bannerId) || SUMMON_BANNERS[0];
                const costOf = (n) => Math.round((n >= 10 ? SUMMON10_COST : n >= 5 ? SUMMON5_COST : SUMMON_COST) * ban.costMult);
                return (
                  <>
                    {/* Banner selector — which pool to call from */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {SUMMON_BANNERS.map((b) => { const on = b.id === bannerId; return (
                        <button key={b.id} onClick={() => setBannerId(b.id)}
                          style={{ flex: 1, textAlign: 'center', borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
                            background: on ? 'radial-gradient(120% 100% at 50% 0%, #1a1430, #0c0a14)' : PANEL, border: `1.5px solid ${on ? '#7a5aa0' : LINE}` }}>
                          <div style={{ fontSize: 22, lineHeight: 1 }}>{b.id === 'deep' ? '✦' : b.id === 'near' ? '🧭' : '✨'}</div>
                          <div style={{ fontSize: T.small, fontWeight: 900, color: on ? '#eadcff' : '#9a9aaa', marginTop: 3 }}>{b.name}</div>
                          <div style={{ fontSize: 9, color: on ? '#9a7fc0' : DIM, marginTop: 2, lineHeight: 1.35 }}>{b.blurb}</div>
                        </button>
                      ); })}
                    </div>
                    <div style={{ fontSize: T.micro, color: '#9a7fc0', lineHeight: 1.5, marginBottom: 12, textAlign: 'center', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                      Wake a grunling from a wild core. A <b style={{ color: '#cba6ff' }}>new</b> one joins your stable; a <b style={{ color: '#cba6ff' }}>dupe</b> melts to its Cores. Calls find <b style={{ color: '#cba6ff' }}>creatures</b>, never run-power — your climb is still yours to earn.
                    </div>
                    {/* THE NEAR CALL (vF-CH) — folk-honest bias odds: where you stand, who answers, how often. */}
                    {ban.id === 'near' && (() => {
                      const camp = accessibleGround(ground, accessDepth);
                      const localIds = camp.biasIds.filter((id) => !isApex(id));
                      const pct = Math.round(localPullChance(localIds, ban.biasMult) * 100);
                      const wildPct = Math.round(localPullChance(localIds, 1) * 100);
                      const names = localIds.map((id) => COMBAT_CREATURES[id]?.name).filter(Boolean).join(' & ');
                      return (
                        <div style={{ background: '#0e1414', border: '1px solid #2a4a44', borderRadius: 10, padding: '9px 12px', marginBottom: 12, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                          <div style={{ fontSize: T.micro, fontWeight: 900, color: '#7ee0c0' }}>🧭 Camped at {camp.name}</div>
                          <div style={{ fontSize: T.micro, color: '#9ec0b8', lineHeight: 1.45, marginTop: 3 }}>
                            {names ? <>Its locals — <b style={{ color: '#cdeee4' }}>{names}</b> — answer about <b style={{ color: '#7ee0c0' }}>{pct}%</b> of calls here <span style={{ color: '#6a8a82' }}>(≈{wildPct}% on the Wild Call)</span>. Rarity rates are unchanged; the lean is honest. To pull a deeper ring's locals, camp deeper on the Raid map.</> : 'This ring has no callable locals — every one is already a challenge-won Unique.'}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Slag + pity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: T.small, fontWeight: 900, color: '#c9c98a' }}>⚒ {slag} slag</span>
                      <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: '#ffd166' }}>★ guaranteed within {toLeg} call{toLeg !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Call buttons — ×1 / ×5 / ×10 at the banner's price */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[['Call', 1, 'one pull'], ['Five-fold', 5, 'a ◆ Rare+'], ['Ten-fold', 10, 'a ★ Legendary']].map(([label, n, sub]) => {
                        const cost = costOf(n); const afford = slag >= cost;
                        return (
                          <button key={n} onClick={() => afford && doSummon(n, ban)} disabled={!afford}
                            style={{ textAlign: 'center', borderRadius: 12, padding: '12px 6px', cursor: afford ? 'pointer' : 'default', background: afford ? 'linear-gradient(180deg,#1a1430,#140e22)' : PANEL, border: `1.5px solid ${afford ? '#7a5aa0' : LINE}`, opacity: afford ? 1 : 0.55 }}>
                            <div style={{ fontSize: T.small, fontWeight: 900, color: afford ? '#eadcff' : DIM }}>{n >= 10 ? '✨✨✨' : n >= 5 ? '✨✨' : '✨'} {label}</div>
                            <div style={{ fontSize: T.small, fontWeight: 900, color: afford ? '#c9c98a' : DIM, marginTop: 3 }}>{cost} ⚒</div>
                            <div style={{ fontSize: 9, color: '#9a7fc0', marginTop: 2, lineHeight: 1.3 }}>{n > 1 ? `guarantees ${sub}` : sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              {/* Results */}
              {summonResults && summonResults.length > 0 && (
                <div style={{ background: '#0c0e16', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px', marginBottom: 14 }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1, color: '#9a7fc0', marginBottom: 10 }}>✦ THE CALL ANSWERS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: summonResults.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
                    {summonResults.map((r, i) => {
                      const c = COMBAT_CREATURES[r.id]; const ti = TYPE_INFO[c.type]; const ri = RARITY_INFO[r.rarity];
                      const glowPx = Math.round(12 + (ri.mult - 1) * 42);
                      const big = ri.mult >= 1.45;
                      const fresh = !r.isDupe;
                      const solo = summonResults.length === 1;
                      const inn = innateFor(r.id);
                      return (
                        <div key={i} style={{ position: 'relative', textAlign: 'center', borderRadius: 10, padding: solo ? '12px 10px' : '9px 6px',
                          background: big ? `linear-gradient(180deg, ${ri.color}22, #100b1a)` : '#100b1a',
                          border: `1px solid ${ri.color}`,
                          boxShadow: `0 0 ${glowPx}px ${ri.color}${big ? '99' : '55'}, inset 0 0 14px ${ri.color}22`,
                          animation: `card-bounce .42s ease-out ${i * 0.08}s both` }}>
                          {big && fresh && <div style={{ position: 'absolute', top: 4, right: 5, fontSize: 11, animation: 'aura-pulse 1.4s ease-in-out infinite' }}>✨</div>}
                          {/* 1. Type glyph + rarity color */}
                          <div style={{ animation: big ? 'aura-pulse 1.5s ease-in-out infinite' : 'none' }}>
                            <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={solo ? 76 : 52} />
                          </div>
                          <div style={{ fontSize: T.small, fontWeight: 900, color: ri.color, marginTop: 4, textShadow: big ? `0 0 10px ${ri.color}66` : 'none' }}>{ri.pips} {c.name}</div>
                          {/* 2. Innate — the new thing (solo: card; multi: compact tag on fresh) */}
                          {solo && inn && fresh && (
                            <div style={{ background: '#0a1c16', border: '1px solid #2a5040', borderRadius: 8, padding: '6px 10px', margin: '6px 0 4px' }}>
                              <div style={{ fontSize: 9.5, fontWeight: 900, color: '#7ee0c0' }}>✦ {inn.name}</div>
                              <div style={{ fontSize: T.micro, color: '#8fa0a0', lineHeight: 1.35, marginTop: 1 }}>{inn.line}</div>
                            </div>
                          )}
                          {!solo && inn && fresh && (
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#7ee0c0', marginTop: 2, lineHeight: 1.2 }}>✦ {inn.name}</div>
                          )}
                          {/* 3. Opens line / dupe progress */}
                          <div style={{ fontSize: 9, fontWeight: 800, color: fresh ? ti.accent : '#6f6f80', lineHeight: 1.25, marginTop: 1 }}>{fresh ? '⮑ opens ' : ''}{ti.glyph} {BUILD_LINE[c.type] || ti.nick}{fresh ? ' build' : ''}</div>
                          <div style={{ fontSize: T.micro, fontWeight: 800, color: r.isDupe ? '#9a7fc0' : WIN, marginTop: 1 }}>{r.isDupe ? `+${r.gainedCores} ⬡ toward ${c.name}'s build` : (r.gainedCores > 0 ? `NEW! +${r.gainedCores} ⬡` : 'NEW!')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Rates */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: T.micro, color: DIM }}>
                {rates.map(([r, pct]) => <span key={r}><b style={{ color: RARITY_INFO[r].color }}>{RARITY_INFO[r].pips} {r}</b> {pct}%</span>)}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════ FORGE — spend banked slag on a permanent edge ═══════════════ */}
        {homeTab === 'forge' && (<>
          <div style={{ background: '#0c1016', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px' }}>
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
          {/* ── FORGE TEMPERING — repeatable sink: +1% squad max HP per tier, resets each crossing. ── */}
          {(() => {
            const atCap = temperingTier >= TEMPERING_CAP;
            const cost = atCap ? 0 : temperCost(temperingTier);
            const afford = !atCap && slag >= cost;
            const buyTempering = () => {
              if (!afford) return;
              onSlag?.(-cost);
              const nt = temperingTier + 1; setTemperingTier(nt); saveTempering(nt);
            };
            return (
              <div style={{ background: '#0c1016', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: T.sub, color: '#c9c98a', fontWeight: 900, letterSpacing: 0.5 }}>🔩 FORGE TEMPERING</div>
                  <div style={{ fontSize: T.micro, fontWeight: 800, color: '#9a9a5a' }}>T{temperingTier}/{TEMPERING_CAP} · +{temperingTier}% max HP</div>
                </div>
                <div style={{ fontSize: T.micro, color: DIM, lineHeight: 1.4, marginBottom: 10 }}>
                  Work the metal past its limits — each tier tempers the squad's constitution. Resets when you step through the Drop. <b style={{ color: '#c9c98a' }}>+1% max HP per tier, cap T{TEMPERING_CAP}.</b>
                </div>
                {atCap ? (
                  <div style={{ fontSize: T.small, fontWeight: 800, color: '#c9c98a', textAlign: 'center', padding: '8px 0' }}>⚒ The forge rests — tempering is capped for this crossing.</div>
                ) : (
                  <button onClick={buyTempering} disabled={!afford}
                    style={{ width: '100%', textAlign: 'left', borderRadius: 10, padding: '9px 12px', cursor: afford ? 'pointer' : 'default',
                      background: afford ? '#151208' : PANEL, border: `1.5px solid ${afford ? '#6a6a30' : LINE}`, opacity: afford ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: T.small, fontWeight: 900, color: afford ? '#c9c98a' : DIM }}>🔩 Temper to T{temperingTier + 1} — +{temperingTier + 1}% max HP</span>
                    <span style={{ fontSize: T.micro, fontWeight: 800, color: afford ? '#c9c98a' : DIM }}>{cost} ⚒</span>
                  </button>
                )}
              </div>
            );
          })()}
          {/* ── FORGE A KEYSTONE — gamble shards + slag for the craft-only top relic tier. ── */}
          {(() => {
            const ownedK = KEYSTONE_IDS.filter((id) => relics.includes(id));
            const allK = ownedK.length >= KEYSTONE_IDS.length;
            return (
              <div style={{ background: 'radial-gradient(120% 100% at 50% 0%, #0e211e, #0a1014)', border: '1px solid #2a6a5a', borderRadius: 12, padding: '12px 14px', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: T.sub, color: '#5ff0d0', fontWeight: 900, letterSpacing: 0.5 }}>✦ FORGE A KEYSTONE</div>
                  <div style={{ fontSize: T.small, fontWeight: 800, color: '#5ff0d0' }}>⛏ {shards} · ⚒ {slag}</div>
                </div>
                <div style={{ fontSize: T.micro, color: DIM, marginBottom: 10, lineHeight: 1.4 }}>The top relic tier isn't found — it's <b style={{ color: '#5ff0d0' }}>forged</b>. Salvage relics into <b style={{ color: '#5ff0d0' }}>shards</b> (Relics tab), then gamble them here. Hotter heat, better odds. A failed pour gives back <b>half</b> the shards. <span style={{ color: '#8aa' }}>{ownedK.length}/{KEYSTONE_IDS.length} keystones forged.</span></div>
                {allK ? (
                  <div style={{ fontSize: T.small, color: '#5ff0d0', fontWeight: 800, textAlign: 'center', padding: '10px 0' }}>✦ Every Keystone is yours. The forge has nothing left to give.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {KEYSTONE_TIERS.map((t) => {
                      const afford = shards >= t.shards && slag >= t.slag;
                      return (
                        <button key={t.id} onClick={() => afford && craftKeystone(t)} disabled={!afford}
                          style={{ textAlign: 'center', borderRadius: 10, padding: '11px 6px', cursor: afford ? 'pointer' : 'default', background: afford ? '#0e2420' : PANEL, border: `1.5px solid ${afford ? '#2a6a5a' : LINE}`, opacity: afford ? 1 : 0.5 }}>
                          <div style={{ fontSize: T.small, fontWeight: 900, color: afford ? '#eafff8' : DIM }}>{t.name}</div>
                          <div style={{ fontSize: T.sub, fontWeight: 900, color: afford ? '#5ff0d0' : DIM, margin: '2px 0' }}>{Math.round(t.odds * 100)}%</div>
                          <div style={{ fontSize: T.micro, color: afford ? '#c9c98a' : DIM }}>⛏ {t.shards} · ⚒ {t.slag}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {craftResult && (
                  <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, textAlign: 'center',
                    background: craftResult.granted ? '#0e2420' : '#1a1410', border: `1.5px solid ${craftResult.granted ? '#5ff0d0' : '#6a4a3a'}` }}>
                    {craftResult.granted ? (() => { const k = RELIC_BY_ID[craftResult.granted]; return (
                      <div>
                        <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1, color: '#5ff0d0', marginBottom: 4 }}>✦ THE POUR HOLDS</div>
                        <div style={{ fontSize: T.body, fontWeight: 900, color: k.color }}>{k.icon} {k.name}</div>
                        <div style={{ fontSize: T.micro, color: '#bfe8df', marginTop: 2 }}>{k.desc}</div>
                      </div>
                    ); })() : (
                      <div style={{ fontSize: T.small, fontWeight: 800, color: '#ffae5a' }}>🜂 The forge-fire guttered. {craftResult.refund > 0 ? `${craftResult.refund} shards recovered.` : 'Shards returned.'}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </>)}

        {/* ═══════════════ RELICS — found loot, equip a kit ═══════════════ */}
        {homeTab === 'relics' && (
          <div style={{ background: '#0c0e16', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: T.sub, color: '#cba6ff', fontWeight: 900, letterSpacing: 0.5 }}>✦ RELICS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: T.micro, fontWeight: 800, color: '#c9c98a' }}>⚒ {slag}</span>
                <span style={{ fontSize: T.micro, fontWeight: 800, color: shards > 0 ? '#5ff0d0' : DIM }}>⛏ {shards}</span>
                <button onClick={() => { setRecutMode((v) => !v); setSalvageMode(false); setRecutFor(null); }} title="Re-forge a relic into an alternate cut — same power, a different build"
                  style={{ fontSize: T.micro, fontWeight: 800, color: recutMode ? '#ffd166' : '#9a7fc0', background: recutMode ? '#231d0e' : 'transparent', border: `1px solid ${recutMode ? '#6a5a2a' : LINE}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer' }}>{recutMode ? '⚒ recutting' : '⚒ recut'}</button>
                <button onClick={() => { setSalvageMode((v) => !v); setRecutMode(false); setRecutFor(null); }} title="Melt relics you don't want into shards (for forging Keystones)"
                  style={{ fontSize: T.micro, fontWeight: 800, color: salvageMode ? '#5ff0d0' : '#9a7fc0', background: salvageMode ? '#0e2420' : 'transparent', border: `1px solid ${salvageMode ? '#2a6a5a' : LINE}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer' }}>{salvageMode ? '⛏ salvaging' : '⛏ salvage'}</button>
                <button onClick={() => setShowVault(true)} style={{ fontSize: T.micro, fontWeight: 800, color: '#9a7fc0', background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer' }}>📖 {relics.length}/{RELICS.length}</button>
                <div style={{ fontSize: T.small, fontWeight: 800, color: relicKit.length ? '#cba6ff' : DIM }}>kit {relicKit.length}/{RELIC_SLOTS}</div>
              </div>
            </div>
            {/* ── RECUT chooser (§31): re-forge a relic into an alternate cut. ── */}
            {recutFor && (() => {
              const r = RELIC_BY_ID[recutFor]; if (!r) return null;
              const options = [{ name: 'Original', desc: r.desc }, ...cutsFor(r.id)];
              const activeIdx = relicCut[r.id] || 0;
              const owned = relicCutOwn[r.id] || [];
              const cost = recutCost(r.rarity);
              return (
                <div style={{ background: '#0e0a18', border: '1px solid #6a5a2a', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <RelicIcon r={r} size={T.body} />
                    <span style={{ fontSize: T.small, fontWeight: 900, color: r.color }}>{r.name}</span>
                    <span style={{ fontSize: 9, color: DIM, fontWeight: 800 }}>· recut</span>
                    <button onClick={() => setRecutFor(null)} style={{ marginLeft: 'auto', fontSize: T.micro, color: DIM, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {options.map((o, idx) => {
                      const isActive = idx === activeIdx;
                      const isOwned = idx === 0 || owned.includes(idx);
                      const canGet = isOwned || (slag || 0) >= cost;
                      return (
                        <button key={idx} onClick={() => { if (canGet) chooseCut(r, idx); }} disabled={!canGet}
                          style={{ textAlign: 'left', borderRadius: 8, padding: '8px 10px', cursor: canGet ? 'pointer' : 'default',
                            background: isActive ? `linear-gradient(180deg, ${r.color}26, #100b1a)` : '#13101c',
                            border: `1px solid ${isActive ? r.color : LINE}`, opacity: canGet ? 1 : 0.45 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: T.micro, fontWeight: 900, color: isActive ? r.color : '#cdd2dd' }}>{idx === 0 ? '◆ Original' : `⚒ ${o.name}`}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: isActive ? r.color : isOwned ? WIN : ((slag || 0) >= cost ? '#c9c98a' : '#a85a5a') }}>
                              {isActive ? '● active' : isOwned ? 'set →' : `unlock ⚒${cost}`}
                            </span>
                          </div>
                          <div style={{ fontSize: 9.5, color: '#9a9aaa', lineHeight: 1.35, marginTop: 2 }}>{o.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 8.5, color: DIM, fontStyle: 'italic', marginTop: 7, lineHeight: 1.3 }}>Cuts are sidegrades — same power, a different build. Unlock once with slag; swap freely after.</div>
                </div>
              );
            })()}
            {/* ── THE BENCH (vF-CA): your 3-slot loadout is the hero — equipping IS building ── */}
            {!salvageMode && !recutFor && (
              <>
                <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1, margin: '2px 0 7px' }}>YOUR KIT — the build you carry into the next raid</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {Array.from({ length: RELIC_SLOTS }).map((_, i) => {
                    const r = relicKit[i] ? RELIC_BY_ID[relicKit[i]] : null;
                    return (
                      <div key={i} onClick={r ? () => (recutMode ? setRecutFor(r.id) : toggleRelic(r.id)) : undefined} title={r ? (recutMode ? 'Tap to recut' : 'Tap to unequip') : 'Pick a relic below'}
                        style={{ textAlign: 'center', borderRadius: 10, padding: '10px 6px', minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: r ? 'pointer' : 'default',
                          background: r ? `linear-gradient(180deg, ${r.color}22, #0e0a18)` : 'transparent',
                          border: r ? `1px solid ${r.color}` : `1px dashed ${LINE}`,
                          boxShadow: r ? `0 0 14px ${r.color}44, inset 0 0 14px ${r.color}1a` : 'none' }}>
                        {r ? (<>
                          <RelicIcon r={r} size={T.head} />
                          <span style={{ fontSize: T.micro, fontWeight: 900, color: r.color, lineHeight: 1.15 }}>{r.name}</span>
                          {(relicCut[r.id] || 0) > 0
                            ? <span style={{ fontSize: 8.5, fontWeight: 800, color: '#ffd166' }}>⚒ {cutEffect(r, relicCut[r.id]).name}</span>
                            : <span style={{ fontSize: 8.5, fontWeight: 700, color: DIM }}>{recutMode ? 'tap to recut' : 'tap to unequip'}</span>}
                        </>) : (<>
                          <span style={{ fontSize: T.head, color: '#3a3a4a', lineHeight: 1 }}>＋</span>
                          <span style={{ fontSize: 9, color: '#54506a', fontWeight: 700 }}>empty slot</span>
                        </>)}
                      </div>
                    );
                  })}
                </div>
                {/* what the kit DOES, in plain words — the build read at a glance */}
                {relicKit.length > 0 ? (
                  <div style={{ background: '#0e0a18', border: '1px solid #2a2440', borderRadius: 10, padding: '9px 11px', marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1, color: '#9a7fc0', marginBottom: 5 }}>WHAT YOUR KIT DOES</div>
                    {relicKit.map((id) => { const r = RELIC_BY_ID[id]; if (!r) return null; const ce = cutEffect(r, relicCut[id] || 0); return <div key={id} style={{ fontSize: T.micro, color: '#d8c8f0', lineHeight: 1.5 }}>• {ce.desc}{(relicCut[id] || 0) > 0 && <span style={{ color: '#ffd166', fontWeight: 800 }}> ⚒{ce.name}</span>}</div>; })}
                    {activeRelicSets(relicKit).map((s) => (
                      <div key={s.id} style={{ fontSize: T.micro, fontWeight: 800, color: '#ffe08a', lineHeight: 1.5, marginTop: 2 }}>⚜ {s.icon} {s.name} set — {s.desc}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: T.micro, color: DIM, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.4 }}>Empty kit — tap relics below to slot up to <b style={{ color: '#cba6ff' }}>{RELIC_SLOTS}</b>. Match a <b style={{ color: '#ffd166' }}>set</b> (2+) for a bonus.</div>
                )}
                {/* set progress — what each set needs, lit when it's live in your kit */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {RELIC_SETS.map((s) => {
                    const have = Math.min(s.members.filter((id) => relicKit.includes(id)).length, s.need);
                    const live = have >= s.need;
                    return (
                      <span key={s.id} title={`${s.name} set — ${s.desc}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: live ? '#ffe08a' : '#7a7a8c', background: live ? '#231d0e' : '#13131c', border: `1px solid ${live ? '#6a5a2a' : LINE}`, borderRadius: 999, padding: '3px 8px' }}>
                        {s.icon} {s.name} {have}/{s.need}{live ? ' ✓' : ''}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
            {/* mode helpers (build guidance lives in the bench above) */}
            {salvageMode && <div style={{ fontSize: T.micro, color: '#5ff0d0', marginBottom: 10, lineHeight: 1.4 }}>⛏ <b>Salvage mode</b> — tap any relic to melt it into shards (Common 1 · Rare 3 · Legendary 7). Spend shards at the Forge to gamble for a <b style={{ color: '#5ff0d0' }}>Keystone</b>.</div>}
            {recutMode && !recutFor && <div style={{ fontSize: T.micro, color: '#ffd166', marginBottom: 10, lineHeight: 1.4 }}>⚒ <b>Recut mode</b> — tap a relic marked <b>⚒</b> to re-forge it into a different build. Same power, a new role; unlock a cut once with slag, then swap free.</div>}
            {relics.length === 0 ? (
              <div style={{ fontSize: T.small, color: DIM, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No relics yet. Beat a ring's boss to find your first.</div>
            ) : (<>
              <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1, marginBottom: 7 }}>{salvageMode ? 'TAP A RELIC TO MELT IT' : recutMode ? 'TAP A ⚒ RELIC TO RECUT' : `YOUR COLLECTION — tap to equip · ${relics.length}/${RELICS.length} found`}</div>
              <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {RELICS.filter((r) => relics.includes(r.id)).map((r) => {
                  const eq = relicKit.includes(r.id);
                  const full = !eq && relicKit.length >= RELIC_SLOTS;
                  const rc = (RARITY_INFO[r.rarity] || {}).color || r.color;
                  const hasCut = cutsFor(r.id).length > 0;
                  const aIdx = relicCut[r.id] || 0;
                  const disabled = recutMode ? !hasCut : (!salvageMode && full);
                  const onTap = () => (recutMode ? (hasCut && setRecutFor(r.id)) : (salvageMode ? salvageRelic(r.id) : toggleRelic(r.id)));
                  return (
                    <button key={r.id} onClick={onTap} disabled={disabled}
                      title={salvageMode ? `Melt for +${shardYield(r.rarity)} shards` : recutMode ? (hasCut ? 'Recut this relic' : 'No cuts for this relic') : r.lore}
                      style={{ textAlign: 'left', borderRadius: 10, padding: '9px 10px', cursor: disabled ? 'default' : 'pointer',
                        background: salvageMode ? '#16100e' : recutMode && hasCut ? '#1a160a' : eq ? '#1a1230' : PANEL,
                        border: `1px solid ${salvageMode ? '#6a4a3a' : recutMode && hasCut ? '#6a5a2a' : eq ? '#b06bff' : full ? LINE : `${r.color}66`}`,
                        boxShadow: eq && !salvageMode && !recutMode ? '0 0 12px #b06bff44' : 'none', opacity: disabled ? 0.4 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <RelicIcon r={r} size={T.body} />
                        <span style={{ fontSize: T.small, fontWeight: 900, color: eq ? '#cba6ff' : r.color }}>{r.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: salvageMode ? '#ffae5a' : recutMode ? (hasCut ? '#ffd166' : DIM) : eq ? '#cba6ff' : full ? DIM : rc }}>{salvageMode ? `⛏ +${shardYield(r.rarity)}` : recutMode ? (hasCut ? '⚒ recut' : '—') : eq ? '● equipped' : full ? 'kit full' : `equip`}</span>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: rc, letterSpacing: 0.3, marginBottom: 2 }}>{r.keystone ? 'KEYSTONE' : r.rarity.toUpperCase()}{aIdx > 0 && <span style={{ color: '#ffd166' }}> · ⚒ {cutEffect(r, aIdx).name}</span>}{hasCut && aIdx === 0 && !recutMode && <span style={{ color: '#7a6a3a' }}> · ⚒{cutsFor(r.id).length}</span>}</div>
                      <div style={{ fontSize: T.micro, color: eq ? '#d8c8f0' : '#9a9aaa', lineHeight: 1.35 }}>{cutEffect(r, aIdx).desc}</div>
                    </button>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* ═══════════════ HOLDFAST — home, progress, lore ═══════════════ */}
        {homeTab === 'holdfast' && (
          <>
            {/* ── THE WORLD (vF-CE): home is where you see the whole climb — the map of the rings. ── */}
            <div style={{ background: '#0a0c12', border: `1px solid ${LINE}`, borderRadius: 14, padding: '10px 0 2px', marginBottom: 12 }}>
              <WorldMap unlocked={unlocked} stones={stones} size={narrow ? 290 : 340} />
              <div style={{ textAlign: 'center', fontSize: T.micro, color: '#6f86a8', padding: '3px 0 8px' }}>{stones.length}/8 carved stones read · the rest wait on first clears</div>
            </div>
            {/* ── NG+ banner: which crossing you're on (rings reform harder past the Drop). ── */}
            {crossing > 0 && (
              <div style={{ background: 'linear-gradient(90deg, #1a0f2a, #150d22)', border: '1.5px solid #6a4a9a', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>✦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.small, fontWeight: 900, color: '#cba6ff', letterSpacing: 0.5 }}>THE DEEP CROSSING · {roman(crossing)}</div>
                  <div style={{ fontSize: T.micro, color: '#9a7fc0', lineHeight: 1.4 }}>You stepped through the Drop {crossing === 1 ? 'once' : `${crossing} times`}. Every ring is reformed <b style={{ color: '#cba6ff' }}>+{Math.round((crossMult(crossing) - 1) * 100)}% stronger</b>. Reach the Drop again to climb deeper into his story.</div>
                </div>
              </div>
            )}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                      {boons.map((s) => {
                        const pickIdx = holdfastPicks[s.depth] ?? 0;
                        const active = pickIdx === 1 && s.alt ? s.alt : s.boon;
                        const other = pickIdx === 0 && s.alt ? s.alt : s.boon;
                        const canSwap = s.alt && slag >= 30;
                        const doSwap = () => {
                          if (!canSwap) return;
                          onSlag?.(-30);
                          const np = { ...holdfastPicks, [s.depth]: pickIdx === 0 ? 1 : 0 };
                          setHoldfastPicks(np); saveHoldfastPicks(np);
                        };
                        return (
                          <div key={s.depth} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0e0a14', border: '1px solid #4a3a66', borderRadius: 8, padding: '5px 8px' }}>
                            <span style={{ fontSize: T.micro, fontWeight: 800, color: '#cba6ff', flex: 1 }}>
                              {active.icon} <b>{active.name}</b> <span style={{ fontWeight: 400, color: '#9a7fc0' }}>— {active.desc}</span>
                            </span>
                            {s.alt && (
                              <button onClick={doSwap} disabled={!canSwap} title={`Swap to: ${other.icon} ${other.name} — ${other.desc}`}
                                style={{ flexShrink: 0, fontSize: 9, fontWeight: 900, color: canSwap ? '#c9c98a' : DIM,
                                  background: 'transparent', border: `1px solid ${canSwap ? '#6a6a30' : LINE}`, borderRadius: 5,
                                  padding: '2px 5px', cursor: canSwap ? 'pointer' : 'default', opacity: canSwap ? 1 : 0.5 }}>
                                SWAP 30⚒
                              </button>
                            )}
                          </div>
                        );
                      })}
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
            {/* ── FEATS — milestones across every system; a pure projection of your save. ── */}
            {(() => {
              const snap = featSnapshot();
              const feats = evalFeats(snap);
              const tally = featTally(snap);
              return (
                <div style={{ background: '#0e0c16', border: '1px solid #33304a', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: T.sub, color: '#dcdce6', fontWeight: 900, letterSpacing: 0.5 }}>🏅 FEATS</span>
                    <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: '#9a9ab0' }}>{tally.done}/{tally.total} earned</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#1c1a28', margin: '8px 0 12px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(tally.pct * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#c08552,#e8c14a)' }} />
                  </div>
                  {FEAT_GROUPS.map((grp) => (
                    <div key={grp} style={{ marginBottom: 9 }}>
                      <div style={{ fontSize: T.micro, fontWeight: 900, color: '#7a7a90', letterSpacing: 1, marginBottom: 5 }}>{grp.toUpperCase()}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 6 }}>
                        {feats.filter((f) => f.group === grp).map((f) => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 9,
                            background: f.done ? '#13140f' : '#121119', border: `1px solid ${f.done ? TIER_COLOR[f.tier] + '88' : '#2a2838'}` }}>
                            <span style={{ fontSize: 18, filter: f.done ? 'none' : 'grayscale(1)', opacity: f.done ? 1 : 0.45 }}>{f.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: T.small, fontWeight: 800, color: f.done ? TIER_COLOR[f.tier] : '#b6b6c2' }}>{f.name}{f.done ? ' ✓' : ''}</div>
                              <div style={{ fontSize: T.micro, color: '#8a8a9a', lineHeight: 1.3 }}>{f.desc}{!f.done && f.need > 1 ? ` · ${f.rawHave}/${f.need}` : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Story + Chronicle — the lore, in one place. */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { sfx.resume(); setShowIntro(true); }}
                style={{ flex: 1, fontSize: T.small, fontWeight: 800, padding: '11px 0', borderRadius: 10, cursor: 'pointer', border: '1px solid #4a3a66', background: '#160f1d', color: '#cba6ff' }}>
                ❖ The Story
              </button>
              <button onClick={() => setShowCodex(true)}
                style={{ flex: 1, fontSize: T.small, fontWeight: 800, padding: '11px 0', borderRadius: 10, cursor: 'pointer', border: '1px solid #4a3a66', background: '#160f1d', color: '#cba6ff' }}>
                📖 The Chronicle
              </button>
            </div>
          </>
        )}

        {/* ═══════════════ STICKY RAID CTA — always-visible "go" once a squad is ready ═══════════════ */}
        {homeTab === 'raid' && runPhase === 'pick' && picked.length >= 2 && (() => {
          const g = accessibleGround(ground, accessDepth); const diff = diffOf(g.depth + crossing);
          return (
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 53, zIndex: 10000, padding: '0 12px', pointerEvents: 'none' }}>
              <div style={{ maxWidth: 920, margin: '0 auto' }}>
                <button onClick={startRun}
                  style={{ pointerEvents: 'auto', width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: ACCENT, color: '#1a1408', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,0,0,0.55)' }}>
                  RAID {g.name} <span style={{ color: '#1a1408', opacity: 0.7 }}>· {diff.label} →</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════ FIXED BOTTOM NAV ═══════════════ */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10001, background: 'rgba(10,10,16,0.97)', borderTop: `1px solid ${LINE}`, backdropFilter: 'blur(8px)' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex' }}>
            {HOME_TABS.map(([key, glyph, label]) => {
              const on = homeTab === key;
              return (
                <button key={key} onClick={() => { sfx.resume(); setHomeTab(key); }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '9px 0 11px', background: on ? '#16202e' : 'transparent', border: 'none', borderTop: `2px solid ${on ? ACCENT : 'transparent'}`, cursor: 'pointer', color: on ? '#eaf2ff' : '#888' }}>
                  <span style={{ fontSize: 19, lineHeight: 1, opacity: on ? 1 : 0.75 }}>{glyph}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ ⚙ SETTINGS overlay ═══════════════ */}
        {showSettings && (
          <div onClick={() => { setShowSettings(false); setConfirmReset(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(4,4,8,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 400, maxHeight: '86vh', overflowY: 'auto', background: '#0c0e16', border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: T.sub, fontWeight: 900, color: '#eaf2ff', letterSpacing: 0.5 }}>⚙ Settings</span>
                <button onClick={() => { setShowSettings(false); setConfirmReset(false); }} style={{ marginLeft: 'auto', fontSize: T.body, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', border: `1px solid ${LINE}`, background: PANEL, color: DIM }}>✕</button>
              </div>
              {/* Music toggle */}
              <button onClick={() => { sfx.resume(); const m = !music; setMusic(m); saveMusic(m); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${music ? '#4a3a66' : LINE}`, background: music ? '#160f1d' : PANEL }}>
                <span style={{ fontSize: T.sub }}>{music ? '🔊' : '🔇'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.small, fontWeight: 800, color: music ? '#cba6ff' : '#bbb' }}>Ambient Music</div>
                  <div style={{ fontSize: T.micro, color: DIM }}>A low pad under the climb.</div>
                </div>
                <span style={{ fontSize: T.micro, fontWeight: 900, color: music ? '#9be7ff' : '#777' }}>{music ? 'ON' : 'OFF'}</span>
              </button>
              {/* Sound-effects toggle (separate from music) */}
              <button onClick={() => { const s = !sfxOn; setSfxOn(s); saveSfxOn(s); if (s) { sfx.resume(); sfx.upgradePick(); } }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${sfxOn ? '#4a3a66' : LINE}`, background: sfxOn ? '#160f1d' : PANEL }}>
                <span style={{ fontSize: T.sub }}>{sfxOn ? '🔔' : '🔕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.small, fontWeight: 800, color: sfxOn ? '#cba6ff' : '#bbb' }}>Sound Effects</div>
                  <div style={{ fontSize: T.micro, color: DIM }}>Hits, charges, pulls — the combat sounds.</div>
                </div>
                <span style={{ fontSize: T.micro, fontWeight: 900, color: sfxOn ? '#9be7ff' : '#777' }}>{sfxOn ? 'ON' : 'OFF'}</span>
              </button>
              {/* Auto-pick toggle */}
              <button onClick={() => setAutoPick(!autoPick)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${autoPick ? '#2a5a8a' : LINE}`, background: autoPick ? '#0d1622' : PANEL }}>
                <span style={{ fontSize: T.sub }}>⏩</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.small, fontWeight: 800, color: autoPick ? '#9be7ff' : '#bbb' }}>Auto-pick (farming)</div>
                  <div style={{ fontSize: T.micro, color: DIM, lineHeight: 1.35 }}>Auto-resolve upgrades & events on rings you've <b>already cleared</b>. Never on a fresh ring — the climb stays hands-on.</div>
                </div>
                <span style={{ fontSize: T.micro, fontWeight: 900, color: autoPick ? '#9be7ff' : '#777' }}>{autoPick ? 'ON' : 'OFF'}</span>
              </button>
              {/* ── β BETA: a removable dev switch — fast-forward the gate for content testing. ── */}
              {BETA_AVAILABLE && (
                <div style={{ border: `1px dashed ${beta ? '#ff5cf0' : '#33333f'}`, background: beta ? '#190a17' : '#0b0b11', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
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
                        // Playtest the Warden's Lock fast: stand at ring 4 (its threshold) with beta OFF
                        // (so the ward engages) + a Bulwark & Reactor in the stable for the deed. Then:
                        // raid ring 4 → hit the gate; raid the Fallen Gate with both, twice → it opens.
                        ['🜸 Ward test: ring 4', () => {
                          setBeta(false); saveBeta(false);
                          setUnlocked(4); saveUnlocked(4);
                          setWards({}); saveWards({});
                          const st = [...new Set([...stable, 'fizzpop', 'ironwall'])]; setStable(st); saveStable(st); // a 🔥 Reactor + a 🛡 Bulwark
                          onSlag?.(300); // slag to summon/forge while testing
                          setShowSettings(false);
                        }],
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
                          setRelics([]); saveRelics([]);               // the relic collection,
                          setRelicKit([]); saveRelicKit([]);            // the equipped kit,
                          setCrossing(0); saveCrossing(0);              // the NG+ crossing level,
                          setWards({}); saveWards({});                  // every ward riddle,
                          setShards(0); saveShards(0);                  // and the shard bank.
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
              {/* ── Start Over — a tester-facing full wipe, behind a two-tap confirm. ── */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)}
                    style={{ width: '100%', padding: '11px 0', borderRadius: 10, cursor: 'pointer', border: `1px solid ${LINE}`, background: 'transparent', color: '#9a6a6a', fontSize: T.small, fontWeight: 800 }}>
                    ↺ Start Over
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: T.micro, color: '#e0a0a0', textAlign: 'center', marginBottom: 8, lineHeight: 1.4 }}>
                      This erases <b>everything</b> — your squad, progress, the Gauntlet, all of it. No undo.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmReset(false)}
                        style={{ flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer', border: `1px solid ${LINE}`, background: PANEL, color: '#bbb', fontSize: T.small, fontWeight: 800 }}>
                        Keep my progress
                      </button>
                      <button onClick={() => { try { Object.keys(localStorage).filter((k) => /^8gents/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch { /* best-effort */ } window.location.reload(); }}
                        style={{ flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer', border: '1px solid #7a3a3a', background: '#2a1010', color: '#ff9a9a', fontSize: T.small, fontWeight: 900 }}>
                        Erase everything
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                    <div style={{ fontSize: T.micro, color: '#7a8a9a', lineHeight: 1.3, marginTop: 1 }}>{ti.role}</div>
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
  if (runPhase === 'event' && pendingElite) {
    const el = pendingElite;
    return (
      <div>
        <div style={{ animation: 'seam-threshold .9s ease-out', maxWidth: 560, margin: '8px auto 0', background: 'linear-gradient(180deg,#1a0e0e,#0b0808)', border: `1px solid ${el.tint}66`, borderRadius: 14, padding: narrow ? '16px 15px' : '20px 22px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            <EventVignette tint={el.tint} glyph={el.glyph} size={narrow ? 70 : 88} />
            <div>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2, color: el.tint }}>💀 AN ELITE BARS THE TRAIL</div>
              <div style={{ fontSize: T.head, fontWeight: 900, color: '#eadcff', marginTop: 2 }}>{el.title}</div>
            </div>
          </div>
          <div style={{ fontSize: T.body, color: '#cdc2dd', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 16 }}>{el.text}</div>
          {!eventOutcome ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <button onClick={startEliteFight}
                style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 11, padding: '13px 15px', background: '#1f1010', border: `1.5px solid ${el.tint}` }}>
                <div style={{ fontSize: T.body, fontWeight: 900, color: '#ffd0d0' }}>⚔ Fight it</div>
                <div style={{ fontSize: T.small, color: '#c89a9a', marginTop: 2 }}>Tougher than a pack. Win for a <b style={{ color: '#ffd0d0' }}>guaranteed relic</b> — but a loss ends the run.</div>
              </button>
              <button onClick={eventPressOn}
                style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 11, padding: '13px 15px', background: '#16111f', border: `1.5px solid ${LINE}` }}>
                <div style={{ fontSize: T.body, fontWeight: 900, color: '#eadcff' }}>↩ Slip past</div>
                <div style={{ fontSize: T.small, color: '#9a8fb0', marginTop: 2 }}>Take the way around. No prize, no risk.</div>
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: T.body, color: '#cfe8c0', lineHeight: 1.6, marginBottom: 12 }}>{eventOutcome}</div>
              {relicDrop && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#150d22', border: '1.5px solid #b06bff', borderRadius: 11, padding: '11px 13px', marginBottom: 14 }}>
                  <RelicIcon r={relicDrop} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff' }}>✦ RELIC WON</div>
                    <div style={{ fontSize: T.sub, fontWeight: 900, color: '#eadcff' }}>{relicDrop.name} <span style={{ fontSize: T.micro, fontWeight: 800, color: (RARITY_INFO[relicDrop.rarity] || {}).color }}>· {relicDrop.rarity}</span></div>
                    <div style={{ fontSize: T.small, color: '#cba6ff', fontWeight: 700 }}>{relicDrop.desc}</div>
                  </div>
                </div>
              )}
              <button onClick={eventPressOn} style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>PRESS ON →</button>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (runPhase === 'event' && pendingEvent) {
    const ev = pendingEvent;
    const step = ev.steps ? (ev.steps[eventStep || ev.start] || ev.steps[ev.start]) : ev; // TALE: the live step, else the one-shot
    const sceneKey = step.scene || ev.scene; // a branching tale shows a full illustrated backdrop
    const text = step.text;
    const choices = step.choices || [];
    const multi = !!ev.steps; // a multi-step tale (longer, illustrated)
    return (
      <div>
        <div style={{ animation: 'seam-threshold .9s ease-out', maxWidth: 560, margin: '8px auto 0', background: 'linear-gradient(180deg,#120e1a,#0b0810)', border: `1px solid ${ev.tint}55`, borderRadius: 14, padding: narrow ? '16px 15px' : '20px 22px' }}>
          {/* A tale gets a wide illustrated banner + a title bar; one-shots keep the medallion. */}
          {sceneKey ? (
            <>
              <div style={{ marginBottom: 12 }}><WaysideScene scene={sceneKey} tint={ev.tint} image={ev.image} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2, color: ev.tint }}>⋯ A WAYSIDE</span>
                <span style={{ fontSize: T.head, fontWeight: 900, color: '#eadcff' }}>{ev.glyph} {ev.title}</span>
                {multi && !eventOutcome && (() => { const ids = Object.keys(ev.steps); const at = ids.indexOf(eventStep || ev.start);
                  return <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignSelf: 'center' }}>{ids.map((_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= at ? ev.tint : '#2a2435' }} />)}</span>; })()}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
              <EventVignette tint={ev.tint} glyph={ev.glyph} size={narrow ? 70 : 88} />
              <div>
                <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2, color: ev.tint }}>⋯ A WAYSIDE</div>
                <div style={{ fontSize: T.head, fontWeight: 900, color: '#eadcff', marginTop: 2 }}>{ev.title}</div>
              </div>
            </div>
          )}
          <div style={{ fontSize: T.body, color: '#cdc2dd', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 16 }}>{text}</div>
          {!eventOutcome ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {choices.map((ch, k) => {
                const tooPoor = ch.cost && slag < ch.cost;
                return (
                  <button key={k} onClick={() => chooseEvent(ch)} disabled={tooPoor}
                    style={{ textAlign: 'left', cursor: tooPoor ? 'not-allowed' : 'pointer', borderRadius: 11, padding: '13px 15px', background: '#16111f', border: `1.5px solid ${tooPoor ? LINE : `${ev.tint}66`}`, opacity: tooPoor ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ch.icon && <span style={{ fontSize: T.sub, flexShrink: 0 }}>{ch.icon}</span>}
                      <div style={{ fontSize: T.body, fontWeight: 900, color: '#eadcff', flex: 1 }}>{ch.label}{ch.goto ? <span style={{ color: ev.tint, fontWeight: 800 }}> →</span> : null}</div>
                      {ch.cost ? <div style={{ fontSize: T.small, fontWeight: 900, color: tooPoor ? '#a85a5a' : '#c9c98a' }}>{ch.cost} ⚒</div> : null}
                    </div>
                    <div style={{ fontSize: T.small, color: '#9a8fb0', marginTop: 2, paddingLeft: ch.icon ? 28 : 0 }}>{tooPoor ? 'Not enough slag.' : ch.detail}</div>
                  </button>
                );
              })}
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
    // The ring's own art sits faintly behind the draft (heavily scrimmed for card contrast)
    // so the choice happens INSIDE the world, not in a stack of grey boxes.
    const draftArt = enteredRing?.img || caughtFrom?.img;
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: narrow ? '15px 12px' : '20px 18px',
        background: draftArt ? `linear-gradient(180deg, rgba(10,11,18,0.9) 0%, rgba(9,10,16,0.95) 58%, rgba(8,9,14,0.97) 100%), url(${draftArt}) center/cover no-repeat` : 'transparent',
        boxShadow: draftArt ? 'inset 0 0 90px rgba(0,0,0,0.62)' : 'none' }}>
        {/* THE THRESHOLD (vF-Z): stepping into a ring is a story beat, not a menu. */}
        {waveIdx === 0 && enteredRing && RING_INTRO[enteredRing.id] && (() => {
          const di = diffOf(enteredRing.depth + crossing);
          return (
            <div style={{ animation: 'seam-threshold 1s ease-out', background: 'linear-gradient(180deg,#0e1320,#0b0d16)', border: `1px solid ${SEL}44`, borderLeft: `3px solid ${di.color}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              {enteredRing.img && <img src={enteredRing.img} alt={enteredRing.name} style={{ width: '100%', aspectRatio: '20/13', objectFit: 'cover', display: 'block' }} />}
              <div style={{ display: 'flex', gap: 13, alignItems: 'stretch', padding: '12px 15px' }}>
                {!enteredRing.img && <RingVignette depth={enteredRing.depth} size={narrow ? 64 : 84} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#8fa7c8' }}>⛰ YOU CROSS INTO</span>
                    <span style={{ fontSize: T.sub, fontWeight: 900, color: '#eaf2ff' }}>{enteredRing.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: T.micro, fontWeight: 800, color: di.color }}>ring {enteredRing.depth}/8 · {di.label}</span>
                  </div>
                  <div style={{ fontSize: T.small, color: '#bcc6d8', lineHeight: 1.55, fontStyle: 'italic', marginTop: 5 }}>{RING_INTRO[enteredRing.id]}</div>
                  <RingLawChip law={ringLawFor(enteredRing)} variant="line" />
                </div>
              </div>
            </div>
          );
        })()}
        <BuildStrip taken={taken} />
        <SquadState squad={squad} runMods={runMods} />
        {/* Calm header: ONE decision, one line. (vF-CB declutter — the blurb lives on the fight screen.) */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          {!draftCoachSeen && <div style={{ fontSize: T.small, color: '#9a9aac', marginBottom: 6, fontStyle: 'italic' }}>Before each fight, take one boon — yours for this climb only.</div>}
          <div style={{ fontSize: T.head, fontWeight: 900, color: '#eee', textShadow: `0 0 14px ${ACCENT}44` }}>Pick one → {nextWave.boss ? '💀 ' : ''}{nextWave.name}</div>
          {nextWave.boss && <div style={{ fontSize: T.small, fontWeight: 800, color: '#ffb38a', marginTop: 4 }}>Final stand — choose well.</div>}
          {waveIdx > 0 && <div style={{ fontSize: T.micro, color: DIM, marginTop: 3 }}>✓ wave {waveIdx} cleared · patched +{Math.round(patchup * 100)}%</div>}
          {waveIdx > 0 && <RingLawChip law={ringLawFor(enteredRing)} variant="pill" />}
          {/* MIRROR ELITE telegraph (vF-CF): the next wave carries a keystone-bearer —
              name the threat + what to do, BEFORE the fight, so targeting it is a plan. */}
          {nextWave.mirror && (
            <div style={{ marginTop: 7 }}>
              <div style={{ display: 'inline-block', fontSize: T.micro, fontWeight: 800, color: '#cdb6ff', background: '#120c1c', border: '1px solid #4a3a6a', borderRadius: 999, padding: '2px 9px' }}>⟡ {nextWave.mirror.name} · ★ Oath: {nextWave.mirror.keystone}</div>
              <div style={{ fontSize: T.micro, color: '#9a8ab8', marginTop: 3 }}>{nextWave.mirror.line} <b style={{ color: '#cdb6ff' }}>{nextWave.mirror.ask}</b></div>
            </div>
          )}
        </div>
        <AutoToggle auto={runAuto} setAuto={setAuto} locked={frontierRun} />
        {/* Tap an upgrade to SELECT it (highlights), then CONFIRM — so a whole-squad / AOE
            pick can't be committed by a stray tap that starts the next wave. Color shows up
            ONLY on the live decision: neutral cards, ★ pick in accent, chosen in its color. */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
          {(() => {
            // Score the offered upgrades for THIS squad/build → flag a ★ pick + a "why" on it.
            const recoCtx = { types: new Set(squad.filter((u) => u.hp > 0).map((u) => COMBAT_CREATURES[u.id].type)), mods: runMods, boss: !!nextWave.boss };
            const recoId = offer.reduce((b, id) => upgradeScore(UPGRADE_BY_ID[id], recoCtx) > upgradeScore(UPGRADE_BY_ID[b], recoCtx) ? id : b, offer[0]);
            return offer.map((id) => {
              const up = UPGRADE_BY_ID[id];
              const chosen = upgradeChoice === id;
              const aoe = up.scope !== 'unit'; // squad-wide / AOE upgrade
              const why = upgradeWhy(up, recoCtx);
              const reco = id === recoId;
              return (
                <button key={id} onClick={() => setUpgradeChoice(id)} style={{ position: 'relative', textAlign: 'center', cursor: 'pointer', borderRadius: 14, padding: '15px 13px',
                  background: chosen ? `linear-gradient(180deg, ${up.color}26, rgba(18,18,28,0.66))` : 'rgba(17,18,27,0.6)',
                  border: `1px solid ${chosen ? up.color : reco ? ACCENT + '88' : LINE}`,
                  boxShadow: chosen ? `0 0 28px ${up.color}66, inset 0 0 22px ${up.color}1f` : (reco ? `0 0 18px ${ACCENT}33` : 'none'),
                  backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', transition: 'box-shadow .15s, border-color .15s' }}>
                  {reco && <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: '#1a1408', fontSize: 8.5, fontWeight: 900, letterSpacing: 0.8, padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>★ PICK</div>}
                  <span title={aoe ? 'Whole squad' : 'One creature'} aria-label={aoe ? 'affects the whole squad' : 'goes on one creature'} style={{ position: 'absolute', top: 7, right: 9, fontSize: 11, opacity: 0.85 }}>{aoe ? '💥' : '🎯'}</span>
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{up.icon}</div>
                  <div style={{ fontSize: T.label, fontWeight: 900, color: up.color, marginTop: 8 }}>{up.name}</div>
                  <div style={{ fontSize: T.small, color: '#cdd2dd', lineHeight: 1.45, marginTop: 5 }}>{up.desc}</div>
                  {why && reco && <div style={{ fontSize: 9.5, fontWeight: 800, color: ACCENT, marginTop: 6, letterSpacing: 0.3 }}>{why}</div>}
                </button>
              );
            });
          })()}
        </div>
        <button onClick={() => { if (upgradeChoice) { if (!draftCoachSeen) { setDraftCoachSeen(true); localStorage.setItem('ringward_draft_seen', '1'); } applyUpgrade(UPGRADE_BY_ID[upgradeChoice]); } }} disabled={!upgradeChoice}
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
          {featCelebration}
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
    const beat = crossingBeat(crossing); // this crossing's story; STEP THROUGH advances to crossing+1
    const lines = beat.lines;
    const stepThrough = () => { const n = crossing + 1; setCrossing(n); saveCrossing(n); setTemperingTier(0); saveTempering(0); newRun(); };
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
        <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2.5, color: '#cba6ff', animation: 'seam-drop-text .8s ease-out both' }}>{crossing === 0 ? '✦ YOU REACHED THE DROP ✦' : `✦ THE DROP — CROSSING ${roman(crossing)} ✦`}</div>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: '#eadcff', margin: '6px 0 18px', animation: 'seam-drop-text .8s ease-out .2s both' }}>{beat.title}</div>
        <div style={{ maxWidth: 470, margin: '0 auto', textAlign: 'left' }}>
          {lines.map((ln, i) => (
            <div key={i} style={{ fontSize: T.small, color: '#cdbbe6', lineHeight: 1.62, fontStyle: 'italic', marginBottom: 10, animation: `seam-drop-text 1s ease-out ${0.5 + i * 0.6}s both` }}>{ln}</div>
          ))}
          <div style={{ fontSize: T.sub, fontWeight: 900, color: '#fff', textAlign: 'center', letterSpacing: 1, margin: '14px 0', animation: `seam-drop-text 1s ease-out ${0.5 + lines.length * 0.6}s both` }}>{beat.take}</div>
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
          {featCelebration}
          <div style={{ fontSize: T.small, color: '#9a7fc0', lineHeight: 1.55, marginBottom: 12 }}>Step through, and the rings reform <b style={{ color: '#cba6ff' }}>harder</b> — the next crossing, the next of his story. Or carry it home and come again when you're ready.</div>
          <button onClick={stepThrough} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: '#b06bff', color: '#160f1d', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', marginBottom: 8 }}>{beat.step}</button>
          <button onClick={newRun} style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: 'transparent', border: '1px solid #4a3a66', color: '#9a7fc0', fontSize: T.small, fontWeight: 800, cursor: 'pointer' }}>↩ carry it home {crossing > 0 ? `(stay on Crossing ${roman(crossing)})` : ''}</button>
        </div>
      </div>
    );
  }

  // ── THE GAUNTLET result — isolated full screen, never touches the climb's banner. ──
  if (runPhase === 'endless-over') {
    const r = endlessResult || { reached: 0, best: endlessBest, isRecord: false };
    return (
      <div style={{ background: 'linear-gradient(180deg,#160f22,#0c0814)', border: '2px solid #6a4a9a', borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 2, color: '#9a7fc0' }}>♾️ THE GAUNTLET</div>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: '#cba6ff', marginTop: 4 }}>{r.reached === 0 ? 'OVERRUN' : `${r.reached} ROUND${r.reached !== 1 ? 'S' : ''}`}</div>
        <div style={{ fontSize: T.body, color: '#b9a9d0', margin: '4px 0 12px' }}>
          {r.reached === 0
            ? 'The first round took you. Steel the squad and return.'
            : <>You held the line <b style={{ color: '#eadcff' }}>{r.reached}</b> round{r.reached !== 1 ? 's' : ''} deep before the tide broke through.</>}
        </div>
        {r.isRecord && r.reached > 0 && (
          <div style={{ display: 'inline-block', fontSize: T.small, fontWeight: 900, color: '#1a1408', background: ACCENT, borderRadius: 8, padding: '4px 12px', marginBottom: 12 }}>★ NEW BEST</div>
        )}
        <div style={{ fontSize: T.small, color: DIM, marginBottom: 12 }}>Best ever: <b style={{ color: '#cba6ff' }}>R{r.best}</b></div>
        {featCelebration}
        <SlagBanked earned={earned} balance={slag} />
        <RunRecap taken={taken} stats={stats} squad={squad} />
        <button onClick={startEndless} disabled={picked.length < 2}
          style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: '#6a4a9a', color: '#fff', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: picked.length >= 2 ? 'pointer' : 'default', marginBottom: 8, opacity: picked.length >= 2 ? 1 : 0.5 }}>
          ♾️ RUN IT AGAIN →
        </button>
        <button onClick={exitEndless}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: 'transparent', border: '1px solid #4a3a66', color: '#9a7fc0', fontSize: T.small, fontWeight: 800, cursor: 'pointer' }}>
          ↩ Back to the rim
        </button>
      </div>
    );
  }

  const wave = runWaves[waveIdx];
  const banner = (() => {
    if (runPhase === 'won') {
      const ringArt = enteredRing?.img || caughtFrom?.img; // the cleared ring's own art → atmospheric backdrop
      // ── STAGED REVEAL (vF-CB): the win pays out in small portions — the payoff first, then
      // each spoil as its own moment, the recap folded away at the end. One read at a time.
      // Panel chrome is CALM: neutral border, accent lives only in the label — not a rainbow.
      const calm = { background: 'rgba(10,13,17,0.85)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px', margin: '12px 0', textAlign: 'left' };
      const spoils = [];
      if (enteredRing && RING_CLEAR[enteredRing.id]) spoils.push('beat');
      if (stoneNow) spoils.push('stone');
      if (pullNow) spoils.push('pull');
      if (sigilGain) spoils.push('sigil');
      if (unlockedNow) spoils.push('unlock');
      if (wardBlock) spoils.push('ward');
      if (wardSolvedNow) spoils.push('wardSolved');
      if (holdfastNow) spoils.push('holdfast');
      if (relicChoices.length > 0 || relicDrop) spoils.push('relic');
      const steps = spoils.length ? ['payoff', ...spoils, 'onward'] : ['solo'];
      const step = steps[Math.min(wonStep, steps.length - 1)];
      const last = step === 'onward' || step === 'solo';
      const mustPickRelic = step === 'relic' && relicChoices.length > 0; // the pick IS the continue
      return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: narrow ? '22px 15px' : '30px 24px', marginBottom: 12, textAlign: 'center',
          background: ringArt
            ? `linear-gradient(180deg, rgba(8,16,8,0.72) 0%, rgba(8,13,10,0.9) 55%, rgba(7,10,9,0.96) 100%), url(${ringArt}) center/cover no-repeat`
            : 'radial-gradient(ellipse at top, #132413 0%, #0a0e0a 72%)',
          boxShadow: `inset 0 0 110px rgba(0,0,0,0.55), 0 0 28px ${WIN}22`, minHeight: 320 }}>
          <div style={{ fontSize: narrow ? 34 : 46, fontWeight: 900, color: '#eaffea', letterSpacing: 2, textShadow: `0 0 26px ${WIN}, 0 0 64px ${WIN}55, 0 2px 6px #000` }}>RING TAKEN</div>
          <div style={{ fontSize: T.body, color: '#dcf2cf', margin: '6px 0 14px', textShadow: '0 1px 5px #000' }}>{caughtFrom ? caughtFrom.name : 'The ring'}, cleared to its heart.</div>

          {(step === 'payoff' || step === 'solo') && <>
            <SlagBanked earned={earned} balance={slag} />
            <CoresBanked coresRun={coresRun} />
            {runRepeat < 1 && (
              <div style={{ fontSize: T.micro, color: '#b58a3a', margin: '8px 0', fontWeight: 700 }}>↻ Repeat clear — Cores ×{runRepeat.toFixed(2)}. Fresh rings pay full ⬡.</div>
            )}
            {step === 'solo' && !pullNow && !sigilGain && (
              <div style={{ fontSize: T.small, color: DIM, margin: '10px 0', fontStyle: 'italic' }}>Nothing new stirred from this ring.</div>
            )}
          </>}

          {step === 'beat' && enteredRing && RING_CLEAR[enteredRing.id] && (
            <div style={calm}>
              <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                <RingVignette depth={enteredRing.depth} size={narrow ? 64 : 82} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#9ad0a0' }}>✦ {RING_CLEAR[enteredRing.id].boss.toUpperCase()} FALLS</div>
                  <div style={{ fontSize: T.small, color: '#cbd8cb', lineHeight: 1.6, fontStyle: 'italic', marginTop: 5 }}>{RING_CLEAR[enteredRing.id].beat}</div>
                </div>
              </div>
            </div>
          )}

          {step === 'stone' && stoneNow && (
            <div style={{ ...calm, background: 'rgba(16,15,13,0.9)', border: '1px solid #3a362c' }}>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#b8ab8a' }}>🪨 A CARVED STONE — {stoneNow.title}</div>
              <div style={{ fontSize: T.small, color: '#cfc6ae', lineHeight: 1.7, fontStyle: 'italic', margin: '8px 0 6px' }}>{stoneNow.text}</div>
              <div style={{ fontSize: T.micro, color: '#8a8068', fontStyle: 'italic' }}>Old words. Heavy, though. — kept in ❖ The Chronicle (🏚 Home → Chronicles, {stones.length}/8 stones)</div>
            </div>
          )}
          {step === 'pull' && pullNow && (() => {
            const ac = COMBAT_CREATURES[pullNow.id]; const ati = TYPE_INFO[ac.type]; const ri = RARITY_INFO[pullNow.rarity];
            const inn = innateFor(pullNow.id);
            if (pullNow.isDupe) {
              // Dupe beat: progress toward this creature's tree, not a blank
              const banked = cores[pullNow.id] || 0;
              const meterPct = Math.min(100, Math.round((banked / 180) * 100));
              return (
                <div style={{ ...calm, textAlign: 'center' }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, marginBottom: 8, color: ri.color }}>{ri.pips} {pullNow.rarity.toUpperCase()} · DUPE</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={48} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: T.sub, fontWeight: 900, color: ati.accent }}>{ati.glyph} {ac.name}</div>
                      <div style={{ fontSize: T.small, fontWeight: 900, color: WIN, marginTop: 4 }}>+{pullNow.gainedCores} ⬡ toward {ac.name}'s build</div>
                      <div style={{ marginTop: 5, height: 5, borderRadius: 3, background: '#1a1a2a', width: 120, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: ati.accent, width: `${meterPct}%` }} />
                      </div>
                      <div style={{ fontSize: T.micro, color: DIM, marginTop: 2 }}>{banked} ⬡ banked</div>
                    </div>
                  </div>
                </div>
              );
            }
            // Fresh pull beat: 1) type+rarity  2) innate  3) NEW TEAM POSSIBLE  4) stats last.
            // R2: the "opens" line is now ownership-aware — which named TEAM the new creature
            // completes with creatures you already own (the hour-15 hook), or the nearest team
            // it's one piece short of, as a chase pointer. Falls back to the type-build line.
            const reveal = pullReveal(stable.map((id) => recipeMember(id, treeEquip)), pullNow.id);
            const sameType = stable.filter((id) => COMBAT_CREATURES[id]?.type === ac.type && id !== pullNow.id);
            const partnerName = (ids) => ids.map((id) => COMBAT_CREATURES[id]?.name).filter(Boolean).join(' + ');
            return (
              <div style={{ ...calm, textAlign: 'center' }}>
                {/* 1. Type + rarity identity */}
                <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, marginBottom: 10, color: ri.color }}>{ri.pips} {pullNow.rarity.toUpperCase()} · {ati.glyph} {ac.type.toUpperCase()}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={72} />
                </div>
                <div style={{ fontSize: T.sub, fontWeight: 900, color: ati.accent, marginBottom: 8 }}>{ati.glyph} {ac.name}</div>
                {/* 2. Innate — the new thing, before stats */}
                {inn && (
                  <div style={{ background: '#0a1c16', border: '1px solid #2a5040', borderRadius: 9, padding: '8px 12px', margin: '0 auto 10px', maxWidth: 300 }}>
                    <div style={{ fontSize: T.small, fontWeight: 900, color: '#7ee0c0' }}>✦ {inn.name}</div>
                    <div style={{ fontSize: T.micro, color: '#8fa0a0', lineHeight: 1.4, marginTop: 2 }}>{inn.line}</div>
                  </div>
                )}
                {/* 3. NEW TEAM POSSIBLE — ownership-aware. The recipe(s) this pull completes with
                    creatures you already own; else the nearest team it's one piece short of. */}
                {reveal.completes.length > 0 ? (
                  <div style={{ background: 'linear-gradient(180deg,#1c1810,#13110a)', border: '1px solid #6a5a2a', borderRadius: 9, padding: '9px 12px', margin: '0 auto 8px', maxWidth: 320, boxShadow: '0 0 16px #6a5a2a44' }}>
                    <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1, color: '#ffd166', marginBottom: 4 }}>⚡ NEW TEAM POSSIBLE</div>
                    {reveal.completes.slice(0, 2).map(({ recipe, partners }) => (
                      <div key={recipe.id} style={{ marginTop: 3 }}>
                        <div style={{ fontSize: T.small, fontWeight: 900, color: '#ffe08a' }}>{recipe.icon} {recipe.name}{partners.length ? <span style={{ color: '#c9b98a', fontWeight: 700 }}> — with your {partnerName(partners)}</span> : null}</div>
                        <div style={{ fontSize: T.micro, color: '#c9b98a', fontStyle: 'italic', marginTop: 1 }}>{recipe.line}</div>
                      </div>
                    ))}
                  </div>
                ) : reveal.chase ? (
                  <div style={{ fontSize: T.small, fontWeight: 800, color: '#9be7ff', marginBottom: 6 }}>⮑ one short of <b style={{ color: '#cbe8ff' }}>{reveal.chase.recipe.name}</b> — {slotLabel(reveal.chase.missing)} would finish it.</div>
                ) : (
                  <div style={{ fontSize: T.small, fontWeight: 800, color: '#9be7ff', marginBottom: 6 }}>⮑ {sameType.length >= 2 ? `With ${COMBAT_CREATURES[sameType[sameType.length - 1]].name} — full ${ac.type} squad reachable` : `Opens the ${BUILD_LINE[ac.type] || ati.nick} build`}</div>
                )}
                {pullNow.gainedCores > 0 && <div style={{ fontSize: T.micro, color: WIN, fontWeight: 800, marginBottom: 6 }}>+{pullNow.gainedCores} ⬡ toward {ac.name}'s build</div>}
                {/* 4. Stats last — dimmest, smallest */}
                <div style={{ fontSize: T.micro, color: DIM }}>HP {ac.hp} · ATK {ac.atk} · SPD {ac.speed}</div>
              </div>
            );
          })()}

          {step === 'sigil' && sigilGain && (() => {
            const ac = COMBAT_CREATURES[sigilGain.id]; const ati = TYPE_INFO[ac.type];
            return (
              <div style={{ ...calm, textAlign: 'center' }}>
                <div style={{ fontSize: T.micro, color: DIM, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>{sigilGain.ready ? '✦ SIGIL FOUND — ready to challenge' : `✦ SIGIL FOUND — ${APEX_SIGILS - sigilGain.count} more and you can challenge it`}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Sprite spriteId={ac.spriteId} color={ati.accent} glyph={ati.glyph} anim="idle" size={56} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: T.body, fontWeight: 900, color: ati.accent }}>{ati.glyph} {ac.name}'s sigil</div>
                    <div style={{ fontSize: T.small, color: '#9be7ff', fontWeight: 800, marginTop: 2 }}>{'✦'.repeat(sigilGain.count)}{'·'.repeat(APEX_SIGILS - sigilGain.count)} {sigilGain.count}/{APEX_SIGILS}</div>
                    {sigilGain.ready && <div style={{ fontSize: T.micro, color: WIN, marginTop: 3, fontWeight: 800 }}>★ Ready to challenge.</div>}
                  </div>
                </div>
              </div>
            );
          })()}

          {step === 'unlock' && unlockedNow && (() => { const g = HUNTING_GROUNDS.find((x) => x.depth === unlockedNow); return (
            <div style={{ ...calm, textAlign: 'center' }}>
              <div style={{ fontSize: T.small, fontWeight: 900, color: ACCENT, letterSpacing: 0.5 }}>🔓 THE WAY INWARD OPENS</div>
              <div style={{ fontSize: T.small, color: '#f0e2c8', marginTop: 4 }}><b>{g?.name}</b> lies open.</div>
            </div>
          ); })()}

          {step === 'ward' && wardBlock && (
            <div style={calm}>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: wardBlock.tint }}>{wardBlock.glyph} THE WAY IS SEALED — {wardBlock.name}</div>
              <div style={{ fontSize: T.small, color: '#cdd8e4', lineHeight: 1.55, fontStyle: 'italic', margin: '6px 0 8px' }}>{wardBlock.story}</div>
              <div style={{ fontSize: T.small, color: '#cdd8e4', lineHeight: 1.5 }}>🜲 {wardBlock.clue}</div>
              <div style={{ fontSize: T.micro, fontWeight: 800, color: '#9be7ff', marginTop: 6 }}>→ {wardBlock.deed.told} · {(wards[wardBlock.id]?.progress) || 0}/{wardBlock.deed.count}</div>
            </div>
          )}

          {step === 'wardSolved' && wardSolvedNow && (() => { const g = HUNTING_GROUNDS.find((x) => x.depth === wardSolvedNow.atDepth + 1); return (
            <div style={calm}>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: WIN }}>{wardSolvedNow.glyph} {wardSolvedNow.name.toUpperCase()} OPENS</div>
              <div style={{ fontSize: T.small, color: '#bfe8cf', lineHeight: 1.5, marginTop: 5 }}>The way inward to <b>{g?.name || 'the deep'}</b> lies clear — and a key relic is yours.</div>
            </div>
          ); })()}

          {step === 'holdfast' && holdfastNow && (() => {
            const picked0 = holdfastPicks[holdfastNow.depth] ?? 0;
            const needsPick = pendingHoldfastPick === holdfastNow.depth;
            const chooseBoon = (idx) => {
              const np = { ...holdfastPicks, [holdfastNow.depth]: idx };
              setHoldfastPicks(np); saveHoldfastPicks(np);
              setPendingHoldfastPick(0);
            };
            return (
              <div style={calm}>
                <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: needsPick ? 10 : 0 }}>
                  <HoldfastVignette size={narrow ? 66 : 84} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff' }}>🏚 THE HOLDFAST RECLAIMS — {holdfastNow.part} · {holdfastNow.depth}/{HOLDFAST_MAX}</div>
                    <div style={{ fontSize: T.small, color: '#cdbbe6', lineHeight: 1.5, fontStyle: 'italic', marginTop: 5 }}>{holdfastNow.beat}</div>
                    {!needsPick && (
                      <div style={{ fontSize: T.small, fontWeight: 800, color: '#cba6ff', marginTop: 8 }}>
                        {(picked0 === 1 ? holdfastNow.alt : holdfastNow.boon).icon} {(picked0 === 1 ? holdfastNow.alt : holdfastNow.boon).name}
                        <span style={{ fontWeight: 400, color: '#bfa8da' }}> — {(picked0 === 1 ? holdfastNow.alt : holdfastNow.boon).desc}</span>
                      </div>
                    )}
                  </div>
                </div>
                {needsPick && (
                  <div>
                    <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1, color: '#cba6ff', marginBottom: 6 }}>CHOOSE A BOON — this stage's standing gift, every run:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[holdfastNow.boon, holdfastNow.alt].map((b, idx) => (
                        <button key={idx} onClick={() => chooseBoon(idx)}
                          style={{ textAlign: 'left', borderRadius: 10, padding: '10px 11px', cursor: 'pointer',
                            background: '#0e0a1a', border: '1.5px solid #6a4a9a' }}>
                          <div style={{ fontSize: T.small, fontWeight: 900, color: '#eadcff' }}>{b.icon} {b.name}</div>
                          <div style={{ fontSize: T.micro, color: '#bfa8da', lineHeight: 1.35, marginTop: 2 }}>{b.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {step === 'relic' && relicChoices.length > 0 && (
            <div style={calm}>
              <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff', marginBottom: 8 }}>✦ THE BOSS LEAVES SPOILS — take one</div>
              <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {relicChoices.map((r) => (
                  <button key={r.id} onClick={() => chooseRelic(r)} title={r.lore}
                    style={{ textAlign: 'left', borderRadius: 10, padding: '10px 11px', cursor: 'pointer', background: PANEL, border: `1px solid ${LINE}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <RelicIcon r={r} size={T.body} />
                      <span style={{ fontSize: T.small, fontWeight: 900, color: r.color }}>{r.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: (RARITY_INFO[r.rarity] || {}).color || r.color }}>{(RARITY_INFO[r.rarity] || {}).pips || ''}</span>
                    </div>
                    <div style={{ fontSize: T.micro, color: '#bfb0d6', lineHeight: 1.35 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'relic' && relicChoices.length === 0 && relicDrop && (
            <div style={calm}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <RelicIcon r={relicDrop} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.micro, fontWeight: 900, letterSpacing: 1.5, color: '#cba6ff' }}>✦ RELIC TAKEN</div>
                  <div style={{ fontSize: T.sub, fontWeight: 900, color: '#eadcff', margin: '2px 0' }}>{relicDrop.name}</div>
                  <div style={{ fontSize: T.small, color: '#cba6ff', fontWeight: 700 }}>{relicDrop.desc}</div>
                  <div style={{ fontSize: T.micro, color: DIM, marginTop: 3 }}>Equip it in ✦ RELICS before your next run — found gear does nothing until worn.</div>
                </div>
              </div>
            </div>
          )}

          {last && <>
            {featCelebration}
            <button onClick={() => setResultDetails((v) => !v)}
              style={{ background: 'transparent', border: 'none', color: DIM, fontSize: T.small, fontWeight: 800, cursor: 'pointer', padding: '6px 0', letterSpacing: 0.5 }}>
              {resultDetails ? '▾ run details' : '▸ run details'}
            </button>
            {resultDetails && <RunRecap taken={taken} stats={stats} squad={squad} />}
          </>}

          {/* step dots — where you are in the reveal, no words needed */}
          {steps.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '12px 0 2px' }}>
              {steps.map((s, i) => (
                <span key={s} style={{ width: 6, height: 6, borderRadius: 3, background: i <= wonStep ? '#dcf2cf' : '#3a4a3a', boxShadow: i === Math.min(wonStep, steps.length - 1) ? `0 0 8px ${WIN}` : 'none' }} />
              ))}
            </div>
          )}
          {!last && !mustPickRelic && (
            <button onClick={() => setWonStep((s) => s + 1)} style={{ width: '100%', marginTop: 10, padding: '13px 0', border: 'none', borderRadius: 10, background: '#1c2a1c', color: '#cfe8c0', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', boxShadow: `0 0 0 1px ${WIN}44` }}>CONTINUE →</button>
          )}
          {last && (
            <button onClick={newRun} style={{ width: '100%', marginTop: 10, padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
          )}
        </div>
      );
    }
    if (runPhase === 'lost') { const lostArt = enteredRing?.img || caughtFrom?.img; return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: narrow ? '22px 15px' : '30px 24px', marginBottom: 12, textAlign: 'center',
        // Somber: the ring that swallowed you, heavily darkened + desaturated — the place wins, you fall.
        background: lostArt
          ? `linear-gradient(180deg, rgba(14,6,6,0.82) 0%, rgba(10,6,7,0.93) 60%, rgba(8,5,6,0.97) 100%), url(${lostArt}) center/cover no-repeat`
          : 'radial-gradient(ellipse at top, #241313 0%, #0c0808 72%)',
        boxShadow: `inset 0 0 120px rgba(0,0,0,0.7), 0 0 26px ${LOSS}22`, filter: 'saturate(0.78)' }}>
        <div style={{ fontSize: narrow ? 34 : 46, fontWeight: 900, color: '#ffd7d7', letterSpacing: 2, textShadow: `0 0 24px ${LOSS}, 0 0 60px ${LOSS}44, 0 2px 6px #000` }}>SQUAD DOWN</div>
        <div style={{ fontSize: T.body, color: '#d8b8b8', margin: '6px 0 16px', textShadow: '0 1px 5px #000' }}>Fell at {wave.boss ? '💀 ' : ''}{wave.name} — wave {waveIdx + 1}/{WAVE_COUNT}.</div>
        {featCelebration}
        <SlagBanked earned={earned} balance={slag} />
        {earned > 0 && <div style={{ fontSize: T.small, color: '#c9c98a', marginTop: 4, marginBottom: 2 }}>⚒ {earned} banked — the Forge makes it permanent.</div>}
        <CoresBanked coresRun={coresRun} />
        <button onClick={() => setResultDetails((v) => !v)}
          style={{ background: 'transparent', border: 'none', color: DIM, fontSize: T.small, fontWeight: 800, cursor: 'pointer', padding: '6px 0', letterSpacing: 0.5 }}>
          {resultDetails ? '▾ run details' : '▸ run details'}
        </button>
        {resultDetails && <RunRecap taken={taken} stats={stats} squad={squad} />}
        <button onClick={newRun} style={{ width: '100%', marginTop: 8, padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
      </div>
    ); }
    return null;
  })();

  // A finished fight's result (won / lost / challenge) used to render BELOW the arena,
  // pushing the payoff + NEW RUN below the fold on a phone. Surface it at the TOP for
  // these terminal phases — matching how 'drop' and 'endless-over' already present —
  // and drop the now-redundant wave header. The frozen board + log stay below to review.
  const resultTop = ['won', 'lost', 'challenge-won', 'challenge-lost'].includes(runPhase);
  return (
    <div>
      {resultTop && <div style={{ marginBottom: 12 }}>{banner}</div>}
      {!resultTop && <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {endless ? (
          <div style={{ flex: 1, height: 8, borderRadius: 3, background: wave.boss ? LOSS : '#6a4a9a', boxShadow: `0 0 6px ${wave.boss ? LOSS : '#6a4a9a'}88` }} />
        ) : runWaves.map((w, i) => (
          <div key={i} title={w.name} style={{ flex: w.boss ? 1.4 : 1, height: 8, borderRadius: 3,
            background: i < waveIdx || runPhase === 'won' ? WIN : i === waveIdx ? (w.boss ? LOSS : ACCENT) : '#26263a',
            border: w.boss ? `1px solid ${LOSS}99` : 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: T.small, color: DIM, flex: 1 }}>
          <b style={{ fontSize: T.body, letterSpacing: 0.3, color: wave.boss ? '#ffb38a' : endless ? '#cba6ff' : '#eee', textShadow: `0 1px 5px #000, 0 0 16px ${wave.boss ? LOSS : endless ? '#cba6ff' : ACCENT}44` }}>
            {endless ? <>♾️ Round {endlessRound}{wave.boss ? ' · WARDEN' : ''}</> : <>{wave.boss ? '💀 ' : ''}Wave {waveIdx + 1}/{WAVE_COUNT} · {wave.name}</>}
          </b> — {wave.blurb}
        </div>
        {runPhase === 'fighting' && runAuto && <span style={{ flexShrink: 0, fontSize: T.micro, fontWeight: 900, color: '#9be7ff', background: '#14233a', border: '1px solid #5aa9ff', borderRadius: 8, padding: '3px 8px' }}>⚡ AUTO</span>}
      </div>
      </>}
      <BuildStrip taken={taken} />
      <FightView fight={fight} narrow={narrow} banner={resultTop ? null : banner} bossUid={wave.boss ? 'B0' : null}
        auto={runAuto} onToggleAuto={frontierRun ? null : (n) => { setAuto(n); fight.setLiveAuto(n); }} bgImg={enteredRing?.img} />
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
    const dummy = { ...COMBAT_CREATURES.glowtail, name: 'Straw Target', spriteId: 'glowtail', hp: 90, maxHp: 90, atk: 6, speed: 1 };
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
          <Sprite spriteId="cinderpaw" color={ti.accent} glyph={ti.glyph} size={140} />
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

export function SeamLab({ slag = 0, onSlag, version }) {
  const vw = useViewport();
  const narrow = vw < 760;
  const [tab, setTab] = useState(() => {
    const learned = !!localStorage.getItem(LEARN_DONE_KEY);
    const hasClears = loadReclaimed() > 0;
    return (!learned && !hasClears) ? 'learn' : 'run';
  }); // 'learn' | 'run' | 'sandbox'
  // Sandbox is a dev/debug matchup tool — keep it out of a tester's face.
  // It reappears once beta mode is toggled on (⚙ Settings → Beta) + a reload.
  const [devTools] = useState(loadBeta);

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ background: tab === key ? '#16202e' : PANEL, color: tab === key ? '#eaf2ff' : '#999', border: `2px solid ${tab === key ? SEL : LINE}`, borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontSize: T.body, fontWeight: 800 }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.98)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{FX_STYLE}</style>
      {/* Version badge pinned to the viewport so it's visible everywhere — including
          mid-battle when the header has scrolled away. */}
      {version && <div style={{ position: 'fixed', top: 6, right: 8, zIndex: 10000, fontSize: 10, color: '#cfcfd8', background: 'rgba(26,26,34,0.92)', padding: '3px 8px', borderRadius: 4, letterSpacing: 1, fontFamily: 'monospace', border: '1px solid #444', fontWeight: 600, pointerEvents: 'none' }}>{version}</div>}
      <FeedbackButton version={version} />
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
          {devTools && tabBtn('sandbox', '🔬 Sandbox')}
        </div>
        {tab === 'learn' ? <LearnMode narrow={narrow} onGraduate={() => { localStorage.setItem(LEARN_DONE_KEY, '1'); setTab('run'); }} /> : tab === 'sandbox' && devTools ? <Sandbox narrow={narrow} /> : <RunMode narrow={narrow} slag={slag} onSlag={onSlag} />}
      </div>
    </div>
  );
}

export default SeamLab;
