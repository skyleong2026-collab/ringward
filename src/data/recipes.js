// ─── TEAM RECIPES — the collection engine (docs/RINGWARD-COLLECTION-ENGINE.md) ───
// A recipe is a NAMED squad: 2 slots, each keyed to a Type, a specific creature, or a
// sworn ★ Oath, with a folk line and the REAL synergy it rides. The synergy is true
// BEFORE any bonus — the recipe only names what the kits already do. Shared by the game
// (squad-pick chip, pull reveal, character sheet) and any sim, the waves.js/upgrades.js
// extraction pattern. Plain JS, no React, no engine imports.
//
// SCOPE OF THIS MODULE: detection + display data only. The optional `season` (a mild,
// in-lane seasoning) is carried here as TEXT for later wiring; R3 turns it into a real
// run-layer mod (golden-safe, sim-visible) and only THEN is it shown as a live effect.
// Until then nothing here changes combat — folk-honest: we never advertise a bonus that
// isn't applied yet.
//
// Slot kinds:
//   { t: 'Reactor' }                       — any creature of that Type
//   { c: 'dartwing' }                      — that specific creature (engine id)
//   { oneOf: ['glowtail','tanglewing'] }   — any one of these creatures
//   { any: true }                          — any creature (wildcard)
//   { t: 'Assassin', oath: 'plague' }      — a creature of that Type that has sworn that ★ Oath
//
// A squad member passed to the matcher is { id, type, oath } where `oath` is either the
// sworn keystone node-id ('venom5') OR the oath key ('plague') — the matcher accepts both.

// ★ Oath keys → the tier-5 keystone node id that swears them (SeamLab TYPE_TREES).
export const OATH_NODE = {
  plague: 'venom5',       // Assassin — "You deal NO direct damage, but your poison never fades"
  pandemic: 'decay5',     // Hexer — "Doom rots the whole line"
  unbreakable: 'guard5',  // Bulwark — "Allies cannot drop below 1 HP while you stand"
  evergreen: 'verdant5',  // Mender — "Your regen never expires"
  ironMaiden: 'retri5',   // Bulwark — "allies you shield reflect 100% of damage they block"
};
export const OATH_NAME = {
  plague: 'Plague', pandemic: 'Pandemic', unbreakable: 'Unbreakable',
  evergreen: 'Evergreen', ironMaiden: 'Iron Maiden',
};

// Display labels for the specific creatures referenced in slots — kept local so this
// module needs no roster import (the matcher works on ids; only the UI needs names).
const CNAME = { dartwing: 'Dartwing', ironwall: 'Ironwall', swiftpaw: 'Swiftpaw', glowtail: 'Glowtail', tanglewing: 'Tanglewing' };

