# 8gents — Vocabulary Collision Audit

**Date:** 2026-05-31 · **Build:** vC-P → vC-Q · **Status:** High-severity renames EXECUTED in vC-Q (see below); structural clusters + Define-tier glossary work still open.

> **vC-Q executed (2026-05-31):** Spark→**Reactor**, Anchor→**Stall**, Resonate→**Sync**, Signature Modifier→**Signature Glyph** (Module kept), plus rep→Standing / RECON→Scout. Display-only (internal keys unchanged → goldens byte-identical). Echo kept by design. Still open: the mod/module disambiguation beyond the Glyph rename, the numeric-ladder pile (#4), the currency-jobs question (#5), and writing the Define-tier glossary one-liners.

**Why this exists:** the player (and the designer) gets lost in 8gents' terms because many collide
with their meaning in other games. This is the §10/§11 *readability* diagnostic firing — it's the
root cause underneath the proposed Spotter-as-glossary (see memory `8gents-spotter-glossary`). This
audit lists every player-facing term, the prior a new player imports, the collision severity, and a
**Keep / Define / Rename** call. "Define" terms feed the glossary one-liners; "Rename" terms get
fixed at the source so the glossary has less to apologize for.

Severity: **Low** = prior matches the mechanic · **Med** = prior is vague/partial · **High** = the
name implies *the wrong thing* (the most damaging — a confident wrong guess).

---

## The headline: 6 systemic problems (fix these before the per-term list)

1. **The sonic cluster — HIGH.** `Echo` (archetype) · `Resonate` (verb) · `Resonator` (gear) ·
   `Amplify` (signature) · `Conduit`/`Buzzline` (creature) all share one sound/vibration metaphor for
   *distinct* concepts. A player cannot tell them apart by name. This is the single worst readability
   drag in the game. Pick ONE concept to own the sound metaphor (the Echo archetype) and move the
   others off it.

2. **The "mod" cluster — HIGH.** `Module` (tuning dial, ×3) · `Signature Modifier` ("sig mod", ×2) ·
   the `MOD` label in the UI are three overlapping things all reading as "mods." Players will conflate
   them. Disambiguate the two systems with non-overlapping words.

3. **A name that implies the opposite of its mechanic — HIGH.** `Spark` is a *slow scaler* that
   builds Stoke over rounds and then detonates — but "spark" connotes a quick, small, instant burst.
   The name actively misleads. Strongest single rename candidate in the game.

4. **The progression-number pile — Med.** `Level` (creature XP) · `Rank` (signature 1–5) · enemy
   `Lv.3` (difficulty) · PvP rating · `standing`/`rep`. Five numeric ladders, several called similar
   things. Players won't know which number means what.

5. **Three currencies, unclear jobs — Med.** `Credits ⦿` · `Shards ◈` · `Marks ✦`. Confirm each has
   ONE thing only it buys, and surface that, or cut to two for the prototype. Right now Shards do the
   heavy lifting (recruit + rank-up); Credits = PvP refresh; Marks = rival/prestige — the distinction
   isn't legible.

6. **Inconsistent synonyms — Med (cheap fix).** `standing` vs `rep` vs `reputation` vs
   `combined standing` are the same thing in different words; `scout` vs `recon` likewise. Pick one
   word for each and use it everywhere.

---

## Archetypes (the 4 roles — most load-bearing terms in the game)

| Term | In-game meaning | Prior a player imports | Sev | Call |
|---|---|---|---|---|
| **Guardian** | Tank: high HP/armor, low attack, buys time | Protector / tank | Low | **Keep** |
| **Echo** | Support: copies/propagates the strongest ally action (at reduced power) | "Repeat / sound" — vague; doesn't read as a *force-multiplier support* | Med | **Define** — "doesn't attack on its own terms; it doubles what your best unit does." Also de-cluster (see #1). |
| **Swift** | Speed + **execute** (finishes low-HP targets; kills can refund the turn) | "Fast" — correct on speed, silent on the execute/assassin identity | Med | **Define** — lead with the execute identity, not just speed. |
| **Spark** | Slow scaler: stacks Stoke over rounds, then detonates big | "Quick small burst / electricity" — **opposite** of a slow scaler | **High** | **Rename** candidate. It's a build-then-blow-up bomb. Try: *Ember, Pyre, Forge, Reactor, Charge, Kindle.* (Note `Pyre Heart` / `Kindling` gear already lean into a fire-buildup theme — there's a coherent rename family there.) |

---

## Intervention verbs (the player's combat agency)

