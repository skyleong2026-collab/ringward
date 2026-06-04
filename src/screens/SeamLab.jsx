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

// Per-Type identity — color + shape + a plain-language nickname so a creature is
// recognizable by FEEL, not by name. `focal` crops the concept-art strip to one
// clear pose (these PNGs are wide turnaround sheets, ~4–7 poses each).
const TYPE_INFO = {
  Reactor: { glyph: '🔥', accent: BURN, nick: 'The Hothead', role: 'Powers up, then blows up.' },
  Bulwark: { glyph: '🛡', accent: '#7fd6ff', nick: 'The Wall', role: 'Soaks hits and guards the team.' },
  Mender: { glyph: '🌿', accent: WIN, nick: 'The Healer', role: 'Keeps the squad alive.' },
  Booster: { glyph: '✦', accent: AMP, nick: 'The Hype', role: 'Makes an ally hit way harder.' },
  Striker: { glyph: '⚔', accent: '#ffd166', nick: 'The Brawler', role: 'Fast — lots of quick hits.' },
  Assassin: { glyph: '🗡', accent: '#ff7a9c', nick: 'The Killer', role: 'Hunts and finishes the weak.' },
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
@keyframes seam-float { 0%{transform:translate(-50%,4px);opacity:0} 18%{opacity:1} 100%{transform:translate(-50%,-38px);opacity:0} }
@keyframes seam-hitring { 0%{transform:translate(-50%,-50%) scale(.5);opacity:.9} 100%{transform:translate(-50%,-50%) scale(1.7);opacity:0} }
`;

// Horizontal focal point (0–1) to crop ONE clear pose out of each wide turnaround
// sheet. Default leftmost works for most; override where a later pose reads better.
const FOCAL_X = {
  spark: 0.04, flicker: 0.04, cinder: 0.04,
  vault: 0.02, bastion: 0.02, bulwark: 0.02,
  link: 0.04, nexus: 0.04, conduit: 0.04,
  striker: 0.04, fang: 0.04, claw: 0.04,
};

// One creature, cropped big out of its concept-art strip and framed in its type
// color with a shape badge — so you read it by color + silhouette, not by name.
// Falls back to the big glyph if the PNG is missing.
function Sprite({ spriteId, color, glyph = '✦', anim = 'idle', facing = 1, size = 64 }) {
  const animCss = {
    idle: 'seam-idle 1.7s ease-in-out infinite',
    attack: 'seam-attack .5s ease-out',
    damaged: 'seam-damaged .45s ease-in-out',
    defeated: 'seam-defeated .7s ease-out forwards',
  }[anim] || 'seam-idle 1.7s ease-in-out infinite';
  const focal = (FOCAL_X[spriteId] ?? 0.04) * 100;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 14, overflow: 'hidden', position: 'relative', background: `radial-gradient(circle at 50% 38%, ${color}33 0%, #0b0b14 72%)`, border: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}44, inset 0 0 16px ${color}22` }}>
      {/* fallback glyph sits behind the art */}
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, opacity: 0.5 }}>{glyph}</span>
      <div style={{ position: 'absolute', inset: 0, transform: `scaleX(${facing})` }}>
        <div style={{ width: '100%', height: '100%', animation: animCss }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `url(/sprites/${spriteId}.png)`,
            backgroundSize: 'auto 122%',
            backgroundPosition: `${focal}% 38%`,
            backgroundRepeat: 'no-repeat',
          }} />
        </div>
      </div>
      {/* shape badge — the type's color + glyph, bottom-right */}
      <span style={{ position: 'absolute', right: 2, bottom: 1, fontSize: size * 0.26, filter: 'drop-shadow(0 1px 2px #000)' }}>{glyph}</span>
    </div>
  );
}

const KIND_COL = { payoff: AMP, wildcard: BURN, builder: DIM };

