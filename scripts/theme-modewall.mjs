// theme-modewall.mjs — §28 verification (headless, no DOM/VFX).
// Proves the four acceptance criteria: defaults apply, selection persists,
// PvP-only disguise is gated out of PvE, and combat is identical with any theme.
import {
  combatType, defaultThemeFor, maxUnlockedTier,
  getEquipped, setEquipped, resolveAppearance,
} from '../src/engine/themeSystem.js';
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

// Tiny injectable store so persistence is testable without a browser.
function memStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); else console.log('  ✓ ' + msg); };

// Fixtures
const fizz = { id: 'fizzpop', type: 'Reactor', level: 7 };       // override default + tier3
const lowReactor = { id: 'spark', archetype: 'Spark', level: 1 }; // legacy key, tier1 only
const booster = { id: 'conduit', archetype: 'Echo', level: 4 };   // Echo→Booster

console.log('\n[true Type — engine read, blind to themes]');
ok(combatType(fizz) === 'Reactor', "combatType reads new §23 type ('Reactor')");
ok(combatType(booster) === 'Booster', "combatType maps legacy 'Echo' → 'Booster'");

console.log('\n[defaults apply]');
ok(defaultThemeFor(fizz) === 'fire', 'per-creature default (fizzpop → fire)');
ok(defaultThemeFor({ id: 'x', type: 'Mender', level: 1 }) === 'vine', 'per-Type default (Mender → vine)');
ok(resolveAppearance(booster, 'pve', memStore()).themeId === 'water', 'unequipped creature renders its default theme');

console.log('\n[tier unlock gates on skill level]');
ok(maxUnlockedTier(lowReactor) === 1, 'level 1 → only tier 1 unlocked');
ok(maxUnlockedTier(fizz) === 3, 'level 7 → tier 3 unlocked');

console.log('\n[selection persists]');
const store = memStore();
setEquipped(booster, { themeId: 'water', tier: 2 }, store);
const eq = getEquipped(booster, store);
ok(eq && eq.themeId === 'water' && eq.tier === 2, 'equipped theme/tier round-trips through storage');

console.log('\n[tier clamps to what is earned]');
setEquipped(lowReactor, { themeId: 'fire', tier: 3 }, store); // ask for tier 3 at level 1
ok(resolveAppearance(lowReactor, 'pve', store).tier === 1, 'equipped tier 3 clamps to unlocked tier 1');

console.log('\n[the mode-wall: PvP-only disguise is gated out of PvE]');
setEquipped(booster, { disguiseType: 'Bulwark' }, store); // pretend to be a tank
const pve = resolveAppearance(booster, 'pve', store);
const pvp = resolveAppearance(booster, 'pvp', store);
ok(pve.displayedType === 'Booster' && pve.honest && !pve.disguised, 'PvE shows TRUE Type, motion locked, honest');
ok(pve.motionLocked === true, 'PvE locks motion grammar to the true Type');
ok(pvp.displayedType === 'Bulwark' && pvp.disguised && !pvp.honest, 'PvP honors the disguise');
ok(combatType(booster) === 'Booster', 'engine Type is STILL true under a PvP disguise (math unaffected)');

console.log('\n[combat is identical with any theme equipped]');
// Equip wild themes + a disguise on the golden squads, then run the deterministic
// fight. The engine never imports themes, so the transcript must be byte-identical
// to the blessed manual-golden signature.
const cstore = memStore();
setEquipped({ id: 'fizzpop' }, { themeId: 'water', tier: 3, disguiseType: 'Mender' }, cstore);
setEquipped({ id: 'cinderpaw' }, { themeId: 'vine', tier: 2, disguiseType: 'Assassin' }, cstore);
const r = await simulateAIvsAI(
  [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
  [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')],
  1337,
);
function checksum(result) {
  const t = result.log.map((e) => {
    if (e.type === 'round-start') return `R${e.round}:first=${e.firstSide}`;
    if (e.type === 'turn') return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}]${e.amplifiedByBurn ? '*' : ''}(${(e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.killed ? 'X' : ''}`).join(',')})`;
    if (e.type === 'burn') return `R${e.round}:burn ${e.target.uid}-${e.dmg}${e.killed ? 'X' : ''}->${e.stacksLeft}`;
    if (e.type === 'battle-end') return `END:${e.winner}@${e.rounds}`;
    return `?${e.type}`;
  }).join('\n');
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h;
}
ok(checksum(r) === 2008119257, 'fight checksum unchanged with themes + disguises equipped (2008119257)');

if (fails.length) {
  console.error(`\n✗ theme-modewall FAILED (${fails.length}):`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✓ theme-modewall OK — defaults, persistence, tier-gating, mode-wall, and combat-invariance all hold.');
