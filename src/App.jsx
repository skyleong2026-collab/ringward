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
import PvpScreen from './screens/PvpScreen.jsx';
import { fetchOpponentPool, recordMatch, myRating } from './engine/pvp.js';
import { resolveBattle } from './engine/battleStepEngine.js';
import { levelEnemySquad, rollSpawnLevel } from './engine/squad.js';
import { randomSeed } from './engine/rng.js';
import { buildStartingCollection } from './data/startingCollection.js';
import { sigRankUpCost } from './data/sigMods.js';
import { ENCOUNTERS } from './data/encounters.js';
import { DUNGEONS } from './data/dungeons.js';
import { CONTRACTS, countRevealed, payoutRepAmountWithDifficulty, contractEnemyLevel, getRivalContract, RIVAL_UNLOCK_THRESHOLD, DIFFICULTIES } from './data/contracts.js';
import { ARCHETYPES, CREATURES } from './data/creatures.js';
import { getLevel } from './engine/progression.js';
import { XP_PER_FEED } from './engine/progression.js';
import { recordContractWin, extractFiredSynergies, loadIntel, revealIntelAxis, checkRivalUnlock, escalateRival, recordRivalLoss } from './engine/codex.js';
import { animationStyles } from './ui/animations.js';
import { MAX_SQUAD } from './config.js';

const VERSION = 'vC-M';

// Migrate stale archetype names from pre-vG-A builds
const ARCHETYPE_MIGRATION = { Anchor: 'Guardian', Relay: 'Echo', Predator: 'Swift', Ember: 'Spark' };
const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));
function migrateCollection(col) {
  return col.map((u) => {
    const base = CREATURE_BY_ID[u.id];
    return {
      ...u,
      archetype: ARCHETYPE_MIGRATION[u.archetype] ?? u.archetype,
      signature: u.signature ?? base?.signature ?? null,
      sigModIds: u.sigModIds ?? [],   // vC-K: add slot array for pre-vC-K saves
      sigRank: u.sigRank ?? 1,        // vC-M: signature rank for pre-vC-M saves
    };
  });
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
    sigModIds: [],
    sigRank: 1,
  };
}

