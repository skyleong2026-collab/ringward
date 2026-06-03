import { REACTOR_SKILLS } from './reactor.js';
import { BULWARK_SKILLS } from './bulwark.js';
import { MENDER_SKILLS } from './mender.js';
import { BOOSTER_SKILLS } from './booster.js';
import { STRIKER_SKILLS } from './striker.js';
import { ASSASSIN_SKILLS } from './assassin.js';

// ─── Skill registry ─────────────────────────────────────────────────────────────
// One flat map of every skill the manual engine knows. Task 1 ships Reactor only
// (§26: "get ONE Type fully playable both human- and AI-driven before wiring the
// other five"). The other Types slot in here the same way — no engine change.
export const SKILLS = {
  ...REACTOR_SKILLS,
  ...BULWARK_SKILLS,
  ...MENDER_SKILLS,
  ...BOOSTER_SKILLS,
  ...STRIKER_SKILLS,
  ...ASSASSIN_SKILLS,
};

export function getSkill(id) {
  const skill = SKILLS[id];
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}

// The skills a unit could legally pick this instant — what a UI lights up and the
// fallback the engine trusts. The Builder is always legal by design (§23.1).
export function legalSkills(actor, state) {
  return actor.skillIds.map(getSkill).filter((s) => s.canUse(actor, state));
}
