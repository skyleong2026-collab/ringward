// ─── Attack-VFX signatures (per combat Type) ─────────────────────────────────────
// The single source of truth for "what an attack LOOKS like" — the seam between the
// deterministic engine (which only knows damage/charge/status) and the arena view
// (SeamLab) that paints it. The human-readable art brief that mirrors this file is
// docs/ATTACK-VFX-SIGNATURES.md; both must move together.
//
// Why this exists (the recommended-first step before any PixelLab batch): defining
// each Type's projectile / impact / charge tell HERE means the pixel-art batch is
// generated to a spec instead of guessed at. Each `projectile.sprite` / `impact.sprite`
// path is the exact PNG the PixelLab run must produce; until those files land the view
// falls back to the existing CSS/SVG effect (see `fallback`), so this ships today and
// the art is a pure drop-in later — no engine change.
//
// Keys are the engine `type` (roster.js): Reactor, Bulwark, Mender, Booster, Striker,
// Assassin, Warden, Hexer. Per-creature flourishes (the 17 art-bound species) live in
// CREATURE_VFX below — they only TINT/flavor the Type signature, never replace it, so
// "you read the Type by its VFX" holds across the roster.

// Where the generated VFX PNGs land. One projectile + one impact sheet per Type to
// start (8 + 8); per-creature trails are optional polish, not a blocker.
export const VFX_DIR = '/sprites/vfx';

// ── delivery archetypes — HOW the hit crosses the arena ──
// 'bolt'  → a projectile tweens from actor → target, then bursts (ranged casters)
// 'slash' → a melee swipe lands ON the target (no travel); multi-hit moves repeat it
// 'lob'   → an arcing projectile (curses/spores) — bolt with a vertical arc
// 'aura'  → no projectile; the effect blooms on an ALLY (shields/heals/boosts)
export const DELIVERY = {
  bolt: 'bolt',
  slash: 'slash',
  lob: 'lob',
  aura: 'aura',
};

