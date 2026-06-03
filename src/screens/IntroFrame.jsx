// IntroFrame.jsx — the identity / lore frame (core-loop framing, Ringward).
//
// Answers the unaddressed half of the framing-gap verdict: the game cold-opened
// on the Stable with no sense of WHO you are or WHY you go. This is the narrative
// wrapper — folk-mystery voice (see memory `8gents-world-frame`): it opens on the
// road, withholds the mystery (the Drop is earned, never narrated), names the
// role and the loop, then hands off to the Spotter — your mentor's parting voice.
// It sets the pull; it does NOT step-by-step teach mechanics.
//
// Tone: warm-folk-that-darkens (Gus McCrae / a weathered guide), not epic fantasy.
// Shown once on first run (gated by localStorage in App), re-openable from the
// header. Uses the real vocabulary (Handler, grunling, core, Stable, Contract,
// FOCUS, Standing, ringward) so the frame doubles as orientation.

const ACCENT = '#e86040';   // Ringward orange
const SPOT = '#1e3a5f';     // Spotter label blue
const SPOT_TEXT = '#6a8090';

// The loop, named as identity beats — folk-warm but legible (it doubles as
// orientation, so each beat still reads clean on its own).
const BEATS = [
  { k: 'Your stable.', v: 'Three grunlings to your name — earthen things, each grown round a living core. You keep many, you field a few. The ones you send out fight on their own.' },
  { k: 'The work.', v: "Folks pay to have grunlings handled. Each contract's a job — a twist, a win condition, a payout. You pick which to take and who to bring." },
  { k: 'Your call.', v: 'The fight runs itself, mostly. Your edge is FOCUS — a handful of moments to read it and step in: turn a strike, lock a threat down, call a finish.' },
  { k: 'The road.', v: 'Win work and your Standing grows — your name in a place. Enough of it opens the way ringward: harder country, stranger cores, bigger questions.' },
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
        <div style={{ fontSize: 9, color: '#555', letterSpacing: 4, marginBottom: 26 }}>BEFORE YOU GO</div>

        {/* the premise — folk voice, opens on the road, withholds the mystery */}
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#cfcfda', margin: '0 0 10px' }}>
          Everybody knows the road runs <span style={{ color: ACCENT, fontWeight: 700 }}>ringward</span>.
          Some walk it for standing. Some for the cores. Some go because they can't sit still —
          and some because they need to know what's at the end of it.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#cfcfda', margin: '0 0 10px' }}>
          The ones with sense stop somewhere good. Most just keep going.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#cfcfda', margin: 0 }}>
          Your mentor walked it a long way — further than most. Now they've hung it up, and left you
          three <span style={{ color: '#eee' }}>grunlings</span> to start your own.
          You're a <span style={{ color: ACCENT, fontWeight: 700 }}>Handler</span> now.
          You've got the tools. The name, you earn.
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

        {/* the Spotter — the mentor's parting voice, folk-wise register */}
        <div style={{
          background: '#0c1420', borderLeft: `2px solid ${SPOT}`, borderRadius: 5,
          padding: '14px 16px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 8, color: SPOT, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 9 }}>◼ MARROW</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: SPOT_TEXT }}>
            I'll be in your ear. I'll tell you what I see. What you do with it is the whole job.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: SPOT_TEXT, fontStyle: 'italic', marginTop: 5 }}>
            Take the road. We'll learn the rest moving.
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.6, color: '#4a5a66', marginTop: 8 }}>
            Tap any <span>ⓘ</span> for what a word means — no need to carry it all in your head.
          </div>
        </div>

        <button onClick={onBegin} style={{
          width: '100%', padding: '14px 0', cursor: 'pointer',
          background: ACCENT, border: 'none', borderRadius: 6,
          color: '#0a0a14', fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          fontFamily: 'inherit',
        }}>
          TAKE THE ROAD →
        </button>
        <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, textAlign: 'center', marginTop: 12 }}>
          Re-read anytime from the briefing button, top-right.
        </div>
      </div>
    </div>
  );
}