| Term | In-game meaning | Prior | Sev | Call |
|---|---|---|---|---|
| **Redirect** | Repoint the acting unit's attack onto a different enemy | "Send elsewhere" | Low | **Keep** |
| **Anchor** | Lock an *enemy* out of its next turn (a stun/skip) | "Hold steady / pin / stabilize" — sounds protective or ally-facing, not like disabling an enemy | High | **Rename** candidate. It's a stun. Try: *Stall, Halt, Freeze, Pin, Snare, Sieze.* |
| **Resonate** | Pull a free ally into a synchronized combo strike on the target | "Vibrate / emotional resonance / sound" — opaque about "an ally joins the hit" | High | **Rename** candidate + de-cluster (#1). It's a combo/assist. Try: *Sync, Rally, Combo, Assist, Join, Tandem.* |

> The three verbs are the player's only authored actions in combat — they're the highest-value terms
> to get right. Redirect is the model: a plain verb that says exactly what it does. Anchor and
> Resonate should aim for that same instant legibility.

---

## The new term (vC-P)

| Term | In-game meaning | Prior | Sev | Call |
|---|---|---|---|---|
| **FOCUS** | Your per-battle intervention budget, earned by your fielded squad | "Concentration / focus-fire / aim" — focus-fire (MOBA: everyone hit one target) is the main collision | Med | **Define** — "how many interventions you can spend; your squad grants it." Reads acceptably as a willpower/attention gauge. Watch it doesn't get read as focus-*fire*. |

---

## Currencies & meta-progression

| Term | Meaning | Prior | Sev | Call |
|---|---|---|---|---|
| **Credits ⦿** | Soft currency (PvP pool refresh) | Money | Low | **Keep** |
| **Shards ◈** | Upgrade currency (recruit + signature rank-up) | Gacha/craft premium currency | Low | **Keep** |
| **Marks ✦** | Rival/prestige currency | Ambiguous (currency? a target "mark"? a grade?) | Med | **Define** the job, or fold into the cluster fix (#5). |
| **Standing / Rep / Reputation** | Faction progress that gates contracts & rivals | Faction rep (WoW/EVE) | Low* | **Keep** the concept, **standardize the word** (#6). |
| **Codex** | Record of discovered species / reputation / access | Lore compendium (Mass Effect) | Low | **Keep** |
| **Contract / Client** | A job (modifier + win-condition + payout) and who issues it | Merc job / customer | Low | **Keep** |
| **Rival** | Recurring named opponent | Pokémon-style rival | Low | **Keep** |
| **Region / Frontier** | World-board territories; frontier unlocks via combined standing | Area / edge-unlocked-later | Low | **Keep** |
| **Stable** | Your full creature roster | Where you keep animals; "not crashing" | Med | **Define** lightly — "your roster." Thematically apt. |
| **Dispatch** | Count of units you've fielded (squad slots: `DISPATCH 3/3`) | "Send out" (an action) | Med | **Define / relabel** — it reads as a verb but labels a count. Consider "SQUAD 3/3." |
| **Walk** | (nav) wild-encounter / exploration mode | Ambiguous as a button | Med | **Define / relabel** — say what it does ("EXPLORE"? "WILDS"?). |
| **Dungeon / Arena** | Multi-encounter run / async PvP | Roguelike run / PvP | Low | **Keep** |
| **Scout / Recon** | Reveal contract intel by fighting a fragment | Gather intel | Low* | **Keep**, **pick one word** (#6). |

\* concept fine; the issue is synonym inconsistency, not the prior.

---

## Buildcraft layer (highest jargon density — the part players bounce off)

| Term | Meaning | Prior | Sev | Call |
|---|---|---|---|---|
| **Gear** | Equipment; grants/rewrites a behavior (a verb) | Equipment | Low | **Keep** |
| **Signature** | A creature's unique active/passive ability | "Signature move" (fighting games) | Med | **Define** — "this creature's one special ability." |
| **Signature Modifier** ("sig mod") | Slotted tuners that alter the signature (×2) | "Modifier = buff" + nested on "signature" | High | **Rename/simplify** (#2). Layered jargon: Signature + Modifier + Slot + Rank all stack. |
| **Module** | Tuning dial, ×3 ("a dial does nothing on its own") | "Component / plugin / mod" | High | **Rename/disambiguate** (#2) — collides head-on with Signature *Modifier* and the `MOD` label. |
| **Rank** (signature) | Signature tier 1→5 (Shards scale all slotted mods) | Tier/level — collides with creature Level & PvP rank | Med | **Define** vs Level (#4). |
| **Level** | Creature XP level | Level | Low* | **Keep**, disambiguate from Rank & enemy Lv. (#4). |
| **Artifact** | (Parked, §20) persistent build relic | Powerful relic (Diablo/POE) | Low | **Keep** (parked). |

---

## Combat statuses (in-battle reads)

| Term | Meaning | Prior | Sev | Call |
|---|---|---|---|---|
| **Stoke / Stoke stacks** | Spark's scaling counter toward detonation | "Stoke a fire" — niche word; many won't know it | Med | **Define**, or rename with the Spark family (#3). |
| **Detonation / Signal clock** | Spark explodes; enemy detonations advance a loss clock | Explode | Low | **Keep** |
| **Execute** | Finish a low-HP target (Swift) | MOBA/WoW execute | Med | **Define** for newcomers. |
| **Shield** | Guardian's absorb layer | Absorb | Low | **Keep** |
| **Hold / Escortee** | Protect-objective contract | Escort mission | Low | **Keep** |
| **Spotter** | The tactical comms character (and future glossary host) | Sniper's partner / lookout | Low | **Keep** — the prior *matches* "reads the field for you," which is why it's the right glossary host. |

---

## Recommended order of operations

1. **Rename the High-severity offenders** (they mislead, a glossary can't fully rescue them):
   `Spark`, `Anchor`, `Resonate`, and de-cluster the sonic group + the mod/module group. Do this at
   the data/string source — it's mechanical and the engine doesn't care about display names.
2. **Standardize synonyms** (#6) — cheapest win: one word each for standing/rep and scout/recon.
3. **Write the glossary one-liners** for every **Define** term — this *is* the §10 discipline, and it
   becomes the single source of truth the Spotter and the card reads both point at.
4. **Decide the currency question** (#5) — keep three with legible distinct jobs, or cut to two for
   the prototype.

**Prototype vs beta:** the renames + synonym standardization are prototype-relevant (they de-fog the
playtest signal). The full Spotter glossary system is beta. Doing this audit first means the glossary
is built on terms that mostly explain themselves.
