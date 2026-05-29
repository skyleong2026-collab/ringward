# Phase G — Gear System + Build Vocabulary (Implementation Handoff)

> **Read first:** GDD §-1 (Direction Lock) and §6.1 (Build Vocabulary: Engine = Trigger × Effect).
> This plan is spec-complete and mechanical — suitable for a Haiku session. Opus wrote the design; do not re-litigate it, just implement. Stamp the build `vG-A` per §12.

## Locked decisions (do not change)
- **Gear = 1 slot, transformational** (grants/rewrites a behavior). **Modules = 2–3 slots, tuning-only** (dials on existing behavior, never flat buffs).
- Existing per-archetype **Cores fold into starter gear** (they are already behavioral — rename the layer, keep the effects).
- Canonical combat engine is **`battleStepEngine.js`** (FTL pause-redirect). `battle.js` is retired in Step 5 — **not before**.

## Sequence

### Step 1 — Gear data layer
Create `src/data/gear.js`. Each gear = `{ id, name, slot:'gear', archetype|null, trigger, effect, description (one plain sentence), color }`.
- Migrate the 5 entries in `cores.js` into `gear.js` as **starter gear** (ironhide, lastwall, resonator, chainlink, quickstrike, kindling → keep effects, retag as gear).
- Add the 5 launch gear from GDD §6.1: Mirrorplate, Killing Momentum, Open Channel, Pyre Heart, Glasswork Core.
- Keep `cores.js` as a thin re-export shim only if needed to avoid breaking imports during migration; otherwise delete and update imports.

### Step 2 — Data model: rename `coreId` → `gearId`, modules become an array
In `startingCollection.js` and everywhere `coreId`/`moduleId` are read (`CollectionScreen.jsx`, `Result.jsx`, both engines):
- `coreId` → `gearId` (1 slot).
- `moduleId` (single) → `moduleIds` (array, max 3). Update reads accordingly.

### Step 3 — Equip UI (currently around CollectionScreen)
- One **Gear** slot (archetype-gated where gear specifies an archetype).
- Two–three **Module** slots.
- Show each item's one-sentence behavior. No raw stat numbers in the slot UI.

### Step 4 — Wire gear behaviors into `battleStepEngine.js`
The step engine currently handles only fastStart/rooted/dart + the old core procs. Re-implement the 6 starter behaviors here (they exist in `battle.js` — port them) and add the 5 launch gear via the Trigger×Effect hooks:
- **Mirrorplate** (Guardian): store absorbed dmg; on shield break → reflect burst.
- **Killing Momentum** (Swift): On Kill → Reset action + raise execute threshold this round.
- **Open Channel** (Echo): echo Chains to a 2nd target; first echo/round marks target → next ally hit Empowered.
- **Pyre Heart** (Spark): on would-fall → Inherit Stoke to highest-Stoke ally + Detonate.
- **Glasswork Core**: Convert Armor→Attack at init.
Each proc must emit a `core_proc`/`gear_proc` event so telemetry + callouts surface it (readability is a pillar).

### Step 5 — Module rework (tuning dials only)
- Delete/replace the flat-% Phase I modules in `modules.js`. Survivors must be **dials** on existing behaviors (e.g. "execute threshold 30%→40%", "chain jumps +1", "trigger one round earlier").
- Remove their bespoke logic from `battle.js`; express dials as parameters the step engine reads.

### Step 6 — Retire `battle.js` + tests (ONLY after Steps 4–5)
- Add `resolveBattle(squadA, squadB, seed)` that drives `battleStepEngine` to completion with `null` interventions and returns the final result object.
- Point `App.jsx` (the two `battle(...)` calls, ~lines 202 & 292) at `resolveBattle`.
- Delete `battle.js`. Now there is one combat source of truth.
- Add seeded golden tests: fixed squads + seed → assert winner/rounds/key telemetry. This is the regression net the engine has lacked.

## Acceptance
- Equipped gear visibly changes battle behavior (telemetry shows the proc) in BOTH wild captures and encounters.
- No module is a flat stat buff.
- One combat engine; golden tests pass; `vG-A` stamped.
