# ⛰ Ringward — The Ring 1→8 Depth Ladder (kit-threat normalization)

> **Status: TUNED + SHIPPED (vF-CA batch, 2026-06-09).** First-ever validation of the full climb.
> Tooling: `scripts/sim/run-sim-tier2.mjs --depths` (10 comps × 8 rings), `--kits` (kit isolation),
> `--offdef` (offense-vs-defense relic by depth). `PRUNS` = runs/cell, `GEAR=1` = meta-kit proxy.

## The finding (biggest balance discovery of the project)
**Enemy KIT identity dominated the depth curve ~10×.** Every ring uses the same wave stat template,
scaled by the concave depth dials — but a Striker converts those stats into ~3× the real threat of a
Mender (multi-hit, acts first) while defensive kits convert them into ~nothing. Measured before the fix
(geared, greedy): R1 98 → **R2 100 → R3 100** (free for every comp — *easier than Ring 1*) → R4 98 →
**R5 0 → R6 0** (walls for every comp) → R7 34 → R8 1. The climb was: sweaty → free ×3 → wall ×4.

Kit isolation at constant depth 4 (geared): Striker 0%, Assassin 2%, Reactor 9%, Warden 10% (murder
kits) vs Bulwark 100%, Mender 100%, Booster 100%, Hexer 97% (harmless kits).

## The fix — per-Type kit-threat coefficients (enemy ATK, ring locals only)
```js
const KIT_THREAT = { Reactor: 1.0, Bulwark: 2.8, Mender: 2.4, Booster: 1.35,
                     Striker: 0.33, Assassin: 0.34, Hexer: 1.0, Warden: 0.5 };
```
- **Reactor = 1.0 anchors Ring 1 byte-identical** (the validated, Sky-approved ring — raw R1 column
  confirmed identical pre/post).
- **The boss-wave Tender is a fixed set-piece** (no coefficient) — every boss keeps its healer puzzle.
- Lives in `SeamLab.jsx` (`wavesForGround`) and is **mirrored verbatim** in `run-sim-tier2.mjs`.
- Depth now drives difficulty; the kit drives the ring's *texture* (rush / attrition / curse / freeze).

## The ladder after (3 calibration iterations)
**Geared** (creatures + drafts + a perks/relics proxy): `98 → 88 → 89 → 77 → 50 → 43 → 34 → 9`
**Raw** (no meta kit): `64 → 33 → 41 → 28 → 9 → 6 → 2 → 0` — fresh squads can push R2–R4 with the
right comp; deep rings are progression-gated; no free rings, no absolute walls.

## Rings now ask different build questions (the run-#20 engine)
- **R5 The Fast Trails (Striker rush):** Tank Heavy **88%**, Control 76% vs Best Guess **10%** — the
  first place defense beats greed.
- **R6 The Lightless (Assassins):** Control 74, Glass 63, Assassin Pair 62 vs Tank 45.
- **R7 The Witherfen (Hexers):** Control 56, Assassin Pair 53 vs Mono Reactor 12.
- **R8 The Frostbound (Wardens):** **Control 67% vs ~5% for almost everyone else** — the final ring
  *demands* freeze-tech. Intentional: the last wall asks the question the whole game taught. (Glass 12 /
  Assassin 10 are the non-Control outs.)

## Offense vs defense by depth (Whetstone Fang +35% dmg vs Bulwark Stone +30% HP/+30% sh)
Tank Heavy squad: defense wins R2 **96v53**, R3 100v90, R4 **98v67**, R5 **74v43**, R6 **43v7**.
Pre-change, defense lost at every depth. **This un-blocks defensive build-expression** — the §31
finding "defensive cuts can't be parity" was a Ring-1-only artifact; defensive relics/cuts are now
real choices at depth. (Revisit Ward-Shard / Lifewall-style cuts when authoring deep-ring content.)

## Caveats / next
- Sim models creatures + rarity + 4 drafts + a gear proxy — **not skill trees**; absolute deep-ring
  numbers will read easier live for invested players. The *shape* and *comp ordering* are the signal.
- **Needs Sky's live feel-check**: especially R2 ("the Gatebreaker's bulwarks now actually hit") and
  R5 ("the rush is survivable with a tank wall").
- NG+ crossings multiply on top (cm) — untested at depth; sweep later with `cm = crossMult(n)`.
