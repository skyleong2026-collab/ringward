# Ringward — Collection & The Wanting Loop (design, vF-CF era)
*(2026-06-10. The run-#20 answer. Designed on Fable; built later — nothing here is coded yet.
Companion to RINGWARD-LORE-BIBLE.md and the vF-CF "decisions must matter" commit.)*

## The problem, stated plainly
Sky asked the right question through ChatGPT's mouth: "what CHANGES when I pull creature #11?"
Today's honest answer: almost nothing. Skill trees are **per-Type** (`treeForCreature` reads
`TYPE_TREES[type]`), and the roster is 2–3 creatures per type. A second Reactor is the same tree,
the same three skills, a rarity multiplier, and a different sprite. The machinery of collection
exists (summon, pity at 15, dupe-cores); the *wanting* doesn't, because a new creature isn't a
new build — it's a stat bump wearing a new face.

vF-CF accidentally built half the fix: **one keystone per creature** means a creature is now a
committed build identity. This doc designs the other half.

## STATUS — innates BUILT (vF-CG, 2026-06-10, committed, deploy held)
All 17 innates implemented as `INNATES` apply(m) functions in SeamLab.jsx, wired into `treeModsFor`
(so they ride the same run-layer mod object trees use). Displayed on squad-pick cards (the
per-creature differentiator) and the tree-overlay header ("born-in, always on"). Verified: all 15
test suites green, **every golden byte-identical** (goldens never touch treeModsFor), live Playwright
confirmed distinct innate lines render + a run completes clean. **Deploy intentionally HELD** so Sky's
vF-CF R3 playtest stays a clean read (innates make the player stronger → would muddy that look).
Channel-honesty note: the depth sim uses makeUnitDef + a gear proxy and CANNOT see innates (same as
tree mods) — so innate balance is live-feel-validated, not sim-validated. They're player-side only and
always-on, so worst case is "rings feel a touch easier," never an unfair wall. Final channel map (all
verified read by their skills): see the table below; `hpMult` was dropped (flows only via squadMods
into maxHpOf, not per-creature mods). Remaining for Sonnet: pull-beat reorder (S3) surfaces the innate
at the moment of acquisition — without it innates are visible only on the pick screen.

## The centerpiece: INNATES (one born-in quirk per creature)
Every creature gets exactly ONE innate — a small, always-on, build-bending trait it's born with.
Not tree-bought, not swappable, printed on the card. The innate is what makes fizzpop ≠ glowtail
≠ cinderpaw *before* any cores are spent.

**Why this and not more creatures / per-creature trees:**
- Per-creature trees = 17× authoring + balance surface. Dead on arrival for a solo dev.
- More creatures without differentiation just makes the reskin problem wider.
- One innate per creature is 17 lines of design + the existing `mods` channel (proven side-B-safe
  in vF-CF). Smallest possible thing that makes every pull a *new build seed*.

**The build identity equation (what collection now unlocks):**
> creature = INNATE (born) × KEYSTONE (sworn, one) × LOADOUT (chosen)
A pull is a moment because it unlocks combinations you literally could not run. The reveal screen
should say so (see "the pull beat" below).

**The fake-variety test (apply to every innate, at design AND at build time):** would this innate
change my relic picks, keystone choice, or squad composition? "+20% vs +25% vs +30% damage while
healthy" is three stat modifiers wearing trenchcoats — technically different, practically identical.
An innate earns its slot only if the answer is yes. (Test via ChatGPT review, 2026-06-10; it's the
right bar.)

**First-pass innate sketches (tune freely — the SHAPE is the decision):**
| Creature | Rarity | Innate (working name) | Effect sketch |
|---|---|---|---|
| fizzpop | Common | Sputter | its burns last +1 round |
| glowtail | Common | Slow Fuse | +1 charge at fight start |
| cinderpaw | Rare | Eager Ember | first Overload each fight costs 1 less charge |
| stoneward | Common | Old Stone | its shields are +15% stronger |
| ironwall | Rare | Doorframe | the ally beside it takes 10% less damage |
| mossback | Common | Deep Roots | its regen ticks can overheal into block |
| dewleaf | Rare | Morning Dew | opens every fight with a small team mend |
| buzzline | Common | Hum | its amp gifts last +1 round |
| tanglewing | Rare | Tailwind | the carry it amps also gains +1 speed |
| swiftpaw | Common | First Blood | +25% damage while untouched |
| dartwing | Rare | Ricochet | its multi-hits can't strike the same target twice |
| shadefang | Rare | Grudge | +20% vs whoever last hurt it |
| veilclaw | Legendary | Veil | untargetable round 1 |
| blightcap | Legendary | Sporecloud | enemies that strike it take 1 poison |
| hexmoth | Unique | Mothlight | its curses tick one round sooner |
| frostwarden | Legendary | Hold Fast | its freezes need 2 hits to break |
| rimecaller | Unique | Deep Cold | chilled enemies feed it 1 charge/round |

**⚠ Implementation constraint (golden safety — do NOT skip this):** innates must NOT live on
`COMBAT_CREATURES` defs — goldens build units via `makeUnitDef` and would shift. Put them in a
separate `INNATES` table applied at the RUN layer: merged in `playerDef()` (note: playerDef
currently *constructs* its `mods` object — the innate must be merged INTO that construction, not
clobbered by it), and optionally onto ring locals in `waves.js` (same pattern as MIRROR_ELITES
mods). Goldens never touch either path.