// Hydrate a stored/serialized PvP squad ({id, level, gearId, moduleIds}) into
// engine-ready units by merging the creature definition + a synthetic instanceId.
function hydratePvpSquad(squad) {
  return (squad ?? []).map((u, i) => {
    const base = CREATURES.find((c) => c.id === u.id);
    if (!base) return null;
    return { ...base, instanceId: `opp_${u.id}_${i}`, level: u.level ?? 1, gearId: u.gearId ?? null, moduleIds: u.moduleIds ?? [], sigModIds: u.sigModIds ?? [], sigRank: u.sigRank ?? 1 };
  }).filter(Boolean);
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
  const [contractIntel, setContractIntel] = useState({});
  const [reconAxis, setReconAxis] = useState(null);
  const [reconFeedback, setReconFeedback] = useState(null);
  // Test 6: player-chosen difficulty for the current contract.
  const [selectedDifficulty, setSelectedDifficulty] = useState('standard');
  // Test 5: async-PvP — the opponent being fought + last match result banner.
  const [pvpOpponent, setPvpOpponent] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  const [pvpPool, setPvpPool] = useState([]);
  const [pvpPoolRefreshedAt, setPvpPoolRefreshedAt] = useState(0);

  const [encounterHistory, setEncounterHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_encounterHistory');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // ── Currencies (vC-J) ─────────────────────────────────────────────────────
  // Credits (⦿) = volume loop, from contracts → levelling.
  // Shards  (◈) = collection loop, from contracts + region clears → recruit/rank.
  // Marks   (✦) = prestige, from Rivals + Arena → rarest unlocks.
  const [currencies, setCurrencies] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_currencies');
      return saved ? JSON.parse(saved) : { credits: 0, shards: 0, marks: 0 };
    } catch {
      return { credits: 0, shards: 0, marks: 0 };
    }
  });

  function persistCurrencies(c) {
    try { localStorage.setItem('8gents_currencies', JSON.stringify(c)); } catch { /* best-effort */ }
  }

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
        if (prev.length >= MAX_SQUAD) return prev;
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

  // vC-K: toggle a signature modifier in a unit's sigModIds (cap 2 slots).
  function equipSigMod(instanceId, modId) {
    if (!modId) return;
    setCollection((prev) => {
      const next = prev.map((u) => {
        if (u.instanceId !== instanceId) return u;
        const ids = u.sigModIds ?? [];
        const nextIds = ids.includes(modId)
          ? ids.filter((id) => id !== modId)
          : [...ids, modId].slice(0, 2);
        return { ...u, sigModIds: nextIds };
      });
      persist(next, squadIds);
      return next;
    });
  }

  // vC-M: spend shards to advance a creature's signature rank (1→5). Higher rank
  // amplifies every modifier the creature has slotted.
  function rankUpSignature(instanceId) {
    const unit = collection.find((u) => u.instanceId === instanceId);
    if (!unit) return;
    const rank = unit.sigRank ?? 1;
    const cost = sigRankUpCost(rank);
    if (cost == null) return;                         // already maxed
    if ((currencies.shards ?? 0) < cost) return;      // can't afford
    setCurrencies((prev) => {
      const next = { ...prev, shards: (prev.shards ?? 0) - cost };
      persistCurrencies(next);
      return next;
    });
    setCollection((prev) => {
      const next = prev.map((u) =>
        u.instanceId === instanceId ? { ...u, sigRank: (u.sigRank ?? 1) + 1 } : u
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
    setContractIntel(loadIntel(contract.id));
    setReconFeedback(null);
    setSelectedDifficulty(contract.isRival ? 'standard' : 'standard'); // rivals ignore difficulty
    setScreen('contract');
  }

  function openRival(rivalDef) {
    const { rivals } = { rivals: {}, ...JSON.parse(localStorage.getItem('8gents_codex') || '{}') };
    const rivalData = rivals[rivalDef.faction.toLowerCase()];
    const contract = getRivalContract(rivalDef, rivalData?.tier ?? 0);
    setCurrentContract(contract);
    setContractOutcome(null);
    setContractIntel({});
    setReconFeedback(null);
    setSelectedDifficulty('standard');
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

  // ── Async PvP (Test 5) ──
  function openPvp() {
    setPvpResult(null);
    setScreen('pvp');
  }

  const PVP_REFRESH_COST = 20; // credits to bypass the cooldown

  // Load (or reload) the opponent pool. `paid=true` deducts credits and bypasses
  // the cooldown. `paid=false` is the free timed refresh (or the initial load).
  async function handleLoadPvpPool(paid = false) {
    if (paid) {
      if ((currencies.credits ?? 0) < PVP_REFRESH_COST) return;
      setCurrencies((prev) => {
        const next = { ...prev, credits: (prev.credits ?? 0) - PVP_REFRESH_COST };
        persistCurrencies(next);
        return next;
      });
    }
    const pool = await fetchOpponentPool(myRating() ?? 1000, 4);
    setPvpPool(pool);
    setPvpPoolRefreshedAt(Date.now());
  }

  function handleSelectOpponent(opp) {
    if (!opp || hydratePvpSquad(opp.squad).length === 0) return;
    setPvpOpponent(opp);
    setBattleSeed(randomSeed());
    setScreen('pvpbattle');
  }

  const handlePvpComplete = useCallback(async (res) => {
    const won = res.winner === 'A' && !res.forfeit;
    const delta = await recordMatch({
      defenderSquadRow: pvpOpponent,
      seed: battleSeed,
      winner: res.forfeit ? 'B' : res.winner,
      rounds: res.rounds ?? 10,
      myRating: myRating() ?? 1000,
    });
    setPvpResult({ won, delta: won ? Math.abs(delta) : -Math.abs(delta), opponentName: pvpOpponent?.player_name ?? 'Opponent' });
    setPvpOpponent(null);
    setScreen('pvp');
  }, [pvpOpponent, battleSeed]);

  const handleContractComplete = useCallback((res) => {
    // Outcome is judged off the engine result plus whichever frame overlay this
    // contract uses — the signal clock (3rd detonation) or the hold objective
    // (escortee falls). Either can flip the raw winner into a contract loss.
    let won, reason;
    if (res.forfeit) {
      won = false; reason = 'forfeit';
    } else if (res.clockExpired) {
      won = false; reason = 'clock';
    } else if (res.holdFailed) {
      won = false; reason = 'escortee';
    } else if (res.winner === 'A') {
      won = true; reason = 'win';
    } else {
      won = false; reason = 'squad';
    }

    // §20.8.4 risk dial × §Test 6 difficulty multiplier.
    const revealedCount = countRevealed(contractIntel);
    const isRival = !!currentContract?.isRival;
    const diffKey = isRival ? 'standard' : selectedDifficulty;
    const repAmount = currentContract ? payoutRepAmountWithDifficulty(currentContract, revealedCount, diffKey) : 0;

    let codexResult = null;
    let firedSynergies = [];
    let newRival = null;
    let currenciesEarned = { credits: 0, shards: 0, marks: 0 };

    if (won && currentContract) {
      firedSynergies = extractFiredSynergies(res);
      if (isRival) {
        escalateRival(currentContract.faction, currentContract.tiers.length - 1);
        codexResult = recordContractWin(currentContract, firedSynergies, { repAmount });
      } else {
        codexResult = recordContractWin(currentContract, firedSynergies, { repAmount });
        if (diffKey !== 'standard') {
          try {
            const raw = JSON.parse(localStorage.getItem('8gents_codex') || '{}');
            if (!raw.cleared) raw.cleared = {};
            const prev = raw.cleared[currentContract.id];
            const order = ['standard', 'hard', 'brutal'];
            if (!prev || order.indexOf(diffKey) > order.indexOf(prev)) {
              raw.cleared[currentContract.id] = diffKey;
              localStorage.setItem('8gents_codex', JSON.stringify(raw));
            }
          } catch { /* storage unavailable */ }
        }
        newRival = checkRivalUnlock(currentContract.client, RIVAL_UNLOCK_THRESHOLD);
      }
      // ── Award currencies ──────────────────────────────────────────────────
      const payout = currentContract.payout ?? {};
      const currMult = isRival ? 1 : (DIFFICULTIES[diffKey]?.payoutMult ?? 1);
      currenciesEarned = {
        credits: Math.round((payout.credits ?? 0) * currMult),
        shards:  Math.round((payout.shards  ?? 0) * currMult),
        marks:   payout.marks ?? 0,
      };
      setCurrencies((prev) => {
        const next = {
          credits: (prev.credits ?? 0) + currenciesEarned.credits,
          shards:  (prev.shards  ?? 0) + currenciesEarned.shards,
          marks:   (prev.marks   ?? 0) + currenciesEarned.marks,
        };
        persistCurrencies(next);
        return next;
      });
    }

    if (!won && isRival) {
      recordRivalLoss(currentContract.faction);
    }

    setContractOutcome({ won, reason, result: res, codexResult, firedSynergies, revealedCount, repAmount, difficultyKey: diffKey, newRival, currenciesEarned });
    setScreen('contractresult');
  }, [currentContract, contractIntel, selectedDifficulty]);

  function handleContractRetry() {
    setContractOutcome(null);
    setBattleSeed(randomSeed());
    setScreen('contractbattle'); // difficulty stays as player last set it
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
            currencies={currencies}
            onToggleSquad={toggleSquad}
            onFeed={openFeed}
            onEncounters={() => setScreen('encounters')}
            onWalk={() => setScreen('world')}
            onDungeon={() => setScreen('dungeon')}
            onContracts={() => setScreen('contracts')}
            onPvp={openPvp}
            justFedInstanceId={justFedInstanceId}
            onEquipGear={equipGear}
            onEquipModule={equipModule}
            onEquipSigMod={equipSigMod}
            onRankUp={rankUpSignature}
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
            onForfeit={() => (dungeonRun ? handleDungeonFail() : setScreen('encounters'))}
            forfeitLabel={dungeonRun ? 'Leaving ends the dungeon run. Your roster is unharmed.' : 'Leave this battle and return to encounters. Nothing is lost.'}
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
            onSelectRival={openRival}
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
            difficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
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
            onForfeit={() => { setReconAxis(null); setScreen('contract'); }}
            forfeitLabel="Break off the scout. The axis stays hidden — no cost, you can try again."
          />
        )}
        {screen === 'contractbattle' && currentContract && battleSeed !== null && (
          <BattleScreen
            playerSquad={contractPlayerSquad(
              currentContract,
              collection.filter((u) => squadIds.includes(u.instanceId)),
            )}
            enemySquad={levelEnemySquad(
              currentContract.squad,
              currentContract.isRival ? currentContract.level : contractEnemyLevel(currentContract, selectedDifficulty),
            )}
            seed={battleSeed}
            onComplete={handleContractComplete}
            maxInterventions={currentContract.modifier.interventionBudget}
            detonationClock={currentContract.winCondition.detonationLimit ?? null}
            clockLabel={currentContract.winCondition.clockLabel}
            holdCondition={currentContract.winCondition.hold ?? null}
            modifiers={contractModifiers(currentContract)}
            factionColor={currentContract.client ?? currentContract.faction}
            onForfeit={() => handleContractComplete({ winner: 'B', forfeit: true })}
            forfeitLabel={currentContract.isRival
              ? 'Forfeit counts as a loss to this Rival. They do not escalate, but it is on the record. No roster change.'
              : 'Forfeit counts as a loss on this contract. No roster change, no stat penalty — the job stays open.'}
          />
        )}
        {screen === 'pvp' && (
          <PvpScreen
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            pvpPool={pvpPool}
            pvpPoolRefreshedAt={pvpPoolRefreshedAt}
            currencies={currencies}
            refreshCost={PVP_REFRESH_COST}
            onLoadPool={handleLoadPvpPool}
            onSelectOpponent={handleSelectOpponent}
            onBack={() => setScreen('collection')}
            lastResult={pvpResult}
          />
        )}
        {screen === 'pvpbattle' && pvpOpponent && battleSeed !== null && (
          <BattleScreen
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            enemySquad={hydratePvpSquad(pvpOpponent.squad)}
            seed={battleSeed}
            onComplete={handlePvpComplete}
            onForfeit={() => handlePvpComplete({ winner: 'B', forfeit: true, rounds: 0 })}
            forfeitLabel="Concede the match. Counts as a loss; rating drops. No roster change."
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
