# Ringward — Skill Paths & Long-Term Progression Master Plan

**Date:** 2026-06-06 · **Status:** Phase 1 SHIPPING (vF-A) · decisions locked below
**Builds on:** `COMBAT-BUILDCRAFT-VISION.md` (this is the concrete Layer B/C realization)

## Respec / "everyone maxes everything" — resolved with Model B (vF-C)
The worry: passives don't clash, so a fully-bought creature just has everything on = power creep with no choice. Fix shipped: **unlock-permanent, equip-per-run loadout (Model B).** Cores *unlock* nodes forever (accumulation never lost); each creature *equips* only `LOADOUT_SLOTS` (=4) at a time, swappable free anytime. Choice survives forever even on a maxed creature; no feel-bad respec. The loadout cap is the power-creep dial. (Classic respec = Model A, rejected: doesn't fix the flaw + refunding feels bad.) When keystones unseal, the loadout is also where clashing keystones force a pick.

## Decisions locked (2026-06-06, Sky)
- **Per-creature Cores** (not a shared pool) — forces specialization.
- **Progressive earning** — deeper waves pay more Cores (Scouts 2 → boss 5+8), so pushing the climb funds the tree. Early nodes come in ~1 run; keystones are a multi-run chase.
- **Grind toward all 3 keystones** — you *can* eventually own all three, but cost + clashing tradeoffs mean you specialize in practice.
- **Tree shows build info + fog-of-war reveal** — node names/shape always visible (the goal/map), but each tier's effect unlocks a step at a time, and the 3rd path stays hidden until you take a capstone. Mystery + a goal ahead.
- **First build: Fizzpop/Reactor tree** (vF-A) — Cores economy, the Reactor tree (PYRE / DETONATOR / CINDER), the tree screen, permanent mods baking into runs. Engine stayed frozen (one opt-in `overloadMult`); all 6 goldens byte-identical. Tiers 4–5 + the CINDER path ship SEALED (revealed by play; effects land in Phase 3).


**Answers:** *"Where's the accumulation? Where's the multiple build paths? I want the POE feeling. Go broad — turn-stealing, effect-stacking — and plan skills for creatures not even built yet. Very progressed characters that are OP if fully built, but it's about choosing what to focus on."*

---

## 0. The one-sentence idea

> **Each creature is a permanent project with its own skill tree. Runs earn the points. You can't max everything, so every creature becomes a different specialist — and a maxed specialist is genuinely OP in its one lane.**

The run stops *being* the progression and becomes the *engine that feeds* it. That's the correct role for a roguelike run inside an ARPG (Hades' Mirror, SW's rune farming, POE's maps).

---

## 1. Where progression lives (the three tiers)

| Tier | Scope | Persists? | What it is | Feel |
|------|-------|-----------|-----------|------|
| **Run bends** | one run | ❌ resets | pick-1-of-3 between waves | temporary spice |
| **Creature tree** ← NEW | forever | ✅ permanent | per-creature path tree (this doc) | **the POE spine** |
| **Account** | forever | ✅ permanent | slag → perks, stable growth | the wallet |

Today only the top and bottom exist, and the bottom is flat. **The middle tier is the whole missing game.** The run bends you already shipped become the *capstones* of the permanent trees — nothing is thrown away, it just stops evaporating.

---

## 2. The point economy — where accumulation comes from