// ── The eight Type signatures ──────────────────────────────────────────────────
// palette: core = white-hot center, mid = body, edge = outer glow, trail = streak.
// charge: the tell that builds under the unit AS it charges toward its payoff.
// fallback: the existing CSS effect to use until the PNG exists (keeps parity).
export const TYPE_VFX = {
  Reactor: {
    delivery: DELIVERY.bolt,
    palette: { core: '#ffffff', mid: '#ff8a3a', edge: '#ff5a2a', trail: '#ffd24a' },
    glyph: '🔥',
    charge: { tell: 'heat-shimmer', motes: 'embers-rising', note: 'Core-heart brightens and pulses faster the closer to Overload.' },
    projectile: { sprite: `${VFX_DIR}/reactor-ember.png`, shape: 'fireball', spin: false, trail: 'ember-streak', note: 'A molten ember/fireball with a comet tail of warm flecks.' },
    impact: { sprite: `${VFX_DIR}/reactor-burst.png`, glyph: '💥', shockwave: true, note: 'Orange detonation bloom + scattering embers; AOE (Backdraft) is a wide flame wash.' },
    fallback: 'radial-blob', // current seam-bolt-L/R gradient + ember flecks
  },
  Bulwark: {
    delivery: DELIVERY.aura,
    palette: { core: '#eaf8ff', mid: '#7fd6ff', edge: '#4a90d9', trail: '#bfeaff' },
    glyph: '🛡',
    charge: { tell: 'stone-bracing', motes: 'dust-settle', note: 'Plates/stone visibly set and harden as block banks.' },
    projectile: { sprite: null, shape: null, trail: null, note: 'No travel — Bulwark casts cover. Brace=self, Aegis=team dome, Bodyguard=ally slab.' },
    impact: { sprite: `${VFX_DIR}/bulwark-aegis.png`, glyph: '🛡️', shockwave: false, note: 'A blue shield-dome snaps over the recipient(s); a hex-grid shimmer on Aegis.' },
    fallback: 'shield-dome',
  },
  Mender: {
    delivery: DELIVERY.aura,
    palette: { core: '#f0ffe0', mid: '#7ed321', edge: '#3ec9a0', trail: '#b6f08a' },
    glyph: '🌿',
    charge: { tell: 'green-glow', motes: 'leaf-spores-rising', note: 'A soft restorative glow swells under the Mender as it banks toward Bloom.' },
    projectile: { sprite: null, shape: null, trail: null, note: 'No travel — healing settles ON an ally. Bloom = a flower opening over the wounded.' },
    impact: { sprite: `${VFX_DIR}/mender-bloom.png`, glyph: '🌸', shockwave: false, note: 'Green bloom + drifting leaf/dew motes; Ward leaves a lingering regen halo.' },
    fallback: 'green-bloom',
  },
  Booster: {
    delivery: DELIVERY.aura,
    palette: { core: '#f3e8ff', mid: '#b06bff', edge: '#8a4ad9', trail: '#d6b3ff' },
    glyph: '✦',
    charge: { tell: 'energy-arcs', motes: 'sparks-climbing', note: 'Cyan/violet energy arcs crackle around the Booster as it primes the carry.' },
    projectile: { sprite: `${VFX_DIR}/booster-arc.png`, shape: 'energy-tether', spin: false, trail: 'arc-line', note: 'A bright arc/tether runs Booster → carry (an ally), not at an enemy.' },
    impact: { sprite: `${VFX_DIR}/booster-amp.png`, glyph: '⬆️', shockwave: false, note: 'The carry flares with a rising violet power aura (Amp); Overdrive = a full burst.' },
    fallback: 'aura-arc',
  },
  Striker: {
    delivery: DELIVERY.slash,
    palette: { core: '#ffffff', mid: '#ffd166', edge: '#e0a020', trail: '#fff1c0' },
    glyph: '⚔',
    charge: { tell: 'blade-gleam', motes: 'speed-lines', note: 'Edges catch light; faint motion streaks read "wound up to move first."' },
    projectile: { sprite: null, shape: null, trail: null, note: 'Melee — many fast swipes, not a thrown bolt. Flurry = several staggered slashes.' },
    impact: { sprite: `${VFX_DIR}/striker-slash.png`, glyph: '⚔️', shockwave: false, multiHit: true, note: 'A gold edge-slash across the target; barrage repeats it (staggered, alternating angle).' },
    fallback: 'slash-streak',
  },
  Assassin: {
    delivery: DELIVERY.slash,
    palette: { core: '#ffffff', mid: '#ff7a9c', edge: '#b3203f', trail: '#ffd0db' },
    glyph: '🗡',
    charge: { tell: 'shadow-coil', motes: 'venom-drip', note: 'A dark coil tightens; on the VENOM path a sickly drip beads on the blade.' },
    projectile: { sprite: null, shape: null, trail: null, note: 'Melee — a single brutal strike. Execute on a low-HP target spikes red-white.' },
    impact: { sprite: `${VFX_DIR}/assassin-strike.png`, glyph: '🗡️', shockwave: false, crit: true, note: 'A crimson cross-slash; an Execute kill flashes white. Poison adds a violet-green seep.' },
    fallback: 'slash-streak',
  },
  Warden: {
    delivery: DELIVERY.bolt,
    palette: { core: '#eaffff', mid: '#8fd8ff', edge: '#4aa6d9', trail: '#cdeeff' },
    glyph: '❄',
    charge: { tell: 'frost-form', motes: 'snow-drift', note: 'Ice crystals form and lengthen on the body as it banks toward Glaciate.' },
    projectile: { sprite: `${VFX_DIR}/warden-shard.png`, shape: 'ice-shard', spin: true, trail: 'frost-mist', note: 'A spinning ice shard with a cold mist trail.' },
    impact: { sprite: `${VFX_DIR}/warden-freeze.png`, glyph: '❄️', shockwave: false, freeze: true, note: 'Target encases in a pale ice slab (the freeze overlay); Cold Snap frosts the whole line.' },
    fallback: 'radial-blob',
  },
  Hexer: {
    delivery: DELIVERY.lob,
    palette: { core: '#f6e9ff', mid: '#b06bff', edge: '#7a1fb0', trail: '#d9a9ff' },
    glyph: '💀',
    charge: { tell: 'curse-gather', motes: 'spores-orbit', note: 'Violet spores/runes orbit and thicken as the curse builds toward Doom.' },
    projectile: { sprite: `${VFX_DIR}/hexer-spore.png`, shape: 'spore-cloud', spin: false, arc: true, trail: 'rot-haze', note: 'A lobbed spore/curse mote that arcs onto the target.' },
    impact: { sprite: `${VFX_DIR}/hexer-curse.png`, glyph: '💀', shockwave: false, vuln: true, note: 'A creeping violet haze settles (the vulnerability overlay); Doom/Blight spreads it down the line.' },
    fallback: 'radial-blob',
  },
};

