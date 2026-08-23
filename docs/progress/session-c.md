# Session C — Phase 4 traits and the tidal-locking rework

*Moved out of PROGRESS.md to keep that file small.*

---

## Session C — what was done, and what is still wrong

*Written at the end of Session C, with the user's review of the built result.
Read this before starting Session D.*

### Built and signed off

**Phase 4 proper** — the zone primitive, the trait placement grammar, ten
traits, the trait picker, three new drawing primitives, and ten invariants in
`test/sweep.mjs`. See D23-D26.

**Then reworked, after the user's review** — tidal locking was rebuilt from a
trait into a universal axis, and the ice caps and colour tint were replaced by
emergent behaviour from the terrain and frosting systems. See D27.

**And a defect fixed on the way** — the ocean was drawing five times thinner
than the specs said. See D28.

### Verified by measurement

At 100% lock, sampled through the real `film.js` and `zones.js` code rather
than a reimplementation:

| Bearing | 0% lock | 100% lock |
|---|---|---|
| Hot face (45-135 deg) | mixed shore, sea present | **100% bare land, dry** |
| Cold face (270-315 deg) | mixed, sea present | **100% snow, over sea** |

Plus: the lock never moves the layer stack; the sea is provably below the
terrain trough at every hot-face bearing at full lock; ocean coverage falls
monotonically (157 -> 132 -> 106 -> 89 of 180 bearings); the cross-fade stays
under 0.008 value-per-degree against a 0.05 bound.

### STILL WRONG — the user's review of the reworked build

**These are the starting point for the next session.** All four are the user's
observations on the real GUI; the first two are confirmed defects with known
causes, the last two are open questions about the underlying model.

1. **The `tidally-locked` and `ice-caps` traits are still in the picker, and
   still draw.** D27 removed every *consumer* of them — `modifierIn`, the zone
   controls, the structural category — but never deleted the trait definitions
   in `js/data/traits.js` or their blurbs in `js/ui/traitpicker.js`. So a user
   can still tick a trait that duplicates what the axis now does, and the old
   bolted-on polar wedges still appear. **This is a straightforward deletion
   that was simply missed; do it first.**

2. **The atmosphere is not affected by tidal locking at all.** `zones.airAt()`
   exists, is correct, and is exported — and *nothing calls it*. The plan was
   to repurpose `paintZoneBand`'s outward path (which already used
   `destination-out` to remove gas, with the right physical framing in its
   comments); that function was deleted in the cleanup and the replacement was
   never written. The hook is ready and the consumer is missing.

3. **The ocean's shape is not settling believably.** The user reports, at 100%
   lock with facing 0 and Keep upright on: an unexplained depression on the
   lower right; the sea sometimes rising so high on the night side that it
   drowns the atmosphere entirely (ocean or terrain reaching the atmosphere's
   outermost point); and a steep rise where the sea restarts after the
   boiled-off arc.

   The steep rise is likely `sea: -1.25` meeting `+0.34` across a `blend` of
   0.25 — a 1.6-terrain-range swing over one boundary. The drowning is the
   clamp flagged during planning and never implemented: **`seaAt`'s positive
   contribution is not bounded against `body.surface`.** The depression is not
   yet explained and should be probed, not guessed at.

4. **Whether the terrain/ocean/atmosphere model needs rethinking.** The user's
   own summary: *"It might be that the underlying methods/system for creating
   the ocean, atmosphere and terrain might need a look/rethink perhaps."*
   Worth taking seriously before more tuning. The specific tension: sea level
   is a single radius plus an angular offset, and an atmosphere is a falloff
   from whatever the surface turned out to be — neither was designed for a
   world whose surface height varies by a third of its radius around the
   circumference.

### One process note worth keeping

**A probe that reimplements the logic it tests agrees with itself, not with
the renderer.** A zone-split probe duplicated `zoneWeights` inline and kept
reporting an inverted snowline after the inversion had been fixed, costing a
round. `CC.Film.zoneWeights` is now exported specifically so harnesses can call
the real function. The same rule applies to `seaAt`, `airAt` and `coverAt`.

