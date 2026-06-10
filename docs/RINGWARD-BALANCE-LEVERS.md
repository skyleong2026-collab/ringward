# Ringward — Outer-Ring Balance Levers (prove-it-fun)

**Status: design notes, 2026-06-08. Proposals to confirm against data — do NOT apply blind.**
Pair this with the overnight sim report at `docs/RINGWARD-OUTER-RING-BALANCE.md` (lands ~00:40,
2026-06-09). This doc names the exact knobs (file:line + current value) so the morning is "read the sim
→ pull a lever," not "go hunting." Every number below is a *hypothesis*; the sim's win-rate /
wave-of-death / skill-dominance data decides which to pull and how far.

---

## ⚠ SIM UPDATE (2026-06-09) — read first; supersedes parts of Subject 1
The Tier-1 sim (10 comps × 500 runs, AUTO, **no upgrades**) landed (`docs/RINGWARD-OUTER-RING-BALANCE.md`).
- **1.4% win-rate; most comps die at WAVE 2** (The Pack, 3×~40 ATK), not the boss. The playtest's
  "trivial early waves" were **entirely upgrade-driven** — without upgrades, wave 2 is the wall.
- **→ RETRACTED: the "give W2 teeth" lever and the v2 wave-table below.** Buffing W2 is backwards.
- Reframe: not "flat→cliff" but **"everything past wave 1 assumes you're upgraded."** The ring rewards
  **pure damage** (Glass Cannon 10.8%); every support skill (brace/mend/ward/bloom/prime/doom) is *never
  in a win* at Tier 1 — but that's likely a Tier-1 artifact, not proof support is broken.
- **RESOLVED (Tier-2 sim, `docs/RINGWARD-OUTER-RING-TIER2.md`): upgrades bridge it** — 1.4% → 30% (auto)
  → 40% (good drafting). The ring is balanced-around-upgrades; **do NOT nerf the waves.** The real problem
  is **comp viability + onboarding**: only damage/control comps win (Control 99%, Glass Cannon 92%), while
  tank/support/balanced AND the natural **starter squad (Live Anchor, 7.7% even drafting well)** are
  near-unwinnable. The tuning lever moved from *wave stats* to *creature/role balance + the starter trio*.
- Subjects 2–4 (heal-reward gating, merchant floor) still stand and are *more* urgent now that upgrades
  are proven load-bearing (a dead draft can be fatal).

## The live anchor (n=1 human playtest, AUTO)
Squad: Cinderpaw (Leg Reactor 290/49) + Fizzpop (Common Reactor 220/30) + Stoneward (Bulwark 320/18).
Upgrades taken: Thick Hide → Wildfire → Second Wind. Result: **wiped on wave 3 ("The Pack-Lord"), never
reached the named boss (The Cinder Maw, wave 4).** Waves 1–2 were trivial (squad barely scratched).
So the wall is the **wave-3 elite pack**, and the curve is **flat-then-cliff**.

---

## SUBJECT 1 — The difficulty curve (flat → cliff)

Outer Ring = depth 1, so `D_HP(1)=D_ATK(1)=1.0` (`SeamLab.jsx:357-358`) — the raw wave numbers below ARE
the live stats. Wave builder: `wavesForGround` / `foe` (`SeamLab.jsx:363-383`).

| # | Wave | Enemies (HP / ATK) | AI temperament | Σ enemy ATK | Felt |
|---|------|--------------------|----------------|-------------|------|
| 1 | Scouts | 110/26 · 105/26 | **Cautious** | 52 | trivial |
| 2 | The Pack | 175/40 · 175/38 · 165/40 | **Balanced** | 118 | easy |
| 3 | The Pack-Lord | 300/50 · 220/62 | **Greedy** | 112 | **CLIFF — run died here** |
| 4 | The Cinder Maw (boss) | 540/68 (spd 7) + Tender 240/24 | **Greedy** + Balanced | 92 | (rarely reached) |

**Diagnosis.** Σ-ATK barely rises wave 2→3 (118→112), so the spike isn't raw damage — it's three things
stacking at once on wave 3: (a) **temperament jumps Balanced→Greedy** (aggressive, focus-fire targeting);
(b) **per-hit ATK jumps** (62 can burst a squishy before it acts); (c) **enemy HP doubles** (300/220),
so the fight runs many more rounds and the squad eats far more total damage while grinding them down —
and the player's own ATK is modest (49/30/18). Waves 1–2 never pressure the squad, so the player builds
no resources, learns no threat, and the 18% between-wave patch (`PATCHUP=0.18`, `SeamLab.jsx:47`) is
irrelevant because nothing damaged them yet. Then wave 3 demands a real damage-race + survivability the
un-/under-built squad can't meet. Classic flat-then-cliff.

