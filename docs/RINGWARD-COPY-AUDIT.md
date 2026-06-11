# Ringward — Fresh-Eyes Copy Audit
*2026-06-10. Three cold readers (zero prior knowledge of the game) audited all player-facing
copy, the lore layer, and the first-session flow. This doc is the condensed verdict + the full
rewrite spec for queue slices U1–U4. Line refs verified at audit time — re-check at build time.*

## Verdict
The world/goal layer is STRONG: the opening cutscene lands the whole premise in five taps, and a
cold reader could state the goal in one sentence afterward. The staged win reveal is "the best
screen in the game." The failures are systemic, not scattered:
1. **"chip"** — one undefined word is load-bearing in the most confusing blurbs and the
   highest-stakes prompt in the game (mid-targeting).
2. **Three words for one cost** — Vent / Spend / Blow off all mean "pay charge"; readers avoided
   "vent" moves believing the charge was wasted.
3. **Name collisions teach wrong rules** — Warden (Type + relic set + ward gate + feat + lore
   entity), Keystone (relic tier + tree tier-5 + elite mod), Mark ×2, Ambush ×2, Primed ×2.
   A reader equipped the "Warden" HP set on a Warden creature expecting freeze synergy.
4. **The tooltip trap** — the best copy (full skill blurbs, recut/salvage explanations) lives in
   `title=` hover tooltips. On touch, it does not exist.
