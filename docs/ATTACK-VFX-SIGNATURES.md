# Attack-VFX signature pass — what each creature's attack looks like

**Purpose.** This is the art brief that the PixelLab batch generates *against* — defined
**before** the batch so the run produces the right embers / shards / spores instead of
guessing. It is the human-readable mirror of `src/data/attackVfx.js` (the machine source
the engine view reads). **The two move together** — change one, change the other.

**Scope.** All 8 combat Types and the 17 art-bound species in `src/engine/combat/roster.js`.
Cinderpaw is the PixelLab pilot; the **other 16** are the queue this pass unblocks.

**Pipeline reminder.** Lock one Midjourney image per creature → PixelLab makes per-state
pixel frames (idle / attack / hurt / …) → the in-engine state machine plays them. The
*attack-state* frames and the *VFX overlays* (projectile + impact) defined here are what
sell the hit. Until the VFX PNGs exist, the arena falls back to the current CSS effects
(`fallback` in the data file) — so this spec ships today and the art is a pure drop-in.

---

## How a hit reads (the shared grammar)

Every attack is built from four beats. Defining them per-Type is what keeps "you read the
Type by its look" true across 17 creatures.

1. **Charge tell** — what builds *under* the unit as it banks toward its payoff (the spine
   of every kit is Builder → Payoff → Wildcard, §23). The tell brightens/tightens the
   closer to the payoff.
2. **Delivery** — *how the hit crosses the arena*:
   - **bolt** — a projectile **tweens from actor → target**, then bursts (ranged casters: Reactor, Warden).
   - **lob** — an **arcing** projectile (Hexer spores/curses).
   - **slash** — a **melee swipe lands on the target**, no travel; multi-hit moves repeat it (Striker, Assassin).
   - **aura** — **no projectile**; the effect blooms on an **ally** (Bulwark shields, Mender heals, Booster amps).
3. **Impact** — the burst the moment it lands (+ shockwave / freeze-slab / curse-haze per Type).
4. **Residue** — the lingering status overlay it leaves (Burn embers, shield dome, freeze
   slab, vuln haze, regen motes, amp aura) — these already exist in the arena and persist.

**PNG deliverables per Type** (what PixelLab must produce): one **projectile** sheet and
one **impact** sheet for the ranged/lobbed Types; for the melee/aura Types the "projectile"
is null and only the **impact**/aura sheet is needed. Per-creature **trail tints** are
optional polish, not blockers — the Type sheet carries the read.

---

## The eight Type signatures

### 🔥 Reactor — "powers up, then blows up"  *(bolt)*  ← drives the pilot
- **Palette:** core `#ffffff` · mid `#ff8a3a` · edge `#ff5a2a` · trail `#ffd24a`
- **Charge tell:** core-heart brightens and pulses faster toward Overload; embers rise.
- **Projectile** `reactor-ember.png`: a molten **fireball/ember** with a comet tail of warm flecks. Tweens actor→target.
- **Impact** `reactor-burst.png`: orange **detonation bloom** + scattering embers. *Backdraft* (AOE) = a wide flame wash across the enemy line.
- **Moves:** Charge Up = small ember + heat chip · Overload = the big bolt, ×2 vs a Burning target · Backdraft = the wide wash.

### 🛡 Bulwark — "soaks hits, guards the team"  *(aura — no travel)*
- **Palette:** core `#eaf8ff` · mid `#7fd6ff` · edge `#4a90d9` · trail `#bfeaff`
- **Charge tell:** plates / stone visibly **set and harden** as block banks; dust settles.
- **Impact** `bulwark-aegis.png`: a blue **shield-dome** snaps over the recipient(s) with a hex-grid shimmer.
- **Moves:** Brace = self dome + chip · Aegis = a team-wide dome sweep · Bodyguard = a heavy slab thrown onto one ally.

### 🌿 Mender — "keeps the squad alive"  *(aura — lands on an ally)*
- **Palette:** core `#f0ffe0` · mid `#7ed321` · edge `#3ec9a0` · trail `#b6f08a`
- **Charge tell:** a soft restorative **green glow** swells under it; leaf/dew spores rise.
- **Impact** `mender-bloom.png`: a **flower opens** over the wounded ally + drifting motes; *Ward* leaves a lingering regen halo.
- **Moves:** Mend = trickle heal + chip · Bloom = the big single-ally bloom · Ward = team regen.

### ✦ Booster — "makes an ally hit harder"  *(aura — arc to the carry)*
- **Palette:** core `#f3e8ff` · mid `#b06bff` · edge `#8a4ad9` · trail `#d6b3ff`
- **Charge tell:** cyan/violet **energy arcs** crackle around it as it primes the carry.
- **Projectile** `booster-arc.png`: a bright **arc/tether** that runs Booster → carry (an **ally**, not an enemy).
- **Impact** `booster-amp.png`: the carry flares with a rising violet **power aura** (Amp); *Overdrive* = a full burst.
- **Moves:** Prime = one amp stack on the carry · Overdrive = dump a big amp load · Resonate = team amp.

### ⚔ Striker — "fast, lots of quick hits"  *(slash — melee, multi-hit)*
- **Palette:** core `#ffffff` · mid `#ffd166` · edge `#e0a020` · trail `#fff1c0`
- **Charge tell:** edges catch light; faint **motion streaks** — "wound up to move first."
- **Impact** `striker-slash.png`: a gold **edge-slash** across the target. Barrage repeats it — several **staggered** slashes, alternating angle (Flurry).
- **Moves:** Jab = a quick two-hit · Flurry = the barrage (more charge → more hits) · Blitz = one hard strike, viciouser moving first.

