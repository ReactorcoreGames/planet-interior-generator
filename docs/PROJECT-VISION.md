# Celestial Cutaway — Project Vision

*What this project is, as I (Claude Opus) understand it. Written after the v2 attempt, which
overshot in some directions and undershot in others.*

---

## The one-sentence version

A tool that generates **cross-section illustrations of celestial bodies** —
planets, stars, gas giants, asteroids, nebulae — that look like places worth
travelling to in a science fiction story. They can be safe, hazardous, mundane, odd, extreme, small, big, simple or complicated. Even a boring dusty moon is welcome as much as a exoplanet where it rains glass sideways. Even the story is also something that can happen out of curiosity, necessity, by accident or due to a mundane routine - all are ok.

## The core idea

Most space-setting tools make **maps**: top-down views of a surface you walk
across. This one makes **cutaways**: a slice through the object showing its
depth and composition, from atmosphere down to core.

That difference is the whole point. A cutaway invites a different kind of
story — not "what's over that hill" but **"what's underneath, and how deep can
we go?"** Resource extraction from a mantle layer. A dive to a pressure zone
nobody has reached. Something buried in the core that shouldn't be there. A
hidden city that spans the entire crust layer. Or underground conditions that somehow affects visitors on the surface or even in orbit. The picture should make a reader immediately want to know what's down there.

## Who it's for

Worldbuilders, GMs, sci-fi and anime writers, indie game devs. Someone who
needs an interesting place to set a scene and wants a picture plus enough
believable detail to riff on. A mix of realism and stylized proportions.

**Not** for astronomers. Not a simulation.

## The tone: believable, not realistic

The generator should feel like it obeys rules — layers in a sensible order,
numbers that don't contradict the picture, an ice cap where an ice cap belongs.
That believability is what makes a reader accept the weird parts.

But it is **not** a physics engine, and realism loses whenever it fights
interestingness. A tidally locked world with a molten dayside and a frozen
nightside is worth a hundred correctly-modelled but boring rockballs - but the occasional boring rockball is welcome nonetheless, they can be interesting through their boredom too - the user can always inject their own lore afterwards that theres an alien hive there or a crashed spaceship worth investigating - localized things that are out of scope for this generator.

**The test:** does this look like somewhere a story could happen?

## What makes a good output

1. **Visually dense.** Intricate, layered, rich in detail. Achieved through
   *many cheap, layered procedural elements* rather than a few elaborate ones — dozens
   of flares, not four; hundreds of mineral flecks, not a small local scattering. Simple tricks used numerously. Veins, convection cells, mineral deposits as numerous blobs, squares, triangles or dots, noise, gradients(various types, multiple colors, repeating or not), directional radiative flow (sort of illustrative arrows like in those sun cutaway pictures in astronomy/physics books), lines, curves, anything that is available in CSS that could be used for visuals in all sorts of ways.

2. **One coherent style.** Not a menu of art styles. One look, refined until
   it's genuinely good. Semi-technical: clean enough to read as a diagram,
   detailed enough to be beautiful. The overall aim of the look is somewhat realistic, but more on the "believable" side, with stylization making some elements more readable and layperson friendly that wouldn't be possible in a pure hyper-realism style.

3. **Legible structure.** Layers should be distinguishable and their behaviour
   suggested visually — convection cells that look like they're circulating,
   veins and deposits running through a layer, flow direction where it helps.
   The illustration should *teach* something about the body at a glance.

4. **A memorable hook.** Most bodies should have one or two global quirks that
   make them specific: tidal locking, a shattered hemisphere, a ring system, a
   runaway greenhouse. Global and structural, not tiny surface pinpricks. They can be mundane global effects too - not every celestial has to be a bizarre anomaly. Both are weird and normal are good.

5. **Numbers a normal person understands.** "Twice Earth's gravity — you'd
   feel heavy but could walk" beats "1.97 g". "Hot enough to melt lead" beats
   "601 K". The stats exist to *give a feel for the place*, not to be
   scientifically precise. But still provide numerics in the Metric system that a layperson would grasp.

## Non-goals

- Not a simulation or an educational astronomy tool.
- Not a surface map generator.
- Not a heavyweight web app. Plain HTML/CSS/JS, no frameworks, no build step,
  no Node runtime dependency. Open the file, it works, forever.
- Not a multi-style toolkit. One style, done well.

## What v2 got right, and what it got wrong

**Right:**
- The semi-technical look is close to the target and is a good base.
- Stats derived from the drawn geometry (a bigger core really means higher
  gravity) — right instinct, wrong presentation.
- The new soft, fuzzy stellar flares.
- Lockable randomization, the preview-left / settings-right layout, and the
  export options are all keepers from v1.

**Wrong:**
- Three art styles instead of one good one. Split the effort three ways.
- The hologram overlay became spaghetti — leader lines from odd anchor points,
  too much data crammed onto the diagram.
- "Features" were too small and too local to matter, and some were just odd.
  They should have been *global* quirks.
- Stats were astronomer-facing, not layperson-facing.
- Fixed hand-authored palettes are far too limiting.
- Settings panel grew until the Randomize and Export buttons fell below the
  fold.


## The through-line

**Every design decision should be judged by: does this make the output more
interesting to look at, and more useful as a story seed?**

Anything that makes it more scientifically correct without making it more
interesting is a distraction. Anything that adds a setting without adding a
meaningfully different picture is bloat.
