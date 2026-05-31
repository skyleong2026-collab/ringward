# Phase 17 — Balance & Progression (Implementation Handoff)

> **Read first:** GDD §15 (engine), §6.1 (Build Vocabulary), §16 (Readable Hypothesis Test), §12 (Model Selection + version tags). Also `PHASE_G_PLAN.md` for the gear/dial layer this builds on.
> This plan is spec-complete and mechanical — suitable for a Haiku session. Opus wrote the design and locked the *shape*; the exact coefficients are first-pass and get tuned in Step 3 off the harness. Do not re-litigate the direction; implement it. Stamp the build `v17-A` per §12 (confirm tag format with Sky if §12 still uses letters).

## The problem this fixes (why Phase 17 exists)

The progression loop is currently **cosmetic**:

- `level` (1–5) is computed from XP in `progression.js` (`getLevel`), stored on every collection instance (`startingCollection.js`, `App.jsx`), and shown as "Lv.X" badges + feed-aura color. **The combat engine never reads `level`.** `initUnit` (`battleStepEngine.js:211`) reads raw `creature.hp/attack/armor/speed`. Feeding a creature to Lv.5 changes *nothing* in battle.
- **No difficulty ladder.** Enemy squads (`encounters.js`, `zones.js`, `dungeons.js`) are fixed base-stat creatures. `difficulty` is a *flavor tag* (Balanced/Defensive/Aggressive), not a power level.
- **Flat rewards.** XP is `15 (+5 survive, +5 win)` regardless of who you beat (`battleStepEngine.js:671–685`).
- **New gear/dials are unmeasured.** `gear.js` launch numbers are first-pass TBD (see PHASE_G_PLAN Step 4); nothing measures win-rate balance across builds.

## Locked decisions (do not change)

1. **Identity-preserving level curve.** Leveling scales stats *multiplicatively*, preserving each archetype's silhouette. A Guardian stays tanky, a Swift stays glassy. **Speed never scales** — turn-order is archetype identity.
2. **Level 1 (or missing `level`) = stats unchanged.** This is the critical invariant: `applyLevel` must be the identity function at level 1 so existing balance and the Phase G golden tests stay byte-for-byte identical. Re-run `npm run test:golden` after Step 1 — it MUST still pass with zero changes.
3. **Single integration point.** Scaling is applied once, inside `initUnit()`. Both combat entry paths (`resolveBattle` for wild/retry, `useBattleRunner` for interactive encounters) funnel through `initUnit`, so this is the only place that needs the hook. Do **not** mutate stored collection instances — scaling is derived at battle-build time.
4. **Restraint.** No new stat types, no new dials, no XP-curve redesign. Reshape what exists. The dial doctrine still holds (a dial tunes an existing behavior; never a flat buff).

---

## Step 1 — Make levels matter (the broken promise)

### 1a. Add `applyLevel` to `src/engine/progression.js`

```js
// Identity-preserving growth. Multiplicative so archetype ratios are preserved.
// Level 1 (or undefined) returns base stats unchanged — DO NOT BREAK THIS.
// Speed is never scaled (turn order = archetype identity).
export const LEVEL_GROWTH = 0.12;        // +12% per level over L1, applied to HP + Attack
export const ARMOR_GROWTH = 0.06;        // Guardians only — half rate, keeps tank identity

export function levelMultiplier(level = 1) {
  return 1 + LEVEL_GROWTH * (Math.max(1, level) - 1);
}

// Returns a SHALLOW COPY with effective combat stats. Never mutates input.
export function applyLevel(creature) {
  const level = creature.level ?? 1;
  if (level <= 1) return creature;                 // identity — invariant #2
  const m = levelMultiplier(level);
  const armorM = creature.archetype === 'Guardian'
    ? 1 + ARMOR_GROWTH * (level - 1)
    : 1;
  return {
    ...creature,
    hp:     Math.round(creature.hp * m),
    attack: Math.round(creature.attack * m),
    armor:  Math.round(creature.armor * armorM),
    // speed unchanged
  };
}
```

First-pass curve (tuned in Step 3): HP/Attack `1.00 / 1.12 / 1.24 / 1.36 / 1.48` at L1–L5; Guardian armor `1.00 / 1.06 / 1.12 / 1.18 / 1.24`.

