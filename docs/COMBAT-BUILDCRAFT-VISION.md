# Combat & Buildcraft Vision — manual control + skill kits + the build chase

**Date:** 2026-06-01 · **Status:** DRAFT for Sky to react to & shape · **Supersedes:** the frozen-engine autobattler assumption (see "What this costs" below)

> This is a vision draft, not a spec. It answers the 2026-06-01 playtest feedback:
> *"full manual… multiple skills per character… the skill tree of how to proc is
> not existent. I don't know what an ultimate build looks like."* Mark it up,
> cross things out, tell me what's wrong. Once the shape is right, I spec + build.

---

## 1. The problem we're solving

Three things are missing, and they're really one thing:

1. **No handles** — the fight auto-plays; the control verbs (Redirect/Stall/Sync) exist but are hidden behind manual-pause, a stingy FOCUS budget, and 4× speed.
2. **No skill kits** — each character has one fixed behavior + one signature. Nothing to *choose between* each turn.
3. **No visible build / no "ultimate build" fantasy** — buildcraft is real but invisible: gear procs (on-kill, on-echo…) fire silently, there's no tree, and nothing tells you what you're building *toward*.

The fix is a single coherent loop: **every turn you pick a skill from a kit, and the kit + its procs are what you build over time toward a screenshot-worthy "ultimate build."** Summoners War's legible spine + PoE's build identity, on Ringward's bones.

---

## 2. Design pillars

- **Reuse the DNA.** Archetypes → kit shape. Roles → the signature skill. Gear-procs → tree nodes. Signatures → the identity skill. Nothing thrown away; everything surfaced and made *choosable*.
- **Legible spine (SW).** A small, readable kit per character: 3 skills + 1 charging ultimate. You always understand your options.
- **Build identity (PoE).** A core tree where *procs are nodes you pick*, and a few **keystones** force real build-defining trade-offs. "An ultimate build" = a keystone + skill-ups + gear + squad synergy that produces a named combo.
- **Per-turn agency.** Manual mode pauses on each of your units' turns; you choose skill + target. Auto stays available for grinding.

---

## 3. The skill kit (per character)

Every grunling carries a **kit of 3 skills + 1 Surge (ultimate)**:

| Slot | What it is | Cost / gate | Maps to today |
|------|-----------|-------------|---------------|
| **S1 · Strike** | The basic. Always available, you pick the target. | Free, every turn | "attack direction" / Redirect |
| **S2 · Role skill** | The archetype's verb — protect / control / empower / charge. | Cooldown (1–2 turns) | Stall / Sync, the ROLE |
| **S3 · Signature** | The unit's identity active (e.g. Bank). | Long cooldown or charge | existing signatures |
| **★ Surge** | The ultimate. Builds a **Charge** resource over the fight; fires huge when full. | Charge meter (0→100) | NEW — the chase centerpiece |

**Charge** is the new heartbeat: most kits build Charge by acting (Spark builds it by dealing damage; Guardian by taking hits; Echo by amplifying allies). The build game is largely *"how fast and how big is my Surge."*

