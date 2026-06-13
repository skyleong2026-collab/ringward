// Shared UI atoms — the Ringward design system, rendered as reusable components.
// Encoded from the Claude Design "UI Kit": carved buttons (gradient+shadow, never
// flat), physical charge dots, type-colored status chips, floating damage numbers.
// All read from src/data/designTokens.js so the look stays consistent everywhere.
import { BASE, FONTS, STATUS } from '../../data/designTokens.js';

// ── Button — four carved tiers (primary / ghost / danger / icon) ──────────────
export function Button({ kind = 'primary', disabled, onClick, children, style = {}, title }) {
  const base = {
    fontFamily: FONTS.sans, fontWeight: 700, letterSpacing: 0.3,
    border: '1px solid transparent', borderRadius: 7, padding: '8px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, lineHeight: 1.1,
    transition: 'filter .15s, transform .05s', opacity: disabled ? 0.5 : 1,
  };
  const tiers = {
    primary: { background: 'linear-gradient(180deg,#F0BD64,#D6922E)', color: '#23160A',
               boxShadow: '0 7px 0 -2px #00000055, inset 0 1px 0 #ffffff55' },
    ghost:   { background: 'transparent', color: '#E9CFA0', border: '1px solid #5A4628' },
    danger:  { background: 'linear-gradient(180deg,#C4453A,#8A2A22)', color: '#fff',
               border: '1px solid #D0584A' },
    icon:    { background: '#1D160D', color: BASE.ink, border: '1px solid #3A2C1A',
               width: 42, height: 42, padding: 0, borderRadius: 8, fontSize: 18 },
  };
  return (
    <button type="button" title={title} disabled={disabled} onClick={disabled ? undefined : onClick}
      style={{ ...base, ...tiers[kind], ...style }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
      {children}
    </button>
  );
}

// ── ChargeDots — physical, countable; gold filled, hollow empty. No "2/3". ─────
export function ChargeDots({ value = 0, max = 3, size = 11, gap = 3 }) {
  return (
    <span style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < value ? 'radial-gradient(circle at 35% 30%,#FFD98A,#F5A623)' : '#2A2114',
          boxShadow: i < value ? '0 0 8px rgba(245,166,35,0.7)' : 'inset 0 0 0 1px #463922',
          transition: 'background .2s, box-shadow .2s',
        }} />
      ))}
    </span>
  );
}

// ── StatusChip — type/status-colored square with glyph + optional stack count ──
const STATUS_GLYPH = { burn: '🔥', freeze: '❄', shield: '🛡', curse: '💀', regen: '🌿', amp: '✦', bleed: '🩸', stun: '✶' };
export function StatusChip({ kind, count, size = 30 }) {
  const c = STATUS[kind] || BASE.gold;
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 4, background: `${c}1F`, border: `1px solid ${c}88`,
    }}>
      <span style={{ fontSize: size * 0.5, filter: 'drop-shadow(0 1px 1px #000)' }}>{STATUS_GLYPH[kind] ?? '◆'}</span>
      {count > 1 && (
        <span style={{ position: 'absolute', right: -3, bottom: -4, fontFamily: FONTS.mono,
          fontSize: size * 0.34, fontWeight: 700, color: c, textShadow: '0 1px 2px #000' }}>×{count}</span>
      )}
    </span>
  );
}

// ── RelicCard — the two relic treatments from the design: a clean STAT relic
// (icon orb + plain multiplier line) vs a VERB relic (a conditional rule band).
// Rarity owns the frame; keystones get the forged badge. `icon` is a render node
// (the caller passes the painted RelicIcon); `rarityColor` themes the frame.
export function RelicCard({ relic, rarityColor, icon, kind = 'stat', when, onClick, selected, disabled, footer, style = {} }) {
  const frame = rarityColor || relic.color;
  const isKeystone = relic.rarity === 'Keystone' || relic.keystone;
  return (
    <button type="button" onClick={disabled ? undefined : onClick} title={relic.lore} disabled={disabled}
      style={{
        position: 'relative', textAlign: 'left', borderRadius: 10, padding: '11px 12px',
        cursor: disabled ? 'default' : 'pointer', color: BASE.ink, width: '100%',
        background: `linear-gradient(180deg, ${relic.color}14, ${BASE.panel})`,
        border: `1.5px solid ${selected ? BASE.gold : `${frame}99`}`,
        boxShadow: selected ? `0 0 0 1.5px ${BASE.gold}, 0 0 22px -10px ${BASE.gold}`
          : isKeystone ? `0 0 26px -10px #9be7ff` : `0 0 20px -11px ${frame}`,
        opacity: disabled ? 0.55 : 1, ...style,
      }}>
      {isKeystone && <span style={{ position: 'absolute', top: 8, right: 10, fontFamily: FONTS.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: '#9be7ff' }}>⚒ FORGED</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: kind === 'verb' ? 7 : 4 }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 50% 40%, ${relic.color}40, ${BASE.pitch} 72%)`, border: `1px solid ${frame}66` }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 16, fontWeight: 700, color: frame, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{relic.name}</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: frame, opacity: 0.85 }}>{String(relic.rarity).toUpperCase()}</div>
        </div>
      </div>
      {kind === 'verb' ? (
        <div style={{ background: '#0a141c', border: `1px solid ${STATUS.shield}44`, borderLeft: `3px solid ${relic.color}`, borderRadius: 4, padding: '5px 8px' }}>
          {when && <div style={{ fontFamily: FONTS.mono, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: STATUS.shield, marginBottom: 2 }}>WHEN · {when}</div>}
          <div style={{ fontFamily: FONTS.serif, fontSize: 13, fontWeight: 700, color: BASE.ink, lineHeight: 1.3 }}>{relic.desc}</div>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: '#cbbfae', lineHeight: 1.4 }}>{relic.desc}</div>
      )}
      {footer && <div style={{ marginTop: 7, fontFamily: FONTS.sans, fontSize: 11, fontWeight: 700 }}>{footer}</div>}
    </button>
  );
}

// ── DamageNumber — floats up from the target, fades. Colored by element. ───────
export function DamageNumber({ value, color = STATUS.burn, heal = false }) {
  const c = heal ? STATUS.regen : color;
  return (
    <span style={{
      fontFamily: FONTS.sans, fontWeight: 800, fontSize: 38, color: c,
      textShadow: `0 0 18px ${c}aa, 0 2px 0 #00000088`, whiteSpace: 'nowrap',
    }}>{heal ? '+' : '−'}{Math.abs(value)}</span>
  );
}