### 1b. Wire it into `initUnit()` (`battleStepEngine.js:211`)

`initUnit` currently spreads `...creature` then derives `maxHP`, `currentHP`, `currentAttack`. Compute effective stats *first* and override the raw fields so every downstream read is scaled:

```js
function initUnit(creature, squad) {
  const eff = applyLevel(creature);                // <-- new
  return {
    ...eff,                                         // hp/attack/armor scaled; speed raw
    _uid: `${creature.instanceId ?? creature.id}_${squad}_${_uidCounter++}`,
    squad,
    currentHP: creature.currentHP ?? eff.hp,        // dungeon carry-over HP is absolute — keep ?? but fall back to eff.hp
    maxHP: eff.hp,
    currentAttack: eff.attack,
    // ...rest unchanged (armor/speed now come from eff via the spread)
```

Import `applyLevel` at the top of `battleStepEngine.js`. Verify these still read the *unit's* (now scaled) fields, not the raw creature:
- `glassworkCore` init (`:312`) reads `u.armor` / `u.attack` — OK, reads the spread copy.
- `computeThreat` (`:202`) reads `unit.hp/attack/speed` — pass it `eff` (or the unit), so threat reflects level.
- turn order (`:333`) reads `u.speed` — unchanged by design.

### 1c. Surface effective stats in the UI (readability pillar, GDD §16)

Today no screen shows raw combat stats; `level` only appears as "Lv.X" + an XP bar. Add a compact **effective-stat read** so the player can see that leveling did something:

- **PreBattle.jsx** (the squad readout, ~line 156) and/or **CollectionScreen UnitCard**: show effective HP / ATK for the unit's current level, e.g. `HP 538 · ATK 13` using `applyLevel(unit)`. Keep it terse — no stat block, just the two numbers that move. No raw numbers in the *gear/module* slot UI (that rule from §10 stands); this is the creature's own stats, which is fine to show.
- Reuse `applyLevel` — do not recompute the curve inline anywhere.

### Step 1 acceptance
- `npm run test:golden` passes **unchanged** (all scenarios are level 1).
- A Lv.5 squad measurably out-trades the same squad at Lv.1 vs identical enemies (verify with a quick seeded script or the Step 3 harness).
- Guardian stays proportionally tankier than Swift at every level (ratios preserved).
- App renders, no console errors. **STOP and hand to Opus review** before Step 2 (this is the load-bearing change).

---

## Step 2 — Difficulty ladder + reward gradient

Now that level matters, content must keep pace or it trivializes.

### 2a. Encounter ladder
Add an `level` field (1–5) to each entry in `src/data/encounters.js` — a real, ordered ladder. First-pass assignment (Opus call; tune in Step 3):
- L1: `patrol` · L2: `the-duelists`, `glass-pack` · L3: `iron-wall`, `night-teeth`, `overdrive`, `forge` · L4: `the-swarm`, `resonance-cascade`, `precision`, `siege` · L5: `extinction-event`.

Stamp the level onto the enemy creatures when building the squad (base `CREATURES` carry no `level`). Add a helper and use it at **every enemy-squad call site**:

```js
// helper (e.g. in encounters.js or a small src/engine/squad.js)
export function levelEnemySquad(squad, level) {
  return squad.map((c) => ({ ...c, level }));
}
```
Call sites in `App.jsx`:
- `handleTryAgain` (`:299`) — `resolveBattle(playerSquad, levelEnemySquad(currentEncounter.squad, currentEncounter.level), seed)`
- BattleScreen render `enemySquad` prop (`:558`) — pass `levelEnemySquad(currentEncounter.squad, currentEncounter.level)`
- `selectDungeonEncounter` / dungeon nodes — encounters resolved by id already carry their `level`, so the same helper applies.

### 2b. Zone tiers → wild-spawn levels
Add a `tier` (or `spawnLevel: [min,max]`) to each zone in `zones.js`. In `enterZone` / `enterGpsSpawn` (`App.jsx:184,191`), stamp a `level` on `currentWildTarget` rolled from the zone's range. First-pass: Park = L1–2, Rail Yard = L2–3, Downtown Grid = L3–4. The wild target then scales via `applyLevel` automatically, and a caught creature is stored at `level: 1` as today (you catch it weak and grow it — preserves the feed loop).

