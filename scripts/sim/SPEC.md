# Overnight Build Spec — Ringward Outer-Ring Balance Sim

You are a headless, unattended Claude Code agent running overnight in `/Users/sky/8gents`.
You have **no memory** of the conversation that created this file. Everything you need is here.
Execute this end-to-end, do not stop to ask questions, and do not finish until both output files
(below) exist.

---

## 0. What this is and why

Ringward is a 2D pixel roguelite (React/Vite). Its live run loop is: pick a squad → climb 4 waves →
boss → win/lose, with permanent per-creature progression. **All the systems are already coded.** The
open question is **balance/fun**, not construction. A human playtest of ONE auto run on the first ring
("The Crackling Outer Ring", marked *easy*) produced a striking result we need to verify at scale:

> Waves 1–3 were trivial (the squad barely lost HP), then the **boss (The Pack-Lord) wiped a sensible
> 3-creature mixed squad** that had taken three good upgrades. n=1, on AUTO.

Your job: **build a headless simulator, run it across many runs and squad comps, and write a balance
report** that turns that single anecdote into rates. **You do NOT change game balance or any live game
code.** Report only.

---

## 1. HARD GUARDRAILS (do not violate)

- **Do NOT edit** `src/screens/SeamLab.jsx`, `src/App.jsx`, anything under `public/`, any existing file
  under `src/`, or any existing `scripts/*.mjs`. **PORT, don't refactor.** Copy the small pure pieces
  you need into new files under `scripts/sim/`. The live game must be byte-identical when you finish.
- **Only create new files** under `scripts/sim/` and **one** report file under `docs/`.
- **Do NOT commit** to git and do NOT create branches. Leave files on disk for human review.
- **Do NOT touch** `~/.openclaw/`, the launchd job, or anything outside `/Users/sky/8gents`.
- Measure AUTO play (the AI driver). Say so plainly in the report — results are the auto-battler's
  win-rate (the relevant number for watchable auto-play); a skilled manual player may do better.

---

## 2. The engine you must use (the LIVE one)

The live run uses the **new manual combat engine** at `src/engine/combat/`, NOT the legacy
`src/engine/battleStepEngine.js`. Use the new one.

- Public surface: `src/engine/combat/index.js` — exports include `simulateAIvsAI(squadA, squadB, seed)`,
  `runBattle`, `createBattleState`, `createAIDriver`. Read this file first to confirm exact signatures.
- Unit construction: `src/engine/combat/roster.js` — `makeUnitDef(creatureId, temperament)` builds a
  fresh combat unit from `COMBAT_ROSTER`/`COMBAT_CREATURES` (each has `skillIds`). Read it.
- Skills: `src/engine/combat/skills/*.js` (+ `skills/index.js` with `getSkill`, `legalSkills`).
- **Reference for driving it headlessly:** `scripts/manual-golden.mjs` (and the other
  `scripts/manual-golden-*.mjs`) already build squads via `makeUnitDef` and run battles to completion
  deterministically. **Copy their pattern.** First run `npm run test:manual-golden` to confirm the engine
  is healthy before you build on it. If that test fails, STOP and report the environment is broken.

## 3. The run structure to port (from SeamLab.jsx — READ, then COPY)

These are **pure** (no React) and safe to copy into `scripts/sim/`:

- `wavesForGround(g, cm)` — around `SeamLab.jsx:369-383`. Builds the wave list for a ring. The **final
  wave is the boss**. Read it and the enemy/`foe(...)` builder near `SeamLab.jsx:371` (enemy stat
  scaling by depth). Copy what you need verbatim.
- The Outer Ring ground object: find it in the `HUNTING_GROUNDS` array (~`SeamLab.jsx:93-110`). Its
  `id` is the outer ring, `depth: 1`. Use it as `g`. Crossing multiplier `cm` = 1 (first crossing).
- Between-wave heal: the live run applies a **PATCHUP heal of ~18% of max HP** between waves, and HP
  **carries over** between waves. Replicate this (grep `PATCHUP`/`0.18` in SeamLab.jsx to confirm the
  exact value).

