// designTokens.js — the single source of truth for Ringward's visual language,
// encoded from the Claude Design handoff ("Ringward Design Direction" / "UI Kit").
// Earthen base + 8 type identities + status colors + the three-voice type system.
// SeamLab (the live game) re-exports the legacy short names from here, so existing
// inline styles keep working while new UI reads the richer tokens.

// ── Earthen base palette ──────────────────────────────────────────────────────
export const BASE = {
  pitch: '#120E08',   // ground / darkest
  panel: '#1B160F',   // panel base
  stone: '#2A2218',   // raised stone
  edge:  '#3A3025',   // rim / border
  ink:   '#EFE6D6',   // parchment ink (brightest text)
  gold:  '#E8A040',   // handler gold (accent; never type-colored)
};

// ── The eight type identities (color owns frame/glow/chips) ────────────────────
// color = the read; accent = text/border on type-dim backgrounds; dim = card bg.
export const TYPE_COLORS = {
  Reactor:  { color: '#FF5A2A', accent: '#FF6A3A', dim: '#2A140C', glyph: '🔥' },
  Bulwark:  { color: '#7FD6FF', accent: '#7FD6FF', dim: '#0E2230', glyph: '🛡' },
  Mender:   { color: '#7ED321', accent: '#8FE04A', dim: '#16280C', glyph: '🌿' },
  Booster:  { color: '#B06BFF', accent: '#B888FF', dim: '#1F1430', glyph: '✦' },
  Striker:  { color: '#FFD166', accent: '#FFD166', dim: '#2A2210', glyph: '⚔' },
  Assassin: { color: '#FF7A9C', accent: '#FF8AA8', dim: '#2C1018', glyph: '🗡' },
  Warden:   { color: '#8FD8FF', accent: '#9FE0FF', dim: '#0E2330', glyph: '❄' },
  Hexer:    { color: '#9A6BFF', accent: '#A884FF', dim: '#1A1230', glyph: '💀' },
};
export const typeColor = (type, key = 'color') => (TYPE_COLORS[type]?.[key]) ?? BASE.gold;

// ── Status colors (always the same everywhere) ────────────────────────────────
export const STATUS = {
  burn:   '#FF6A3A', // loses HP each round; stacks high
  freeze: '#9FE0FF', // skips its next turn
  shield: '#7FD6FF', // soaks the next hits, then breaks
  curse:  '#A884FF', // takes more from the whole squad
  regen:  '#8FE04A', // knits a little HP each round
  amp:    '#B888FF', // its next blow lands far harder
  bleed:  '#E8534A', // loses HP every time it acts
  stun:   '#FFD166', // cannot act for one round
};

// ── Three-voice typography ────────────────────────────────────────────────────
// serif = the world's voice (creature names, lore, titles); sans = the handler's
// tools (buttons, labels, descriptions); mono = NUMBERS ONLY (tabular, ≥14px).
export const FONTS = {
  display: "'Cinzel', Georgia, serif",                // wordmark / big titles
  serif:   "'Grenze', 'Cinzel', Georgia, serif",      // names, headers, lore
  sans:    "'Hanken Grotesk', system-ui, sans-serif", // tools, buttons, labels
  mono:    "'Space Mono', ui-monospace, monospace",   // numbers only
};

// ── Type scale (px) ───────────────────────────────────────────────────────────
export const TYPE_SCALE = { micro: 11, small: 13, body: 15, label: 16, sub: 18, head: 21, huge: 30 };

// ── Legacy short names (kept stable so SeamLab's existing inline styles don't churn) ──
export const ACCENT = BASE.gold;                 // #E8A040
export const CHG    = '#f5a623';                 // charge — neutral gold
export const BURN   = TYPE_COLORS.Reactor.color; // #FF5A2A
export const AMP    = TYPE_COLORS.Booster.color; // #B06BFF
export const WIN    = TYPE_COLORS.Mender.color;  // #7ED321 (heal / regen / win)
export const LOSS   = '#d0021b';                 // death
export const DIM    = '#8a8a9a';                 // disabled / secondary
export const PANEL  = '#12121c';                 // panel background
export const LINE   = '#2a2a3a';                 // border
export const SEL    = '#9cd1ff';                 // selection
