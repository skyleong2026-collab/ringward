// GuidedCoach.jsx — the first-run "how to win" walkthrough + training drill (vC-T).
//
// Answers the framing-gap verdict's open half: the IntroFrame sets the PULL but
// teaches no mechanics, and the Spotter only defines words on demand — so a new
// Handler knew the fiction but not how to win, mashed play at 4×, lost, and had no
// thread to a fix. This is that thread, in the Spotter's voice. Two acts:
//
//   1. BEATS — the loop, what GEAR is, how to READ a fight, the body cliff.
//   2. DRILL — a real before/after the player can SEE: a canned trio gets melted by
//      a Reactor swarm, the player levels them, and the SAME fight (same foe, same
//      seed) flips to a win. It teaches the level-up action AND shows its impact in
//      an actual fight scene — the thing words can't convey.
//
// The drill is CANNED (fixed demo squads, not the player's roster) on purpose: it
// runs the real engine via BattleScreen, but a fixed foe sidesteps practice's
// level-scaling (which would scale the foe up with you and hide the impact). Levels
// L5→L7 vs an L8 swarm at seed 42 are a verified deterministic loss→win flip — pure
// level delta, zero interventions, so growth is the only variable on screen.
//
// Pure presentation: it calls resolveBattle through BattleScreen but never touches
// the engine, the goldens, or the player's save. Gated to first run in App,
// re-openable from the header briefing.

import { useState } from 'react';
import BattleScreen from './BattleScreen.jsx';
import { CREATURES } from '../data/creatures.js';

const ACCENT = '#e86040';
const SPOT = '#1e3a5f';
const SPOT_TEXT = '#8aa0b0';
const WIN = '#7ed321';
const LOSS = '#d0021b';

// ── Act 1: the concept beats (bottom-card overlay) ──
const BEATS = [
  {
    tag: 'THE LOOP',
    title: "Here's the whole of it.",
    body: "You field three grunlings, take a contract, and the fight runs itself. Your craft is the reading — who to bring, what to put on them. Win and your name grows. Lose, and I'll tell you exactly why.",
  },
  {
    tag: 'GEAR',
    title: 'Gear is a move, not a number.',
    body: "Every grunling you own waits in your Stable — tap one to open it and you'll see its slots. That's where gear goes. It doesn't pad stats; it grants a behavior. Quickstrike takes a second swing on a kill. Sentinel throws itself in front of a wounded ally. One gear per grunling — pick the move that fits the fight.",
  },
  {
    tag: 'THE READ',
    title: 'I tell you what to bring.',
    body: "Before every fight I post a ◆ READ — what they are, and the one role that answers them. “Reactor Swarm? Bring a Blast Damper.” That line isn't flavor; it's the solution. Field the role I name and the fight leans your way.",
  },
  {
    tag: 'THE BODY CLIFF',
    title: "Mind the count — the one rule I can't bend.",
    body: "You field three. Take on five or more and it's already lost — no gear, no clever pick buys it back. They've simply got too many bodies. When the READ says OVERWHELMING, that's not a hard fight, it's the wrong fight. Find one marked FAIR. That's yours.",
  },
];

// ── Act 2: the canned drill (verified deterministic loss→win) ──
const c = (id) => CREATURES.find((u) => u.id === id);
const demoUnit = (id, iid, level) => ({ ...c(id), instanceId: iid, id: iid, level, gearId: null, moduleIds: [] });
const DEMO_FOE = [demoUnit('spark', 't_e0', 8), demoUnit('flicker', 't_e1', 8), demoUnit('cinder', 't_e2', 8)];
const demoSquad = (lvl) => [demoUnit('striker', 't_p0', lvl), demoUnit('fang', 't_p1', lvl), demoUnit('claw', 't_p2', lvl)];
const DEMO_SEED = 42;
const LOW = 5;
const HIGH = 7;

// A centered full-screen Spotter card (drill framing / recap between fights).
function SpotterCard({ tag, tagColor = ACCENT, title, children, footer }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 280, background: '#080810', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ fontSize: 9, color: SPOT_TEXT, letterSpacing: 2 }}>◼ SPOTTER</span>
          <span style={{ fontSize: 8, color: tagColor, background: tagColor + '1a', border: `1px solid ${tagColor}44`, borderRadius: 3, padding: '1px 6px', letterSpacing: 1.5 }}>{tag}</span>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#f0f0f6', lineHeight: 1.35, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#b6b6c4', lineHeight: 1.75 }}>{children}</div>
        <div style={{ marginTop: 26 }}>{footer}</div>
      </div>
    </div>
  );
}

