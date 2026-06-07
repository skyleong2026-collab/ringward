# Art branch — merge guide

When the art instance finishes generating sprites/relic icons on
`claude/art-creatures-20260606`, follow this to land it on `main` cleanly.

## Background (what happened)

The art instance worked in the **same `~/8gents` checkout** as main-Claude (two agents, one
working tree). On `claude/art-creatures-20260606` it:
- rewired every `roster.js` `spriteId` to the creature's own id (`fizzpop`→`'fizzpop'`, …),
- changed the `Sprite` component image path `/sprites/${id}.png` → **`.jpg`**,
- added a `FOCAL_X` map (all creatures at `0.5`).

A `git add -A` by main-Claude swept those uncommitted changes into commit `b208be3`, which
**also** carries main-Claude's `RelicIcon` relic-image support (vF-AN). So that branch =
art WIP **+** relic-img support, tangled. Meanwhile `main` moved forward independently
(vF-AO…AR: more events + upgrades) via an isolated worktree.

## Before merging — the branch must be COMPLETE

The branch's `.jpg` rename is **global**: every creature now points at `/sprites/<id>.jpg`.
So the merge is only safe once **all 17 creature `.jpg` files exist** in `public/sprites/`
(fizzpop, glowtail, cinderpaw, stoneward, ironwall, mossback, dewleaf, buzzline, tanglewing,
swiftpaw, dartwing, shadefang, veilclaw, blightcap, hexmoth, frostwarden, rimecaller) — plus
any referenced in sandbox code (`cinderpaw`, `glowtail` dummies). If a sprite is missing,
that creature renders the fallback glyph (not an error, but ugly).

Optional but recommended: relic icons in `public/art/relics/<relicId>.jpg` + an `img:` field
on each `RELICS` entry (the `RelicIcon` render support is already in `b208be3`).

## Merge steps

```bash
cd ~/8gents
git fetch origin
git checkout main && git pull            # main = vF-AR or later
git merge --no-ff claude/art-creatures-20260606
```

**Expected conflict: just the `VERSION` line** in `src/App.jsx` (art branch `vF-AN` vs main
`vF-AR`). Resolve to the next letter (e.g. `vF-AS`). Everything else should 3-way merge clean
(the branches touched different regions of `SeamLab.jsx`: art = Sprite/FOCAL_X/roster/relic-icon,
main = wayside events/upgrades/playerDef verb-routing). If `SeamLab.jsx` conflicts, the overlap
is most likely the `playerDef` mods object or the relic-render spots — keep BOTH sides' additions.

## Verify before pushing (REQUIRED)

```bash
npm test            # goldens MUST stay 2008119257 (art changes are visual-only)
npm run build       # must pass
npx eslint src/screens/SeamLab.jsx   # only the 3 known-baseline unused-var errors
```
Then in the browser (preview on :5180): open the squad picker and confirm **every creature
shows its painted sprite** (not a glyph), check the **Vault** + **relic panel** show painted
icons if relic art landed, and tune `FOCAL_X[<id>]` (0..1) for any creature that sits
off-center in its tile (default 0.5 may need nudging).

## Optimize art file sizes (REQUIRED — don't bloat the repo/first-load)

The cutscene frames were downscaled to ~760px JPEG q82 (~100KB). Do the same for sprites/relics:
```bash
cd public/sprites && for f in *.jpg; do sips -Z 512 -s formatOptions 82 "$f" >/dev/null; done
```
Target < ~150KB each. 17 sprites + 20 relics at full res would be many MB.

## Cleanup

```bash
git push origin main          # → Vercel
git branch -d claude/art-creatures-20260606
git push origin --delete claude/art-creatures-20260606   # if it was pushed
git worktree remove ~/8gents-cont   # the isolated main-work worktree, once done
```
Old shared sprites (`spark.png`, `flicker.png`, `vault.png`, …) can be deleted once nothing
references those ids.
