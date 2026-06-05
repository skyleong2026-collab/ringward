import { CREATURES } from './creatures.js';

const c = (id) => CREATURES.find((u) => u.id === id);

export const ENCOUNTERS = [
  {
    id: 'patrol',
    name: 'The Patrol',
    flavor: 'A standard route through contested territory. Balanced. Readable. Expects the same from you.',
    squad: [c('vault'), c('conduit'), c('striker'), c('flicker')],
    difficulty: 'Balanced',
  },
  {
    id: 'iron-wall',
    name: 'Iron Wall',
    flavor: 'Three Guardians in formation. The wall does not give. You need sustained damage or a crack in the line.',
    squad: [c('vault'), c('bastion'), c('bulwark'), c('link')],
    difficulty: 'Defensive',
  },
  {
    id: 'night-teeth',
    name: 'Night Teeth',
    flavor: 'Speed and execute pressure. No formation, just hunger. Kill it fast or watch it scale.',
    squad: [c('fang'), c('striker'), c('claw'), c('spark')],
    difficulty: 'Aggressive',
  },
  {
    id: 'glass-pack',
    name: 'Glass Pack',
    flavor: 'Three Swifts moving in sync. Deadly burst. One mistake and your frontline shatters.',
    squad: [c('fang'), c('striker'), c('claw')],
    difficulty: 'Aggressive',
  },
  {
    id: 'the-swarm',
    name: 'The Swarm',
    flavor: 'Seven Sparks flickering in the dark. Weak alone. Terrifying together. Can you carry?',
    squad: [c('spark'), c('flicker'), c('cinder'), c('spark'), c('flicker'), c('cinder'), c('spark')],
    difficulty: 'Aggressive',
  },
  {
    id: 'the-duelists',
    name: 'The Duelists',
    flavor: 'Two Guardians of legendary build. Slow. Inevitable. A test of who lasts longer.',
    squad: [c('vault'), c('bastion')],
    difficulty: 'Defensive',
  },

  // ── Harder encounters: test Core mechanics and force proc chains ──
  {
    id: 'overdrive',
    name: 'Overdrive',
    flavor: 'A Swift and two Sparks accelerating. By round 3 they hit like meteors. Kill fast or lose.',
    squad: [c('fang'), c('spark'), c('flicker')],
    difficulty: 'Aggressive',
  },
  {
    id: 'forge',
    name: 'The Forge',
    flavor: 'Two Guardians trading blows. Shields break and reform. Whoever breaks last wins.',
    squad: [c('vault'), c('vault')],
    difficulty: 'Defensive',
  },
  {
    id: 'resonance-cascade',
    name: 'Resonance Cascade',
    flavor: 'Three Echos firing in sync. Their chains weave through your squad. Silence them or be overwhelmed.',
    squad: [c('conduit'), c('nexus'), c('link')],
    difficulty: 'Aggressive',
  },
  {
    id: 'extinction-event',
    name: 'Extinction Event',
    flavor: 'One Guardian holding five Sparks. Each ally fall feeds their flame. Breaks you or breaks itself.',
    squad: [c('vault'), c('spark'), c('flicker'), c('cinder'), c('spark'), c('flicker')],
    difficulty: 'Aggressive',
  },
  {
    id: 'precision',
    name: 'Precision',
    flavor: 'Four Swifts hunting wounded prey. They chain executes. One mistake opens the kill window.',
    squad: [c('fang'), c('striker'), c('claw'), c('fang')],
    difficulty: 'Aggressive',
  },
  {
    id: 'siege',
    name: 'Siege',
    flavor: 'Two iron Guardians with two Echo supports. Walls that echo. Unstoppable formation.',
    squad: [c('vault'), c('bastion'), c('conduit'), c('nexus')],
    difficulty: 'Defensive',
  },
];
