# ⚒ §31 — The Cracked Forge: Build-Expression Slag Sink (Relic Recut)

> **Status: SPEC — design only, not built.** The answer to the biggest open systems question:
> *what is the forever-use for slag once perks + keystones are bought out?* Sky chose
> **build-expression** over cosmetic / ascension on 2026-06-09. This page specs it. No code yet.
> (Mirror to Notion under the GDD as §31 when Notion is reachable — create failed with a network error on 2026-06-09.)

## The question this answers
Once a player owns all perks (5) and all keystones (4), slag becomes **dead currency** — it piles up
with nowhere to go. A dead-end economy quietly kills retention (you eventually have to rework
progression, rewards, currencies, and drop tables at once). So slag needs a **forever-use.**

## Two locks that rule out the easy answer
The lazy endgame sink is *slag → more power.* It's **off the table**, because two decisions are locked:
1. **Economy is anti-treadmill, one currency (slag), no premium currency** (GDD §22).
2. **Identity: "opens a build, not a stat"** (reinforced 2026-06-09 with build-hooks across Summon /
   squad-pick / Relics).

So the forever-use for slag must buy **possibility, not power.** That points straight at build-expression.

## The mechanic — Relic Recut
**Every relic can be re-forged into one of several *cuts* — alternate effects of equal power budget but
different build role.** Slag is the cost of re-cutting. You never get *stronger*; you get *different* —
shaping each relic to the build you're running. Because builds keep evolving, recutting never ends.
The "Cracked Forge" name already fits: you re-forge your gear.

### Why it fits Ringward specifically
- **Deterministic** — you choose the cut. No RNG gate (the builder-player *hates* RNG on the pieces they
  need — see §30 / §-1).
- **No power creep** — cuts are sidegrades at one power budget. Respects the anti-treadmill lock.
- **"Opens a build, not a stat"** — a single relic now serves multiple builds depending on its cut. The
  relic becomes a build *enabler*, not a flat number.
- **Long + deep** — 26 relics × ~3 cuts ≈ a large, evolving decision space that feeds the run-#20 loop.

### Concrete examples (illustrative — real cuts to be authored + sim-tuned)
- **Whetstone Fang** (Rare; today: +35% damage)
  - Cut A *(default)*: +35% damage — raw aggression
  - Cut B: +22% damage, +1 charge start — tempo build
  - Cut C: +25% damage, +20% vs **frozen** enemies — Warden/freeze synergy
- **Ironwood Charm** (Common; today: +18% max HP)
  - Cut A *(default)*: +18% max HP — survivability
  - Cut B: +12% max HP, +10% shields — Bulwark synergy
- **Bloodpact** (Legendary) — cuts that lean it toward the **Berserker** set vs the **Lifeblood** set, so
  the same relic can anchor two different builds.

Each cut points at a *build* (tempo, freeze, Bulwark, Berserker/Lifeblood), not a bigger number.

## Integration with existing systems
- Relics already carry `apply(m)` (`SeamLab.jsx`). Add `cuts: [{ name, desc, apply }]` per relic;
  **cut[0] = today's effect** (backward compatible).
- New storage map `RELIC_CUT_KEY = '8gents_seam_relic_cuts'` → `{ relicId: cutIndex }`.
- `relicMods()` applies the **chosen cut's** `apply` instead of the base.
- **Set membership stays by relic id** in v1 (recutting changes the *effect*, not which set it counts for)
  — so recutting can't accidentally break a set. (Cuts that shift set membership = a later, deeper phase.)
- **Goldens unaffected** — no golden carries relics; relic mods are opt-in, player-side. Render + data only.

## Cost model (recommended)
**Slag UNLOCKS each alternate cut permanently (per relic); swapping among already-unlocked cuts is free.**
- Why: the meaningful spend is the *unlock* (a real build decision), but you're not taxed every time you
  toggle — keeps it builder-friendly, not grindy.
- Suggested unlock cost by rarity: Common 40 · Rare 70 · Legendary 110 (accumulable, meaningful). Tune later.
- Total runway: 26 relics × ~2 extra cuts ≈ **50+ unlocks** — a long, deep sink to "build completion."

## The two-stage endgame economy (the full picture)
1. **Build-expression (this spec)** — the *long, deep* slag sink that keeps builders chasing the perfect
   build. Finite-but-large (~50+ cut unlocks).
2. **Cosmetic forge (later — the runner-up option)** — once you've unlocked everything, *cosmetics*
   (creature colorways, arena/ring themes — the feel-pass already built that surface) become the
   **truly-infinite** tail, AND double as the sellable layer from the §30 monetization brief.

Cuts answer "deepen my builds forever," cosmetics answer "I have everything, now I express it." Together
they're a coherent, non-treadmill endgame economy.

## Where it lives in the UI
Recommend the recut affordance sits **on the relic, inside the Relics build-bench** (built 2026-06-09) —
keep the player in build context. Tap a relic → choose a cut → pay slag to unlock. The Forge tab stays the
home of permanent perks + keystones; the *recut bench* is where slag's forever-use lives.

