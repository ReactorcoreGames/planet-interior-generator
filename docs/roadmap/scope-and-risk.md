# Deliberately out of scope, risk notes, session boundaries

*Part of [ROADMAP.md](../ROADMAP.md).*

## Deliberately out of scope

Recorded so they don't creep back in:

| Not doing | Why |
|---|---|
| Multiple art styles | One style, done well |
| 3D or wedge cutaway views | Flat 2D only — a wedge needs surface rendering |
| Surface maps | Different tool entirely |
| Animation | Static illustrations |
| Local features (a unique city, a unique crash site) | Traits are meant to be global; local specific instances is the user's job |
| Solar system / multi-body views | One body per image |
| Save/load of body libraries | The seed string is the save format |
| Server-side anything | Static files, forever |

---

## Risk notes

**Phase 3 is the risk.** Everything else is well-understood work. Visual density
is a judgement call that needs iteration and a human eye — build it early, look
at it often, and don't move on until it's genuinely impressive.

**Climate on a family that should not have one** was a standing risk once the
field became universal, and it is now mitigated in three ways rather than one:
`climate: { latitude: 0 }` or omitting the spec removes latitude,
`starlit: false` removes the incident-starlight term, and both are asserted on a
synthetic archetype in `npm run climate` so the mechanism was proven before any
family depended on it (D50).

What remains is not a code risk but an **authoring** one: the escape hatches
only work if an author remembers to use them, and forgetting is SILENT — a star
that answers to a Starlight slider produces a subtly wrong number rather than a
visible break. `ARCHETYPE-TEMPLATE.md` therefore makes the climate spec a
required field with its own checklist entries. Fill it in before writing the
stack, not after.

**Trait collisions** are the second risk. Two traits both wanting the same
angular region on the same layer will look wrong. The grammar has `excludes`,
but some collisions will only surface visually. Worth testing trait pairs
systematically once Phase 4 lands.

**Performance** at high density is the third — but it is *not* solved by scaling
counts with resolution or by a cheap preview. Both were rejected:

- **Element counts never scale with resolution.** The same body is the same
  image at any size — same elements, same places, drawn larger or smaller.
- **The preview is the real render.** No reduced-density stand-in. What the user
  sees is what they export.

Anything else breaks *same seed + same settings = same image*, because the
export would differ from the preview.

The real budget: **10–20 seconds maximum** for a render or a randomize. Density
is tuned to be as detailed as is sensible inside that ceiling — the balance
point between speed and quantity. If an archetype can't make it, reduce its
*authored* density; never degrade quality at preview time.

Live slider drags come from **stage caching**, not from lowering quality: colour
and opacity changes redraw cached geometry without regenerating elements. See
[ARCHITECTURE.md](../ARCHITECTURE.md#resolution-independence).

The nebula is the archetype most likely to strain this — check it early.

---

## Suggested session boundaries

The scope is large. A reasonable split:

| Session | Content | Status |
|---|---|---|
| A | Phases 0–2 — skeleton through colour | ✅ |
| B | Phase 3 — detail elements, with visual iteration | ✅ |
| C–E | Phase 4 — traits, zones, tidal locking, and its defect passes | ✅ |
| F | **The climate system** — CLIMATE-PLAN.md Steps 0–7 | ✅ |
| G | MVP polish — stats, presets, export, info panel | |
| H | Phases 5–6 — gaseous and stars | |
| I | Phase 7 — remaining families | |
| J | Phases 8–10 — overlay, polish, release | |

Session B was the one to protect, and it held: it is where the project's look
was decided.

**The climate system took a session of its own and was worth it.** It was
planned as an extension of tidal locking and turned out to be a foundation —
the surface temperature is what caps, sea ice, aridity, cover and half the
hazard card all read from, and it is what Phases 5–7 now inherit rather than
each solving separately. Six defects were found on the way and every one was
found by a NUMBER rather than by looking (D40–D46); budget the later families
the same way.