5. **Copy that fibs about mechanics** — the ward-gate story names the wrong Type ("a Warden to
   hold the line" → the deed needs a Bulwark); the trader implies slag is run-temporary; "The
   Watch" boon says "one grunling… Primed" but applies +2 squad charge. *In a game whose voice is
   folk-HONEST, these outrank everything: the voice only works if it never fibs.*
6. **First-session routing** — the tutorial is opt-in and unsignposted; the Gauntlet reads as the
   start button; the hub (map/story/Chronicle/feats) hides behind "Holdfast."

## Three standing rules (adopt permanently)
- **No player-required copy in `title=` only.** If a thumb can't reach it, it doesn't exist.
- **Flavor never fibs about mechanics.** A flavor line may withhold; it may not contradict.
- **Unknown is fine. Misleading is not.** A player can wonder what a sigil is. A player should never misunderstand what a sigil does. Apply this filter to every lore mystery: the canon table, ward-entity naming, the up/down paradox. Fix contradictions immediately; preserve deliberate mystery.

## Top undefined-at-first-contact jargon
chip · Vent · Amp · slag ⚒ · Cores ⬡ (per-creature, copy implies shared) · carry · Keystone ·
Primed · sigil · grunling. (Minors: stack, block, the Approach, crossing, recut/shards.)

---

## U1 SPEC — instructional rewrites (APPLY; goldens safe, transcripts key on skill.id)
| # | Where | Now | Rewrite |
|---|-------|-----|---------|
| 1 | bulwark.js brace blurb | "…and chip." | "+2 charge. Set the wall where you point — yourself, or tap an ally — and deal a little damage besides." |
| 2 | mender.js mend blurb | "…and chip." | "+2 charge. Put the heal where you point — your most-hurt ally if you don't — and deal a little damage besides." |
| 3 | SeamLab ally-aim prompts (~2214, 2283) | "or an enemy to chip" | "tap an ally to heal/wall them — or an enemy to just poke it (the heal/wall still lands by itself)" — must read as AND, not either/or |
| 4 | all skills/*.js wildcard blurbs | Vent / Blow off | "Spend half your charge to…" everywhere; "Spend ALL charge" for payoffs. Names keep the color; cost lines go uniform |
| 5 | assassin.js execute blurb | "devastating against a wounded target" | "Spend all charge for a killing blow — ×2.5 once a target is under 45% health. Don't waste it on the healthy." |
| 6 | booster.js prime/overdrive | undefined "Amp", "carry" | Define at first contact: "their next hits land harder (+25% per stack, fades 1/round)"; "carry" → "your hardest hitter" (also upgrades.js:52, tree nodes) |
| 7 | SeamLab ~226 "The Watch" | "One grunling starts each run already Primed." | "The squad starts every fight with +2 charge already banked." Reserve Primed for one meaning |
| 8 | wards.js:14 | "a Warden to hold the line" | "a Bulwark to hold the line" — factual fix, flavor currently points at the wrong Type |
| 9 | SeamLab event ⬡ rewards | "+24 ⬡ to the squad" | Verify c.cores() routing first, then say where it lands ("toward your squad's builds" / "each"). First reward glosses ⚒/⬡ once |
| 10 | SeamLab 348-350 + 4017 | banner vibe fragments; rates sum 98 | "the full roster, at base odds" / "costs more — Legendaries answer ~2× as often" / "favors the locals of your selected ring"; displayed rates sum to 100 |
| 11 | waves.js:173 "chilled" | undefined status | name the real effect (verify the law's mod first; e.g. "start every fight frozen for a turn") |
| 12 | waves.js:167 | "every mend only part-takes" | "every mend closes only part of the wound" |
| 13 | SeamLab:479 | "at the crossfire" | "at the crossroads" (typo) |
| 14 | SeamLab 3968/5193 | "APEX QUARRY… win it over" / "✦ SIGIL FOUND" | "the rarest — won by fight, not luck. Clear their ring for sigils (3) → challenge it. Beat it, it joins." / "✦ SIGIL FOUND — 2 more and you can challenge it" |
| 15 | minors batch | — | farmed decay "repeat clears pay less"; Raid tab/title match; "switch freely"→"(any of yours — costs nothing)"; Chronicle pointer "in 🏚 Home"; Wrapped Wool icon 🔥→❤; battle chip '✦ carry'→'✦ ally'; "Keep held whatever this held" detangled; warden.js "Bank it for a Glaciate"→"Save the charge — Glaciate is what it's for" |

## U2 SPEC — approved renames (Sky, 2026-06-10; copy-only, ids untouched)
Relic set **Warden → Stonehide** (SeamLab ~840) · tree tier-5 "keystone" → **★ Oath** in all UI
copy incl. the swear block + mirror-elite telegraph ("carries a stolen Oath"); KEYSTONE_IDS and
relic-tier "Keystone" stay · nav tab **Holdfast → 🏚 Home** (lore keeps "the Holdfast") · innate
**Ambush → First Pounce** (swiftpaw) · Assassin skill name **Mark → Stalk** (id `mark` stays;
goldens key on id) · feat **Warden-Breaker → Gauntlet-Holder**.

## U3 SPEC — battle skill descriptions (Sky's direct ask)
Visible one-line blurb on every move button (kill the `title=`-only trap) · disabled spenders say
"needs ⚡⚡" · first-run caption over the move lane: "⚡▲ banks charge · ⚡▼ spends it" (one
localStorage flag) · recut/salvage panels get one visible sentence each.

## U4 SPEC — first-session routing
Truly-fresh save (no clears + no LEARN flag) lands on LEARN intro (default tab is 'run',
~SeamLab:5515) · Gauntlet panel greyed "opens after your first ring" until first clear · one-time
coach line on the first draft: "Before each fight, take one boon — yours for this climb only." ·
loss screen routes forward when slag was banked: "⚒ N banked — the Forge makes it permanent."
*(Deferred, wants design: a loss post-mortem line — the reader test showed nobody can answer
"why did I lose?" from the loss screen.)*

---

## CANON TABLE — lore lines, ☐ AWAITING SKY (apply none until checked)
| ☐ | Line | Problem | Proposed |
|---|------|---------|----------|
| ☐ | Trader (SeamLab:712) "I take slag. You won't carry it through the door anyway." | Implies slag is run-temporary (false) AND spoils the door reveal in ring 2 | "I take slag. Heavy stuff to haul up a ring — and the Forge will still be there when you're not." |
| ☐ | "past the Warden" (waves.js:16, SeamLab 102/136/232) | Capital-letter entity never introduced; collides with the Type | Anchor once at first contact: "past the Warden — the old sentinel that still walks the threshold of the dark" (or rename the entity) |
| ☐ | Up/down paradox ("the climb" vs "down there", lore.js:11, SeamLab:447/545) | Traversal says up, geography says down; readers lose the map | One sanctioning line early: "Rim-folk call it the climb, though every step is inward and down. Walk it and you'll understand." |
| ☐ | Cores: heart vs currency (SeamLab:220/485 vs +20 ⬡ lucky stone :548) | The fiction says core = grievable heart; the wallet says pocket change; never reconciled | Anchor: "Spent cores — drained husks, no heart left in them — still feed a growing grunling." + lucky-stone payout ⬡→⚒ |
| ☐ | "THE HOLDFAST RECLAIMS" header (SeamLab:5242) | Unintroduced proper noun, backwards grammar | "🏚 THE HOLDFAST — your home at the rim — RECLAIMED: The Hearth · 1/8"; seed the word in opening scene 2 (Cutscene.jsx — art-adjacent, Sky's call) |
| ☐ | Holdfast stage beats (SeamLab:213-232) | Each home-room beat describes a RING, no bridge | One connective clause each: "The Storeroom, stocked again — and it brings back the fallen gate, where his caches were…" |
| ☐ | "cut the tender first" (waves.js:114) | Lowercase name before the unit exists | "Race it down — or first cut the Tender that keeps it standing." |
| ☐ | "ring on ring, closing like a wound" (SeamLab:228) | Two ambiguities in one beat | Optional polish; lowest priority |

## Calibration — confirmed GOOD, do not touch
The opening cutscene (all five scenes) · the carved stones (esp. "the blight is not the wound —
it is the bandage", "Named things wake", "we laid them facing in") · LEARN's fill-up→BIG-HIT
picture · ring-law ask-lines · the staged win reveal structure · "found gear does nothing until
worn" · the summon tab's honesty ("Calls find creatures, never run-power").
