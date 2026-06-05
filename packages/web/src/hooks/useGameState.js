import { create } from 'zustand';
import { getLevel, XP_PER_FEED, randomSeed, battle } from '@8gents/engine';
import { buildStartingCollection } from '@8gents/game-data';

const ARCHETYPE_MIGRATION = { Anchor: 'Guardian', Relay: 'Echo', Predator: 'Swift', Ember: 'Spark' };

function migrateCollection(col) {
  return col.map((u) => ({
    ...u,
    archetype: ARCHETYPE_MIGRATION[u.archetype] ?? u.archetype,
  }));
}

function createCaughtInstance(creature, zoneName) {
  const instanceId = `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
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
    foundAt: zoneName,
    coreId: null,
  };
}

function loadInitialState() {
  const initialState = {
    screen: 'collection',
    result: null,
    currentEncounter: null,
    feedTarget: null,
    justFedInstanceId: null,
    battleSeed: null,
    currentZone: null,
    currentWildTarget: null,
    catchResult: null,
    dungeonRun: null,
  };

  try {
    const savedCollection = localStorage.getItem('8gents_collection');
    initialState.collection = migrateCollection(savedCollection ? JSON.parse(savedCollection) : buildStartingCollection());
  } catch {
    initialState.collection = buildStartingCollection();
  }

  try {
    const savedSquadIds = localStorage.getItem('8gents_squadIds');
    initialState.squadIds = savedSquadIds ? JSON.parse(savedSquadIds) : [];
  } catch {
    initialState.squadIds = [];
  }

  try {
    const savedEncounterHistory = localStorage.getItem('8gents_encounterHistory');
    initialState.encounterHistory = savedEncounterHistory ? JSON.parse(savedEncounterHistory) : {};
  } catch {
    initialState.encounterHistory = {};
  }

  return initialState;
}

function persist(collection, squadIds, encounterHistory) {
  localStorage.setItem('8gents_collection', JSON.stringify(collection));
  localStorage.setItem('8gents_squadIds', JSON.stringify(squadIds));
  localStorage.setItem('8gents_encounterHistory', JSON.stringify(encounterHistory));
}

export const useGameState = create((set, get) => ({
  ...loadInitialState(),

  // ── Navigation ────────────────────────────────────────────────────────────
  setScreen: (screen) => set({ screen }),

  // ── Collection mutations ──────────────────────────────────────────────────
  toggleSquad: (instanceId) => {
    const { squadIds, collection } = get();
    let next;
    if (squadIds.includes(instanceId)) {
      next = squadIds.filter((id) => id !== instanceId);
    } else {
      if (squadIds.length >= 8) return;
      next = [...squadIds, instanceId];
    }
    persist(collection, next, get().encounterHistory);
    set({ squadIds: next });
  },

  equipCore: (instanceId, coreId) => {
    const { collection, squadIds, encounterHistory } = get();
    const next = collection.map((u) =>
      u.instanceId === instanceId ? { ...u, coreId: coreId ?? null } : u
    );
    persist(next, squadIds, encounterHistory);
    set({ collection: next });
  },

  equipModule: (instanceId, moduleId) => {
    const { collection, squadIds, encounterHistory } = get();
    const next = collection.map((u) =>
      u.instanceId === instanceId ? { ...u, moduleId: moduleId ?? null } : u
    );
    persist(next, squadIds, encounterHistory);
    set({ collection: next });
  },

  openFeed: (unit) => set({ feedTarget: unit }),

  confirmFeed: (targetInstanceId, fodderInstanceIds) => {
    const { collection, squadIds, encounterHistory } = get();
    const fodderUnits = fodderInstanceIds.map((id) => collection.find((u) => u.instanceId === id));
    const next = collection
      .filter((u) => !fodderInstanceIds.includes(u.instanceId))
      .map((u) => {
        if (u.instanceId !== targetInstanceId) return u;
        const gainXp = fodderInstanceIds.length * XP_PER_FEED;
        const newXp = u.xp + gainXp;
        const feedEntries = fodderUnits.map((f) => ({ archetype: f.archetype, creatureName: f.name }));
        return {
          ...u,
          xp: newXp,
          level: getLevel(newXp),
          feedCount: u.feedCount + fodderInstanceIds.length,
          feedHistory: [...u.feedHistory, ...feedEntries],
        };
      });
    const nextSquadIds = squadIds.filter((id) => next.some((u) => u.instanceId === id));
    persist(next, nextSquadIds, encounterHistory);
    set({ collection: next, squadIds: nextSquadIds, feedTarget: null });
    set({ justFedInstanceId: targetInstanceId });
    setTimeout(() => set({ justFedInstanceId: null }), 400);
  },

  // ── Wild hunt ──────────────────────────────────────────────────────────────
  enterZone: (zone) => {
    const target = zone.pool[Math.floor(Math.random() * zone.pool.length)];
    set({ currentZone: zone, currentWildTarget: target, screen: 'wildhunt' });
  },

  enterGpsSpawn: (spawn, ARCHETYPES) => {
    const color = ARCHETYPES[spawn.creature.archetype]?.color || '#6a6a8a';
    const syntheticZone = {
      id: spawn.cellKey,
      name: spawn.zoneName,
      description: spawn.creature.flavor,
      nature: spawn.creature.archetype,
      color,
      pool: [spawn.creature],
    };
    set({ currentZone: syntheticZone, currentWildTarget: spawn.creature, screen: 'wildhunt' });
  },

  commitHunt: (playerSquad, wildTarget, zone, battle, randomSeed) => {
    const seed = randomSeed();
    const res = battle(playerSquad, [wildTarget], seed);
    const caught = res.winner === 'A';

    const { collection, squadIds, encounterHistory } = get();
    const next = collection.map((u) => {
      const xpGain = res.xpRewards?.[u.instanceId];
      if (!xpGain) return u;
      const newXp = u.xp + xpGain;
      const battleUpdate = res.battleUpdates?.[u.instanceId];
      const newSurvivalStreak = battleUpdate?.alive ? (u.survivalStreak || 0) + 1 : 0;
      const newEnemyMemory = battleUpdate?.enemyNames
        ? [...(u.enemyMemory || []), ...battleUpdate.enemyNames].filter((v, i, a) => a.indexOf(v) === i)
        : u.enemyMemory;
      return {
        ...u,
        xp: newXp,
        level: getLevel(newXp),
        survivalCount: (u.survivalCount || 0) + (res.survivalUpdates?.[u.instanceId] || 0),
        battleCount: (u.battleCount || 0) + (battleUpdate?.battleCount || 0),
        winCount: (u.winCount || 0) + (battleUpdate?.winCount || 0),
        survivalStreak: newSurvivalStreak,
        enemyMemory: newEnemyMemory,
      };
    });

    const reserve = next.filter((u) => !squadIds.includes(u.instanceId));
    if (caught && reserve.length < 24) {
      const newUnit = createCaughtInstance(wildTarget, zone.name);
      const withCatch = [...next, newUnit];
      persist(withCatch, squadIds, encounterHistory);
      set({ collection: withCatch, catchResult: { caught, res }, screen: 'catchresult' });
    } else {
      persist(next, squadIds, encounterHistory);
      set({ collection: next, catchResult: { caught, res }, screen: 'catchresult' });
    }
  },

  // ── Encounter ──────────────────────────────────────────────────────────────
  runEncounter: (encounter) => {
    set({ currentEncounter: encounter, screen: 'prebattle' });
  },

  commitBattle: () => {
    const seed = randomSeed();
    set({ battleSeed: seed, screen: 'battle' });
  },

  applyXpFromResult: (res) => {
    if (!res?.xpRewards) return;
    const { collection, squadIds, encounterHistory } = get();
    const next = collection.map((u) => {
      const xpGain = res.xpRewards[u.instanceId];
      if (!xpGain) return u;
      const newXp = u.xp + xpGain;
      const battleUpdate = res.battleUpdates?.[u.instanceId];
      const newSurvivalStreak = battleUpdate?.alive ? (u.survivalStreak || 0) + 1 : 0;
      const newEnemyMemory = battleUpdate?.enemyNames
        ? [...(u.enemyMemory || []), ...battleUpdate.enemyNames].filter((v, i, a) => a.indexOf(v) === i)
        : u.enemyMemory;
      return {
        ...u,
        xp: newXp,
        level: getLevel(newXp),
        survivalCount: (u.survivalCount || 0) + (res.survivalUpdates?.[u.instanceId] || 0),
        battleCount: (u.battleCount || 0) + (battleUpdate?.battleCount || 0),
        winCount: (u.winCount || 0) + (battleUpdate?.winCount || 0),
        survivalStreak: newSurvivalStreak,
        enemyMemory: newEnemyMemory,
      };
    });
    persist(next, squadIds, encounterHistory);
    set({ collection: next });
  },

  handleBattleComplete: (res) => {
    set({ result: res, screen: 'result' });
  },

  handleTryAgain: () => {
    const { collection, squadIds, result, currentEncounter } = get();
    get().applyXpFromResult(result);
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    const seed = randomSeed();
    const res = battle(playerSquad, currentEncounter.squad, seed);
    set({ result: res });
  },

  handleNewBattle: () => {
    const { collection, squadIds, result, currentEncounter, encounterHistory } = get();
    get().applyXpFromResult(result);

    if (currentEncounter && result) {
      const newHistory = { ...encounterHistory };
      const encId = currentEncounter.id;
      if (!newHistory[encId]) {
        newHistory[encId] = { wins: 0, losses: 0 };
      }
      if (result.winner === 'A') {
        newHistory[encId].wins = (newHistory[encId].wins || 0) + 1;
      } else {
        newHistory[encId].losses = (newHistory[encId].losses || 0) + 1;
      }
      persist(collection, squadIds, newHistory);
      set({ encounterHistory: newHistory });
    }

    set({ result: null, currentEncounter: null, screen: 'collection' });
  },

  // ── Dungeon ────────────────────────────────────────────────────────────────
  startDungeon: (dungeon) => {
    set({ dungeonRun: { dungeon, nodeIndex: 0, hpOverrides: {}, runLog: [], failed: false, failedAt: null }, screen: 'dungeon' });
  },

  selectDungeonEncounter: (encounterId, ENCOUNTERS) => {
    const encounter = ENCOUNTERS.find((e) => e.id === encounterId);
    set({ currentEncounter: encounter, screen: 'prebattle' });
  },

  handleDungeonContinue: () => {
    const { dungeonRun, result, currentEncounter, collection } = get();
    if (!dungeonRun || !result || !currentEncounter) return;

    get().applyXpFromResult(result);

    const newHpOverrides = { ...dungeonRun.hpOverrides };
    for (const unit of result.telemetry.squadA) {
      newHpOverrides[unit.instanceId] = Math.max(1, Math.round(unit.currentHP));
    }

    const xpEarned = Object.values(result.xpRewards || {}).reduce((s, v) => s + v, 0);
    const isBoss = dungeonRun.dungeon.nodes[dungeonRun.nodeIndex].type === 'boss';
    const hpSnapshot = {};
    for (const unit of result.telemetry.squadA) {
      hpSnapshot[unit.instanceId] = { current: Math.round(unit.currentHP), max: unit.maxHP, pct: unit.currentHP / unit.maxHP };
    }
    const newLog = [...dungeonRun.runLog, { encounterId: currentEncounter.id, won: true, xpEarned, isBoss, hpSnapshot }];
    const nextNodeIndex = dungeonRun.nodeIndex + 1;

    if (nextNodeIndex >= dungeonRun.dungeon.nodes.length) {
      set({
        result: null,
        currentEncounter: null,
        dungeonRun: { ...dungeonRun, nodeIndex: nextNodeIndex, hpOverrides: newHpOverrides, runLog: newLog, complete: true },
        screen: 'dungeonresult',
      });
    } else {
      set({
        result: null,
        currentEncounter: null,
        dungeonRun: { ...dungeonRun, nodeIndex: nextNodeIndex, hpOverrides: newHpOverrides, runLog: newLog },
        screen: 'dungeon',
      });
    }
  },

  handleDungeonFail: () => {
    const { dungeonRun, currentEncounter } = get();
    if (!dungeonRun) return;
    const isBoss = currentEncounter && dungeonRun.dungeon.nodes[dungeonRun.nodeIndex]?.type === 'boss';
    const newLog = currentEncounter
      ? [...dungeonRun.runLog, { encounterId: currentEncounter.id, won: false, xpEarned: 0, isBoss: !!isBoss }]
      : dungeonRun.runLog;
    set({
      dungeonRun: { ...dungeonRun, runLog: newLog, failed: true, failedAt: currentEncounter?.id || null },
      result: null,
      currentEncounter: null,
      screen: 'dungeonresult',
    });
  },

  handleDungeonResultDone: () => {
    set({ dungeonRun: null, screen: 'collection' });
  },

  handleDungeonRunAgain: () => {
    const { dungeonRun } = get();
    const dungeon = dungeonRun?.dungeon;
    set({ dungeonRun: null });
    if (dungeon) {
      get().startDungeon(dungeon);
    }
  },
}));
