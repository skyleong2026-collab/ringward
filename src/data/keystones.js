// keystones.js — KEYSTONE CRAFTING math (vF-BL; pure, headlessly tested in
// scripts/keystones.mjs). The top relic tier you don't FIND — you forge it, with a
// success %. Feed the forge SHARDS (salvaged from relics you don't want) + slag, pick a
// heat, and gamble: higher heat = better odds + more shards. A failed pour gives back
// half the shards (a floor, never a gut-punch). The keystone RELICS themselves (with their
// `apply` effects) live with the other relics in SeamLab; this module is only the economy.

// Shards a salvaged relic yields, by rarity.
export const SHARD_YIELD = { Common: 1, Rare: 3, Legendary: 7, Unique: 12, Keystone: 15 };
export function shardYield(rarity) { return SHARD_YIELD[rarity] || 1; }

// The three heats: more shards + slag buys better odds.
export const KEYSTONE_TIERS = [
  { id: 'spark',     name: 'A Spark',     shards: 6,  slag: 25, odds: 0.40 },
  { id: 'temper',    name: 'Temper It',   shards: 10, slag: 35, odds: 0.65 },
  { id: 'forgetrue', name: 'Forge True',  shards: 16, slag: 50, odds: 0.90 },
];
export const TIER_BY_ID = Object.fromEntries(KEYSTONE_TIERS.map((t) => [t.id, t]));

// A failed pour returns half the shards (floored). Slag is always spent.
export function craftRefund(tier) { return Math.floor((tier?.shards || 0) / 2); }

// Resolve one craft attempt (the caller has already checked affordability + spent the cost).
// rand() in [0,1). Pure → returns what the caller should apply:
//   { success, granted, refund }
// - success false → refund half the shards.
// - success true, a keystone left to win → granted = its id, refund 0.
// - success true but you already own them all → granted null, refund the full shards.
export function resolveCraft(tier, ownedKeystoneIds = [], allKeystoneIds = [], rand = Math.random) {
  if (rand() >= tier.odds) return { success: false, granted: null, refund: craftRefund(tier) };
  const pool = allKeystoneIds.filter((id) => !ownedKeystoneIds.includes(id));
  if (!pool.length) return { success: true, granted: null, refund: tier.shards }; // nothing left → shards back
  const granted = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  return { success: true, granted, refund: 0 };
}
