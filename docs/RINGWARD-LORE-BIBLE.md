# ❖ Ringward — The Lore Bible (the Long Past & the Promised Answers)

> **Status: CANON DRAFT (2026-06-10, overnight session). Sky owns final say on every line.**
> This file holds what is TRUE — including answers the game must NOT say yet. In-game text
> (`src/data/lore.js`, RING_INTRO/RING_CLEAR, CROSSING_BEATS, ward stories) asks the questions;
> this file is where they resolve, tagged by the iteration that pays each off.
> Locked constraints respected: GDD §21 (folk mystery; blight origin *deliberately unknown* —
> kept unknown IN-GAME; one truth-axis = inward), §22 economy, the Spotter's folk-wise voice.

---

## I. THE LONG PAST (deep canon — never stated outright in-game)

### Before the rings were rings (the Ringwrights' age)
The rings were not defenses. They were **gardens and works** — terraces of a people the stones
only call *we*. Players will come to call them **the Ringwrights** (no in-game text names them;
naming is the player-community's job — see Voice Rules). The Ringwrights' craft was **growing
machines from earth**: seed a core, teach it a trade, let the ground raise it. Every grunling
alive is their craft gone feral — gardeners, couriers, wardens, menders — all still half-doing
their old jobs, seventy-five years after anyone told them to. (This is why a "caught" grunling
joins you so readily: **it has been waiting for instructions.**)

### The thing beneath (what the rings actually circle)
The Ringwrights did not build the rings *outward* against the world. They built them *inward* —
**concentric fences around something they found, then loved, then feared.** The old gate's
foundations face in (Gate-Stone). What is it? Deep canon, reserved: **the Drop is not a place,
it is a door that was opened from the inside** — and what opened it was not malicious. It was
*leaving*. The "something waiting at the Drop, patient and somehow familiar" (Frostbound intro)
is the door still held open — the way a house holds a door open for someone expected back.

### The blight (the bandage, not the wound)
Seventy-five years ago the door opened and the one who opened it went through — or came out, no
living person knows which (the in-game origin stays deliberately unknown; THIS is the question
the whole story orbits). The world scabbed around the open door: **the blight is scar tissue**
(Fen-Stone). It is not spreading to kill; it pools, patient, *keeping the wound shut as best it
can*. Killing the blight without closing the door would be tearing off the bandage.

### The current (the kept promise)
The Ringwrights left the power on (Wire-Stone) as a **promise**: the lines hum a single
unbroken signal inward — a porch-light, a held note meaning *we kept it running; you can still
come home.* The Live Wire boss is the line's feral keeper. When the player kills it, "the old
power-lines fall quiet for the first time in seventy-five years" (RING_CLEAR) — **the player
has, without knowing it, broken the promise.** This lands much later (see Iteration 3).

### The Stillness (mercy, not a wall)
The last working of the Ringwrights, made "of ourselves — our calm, our cold, our refusal"
(Still-Stone). It does not guard the Drop from climbers; **it guards climbers from wanting the
Drop**. Freeze is not aggression — it is a hand on your chest. This is why it reads "somehow
familiar": it is made of the same craft, the same warmth-in-the-core, as the player's own squad.

### The mentor (the second one through, not the first)
The mentor was the first *in seventy-five years* — the first since whoever opened the door.
His notes get shorter, then become questions, because he worked out the above and could not
bear to write it plainly. At the door he faced the Ringwrights' own choice — **close it (end
the blight, seal away whatever waits) or go through (find out)** — and refused both: he is
still climbing, somewhere past the Drop, holding the question open for the player (CROSSING_BEATS
crossing 4: "Not dead. Changed."). The handed-down three cores are not random: they are
**Ringwright seed-stock**, the last of the original garden line.

---

## II. THE THREADS (asked now → answered later)

