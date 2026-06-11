# Ringward — Handheld / Landscape Direction
*2026-06-10, Fable session. Sky's ask: design the game as a horizontal (landscape) experience on
a device, with deeper menus — character pages with full art, lore/history/skills sub-menus, and
ⓘ buttons for the long version of anything.*

## The good news first
The responsive spine already exists: `window.innerWidth` is tracked with an `orientationchange`
listener (`SeamLab.jsx:390-395`), a `narrow` flag threads through the screens, and the grids
already widen (1→2–3 columns). **Landscape is not a rewrite — it's designing the wide branches
deliberately instead of letting them be "portrait, but stretched."**

## Layout system (the one rule)
**Portrait = a river (one column, scroll). Landscape = a table (panes, glance).** Every screen
picks its landscape shape from two patterns:
1. **Stage** (the fight): three panes — squad column | center (moves + log) | enemy column.
   FightView is already composed this way semantically; landscape gives each side a true column,
   bigger sprites (~96→120px), and the battle log BESIDE the moves instead of below the arena.
   The cue chips (⚠ next / ⚡ Blitz now) gain room to breathe.
2. **Master–detail** (every menu): list on the left, detail on the right. Tap a creature → sheet
   fills the right pane (no navigation stack); tap a relic → its cuts and story on the right;
   tap a carved stone in the Chronicle → the inscription large. In portrait the same detail
   renders as the existing bottom-sheet/overlay — one component, two shells.

Build order: **fight screen first** (queue U6 — proves the direction on the most-seen screen),
menus next round after Sky's look. Device notes: viewport meta sanity now; PWA/fullscreen and
orientation handling are a later, deliberate step (no orientation lock — both must work).

## Menu IA (the sub-menus ask)
Five tabs stay, one renamed: **⚔ Raid · ✨ Summon · ⚒ Forge · ✦ Relics · 🏚 Home** (was
Holdfast — approved). Inside 🏚 Home, the hub becomes explicit sections instead of a scroll:
**The Map** (world rings) · **The Roster** (character pages) · **The Chronicle** (stones, story
so far, lore) · **The Book** (team recipes, when R1 ships) · **Feats** · **The Holdfast**
(reclaim stages — the place keeps its name).

### Character page (queue U5)
Tap any creature card → full sheet: **big art** (battle sprite scaled now; an explicit `portrait`
slot reserved for menu-only art — a different, fuller image than the battle sprite, exactly as
Sky imagined; that's an art-instance/PixelLab decision + budget, flagged not built) · name, Type,
role line · innate · sworn ★ Oath · skills with the plain one-liners + ⓘ long versions · "how to
play it" (BUILD_LINE) · teams it belongs to (recipes) · a lore bio (source:
`docs/roster-character-sheets.md`) · button through to PATHS.

### The ⓘ pattern (description buttons)
One reusable `InfoDot` component: a small circled ❓ beside any term; tap → bottom sheet (portrait)
/ right pane (landscape) with the long folk-voice explanation. Content source: the Spotter
glossary (38 terms) wherever it already covers the term; new entries written in the same voice.
Seed ⓘ on: Amp, charge, the six statuses, slag/cores/shards/sigils, crossings, recipes.
Standing rule (from the copy audit): ⓘ is where LONG copy lives — never `title=` tooltips.

## Per-unit attack graphics — strategy
Today: per-MOVE streaks (bolt/slash), type-colored bursts/rings, per-move impact icons, embers on
fire moves, shake/pop/KO-shatter. Identity is per-Type; Sky wants per-CREATURE.

**Direction: a signature grammar, code-drawn (no sprite-VFX budget), consistent with the
code-rig continuity decision from the art lane.** Each creature gets a 3-field signature in one
table: **shape** (what the strike draws: Fizzpop = popping sparks, Ironwall = a falling slab,
Hexmoth = a moth-wing flicker), **motion** (how it arrives: arc / drop / flicker / coil), and
**flourish** (one idle/hit tell: Shadefang's hit leaves a red drink-up wisp — its lifesteal made
visible). Rules: the TYPE keeps the color and the impact icon (legibility floor); the CREATURE
gets shape+motion+flourish (identity); never more than one flourish on screen per hit (the
readability-restraint dial doctrine). Innates are the cheat sheet — most signatures should make
the innate visible (Sputter = extra sparks; Spite Plating = the thorn glint on being struck).
Implementation later (extends MOVE_STREAK/EMBER patterns in SeamLab); design per-creature table
first, 17 rows, Fable+Sky pass.

### Paste-ready ChatGPT prompt (Sky asked for a second opinion on graphics strategy)
> I'm building Ringward, a 2D React roguelite with code-drawn combat VFX (no sprite-sheet
> effects budget). 17 creatures across 8 elemental Types fight in 3v2–4 battles; sprites are
> 78–122px. Current VFX: per-move colored streaks (bolt/slash), radial burst rings, one impact
> emoji per move, particle embers on fire moves, screen shake + hit-pop + a 9-mote KO shatter.
> Type identity = color + icon. I want CREATURE-level identity: each of the 17 should be
> recognizable from its attack alone. My plan is a per-creature "signature grammar": shape (what
> the strike draws), motion (how it arrives), one flourish (a tell tied to its passive). Types
> keep color+icon as the legibility floor. Questions: (1) Is shape/motion/flourish the right
> minimal parameter set, or what would you change? (2) How do games like Slay the Spire and
> Monster Train layer generic vs signature effects without readability soup at small sprite
> sizes? (3) What ordering/timing rules keep 4 simultaneous units readable? (4) What's the
> cheapest 20% of this that delivers 80% of the felt identity?

## What this doc does NOT do
No source changes (queued as U5/U6) · no portrait art generation (art instance + budget) · no
PWA packaging decision · menus master-detail build waits for Sky's look at the fight prototype.
