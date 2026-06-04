// SeamLab.jsx — the §26 ENGINE SEAM proving ground.
//
// The ONE surface wired to the NEW manual-combat engine (src/engine/combat). It is
// deliberately separate from ReactorSandbox.jsx and shares nothing with
// battleStepEngine.js / resolveBattle. Two top-level modes:
//   • ⚔ RUN     — pick your own squad, fight 3 escalating waves; HP carries between
//                 fights, you patch up between them, win the run or get wiped.
//   • 🔬 SANDBOX — the original fixed matchups: PLAY one, or WATCH AI-vs-AI replay a
//                 blessed golden. Kept as the per-Type showcase + verification surface.
//
// One engine, two drivers: the human driver awaits these clicks; the AI driver answers
// instantly. The same <FightView> + useFight() power both modes.

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
  COMBAT_CREATURES,
  COMBAT_ROSTER,
} from '../engine/combat/index.js';

const ACCENT = '#e8a040';
const CHG = '#f5a623';
const BURN = '#ff5a2a';
const AMP = '#b06bff';
const WIN = '#7ed321';
const LOSS = '#d0021b';
const DIM = '#8a8a9a';
const PANEL = '#12121c';
const LINE = '#2a2a3a';
const SEL = '#9cd1ff';
const T = { micro: 11, small: 13, body: 15, label: 16, sub: 18, head: 21, huge: 30 };
const PATCHUP = 0.3; // between-wave heal (fraction of max HP)

// Per-Type identity used across the picker + waves.
const TYPE_INFO = {
  Reactor: { glyph: '⚡', accent: BURN, role: 'Charge up, then Overload — ×2 on a Burning target.' },
  Bulwark: { glyph: '🛡', accent: '#7fd6ff', role: 'Banks charge into block — shields the whole line.' },
  Mender: { glyph: '🌿', accent: WIN, role: 'Heals and lays regen — wins by outlasting.' },
  Booster: { glyph: '✦', accent: AMP, role: "Stacks Amp on an ally — doubles someone else's hits." },
  Striker: { glyph: '⟡', accent: '#ffd166', role: 'Many fast hits + a first-strike Blitz bonus.' },
  Assassin: { glyph: '☠', accent: '#ff7a9c', role: 'Hunts the weakest — Execute spikes ×2.5 on the wounded.' },
};

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

