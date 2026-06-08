import { useState } from 'react';
import {
  FEEDBACK_TAGS, collectContext, submitFeedback, validateMessage, isConfigured,
} from '../data/feedback.js';

// Floating 💬 button + note panel, reachable from anywhere in the game.
// Self-contained: reads run context from localStorage / liveContext at submit
// time, so it needs nothing but the version string.
export function FeedbackButton({ version }) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState('idea');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // null | 'sent' | 'queued' | 'queued-error'
  const [err, setErr] = useState(null);

  function reset() { setTag('idea'); setMsg(''); setErr(null); setDone(null); setBusy(false); }
  function close() { setOpen(false); setTimeout(reset, 200); }

  async function send() {
    const v = validateMessage(msg);
    if (v) { setErr(v); return; }
    setErr(null); setBusy(true);
    const ctx = collectContext(version);
    const res = await submitFeedback(tag, msg, ctx);
    setBusy(false);
    setDone(res.mode);
  }

  const BTN = 'rgba(26,26,34,0.92)';
  return (
    <>
      {/* Launcher — sits above the bottom nav, out of the way of gameplay. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed', right: 12, bottom: 70, zIndex: 10001,
          width: 44, height: 44, borderRadius: 22, cursor: 'pointer',
          background: BTN, color: '#eaf2ff', border: '1px solid #4a4a58',
          fontSize: 20, lineHeight: 1, boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >💬</button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 10003,
            background: 'rgba(4,4,9,0.72)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460, background: '#14141c',
              border: '1px solid #3a3a48', borderBottom: 'none',
              borderRadius: '14px 14px 0 0', padding: '16px 16px 22px',
              boxShadow: '0 -6px 30px rgba(0,0,0,0.6)',
            }}
          >
            {done == null ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#eaf2ff' }}>Send feedback</div>
                  <button onClick={close} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                {/* Tag chips */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {FEEDBACK_TAGS.map((t) => {
                    const on = tag === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTag(t.id)}
                        style={{
                          flex: '1 1 0', minWidth: 72, padding: '8px 6px', borderRadius: 9, cursor: 'pointer',
                          background: on ? '#16202e' : '#1b1b24',
                          color: on ? '#eaf2ff' : '#9a9aa6',
                          border: `2px solid ${on ? '#3f6fa8' : '#33333f'}`,
                          fontSize: 12, fontWeight: 700,
                        }}
                      >{t.icon} {t.label}</button>
                    );
                  })}
                </div>

                <textarea
                  value={msg}
                  onChange={(e) => { setMsg(e.target.value); if (err) setErr(null); }}
                  placeholder="What happened, what confused you, or what you'd love to see…"
                  rows={4}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: '#0e0e15', color: '#eaf2ff', border: '1px solid #33333f',
                    borderRadius: 9, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, minHeight: 16 }}>
                  <span style={{ fontSize: 11, color: err ? '#ff8a7a' : '#666' }}>
                    {err || 'Your squad, ring, and version attach automatically.'}
                  </span>
                  <span style={{ fontSize: 11, color: '#555' }}>{msg.length}/2000</span>
                </div>

                <button
                  onClick={send}
                  disabled={busy}
                  style={{
                    width: '100%', marginTop: 12, padding: '12px', borderRadius: 10, cursor: busy ? 'default' : 'pointer',
                    background: busy ? '#23303f' : '#2c4a6e',
                    color: '#eaf2ff', border: '1px solid #3f6fa8', fontSize: 15, fontWeight: 800,
                    opacity: busy ? 0.7 : 1,
                  }}
                >{busy ? 'Sending…' : 'Send'}</button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '14px 8px 6px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{done === 'sent' ? '🙏' : '📥'}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#eaf2ff', marginBottom: 6 }}>
                  {done === 'sent' ? 'Thank you!' : 'Saved'}
                </div>
                <div style={{ fontSize: 13, color: '#9a9aa6', marginBottom: 16, lineHeight: 1.5 }}>
                  {done === 'sent'
                    ? 'Your note reached the team. It genuinely helps shape the game.'
                    : isConfigured()
                      ? "Couldn't reach the server, so your note is saved on this device and will help once collected."
                      : 'Saved on this device — feedback delivery is being wired up.'}
                </div>
                <button
                  onClick={close}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
                    background: '#2c4a6e', color: '#eaf2ff', border: '1px solid #3f6fa8', fontSize: 15, fontWeight: 800,
                  }}
                >Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackButton;
