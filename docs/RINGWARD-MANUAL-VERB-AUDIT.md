# Ringward — Manual-Verb Audit
*2026-06-10. Build-queue item 6 (`RINGWARD-COLLECTION-DESIGN.md:133`). Read the kits, table the
per-Type manual decision, name the kits whose manual play is just "tap the same skill." This doc is
an AUDIT — it names the gaps and sketches directions. The kit redesigns it points to are a separate
design pass (Fable-tier: each fix has a long shadow on balance).*

Grounded against `src/screens/SeamLab.jsx`, `src/engine/combat/` (engine.js, drivers.js, doctrines.js,
roster.js, dials.js, skills/*). File:line refs are anchors, not gospel — re-check at build time.

---

## 1. The premise (from the design lane)
Sky's playtest: *"characters all feel like they kinda do similar things."* The fix the lane committed
to (`RINGWARD-COLLECTION-DESIGN.md:109`): **one manual-only verb per Type** — each Type should have ONE
decision only a human makes well, that auto's dumb policy gets wrong. Manual first-clears (vF-CF) only
pay rent if that decision is *real, frequent, and visible*. Where it isn't, the kit is flat under manual
control — and THAT kit gets the next design pass.

## 2. The manual control surface — what verbs actually exist
The §26 SEAM engine merges actor-pick and decision into one free "select" phase (`SeamLab.jsx:1898–1902`).
A human has exactly **three** levers per turn:

| Verb | Where | What it is |
|------|-------|-----------|
| **V1 — Sequence** | `chooseNextActor`, free unit-tap (`SeamLab.jsx:2018, 2051, 2218`) | Pick *which* of your living units acts next. Re-orderable within the block. |
| **V2 — Build-vs-spend** | skill buttons, `legalSkills` (`SeamLab.jsx:2045, 2142`) | Pick the *builder* (always legal) vs a *payoff/wildcard* (gated at ≥2 charge). This IS the timing/banking decision — "wait" = keep tapping the builder. |
| **V3 — Target** | `chooseTarget` (`SeamLab.jsx:2059, 2216`) | Pick *who* the skill hits (single) or confirm an AOE. |

There is **no fourth verb.** No charge-hold, no skip-a-turn, no held ult — once a payoff is legal you
either fire it or pick the builder instead (`SeamLab.jsx` §6 of the control map; `legalSkills` gates spend).
That's fine: V2 already expresses "not yet." But it means every Type's manual identity is built from the
SAME three primitives — differentiation lives entirely in **the condition attached to its payoff.**

### The structural trap: no V2 below 2 charge
`autoSkip` defaults ON (`SeamLab.jsx:1904`): a unit with one legal move skips the move-pick. At 0–1 charge
the only legal move is the builder, so the engine jumps straight to targeting. **V2 doesn't exist until a
unit banks 2 charge.** Consequence: the opening turns of every fight — exactly the R1–R2 first-clears where
players are *forced* manual — are pure V3 (tap a target). This is the real root of "trivial early waves feel
flat under manual": it's the control surface, not the numbers. (Not a bug to fix here — a fact the kit audit
has to account for.)

## 3. What the player can SEE (legibility — the inputs each verb needs)
A verb is only real if the player can see what it keys off. Per-unit, the arena shows (`SeamLab.jsx:1846–1859`):

| Input | Shown? | Where |
|-------|--------|-------|
| HP (exact number + bar) | ✅ both sides | `:1849–1850` |
| Charge (dots) | ✅ **both sides** | `:1851` — you can see which enemy is loaded |
| Burn / Block / Regen / Amp / Freeze / Vuln **stacks (numbered)** | ✅ both sides | `:1853–1858` |
| **Speed** | ❌ never shown | — |
| **Enemy intent** (which skill / whose target next) | ❌ not telegraphed | — |
| **Turn order within the block** | ❌ no preview | `chooseNextActor` is blind to enemy order |
| **Execute / breakpoint lines** (e.g. 45% HP) | ❌ not marked | HP number shown, the threshold isn't |

So: status-stack and charge legibility is **excellent** (Reactor/Assassin/Hexer verbs are fully visible).
The blind spots are **speed, enemy intent, and breakpoint lines** — and three Types' signature verbs key
off exactly those.

## 4. Per-Type table — the signature verb, graded
"Auto baseline" = what the doctrine ladder does (`doctrines.js`); the dumb fallback is *first legal skill →
lowest-HP enemy* (`drivers.js:35–36`). Verdict grades how far a skilled human can pull ahead of that, given
what's visible.

| Type | Role (`SeamLab.jsx:66–73`) | Signature human verb | Verb | Auto baseline | Inputs visible? | Verdict |
|------|------|----------------------|------|---------------|-----------------|---------|
| **Reactor** | "Powers up, then blows up" | Hold Overload to stack more 🔥 first, then detonate (huge with Wildfire Heart) | V2 + V3 | Fires Overload the instant charge ≥ threshold | 🔥N + charge ✅ | **STRONG** — cleanest "wait for it" puzzle, fully legible |
| **Assassin** | "Hunts and finishes the weak" | Mark to drag a target under 45%, *then* Execute for ×2.5 | V2 + V3 | Executes at charge threshold regardless of target HP | HP# ✅ (45% line ❌) | **STRONG** — the poster child; only polish = mark the threshold |
| **Hexer** | "Makes enemies take more from the squad" | Stack 💀 vuln on one target, then have the *carry* hit it | V1 + V3 | Dooms at threshold on biggest-ATK | 💀N ✅ | **STRONG\*** — sings only with a carry alongside (cross-unit V1); mono-Hexer flatter |
| **Warden** | "Freezes enemies out of their turns" | Freeze the enemy that denies the *most* (fastest / about to pay off), not the biggest | V3 | Glaciates highest-ATK | freeze + enemy charge ✅; **speed ❌, intent ❌** | **OK / blind** — verb is real & high-impact but its best form keys off hidden info |
| **Striker** | "Fast — lots of quick hits" | Go first for the ×1.6 Blitz; or concentrate hits to chain Momentum/kills | V1 + V2 + V3 | Blitzes if first-action & charge ≥ 2 | charge ✅; **first-action bonus ❌** | **OK** — tempo verb exists but the ×1.6 trigger is invisible |
| **Booster** | "Makes an ally hit way harder" | Amp the ally about to fire a *multiplying* payoff (Striker Flurry), timed to their turn | V1 (cross-unit) | Amps "strongest ally" at threshold | ally charge + ✦N ✅ | **OK / subtle** — inputs visible, but payoff is deferred & indirect → low felt-impact |
| **Bulwark** | "Soaks hits and guards the team" | Bodyguard the *right* ally before the hit lands; pre-Aegis a burst round | V3 + V2 | Bodyguards any ally < 50%; else Aegis at threshold | HP ✅; **enemy intent ❌** | **FLAT-risk** — most turns are Brace (no choice); the one real call overlaps auto + needs missing telegraph |
| **Mender** | "Keeps the squad alive" | Don't waste heals; bank Bloom for a spike vs Ward now | V2 + V3 | Blooms at threshold if ally < 60%; Wards if 2+ < 85% | HP ✅; **incoming damage ❌** | **FLAT — weakest** — reactive; signature play is a *non-action* + foreseeing damage the UI doesn't show |

## 5. The gaps, ranked (which kits get the next design pass)
Three Types are at real risk of "tap the same skill" under manual control:

1. **Mender — weakest, top of the queue.** Decision density is lowest in the roster. The builder (Mend)
   auto-targets most-wounded; the payoff (Bloom) auto-fires when someone's hurt; the human-superior play is
   *not wasting heals* (a non-action) and *banking Bloom for a spike you can't see coming.* Manual Mender ≈
   "tap Mend until someone goes red, then Bloom." Nothing on screen rewards reading or timing.
   *Direction (for the design pass, not built here):* give the Mender a **proactive** verb that keys off
   visible state — e.g. Bloom's overheal→shield (already in-kit, `mender.js:44`) made a deliberate *pre-cast*
   on a healthy ally about to be focused, or a Ward that's worth firing *on full HP* for its regen floor.
   The verb must reward acting *before* damage, not after.

2. **Bulwark — second.** Most turns are Brace (self-shield, no target choice). The only real decision is the
   Bodyguard target, which is (a) charge-gated so it's rare, and (b) almost exactly what auto already does
   ("shield the hurt ally"). The human-distinct play — pre-shield the ally the *enemy is about to hit* — needs
   enemy-intent telegraph that doesn't exist (§3). *Direction:* either give Brace a targeting choice (wall an
   ally, not just self) so V3 exists every turn, or lean the kit into **reflect** (Iron Maiden, `:1142`) where
   the decision is "who do I want hitting my wall" — a verb that reads off the visible enemy, not hidden intent.

3. **Booster — third.** The inputs *are* visible (ally charge dots + ✦ amp stacks), so this is the most
   salvageable. The problem is the payoff is **deferred and indirect**: you Amp now, the carry hits next turn,
   and the win is "the number was bigger." Low drama. *Direction:* tie the Amp to something that resolves
   *this* turn (a same-turn re-trigger, or Amp that also chips), so the decision has immediate feedback. The
   Conductor charge-gift path (`:1193`) already points here — Amp that *fuels the carry's payoff now* is the
   verb; surface it.

### Cross-cutting lever (cheaper than three kit reworks — lifts 4 Types at once)
Warden, Striker, Bulwark, and Booster all have a *real* signature verb whose inputs the player **can't see**
(§3: speed, first-action bonus, enemy intent). Before reworking those kits, the highest-leverage move is
**legibility, not mechanics**:
- **Telegraph enemy intent** — a small "loaded / about to act" marker on an enemy whose charge is full (the
  data exists; charge dots already render). Instantly makes Warden's "freeze the one about to pay off" and
  Bulwark's "pre-shield the incoming hit" *playable* instead of guessed.
- **Surface the first-action bonus** — a "⚡ strike-first" cue on a Striker that hasn't acted, so the ×1.6
  Blitz window (`dials.js:193`) is a visible choice, not a hidden one.
- **Mark breakpoint lines** — a faint kill-line at 45% HP on enemy bars makes the Assassin's already-strong
  verb teachable, and sharpens every focus-fire decision.

This is a feel/legibility pass (Sonnet-tier, low risk) and probably belongs *before* any kit redesign — it
may reveal that Warden/Striker/Booster are fine once you can see what you're deciding, leaving only Mender
and Bulwark as true mechanical gaps.

> ✅ **BUILT same day (2026-06-10).** All three cues shipped in SeamLab.jsx, UI-only: (1) "⚠ ‹move› next"
> telegraph on enemies — an honest prediction made by walking the SAME doctrine ladder the AI will walk
> (`when` conditions + `canUse` gates only, never a selector, so the seeded RNG is untouched and goldens
> stay byte-identical); suppressed while frozen, quiet on builder turns. (2) "⚡ ×1.6 Blitz now" on a squad
> Striker while the round's first action is unspent + a matching "×1.6 NOW" chip on the Blitz button.
> (3) 45% execute notch on enemy HP bars while a living squad unit carries Execute (threshold read from
> the ASSASSIN dial). Verified live: Playwright manual fight, all three cues asserted, zero page errors.
> Re-judge Warden/Striker/Booster under these cues before opening their kits.

## 6. Recommendation
- **Strong, ship-as-is:** Reactor, Assassin, Hexer (with a carry). These three already deliver "a decision
  only a human makes well." Don't touch them.
- **Do first (cheap):** the legibility lever (§5) — enemy-intent telegraph, first-action cue, breakpoint
  lines. Re-judge Warden/Striker/Booster after.
- **Design pass (Fable, has a balance shadow):** Mender's kit, then Bulwark's — give each a proactive,
  visible-input verb so manual play isn't a single repeated tap.
- **Structural note for whoever opens that pass:** remember V2 doesn't exist below 2 charge (§2) — any new
  verb that only unlocks at the payoff gate still leaves the opening turns flat. The most valuable new verbs
  are ones the builder itself carries (a targeting or timing choice on the always-legal move).
