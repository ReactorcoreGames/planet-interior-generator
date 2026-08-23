/* Derived physical statistics.
 *
 * Numbers are computed from the *drawn geometry* rather than rolled blind:
 * the core fraction, the layer stack, and the body type feed a coarse
 * two-shell density model. A visibly large iron core therefore yields a
 * denser, higher-gravity world, and the readout always agrees with the
 * picture. Accuracy is "plausible to a science-literate reader", not
 * publication-grade astrophysics. */

import { clamp, lerp, pick, rrange, sig } from "../core/math.js";

/* Reference constants in SI-ish units, scaled to Earth = 1 where useful. */
const EARTH_RADIUS_KM = 6371;
const EARTH_MASS_KG = 5.972e24;
const EARTH_DENSITY = 5514;   // kg/m^3
const JUPITER_RADIUS_KM = 69911;
const SOLAR_RADIUS_KM = 696340;

/* Per-type physical envelopes.
 *
 * Mass is not integrated from raw material densities: doing that naively
 * gives absurd results for stars, whose interiors span nine orders of
 * magnitude in density between the core and the photosphere. Instead each
 * type is anchored to a real reference body and the *bulk* density is
 * modulated around a realistic mean by how much of the body is core. That
 * keeps the numbers recognizable (an Earth-sized rocky world lands near 1 g)
 * while preserving the property that matters: a visibly larger core yields a
 * denser, heavier, higher-gravity body.
 *
 *   densityRange  bulk density in kg/m^3 at coreFrac = min .. max observed
 *   radiusKm      plausible radius span for the type
 */
const TYPE_PHYSICS = {
  rocky: {
    radiusKm: [2400, 9800],
    densityRange: [3100, 9200],   // Mars-like .. iron-rich super-Mercury
    tempK: [180, 340],
    kind: "planet"
  },
  gas: {
    radiusKm: [45000, 92000],
    densityRange: [520, 2400],    // Saturn-like .. dense hot Jupiter
    tempK: [90, 210],
    kind: "planet"
  },
  youngstar: {
    radiusKm: [420000, 1150000],
    densityRange: [360, 3600],    // bulk solar density is ~1410 kg/m^3
    tempK: [4200, 9600],          // photosphere
    kind: "star"
  },
  oldstar: {
    // A red giant is enormous and almost entirely empty: Arcturus has ~1 solar
    // mass spread over 25 solar radii, giving a bulk density far below air and
    // a surface gravity of roughly 0.002 g.
    radiusKm: [8000000, 42000000],
    densityRange: [1e-5, 9e-4],
    tempK: [2900, 4600],
    kind: "star"
  }
};

/* Where a body's core fraction sits within the range its type can produce.
 * Normalizing against the type's own achievable span is what makes the
 * core-size → density relationship legible instead of being swamped by the
 * independently-varying radius. */
const CORE_FRAC_SPAN = {
  rocky: [0.16, 0.26],
  gas: [0.12, 0.20],
  youngstar: [0.22, 0.34],
  oldstar: [0.08, 0.14]
};

/* Sanity anchors, asserted by the test sweep so the model can't silently
 * drift into nonsense as types are added:
 *   rocky      0.3 – 2.5 g     (Mars .. dense super-Earth)
 *   gas        0.9 – 6 g       (Saturn .. massive Jupiter)
 *   youngstar  8   – 90 g      (solar surface gravity is ~28 g; low-mass
 *                               main-sequence stars run lower still)
 *   oldstar    5e-6 – 0.05 g   (giant envelopes are barely gravitationally
 *                               bound; evolved AGB stars reach ~1e-5 g)
 */
export const GRAVITY_BOUNDS = {
  rocky: [0.3, 2.5],
  gas: [0.9, 6],
  youngstar: [8, 90],
  oldstar: [5e-6, 0.05]
};

/* Weather/atmosphere descriptors, chosen by computed temperature and by
 * whether the profile actually drew an atmosphere. */
