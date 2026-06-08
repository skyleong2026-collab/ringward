// In-game tester feedback — pure logic + a thin Supabase POST.
//
// Testers tap the floating 💬 button, write a note, pick a tag. We attach
// run context (version, deepest ring, roster, screen) so a report is
// actionable instead of "it's broken". Submissions land in a Supabase table.
//
// WIRING: fill these two constants once the Supabase project + `feedback`
// table exist (see SUPABASE_SETUP below). The publishable/anon key is meant
// to live in client code — it's safe ONLY because the table's row-level
// security allows INSERT but not SELECT, so a tester can post but can't read
// anyone's feedback. Until these are set, the UI saves notes to a local
// outbox so nothing is lost and the build never breaks.
export const SUPABASE_URL = '';        // e.g. 'https://abcd1234.supabase.co'
export const SUPABASE_ANON_KEY = '';   // e.g. 'sb_publishable_...' (anon/publishable key ONLY)

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const FEEDBACK_TAGS = [
  { id: 'bug', label: 'Bug', icon: '🐞' },
  { id: 'confusing', label: 'Confusing', icon: '🤔' },
  { id: 'idea', label: 'Idea', icon: '💡' },
  { id: 'love', label: 'Love it', icon: '❤️' },
];
export const TAG_IDS = FEEDBACK_TAGS.map((t) => t.id);

// Live run state the React tree pushes here so collectContext can read it
// without prop-drilling through the whole component. RunMode updates it.
export const liveContext = { screen: null, phase: null, squad: null };
export function setLiveContext(patch) { Object.assign(liveContext, patch); }

// localStorage keys mirrored from SeamLab — read defensively (any may be absent).
const K = {
  unlocked: '8gents_seam_unlocked',
  crossing: '8gents_seam_crossing',
  stable: '8gents_seam_stable',
  relics: '8gents_seam_relics',
  shards: '8gents_seam_shards',
  wards: '8gents_seam_wards',
};
const OUTBOX_KEY = '8gents_feedback_outbox';

function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch { return fallback; }
}
function readInt(key, fallback) {
  try { const n = parseInt(localStorage.getItem(key), 10); return Number.isFinite(n) ? n : fallback; }
  catch { return fallback; }
}

// Gather everything that makes a report actionable. `getStorage` is injectable
// for headless tests; defaults to the live reads above.
export function collectContext(version, env = {}) {
  const live = env.live || liveContext;
  const ctx = {
    version: version || null,
    screen: live.screen || null,
    phase: live.phase || null,
    squad: Array.isArray(live.squad) ? live.squad : null,
    ua: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
    viewport: (typeof window !== 'undefined' && window.innerWidth)
      ? `${window.innerWidth}x${window.innerHeight}` : null,
  };
  if (typeof localStorage !== 'undefined') {
    ctx.ringReached = readInt(K.unlocked, null);
    ctx.crossing = readInt(K.crossing, null);
    ctx.shards = readInt(K.shards, null);
    const stable = readJSON(K.stable, null);
    ctx.rosterCount = Array.isArray(stable) ? stable.length : null;
    const relics = readJSON(K.relics, null);
    ctx.relicCount = Array.isArray(relics) ? relics.length : null;
    const wards = readJSON(K.wards, null);
    ctx.wardsSolved = wards && typeof wards === 'object'
      ? Object.values(wards).filter((w) => w && w.solved).length : null;
  }
  return ctx;
}

// Pure: shape the row exactly as the Supabase `feedback` table expects.
// Trims/normalizes so junk rows don't land in the table.
export function buildPayload(tag, message, context) {
  const msg = (message || '').trim();
  const validTag = TAG_IDS.includes(tag) ? tag : 'idea';
  return {
    tag: validTag,
    message: msg.slice(0, 2000),
    version: context?.version || null,
    context: context || {},
  };
}

export function validateMessage(message) {
  const msg = (message || '').trim();
  if (msg.length < 3) return 'Add a little more detail.';
  if (msg.length > 2000) return 'A touch long — trim it under 2000 characters.';
  return null;
}

function saveToOutbox(payload) {
  try {
    const box = readJSON(OUTBOX_KEY, []);
    box.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(box.slice(-50)));
  } catch { /* storage full / blocked — nothing more we can do */ }
}

// Submit a note. Returns { ok, mode }:
//   mode 'sent'        → POSTed to Supabase
//   mode 'queued'      → endpoint not wired yet; saved to local outbox
//   mode 'queued-error'→ POST failed; saved to local outbox so it's not lost
export async function submitFeedback(tag, message, context, fetchImpl) {
  const payload = buildPayload(tag, message, context);
  if (!isConfigured()) { saveToOutbox(payload); return { ok: true, mode: 'queued' }; }
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) { saveToOutbox(payload); return { ok: true, mode: 'queued' }; }
  try {
    const res = await doFetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, mode: 'sent' };
  } catch {
    saveToOutbox(payload);
    return { ok: true, mode: 'queued-error' };
  }
}

// --- SUPABASE_SETUP -------------------------------------------------------
// Run once in the Supabase SQL editor (or via the MCP apply_migration):
//
//   create table public.feedback (
//     id uuid primary key default gen_random_uuid(),
//     created_at timestamptz not null default now(),
//     tag text,
//     message text not null,
//     version text,
//     context jsonb
//   );
//   alter table public.feedback enable row level security;
//   create policy "anon can insert feedback"
//     on public.feedback for insert to anon with check (true);
//   -- intentionally NO select policy: testers can post but never read rows.
//
// Then set SUPABASE_URL + SUPABASE_ANON_KEY above to the project's URL and
// publishable/anon key. That's the whole wiring.
