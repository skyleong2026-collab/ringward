import { useState, useEffect, useCallback } from 'react';
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
import BattleScreen from './screens/BattleScreen.jsx';
import ContractsList from './screens/ContractsList.jsx';
import ContractScreen from './screens/ContractScreen.jsx';
import ContractResult from './screens/ContractResult.jsx';
import { resolveBattle } from './engine/battleStepEngine.js';
import { levelEnemySquad, rollSpawnLevel } from './engine/squad.js';
import { randomSeed } from './engine/rng.js';
import { buildStartingCollection } from './data/startingCollection.js';
import { ENCOUNTERS } from './data/encounters.js';
import { DUNGEONS } from './data/dungeons.js';
import { CONTRACTS, countRevealed, payoutRepAmount } from './data/contracts.js';
import { ARCHETYPES } from './data/creatures.js';
import { getLevel } from './engine/progression.js';
import { XP_PER_FEED } from './engine/progression.js';
import { recordContractWin, extractFiredSynergies, loadIntel, revealIntelAxis } from './engine/codex.js';
import { animationStyles } from './ui/animations.js';

const VERSION = 'vC-C';

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
    gearId: null,
    moduleIds: [],
  };
}

// Battle-level rule overrides for a contract (e.g. "Hold the Crossing" halves
// single-target damage). Undefined when the contract has no engine modifier, so
// non-modifier contracts run the engine exactly as before.
function contractModifiers(contract) {
  const s = contract?.modifier?.singleTargetDamageScale;
  return s != null ? { singleTargetDamageScale: s } : undefined;
}