A single simulated run = build the squad units → for each wave in order: run `simulateAIvsAI`(squad vs
that wave's enemies, seed) using the engine; if the squad wins, carry survivors' HP forward, apply the
between-wave heal, continue; if it loses, record the wave index of death and end the run.

## 4. Tiers (do Tier 1 fully; Tier 2 only if it's clean)

**TIER 1 — REQUIRED.** Squad + waves + boss only. No upgrades, no wayside events. This is the headline
and is the most portable slice. Deliver this no matter what.

**TIER 2 — ONLY IF FEASIBLE without violating the guardrails.** Port the 1-of-3 roguelike upgrades
(`UPGRADES` ~`SeamLab.jsx:750-793`, offered via `rollOffer` ~`:2772`) with a simple greedy pick policy,
and/or the wayside events (`WAYSIDE_EVENTS` ~`:433-706`). If porting either is messy or risks touching
live code, **SKIP IT and say so explicitly in the report** (a clearly-labelled "not simulated"
limitation is correct; silent omission is not). Never fake coverage.

## 5. Squad comps to test (Tier 1)

Enumerate the roster (`roster.js`) first. Then run **≥300 runs per comp** (vary the seed each run;
combat is seed-deterministic) for a representative set covering the 8 Types, including at minimum:

1. **The live-anchor comp**: Cinderpaw (Legendary Reactor) + Fizzpop (Common Reactor) + Stoneward
   (Bulwark). This reproduces the human playtest — use it as your sanity anchor (see §7).
2. A **balanced** comp: a damage Type + Bulwark (tank) + Mender (healer), if those creatures exist.
3. A **glass** comp: 3 damage creatures, no tank.
4. **Mono-Type**: 3 of one Type (e.g. 3 Reactors).
5. **Tank-heavy**: 2 Bulwark + 1 damage.
6. A **best-guess strong** comp: your read of the strongest 3 available.

If a Type/role creature doesn't exist in the roster, adapt and note it. Keep total runs bounded
(roughly 6–10 comps × 300–500 runs = a few thousand battles; node handles this in seconds-to-minutes).

## 6. Metrics to collect & report

Per comp, and aggregated:
- **Overall run win-rate** (cleared the boss / total runs).
- **Per-wave conditional clear-rate**: given you reached wave *i*, did you clear it? (This reveals the
  curve shape — we expect waves 1–3 ≈ very high, boss ≈ much lower.)
- **Wave-of-death distribution** (where runs end). Is it concentrated on the boss?
- **Encounter length**: median rounds per wave (is the boss long/grindy or a sudden spike?).
- **HP attrition**: median squad HP% entering each wave.
- **Skill dominance**: aggregate from the battle event stream (`runBattle`'s `onEvent` emits per-turn
  events with `event.skill.id`; see `engine.js` and `manual-golden.mjs` for the event shape). Report
  each skill's usage count and win-correlation; flag skills that are never/rarely used (dead) or that
  dominate winning runs.
- (Tier 2, if done) **Upgrade pick/impact**: which upgrades correlate with wins; flag dead ones
  (e.g. heal-scaling upgrades for healer-less comps — the human playtest saw "Wellspring: heals +40%"
  offered twice to a no-healer squad).

## 7. SANITY CHECKS — do these BEFORE trusting any output

You must not report false confidence. Verify:
1. `npm run test:manual-golden` passes (engine healthy). If not, STOP and report.
2. Sim output is **not degenerate**: if *every* comp shows 0% or *every* comp shows 100%, the harness is
   almost certainly mis-wired (e.g. enemy generation empty, or squad/enemy sides swapped). Investigate
   and fix the harness — do NOT report a degenerate result as a finding.
3. **Live anchor**: on the anchor comp (§5.1, no upgrades), the wave-of-death should concentrate at the
   **final/boss wave**, not wave 1 — matching the human playtest (easy early waves, boss wall). If the
   sim instead kills the squad on wave 1, your difficulty wiring is off; reconcile it before reporting.
   (Note: Tier-1 has no upgrades, so it should be *as hard or harder* than the live run, which had three
   upgrades and still lost at the boss — boss death should be common. That's consistent, not a bug.)
4. Spot-check one run with verbose per-turn logging and confirm the numbers are physically sane
   (damage, HP, rounds). Include that trace path in the report.

## 8. OUTPUT (both files MUST exist when you finish)

1. **`docs/RINGWARD-OUTER-RING-BALANCE.md`** — the report. Structure:
   - One-paragraph TL;DR answering: *Is the Outer Ring's curve inverted (trivial waves → boss wall), and
     what's the auto win-rate?*
   - Methodology (engine used, # comps, # runs, what was Tier-1 vs skipped Tier-2, the AUTO caveat).
   - Results tables: win-rate by comp; per-wave conditional clear-rate; wave-of-death distribution;
     encounter length; skill dominance (+ upgrades if Tier 2).
   - The difficulty-curve verdict, explicitly compared to the live anchor.
   - **Concrete tuning hypotheses** (numbers you'd try — e.g. "boss HP −X%, waves 1–2 +Y%") presented as
     *proposals for human review*, NOT applied.
   - Limitations / what wasn't simulated.
2. **`scripts/sim/SUMMARY.txt`** — ≤ 8 short lines, plain text, for a phone notification. Lead with the
   headline number(s): overall auto win-rate, the boss conditional clear-rate vs early waves, the single
   biggest finding, and "full report: docs/RINGWARD-OUTER-RING-BALANCE.md".

Also leave your harness in `scripts/sim/` (e.g. `run-sim.mjs` + any ported helpers) so a human can re-run
it. Make it runnable via `node scripts/sim/run-sim.mjs`.

## 9. Workflow

1. Read `src/engine/combat/index.js`, `roster.js`, `scripts/manual-golden.mjs`, and the relevant
   `SeamLab.jsx` sections (§3).
2. Run `npm run test:manual-golden` (sanity gate).
3. Build the harness in `scripts/sim/` (port pure logic; do not edit live files).
4. Validate with a tiny run (e.g. 5 runs) and the §7 checks; fix the harness until sane.
5. Run the full sweep (Tier 1; Tier 2 if clean).
6. Write the report + SUMMARY.txt.
7. Re-confirm both output files exist and are non-empty. Done.

Work carefully and deterministically. Prefer a correct, well-sanity-checked Tier-1 result over an
ambitious but unverified one.
