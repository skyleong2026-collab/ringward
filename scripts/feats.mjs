// Headless test for the Feats evaluator: thresholds, the "catch all" dynamic need,
// tally math, and clamping. Pure projection — easy to pin down exactly.
import { FEATS, FEAT_GROUPS, evalFeat, evalFeats, featTally } from '../src/data/feats.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };

const byId = (arr, id) => arr.find((f) => f.id === id);

// --- structure ---
ok(FEATS.length >= 12, 'a meaningful set of feats');
ok(FEATS.every((f) => f.id && f.name && f.desc && f.group && f.tier && f.icon), 'every feat is fully described');
ok(new Set(FEATS.map((f) => f.id)).size === FEATS.length, 'feat ids are unique');
ok(FEATS.every((f) => FEAT_GROUPS.includes(f.group)), 'every feat belongs to a known group');
ok(FEATS.every((f) => f.needStat || typeof f.need === 'number'), 'every feat has a need or a needStat');

// --- a fresh save: nothing done ---
const fresh = { deepestRing: 1, reclaimed: 0, caught: 3, rosterSize: 17, gauntletBest: 0, wardsSolved: 0, relicsOwned: 0, keystonesOwned: 0, crossings: 0 };
const f0 = evalFeats(fresh);
ok(byId(f0, 'first_boss').done === false, 'no ring boss beaten yet → First Blood locked');
ok(byId(f0, 'collector_5').done === false && byId(f0, 'collector_5').have === 3, '3/5 caught shows progress, not done');
ok(featTally(fresh).done === 0, 'fresh save has 0 feats done');

// --- threshold edges ---
ok(evalFeat(byId(FEATS, 'collector_5'), { caught: 4 }).done === false, '4 caught < 5 → locked');
ok(evalFeat(byId(FEATS, 'collector_5'), { caught: 5 }).done === true, '5 caught === need → done');
ok(evalFeat(byId(FEATS, 'gauntlet_10'), { gauntletBest: 9 }).done === false, 'R9 < 10 → locked');
ok(evalFeat(byId(FEATS, 'gauntlet_10'), { gauntletBest: 12 }).done === true, 'R12 ≥ 10 → done');

// --- dynamic "catch all" need tracks rosterSize ---
ok(evalFeat(byId(FEATS, 'collector_all'), { caught: 17, rosterSize: 17 }).done === true, 'caught all → done');
ok(evalFeat(byId(FEATS, 'collector_all'), { caught: 16, rosterSize: 17 }).done === false, '16/17 → not yet');
ok(evalFeat(byId(FEATS, 'collector_all'), { caught: 20, rosterSize: 0 }).need === 1, 'missing rosterSize falls back to need 1 (no divide-by-zero)');

// --- Type mastery: tiered on typesMastered (distinct Types fielded in ring clears, 0..8) ---
ok(evalFeat(byId(FEATS, 'types_3'), { typesMastered: 3 }).done === true, '3 Types → Many Hands done');
ok(evalFeat(byId(FEATS, 'types_3'), { typesMastered: 2 }).done === false, '2 Types → Many Hands not yet');
ok(evalFeat(byId(FEATS, 'types_all'), { typesMastered: 8 }).done === true, 'all 8 Types → Every Hand done');
ok(evalFeat(byId(FEATS, 'types_all'), { typesMastered: 7 }).done === false, '7/8 Types → Every Hand not yet');
ok(evalFeat(byId(FEATS, 'types_all'), {}).done === false, 'no typesMastered stat → not done (defaults 0)');

// --- progress clamps, rawHave preserved ---
const overshoot = evalFeat(byId(FEATS, 'first_boss'), { reclaimed: 8 });
ok(overshoot.have === 1 && overshoot.rawHave === 8 && overshoot.pct === 1, 'have clamps to need; pct caps at 1; rawHave kept');

// --- Cook the Book: tiered on recipesCooked (distinct recipes fielded in ring clears) ---
ok(evalFeat(byId(FEATS, 'recipes_3'), { recipesCooked: 3 }).done === true, '3 recipes cooked → First Dishes done');
ok(evalFeat(byId(FEATS, 'recipes_3'), { recipesCooked: 2 }).done === false, '2 recipes → First Dishes not yet');
ok(evalFeat(byId(FEATS, 'recipes_6'), { recipesCooked: 6 }).done === true, '6 recipes → Short-Order done');
ok(evalFeat(byId(FEATS, 'recipes_all'), { recipesCooked: 11, recipesTotal: 11 }).done === true, 'all recipes cooked → Cook the Book done');
ok(evalFeat(byId(FEATS, 'recipes_all'), { recipesCooked: 10, recipesTotal: 11 }).done === false, '10/11 → not yet');

// --- a maxed save: everything done ---
const maxed = { deepestRing: 8, reclaimed: 8, caught: 17, rosterSize: 17, gauntletBest: 15, wardsSolved: 3, relicsOwned: 12, keystonesOwned: 2, crossings: 2, typesMastered: 8, recipesCooked: 11, recipesTotal: 11 };
ok(featTally(maxed).done === FEATS.length, 'a maxed save completes every feat');
ok(Math.abs(featTally(maxed).pct - 1) < 1e-9, 'maxed completion = 100%');

console.log(`feats: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
