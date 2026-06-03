// SeamLab.jsx — the §26 ENGINE SEAM proving ground (Task 1).
//
// This is the ONE surface wired to the NEW manual-combat engine (src/engine/combat).
// It is deliberately separate from ReactorSandbox.jsx (the earlier hand-rolled
// prototype) and shares nothing with battleStepEngine.js / resolveBattle. Two modes:
//   • PLAY  — you drive side A turn-by-turn against the AI driver on side B.
//   • WATCH — both sides are the SAME AI brain at a blessed golden seed; the
//             transcript here matches the matching scripts/manual-golden-*.mjs.
//
// The point it proves: ONE engine, ONE set of skill math, the seam only routes
// WHO chooses (humanChoice awaits these clicks; aiChoice answers instantly).
//
// Layout mirrors ⚗ the Lab (ReactorSandbox): a bigger type scale, fat tappable
// cards, and a responsive grid that stacks on a narrow screen.

import { useState, useRef, useEffect } from 'react';
import {
  createBattleState,
  runBattle,
  createAIDriver,
  createHumanDriver,
  getSkill,
  legalSkills,
  enemiesOf,
  makeUnitDef,
} from '../engine/combat/index.js';

const ACCENT = '#e8a040';
const CHG = '#f5a623';
const BURN = '#ff5a2a';
const AMP = '#b06bff';
const WIN = '#7ed321';
const DIM = '#8a8a9a';
const PANEL = '#12121c';
const LINE = '#2a2a3a';
const SEL = '#9cd1ff';
const T = { micro: 11, small: 13, body: 15, label: 16, sub: 18, head: 21, huge: 30 };

const GOLDEN_SEED = 1337;

function useViewport() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    window.addEventListener('resize', f);
    window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  return w;
}

