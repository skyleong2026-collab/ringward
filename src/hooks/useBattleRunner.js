import { useRef, useState, useCallback, useEffect } from 'react';
import { battleStepEngine } from '../engine/battleStepEngine.js';

// Witnessing tempo (§19.2 — "pacing is part of representation, not polish").
// A battle should *unfold*, not *resolve*. The engine yields in beats: a
// pending_action is the anticipation/telegraph (you see who is about to hit
// whom), and the following action_resolved is the commitment+impact. Giving the
// anticipation its own, longer hold is what lets the eye register the orient
// before the lunge lands.
const ANTICIPATION_MS = 620;  // hold on pending_action — the telegraph reads
const IMPACT_MS       = 540;  // dwell after a hit lands — recoil + recovery
const DETONATE_MS     = 900;  // a detonation is a beat unto itself
const DEFAULT_INTERVENTIONS = 3;  // redirect budget per battle (contracts may override)

function buildLogLine(step) {
  if (step.type !== 'action_resolved') return null;
  const directionTag = step.wasRedirected ? ' [REDIRECTED]' : '';
  const executeTag   = step.isExecute    ? ' [EXECUTE]'    : '';
  const killedTag    = step.killed       ? ' — DEFEATED'   : '';
  return `${step.actor.name} → ${step.target.name}: ${Math.round(step.damage)} dmg${executeTag}${directionTag}${killedTag}`;
}

function buildProcLines(step) {
  if (step.type !== 'action_resolved') return [];
  return (step.events || [])
    .filter((e) => e.type === 'gear_proc' || e.type === 'module_proc' || e.type === 'echo' || e.type === 'resonance' || e.type === 'signature_proc')
    .map((e) => {
      if (e.type === 'echo')       return `  ↳ ${e.actorName} echoes for ${Math.round(e.damage)} dmg`;
      if (e.type === 'resonance')  return `  ◇ ${e.actorName} resonates for ${Math.round(e.damage)} dmg${e.killed ? ' — DEFEATED' : ''}`;
      if (e.type === 'gear_proc')  return `  ◆ ${e.actorName}: ${e.callout}`;
      if (e.type === 'module_proc') return `  ◈ ${e.actorName}: ${e.callout}`;
      if (e.type === 'signature_proc') return `  ✦ ${e.actorName}: ${e.callout}`;
      return null;
    })
    .filter(Boolean);
}

