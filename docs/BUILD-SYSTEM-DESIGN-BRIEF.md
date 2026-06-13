# Ringward — Build-System Design Brief

**Purpose.** A self-contained briefing on Ringward's relic/gear build system and the
surrounding game, written so a designer (human or AI) can design new build content that
fits. Sourced from the live data (`src/data/*`, `src/screens/SeamLab.jsx`) as of this
commit — if code and brief disagree, the code wins; update this doc to match.

---

## 1. What the game is

Ringward is a squad auto-battler roguelite. You field a squad of creatures ("grunlings")
that fight in **deterministic, turn-based ring battles** you watch and lightly steer (you
don't control each attack; you spend a small **intervention** budget). You climb concentric
**rings** (zones), pull/earn new creatures, and assemble a **build** from stacked equipment
layers. The fantasy: *assemble a synergy engine, then watch it sing.*

---

## 2. The build layers (the heart of the system)

Power is deliberately split into **layers that each obey a different rule**. A new idea must
go in the layer whose rule it matches — they do not overlap.

| Layer | Scope | Slot model | Rule of the layer |
|---|---|---|---|
| **Relics** | Run-wide (whole squad, whole climb) | Few slots; found/forged | Flat-ish **run multipliers** with tradeoffs — a run's "loadout DNA" |
| **Gear** | Per-unit | 1 slot/unit | A **behavioral transform** (Trigger × Effect) — grants or rewrites a behavior |
| **Modules** | Per-unit; attaches to a gear/mechanic | dial slots | A **tuning dial** — does nothing alone; tunes *Earlier / Wider / Stronger / Repeat* on a behavior the unit already has |
| **Signature Modifiers** | Per-creature | 2 slots | Bends how that creature's **signature** plays (PoE support-gem analog; "does nothing on its own") |
| **Artifacts** | Run-wide **rule mutations** | rare | Change a *rule* of combat. Tiered ◆ Foundation → ◆◆ Engine → ◆◆◆ Synthesis. Currently **data-only, design-gated** |
| **Focus** | Operator resource | derived | Your **intervention budget**, *earned* by squad composition (1 base + 1 per Echo + 1 if any unit carries focus-granting gear) |

**Hard rule across layers:** no raw stat dumps as standalone content *below* the Relic layer.
Modules/SigMods/Gear must hang off an existing behavior. Relics are the one place flat
multipliers live, and they always carry a **tradeoff or condition**.

---

## 3. The Relic system (the `r_*` set)

Relics are **run-wide** modifiers applied through a multiplier object `m` the run reads.
The full vocabulary a relic's `apply(m)` can touch:

`hpMult · dmgMult · healMult · blockMult · chargeStart · burnBonus · lifesteal · thorns ·
executioner · killCharge · phoenix(revive) · apex(stacking kill-dmg) · shatter(vs frozen) ·
opener(first-hit bonus)`

**Rarities** (the single power/collection axis): Common → Rare → Legendary → **Unique**
(challenge-won, never dropped) → **Keystone** (forged, never dropped). Higher rarity = bigger
multiplier *and* harder to obtain.

The 22 live relics, grouped by shape:

- **Pure stat + tradeoff** — Whetstone Fang (+35% dmg), Reckless Charm (+55% dmg, −18% HP),
  Glass Edge (+70% dmg, −30% HP · Legendary), Surgeon's Kit (+70% heal, −12% dmg), Wrathcore
  (+42% dmg, −12% heal), Bulwark Stone (+30% HP & shields), Ironwood / Stoneblood (+HP).
- **Conditional / enabling** — Ambusher's Edge (first hit on a full-HP enemy +25%), Frostbite
  Charm (+50% vs **frozen** — pairs with a Warden), Reaper's Mark (+40% vs enemies <50% HP),
  Ember Brand (+2 Burn stacks, +10% dmg).
- **Engine / scaling** — Hunter's Totem (each kill +8% dmg, stacks all fight), Vampiric Edge
  (15% lifesteal), Reservoir Core (+2 charge per kill), Bramble Hide (25% thorns), Frenzy
  Totem (+20% dmg & +1 start charge), Quick Core (+2 start charge).
- **Defining / Legendary** — Phoenix Feather (each grunling survives one lethal blow, revives
  at 30%), Bloodpact (+30% dmg / +40% heal / −10% HP), Drop-Shard (well-rounded + charge),
  Mender's Knot (+50% healing).

**Relic sets** exist (e.g. a sustain/lifesteal family: Vampiric, Bloodpact, Mender's Knot,
Surgeon's, Reckless) — open space for set-bonus design.

**Relic economy (closed loop):** unwanted relics **salvage → Shards** (Common 1 · Rare 3 ·
Legendary 7 · Unique 12 · Keystone 15). Shards + **Slag** feed the **Keystone Forge** — pick a
heat (Spark 40% / Temper 65% / Forge True 90% odds), gamble; a failed pour refunds **half** the
shards (a floor, never a gut-punch — an explicit North Star). Keystones are the top relic tier
you **forge**, not find.

---

## 4. The combat model relics/gear plug into

- **8 types**, each a distinct job. Internal key → display name: Guardian, **Echo→Booster**,
  Swift (→ Striker/Assassin family), **Spark→Reactor**, plus newer **Bulwark, Mender, Warden
  (freeze/control), Hexer (curse/vulnerability), Assassin (execute)**.
- **Charge spine (every type):** Builder → **Payoff** (spends all charge) → Wildcard (vents
  half). A builder always also *does something now*, so charging is never a dead turn.
- **Status vocabulary:** Burn, Shield/Block, Freeze, Vulnerability (curse), Amp (outgoing-dmg
  buff), Regen, Poison. Relics/gear frequently key off these (e.g. Frostbite needs a Warden's
  Freeze; Ember Brand feeds Burn).
- **Interventions:** the operator's only direct lever; budget = **Focus** (earned from squad).
  Contracts can **cap** Focus (a "Quiet the Signal" suppression contract flattens everyone
  to 1).

---

## 5. Currencies & acquisition

- **Cores** — per-creature dupe currency (pulls; dupes melt to Cores).
- **Shards** — relic salvage → Keystone Forge fuel.
- **Slag** — bulk currency (summons, forge fuel).
- **Sigils** — challenge tokens; 3 unlock a **Unique** challenge.
- Acquisition: ring **pulls** (rarity-weighted; **pity** guarantees a Legendary by 15 pulls),
  wild **summons** (breadth + Cores), and **challenge** (Uniques only).

---

## 6. The roster (what relics/gear dress)

17 art-bound creatures across the 8 types, each with a rarity grade and a one-line
**signature** (its job). Reactors charge-and-blow (Fizzpop / Glowtail / Cinderpaw), Bulwarks
wall (Stoneward / Ironwall), Menders sustain (Mossback / Dewleaf), Boosters amp the carry
(Buzzline / Tanglewing), Strikers flurry (Swiftpaw / Dartwing), Assassins execute (Shadefang /
Veilclaw), Wardens freeze (Frostwarden / Rimecaller), Hexers curse (Blightcap / Hexmoth).
Visual through-line: a glowing **core-heart** motif on every creature.

---

## 7. Visual / art identity (so designs match)

Pixel-art creature sprites (PixelLab, ~64px, solid silhouettes) over painted **ring
backgrounds**; one consistent value/saturation family. Relics carry a **painted icon**
(`public/art/relics/r_*.jpg`) + an emoji glyph + a per-relic accent color + a one-line
**lore** string. Player-facing copy rule: **no raw stat numbers in flavor** — mechanics read
as plain outcomes, lore reads warm. (Attack-VFX per-creature signatures: see
`docs/ATTACK-VFX-SIGNATURES.md`.)

---

## 8. North-Star constraints a designer MUST honor

1. **Layer discipline** — put each idea in the right layer; don't make a Module that's
   secretly a Relic.
2. **Tradeoffs over pure upside** — Rare+ relics carry a cost or a condition.
3. **No dead turns, no dead items** — "does nothing on its own" is fine for Modules/SigMods
   (they amplify); a *standalone* item must do something.
4. **Failure without erasure** — no permadeath, no gut-punch losses (failed forge refunds
   half; Phoenix / Last Stand revive).
5. **Buildcraft → agency link** — bringing certain pieces should *buy* operator authority
   (Focus), at real opportunity cost.

---

## 9. Open design space (where new content fits)

Relic **set bonuses**; type-pair relics (more Warden+shatter, Hexer+vulnerability payoffs);
Keystone-tier **defining** relics; Artifact **Synthesis** pieces (build-defining rule
mutations, currently un-wired and explicitly awaiting a design pass); Focus-granting gear
beyond the Resonator.

---

## Source map (where each system lives in code)

| System | File |
|---|---|
| Relics (live, with `apply` + icons + rarity) | `src/screens/SeamLab.jsx` (`RELICS` array) |
| Relic rarity / pull / pity economy | `src/screens/SeamLab.jsx` (`RARITY_INFO`, `RARITY_OF`) |
| Keystone forge economy | `src/data/keystones.js` |
| Gear (per-unit behavioral transforms) | `src/data/gear.js` |
| Artifacts (rule mutations, data-only) | `src/data/artifacts.js` |
| Modules (tuning dials) | `src/data/modules.js` |
| Signature Modifiers | `src/data/sigMods.js` |
| Focus (intervention budget) | `src/data/focus.js` |
| Creatures / types / roles | `src/data/creatures.js`, `src/engine/combat/roster.js` |
| Player-facing term definitions | `src/data/glossary.js` |
| Combat engine (charge spine, statuses) | `src/engine/combat/` |
