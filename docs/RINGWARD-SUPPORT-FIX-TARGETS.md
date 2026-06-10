# Ringward — Support-Kit Fix Targets (Outer Ring)

**Harness:** `scripts/sim/support-fix-magnitude.mjs` · run with `node scripts/sim/support-fix-magnitude.mjs [runs]`
**Date:** 2026-06-09 · **Runs:** 300/cell · **Mode:** AUTO (AI-vs-AI) · **Tier:** Tier-1 (no roguelike upgrades)
**Framing:** TRIO — `cinderpaw` (carry) + `dartwing` (DPS) + 1 support · **Ground:** The Crackling Outer Ring
**Builds on:** `docs/RINGWARD-ROLE-CONTRIBUTION.md` (which found every support adds ~0 kill-speed on AUTO)

## Question

How much **effective team kill-speed** must each support role add to become **viable** (40–60% win-rate) on the Outer Ring? That target magnitude sizes the upcoming support-kit rebalance. And: which candidate fix *shapes* work under the current dumb AUTO AI (AI-agnostic) vs which silently fail (AI-dependent)?

## Method

Model the hypothetical kit fix as a tunable, **team-wide effective-DPS contribution**: while the support is alive, the squad's damage output is multiplied by **(1 + S)**. Implemented by hooking each damage-dealer's `mods.dmgMult` as a live getter that reads the support unit's `.alive` flag — so the buff drops the instant the support dies mid-fight, and the engine's existing combat math (`combatMath.js: modMult(actor,'dmgMult')`) applies it on every hit. **No engine edits.**

Sweep `S ∈ {0, 0.15, 0.25, 0.40, 0.60, 0.80}` per role; find the S where win-rate enters 40–60%. Two variants:
- **Always-on** — `(1+S)` active every round while the support lives. *AI-agnostic* (a passive aura / reflect / chip — no sequencing).
- **Front-loaded** — `(1+S)` active only in round 1 of each fight. Proxies an *AI-dependent* one-time burst (a buff cast at fight start).

> **Sanity (all pass):** S=0 reproduces ~0% for all three roles (matches the role-contribution finding); win-rate rises monotonically with S; front-loaded provably fires (it lifts deeper-wave clear-rates) but yields 0% wins.

---

## Results — win-rate vs S

### Always-on (AI-agnostic passive)

| Support (role) | S=0 | 0.15 | 0.25 | 0.40 | 0.60 | 0.80 |
|---|---:|---:|---:|---:|---:|---:|
| stoneward (Bulwark/tank) | 0.0 | 0.0 | 0.0 | 0.0 | **70.3** | 100.0 |
| mossback (Mender/healer) | 0.0 | 0.0 | 0.0 | 5.7 | **100.0** | 100.0 |
| buzzline (Booster) | 0.0 | 0.0 | 0.0 | 0.0 | 16.7 | **72.7** |

### Front-loaded (round-1-only burst — AI-dependent proxy)

| Support (role) | S=0 | 0.15 | 0.25 | 0.40 | 0.60 | 0.80 |
|---|---:|---:|---:|---:|---:|---:|
| stoneward | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | **0.0** |
| mossback | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | **0.0** |
| buzzline | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | **0.0** |

A one-time opener burst nets **0% wins even at +80%**, despite measurably lifting clear-rates on Waves 2–3 (e.g. buzzline W2 clear 21%→90% at S=0.80). The Outer Ring boss is a *sustained-DPS* check, not an opener check — a burst that lands once is wasted on the long fight.

---

## Target S per role (always-on, for 40–60% viability)

| Role | Unit | Target S (≈40% crossing) | First swept S in band | Plain reading |
|---|---|---:|---|---|
| **Bulwark / tank** | stoneward | **≈ +51%** | S=0.60 → 70% win | The tank must effectively add **~50% team DPS** to be viable. |
| **Mender / healer** | mossback | **≈ +47%** | S=0.60 → 100% win | The healer must effectively add **~45–50% team DPS**. |
| **Booster** | buzzline | **≈ +68%** | S=0.80 → 73% win | The booster must effectively add **~65–70% team DPS** — the steepest bill. |

