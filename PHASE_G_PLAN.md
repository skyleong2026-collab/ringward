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

### Step 4 — Wire gear behaviors into `battleStepEngine.js` ✅ DONE (vG-A)
> Status: the 6 starter behaviors were already native in `battleStepEngine.js` (it reads `gearId` directly post Step 2 — lastwall, ironhide, quickstrike, kindling, resonator, chainlink). The 5 launch gear below are now implemented. Balance numbers are first-pass (gear.js marks them TBD; Modules tune them in Step 5). Verified by `scripts/phaseg-smoke.mjs` — all 5 launch procs fire + starters still pass in both engines.
> NOTE: wild-hunt/retry still run on `battle.js`, which does NOT know the launch gear. Acceptance criterion "BOTH wild captures and encounters" is fully met only after Step 6 swaps `battle.js` for `resolveBattle`.

The step engine currently handles only fastStart/rooted/dart + the old core procs. Re-implement the 6 starter behaviors here (they exist in `battle.js` — port them) and add the 5 launch gear via the Trigger×Effect hooks:
- **Mirrorplate** (Guardian): store absorbed dmg; on shield break → reflect burst.
- **Killing Momentum** (Swift): On Kill → Reset action + raise execute threshold this round.
- **Open Channel** (Echo): echo Chains to a 2nd target; first echo/round marks target → next ally hit Empowered.
- **Pyre Heart** (Spark): on would-fall → Inherit Stoke to highest-Stoke ally + Detonate.
- **Glasswork Core**: Convert Armor→Attack at init.
Each proc must emit a `core_proc`/`gear_proc` event so telemetry + callouts surface it (readability is a pillar).

### Step 5 — Module rework (tuning dials only) ✅ DONE (vG-A)
> Status: `modules.js` now holds **9 dials** replacing all Phase I + legacy modules. Doctrine: *a dial does nothing on its own* — each tunes a parameter of a behavior the unit already has (archetype mechanic or gear). Vocabulary categories: **Earlier · Wider · Stronger · Repeat**. Implemented in the canonical `battleStepEngine.js`:
> - Early Wall (Guardian): shield trigger 50%→60% HP. · Hardplate (Guardian): shield 20%→28% maxHP, ironhide reform & mirror burst scale up.
> - Deep Cut (Swift): execute window 30%→42%. · Second Wind (Swift): quickstrike chains to a 2nd bonus action; killingMomentum cap 2→3.
> - Long Echo (Echo): chains jump +1 target. · Pure Tone (Echo): echo power 0.5→0.65, resonator 1.0→1.15.
> - Banked Heat (Spark): every Stoke gain +1 stack. · Backdraft (Spark): Spark scaling 0.12→0.15, Pyre detonation wider.
> - Hair Trigger (Any): lastwall/ironhide/mirrorplate may fire a 2nd time.
> Each dial emits a `module_proc` so telemetry/callouts surface it. `MODULE_POOLS` remapped to the new ids. Verified by `scripts/phaseg-smoke.mjs` — every dial fires its proc WITH the dial and stays silent WITHOUT (18 dial checks + 5 launch + 2 starter = 25... checks all PASS). Build clean; app renders with no console errors.
> NOTE: the dead `actor.moduleId` reads in the canonical engine were a latent Step-2 bug (units carry `moduleIds`), so modules never functioned there — the dial rebuild is purely additive. `battle.js` still contains the old bespoke Phase I branches; rather than surgically strip ~25 branches from a file being **deleted whole in Step 6**, they are left inert (no unit can equip those ids) and removed wholesale at deletion. Wild-hunt/retry won't honor dials until Step 6 swaps `battle.js` for `resolveBattle` — same documented gap as the launch gear.

Cut from the proposed set (designer call, restraint): **Quick Cycle** (redundant universal "mandatory glue" risk). Standalone-behavior modules (rooted, dart, weakpoint, echoHunter, packCall, protector) and the flat-% Phase I modules are **parked as future GEAR candidates / deleted**, not dials.

### Step 6 — Retire `battle.js` + tests (ONLY after Steps 4–5) ✅ DONE (vG-B)
> Status: `battle.js` is deleted — one combat source of truth. `resolveBattle(squadA, squadB, seed)` added to `battleStepEngine.js`: drains the generator with `null` interventions and returns the same result object shape (verified identical to the retired `battle.js` return). App.jsx's two call sites (commitHunt wild-capture + handleTryAgain retry) now call `resolveBattle`, so wild-hunt/retry honor launch gear + dials — closing the documented Step 4/5 gap. Seeded golden tests added (`scripts/phaseg-golden.mjs`, 3 fixed scenarios × {winner, rounds, survivor set, determinism}). npm scripts wired: `test:smoke`, `test:golden`, `test`. Build stamped **vG-B**; bundle dropped 323KB→304KB. Verified: `npm test` all PASS, `vite build` clean, app renders vG-B with no console errors.

- Add `resolveBattle(squadA, squadB, seed)` that drives `battleStepEngine` to completion with `null` interventions and returns the final result object.
- Point `App.jsx` (the two `battle(...)` calls, ~lines 202 & 292) at `resolveBattle`.
- Delete `battle.js`. Now there is one combat source of truth.
- Add seeded golden tests: fixed squads + seed → assert winner/rounds/key telemetry. This is the regression net the engine has lacked.

## Acceptance
- Equipped gear visibly changes battle behavior (telemetry shows the proc) in BOTH wild captures and encounters.
- No module is a flat stat buff.
- One combat engine; golden tests pass; `vG-A` stamped.
