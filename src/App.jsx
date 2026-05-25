import { useState, useEffect } from 'react';
import CollectionScreen from './screens/CollectionScreen.jsx';
import EncounterScreen from './screens/EncounterScreen.jsx';
import PreBattle from './screens/PreBattle.jsx';
import WorldScreen from './screens/WorldScreen.jsx';
import WildHunt from './screens/WildHunt.jsx';
import CatchResult from './screens/CatchResult.jsx';
import FeedModal from './screens/FeedModal.jsx';
import Result from './screens/Result.jsx';
import DungeonScreen from './screens/DungeonScreen.jsx';
import DungeonResult from './screens/DungeonResult.jsx';
import { battle } from './engine/battle.js';
import { randomSeed } from './engine/rng.js';
import { buildStartingCollection } from './data/startingCollection.js';
import { ENCOUNTERS } from './data/encounters.js';
import { DUNGEONS } from './data/dungeons.js';
import { ARCHETYPES } from './data/creatures.js';
import { getLevel } from './engine/progression.js';
import { XP_PER_FEED } from './engine/progression.js';
import { animationStyles } from './ui/animations.js';

const VERSION = 'vI-A';

// Migrate stale archetype names from pre-vG-A builds
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

function App() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }, []);
  const [screen, setScreen] = useState('collection');
  const [result, setResult] = useState(null);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [feedTarget, setFeedTarget] = useState(null);
  const [justFedInstanceId, setJustFedInstanceId] = useState(null);

  const [collection, setCollection] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_collection');
      return migrateCollection(saved ? JSON.parse(saved) : buildStartingCollection());
    } catch {
      return buildStartingCollection();
    }
  });

  const [squadIds, setSquadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_squadIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentZone, setCurrentZone] = useState(null);
  const [currentWildTarget, setCurrentWildTarget] = useState(null);
  const [catchResult, setCatchResult] = useState(null);

  // ── Dungeon run state ────────────────────────────────────────────────────
  // { dungeon, nodeIndex, hpOverrides: {instanceId: hp}, runLog: [{encounterId, won, xpEarned, isBoss, hpSnapshot}], failed, failedAt }
  const [dungeonRun, setDungeonRun] = useState(null);

  const [encounterHistory, setEncounterHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_encounterHistory');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function persist(newCollection, newSquadIds, newEncounterHistory = encounterHistory) {
    localStorage.setItem('8gents_collection', JSON.stringify(newCollection));
    localStorage.setItem('8gents_squadIds', JSON.stringify(newSquadIds));
    localStorage.setItem('8gents_encounterHistory', JSON.stringify(newEncounterHistory));
  }

  function toggleSquad(instanceId) {
    setSquadIds((prev) => {
      let next;
      if (prev.includes(instanceId)) {
        next = prev.filter((id) => id !== instanceId);
      } else {
        if (prev.length >= 8) return prev;
        next = [...prev, instanceId];
      }
      persist(collection, next);
      return next;
    });
  }

  function equipCore(instanceId, coreId) {
    setCollection((prev) => {
      const next = prev.map((u) =>
        u.instanceId === instanceId ? { ...u, coreId: coreId ?? null } : u
      );
      persist(next, squadIds);
      return next;
    });
  }

  function equipModule(instanceId, moduleId) {
    setCollection((prev) => {
      const next = prev.map((u) =>
        u.instanceId === instanceId ? { ...u, moduleId: moduleId ?? null } : u
      );
      persist(next, squadIds);
      return next;
    });
  }

  function openFeed(unit) {
    setFeedTarget(unit);
  }

  function confirmFeed(targetInstanceId, fodderInstanceIds) {
    setJustFedInstanceId(targetInstanceId);
    setCollection((prev) => {
      const fodderUnits = fodderInstanceIds.map((id) => prev.find((u) => u.instanceId === id));
      const next = prev
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
      // Remove any squadIds that no longer exist
      setSquadIds((prevIds) => {
        const nextIds = prevIds.filter((id) => next.some((u) => u.instanceId === id));
        persist(next, nextIds);
        return nextIds;
      });
      return next;
    });
    setTimeout(() => setJustFedInstanceId(null), 400);
    setFeedTarget(null);
  }

  function enterZone(zone) {
    setCurrentZone(zone);
    const target = zone.pool[Math.floor(Math.random() * zone.pool.length)];
    setCurrentWildTarget(target);
    setScreen('wildhunt');
  }

  function enterGpsSpawn(spawn) {
    const color = ARCHETYPES[spawn.creature.archetype]?.color || '#6a6a8a';
    const syntheticZone = {
      id: spawn.cellKey,
      name: spawn.zoneName,
      description: spawn.creature.flavor,
      nature: spawn.creature.archetype,
      color,
      pool: [spawn.creature],
    };
    setCurrentZone(syntheticZone);
    setCurrentWildTarget(spawn.creature);
    setScreen('wildhunt');
  }

  function commitHunt() {
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    const seed = randomSeed();
    const res = battle(playerSquad, [currentWildTarget], seed);
    const caught = res.winner === 'A';

    // Apply XP to player squad
    if (res.xpRewards) {
      setCollection((prev) => {
        const next = prev.map((u) => {
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
        // If caught, add the new unit (if reserve has room)
        const reserve = next.filter((u) => !squadIds.includes(u.instanceId));
        if (caught && reserve.length < 24) {
          const newUnit = createCaughtInstance(currentWildTarget, currentZone.name);
          const withCatch = [...next, newUnit];
          persist(withCatch, squadIds);
          return withCatch;
        }
        persist(next, squadIds);
        return next;
      });
    }

    setCatchResult({ caught, res });
    setScreen('catchresult');
  }

  function runEncounter(encounter) {
    setCurrentEncounter(encounter);
    setScreen('prebattle');
  }

  function commitBattle() {
    let playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    if (dungeonRun) {
      playerSquad = playerSquad.map((u) => {
        const hp = dungeonRun.hpOverrides[u.instanceId];
        return hp !== undefined ? { ...u, currentHP: hp } : u;
      });
    }
    const seed = randomSeed();
    const res = battle(playerSquad, currentEncounter.squad, seed);
    setResult(res);
    setScreen('result');
  }

  function handleTryAgain() {
    if (!currentEncounter) return;
    // Apply XP and survival updates from previous battle before running next
    if (result?.xpRewards) {
      setCollection((prev) => {
        const nextCollection = prev.map((u) => {
          const xpGain = result.xpRewards[u.instanceId];
          if (!xpGain) return u;
          const newXp = u.xp + xpGain;
          const survivalIncrement = result.survivalUpdates?.[u.instanceId] || 0;
          const battleUpdate = result.battleUpdates?.[u.instanceId];
          const newSurvivalStreak = battleUpdate?.alive ? (u.survivalStreak || 0) + 1 : 0;
          const newEnemyMemory = battleUpdate?.enemyNames
            ? [...(u.enemyMemory || []), ...battleUpdate.enemyNames].filter((v, i, a) => a.indexOf(v) === i)
            : u.enemyMemory;
          return {
            ...u,
            xp: newXp,
            level: getLevel(newXp),
            survivalCount: (u.survivalCount || 0) + survivalIncrement,
            battleCount: (u.battleCount || 0) + (battleUpdate?.battleCount || 0),
            winCount: (u.winCount || 0) + (battleUpdate?.winCount || 0),
            survivalStreak: newSurvivalStreak,
            enemyMemory: newEnemyMemory,
          };
        });
        persist(nextCollection, squadIds);
        return nextCollection;
      });
    }
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    const seed = randomSeed();
    const res = battle(playerSquad, currentEncounter.squad, seed);
    setResult(res);
  }

  function handleNewBattle() {
    // Apply XP and survival updates to collection before leaving result screen
    if (result?.xpRewards) {
      setCollection((prev) => {
        const nextCollection = prev.map((u) => {
          const xpGain = result.xpRewards[u.instanceId];
          if (!xpGain) return u;
          const newXp = u.xp + xpGain;
          const survivalIncrement = result.survivalUpdates?.[u.instanceId] || 0;
          const battleUpdate = result.battleUpdates?.[u.instanceId];
          const newSurvivalStreak = battleUpdate?.alive ? (u.survivalStreak || 0) + 1 : 0;
          const newEnemyMemory = battleUpdate?.enemyNames
            ? [...(u.enemyMemory || []), ...battleUpdate.enemyNames].filter((v, i, a) => a.indexOf(v) === i)
            : u.enemyMemory;
          return {
            ...u,
            xp: newXp,
            level: getLevel(newXp),
            survivalCount: (u.survivalCount || 0) + survivalIncrement,
            battleCount: (u.battleCount || 0) + (battleUpdate?.battleCount || 0),
            winCount: (u.winCount || 0) + (battleUpdate?.winCount || 0),
            survivalStreak: newSurvivalStreak,
            enemyMemory: newEnemyMemory,
          };
        });
        persist(nextCollection, squadIds);
        return nextCollection;
      });
    }
    // Record encounter history
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
      setEncounterHistory(newHistory);
      persist(collection, squadIds, newHistory);
    }

    setResult(null);
    setCurrentEncounter(null);
    setScreen('collection');
  }

  // ── Dungeon functions ────────────────────────────────────────────────────

  function startDungeon(dungeon) {
    setDungeonRun({ dungeon, nodeIndex: 0, hpOverrides: {}, runLog: [], failed: false, failedAt: null });
    setScreen('dungeon');
  }

  function selectDungeonEncounter(encounterId) {
    const encounter = ENCOUNTERS.find((e) => e.id === encounterId);
    setCurrentEncounter(encounter);
    setScreen('prebattle');
  }

  function applyXpFromResult(res) {
    if (!res?.xpRewards) return;
    setCollection((prev) => {
      const next = prev.map((u) => {
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
      persist(next, squadIds);
      return next;
    });
  }

  function handleDungeonContinue() {
    if (!dungeonRun || !result || !currentEncounter) return;
    applyXpFromResult(result);

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

    setResult(null);
    setCurrentEncounter(null);

    if (nextNodeIndex >= dungeonRun.dungeon.nodes.length) {
      setDungeonRun((prev) => ({ ...prev, nodeIndex: nextNodeIndex, hpOverrides: newHpOverrides, runLog: newLog, complete: true }));
      setScreen('dungeonresult');
    } else {
      setDungeonRun((prev) => ({ ...prev, nodeIndex: nextNodeIndex, hpOverrides: newHpOverrides, runLog: newLog }));
      setScreen('dungeon');
    }
  }

  function handleDungeonFail() {
    if (!dungeonRun) return;
    const isBoss = currentEncounter && dungeonRun.dungeon.nodes[dungeonRun.nodeIndex]?.type === 'boss';
    const newLog = currentEncounter
      ? [...dungeonRun.runLog, { encounterId: currentEncounter.id, won: false, xpEarned: 0, isBoss: !!isBoss }]
      : dungeonRun.runLog;
    setDungeonRun((prev) => ({ ...prev, runLog: newLog, failed: true, failedAt: currentEncounter?.id || null }));
    setResult(null);
    setCurrentEncounter(null);
    setScreen('dungeonresult');
  }

  function handleDungeonResultDone() {
    setDungeonRun(null);
    setScreen('collection');
  }

  function handleDungeonRunAgain() {
    const dungeon = dungeonRun?.dungeon;
    setDungeonRun(null);
    if (dungeon) startDungeon(dungeon);
  }

  const reserve = collection.filter((u) => !squadIds.includes(u.instanceId));

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#080810',
      color: '#eee',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#0a0a14',
        borderBottom: '1px solid #1a1a2a',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#e86040', letterSpacing: 2 }}>
          8gents
        </span>
        <span style={{
          fontSize: 10,
          color: '#ddd',
          background: '#1a1a22',
          padding: '3px 8px',
          borderRadius: 4,
          letterSpacing: 1,
          fontFamily: 'monospace',
          border: '1px solid #444',
          fontWeight: 600,
        }}>
          {VERSION}
        </span>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px 40px' }}>
        {screen === 'collection' && (
          <CollectionScreen
            collection={collection}
            squadIds={squadIds}
            onToggleSquad={toggleSquad}
            onFeed={openFeed}
            onEncounters={() => setScreen('encounters')}
            onWalk={() => setScreen('world')}
            onDungeon={() => setScreen('dungeon')}
            justFedInstanceId={justFedInstanceId}
            onEquipCore={equipCore}
            onEquipModule={equipModule}
          />
        )}
        {screen === 'encounters' && (
          <EncounterScreen
            encounters={ENCOUNTERS}
            playerSquadSize={squadIds.length}
            onRun={runEncounter}
            onBack={() => setScreen('collection')}
            encounterHistory={encounterHistory}
          />
        )}
        {screen === 'world' && (
          <WorldScreen
            onSelectSpawn={enterGpsSpawn}
            onBack={() => setScreen('collection')}
          />
        )}
        {screen === 'wildhunt' && currentZone && currentWildTarget && (
          <WildHunt
            zone={currentZone}
            target={currentWildTarget}
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            onHunt={commitHunt}
            onBack={() => setScreen('world')}
          />
        )}
        {screen === 'catchresult' && catchResult && currentWildTarget && currentZone && (
          <CatchResult
            caught={catchResult.caught}
            creature={currentWildTarget}
            zone={currentZone}
            onWalkAgain={() => {
              const target = currentZone.pool[Math.floor(Math.random() * currentZone.pool.length)];
              setCurrentWildTarget(target);
              setCatchResult(null);
              setScreen('wildhunt');
            }}
            onRoster={() => {
              setCatchResult(null);
              setCurrentZone(null);
              setCurrentWildTarget(null);
              setScreen('collection');
            }}
          />
        )}
        {screen === 'prebattle' && currentEncounter && (
          <PreBattle
            encounter={currentEncounter}
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            onCommit={commitBattle}
            onBack={() => dungeonRun ? setScreen('dungeon') : setScreen('encounters')}
          />
        )}
        {screen === 'result' && result && (
          <Result
            result={result}
            onTryAgain={dungeonRun ? null : handleTryAgain}
            onNewBattle={dungeonRun ? null : handleNewBattle}
            onDungeonContinue={dungeonRun ? handleDungeonContinue : null}
            onDungeonFail={dungeonRun ? handleDungeonFail : null}
          />
        )}
        {screen === 'dungeon' && (
          <DungeonScreen
            dungeons={DUNGEONS}
            dungeonRun={dungeonRun}
            collection={collection}
            squadIds={squadIds}
            onStart={startDungeon}
            onSelectEncounter={selectDungeonEncounter}
            onAbandon={handleDungeonFail}
            onBack={() => setScreen('collection')}
          />
        )}
        {screen === 'dungeonresult' && dungeonRun && (
          <DungeonResult
            dungeonRun={dungeonRun}
            runLog={dungeonRun.runLog}
            collection={collection}
            squadIds={squadIds}
            onRunAgain={handleDungeonRunAgain}
            onReturn={handleDungeonResultDone}
          />
        )}
      </main>

      {feedTarget && (
        <FeedModal
          target={feedTarget}
          availableFodder={collection}
          allCollection={collection}
          squadIds={squadIds}
          onConfirm={confirmFeed}
          onClose={() => setFeedTarget(null)}
        />
      )}
    </div>
  );
}

export default App;
