# Gear Power Audit — does gear deliver "expressive buildcraft"?

**Date:** 2026-06-01 · **Harness:** `scripts/gear-dig.mjs` · **Engine:** frozen (measured, not modified)

## The question

`comp-counter.mjs` found gear ON vs OFF = **Δ0** at parity and concluded "archetype
composition is the build axis; gear is sub-threshold." This audit tests that
conclusion properly, because it was suspect: **a gear only matters if its trigger
*fires* AND the effect changes an outcome.** The Δ0 test placed gear in matchups
where the trigger may never have fired (Quickstrike = onKill, in a slow fight = inert).

Method: for each gear, a **mirror** (identical squad + level, one side geared) in a
matchup built to fire its trigger. Mirror baseline is exactly 50%, so any swing is
the gear. We report **proc/game** (did it fire?) and **win%** (did it convert?),
over 50 seeds × both flips. Confirmed matchup-invariant across Swift/Reactor/Wall foes.

## Result — gear is BIMODAL, not uniformly cosmetic

| Gear | Trigger → Effect | proc/game | win% | Verdict |
|------|------------------|:---------:|:----:|---------|
| **Lastwall** | onWouldFall → survive + reflect | 2.0 | **100%** | 🟢 LIVE POWER |
| **Open Channel** | onEcho → chain + **mark** | 2.0 | **76%** | 🟢 LIVE POWER |
| **Quickstrike** | onKill → extra action | 0.5 | **71%** | 🟢 LIVE POWER |
| Killing Momentum | onKill → refund + widen | 0.5 | 50% | ⚪ cosmetic |
| Chain Link | onEcho → jump to 2nd | 1.0 | 50% | ⚪ cosmetic |
| Resonator | onEcho → first echo full power | 3.5 | 50% | ⚪ cosmetic |
| Glasswork Core | onInit → armor→attack | 1.0 | **0%** | 🔴 trap (−EV) |
| Ironhide | onShieldBreak → reform | 0 | 50% | ⚫ INERT |
| Mirrorplate | onShieldBreak → reflect burst | 0 | 50% | ⚫ INERT |
| Sentinel | onAllyTargeted → intercept | 0 | 50% | ⚫ INERT |
| Kindling | onAllyFall → inherit | 0 | 50% | ⚫ INERT |
| Pyre Heart | onWouldFall → pass flame + detonate | 0 | 50% | ⚫ INERT |

**3/12 live · 3/12 cosmetic · 1/12 trap · 5/12 inert.**

## The pattern — the snowball is a TEMPO/SURVIVAL filter

The frozen engine snowballs on any early lead. So a gear converts to wins **only if
its effect changes who acts or who survives *early*** — before the snowball locks:

- **Tempo** (Quickstrike: extra action) → more turns → snowball compounds it → win.
- **Survival** (Lastwall: don't die + reflect the burst) → denies the enemy the
  early kill that would start *their* snowball → win.
- **Focus** (Open Channel: *mark* a target so the next ally hits it harder) →
  concentrates fire → faster kill → tempo → win. **This is the key tell:** Open
  Channel (mark, 76%) and Chain Link (plain jump, 50%) are the same archetype/trigger —
  the one that creates focus-fire converts, the one that adds flat spread damage does not.

What does **not** convert:
- **Flat extra damage** (Resonator's full-power echo, Chain Link's jump, Killing
  Momentum's widen) — fires reliably (Resonator 3.5×/game!) but the snowball already
  decided the fight before the marginal damage matters. Pure flair.
- **Narrow-state triggers** (onShieldBreak, onAllyFall, onAllyTargeted) — the state
  is rarely reached in a fast 3v3, so the gear **never fires**. Half the pool.
- **Glasswork Core** actively loses: trading a Guardian's armor for attack removes the
  tankiness that was winning the fight.

## Dials are doubly dead

Second Wind / Deep Cut fired **0×** even stacked on a live gear: they need the base
gear to proc in a *specific* way (Second Wind needs 2+ Quickstrikes in one round;
Deep Cut needs an execute) and that condition is rarer than the gear itself. Hardplate
fired but moved nothing. The "a dial tunes the verb" loop is currently the weakest
part of the whole system — the conditions gating the dials are too narrow to trigger.

## What this means for the north star

"Expressive buildcraft" **is** achievable here — but the real build axis is **tempo +
survival + focus-fire**, not "optimize incremental modifiers." That's a legible,
satisfying axis. The work is to make the *pool* match it. Levers, by cost:

1. **Curate the available/featured pool toward tempo/survival/focus verbs** (data-only,
   no engine change, ships today): lean on Quickstrike / Lastwall / Open Channel
   archetypes; demote or retag the flat-damage gear as low-tier flair.
2. **Fix the inert gear** (needs engine work — out of scope here): widen the trigger
   conditions (onShieldBreak/onAllyFall/onAllyTargeted) so they actually fire in a 3v3,
   or replace them. 5/12 gears doing literally nothing is the biggest single problem.
3. **Re-shape cosmetic effects into tempo/focus shapes** (engine work): e.g. Resonator's
   echo could grant the echoer a mark/tempo bonus instead of raw damage.
4. **Loosen dial trigger conditions** (engine work) or they remain dead content.
5. **Make the tempo/survival nature legible** (data/UI): current descriptions read as
   flat flavor; they undersell which gear actually wins fights.

**Decision for Sky:** #1 and #5 are safe, ship-now, data-only. #2–#4 touch the frozen
engine and are a deliberate balance pass — your call on scope and timing.
