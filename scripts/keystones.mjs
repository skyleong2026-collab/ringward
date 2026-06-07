// keystones.mjs — Keystone crafting economy verification (headless, no DOM/React).
// Proves the % math + the fail-floor + the all-owned fallback, so the gamble is honest.
import { SHARD_YIELD, shardYield, KEYSTONE_TIERS, TIER_BY_ID, craftRefund, resolveCraft } from '../src/data/keystones.js';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); else console.log('  ✓ ' + msg); };

console.log('[salvage yields rise with rarity]');
ok(shardYield('Common') === 1 && shardYield('Rare') === 3 && shardYield('Legendary') === 7, 'Common 1 < Rare 3 < Legendary 7 shards');
ok(shardYield('nonsense') === 1, 'an unknown rarity still yields at least 1');

console.log('\n[three heats, rising odds + cost]');
ok(KEYSTONE_TIERS.length === 3, 'three heats');
ok(KEYSTONE_TIERS.every((t) => t.odds > 0 && t.odds <= 1), 'every heat has a real probability');
ok(TIER_BY_ID.spark.odds < TIER_BY_ID.temper.odds && TIER_BY_ID.temper.odds < TIER_BY_ID.forgetrue.odds, 'odds rise spark < temper < forgetrue');
ok(TIER_BY_ID.spark.shards < TIER_BY_ID.temper.shards && TIER_BY_ID.temper.shards < TIER_BY_ID.forgetrue.shards, 'shard cost rises with the heat');

console.log('\n[a failed pour refunds half the shards]');
ok(craftRefund(TIER_BY_ID.spark) === 3 && craftRefund(TIER_BY_ID.temper) === 5 && craftRefund(TIER_BY_ID.forgetrue) === 8, 'refund = half the shards, floored');

console.log('\n[resolveCraft is honest to the odds]');
const ALL = ['k_warden', 'k_emberheart', 'k_lifespring', 'k_apex'];
// rand just above odds → fail + half refund (slag already spent by caller).
let r = resolveCraft(TIER_BY_ID.forgetrue, [], ALL, () => 0.95);
ok(!r.success && r.granted === null && r.refund === 8, 'roll above the odds → fail, half shards back');
// rand below odds → success, grants an unowned keystone, no refund.
r = resolveCraft(TIER_BY_ID.spark, [], ALL, () => 0.0);
ok(r.success && ALL.includes(r.granted) && r.refund === 0, 'roll under the odds → success, a keystone won');
// success but you already own them all → no grant, full shards back (never wasted).
r = resolveCraft(TIER_BY_ID.forgetrue, ALL, ALL, () => 0.0);
ok(r.success && r.granted === null && r.refund === TIER_BY_ID.forgetrue.shards, 'all keystones owned → shards returned, not burned');
// boundary: exactly at the odds is a FAIL (>= odds fails), so 90% is not a guarantee.
r = resolveCraft(TIER_BY_ID.forgetrue, [], ALL, () => 0.90);
ok(!r.success, 'rand exactly at the odds fails — even Forge True is a gamble');

if (fails.length) {
  console.error('\n✗ keystones FAILED:\n  - ' + fails.join('\n  - '));
  process.exit(1);
}
console.log('\n✓ keystones OK — salvage yields, rising heats, honest odds, fail-floor, all-owned fallback.');
