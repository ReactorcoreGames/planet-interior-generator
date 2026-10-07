Lets do a brainstorm session without coding anything. We had just built the first iteration of the Asteroid celestial type and I see potential in it, I like the voronois it makes, but currently it has numerous issues.

- Too circle like. Overall silhouette should be more of an irregular blob/amoeba shape than the current circle that merely has extreme terrain. The current terrain system tried to create this, but its not the right mechanism to rely on here - the actual outer shell layer has to be irregular/blob like dramatically and the terrain system - if it'll be even used here - would mostly create some cosmetic terrain on said blob's surface.
- Part of me wonders if a single layer for the shell is sufficient or should there be another layer at the core or near the surface, like a "hard layer" and a "soft layer", either for realism or for aesthetics?
- Frosting/deposition doesn't look good on this, should be cut from asteroids, your initial instinct was right about this one and after I saw it for myself I agree with it now.
- The voronoi interior is too shiny due to the gradients that cells have. Remove the shading of the voronoi cells and implement a noise texture (monochrome gaussian, 30%, maybe even mixed with perlin noise texture too to make the cells look rocky.)
- While asteroids do not have a concept of internal heat, I think we can give a new more fitting system of radioactivity that determines how radioactive the inside materials are.
- Traits wise, I saw you added surface mining stations, I think those should be a square shape object instead of the capsule thing. That said, the capsules do give me the idea of tunnel boring machines, so perhaps a new trait based on those that use a cylinder with two spiky triangles on one end and a tunnel trail behind the cylinder as the tunnel borer dives into the interior of the asteroid could be a cool viable new trait.
- Hollowed out trait is totally busted; just some random wedges extending from the center that paint over the voronoi. Needs a total rethink.
- Traits or even details/structure wise, I wonder if the interior space of the asteroid could be more interesting with a mix of support walls, tunnels/chambers and voronoi cells being sort of the "region" where the former two occur to create a more interesting interior - even with optional exits that reach even outside into space.


Some trait feedback:

- Hollowed Out: Currently its just a wedge or two at the center, really ugly and out of place. In place of it, the tunnels/chambers and support walls/interior terrain would be the way to a way to depict interior tunnels or cavities inside the asteroid, essentially retiring this trait entirely.

INTERIOR
- Mineral Veins: remove entirely, in an asteroid some voronoi cells are the mineral deposits or atleast rocks that contain them partially - and even then they're supposed to be depicted thought texture of the voronoi cell or subdividing it somehow.
- Ore Deposits: I like how it looks on the shell layer, but perhaps it could be something else than what its called right now. Currently they appear as bright spots on the shell layer that give it a pretty texture that can be optionally turned on/off.
- Void Pockets: They don't even appear right now, but the idea behind the trait could be added to the new structure as additional void pockets inside the voronoi field that may by sheer chance line up with the interior tunnels of an asteroid.
- Magma Chambers: Same as above, not visible, could be part of the new interior as a trait based addon, but umm... magma in an asteroid? Is that a real thing?
- Metal-Rich & Ice-Rich: generally these are meant to be determined by the base asteroid itself if its rich or poor and the color/hue/texture would determine if its more metal or water based in its contents so I'm not sure whats the use or application of these traits. They also don't seem to be visible anyway at the moment unless I missed them.

DAMAGE
- Heavily Cratered
- Impact Basin
- Shattered

Common to all above traits is that none of them are visible at the moment and probably their mechanism and idea should be rethought entirely for the asteroid type. Currently I don't see/feel the "brittleness" factor of an asteroid as I flip through them, so part of this damage should be baked into the base asteroid generation in how brittle it is. I don't know how or what to do to show it, maybe porousness, maybe crack marks, maybe the texture on the shell or the vonoroi cells... like with the rest of it, the whole asteroid celestial needs a total rethink of how to generate it. Heavily crated and impact basin could be shell damage related addons, but the shell itself should also be able to depict and handle levels of damage or brittleness itself too.

Feel free to share ideas, push back, give recommendations. I'm willing to overhaul the asteroid generation inside out to make it much better if needed.