**Verdict (external review 2026-06-08 + confirm vs sim):** it's **bad shaping**, and the tell isn't that
W3 is hard — it's that *W1–W2 teach nothing* and the squad wipes **before the ring's advertised climax**.
The ring fails to teach where the danger lives, and W3 flips **three difficulty knobs at once** (AI
Balanced→aggressive, bigger per-hit, doubled HP → longer fight), which is what reads as "unfair." Design
target — a legible ramp: **W1 = tutorial · W2 = warning · W3 = test · W4 = exam · Boss = finale.** Today
it's W1/W2 = tutorial, W3 = exam, W4 = exam+, Boss = never seen. The sim's per-wave conditional clear-rate
confirms how steep.

### Levers (priority order — each a hypothesis, confirm vs sim)
1. **PRIMARY — stage the AI aggression** so the player *sees* the targeting pattern before it's lethal:
   Cautious → Balanced → **semi-aggressive** → Aggressive → (boss) fully aggressive, instead of today's
   Cautious → Balanced → Greedy → Greedy (temperament args, one word per wave, `:374-381`). This removes
   the "three knobs at once" jump and is the biggest single fix.
2. **SECONDARY — give W2 ("the warning") light teeth.** ~10–20% more incoming damage on Scouts/Pack
   (`:374, :376`) — enough that the player leaves W2 thinking "okay, damage matters now," *not* enough to
   threaten death. Keep **W1 genuinely empowering** (don't arm the tutorial).
3. **AVOID — do NOT simply nerf W3's HP.** The long Pack-Lord fight does real work (checks sustain, target
   priority, build quality); shortening it without teaching just **moves the wipe to W4**. If W3 still
   needs easing after levers 1–2, prefer trimming the 220/**62** hitter's ATK a touch or making *one* of
   the pair Balanced (`:378`) — i.e. stage aggression, don't gut the HP.
4. **Patchup as a dial.** `PATCHUP=0.18` (`:47`) is low ("war of attrition" — but there's no early war).
   If we keep early waves soft, bump patchup so a scratched squad can still contest the boss; if we give
   early waves teeth, leave it. (Field Medic perk already adds +15%, `:2465`.)
5. **The boss itself (Cinder Maw, `:381`):** 540 HP Greedy + a 240 HP "Tender" (the heal-the-boss add).
   Most runs never see it; once the cliff is fixed, re-check whether 540 HP + Tender is a *fair* apex or a
   second wall. Likely fine as the designed hard moment — reserve tuning until runs actually reach it.

**Sim decision rule:** if wave-3 conditional clear-rate ≪ waves 1–2 across most comps → pull levers 1+2.
If only *glass/no-tank* comps die at wave 3 → it's a build problem, not a curve problem; don't flatten it.

---

## SUBJECT 2 — Dead healing rewards (systemic, not one upgrade)

The reward economy pumps **`healMult`** constantly: the `wellspring` upgrade (`:755`, healMult ×1.4), a
ring boon (`:202`), and **7+ wayside choices** (`:498, :547, :580, :591, :634, :640, :645`) all grant
"+X% healing onward." But a squad with **no Mender, no lifesteal, no regen** has nothing for healMult to
scale — between-wave `PATCHUP` is a flat HP add and does **not** read healMult (`:2667`). So for any
aggro/no-healer comp (extremely common — my anchor squad included), a large slice of the offered rewards
is **dead on arrival**. The playtest saw Wellspring offered *twice*; that's the tip of the iceberg.

Note the engine ALREADY solves this for *unit*-scope upgrades: `rollOffer` filters them by `needsType`
(`:2573`) so e.g. a Mender-only bend never appears without a Mender. **Squad-scope upgrades have no such
gate** (`:2572-2576` — they all `return true`). That asymmetry is the bug.

### Fix options
- **(A) Capability-gate squad upgrades (mirror `needsType`).** Add an optional `needsCap` to squad-scope
  upgrades — `wellspring → needsCap:'heal'`, `bastion → needsCap:'shield'` — and in `rollOffer` filter
  them unless a living squad member provides that capability (Mender / equipped lifesteal/regen for heal;
  Bulwark for shield). Smallest, most consistent change; matches the existing pattern. **Recommended.**
- **(B) Make `PATCHUP` respect `healMult`.** Then "+X% healing" *always* does something (you patch more
  between waves), tying every heal reward to the universal attrition mechanic. Elegant and keeps the
  rewards in the pool, but changes attrition math globally — must re-sim the curve after.
- **(C) Give every squad a baseline heal** so healMult is never fully dead. Bigger design change; least
  preferred (muddies role identity — healers should own healing).
- **Decision (external review 2026-06-08): A + B together.** (A) Gate the big heal *upgrades* when the
  squad has **zero** heal sources, so they're never a dead draft — but **weight** rather than hard-spam
  heal rewards to healer squads, or their pool diversity collapses (A's failure mode). (B) Let **PATCHUP
  scale with `healMult`** as a universal floor so heal power always does *something* (watch B's failure
  mode: it quietly becomes an HP-max stat, so keep the multiplier modest). Avoid **C** (baseline-heal-for-
  all muddies role identity — healers should *own* healing) unless the amount is tiny.
- **Key nuance (the real lesson):** B alone is NOT enough. A reward that appears 7 ways but only buys a
  no-heal squad "+3% camp healing" still *reads* as a dud even when mathematically non-zero. The goal is
  **felt relevance when offered**, not just non-zero math — so also **gate or reword the pervasive wayside
  "+heal" trickle** (`:498,:547,:580,:591,:634,:640,:645`) for no-heal squads instead of leaving it as a
  hollow consolation.

**Sim signal:** measure pick-rate × win-correlation of heal-scaling rewards split by "squad has a heal
source?" — expect ~zero correlation for no-healer comps, which quantifies the dead draft.

---

**✅ IMPLEMENTED (2026-06-09) — capability gate (fix A, part 1).** `Wellspring` (heal) and `Bastion`
(shield) now carry a `needsCap` tag; `rollOffer` (`SeamLab.jsx:2569`) drops them unless the squad has the
capability (Mender / active lifesteal for heal; Bulwark for shield) — mirrors the existing `needsType`
gate. **Measured (300-run sim): passive auto-pick win-rate 33% → 39% (+5pts); skilled drafting flat ~47%**
(it already skipped dead picks) — removed *failure from bad offers*, didn't inject power. `npm test` green.
External review (ChatGPT) verdict "clean win"; confirmed binary gate is right for *nonfunctional* picks
(rule: 0% → gate, 1–50% → **weight**, 50%+ → normal — so don't gate merely-low picks like burn/crit/
execute, that kills discovery). Remaining true-dead candidate: `Overhype` (amp) for no-amp squads — held
(amp can come from Booster *or* Mender-sanctuary, so the cap check is murkier). **✅ IMPLEMENTED: reward recommendation hint (2026-06-09).**
The 1-of-3 upgrade screen now flags the top synergy pick (`★ RECOMMENDED` + accent border) and shows an
honest one-line **why** on every card from the squad's live Types + run mods ("Feeds your Reactors" /
"Sustain — no healer needed" / "Cheats death — clutch vs the boss"). Score = the sim-validated `greedy`
heuristic (`upgradeScore`/`upgradeWhy` in `SeamLab.jsx`), so following the star approaches ~47% vs ~39%
random. **Auto-pick AI unchanged** — this only *shows* info so a beginner out-drafts it and *learns*.
Attributed to a **"Build Advisor"** that flags *synergy with your squad, not the whole run* — analysis, not
an omniscient "best pick" (trust-preserver per ChatGPT: never imply "best choice to win"; the star can be
wrong if the boss is next / no sustain / a pivot). Folds into [[the build-visibility spec]]
`SKILL-TREE-UI-SPEC.md`. Add metric: *% functionally-dead offers
per run → ~0* (new mechanics can re-introduce dead picks).

**✅ IMPLEMENTED: fix B — PATCHUP scales with healMult (2026-06-09).** The between-wave patch-up
(`SeamLab.jsx`, `const patchup = …`) now multiplies by `runMods.healMult`, so every "+healing" reward —
including the ungated wayside "+heal" trickle (`:498…645`) — has a universal floor: even a no-healer squad
that took a wayside heal patches a little more, so heal-scaling is never *fully* dead. Modest by design
(18% base; healers still scale in-combat heals far more). Sim impact: flat (overall 38.6→38.9 auto / 47.6→
47.9 greedy — within noise; its real value, the wayside trickle, isn't modeled by the upgrade-only sim).
This **completes the Subject-2 heal fix (A + B)** per ChatGPT's recommendation. `npm test` green.

## SUBJECT 3 — The merchant that sells nothing (early-slag floor)

Wayside "The Wayside Trader" (`:673`) wares cost **25 / 35 / 20 / 50 ⚒** (`:676-684`). Early-run slag is
routinely below 25, so every option reads "Not enough slag" → forced "Just passing." A merchant you can
never buy from is an anticlimax (seen live: had 15 slag, cheapest ware 25).

### Levers
1. **Gate the merchant's appearance** on `slag ≥ cheapest ware` so it only shows when you can transact.
2. **Add a ~10-slag option** (a small heal / single Prime) so there's almost always *something*.
3. **Raise early slag income** if the sim shows runs chronically slag-starved on the Outer Ring.
Prefer **1+2** (cheap, surgical); revisit 3 only if the sim shows a systemic slag drought.

---

## SUBJECT 4 — Wayside choice legibility (minor)
First-tier wayside choices show *tone* ("A hard mercy" / "Careful, costly work") with no mechanical hint;
deeper tiers do show stakes ("+10% dmg"). Fine as mystery, weak as a build decision. Optional: add a
faint stake glyph (✦cores / ❤heal / ⚔dmg / ⚠risk) to first-tier options. Low priority; defer.

---

## When the sim report lands (the morning checklist)
1. Read `docs/RINGWARD-OUTER-RING-BALANCE.md` → overall auto win-rate + **wave-of-death distribution**.
2. If death mass is on **wave 3** across comps → Subject 1, levers 1+2 (give early waves teeth, soften
   the Pack-Lord). Re-sim. Target: a *slope* of conditional clear-rates, not a cliff.
3. Check heal-reward win-correlation for no-healer comps → if ~0, ship Subject 2 fix A (+ maybe B).
4. Check slag-by-wave → if starved, Subject 3.
5. Only after the curve reads as a ramp: revisit the boss (Cinder Maw) and per-comp outliers.

All edits land in `SeamLab.jsx` data tables (waves `:372-382`, UPGRADES `:753`, rollOffer `:2569`,
trader `:673`) — small, localized, reviewable. None require touching the combat engine.

---

## Appendix — Proposed Outer-Ring wave table v2 (⚠ RETRACTED by the 2026-06-09 sim — kept for history)
**Do not apply.** This assumed early waves were trivial; the Tier-1 sim shows W2 is already a wall without
upgrades, so giving it "a warning" is backwards. Superseded — revisit only after the Tier-2 (upgrade) sim.

Encodes "stage the aggression + give W2 a warning, don't gut W3's HP." Uses only existing temperaments
(Cautious / Balanced / Greedy) — staging the *peak* aggression onto the boss. Edit `wavesForGround`
`:372-382`. **These are first-draft numbers to validate, not final.**

| # | Wave | v1 (now) | **v2 (proposed)** | Why |
|---|------|----------|-------------------|-----|
| 1 | Scouts | `Cautious 110/26 ·105/26` | **unchanged** | tutorial stays empowering |
| 2 | Pack | `Balanced 175/40 ·175/38 ·165/40` | **`Balanced 175/46 ·175/44 ·165/46`** (ATK +~15%) | the "warning" — damage starts to matter |
| 3 | Pack-Lord | `Greedy 300/50 · Greedy 220/62` | **`Balanced 300/50 · Greedy 220/56`** | stage aggression (one steady + one aggressive) + trim the 62 burst; HP **unchanged** (keep the long fight that tests sustain/priority) |
| 4 | Boss (Cinder Maw) | `Greedy 540/68 (spd7) + Balanced Tender 240/24` | **unchanged** | the finale = the full-aggression peak; reserve tuning until runs actually reach it |

Net effect target: the conditional clear-rate becomes a **slope** (W1 ~100% → W2 ~97% → W3 ~80% → boss
~contested) instead of W1/W2 ~100% → W3 cliff. **Re-sim after applying** and read whether the death-mass
moved off W3 onto a fairer spread — and crucially whether runs now actually *reach* the Cinder Maw.
(If staging W3 to one-Greedy makes it *too* soft, restore the second Greedy but keep its ATK at ~56, not
62 — tune the burst, not the HP.)

External design review for Subjects 1 & 2 and this table: ChatGPT, 2026-06-08 (logged: it flagged "don't
nerf W3 HP → just moves the wipe to W4", the W1=tutorial→Boss=finale rubric, and A+B for heal rewards with
the "felt relevance, not just non-zero math" caveat).
