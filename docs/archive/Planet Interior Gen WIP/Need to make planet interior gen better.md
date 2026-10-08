Need to make planet interior gen better.

- Have an optional hitech-style/hologram-style overlay thing with lines and text labels that point out the different parts/layers of a planet/star/gas giant, plus a legend for elements that arent a congruous single thing.
- Have extended stats that are more scientific, but layperson relevant. Mostly stuff like mass, gravity, diameter, temperature range, predominant weather - stuff that a scifi explorer starship looking to visit the planet would be interested in. Hmm, actually maybe some of these could be integrated into the above optional overlay things in some cool way, listed under the line at the different elements as points/nuggets of interests, so the presentation is more dynamic-like instead of a boring list.
- The existing strings for flavor text are good, but... I dunno, some of the feel a bit melancholy. I'd prefer more optimistic sort of star trek inspired mentality for them.
- For the random names of the planet, add the "alpha beta, kappa, gamma, xi..." alphabet thing as another occasional component that can appear in the name.
- No custom strings/quotes in description for planet (the last one) - they usually repeat too often and feel somewhat odd when they mentions existing settlers describing things that feel like its more of a local thing than a planetwide thing.
- Need an alternative selectable art style that uses gradients that make the resulting image easier to modify/customize with a filter to get a unique look for it by the author that uses the program, instead of being constrained by the current artsy style, especially with the 'boundary wobble' parameter, which is somewhat overstylized if the user wants a more "technical version" of the planet interior instance. - not sure how doable this is or how it would best be done. Maybe I'd need to fork the program into a new version entirely to make this happen, each separate version focusing on a specific art style and underlying system.
- The flare things on the sun are a bit of a mess. Needs heavy refinement to make their line widths wider, softer and fuzzier.
- Planets/stars/etc could use more features to make the interior more interesting somehow.
- Let user choose whether they want a transparent bg or a specific bg color.
- Have an ability to hue shift the existing palettes as an option.
- Needs tooltips, tooltips everywhere where its useful.
- Possible expansion to include these types too: pulsar, neutron star, nebula cloud - maybe some others too?

---


Write a markdown document that captures the condensed idea/scope of the project as you understood it. Not too detailed, just the major ideas and concepts.

I looked into the project folder and was surprised by how much it grew to roughly 55mb, which I think was a wrong turn. I'd rather keep the project lighter than letting it grow/bloat like that. I checkout the current state of it and its a bit of a mixed bag of good and bad:
- Semi-technical style is the best one - or atleast much closer to what I want, I think its a good base, but make it more intricately detailed, denser and richer - and I want to focus on that one only but refine it - the outer most physical layer should always be a perfect circle for most planets and gas giants, but the inner layers can be a mix of perfect circles or different varieties of wobble, depending on what makes sense per celestial element. I want to unify the appearance look to focus on one good style that works.
- The hologram looks a bit of a mess; the lines extend/originate from odd places of the text that makes the overall result look all spaghetti. I think originally I had the thought of having the hologram elements be an optional element that only mentions the layer name and nothing else.
- A "major highlights" system is... ehh not great. The phenomenon are too small and too localized. Others are just plain odd/meh like the random hexagon thing. In hologram the data mixes with the layers, while in sidebar it adds too much data. And even then I think 2 highlights would be enough.
- Ring system having its own line in the side panel feels wrong - it is particularly the type of thing that I would place under the "major highlights" system.
- I do like the new flares for stars, but I think we could have a whole lot more of them - anywhere from 3 to 30 - possibly in layers of lesser and greater ones. That same principle I want to apply to such dense detail elements for the renders to move them away from being artsy/sparse to something more intricate and complex looking, despite using simple tricks of layering things, cheap basic procedular generation elements but used more numerously.
- The technical stats - I like that they're tied to the generated planet, but they're not very layperson friendly. The purpose of the app is intended more towards a the idea of creating cool places to explore in a believable but not entirely realistic scifi games/anime/roleplaying games - but unlike a topdown map of a global area, its instead the interior of the planet/celestial object, showing its depth and composition - maybe for some kind of scifi plot points or exotic resource extraction or diving into the depth of a celestial to find some artifact or monster or hidden city or whatever else. The stats should tell the layperson a relatable measure of things, since stuff like this:
	MASS
	Ø.ØØ758 Solar
	PHOTOSPHERE
	3117 K
	ROTATION
	520 d
	SURFACE CONDITIONS
	3117 K photosphere
	RADIUS
	38.4 Solar
	DENSITY
	1.9e-4 kg/m3
	ESCAPE V
	8.67 km/s
	...Goes way over my head what any of it means. If its distance, then something like kilometers or such would be better. If its heat, then something in celsius. If its mass, something like millions of tons or what not. "Escape V" I don't even know even what that is, though the km/s is familiar - still, it would need a reword or swap to something else. Measurements that a regular casual person would be like "oh yeah I get that, even if its mind bogglingly big".