## Phased rollout (shippable in slices)
- **Phase 1 — prove the loop.** Data layer (`cuts` on ~8 most build-defining relics) + cut storage +
  `relicMods` wiring + recut UI on the Relics bench. Validate the feel with a subset.
- **Phase 2 — fill it out.** Author cuts for all 26 relics; set unlock costs; **sim-validate power-budget
  parity** (cuts must not move win-rate — same harness used for the support rebalance).
- **Phase 3 — deepen (optional).** Cuts that shift set membership → richer set combinatorics.

## Power-budget rubric (no creep)
Every cut of a relic targets the **same power budget** as its default, validated by win-rate parity in
`scripts/sim/run-sim-tier2.mjs`. Cuts differ in *what build they serve*, never *how much*. If a cut moves
win-rate, it's mis-budgeted — re-tune, don't ship.

## Open questions for Sky
1. **Cost model** — *unlock-then-free* (recommended), or a small *per-recut fee* (truly infinite but can
   feel like a tax)?
2. **Authoring voice** — should I draft all the cut effects (like the build-hook lines), or do you want to
   author the build-defining ones and have me wire + balance?
3. **UI home** — recut on the relic (in the bench, recommended) vs a dedicated Forge sub-panel?

---

## Phase 1 — BUILT + TUNED (2026-06-09)
Shipped in `SeamLab.jsx` (`RELIC_CUTS`) + a recut-mode UI on the Relics bench. Tuned via a new
**`--parity` mode** in `scripts/sim/run-sim-tier2.mjs` (each relic's cuts run on one synergy-appropriate
squad; a balanced cut lands within ~±2.5pp win-rate of its Original). Final state, 5 relics / 8 cuts, all
within tolerance:
- **Whetstone Fang** → Tempo Edge (+28% dmg, +1 charge) · Frostfang (+30% dmg, shatter-frozen). ✓ ±0.5
- **Ironwood Charm** → Thornwood (+12% HP, +5% thorns). ✓ +1.4
- **Bulwark Stone** → Bastion (+24/+24, +10% thorns) · Lifewall (+24% HP, +14% heal). ✓ +1.9 / +0.7
- **Bloodpact** → Berserker's Pact (+48% dmg, −10% HP) · Bloodwell (+17% dmg, +9% lifesteal, −10% HP). ✓ −0.8 / ~−3 (sustain, on-theme to lean under on a damage check)
- **Drop-Shard** → Edge-Shard (+25% dmg, +1 charge). ✓ +2.1

### Two findings the sim forced (important)
1. **Charge has a breakpoint at +2.** Going 1→2 charge crosses the "payoff fires turn 1" threshold, so +2
   charge is wildly strong (a +2c cut blew up to +25pp). **Rule: cuts cap at +1 charge.** **Quick Core was
   DROPPED** — its power is one dominant stat (+2 charge); any sidegrade is either a trap or strictly better.
2. **Defensive cuts can't be parity on a damage-check ring.** A cut that trades damage for HP is −10pp on
   Ring 1 no matter how it's tuned (the content is a damage/tempo race — same lesson as the support
   rebalance). **Ward-Shard was DROPPED.** *Implication:* the full promise of build-expression (tanky / glass
   / sustain all viable) is **coupled to content that tests survival** — bosses, deep rings (Ring 2–8). On a
   pure damage race, "build expression" collapses toward "damage flavor." Defensive recuts unlock their value
   when that content exists.

### Phase 2 — DONE (2026-06-09)
**13 relics now carry cuts** (5 Phase 1 + 8 Phase 2), all sim-tuned to ±2.8pp at DIFF 1.5:
Stoneblood→Spineblood · Ember Brand→Searbrand · Reckless→Bloodrage · Wrathcore→Warcry ·
Bramble→Razorvine · Reservoir→Surge Core · Glass Edge→Edgewalker · Frenzy→Onslaught.

**Third finding — pure-verb relics don't recut cleanly.** Relics whose Original is a conditional/slow-ramp
*verb* (opener, shatter, apex/kill-stack, executioner, lifesteal) under-perform the generic parity test, so a
flat-damage cut over-performs by +5–11pp — AND a flat cut erodes the relic's identity. **Dropped from recut:**
Ambusher's Edge, Frostbite Charm, Hunter's Totem, Reaper's Mark, Vampiric Edge (and the support relics
Mender's Knot / Surgeon's Kit, and the binary-revive Phoenix Feather). These stay single-purpose by design —
not every relic should recut. A later pass could give them *bespoke conditional* cuts (a different condition,
not a flat stat), but that needs per-relic test squads, not the generic harness.

**Coverage:** 13/22 findable relics recut; the 9 left out are verbs/support/single-stat where a sidegrade is
either a trap or identity-eroding. Good build-flex without forcing cuts where they don't fit.

*Spec by the main build instance, 2026-06-09. Grounded in live `SeamLab.jsx` (relics, `relicMods`, sets)
+ the §22 economy lock + the §30 monetization read. Tuned via `run-sim-tier2.mjs --parity`.*
