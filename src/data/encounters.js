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
    flavor: 'Three anchors in formation. The wall does not give. You need sustained damage or a crack in the line.',
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
];
