# ⚔ Ringward — PvP Team Archetypes (design note)

> **Status: FORWARD DESIGN — PvP is not in the live game.** PvP was retired in vF-BH (`PvpScreen.jsx` /
> `pvp.js` on disk, unimported). This note captures the archetype thinking from the 2026-06-09 design chat
> so it isn't lost. Companion to §31 (Relic Recut) — recut is the dial that lets players build *into* these.
> (Mirror to Notion under the GDD when reachable.)

## The master variable: speed
Sky's Summoners-War instinct is right — **speed decides PvP**, and Ringward already has the axis:
- **SPD** sets turn order.
- The **Tempo** relic set (+charge start) accelerates your payoff.
- Warden's **freeze literally steals enemy turns.**

So every archetype below is, underneath, a bet on the speed axis: **go fast and act first**, or **go slow and
survive the first exchange.**

## The archetypes (grounded in the 8 Types)

**1. Speed-Lock** — outspeed + control. Warden + Booster/Striker. Out-speed, freeze their key threat out of
its turns, snowball before they act. *Enablers:* Tempo set, freeze keystones, shatter (hit frozen harder).
→ **beats** burst & DoT (never get going); **loses to** tanky bruisers (survive the lock) and freeze-immunity.

**2. Tanky Bruiser** — attrition. Bulwark + Mender. Soak, heal, reflect, lifesteal; win by outlasting.
*Enablers:* Warden set (+HP), Lifeblood (+lifesteal), thorns. → **beats** burst & aggro; **loses to** Hexer
curse / anti-heal and stacked DoT (ignores the wall).

**3. Burst Nuke** — glass cannon. Reactor + Booster. Charge up, amp the carry, one huge payoff. *Enablers:*
Berserker set (+dmg), amp stacking, charge accel. → **beats** squishies & half-tanks fast; **loses to**
speed-lock (frozen before it pops) and real walls.

**4. Decay / DoT** — you're already dead. Reactor burn + Hexer curse + poison. Stack burn/poison, curse so
they take more from everyone, ignore shields. → **beats** tanky bruisers (anti-heal out-paces healing);
**loses to** fast burst (killed before it ramps) and cleanse.

**5. Swarm Aggro** — death by a thousand cuts. Striker + Assassin. Flood fast small hits + execute the weak.
*Enablers:* SPD, executioner, opener. → **beats** burst & squishies; **loses to** reflect/thorns (many hits
punished) and bulk.

**6. Amp-Carry** — one wrecking ball. Booster + a single carry. Stack amp + focus one unit into an unkillable
threat. → **beats** slow durable teams; **loses to** decapitation (kill/freeze the carry *or* the Booster).

## Why it's healthy
It's a **loop, not a best deck**: Speed > Burst/DoT, Tank > Burst/Aggro, DoT > Tank, Aggro > Burst, etc. No
single team is safe → building becomes reading the meta and counter-picking. That's the SW depth.

## Three connections
- **The bones already exist.** The 4 relic sets basically *are* these lanes: Tempo = speed, Warden = tank,
  Berserker = burst, Lifeblood = bruiser sustain.
- **Recut (§31) is the archetype dial.** The same damage relic recut for *tempo* vs *raw burst* vs
  *anti-frozen* is what lets a player commit to Speed-Lock or Burst on purpose. Build-expression **is**
  archetype diversity — same idea, one system.
- **The auto-AI catch.** In *async auto* PvP, sequencing-heavy decks (Amp-Carry, Burst — "buff *then* nuke")
  are limited by how smart the defense AI is (the support rebalance proved the auto-AI won't sequence buffs
  well). So either the PvP defense-AI gets smarter, *or* those decks only shine in live/manual play. A real
  input to the async-auto-vs-live-PvP fork.

## Downstream questions (parked)
- **Async auto-PvP** (set a build, sim resolves — pure buildcraft, cheap to ship) **vs live manual PvP**
  (real-time piloting, build + execution, highest ceiling, hardest to build).
- How speed/turn-order reads to the player in a PvP context (it's currently a PvE pacing detail).

*Captured by the main build instance, 2026-06-09, from the live engine (8 Types, SPD/charge/freeze, the 4
relic sets) and the §31 recut spec.*
