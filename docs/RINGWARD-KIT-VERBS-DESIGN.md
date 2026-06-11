# Ringward — Mender & Bulwark Manual Verbs (design → BUILT)
*2026-06-10. **✅ BUILT & VERIFIED** (Opus implementation; design by a Fable agent, claude-fable-5).
The kit design pass the manual-verb audit (`RINGWARD-MANUAL-VERB-AUDIT.md` §5–6) queued. Every
mechanism was channel-audited against the engine before building. Shipped exactly as specced:
`allyAim` flag on mend/brace (targetMode stays `'enemy'`, so the AI path is provably untouched),
ally-tap routes the payload, chip falls to the lowest-HP enemy. Goldens byte-identical
(manual-golden-mender 665795899 + -bulwark 2406512973 unchanged); Playwright confirmed both
verbs live — aimed Mend on a full-HP ally landed as an overheal plate while the chip hit the
lowest-HP enemy ("Mend: 5 → Glowtail"); zero page errors. NOT deployed; not version-cut.*

---

## The call: one grammar, two verbs — **"the builder goes where you point it"**

Both flat kits get the same one-rule fix applied to different material. Today both builders
(`mend`, `brace`) are `targetMode: 'enemy'` (`mender.js`, `bulwark.js`) — the only thing the
player aims is a 5–15 damage chip, a fake targeting choice. The fix: the builder accepts a tap
on **either line**.

- **Tap an enemy** → exactly today's behavior, byte-for-byte (heal drifts to most-wounded /
  shield lands on self; chip hits the tapped enemy).
- **Tap an ally** (side-A only) → the builder's *real* payload — the heal, the wall — lands on
  **that ally**, and the chip falls to the lowest-HP living enemy: the **same rule the support
  passives already use** (`tickSupportChip`, `engine.js:164`). No new targeting rule invented.

Why one grammar is a feature:
- **It defeats the audit's structural trap.** Verbs hung on payoffs don't exist below 2 charge
  (audit §2) — rounds 1–2 stay flat. This verb lives on the always-legal move: it exists on
  turn one of every fight, forever.
- **One rule a kid learns once** — "healers and walls go where you point them" — but the
  *decisions* it creates are different per Type (triage-routing vs wall-placement), so the
  Types stay distinct in the hand.
- **Golden-proof by construction.** No doctrine ladder is edited; the AI keeps selecting
  enemies, so no AI-driven transcript (goldens, sims, WATCH, enemy supports, the Tender) can
  ever reach the ally branch. Belt-and-suspenders: the ally branch is also gated
  `actor.side === 'A'` (the established pattern, same as the overheal plate).

**The one NEW thing, flagged honestly:** a dual-side targeting affordance — `targetMode: 'any'`
(or an `allyAim` flag the doctrine selectors ignore). It is **UI/targeting surface, not a combat
channel** — zero new statuses, zero new dials. Both verbs are pure *routing* of existing payloads.

---

## 1. MENDER — "Point the mending"

**The verb:** every Mend, the player decides where the heal goes — patch the ally of *their*
choice, or pour it onto a healthy ally so the overheal sets into a reflecting plate on whoever
the telegraphed enemy payoff is about to hit.

**Mechanic** (`mender.js` `mend`):
- Enemy tap → unchanged: heal 18 (`MENDER.mend.healNow`) to `mostWounded`, chip tapped enemy
  ×0.3, +2 charge.
- Ally tap (side A) → the 18 lands on **the tapped ally**; chip → lowest-HP enemy; +2 charge.
- **No new numbers.** The plate already exists: `mendHeal` (`mender.js:31-42`) converts side-A
  overheal 1:1 into `addBlock` + `seedReflect` (0.35). Aim 18 at a full-HP ally = an 18-point
  reflecting plate. The verb is routing, not addition.
- All LIFEBOND/VERDANT riders follow the aim (Wellspring/Channel charge-gifts, Lifebloom regen)
  — Channel becomes a deliberate fuel-injection verb. No keystone obsoleted; several improve.
- The aimed branch reports its plate in `result.shields` so the shield burst fires (the enemy
  branch's silent block stays silent — that path is golden-locked).

**Why a human beats auto:**
1. **The pre-plate read (the ⚠ telegraph).** "⚠ Execute next" → that Assassin hunts your
   lowest-HP ally — plate *them* before side B moves. Auto's heal only flows downhill to damage
   that already happened; it can never plate anyone.
2. **The triage-routing read (exact HP numbers).** Auto's `mostWounded` is lowest *current* HP
   (`mender.js:12-15`) — a fat 560-HP Stoneward at 150/560 out-pulls the 200-HP carry at
   160/200 even when the carry is the kill target and the Stoneward is just thick. The human
   routes the heal to the unit whose death loses the fight.

**Auto:** no doctrine change. Auto plays exactly today's tuned game; "never aims" is the gap,
and that's the product. (Don't add a "plate the carry" auto rule later — the support-fix work
proved sequenced buffs are worth ~0 under auto; the blight tick + plate already carry it.)