## The pull beat (the 8 seconds that make it a moment)
Order of reveal matters more than VFX budget:
1. Type glyph + rarity color land first (you know the *species* of moment).
2. **The innate card flips second** — the NEW THING, before stats. "Ricochet — its multi-hits
   can't strike the same target twice."
3. One "what this opens" line, computed from real state: name an archetype combo the player
   couldn't field before. "Pair it with Threecut's tree: a swarm that never wastes a cut."
4. Stats last. Stats are the least interesting fact about a pull and should act like it.
Dupes: skip to a shorter beat — "+40 ⬡ toward [creature]'s build" with the core meter visibly
filling. A dupe should feel like *progress*, never like a blank.

## Completion structure (why you keep pulling at hour 15)
- **The Stable page becomes a wall of 17 silhouettes** (Bestiary already in flight on the art
  instance — converge, don't duplicate). Unowned = silhouette + WHERE it runs ("seen in the
  Fast Trails") — collection IS world-discovery, keep them fused.
- **Ring-biased summons:** summoning while camped at a ring biases pulls toward its locals
  (waves.js `biasIds` already names them). Want the Witherfen moth? Go to the Witherfen. This is
  the Pokémon-GO half of the north star expressed in the gacha, and it makes "march inward"
  also mean "new pulls inward."
- **Type mastery feat:** clear any ring with each Type as your carry (8 checks). Cheap to build
  (feats system exists), directly pushes squad rotation — same muscle R8's law trains.
- NOT doing: paid currency, FOMO banners, limited-time anything. The game's promise is folk
  honesty; the gacha stays a slag sink with pity (PITY_AT 15 stands).

## Role identity (the "they all feel the same" fix, beyond innates)
Sky's playtest: "characters all feel like they kinda do similar things." Two cheap, high-yield moves:
1. **Role line on every card** (squad pick, draft, stable): one sentence of JOB, not lore.
   "BULWARK — the wall. Soaks, shields, punishes hitters." Per Sky's standing feedback
   (roles-over-names): purpose first, name downstream. 8 lines of copy, no system.
2. **One manual-only verb per Type** (audit, then fill gaps): each Type should have ONE decision
   only a human makes well — Reactor banks Overload timing, Warden chooses WHO stays frozen,
   Hexer stacks doom for lethal rounds, Bulwark picks who to wall. Where the audit finds a Type
   whose manual play is just "tap the same skill," THAT kit gets the next design pass. This is
   the manual-first lane (vF-CF Slice A) paying rent: roles are felt under manual control,
   flattened under auto.

## Two small open decisions, decided (specs for the build queue)
**Forge dead-end →** add ONE repeatable sink, "Tempering": +1% squad max HP per tier, cost
40⬡ × 1.5^tier (slag), cap at T10 per crossing (resets each crossing — NG+ re-sinks). Plus an
explicit "the forge rests" done-state line when perks/keystones are bought out and tempering is
capped. No new systems; one ramp, one cap, one sentence.

**Holdfast boons →** at each newly reclaimed stage, CHOOSE 1 of 2 boons (the stage's current boon
+ one alternate); swappable later at the Holdfast for 30 slag. Turns a passive drip into 8 small
build decisions — same "decisions must matter" spine. Author 8 alternates (one per stage),
reuse the existing boon apply path (`holdfastMods`).

## Build order for the Opus pass (each its own verified slice)
1. Role lines on cards (copy only — instant win, zero risk).
2. INNATES table + playerDef merge + card display (engine-adjacent: sim before/after, goldens green).
3. Pull-beat reorder (innate-first reveal + "what this opens" line + dupe beat).
4. Ring-biased summons + Type-mastery feat.
5. Forge Tempering + Holdfast boon choice (independent, any time).
6. Manual-verb audit doc (read kits, table of per-Type manual decisions, name the gaps).
   ✅ DONE 2026-06-10 → `docs/RINGWARD-MANUAL-VERB-AUDIT.md`. Verdict: Reactor/Assassin/Hexer
   strong; Mender weakest then Bulwark then Booster flagged for a kit pass; biggest cheap lever =
   a legibility pass (telegraph enemy intent + first-action cue + 45% breakpoint line) that lifts
   Warden/Striker/Booster/Bulwark at once. Structural note: V2 (build-vs-spend) doesn't exist below
   2 charge, so opening turns are pure targeting — new verbs should ride the always-legal builder.
Out of scope until Sky's look: silhouette wall visual design (art instance owns look).

**⚠ Channel audit (checked against the engine, 2026-06-10):** most sketches ride existing
statuses/mods, but THREE name channels that don't exist — swap or build deliberately:
- *fizzpop "burns last +1 round"* — burn decays via `BURN.decayPerRound` (engine.js:63); a
  decay-resist mod is a NEW (small) channel. Alternate: "+1 burn stack on its first burn."
- *tanglewing "+1 speed"* — turns run in side blocks, not speed order (engine.js:254); speed is
  cosmetic here. Replace: "its amp gift also adds a small shield."
- *veilclaw "untargetable round 1"* — no targeting-immunity channel in drivers/combatMath.
  Replace: "takes half damage while at full HP" (rides the existing opener-style HP check).
Everything else maps to channels that exist today (block, regen, charge, poison, freeze, vuln,
amp, lifesteal/thorns-style mods). Re-verify each at build time; sim before/after per innate batch.
