# Celestial Cutaway v3 — Design Notes

*Systems, concepts, and open questions for the rebuild. This is a thinking
document, not a spec. Questions are marked **[Q]** — those are the decisions
that need your answer before building.*

---

## 0. Ground rules

- Plain HTML / CSS / JS. Multiple `.js` files for sanity, loaded as ordinary
  `<script>` tags in dependency order. No modules, no bundler, no Node.
- Must run by double-clicking `index.html`, offline, forever. (but if CORS problems arise, then bundling a 1mb mongoose server.exe is okay, the web app launched via a .bat file)
- No dependencies. Nothing installed to develop it, nothing to run it.
- One art style, refined.

**On file splitting without modules:** each file wraps its contents in a
namespace object (`const Palette = (function(){ ... return {...}; })();`).
Ordinary script tags, explicit load order in `index.html`, no CORS problems.
Simple and debuggable.

---

## 1. The generation pipeline

The central idea: **one generic renderer, driven entirely by data.** Body types
never get their own drawing code. A "type" is a recipe that produces a
description of what to draw; the renderer knows nothing about planets or stars.

```
seed
  ↓
ARCHETYPE          which kind of body (rocky / gas giant / red giant / …)
  ↓
TRAITS             global quirks rolled against the archetype's trait pool
  ↓                (tidally locked, shattered, ringed, …)
STRUCTURE          the layer stack: radii, roles, behaviours
  ↓                traits can insert / remove / modify layers
PALETTE            2–3 anchor colors + derived per-layer colors
  ↓
DETAIL             per-layer detail-element instances (dozens–hundreds)
  ↓
STATS + TEXT       derived from structure & traits, phrased for laypeople
  ↓
RENDER             generic: draws whatever the structure says
```

Every stage takes its own RNG stream off the master seed, so changing the
palette doesn't reshuffle the structure, and vice versa. *(This worked well in
v2 and is worth keeping.)*

---

## 2. Archetypes

An archetype is a data blob. Adding a body type = adding a blob, not code.

```js
{
  id: "rocky",
  label: "Rocky World",
  sizeClass: "planet",

  // Layers, outermost first. Fractions are ranges, rolled per-body.
  layers: [
    { role: "atmosphere",  frac: [0.98, 1.06], optional: true },
    { role: "crust",       frac: [0.88, 0.96] },
    { role: "mantle",      frac: [0.45, 0.70], repeat: [1, 3] },
    { role: "outer-core",  frac: [0.20, 0.35], optional: true },
    { role: "core",        frac: [0.10, 0.22] }
  ],

  colorRules: { hue: [0, 360], sat: [0.25, 0.75], value: [0.15, 0.85] },
  traitPool: ["tidally-locked", "ocean-world", "volcanic", "shattered", ...],
  traitCount: [1, 2]
}
```

**Layer roles** are the vocabulary the renderer understands: `atmosphere`,
`ocean`, `ice-shell`, `crust`, `mantle`, `convective`, `radiative`,
`degenerate-core`, `core`, `void`, `debris`, `accretion-disc`, `ring`…

Each role has a default **behaviour** — how it's drawn, textured, and
annotated. That's what lets one renderer serve every body type.

**[Q1]** Does the archetype list below look right, and is anything missing?

> rocky · ocean/ice world · desert world · volcanic world · gas giant ·
> ice giant · moon · asteroid · young star · main-sequence star ·
> red giant · white dwarf · neutron star · pulsar · black hole · nebula

ANSWER: Hmm not quite. I'd say these are ok because they're general:
planet · gas giant · ice giant · moon/planetoid · asteroid(large) · young star · main star · old giant star · dwarf star · neutron star · pulsar · black hole · nebula

I don't like these below ones mainly because they're too specific and could be achievable via colors, traits, descriptions or surface layer style/detailing - while the underlying main celestial entity should be just "planet" or just "(type) star":
rocky · ocean/ice world · desert world · volcanic world · red giant · white dwarf


**[Q2]** Nebulae and asteroids don't have concentric layers — a nebula is
patchy volumes and voids, an asteroid is a chaotic rubble pile. Options:
 - **(a)** Force them into the concentric model (sloppy but free)
 - **(b)** Give the renderer a second *layout mode* ("blobby") that both use,
   still driven by the same role vocabulary
 - **(c)** Skip them in v3.1, add later