// A combatant on the arena stage: big animated sprite, HP/charge, status pips, and
// floating damage/heal numbers (popups) that pop on each hit.
function StageUnit({ u, anim, isActor, isTarget, onPick, popups, big }) {
  const dead = !u.alive;
  const ti = TYPE_INFO[u.type] || { accent: DIM, glyph: '✦' };
  const size = big ? 92 : 78;
  return (
    <div
      onClick={isTarget ? () => onPick(u.uid) : undefined}
      style={{
        position: 'relative', cursor: isTarget ? 'pointer' : 'default', textAlign: 'center',
        padding: '6px 6px 8px', borderRadius: 12, width: size + 26,
        border: `2px solid ${isTarget ? WIN : isActor ? ACCENT : 'transparent'}`,
        background: isTarget ? '#10261a66' : isActor ? '#1a140866' : 'transparent',
        boxShadow: isTarget ? `0 0 10px ${WIN}55` : 'none', opacity: dead ? 0.55 : 1, transition: 'opacity .3s',
      }}
    >
      {/* floating damage/heal numbers */}
      <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 0, pointerEvents: 'none', zIndex: 6 }}>
        {popups.map((p) => (
          <div key={p.id} style={{ position: 'absolute', left: '50%', fontSize: T.label, fontWeight: 900, color: p.color, textShadow: '0 1px 4px #000, 0 0 2px #000', animation: 'seam-float .95s ease-out forwards', whiteSpace: 'nowrap' }}>{p.text}</div>
        ))}
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {(anim === 'damaged') && <div style={{ position: 'absolute', top: '46%', left: '50%', width: size * 0.8, height: size * 0.8, borderRadius: '50%', border: `3px solid ${BURN}`, animation: 'seam-hitring .45s ease-out forwards', pointerEvents: 'none', zIndex: 4 }} />}
        <Sprite spriteId={u.spriteId} color={ti.accent} glyph={ti.glyph} anim={dead ? 'defeated' : (anim || 'idle')} facing={u.side === 'A' ? 1 : -1} size={size} />
      </div>
      <div style={{ fontSize: T.small, fontWeight: 800, color: '#eee', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {u.name}{isActor && <span style={{ color: ACCENT }}> ▶</span>}{isTarget && <span style={{ color: WIN }}> ◀</span>}
      </div>
      <div style={{ marginTop: 3 }}><Bar value={u.hp} max={u.maxHp} color={dead ? LOSS : u.side === 'A' ? '#3ec9a0' : '#e07a7a'} h={7} /></div>
      <div style={{ fontSize: T.micro, color: dead ? LOSS : '#aab', marginTop: 2, fontWeight: 700 }}>{dead ? 'KO' : `${u.hp}/${u.maxHp}`}</div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', minHeight: 15 }}>
        <span style={{ fontSize: T.micro, color: CHG, fontWeight: 700 }}>chg {u.charge}</span>
        {u.burn > 0 && <span style={{ fontSize: T.micro, color: BURN, fontWeight: 700 }}>🔥{u.burn}</span>}
        {u.block > 0 && <span style={{ fontSize: T.micro, color: '#7fd6ff', fontWeight: 700 }}>🛡{u.block}</span>}
        {u.regen > 0 && <span style={{ fontSize: T.micro, color: WIN, fontWeight: 700 }}>🌿{u.regen}</span>}
        {u.amp > 0 && <span style={{ fontSize: T.micro, color: AMP, fontWeight: 700 }}>✦{u.amp}</span>}
      </div>
    </div>
  );
}

let POP_ID = 0; // unique id for floating-number popups

