import { useState, useEffect } from 'react';
import { SeamLab } from './screens/SeamLab.jsx';
import { animationStyles } from './ui/animations.js';

const VERSION = 'vF-BT';

// ── Ringward IS the game. ───────────────────────────────────────────────────────
// The home screen and the whole experience live in the SEAM run (src/screens/
// SeamLab.jsx). App is now a thin shell: it owns the slag wallet — the ONE universal
// build currency the Forge spends and a run banks into — and renders the game.
//
// The old legacy shell (collection / contracts / dungeons / pvp / world / wild-hunt)
// was retired here in vF-BH. It used to render underneath SeamLab and only bled
// faintly through; it's gone now. Its screen files remain on disk, unimported, in
// case any of it is ever revived — but nothing renders them.
function App() {
  // Keep the shared animation keyframes injected (combat/UI components may reference them).
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = animationStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // slag = the ONE universal build currency. Persisted in the shared wallet so a SEAM
  // run banks into the same slag the Forge spends. Read as (slag ?? 0) for old saves.
  const [currencies, setCurrencies] = useState(() => {
    try {
      const saved = localStorage.getItem('8gents_currencies');
      return saved ? JSON.parse(saved) : { slag: 0 };
    } catch {
      return { slag: 0 };
    }
  });

  // Add (or spend, if n<0) slag; clamped at 0; persisted immediately.
  function addSlag(n) {
    setCurrencies((c) => {
      const next = { ...c, slag: Math.max(0, (c.slag ?? 0) + n) };
      try { localStorage.setItem('8gents_currencies', JSON.stringify(next)); } catch { /* best-effort */ }
      return next;
    });
  }

  return <SeamLab slag={currencies.slag ?? 0} onSlag={addSlag} version={VERSION} />;
}

export default App;
