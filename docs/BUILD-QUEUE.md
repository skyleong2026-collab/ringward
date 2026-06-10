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
- [ ] **S4 · MODEL=opus · Ring-biased summons + Type-mastery feat** — summoning biases pulls
  toward the camped ring's `biasIds` (state the bias % on the summon screen — folk honesty, no
  hidden odds); feat: clear any ring with each Type as carry (8 checks, existing feats system).
  Keep PITY_AT intact; sim/spot-check the odds math.
- [x] **S5 · MODEL=sonnet · Forge Tempering + Holdfast boon choice** — DONE. Tempering in Forge tab
  (+1% HP/tier, cost 40⬡×1.5^tier, T10 cap, resets on crossing, "forge rests" done-state). Holdfast:
  8 alt boons authored, pick-1-of-2 reveal on reclaim, SWAP 30⬡ in Holdfast tab. All perkBaseMods
  call sites pass temperingTier+holdfastPicks. Lint/build/tests green.
- [ ] **S6 · MODEL=sonnet · Debt: law-chip component + localStorage helper** — the law-chip JSX
  appears ×3 in SeamLab → one component; add a `usePersistent(key, default)` (or plain helper)
  and collapse the load/save boilerplate pairs. Pure refactor: zero behavior change, goldens +
  Playwright smoke prove it.
- [ ] **S7 · MODEL=opus · Sim mirror extraction** — RELIC_CUTS/UPGRADES are hand-mirrored in the
  sim (the drift-bug class waves.js extraction killed). Extract to a shared module the same way.
  Verify: sim outputs identical before/after on a fixed seed set.

NOT in this queue (needs Sky or attended judgment): PixelLab 8-stone batch (spends generations;
art-direction calls), carrier/R3 re-tuning (gated on Sky's playtest), audio, anything Fable-tier.