I lean **(b)** — one extra layout mode is much cheaper than a second renderer
and it covers asteroid, nebula, and accretion discs at once.

ANSWER: Nuh uh, Nebulae can have layers; sparse outer regions, denser inner regions, and a densest "core" region. Its just nebulae use the wobble thing to an extreme level that makes their shape look all incohesive.

Asteroids also do have layers; dusty/scratched surface film, hardened outer shell, inner voronoi amalgam of rock and mineral deposits - essentially its a very wobbled celestial with a wobble outer shell and a chaotic inside mosaic using voronoi with its various tiles in a set of 2-4 different colors - somewhat muted/desaturated/but shiny.

---

## 3. Traits — the "major quirks" system

**What v2 got wrong:** features were small localized pinpricks (a storm here, a
patch there) with a 10% rare tier. Too fiddly, too easy to miss.

**What they should be:** *global* properties that visibly change the whole
body. 1–2 per body. If you can't see it at a glance, it isn't a trait.

Traits mutate the structure. They are not decorations.

| Trait | What it does to the picture |
|---|---|
| Tidally locked | Split the body: molten dayside, frozen nightside, a twilight band between |
| Ocean world | Thick ocean layer, thin crust, ice caps at the poles |
| Ice-shelled | Ice crust over a subsurface ocean; the ocean is the story |
| Runaway greenhouse | Thick opaque atmosphere, scorching surface |
| Shattered | A bite taken out of the crust, exposed mantle |
| Ringed | Ring system (this belongs here — **not** as a stats row) |
| Hollow core | Void where the core should be |
| Twin core | Two cores, unfinished merger |
| Irradiated | Stripped atmosphere, glowing crust |
| Ancient / dead | Cold core, no dynamo, fractured crust |
| Storm-wracked | Gas giant with a great eye and violent banding |
| Metal-rich | Oversized core, high density |