const WEATHER = {
  cold: [
    "Persistent methane frost; still air broken by slow katabatic drainage.",
    "Dry, thin, and cold. Ice fog pools in the basins at night.",
    "Nitrogen snow falls in fine, unhurried flakes across the dark side."
  ],
  temperate: [
    "Banded weather cells with reliable seasonal rains. Landfall is routine.",
    "Mild and cyclonic; storm tracks run predictably along the terminator.",
    "Open skies, moderate winds, and a workable window most of the year."
  ],
  hot: [
    "Dense, hot, and slow-moving. Surface haze cuts visibility to a few km.",
    "Convective towers build daily; the lowlands run to superheated steam.",
    "Scouring dust seasons alternate with clear, punishing sunlight."
  ],
  airless: [
    "No atmosphere. Surface conditions are set entirely by insolation.",
    "Vacuum at the surface; thermal swing between day and night is extreme.",
    "Trace exosphere only — sputtered ions, nothing that could be called weather."
  ],
  gasgiant: [
    "Counter-rotating jets at every latitude; wind shear between bands is severe.",
    "Permanent storm systems, some older than the surveys that named them.",
    "Ammonia cirrus over deep convective cloud decks. No surface to reach."
  ],
  stellar: [
    "Photospheric granulation with an active, well-mapped magnetic cycle.",
    "Steady output with periodic flare activity along the active latitudes.",
    "Strong stellar wind; the heliopause sits far out and holds its shape."
  ]
};

const MAGNETO = [
  "Strong dipole; a broad, stable magnetosphere.",
  "Moderate field, offset from the rotational axis.",
  "Weak and irregular — patchy crustal remanence only.",
  "Vigorous field with a pronounced auroral oval."
];

/* Unit suffixes use ASCII words rather than the astronomical symbols
 * (M⊕, M♃, M☉). Those glyphs are missing from the common UI font stacks on
 * Windows and render as tofu boxes in the exported PNG, where there is no
 * font fallback to rescue them. */
function formatMass(earthMasses, kind) {
  if (kind === "star") {
    const solar = earthMasses / 332946;
    return `${sig(solar, 3)} Solar`;
  }
  if (earthMasses >= 40) return `${sig(earthMasses / 317.8, 3)} Jupiter`;
  return `${sig(earthMasses, 3)} Earth`;
}

function formatRadius(km, kind) {
  if (kind === "star") return `${sig(km / SOLAR_RADIUS_KM, 3)} Solar`;
  if (km >= 30000) return `${sig(km / JUPITER_RADIUS_KM, 3)} Jupiter`;
  return `${sig(km / EARTH_RADIUS_KM, 3)} Earth`;
}

function formatK(k) {
  return `${Math.round(k)} K`;
}

/* Gravity spans from a red giant's ~0.002 g to a young star's ~30 g, so a
 * fixed decimal count would print "0.00 g" at one end. */
function formatGravity(g) {
  if (g < 0.01) return `${g.toExponential(1)} g`;
  if (g < 1) return `${sig(g, 2)} g`;
  return `${sig(g, 3)} g`;
}

/* Bulk density likewise ranges over nine orders of magnitude across types. */
function formatDensity(d) {
  if (d < 0.01) return `${d.toExponential(1)} kg/m³`;
  if (d < 10) return `${sig(d, 2)} kg/m³`;
  return `${Math.round(d).toLocaleString("en-US")} kg/m³`;
}

function celsius(k) {
  return Math.round(k - 273.15);
}

/* Rotation period, chosen per type with a plausible spread. */
function rotationPeriod(type, rng) {
  if (type === "gas") return `${sig(rrange(rng, 8, 19), 2)} h`;
  if (type === "rocky") {
    const h = rrange(rng, 14, 96);
    return h > 48 ? `${sig(h / 24, 2)} d` : `${sig(h, 2)} h`;
  }
  if (type === "youngstar") return `${sig(rrange(rng, 3, 22), 2)} d`;
  return `${sig(rrange(rng, 60, 900), 2)} d`;
}

