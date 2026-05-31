import { useEffect, useRef, useState } from 'react';
import { ARCHETYPES } from '../data/creatures.js';
import { SPARK_DETONATE_THRESHOLD } from '../engine/battleStepEngine.js';

// ─── §19 / §19.6 — Spatial view + intervention layer ─────────────────────────
// Pure view over the deterministic event log. No combat math here.
// vSP-A: orient/lunge/recoil beams, Spark swell/ARMED/detonate, posture, collapse.
// vSP-B: Anchor lock visual, anchored-skip beat, Echo pulse lines, label polish.

const PLAYER_X = 22;
const ENEMY_X = 78;

function slotY(i, n) {
  if (n <= 1) return 50;
  return 18 + (64 * i) / (n - 1);
}

function posFor(squad, i, n) {
  return { x: squad === 'A' ? PLAYER_X : ENEMY_X, y: slotY(i, n), facing: squad === 'A' ? 1 : -1 };
}

function postureOf(frac) {
  if (frac > 0.6) return 'upright';
  if (frac > 0.25) return 'staggered';
  return 'faltering';
}

// ─── Unit token ───────────────────────────────────────────────────────────────
function UnitToken({ unit, pos, motion, beat }) {
  const color = ARCHETYPES[unit.archetype]?.color ?? '#888';
  const dead = !unit.alive;
  const frac = Math.max(0, unit.currentHP / unit.maxHP);
  const posture = postureOf(frac);
  const facing = pos.facing;

  const isSpark = unit.archetype === 'Spark';
  const stacks = unit.stokeStacks ?? 0;
  const charging = isSpark && stacks > 0 && !dead;
  const armed = isSpark && stacks >= SPARK_DETONATE_THRESHOLD - 1 && !dead;
  const shielded = unit.shield > 0 && !dead;
  const isAnchored = unit.anchored && !dead;

  const chargeT = Math.min(1, stacks / SPARK_DETONATE_THRESHOLD);
  const grow = isSpark && !dead ? 1 + 0.28 * chargeT : 1;

  let dx = 0;
  let lift = 1;
  let actGlow = 0;
  if (!dead) {
    if (motion.role === 'actor') {
      if (motion.phase === 'anticipate')    { dx = 7 * facing; lift = 1.05; actGlow = 0.6; }
      else if (motion.phase === 'impact')   { dx = (motion.isExecute ? 34 : 22) * facing; lift = 1.08; actGlow = 1; }
      else if (motion.phase === 'detonate') { lift = 1.12; actGlow = 1; }
      // 'locked' phase: unit tried to act but was anchored — no lunge, slight recoil
      else if (motion.phase === 'locked')   { dx = -4 * facing; lift = 1.0; }
    } else if (motion.role === 'target' && motion.phase === 'impact') {
      dx = -13 * facing;
    }
  }

  let rot = 0;
  let sag = 0;
  if (!dead) {
    if (posture === 'staggered')      { rot = -5 * facing;  sag = 2; }
    else if (posture === 'faltering') { rot = -13 * facing; sag = 5; }
  }

  const guardForward = shielded ? 6 * facing : 0;

  const transform = dead
    ? 'translate(-50%, -50%) scaleY(0.26) rotate(8deg)'
    : `translate(calc(-50% + ${dx + guardForward}px), calc(-50% + ${sag}px)) scale(${grow * lift}) rotate(${rot}deg)`;

  const glow = dead ? 'none'
    : armed     ? `0 0 ${10 + 14 * chargeT}px ${4 + 6 * chargeT}px #ff6b35cc`
    : charging  ? `0 0 ${6 + 10 * chargeT}px ${2 + 4 * chargeT}px #f5a62399`
    : actGlow > 0 ? `0 0 ${8 + 10 * actGlow}px ${actGlow * 3}px ${color}`
    : `0 0 5px 0 ${color}40`;

  const bodyColor = dead ? '#2a2a33' : color;

  return (
    <div style={{
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform,
      transition: 'transform 0.42s cubic-bezier(.34,1.4,.5,1), opacity 0.5s ease',
      opacity: dead ? 0.4 : posture === 'faltering' ? 0.9 : 1,
      zIndex: motion.role === 'actor' ? 5 : 2,
      willChange: 'transform',
    }}>
      {/* impact flash */}
      {motion.role === 'target' && motion.phase === 'impact' && !dead && (
        <div key={`flash-${beat}`} style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          background: motion.killed ? '#fff' : '#e86040',
          animation: 'stageFlash 0.45s ease-out forwards', pointerEvents: 'none',
        }} />
      )}

      {/* anchored-skip beat: lock flash on the unit that tried to act */}
      {motion.role === 'actor' && motion.phase === 'locked' && (
        <div key={`lockflash-${beat}`} style={{
          position: 'absolute', inset: -6, borderRadius: '46% 46% 42% 42%',
          background: '#ffffff22', border: '2px solid #ffffffaa',
          animation: 'stageFlash 0.5s ease-out forwards', pointerEvents: 'none',
        }} />
      )}

      {/* ARMED pulsing ring */}
      {armed && (
        <div style={{
          position: 'absolute', inset: -7, borderRadius: '46% 46% 42% 42%',
          border: '2px solid #ff6b35', animation: 'stageArmed 0.7s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Guardian shield brace */}
      {shielded && (
        <div style={{
          position: 'absolute', inset: -6, borderRadius: '46% 46% 42% 42%',
          border: '2px solid #4a90d9',
          boxShadow: '0 0 10px #4a90d980, 0 0 4px #4a90d960 inset',
          pointerEvents: 'none',
        }} />
      )}

      {/* Anchor lock ring — unit is flagged, about to be skipped */}
      {isAnchored && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: '46% 46% 42% 42%',
          border: '2px solid #aaaacc', boxShadow: '0 0 6px #aaaacc99',
          animation: 'stageLock 1.2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* body silhouette */}
      <div style={{
        width: 30, height: 42,
        borderRadius: '46% 46% 42% 42%',
        background: dead
          ? bodyColor
          : `linear-gradient(160deg, ${bodyColor} 0%, ${bodyColor}aa 55%, ${bodyColor}55 100%)`,
        boxShadow: glow,
        border: `1px solid ${dead ? '#1a1a22' : '#00000040'}`,
        transition: 'box-shadow 0.3s ease, background 0.3s ease',
        // De-saturate when anchored (frozen feel)
        filter: isAnchored ? 'saturate(0.3) brightness(0.8)' : 'none',
      }} />

      {/* labels: name, charge state, faint hp */}
      <div style={{
        position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.3, color: dead ? '#333' : '#bbb' }}>
          {unit.name}
        </div>
        {isAnchored && (
          <div style={{ fontSize: 7, color: '#aaaacc', letterSpacing: 0.5, fontWeight: 700 }}>⚓</div>
        )}
        {charging && !isAnchored && (
          <div style={{ fontSize: 7, color: armed ? '#ff6b35' : '#f5a623', letterSpacing: 0.5, fontWeight: 700 }}>
            {armed ? '⚡ARMED' : `⚡${stacks}/${SPARK_DETONATE_THRESHOLD}`}
          </div>
        )}
        {!dead && !charging && !isAnchored && (
          <div style={{ fontSize: 6, color: '#333', fontFamily: 'monospace' }}>{Math.round(unit.currentHP)}</div>
        )}
      </div>
    </div>
  );
}

// ─── BattleStage ──────────────────────────────────────────────────────────────
export function BattleStage({ playerUnits, enemyUnits, step }) {
  const [beat, setBeat] = useState(0);
  const lastStepRef = useRef(null);
  useEffect(() => {
    if (step !== lastStepRef.current) {
      lastStepRef.current = step;
      setBeat((b) => b + 1);
    }
  }, [step]);

  // uid → position (for beams and motionFor)
  const posByUid = {};
  playerUnits.forEach((u, i) => { posByUid[u.uid] = posFor('A', i, playerUnits.length); });
  enemyUnits.forEach((u, i) => { posByUid[u.uid] = posFor('B', i, enemyUnits.length); });

  // id → position (best-effort for echo events which carry actorId not uid)
  const posById = {};
  [...playerUnits, ...enemyUnits].forEach((u) => {
    if (!posById[u.id]) posById[u.id] = posByUid[u.uid];
  });

  let actorUid = null;
  let targetUid = null;
  let phase = 'idle';
  let isExecute = false;
  let killed = false;

  if (step?.type === 'pending_action') {
    actorUid = step.actorId; targetUid = step.proposedTarget?.uid; phase = 'anticipate';
  } else if (step?.type === 'action_resolved') {
    actorUid = step.actorId; targetUid = step.target?.uid; phase = 'impact';
    isExecute = !!step.isExecute; killed = !!step.killed;
  } else if (step?.type === 'detonation') {
    actorUid = step.actorId; phase = 'detonate';
  } else if (step?.type === 'anchored' || step?.type === 'resonance_skip') {
    actorUid = step.actorId; phase = 'locked';
  }

  const motionFor = (uid) => {
    if (uid === actorUid) return { role: 'actor', phase, isExecute, killed };
    if (uid === targetUid) return { role: 'target', phase, isExecute, killed };
    return { role: 'none', phase };
  };

  const actorPos = actorUid ? posByUid[actorUid] : null;
  const targetPos = targetUid ? posByUid[targetUid] : null;

  // Echo events on an action_resolved step — faint green lines from echo unit to target
  const echoBeams = (phase === 'impact' && step?.events)
    ? step.events
        .filter((e) => e.type === 'echo' || (e.type === 'gear_proc' && e.gearId === 'resonator'))
        .map((e, i) => {
          const from = posById[e.actorId];
          const to = posById[e.targetId];
          if (!from || !to) return null;
          return { key: `echo-${beat}-${i}`, from, to };
        })
        .filter(Boolean)
    : [];

  // Resonance events on an action_resolved step — bright violet lines from the
  // pulled-in partner to the shared target (the synchronized strike).
  const resonanceBeams = (phase === 'impact' && step?.events)
    ? step.events
        .filter((e) => e.type === 'resonance')
        .map((e, i) => {
          const from = posById[e.actorId];
          const to = posById[e.targetId];
          if (!from || !to) return null;
          return { key: `reso-${beat}-${i}`, from, to };
        })
        .filter(Boolean)
    : [];

  return (
    <div style={{
      position: 'relative', width: '100%', height: 340,
      background: 'radial-gradient(ellipse at center, #0c0c18 0%, #060610 70%, #04040a 100%)',
      borderRadius: 8, border: '1px solid #14141f', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes stageFlash  { 0% { opacity: 0.85; transform: scale(0.7) } 100% { opacity: 0; transform: scale(1.5) } }
        @keyframes stageArmed  { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.4; transform: scale(1.12) } }
        @keyframes stageBeam   { 0% { opacity: 0; stroke-dashoffset: 14 } 35% { opacity: 0.9 } 100% { opacity: 0; stroke-dashoffset: 0 } }
        @keyframes stageRing   { 0% { opacity: 0.8; r: 2 } 100% { opacity: 0; r: 46 } }
        @keyframes stageLock   { 0%,100% { opacity: 0.6 } 50% { opacity: 0.2 } }
      `}</style>

      {/* faint centre seam */}
      <div style={{
        position: 'absolute', left: '50%', top: '8%', bottom: '8%', width: 1,
        background: 'linear-gradient(#0000,#1a1a2a,#0000)',
      }} />

      {/* SVG beam / ring layer */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>

        {/* attacker → target beam on impact */}
        {phase === 'impact' && actorPos && targetPos && (
          <line key={`beam-${beat}`}
            x1={actorPos.x} y1={actorPos.y} x2={targetPos.x} y2={targetPos.y}
            stroke={isExecute ? '#ff5577' : killed ? '#ffffff' : '#e8a060'}
            strokeWidth={isExecute ? 1.1 : 0.7} strokeLinecap="round"
            strokeDasharray="14" vectorEffect="non-scaling-stroke"
            style={{ animation: 'stageBeam 0.5s ease-out forwards' }}
          />
        )}

        {/* Echo pulse lines — faint green, dashed */}
        {echoBeams.map(({ key, from, to }) => (
          <line key={key}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke="#7ed321" strokeWidth={0.5} strokeLinecap="round"
            strokeDasharray="4 3" vectorEffect="non-scaling-stroke"
            style={{ animation: 'stageBeam 0.6s ease-out forwards' }}
          />
        ))}

        {/* Resonance lines — bright violet, synchronized strike */}
        {resonanceBeams.map(({ key, from, to }) => (
          <line key={key}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke="#b06bff" strokeWidth={1.0} strokeLinecap="round"
            strokeDasharray="8 2" vectorEffect="non-scaling-stroke"
            style={{ animation: 'stageBeam 0.6s ease-out forwards' }}
          />
        ))}

        {/* detonation ring */}
        {phase === 'detonate' && actorPos && (
          <circle key={`ring-${beat}`}
            cx={actorPos.x} cy={actorPos.y} fill="none"
            stroke="#ff6b35" strokeWidth={1.2} vectorEffect="non-scaling-stroke"
            style={{ animation: 'stageRing 0.85s ease-out forwards' }}
          />
        )}
      </svg>

      {/* side labels */}
      <div style={{ position: 'absolute', left: 8, top: 6, fontSize: 7, letterSpacing: 2, color: '#222' }}>YOUR SQUAD</div>
      <div style={{ position: 'absolute', right: 8, top: 6, fontSize: 7, letterSpacing: 2, color: '#222' }}>ENEMY</div>

      {/* tokens */}
      {playerUnits.map((u, i) => (
        <UnitToken key={u.uid} unit={u} pos={posFor('A', i, playerUnits.length)} motion={motionFor(u.uid)} beat={beat} />
      ))}
      {enemyUnits.map((u, i) => (
        <UnitToken key={u.uid} unit={u} pos={posFor('B', i, enemyUnits.length)} motion={motionFor(u.uid)} beat={beat} />
      ))}
    </div>
  );
}
