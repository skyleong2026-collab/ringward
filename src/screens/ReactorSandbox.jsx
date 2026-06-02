// ReactorSandbox.jsx — manual-combat PROTOTYPE / "the Lab" (2026-06-01 pivot).
//
// Tests whether picking skills each turn — for a 2-creature squad you choose from 3 —
// creates real fights with stories (combos, mistimes, "I should've Amplified first"),
// not just "click S2 then S3." Three creatures that play NOTHING alike:
//   • Fizzpop (Reactor) — charge up, then nuke.
//   • Buzzline (Echo)   — barely hurts anything; doubles your OTHER creature's hits.
//   • Zipsnap (Assassin)— leaps on the lowest-HP enemy; Execute kills anything <50%
//                         and refunds its cooldowns so it can chain kills.
// You field 2 of the 3, so the squad you pick changes the fight.
//
// Layout is RESPONSIVE (readable on browser / iPad / iPhone): one app, big text,
// columns stack on narrow screens. DELIBERATELY ISOLATED — its own tiny deterministic
// turn loop, does NOT touch battleStepEngine.js or the goldens. No RNG. Throwaway-grade.

import { useState, useEffect } from 'react';
import { AnimationPlayer } from '../components/AnimationPlayer.jsx';
import { CREATURES } from '../data/creatures.js';

const ACCENT = '#e86040';
const CHARGE_COL = '#f5a623';
const BURN_COL = '#ff5a2a';
const AMP_COL = '#b06bff';
const WIN = '#7ed321';
const LOSS = '#d0021b';
const BURN_DMG = 18, BURN_TURNS = 3, BURN_CHARGE = 6, CRIT_MASS = 80, CHARGE_MAX = 100;

// Type scale — bumped up from the old 8-11px so it's actually readable.
const T = { micro: 11, small: 13, body: 14, label: 15, sub: 16, head: 18, huge: 26 };

const sprite = (id) => CREATURES.find((c) => c.id === id);

function useVW() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return w;
}

// ── The 3 creatures (kit + the one-line read) ──────────────────────────────────
const ROSTER = {
  reactor: {
    key: 'reactor', spriteId: 'spark', name: 'Fizzpop', tag: 'Reactor — charge up, then nuke', maxHp: 300, useCharge: true,
    skills: [
      { id: 'spark',    name: 'Spark Bolt', glyph: '⚡', desc: 'Free. 26 dmg, +15 charge. At 80+ charge, blows up the target’s Burn early.' },
      { id: 'ignite',   name: 'Ignite',     glyph: '🔥', cd: 2, desc: 'Burn the target (18/turn × 3). +10 charge; each Burn tick feeds you more.' },
      { id: 'overload', name: 'Overload',   glyph: '☢', need: 40, desc: 'Spend ALL charge: dmg = charge × 2 — DOUBLED if the target’s Burning.' },
    ],
  },
  echo: {
    key: 'echo', spriteId: 'conduit', name: 'Buzzline', tag: 'Echo — makes your partner hit huge', maxHp: 240, useCharge: false,
    skills: [
      { id: 'echobolt', name: 'Echo Bolt', glyph: '◇', desc: 'Free. 18 dmg. Weak on its own — that’s the point.' },
      { id: 'amplify',  name: 'Amplify',   glyph: '✦', cd: 2, partner: true, desc: 'Your OTHER creature’s next hit does DOUBLE damage.' },
      { id: 'cascade',  name: 'Cascade',   glyph: '⟳', cd: 4, partner: true, desc: 'Refresh your partner: clear their cooldowns + refill their charge. Big-move-again button.' },
    ],
  },
  assassin: {
    key: 'assassin', spriteId: 'fang', name: 'Zipsnap', tag: 'Assassin — hunt the weak', maxHp: 200, useCharge: false,
    skills: [
      { id: 'slash',   name: 'Slash',   glyph: '⟡', desc: 'Free. 24 dmg to the target you pick.' },
      { id: 'flank',   name: 'Flank',   glyph: '↯', cd: 1, lowEnemy: true, desc: 'Leap on the LOWEST-HP enemy: 30 dmg, +50% if it’s under 40% HP.' },
      { id: 'execute', name: 'Execute', glyph: '☠', cd: 3, desc: 'Target under 50% HP: kill it AND refund your cooldowns (chain kills). Else 40 dmg.' },
    ],
  },
};
const SKILL = {};
for (const c of Object.values(ROSTER)) for (const s of c.skills) SKILL[s.id] = { ...s, owner: c.key };

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const alivePlayers = (sq) => sq.filter((u) => u.hp > 0);
const aliveEnemies = (es) => es.filter((e) => e.hp > 0);
const lowestEnemy = (es) => aliveEnemies(es).sort((a, b) => a.hp - b.hp)[0];

