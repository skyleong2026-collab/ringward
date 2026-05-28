import { useRef, useState, useCallback } from 'react';
import { battleStepEngine } from '../engine/battleStepEngine.js';

const ACTION_DELAY_MS = 700;  // ms between auto-advancing actions
const MAX_INTERVENTIONS = 3;  // redirect budget per battle

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
    .filter((e) => e.type === 'core_proc' || e.type === 'module_proc' || e.type === 'echo')
    .map((e) => {
      if (e.type === 'echo')       return `  ↳ ${e.actorName} echoes for ${Math.round(e.damage)} dmg`;
      if (e.type === 'core_proc')  return `  ◆ ${e.actorName}: ${e.callout}`;
      if (e.type === 'module_proc') return `  ◈ ${e.actorName}: ${e.callout}`;
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
export function useBattleRunner({ squadA, squadB, seed }) {
  const genRef       = useRef(null);
  const timerRef     = useRef(null);
  const isPausedRef  = useRef(false);
  const budgetRef    = useRef(MAX_INTERVENTIONS);

  const [phase, setPhase]                 = useState('idle');
  const [currentStep, setCurrentStep]     = useState(null);
  const [unitsSnapshot, setUnitsSnapshot] = useState({ A: [], B: [] });
  const [combatLog, setCombatLog]         = useState([]);
  const [interventionsLeft, setInterventionsLeft] = useState(MAX_INTERVENTIONS);
  const [result, setResult]               = useState(null);

  // Append lines to the scrolling combat log
  const appendLog = useCallback((lines) => {
    setCombatLog((prev) => [...prev, ...lines].slice(-40));
  }, []);

  // Advance the generator one step, optionally injecting an intervention
  const tick = useCallback((intervention) => {
    if (!genRef.current) return;

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

    if (value.type === 'pending_action') {
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });

      if (isPausedRef.current) {
        // Stay here — player is paused, show the pending action panel
        setPhase('paused');
      } else {
        // Auto-advance after delay
        setPhase('playing');
        timerRef.current = setTimeout(() => tick(null), ACTION_DELAY_MS);
      }

    } else if (value.type === 'action_resolved') {
      setUnitsSnapshot({ A: value.unitsA, B: value.unitsB });

      // Append this action to the combat log
      const line = buildLogLine(value);
      const procs = buildProcLines(value);
      if (line) appendLog([line, ...procs]);

      // Always advance from action_resolved to next pending_action
      // (pause will take effect at the next pending_action)
      timerRef.current = setTimeout(() => tick(null), ACTION_DELAY_MS);
    }
  }, [appendLog]);

  // ── Public API ─────────────────────────────────────────────────────────────

  function start() {
    genRef.current   = battleStepEngine(squadA, squadB, seed);
    isPausedRef.current = false;
    budgetRef.current   = MAX_INTERVENTIONS;
    setInterventionsLeft(MAX_INTERVENTIONS);
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
    phase,
    currentStep,
    unitsSnapshot,
    combatLog,
    interventionsLeft,
    result,
  };
}
