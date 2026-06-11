# Ringward — The Collection Engine (design decision)
*2026-06-10, Fable session. The run-#20 lane, designed. This doc decides mechanics; it is not a
survey. Every channel named below was verified against the live engine this session.*

## The thesis (the filter every future feature passes)
**Collection creates possibility; buildcraft turns possibility into replayability.** A proposed
feature either creates new possibilities or it's just more stuff. New rarity tiers, more
currencies, +20 relics: stuff. This doc ships possibilities and — the part most collection games
miss — makes them **visible**.

## The two questions, answered separately
1. **What changes when I pull creature #11?** → It completes or upgrades a *named team* — a way
   to play that didn't exist on your bench yesterday.
2. **How does the player KNOW?** → The game tells them, in words, at four moments: the pull, the
   squad pick, the character sheet, and the ring threshold. Pokémon surfaces typings instantly;
   Slay the Spire names archetypes; Ringward names **teams**. The diversity already half-exists
   in the kits — the failure mode to avoid is players never noticing it.

---

## THE MECHANIC: Team Recipes
A **recipe** is a named squad — 2–3 slots, each keyed to a Type, a specific creature, or a sworn
★ Oath — with a one-line folk description of how it plays, a detection rule, and one mild
**seasoning** effect when fielded. The synergy is REAL before any bonus: every recipe below rides
combat channels that exist today (the recipe names the synergy; the seasoning only salutes it).

### Layer 1 — the recipes are visible (build first, zero combat change)
A `src/data/recipes.js` table (shared game+sim, the waves.js/upgrades.js extraction pattern).
Detection is pure data → UI:
- **Squad pick:** when your picks match a recipe, its chip lights: *"🍳 You're running THE LONG
  WINTER — freeze them, then break them."* Near-misses show dimmed: *"one short of THE PYRE PACK."*
- **Pull reveal (the moment that decides hour 15):** computed against the player's OWNED roster,
  not the catalog. New creature → up to two lines: *"⚡ NEW TEAM POSSIBLE — THE PATIENT KNIFE
  (with your Frostward): hold them frozen under the knife-line."* If it completes nothing → the
  nearest miss becomes the chase pointer: *"one short of THE STORMCOURT — a Booster would finish
  it."* Either way the pull ends with a team in the player's head or a name to hunt.
- **Character sheet (queue slice U5):** "teams this one belongs to," tappable.
- **Ring thresholds:** law chips name the recipe that answers them: *"The Cold Remembers —
  squads that ran last time start frozen. THE PYRE PACK thaws fast."* (Copy + detection only.)
- **Feats:** "cook each recipe once" group — rotation pressure with a vocabulary.

### Layer 2 — seasoning (the honest kicker, small and in-lane)
Fielding a complete recipe grants ONE mild named effect through the existing run-layer mods
(`perkBaseMods` chain — the innates/tempering channel; golden-safe by construction, and
sim-MEASURABLE since the sim reads the same mods). Rules:
- One seasoning active, ever (you field one squad).
- Always **in-lane** (~+8–12% of what the recipe already does — never a cross-lane stat).
  The seasoning points AT the possibility; it must never BE the reason.
- Folk-named, one line, no math on the card (math in the ⓘ).

### Layer 3 — the roster grows INTO the engine (creatures 18+, Apex)
- **Every future creature is designed recipe-first:** the design checklist for creature 18 starts
  with "what team does it complete or create?" — squad-warping enabler innates (the PoE-support
  move) are RESERVED for new creatures so the existing 17 need no rebalance.
- **Apex Uniques are recipe centerpieces:** each Apex (sigil-hunted, won by fight) is the
  irreplaceable heart of exactly one recipe nobody else completes. Chasing an Apex = chasing a
  TEAM, not a statline. (Sigil UI already counts toward a named creature; now it counts toward
  a named way to play.)

---

## THE RECIPE BOOK v1 (channel-audited; ship these)
Slots: `T:` any of Type · named creature = that creature · `★` = sworn Oath required.

**Roster recipes (hour 5 — discoverable with early pulls):**
1. **THE PYRE PACK** — `T:Reactor ×2` (best: Fizzpop + Cinderpaw). Burns stack (Sputter +1/stack),
   Overload doubles on burning. *"Light it twice, then blow on it."* Seasoning: burn ticks +10%.
2. **THE LONG WINTER** — `T:Warden + Dartwing`. Freeze (skip turns) + Killing Frost/shatter ×1.35–1.5
   + Finisher +25% under half. *"First the cold, then the quiet."* Seasoning: shatter +10%.
3. **THE PATIENT KNIFE** — `T:Warden + T:Assassin`. Freeze holds a target under the 45% execute
   line it can't heal past. *"Hold them still. The knife knows when."* Seasoning: Execute's line
   45%→48%. (A mirror elite already carries this name inward — the enemy advertised it first.)
