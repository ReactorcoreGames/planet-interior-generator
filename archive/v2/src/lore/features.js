/* Notable features — the thing that turns a diagram into a *place*.
 *
 * Every body draws 1–3 COMMON features. Roughly one in ten also draws a
 * single RARE feature: a genuine anomaly worth routing a ship to see.
 *
 * Each feature carries:
 *   name    display name, often uniquified with the body name
 *   note    one line a survey officer would actually write
 *   zone    "surface" | "interior" | "orbit"  — where it sits radially
 *   draw    optional marker hint the renderer can act on
 *   tier    "common" | "rare"
 *
 * Placement (radius fraction + angle) is assigned at build time so the
 * overlay can run a leader line to the exact spot that was drawn. */

import { TAU, pick, pickN, rrange, clamp } from "../core/math.js";

/* ---------------- Common pools, per body type ---------------- */

const COMMON = {
  rocky: [
    { name: "Meridian Rift", zone: "surface", draw: "gash",
      note: "A continent-spanning tectonic trench. Sheltered, and warm at depth." },
    { name: "The Shield Highlands", zone: "surface", draw: "patch",
      note: "Ancient stable craton — the safest ground on the planet for a base." },
    { name: "Ashfall Belt", zone: "surface", draw: "band",
      note: "A ring of young volcanoes. Rich in metals, hard on filtration systems." },
    { name: "Iron Spike", zone: "interior", draw: "spike",
      note: "A dense intrusion reaching unusually far toward the crust." },
    { name: "Basalt Shelf", zone: "surface", draw: "patch",
      note: "Flat, level flood-basalt plain. An excellent natural landing field." },
    { name: "The Warm Shallows", zone: "surface", draw: "arc", needs: "ocean",
      note: "Geothermally heated sea. Liquid year-round; likely biologically active." },
    { name: "Crustal Bloom", zone: "surface", draw: "speck",
      note: "Mineral formations that regrow after harvest on a decadal cycle." },
    { name: "The Deep Vaults", zone: "interior", draw: "pocket",
      note: "Natural sealed caverns beneath the crust. Stable, dry, and enormous." }
  ],
  gas: [
    { name: "The Great Eye", zone: "surface", draw: "storm",
      note: "A persistent anticyclone wider than most terrestrial worlds." },
    { name: "Calm Latitude", zone: "surface", draw: "band",
      note: "A rare quiet band. Standard aerostat operations are viable here." },
    { name: "The Diamond Layer", zone: "interior", draw: "sparkle",
      note: "Carbon precipitates into crystal at this depth and falls as rain." },
    { name: "Lightning Chorus", zone: "interior", draw: "arc",
      note: "Continuous electrical activity across a whole cloud deck." },
    { name: "Helium Rain Zone", zone: "interior", draw: "band",
      note: "Helium droplets settle out here, heating the layers below." },
    { name: "The Shepherd Gap", zone: "orbit", draw: "gap", needs: "ring",
      note: "A swept-clean lane in the ring system. A natural, protected approach." },
    { name: "Metallic Ocean", zone: "interior", draw: "shine",
      note: "Hydrogen turned conductor. Source of the world's colossal magnetic field." },
    { name: "Polar Hexagon", zone: "surface", draw: "polygon",
      note: "A standing wave locked into a geometric pattern at the pole." }
  ],
  youngstar: [
    { name: "The Active Belt", zone: "surface", draw: "band",
      note: "Flare-prone latitudes. Beautiful, and worth a wide berth." },
    { name: "Granulation Field", zone: "surface", draw: "cells",
      note: "Convection cells the size of continents, resurfacing every few minutes." },
    { name: "Starspot Cluster", zone: "surface", draw: "spot",
      note: "Cool magnetic knots, dark only by comparison to everything around them." },
    { name: "The Tachocline", zone: "interior", draw: "shear",
      note: "The shear layer where the star's magnetic dynamo is generated." },
    { name: "Coronal Hole", zone: "orbit", draw: "gap", needs: "corona",
      note: "An open field line region venting fast solar wind." },
    { name: "Prominence Arch", zone: "orbit", draw: "arch", needs: "flares",
      note: "Suspended plasma bridging two active regions. Stable for weeks at a time." }
  ],
  oldstar: [
    { name: "The Shed Shell", zone: "orbit", draw: "shell",
      note: "An expanding envelope of cast-off material, rich in heavy elements." },
    { name: "Dredge-Up Zone", zone: "interior", draw: "shear",
      note: "Convection is hauling fusion products up from the deep interior." },
    { name: "The Quiet Core", zone: "interior", draw: "pocket",
      note: "Degenerate and dense — a compact heart under an enormous envelope." },
    { name: "Pulsation Front", zone: "surface", draw: "band",
      note: "The whole envelope breathes on a long, measurable period." },
    { name: "Dust Foundry", zone: "orbit", draw: "speck",
      note: "Carbon and silicate grains condensing in the outflow. A stellar factory." },
    { name: "Ember Latitude", zone: "surface", draw: "patch",
      note: "Cooler zones where the envelope has thinned enough to see deeper in." }
  ]
};

