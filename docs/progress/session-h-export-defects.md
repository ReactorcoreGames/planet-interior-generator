# Session H — export defects and the framing fix

*D62–D68. Everything here came from the user driving the real GUI after
Session G's MVP polish landed, which is the only place several of these were
visible at all.*

---

### D62 · A card is as tall as its content, never as tall as its slot

**Reported:** "With Compact info card, it still has space beneath it but it
covers it with a solid background. I wish the chosen background for the image
would just extend there without covering it up."

`CC.Card.draw` took the height it was *offered* whenever the layout fitted:

```js
var usedH = layout.overflow ? layout.total : h;   // h = the slot
```

A Compact card is six lines in a slot sized for eleven, so the panel painted an
opaque slab over the empty half. Nothing was drawn there — the background was
being hidden for no reason at all.

Now it takes `layout.total`, which is what `layoutFor` already measured it to
need, clamped to the slot. Overflow is the same number by a different route.

**And the composed export centres it.** Once the card is only as tall as its
content, pinning it to the top reads as a card that failed to fill the frame.
Centred against the body's own centre line it reads as a deliberately small
label beside a planet.

**The general rule:** *a panel's background is a property of its content, not of
the space it was allotted.* An element that paints its slot is asserting it owns
the whole slot, and a card that has run out of things to say does not.

---

### D63 · The composed export has an aspect floor, and it is 4:3

**Reported:** the composed export ignored the aspect ratio and always came out
square-ish, with no room for the body to breathe. The user also correctly
anticipated the problem: *"respecting aspect ratio blindly isn't so simple and
aspect ratios below a certain point would just mess up the whole image."*

They are right, and the reason is worth stating because it is not obvious:

- The card takes a fixed share of the **width** (~31.5%).
- The body is sized off the **shorter axis** of what is left.
- In a tall frame that shorter axis *is* the shrinking width.

So narrowing the frame shrinks the body twice over, and past a point the card
and the body simply do not coexist — the body is a dot in a third of the frame,
or the card is forced so narrow that the canvas grows taller, making the frame
narrower still. A 9:16 composition is not a layout problem with a clever answer.

**4:3 is where `bodyAreaW` stops being the binding axis by a comfortable
margin** (about 0.85 of the height), so the disc is still framed by its height.
Below that the export falls back to 4:3 rather than refusing — a user who picked
1:1 gets the tabletop image they were going to get anyway.

**The filename records the ratio the file actually has,** not the one requested.
A 4:3 image called `..._1-1_composed.png` is the kind of thing discovered after
it has been filed.

The other exports have **no** floor: a body alone centres happily in any frame.

---

### D64 · Resolution scales the card; it does not dictate its height

**Reported:** "About the infocard only export, can the user alter its size via
chosen resolution? I think it should respect that setting."

It did not. The width was `resolution * 0.42` and the height was whatever the
text needed, so "2160 px" produced a 907px-wide card — the number appeared
nowhere in the output.

**The obvious fix was wrong, and that is the useful part.** Solving for the
width whose card is exactly `resolution` tall *does* make the number mean the
height. But the card has no aspect ratio of its own, so the width has to absorb
every difference in how much there is to say — and a six-line Compact card
needed to be **1490px wide to reach 1080px tall**. A near-square slab of
enormous text. The control was honoured and the output was worse.

So resolution scales the card the way it scales everything else: width is a
fixed fraction of it, height follows the content. A 2160px card is a 1080px card
at twice the size.

The height does not scale by exactly 2×, and that is correct rather than a flaw
to engineer away — a wider card fits a wrapped paragraph into fewer lines, so it
is proportionally shorter. The test asserts a range and that the card stays
portrait, rather than an exact factor it was never going to hit.

**The general rule:** *honouring a control is not the same as satisfying its
most literal reading.* When the literal reading makes the output worse, the
control means the nearest thing that does not.

---

### D65 · The info card must not be a zoom control

**Reported:** "If I turn off the infocard, the planet doesn't just move itself
back to the center of the canvas, but instead zooms in to fill the space freed
by the infocard going away, cropping offscreen from the bottom."

Exactly right, and the mechanism is a three-step chain where each step is
individually reasonable:

1. `#preview.info-open` reserves the card's room with `padding-right: 356px`.
2. The canvas is sized from its own CSS box, so that padding narrows it.
3. `makeView` sizes the body from `Math.min(width, height)`.

On a wide screen height is the shorter axis either way and nothing happens —
which is why this survived Session G. But **anything below about 1900px wide is
width-bound**, and there the body's size starts being set by the card's
presence. Measured:

| Window | Zoom on turning the card off |
|---|---|
| 1920×1080 | 0.0% |
| 1600×900 | 3.8% |
| 1440×900 | 28.4% |
| 1280×800 | **48.8%** |

**The fix is in two halves, and needed both.**

*`sizingAxis`* (draw/canvas.js) lets a caller say the body should be **sized**
against one box while being **drawn** into another. The preview passes its full,
unpadded box, so the card cannot rescale the body — it only shifts where it is
centred, which is what "make room for the card" should mean.