function Bar({ value, max, color, height = 10, label }) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height, background: '#1a1a26', borderRadius: 5, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .35s ease' }} />
      </div>
      {label && <div style={{ fontSize: T.micro, color: '#888', marginTop: 3, fontFamily: 'monospace' }}>{label}</div>}
    </div>
  );
}

export function ReactorSandbox({ onClose }) {
  const [run, setRun] = useState(0);
  return <Lab key={run} onAgain={() => setRun((r) => r + 1)} onClose={onClose} />;
}

function Lab({ onAgain, onClose }) {
  const vw = useVW();
  const phone = vw < 640;
  const [cfg, setCfg] = useState({ count: 3, hp: 150, atk: 16, turnBudget: 14 });
  const [chosen, setChosen] = useState([]);
  const [phase, setPhase] = useState('select');
  const [squad, setSquad] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [target, setTarget] = useState('e0');
  const [round, setRound] = useState(1);
  const [log, setLog] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [anim, setAnim] = useState({});

  function toggle(key) {
    setChosen((c) => c.includes(key) ? c.filter((k) => k !== key) : c.length < 2 ? [...c, key] : c);
  }
  function begin() {
    if (chosen.length !== 2) return;
    setSquad(chosen.map((k, i) => {
      const c = ROSTER[k];
      return { key: k, uid: `p${i}`, name: c.name, spriteId: c.spriteId, hp: c.maxHp, maxHp: c.maxHp,
        charge: 0, useCharge: c.useCharge, cd: {}, amplified: false };
    }));
    setEnemies(Array.from({ length: cfg.count }, (_, i) => ({ id: `e${i}`, name: `Husk ${i + 1}`, hp: cfg.hp, maxHp: cfg.hp, burn: 0 })));
    setActiveIdx(0); setRound(1); setLog([]); setDecisions([]); setPhase('player'); setTarget('e0');
  }

  const active = phase === 'player' ? squad[activeIdx] : null;
  const partner = active ? alivePlayers(squad).find((u) => u.uid !== active.uid) : null;
  const tgt = enemies.find((e) => e.id === target && e.hp > 0) || aliveEnemies(enemies)[0];

  function flash(uid, kind = 'attack') { setAnim({ [uid]: kind }); setTimeout(() => setAnim({}), 340); }

  function enemyPhase(sq, es, events) {
    let squadN = sq.map((u) => ({ ...u })), enN = es.map((e) => ({ ...e }));
    let burnCharge = 0;
    enN = enN.map((e) => {
      if (e.hp > 0 && e.burn > 0) { e.hp = Math.max(0, e.hp - BURN_DMG); e.burn -= 1; burnCharge += BURN_CHARGE; events.push(`🔥 ${e.name} burns for ${BURN_DMG}${e.hp <= 0 ? ' — burned out!' : ''}`); }
      return e;
    });
    if (burnCharge) squadN = squadN.map((u) => u.useCharge && u.hp > 0 ? { ...u, charge: clamp(u.charge + burnCharge, 0, CHARGE_MAX) } : u);
    if (aliveEnemies(enN).length === 0) { setSquad(squadN); setEnemies(enN); setLog(events.slice(-8)); return setPhase('won'); }
    for (const e of aliveEnemies(enN)) {
      const victim = alivePlayers(squadN).sort((a, b) => a.hp - b.hp)[0];
      if (!victim) break;
      victim.hp = Math.max(0, victim.hp - cfg.atk);
      events.push(`✸ ${e.name} hits ${victim.name} for ${cfg.atk}`);
    }
    squadN = squadN.map((u) => ({ ...u, cd: Object.fromEntries(Object.entries(u.cd).map(([k, v]) => [k, Math.max(0, v - 1)])) }));
    setSquad(squadN); setEnemies(enN); setLog(events.slice(-8));
    if (alivePlayers(squadN).length === 0) return setPhase('lost');
    const nr = round + 1; setRound(nr);
    if (nr > cfg.turnBudget) return setPhase('lost');
    const first = squadN.findIndex((u) => u.hp > 0);
    setActiveIdx(first);
  }

  function act(skillId) {
    if (phase !== 'player' || !active) return;
    const events = [...log];
    let sq = squad.map((u) => ({ ...u }));
    let es = enemies.map((e) => ({ ...e }));
    const me = sq[activeIdx];
    const mate = sq.find((u) => u.uid !== me.uid && u.hp > 0);
    const enemyTarget = es.find((e) => e.id === (tgt?.id)) || aliveEnemies(es)[0];

    const hit = (foe, dmg) => { let d = dmg; if (me.amplified) { d *= 2; me.amplified = false; events.push(`✦ Amplified! ${me.name}’s hit is doubled`); } foe.hp = Math.max(0, foe.hp - d); return d; };

    if (skillId === 'spark') {
      let extra = 0;
      if (me.charge >= CRIT_MASS && enemyTarget.burn > 0) { extra = enemyTarget.burn * BURN_DMG; enemyTarget.burn = 0; events.push(`⚡ CRITICAL MASS — Spark blows the Burn for +${extra}!`); }
      const d = hit(enemyTarget, 26 + extra); me.charge = clamp(me.charge + 15, 0, CHARGE_MAX);
      events.push(`⚡ Spark Bolt → ${enemyTarget.name} for ${d} (+15 charge)`);
      pushDecision(me, 'Spark');
    } else if (skillId === 'ignite') {
      if ((me.cd.ignite || 0) > 0) return;
      const d = hit(enemyTarget, 8); enemyTarget.burn = BURN_TURNS; me.charge = clamp(me.charge + 10, 0, CHARGE_MAX);
      me.cd.ignite = SKILL.ignite.cd + 1;
      events.push(`🔥 Ignite → ${enemyTarget.name} for ${d} (Burn ${BURN_TURNS}t, +10 charge)`);
      pushDecision(me, 'Ignite');
    } else if (skillId === 'overload') {
      if (me.charge < 40) return;
      const spent = me.charge, burning = enemyTarget.burn > 0;
      const d = hit(enemyTarget, spent * 2 * (burning ? 2 : 1)); me.charge = 0;
      events.push(`☢ OVERLOAD → ${enemyTarget.name} for ${d}${burning ? ' (BURNING ×2!)' : ''} — spent ${spent}`);
      pushDecision(me, 'Overload', burning ? 'on a Burn' : 'no Burn (missed ×2)');
    } else if (skillId === 'echobolt') {
      const d = hit(enemyTarget, 18); events.push(`◇ Echo Bolt → ${enemyTarget.name} for ${d}`);
      pushDecision(me, 'EchoBolt');
    } else if (skillId === 'amplify') {
      if ((me.cd.amplify || 0) > 0 || !mate) return;
      mate.amplified = true; me.cd.amplify = SKILL.amplify.cd + 1;
      events.push(`✦ Amplify → ${mate.name}’s next hit will DOUBLE`);
      pushDecision(me, 'Amplify', `→ ${mate.name}`);
    } else if (skillId === 'cascade') {
      if ((me.cd.cascade || 0) > 0 || !mate) return;
      mate.cd = {}; if (mate.useCharge) mate.charge = CHARGE_MAX; me.cd.cascade = SKILL.cascade.cd + 1;
      events.push(`⟳ Cascade → ${mate.name} refreshed (cooldowns clear${mate.useCharge ? ', charge full' : ''})`);
      pushDecision(me, 'Cascade', `→ ${mate.name}`);
    } else if (skillId === 'slash') {
      const d = hit(enemyTarget, 24); events.push(`⟡ Slash → ${enemyTarget.name} for ${d}`);
      pushDecision(me, 'Slash');
    } else if (skillId === 'flank') {
      if ((me.cd.flank || 0) > 0) return;
      const low = lowestEnemy(es); if (!low) return;
      const base = 30 * (low.hp / low.maxHp < 0.4 ? 1.5 : 1);
      const d = hit(low, Math.round(base)); me.cd.flank = SKILL.flank.cd + 1;
      events.push(`↯ Flank → ${low.name} for ${d}${low.hp <= 0 ? ' — down!' : ''}`);
      pushDecision(me, 'Flank');
    } else if (skillId === 'execute') {
      if ((me.cd.execute || 0) > 0) return;
      if (enemyTarget.hp / enemyTarget.maxHp <= 0.5) {
        enemyTarget.hp = 0; me.cd = {};
        events.push(`☠ EXECUTE → ${enemyTarget.name} finished! Cooldowns refunded — chain it`);
        pushDecision(me, 'Execute', 'kill + reset');
      } else { const d = hit(enemyTarget, 40); me.cd.execute = SKILL.execute.cd + 1; events.push(`☠ Execute → ${enemyTarget.name} for ${d} (not low enough to finish)`); pushDecision(me, 'Execute', 'too healthy'); }
    }

    flash(me.uid);
    if (aliveEnemies(es).length === 0) { setSquad(sq); setEnemies(es); setLog(events.slice(-8)); return setPhase('won'); }
    const next = sq.findIndex((u, i) => i > activeIdx && u.hp > 0);
    if (next !== -1) { setSquad(sq); setEnemies(es); setActiveIdx(next); setLog(events.slice(-8)); }
    else { setSquad(sq); setEnemies(es); setLog(events.slice(-8)); setTimeout(() => enemyPhase(sq, es, events), 360); }
  }
  function pushDecision(unit, skill, note) { setDecisions((d) => [...d, { round, who: unit.name[0], skill, note }]); }

  // ── SELECT SCREEN ──
  if (phase === 'select') {
    return (
      <Shell onClose={onClose}>
        <div style={{ fontSize: T.head, color: '#eee', marginBottom: 4, fontWeight: 700 }}>Pick <b style={{ color: ACCENT }}>2</b> creatures to field.</div>
        <div style={{ fontSize: T.body, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>They fight differently and combo differently — try a pair, then RUN AGAIN with another.</div>
        <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
          {Object.values(ROSTER).map((c) => {
            const on = chosen.includes(c.key);
            return (
              <div key={c.key} onClick={() => toggle(c.key)} style={{ cursor: 'pointer', borderRadius: 12, padding: 14,
                background: on ? '#15100a' : '#0c0c16', border: `2px solid ${on ? ACCENT : '#222'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <AnimationPlayer creature={sprite(c.spriteId)} size="small" scale={1.1} animate="idle" />
                  <div>
                    <div style={{ fontSize: T.sub, fontWeight: 800 }}>{c.name}</div>
                    <div style={{ fontSize: T.small, color: '#9a9aaa' }}>{c.tag}</div>
                  </div>
                </div>
                {c.skills.map((s) => <div key={s.id} style={{ fontSize: T.small, color: '#888', lineHeight: 1.6, marginBottom: 3 }}><span style={{ color: '#ddd', fontWeight: 700 }}>{s.glyph} {s.name}</span> — {s.desc}</div>)}
                {on && <div style={{ fontSize: T.small, color: ACCENT, letterSpacing: 1, textAlign: 'center', marginTop: 8, fontWeight: 700 }}>◀ FIELDED</div>}
              </div>
            );
          })}
        </div>
        <button onClick={begin} disabled={chosen.length !== 2} style={{ width: '100%', padding: '16px 0', borderRadius: 9, border: 'none',
          background: chosen.length === 2 ? ACCENT : '#222', color: chosen.length === 2 ? '#0a0a14' : '#555', fontSize: T.sub, fontWeight: 800, letterSpacing: 1, cursor: chosen.length === 2 ? 'pointer' : 'default' }}>
          {chosen.length === 2 ? 'ENTER THE LAB →' : `PICK ${2 - chosen.length} MORE`}
        </button>
        <Knobs cfg={cfg} setCfg={setCfg} phone={phone} />
      </Shell>
    );
  }

  const done = phase === 'won' || phase === 'lost';
  return (
    <Shell onClose={onClose}>
      <div style={{ fontSize: T.body, color: '#999', marginBottom: 12 }}>Round {round} / {cfg.turnBudget}{!done && active ? <> · <span style={{ color: ACCENT, fontWeight: 700 }}>{active.name}’s turn</span> — pick a skill</> : ''}</div>

      {/* enemies */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {enemies.map((e) => {
          const dead = e.hp <= 0, isT = tgt?.id === e.id;
          return (
            <div key={e.id} onClick={() => !dead && setTarget(e.id)} style={{ flex: phone ? '1 1 45%' : '0 0 140px', padding: 10, borderRadius: 9, cursor: dead ? 'default' : 'pointer', opacity: dead ? 0.3 : 1,
              background: isT && !dead ? '#1a0f0a' : '#0d0d16', border: `2px solid ${isT && !dead ? ACCENT : '#222'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.body, marginBottom: 6 }}>
                <span style={{ color: dead ? '#555' : '#ddd', fontWeight: 700 }}>{e.name}{dead ? ' ✕' : ''}</span>
                {e.burn > 0 && <span style={{ color: BURN_COL }}>🔥{e.burn}</span>}
              </div>
              <Bar value={e.hp} max={e.maxHp} color={dead ? '#444' : '#c0392b'} label={`${e.hp}/${e.maxHp}`} />
              {isT && !dead && <div style={{ fontSize: T.small, color: ACCENT, marginTop: 4, fontWeight: 700 }}>◀ TARGET</div>}
            </div>
          );
        })}
      </div>

      {/* your squad */}
      <div style={{ display: 'flex', flexDirection: phone ? 'column' : 'row', gap: 12, marginBottom: 14 }}>
        {squad.map((u, i) => {
          const isActive = !done && i === activeIdx;
          return (
            <div key={u.uid} style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center', background: isActive ? '#13110a' : '#0b0b16', border: `2px solid ${isActive ? ACCENT : '#222'}`, borderRadius: 12, padding: 12, opacity: u.hp <= 0 ? 0.35 : 1 }}>
              <AnimationPlayer creature={sprite(u.spriteId)} size="small" scale={1.05} animate={u.hp <= 0 ? 'defeated' : (anim[u.uid] || 'idle')} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: T.label, fontWeight: 800 }}>{u.name}{u.amplified && <span style={{ color: AMP_COL, marginLeft: 7 }}>✦×2</span>}{isActive && <span style={{ color: ACCENT, fontSize: T.small, marginLeft: 7 }}>▶ TURN</span>}</div>
                <Bar value={u.hp} max={u.maxHp} color={WIN} label={`HP ${u.hp}/${u.maxHp}`} />
                {u.useCharge && <Bar value={u.charge} max={CHARGE_MAX} color={CHARGE_COL} label={`CHARGE ${u.charge}/${CHARGE_MAX}${u.charge >= CRIT_MASS ? ' · CRIT MASS' : ''}`} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* active unit's skills */}
      {!done && active && (
        <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {ROSTER[active.key].skills.map((s) => {
            const cd = active.cd[s.id] || 0;
            let enabled = true, sub = '';
            if (s.id === 'overload') { enabled = active.charge >= 40; sub = enabled ? `spend ${active.charge}⚡` : `need 40⚡`; }
            else if (s.cd) { enabled = cd === 0 && (!s.partner || !!partner); sub = cd > 0 ? `cooldown ${cd}` : (s.partner && !partner ? 'no partner' : 'ready'); }
            return (
              <button key={s.id} onClick={() => act(s.id)} disabled={!enabled} title={s.desc} style={{ textAlign: 'left', padding: '13px 14px', borderRadius: 10, cursor: enabled ? 'pointer' : 'default',
                background: enabled ? '#13131f' : '#0c0c14', border: `2px solid ${enabled ? '#33334a' : '#1a1a26'}`, opacity: enabled ? 1 : 0.5 }}>
                <div style={{ fontSize: T.sub, fontWeight: 800, color: enabled ? '#eee' : '#555' }}>{s.glyph} {s.name}</div>
                {sub && <div style={{ fontSize: T.small, color: s.id === 'overload' && enabled ? CHARGE_COL : s.partner ? AMP_COL : '#888', marginTop: 3, fontWeight: 700 }}>{sub}</div>}
                <div style={{ fontSize: T.small, color: '#888', lineHeight: 1.5, marginTop: 5 }}>{s.desc}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* end */}
      {done && (
        <div style={{ background: phase === 'won' ? '#0d1a0d' : '#1a0d0d', border: `2px solid ${phase === 'won' ? WIN : LOSS}55`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: T.huge, fontWeight: 900, color: phase === 'won' ? WIN : LOSS, letterSpacing: 1 }}>{phase === 'won' ? 'CLEARED' : (alivePlayers(squad).length === 0 ? 'SQUAD DOWN' : 'OUT OF TIME')}</div>
          <div style={{ fontSize: T.body, color: '#999', marginTop: 6 }}>Round {round} · {decisions.length} decisions · squad: {squad.map((u) => u.name).join(' + ')}</div>
          <button onClick={onAgain} style={{ marginTop: 14, width: '100%', padding: '14px 0', background: ACCENT, border: 'none', borderRadius: 9, color: '#0a0a14', fontSize: T.sub, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}>NEW SQUAD / RUN AGAIN →</button>
        </div>
      )}

      {/* logs */}
      <div style={{ background: '#0a0a12', border: '1px solid #1c1c28', borderRadius: 10, padding: 12, marginBottom: 14, minHeight: 80 }}>
        <div style={{ fontSize: T.small, color: '#555', letterSpacing: 2, marginBottom: 7, fontWeight: 700 }}>COMBAT LOG</div>
        {log.length === 0 ? <div style={{ fontSize: T.body, color: '#555' }}>Click an enemy to target, then pick {active?.name}’s skill…</div>
          : log.map((l, i) => <div key={i} style={{ fontSize: T.body, color: i === log.length - 1 ? '#ddd' : '#777', lineHeight: 1.8 }}>{l}</div>)}
      </div>
      {decisions.length > 0 && (
        <div style={{ background: '#0a0a12', border: '1px solid #1c1c28', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: T.small, color: '#555', letterSpacing: 2, marginBottom: 7, fontWeight: 700 }}>YOUR SEQUENCE (does a story show here?)</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {decisions.map((d, i) => (
              <span key={i} title={`R${d.round} · ${d.who} · ${d.note || ''}`} style={{ fontSize: T.small, padding: '4px 9px', borderRadius: 5, background: '#15151f', border: '1px solid #2a2a3a',
                color: /Overload|Execute/.test(d.skill) ? CHARGE_COL : /Amplify|Cascade/.test(d.skill) ? AMP_COL : '#bbb' }}>{d.who}:{d.skill}</span>
            ))}
          </div>
        </div>
      )}
      <Knobs cfg={cfg} setCfg={setCfg} phone={phone} />
    </Shell>
  );
}

function Shell({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 290, background: '#070710', overflowY: 'auto', color: '#eee', fontFamily: "'SF Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: T.sub, fontWeight: 800, color: ACCENT, letterSpacing: 2 }}>⚗ COMBAT LAB</div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a3a', color: '#999', fontSize: T.small, letterSpacing: 1, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>EXIT</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Knobs({ cfg, setCfg, phone }) {
  return (
    <div style={{ background: '#0a0a12', border: '1px dashed #2a2a3a', borderRadius: 10, padding: 12, marginTop: 14 }}>
      <div style={{ fontSize: T.small, color: '#666', letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>⚙ KNOBS — change, then start / RUN AGAIN</div>
      <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
        {[{ k: 'count', label: 'Husks', min: 1, max: 5 }, { k: 'hp', label: 'Husk HP', min: 60, max: 360, step: 20 }, { k: 'atk', label: 'Husk ATK', min: 6, max: 40, step: 2 }, { k: 'turnBudget', label: 'Turn budget', min: 4, max: 24 }].map(({ k, label, min, max, step = 1 }) => (
          <label key={k} style={{ fontSize: T.body, color: '#999' }}>{label}: <span style={{ color: CHARGE_COL, fontWeight: 700 }}>{cfg[k]}</span>
            <input type="range" min={min} max={max} step={step} value={cfg[k]} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))} style={{ width: '100%', accentColor: ACCENT }} /></label>
        ))}
      </div>
    </div>
  );
}