// The fielded squad for a contract: a hold contract prepends its transient
// escortee (the thing you protect). The escortee never enters the roster.
function contractPlayerSquad(contract, baseSquad) {
  return contract?.escortee ? [contract.escortee, ...baseSquad] : baseSquad;
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

  const [battleSeed, setBattleSeed] = useState(null);
  const [currentZone, setCurrentZone] = useState(null);
  const [currentWildTarget, setCurrentWildTarget] = useState(null);
  const [catchResult, setCatchResult] = useState(null);

  // ── Dungeon run state ────────────────────────────────────────────────────
  // { dungeon, nodeIndex, hpOverrides: {instanceId: hp}, runLog: [{encounterId, won, xpEarned, isBoss, hpSnapshot}], failed, failedAt }
  const [dungeonRun, setDungeonRun] = useState(null);

  // ── Contract state (§20.8 — the frame layer) ──────────────────────────────
  // currentContract is the contract being viewed/run; contractOutcome holds the
  // resolved win/loss + Codex result for the payout screen. Contracts pay access
  // (Codex/reputation), never stat-power — no XP is applied from a contract.
  const [currentContract, setCurrentContract] = useState(null);
  const [contractOutcome, setContractOutcome] = useState(null);
  // Intel layer (§20.8.4): per-contract revealed axes, the active recon, and the
  // last recon's feedback shown back on the contract screen.
  const [contractIntel, setContractIntel] = useState({});
  const [reconAxis, setReconAxis] = useState(null);
  const [reconFeedback, setReconFeedback] = useState(null);

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

  function equipGear(instanceId, gearId) {
    setCollection((prev) => {
      const next = prev.map((u) =>
        u.instanceId === instanceId ? { ...u, gearId: gearId ?? null } : u
      );
      persist(next, squadIds);
      return next;
    });
  }

  function equipModule(instanceId, moduleId) {
    if (!moduleId) return;
    setCollection((prev) => {
      const next = prev.map((u) => {
        if (u.instanceId !== instanceId) return u;
        const ids = u.moduleIds || [];
        const nextIds = ids.includes(moduleId)
          ? ids.filter((id) => id !== moduleId)
          : [...ids, moduleId].slice(0, 3);
        return { ...u, moduleIds: nextIds };
      });
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
    const base = zone.pool[Math.floor(Math.random() * zone.pool.length)];
    const target = { ...base, level: rollSpawnLevel(zone) };
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
    const res = resolveBattle(playerSquad, [currentWildTarget], seed);
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
    setBattleSeed(randomSeed());
    setScreen('battle');
  }

  const handleBattleComplete = useCallback((res) => {
    setResult(res);
    setScreen('result');
  }, []);

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
    const res = resolveBattle(playerSquad, levelEnemySquad(currentEncounter.squad, currentEncounter.level), seed);
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

  // ── Contract functions (§20.8) ────────────────────────────────────────────

  function openContract(contract) {
    setCurrentContract(contract);
    setContractOutcome(null);
    setContractIntel(loadIntel(contract.id)); // revealed axes persist across sessions
    setReconFeedback(null);
    setScreen('contract');
  }

  // ── Recon (§20.8.4) — scout one axis by fighting its enemy fragment ──
  function handleScout(axis) {
    if (!currentContract) return;
    setReconAxis(axis);
    setReconFeedback(null);
    setBattleSeed(randomSeed());
    setScreen('reconbattle');
  }

  const handleReconComplete = useCallback((res) => {
    // Low-stakes: a win reveals the axis; a loss reveals nothing and is retryable.
    // Nothing touches the roster, no XP either way (recon is practice, not payout).
    const axis = reconAxis;
    const spec = currentContract?.intel?.[axis];
    if (res.winner === 'A' && currentContract && axis) {
      const nextIntel = revealIntelAxis(currentContract.id, axis);
      setContractIntel(nextIntel);
      setReconFeedback({ ok: true, text: `Recon successful — ${spec?.label ?? axis} scouted.` });
    } else {
      setReconFeedback({ ok: false, text: `Recon broke off — ${spec?.label ?? axis} still hidden. You can scout again.` });
    }
    setReconAxis(null);
    setScreen('contract');
  }, [reconAxis, currentContract]);

  function commitContract() {
    setBattleSeed(randomSeed());
    setScreen('contractbattle');
  }

  const handleContractComplete = useCallback((res) => {
    // Outcome is judged off the engine result plus whichever frame overlay this
    // contract uses — the signal clock (3rd detonation) or the hold objective
    // (escortee falls). Either can flip the raw winner into a contract loss.
    let won, reason;
    if (res.clockExpired) {
      won = false; reason = 'clock';
    } else if (res.holdFailed) {
      won = false; reason = 'escortee';
    } else if (res.winner === 'A') {
      won = true; reason = 'win';
    } else {
      won = false; reason = 'squad';
    }

    // The §20.8.4 risk dial: how much you scouted sets the reward you walk with.
    const revealedCount = countRevealed(contractIntel);
    const repAmount = currentContract ? payoutRepAmount(currentContract, revealedCount) : 0;

    let codexResult = null;
    let firedSynergies = [];
    if (won && currentContract) {
      // Access-only payout: unlock artifact + reputation + log fired synergies.
      // No XP / stat changes are applied (§20.8.2).
      firedSynergies = extractFiredSynergies(res);
      codexResult = recordContractWin(currentContract, firedSynergies, { repAmount });
    }

    setContractOutcome({ won, reason, result: res, codexResult, firedSynergies, revealedCount, repAmount });
    setScreen('contractresult');
  }, [currentContract, contractIntel]);

  function handleContractRetry() {
    setContractOutcome(null);
    setBattleSeed(randomSeed());
    setScreen('contractbattle');
  }

  function handleContractDone() {
    setContractOutcome(null);
    setCurrentContract(null);
    setScreen('contracts'); // back to the board, where standing/cleared status updates
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
            onContracts={() => setScreen('contracts')}
            justFedInstanceId={justFedInstanceId}
            onEquipGear={equipGear}
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
              const base = currentZone.pool[Math.floor(Math.random() * currentZone.pool.length)];
              const target = { ...base, level: rollSpawnLevel(currentZone) };
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
        {screen === 'battle' && currentEncounter && battleSeed !== null && (
          <BattleScreen
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId)).map((u) => {
              if (!dungeonRun) return u;
              const hp = dungeonRun.hpOverrides[u.instanceId];
              return hp !== undefined ? { ...u, currentHP: hp } : u;
            })}
            enemySquad={levelEnemySquad(currentEncounter.squad, currentEncounter.level)}
            seed={battleSeed}
            onComplete={handleBattleComplete}
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
        {screen === 'contracts' && (
          <ContractsList
            contracts={CONTRACTS}
            onSelect={openContract}
            onBack={() => setScreen('collection')}
          />
        )}
        {screen === 'contract' && currentContract && (
          <ContractScreen
            contract={currentContract}
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            intel={contractIntel}
            reconFeedback={reconFeedback}
            onScout={handleScout}
            onCommit={commitContract}
            onBack={() => setScreen('contracts')}
          />
        )}
        {screen === 'reconbattle' && currentContract && reconAxis && battleSeed !== null && (
          <BattleScreen
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            enemySquad={levelEnemySquad(
              [currentContract.squad[currentContract.intel[reconAxis].fragmentIndex]],
              currentContract.level,
            )}
            seed={battleSeed}
            onComplete={handleReconComplete}
            maxInterventions={currentContract.modifier.interventionBudget}
            modifiers={contractModifiers(currentContract)}
            bannerLabel={`RECON · ${currentContract.intel[reconAxis].label.toUpperCase()}`}
          />
        )}
        {screen === 'contractbattle' && currentContract && battleSeed !== null && (
          <BattleScreen
            playerSquad={contractPlayerSquad(
              currentContract,
              collection.filter((u) => squadIds.includes(u.instanceId)),
            )}
            enemySquad={levelEnemySquad(currentContract.squad, currentContract.level)}
            seed={battleSeed}
            onComplete={handleContractComplete}
            maxInterventions={currentContract.modifier.interventionBudget}
            detonationClock={currentContract.winCondition.detonationLimit ?? null}
            clockLabel={currentContract.winCondition.clockLabel}
            holdCondition={currentContract.winCondition.hold ?? null}
            modifiers={contractModifiers(currentContract)}
          />
        )}
        {screen === 'contractresult' && currentContract && contractOutcome && (
          <ContractResult
            contract={currentContract}
            outcome={contractOutcome}
            onRetry={handleContractRetry}
            onDone={handleContractDone}
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
