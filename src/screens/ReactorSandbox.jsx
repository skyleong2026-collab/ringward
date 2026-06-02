// ReactorSandbox.jsx — manual-combat PROTOTYPE (the Reactor slice).
//
// Purpose (2026-06-01 pivot, see memory 8gents-combat-control-pivot): test whether
// per-turn AGENCY produces STORIES, not just whether picking a skill is "fun."
// Thesis under test: "the build IS the rotation" — a charge→spend loop where timing
// and target choice create real, narratable mistakes and triumphs.
//
// DELIBERATELY ISOLATED: its own tiny deterministic turn loop. It does NOT import or
// touch battleStepEngine.js or the goldens — the frozen engine stays frozen while we
// learn whether Ringward wants to become more manual. Throwaway-grade by design;
// if the loop sings, we generalize it into a real engine (a later, owned phase).
//
// No RNG — fixed damage, deterministic ("RNG at the door"). One Reactor vs N dummies.
// Knobs (enemy count / HP / attack / turn budget) + a post-fight DECISION LOG let us
// judge the real question: after ~10 fights, do varied sequences and stories emerge,
// or is it "S2 then S3 every time"?

import { useState } from 'react';
import { AnimationPlayer } from '../components/AnimationPlayer.jsx';
import { CREATURES } from '../data/creatures.js';

const ACCENT = '#e86040';
const CHARGE_COL = '#f5a623';
const BURN_COL = '#ff5a2a';
const WIN = '#7ed321';
const LOSS = '#d0021b';

const REACTOR = CREATURES.find((c) => c.id === 'spark'); // Fizzpop — the charge engine
const REACTOR_MAX_HP = 320;

// ── Tunable kit (the rotation thesis) ──────────────────────────────────────────
const CHARGE_MAX = 100;
const KIT = {
  spark:   { id: 'spark',   name: 'Spark Bolt', glyph: '⚡', cd: 0,  dmg: 26, charge: 15,
             desc: 'Free every turn. +15 charge. At 80+ charge, detonates the target’s Burn early for bonus damage.' },
  ignite:  { id: 'ignite',  name: 'Ignite',     glyph: '🔥', cd: 2,  dmg: 8,  charge: 10,
             desc: 'Burn the target (18/turn, 3 turns). +10 charge now; each Burn tick feeds you charge.' },
  overload:{ id: 'overload',name: 'Overload',   glyph: '☢', minCharge: 40,
             desc: 'Spend ALL charge: damage = charge × 2 to the target — DOUBLED if it’s Burning. The payoff.' },
};
const BURN_DMG = 18, BURN_TURNS = 3, BURN_CHARGE_PER_TICK = 6, CRIT_MASS = 80;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const livingEnemies = (es) => es.filter((e) => e.hp > 0);

function Bar({ value, max, color, height = 7, label }) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height, background: '#1a1a26', borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .35s ease' }} />
      </div>
      {label && <div style={{ fontSize: 8, color: '#777', marginTop: 2, fontFamily: 'monospace' }}>{label}</div>}
    </div>
  );
}

export function ReactorSandbox({ onClose }) {
  const [cfg, setCfg] = useState({ count: 3, hp: 130, atk: 18, turnBudget: 12 });
  const [run, setRun] = useState(0); // bump to reset
  return <SandboxRun key={run} cfg={cfg} setCfg={setCfg} onAgain={() => setRun((r) => r + 1)} onClose={onClose} />;
}

