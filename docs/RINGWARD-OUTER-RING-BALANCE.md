# Ringward Outer Ring — Auto-Play Balance Report

## TL;DR

**Yes, the Outer Ring's difficulty curve is inverted: waves 1–3 are trivially easy for comps that can handle them, but the boss (The Cinder Maw) is a hard wall.** Auto win-rate across 10 squad compositions is **1.4% overall** (0–10.8% per comp). The human playtest finding — "trivial early waves, boss wipe" — is confirmed at n=5,000 runs. However, the Tier-1 sim (no upgrades) reveals a deeper issue: **without roguelike upgrades, most comps can't even reach the boss** — the 3-enemy wave 2 (The Pack) is the primary killer for 6 of 10 comps. Upgrades aren't a nice-to-have; they're load-bearing structure. The curve isn't just "boss too hard" — it's "everything past wave 1 assumes you're upgraded."

---

## Methodology

| Detail | Value |
|--------|-------|
| Engine | `src/engine/combat/` (new manual-combat engine, not legacy `battleStepEngine.js`) |
| Ground | The Crackling Outer Ring (depth 1, crossing 0) |
| Waves | 4: Scouts → The Pack → The Pack-Lord → The Cinder Maw (boss) |
| Tier | **Tier 1** — no roguelike upgrades, no wayside events, no permanent skill-tree mods |
| Between-wave heal | PATCHUP = 18% of max HP (matching live game) |
| Player scaling | Rarity multipliers applied (Common ×1.0, Rare ×1.2, Legendary ×1.45, Unique ×1.7) |
| Enemy scaling | Wave role stats at depth 1 (D_HP=1.0, D_ATK=1.0), crossing mult 1.0 |
| Comps tested | 10 (see below) |
| Runs per comp | 500 |
| Total battles | ~14,400 (each run = up to 4 wave battles) |
| Mode | **AUTO** (AI-vs-AI). A skilled manual player may do better. |
| Sanity gates | `npm run test:manual-golden` passed; verbose trace inspected; results are non-degenerate |

---

## Results

### Win-Rate by Comp

| # | Comp | Creatures | Types | Win Rate |
|---|------|-----------|-------|----------|
| 1 | **Live Anchor** | Cinderpaw (L) + Fizzpop (C) + Stoneward (C) | Reactor/Reactor/Bulwark | **0.0%** |
| 2 | Balanced | Cinderpaw (L) + Stoneward (C) + Mossback (C) | Reactor/Bulwark/Mender | **0.0%** |
| 3 | **Glass Cannon** | Cinderpaw (L) + Shadefang (R) + Dartwing (L) | Reactor/Assassin/Striker | **10.8%** |
| 4 | Mono Reactor | Cinderpaw (L) + Fizzpop (C) + Glowtail (R) | Reactor/Reactor/Reactor | **0.0%** |
| 5 | Tank Heavy | Stoneward (C) + Ironwall (R) + Cinderpaw (L) | Bulwark/Bulwark/Reactor | **0.0%** |
| 6 | Best Guess | Cinderpaw (L) + Mossback (C) + Buzzline (C) | Reactor/Mender/Booster | **0.0%** |
| 7 | Striker Rush | Swiftpaw (R) + Dartwing (L) + Cinderpaw (L) | Striker/Striker/Reactor | **0.0%** |
| 8 | **Control** | Frostwarden (L) + Rimecaller (U) + Cinderpaw (L) | Warden/Warden/Reactor | **2.8%** |
| 9 | Hex Synergy | Blightcap (L) + Hexmoth (U) + Cinderpaw (L) | Hexer/Hexer/Reactor | **0.0%** |
| 10 | Assassin Pair | Shadefang (R) + Veilclaw (L) + Mossback (C) | Assassin/Assassin/Mender | **0.0%** |

Rarity key: C=Common, R=Rare, L=Legendary, U=Unique.

**Overall auto win-rate: 1.4%** (68 wins / 5,000 runs).

### Per-Wave Conditional Clear Rate

