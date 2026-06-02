# Gear Power Audit — does gear deliver "expressive buildcraft"?

**Date:** 2026-06-01 · **Harness:** `scripts/gear-dig.mjs` · **Engine:** frozen (measured, not modified)

> **Correction (2026-06-01, same day):** the first version of this audit reported a
> "3 live / 5 inert / 3 cosmetic" taxonomy. **That was wrong — a harness bug.** It
> measured each geared squad against *its own bare twin* (an accidental coinflip),
> not against a real foe. Fixing it produced "+0 everywhere," which was *also*
> misleading. Both errors share one root cause, and chasing it produced the correct
> metric below. The original taxonomy should not be trusted; this version supersedes it.

## Why win-rate was the wrong lens

The frozen engine's outcomes are **binary**: there's a win/loss **cliff** at a power
threshold (see `comp-counter.mjs` — fights are 100% or 0%, rarely between). So *any*
single win-rate sample lands in stomp territory unless it happens to sit exactly on
the cliff. The bare-twin mirror accidentally sat on a cliff (50% coinflip) → gear
looked decisive (71–100%). A real foe sat off the cliff → gear looked dead (+0). Neither
described gear's actual contribution.

## The right metric: gear MOVES the cliff

Gear doesn't make a fixed fight closer — it shifts *where the cliff falls*. Measure
**how many foe levels a gear buys**: the highest foe level at which the squad still
wins, geared minus bare. Player fixed at L5; 40 seeds × both flips.

| Gear | bare ceiling | geared ceiling | **shift** | Read |
|------|:---:|:---:|:---:|------|
| **Sentinel** | foe L9 | foe L11 | **+2** | intercept tanks the burst that starts the enemy snowball |
| **Resonator** | foe L11 | foe L13 | **+2** | full-power echo adds real focused output at the cliff |
| **Quickstrike** | foe L7 | foe L9 | **+2** | extra action on kill → tempo compounds |
| **Killing Momentum** | foe L7 | foe L8 | **+1** | kill-refund, weaker than Quickstrike |
| Lastwall | foe L7 | foe L7 | +0 | neutral *here* — the vault wins without ever being threatened |
| Ironhide | foe L8 | foe L8 | +0 | same: shield never forms when the carrier isn't pressured |
| Mirrorplate | foe L8 | foe L8 | +0 | same |
| Kindling | foe L6 | foe L6 | +0 | fires, but the fragile Spark carrier dies before it pays off |
| Glasswork Core | foe L8 | foe L8 | +0 | armor→attack is a wash in this matchup |
| **Chain Link** | foe L10 | foe L8 | **−2** | 🔴 **TRAP** — echo *spreads* to a 2nd target, delaying focused kills |
| **Open Channel** | foe L10 | foe L8 | **−2** | 🔴 **TRAP** — same; the chain costs you the swarm race |

## What's actually true

1. **Gear delivers power — measured in levels of difficulty bought.** Quickstrike,
   Sentinel, Resonator each buy ~2 foe levels; Killing Momentum ~1. "Expressive
   buildcraft" is real here. The earlier "gear is cosmetic" panic was a measurement
   artifact.
2. **The shift only cashes out near the cliff (parity).** Off the cliff — the common
   case under the snowball — *every* gear is +0, because the fight is already decided.
   **This is the punchline: the lever that makes ALL gear matter is composition-aware
   matchmaking** (fights at parity), not gear internals. The two fronts are one.
3. **Two real traps:** Chain Link & Open Channel *lower* your ceiling vs a swarm,
   because spreading echo damage to a second target delays the focused kills a swarm
   race demands. This is the one genuinely engine-worthy finding — and even it may be
   working-as-intended RPS (chains are multi-target tools, just wrong vs swarms).
4. **"Neutral" defensive gear isn't broken** — Lastwall/Ironhide/Mirrorplate are +0
   only because the carrier isn't threatened in these matchups. In a fight that
   actually pressures the Guardian, they should pay (untested here; the trigger needs
   the carrier near death).

## So: is a frozen-engine balance pass warranted?

**Largely no — the premise dissolved when the harness bug was fixed.** The original
plan (widen 5 inert triggers, reshape cosmetic effects) was chasing a phantom. The
honest conclusions:

- **Master lever = matchmaking to parity** (already in flight: `threat.js` counter-read +
  enemy scaling). Put fights on the cliff and the gear that buys levels starts deciding
  them. No engine change needed.
- **Narrow engine candidate:** the Chain Link / Open Channel anti-swarm trap — *if*
  Sky judges it a bug rather than intended RPS. Small, surgical, would re-bless only
  the goldens that field those gears.
- **Optional:** make the cliff *softer* (reduce the snowball in the core damage/
  retaliation/execute math) so fights are closer more often and buildcraft expresses
  across a wider band. This is a deep combat-feel change touching the whole game and
  every golden — a deliberate Sky-owned direction, not a quick fix.

**Decision for Sky:** which (if any) of those three — and the snowball-softening one
is the only thing that would make gear matter *without* relying on matchmaking.