Each creature earns its own currency: **Cores** (per-creature XP, named for the world's "glowing core = heart").

**Earning (a creature must be FIELDED to earn):**
- +3 Cores per wave it survives
- +8 Cores for surviving the boss
- +5 "killing blow" bonus (the creature that lands the final hit of a wave)
- Loss still pays ~⅓ (a creature learns from a hard fight)
- → **~20–28 Cores per winning run** for a creature in your squad the whole way

**Spending (escalating cost per tier):**

| Tier | Cost | Running total |
|------|------|---------------|
| T1 (lead) | 2 | 2 |
| T2 | 5 | 7 |
| T3 (capstone bend) | 10 | 17 |
| T4 | 18 | 35 |
| T5 (**keystone**) | 30 | **65** |

- **Max one path ≈ 65 Cores ≈ 3 winning runs.** Fast enough to feel a build form.
- **Max a whole creature (all 3 paths) ≈ 195 Cores ≈ 8–10 runs.** This is a "very progressed character."
- **A squad of 3 fully-maxed specialists ≈ 25–30 runs.** The long arc.

**Respec:** free, out of combat. (Experimentation = fun; we tighten later only if it kills commitment.) Keystones are the real commitment — they have *downsides*, so even respec-friendly, a build keeps an identity.

**Why "OP but choose":** a maxed single path + its keystone is dominant *in its lane* but (a) you gave up the other two paths and (b) the keystone has a real tradeoff. So power is always *committed* power. Your squad of 3 is where you combine specialists into a meta-build.

---

## 3. The mechanic palette — go broad (old + new skill types)

The build blocks. Everything in **bold** is NEW vs. what the engine does today.

**Resource / tempo**
- charge (build→spend) · **overcharge** (exceed max) · **charge gift / theft** · **life-as-resource** (spend HP) · **extra action** · **turn steal** (enemy skips, you act) · **haste** (always act first) · **delay** (push enemy turn back)

**Damage shapes**
- single · multi-hit · AOE/line · **splash/chain** (jumps target→target) · **crit** (×multiplier) · **true damage** (ignores shields) · **execute** (instakill threshold)

**Damage-over-time / stacking**
- burn (exists) · **poison** (stacks, ramps, never expires) · **bleed** (per-hit stack) · **momentum** (consecutive hits ramp) · **escalating stacks** (each round grows) · **doom** (delayed nuke: "dies in 3 rounds")

**Buffs (your side)**
- amp/damage-up (exists) · regen (exists) · block/shield (exists) · **lifesteal/leech** · **cleanse** (strip debuff) · **revive** · **damage cap** ("can't be one-shot") · **untargetable**

**Debuffs (enemy side)**
- **vulnerability/mark** (takes +X% dmg) · **armor/shield shred** · **weaken** (−atk) · **freeze/stun** (skip turn) · **silence** (no payoffs) · **slow** (initiative down)

**Reaction / control**
- **taunt/redirect** · **thorns/reflect** · **riposte/counter** · **intercept** (take a hit for an ally)

**Meta / chaos**
- **echo** (repeat last action) · **mimic/copy** (steal a skill) · **summon** (temporary fighter) · **clone/split** · **gamble** (random big effect)

---

## 4. Tree shape (every creature, same skeleton)

```
                 [CREATURE]
        ┌────────────┼────────────┐
      PATH A       PATH B       PATH C
       T1           T1           T1      ← lead-in (small number)
       T2           T2           T2      ← number + small mechanic
     ◆ T3         ◆ T3           T3      ← CAPSTONE (the shipped bend, now permanent)
       T4           T4           T4      ← amplify the capstone
     ★ T5         ★ T5         ★ T5      ← KEYSTONE (build-defining, has a tradeoff)
```

- **2 of the 3 paths per type are anchored by a bend you already shipped** (◆). The 3rd path is the new direction the user asked for (turn-steal, poison, thorns, etc.).
- **Keystones (★)** are the "ultimate build" payoff. Each is OP in its lane and each gives something up.

---

## 5. The 6 existing types — full trees

### 🔥 REACTOR — *charge & fire* (Fizzpop, Glowtail, Cinderpaw)

**Path A — PYRE (burn / DoT)**
1. Charge Up applies +1 burn
2. Your burns tick **twice per round**
3. ◆ **Ember Trail** — Overload also burns (+2)
4. **Conflagration** — when a burning enemy dies, its burn spreads to the whole line
5. ★ **WILDFIRE HEART** — your burns *never expire* (ramp all fight); BUT Overload no longer doubles vs burning. *You're a DoT furnace, not a nuker.*

**Path B — DETONATOR (charge / blast)**
1. +15% Overload damage
2. **Overcharge** — charge can exceed max by 2; each over-stack adds payoff
3. ◆ **Combustion** — Overload hits the whole enemy line
4. **Chain Reaction** — Overload refunds 2 charge on a kill (snowball)
5. ★ **SINGULARITY** — Overload costs 2× charge but deals 3×. *A slow siege cannon.*

**Path C — CINDER (self-sustain, new)**
1. Charge Up heals you for the chip dealt (lifesteal seed)
2. Backdraft also grants you block
3. **Smolder** — start every fight already burning the enemy line
4. **Heat Exchange** — convert leftover block into charge each round
5. ★ **PHOENIX** — the first time you'd die, revive at 30% and dump full charge. (once/run)

---

### 🛡 BULWARK — *tank & shields* (Stoneward, Ironwall)

**Path A — AEGIS (team shield)**
1. +20% block
2. Shields persist one extra round (decay slower)
3. ◆ **Aegis Reflex** — Brace shields the whole team
4. **Overbank** — excess shield banks into a stored barrier
5. ★ **BASTION WALL** — release the bank as a team barrier; shielded allies take 0 from chip damage.

**Path B — RETRIBUTION (thorns / reflect, new)**
1. Shielded allies reflect 15% of damage blocked
2. Brace chips harder the more block you hold
3. **Riposte** — when a shield fully absorbs a hit, counterattack
4. **Spite** — reflected damage ignores enemy shields (true)
5. ★ **IRON MAIDEN** — you can't deal direct damage, but reflect 100% of all damage the team blocks. *Enemies kill themselves.*

**Path C — GUARDIAN (protect)**
1. Bodyguard also taunts (enemies avoid the shielded ally)
2. ◆ **Iron Bastion** — Brace seeds regen on everyone shielded
3. **Intercept** — once/round, take a hit meant for a low-HP ally
4. **Last Stand** — the lower your own HP, the more block you generate
5. ★ **UNBREAKABLE** — allies can't drop below 1 HP while you live. *You're the linchpin — they have to kill you first.*

---

### 🌿 MENDER — *healing* (Mossback, Dewleaf)

**Path A — BLOOM (burst heal)**
1. +20% heal
2. ◆ **Full Bloom** — Bloom heals the whole team
3. Overheal converts to a shield
4. Bloom also cleanses burns/poison/debuffs
5. ★ **LIFESURGE** — Bloom can revive a fallen ally. (once/fight)

**Path B — VERDANT (regen / heal-over-time)**
1. +1 regen stack
2. ◆ **Lifebloom** — Mend seeds a regen ward
3. Regens tick twice per round
4. **Symbiosis** — your regens also chip the enemy line (nature's wrath)
5. ★ **EVERGREEN** — regen never expires; the team is *permanently* healing. *Outlast anything.*

**Path C — LIFEBOND (support / charge-gift, new)**
1. Mend also gifts 1 charge to the healed ally (resource sharing)
2. Heal cleanses one debuff
3. **Sanctuary** — allies above 80% HP gain amp (reward a topped-up team)
4. **Channel** — transfer your charge into an ally's payoff
5. ★ **LIFEBOND** — link to one ally; you split all damage they take. *Sacrificial co-tank.*

---

### ✦ BOOSTER — *amplify* (Buzzline, Tanglewing)

**Path A — RESONANCE (team amp)**
1. +1 amp stack
2. ◆ **Power Chord** — Prime amps the whole team
3. Amp also boosts healing & shields (amplify *everything*)
4. ◆ **Surge** — Overdrive amps all allies
5. ★ **CRESCENDO** — amp stacks never cap; every round the whole team hits harder. *Late-fight god mode.*

**Path B — CONDUCTOR (turn-steal / tempo, new — THE turn-stealing path)**
1. Resonate pulls an ally's strike forward (your existing intervention concept)
2. Prime occasionally grants the carry +1 action this round
3. **Tempo Theft** — Overdrive *steals* an enemy's turn (they skip; your carry acts)
4. **Double Time** — a carry amped above threshold can act twice
5. ★ **MAESTRO** — every round, grant ONE ally a full extra turn. *You orchestrate; you barely fight.*

**Path C — OVERDRIVE (crit / spike, new)**
1. Amped allies gain a crit chance (×1.5)
2. Crit chance scales with amp stacks
3. **Sync** — amp converts to a guaranteed crit on the next payoff
4. **Power Spike** — the first payoff each fight always crits
5. ★ **CRITICAL MASS** — remove amp's flat bonus; instead amped hits *always* crit and crits do ×2.5. *Feast or famine.*

---

### ⚔ STRIKER — *many small hits / tempo* (Swiftpaw, Dartwing)

**Path A — BARRAGE (multi-hit)**
1. ◆ **Twin Strike** — Jab & Flurry +1 hit each
2. **Momentum** — each consecutive hit on the same target +5% (ramps)
3. ◆ **Blitz Storm** — Blitz becomes a 3-hit barrage
4. Hits past the 4th in a turn become unblockable (true)
5. ★ **THOUSAND CUTS** — every hit applies a stacking bleed. *Single targets melt.*

**Path B — TEMPO (first-strike / haste, new)**
1. +first-strike bonus
2. Blitz refunds charge if you moved first
3. **Quickstep** — after a kill, act again (extra action)
4. **Flow** — every 3rd action is free (doesn't end your turn)
5. ★ **BLUR** — you always act first every round, and your opening hit can't be blocked. *Pure tempo dominance.*

**Path C — DUELIST (single-target, new)**
1. +damage vs full-HP targets (opener)
2. Jab marks the target (+damage taken)
3. **Riposte** — counter when attacked
4. **Bloodlust** — heal on kill + refund charge
5. ★ **SWORD SAINT** — all your damage funnels into one target; huge single-target, but you can't hit the line.

---

### 🗡 ASSASSIN — *execute* (Shadefang, Veilclaw)

**Path A — REAPER (execute)**
1. ◆ **Hunter's Mark** — Execute window 45%→60%
2. Execute threshold scales with your missing charge
3. ◆ **Blood Hunt** — Execute auto-hunts the weakest enemy
4. **Cull** — executing refunds full charge (chain executes)
5. ★ **DEATH'S DOOR** — instakill anything below 25% HP, but you deal −50% to healthy targets. *Pure finisher.*

**Path B — VENOM (poison / DoT-stack, new — the poison path)**
1. Mark applies poison (a stacking DoT that ramps)
2. Poison never expires; each application grows the stack
3. **Virulence** — poison spreads to a neighbor on death
4. **Toxic Shock** — executing a poisoned target detonates poison on all poisoned enemies
5. ★ **PLAGUE** — you deal no direct damage; everything is poison — but poison ignores shields and ramps forever. *DoT god.*

**Path C — SHADOW (stealth / burst, new)**
1. Your first attack each fight crits
2. Ambush from stealth deals ×2
3. **Vanish** — after a kill, become untargetable for one round
4. **Backstab** — +damage vs enemies who have already acted this round
5. ★ **PHANTOM STRIKE** — once per fight, delete any single non-boss enemy outright.

---

## 6. NEW TYPES to build — roster expansion (the "creatures not even developed yet")

Six new roles, each opening a mechanical lane the current 6 don't cover. Each gets the same 3-path / 5-tier skeleton (paths sketched; full trees TBD when we build them).

### 🔒 WARDEN — *control / denial* — **SHIPPED (vF-D), the first new type**
Locks enemies out of acting. The answer to "I want to stop them, not out-damage them."
The **freeze** mechanic is live: a frozen unit skips its turn and thaws by one each
time it would have acted. Engine change was opt-in — all 6 goldens byte-identical.
- 2 creatures: **Frostward**, **Rimecaller**. Kit: Frost Nip (build) / Glaciate (lock one) / Cold Snap (ice the line).
- Tree (live): **FROST** (Deep Freeze — freezes last longer) / **RIME** (Frostbite — builder also freezes) / **BLIZZARD** (sealed third path).
- **Frost** — freeze/stun, skip enemy turns → ★ **ABSOLUTE ZERO**: 3-turn unresistable freeze
- **Silence** — disable enemy payoffs → ★ **TIME LOCK** (BLIZZARD): enemies act only every other round
- Open balance note: Warden is intentionally low-damage (control, not kills) — pairs with a damage carry; solo it loses on the round cap.

### 💀 HEXER — *curses / vulnerability*
Makes everything else hit harder. The multiplier nobody sees coming.
- **Vulnerability** — enemies take +X% from all sources → ★ **HEXMASTER**: every curse on every enemy at once
- **Decay** — strip enemy shields & armor → ★ **ENTROPY**: cursed enemies can't gain shields
- **Doom** — delayed nuke ("dies in 3 rounds") → ★ **ARMAGEDDON**: doom can't be cleansed or outhealed

### 🎲 TRICKSTER — *turn-theft / chaos*
Pure tempo disruption and copying.
- **Thief** — steal enemy turns & charge → ★ **PUPPETEER**: control one enemy for a full round
- **Mimic** — copy the last skill used by anyone → ★ **HALL OF MIRRORS**: copy two skills/round
- **Gamble** — random large effects → ★ **WILDCARD**: every skill randomly triggers twice

### 🩸 SIPHON — *leech / drain*
Sustain through aggression; steals what enemies have.
- **Bloodletter** — lifesteal from damage dealt → ★ **VAMPIRE LORD**: full lifesteal, can't be out-damaged
- **Energy Drain** — steal enemy charge/buffs → ★ **NULLIFY**: enemies can't build charge near you
- **Soul Tax** — convert enemy stats to yours → ★ **PARASITE**: permanently steal a stat per kill (grows all run)

### 👻 PHANTOM — *echo / summon*
More bodies, more repeats. Goes wide where others go tall.
- **Echo** — repeat your last action → ★ **REVERBERATION**: every payoff fires twice
- **Spectres** — summon temporary fighters → ★ **LEGION**: summons persist between waves
- **Split** — clone yourself at low HP → ★ **SWARM**: clones can clone

### 💢 TITAN — *risk / reward / berserker*
The "OP but you might die" lane. Highest ceilings in the game.
- **Berserker** — more damage the lower your HP → ★ **GLASS TITAN**: massive damage, can't be healed
- **Blood Magic** — spend HP instead of charge → ★ **MARTYR**: payoffs cost HP but never miss & ignore shields
- **Juggernaut** — convert incoming damage to power → ★ **UNDYING RAGE**: can't die for 3 rounds, then explode for stored damage

---

## 7. The squad meta-build — where it all combines

Permanent trees × a squad of 3 × run bends = the real depth. Named "OP squads" players chase:

- **The Rot Engine** — Plague Assassin (∞ poison) + Conflagration Reactor (spreading burns) + Hexmaster Hexer (everything takes +damage). You turtle; the whole enemy team dissolves to ticks.
- **The Turn Lock** — Deep-Freeze Warden (chain freeze) + Maestro Booster (extra turns for allies) + any nuker. Enemies never act; you act twice.
- **The Immortal Wall** — Unbreakable Bulwark (allies can't drop below 1) + Evergreen Mender (∞ regen) + Iron Maiden thorns. You literally cannot lose; enemies die to reflect.
- **The Decapitation** — Death's Door Assassin + Sword Saint Striker + Critical Mass Booster. Delete one priority target per round; ideal vs bosses.
- **The Glass Cannon** — Singularity Reactor + Glass Titan + Maestro Booster. Turn 4, one creature gets two turns and fires a triple-charge Overload. Brag-worthy; folds if rushed.

Each squad has a fantasy, a setup curve, and a counter — exactly the POE "build" texture, at the squad layer.

---

## 8. Build order — how I'd ship this (for implementation)

A **vertical slice first** — prove the loop on ONE creature before generalizing.

- **Phase 1 — Cores + one tree.** Add the Cores currency (earn from runs, persist per creature). Build Fizzpop's full 3-path tree as the prototype. Tree UI on the creature card. Permanent mods bake into the run the same way bends do today (so the engine stays frozen — keystones that need new mechanics come later).
- **Phase 2 — All 6 existing types get trees.** Reuse the shipped bends as the ◆ capstones. Most T1–T4 nodes are numeric/flag mods the engine already supports.
- **Phase 3 — New mechanics for keystones.** The ★ keystones (turn-steal, poison, freeze, reflect…) need engine work — re-bless the goldens as each lands, one at a time. This is the "frozen engine thaws, carefully" step from the vision doc.
  - **First batch SHIPPED (vF-E)** — all opt-in, 6 goldens byte-identical:
    - Reactor DETONATOR: **Chain Reaction** (T4, refund 2 charge on kill) + **Singularity** (★, Overload ~2.5×, loses Backdraft)
    - Assassin REAPER: **Cull** (T4, kill refunds full charge) + **Death's Door** (★, instakill <25%, −50% vs healthy)
    - Warden FROST: **Shatter** (T4, +50% dmg to frozen) + **Absolute Zero** (★, Glaciate freezes 3)
    - Squad combo proven: freeze → Shatter → execute. Engine-tested: Death's Door instakills, Singularity ×2.50, Shatter ×1.5.
  - Still sealed (need source-attribution or initiative work): Wildfire Heart, Evergreen, Thousand Cuts (bleed), Unbreakable, Blur, all third-path keystones.
- **Phase 4 — New types.** Warden → Hexer → Trickster → Siphon → Phantom → Titan, each adding its lane. New creatures to fill them (toward the 13+ stable).
- **Phase 5 — Squad meta surfacing.** Name the OP squads in-game; show synergy hints; tune so no single squad dominates.

**Engine-safety rule (unchanged):** every numeric/flag node is opt-in (`mods.X`, no-op default) so the 6 manual goldens stay byte-identical until a keystone *deliberately* introduces a new mechanic — and that gets its own re-blessed golden.

---

## 9. Open questions for Sky

1. **Cores or shared currency?** Per-creature Cores (forces specialization) vs. one global pool you pour anywhere (more flexible, less identity). I lean Cores.
2. **Respec free or paid?** Free-to-start (experiment freely) vs. small slag cost (commitment). I lean free now.
3. **Tree size:** 3 paths × 5 tiers = 15 nodes/creature. Bigger (more side-nodes, POE-scale) or keep it tight & readable?
4. **Keystone exclusivity:** one keystone per creature (hard identity) vs. allow all three if you grind enough (true "fully OP")? I lean: you *can* eventually get all three, but it takes so long that in practice you specialize — and the tradeoffs make 3 keystones fight each other.
5. **First creature to feel:** Fizzpop (Reactor, aggressive, all 3 paths already half-built via bends) — or a new type to show the breadth immediately?