### 2c. Reward gradient
In `battleStepEngine.js` reward block (`:671`), scale XP by enemy level so harder fights pay more. The engine has `unitsB` (enemies, now carrying `level`):

```js
const avgEnemyLevel = unitsB.reduce((s, u) => s + (u.level ?? 1), 0) / unitsB.length;
const baseXp = Math.round(10 + 5 * avgEnemyLevel);   // L1→15 (matches today), L5→35
// per unit: xp = baseXp; if (alive) xp += 5; if (playerWon) xp += 5;
```
Keep the `+5 survive / +5 win` bonuses. Note L1 stays at 15 → no reward inflation for existing content.

### Step 2 acceptance
- Encounters are beatable with a squad leveled to roughly the encounter's level; an under-leveled squad loses (ladder is real).
- Higher-level encounters pay more XP (gradient is monotonic).
- Wild catches still enter at Lv.1. Golden tests untouched (they pin fixed level-1 squads, bypass these data files).
- **STOP and hand to Opus review** if the ladder ordering feels wrong or any encounter is unbeatable at-level (spec gap).

---

## Step 3 — Balance harness + tune

### 3a. `scripts/phase17-balance.mjs`
A seeded Monte-Carlo harness, in the style of `phaseg-golden.mjs` (import `resolveBattle` + `CREATURES`):
- Build representative squads per archetype (and per launch-gear loadout) at a fixed level.
- Run each matchup over many seeds (e.g. 200) and report **win-rate per archetype and per gear**.
- Print a spread summary: max−min win-rate across archetypes (the imbalance metric) and any gear with win-rate outside, say, 40–60%.
- Add an `npm run test:balance` script. This is a *report*, not a pass/fail gate.

### 3b. Tune (Opus, off harness output)
- Adjust `LEVEL_GROWTH` / `ARMOR_GROWTH` so a one-level edge is meaningful but not deterministic, and same-level archetype win-rates cluster near 50%.
- Tune the `gear.js` launch numbers flagged TBD in PHASE_G_PLAN Step 4 (mirrorplate burst frac, killingMomentum cap, pyreHeart detonation, etc.) using the per-gear win-rate.
- Re-bless golden values only if a tuning change intentionally shifts them.

### 3c. Extend golden tests (`phaseg-golden.mjs` or a new `phase17-golden.mjs`)
Add at least one **leveled** scenario (e.g. a Lv.5 squad vs a Lv.3 squad at a fixed seed) so the level curve itself has a regression pin. Existing level-1 scenarios stay as-is.

### Step 3 acceptance
- `npm run test:balance` prints per-archetype + per-gear win-rates over many seeds.
- After tuning, same-level archetype win-rate spread is tight (target: within ~±10% of 50%); no gear is dominant or dead.
- `npm test` (smoke + golden) passes, including the new leveled scenario. Build clean, stamped `v17-A`.

---

## Files touched (summary)

```
EDIT:
  src/engine/progression.js        + applyLevel, levelMultiplier, LEVEL_GROWTH, ARMOR_GROWTH
  src/engine/battleStepEngine.js   initUnit applies applyLevel; XP reward scales by avg enemy level
  src/data/encounters.js           + level field per encounter; + levelEnemySquad helper (or src/engine/squad.js)
  src/data/zones.js                + tier / spawnLevel per zone
  src/App.jsx                      stamp level on enemy squads (3 call sites) + wild targets (2 call sites)
  src/screens/PreBattle.jsx        show effective HP/ATK per unit
  src/screens/CollectionScreen.jsx (optional) effective stats on UnitCard
  package.json                     + test:balance script

NEW:
  scripts/phase17-balance.mjs      seeded win-rate harness
  (optional) scripts/phase17-golden.mjs   leveled regression scenario
```

## Review gates (per §12 / dev-workflow)
- After **Step 1** (load-bearing): hand back for Opus review before touching content.
- After **Step 2** if the ladder ordering or any "unbeatable at-level" gap appears (spec gap → Opus).
- **Step 3 tuning is Opus work** — Haiku builds the harness; Opus reads it and sets the numbers.
