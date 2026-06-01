// glossary.js — the Spotter's source of truth for "what does this term mean?"
//
// Pre-written TEXT only. No TTS, no live-generative AI (it would state things
// that are mechanically wrong about our own game). This is the data layer the
// on-demand Spotter glossary reads from; the tap-hold UI + Cortana voice
// rendering is a LATER pass. See memory `8gents-spotter-glossary` + docs/VOCAB-AUDIT.md.
//
// Each entry has two depths, which are two different speech acts:
//   short — the spare tactical read. Must be CLEAR on its own (a confused player
//           should not have to tap twice to reach a comprehensible answer).
//           Where a term already has a card/§10 one-liner, `short` MATCHES it so
//           a term can't say two things in two places.
//   long  — the warm "teaching gear" (a folk-wise mentor's voice — see memory
//           `8gents-spotter-glossary`): answer-first, plain, dry, a little
//           personality. Light on dialect (clarity first). Depth-2 =
//           interactions / edge cases / why-you-care.
//
// Internal engine keys are unchanged by the vC-Q renames (Spark/anchor/resonate
// stay as keys); the glossary is keyed by the DISPLAY term, with ALIASES below
// mapping the old/internal names onto the right entry.

export const GLOSSARY = {
  // ── Archetypes (the 4 roles) ─────────────────────────────────────────────
  guardian: {
    term: 'Guardian',
    cat: 'archetype',
    short: 'Tank — high HP and armor, low damage. Its shield triggers at 50% HP.',
    long: "Your wall. Guardians don't kill things — they buy time. Park one up front and the hits that would've deleted your carry land on armor instead. Drop it to half health and its shield kicks in and it soaks even more. No Guardian, no back line.",
  },
  echo: {
    term: 'Echo',
    cat: 'archetype',
    short: "Support — copies your strongest ally's action each round (at 50% power).",
    long: "Echo doesn't fight on its own terms; it doubles whatever your best unit just did. Field a heavy hitter beside one and you're effectively swinging twice. Worthless alone, brutal next to a carry — think force-multiplier, not damage dealer. (Each Echo you field also grants +1 FOCUS.)",
  },
  swift: {
    term: 'Swift',
    cat: 'archetype',
    short: 'Speed + execute — finishes targets under 30% HP, and a kill can refund the turn.',
    long: "Your finisher. Swift moves first and hunts the wounded — anything under 30% health takes double, and a clean kill can hand the turn right back. Soften something up, then let Swift clean the table. It closes rounds before the enemy gets to act.",
  },
  reactor: {
    term: 'Reactor',
    cat: 'archetype',
    short: 'Slow scaler — gains attack every round it survives (+12%/round), then detonates.',
    long: "The bomb on a timer. A Reactor opens weak and grows every round it stays alive, stacking Stoke until it detonates for one huge hit. Protect it early and it ends the fight late; lose it before it charges and you got nothing. It's a payoff you build toward — not a quick spark, despite old habits from other games.",
  },

  // ── Intervention verbs (your only authored actions in combat) ────────────
  intervention: {
    term: 'Intervention',
    cat: 'verb',
    short: 'A call you make mid-battle (Redirect / Stall / Sync). Each one spends FOCUS.',
    long: "An intervention is you reaching into an otherwise-automatic fight. The squad acts on its own; you get a few moments to override it. Three kinds — Redirect, Stall, Sync. Your whole agency in combat lives here, and FOCUS is how many you're allowed.",
  },
  redirect: {
    term: 'Redirect',
    cat: 'verb',
    short: "Intervention — repoint the acting unit's attack onto a different enemy.",
    long: "Caught a unit about to swing at the wrong target? Redirect sends that hit somewhere else — onto the threat you actually need dead. The plainest of your three calls: same attack, new target.",
  },
  stall: {
    term: 'Stall',
    cat: 'verb',
    short: 'Intervention — lock an enemy out of its next turn (a stun).',
    long: "Stall freezes an enemy — they skip their next turn entirely. Silence their finisher for a beat, or buy your Reactor one more round to charge. It's a stun, not a shield: you're not protecting anyone, you're taking the other side's turn away.",
  },
  sync: {
    term: 'Sync',
    cat: 'verb',
    short: 'Intervention — pull a free ally into a combined strike on the target.',
    long: "Sync calls in a second unit to pile onto one hit — two attacks, one target, right now. Best when something needs to die this instant and a single swing won't finish it. Your combo button.",
  },
  focus: {
    term: 'FOCUS',
    cat: 'verb',
    short: 'Your per-battle intervention budget — how many calls you can make. Your squad grants it.',
    long: "Every intervention spends FOCUS. You start with one; your fielded squad earns more — each Echo adds one, and some gear grants more. A few contracts cap it to throttle you. Note: it's not focus-fire. It's how many times you get to reach in and change the fight.",
  },

  // ── Combat statuses (in-battle reads) ────────────────────────────────────
  stoke: {
    term: 'Stoke',
    cat: 'combat',
    short: "A Reactor's scaling counter — it stacks each round toward detonation.",
    long: "The charge a Reactor builds. Every round it survives adds Stoke, raising its attack until it hits the threshold and detonates. Watch the count: high Stoke means the payoff is close — and means the enemy wants it dead now.",
  },
  execute: {
    term: 'Execute',
    cat: 'combat',
    short: 'Finishing a low-HP target — Swift deals double under 30% HP.',
    long: "A kill-the-wounded mechanic. Swift hits anything under 30% health for double, so once a target's low it's as good as gone. The whole game with Swift is getting enemies into execute range, then collecting.",
  },
  shield: {
    term: 'Shield',
    cat: 'combat',
    short: "A Guardian's absorb layer — soaks damage before HP.",
    long: "A buffer that eats hits before they touch health. Guardians carry it, and it triggers harder at half HP. While the shield holds, your front line is effectively untouchable for a beat.",
  },
  detonation: {
    term: 'Detonation',
    cat: 'combat',
    short: 'A Reactor exploding for a big hit. Enemy detonations advance a loss clock.',
    long: "The Reactor's payoff — all that stored Stoke released at once. Yours win fights. Theirs are dangerous twice over: the hit itself, and on some contracts each enemy detonation ticks a Signal clock toward your loss. Don't let their Reactor mature.",
  },
  signalClock: {
    term: 'Signal clock',
    cat: 'combat',
    short: 'A loss timer on some contracts — it fills as enemy detonations land.',
    long: "A doom counter certain clients attach to the job. Every enemy detonation pushes it forward; if it fills, you lose no matter who's still standing. It turns 'kill their Reactor fast' from good advice into a hard deadline.",
  },
  hold: {
    term: 'Hold / Escortee',
    cat: 'combat',
    short: 'A protect-objective contract — keep a specific unit alive to win.',
    long: "An escort job. There's a unit you have to keep breathing to the end — let it die and the contract fails even if you win the fight. Build to defend, not just to kill.",
  },

  // ── Buildcraft layer (highest jargon density) ────────────────────────────
  signature: {
    term: 'Signature',
    cat: 'build',
    short: "A creature's one unique ability — active or passive.",
    long: "Every creature has a signature: its single special move. Some fire automatically (passive); some you trigger by spending an intervention (active). It's what makes a species worth fielding over a plain stat-stick.",
  },
  signatureGlyph: {
    term: 'Signature Glyph',
    cat: 'build',
    short: "A slotted tuner that alters a creature's signature.",
    long: "Glyphs are the dials on a signature — slot them to bend how it behaves. They do nothing on their own; they tune the ability you already have. Rank the signature up and every slotted glyph scales with it. (A Glyph tunes one creature's signature; a Module tunes the whole build.)",
  },
  module: {
    term: 'Module',
    cat: 'build',
    short: 'A build-level tuning dial — does nothing alone, sharpens what you already field.',
    long: "Modules are squad-wide dials. Like glyphs, a module never acts by itself — it amplifies or reshapes a behavior you're already running. 'A dial does nothing on its own.' The difference from a Glyph: a Glyph tunes one creature's signature; a Module tunes the build.",
  },
  gear: {
    term: 'Gear',
    cat: 'build',
    short: 'Equipment that grants or rewrites a behavior (a verb).',
    long: "Gear is what a creature carries into the fight. Unlike a dial, gear gives a unit something to do — a new action, or a rewrite of an existing one. Verbs, not buffs: gear changes behavior, it doesn't just pad numbers.",
  },
  rank: {
    term: 'Rank',
    cat: 'build',
    short: "A signature's tier, 1→5. Shards raise it; all slotted glyphs scale with it.",
    long: "Rank is how powerful a signature is — one through five. Spend Shards to raise it, and every glyph you've slotted gets stronger with it. Don't confuse it with Level: Rank is the ability, Level is the creature.",
  },
  level: {
    term: 'Level',
    cat: 'build',
    short: "A creature's XP level — its raw stat growth. (Not the same as Rank.)",
    long: "Level is the creature getting bigger — more HP, more attack, from experience. Rank is its signature getting sharper. Two separate ladders: a high-Level creature with a low-Rank signature is a big body with a weak special, and vice versa.",
  },

  // ── Currencies & meta-progression ────────────────────────────────────────
  credits: {
    term: 'Credits',
    cat: 'resource',
    short: '⦿ Soft currency — refreshes your PvP opponent pool.',
    long: "Credits ⦿ are your everyday money — mainly for refreshing the PvP pool. Easy come; spend them freely.",
  },
  shards: {
    term: 'Shards',
    cat: 'resource',
    short: '◈ Upgrade currency — recruits creatures and ranks up signatures.',
    long: "Shards ◈ are the currency that matters for building: they recruit new creatures and pay to Rank up signatures. The bottleneck resource — most of your real progression spends these.",
  },
  marks: {
    term: 'Marks',
    cat: 'resource',
    short: '✦ Prestige currency — earned from and spent on rivals.',
    long: "Marks ✦ are the rival/prestige currency — you earn them settling scores and spend them on rival-tier rewards. The 'I beat someone who mattered' resource.",
  },
  slag: {
    term: 'Slag',
    cat: 'resource',
    short: '⚒ The one build currency — spent at the Forge to re-roll a core.',
    long: "Slag ⚒ is common ground-matter, and the single currency that feeds building. It comes from ring runs and from rendering down culled grunlings. You spend it at the Forge to re-incubate a core and redistribute its stats — never to grow them. One currency for everything you make; the lower grades refine upward, so early slag never goes to waste.",
  },

  // ── World & loop ─────────────────────────────────────────────────────────
  grunling: {
    term: 'Grunling',
    cat: 'world',
    short: 'A creature you handle — an earthen body grown around a living core. Your units.',
    long: "Grunlings are what came up out of the ground. Not flesh, not machine — something grown, with a core for a heart. They're your units: you keep a stable of them and field a few at a time. Folk wore 'groundling' down to 'grunling' a long way back, and the name stuck.",
  },
  core: {
    term: 'Core',
    cat: 'world',
    short: "A grunling's heart — the glowing center that holds its power.",
    long: "The core is the living center of a grunling: it glows while the thing's alive and goes dark when it ain't. Everything a grunling can do, it does because of its core — which is also the part worth collecting when one falls.",
  },
  handler: {
    term: 'Handler',
    cat: 'world',
    short: 'You — someone who keeps and fields grunlings for work.',
    long: "A Handler keeps a stable of grunlings and takes contracts with them. It's a trade: you earn your name one job at a time. You're a new one — your mentor left you the tools to start, but the Standing's yours to build.",
  },
  mentor: {
    term: 'Mentor',
    cat: 'world',
    short: 'The Handler who trained you and left you your first three grunlings.',
    long: "Your mentor walked the road a long way and certified you before they hung it up. They left you three grunlings and a voice in your ear to keep teaching after they were gone. You inherited the tools; the name you make yourself.",
  },
  standing: {
    term: 'Standing',
    cat: 'world',
    short: 'Faction progress that gates contracts and rivals. (was "rep")',
    long: "Standing is your reputation with a faction — it climbs as you take their work and unlocks higher contracts and rival challenges. Your combined Standing across factions is what opens new Frontier territory.",
  },
  contract: {
    term: 'Contract',
    cat: 'world',
    short: 'A job — a modifier (twist), a win condition, and a payout.',
    long: "A contract is one job from a Client: it sets a twist (the modifier), what you must do to win, and what you're paid. The core loop — pick a contract, build for its twist, collect.",
  },
  client: {
    term: 'Client',
    cat: 'world',
    short: 'Who issues a contract.',
    long: "The Client is the faction or character handing you the job. Who they are shapes what they ask for and what they pay — and doing their work builds Standing with them.",
  },
  rival: {
    term: 'Rival',
    cat: 'world',
    short: 'A recurring named opponent.',
    long: "Rivals are the named opponents who keep coming back — personal matchups, not random encounters. Beating them pays Marks and moves your story forward.",
  },
  frontier: {
    term: 'Region / Frontier',
    cat: 'world',
    short: 'World-board territories; the Frontier unlocks via combined Standing.',
    long: "The world is divided into Regions you work through. The Frontier is the locked edge — it opens once your combined Standing is high enough. Where you are sets which contracts and species you can reach.",
  },
  stable: {
    term: 'Stable',
    cat: 'world',
    short: 'Your full creature roster.',
    long: "Your Stable is every creature you've recruited — the whole bench, not just the squad you've fielded. You build each contract's squad by pulling from it.",
  },
  dispatch: {
    term: 'Dispatch',
    cat: 'world',
    short: "How many units you've fielded (squad slots, e.g. DISPATCH 3/3).",
    long: "Dispatch is your fielded count — the units you've actually committed to this fight, out of your slots. 'DISPATCH 3/3' means a full squad's in.",
  },
  codex: {
    term: 'Codex',
    cat: 'world',
    short: 'Your record of discovered species, Standing, and access.',
    long: "The Codex is your compendium — what you've discovered, where your Standing sits, what's unlocked. Your reference for the world you've uncovered so far.",
  },
  scout: {
    term: 'Scout',
    cat: 'world',
    short: "Reveal a contract's intel by fighting a fragment of it first. (was \"recon\")",
    long: "Scouting spends a smaller fight to reveal what a contract actually holds — the enemy makeup, the twist — before you commit to the real thing. Pay a little up front so you don't walk in blind.",
  },
  spotter: {
    term: 'Spotter',
    cat: 'meta',
    short: 'The voice in your ear — reads the field, and (here) explains the terms.',
    long: "The voice in your ear — near enough your mentor's. It calls what matters in a fight, and when you ask, it tells you what a word means. A guide, not a manual. That's me.",
  },
};