*Clamped to the drawn box*, because sizing off the full preview on a narrow
screen asks for a body wider than the canvas it lands in, and **a clipped body
is worse than a smaller one**.

But the clamp binds in exactly the cases the fix was for, so on its own it
restored the original behaviour. **The CSS had to give it slack**: the
reservation is now stepped down as the window narrows (356 → 236 → 120 → 16px),
well before the body would be squeezed. The card overlapping is not a failure
state — it is translucent, sits over sky at the top-right, and the body is
centred.

Result: **worst-case zoom on toggling the card falls from 48.8% to 1.0%**, with
nothing clipped at any tested window size.

**The general rule:** *when a fix's clamp binds precisely in the cases the fix
was written for, the fix is in the wrong layer.* The clamp was right; it needed
the CSS to stop creating the situation.

---

### D66 · The first frame must not be measured against an unresolved canvas box

**Reported mid-session:** "When I boot up the app at first, the first planet I
see is squished into an oval. If I click randomize, the new planet is normal
again as a circle, but the first one is always weird."

A `<canvas>` has an **intrinsic size of 300×150** until CSS resolves its box.
`#stage` is `width:100%; height:100%` inside a flex container, so the first
`draw()` measured a 2:1 box, sized the backing store 2:1, and CSS then stretched
it to fill a ~3:2 preview. Every circle became an ellipse.

It looks like a rendering bug and is a **measurement** bug — no drawing code was
involved, which is why nothing in the render pipeline could have been at fault.

`fitToDisplay` now treats a rect that still matches the intrinsic default as
"layout has not happened yet" and uses the parent's box, which is a laid-out
block with real dimensions well before a percentage height resolves. The check
is deliberately narrow — exactly 300×150, not a range.

Plus a redraw on the second animation frame, which costs one render of cached
geometry and cannot re-roll anything.

**The general rule:** *a first-frame defect that corrects itself on any
subsequent redraw is almost always a measurement taken too early,* not a bug in
what was drawn.

---

### D67 · An async action reports twice, and the second report is the true one

**Reported:** "When doing the more subtle 'save to clipboard' based exports,
there's no GUI popup or other thing that clearly informs that the data was
actually saved to clipboard."

Two separate faults behind one symptom.

**The feedback was a 900ms border tint on the Export button** — a signal you
have to already be looking at the button to catch, and the clipboard exports are
precisely the ones where the user has dismissed the menu and is watching the
picture. Replaced with a toast at the bottom-centre of the preview (the one
region nothing else claims) that *names* the file and its pixel size, or the
reason it failed. `pointer-events: none`, so it can never eat a click meant for
the canvas.

**And the success was a lie.** `copyImage` returned `{ ok: true }`
*synchronously*, before the encode and `clipboard.write` promise had settled — so
a write **rejected for want of permission still flashed green**. The one export
whose result the user cannot see was also the one misreporting it.

Both clipboard paths now take an `onDone` callback and report twice: the
synchronous return says the write was *started* (and the toast says "Copying…"
in neutral ink), and the settled result replaces it. A pending toast is never
dismissed on a timer — if the promise never settles the toast stays, which is
honest.

Failures stay up 4.2s against 2.4s for successes: "Saved" is a glance, "the
browser refused clipboard access" is something to read and act on.

**The general rule:** *never report the outcome of an asynchronous action
synchronously.* The optimistic return is a claim about the future, and the one
place it is guaranteed wrong is exactly where the user cannot check.

---

### D68 · One framing choice and one background choice, not a menu multiplying them

**Requested:** remove `Export PNG · body only, transparent` in favour of
`Export PNG · 1:1, body only`, which keeps the chosen background.

The user's own reasoning, which is the right one: *"the 1:1 square can just be
more versatile [so] this export option isn't needed anymore."*

Transparency is still reachable — set Background to Transparent and export the
square. The menu item existed to multiply a framing decision by a background
decision, which is work the controls already do.

The domtest's `body-only export drops the background` check was replaced by
`the Output background reaches transparency`, which asserts the *capability*
survived its menu item rather than asserting the item exists. A removed feature
and a removed menu item are different things, and only one of them was intended.

---

### Also in this session

**The markdown factsheet carries a link.** `https://reactorcoregames.github.io/`
under the existing sign-off. The factsheet is the export that *travels* — a
handout dropped into someone else's campaign notes, where the file is the only
clue to where the world came from. The PNGs carry no watermark and are not going
to grow one.

**Framing & crop is specified, not built.** The D65 defect suggested a real
feature — deliberate pan/zoom close-ups with a dashed frame guide. Written up in
[ROADMAP.md](../ROADMAP.md) under Phase 8 with its constraints and three open
questions, rather than built half-considered alongside six defect fixes.

---

## What the tests now assert

| Check | Guards |
|---|---|
| `the Output background reaches transparency` | D68 — the capability outlived its menu item |
| `the composed export clamps a narrow aspect to 4:3` | D63, including that plain exports have *no* floor |
| `the card-only export scales with the resolution` | D64 — 2× resolution is 2× width, still portrait |
| `detail level changes the exported card height` | D64 — the level is not inert |