// ─── useBattleRunner ─────────────────────────────────────────────────────────
// Drives battleStepEngine generator with timed auto-play and pause/redirect.
//
// phase:
//   'idle'     — not started
//   'playing'  — auto-advancing (timers running)
//   'paused'   — player paused; stopped at current pending_action
//   'complete' — battle over, result ready
// maxInterventions — the per-battle intervention budget (a contract modifier can
//   tighten this, e.g. "Quiet the Signal" sets it to 1). Default 3 per §19.6S.
// detonationClock — optional enemy-Spark detonation limit (the contract's visible
//   clock, §20.8.5). When the enemy completes its Nth detonation the battle ends
//   as a loss ("the signal completed"). null = no clock (normal battles). This is
//   a frame-level win/loss overlay; it does not change what the engine computes.
// holdCondition — optional protect objective (§20.8.5 "Hold the Crossing"):
//   { rounds, escorteeInstanceId }. The escortee falling is a frame loss; the
//   escortee still standing once `rounds` are survived is a frame win. Like the
//   detonation clock, this is a win/loss overlay — it never changes engine math.
// modifiers — battle-level rule overrides passed straight to the engine.
export function useBattleRunner({
  squadA, squadB, seed,
  maxInterventions = DEFAULT_INTERVENTIONS, detonationClock = null,
  holdCondition = null, modifiers = undefined, speed = 1,
}) {
  const genRef       = useRef(null);
  const timerRef     = useRef(null);
  const isPausedRef  = useRef(false);
  const budgetRef    = useRef(maxInterventions);
  const detonationsRef = useRef(0);
  const endedRef     = useRef(false);
  // Playback speed multiplier (1×/2×/4×). Ref-backed so a mid-battle change takes
  // effect on the next scheduled beat without restarting the generator.
  const speedRef     = useRef(speed);
  useEffect(() => { speedRef.current = speed || 1; }, [speed]);

  const [phase, setPhase]                 = useState('idle');
  const [currentStep, setCurrentStep]     = useState(null);
  const [unitsSnapshot, setUnitsSnapshot] = useState({ A: [], B: [] });
  const [combatLog, setCombatLog]         = useState([]);
  const [interventionsLeft, setInterventionsLeft] = useState(maxInterventions);
  const [enemyDetonations, setEnemyDetonations]   = useState(0);
  const [result, setResult]               = useState(null);

  // Append lines to the scrolling combat log
  const appendLog = useCallback((lines) => {
    setCombatLog((prev) => [...prev, ...lines].slice(-40));
  }, []);

  // Advance the generator one step, optionally injecting an intervention
  const tick = useCallback((intervention) => {
    if (!genRef.current) return;
    if (endedRef.current) return; // a frame overlay already concluded the battle

    const sp = speedRef.current || 1; // scale every beat delay by playback speed

    const { value, done } = genRef.current.next(intervention ?? null);

    if (done) {
      setResult(value);
      setPhase('complete');
      if (value?.telemetry) {
        setUnitsSnapshot({
          A: value.telemetry.squadA.map((u) => ({
            uid: u._uid, id: u.id, instanceId: u.instanceId, name: u.name, archetype: u.archetype,
            squad: 'A', currentHP: Math.max(0, u.currentHP), maxHP: u.maxHP,
            shield: u.shield, alive: u.alive, stokeStacks: u.stokeStacks,
            currentAttack: Math.round(u.currentAttack),
          })),
          B: value.telemetry.squadB.map((u) => ({
            uid: u._uid, id: u.id, instanceId: u.instanceId, name: u.name, archetype: u.archetype,
            squad: 'B', currentHP: Math.max(0, u.currentHP), maxHP: u.maxHP,
            shield: u.shield, alive: u.alive, stokeStacks: u.stokeStacks,
            currentAttack: Math.round(u.currentAttack),
          })),
        });
      }
      return;
    }

    setCurrentStep(value);

    // ── Hold-the-line overlay (§20.8.5) ─────────────────────────────────────
    // Judge the protect objective on every step before the normal dispatch.
    if (holdCondition && value.unitsA) {
      const esc = value.unitsA.find((u) => u.instanceId === holdCondition.escorteeInstanceId);
      const endHold = (frameResult, logLine) => {
        endedRef.current = true;
        setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });
        appendLog([logLine]);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setResult({ ...frameResult, rounds: value.round, telemetry: { squadA: value.unitsA, squadB: value.unitsB }, battleLog: [], xpRewards: {} });
          setPhase('complete');
        }, DETONATE_MS / sp);
      };
      if (esc && !esc.alive) {
        endHold({ winner: 'B', holdFailed: true }, `✖ ${esc.name} HAS FALLEN — the crossing is lost`);
        return;
      }
      if (esc && esc.alive && value.round > holdCondition.rounds) {
        endHold({ winner: 'A', holdSurvived: true }, `✓ ${esc.name} HELD — the crossing stands`);
        return;
      }
    }

    if (value.type === 'pending_action') {
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });

      if (isPausedRef.current) {
        // Stay here — player is paused, show the pending action panel
        setPhase('paused');
      } else {
        // Auto-advance after the anticipation hold (telegraph reads here)
        setPhase('playing');
        timerRef.current = setTimeout(() => tick(null), ANTICIPATION_MS / sp);
      }

    } else if (value.type === 'action_resolved') {
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });

      // Append this action to the combat log
      const line = buildLogLine(value);
      const procs = buildProcLines(value);
      if (line) appendLog([line, ...procs]);

      // Always advance from action_resolved to next pending_action
      // (pause will take effect at the next pending_action)
      timerRef.current = setTimeout(() => tick(null), IMPACT_MS / sp);

    } else if (value.type === 'anchored') {
      // A unit's turn was skipped due to Anchor — show the locked beat, auto-advance.
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });
      appendLog([`⚓ ${value.actorName} — ANCHORED (skips turn)`]);
      timerRef.current = setTimeout(() => tick(null), IMPACT_MS / sp);

    } else if (value.type === 'resonance_skip') {
      // A unit already spent its action on a player-pulled synchronized strike —
      // show the spent beat, auto-advance.
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });
      appendLog([`◇ ${value.actorName} — RESONANCE SPENT (turn synced earlier)`]);
      timerRef.current = setTimeout(() => tick(null), IMPACT_MS / sp);

    } else if (value.type === 'detonation') {
      // Spark charge released — drop HP, empty the meter, narrate the burst.
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });
      appendLog([
        `✸ ${value.actorName} DETONATES`,
        ...value.hits.map(
          (h) => `  ✸ → ${h.targetName}: ${Math.round(h.damage)} dmg${h.killed ? ' — DEFEATED' : ''}`,
        ),
      ]);

      // Contract clock (§20.8.5): an enemy Spark detonation advances the signal.
      if (value.actorSquad === 'B') {
        detonationsRef.current += 1;
        setEnemyDetonations(detonationsRef.current);

        if (detonationClock != null && detonationsRef.current >= detonationClock) {
          // The signal completed — contract lost. Freeze on the detonation beat,
          // then surface a frame-level loss result (engine math untouched).
          appendLog([`✸ THE SIGNAL IS COMPLETE`]);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setResult({
              winner: 'B',
              clockExpired: true,
              enemyDetonations: detonationsRef.current,
              rounds: value.round,
              telemetry: { squadA: value.unitsA, squadB: value.unitsB },
              battleLog: [],
              xpRewards: {},
            });
            setPhase('complete');
          }, DETONATE_MS / sp);
          return;
        }
      }

      timerRef.current = setTimeout(() => tick(null), DETONATE_MS / sp);
    }
  }, [appendLog, detonationClock, holdCondition]);

  // ── Public API ─────────────────────────────────────────────────────────────

  function start() {
    // Cancel any pending tick from a prior start(). React StrictMode invokes the
    // mount effect twice; without this, the first start()'s scheduled tick would
    // advance the *second* generator, double-stepping it and yielding a trailing
    // {value: undefined, done} that clobbers the real result.
    clearTimeout(timerRef.current);
    genRef.current   = battleStepEngine(squadA, squadB, seed, modifiers);
    isPausedRef.current = false;
    endedRef.current    = false;
    budgetRef.current   = maxInterventions;
    detonationsRef.current = 0;
    setInterventionsLeft(maxInterventions);
    setEnemyDetonations(0);
    setCombatLog([]);
    setResult(null);
    setCurrentStep(null);
    setPhase('playing');
    tick(null);
  }

  function pause() {
    if (phase === 'complete') return;
    isPausedRef.current = true;
    clearTimeout(timerRef.current);
    // If currently at action_resolved timer, phase stays 'playing' visually
    // until we hit the next pending_action. Mark paused now so the next
    // pending_action stops.
    setPhase('paused');
  }

  function resume() {
    if (phase === 'complete') return;
    isPausedRef.current = false;
    setPhase('playing');
    // Advance from wherever we are (pending_action or mid-delay)
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => tick(null), 0);
  }

  function anchor(targetUid) {
    if (budgetRef.current <= 0) return;
    if (!currentStep || currentStep.type !== 'pending_action') return;
    budgetRef.current -= 1;
    setInterventionsLeft(budgetRef.current);
    isPausedRef.current = false;
    setPhase('playing');
    clearTimeout(timerRef.current);
    tick({ type: 'anchor', targetUid });
  }

  function resonate(partnerUid) {
    if (budgetRef.current <= 0) return;
    if (!currentStep || currentStep.type !== 'pending_action') return;
    budgetRef.current -= 1;
    setInterventionsLeft(budgetRef.current);
    isPausedRef.current = false;
    setPhase('playing');
    clearTimeout(timerRef.current);
    tick({ type: 'resonate', partnerUid });
  }

  // Active creature signatures (vC-G) — spend an intervention to fire a charged
  // signature (Vault Release, Nexus Cascade). Same budget as the other verbs.
  function signatureActive(type) {
    if (budgetRef.current <= 0) return;
    if (!currentStep || currentStep.type !== 'pending_action') return;
    budgetRef.current -= 1;
    setInterventionsLeft(budgetRef.current);
    isPausedRef.current = false;
    setPhase('playing');
    clearTimeout(timerRef.current);
    tick({ type });
  }

  function redirect(actorId, newTargetId) {
    if (budgetRef.current <= 0) return;
    if (!currentStep || currentStep.type !== 'pending_action') return;
    if (currentStep.actorId !== actorId) return;

    budgetRef.current -= 1;
    setInterventionsLeft(budgetRef.current);
    isPausedRef.current = false;
    setPhase('playing');
    clearTimeout(timerRef.current);
    tick({ type: 'redirect', actorId, newTargetId });
  }

  return {
    start,
    pause,
    resume,
    redirect,
    anchor,
    resonate,
    signatureActive,
    phase,
    currentStep,
    unitsSnapshot,
    combatLog,
    interventionsLeft,
    enemyDetonations,
    result,
  };
}
