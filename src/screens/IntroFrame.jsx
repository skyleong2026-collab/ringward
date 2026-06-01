// IntroFrame.jsx — the identity / lore frame (core-loop framing, vC-S).
//
// Answers the unaddressed half of the [[8gents-framing-gap]] verdict: the game
// cold-opened on the Stable with no sense of WHO you are or WHY you fight. This
// is the narrative wrapper — it establishes the premise, names the role, and
// names the loop, then hands off to the Spotter (muse: Cortana) who is the
// player's standing partner. It sets stakes; it does NOT step-by-step teach
// mechanics (that's a separate guided-first-contract pass, if we build it).
//
// Shown once on first run (gated by localStorage in App), and re-openable from
// the header so it's never lost. Uses the real game vocabulary (Handler, Stable,
// Contract, Standing, Frontier, FOCUS) so the frame doubles as orientation.

const ACCENT = '#e86040';   // Ringward orange
const SPOT = '#1e3a5f';     // Spotter label blue
const SPOT_TEXT = '#6a8090';

// The loop, named as identity beats — not a click-here tutorial.
const BEATS = [
  { k: 'You run a Stable.', v: 'A roster of creatures — own many, field few. The ones you dispatch fight on instinct.' },
  { k: 'Clients post Contracts.', v: 'Each is a job: a twist, a win condition, a payout. You choose which to take and who to bring.' },
  { k: 'The fight runs itself — almost.', v: 'Your edge is FOCUS: a handful of moments to read the field and step in — Redirect a strike, Stall a threat, Sync a finish.' },
  { k: 'Win work. Build Standing.', v: 'Standing is your name in a region. Enough of it pushes the Frontier open — new territory, bigger clients, rarer creatures.' },
];

export function IntroFrame({ onBegin }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto',
      background: '#080810', color: '#eee',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '44px 22px 36px' }}>

        {/* wordmark */}
        <div style={{ fontSize: 26, fontWeight: 900, color: ACCENT, letterSpacing: 5, marginBottom: 4 }}>RINGWARD</div>
        <div style={{ fontSize: 9, color: '#555', letterSpacing: 4, marginBottom: 26 }}>FIELD BRIEFING</div>

        {/* the premise — world + you, neutral establishing voice */}
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#cfcfda', margin: '0 0 10px' }}>
          The regions are thick with wild creatures — and thicker with people who'll pay
          to have them <span style={{ color: '#eee' }}>handled</span>.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#cfcfda', margin: 0 }}>
          You're a <span style={{ color: ACCENT, fontWeight: 700 }}>Handler</span>. You take the work,
          you build the squad, and when the fight turns — <span style={{ color: '#eee' }}>you decide when to step in</span>.
        </p>

        {/* the loop, as identity beats */}
        <div style={{ margin: '28px 0 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {BEATS.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e6e6ee', marginBottom: 3 }}>{b.k}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#8a8a9a' }}>{b.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* the Spotter — your standing partner (Cortana register) */}
        <div style={{
          background: '#0c1420', borderLeft: `2px solid ${SPOT}`, borderRadius: 5,
          padding: '14px 16px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 8, color: SPOT, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 9 }}>◼ SPOTTER</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: SPOT_TEXT }}>
            I read the field. You make the calls.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: SPOT_TEXT, fontStyle: 'italic', marginTop: 5 }}>
            Tap any <span style={{ fontStyle: 'normal' }}>ⓘ</span> and I'll tell you what something means — no need to
            memorize it all. Let's go earn you a name.
          </div>
        </div>

        <button onClick={onBegin} style={{
          width: '100%', padding: '14px 0', cursor: 'pointer',
          background: ACCENT, border: 'none', borderRadius: 6,
          color: '#0a0a14', fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          fontFamily: 'inherit',
        }}>
          ENTER THE FIELD →
        </button>
        <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, textAlign: 'center', marginTop: 12 }}>
          Re-read anytime from the briefing button, top-right.
        </div>
      </div>
    </div>
  );
}
