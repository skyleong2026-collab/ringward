// ── RELIC DATA — the loot collection + recut alternates, ONE shared source (vF-CH, S7). ──
// Imported by BOTH the live game (src/screens/SeamLab.jsx — renders icon/name/desc/lore, and
// applies the equipped loadout via relicMods) AND the balance sim (scripts/sim/run-sim-tier2.mjs
// — derives the §31 RECUT PARITY fixtures' applies from cutEffect). Killing the hand-mirrored
// RELIC_CUTS copy in the sim closes the drift-bug class (the old ⚠ MIRROR warning is gone).
//
// PLAIN JS — no React, no localStorage, no engine — so the sim imports it without the UI. The
// React-coupled pieces (state, persistence, RELIC_SETS bonuses, relicMods, rollRelicChoices)
// stay in SeamLab; this module is just the data + the two PURE selectors the sim shares.
//
// Colors are inline hex (identical to SeamLab's ACCENT/CHG/BURN/WIN constants) so nothing renders
// differently. apply() bodies are copied verbatim from SeamLab — byte-identical mod math.

const ACCENT = '#e8a040';
const CHG = '#f5a623';
const BURN = '#ff5a2a';
const WIN = '#7ed321';

export const RELICS = [
  // Commons — one clean stat, the bread-and-butter of a loadout.
  { id: 'r_ironwood', img: '/art/relics/r_ironwood.jpg',  icon: '🌰', color: '#c9a06a', name: 'Ironwood Charm', rarity: 'Common', desc: '+18% max HP.',                       lore: 'Blight-hardened heartwood. Heavy — and it makes you heavy too.',  apply: (m) => { m.hpMult *= 1.18; } },
  { id: 'r_quickcore', img: '/art/relics/r_quickcore.jpg', icon: '⚡', color: CHG,       name: 'Quick Core',     rarity: 'Common', desc: 'Start every fight +2 charge.',       lore: 'Still warm to the touch. It wants to go.',                       apply: (m) => { m.chargeStart += 2; } },
  { id: 'r_menderknot', img: '/art/relics/r_menderknot.jpg',icon: '💚', color: WIN,       name: "Mender's Knot",  rarity: 'Common', desc: 'Healing is +50% stronger.',          lore: 'Tied by a healer who climbed these rings before you.',           apply: (m) => { m.healMult *= 1.5; } },
  // Rares — bigger, most with a small second edge.
  { id: 'r_whetfang', img: '/art/relics/r_whetfang.jpg',   icon: '⚔️', color: '#ff8a4a', name: 'Whetstone Fang', rarity: 'Rare', desc: '+35% damage.',                        lore: 'A tooth filed to an edge that never seems to dull.',             apply: (m) => { m.dmgMult *= 1.35; } },
  { id: 'r_emberbrand', img: '/art/relics/r_emberbrand.jpg', icon: '🔥', color: BURN,      name: 'Ember Brand',    rarity: 'Rare', desc: 'Burns +2 stacks, +10% damage.',       lore: 'It smoulders against the cold of the deep rings.',              apply: (m) => { m.burnBonus += 2; m.dmgMult *= 1.1; } },
  { id: 'r_bulwark', img: '/art/relics/r_bulwark.jpg',    icon: '🛡️', color: '#7fd6ff', name: 'Bulwark Stone',  rarity: 'Rare', desc: '+30% max HP and +30% shields.',       lore: 'A shard of the Fallen Gate that still remembers holding.',       apply: (m) => { m.hpMult *= 1.3; m.blockMult *= 1.3; } },
  { id: 'r_reckless', img: '/art/relics/r_reckless.jpg',   icon: '🩸', color: '#ff6b6b', name: 'Reckless Charm', rarity: 'Rare', desc: '+55% damage, −18% max HP.',           lore: 'Climb angry, climb fast — and mind the long way down.',         apply: (m) => { m.dmgMult *= 1.55; m.hpMult *= 0.82; } },
  // Legendaries — run-defining, with a real trade.
  { id: 'r_bloodpact', img: '/art/relics/r_bloodpact.jpg', icon: '❤️‍🔥', color: '#ff4d6d', name: 'Bloodpact',    rarity: 'Legendary', desc: '+30% damage, +40% healing, −10% HP.', lore: 'What you pour out comes back doubled. Some of you stays behind.', apply: (m) => { m.dmgMult *= 1.3; m.healMult *= 1.4; m.hpMult *= 0.9; } },
  { id: 'r_glassedge', img: '/art/relics/r_glassedge.jpg', icon: '🗡️', color: '#e8e2ff', name: 'Glass Edge',     rarity: 'Legendary', desc: '+70% damage, −30% max HP.',          lore: 'It cuts through anything. Including the hand that holds it.',     apply: (m) => { m.dmgMult *= 1.7; m.hpMult *= 0.7; } },
  { id: 'r_dropshard', img: '/art/relics/r_dropshard.jpg', icon: '✦',  color: ACCENT,    name: 'Drop-Shard',     rarity: 'Legendary', desc: '+18% damage, +18% HP, +1 charge.',   lore: 'A splinter of whatever fell. It hums in tune with your cores.',   apply: (m) => { m.dmgMult *= 1.18; m.hpMult *= 1.18; m.chargeStart += 1; } },
  // VERB relics (vF-AF) — not a stat, a RULE. Conditional and build-defining; they hook
  // the shared combat path (opener/apex/shatter) so the whole squad gets the verb.
  { id: 'r_ambush', img: '/art/relics/r_ambush.jpg',    icon: '🎯', color: '#ffd166',  name: "Ambusher's Edge",rarity: 'Rare',      desc: 'First hit on a full-HP enemy: +25% damage.', lore: 'Strike before they know you are even there.',                  apply: (m) => { m.opener = true; } },
  { id: 'r_frostbite', img: '/art/relics/r_frostbite.jpg', icon: '❄️', color: '#7fd6ff',  name: 'Frostbite Charm',rarity: 'Rare',      desc: 'Hits on a FROZEN enemy deal +50%. Pairs with a Warden.',     lore: 'Cold makes a thing brittle. Then you break it.',               apply: (m) => { m.shatter = true; } },
  { id: 'r_totem', img: '/art/relics/r_totem.jpg',     icon: '🐺', color: '#ff7a9c',  name: "Hunter's Totem", rarity: 'Legendary', desc: 'Every kill sharpens that grunling +8% damage — stacks all fight.', lore: 'Blood remembers. The pack grows keener with every fall.',     apply: (m) => { m.apex = true; } },
  { id: 'r_vampiric', img: '/art/relics/r_vampiric.jpg',  icon: '🩸', color: '#c83a5a',  name: 'Vampiric Edge',  rarity: 'Legendary', desc: 'Heal 15% of all damage you deal.',             lore: 'It takes a little life each time it bites — and gives it to you.', apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.15; } },
  // More stat/trade relics — widen the build space (a healer kit, a berserker kit, tempo).
  { id: 'r_stoneblood', img: '/art/relics/r_stoneblood.jpg',icon: '🪨', color: '#a89070',  name: 'Stoneblood',     rarity: 'Common',    desc: '+22% max HP.',                               lore: 'Slow to bleed, slower to fall.',                              apply: (m) => { m.hpMult *= 1.22; } },
  { id: 'r_wrathcore', img: '/art/relics/r_wrathcore.jpg', icon: '😤', color: '#ff5a3c',  name: 'Wrathcore',      rarity: 'Rare',      desc: '+42% damage, −12% healing.',                 lore: 'All forward. Mending is for after — if there is an after.',    apply: (m) => { m.dmgMult *= 1.42; m.healMult *= 0.88; } },
  { id: 'r_surgeon', img: '/art/relics/r_surgeon.jpg',   icon: '🧰', color: '#7be0a0',  name: "Surgeon's Kit",  rarity: 'Rare',      desc: '+70% healing, −12% damage.',                 lore: 'Keep everyone standing and the rest sorts itself out.',        apply: (m) => { m.healMult *= 1.7; m.dmgMult *= 0.88; } },
  { id: 'r_frenzy', img: '/art/relics/r_frenzy.jpg',    icon: '🔆', color: '#ffb84d',  name: 'Frenzy Totem',   rarity: 'Legendary', desc: '+20% damage and start every fight +1 charge.', lore: 'It will not let you wait. Neither will what is coming.',       apply: (m) => { m.dmgMult *= 1.2; m.chargeStart += 1; } },
  { id: 'r_reaper', img: '/art/relics/r_reaper.jpg',    icon: '☠️', color: '#c0c0d8',  name: "Reaper's Mark",  rarity: 'Legendary', desc: '+40% damage to enemies already below half HP.', lore: 'Finish what the climb started. Leave nothing standing.',      apply: (m) => { m.executioner = (m.executioner || 0) + 0.4; } },
  { id: 'r_bramble', img: '/art/relics/r_bramble.jpg',   icon: '🌵', color: '#7fae5a',  name: 'Bramble Hide',   rarity: 'Rare',      desc: 'Attackers take 25% of their hit straight back.', lore: 'Touch a thornbush and it touches you back.',                  apply: (m) => { m.thorns = (m.thorns || 0) + 0.25; } },
  { id: 'r_phoenix',   img: '/art/relics/r_phoenix.jpg',   icon: '🪶', color: '#ffb84d',  name: 'Phoenix Feather', rarity: 'Legendary', desc: 'Each grunling survives one lethal blow per fight (revives at 30% HP).', lore: 'A single bright feather, warm to the touch. It does not burn — it remembers how to come back.', apply: (m) => { m.phoenix = true; } },
  { id: 'r_reservoir', img: '/art/relics/r_reservoir.jpg', icon: '🌀', color: CHG,        name: 'Reservoir Core',  rarity: 'Rare',      desc: 'Every kill banks +2 charge on the grunling that landed it.', lore: 'It drinks the last spark of whatever falls to you, and saves it for the next blow.', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
  // ── KEYSTONES (vF-BL) — the top tier you don't FIND, you FORGE (Forge tab → shards + a %).
  // Build-defining, no random drop or summon. `craftOnly` keeps them out of the loot pool. ──
  { id: 'k_warden',    icon: '🜸', color: '#9be7ff', name: "Warden's Keystone", rarity: 'Keystone', keystone: true, craftOnly: true, desc: '+28% max HP, +28% shields, +14% damage.', lore: 'Forged in the old way, two cores welded as one — the wall and the spear, finally on the same side.', apply: (m) => { m.hpMult *= 1.28; m.blockMult *= 1.28; m.dmgMult *= 1.14; } },
  { id: 'k_emberheart',icon: '🔥', color: BURN,      name: 'Emberheart Core',   rarity: 'Keystone', keystone: true, craftOnly: true, desc: 'Burns +3 stacks, +28% damage, start +1 charge.', lore: 'A core that never cooled. It carries the first fire your people lit at the rim, and it is still angry.', apply: (m) => { m.burnBonus += 3; m.dmgMult *= 1.28; m.chargeStart += 1; } },
  { id: 'k_lifespring',icon: '💧', color: '#6fe0a0', name: 'Lifespring Knot',    rarity: 'Keystone', keystone: true, craftOnly: true, desc: 'Healing +70% stronger, +22% max HP.', lore: 'Knotted from the clean water of the Stillpool, the one mercy the blight never reached.', apply: (m) => { m.healMult *= 1.7; m.hpMult *= 1.22; } },
  { id: 'k_apex',      icon: '👑', color: ACCENT,    name: 'Drop-Forged Crown',  rarity: 'Keystone', keystone: true, craftOnly: true, desc: '+32% damage, +20% max HP, +20% healing, start +1 charge.', lore: 'Beaten from a splinter of whatever fell. To wear it is to carry a piece of the Drop inward, toward the rest of it.', apply: (m) => { m.dmgMult *= 1.32; m.hpMult *= 1.2; m.healMult *= 1.2; m.chargeStart += 1; } },
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// ── RELIC RECUT (§31, vF-CA) — the build-EXPRESSION slag sink. Each listed relic can be
// re-forged into an alternate "cut": SAME power budget, DIFFERENT build role (e.g. raw
// damage → tempo, or → freeze-synergy). The relic's own desc/apply is the DEFAULT (cut 0);
// RELIC_CUTS[id] holds the alternates (cut 1, 2…). No power creep (cuts are sidegrades, sim-
// tuned in Phase 2) → respects the §22 anti-treadmill lock. "Opens a build, not a stat."
export const RELIC_CUTS = {
  r_whetfang: [
    { name: 'Tempo Edge', desc: '+28% damage, start every fight +1 charge.', apply: (m) => { m.dmgMult *= 1.28; m.chargeStart += 1; } },
    { name: 'Frostfang', desc: '+30% damage; hits on FROZEN enemies shatter for more.', apply: (m) => { m.dmgMult *= 1.3; m.shatter = true; } },
  ],
  r_ironwood: [
    { name: 'Thornwood', desc: '+12% max HP; attackers take 5% of their hit back.', apply: (m) => { m.hpMult *= 1.12; m.thorns = (m.thorns || 0) + 0.05; } },
  ],
  r_bulwark: [
    { name: 'Bastion', desc: '+24% max HP, +24% shields; attackers take 10% back.', apply: (m) => { m.hpMult *= 1.24; m.blockMult *= 1.24; m.thorns = (m.thorns || 0) + 0.1; } },
    { name: 'Lifewall', desc: '+24% max HP, +14% healing.', apply: (m) => { m.hpMult *= 1.24; m.healMult *= 1.14; } },
  ],
  r_bloodpact: [
    { name: "Berserker's Pact", desc: '+48% damage, −10% max HP.', apply: (m) => { m.dmgMult *= 1.48; m.hpMult *= 0.9; } },
    { name: 'Bloodwell', desc: '+17% damage, heal 9% of damage dealt, −10% HP.', apply: (m) => { m.dmgMult *= 1.17; m.lifesteal = (m.lifesteal || 0) + 0.09; m.hpMult *= 0.9; } },
  ],
  r_dropshard: [
    { name: 'Edge-Shard', desc: '+25% damage, start +1 charge.', apply: (m) => { m.dmgMult *= 1.25; m.chargeStart += 1; } },
  ],
  // ── Phase 2 (sim-tuned 2026-06-09; pure-verb relics left single-purpose by design) ──
  r_stoneblood: [
    { name: 'Spineblood', desc: '+16% max HP; attackers take 5% of their hit back.', apply: (m) => { m.hpMult *= 1.16; m.thorns = (m.thorns || 0) + 0.05; } },
  ],
  r_emberbrand: [
    { name: 'Searbrand', desc: '+16% damage; burns +1 stack.', apply: (m) => { m.dmgMult *= 1.16; m.burnBonus += 1; } },
  ],
  r_reckless: [
    { name: 'Bloodrage', desc: '+48% damage, start +1 charge, −15% max HP.', apply: (m) => { m.dmgMult *= 1.48; m.chargeStart += 1; m.hpMult *= 0.85; } },
  ],
  r_wrathcore: [
    { name: 'Warcry', desc: '+34% damage, start +1 charge, −12% healing.', apply: (m) => { m.dmgMult *= 1.34; m.chargeStart += 1; m.healMult *= 0.88; } },
  ],
  r_bramble: [
    { name: 'Razorvine', desc: '+8% damage; attackers take 12% of their hit back.', apply: (m) => { m.dmgMult *= 1.08; m.thorns = (m.thorns || 0) + 0.12; } },
  ],
  r_reservoir: [
    { name: 'Surge Core', desc: 'Every kill banks +1 charge, and +8% damage.', apply: (m) => { m.killCharge = (m.killCharge || 0) + 1; m.dmgMult *= 1.08; } },
  ],
  r_glassedge: [
    { name: 'Edgewalker', desc: '+56% damage, start +1 charge, −25% max HP.', apply: (m) => { m.dmgMult *= 1.56; m.chargeStart += 1; m.hpMult *= 0.75; } },
  ],
  r_frenzy: [
    { name: 'Onslaught', desc: '+26% damage (trades the charge for raw power).', apply: (m) => { m.dmgMult *= 1.26; } },
  ],
};

export const cutsFor = (id) => RELIC_CUTS[id] || [];          // the ALTERNATE cuts (cut 1+)
// Effective {name, desc, apply} for a relic at an active index (0 = its original effect).
export function cutEffect(r, idx) {
  if (idx > 0) { const c = cutsFor(r.id)[idx - 1]; if (c) return c; }
  return { name: 'Original', desc: r.desc, apply: r.apply };
}
