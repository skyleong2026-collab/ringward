# Ringward — Post-Rebalance Roster Power Audit / Tier List

**Harness:** `scripts/sim/creature-audit.mjs` · `node scripts/sim/creature-audit.mjs [runs]`
**Date:** 2026-06-09 · **Runs:** 300/creature · **Draft:** greedy (competent player ceiling) · **Mode:** AUTO (AI-vs-AI) · **Tier:** Tier-2 (greedy upgrades)
**Method:** swap-in delta — squad = `[cinderpaw (constant carry) | CREATURE_UNDER_TEST | dartwing (constant neutral DPS)]`. Every creature gets the same two teammates; win-rate + median boss rounds isolate that slot's contribution. Grouped by rarity for like-for-like comparison.
**QA targets (rebalanced this sprint):** buzzline, tanglewing *(ATK 14→24 / 16→26)*, stoneward, fizzpop *(stat-buffed)*, mossback *(passive blight chip + overheal→reflect)*.

---

## Results by rarity

### COMMON (×1.0 rarity mult) — expected win-range ≈ 40–82%

| Creature | Type | Win% | W3 clr% | W4 clr% | W3 rnd | W4 rnd | Flag |
|---|---|---:|---:|---:|---:|---:|---|
| **buzzline** ★ | Booster | **100.0** | 100.0 | 100.0 | 3.0 | 3.0 | ⚠ OVER |
| **fizzpop** ★ | Reactor | **95.7** | 100.0 | 95.7 | 3.0 | 3.0 | ⚠ OVER |
| **mossback** ★ | Mender | 86.3 | 93.3 | 92.5 | 3.0 | 5.0 | ⚠ OVER |
| **stoneward** ★ | Bulwark | 86.0 | 100.0 | 86.0 | 3.0 | 4.0 | ⚠ OVER |

★ = QA watch-list. **All four Commons are above the 82% threshold** — every Common is punching into Rare+ territory.

### RARE (×1.2 rarity mult) — expected win-range ≈ 55–93%

| Creature | Type | Win% | W3 clr% | W4 clr% | W3 rnd | W4 rnd | Flag |
|---|---|---:|---:|---:|---:|---:|---|
| **tanglewing** ★ | Booster | **100.0** | 100.0 | 100.0 | 3.0 | 3.0 | ⚠ OVER |
| swiftpaw | Striker | **95.0** | 98.0 | 96.9 | 3.0 | 3.0 | ⚠ OVER |
| dewleaf | Mender | 90.7 | 99.0 | 91.6 | 3.0 | 5.0 | OK |
| shadefang | Assassin | 90.3 | 97.7 | 92.5 | 3.0 | 3.0 | OK |
| glowtail | Reactor | 88.0 | 98.0 | 89.8 | 3.0 | 3.0 | OK |
| ironwall | Bulwark | 69.3 | 99.3 | 69.8 | 3.0 | 5.0 | OK |

### LEGENDARY (×1.45 rarity mult) — expected win-range ≈ 70–99%

| Creature | Type | Win% | W3 clr% | W4 clr% | W3 rnd | W4 rnd | Flag |
|---|---|---:|---:|---:|---:|---:|---|
| cinderpaw | Reactor | 99.7 | 100.0 | 99.7 | 3.0 | 3.0 | ⚠ OVER |
| dartwing | Striker | 99.3 | 100.0 | 99.3 | 3.0 | 3.0 | ⚠ OVER |
| frostwarden | Warden | 96.7 | 100.0 | 96.7 | 3.0 | 5.0 | OK |
| veilclaw | Assassin | 94.0 | 100.0 | 94.0 | 3.0 | 3.0 | OK |
| blightcap | Hexer | **63.3** | 77.7 | 81.5 | 3.0 | 6.0 | **⚠ UNDER** |

### UNIQUE (×1.7 rarity mult) — expected win-range ≈ 70–99%