const bigBtn = (color) => ({ width: '100%', padding: '13px 0', background: color, border: 'none', borderRadius: 7, color: '#0a0a14', fontSize: 13, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' });

export function GuidedCoach({ onClose }) {
  // phase: 'beats' → 'drill-intro' → 'fight1' → 'after1' → 'fight2' → 'recap'
  const [phase, setPhase] = useState('beats');
  const [beat, setBeat] = useState(0);
  const [leveled, setLeveled] = useState(false);

  // ── Fight scenes (real engine via BattleScreen, zero interventions) ──
  if (phase === 'fight1' || phase === 'fight2') {
    const after = phase === 'fight2';
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 280, background: '#080810', overflowY: 'auto' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 40px' }}>
          <BattleScreen
            playerSquad={demoSquad(after ? HIGH : LOW)}
            enemySquad={DEMO_FOE}
            seed={DEMO_SEED}
            maxInterventions={0}
            bannerLabel={after ? `TRAINING · AFTER — your strikers at Lv.${HIGH}` : `TRAINING · BEFORE — your strikers at Lv.${LOW}`}
            onComplete={() => setPhase(after ? 'recap' : 'after1')}
          />
        </div>
      </div>
    );
  }

  if (phase === 'drill-intro') {
    return (
      <SpotterCard
        tag="A DRILL" title="Numbers do matter underneath the moves."
        footer={<button onClick={() => setPhase('fight1')} style={bigBtn(ACCENT)}>RUN THE DRILL →</button>}
      >
        Let me <em>show</em> you what a level's worth instead of telling you. Here's a trio of strikers against a Reactor swarm — the kind of fight that's chewed you up. Same foe, same field, twice. No calls to make; just watch the numbers do the work.
      </SpotterCard>
    );
  }

  if (phase === 'after1') {
    return (
      <SpotterCard
        tag="MELTED" tagColor={LOSS} title="They got burned down. Watch this."
        footer={
          !leveled ? (
            <button onClick={() => setLeveled(true)} style={bigBtn(WIN)}>▲ LEVEL THEM UP &nbsp;·&nbsp; Lv.{LOW} → Lv.{HIGH}</button>
          ) : (
            <button onClick={() => setPhase('fight2')} style={bigBtn(ACCENT)}>SEND THEM BACK IN →</button>
          )
        }
      >
        {!leveled ? (
          <>Too green — at Lv.{LOW} they couldn't burn the swarm down before it scaled past them. So we grow them. In your Stable that's the <span style={{ color: WIN, fontWeight: 700 }}>Level&nbsp;up</span> button on a grunling's card, fed by the XP you earn on Walks and runs. Do it now.</>
        ) : (
          <>Lv.{LOW} → <span style={{ color: WIN, fontWeight: 700 }}>Lv.{HIGH}</span>. Same three strikers, two levels stronger — more health, harder hits. Now send them at the <em>exact same</em> swarm and see what changed.</>
        )}
      </SpotterCard>
    );
  }

  if (phase === 'recap') {
    return (
      <SpotterCard
        tag="THAT'S THE LESSON" tagColor={WIN} title="Same fight. Two levels. It flipped."
        footer={<button onClick={onClose} style={bigBtn(ACCENT)}>GOT IT — LET'S GO</button>}
      >
        Nothing changed but their levels, and a loss became a win. That's the whole of growth: feed your grunlings XP, rank up their signatures, fit the right gear — and the cliff moves your way. It pays in real work — Walks, dungeon runs, contracts — where the foe's level is fixed and yours isn't. Go earn your name. I'll be watching the field.
      </SpotterCard>
    );
  }

  // ── Act 1: concept beats (bottom-card overlay over the dimmed app) ──
  const step = BEATS[beat];
  const lastBeat = beat === BEATS.length - 1;
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

        {/* progress: one dot per beat, plus a final dot for the drill */}
        <div style={{ display: 'flex', gap: 6, margin: '16px 0 14px' }}>
          {BEATS.concat([0]).map((_, n) => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= beat ? ACCENT : '#2a2a3a' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {beat > 0 && (
            <button onClick={() => setBeat(beat - 1)} style={{ padding: '11px 18px', background: 'none', border: '1px solid #2a2a3a', borderRadius: 7, color: '#888', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>← BACK</button>
          )}
          <button
            onClick={() => (lastBeat ? setPhase('drill-intro') : setBeat(beat + 1))}
            style={{ ...bigBtn(ACCENT), flex: 1, width: 'auto' }}
          >
            {lastBeat ? 'SHOW ME →' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
