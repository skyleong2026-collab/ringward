// GuidedCoach.jsx — the first-run "how to win" walkthrough (vC-T).
//
// Answers the other half of the framing-gap verdict the IntroFrame left open: the
// IntroFrame sets the PULL but explicitly teaches no mechanics, and the Spotter only
// explains words on demand — so a new Handler knew the fiction but not how to win,
// and bounced (mashing play at 4×, losing, no thread to a fix). This is that thread,
// said once, in the Spotter's voice: the loop, what GEAR actually is, how to READ a
// fight, and the one rule the numbers won't forgive (the body cliff — why 3-on-7 is
// a loss no build can buy back). It teaches concepts in words rather than puppeting
// the UI, so it can't desync from the live screens. Gated to first run in App, and
// re-openable from the header briefing. Pure presentation — no engine, no goldens.

import { useState } from 'react';

const ACCENT = '#e86040';
const SPOT = '#1e3a5f';
const SPOT_TEXT = '#8aa0b0';

// Each beat is one idea, ordered so the prescription always follows the rule that
// motivates it. Copy is folk-mentor (Gus McCrae / a weathered guide), matching the
// IntroFrame and the pre-battle Spotter, and uses the real vocabulary throughout.
const STEPS = [
  {
    tag: 'THE LOOP',
    title: "Here's the whole of it.",
    body: "You field three grunlings, take a contract, and the fight runs itself. Your craft is the reading — who to bring, what to put on them. Win and your name grows. Lose, and I'll tell you exactly why.",
  },
  {
    tag: 'GEAR',
    title: 'Gear is a move, not a number.',
    body: "Every grunling you own waits in your Stable — tap one to open it, and you'll see its slots. That's where gear goes. It doesn't pad stats; it grants a behavior. Quickstrike takes a second swing on a kill. Sentinel throws itself in front of a wounded ally. One gear per grunling — pick the move that fits the fight in front of you.",
  },
  {
    tag: 'THE READ',
    title: 'I tell you what to bring.',
    body: "Before every fight I post a ◆ READ — what they are, and the one role that answers them. “Reactor Swarm? Bring a Blast Damper.” That line isn't flavor; it's the solution. Field the role I name and the fight leans your way.",
  },
  {
    tag: 'THE BODY CLIFF',
    title: "Mind the count — it's the one rule I can't bend.",
    body: "You field three. Take on five or more and it's already lost — no gear, no clever pick buys it back. They've simply got too many bodies. When the READ says OVERWHELMING, that's not a hard fight, it's the wrong fight. Find one marked FAIR. That's yours.",
  },
  {
    tag: 'GO EARN IT',
    title: 'Read, counter, gear, then watch.',
    body: "That's the craft, end to end. Pick a fight you can hold, bring the role I call, fit the gear to the job — then let it play. Lose one and I'll be right here with what to change. Go on, now. I'll be watching the field.",
  },
];

export function GuidedCoach({ onClose }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 280, background: 'rgba(4,4,10,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#0b1018', border: `1px solid ${SPOT}88`, borderRadius: 12, padding: '18px 20px 16px', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 9, color: SPOT_TEXT, letterSpacing: 2 }}>◼ SPOTTER</span>
            <span style={{ fontSize: 8, color: ACCENT, background: ACCENT + '1a', border: `1px solid ${ACCENT}44`, borderRadius: 3, padding: '1px 6px', letterSpacing: 1.5 }}>{step.tag}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>SKIP</button>
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f6', lineHeight: 1.35, marginBottom: 9 }}>{step.title}</div>
        <div style={{ fontSize: 13, color: '#b6b6c4', lineHeight: 1.7, minHeight: 92 }}>{step.body}</div>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: 6, margin: '16px 0 14px' }}>
          {STEPS.map((_, n) => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= i ? ACCENT : '#2a2a3a' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {i > 0 && (
            <button onClick={() => setI(i - 1)} style={{ padding: '11px 18px', background: 'none', border: '1px solid #2a2a3a', borderRadius: 7, color: '#888', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>← BACK</button>
          )}
          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            style={{ flex: 1, padding: '11px 0', background: ACCENT, border: 'none', borderRadius: 7, color: '#0a0a14', fontSize: 13, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}
          >
            {last ? "GOT IT — LET'S GO" : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