// ── Three escalating enemy waves (fresh each fight). ──
const WAVES = [
  { name: 'Scouts', blurb: 'A pair of jumpy Reactors. Warm up.', seed: 101,
    enemies: () => [makeUnitDef('glowtail', 'Balanced'), makeUnitDef('fizzpop', 'Balanced')] },
  { name: 'The Pack', blurb: 'A Striker backed by a Mender — kill the healer first.', seed: 202,
    enemies: () => [makeUnitDef('swiftpaw', 'Balanced'), makeUnitDef('mossback', 'Balanced')] },
  { name: 'The Warden', blurb: 'A Bulwark wall guarding an Assassin. Break through.', seed: 303,
    enemies: () => [makeUnitDef('stoneward', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')] },
];

// Sandbox matchups, each pinned to a blessed golden seed so WATCH reproduces a fight.
const MATCHUPS = {
  mirror: { label: 'Reactor mirror', glyph: '⚡', accent: BURN, seed: 1337,
    desc: 'Two charge-and-nuke squads trade Overloads — the baseline fight.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')] },
  bulwark: { label: 'Bulwark wall', glyph: '🛡', accent: '#7fd6ff', seed: 4242,
    desc: 'Reactors batter a shielded wall — block soaks damage before HP.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')],
    b: () => [makeUnitDef('stoneward', 'Balanced'), makeUnitDef('ironwall', 'Balanced')] },
  mender: { label: 'Mender sustain', glyph: '🌿', accent: WIN, seed: 7777,
    desc: 'A Mender out-heals the burst — win by outlasting, not out-damaging.',
    a: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced'), makeUnitDef('mossback', 'Balanced')],
    b: () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')] },
  booster: { label: 'Booster combo', glyph: '✦', accent: AMP, seed: 9001,
    desc: 'A Booster stacks Amp (⚡) on its carry, then the buffed hit lands huge.',
    a: () => [makeUnitDef('buzzline', 'Greedy'), makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('cinderpaw', 'Balanced')],
    b: () => [makeUnitDef('glowtail', 'Greedy'), makeUnitDef('cinderpaw', 'Greedy')] },
  striker: { label: 'Striker tempo', glyph: '⟡', accent: '#ffd166', seed: 7,
    desc: 'Fast Strikers — one Flurry is a barrage of hits in a single turn.',
    a: () => [makeUnitDef('swiftpaw', 'Greedy'), makeUnitDef('dartwing', 'Greedy')],
    b: () => [makeUnitDef('shadefang', 'Greedy'), makeUnitDef('veilclaw', 'Greedy')] },
  assassin: { label: 'Assassin hunt', glyph: '☠', accent: '#ff7a9c', seed: 7,
    desc: 'Glass cannons hunt the weakest — Execute spikes ×2.5 on the wounded.',
    a: () => [makeUnitDef('shadefang', 'Balanced'), makeUnitDef('veilclaw', 'Balanced')],
    b: () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')] },
};

// A player creature carried through a run, with separate maxHp so wounds persist.
function playerDef(member) {
  const base = COMBAT_CREATURES[member.id];
  return { ...base, temperament: 'Balanced', maxHp: base.hp, hp: member.hp };
}

// ── Friendly feed line from a raw engine event (the engine emits pure data). ──
function feedLine(e) {
  if (e.type === 'round-start') return { kind: 'round', text: `Round ${e.round} — ${e.firstSide} side moves first` };
  if (e.type === 'battle-end') return { kind: 'end', text: `${e.winner === 'draw' ? 'Draw' : e.winner + ' wins'} — ${e.rounds} rounds` };
  if (e.type === 'burn') return { kind: 'burn', text: `${e.target.name} burns for ${e.dmg}${e.killed ? ' — KO' : ''} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  if (e.type === 'regen') return { kind: 'regen', text: `${e.target.name} regenerates +${e.healed} (${e.stacksLeft} stack${e.stacksLeft === 1 ? '' : 's'} left)` };
  const hits = (e.hits || []).filter((h) => h.dmg > 0 || h.killed).map((h) => `${h.dmg} → ${h.name}${h.killed ? ' (KO)' : ''}`).join(', ');
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
    uid: u.uid, name: u.name, side: u.side, spriteId: u.spriteId, type: u.type,
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

// Battle animation keyframes (injected once at the SeamLab root).
const FX_STYLE = `
@keyframes seam-idle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes seam-attack { 0%{transform:translateX(0) scale(1)} 45%{transform:translateX(11px) scale(1.09)} 100%{transform:translateX(0) scale(1)} }
@keyframes seam-damaged { 0%,100%{filter:none;opacity:1} 30%{filter:drop-shadow(0 0 9px rgba(255,70,45,.95));opacity:.65} }
@keyframes seam-defeated { 0%{transform:scaleY(1) rotate(0);opacity:1} 100%{transform:scaleY(.22) rotate(7deg);opacity:.3} }
`;

// A creature sprite (public/sprites/{spriteId}.png) with a battle animation. Falls
// back to a colored glyph disc if the PNG is missing.
function Sprite({ spriteId, color, glyph = '✦', anim = 'idle', facing = 1, size = 64 }) {
  const animCss = {
    idle: 'seam-idle 1.7s ease-in-out infinite',
    attack: 'seam-attack .5s ease-out',
    damaged: 'seam-damaged .45s ease-in-out',
    defeated: 'seam-defeated .7s ease-out forwards',
  }[anim] || 'seam-idle 1.7s ease-in-out infinite';
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 10, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg,#1a1a2a,#0c0c16)', border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 42%, ${color}26, transparent 70%)` }} />
      <span style={{ position: 'absolute', fontSize: size * 0.34, color: `${color}55` }}>{glyph}</span>
      <div style={{ width: '100%', height: '100%', transform: `scaleX(${facing})`, position: 'relative' }}>
        <img src={`/sprites/${spriteId}.png`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, animation: animCss }} />
      </div>
    </div>
  );
}

