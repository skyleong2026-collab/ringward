import { useState } from 'react';
import CollectionScreen from './screens/CollectionScreen.jsx';
import EncounterScreen from './screens/EncounterScreen.jsx';
import FeedModal from './screens/FeedModal.jsx';
import Result from './screens/Result.jsx';
import { battle } from './engine/battle.js';
import { randomSeed } from './engine/rng.js';
import { buildStartingCollection } from './data/startingCollection.js';
import { ENCOUNTERS } from './data/encounters.js';
import { getLevel } from './engine/progression.js';
import { XP_PER_FEED } from './engine/progression.js';

const VERSION = 'vB-A';

function App() {
  const [screen, setScreen] = useState('collection');
  const [result, setResult] = useState(null);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [feedTarget, setFeedTarget] = useState(null);

  const [collection, setCollection] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_collection');
      return saved ? JSON.parse(saved) : buildStartingCollection();
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

  function persist(newCollection, newSquadIds) {
    localStorage.setItem('8gents_collection', JSON.stringify(newCollection));
    localStorage.setItem('8gents_squadIds', JSON.stringify(newSquadIds));
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

  function openFeed(unit) {
    setFeedTarget(unit);
  }

  function confirmFeed(targetInstanceId, fodderInstanceIds) {
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
    setFeedTarget(null);
  }

  function runEncounter(encounter) {
    setCurrentEncounter(encounter);
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    const seed = randomSeed();
    const res = battle(playerSquad, encounter.squad, seed);
    setResult(res);
    setScreen('result');
  }

  function handleTryAgain() {
    if (!currentEncounter) return;
    const playerSquad = collection.filter((u) => squadIds.includes(u.instanceId));
    const seed = randomSeed();
    const res = battle(playerSquad, currentEncounter.squad, seed);
    setResult(res);
  }

  function handleNewBattle() {
    setResult(null);
    setCurrentEncounter(null);
    setScreen('collection');
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
          color: '#444',
          background: '#111',
          padding: '3px 8px',
          borderRadius: 4,
          letterSpacing: 1,
          fontFamily: 'monospace',
          border: '1px solid #222',
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
          />
        )}
        {screen === 'encounters' && (
          <EncounterScreen
            encounters={ENCOUNTERS}
            playerSquadSize={squadIds.length}
            onRun={runEncounter}
            onBack={() => setScreen('collection')}
          />
        )}
        {screen === 'result' && result && (
          <Result
            result={result}
            onTryAgain={handleTryAgain}
            onNewBattle={handleNewBattle}
          />
        )}
      </main>

      {feedTarget && (
        <FeedModal
          target={feedTarget}
          availableFodder={collection}
          allCollection={collection}
          onConfirm={confirmFeed}
          onClose={() => setFeedTarget(null)}
        />
      )}
    </div>
  );
}

export default App;
