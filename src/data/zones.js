import { CREATURES } from './creatures.js';

const c = (id) => CREATURES.find((u) => u.id === id);

export const ZONES = [
  {
    id: 'park',
    name: 'The Park',
    description: 'Open ground. Natural movement. Something always watching from the tree line.',
    nature: 'Wild',
    color: '#4a7a5a',
    pool: [c('bulwark'), c('link'), c('spark'), c('flicker'), c('cinder')],
    tier: 1,
    spawnLevel: [1, 2],
  },
  {
    id: 'rail-yard',
    name: 'Rail Yard',
    description: 'Abandoned infrastructure. Patient creatures. Hard to spot until they move.',
    nature: 'Dark',
    color: '#4a5a8a',
    pool: [c('vault'), c('conduit'), c('nexus'), c('fang')],
    tier: 2,
    spawnLevel: [2, 3],
  },
  {
    id: 'downtown',
    name: 'Downtown Grid',
    description: 'Dense. Territorial. Everything here is competing for the same ground.',
    nature: 'Dark',
    color: '#8a5a4a',
    pool: [c('bastion'), c('striker'), c('claw')],
    tier: 3,
    spawnLevel: [3, 4],
  },
];