**[Q3]** Should traits be user-selectable (checkbox list, "give me a tidally
locked ocean world") or purely seed-rolled? Selectable is much more useful for
a GM with a specific scene in mind, but it's more UI.

I'd suggest: rolled by default, with an "override" section where you can force
specific traits on.

ANSWER: Hmm, this doesn't look right.

In the settings, sure, the user can choose the traits to add to their celestial, but only compatible ones will show up.

But generally traits focus on a specific layer of a celestial and within these realms:
- on the layer itself
- extending/positioned inward towards core
- extending/positioned outwards towards space
- (some traits may exist on multiple layers)
- and then within what radius/range/rotation its clamped to (or spread all the way 360'?) - and "is it mirrored?" or "does it repeat/have intervals in how many times its spread across the 360 range of the layer/shell" and if so, what randomization of the each range segment is like and what kind of angle offset do they have?
- when placing traits, assume initially the celestial is pointing upwards, but is then rotated after all layers and traits have been applied to it - with this rotation being an optional setting if the user wants their planets to always be upright.

We will need a new catalog document for listing all celestials, and per layer, list all the traits that those celestials could have. And said traits should adhere to the above modular principle/logic I laid out above.

Also the traits would be entirely decoupled from the width/size of a layer - those are rolled separate for each celestial with certain min-max ranges for how thick/thin they're allowed to be.

There are though some special cases like the tidally locked surface setup that might need some extra exceptions/rules to make that work, so the system can bend there to make such special setups work.

This means that the existing traits you listed above would have to be rethought entirely; some entirely removed, some decoupled, some changed and many new ones created that fit this newer system.

---

## 4. Colour system

**Replace fixed palettes entirely.**

Each archetype declares *ranges*, not colours:

```js
colorRules: {
  primaryHue:   [0, 360],        // anything goes for a rocky world
  saturation:   [0.25, 0.75],
  value:        [0.15, 0.85],
  secondaryRel: "complement|analogous|triad",  // how core relates to surface
  atmosphereRel: "analogous"
}
```

The generator picks:
- **Primary** — surface / outermost material
- **Secondary** — core / innermost (related to primary by the declared rule)
- **Tertiary** — atmosphere / halo, optional

Intermediate layers interpolate through HSV between primary and secondary, with
small per-layer jitter. Because everything derives from 2–3 anchors, output is
*always* harmonious but never repetitive.

Archetypes constrain sensibly: a red giant is locked to `hue: [0, 45]`, a
neutron star to `sat: [0, 0.25]` with high value. A rocky world can be anything
— green surface with a yellow core is a perfectly good alien planet.

**[Q4]** Should there be a "palette lock" / manual colour picker for people who
want a specific look, or is seed + hue-nudge sliders enough?

ANSWER: Latter is better (seed + hue-nudge sliders).

---

## 5. Visual density — the big one

> *"move away from being artsy/sparse to something more intricate and complex
> looking, despite using simple tricks of layering things, cheap basic
> procedural elements but used more numerously."*

This is the most important aesthetic instruction and it should drive the whole
renderer. The rule: **when in doubt, draw more of it, smaller and fainter.**

### Detail elements

Each layer role owns a set of **detail element** types, instanced in bulk:

| Element | Used by | Count |
|---|---|---|
| Convection cells | convective, mantle | 20–60 |
| Flow arrows | convective, ocean | 8–20 |
| Radiative streaks | radiative | 40–120 |
| Mineral veins | crust, mantle | 15–40 |
| Deposit clusters | crust, asteroid | 30–100 |
| Fracture lines | crust, ice-shell | 10–30 |
| Cloud bands | gas envelope | 12–30 |
| Storm curls | gas envelope | 5–20 |
| Grain speckle | any solid | 200–800 |
| Flares / prominences | stellar surface | **3–30, in size tiers** |
| Debris chunks | asteroid, ring, nebula | 50–300 |
| Void pockets | asteroid, nebula | 5–25 |

Counts scale with a **Detail Density** slider and with render resolution, so a
2160px export is genuinely more detailed rather than the same art scaled up.

**Layered tiers.** The flare note generalizes: draw elements in 2–3 size tiers
— a few large, more medium, many small. That single trick is most of what
separates "sparse and artsy" from "intricate".

### Layer behaviour, drawn

Layers should *show* what they do — this is the "instructive illustration" idea:

- **Convective** → visible cell structure, curved flow arrows, rising/falling
- **Radiative** → fine radial streaks, no bulk motion
- **Degenerate core** → dense uniform stipple, tight compression rings
- **Ocean** → current arcs, depth gradient
- **Ice shell** → fracture networks
- **Mantle** → slow convection plumes, mineral veining

**[Q5]** How instructive should this get? A spectrum:
 - **(a)** Purely textural — it *looks* like convection, no symbols
 - **(b)** Subtle symbols — a few flow arrows where they read naturally
 - **(c)** Fully diagrammatic — arrows, motion lines, an annotated key

My instinct is **(b)**, with the arrow density on the same Detail slider so you
can dial toward (a) or (c).

ANSWER: Yes, I agree with the "Layers should *show* what they do" and I want to aim for a mix of B and C, but without annotation (I assume that means text labels) with an emphasis on certain layers getting more diagrammatic focus than others - mainly things like inner star layers like convective/radiative layers, but also rocky planet mantles, gas giant gas layers - generally such layers that have motion/flux and aren't static. Core layers and surface level layers might have subtler things like motion lines instead of straight up diagram arrows, so theres a mix and logic that guides when and where the more purer or subtler diagrammatic elements are used.

On another note its true that layer details have tied to layers, but its important to notice when something is default layer detail (a mandatory element) and when its actually a trait (an optional element). Looking at the list, things that I would consider as traits would be the "void pockets", "debris chunks", "mineral veins" - atleast these ones feel more like addons than "standard equipment of a layer". The others in the list do feel correct thought in being an inherent element of a layer, though I mostly skimmed over them at a glance.

---

## 6. Surface features: oceans, ice caps, atmosphere

v2 drew these as arcs stroked along the crust and it looked odd. Rethink:

**Oceans** — a real layer in the stack, not an overlay. Sits between crust and
atmosphere, drawn as a filled band with a depth gradient (darker deep). Its
angular extent is set by traits: an ocean world wraps fully; a drying world has
basins; a tidally locked world has a band on the warm side only.

**Ice caps** — wedges at the poles, wide at the surface tapering inward, drawn
as a distinct material. Extent driven by temperature. On a tidally locked
world, the entire nightside is a cap.

**Atmosphere** — a soft outer band with a genuine gradient falloff, and
optionally 2–3 sub-bands (troposphere/stratosphere) for thick atmospheres.
Should read as a *layer*, not a glow effect.

**[Q6]** The cutaway is a 2D slice. Do we treat "poles" as top-and-bottom of
the circle (a real polar slice) or stay agnostic? Committing to a polar slice
makes ice caps and tidal locking much more legible — I'd commit.

ANSWER: Umm probably yes. I think I mentioned in Q3's answer how to handle this.

---

## 7. Stats, in plain language

**The rule: every number is something a person can picture.**

Report a familiar comparison first, the figure second (if at all).

| Instead of | Say |
|---|---|
| `1.97 g` | **Gravity:** Heavy — you'd weigh about twice what you do on Earth |
| `601 K` | **Surface:** 328 °C — hot enough to melt lead |
| `0.00758 Solar` | **Mass:** About 2,500 times the Earth |
| `38.4 Solar` | **Size:** 53 million km across — 4,000 Earths side by side |
| `8.67 km/s` | **Getting away:** Easy — a modest launch escapes it |
| `1.9e-4 kg/m³` | **Density:** Thinner than air — you could fly through the outer layers |
| `520 d` | **Day length:** About 17 months from sunrise to sunrise |
| *(nothing)* | **Can you stand on it?** No solid surface — it's gas all the way down |
| *(nothing)* | **What would kill you first:** The pressure, within seconds |

That last kind of line is the most useful thing the tool could print for a GM.

Suggested stat block — six lines, all plain:

1. **Size** — vs Earth, plus km
2. **Gravity** — what it feels like
3. **Temperature** — °C, plus a comparison
4. **Surface** — can you stand on it? what's underfoot?
5. **Atmosphere** — can you breathe? what happens if you try?
6. **The hazard** — what makes this place dangerous or valuable

**[Q7]** Keep any hard numbers at all, or go fully descriptive? A middle path
— plain phrasing with the figure in smaller type beside it — probably serves
both the casual reader and the person who wants specifics.

ANSWER: copied from my other reply:
"Oh no no, I do indeed want numbers and concrete stats - but ones that are way more relatable to a layperson/casual/gamer. Could be even a mix of something like this: "Surface temperature range: -100'C to +40'C (Hazardous)". I also want more stats, but the font might have to be smaller and the info card might need to be much more dense to fit the extra information or somehow combine some datapoints to a single line instead of each being a separate line to save space etc. Also the info card would use a completely different template per celestial type."

Speaking of hazards, this can be a fun list to expand as I recall watching a youtube video where someone said theres an exoplanet somewhere in the universe where it rains glass, sideways and a very high speed. Or something like Venus that is really hostile on its surface. Granted, not everything has to be extreme like that, we can have plenty of tame planets with only mild inconveniences instead of outright hazards. This'll need a list too.

---

## 8. The overlay, rebuilt

v2's overlay was spaghetti. Causes: leader lines anchored at arbitrary points
in the text block, too many callouts, and stat nuggets mixed into layer labels.

**Fix by drastically reducing scope.** The overlay does **one job: name the
layers.** Nothing else.

Rules:
- One label per layer. No feature callouts, no stat nuggets, no legend.
- Leader lines anchor at a **consistent point** — the left or right edge of the
  label's baseline, always.
- Labels stack in a single column per side, evenly spaced, sorted by depth so
  lines never cross.
- Leader line is a straight run from label to a dot on the layer band, with at
  most one elbow.
- Traits get their own small labelled markers *only* if they're visible in the
  picture.

Everything else (stats, trait descriptions, name) lives in the side panel or a
header block — **never** overlapping the illustration.

**[Q8]** Should the overlay be a separate export, or a toggle on the main one?
v2 made it replace the side panel, which meant two quite different images. A
toggle is simpler; a separate "labelled diagram" export is more useful.

ANSWER: A toggle. If rendered only the planet, then only the planet is rendered (with an optional background). If rendering with the info, then theres gonna be the usual sidepanel plus the optional layer-only labels drawn as holograms at the side of the celestial or wherever its best to place them around the celestial. The labels I'd want them to have an underline and then the end or start of the underline - depending if the label is placed on the left side or right side of the celestial - will have a simple 1px thick line drawn from that underline end/start towards the layer's center width that is closest to said label. Hopefully all done in a way that is organized.

---

## 9. UI restructure

Current problem: the settings panel grew until Randomize and Export fell below
the fold.

```
┌────────────────────────────┬──────────────────────┐
│                            │  [ Randomize ]  🔒   │  ← always visible
│                            │  [ Export ▾ ]        │  ← always visible
│      PREVIEW               ├──────────────────────┤
│                            │ ▸ Body               │  ← collapsible sections
│                            │ ▸ Structure          │     only one open at a
│                            │ ▸ Colour             │     time; each scrolls
│                            │ ▸ Detail             │     internally
│                            │ ▸ Labels             │
│                            │ ▸ Output             │
└────────────────────────────┴──────────────────────┘
```

- Randomize + Export **pinned** at the top of the panel, outside the sections.
- Sections are accordions; the open one scrolls **inside itself**, so the page
  never scrolls.
- Per-control 🔒 locks stay (they're great).
- Randomize settings live in a section; the *button* stays pinned.

**[Q9]** Accordion (one open at a time) or tabs (one visible at a time)?
Accordion lets you see two related sections at once; tabs are tidier. I'd go
accordion with multi-open allowed.

ANSWER: Hmm, I do see your point of "accordion with multi-open allowed" being the best option. I think we'd choose that. Originally I though that perhaps a dropdown based tabs system might be easier to handle, but the accordion with multi-open is pretty good too. I guess whichever is easier to code and more reliable to scroll with. I think your instinct with "accordion with multi-open allowed" is best.

---

## 10. Suggested build order

Each stage should produce something you can look at and judge.

1. **Skeleton** — HTML/CSS/JS shell, preview canvas, pinned buttons, accordions
2. **Structure + generic renderer** — rocky world only, one layer stack, flat
   colours. Ugly but correct.
3. **Colour system** — HSV anchors + derivation. Now it's pretty.
4. **Detail elements** — the density pass. Now it's *good*. **← the big one**
5. **Traits** — tidal locking, oceans, rings, shattered. Now it's interesting.
6. **More archetypes** — gas giant, stars, then the exotics.
7. **Stats + text** — plain-language layer.
8. **Overlay** — minimal layer labels.
9. **Polish** — export options, tooltips, presets.

Stage 4 is where the project succeeds or fails aesthetically. Worth building
2 and 3 quickly, even crudely, to get there.

ANSWER: I agree that the scope of this project has grown tremendously that trying to do everything in one pass is not advisable. I want to first refine or write new "final" plan documents that give you a complete picture of what is expected from the full scope of the program so that during the initial stages of building the skeleton architecture we won't paint ourselves into a corner by making the features that come later impossible. Between the 3 docs in the docs folder and my replies in the AI chat, I think we're very close to the locked scope of what I'd want to settle on so atleast it won't balloon from that in terms of what this program should be able to do - though probably there will be some tweaks to the traits and layer details to make them better, but atleast the GUI and the underlying core systems are fairly solid after all the answers are accounted for.

---

## 11. Open questions, collected

- **[Q1]** Archetype list — right set? anything missing?
- **[Q2]** Non-concentric bodies (nebula, asteroid) — second layout mode?
- **[Q3]** Traits user-selectable or seed-only?
- **[Q4]** Manual colour override, or seed + nudge sliders?
- **[Q5]** How diagrammatic should layer behaviour get?
- **[Q6]** Commit to a polar slice orientation?
- **[Q7]** Any hard numbers in stats, or fully descriptive?
- **[Q8]** Overlay as toggle or separate export?
- **[Q9]** Accordion or tabs?

Plus two I'd add:

- **[Q10]** Should a body's *size class* affect canvas framing? A moon and a
  red giant currently render the same size, which loses all sense of scale. An
  optional Earth/human silhouette for comparison could be very effective.

ANSWER: I've seen maps have that 1000:1 scale thing and the example measurement of how many kilometers in the image corresponds to the true size. An sun/earth/human silhouette (circle or rectangle, respectively) would also work too. These elements be in the lower left corner of the image.


- **[Q11]** Is there value in a **cutaway wedge** view — a pie-slice removed
  from the sphere showing depth in 3/4 perspective — or is the flat concentric
  circle the right call? Flat is cleaner and more diagram-like; a wedge is more
  dramatic and more obviously a "cutaway". Could be an output option.

ANSWER: Hmm, that would require rendering the surface of the celestial which is outside of the scope of this program. I'd say no this and keep it strictly to pure 2D cutaway only, without any sort of 3D partial slice cut like I've seen in some physics/astronomy image books.
