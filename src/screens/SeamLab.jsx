// SeamLab.jsx — the §26 ENGINE SEAM proving ground (Task 1).
//
// This is the ONE surface wired to the NEW manual-combat engine (src/engine/combat).
// It is deliberately separate from ReactorSandbox.jsx (the earlier hand-rolled
// prototype) and shares nothing with battleStepEngine.js / resolveBattle. Two modes:
//   • PLAY  — you drive side A turn-by-turn against the AI driver on side B.
//   • WATCH — both sides are the SAME AI brain at the golden seed (1337); the
//             transcript here matches scripts/manual-golden.mjs exactly.
//
// The point it proves: ONE engine, ONE set of skill math, the seam only routes
// WHO chooses (humanChoice awaits these clicks; aiChoice answers instantly).

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

const GOLDEN_SEED = 1337;

// Matchups, each pinned to a blessed golden seed so WATCH reproduces a known fight.
const MATCHUPS = {
  mirror: {
    label: 'Reactor mirror',
    seed: GOLDEN_SEED,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')],
  },
  bulwark: {
    label: 'Bulwark wall',
    seed: 4242,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('stoneward', 'Balanced'), makeUnitDef('ironwall', 'Balanced')],
  },
  mender: {
    label: 'Mender sustain',
    seed: 7777,
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced'), makeUnitDef('mossback', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')],
  },
  // Greedy Booster: holds charge long enough that you see Resonate spread Amp (⚡)
  // across the whole line, then the buffed carry's Overload lands hugely amplified.
  booster: {
    label: 'Booster combo',
    seed: 9001,
    a: () => [makeUnitDef('buzzline', 'Greedy'), makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('cinderpaw', 'Balanced')],
    b: () => [makeUnitDef('glowtail', 'Greedy'), makeUnitDef('cinderpaw', 'Greedy')],
  },
  // Striker glass-cannon clash: a single turn fires a whole Flurry barrage, and the
  // fast Strikers open each round with a first-strike Blitz. All three skills fire.
  striker: {
    label: 'Striker tempo',
    seed: 7,
    a: () => [makeUnitDef('swiftpaw', 'Greedy'), makeUnitDef('dartwing', 'Greedy')],
    b: () => [makeUnitDef('shadefang', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')],
  },
  // Assassins hunt the weakest enemy: Mark softens, Ambush finishes a wounded target,
  // and Execute lands its ×2.5 lethal spike once a Reactor drops below the threshold.
  assassin: {
    label: 'Assassin hunt',
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

function Bar({ value, max, color, h = 7 }) {
  return (
    <div style={{ background: '#000', borderRadius: 3, height: h, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, (value / max) * 100)}%`, height: '100%', background: color, transition: 'width .2s' }} />
    </div>
  );
}

function UnitCard({ u, isTarget, isActor, onPick }) {
  const dead = !u.alive;
  return (
    <button
      onClick={isTarget ? () => onPick(u.uid) : undefined}
      disabled={!isTarget}
      style={{
        textAlign: 'left', width: '100%', cursor: isTarget ? 'pointer' : 'default',
        background: isActor ? '#1a1408' : PANEL,
        border: `1px solid ${isTarget ? ACCENT : isActor ? ACCENT + '88' : LINE}`,
        borderRadius: 6, padding: '7px 9px', opacity: dead ? 0.4 : 1, marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#eee' }}>
          {u.name} <span style={{ fontSize: 10, color: DIM }}>{u.uid}</span>
        </span>
        <span style={{ fontSize: 11, color: dead ? '#d0021b' : '#bbb' }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</span>
      </div>
      <Bar value={u.hp} max={u.maxHp} color={dead ? '#d0021b' : u.side === 'A' ? '#4a9' : '#a55'} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: CHG, width: 46 }}>chg {u.charge}/{u.maxCharge}</span>
        <div style={{ flex: 1 }}><Bar value={u.charge} max={u.maxCharge} color={CHG} h={4} /></div>
        {u.burn > 0 && <span style={{ fontSize: 9, color: BURN }}>🔥{u.burn}</span>}
        {u.block > 0 && <span style={{ fontSize: 9, color: '#7fd6ff' }}>🛡{u.block}</span>}
        {u.regen > 0 && <span style={{ fontSize: 9, color: '#7ed321' }}>🌿{u.regen}</span>}
        {u.amp > 0 && <span style={{ fontSize: 9, color: AMP }}>⚡{u.amp}</span>}
      </div>
    </button>
  );
}

export function SeamLab({ onClose }) {
  const [mode, setMode] = useState(null); // 'play' | 'watch'
  const [matchup, setMatchup] = useState('mirror'); // 'mirror' (Reactor v Reactor) | 'bulwark' (Reactor v Bulwark)
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

    // Each matchup's squads + seed are matched to a blessed golden, so WATCH
    // reproduces a known transcript. 'mender' puts a Mender on YOUR side so you
    // feel the sustain (heal/regen) driving it by hand.
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.97)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 14px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, letterSpacing: 0.5 }}>⚙ ENGINE SEAM · §26</div>
            <div style={{ fontSize: 11, color: DIM }}>Manual turn-by-turn — one engine, two drivers. Additive; resolveBattle untouched.</div>
          </div>
          <button onClick={onClose} style={{ background: PANEL, border: `1px solid ${LINE}`, color: '#ccc', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: DIM, letterSpacing: 1 }}>FIGHT</span>
          {Object.entries(MATCHUPS).map(([m, cfg]) => (
            <button key={m} onClick={() => setMatchup(m)} style={{
              flex: 1, background: matchup === m ? '#1a2230' : PANEL, color: matchup === m ? '#9cd' : '#888',
              border: `1px solid ${matchup === m ? '#9cd' : LINE}`, borderRadius: 5, padding: '6px', fontSize: 11, cursor: 'pointer',
            }}>{cfg.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => start('play')} style={{ flex: 1, background: mode === 'play' ? ACCENT : PANEL, color: mode === 'play' ? '#1a1408' : '#ddd', border: `1px solid ${ACCENT}`, borderRadius: 6, padding: '9px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>▶ PLAY (you drive A vs AI)</button>
          <button onClick={() => start('watch')} style={{ flex: 1, background: mode === 'watch' ? ACCENT : PANEL, color: mode === 'watch' ? '#1a1408' : '#ddd', border: `1px solid ${ACCENT}`, borderRadius: 6, padding: '9px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>⏵ WATCH AI vs AI</button>
        </div>

        {!snap && <div style={{ color: DIM, fontSize: 13, textAlign: 'center', padding: 30 }}>Pick a mode to start a fight.</div>}

        {snap && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Battlefield */}
            <div>
              <div style={{ fontSize: 11, color: '#4a9', fontWeight: 700, marginBottom: 5 }}>YOUR SIDE (A)</div>
              {snap.A.map((u) => (
                <UnitCard key={u.uid} u={u} isActor={active?.uid === u.uid} isTarget={false} onPick={() => {}} />
              ))}
              <div style={{ fontSize: 11, color: '#a55', fontWeight: 700, margin: '8px 0 5px' }}>ENEMY (B)</div>
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
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 5 }}>Whose turn first? (you set the order)</div>
                  {snap.A.filter((u) => pool.includes(u.uid)).map((u) => (
                    <button key={u.uid} onClick={() => resolveRef.current(u.uid)} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 5, background: PANEL, border: `1px solid ${ACCENT}`, color: '#eee', borderRadius: 5, padding: '7px 9px', cursor: 'pointer', fontSize: 12 }}>
                      Act with <b>{u.name}</b> <span style={{ color: CHG }}>· chg {u.charge}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Choose-skill */}
              {(phase === 'choose-skill' || phase === 'choose-target') && active && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 5 }}>
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
                          display: 'block', width: '100%', textAlign: 'left', marginBottom: 5,
                          background: chosen ? '#1a1408' : PANEL,
                          border: `1px solid ${chosen ? ACCENT : usable ? LINE : '#1d1d28'}`,
                          color: usable ? '#eee' : '#555', borderRadius: 5, padding: '7px 9px',
                          cursor: usable ? 'pointer' : 'not-allowed', fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {sk.name} <span style={{ fontSize: 9, color: sk.kind === 'payoff' ? AMP : sk.kind === 'wildcard' ? BURN : DIM }}>· {sk.kind}</span>
                        </div>
                        <div style={{ fontSize: 10, color: usable ? DIM : '#444' }}>{sk.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {result && (
                <div style={{ background: PANEL, border: `1px solid ${WIN}`, borderRadius: 6, padding: 10, marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: WIN }}>{result.winner === 'A' ? 'You win!' : result.winner === 'B' ? 'AI wins' : 'Draw'}</div>
                  <div style={{ fontSize: 11, color: DIM }}>{result.rounds} rounds{result.cappedOut ? ' (round cap — most HP)' : ''}</div>
                </div>
              )}

              {/* Feed */}
              <div ref={feedBoxRef} style={{ background: '#0a0a12', border: `1px solid ${LINE}`, borderRadius: 6, padding: 8, maxHeight: 360, overflowY: 'auto' }}>
                {feed.length === 0 && <div style={{ fontSize: 11, color: '#444' }}>Battle log…</div>}
                {feed.map((f, i) => (
                  <div key={i} style={{
                    fontSize: 11, padding: '2px 0',
                    color: f.kind === 'round' ? ACCENT : f.kind === 'end' ? WIN : f.kind === 'burn' ? BURN : f.kind === 'regen' ? '#7ed321' : f.side === 'A' ? '#9cd' : '#d9a',
                    fontWeight: f.kind === 'round' || f.kind === 'end' ? 700 : 400,
                    borderTop: f.kind === 'round' ? `1px solid ${LINE}` : 'none', marginTop: f.kind === 'round' ? 4 : 0, paddingTop: f.kind === 'round' ? 4 : 2,
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
