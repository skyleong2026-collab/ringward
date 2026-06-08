import { useState, useEffect, useRef } from 'react';

// FramePlayer — cycles PNG frames from public/art/creatures/{id}/{action}_{variant}/
// Falls back to the static sprite (public/sprites/{id}.jpg or .png) when no frames exist.
//
// Props:
//   creature  — { id, name }  (creature.id maps to the sprite/frame directory)
//   action    — 'idle' | 'attack' | 'hurt' | 'death'
//   variant   — 'v3' | 'pixel' (default 'v3')
//   size      — px number (default 128)
//   fps       — frames per second (default 8)
//   style     — extra style for the outer wrapper
export function FramePlayer({ creature, action = 'idle', variant = 'v3', size = 128, fps = 8, style }) {
  const [frames, setFrames] = useState([]);
  const [idx, setIdx]       = useState(0);
  const [ready, setReady]   = useState(false);
  const probeRef = useRef(false);

  // Probe frame sequence on mount or when creature/action/variant changes.
  // Tries frame_00 … frame_15, stops at first 404.
  useEffect(() => {
    probeRef.current = false;
    setFrames([]);
    setIdx(0);
    setReady(false);

    const basePath = `/art/creatures/${creature.id}/${action}_${variant}/`;
    const found = [];

    function tryFrame(n) {
      if (probeRef.current) return; // unmounted
      const src = `${basePath}frame_${String(n).padStart(2, '0')}.png`;
      const img = new Image();
      img.onload = () => {
        if (probeRef.current) return;
        found.push(src);
        if (n < 15) tryFrame(n + 1);
        else finish();
      };
      img.onerror = () => {
        if (probeRef.current) return;
        finish();
      };
      img.src = src;
    }

    function finish() {
      if (found.length > 0) {
        setFrames([...found]);
        setReady(true);
      } else {
        setReady(true); // no frames → will render static fallback
      }
    }

    tryFrame(0);
    return () => { probeRef.current = true; };
  }, [creature.id, action, variant]);

  // Cycle frames
  useEffect(() => {
    if (frames.length <= 1) return;
    const ms = 1000 / fps;
    const id = setInterval(() => setIdx((i) => (i + 1) % frames.length), ms);
    return () => clearInterval(id);
  }, [frames.length, fps]);

  const staticSrc = `/sprites/${creature.id}.jpg`;

  return (
    <div style={{ width: size, height: size, position: 'relative', ...style }}>
      {ready && frames.length > 0 ? (
        <img
          key={frames[idx]}
          src={frames[idx]}
          alt={`${creature.id} ${action} frame ${idx}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: variant === 'pixel' ? 'pixelated' : 'auto' }}
        />
      ) : (
        <img
          src={staticSrc}
          alt={creature.id}
          onError={(e) => { e.target.style.display = 'none'; }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: ready ? 1 : 0.4 }}
        />
      )}
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#555' }}>
          …
        </div>
      )}
    </div>
  );
}
