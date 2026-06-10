// lore.js — THE CARVED STONES (vF-CE): the deep past, surfaced one stone per ring.
// The first time you clear a ring, you find a stone the old folk carved — weathered,
// plain-spoken, older than the blight. Each stone quietly breaks one assumption the
// player has been carrying, and each opens a THREAD the story can answer in a later
// iteration (the answers live in docs/RINGWARD-LORE-BIBLE.md, deliberately NOT here).
// Voice: first-person-plural of the ring-folk who came before. Short. No jargon.

export const DEEP_INSCRIPTIONS = {
  'outer-ring': {
    title: 'The Rim-Stone',
    text: '“We set this stone when the rings were gardens. If you are reading it, they are not gardens anymore, and we are not anyone anymore. Go gently inward. Everything you will meet down there, we made.”',
    thread: 'Someone came before — and made the rings.',
  },
  'fallen-gate': {
    title: 'The Gate-Stone',
    text: '“Strangers will say the gate was built to keep the blight out. Look at the foundations. We laid them long before any blight, and we laid them facing in.”',
    thread: 'The old folk feared something inside — before there was a blight at all.',
  },
  'green-seam': {
    title: 'The Garden-Stone',
    text: '“Here we grew the first keepers — earth and wire and a little of our own warmth for the heart. We taught them to tend the rings. We never taught them to be alone.”',
    thread: 'Grunlings were grown here, on purpose. Your squad is somebody\'s craft, gone feral.',
  },
  'storm-wire': {
    title: 'The Wire-Stone',
    text: '“Whatever else fails, the current must not stop. Feed the lines. Do not ask what they carry. It is not for the living to know what the current is for.”',
    thread: 'The power was left on deliberately. The lines carry something — or keep something.',
  },
  'fast-trails': {
    title: 'The Trail-Stone',
    text: '“The fast ones were ours once. They ran messages ring to ring, rim to deep, faster than weather. If they run at you now, forgive them. They are still delivering something.”',
    thread: 'The Strikers are feral couriers — still carrying a last message. To whom?',
  },
  'lightless': {
    title: 'The Dark-Stone',
    text: '“Past here we worked without light, out of respect. Do not name what watches. Named things wake. It has been so patient, and it was so good to us, once.”',
    thread: 'The watcher below was KNOWN to the old folk — and kind, once.',
  },
  'witherfen': {
    title: 'The Fen-Stone',
    text: '“You will curse the blight, as we cursed it. Curse it gently. The blight is not the wound — it is the bandage. We never found what it is bandaging.”',
    thread: 'The blight is the world\'s scar tissue, not its sickness. What is the wound?',
  },
  'frostbound': {
    title: 'The Still-Stone',
    text: '“We made the Stillness last of all, and we made it of ourselves — our calm, our cold, our refusal. It does not guard the Drop from you. It guards you from wanting it. Forgive it too.”',
    thread: 'The final warden is made FROM the old folk. It is mercy, not a wall.',
  },
};

// Storage key for found stones — an array of ring ids, persisted like other collections.
export const STONES_KEY = '8gents_seam_stones';
export function loadStones() { try { const s = JSON.parse(localStorage.getItem(STONES_KEY) || '[]'); return Array.isArray(s) ? s : []; } catch { return []; } }
export function saveStones(ids) { try { localStorage.setItem(STONES_KEY, JSON.stringify(ids)); } catch { /* best-effort */ } }