### 🗡 Assassin — "hunts and finishes the weak"  *(slash — melee, single brutal)*
- **Palette:** core `#ffffff` · mid `#ff7a9c` · edge `#b3203f` · trail `#ffd0db`
- **Charge tell:** a **dark coil** tightens; on the VENOM path a sickly drip beads on the blade.
- **Impact** `assassin-strike.png`: a crimson **cross-slash**; an **Execute kill flashes white**. Poison adds a violet-green seep.
- **Moves:** Mark = a measured strike (seeds poison on VENOM) · Execute = the lethal blow, devastating below the HP threshold · Ambush = strike the weakest.

### ❄ Warden — "freezes enemies out of their turns"  *(bolt)*
- **Palette:** core `#eaffff` · mid `#8fd8ff` · edge `#4aa6d9` · trail `#cdeeff`
- **Charge tell:** ice crystals **form and lengthen** on the body toward Glaciate; snow drifts.
- **Projectile** `warden-shard.png`: a **spinning ice shard** with a cold mist trail. Tweens actor→target.
- **Impact** `warden-freeze.png`: the target **encases in a pale ice slab** (the freeze overlay); *Cold Snap* frosts the whole line.
- **Moves:** Frost Nip = cold chip, banks charge · Glaciate = freeze one solid + hit · Cold Snap = freeze the whole line a turn.

### 💀 Hexer — "makes enemies take more from everyone"  *(lob)*
- **Palette:** core `#f6e9ff` · mid `#b06bff` · edge `#7a1fb0` · trail `#d9a9ff`
- **Charge tell:** violet **spores/runes orbit** and thicken as the curse builds toward Doom.
- **Projectile** `hexer-spore.png`: a **lobbed spore/curse mote** that arcs onto the target.
- **Impact** `hexer-curse.png`: a creeping violet **haze settles** (the vulnerability overlay); *Doom/Blight* spreads it down the line.
- **Moves:** Jinx = one vuln + cursed chip · Doom = a heavy curse (whole line on the Spreading-Hex bend) · Blight = curse the line.

---

## Per-creature flourishes (the 17)

Each species **tints** its Type signature — same projectile/impact, different silhouette
and trail color — so a Type still reads at a glance but the creature feels its own. This is
the column PixelLab needs per creature; full data in `CREATURE_VFX` (`src/data/attackVfx.js`).

| Creature | Type | Attack flourish |
|---|---|---|
| **Cinderpaw** ★pilot | Reactor | Cracked-stone cat — molten **seam-cracks** flare; ember bolt sheds rock-flecks. |
| Glowtail | Reactor | Smouldering beast — a warm **tail-trail** of embers; softer, longer, glowing bolt. |
| Fizzpop | Reactor | Jittery spark-imp — an over-bright, **flickering** bolt that crackles and stutters. |
| Stoneward | Bulwark | Mossy granite golem — cover lands as **mossy-stone plates** grinding into place. |
| Ironwall | Bulwark | Riveted iron sentinel — a gate-like **iron shutter** clangs down; colder shimmer. |
| Mossback | Mender | Mossy grunling — heal blooms as fresh **moss/leaves** unfurling over the wounded. |
| Dewleaf | Mender | Leaf-and-dew sprite — heal is **dew-droplets** coalescing; lighter, glistening motes. |
| Buzzline | Booster | Energy creature — a crackling **cyan arc** whips to the carry. |
| Tanglewing | Booster | Orb-and-antennae — the amp arc is a **twining violet tether**, slower and woven. |
| Swiftpaw | Striker | Fast quadruped — low raking **claw-slashes**, paired and quick. |
| Dartwing | Striker | Bird-dragon — diving **wing-edge slashes** from a steeper angle; whitest gleam. |
| Shadefang | Assassin | Cloaked hunter — a single low **fang-strike**; red core-eye flares on Execute. |
| Veilclaw | Assassin | Hooded stalker — a veiled **cross-claw** from cover; smokier slash edges. |
| Frostwarden | Warden | Rime golem — a heavy **ice-shard** hurled; bright-blue core, thick frost trail. |
| Rimecaller | Warden | Ceremonial frost being — a thinner **crystal-lance** from its antler-crown; paler. |
| Blightcap | Hexer | Diseased mushroom-cap — a sickly green-violet **spore-puff** lobbed; rot-haze trail. |
| Hexmoth | Hexer | Violet moth — curse is glowing **eye-spot motes** that flutter onto the target. |

---

## PixelLab batch checklist (what to generate, in order)

A creature is **VFX-complete** when it has: attack-state frames (the body), and its Type's
projectile + impact sheets exist at the `src/data/attackVfx.js` paths.

1. **Pilot — Cinderpaw (Reactor):** attack frames + `reactor-ember.png` + `reactor-burst.png`.
   This is the shakeout run — confirm the PixelLab response shape and the in-arena drop-in,
   then it sets the bar for the rest.
2. **Finish Reactor:** Glowtail, Fizzpop (Type sheets already done — only their body frames + optional trail tints).
3. **Ranged/lobbed Types next** (they need projectile sheets): Warden (`warden-shard`/`warden-freeze`), Hexer (`hexer-spore`/`hexer-curse`).
4. **Aura/melee Types** (impact-only, no projectile): Bulwark, Mender, Booster, Striker, Assassin — generate the one impact/aura sheet each + body frames.

**Acceptance per sheet:** reads at 64 px, solid silhouette (not muddy — favor solid-bodied
over wispy, per the art decisions), and matches the Type palette above. Budget one creature,
judge it, then scale (free tier = 15 generations; `node scripts/pixellab/pixellab.mjs --check`).