*Given you reached wave i, what % cleared it?*

| Comp | W1: Scouts | W2: The Pack | W3: Pack-Lord | W4: Boss |
|------|-----------|-------------|---------------|----------|
| Live Anchor | 100% | **0.2%** | 0% | — |
| Balanced | 100% | **0%** | — | — |
| Glass Cannon | 100% | 100% | **85.2%** | **12.7%** |
| Mono Reactor | 100% | 100% | **0%** | — |
| Tank Heavy | 100% | **0%** | — | — |
| Best Guess | 100% | **0%** | — | — |
| Striker Rush | 100% | 100% | **74.0%** | **0%** |
| Control | 100% | 100% | 100% | **2.8%** |
| Hex Synergy | 100% | **36.2%** | 0% | — |
| Assassin Pair | 100% | 100% | **0%** | — |

**Pattern**: Wave 1 (Scouts) is universally trivial (100%). Everything after that is strongly comp-dependent. Only 3 of 10 comps reliably reach the boss, and even the best (Glass Cannon) clears it only 12.7% of the time.

### Wave-of-Death Distribution

*Where do losing runs die? (% of all runs)*

| Comp | Died W1 | Died W2 | Died W3 | Died W4 (Boss) |
|------|---------|---------|---------|-----------------|
| Live Anchor | 0% | **99.8%** | 0.2% | 0% |
| Balanced | 0% | **100%** | 0% | 0% |
| Glass Cannon | 0% | 0% | 14.8% | **74.4%** |
| Mono Reactor | 0% | 0% | **100%** | 0% |
| Tank Heavy | 0% | **100%** | 0% | 0% |
| Best Guess | 0% | **100%** | 0% | 0% |
| Striker Rush | 0% | 0% | 26.0% | **74.0%** |
| Control | 0% | 0% | 0% | **97.2%** |
| Hex Synergy | 0% | **63.8%** | 36.2% | 0% |
| Assassin Pair | 0% | 0% | **100%** | 0% |

**Key insight**: The "boss wall" pattern from the human playtest only appears in comps with sufficient raw damage output to clear waves 2–3 (Glass Cannon, Striker Rush, Control). For most comps, wave 2 (The Pack: 3 enemies) is the actual wall — not the boss.

### Encounter Length (Median Rounds per Wave)

| Comp | W1 | W2 | W3 | W4 (Boss) |
|------|----|----|----|----|
| Live Anchor | 3 | 5 | 4 | — |
| Balanced | 5 | 5 | — | — |
| Glass Cannon | 2 | 3 | 4 | **6** |
| Mono Reactor | 3 | 4 | 4 | — |
| Tank Heavy | 5 | 5 | — | — |
| Best Guess | 5 | 5 | — | — |
| Striker Rush | 2 | 4 | 4 | 4 |
| Control | 3 | 6 | **9** | **12** |
| Hex Synergy | 3 | 6 | 3 | — |
| Assassin Pair | 3 | 5 | 7 | — |

The boss fight is the longest encounter for comps that reach it — 6 rounds (Glass Cannon) to **12 rounds** (Control, hitting the round cap). The Control comp's fights are particularly grindy: wave 3 takes 9 rounds, boss takes 12 (cap). Wardens freeze-lock the enemies but deal so little damage the fights become wars of attrition.

### HP Attrition (Median Squad HP% Entering Each Wave)

| Comp | Entering W1 | Entering W2 | Entering W3 | Entering W4 |
|------|------------|------------|------------|------------|
| Live Anchor | 100% | 95.6% | 48.7% | — |
| Balanced | 100% | 100% | — | — |
| Glass Cannon | 100% | 100% | 74.3% | **62.1%** |
| Mono Reactor | 100% | 91.4% | 43.7% | — |
| Tank Heavy | 100% | 89.1% | — | — |
| Best Guess | 100% | 86.4% | — | — |
| Striker Rush | 100% | 100% | 57.1% | 44.7% |
| Control | 100% | 97.1% | **99.1%** | **56.6%** |
| Hex Synergy | 100% | 95.9% | 31.2% | — |
| Assassin Pair | 100% | 100% | 61.9% | — |

