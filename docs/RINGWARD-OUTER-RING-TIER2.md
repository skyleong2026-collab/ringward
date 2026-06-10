# Ringward Outer Ring — Tier-2 (with upgrades) Balance Report

**2026-06-09. Auto-play, 300 runs × 10 comps × 3 draft policies.** Extends the Tier-1 report
(`RINGWARD-OUTER-RING-BALANCE.md`). Harness: `scripts/sim/run-sim-tier2.mjs` (injects the real `UPGRADES`
via the same engine; no live-game files modified). The `none` policy reproduces Tier-1 at **1.4%** —
faithful.

## Win-rate by comp (AUTO)

| Comp | none (no upgrades) | autopick (game's auto) | greedy (good drafting) |
|------|:---:|:---:|:---:|
| **Live Anchor** (Cinderpaw+Fizzpop+Stoneward) | 0.0 | 5.7 | **7.7** |
| Balanced (Cinderpaw+Stoneward+Mossback) | 0.0 | 1.3 | **0.7** |
| **Glass Cannon** (Cinderpaw+Shadefang+Dartwing) | 11.3 | 81.3 | **92.3** |
| Mono Reactor (Cinderpaw+Fizzpop+Glowtail) | 0.0 | 22.3 | **38.3** |
| Tank Heavy (Stoneward+Ironwall+Cinderpaw) | 0.0 | 0.3 | **1.7** |
| Best Guess (Cinderpaw+Mossback+Buzzline) | 0.0 | 1.3 | **5.3** |
| Striker Rush (Swiftpaw+Dartwing+Cinderpaw) | 0.0 | 57.0 | **88.7** |
| **Control** (Frostwarden+Rimecaller+Cinderpaw) | 3.0 | 91.3 | **99.0** |
| Hex Synergy (Blightcap+Hexmoth+Cinderpaw) | 0.0 | 2.0 | **11.7** |
| Assassin Pair (Shadefang+Veilclaw+Mossback) | 0.0 | 40.7 | **57.7** |
| **OVERALL** | **1.4** | **30.3** | **40.3** |

## Three conclusions

### 1. Upgrades ARE the bridge — the ring is NOT overtuned. (Settles the open fork.)
1.4% → 30.3% (auto-pick) → 40.3% (good drafting). Upgrades lift overall win-rate **~29×**. The Outer Ring
is *correctly balanced around upgrades being load-bearing*, exactly as the Tier-1 report hypothesized.
**→ Do NOT nerf the waves.** (This retires the wave-difficulty levers in `RINGWARD-BALANCE-LEVERS.md`.)

### 2. The real problem is COMP VIABILITY, not wave difficulty.
Even with optimal drafting the spread is **0.7% → 99%** — a ~140× gap. Sort by greedy win-rate:
- **Viable (>50%):** Control 99, Glass Cannon 92, Striker 89, Assassin 58. (+ Mono Reactor 38 borderline.)
- **Non-viable (<12%):** Hex 12, Live Anchor 8, Best Guess 5, Tank Heavy 2, Balanced 1.
The ring is a **damage/tempo check** that only pure-damage and freeze-control comps pass. Tank, support,
"balanced," and hex comps **cannot win even when drafting perfectly** — their damage/tempo is too low, so
fights run long and attrition kills them. Support Types contribute too little to clear the HP checks
(Pack-Lord 300+220, boss 540+240) inside the round budget.

### 3. The natural STARTER squad is near-unwinnable — the core onboarding failure.
**Live Anchor (Cinderpaw + Fizzpop + Stoneward) = 7.7% even with good drafting** (≈ auto-pick 5.7% — the
squad is so weak that drafting barely helps). This is the squad a new player most likely fields: their two
starter Reactors + the obvious tank. **A new player's instinctive first team loses ~92% of the time**, and
no amount of good drafting saves it. First impressions die here.

## Revised tuning recommendations (supersede the wave levers)

**Reframe (external review):** the problem isn't difficulty — *the game teaches a comp fantasy that Ring 1
invalidates.* "Damage + Damage + Tank" reads as a sensible RPG team; the ring says it's an 8% team. A new
player isn't learning strategy, they're "getting a hidden quiz wrong." The lever is **comp viability +
onboarding + giving support a way to matter**, not wave stats. In priority:

1. **Make support/tank contribute to TEMPO, not just defense (the core fix).** The ring is an
   attrition-*through-time* check, so a Type that only *prevents* damage is fighting the wrong battle — it
   must **shorten time-to-kill**. Rule: *every support action should increase effective DPS or reduce kill
   time*, and **multiplicatively** (scales with the carry, not flat). Concretely: Bulwark Brace also
   *reflects* or *marks* (+dmg-taken) the target; Mender heal also *amps* the ally it heals; Booster Prime
   feeds *charge*; shield-on-absorb grants charge. **Trap:** don't turn supports into disguised DPS — they
   *enable* damage, they aren't the damage. (A creature-kit pass, NOT a wave nerf.)
2. **Seed a guaranteed-viable starter opener — target ~40–60% (not 90%).** The natural beginner squad
   (Live Anchor 7.7%) should be *over*-represented in winning runs because it teaches the game. Means:
   buff starter creatures, a starter-only passive synergy, or a guaranteed early upgrade package. **Trap:**
   don't make the tutorial squad a permanent dominant strategy — just lift it into "reasonable chance."
3. **Add support-specific VICTORY VECTORS (the most interesting structural fix).** Instead of every comp
   passing the *same* DPS check, give alternate routes to win: counter-damage that scales off enemy
   attacks; shield builds that convert excess block into damage; heal builds that bank "Momentum" → offense.
   This lets tank/healer/buffer *win differently* rather than fail the damage race. Couples naturally with
   the permanent skill-tree capstones.
4. **Lift the auto-pick floor + gate dead upgrades (watchability + draft rescue).** Auto-pick (30%) trails
   good drafting (40%) and is ~0% for weak comps; a smarter default pick + never offering heal-scaling to a
   no-healer squad (Subject-2 fix in `RINGWARD-BALANCE-LEVERS.md`) raises the passive-watch experience and
   rescues weak drafts.
5. **Optional: squad-rating tags** ("High Damage / Low Sustain / Tempo / Control", "Slow Kill Speed") so a
   player can *see* a weak comp before committing — but UI must not paper over a balance gap.
6. **Leave the waves alone.** Confirmed balanced-around-upgrades.

## Prototype experiments (2026-06-09) — what actually moves the needle
Two sim-only prototypes (`scripts/sim/run-sim-proto.mjs`, `run-sim-proto2.mjs`; greedy draft, 300 runs)
tested fix #1 before touching live code. Both **disproved the simple version** and pinned the real lever:

- **Proto 1 — tank "tempo" (a living Bulwark grants the squad an extra dmgMult, modelling Brace→mark/amp):**
  insufficient. Even ×1.5 lifts Live Anchor only 7%→**37%** (short of 40–60%) and barely moves Balanced
  (→10%) / Tank Heavy (→11%). Amplifying the carry can't rescue a comp whose *other two slots* are
  non-damage.
- **Proto 2 — support deals its OWN chip (Bulwark/Mender/Booster atk ×N):** works **only for Types that
  actually swing.** Stoneward ×3 → Anchor **77%**, Tank Heavy ×2.5 → **47%** — but **Best Guess
  (Mender+Booster) stays flat at ~4%** no matter the multiplier, because **Menders/Boosters cast
  heal/prime, they don't auto-attack** — so an atk buff is inert for them. And even for tanks it took a
  *crude* ×2.5–3 (turning the tank into a near-DPS — the "disguised DPS" trap).

**Conclusion: a single stat knob cannot fix comp viability.** Support viability is a **kit-level** problem:
- **Casters (Mender/Booster/Hexer) need their *actions* to deal or enable damage** — i.e. ChatGPT's
  "alternate victory vectors": Mend also chips/amps the ally's next hit; Prime feeds charge → faster
  payoffs; etc. You cannot reach them with a multiplier because they rarely attack.
- **Tanks (Bulwark) can be reached by chip, but bluntly** — better to give Brace a *mark/vuln* (multiplies
  the carry's damage) than to just raise tank ATK.
- **The beginner default needs more damage capability** regardless — the Anchor's dead weight is Stoneward
  (a pure-defense tank); a new player's natural team shouldn't hinge on the weakest archetype.
- **Proto 3 — Brace → MARK (real kit change; `mods.braceMark`, golden-safe, goldens re-verified):** the
  faithful tank-tempo mechanic. **Weak under AUTO** — even +60% damage-taken lifts the Anchor only to
  16.7%, because **a mark only pays off under focus-fire and the auto-AI spreads its targets** (controls
  with no Bulwark stay flat → change correctly isolated). *Secondary finding:* support mechanics that need
  AI coordination (mark, shields) are throttled by the auto-battler's lack of focus-fire; the ones that
  *work* don't need it — freeze/lockdown, sustain, raw damage. Control wins 99% because freeze stops
  enemies outright.
- **Proto 4 — buff the two starter Commons (Fizzpop + Stoneward) atk+hp:** **solves onboarding cleanly.**
  **×1.6 → Live Anchor ~50%**, dead in the 40–60% target (×1.5→35%, ×1.7→66%). Isolated: Glass Cannon (no
  starters) unchanged. It does NOT fix the heavier support comps (Balanced/Tank Heavy have one starter +
  non-damage slots) — those remain a kit problem.

## Verdict from the prototype investigation
1. **Onboarding — IMPLEMENTED ✅ (2026-06-09).** Rarity-safe starter buff applied in `roster.js`:
   **Fizzpop 220/30 → 340/44** (ATK kept below Legendary Cinderpaw's effective 49 — the Legendary keeps
   its damage crown; the buff leans into HP, a sturdy-bruiser Common), **Stoneward 320/18 → 560/38** (a
   tank — HP and chip-ATK aren't rarity-compared, so it buffs freely; identity intact). Re-sim: the
   beginner squad (Live Anchor) **7.7% → 38.7%** greedy — in the 40–60% target, ~5× lift — and it stays
   *targeted* (support comps unchanged). The 7 golden regression baselines that field these creatures as
   fixtures were re-anchored (`striker`/`assassin` flip winner→B: a base-stat *fixture* artifact, since
   real enemies use role stats); **full `npm test` suite green.** No wave changes, no new mechanics.
2. **Broad support viability — a deeper, separate effort:** no single stat/mark knob rescues
   tank/healer/booster comps. It needs both (a) kit-level *alternate victory vectors* and (b) a smarter
   auto-AI that **focus-fires** (so marks/coordination pay off). Bigger scope — tackle after onboarding.
3. **Engine note:** `mods.braceMark` was added to `src/engine/combat/skills/bulwark.js` (opt-in, default
   off, goldens byte-identical) to run proto 3. It's dormant/harmless and could become a Bulwark tree node
   *once the AI focus-fires* — but it earns its place only then; trivially revertible otherwise.

Harnesses: `scripts/sim/run-sim-proto{,2,3,4}.mjs`.

## Limitations
- AUTO only (AI driver) — a skilled human does better; these are floors. **greedy** is a heuristic, not a
  true oracle, so the real "best drafting" ceiling is *slightly* higher than 40.3% (and per-comp greedy can
  occasionally trail auto-pick by noise, e.g. Balanced).
- No permanent skill-tree mods, relics/perks, or wayside events (those only *help* the player, so true
  win-rates are somewhat higher than shown).
- 10 comps of many; the viable/non-viable split is the signal, not the exact per-comp number.

## Reproduce
```bash
node scripts/sim/run-sim-tier2.mjs 300   # table → stderr, JSON → stdout (saved: scripts/sim/results-tier2.json)
```