These are large numbers: viability requires the support slot to contribute roughly **half a damage dealer's worth of throughput or more**. Tank and healer land close (~0.5); the booster needs more (~0.7) because its own body deals the least damage (buzzline 14 ATK — it can't even clear Wave 1 unaided), so the (1+S) contribution has to cover both its dead weight *and* the deficit.

> Caveat: S is *effective* team DPS while the support lives. A real kit only realizes its full S if it stays alive — a squishy support that dies early delivers less than its nominal S. Tank durability is therefore a multiplier on whatever offensive hook it carries.

---

## AI-agnostic vs AI-dependent — classification of candidate fix shapes

From the role-contribution report's proposed mechanics. **Decisive evidence:** always-on +60% wins 70–100%; an identical magnitude delivered as a round-1 burst wins **0%**. Under the current AUTO AI, *when* the contribution lands matters as much as *how much*.

| Proposed mechanic (role) | Shape | Class | Why |
|---|---|---|---|
| Brace passively reflects/chips a slice of blocked damage (Bulwark) | always-on passive | **AI-agnostic ✓** | No targeting/sequencing; fires whenever the tank is hit. Maps directly to the always-on S model. |
| Damage-taken **mark**: marked enemy takes +X% from the squad (Bulwark) | requires focus-fire on the marked target | **AI-dependent ✗** | The dumb AUTO AI doesn't preferentially attack a marked enemy, so the +X% lands on scattered targets — undersold. |
| Overheal → reflect-shield (Mender) | always-on passive | **AI-agnostic ✓** | Converts sustain to damage with no timing; reflects on incoming hits automatically. |
| Bloom = heal-over-time that **also** ticks damage on the lowest-HP enemy (Mender) | passive auto-target tick | **AI-agnostic ✓** | Auto-targets by rule (lowest HP), no player/AI sequencing; effectively always-on chip. |
| Mend grants the healed unit a temporary **ATK buff** (Mender) | buff that should precede the carry's hit | **AI-dependent ✗** (mild) | Value depends on the AI buffing the carry *before* its big swing — exactly the sequencing AUTO won't do. |
| Prime = large front-loaded multiplier on the carry's **next hit** (Booster) | one-time pre-nuke buff | **AI-dependent ✗ (strongest)** | This IS the front-loaded variant — 0% wins at every S. The AUTO AI won't cast it before the nuke, and even if it did, a one-shot burst loses to the boss's sustained-HP wall. |
| Booster gets real self-ATK so the slot isn't a dead body | always-on stat | **AI-agnostic ✓** | Pure passive damage; contributes every round regardless of AI. |

**Recommendation: favor AI-agnostic, always-on shapes.** The AUTO / watch experience the game ships on cannot rely on smart buff-sequencing or focus-fire, and the front-loaded sweep proves a perfectly-timed-once burst is worth ~0 wins here regardless of magnitude. Any tempo hook should pay out *passively every round while the support lives*.

---

## Recommended fix shape per role (one paragraph each)

- **Bulwark / tank — target ~+50% effective team DPS, delivered as an always-on reflect/chip.** Make Brace passively convert a meaningful slice of *blocked* damage into squad-wide or single-target return damage every time the tank is hit — no mark, no targeting. Pair it with the tank's existing durability so the contribution actually persists through the boss fight (durability multiplies realized S). Avoid the damage-taken **mark**: it needs focus-fire the AUTO AI won't provide.

- **Mender / healer — target ~+45–50%, delivered as a passive damaging tick.** Bloom-as-HoT that *also* ticks damage on the lowest-HP enemy is the cleanest: it's a rule-targeted passive (AI-agnostic) and converts the healer's sustain identity into steady chip without any sequencing. Use overheal→reflect-shield as a secondary always-on source. Skip the "mend grants ATK buff" hook — its value hinges on buffing the carry before its swing, which AUTO won't time.

- **Booster — target ~+65–70% (the steepest), and it must be passive.** The current Prime/overdrive/resonate kit is the worst case: it's a front-loaded buff the AUTO AI neither sequences nor benefits from (0% wins at every S). Replace the core with an **always-on team aura** (e.g. a standing +X% squad damage while the booster lives) and give the booster real self-ATK so its body isn't dead weight. Because the booster's own damage is lowest, it needs the largest effective S — an aura is the only shape that reaches ~0.7 without relying on timing the AUTO AI can't do.