function SandboxRun({ cfg, setCfg, onAgain, onClose }) {
  const [reactor, setReactor] = useState({ hp: REACTOR_MAX_HP, charge: 0 });
  const [cooldowns, setCooldowns] = useState({ ignite: 0 });
  const [enemies, setEnemies] = useState(() =>
    Array.from({ length: cfg.count }, (_, i) => ({ id: `e${i}`, name: `Husk ${i + 1}`, hp: cfg.hp, maxHp: cfg.hp, burn: 0 }))
  );
  const [target, setTarget] = useState('e0');
  const [round, setRound] = useState(1);
  const [log, setLog] = useState([]);          // combat events (recent)
  const [decisions, setDecisions] = useState([]); // the rotation record — for the "stories" test
  const [phase, setPhase] = useState('player'); // 'player' | 'won' | 'lost'
  const [anim, setAnim] = useState('idle');

  const alive = livingEnemies(enemies);
  const tgt = enemies.find((e) => e.id === target && e.hp > 0) || alive[0];
  const igniteCd = cooldowns.ignite;

  const pushLog = (l, msg) => [...l, msg].slice(-7);

  function endIf(es, rx) {
    if (rx.hp <= 0) { setPhase('lost'); return true; }
    if (livingEnemies(es).length === 0) { setPhase('won'); return true; }
    return false;
  }

  // After the player's action: enemies strike, burns tick, cooldowns tick, round++.
  function enemyPhase(es, rx, events) {
    let r = { ...rx };
    let next = es.map((e) => ({ ...e }));
    // burn ticks (and feed the Reactor charge)
    let chargeFromBurn = 0;
    next = next.map((e) => {
      if (e.hp > 0 && e.burn > 0) {
        e.hp = Math.max(0, e.hp - BURN_DMG);
        e.burn -= 1;
        chargeFromBurn += BURN_CHARGE_PER_TICK;
        events.push(`🔥 ${e.name} burns for ${BURN_DMG}${e.hp <= 0 ? ' — burned out!' : ''}`);
      }
      return e;
    });
    if (chargeFromBurn) r.charge = clamp(r.charge + chargeFromBurn, 0, CHARGE_MAX);
    if (livingEnemies(next).length === 0) { setEnemies(next); setReactor(r); setLog((l) => events.slice(-7)); return setPhase('won'); }
    // enemy attacks
    let incoming = 0;
    for (const e of livingEnemies(next)) incoming += cfg.atk;
    r.hp = Math.max(0, r.hp - incoming);
    if (incoming) events.push(`✸ ${livingEnemies(next).length} husk(s) hit you for ${incoming}`);
    setEnemies(next);
    setReactor(r);
    setCooldowns((c) => ({ ignite: Math.max(0, c.ignite - 1) }));
    setLog(() => events.slice(-7));
    if (r.hp <= 0) return setPhase('lost');
    const nextRound = round + 1;
    setRound(nextRound);
    if (nextRound > cfg.turnBudget) setPhase('lost'); // ran out of time — pressure is real
  }

  function recordDecision(skill, note) {
    setDecisions((d) => [...d, { round, skill, charge: reactor.charge, note }]);
  }

  function act(skillId) {
    if (phase !== 'player') return;
    const events = [...log];
    let r = { ...reactor };
    let es = enemies.map((e) => ({ ...e }));
    const t = es.find((e) => e.id === (tgt?.id)) || livingEnemies(es)[0];
    if (!t) return;

    if (skillId === 'spark') {
      let dmg = KIT.spark.dmg;
      // passive Critical Mass: at high charge, Spark detonates the target's burn early
      if (r.charge >= CRIT_MASS && t.burn > 0) {
        const blast = t.burn * BURN_DMG;
        dmg += blast;
        t.burn = 0;
        events.push(`⚡ CRITICAL MASS — Spark detonates the Burn for +${blast}!`);
      }
      t.hp = Math.max(0, t.hp - dmg);
      r.charge = clamp(r.charge + KIT.spark.charge, 0, CHARGE_MAX);
      events.push(`⚡ Spark Bolt → ${t.name} for ${dmg} (+${KIT.spark.charge} charge)`);
      recordDecision('Spark', t.burn ? 'maintain' : 'build');
    } else if (skillId === 'ignite') {
      if (igniteCd > 0) return;
      t.hp = Math.max(0, t.hp - KIT.ignite.dmg);
      t.burn = BURN_TURNS;
      r.charge = clamp(r.charge + KIT.ignite.charge, 0, CHARGE_MAX);
      events.push(`🔥 Ignite → ${t.name} (Burn ${BURN_TURNS}t, +${KIT.ignite.charge} charge)`);
      setCooldowns({ ignite: KIT.ignite.cd + 1 }); // +1 because enemyPhase decrements this turn
      recordDecision('Ignite', 'setup');
    } else if (skillId === 'overload') {
      if (r.charge < KIT.overload.minCharge) return;
      const spent = r.charge;
      const burning = t.burn > 0;
      const dmg = spent * 2 * (burning ? 2 : 1);
      t.hp = Math.max(0, t.hp - dmg);
      r.charge = 0;
      events.push(`☢ OVERLOAD → ${t.name} for ${dmg}${burning ? ' (BURNING ×2!)' : ''} — spent ${spent} charge`);
      recordDecision('Overload', burning ? `cashed ${spent}⚡ on Burn ×2` : `dumped ${spent}⚡ (no Burn — wasted the x2)`);
    }
    setAnim('attack');
    setTimeout(() => setAnim('idle'), 350);

    if (endIf(es, r)) { setEnemies(es); setReactor(r); setLog(events.slice(-7)); return; }
    setEnemies(es);
    setReactor(r);
    // hand to enemy phase (slight delay so the hit reads)
    setTimeout(() => enemyPhase(es, r, events), 380);
  }

  const done = phase !== 'player';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 290, background: '#070710', overflowY: 'auto', color: '#eee', fontFamily: "'SF Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 16px 40px' }}>

        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: 2 }}>⚗ REACTOR LAB <span style={{ color: '#444', fontWeight: 400, letterSpacing: 1 }}>· manual prototype</span></div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a3a', color: '#888', fontSize: 10, letterSpacing: 1, borderRadius: 4, padding: '4px 9px', cursor: 'pointer' }}>EXIT LAB</button>
        </div>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>Round {round} / {cfg.turnBudget} · Pick a skill, pick a target. Find the rotation.</div>

        {/* enemies */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {enemies.map((e) => {
            const dead = e.hp <= 0;
            const isT = tgt?.id === e.id;
            return (
              <div key={e.id} onClick={() => !dead && setTarget(e.id)}
                style={{ width: 128, padding: 8, borderRadius: 8, cursor: dead ? 'default' : 'pointer', opacity: dead ? 0.3 : 1,
                  background: isT && !dead ? '#1a0f0a' : '#0d0d16', border: `1px solid ${isT && !dead ? ACCENT : '#222'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: dead ? '#555' : '#ccc' }}>{e.name}{dead ? ' ✕' : ''}</span>
                  {e.burn > 0 && <span style={{ color: BURN_COL }}>🔥{e.burn}</span>}
                </div>
                <Bar value={e.hp} max={e.maxHp} color={dead ? '#444' : '#c0392b'} label={`${e.hp}/${e.maxHp}`} />
                {isT && !dead && <div style={{ fontSize: 8, color: ACCENT, letterSpacing: 1, marginTop: 3 }}>◀ TARGET</div>}
              </div>
            );
          })}
        </div>

        {/* reactor */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#0b0b16', border: '1px solid #222', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <AnimationPlayer creature={REACTOR} size="small" scale={1.1} animate={phase === 'lost' ? 'defeated' : anim} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{REACTOR.name} <span style={{ color: '#666', fontWeight: 400 }}>· Reactor</span></div>
            <Bar value={reactor.hp} max={REACTOR_MAX_HP} color={WIN} label={`HP ${reactor.hp}/${REACTOR_MAX_HP}`} height={8} />
            <Bar value={reactor.charge} max={CHARGE_MAX} color={CHARGE_COL} label={`CHARGE ${reactor.charge}/${CHARGE_MAX}${reactor.charge >= CRIT_MASS ? ' · CRITICAL MASS' : ''}`} height={8} />
          </div>
        </div>

        {/* skills */}
        {!done && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { ...KIT.spark, enabled: true },
              { ...KIT.ignite, enabled: igniteCd === 0, sub: igniteCd > 0 ? `cooldown ${igniteCd}` : 'ready' },
              { ...KIT.overload, enabled: reactor.charge >= KIT.overload.minCharge, sub: reactor.charge >= KIT.overload.minCharge ? `spend ${reactor.charge}⚡` : `need ${KIT.overload.minCharge}⚡` },
            ].map((s) => (
              <button key={s.id} onClick={() => act(s.id)} disabled={!s.enabled} title={s.desc}
                style={{ textAlign: 'left', padding: '10px 11px', borderRadius: 8, cursor: s.enabled ? 'pointer' : 'default',
                  background: s.enabled ? '#13131f' : '#0c0c14', border: `1px solid ${s.enabled ? '#33334a' : '#1a1a26'}`, opacity: s.enabled ? 1 : 0.5 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: s.enabled ? '#eee' : '#555' }}>{s.glyph} {s.name}</div>
                {s.sub && <div style={{ fontSize: 9, color: s.id === 'overload' && s.enabled ? CHARGE_COL : '#777', marginTop: 2 }}>{s.sub}</div>}
                <div style={{ fontSize: 9, color: '#666', lineHeight: 1.4, marginTop: 4 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* end state */}
        {done && (
          <div style={{ background: phase === 'won' ? '#0d1a0d' : '#1a0d0d', border: `1px solid ${phase === 'won' ? WIN : LOSS}55`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: phase === 'won' ? WIN : LOSS, letterSpacing: 1 }}>{phase === 'won' ? 'CLEARED' : (reactor.hp <= 0 ? 'REACTOR DOWN' : 'OUT OF TIME')}</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Round {round} · {decisions.length} decisions</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={onAgain} style={{ flex: 1, padding: '11px 0', background: ACCENT, border: 'none', borderRadius: 7, color: '#0a0a14', fontSize: 12, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}>RUN AGAIN →</button>
            </div>
          </div>
        )}

        {/* combat log */}
        <div style={{ background: '#0a0a12', border: '1px solid #1c1c28', borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 70 }}>
          <div style={{ fontSize: 8, color: '#444', letterSpacing: 2, marginBottom: 5 }}>COMBAT LOG</div>
          {log.length === 0 ? <div style={{ fontSize: 10, color: '#444' }}>Open with Ignite to set up your Burn, or Spark to build charge…</div>
            : log.map((l, i) => <div key={i} style={{ fontSize: 10, color: i === log.length - 1 ? '#ccc' : '#666', lineHeight: 1.7 }}>{l}</div>)}
        </div>

        {/* decision log — the "stories" instrument */}
        {decisions.length > 0 && (
          <div style={{ background: '#0a0a12', border: '1px solid #1c1c28', borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 8, color: '#444', letterSpacing: 2, marginBottom: 5 }}>YOUR ROTATION (does a story show here?)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {decisions.map((d, i) => (
                <span key={i} title={`R${d.round} · ${d.charge}⚡ · ${d.note}`}
                  style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#15151f', border: '1px solid #2a2a3a',
                    color: d.skill === 'Overload' ? CHARGE_COL : d.skill === 'Ignite' ? BURN_COL : '#aaa' }}>
                  {d.skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* dev knobs */}
        <div style={{ background: '#0a0a12', border: '1px dashed #2a2a3a', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 8, color: '#555', letterSpacing: 2, marginBottom: 8 }}>⚙ KNOBS — change, then RUN AGAIN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {[
              { k: 'count', label: 'Husks', min: 1, max: 5 },
              { k: 'hp', label: 'Husk HP', min: 60, max: 300, step: 20 },
              { k: 'atk', label: 'Husk ATK', min: 6, max: 40, step: 2 },
              { k: 'turnBudget', label: 'Turn budget', min: 4, max: 20 },
            ].map(({ k, label, min, max, step = 1 }) => (
              <label key={k} style={{ fontSize: 9, color: '#888' }}>
                {label}: <span style={{ color: CHARGE_COL }}>{cfg[k]}</span>
                <input type="range" min={min} max={max} step={step} value={cfg[k]} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: ACCENT }} />
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
