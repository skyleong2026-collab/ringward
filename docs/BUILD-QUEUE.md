# Ringward build queue (unattended-run compatible)
One item per token window. The overnight runner picks the FIRST unchecked item, launches the
model in its MODEL tag, and the worker does ONLY that item: implement per spec → verify (eslint
changed files, `npm run build`, `npm test`, Playwright for UI) → commit (only your files; never
App.jsx / art-instance files — see CLAUDE.md) → check the item off here with a one-line result →
STOP. Specs live in `docs/RINGWARD-COLLECTION-DESIGN.md` unless noted.

- [x] **S1 · MODEL=sonnet · Role lines on cards** — DONE. role field in TYPE_INFO (8 types),
  shown on squad-pick/stable cards (ti.role line 3837) and unit-target pick card (ti.role added).
  BUILD_LINE shown on summon results. Lint/build/tests green.
- [x] **S2 · MODEL=opus · Innates** — DONE (vF-CG, Opus, committed, deploy HELD for Sky's R3 look).
  All 17 implemented as `INNATES` apply(m) wired into `treeModsFor`; shown on pick cards + tree
  header. Goldens byte-identical; live Playwright clean. Sim can't see innates (like trees) → live-
  feel-validated, player-side-only so no unfair-wall risk. Pull-reveal surfacing is S3.
- [x] **S3 · MODEL=sonnet · Pull-beat reorder** — DONE. Staged win reveal (step=pull): type+rarity
  → innate card (teal box) → computed opens line (same-type squad check) → stats last; dupe beat
  shows core progress meter. Summon tab: innate box on solo fresh pull, compact innate tag on
  multi-pull fresh; dupe line "+N ⬡ toward [creature]'s build". Lint/build/tests green.
- [x] **S4 · MODEL=opus · Ring-biased summons + Type-mastery feat** — DONE. NEAR CALL banner biases
  pulls 5× toward the camped ring's locals; summon screen states the real % ("Frostward answers ~10%
  here vs ~2% wild") — folk-honest, rarity rates unchanged. summonPull takes biasIds/biasMult;
  localPullChance mirrors it (Monte-Carlo matched analytic within 0.5pp); pity prefers a camped
  Legendary on the guarantee. Type-mastery feat: typesMastered set (Types fielded in a ring clear,
  recorded on boss clear), 3 tiers (Many Hands 3 / Versatile 5 / Every Hand 8). PITY_AT intact.
  Lint/build/tests green (feats 23 passed, +5 new); Playwright confirmed odds panel + feat progress.
- [x] **S5 · MODEL=sonnet · Forge Tempering + Holdfast boon choice** — DONE. Tempering in Forge tab
  (+1% HP/tier, cost 40⬡×1.5^tier, T10 cap, resets on crossing, "forge rests" done-state). Holdfast:
  8 alt boons authored, pick-1-of-2 reveal on reclaim, SWAP 30⬡ in Holdfast tab. All perkBaseMods
  call sites pass temperingTier+holdfastPicks. Lint/build/tests green.
- [x] **S6 · MODEL=sonnet · Debt: law-chip component + localStorage helper** — DONE. RingLawChip
  component (3 variants: detail/line/pill) replaces the 3 inline law-chip JSX blocks. loadJson/
  saveJson helpers collapse 10 identical JSON load/save pairs to 1-line wrappers. Zero behavior
  change; goldens byte-identical; Playwright smoke confirms law chip renders.
- [x] **S7 · MODEL=opus · Sim mirror extraction** — DONE. UPGRADES → `src/data/upgrades.js`,
  RELICS+RELIC_CUTS+cutsFor/cutEffect → `src/data/relics.js` (plain JS, no React). SeamLab + the
  sim both import them (same pattern as engine/waves.js); the sim's RECUT_FIXTURES now derive cut
  applies via `cutEffect` (the old ⚠ MIRROR copy is gone). Unit-scope applies use the defensive
  `(x||0)+n` form so they work with the sim's bare `{}` mods — math identical to the game's `+=`.
  Verified: `--depths` byte-identical, `--parity` all 29 win-rates identical (only cosmetic labels
  changed), goldens green, lint/build clean, Playwright confirms relics/forge render.

## Round 2 queue (2026-06-10 evening — specs in docs/RINGWARD-COPY-AUDIT.md and
## docs/RINGWARD-COLLECTION-ENGINE.md; renames + copy flow approved by Sky)

- [x] **U1 · MODEL=sonnet · Copy honesty + jargon pass** — DONE (commit d956b85). Vent→Spend everywhere; execute ×2.5@45%; Amp defined on Prime; "carry"→"your hardest hitter" (tree nodes + upgrades); The Watch matches apply; wards.js Bulwark fix; frostnip plain; chilled→frozen; part-takes fixed; Apex Quarry mechanic desc + dynamic SIGIL FOUND; rates 100; banner blurbs; ally-aim AND prompt; Chronicle pointer; crossroads; Wrapped Wool ❤️. Canon-table NOT applied (awaits Sky). Goldens green. — apply the U1 rewrite table in
  RINGWARD-COPY-AUDIT.md (~15 entries: kill "chip", ONE cost vocabulary, Execute states
  ×2.5@45%, Amp defined, "The Watch" matches its apply, ward-gate Warden→Bulwark factual fix,
  summon rates sum to 100, typos, Apex Quarry explained, minors batch). Canon-table lines are
  NOT in scope (await Sky). Goldens key on skill.id — verify byte-identical anyway.
- [x] **U2 · MODEL=sonnet · Approved renames** — DONE (commit 5b9e077). Stonehide relic set
  (id 'warden' stays); ★ Oath in all tier-5 UI copy incl. swear block + mirror chip (KEYSTONE_IDS
  intact); 🏚 Home tab (lore "the Holdfast" stays); First Pounce innate (swiftpaw); Stalk skill
  (id 'mark' stays; goldens byte-identical); Gauntlet-Holder feat. Third standing rule in COPY-AUDIT.md.
- [x] **U3 · MODEL=sonnet · Battle skill descriptions + legend** — DONE. Visible blurb text
  always shown below FX chips on every move button (was title=-only). Disabled payoff/wildcard
  shows "needs ⚡⚡" chip. First-run "⚡▲ banks charge · ⚡▼ spends it" caption via
  useState+localStorage (shown once, dismissed on first move pick). Recut/salvage already had
  visible text at lines 4346-4347. Goldens green, lint/build clean.
- [ ] **U4 · MODEL=sonnet · First-session routing** — U4 spec: fresh save lands on LEARN;
  Gauntlet gated until first clear; one-time draft coach line; loss screen Forge routing line.
- [ ] **R1 · MODEL=sonnet · Team recipes: data + squad-pick chips** — src/data/recipes.js
  (shared game+sim) with the v1 recipe book (RINGWARD-COLLECTION-ENGINE.md), detection,
  lit/near-miss chips at squad pick. Display only — NO seasoning effects in this slice.
- [ ] **U5 · MODEL=opus · Character sheet + ⓘ InfoDot** — HANDHELD-DIRECTION.md spec: full
  sheet from any creature card (art slot reserved for portraits), skills + ⓘ long copy
  (reuse Spotter glossary), lore bio from roster-character-sheets.md, recipes listing.
- [ ] **R2 · MODEL=opus · Pull-beat team reveal** — owned-roster recipe computation in the
  staged reveal: "NEW TEAM POSSIBLE" beat + nearest-miss chase pointer.
- [ ] **R3 · MODEL=opus · Recipe seasoning + sim sweep** — run-layer mods via perkBaseMods;
  PRUNS=200 GEAR=1 depth sweep before/after; ladder stays a ladder (20–90 geared band).
- [ ] **U6 · MODEL=opus · Landscape battle prototype** — 3-pane FightView at landscape widths
  (extends narrow branches ~SeamLab:2326), viewport meta. Menus master-detail NOT in scope.
- [ ] **R4 · MODEL=sonnet · Law recipe-pointers + recipe feats** — threshold copy naming the
  answering recipe; "cook the book" feat group.

NOT in this queue (needs Sky or attended judgment): canon copy table (RINGWARD-COPY-AUDIT.md,
awaiting his checkmarks), per-creature attack-VFX signature table (Fable+Sky pass), portrait
art (art instance + PixelLab budget), R5 creature-18+/Apex recipe authoring (Fable), PixelLab
8-stone batch, carrier/R3 re-tuning (gated on Sky's playtest), audio.
