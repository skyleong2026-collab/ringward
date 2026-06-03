import { getSkill } from './skills/index.js';
import { applyTemperament } from './doctrines.js';
import { lowestHpEnemy } from './vocab.js';

// ─── Drivers (§26.0) ─────────────────────────────────────────────────────────
// The engine talks to ONE interface and never branches on human-vs-AI. A driver
// belongs to a SIDE (not a creature) and answers two questions per turn:
//   chooseNextActor(pool, state) -> a living, not-yet-acted unit (action ORDER)
//   decide(actor, state)         -> { skillId, targetIds }
// Both are async so the human driver can await a tap; the AI resolves instantly,
// which makes an AI-vs-AI fight fully synchronous + deterministic (§26.4 golden).

// ── AI driver: pure function of (state, doctrine, seed) ──
// Same brain that powers auto-resolve / farm mode / PvP defense (§24) — the manual
// pivot does NOT retire the AI; it gives it a turn-by-turn home.
export function createAIDriver() {
  return {
    // Deterministic order: act in slot order. (A future doctrine could reorder
    // here — it would still be a pure function of state, so replays hold.)
    chooseNextActor(pool /*, state */) {
      return pool[0];
    },

    // Walk the actor's doctrine ladder, first legal match wins.
    decide(actor, state) {
      const doctrine = applyTemperament(actor.type, actor.temperament);
      for (const rule of doctrine.rules) {
        const skill = getSkill(rule.skillId);
        if (rule.when(actor, state) && skill.canUse(actor, state)) {
          return { skillId: rule.skillId, targetIds: rule.select(actor, state) };
        }
      }
      // Ladders always end in an `always` fallback, but never trust that — default
      // to the always-legal builder on the lowest-HP enemy.
      const fallback = getSkill(actor.skillIds[0]);
      return { skillId: fallback.id, targetIds: lowestHpEnemy(actor, state) };
    },
  };
}

// ── Human driver: awaits UI input ──
// The screen supplies two async callbacks; the engine awaits them exactly like it
// awaits the AI's instant answer. No engine code knows which is which.
export function createHumanDriver({ requestActor, requestDecision }) {
  return {
    chooseNextActor(pool, state) {
      return requestActor(pool, state); // Promise<actor>
    },
    decide(actor, state) {
      return requestDecision(actor, state); // Promise<{skillId, targetIds}>
    },
  };
}