// Floating numbers to spawn for one event (damage red, heal green, etc.).
function popupsForEvent(event) {
  const out = [];
  if (event.type === 'turn') {
    (event.hits || []).forEach((h) => { if (h.dmg > 0 || h.killed) out.push({ uid: h.uid, text: h.killed ? `−${h.dmg} KO` : `−${h.dmg}`, color: h.killed ? '#ff3b30' : '#ff8a6a' }); });
    (event.heals || []).forEach((h) => { if (h.healed > 0) out.push({ uid: h.uid, text: `+${h.healed}`, color: WIN }); });
    (event.amps || []).forEach((a) => out.push({ uid: a.uid, text: `✦${a.amp}`, color: AMP }));
  } else if (event.type === 'burn') out.push({ uid: event.target.uid, text: `−${event.dmg}🔥`, color: BURN });
  else if (event.type === 'regen') out.push({ uid: event.target.uid, text: `+${event.healed}🌿`, color: WIN });
  return out;
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
  const [popups, setPopups] = useState([]); // floating damage/heal numbers

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
    const adds = popupsForEvent(event).map((a) => ({ ...a, id: ++POP_ID }));
    if (adds.length) {
      setPopups((p) => [...p, ...adds].slice(-50));
      adds.forEach((a) => setTimeout(() => setPopups((p) => p.filter((x) => x.id !== a.id)), 950));
    }
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
    feedRef.current = []; setFeed([]); setActive(null); setPendingSkill(null); setPool([]); setPopups([]); setFx({ actor: null, hits: [] });
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
  function reset() { setSnap(null); setFeed([]); feedRef.current = []; setPhase('idle'); setActive(null); setPendingSkill(null); setFx({ actor: null, hits: [] }); setPopups([]); }

  return { snap, feed, phase, pool, active, pendingSkill, fx, popups, feedBoxRef, resolveRef, pickSkill, pickTarget, begin, reset };
}

