import { useState } from 'react';
import Builder from './screens/Builder.jsx';
import Result from './screens/Result.jsx';
import { battle } from './engine/battle.js';
import { randomSeed } from './engine/rng.js';

const VERSION = 'vA-A';

function App() {
  const [screen, setScreen] = useState('builder');
  const [squadA, setSquadA] = useState([]);
  const [squadB, setSquadB] = useState([]);
  const [result, setResult] = useState(null);

  function runBattle() {
    const seed = randomSeed();
    const res = battle(squadA, squadB, seed);
    setResult(res);
    setScreen('result');
  }

  function handleTryAgain() {
    const seed = randomSeed();
    const res = battle(squadA, squadB, seed);
    setResult(res);
  }

  function handleNewBattle() {
    setSquadA([]);
    setSquadB([]);
    setResult(null);
    setScreen('builder');
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#080810',
        color: '#eee',
        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#0a0a14',
          borderBottom: '1px solid #1a1a2a',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#e86040', letterSpacing: 2 }}>
            8gents
          </span>
          {screen === 'result' && (
            <button
              onClick={handleNewBattle}
              style={{
                marginLeft: 12,
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 12,
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              ← Builder
            </button>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            color: '#444',
            background: '#111',
            padding: '3px 8px',
            borderRadius: 4,
            letterSpacing: 1,
            fontFamily: 'monospace',
            border: '1px solid #222',
          }}
        >
          {VERSION}
        </span>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px 40px' }}>
        {screen === 'builder' && (
          <Builder
            squadA={squadA}
            squadB={squadB}
            onSquadAChange={setSquadA}
            onSquadBChange={setSquadB}
            onBattle={runBattle}
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
    </div>
  );
}

export default App;
