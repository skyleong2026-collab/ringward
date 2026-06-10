# Ringward — Support Role Contribution to Time-to-Kill (Outer Ring)

**Harness:** `scripts/sim/role-contribution.mjs` · run with `node scripts/sim/role-contribution.mjs [runs]`
**Date:** 2026-06-09 · **Runs:** 300/condition · **Mode:** AUTO (AI-vs-AI) · **Tier:** **Tier-1 only — no roguelike upgrades drafted** (clean baseline-kit signal)
**Ground:** The Crackling Outer Ring (4 waves: Scouts → The Pack → The Pack-Lord → boss *The Cinder Maw* + Tender)

## Question

Prior sim work shows the Outer Ring is a damage/tempo check: pure-damage comps win 90–99%, tank/support comps win <8% even drafting well. **Hypothesis: support units (Bulwark/tank, Mender/healer, Booster) contribute almost nothing to kill speed.** This harness measures that by ablation.

## Method (ablation)

Run the full 4-wave run over 300 **shared** seeds, recording rounds-to-clear per wave + win-rate; then run the same comp with the support unit **removed**, same seeds. The support's "tempo contribution" = how much its presence *reduces* rounds-to-clear and *raises* clear-rate.

A 2-unit squad **never reaches Wave 3** on the Outer Ring (verified — see DUO framing), so the requested W3/W4 headline is only measurable with a viable squad. The harness therefore runs **two framings**:

- **TRIO (primary)** — `cinderpaw + dartwing + support` ablated to `cinderpaw + dartwing`. This is the "removed → a 2-creature squad" reading and the only one that produces W3/W4 rounds. It also reports a **same-slot swap** (support in slot 3 vs a 3rd DPS, `shadefang`) which isolates kill-speed *without* the squad-size confound.
- **DUO (confirmation)** — `cinderpaw + support` ablated to `cinderpaw` alone (the literal carry+support pairing). Only Waves 1–2 are ever cleared at this size.

> Sanity checks (all pass): the 2-DPS squad clears the early waves (W1 100%); "with tank" win-rate sits at 0% (within the known ~0–3% Tier-1 band); a 3-DPS comp wins 20% (damage ≫ support, directionally matching "pure-damage wins"); rounds are sane (2–12), not absurd. Harness validated against squad-size depth scaling before reporting.

---

## Results — TRIO framing (primary)

### Win-rate (full 4-wave run)

| Squad | Win% |
|---|---:|
| cinderpaw + dartwing (no support, baseline) | 0.0 |
| **cinderpaw + dartwing + shadefang (3-DPS ceiling)** | **20.0** |
| cinderpaw + dartwing + stoneward (Bulwark/tank) | 0.0 |
| cinderpaw + dartwing + ironwall (Bulwark/tank) | 0.0 |
| cinderpaw + dartwing + mossback (Mender/healer) | 0.0 |
| cinderpaw + dartwing + buzzline (Booster) | 0.0 |

### Median rounds-to-clear per wave (lower = faster kill; among runs that reached & cleared)

| Squad | W1 | W2 | **W3 (Pack-Lord)** | **W4 (boss)** |
|---|---:|---:|---:|---:|
| cinderpaw + dartwing (baseline) | 3 | 6 | — | — |
| **cinderpaw + dartwing + shadefang (3-DPS ceiling)** | **2** | **4** | **4** | **7** |
| cinderpaw + dartwing + stoneward | 3 | 7 | 12 | — |
| cinderpaw + dartwing + ironwall | 3 | 9 | — | — |
| cinderpaw + dartwing + mossback | 3 | 5 | — | — |
| cinderpaw + dartwing + buzzline | 3 | 8 | — | — |

`—` = no run reached & cleared that wave.

### Same-slot swap — support vs a 3rd DPS in slot 3 (isolates kill-speed, no size confound)

`Δrounds = support_rounds − dps_rounds` (>0 = support is *slower* than a DPS in the same slot). `clr%` conditional on reaching the wave.

| Support | Role | Δwin% | ΔW3 rounds | ΔW4 rounds | W3 clr% (sup / dps) | W4 clr% (sup / dps) |
|---|---|---:|---:|---:|---|---|
| stoneward | Bulwark/tank | **−20.0** | **+8.0** (12 vs 4) | — | 7.3 / 100.0 | 0.0 / 20.0 |
| ironwall | Bulwark/tank | **−20.0** | — (never reaches) | — | 0.0 / 100.0 | 0.0 / 20.0 |
| mossback | Mender/healer | **−20.0** | — (never reaches) | — | 0.0 / 100.0 | 0.0 / 20.0 |
| buzzline | Booster | **−20.0** | — (never reaches) | — | 0.0 / 100.0 | 0.0 / 20.0 |

