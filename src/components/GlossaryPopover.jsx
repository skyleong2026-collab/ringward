// GlossaryPopover.jsx — the first surface that reads src/data/glossary.js.
//
// Pull-based, diegetic glossary affordance (see memory `8gents-spotter-glossary`):
// the player taps an unknown term and the Spotter explains it. Two depths —
//   short : the spare tactical read (shown first; must be clear on its own)
//   long  : the warm Cortana "teaching gear" expansion (revealed via "+ more")
//
// This is the UI layer; the definitions live in glossary.js (single source of
// truth). NOT the full system — this is the cheapest prototype-relevant
// affordance: tap-to-reveal on the archetypes + the intervention verbs.

import { useState } from 'react';
import { defineTerm } from '../data/glossary.js';

// The popover card itself: term, short read, and an opt-in "+ more" that reveals
// the Cortana long-form. A fixed full-screen backdrop catches the outside tap.
function GlossaryCard({ entry, onClose, align = 'left' }) {
  const [expanded, setExpanded] = useState(false);
  const hasLong = entry.long && entry.long !== entry.short;
  // Anchor to the right edge of the term when it sits on the right side of the
  // screen (e.g. the currency strip), so the popover doesn't overflow off-screen.
  const sideAnchor = align === 'right' ? { right: 0 } : { left: 0 };
  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 'calc(100% + 6px)', ...sideAnchor, zIndex: 91,
          width: 234, maxWidth: '78vw', textAlign: 'left', cursor: 'default',
          background: '#12101c', border: '1px solid #3a2f52', borderRadius: 8,
          padding: '10px 12px', boxShadow: '0 8px 26px #000b',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#cba6e6' }}>{entry.term}</span>
          <span onClick={onClose} style={{ cursor: 'pointer', color: '#555', fontSize: 12, lineHeight: 1, paddingLeft: 8 }}>✕</span>
        </div>
        <div style={{ fontSize: 10.5, lineHeight: 1.5, color: '#c9c9d6' }}>{entry.short}</div>
        {hasLong && !expanded && (
          <div
            onClick={() => setExpanded(true)}
            style={{ marginTop: 7, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: '#7a9bc4', cursor: 'pointer' }}
          >
            + more
          </div>
        )}
        {hasLong && expanded && (
          <div style={{
            marginTop: 8, paddingTop: 8, borderTop: '1px solid #ffffff12',
            fontSize: 10, lineHeight: 1.55, color: '#9a93b0', fontStyle: 'italic',
          }}>
            {entry.long}
          </div>
        )}
      </div>
    </>
  );
}

// Inline tappable term: renders the label with a dotted underline + a small ⓘ so
// it reads as "ask me about this." Falls back to plain text if the term isn't in
// the glossary (so a typo never breaks the render).
export function GlossaryTerm({ term, children, style, align = 'left' }) {
  const entry = defineTerm(term);
  const [open, setOpen] = useState(false);
  if (!entry) return <span style={style}>{children ?? term}</span>;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ cursor: 'help', borderBottom: '1px dotted currentColor', ...style }}
      >
        {children ?? entry.term}
        <span style={{ fontSize: '0.72em', verticalAlign: 'super', marginLeft: 2, opacity: 0.85 }}>ⓘ</span>
      </span>
      {open && <GlossaryCard entry={entry} onClose={() => setOpen(false)} align={align} />}
    </span>
  );
}

// Standalone affordance for places where the label can't be wrapped (e.g. inside
// another button): just the ⓘ, same popover. stopPropagation keeps a host
// button's onClick from firing when the dot is tapped.
export function GlossaryDot({ term, style, align = 'left' }) {
  const entry = defineTerm(term);
  const [open, setOpen] = useState(false);
  if (!entry) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ cursor: 'help', fontSize: '0.9em', opacity: 0.7, ...style }}
      >
        ⓘ
      </span>
      {open && <GlossaryCard entry={entry} onClose={() => setOpen(false)} align={align} />}
    </span>
  );
}
