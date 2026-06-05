// Phase F — Dungeon run configurations
// Each dungeon has 3 nodes: opener → fork → boss
// Units do NOT heal between encounters. HP carries forward.

export const DUNGEONS = [
  {
    id: 'rail-circuit',
    name: 'Rail Circuit',
    description: 'Contested infrastructure. Three encounters. No rest between them.',
    color: '#4a5a8a',
    nodes: [
      {
        type: 'encounter',
        encounterId: 'patrol',
        label: 'Patrol Route',
        hint: 'Balanced opener. Read your squad here.',
      },
      {
        type: 'fork',
        options: [
          {
            encounterId: 'night-teeth',
            label: 'Night Teeth',
            hint: 'Speed and execute pressure. Kill fast or lose.',
          },
          {
            encounterId: 'iron-wall',
            label: 'Iron Wall',
            hint: 'Three Guardians in formation. Sustained damage required.',
          },
        ],
      },
      {
        type: 'boss',
        encounterId: 'extinction-event',
        label: 'Extinction Event',
        hint: 'One Guardian holding five Sparks. Each ally fall feeds their flame.',
      },
    ],
  },
  {
    id: 'resonance-storm',
    name: 'Resonance Storm',
    description: 'Echo chains and synchronized fire. Silence them before they cascade.',
    color: '#4a7a5a',
    nodes: [
      {
        type: 'encounter',
        encounterId: 'glass-pack',
        label: 'Glass Pack',
        hint: 'Three Swifts moving in sync. Burst before they chain.',
      },
      {
        type: 'fork',
        options: [
          {
            encounterId: 'resonance-cascade',
            label: 'Resonance Cascade',
            hint: 'Three Echos chaining. Disrupt the network.',
          },
          {
            encounterId: 'overdrive',
            label: 'Overdrive',
            hint: 'Swift and Spark accelerating. Burst them before round 3.',
          },
        ],
      },
      {
        type: 'boss',
        encounterId: 'siege',
        label: 'Siege',
        hint: 'Two Guardians with two Echos. Walls that echo.',
      },
    ],
  },
];