const KIND_COL = { payoff: AMP, wildcard: BURN, builder: DIM };

function UnitCard({ u, isTarget, isActor, anim, onPick }) {
  const dead = !u.alive;
  const ti = TYPE_INFO[u.type] || { accent: DIM, glyph: '✦' };
  return (
    <button
      onClick={isTarget ? () => onPick(u.uid) : undefined}
      disabled={!isTarget}
      style={{
        textAlign: 'left', width: '100%', cursor: isTarget ? 'pointer' : 'default',
        background: isTarget ? '#10261a' : isActor ? '#1a1408' : PANEL,
        border: `2px solid ${isTarget ? WIN : isActor ? ACCENT : LINE}`,
        borderRadius: 11, padding: '10px 12px', opacity: dead ? 0.45 : 1, marginBottom: 9,
        boxShadow: isTarget ? `0 0 0 1px ${WIN}55` : 'none',
        display: 'flex', gap: 11, alignItems: 'stretch',
      }}
    >
      <Sprite spriteId={u.spriteId} color={ti.accent} glyph={ti.glyph} anim={dead ? 'defeated' : (anim || 'idle')} facing={u.side === 'A' ? 1 : -1} size={66} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: T.label, fontWeight: 800, color: '#eee' }}>
            {u.name}
            {isActor && <span style={{ color: ACCENT, fontSize: T.small, marginLeft: 7, fontWeight: 700 }}>▶ TURN</span>}
            {isTarget && <span style={{ color: WIN, fontSize: T.small, marginLeft: 7, fontWeight: 700 }}>◀ TAP</span>}
          </span>
          <span style={{ fontSize: T.body, fontWeight: 700, color: dead ? LOSS : '#cfcfda' }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</span>
        </div>
        <Bar value={u.hp} max={u.maxHp} color={dead ? LOSS : u.side === 'A' ? '#3ec9a0' : '#e07a7a'} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 7 }}>
          <span style={{ fontSize: T.small, color: CHG, fontWeight: 700, minWidth: 60 }}>chg {u.charge}/{u.maxCharge}</span>
          <div style={{ flex: 1 }}><Bar value={u.charge} max={u.maxCharge} color={CHG} h={6} /></div>
        </div>
        {(u.burn > 0 || u.block > 0 || u.regen > 0 || u.amp > 0) && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            {u.burn > 0 && <span style={{ fontSize: T.small, color: BURN, fontWeight: 700 }}>🔥 {u.burn}</span>}
            {u.block > 0 && <span style={{ fontSize: T.small, color: '#7fd6ff', fontWeight: 700 }}>🛡 {u.block}</span>}
            {u.regen > 0 && <span style={{ fontSize: T.small, color: WIN, fontWeight: 700 }}>🌿 {u.regen}</span>}
            {u.amp > 0 && <span style={{ fontSize: T.small, color: AMP, fontWeight: 700 }}>⚡ {u.amp}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

// ── useFight — one battle's UI state + the human-driver promise machinery. ──
function useFight() {
  const [snap, setSnap] = useState(null);
  const [feed, setFeed] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | choose-actor | choose-skill | choose-target | done
  const [pool, setPool] = useState([]);
  const [active, setActive] = useState(null);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [fx, setFx] = useState({ actor: null, hits: [] }); // who's attacking / getting hit, for sprite anims

  const stateRef = useRef(null);
  const actorObjRef = useRef(null);
  const resolveRef = useRef(null);
  const feedRef = useRef([]);
  const feedBoxRef = useRef(null);
  const onDoneRef = useRef(null);

  useEffect(() => { if (feedBoxRef.current) feedBoxRef.current.scrollTop = feedBoxRef.current.scrollHeight; }, [feed]);

  function emit(event) {
    feedRef.current = [...feedRef.current, feedLine(event)];
    setFeed(feedRef.current);
    if (event.type === 'turn') setFx({ actor: event.actor.uid, hits: (event.hits || []).filter((h) => h.dmg > 0 || h.killed).map((h) => h.uid) });
    else if (event.type === 'burn') setFx({ actor: null, hits: [event.target.uid] });
    if (stateRef.current) setSnap(snapshot(stateRef.current));
  }
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
      setActive({ uid: actor.uid, name: actor.name, skillIds: actor.skillIds.slice(), legal: legalSkills(actor, state).map((s) => s.id), enemyUids: enemiesOf(state, actor).map((u) => u.uid) });
      setPhase('choose-skill');
      resolveRef.current = (decision) => { setPhase('idle'); setActive(null); setPendingSkill(null); resolve(decision); };
    });
  }
  function pickSkill(skillId) {
    const skill = getSkill(skillId);
    if (skill.targetMode === 'allEnemies' || skill.targetMode === 'allAllies' || skill.targetMode === 'ally') {
      // No enemy target to tap — resolve immediately (engine selectors pick allies).
      const actor = actorObjRef.current;
      const targetIds = skill.targetMode === 'allEnemies' ? enemiesOf(stateRef.current, actor).map((u) => u.uid) : [];
      resolveRef.current({ skillId, targetIds });
      return;
    }
    setPendingSkill(skillId);
    setPhase('choose-target');
  }
  function pickTarget(uid) { resolveRef.current({ skillId: pendingSkill, targetIds: [uid] }); }

  function begin(aDefs, bDefs, seed, mode, onComplete) {
    feedRef.current = []; setFeed([]); setActive(null); setPendingSkill(null); setPool([]);
    onDoneRef.current = onComplete || null;
    const state = createBattleState(aDefs, bDefs, seed);
    stateRef.current = state;
    setSnap(snapshot(state));
    setPhase('idle');
    const drivers = mode === 'watch'
      ? { A: createAIDriver(), B: createAIDriver() }
      : { A: createHumanDriver({ requestActor, requestDecision }), B: createAIDriver() };
    runBattle(state, drivers, emit).then((res) => { setPhase('done'); if (onDoneRef.current) onDoneRef.current(res, state); });
  }
  function reset() { setSnap(null); setFeed([]); feedRef.current = []; setPhase('idle'); setActive(null); setPendingSkill(null); setFx({ actor: null, hits: [] }); }

  return { snap, feed, phase, pool, active, pendingSkill, fx, feedBoxRef, resolveRef, pickSkill, pickTarget, begin, reset };
}

