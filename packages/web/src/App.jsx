import { useEffect, useCallback } from 'react';
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
import { battle, randomSeed } from '@8gents/engine';
import { ENCOUNTERS, DUNGEONS, ARCHETYPES } from '@8gents/game-data';
import { animationStyles } from './ui/animations.js';
import { useGameState } from './hooks/useGameState.js';

const VERSION = 'vI-A';

function App() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }, []);

  // ── Game state ────────────────────────────────────────────────────────────
  const {
    screen, setScreen,
    result, currentEncounter, feedTarget, justFedInstanceId,
    collection, squadIds, battleSeed,
    currentZone, currentWildTarget, catchResult,
    dungeonRun, encounterHistory,
    toggleSquad, equipCore, equipModule, openFeed, confirmFeed,
    enterZone, enterGpsSpawn, commitHunt,
    runEncounter, commitBattle, applyXpFromResult, handleBattleComplete,
    handleTryAgain, handleNewBattle,
    startDungeon, selectDungeonEncounter,
    handleDungeonContinue, handleDungeonFail, handleDungeonResultDone, handleDungeonRunAgain,
  } = useGameState();

  const reserve = collection.filter((u) => !squadIds.includes(u.instanceId));

  const handleBattleCompleteCallback = useCallback((res) => {
    handleBattleComplete(res);
  }, [handleBattleComplete]);

  const handleTryAgainWrapper = useCallback(() => {
    if (!currentEncounter) return;
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    applyXpFromResult(result);
    const seed = randomSeed();
    const res = battle(playerSquad, currentEncounter.squad, seed);
    handleBattleComplete(res);
  }, [currentEncounter, collection, squadIds, result, applyXpFromResult, handleBattleComplete]);

  const handleNewBattleWrapper = useCallback(() => {
    handleNewBattle();
  }, [handleNewBattle]);

  const handleDungeonContinueWrapper = useCallback(() => {
    handleDungeonContinue();
  }, [handleDungeonContinue]);

  const commitHuntWrapper = useCallback(() => {
    if (!currentWildTarget || !currentZone) return;
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    commitHunt(playerSquad, currentWildTarget, currentZone, battle, randomSeed);
  }, [currentWildTarget, currentZone, collection, squadIds, commitHunt]);

  const selectDungeonEncounterWrapper = useCallback((encounterId) => {
    selectDungeonEncounter(encounterId, ENCOUNTERS);
  }, [selectDungeonEncounter]);

  const enterGpsSpawnWrapper = useCallback((spawn) => {
    enterGpsSpawn(spawn, ARCHETYPES);
  }, [enterGpsSpawn]);

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
            onSelectSpawn={enterGpsSpawnWrapper}
            onBack={() => setScreen('collection')}
          />
        )}
        {screen === 'wildhunt' && currentZone && currentWildTarget && (
          <WildHunt
            zone={currentZone}
            target={currentWildTarget}
            playerSquad={collection.filter((u) => squadIds.includes(u.instanceId))}
            onHunt={commitHuntWrapper}
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
              useGameState.setState({ currentWildTarget: target, catchResult: null, screen: 'wildhunt' });
            }}
            onRoster={() => {
              useGameState.setState({ catchResult: null, currentZone: null, currentWildTarget: null, screen: 'collection' });
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
            enemySquad={currentEncounter.squad}
            seed={battleSeed}
            onComplete={handleBattleCompleteCallback}
          />
        )}
        {screen === 'result' && result && (
          <Result
            result={result}
            onTryAgain={dungeonRun ? null : handleTryAgainWrapper}
            onNewBattle={dungeonRun ? null : handleNewBattleWrapper}
            onDungeonContinue={dungeonRun ? handleDungeonContinueWrapper : null}
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
            onSelectEncounter={selectDungeonEncounterWrapper}
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
          onClose={() => useGameState.setState({ feedTarget: null })}
        />
      )}
    </div>
  );
}

export default App;