| Creature | Type | Win% | W3 clr% | W4 clr% | W3 rnd | W4 rnd | Flag |
|---|---|---:|---:|---:|---:|---:|---|
| rimecaller | Warden | 97.7 | 100.0 | 97.7 | 3.0 | 5.0 | OK |
| hexmoth | Hexer | **72.0** | 92.0 | 78.3 | 3.0 | 5.0 | borderline |

---

## Outlier flags and verdicts

### ⚠ OVER — Commons punching into Rare+ territory (all four Commons flagged)

The entire Common tier is above the expected ceiling. This is partly a harness artefact — the constant `cinderpaw + dartwing` core is very strong, so any third body benefits from being in an already-winning squad. But within that, there are **two specific over-corrections worth acting on**:

**buzzline (Common Booster) — 100.0%, same as tanglewing (Rare Booster). Nerf candidate.**
The ATK buff (14→24) combined with the new squad-amp aura means buzzline now matches its Rare counterpart on a flat 0% gap. A Common matching a Rare is a compression problem — players have no reason to upgrade to tanglewing. Recommended: trim buzzline ATK back to ~20 (half the buff), or lower its amp-aura potency slightly. Tanglewing should win at least a few percent more.

**fizzpop (Common Reactor) — 95.7%. Warrants monitoring but not yet a nerf.**
The stat-buff rework (HP 220→340, ATK 30→44) pushed fizzpop to 95.7%. Stoneward and mossback sit at 86%, so fizzpop is the hot Common. It's just below the Rare floor (~88% for glowtail), which means it's not literally punching into Rare win-rates — but it's close. Check whether in mixed squads fizzpop is crowding out glowtail (the Rare Reactor). Leave it for one more playtest cycle; if fizzpop still overshadows glowtail, trim HP to ~300.

**stoneward (Common Bulwark) — 86.0%.**
The rebalance correctly targeted stoneward's previous deadweight status. At 86% it's in healthy territory *for a buffed Common* — above the Rare floor of ~55% expected and above ironwall (69%). The gap between stoneward (Common) and ironwall (Rare) being this large (86 vs 69) is the problem: **ironwall should beat stoneward** given the rarity gap. See ironwall discussion below.

**mossback (Common Mender) — 86.3%. Matches stoneward, leaves dewleaf (Rare Mender) barely ahead.**
dewleaf (90.7%) only leads mossback by 4.4 points. The Mender rebalance (passive blight chip + overheal→reflect) was needed, but it may have overshot for the Common tier. Consider whether mossback's new chip is the right potency, or whether dewleaf needs a modest skill buff to maintain a clearer Rare advantage.

---

### ⚠ UNDER — blightcap (Legendary Hexer) — 63.3%

**blightcap is the most glaring outlier: a Legendary sitting 31 points below the Legendary floor (94–99%) and 6 points below hexmoth (Unique, 72%).**

A Legendary losing to a Unique is a hard fail. The Hexer kit (jinx/doom/blight) doesn't add tempo — it applies vulnerability stacks that amplify *other* sources of damage. Under the AUTO AI the squad doesn't coordinate around a curse: enemies are attacked in whatever order the AI picks, not necessarily the cursed one, so the vuln stacks expire without paying off. This is the same AI-dependency failure identified in the role-contribution harness for marks. blightcap's win-con depends on the player (or AI) hammering a cursed target.

**Recommendation: buff blightcap.** Either (a) make doom/blight auto-trigger damage independently (always-on chip, not a multiplier that needs player focus), or (b) give blightcap a passive ATK scaling based on curse stacks active on *any* enemy, so it converts its own output even when the AI mis-targets. At 63.3% it needs roughly +8–10 win-rate points to reach 70%.

---

### borderline — hexmoth (Unique Hexer) — 72.0%