**Costs:** goldens byte-identical (ally branch unreachable by AI + side-A gated). The auto
40–60% support band is untouched *by construction* — it was measured AI-vs-AI. Total healing
per turn is identical to today (routed, not added). UI: the dual-line targeting affordance
(shared with Bulwark) + one card line.

**Copy (Mend button):** *"Put the mending where you point it. Spilled past full, it sets hard as bark."*

**Rejected:** (a) Ward-at-full-HP pre-cast — charge-gated at ≥2, leaves rounds 1–2 flat (the
exact trap), and needs an overregen channel that doesn't exist. (b) Mend grants ATK — already
classified AI-dependent ✗ in `RINGWARD-SUPPORT-FIX-TARGETS.md`, and it's Sanctuary's identity.

---

## 2. BULWARK — "Move the wall"

**The verb:** every Brace, the player decides where the wall stands — dig in himself, or set
the 40-block reflecting shield in front of the ally the ⚠-telegraphed payoff is about to land on.

**Mechanic** (`bulwark.js` `brace`):
- Enemy tap → unchanged: `addBlock(actor, 40)` + `seedReflect` (side-A 0.35), chip ×0.4, +2 charge.
- Ally tap (side A) → the recipient becomes **[ally]** — same 40 block, same reflect seed,
  **moved, not copied** (the Bulwark gets nothing that turn — that's the trade); chip →
  lowest-HP enemy; +2 charge.
- **No new numbers.** Block stacks under `BLOCK.maxStack` 400; `seedReflect` is `Math.max`, so
  re-walling refreshes rather than stacks reflect.
- Keystones compose: Intercept still covers the most-wounded; Iron Maiden's 1.0 reflect goes
  where pointed; **Aegis Reflex (braceTeam) deliberately absorbs the choice** — once Brace
  shields everyone there's nothing to aim, which is the capstone fantasy, not a collision.
- The ≥2-charge ladder stays clean: aimed Brace = move the wall *free* (40, charge still
  banking); Bodyguard = the big wall *now* (30/charge — 60 at 4, keeps its burst niche);
  Aegis = wall *everywhere*.

**Why a human beats auto:** this is what the telegraph was built for. "⚠ Flurry next" → up to
8 hits about to drum into someone — pre-place the wall and 40 block soaks while 35% of every
blocked point comes back. Rounds run in side blocks, so the player's placement is guaranteed
to be standing when the hit lands. Auto's `dig-in` self-shields and `cover-the-wounded` reacts
only after an ally drops below 50% — **auto walls the past; the human walls the future.**

**Auto:** no doctrine change. "Always wall yourself" is also the correct conservative default
— the tank holding its own wall is never throwing; auto stays blunt, not broken.

**Costs:** goldens byte-identical (same construction). Adds **zero** total block to the game —
only the address changes — lowest-balance-risk verb available. **Watch item:** manual Iron
Maiden (100% reflect placed on the boss's telegraphed target every turn, free). If manual win
rate spikes there, tune `BULWARK.brace.blockGain`, never the 0.35 reflect base — that dial
holds the auto support band up. UI: shared affordance; Brace already returns `shields`.

**Copy (Brace button):** *"Dig in where you point — the wall don't care whose feet it stands at."*

**Rejected:** (a) Taunt/lure — needs a NEW redirect channel through every doctrine selector,
and it would make the hours-old ⚠ telegraph *lie* (the predicted move would no longer hit who
the honest ladder-walk says). The telegraph is the asset; don't build the one verb that
falsifies it. (b) Anvil Mark as the verb — the damage-taken mark is classified AI-dependent ✗,
and as a manual identity it's a worse Hexer; keep `braceMark` as the opt-in tree node it is.

---

## Interaction check (both in one squad)
Mossback + Stoneward + carry stacking both routings on one telegraphed victim: aimed Brace
(40 + 0.35 reflect) + aimed Mend on the now-plated ally (overheal → +18 block; reflect is
`Math.max` → 0.35 stays 0.35, **reflects cannot stack across the two** by existing code).
Net ~58 routed block per round vs a depth-scaled boss swing — a meaningful hold, not an
immortality loop, paid for with two low-ATK bodies whose end-of-round chips the engine already
anti-stacks (`tickSupportChip` takes only the strongest of each Type — `engine.js:159-161`).
The verbs also *compete* healthily: plate-then-heal wastes the heal into more plate;
heal-then-plate wastes nothing — a real ordering micro-decision inside V1, no new rules.

**Tender/boss threat: none.** Both verbs are side-A gated and AI-unreachable; the Tender plays
its current tuned game. Neither verb adds a point of throughput or EHP — the boss race gets
more *pilotable*, not shorter.

## Implementation order (when approved)
1. The `'any'` targeting affordance in SeamLab (one change, pays for both Types).
2. `mender.js` ally branch → 3. `bulwark.js` ally branch.
4. `npm test` — goldens must hold **byte-identical, no re-anchor anywhere** in this design.
5. Live Playwright: manual fight, aim a Mend and a Brace at allies, assert plate/wall lands +
   chip falls to lowest-HP enemy + goldens still green.
6. Then Sky's live feel-check — the verbs are live-feel-validated (the sim's fixed doctrine
   cannot measure a manual-only verb, same as innates).