// Matchups, each pinned to a blessed golden seed so WATCH reproduces a known fight.
// `desc` is the one-line "what this teaches" shown on the fat selector card.
const MATCHUPS = {
  mirror: {
    label: 'Reactor mirror', glyph: '⚡', accent: BURN,
    desc: 'Two charge-and-nuke squads trade Overloads — the baseline fight.',
    seed: GOLDEN_SEED,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')],
  },
  bulwark: {
    label: 'Bulwark wall', glyph: '🛡', accent: '#7fd6ff',
    desc: 'Reactors batter a shielded wall — block soaks damage before HP.',
    seed: 4242,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('stoneward', 'Balanced'), makeUnitDef('ironwall', 'Balanced')],
  },
  mender: {
    label: 'Mender sustain', glyph: '🌿', accent: WIN,
    desc: 'A Mender out-heals the burst — win by outlasting, not out-damaging.',
    seed: 7777,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced'), makeUnitDef('mossback', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')],
  },
  booster: {
    label: 'Booster combo', glyph: '⚡', accent: AMP,
    desc: 'A Booster stacks Amp (⚡) on its carry, then the buffed hit lands huge.',
    seed: 9001,
    a: () => [makeUnitDef('buzzline', 'Greedy'), makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('cinderpaw', 'Balanced')],
    b: () => [makeUnitDef('glowtail', 'Greedy'), makeUnitDef('cinderpaw', 'Greedy')],
  },
  striker: {
    label: 'Striker tempo', glyph: '⟡', accent: '#ffd166',
    desc: 'Fast Strikers — one Flurry is a barrage of hits in a single turn.',
    seed: 7,
    a: () => [makeUnitDef('swiftpaw', 'Greedy'), makeUnitDef('dartwing', 'Greedy')],
    b: () => [makeUnitDef('shadefang', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')],
  },
  assassin: {
    label: 'Assassin hunt', glyph: '☠', accent: '#ff7a9c',
    desc: 'Glass cannons hunt the weakest — Execute spikes ×2.5 on the wounded.',
    seed: 7,
    a: () => [makeUnitDef('shadefang', 'Balanced'), makeUnitDef('veilclaw', 'Balanced')],
    b: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
  },
};

// Friendly feed line from a raw engine event (the engine emits pure data).
function feedLine(e) {
  if (e.type === 'round-start') return { kind: 'round', text: `Round ${e.round} — ${e.firstSide} side moves first` };
  if (e.type === 'battle-end') return { kind: 'end', text: `${e.winner === 'draw' ? 'Draw' : e.winner + ' wins'} — ${e.rounds} rounds` };
  if (e.type === 'burn') {
    return { kind: 'burn', text: `${e.target.name} burns for ${e.dmg}${e.killed ? ' — KO' : ''} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  }
  if (e.type === 'regen') {
    return { kind: 'regen', text: `${e.target.name} regenerates +${e.healed} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  }
  // turn
  const hits = (e.hits || [])
    .filter((h) => h.dmg > 0 || h.killed)
    .map((h) => `${h.dmg} → ${h.name}${h.killed ? ' (KO)' : ''}`)
    .join(', ');
  const chg = e.chargeBefore !== e.chargeAfter ? ` · charge ${e.chargeBefore}→${e.chargeAfter}` : '';
  const amp = e.amplifiedByBurn ? ' · 🔥×2' : '';
  const shields = (e.shields || []).filter((s) => s.block > 0).map((s) => `🛡${s.block}`).join(' ');
  const heals = (e.heals || []).filter((h) => h.healed > 0).map((h) => `💚${h.healed}→${h.name}`).join(' ');
  const wards = (e.regens || []).length ? `🌿ward ×${e.regens.length}` : '';
  const amps = (e.amps || []).map((a) => `⚡${a.amp}→${a.name}`).join(' ');
  const extra = [shields, heals, wards, amps].filter(Boolean).join(' · ');
  return { kind: 'turn', side: e.actor.side, text: `${e.actor.name} — ${e.skill.name}${amp}${hits ? `: ${hits}` : ''}${extra ? ` · ${extra}` : ''}${chg}` };
}

function snapshot(state) {
  const map = (u) => ({
    uid: u.uid, name: u.name, side: u.side, spriteId: u.spriteId,
    hp: u.hp, maxHp: u.maxHp, charge: u.charge, maxCharge: u.maxCharge,
    burn: u.statuses.burn || 0, block: u.statuses.block || 0, regen: u.statuses.regen || 0, amp: u.statuses.amp || 0, alive: u.alive,
  });
  return { A: state.units.A.map(map), B: state.units.B.map(map), round: state.round };
}

function Bar({ value, max, color, h = 10 }) {
  return (
    <div style={{ background: '#1a1a26', borderRadius: 5, height: h, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
      <div style={{ width: `${Math.max(0, (value / max) * 100)}%`, height: '100%', background: color, transition: 'width .25s ease' }} />
    </div>
  );
}

const KIND_COL = { payoff: AMP, wildcard: BURN, builder: DIM };

function UnitCard({ u, isTarget, isActor, onPick }) {
  const dead = !u.alive;
  return (
    <button
      onClick={isTarget ? () => onPick(u.uid) : undefined}
      disabled={!isTarget}
      style={{
        textAlign: 'left', width: '100%', cursor: isTarget ? 'pointer' : 'default',
        background: isTarget ? '#10261a' : isActor ? '#1a1408' : PANEL,
        border: `2px solid ${isTarget ? WIN : isActor ? ACCENT : LINE}`,
        borderRadius: 11, padding: '11px 13px', opacity: dead ? 0.4 : 1, marginBottom: 9,
        boxShadow: isTarget ? `0 0 0 1px ${WIN}55` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: T.label, fontWeight: 800, color: '#eee' }}>
          {u.name} <span style={{ fontSize: T.micro, color: DIM, fontWeight: 600 }}>{u.uid}</span>
          {isActor && <span style={{ color: ACCENT, fontSize: T.small, marginLeft: 7, fontWeight: 700 }}>▶ TURN</span>}
          {isTarget && <span style={{ color: WIN, fontSize: T.small, marginLeft: 7, fontWeight: 700 }}>◀ TAP</span>}
        </span>
        <span style={{ fontSize: T.body, fontWeight: 700, color: dead ? '#d0021b' : '#cfcfda' }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</span>
      </div>
      <Bar value={u.hp} max={u.maxHp} color={dead ? '#d0021b' : u.side === 'A' ? '#3ec9a0' : '#e07a7a'} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: T.small, color: CHG, fontWeight: 700, minWidth: 64 }}>chg {u.charge}/{u.maxCharge}</span>
        <div style={{ flex: 1 }}><Bar value={u.charge} max={u.maxCharge} color={CHG} h={6} /></div>
      </div>
      {(u.burn > 0 || u.block > 0 || u.regen > 0 || u.amp > 0) && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
          {u.burn > 0 && <span style={{ fontSize: T.small, color: BURN, fontWeight: 700 }}>🔥 {u.burn}</span>}
          {u.block > 0 && <span style={{ fontSize: T.small, color: '#7fd6ff', fontWeight: 700 }}>🛡 {u.block}</span>}
          {u.regen > 0 && <span style={{ fontSize: T.small, color: WIN, fontWeight: 700 }}>🌿 {u.regen}</span>}
          {u.amp > 0 && <span style={{ fontSize: T.small, color: AMP, fontWeight: 700 }}>⚡ {u.amp}</span>}
        </div>
      )}
    </button>
  );
}

export function SeamLab({ onClose }) {
  const vw = useViewport();
  const narrow = vw < 760;

  const [mode, setMode] = useState(null); // 'play' | 'watch'
  const [matchup, setMatchup] = useState('mirror');
  const [snap, setSnap] = useState(null);
  const [feed, setFeed] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | choose-actor | choose-skill | choose-target | done
  const [pool, setPool] = useState([]); // uids the human may act with now
  const [active, setActive] = useState(null); // {uid, name, skillIds}
  const [pendingSkill, setPendingSkill] = useState(null); // skillId awaiting a target
  const [result, setResult] = useState(null);

  const stateRef = useRef(null);
  const actorObjRef = useRef(null);
  const resolveRef = useRef(null);
  const feedRef = useRef([]);
  const feedBoxRef = useRef(null);

  useEffect(() => {
    if (feedBoxRef.current) feedBoxRef.current.scrollTop = feedBoxRef.current.scrollHeight;
  }, [feed]);

  function emit(event) {
    feedRef.current = [...feedRef.current, feedLine(event)];
    setFeed(feedRef.current);
    if (stateRef.current) setSnap(snapshot(stateRef.current));
  }

  // Human driver callbacks — return Promises the engine awaits; a click resolves them.
  function requestActor(livingPool) {
    return new Promise((resolve) => {
      if (livingPool.length === 1) { resolve(livingPool[0]); return; }
      setPool(livingPool.map((u) => u.uid));
      setPhase('choose-actor');
      resolveRef.current = (uid) => { setPhase('idle'); resolve(livingPool.find((u) => u.uid === uid)); };
    });
  }

  function requestDecision(actor, state) {
    return new Promise((resolve) => {
      actorObjRef.current = actor;
      // Snapshot what the UI needs NOW (in the handler) so render never reads refs.
      setActive({
        uid: actor.uid,
        name: actor.name,
        skillIds: actor.skillIds.slice(),
        legal: legalSkills(actor, state).map((s) => s.id),
        enemyUids: enemiesOf(state, actor).map((u) => u.uid),
      });
      setPhase('choose-skill');
      resolveRef.current = (decision) => { setPhase('idle'); setActive(null); setPendingSkill(null); resolve(decision); };
    });
  }

  function pickSkill(skillId) {
    const skill = getSkill(skillId);
    const actor = actorObjRef.current;
    if (skill.targetMode === 'allEnemies') {
      resolveRef.current({ skillId, targetIds: enemiesOf(stateRef.current, actor).map((u) => u.uid) });
      return;
    }
    // single-enemy: ask for a target
    setPendingSkill(skillId);
    setPhase('choose-target');
  }

  function pickTarget(uid) {
    resolveRef.current({ skillId: pendingSkill, targetIds: [uid] });
  }

  function start(which) {
    feedRef.current = [];
    setFeed([]); setResult(null); setActive(null); setPendingSkill(null); setPool([]);
    setMode(which);

    const { a, b, seed } = MATCHUPS[matchup];
    const state = createBattleState(a(), b(), seed);
    stateRef.current = state;
    setSnap(snapshot(state));

    const drivers = which === 'watch'
      ? { A: createAIDriver(), B: createAIDriver() }
      : { A: createHumanDriver({ requestActor, requestDecision }), B: createAIDriver() };

    runBattle(state, drivers, emit).then((res) => {
      setResult(res);
      setPhase('done');
    });
  }

  const legal = active?.legal ?? [];
  const livingEnemyUids = active?.enemyUids ?? [];
  const cfg = MATCHUPS[matchup];

  const modeBtn = (which, glyph, title, sub) => (
    <button onClick={() => start(which)} style={{
      flex: 1, background: mode === which ? ACCENT : PANEL, color: mode === which ? '#1a1408' : '#eee',
      border: `2px solid ${ACCENT}`, borderRadius: 12, padding: narrow ? '14px 10px' : '16px 14px',
      cursor: 'pointer', textAlign: 'center',
    }}>
      <div style={{ fontSize: T.sub, fontWeight: 800, letterSpacing: 0.5 }}>{glyph} {title}</div>
      <div style={{ fontSize: T.small, marginTop: 3, opacity: 0.85, fontWeight: 600 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.98)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: narrow ? '14px 12px 48px' : '18px 18px 56px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: T.head, fontWeight: 800, color: ACCENT, letterSpacing: 0.5 }}>⚙ ENGINE SEAM · §26</div>
            <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>Manual turn-by-turn — one engine, two drivers. Additive; resolveBattle untouched.</div>
          </div>
          <button onClick={onClose} style={{ background: PANEL, border: `1px solid ${LINE}`, color: '#ccc', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: T.body, fontWeight: 700 }}>✕ Close</button>
        </div>

        {/* Fight picker — fat descriptive cards (like the Lab's creature picker) */}
        <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PICK A FIGHT</div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {Object.entries(MATCHUPS).map(([m, c]) => {
            const on = matchup === m;
            return (
              <button key={m} onClick={() => setMatchup(m)} style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '13px 14px',
                background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`,
                boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <span style={{ fontSize: T.sub, color: c.accent }}>{c.glyph}</span>
                  <span style={{ fontSize: T.label, fontWeight: 800, color: on ? '#eaf2ff' : '#ddd' }}>{c.label}</span>
                  {on && <span style={{ marginLeft: 'auto', fontSize: T.micro, color: SEL, fontWeight: 800, letterSpacing: 1 }}>● SET</span>}
                </div>
                <div style={{ fontSize: T.small, color: on ? '#b9c6d6' : '#8f8f9f', lineHeight: 1.45 }}>{c.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          {modeBtn('play', '▶', 'PLAY', 'you drive side A vs the AI')}
          {modeBtn('watch', '⏵', 'WATCH', 'AI vs AI — replays the golden')}
        </div>

        {!snap && (
          <div style={{ color: DIM, fontSize: T.body, textAlign: 'center', padding: '36px 16px', background: PANEL, border: `1px dashed ${LINE}`, borderRadius: 12 }}>
            <div style={{ fontSize: T.sub, color: '#bbb', fontWeight: 700, marginBottom: 6 }}>{cfg.glyph} {cfg.label}</div>
            <div style={{ lineHeight: 1.5, maxWidth: 460, margin: '0 auto' }}>{cfg.desc}</div>
            <div style={{ marginTop: 14, color: ACCENT, fontWeight: 700 }}>Press PLAY or WATCH to start.</div>
          </div>
        )}

        {snap && (
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Battlefield */}
            <div>
              <div style={{ fontSize: T.small, color: '#3ec9a0', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>YOUR SIDE (A)</div>
              {snap.A.map((u) => (
                <UnitCard key={u.uid} u={u} isActor={active?.uid === u.uid} isTarget={false} onPick={() => {}} />
              ))}
              <div style={{ fontSize: T.small, color: '#e07a7a', fontWeight: 800, letterSpacing: 1, margin: '14px 0 8px' }}>ENEMY (B)</div>
              {snap.B.map((u) => (
                <UnitCard
                  key={u.uid}
                  u={u}
                  isActor={active?.uid === u.uid}
                  isTarget={phase === 'choose-target' && u.alive && livingEnemyUids.includes(u.uid)}
                  onPick={pickTarget}
                />
              ))}
            </div>

            {/* Controls + feed */}
            <div>
              {/* Choose-actor prompt */}
              {phase === 'choose-actor' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: T.body, color: ACCENT, fontWeight: 800, marginBottom: 8 }}>Whose turn first? <span style={{ color: DIM, fontWeight: 600 }}>(you set the order)</span></div>
                  {snap.A.filter((u) => pool.includes(u.uid)).map((u) => (
                    <button key={u.uid} onClick={() => resolveRef.current(u.uid)} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, background: PANEL, border: `2px solid ${ACCENT}`, color: '#eee', borderRadius: 10, padding: '13px 14px', cursor: 'pointer', fontSize: T.body, fontWeight: 700 }}>
                      Act with <b>{u.name}</b> <span style={{ color: CHG, fontWeight: 700 }}>· charge {u.charge}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Choose-skill */}
              {(phase === 'choose-skill' || phase === 'choose-target') && active && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: T.body, color: ACCENT, fontWeight: 800, marginBottom: 8 }}>
                    {active.name}: pick a skill{phase === 'choose-target' ? ' → now tap a target enemy' : ''}
                  </div>
                  {active.skillIds.map((sid) => {
                    const sk = getSkill(sid);
                    const usable = legal.includes(sid);
                    const chosen = pendingSkill === sid;
                    return (
                      <button
                        key={sid}
                        onClick={usable ? () => pickSkill(sid) : undefined}
                        disabled={!usable}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', marginBottom: 8,
                          background: chosen ? '#1a1408' : PANEL,
                          border: `2px solid ${chosen ? ACCENT : usable ? LINE : '#1d1d28'}`,
                          color: usable ? '#eee' : '#555', borderRadius: 10, padding: '12px 14px',
                          cursor: usable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <div style={{ fontSize: T.label, fontWeight: 800 }}>
                          {sk.name} <span style={{ fontSize: T.small, color: usable ? KIND_COL[sk.kind] : '#444', fontWeight: 700 }}>· {sk.kind}</span>
                        </div>
                        <div style={{ fontSize: T.small, color: usable ? DIM : '#444', lineHeight: 1.45, marginTop: 3 }}>{sk.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {result && (
                <div style={{ background: PANEL, border: `2px solid ${result.winner === 'A' ? WIN : result.winner === 'B' ? '#d0021b' : DIM}`, borderRadius: 12, padding: 16, marginBottom: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: T.huge, fontWeight: 900, color: result.winner === 'A' ? WIN : result.winner === 'B' ? '#d0021b' : DIM }}>{result.winner === 'A' ? 'You win!' : result.winner === 'B' ? 'AI wins' : 'Draw'}</div>
                  <div style={{ fontSize: T.body, color: DIM, marginTop: 4 }}>{result.rounds} rounds{result.cappedOut ? ' (round cap — most HP)' : ''}</div>
                </div>
              )}

              {/* Feed */}
              <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>BATTLE LOG</div>
              <div ref={feedBoxRef} style={{ background: '#0a0a12', border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, maxHeight: narrow ? 320 : 460, overflowY: 'auto' }}>
                {feed.length === 0 && <div style={{ fontSize: T.body, color: '#555' }}>Battle log…</div>}
                {feed.map((f, i) => (
                  <div key={i} style={{
                    fontSize: T.body, padding: '3px 0', lineHeight: 1.5,
                    color: f.kind === 'round' ? ACCENT : f.kind === 'end' ? WIN : f.kind === 'burn' ? BURN : f.kind === 'regen' ? WIN : f.side === 'A' ? '#9cd' : '#e0a0b8',
                    fontWeight: f.kind === 'round' || f.kind === 'end' ? 800 : 500,
                    borderTop: f.kind === 'round' ? `1px solid ${LINE}` : 'none', marginTop: f.kind === 'round' ? 6 : 0, paddingTop: f.kind === 'round' ? 6 : 3,
                  }}>{f.text}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeamLab;