// ── Per-creature flourishes (the 17 art-bound species) ──────────────────────────
// These TINT the Type signature — a one-line silhouette/palette note that tells the
// PixelLab batch how THIS creature's attack reads differently from its Type-mate, and
// gives the view an optional per-creature projectile/trail override. `tint` overrides
// the Type trail color only; everything else inherits TYPE_VFX[type].
export const CREATURE_VFX = {
  // Reactor
  cinderpaw:  { type: 'Reactor', tint: '#ff7a2a', signature: 'Cracked-stone cat: molten SEAM-cracks flare along the body; ember bolt sheds rock-flecks. (PixelLab pilot.)' },
  glowtail:   { type: 'Reactor', tint: '#ffb347', signature: 'Smouldering beast: a warm TAIL-trail of embers; bolt is softer, longer, glowing.' },
  fizzpop:    { type: 'Reactor', tint: '#ffd24a', signature: 'Jittery spark-imp: an over-bright, FLICKERING bolt that crackles and stutters.' },
  // Bulwark
  stoneward:  { type: 'Bulwark', tint: '#9fd0c0', signature: 'Mossy granite golem: cover lands as MOSSY-STONE plates grinding into place.' },
  ironwall:   { type: 'Bulwark', tint: '#bfeaff', signature: 'Riveted iron sentinel: a gate-like IRON shutter clangs down; colder, harder shimmer.' },
  // Mender
  mossback:   { type: 'Mender', tint: '#7ed321', signature: 'Mossy grunling: heal blooms as fresh MOSS/leaves unfurling over the wounded.' },
  dewleaf:    { type: 'Mender', tint: '#b6f08a', signature: 'Leaf-and-dew sprite: heal is DEW-DROPLETS coalescing; lighter, glistening motes.' },
  // Booster
  buzzline:   { type: 'Booster', tint: '#7fd6ff', signature: 'Energy creature mid-stride: a crackling CYAN arc whips to the carry.' },
  tanglewing: { type: 'Booster', tint: '#b06bff', signature: 'Orb-and-antennae: the amp arc is a TWINING violet tether, slower and woven.' },
  // Striker
  swiftpaw:   { type: 'Striker', tint: '#ffd166', signature: 'Fast quadruped: low raking CLAW-slashes, paired and quick.' },
  dartwing:   { type: 'Striker', tint: '#fff1c0', signature: 'Bird-dragon: diving WING-edge slashes from a steeper angle; whitest gleam.' },
  // Assassin
  shadefang:  { type: 'Assassin', tint: '#ff7a9c', signature: 'Cloaked hunter: a single low FANG-strike; the red core-eye flares on Execute.' },
  veilclaw:   { type: 'Assassin', tint: '#ffd0db', signature: 'Hooded stalker: a veiled CROSS-CLAW from cover; smokier edges on the slash.' },
  // Warden
  frostwarden:{ type: 'Warden', tint: '#8fd8ff', signature: 'Rime golem: a heavy ICE-SHARD hurled; bright-blue core, thick frost trail.' },
  rimecaller: { type: 'Warden', tint: '#cdeeff', signature: 'Ceremonial frost being: shard is a thinner CRYSTAL-LANCE from its antler-crown; paler.' },
  // Hexer
  blightcap:  { type: 'Hexer', tint: '#9bd06b', signature: 'Diseased mushroom-cap: a sickly green-violet SPORE-PUFF lobbed; rot-haze trail.' },
  hexmoth:    { type: 'Hexer', tint: '#b06bff', signature: 'Violet moth: curse is glowing EYE-SPOT motes that flutter onto the target.' },
};

// Resolve the full VFX signature for a creature id (Type signature + creature tint).
export function vfxFor(creatureId, type) {
  const cv = CREATURE_VFX[creatureId];
  const t = type ?? cv?.type;
  const base = TYPE_VFX[t];
  if (!base) return null;
  if (!cv) return base;
  return { ...base, palette: { ...base.palette, trail: cv.tint ?? base.palette.trail }, creature: cv };
}