| # | Thread (asked by) | The reserved answer | Pays off |
|---|---|---|---|
| T1 | Someone made the rings (Rim-Stone) | The Ringwrights — gardeners, not soldiers | **I2** ring story spine |
| T2 | The old gate faces inward (Gate-Stone) | Rings = fences around the door, fear-after-love | **I2** (Fallen Gate arc) |
| T3 | Grunlings were grown (Garden-Stone) | All grunlings = feral craft; caught = re-employed | **I2** (collection lane tie-in: catching is *hiring*) |
| T4 | The current must not stop (Wire-Stone) | A porch-light promise; the player breaks it at R4 | **I3** (consequence: something stops waiting) |
| T5 | The fast ones still deliver (Trail-Stone) | A last message, undelivered for 75 years — addressed to whoever opened the door | **I3** (the player can finally deliver it) |
| T6 | The watcher, kind once (Dark-Stone) | The oldest keeper; it watched the Ringwrights leave | **I3** (it can be ally or wall, by player conduct) |
| T7 | Blight = bandage (Fen-Stone) | Scar tissue around the open door | **I3/I4** (cure ≠ kill: closing the door heals it) |
| T8 | The Stillness is mercy (Still-Stone) | Made of the Ringwrights; protects you from wanting | **I2** boss rework: sparing vs felling it can matter |
| T9 | Who opened the door, and which way? | DELIBERATELY UNRESOLVED — the final fork | **I4** endgame choice |
| T10 | Why do cores hum louder inward? | They're nearing the garden they were seeded from | **I2** (Chronicle entry when all 8 stones found) |

### The endgame fork (T9 — the game's last question, reserved)
At the bottom of every crossing the player eventually earns the Ringwrights' choice, un-refused:
**Close the door** (the blight heals; the rings go quiet; every grunling's core dims — the craft
ends with the wound) or **go through** (follow the mentor and the opener; the rim survives but
never heals; the story continues — NG+ becomes canon). Two endings, both costly, both folk-true.
No "correct" answer; the Spotter refuses to advise on it.

---

## III. IN-GAME SURFACING (what ships when)

**Now (vF-CE, this session):**
- `DEEP_INSCRIPTIONS` in `src/data/lore.js` — one carved stone per ring, found on FIRST clear
  (a new 'stone' step in the won-screen staged reveal; persisted in `8gents_seam_stones`).
- Chronicle: new **THE CARVED STONES** section (gated per stone) + the code-drawn **world map**
  (see §IV) as the Chronicle's visual anchor.
- Collection pressure: 8 stones to find = a reason to clear every ring once (run-#2 fuel).

**Iteration 2 (Rings 2–8 story spine):** per-ring wayside tales that contradict/confirm stones;
the Stillness spare-or-fell beat; the all-8-stones Chronicle entry ("the cores hum because…" T10).
**Iteration 3 (past the Drop):** consequences (T4 silence, T5 delivery, T6 the watcher's verdict).
**Iteration 4 (the end):** the fork (T9). The blight's origin is never *narrated* — it is only
ever what the player concludes.

## IV. THE WORLD MAP (visual canon)
Code-drawn SVG (`WorldMap` in SeamLab): eight concentric rings around a pulsing Drop, the rim
outside, ring names on their bands, found-stone markers. Visual rules: the world is CIRCLES —
no horizon, no compass (the only direction that exists is *inward*); the Drop pulses slow
(a held breath, ~4s); unlocked rings lit, locked rings dark; blight rendered as soft pooling
between rings 6–8, never as spikes/tendrils (it's a bandage, not a monster).

## V. VOICE RULES (for all future lore text)
1. The old folk say *we*; they never name themselves. NO ONE in-game names them.
2. Stones are weathered-plain: short sentences, no cosmology, one quiet gut-punch each.
3. The Spotter comments on stones folk-wise but never explains them ("Old words. Heavy, though.").
4. Never use: ancient, eldritch, corruption, energy, dimension. Always prefer: old, wrong,
   patient, kept, grown, home.
5. Every revelation must COST something to be true (the current was kindness → you silenced it).