// THE RECIPE BOOK v1 — eleven, channel-audited (see the design doc). Roster recipes are
// discoverable with early pulls; sworn recipes need specific ★ Oaths (the hour-15 chase).
export const RECIPES = [
  // ── Roster recipes (hour 5) ──
  { id: 'pyre_pack', name: 'THE PYRE PACK', icon: '🔥', tier: 'roster',
    slots: [{ t: 'Reactor' }, { t: 'Reactor' }],
    line: 'Light it twice, then blow on it.',
    how: 'Two Reactors: Burn stacks (Sputter adds one per stack) and Overload hits double on a burning target.',
    season: { key: 'burn', label: 'Burn ticks +10%' } },
  { id: 'long_winter', name: 'THE LONG WINTER', icon: '❄️', tier: 'roster',
    slots: [{ t: 'Warden' }, { c: 'dartwing' }],
    line: 'First the cold, then the quiet.',
    how: 'A Warden freezes a target out of its turns; Dartwing\'s Killing Frost / shatter and finisher cash the opening in.',
    season: { key: 'shatter', label: 'Shatter damage +10%' } },
  { id: 'patient_knife', name: 'THE PATIENT KNIFE', icon: '🗡️', tier: 'roster',
    slots: [{ t: 'Warden' }, { t: 'Assassin' }],
    line: 'Hold them still. The knife knows when.',
    how: 'A Warden\'s freeze pins a target under the 45% Execute line it can\'t heal past — the Assassin finishes.',
    season: { key: 'executeLine', label: 'Execute window 45% → 48%' } },
  { id: 'thornwall', name: 'THE THORNWALL', icon: '🌵', tier: 'roster',
    slots: [{ c: 'ironwall' }, { t: 'Mender' }],
    line: 'Build the wall. Let them argue with it.',
    how: 'Ironwall\'s Spite Plating + base reflect; a Mender\'s overheal keeps the plates up. They break themselves on you.',
    season: { key: 'thorns', label: 'Reflect / thorns return +10%' } },
  { id: 'stormcourt', name: 'THE STORMCOURT', icon: '⚡', tier: 'roster',
    slots: [{ t: 'Booster' }, { t: 'Striker' }],
    line: 'One voice, many knives.',
    how: 'A Booster\'s Amp multiplies EVERY hit — and a Striker\'s Flurry is eight of them.',
    season: { key: 'flurry', label: 'Flurry +1 hit' } },
  { id: 'bellows', name: 'THE BELLOWS', icon: '🎐', tier: 'roster',
    slots: [{ oneOf: ['glowtail', 'tanglewing'] }, { any: true }],
    line: 'Keep the fire fed.',
    how: 'Charge-start innates + Wellspring/Channel charge-gifts pour fuel into one spender\'s bomb.',
    season: { key: 'chargeStart', label: 'Squad starts +1 charge' } },
  { id: 'widowing', name: 'THE WIDOWING', icon: '🕸️', tier: 'roster',
    slots: [{ t: 'Hexer' }, { t: 'Reactor' }],
    line: 'Mark the tree, then drop it.',
    how: 'A Hexer stacks vulnerability (+15% per stack); one Overload lands all of it at once.',
    season: { key: 'vulnDecay', label: 'Vulnerability lingers 1 round longer' } },
  { id: 'first_pounce', name: 'THE FIRST POUNCE', icon: '🐾', tier: 'roster',
    slots: [{ c: 'swiftpaw' }, { c: 'dartwing' }],
    line: 'One opens, one closes.',
    how: 'Opener +25% on the unwounded, finisher +25% under half — the wound passes between them, both riding Blitz tempo.',
    season: { key: 'blitzFirst', label: 'Blitz first-strike ×1.6 → ×1.75' } },

  // ── Sworn recipes (hour 15 — need the ★ Oaths) ──
  { id: 'slow_rot', name: 'THE SLOW ROT', icon: '☠️', tier: 'sworn',
    slots: [{ t: 'Assassin', oath: 'plague' }, { t: 'Hexer', oath: 'pandemic' }],
    line: 'Nothing here heals.',
    how: 'Shield-ignoring poison that never fades (★ Plague) under curses that rot the whole line (★ Pandemic).',
    season: { key: 'poison', label: 'Poison damage +10%' } },
  { id: 'unbroken_line', name: 'THE UNBROKEN LINE', icon: '🛡️', tier: 'sworn',
    slots: [{ t: 'Bulwark', oath: 'unbreakable' }, { t: 'Mender', oath: 'evergreen' }],
    line: 'It holds because it has to.',
    how: 'Allies can\'t drop below 1 HP while the wall stands (★ Unbreakable); the regen never expires (★ Evergreen).',
    season: { key: 'regen', label: 'Regen +10%' } },
  { id: 'iron_argument', name: 'THE IRON ARGUMENT', icon: '⚙️', tier: 'sworn',
    slots: [{ t: 'Bulwark', oath: 'ironMaiden' }, { t: 'Booster' }],
    line: 'Hit it harder. Please.',
    how: 'Shielded allies reflect 100% of what they block (★ Iron Maiden) — and a Booster amps the wall.',
    season: { key: 'reflectCap', label: 'Reflect cap +5%' } },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// A human phrase for a slot — used in near-miss chase pointers ("a Booster would finish it").
export function slotLabel(slot) {
  if (slot.any) return 'any creature';
  if (slot.oneOf) return slot.oneOf.map((id) => CNAME[id] || id).join(' or ');
  if (slot.c) return CNAME[slot.c] || slot.c;
  if (slot.oath) return `a sworn ${OATH_NAME[slot.oath] || slot.oath} ${slot.t}`;
  return `a ${slot.t}`;
}

// Does one squad member satisfy one slot? (exported so callers can find a bench creature
// that would complete a near-miss.)
export function memberFits(member, slot) {
  if (!member) return false;
  if (slot.any) return true;
  if (slot.oneOf) return slot.oneOf.includes(member.id);
  if (slot.c) return member.id === slot.c;
  if (slot.oath) {
    if (member.type !== slot.t) return false;
    const node = OATH_NODE[slot.oath];
    return member.oath === node || member.oath === slot.oath;
  }
  return member.type === slot.t;
}

// Best assignment of DISTINCT members to slots — returns the max number of slots fillable
// and which slot indices were left unfilled in that best assignment. slots ≤ 2 and members
// ≤ 3, so the backtracking is trivially cheap.
function bestMatch(slots, members) {
  let best = { matched: -1, missingIdx: slots.map((_, i) => i) };
  const used = new Array(members.length).fill(false);
  const rec = (si, matched, missing) => {
    if (si === slots.length) {
      if (matched > best.matched) best = { matched, missingIdx: missing.slice() };
      return;
    }
    for (let mi = 0; mi < members.length; mi++) {
      if (!used[mi] && memberFits(members[mi], slots[si])) {
        used[mi] = true;
        rec(si + 1, matched + 1, missing);
        used[mi] = false;
      }
    }
    // also try leaving this slot unfilled — lets us measure "one short"
    missing.push(si);
    rec(si + 1, matched, missing);
    missing.pop();
  };
  rec(0, 0, []);
  return best;
}

// Is this exact recipe fully cooked by these members (distinct member per slot)?
export function recipeComplete(recipe, members) {
  return bestMatch(recipe.slots, members).matched === recipe.slots.length;
}

// Detect every recipe a member list cooks, plus genuine one-slot-short near-misses.
//   members: [{ id, type, oath? }]
// Returns { lit: [recipe], near: [{ recipe, missing: slot }] }.
// Near-miss guardrails (design doc): ONLY when exactly one slot short; never list a recipe
// missing two-or-more; frame as the next acquisition. Callers cap how many near-misses show.
export function detectRecipes(members) {
  const mem = members || [];
  const lit = [];
  const near = [];
  for (const r of RECIPES) {
    const bm = bestMatch(r.slots, mem);
    if (bm.matched === r.slots.length) lit.push(r);
    else if (r.slots.length >= 2 && bm.matched === r.slots.length - 1) {
      near.push({ recipe: r, missing: r.slots[bm.missingIdx[0]] });
    }
  }
  return { lit, near };
}

// Which recipes could this creature belong to (by id, oneOf, or Type)? — for the character
// sheet's "teams this one belongs to." Oath slots carry a `t`, so the Type check covers them.
export function recipesForCreature(id, type) {
  return RECIPES.filter((r) => r.slots.some((s) =>
    s.c === id || (s.oneOf && s.oneOf.includes(id)) || s.t === type));
}