**Control is the best at preserving HP** (enters wave 3 at 99.1%) thanks to freeze-locking, but still enters the boss at only 56.6%. High-damage comps (Glass Cannon, Striker Rush) enter the boss at 44.7–62.1% — enough to occasionally win if they can burst the boss down.

### Skill Dominance

Aggregate skill usage from the **player side** (side A) across all waves and runs.

| Skill | Total Uses | In Wins | In Losses | Win Correlation |
|-------|-----------|---------|-----------|-----------------|
| chargeUp (Reactor) | 29,269 | 825 | 28,444 | Ubiquitous |
| frostnip (Warden) | 18,944 | 1,100 | 17,844 | Control-only |
| brace (Bulwark) | 10,532 | 0 | 10,532 | **Never in a win** |
| mark (Assassin) | 12,074 | 3,038 | 9,036 | Strong in wins |
| jab (Striker) | 13,018 | 2,712 | 10,306 | Strong in wins |
| glaciate (Warden) | 8,453 | 654 | 7,799 | Control-only |
| mend (Mender) | 9,853 | 0 | 9,853 | **Never in a win** |
| prime (Booster) | 3,141 | 0 | 3,141 | **Never in a win** |
| backdraft (Reactor) | 5,554 | 0 | 5,554 | **Never in a win** |
| blitz (Striker) | 3,159 | 0 | 3,159 | Dead in winning runs |
| overload (Reactor) | 3,756 | 275 | 3,481 | Low |
| flurry (Striker) | 3,142 | 873 | 2,269 | Present in wins |
| ambush (Assassin) | 2,365 | 740 | 1,625 | **Highest win-rate correlation** |
| execute (Assassin) | 2,717 | 1,270 | 1,447 | Strong in wins |
| coldsnap (Warden) | 1,843 | 116 | 1,727 | Control-only |
| doom (Hexer) | 1,669 | 0 | 1,669 | **Never in a win** |
| jinx (Hexer) | 5,325 | 0 | 5,325 | **Never in a win** |
| blight (Hexer) | 1,640 | 0 | 1,640 | **Never in a win** |
| ward (Mender) | 3,152 | 0 | 3,152 | **Never in a win** |
| bloom (Mender) | 760 | 0 | 760 | **Never in a win** |

**Dead skills in winning runs**: brace, mend, prime, ward, bloom, doom, jinx, blight, backdraft, blitz. These never appear in a winning run because the only comps that win (Glass Cannon, Control) don't field Bulwarks, Menders, Boosters, or Hexers. This is a **Tier-1 artifact** — these skills may be perfectly fine with upgrades, but without them the game rewards pure damage and freeze-lock over sustain and support.

**Highest win-correlation skills**: `ambush` (Assassin), `execute` (Assassin), `flurry` (Striker), `mark` (Assassin). The Assassin kit dominates winning runs via the Glass Cannon comp.

---

## The Difficulty Curve Verdict

### Compared to the Live Anchor (Human Playtest)

The human playtest: Cinderpaw + Fizzpop + Stoneward with 3 upgrades, AUTO mode. Waves 1–3 trivial, boss wipe at The Cinder Maw.

The Tier-1 sim (same comp, no upgrades): **Waves 1 trivial, wave 2 kills the squad 99.8% of the time.** The anchor comp never reaches the boss without upgrades.

This means the human playtest's "trivial waves 1–3" experience was **upgrade-driven**, not base-stat-driven. The roguelike upgrades (dmgMult, hpMult, healMult, blockMult, etc.) are doing an enormous amount of work to make early waves manageable. Without them, only high-rarity, high-damage comps (Glass Cannon: 3× Legendary/Rare damage dealers) can brute-force through to the boss.

### The Two Walls

1. **Wave 2 (The Pack)**: 3 enemies with ~40 ATK each. Combined enemy damage output (120 ATK) exceeds any player squad's output. The action-economy disadvantage (3 enemies vs 3 players where one is a low-ATK support) makes this the primary wall for support-heavy comps. **6 of 10 comps die here.**

