# Ringward — Build-Visibility UI Spec (skill-tree picker polish)

**Status: design spec, 2026-06-08. P1 identity line SHIPPED 2026-06-09 — see below; rest pending.**

**✅ SHIPPED (2026-06-09): P1 archetype identity line (in the tree modal).** `deriveArchetype(type,
equippedNodeIds)` in `SeamLab.jsx` (after `NODE_BY_ID`) names a build from its **dominant equipped path**
using the path's OWN name + tag — honest by construction (it can't lie; it's literally what you equipped).
Rendered as a banner in the tree-modal header: e.g. a 2-node PYRE loadout on Cinderpaw shows **"🔥 PYRE
CINDERPAW · burn over time"**; empty loadout shows "No build yet — equip path nodes to forge an identity";
nodes spread across paths → "VERSATILE · a little of each path". Updates live as you equip. Verified on
screen. Remaining: the squad-pick *card* placement (P1 second half), node tooltips (P2), cross-creature
nav (P3), cost/slot legibility (P4). **Naming polish welcome** — the archetype currently uses the raw path
names (PYRE/DETONATOR/CINDER…); Sky may want warmer build names ("Burn Detonator") layered on top.
This is prove-it-fun item #2: the systems exist and persist; the job is making the build *legible and
felt* ("look what my build became"). Per [[8gents-combat-control-pivot]] this is the open half of the
combat pivot — the "visible build / proc-tree fantasy."

## What already works (don't rebuild)
The skill-tree modal exists (`SeamLab.jsx:2975-3157`), opened by the "🌳 PATHS" button on each creature
card in the `pick` phase (`setTreeFor(id)`). Today it already does: fog-of-war node visibility (shows ~2
tiers ahead + capstones/keystones), unlock with Cores (`buyNode` `:2505`), equip/unequip within a slot
cap (`toggleEquip` `:2548`, `slotsForUnlocked` `:957`), a slot meter, and per-Type paths (`TYPE_TREES`,
nodes carry `name`+`desc`). Combat reads equipped nodes via `treeModsFor` (`:1314`). **The data/persistence
layer is complete** (`8gents_creature_tree/_equip/_ranks`). So this is a *legibility/feel* pass, not a
systems build.

## The gap (why the build doesn't yet feel like a build)
1. **No build summary.** On the squad-pick card you only see "X nodes unlocked" — never "here's what my
   Cinderpaw actually *does* now." The player can't see their build without opening the tree.
2. **One-line node text, no tooltip.** `desc` is squeezed inline + fogged; the player can't study a node.
3. **No cross-creature nav.** To compare/edit another creature you close the modal and re-tap. Breaks the
   "tour my squad's builds" loop.
4. **No cost preview / slot-growth explanation.** "Rank 3 will cost N" and "unlock 4→8 nodes = 4→8 slots"
   are nowhere stated, so progression feels opaque.
5. **Linear list, no shape.** Paths are a vertical text list — no sense of a *tree* you're climbing.

## The spec (priority order — highest leverage first)

### P1 — The Build Summary card (the single highest-leverage piece)
A compact, always-visible "current build" readout per creature — the thing that delivers "look what my
build became." Two placements:
- **On the squad-pick creature card:** replace "X nodes unlocked" with the equipped loadout as a row of
  glyph chips (one per equipped node, its icon + short name on tap) + a one-line **identity line** that
  names the build (e.g. "Cinderpaw — *Burn-stacking detonator*: +2 burn, Overload AOE, +24% dmg").
- **At the top of the tree modal:** the same summary, pinned, updating live as you equip/unequip — so
  every change visibly reshapes "what this creature does."
Derive the identity line from the equipped nodes' dominant path (PYRE/DETONATOR/etc.) + keystones — a pure
read of `treeEquip` + `TYPE_TREES`, no new data. **Honesty constraint (external review):** the label MUST
be computed from what's *actually* equipped — if the loadout is split/unfocused, say so ("Cinderpaw —
*unfocused*"), don't slap on a flattering archetype name. The moment the label lies (says "Burn Detonator"
when only 20% of the loadout supports it), players stop trusting it and the feature dies. The win is the
player going from "I unlocked 17 nodes" to "this is my *Burn Detonator* Cinderpaw" — identity, not
inventory.

### P2 — Node tooltip / detail-on-tap
Tap a node → a small popover with full `name`, `desc`, cost (or "next rank: N ⬡" via `rankedCost`/
`refineCost` `:1289-1292`), prereq state, and whether it's equipped. Removes the cramped inline fog.

### P3 — Cross-creature nav inside the modal
A top strip of the squad's creatures (or ◀ / ▶) to switch whose tree you're viewing without closing.
Turns "edit one creature" into "tour and tune the whole squad's builds."

### P4 — Slot-growth + cost legibility
State the rule near the slot meter: "Unlock 4 / 8 / 12 / 16 / 20 nodes → 4 / 5 / 6 / 7 / 8 loadout slots"
(`slotsForUnlocked` `:957`). Show the next-rank cost on ranked/Refinement nodes *before* you commit.

### P5 — Light visual shape (optional, last)
Give each path a faint vertical spine with tier pips so it reads as a climb, not a list. Cosmetic; do
only if P1–P4 land well. (Don't over-build a node-graph — pixel-clean and legible beats sprawling.)

## Build order & guardrails
P1 → P2 → P3 → P4, each shippable alone; P5 only if time. All changes are **additive UI in the tree-modal
region** (`SeamLab.jsx:2975-3157`) + the pick-screen card; they reuse existing state/helpers and touch **no
combat engine code**. Validate each at mobile width (375px) and confirm the `<1s` read test: glancing at a
creature, can you say what its build *does*?

## Resolved: lead with the identity line (external review 2026-06-08)
Verdict — **ship the Archetype Identity Line first.** Players need "what did I build?" answered before
"how does it work?" or "how strong is it?". The three candidates are *layers*, in order:
**(1) identity line → (2) proc/trigger if-then readout → (3) numbers preview.**
- **P1 leads with the identity line** (above) — it's what players form an attachment to (a build *name*
  and playstyle), not a node count or a list of conditionals.
- The **proc/trigger if-then readout** ("on Overload → set ablaze; on kill → +2 charge") is the summary's
  *second* layer / an expand — strong, but it answers "how it works," not "what am I," so it's support.
- A **numbers preview** (watch dmg/HP move on equip) is *lowest* priority: trap = stat tunnel-vision, and
  many of Ringward's best nodes (AOE/spread/charge-gen) barely move DPS while transforming the fight, so
  leading with numbers would mis-teach what matters. Optional, last.