- The planets being generated are a bit meh - theres potential for tidally locked planets that are half cold and half hot at all times instead of something like earth or mars with their polar caps and such. The whole planetary/celestial generation system should be completely redesigned for this. I do want all the other celestial types we discussed like the different star types, nebula, asteroids, etc - all of them having the kind of flexible system to generate all kinds of places with all kinds of major global quirks that make sense for said celestial.
- more over I want more detailed elements for the different types and layers for celestials - like on stars there are convective and radiative zones/layers and I've seen cutaway illustrations that somewhat show the flow, shape and feel of those things visually - even if it means introducing more instructive visual elements like arrows or some other symbolism that visualizes an idea of how that layer behaves or what it has, like maybe veins or scattered deposits of something along the entire layer - that kind of thing.
- The color palette system is ultimately very limiting; we gotta liberate it fully so that the colors for the celestials can be truly varied. I think some celestials can have limited ranges of hue, or saturation, or contrast, or a combination of those that is more sensible for that type of celestial, but allowing any color to be picked within those ranges as the primary color and a secondary color (for example: green surface/atmo, yellow core, maybe even a tertiary color for the atmosphere), with the other layers sort of adapting to those 2-3 main colors and layers with the ranges of HueSatValue (HSV) that blend aesthetically well.
- The way the seas/bodies of liquid, icecaps and atmosphere are rendered needs a rethink that looks a bit better than the current odd solution.
- I do still love the old original basics of lockable randomization, the output options, the layout of "left side preview, right side settings panel", albeit currently the new GUI options caused the right side settings panel to extend downwards so much that I need to scroll down a lot just to reach the randomize/export buttons. I think the whole settings GUI could benefit from dropdown based tabs to better spread the different new settings that would be created by the overhaul. Those tabs are still allowed to scroll, but they wouldn't scroll the entire page but just the tab's contents only, meanwhile the Randomize and Export buttons would be moved to a permanent place on the GUI outside of the tabs so that they're always quickly accessible to instantly press, but the settings for either randomization or exporting would still exist inside the tabs.

I think we need to step back and go into planning phase (I rushed into this too fast, my bad) to refine the system massively to create the type of robust celestial interior generator I'm envisioning, probably in html/css/js, and not the heavyweight ES things nor node.js stuff, but we certainly can have many js files that split the code among them so its sensible to work with - just no heavy frameworks in favor of using simpler solutions. Besides the "your take on the project" markdown doc I ask at the start of the doc, also make another new markdown document that lays out the ideas, designs, questions and concepts for how to make this thing work.

I will later look at both documents and try to figure out a design that could work. If you think theres a third doc that would help me with this (just a random idea, I don't even know what that doc would be - maybe a template or something else), that would be cool too.

I think I will create a more robust plan and then use it as basis to create the new version from scratch rather than try to rework the existing one. I do also want to hear your thoughts on the above direction and overhaul idea.