## Results — DUO framing (confirmation: carry + support vs carry alone)

| Squad | Win% | W1 rounds | W2 rounds | W1 clr% | W2 clr% |
|---|---:|---:|---:|---:|---:|
| cinderpaw alone (baseline) | 0.0 | — | — | 0.0 | 0.0 |
| cinderpaw + dartwing (2-DPS ref) | 0.0 | **3** | **6** | 100.0 | 5.0 |
| cinderpaw + stoneward (tank) | 0.0 | 6 | — | 84.3 | 0.0 |
| cinderpaw + ironwall (tank) | 0.0 | 5.5 | — | 100.0 | 0.0 |
| cinderpaw + mossback (healer) | 0.0 | 5.5 | — | 100.0 | 0.0 |
| cinderpaw + buzzline (booster) | 0.0 | — | — | **0.0** | 0.0 |

Note: a 2nd DPS clears W1 in **3** rounds; every tank takes **~6** (≈2× slower) for the same clear. The booster duo can't even clear Wave 1.

---

## Verdict per support role

**The hypothesis holds: on AUTO, every support role contributes ~0 to kill speed.** No support comp won a single one of 300 runs; swapping any support for a DPS in the same slot buys **+20 percentage points of win-rate** and clears the Pack-Lord 100% of the time (4 rounds) instead of ~0–7%.

### Bulwark / tank (stoneward, ironwall) — dead weight on tempo (the "least dead" of the three)
- **Cuts boss rounds by ~0** — never reaches the boss. Stoneward drags only 7.3% of runs to the Pack-Lord, and when it does it takes **12 rounds vs a DPS's 4** (3× slower). Ironwall never reaches W3 at all and *slows* W2 to 9 rounds (vs a DPS's 4).
- The tank's body soaks enemy turns but its chip damage barely ends fights. Stoneward (buffed to 560 HP / 38 ATK) is the *least* useless support purely because its 38 ATK actually deals some damage — but it's still 0 wins. Ironwall (300 HP / 20 ATK) is strictly worse.
- **Survivability without throughput just lengthens the loss.**

### Mender / healer (mossback) — dead weight on kill speed
- **Cuts boss rounds by ~0** — never reaches W3 in the trio. Its only positive blip is a marginal W2 sustain in the duo (median 5 vs the 2-DPS's 6), and that's healing keeping the carry's existing DPS alive, not adding any.
- Healing extends fights without ending them faster. Against the Outer Ring's HP/tempo wall, "outlast" loses to "out-damage."

### Booster (buzzline) — worst; actively negative
- **Cuts boss rounds by ~0** — never reaches W3; *slows* W2 to 8 rounds. In the duo it **cannot clear even Wave 1** (0% clr), the only support that fails the opening fight.
- Its 14 ATK is a near-zero-damage body, and its boost skills (prime/overdrive/resonate) don't register on AUTO — the AI doesn't sequence a buff before the carry's big hit, so the multiplier lands on nothing.

---

## Implications for a support-kit rebalance

The common failure: these kits trade the slot's **damage throughput** for mitigation/sustain/buffs that don't convert into faster kills. On the Outer Ring (a pure tempo check) that trade is always losing. Each role needs a kit hook that turns its identity into **team DPS**, not just survival.

- **Bulwark — Brace cuts boss rounds by ~0 → Brace needs a tempo effect.** Make mitigation generate offense: e.g. a **damage-taken "mark"** that makes the marked enemy take +X% from the whole squad, or Brace **returns a fraction of blocked damage as a team-wide attack**. Turn "I absorbed a hit" into "the squad hits harder."
- **Mender — healing adds 0 kill speed → couple sustain to throughput.** e.g. **overheal converts to a reflect-shield**, Bloom adds a heal-over-time that **also ticks damage on the lowest-HP enemy**, or mending a unit grants it a **temporary ATK buff** (sustain → damage).
- **Booster — the buff is invisible on AUTO → make it big and front-loaded, and fix sequencing.** Prime should be a **large burst multiplier on the carry's next hit** with the AI driver casting it *before* the nuke; failing that, give Boosters real self-ATK so the slot isn't a dead body (buzzline can't clear Wave 1 today).

### Caveat
This is **AUTO (AI-vs-AI), Tier-1 (no upgrades)**. Support kits that reward smart timing (buff before a nuke, pre-emptive shield) are systematically *undersold* by the AI driver, and the unit-scope support upgrades (aegisreflex/lifebloom/powerchord and their chains) that might add tempo are excluded by design for a clean baseline signal. A human, or a fully-drafted run, may extract more. But AUTO is the auto-battler / idle path the game ships, and on that path the baseline support kits contribute essentially nothing to time-to-kill.