// ── FightView — the shared battlefield + controls + feed for a live battle. ──
function FightView({ fight, narrow, banner }) {
  const { snap, feed, phase, pool, active, fx, popups, feedBoxRef, resolveRef, pickSkill, pickTarget } = fight;
  if (!snap) return null;
  const legal = active?.legal ?? [];
  const enemyUids = active?.enemyUids ?? [];
  const animOf = (u) => !u.alive ? 'defeated' : fx.actor === u.uid ? 'attack' : (fx.hits || []).includes(u.uid) ? 'damaged' : 'idle';
  const popsFor = (uid) => popups.filter((p) => p.uid === uid);
  const side = (units, isEnemy) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: T.small, color: isEnemy ? '#e07a7a' : '#3ec9a0', fontWeight: 800, letterSpacing: 1 }}>{isEnemy ? 'ENEMY' : 'YOUR SQUAD'}</div>
      {units.map((u) => (
        <StageUnit key={u.uid} u={u} anim={animOf(u)} big={units.length <= 2}
          isActor={active?.uid === u.uid}
          isTarget={isEnemy && phase === 'choose-target' && u.alive && enemyUids.includes(u.uid)}
          onPick={pickTarget} popups={popsFor(u.uid)} />
      ))}
    </div>
  );
  return (
    <div>
      {/* The arena: your squad faces the enemy */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6, background: 'radial-gradient(ellipse at center, #14141f 0%, #0b0b14 100%)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px 8px', marginBottom: 14, minHeight: 210 }}>
        {side(snap.A, false)}
        <div style={{ alignSelf: 'center', color: DIM, fontWeight: 900, fontSize: T.head, opacity: 0.5 }}>VS</div>
        {side(snap.B, true)}
      </div>
      {/* Controls + log below the arena */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
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
        </div>
        <div>
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
                <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <Sprite spriteId={c.spriteId} color={ti.accent} glyph={ti.glyph} anim="idle" size={68} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: T.label, fontWeight: 900, color: ti.accent }}>{ti.glyph} {ti.nick}</span>
                      {on && <span style={{ marginLeft: 'auto', fontSize: T.body, color: SEL, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: T.small, color: on ? '#eaf2ff' : '#cfcfda', fontWeight: 700, margin: '1px 0 3px' }}>{c.name} <span style={{ fontSize: T.micro, color: DIM, fontWeight: 700 }}>· {c.type}</span></div>
                    <div style={{ fontSize: T.micro, color: DIM }}>HP {c.hp} · ATK {c.atk} · SPD {c.speed}</div>
                  </div>
                </div>
                <div style={{ fontSize: T.small, color: on ? '#cdd8e4' : '#9a9aaa', lineHeight: 1.4, marginTop: 7 }}>{ti.role}</div>
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

// Marrow's coaching line — the gradual-teaching voice.
function CoachBar({ text }) {
  return (
    <div style={{ background: '#15100a', border: `2px solid ${ACCENT}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: T.sub }}>🗣️</span>
      <div>
        <div style={{ fontSize: T.micro, color: ACCENT, fontWeight: 800, letterSpacing: 1 }}>MARROW</div>
        <div style={{ fontSize: T.body, color: '#f0e2cc', lineHeight: 1.45, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}

// ── LEARN — a guided first fight: one creature, one harmless target, Marrow
// walking you through the charge loop and tying the creature's LOOK to its moves. ──
function LearnMode({ narrow, onGraduate }) {
  const fight = useFight();
  const [stage, setStage] = useState('intro'); // intro | fight | won
  const ti = TYPE_INFO.Reactor;

  function start() {
    const cre = COMBAT_CREATURES.cinderpaw;
    const you = [{ ...cre, temperament: 'Balanced', maxHp: cre.hp, hp: cre.hp }];
    const dummy = { ...COMBAT_CREATURES.glowtail, name: 'Straw Target', spriteId: 'flicker', hp: 90, maxHp: 90, atk: 6, speed: 1 };
    fight.begin(you, [dummy], 11, 'play', () => setStage('won'));
    setStage('fight');
  }

  if (stage === 'intro') {
    return (
      <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto', paddingTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <Sprite spriteId="cinder" color={ti.accent} glyph={ti.glyph} size={130} />
        </div>
        <div style={{ fontSize: T.head, fontWeight: 900, color: ti.accent }}>{ti.glyph} The Hothead</div>
        <div style={{ fontSize: T.body, color: '#cfcfda', lineHeight: 1.6, margin: '12px 0 18px' }}>
          Meet <b style={{ color: '#eee' }}>Cinderpaw</b>. It's wrapped in flame — so everything it does is fire: it <b style={{ color: BURN }}>Burns</b> enemies, then <b style={{ color: AMP }}>Overloads</b> for a huge hit. <i>A creature's look tells you what it does.</i>
          <br /><br />
          One rule runs the whole game: small moves <b>build ⚡charge</b>, then you <b>spend it</b> on a big one. Let's try it on a straw target — no danger.
        </div>
        <button onClick={start} style={{ width: '100%', padding: '15px 0', border: 'none', borderRadius: 12, background: ACCENT, color: '#1a1408', fontSize: T.sub, fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }}>TEACH ME →</button>
      </div>
    );
  }

  const charge = fight.snap?.A?.[0]?.charge ?? 0;
  let tip;
  if (stage === 'won') tip = "That's the whole game in one move: build ⚡charge, then spend it big. Each of the six creatures plays this way — and its LOOK tells you its flavor. Ready for a real run?";
  else if (fight.phase === 'choose-target') tip = 'Now tap the enemy to land it.';
  else if (fight.phase === 'choose-skill') tip = charge >= 2
    ? "You've banked ⚡charge — pick OVERLOAD to dump it all into one big fire hit. (Hits even harder on a Burning 🔥 target.)"
    : 'Pick CHARGE UP — it fills your ⚡charge a little and sets the enemy on fire 🔥. Do it a couple times to bank charge.';
  else tip = 'Watch the meter under Cinderpaw — that orange bar is ⚡charge.';

  const banner = (
    <div>
      <CoachBar text={tip} />
      {stage === 'won' && <button onClick={onGraduate} style={{ width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, background: WIN, color: '#06120a', fontSize: T.body, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', marginBottom: 12 }}>START A REAL RUN →</button>}
    </div>
  );
  return <FightView fight={fight} narrow={narrow} banner={banner} />;
}

export function SeamLab({ onClose }) {
  const vw = useViewport();
  const narrow = vw < 760;
  const [tab, setTab] = useState('learn'); // 'learn' | 'run' | 'sandbox'

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
          {tabBtn('learn', '🎓 LEARN')}
          {tabBtn('run', '⚔ RUN')}
          {tabBtn('sandbox', '🔬 Sandbox')}
        </div>
        {tab === 'learn' ? <LearnMode narrow={narrow} onGraduate={() => setTab('run')} /> : tab === 'run' ? <RunMode narrow={narrow} /> : <Sandbox narrow={narrow} />}
      </div>
    </div>
  );
}

export default SeamLab;