/* ---------------- Rare pool — shared, filtered by type ---------------- */

const RARE = [
  { name: "The Hollow", zone: "interior", draw: "cavity", types: ["rocky"],
    note: "A vast sealed void where a core should be. Pressure inside is survivable. Nobody has explained it." },
  { name: "The Lattice", zone: "interior", draw: "lattice", types: ["rocky", "gas"],
    note: "Interior structure arranged in a regular geometric pattern. Almost certainly natural. Almost." },
  { name: "Shattered Hemisphere", zone: "surface", draw: "shatter", types: ["rocky"],
    note: "Half the crust is missing. The exposed mantle has cooled into a glass plain 4,000 km across." },
  { name: "The Derelict Belt", zone: "orbit", draw: "derelicts", types: ["rocky", "gas"],
    note: "Hundreds of hulls in stable orbit, none of them from any registered civilization." },
  { name: "The Second Core", zone: "interior", draw: "twincore", types: ["rocky", "gas"],
    note: "Two distinct cores orbiting a common center inside the mantle. A merger that never finished." },
  { name: "Storm Cathedral", zone: "surface", draw: "megastorm", types: ["gas"],
    note: "A storm system with a clear, still column running from cloud-top to the metallic layer." },
  { name: "The Green Flash", zone: "orbit", draw: "aurora", types: ["gas", "rocky"], needs: "haze",
    note: "Auroral emission in a spectral line that this atmosphere should not produce." },
  { name: "Companion Ember", zone: "orbit", draw: "companion", types: ["youngstar", "oldstar"],
    note: "A dim stellar companion buried in the envelope, still orbiting after all this time." },
  { name: "The Slow Pulse", zone: "interior", draw: "pulse", types: ["youngstar", "oldstar"],
    note: "A luminosity oscillation with a period of exactly 47 hours. Exactly. Every cycle." },
  { name: "Ribbon Prominence", zone: "orbit", draw: "ribbon", types: ["youngstar"], needs: "flares",
    note: "A plasma structure that has held the same shape for eleven years of observation." },
  { name: "The Ash Garden", zone: "orbit", draw: "garden", types: ["oldstar"],
    note: "Condensing dust has formed sheets that catch the light like stained glass." }
];

/* Radial zone → radius fraction range for marker placement. */
const ZONE_R = {
  interior: [0.18, 0.6],
  surface: [0.82, 0.99],
  orbit: [1.06, 1.4]
};

function place(rng, zone) {
  const [lo, hi] = ZONE_R[zone] || ZONE_R.surface;
  return {
    r: rrange(rng, lo, hi),
    angle: rng() * TAU
  };
}

/* Some features read better with the body's own name attached. */
function personalize(name, bodyName, rng) {
  if (rng() < 0.35) {
    const short = String(bodyName).split(/[\s-]/)[0];
    if (name.startsWith("The ")) return `${short} ${name.slice(4)}`;
    return `${short} ${name}`;
  }
  return name;
}

/* A feature that describes something the illustration didn't draw would be a
 * visible contradiction — "Warm Shallows" on a world with no ocean, a
 * "Shepherd Gap" with no ring. Prerequisites are checked against the profile's
 * actual effects. */
function available(f, profile) {
  if (!f.needs) return true;
  const fx = profile ? profile.effects : null;
  if (!fx) return false;
  switch (f.needs) {
    case "ocean": return !!fx.oceanArc;
    case "ring": return !!fx.ring;
    case "haze": return !!fx.haze;
    case "corona": return !!fx.corona;
    case "flares": return !!fx.flares;
    default: return true;
  }
}

/* Build the feature list for one body. */
export function generateFeatures(type, rng, bodyName, profile) {
  const pool = (COMMON[type] || COMMON.rocky).filter(f => available(f, profile));
  const count = 1 + Math.floor(rng() * 3); // 1..3
  const chosen = pickN(rng, pool, count).map(f => ({
    ...f,
    tier: "common",
    name: personalize(f.name, bodyName, rng),
    ...place(rng, f.zone)
  }));

  // ~10% chance of one rare showstopper.
  if (rng() < 0.10) {
    const eligible = RARE.filter(f => f.types.includes(type) && available(f, profile));
    if (eligible.length) {
      const r = pick(rng, eligible);
      chosen.push({
        ...r,
        tier: "rare",
        name: r.name,
        ...place(rng, r.zone)
      });
    }
  }

  // Orbit features can't exist beyond what the render actually reaches;
  // clamp them inside the profile's extent so callouts stay on-canvas.
  const maxR = Math.max(1.02, (profile && profile.extent) || 1.2);
  for (const f of chosen) {
    if (f.zone === "orbit") f.r = clamp(f.r, 1.04, maxR * 0.96);
  }

  return chosen;
}

export { COMMON as COMMON_FEATURES, RARE as RARE_FEATURES };
