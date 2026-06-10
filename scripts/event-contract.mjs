#!/usr/bin/env node
// ─── Engine ↔ UI event contract (vF-CD, born from a review catch) ──────────────
// The UI's feedLine/popupsForEvent dispatch on event.type and read type-specific
// fields. New engine event types (thorns/blight/hexbleed in vF-CA) crashed the live
// feed because nothing pinned that contract. This test runs REAL battles chosen to
// emit every tick type and asserts (a) every emitted type is known, and (b) each
// event carries the exact fields the UI reads for that type. Add a new engine event
// WITHOUT teaching the UI about it → this fails.

import { makeUnitDef, createBattleState, createAIDriver } from '../src/engine/combat/index.js';
import { runBattle } from '../src/engine/combat/engine.js';

// type → fields the UI (SeamLab feedLine + popupsForEvent) dereferences.
const CONTRACT = {
  'round-start': ['round', 'firstSide'],
  'battle-end': ['winner', 'rounds'],
  turn: ['actor.side', 'actor.name', 'skill.name', 'actor.uid'],
  burn: ['target.uid', 'target.name', 'dmg', 'stacksLeft'],
  regen: ['target.uid', 'target.name', 'healed', 'stacksLeft'],
  poison: ['target.uid', 'target.name', 'dmg'],
  doom: ['target.uid', 'target.name', 'dmg'],
  frozen: ['actor.name'],
  thorns: ['actor.name', 'target.uid', 'target.name', 'dmg'],
  blight: ['actor.name', 'target.uid', 'target.name', 'dmg'],
  hexbleed: ['target.uid', 'target.name', 'dmg'],
};
const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);

let checked = 0, failed = 0;
const seen = new Set();
function audit(e, label) {
  seen.add(e.type);
  const fields = CONTRACT[e.type];
  if (!fields) { failed++; console.error(`✗ [${label}] UNKNOWN event type '${e.type}' — feedLine will fall through and may crash`); return; }
  for (const f of fields) {
    if (get(e, f) === undefined) { failed++; console.error(`✗ [${label}] event '${e.type}' missing field '${f}'`); }
  }
  checked++;
}

async function battle(label, aIds, bIds, seed) {
  const A = aIds.map((id) => makeUnitDef(id, 'Balanced'));
  const B = bIds.map((id) => makeUnitDef(id, 'Greedy'));
  const state = createBattleState(A, B, seed);
  await runBattle(state, { A: createAIDriver(), B: createAIDriver() }, (e) => audit(e, label));
}

// Squads chosen to fire every tick family: side-A Bulwark (thorns), Mender (blight + regen),
// Hexer (vuln → hexbleed), Reactor (burn), Warden enemy (frozen on us is fine either way).
await battle('support', ['stoneward', 'mossback', 'cinderpaw'], ['fizzpop', 'glowtail', 'cinderpaw'], 12345);
await battle('hexer', ['blightcap', 'hexmoth', 'cinderpaw'], ['stoneward', 'ironwall'], 23456);
await battle('warden', ['frostwarden', 'rimecaller', 'cinderpaw'], ['swiftpaw', 'dartwing'], 34567);

const expected = ['turn', 'thorns', 'blight', 'burn'];
for (const t of expected) if (!seen.has(t)) { failed++; console.error(`✗ expected to OBSERVE event type '${t}' in these battles — test squads may need updating`); }

if (failed) { console.error(`event-contract: ${failed} FAILED (${checked} checks, saw: ${[...seen].join(', ')})`); process.exit(1); }
console.log(`✓ event-contract OK — ${checked} events checked across ${seen.size} types (${[...seen].join(', ')})`);
