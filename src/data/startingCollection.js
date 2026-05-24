import { CREATURES } from './creatures.js';

const c = (id) => CREATURES.find((u) => u.id === id);

function inst(creature, instanceId) {
  return {
    instanceId,
    ...creature,
    xp: 0,
    level: 1,
    feedCount: 0,
    feedHistory: [],
    survivalCount: 0,
    revivals: 0,
    battleCount: 0,
    winCount: 0,
    survivalStreak: 0,
    enemyMemory: [],
    foundAt: null,
  };
}

// 17 units, includes duplicates for feeding
export function buildStartingCollection() {
  return [
    inst(c('vault'),    'u01'),
    inst(c('vault'),    'u02'),
    inst(c('bastion'),  'u03'),
    inst(c('bastion'),  'u04'),
    inst(c('bulwark'),  'u05'),
    inst(c('conduit'),  'u06'),
    inst(c('conduit'),  'u07'),
    inst(c('nexus'),    'u08'),
    inst(c('link'),     'u09'),
    inst(c('fang'),     'u10'),
    inst(c('fang'),     'u11'),
    inst(c('striker'),  'u12'),
    inst(c('claw'),     'u13'),
    inst(c('spark'),    'u14'),
    inst(c('spark'),    'u15'),
    inst(c('flicker'),  'u16'),
    inst(c('cinder'),   'u17'),
  ];
}