/* Main entry: compute the full stat block for a built profile. */
export function computeStats(type, profile, rng) {
  const phys = TYPE_PHYSICS[type] || TYPE_PHYSICS.rocky;
  const layers = profile.layers;

  // The core's outer radius as a fraction of the body radius — recorded by
  // the profile builder, and the same value the renderer draws to.
  const coreFrac = clamp(
    profile.coreRadius != null ? profile.coreRadius : layers[layers.length - 1].frac,
    0.02, 0.95);

  // Position the core within the span this type can actually produce, then
  // map that onto the type's bulk-density range. Bigger drawn core, denser
  // body — the relationship the readout is supposed to express.
  const span = CORE_FRAC_SPAN[type] || CORE_FRAC_SPAN.rocky;
  const coreT = clamp((coreFrac - span[0]) / (span[1] - span[0]), 0, 1);
  const meanDensity = lerp(phys.densityRange[0], phys.densityRange[1], coreT);

  // Radius: bigger when there are more strata (a richer, more differentiated
  // body reads as larger), jittered by seed.
  //
  // Because g = (4/3)πGρr is linear in BOTH density and radius, letting the
  // radius roam over its full range would swamp the density signal entirely
  // and the core-size relationship would be invisible in the final number.
  // Radius variation is therefore damped, leaving core size as the dominant
  // term in surface gravity — which is the point of deriving stats from the
  // drawing in the first place.
  const strataT = clamp((layers.length - 3) / 5, 0, 1);
  const radiusT = clamp(strataT * 0.45 + rng() * 0.55, 0, 1);
  const radiusSpread = 0.42; // fraction of the full radius range actually used
  const radiusKm = lerp(phys.radiusKm[0], phys.radiusKm[1],
    0.5 + (radiusT - 0.5) * radiusSpread);

  const radiusM = radiusKm * 1000;
  const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const massKg = meanDensity * volume;
  const earthMasses = massKg / EARTH_MASS_KG;

  // Surface gravity g = GM/r^2, expressed in Earth g.
  const G = 6.674e-11;
  const gravity = (G * massKg) / (radiusM * radiusM) / 9.80665;

  // Escape velocity, km/s.
  const escape = Math.sqrt((2 * G * massKg) / radiusM) / 1000;

  // Temperature band. Stars report photosphere; planets report surface range.
  const tMid = lerp(phys.tempK[0], phys.tempK[1], rng());
  const swing = phys.kind === "star"
    ? tMid * 0.04
    : (profile.effects.haze ? tMid * 0.16 : tMid * 0.55); // no air = wild swing
  const tLo = tMid - swing, tHi = tMid + swing;

  // Weather bucket.
  let weatherKey;
  if (type === "gas") weatherKey = "gasgiant";
  else if (phys.kind === "star") weatherKey = "stellar";
  else if (!profile.effects.haze) weatherKey = "airless";
  else if (tMid < 240) weatherKey = "cold";
  else if (tMid > 300) weatherKey = "hot";
  else weatherKey = "temperate";

  const hasAir = weatherKey !== "airless" && phys.kind !== "star";
  const pressureBar = hasAir
    ? (type === "gas" ? null : sig(rrange(rng, 0.15, 4.2), 2))
    : 0;

  // Computed once — the panel and the overlay must report the same value.
  const rotation = rotationPeriod(type, rng);

  return {
    kind: phys.kind,
    coreFrac,
    meanDensity,
    radiusKm,
    massEarth: earthMasses,
    gravity,
    escape,
    tempMid: tMid,
    tempLo: tLo,
    tempHi: tHi,
    weatherKey,
    weather: pick(rng, WEATHER[weatherKey]),
    magnetosphere: pick(rng, MAGNETO),
    pressureBar,
    rotation,

    /* Display-ready rows, used by both the side panel and the overlay. */
    display: {
      mass: formatMass(earthMasses, phys.kind),
      radius: formatRadius(radiusKm, phys.kind),
      diameterKm: `${Math.round(radiusKm * 2).toLocaleString("en-US")} km`,
      gravity: formatGravity(gravity),
      density: formatDensity(meanDensity),
      escape: `${sig(escape, 3)} km/s`,
      temp: phys.kind === "star"
        ? `${formatK(tMid)} photosphere`
        : `${formatK(tLo)} – ${formatK(tHi)}  (${celsius(tLo)} – ${celsius(tHi)} °C)`,
      pressure: pressureBar === null ? "no defined surface"
        : pressureBar === 0 ? "vacuum"
        : `${pressureBar} bar`,
      rotation
    }
  };
}

/* Short, overlay-sized nuggets: 2–4 word fragments for callout lines. */
export function statNuggets(stats, type) {
  const d = stats.display;
  const out = [];
  if (stats.kind === "star") {
    out.push(d.mass, d.radius, d.temp, d.density);
  } else {
    out.push(d.gravity, d.mass, d.diameterKm, d.temp, d.pressure, d.escape);
  }
  return out.filter(Boolean);
}