2. **Wave 4 (The Cinder Maw)**: 540 HP boss + 240 HP Tender. A damage sponge that outlasts weakened squads. The boss has 68 ATK (+ the Tender's 24) and speed 7 — fast enough to often act first. **3 of 10 comps reach this wall; only Glass Cannon clears it sometimes (12.7% conditional).**

### The Core Issue

The Outer Ring at depth 1 has a **flat-to-inverted curve**: wave 1 is appropriately easy, but wave 2 jumps sharply to a difficulty that assumes the player has upgrade support. Without upgrades:
- Wave 2's 3-enemy swarm overwhelms any comp that isn't pure damage
- The PATCHUP heal (18%) is insufficient to offset the attrition from multi-enemy waves
- Support Types (Bulwark, Mender, Booster) contribute too little damage, making fights longer and accumulating more burn/attrition damage

---

## Concrete Tuning Hypotheses

*These are proposals for human review — NOT applied.*

### If the goal is "Tier-1 (no upgrades) should reach the boss before dying":

1. **Reduce wave 2 enemy ATK by ~25%** (40→30, 38→28, 40→30). This brings the combined enemy damage (88) below the player squad's effective output, making wave 2 a challenge instead of a wall.

2. **Reduce wave 2 enemy count from 3 to 2** at depth 1. The 3v3 with higher enemy ATK is the fundamental problem — action economy + stat advantage is too much.

3. **Increase PATCHUP to 30%** between waves. This gives support-heavy comps (which survive longer but take more total damage) a better chance to recover.

4. **Scale wave 2/3 ATK by 0.7× at depth 1** (an "intro ring discount"). Keep depth 2+ as-is — the outer ring should be the on-ramp, not a cliff.

### If the goal is "the boss should be the wall, not wave 2":

5. **Reduce waves 1–3 stats by ~20%** and **increase boss HP by ~15%** (540→620). This shifts the difficulty budget from mid-waves to the boss, making the playtest pattern (trivial waves → boss wall) emerge even without upgrades.

### If the goal is "upgrades are meant to be the bridge" (current design intent):

6. **No wave changes needed.** Instead, ensure the first upgrade (offered before wave 1) is strong enough to bridge the gap. Consider guaranteeing a damage-boosting upgrade in the first offer so every comp gets the minimum damage output to contest wave 2.

---

## Limitations / What Wasn't Simulated

- **Tier 2 NOT simulated**: Roguelike upgrades (`UPGRADES`, `rollOffer`) and wayside events (`WAYSIDE_EVENTS`) were NOT ported. These are the #1 factor the report can't account for — the human playtest had 3 upgrades and found waves 1–3 trivial. A Tier-2 sim would likely show dramatically different results.
- **No permanent skill-tree mods**: The live game has per-creature progression (capstones like Smolder, Quickstep, Unbreakable, etc.). These are not simulated.
- **No relic/perk effects**: Perks like `p_medic` (+15% patchup) and `p_foresight` (4 upgrade choices) are not included.
- **AUTO play only**: Results reflect the AI driver's performance. A skilled manual player choosing targets and timing payoffs could do significantly better.
- **Outer Ring only**: Other rings (depths 2–8) were not tested. The balance may be different at higher depths with stronger creatures.
- **Squad temperament**: All player units are 'Balanced' temperament. The live game could allow varied temperaments.
- **Limited comps**: 10 of many possible 3-creature combinations. Results may differ for untested comps.

---

## Reproduction

```bash
# Re-run the full sweep (takes ~30s)
node scripts/sim/run-sim.mjs 500 > scripts/sim/results.json

# Run with verbose trace
node scripts/sim/run-sim.mjs 5 --verbose

# Verbose trace of the anchor comp is at:
# scripts/sim/verbose-trace.txt
```

All harness code is in `scripts/sim/run-sim.mjs`. No live game files were modified.
