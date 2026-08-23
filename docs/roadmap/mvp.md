# MVP — ships here

*Part of [ROADMAP.md](../ROADMAP.md).*

> **The four polish items are built** (Session G). See
> [PROGRESS.md](../PROGRESS.md) D51–D54 for the decisions and the four defects
> that got through the first pass. What remains is the MVP test itself, below,
> which only the user can run.

**Phases 0–4 and the climate system, with the `planet` archetype only, plus:**

- ✅ Plain-language stats for solid bodies — **read off `details.climate`**, which
  is present on every body now and carries `min` / `max` / `mean` / `spread` /
  `states` / `radiation`. HAZARDS.md's standing rule: the card and the picture
  read one source, so a stat can never contradict the render
- ✅ Info panel — DOM rather than canvas, so the card is selectable text (D53)
- ✅ Randomize with locks
- ✅ **Preset gallery** — the ten solid-body presets from
  [PARAMETERS.md](../PARAMETERS.md#presets). Cheap to build (each is a stored set
  of control values) and it's what makes the parameter model *discoverable*;
  without it a user has to know which sliders to drag to get a named world type.
  Other families' presets land with their phases. **Three of the originally
  listed ten needed archetypes that do not exist yet** and were replaced —
  see [PARAMETERS.md](../PARAMETERS.md#presets)
- ✅ PNG export (aspect ratios, resolutions, background modes), plus clipboard
  and the shareable settings string. **Export re-renders rather than scaling
  the preview** (D54), which is what resolution independence was for
- ✅ Tooltips

**MVP test:** "Can I press Randomize twenty times and get twenty planets I'd
happily use in a game, at least half of which make me want to know more?"

If yes, everything after this is expansion. If no, the problem is Phase 3 or 4
and no amount of extra archetypes will fix it.