// ── FightView — the shared battlefield + controls + feed for a live battle. ──
function FightView({ fight, narrow, banner }) {
  const { snap, feed, phase, pool, active, fx, feedBoxRef, resolveRef, pickSkill, pickTarget } = fight;
  if (!snap) return null;
  const legal = active?.legal ?? [];
  const enemyUids = active?.enemyUids ?? [];
  const animOf = (u) => !u.alive ? 'defeated' : fx.actor === u.uid ? 'attack' : (fx.hits || []).includes(u.uid) ? 'damaged' : 'idle';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: T.small, color: '#3ec9a0', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>YOUR SIDE (A)</div>
        {snap.A.map((u) => <UnitCard key={u.uid} u={u} anim={animOf(u)} isActor={active?.uid === u.uid} isTarget={false} onPick={() => {}} />)}
        <div style={{ fontSize: T.small, color: '#e07a7a', fontWeight: 800, letterSpacing: 1, margin: '14px 0 8px' }}>ENEMY (B)</div>
        {snap.B.map((u) => (
          <UnitCard key={u.uid} u={u} anim={animOf(u)} isActor={active?.uid === u.uid}
            isTarget={phase === 'choose-target' && u.alive && enemyUids.includes(u.uid)} onPick={pickTarget} />
        ))}
      </div>
      <div>
        {banner}
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
        {(phase === 'choose-skill' || phase === 'choose-target') && active && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: T.body, color: ACCENT, fontWeight: 800, marginBottom: 8 }}>
              {active.name}: pick a skill{phase === 'choose-target' ? ' → now tap a target enemy' : ''}
            </div>
            {active.skillIds.map((sid) => {
              const sk = getSkill(sid);
              const usable = legal.includes(sid);
              const chosen = fight.pendingSkill === sid;
              return (
                <button key={sid} onClick={usable ? () => pickSkill(sid) : undefined} disabled={!usable}
                  style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, background: chosen ? '#1a1408' : PANEL, border: `2px solid ${chosen ? ACCENT : usable ? LINE : '#1d1d28'}`, color: usable ? '#eee' : '#555', borderRadius: 10, padding: '12px 14px', cursor: usable ? 'pointer' : 'not-allowed' }}>
                  <div style={{ fontSize: T.label, fontWeight: 800 }}>{sk.name} <span style={{ fontSize: T.small, color: usable ? KIND_COL[sk.kind] : '#444', fontWeight: 700 }}>· {sk.kind}</span></div>
                  <div style={{ fontSize: T.small, color: usable ? DIM : '#444', lineHeight: 1.45, marginTop: 3 }}>{sk.blurb}</div>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>BATTLE LOG</div>
        <div ref={feedBoxRef} style={{ background: '#0a0a12', border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, maxHeight: narrow ? 300 : 440, overflowY: 'auto' }}>
          {feed.length === 0 && <div style={{ fontSize: T.body, color: '#555' }}>Battle log…</div>}
          {feed.map((f, i) => (
            <div key={i} style={{ fontSize: T.body, padding: '3px 0', lineHeight: 1.5,
              color: f.kind === 'round' ? ACCENT : f.kind === 'end' ? WIN : f.kind === 'burn' ? BURN : f.kind === 'regen' ? WIN : f.side === 'A' ? '#9cd' : '#e0a0b8',
              fontWeight: f.kind === 'round' || f.kind === 'end' ? 800 : 500,
              borderTop: f.kind === 'round' ? `1px solid ${LINE}` : 'none', marginTop: f.kind === 'round' ? 6 : 0, paddingTop: f.kind === 'round' ? 6 : 3 }}>{f.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RUN MODE — squad pick → 3 waves, HP carries, win or wipe. ──
function RunMode({ narrow }) {
  const fight = useFight();
  const [runPhase, setRunPhase] = useState('pick'); // pick | fighting | cleared | won | lost
  const [picked, setPicked] = useState([]); // creature ids (2–3)
  const [squad, setSquad] = useState([]); // [{id, hp, maxHp}] persistent across waves
  const [waveIdx, setWaveIdx] = useState(0);

  function toggle(id) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p);
  }

  function startWave(idx, sq) {
    const fielded = sq.map((m, i) => i).filter((i) => sq[i].hp > 0);
    const aDefs = fielded.map((i) => playerDef(sq[i]));
    fight.begin(aDefs, WAVES[idx].enemies(), WAVES[idx].seed, 'play', (res, finalState) => {
      const next = sq.map((m) => ({ ...m }));
      fielded.forEach((mi, i) => { next[mi].hp = finalState.units.A[i].hp; });
      setSquad(next);
      const youLive = next.some((m) => m.hp > 0) && finalState.units.A.some((u) => u.hp > 0);
      if (!youLive || res.winner === 'B') setRunPhase('lost');
      else if (idx === WAVES.length - 1) setRunPhase('won');
      else setRunPhase('cleared');
    });
    setWaveIdx(idx);
    setRunPhase('fighting');
  }

  function startRun() {
    const sq = picked.map((id) => ({ id, hp: COMBAT_CREATURES[id].hp, maxHp: COMBAT_CREATURES[id].hp }));
    setSquad(sq);
    startWave(0, sq);
  }
  function continueRun() {
    const patched = squad.map((m) => m.hp > 0 ? { ...m, hp: Math.min(m.maxHp, m.hp + Math.round(m.maxHp * PATCHUP)) } : m);
    setSquad(patched);
    startWave(waveIdx + 1, patched);
  }
  function newRun() { fight.reset(); setRunPhase('pick'); setPicked([]); setSquad([]); setWaveIdx(0); }

  // ── Squad picker ──
  if (runPhase === 'pick') {
    return (
      <div>
        <div style={{ background: '#15100a', border: `1px solid ${ACCENT}55`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: T.sub, color: ACCENT, fontWeight: 900, letterSpacing: 0.5 }}>⛰ TAKE THE APPROACH</div>
          <div style={{ fontSize: T.small, color: '#d8c4a8', lineHeight: 1.5, marginTop: 4 }}>
            Three packs guard the edge of the ring — Scouts, then the Pack, then the Warden. Clear all three in one push and the approach is yours. Your squad's wounds carry between fights; you only patch up a little. Choose who goes in.
          </div>
        </div>
        <div style={{ fontSize: T.body, color: '#ddd', fontWeight: 700, marginBottom: 10 }}>Pick <b style={{ color: ACCENT }}>2–3</b> creatures <span style={{ color: DIM, fontWeight: 600 }}>({picked.length} chosen)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          {COMBAT_ROSTER.map((c) => {
            const ti = TYPE_INFO[c.type];
            const on = picked.includes(c.id);
            const full = !on && picked.length >= 3;
            return (
              <button key={c.id} onClick={() => toggle(c.id)} disabled={full}
                style={{ textAlign: 'left', cursor: full ? 'not-allowed' : 'pointer', borderRadius: 12, padding: '11px 12px',
                  background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`, opacity: full ? 0.4 : 1, boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: T.label, fontWeight: 800, color: on ? '#eaf2ff' : '#ddd' }}>{c.name}</span>
                      {on && <span style={{ marginLeft: 'auto', fontSize: T.body, color: SEL, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: T.micro, color: ti.accent, fontWeight: 700, letterSpacing: 1, margin: '2px 0 4px' }}>{ti.glyph} {c.type.toUpperCase()}</div>
                    <div style={{ fontSize: T.micro, color: DIM }}>HP {c.hp} · ATK {c.atk} · SPD {c.speed}</div>
                  </div>
                </div>
                <div style={{ fontSize: T.small, color: on ? '#b9c6d6' : '#8f8f9f', lineHeight: 1.4, marginTop: 7 }}>{ti.role}</div>
              </button>
            );
          })}
        </div>
        <button onClick={startRun} disabled={picked.length < 2}
          style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: picked.length >= 2 ? ACCENT : '#222', color: picked.length >= 2 ? '#1a1408' : '#555', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: picked.length >= 2 ? 'pointer' : 'default' }}>
          {picked.length < 2 ? 'PICK AT LEAST 2' : `START RUN — ${picked.length} creatures →`}
        </button>
      </div>
    );
  }

  // ── In a run: progress bar + the fight (+ result banner). ──
  const wave = WAVES[waveIdx];
  const banner = (() => {
    if (runPhase === 'cleared') return (
      <div style={{ background: '#0d1a0d', border: `2px solid ${WIN}`, borderRadius: 12, padding: 16, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.sub, fontWeight: 900, color: WIN }}>Wave {waveIdx + 1} cleared!</div>
        <div style={{ fontSize: T.small, color: DIM, margin: '4px 0 12px' }}>Your squad patches up (+{Math.round(PATCHUP * 100)}% HP). Next: <b style={{ color: '#ddd' }}>{WAVES[waveIdx + 1].name}</b></div>
        <button onClick={continueRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEXT WAVE →</button>
      </div>
    );
    if (runPhase === 'won') return (
      <div style={{ background: '#0d1a0d', border: `2px solid ${WIN}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: WIN }}>RUN CLEARED</div>
        <div style={{ fontSize: T.body, color: DIM, margin: '4px 0 12px' }}>You survived all 3 waves.</div>
        <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
      </div>
    );
    if (runPhase === 'lost') return (
      <div style={{ background: '#1a0d0d', border: `2px solid ${LOSS}`, borderRadius: 12, padding: 18, marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: T.huge, fontWeight: 900, color: LOSS }}>SQUAD DOWN</div>
        <div style={{ fontSize: T.body, color: DIM, margin: '4px 0 12px' }}>Wiped on {wave.name} (wave {waveIdx + 1}).</div>
        <button onClick={newRun} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: ACCENT, color: '#1a1408', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>NEW RUN →</button>
      </div>
    );
    return null;
  })();

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {WAVES.map((w, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < waveIdx || runPhase === 'won' ? WIN : i === waveIdx ? ACCENT : '#26263a' }} />
        ))}
      </div>
      <div style={{ fontSize: T.small, color: DIM, marginBottom: 12 }}>
        <b style={{ color: '#ddd' }}>Wave {waveIdx + 1}/3 · {wave.name}</b> — {wave.blurb}
      </div>
      <FightView fight={fight} narrow={narrow} banner={banner} />
    </div>
  );
}

// ── SANDBOX — fixed matchups; PLAY one or WATCH the golden replay. ──
function Sandbox({ narrow }) {
  const fight = useFight();
  const [matchup, setMatchup] = useState('mirror');
  const cfg = MATCHUPS[matchup];
  const [mode, setMode] = useState(null);

  function start(which) { setMode(which); const { a, b, seed } = MATCHUPS[matchup]; fight.begin(a(), b(), seed, which); }

  const modeBtn = (which, glyph, title, sub) => (
    <button onClick={() => start(which)} style={{ flex: 1, background: mode === which ? ACCENT : PANEL, color: mode === which ? '#1a1408' : '#eee', border: `2px solid ${ACCENT}`, borderRadius: 12, padding: narrow ? '14px 10px' : '16px 14px', cursor: 'pointer', textAlign: 'center' }}>
      <div style={{ fontSize: T.sub, fontWeight: 800 }}>{glyph} {title}</div>
      <div style={{ fontSize: T.small, marginTop: 3, opacity: 0.85, fontWeight: 600 }}>{sub}</div>
    </button>
  );

  const banner = fight.phase === 'done' && (
    <div style={{ background: PANEL, border: `2px solid ${WIN}`, borderRadius: 12, padding: 14, marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: T.sub, fontWeight: 800, color: WIN }}>Fight over</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: T.small, color: DIM, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PICK A FIGHT</div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {Object.entries(MATCHUPS).map(([m, c]) => {
          const on = matchup === m;
          return (
            <button key={m} onClick={() => setMatchup(m)} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '13px 14px', background: on ? '#16202e' : PANEL, border: `2px solid ${on ? SEL : LINE}`, boxShadow: on ? `0 0 0 1px ${SEL}44` : 'none' }}>
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {modeBtn('play', '▶', 'PLAY', 'you drive side A vs the AI')}
        {modeBtn('watch', '⏵', 'WATCH', 'AI vs AI — replays the golden')}
      </div>
      {!fight.snap
        ? <div style={{ color: DIM, fontSize: T.body, textAlign: 'center', padding: '32px 16px', background: PANEL, border: `1px dashed ${LINE}`, borderRadius: 12 }}>
            <div style={{ fontSize: T.sub, color: '#bbb', fontWeight: 700, marginBottom: 6 }}>{cfg.glyph} {cfg.label}</div>
            <div style={{ lineHeight: 1.5, maxWidth: 460, margin: '0 auto' }}>{cfg.desc}</div>
            <div style={{ marginTop: 14, color: ACCENT, fontWeight: 700 }}>Press PLAY or WATCH to start.</div>
          </div>
        : <FightView fight={fight} narrow={narrow} banner={banner} />}
    </div>
  );
}

export function SeamLab({ onClose }) {
  const vw = useViewport();
  const narrow = vw < 760;
  const [tab, setTab] = useState('run'); // 'run' | 'sandbox'

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ background: tab === key ? '#16202e' : PANEL, color: tab === key ? '#eaf2ff' : '#999', border: `2px solid ${tab === key ? SEL : LINE}`, borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontSize: T.body, fontWeight: 800 }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,12,0.98)', zIndex: 9999, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{FX_STYLE}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: narrow ? '14px 12px 48px' : '18px 18px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: T.head, fontWeight: 800, color: ACCENT, letterSpacing: 0.5 }}>⚙ ENGINE SEAM · §26</div>
            <div style={{ fontSize: T.small, color: DIM, marginTop: 2 }}>Manual turn-by-turn — one engine, two drivers. Additive; resolveBattle untouched.</div>
          </div>
          <button onClick={onClose} style={{ background: PANEL, border: `1px solid ${LINE}`, color: '#ccc', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: T.body, fontWeight: 700 }}>✕ Close</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {tabBtn('run', '⚔ RUN')}
          {tabBtn('sandbox', '🔬 Sandbox')}
        </div>
        {tab === 'run' ? <RunMode narrow={narrow} /> : <Sandbox narrow={narrow} />}
      </div>
    </div>
  );
}

export default SeamLab;