4. **THE THORNWALL** — `Ironwall + T:Mender`. Spite Plating 15% + base reflect 0.35 + overheal
   plates: they break themselves on you. *"Build the wall. Let them argue with it."*
   Seasoning: thorns/reflect return +10%.
5. **THE STORMCOURT** — `T:Booster + T:Striker`. Amp multiplies EVERY hit; Flurry is 8 hits.
   *"One voice, many knives."* Seasoning: Flurry +1 hit cap.
6. **THE BELLOWS** — `Glowtail or Tanglewing + any payoff creature`. Charge-start innates +
   Wellspring/Channel gifts feed one spender's bomb. *"Keep the fire fed."* Seasoning:
   chargeStart +1 for the squad.
7. **THE WIDOWING** — `T:Hexer + T:Reactor`. Stack vuln (+15%/stack), then one Overload lands it
   all. *"Mark the tree, then drop it."* Seasoning: vuln stacks decay 1 round slower.
8. **THE FIRST POUNCE** — `Swiftpaw + Dartwing`. Opener +25% on the unwounded, Finisher +25%
   under half — the wound passed between them; Blitz ×1.6 tempo both ends. *"One opens,
   one closes."* Seasoning: Blitz first-strike ×1.6→×1.75.

**Sworn recipes (hour 15 — need specific ★ Oaths; the chase after the roster fills):**
9. **THE SLOW ROT** — `T:Assassin ★Plague + T:Hexer ★Pandemic`. Shield-ignoring poison that never
   fades + curses that rot the line. *"Nothing here heals."* Seasoning: poison +10%.
10. **THE UNBROKEN LINE** — `T:Bulwark ★Unbreakable + T:Mender ★Evergreen`. Allies can't drop
    below 1 HP while the wall stands; regen never expires. *"It holds because it has to."*
    Seasoning: regen +10%.
11. **THE IRON ARGUMENT** — `T:Bulwark ★Iron Maiden + T:Booster`. 100% reflect walls, amped.
    *"Hit it harder. Please."* Seasoning: reflect cap +5%.

**Apex recipes:** one per Apex Unique, authored when each Apex's kit is final — the Apex slot is
non-substitutable. (Reserved; not authored here.)

**Rejected, with reasons:**
- *Full pair-bond matrix (17×17):* content explosion, stat-soup; recipes keep the good half
  (named combos) with authored discipline.
- *Squad-warping innates on the existing 17:* re-balances everything shipped; reserved for 18+.
- *Recipe-gated relic/Oath function:* negative framing ("your gear is dead without X") — fails
  the possibility filter from the punishment side.
- *New rarity tier / shiny / second gacha currency:* stuff, not possibility.

## The bench problem, answered
A same-Type dupe creature is now: a different innate → different recipe slots (Fizzpop completes
PYRE PACK; Glowtail completes THE BELLOWS — both Reactors, different teams) + ring laws already
punish repeat squads + recipe feats want every dish cooked once. The bench is a larder, and the
laws + recipe pointers tell you which ingredient tonight's ring wants.

## Hour map (the retention hypothesis, made concrete)
- **Hour 1:** discover creatures (unchanged — cutscene → rings → pulls).
- **Hour 5:** recipes give experimentation NAMES — "let me try The Thornwall" replaces "let me
  try... these three?"
- **Hour 15:** chase = completing the book — sworn recipes (Oath choices now have team meaning),
  Apex centerpieces, near-miss pointers steering summons (Near Call already biases by ring).
- **Hour 30:** mastery = the law × recipe matrix (which dish answers which ring) + every recipe
  cooked + crossings re-asking the question at higher stakes.

## Build order (model-tagged, for BUILD-QUEUE)
- **R1 · sonnet · recipes.js + squad-pick chip** — data table + detection + lit/near-miss chips +
  character-sheet listing hook. No combat effects. Goldens untouched by construction.
- **R2 · opus · pull-beat team reveal** — owned-roster computation, "NEW TEAM POSSIBLE" beat +
  nearest-miss chase pointer (extends the S3 staged reveal).
- **R3 · opus · seasoning** — run-layer mods through `perkBaseMods`; depth-sweep before/after
  (`PRUNS=200 GEAR=1 … --depths`) — seasonings are sim-visible; ladder must stay a ladder.
- **R4 · sonnet · law pointers + recipe feats** — threshold copy + "cook the book" feat group.
- **R5 · fable · creature 18+ / Apex recipe authoring** — recipe-first creature design, when
  the roster next grows.

## How we know it worked (Sky's one-session test)
He pulls a creature and SAYS, unprompted, what team he wants to try — before reading stats.
Failure smell: recipe chips read as buff-checklists ("I field the squad for the +10%") — if that
happens, halve the seasonings; never let the label become the reward. Sim guard: R3 sweep shows
no recipe pushing a ring's geared win-rate out of the 20–90 band that keeps the ladder a ladder.
