# Phase SP-6 — Intervention Layer on the Spatial View (Implementation Handoff)

> **Read first:** GDD §19 (the Witnessing Probe), §19.5R (probe result — PASS), §19.6S (this layer's design + locked decisions), and §16 (Readable Hypothesis Test). Opus wrote the design; do not re-litigate it — implement against it. Stamp the build `vSP-B` per §12.
>
> This plan is spec-complete and mostly mechanical. It IS allowed to change engine output (unlike the vSP-A view probe) — but only through new, player-issued intervention types. Suitable for a Sonnet session with the review gate noted below.

## Locked decisions (do not change)
- **Two verbs this build: Redirect (exists) + Anchor (new). Resonate is DEFERRED** to a gated follow-up (§19.6S). Do not build Resonate.
- **One shared budget of 3 interventions** per battle, any mix of Redirect/Anchor. Keep the existing 3-dot indicator in `BattleScreen` header.
- **The no-intervention path must stay byte-identical.** `resolveBattle(squadA, squadB, seed)` drains the generator with `null` and MUST return the same result as today. New intervention types fire ONLY when the player issues them. `npm test` (golden) must stay green untouched.
- **Anchor = lock a chosen enemy out of its NEXT action** (tactical interrupt). It does not change the current actor's action; it sets a flag consumed when that unit's turn next comes up.

## Sequence

### Step 1 — Engine: Anchor intervention (`src/engine/battleStepEngine.js`)
- `initUnit(...)`: add field `anchored: false`.
- `snap(units)`: add `anchored: u.anchored` so the view can render the lock between turns.
- In the per-actor turn loop (currently `for (const actor of turnOrder) { if (!actor.alive) continue; ... }`), immediately after the `!actor.alive` guard, add an anchored-skip:
  ```js
  if (actor.anchored) {
    actor.anchored = false;
    roundEvents.push({ type: 'anchor_skip', actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, callout: 'ANCHORED' });
    yield { type: 'anchored', round, actorId: actor._uid, actorSquad: actor.squad, actorName: actor.name, unitsA: snap(unitsA), unitsB: snap(unitsB) };
    continue;
  }
  ```
- At the existing `pending_action` intervention handling (where redirect is applied), add an anchor branch BEFORE resolving the current action. Anchor does NOT alter the current target — it flags a unit and lets the current action resolve normally:
  ```js
  if (intervention?.type === 'anchor' && intervention.targetUid) {
    const u = [...unitsA, ...unitsB].find((x) => x._uid === intervention.targetUid && x.alive);
    if (u) u.anchored = true;
  }
  ```
  (Redirect stays exactly as is. An intervention is either a redirect OR an anchor for a given pause.)
- **Constraint check:** because `resolveBattle` always passes `null`, none of the above executes in the golden path. Verify `npm test` is green with zero golden edits.

### Step 2 — Runner: route anchor + render the skip beat (`src/hooks/useBattleRunner.js`)
- Add a public `anchor(targetUid)` mirroring `redirect(...)`: guard `budgetRef.current > 0` and `currentStep?.type === 'pending_action'`; decrement the shared `budgetRef`/`interventionsLeft`; `isPausedRef.current = false`; `setPhase('playing')`; `clearTimeout`; `tick({ type: 'anchor', targetUid })`.
- In `tick`, handle the new `value.type === 'anchored'` step: `setUnitsSnapshot({A,B})`, append a log line ``` `⚓ ${value.actorName} ANCHORED — skips turn` ```, then `setTimeout(() => tick(null), IMPACT_MS)`.
- Return `anchor` from the hook alongside `redirect`.

### Step 3 — View: intervention mode on the field (`src/components/BattleStage.jsx`, `src/screens/BattleScreen.jsx`)
- While paused at a `pending_action`, enter **intervention mode**. Add a compact verb toggle in `PendingActionPanel`: `REDIRECT | ANCHOR` (default REDIRECT — preserves current behavior).
  - **REDIRECT** mode: unchanged — the existing enemy-target list repoints the acting unit.
  - **ANCHOR** mode: clicking any alive enemy token (or row) calls `anchor(enemy.uid)`. Show a one-line hint: "Lock an enemy out of its next turn."
- Pass `anchor` from the runner through `BattleScreen` into the panel.
- **On-field cues (this is the legible-cue requirement, §19.6S):**
  - A unit with `anchored === true` (read from snapshot) renders a **lock tint**: desaturated, a small ⚓/lock glyph above it, faint blue chain ring. It is visibly "held."
  - The `anchored` step (the moment the locked unit's turn is skipped): the unit does a short shake + the lock glyph flashes, and NO lunge/beam fires. Reuse the `beat` remount pattern already in `BattleStage` for the one-shot.
- Keep it readable: anchor is a *located* action on the field, matching the "stop that Swift" urge the probe surfaced.

### ⛬ Review gate (Opus) — after Step 3
Before tuning/polish, Opus confirms: (a) goldens still green & no-intervention path identical; (b) the anchored-skip reads on the field (you can SEE the Swift fail to act); (c) Readable Hypothesis Test still holds (anchor shifts the story, doesn't randomize it).

### Step 4 — Verify + Muted Battle Test v2 (with intervention)
- `npm test` green; `npm run build` clean; no console errors.
- In-browser, run a decisive fixture (Night Teeth) twice on the SAME seed: once no-touch, once anchoring the lead Swift early. Confirm a **different battle story** (who falls, when) — that's the §19.6 success criterion. Capture before/after.
- Stamp `VERSION = 'vSP-B'` in `App.jsx`.

## Out of scope (do NOT do)
- Resonate (deferred). Any combat-math change beyond the anchor skip. New gear/modules/creatures/balance. Finished art. Touching the deterministic damage formula or targeting (`pickTarget`).

## Notes / known polish to fold in (from vSP-A)
- Name-label/token overlap in `BattleStage` (labels sit under the swollen token at high charge) — nudge label offset or clamp token swell.
- Confirm the Guardian brace-ring actually renders when `shield > 0` (not distinctly observed during the vSP-A test).
- Optional: a distinct Echo *pulse* (ally→echo→target) vs. the attacker→target beam — echoes currently only surface in the log.