Same root cause as blightcap (AI-dependent Hexer mechanic), but hexmoth (Unique, ×1.7 rarity mult) reaches 72% on raw stats. It clears W3 92% of the time but bottlenecks at the boss (W4 clr 78.3%). The higher rarity mult saves it — it's above the 70% floor but barely. Buff direction: same as blightcap, favour passive-chip shapes over pure multiplier curses.

---

### ⚠ ironwall (Rare Bulwark) — 69.3% — losing to stoneward (Common, 86%)

ironwall is not flagged as UNDER by the absolute threshold, but it's **the worst Rare by 19 points** (next-lowest Rare is glowtail at 88%) and loses badly to stoneward (the Common of the same type). The kit (brace/aegis/bodyguard) is identical in shape to stoneward's, but ironwall's raw stats (300 HP / 20 ATK, Rare ×1.2) produce far less throughput than stoneward's rebalanced 560 HP / 38 ATK. The rebalance gave stoneward everything and left ironwall behind.

**Recommendation: buff ironwall.** It should comfortably beat stoneward. Bring ironwall ATK to ~32–34 (just below its Rare Striker peers at 30–32) and HP to ~380. The Bulwark identity allows real ATK since it earns chip from Brace, not from basic attacks alone.

---

### swiftpaw (Rare Striker) — 95.0%, above the 93% Rare ceiling

Mildly over for a Rare, and it's beating all Rares except tanglewing. At 95% it's intruding on Legendary territory (veilclaw 94%). Not a hard nerf candidate — the greedy draft is particularly friendly to high-speed Strikers (twinstrike/blitzstorm chain) — but worth watching. If swiftpaw continues to beat veilclaw (Legendary Assassin) at the same ATK level, trim swiftpaw speed from 9 to 8.

---

## Summary table — top and bottom per rarity

| Rarity | Top creature | Win% | Bottom creature | Win% | Notes |
|---|---|---:|---|---:|---|
| Common | buzzline | **100.0** | stoneward | 86.0 | Entire tier ⚠ OVER; buzzline = nerf candidate |
| Rare | tanglewing | **100.0** | ironwall | 69.3 | tanglewing ⚠ OVER; ironwall under-tuned vs its own type |
| Legendary | cinderpaw | 99.7 | blightcap | **63.3** | blightcap ⚠ UNDER — worst Legendary, beaten by Uniques |
| Unique | rimecaller | 97.7 | hexmoth | 72.0 | Hexers bottleneck at boss; AI-dependency root cause |

## Buff / nerf / leave recommendations per flagged creature

| Creature | Action | Rationale |
|---|---|---|
| **buzzline** | **Nerf** (minor) | ATK 24→20; closes the 0% gap with tanglewing. |
| **fizzpop** | **Monitor** (1 cycle) | 95.7% is high but below Rare floor; trim HP to ~300 if it crowds out glowtail in real drafts. |
| **mossback** | **Monitor / dewleaf buff** | mossback 86% vs dewleaf 91% — gap is thin; prefer buffing dewleaf (minor skill tweak) over nerfing mossback. |
| **stoneward** | **Leave** | 86% is fine for a buffed Common Bulwark; the problem is ironwall lagging, not stoneward leading. |
| **tanglewing** | **Leave/watch** | 100% for a Rare looks alarming, but buzzline matches it — fixing buzzline restores the gap. |
| **ironwall** | **Buff** | ATK 20→32, HP 300→380. Must beat stoneward (Common) by at least ~5 win-rate points. |
| **blightcap** | **Buff** | Make doom/blight emit passive chip damage (AI-agnostic) rather than pure multiplier. Target 72–75% to match hexmoth bracket. |
| **hexmoth** | **Leave for now** | At 72% it's at the floor; same root cause as blightcap; fixing blightcap's AI-dependency likely informs hexmoth's kit direction too. |
| **swiftpaw** | **Monitor** | 95% slightly above Rare ceiling; watch for speed:9 making it too greedy-draft-friendly vs Legendaries. |