Each archetype's S2 + Surge has a flavor:
- **Guardian** — S2 Guard (taunt+shield an ally); Surge = squad-wide barrier wall.
- **Swift** — S2 Dash (reposition / ignore taunt); Surge = chain of executes on low targets.
- **Echo** — S2 Amplify (copy an ally's next hit); Surge = the whole squad repeats its last action.
- **Spark/Reactor** — S2 Vent (small detonation, builds charge); Surge = **Overload** (massive detonation, scales with charge).

---

## 4. The manual combat loop

On a unit's turn (manual mode), the fight **pauses and asks you**:

1. **Pick a skill** (S1/S2/S3/Surge — greyed if on cooldown / Charge not full).
2. **Pick a target** (enemy for offense, ally for protect/empower).
3. Resolve, animate, advance to the next turn.

- **Auto mode** still exists (a per-fight toggle): the AI plays a sensible kit so you can grind. Manual is the default for real fights.
- **FOCUS** is reworked: instead of a scarce "you may intervene 1–3 times," it becomes the budget for **off-turn reactions** (interrupt an enemy, react with a guard) — so the scarce-resource tension survives but no longer gates *your own turns*.
- Determinism is preserved *given your choices* — "RNG at the door, never in the room" still holds; the seed drives any tie-breaks, your picks drive the rest.

---

## 5. The buildcraft — three layers (this is "how to proc")

**Layer A — Skill-ups (SW-style, the simple chase).**
Each of the 4 skills ranks up (spend slag/cores): faster cooldown, more damage, added effect at certain ranks (e.g. "Strike Rk.3: now applies a burn"). Direct, legible, always-something-to-spend-on.

**Layer B — The Core Tree (the PoE layer — where procs LIVE now).**
Each grunling's living **core** has a small branching tree, unlocked by level + resonance. **Nodes are procs and rewrites you choose:**
- *"On kill, refund this skill"* (today's Quickstrike — now a node)
- *"Your Surge charges +20% from damage taken"*
- *"Every 3rd skill, drop a free Vent"*
- *"Strike chains to a 2nd target"*

**Gear slots INTO the tree** as powerful sockets — this unifies the current gear system with the tree instead of running two parallel systems. Modules become stat nodes. So "how do I proc X?" has a concrete answer: *it's a node; here's the path to it.*

**Layer C — Keystones (build identity, the "ultimate build").**
A few big, mutually-exclusive nodes that *define* a build by forcing a trade:
- **Overload** — Surge charges 2× faster, but you lose S2.
- **Slow Burn** — Surge can't be used until turn 6, but hits 3×.
- **Conduit Lord** (Echo) — Amplify hits all allies, but at half value.

A maxed build = **one keystone + tuned skill-ups + gear nodes + a squad that feeds it.** That's the answer to "what does an ultimate build look like."

---

## 6. The ultimate-build chase — a worked fantasy: "REACTOR OVERLOAD"

> You field three Reactors. Each runs the **Overload** keystone (Surge charges 2× fast).
> A Battery Reactor's tree feeds charge to the others. By turn 4 all three Surges are
> full — you manually chain three **Overload** detonations in one turn and delete a
> 7-body swarm that would normally body-cliff you. The brag: *"triple-Overload, turn 4."*

That's a build with a name, a setup, a payoff, and a counter (it's fragile early — rush it and it folds). That's the thing to screenshot. Every archetype should have 2–3 such named build fantasies.

---

## 7. Two fully worked characters

### A) Fizzpop — Reactor Battery (Spark) · the charge engine
- **S1 Spark Strike** — minor damage, builds +10 Charge.
- **S2 Vent** — small AoE detonation, builds +20 Charge to *all allied Reactors* (its role: battery).
- **S3 Chain Cell** (signature) — links to an ally; when either Vents, both do.
- **★ Surge: Overload** — detonation scaling with Charge; at full, hits the whole enemy line.
- **Tree highlights:** *Surplus* (Vent overcharges allies past 100), *Daisy-Chain* (Overload spreads half its charge to allies on use → chain Surges), keystone *Overload*.
- **Build fantasy:** the swarm enabler above. Squishy; dies to a Swift rush before it charges → real counter.

### B) Conduit — Carry Amplifier (Echo) · the force multiplier
- **S1 Echo Strike** — minor damage, marks the target.
- **S2 Amplify** — your carry's next hit fires twice (its role: doubles damage).
- **S3 Resonance** (signature) — bank an ally's hit, replay it later at full power.
- **★ Surge: Encore** — the whole squad immediately repeats its last action.
- **Tree highlights:** *Full Power* (first Amplify each round is free — today's Resonator gear, now a node), *Open Channel* (Amplify also chains — today's gear, now a node), keystone *Conduit Lord*.
- **Build fantasy:** "Encore Burst" — set up your carry's biggest hit, then Surge so the whole squad repeats it. Glass; no front line of its own.

---

## 8. What this costs (be honest)

This **reopens the frozen engine.** Multi-skill kits, a Charge resource, manual turn resolution, and procs-as-tree-nodes mean `battleStepEngine.js` is rebuilt and the golden tests are re-authored (the freeze becomes "stable once re-blessed," not "never touch"). It also reshapes progression (gear→tree, FOCUS→reactions). This is a **multi-phase rebuild**, not a patch — the right move is a vertical slice (one character, manual, 3 skills + Surge + a few tree nodes) to prove the loop feels good *before* generalizing to all 12.

Direction-independent wins I'll ship now regardless: **HP/shield bars** and **real creature sprites in battle**.

---

## 9. Open questions for Sky

1. **Kit size:** 3 skills + 1 Surge — right, or do you want more (4+Surge)?
2. **Charge:** is a charging ultimate the right centerpiece, or do you want cooldown-only (more SW-pure) or a mana/energy economy?
3. **Tree scope:** small per-core tree (~12 nodes) vs a big shared PoE-scale tree? Gear-as-nodes — yes?
4. **FOCUS:** rework it into off-turn reactions, or retire it entirely?
5. **Auto mode:** keep it for grinding, or go manual-only?
6. **First slice:** which character do you want to feel first — the Reactor (aggressive charge-dump) or the Echo (support multiplier)?

---

## 10. Walking (later phase — banked 2026-06-01, do NOT build yet)

Walking gives you **gear, not creatures.** It's Explorer + Farmer ("I found something" / "I earned something"), not Hunter. You catch creatures by playing; walking is where you hunt rare gear.

- **The loot must change how a creature fights, not just bump a number.** Weak: "+4 Attack." Strong: "Ignite also burns the two enemies next to the target," "start each fight with 20 charge," "Overload leaves a burning puddle." Plain stat runes = common filler; the rare chase loot rewrites a skill (Ignite/Overload/charge).
- **No GPS needed for v1.** Both features, per Sky (2026-06-01): (1) a creature goes on an **expedition** (a timer/run you start in-app) and comes back with a rune; (2) **real player walking speeds the expedition up.** Can't-walk players still get loot on the timer; walkers get rewarded with speed. Never required, never gated behind distance. Real GPS is a later, bigger add that just becomes another way to start the same expeditions.
- **Order:** build this only after 2-3 creatures each fight differently — otherwise it's loot for a one-creature game.