// Map old / internal / alternate names onto the canonical entry key so a lookup
// works whether the caller passes the engine key, the old display name, or a
// loose synonym. Keys are lowercased before lookup.
const ALIASES = {
  spark: 'reactor',
  anchor: 'stall',
  resonate: 'sync',
  rep: 'standing',
  reputation: 'standing',
  recon: 'scout',
  sigmod: 'signatureGlyph',
  'signature modifier': 'signatureGlyph',
  'signature mod': 'signatureGlyph',
  glyph: 'signatureGlyph',
  region: 'frontier',
  escortee: 'hold',
  'signal clock': 'signalClock',
  // "agent" retired in favor of grunling (the title pun is gone) — keep the
  // alias so any lingering reference still resolves.
  agent: 'grunling',
  agents: 'grunling',
  unit: 'grunling',
  creature: 'grunling',
  groundling: 'grunling',
};

// Normalize an arbitrary term/key into a canonical glossary key, or null.
function resolveKey(raw) {
  if (!raw) return null;
  const k = String(raw).trim();
  if (GLOSSARY[k]) return k;
  const lower = k.toLowerCase();
  if (GLOSSARY[lower]) return lower;
  if (ALIASES[lower]) return ALIASES[lower];
  return null;
}

// Primary lookup helper. Returns the full entry { term, cat, short, long } or null.
export function defineTerm(raw) {
  const key = resolveKey(raw);
  return key ? GLOSSARY[key] : null;
}

// Convenience: just the depth-1 read (or null).
export function shortDef(raw) {
  return defineTerm(raw)?.short ?? null;
}

// All entries as an array, grouped-by-cat friendly (stable insertion order).
export const GLOSSARY_TERMS = Object.entries(GLOSSARY).map(([key, v]) => ({ key, ...v }));
