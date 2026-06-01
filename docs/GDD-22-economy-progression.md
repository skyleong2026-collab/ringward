# §22 — Economy & Progression

**Status:** Architecture LOCKED 2026-06-01. Tuning numbers (level caps, slot counts, reroll costs, resonance thresholds) are strawman/playtest dials, flagged inline. **Meta-layer only** — the frozen deterministic combat engine (`battleStepEngine.js`) and golden tests are NOT touched. All RNG bakes at incubation/craft time, never in combat ("RNG at the door, never in the room").

This section is the canonical economy spec. A mirror lives in memory `8gents-economy-progression.md`.

## 22.1 Diagnosis (why this section exists)

- **Walk / Dungeon / Battle reward XP only** → economically identical → "everything feels the same."
- **Credits and Marks have no real sink** → dead currencies.
- **Creature level caps at 5, then XP does nothing** → progression fall-off.

§22 fixes all three: distinct resources per mode, a working currency loop, and horizontal (non-inflating) endgame.

## 22.2 Resources

- **Core** — a creature's heart/seed. Rare, whole; comes up out of the ground. Incubated in a ring → grows a grunling whose type the ring imprints. Carries its **origin ring** forever.
- **Slag** — ONE universal build currency. Common ground-matter. Faucets: ring runs + rendering culled grunlings. Sink: craft/reroll gear, modules, stat-rolls. Early slag **refines upward at a loss** (e.g. 5 Rim → 1 Reaches) so it never becomes garbage.
- **Standing** — access currency (unspendable). From Contracts. Gates ring access.
- **Marks** — prestige currency. From Arena/Rivals. Spent on horizontal/cosmetic prestige (finally a sink for Marks).
- **Credits** — OPEN: retire entirely, or repurpose with real everyday sinks (scouting fees, fast-travel, re-rolls).

## 22.3 The core/heart layer — identity & rolls

- Origin ring sets two **FIXED budgets**: a stat budget (HP / Attack / Armor / Speed) and a slot count. Deeper ring = bigger budget + more slots.
- **Reroll = REDISTRIBUTE the fixed stat budget; it never grows the total.** A god-roll is the *distribution* that fits your build, not a bigger number. (This is the anti-treadmill keystone.)
- Reroll = re-incubating a **recovered core**. Unlimited count. Slag-gated by a **fixed cost floor per tier** (pay-full-or-don't); cost rises with tier (Rim ~5 → Drop ~80+, strawman).
- Culling a grunling → choose: **recover its core** (reroll later) OR **render to slag** (build fuel). Every cull is a real decision.

## 22.4 The build layer — gear & modules

- Crafted/rerolled with slag. **Gear = verbs** (a play). **Modules = dials** (tune the play). Both fill slots. Horizontal power only — never flat buffs.
- **Signature stat per role = the multiplier its gear/modules scale off:**
  - Guardian → **Armor**
  - Echo → **Attack**
  - Swift → **Speed**
  - Reactor (engine key `Spark`) → **charge / Stoke rate** (derived, not a base stat)
- Modules stay cheaper / more freely swappable than gear, to protect dial experimentation.

## 22.5 Slots — how they open (player-facing)

Each core has N total slots (N set by origin ring). Slot states:

- **Locked** — not enough level yet (permanent progress).
- **Open** — usable; socket a gear or module.
- **Dormant** — *(deep cores only)* earned by level but unpowered this battle because squad resonance is too low; greys out until deeper company is fielded.

Two gates:

1. **Level (universal):** XP from *worthy* fights opens slots one at a time, up to the origin-ring cap. Sole gate for shallow cores.
2. **Resonance (deep cores only):** a leveled-but-dormant upper slot powers on when squad resonance crosses its threshold.

Shallow cores = one-step (level → slot). Deep cores = two-step (level to earn, field-with-depth to power).

## 22.6 Progression — levels & resonance

- XP → levels → slots, capped by origin ring. **Leveling needs fights worthy of the core** (Rim fights barely feed a Deep core) — an emergent gate, not a rule. **No going-inert by location**; origin power is intrinsic and portable.
- **Resonance R = the sum of the two squadmates' current levels** (`MAX_SQUAD = 3`). Because the level cap is origin-gated, a unit's level already encodes both its depth and how much it's been grown.
- Deep cores' upper slots require R ≥ threshold(tier, slot). Strawman (caps Rim 3 / Reaches 5 / Deep 7 / Drop 10; Drop = 6 slots):

| Drop-core slot | Needs own level | Needs squad resonance R |
|---|---|---|
| 1–2 | 1 | 0 (free) |
| 3 | 3 | ≥ 6 |
| 4 | 5 | ≥ 10 |
| 5 | 7 | ≥ 14 |
| 6 | 10 | ≥ 18 |

## 22.7 The starter trio (the mentor's gift)

- The 3 starting cores are **Drop-tier**: max stat budget + most slots in the game = endgame chassis.
- **Fiction:** deep cores are **"starved / networked"** — they were part of something larger near the Drop; alone they're quiet and only wake when fed the resonance of grown, deep company. A *physical property*, not a moral lesson. (Replaces the earlier "raise the stable" milestone framing.)
- **Mechanic:** their upper slots are resonance-gated, so they bloom only when fielded beside grown deep cores. Their 2 free slots must make them **solid mid-tier early** (good-not-useless); the Spotter signals "they grow with the company you keep."
- **Capstone:** `MAX_SQUAD = 3` = trio size. Raise all three near max and field them together → each resonates with two maxed Drop cores → all three fully bloom. The gift, earned — "inherit the tools, earn the name" as pure mechanics.

## 22.8 Mode = motive = resource

| Mode | Uniquely produces | Lane |
|---|---|---|
| Contracts | Standing (access / rings) | Climber |
| Walk | Cores + species discovery | Collector / Seeker |
| Dungeon | Concentrated slag / rare build mats | Theorycrafter |
| Arena | Marks (prestige) | Competitor |
| Recruit / Forge | (sinks — spend to target/perfect) | — |
| Battle | redundant → merge into a no-stakes practice sandbox (also new-player on-ramp) | — |

## 22.9 Anti-treadmill & anti-fall-off guarantees

- **Power is horizontal:** rerolls redistribute a fixed budget; slots/gear/modules add *options*, not numbers; resonance gates build *complexity*, not stats.
- **Fall-off fixed:** low level caps are a feature (build expression keeps low cores viable forever); early slag refines upward (never dead); endgame = max-roll chase + resonance squad-craft, both non-inflationary.

## 22.10 Open tuning dials (playtest, not architecture)

- Level caps & slot counts per tier
- Reroll cost floors per tier; refine-up ratio
- Resonance thresholds per slot/tier
- Credits: retire vs repurpose
- Trio fiction final wording (leaning "starved / networked")
