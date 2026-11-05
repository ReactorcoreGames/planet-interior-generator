/* Layer names — what the overlay prints beside each band.
 *
 * KEYED BY ROLE, NOT BY ARCHETYPE, because most roles mean the same thing
 * wherever they appear: a photosphere is a photosphere on all four stars, and
 * a crust is a crust on the planet and the moon. One table keeps the shared
 * names shared.
 *
 * AN ARCHETYPE OVERRIDES WITH `name` ON THE LAYER SPEC when its version of a
 * role is a different thing to look at. js/gen/structure-resolve.js resolves the
 * name once — spec, then this table, then the role slug itself — so the
 * overlay only ever reads `layer.name` and no role reaches js/draw/.
 *
 * NAMES ONLY (PARAMETERS.md, Labels & Info). Sentence case, as short as the
 * thing allows: the label is a caption on a diagram, not a definition. The
 * card is where a layer gets explained. */

var CC = CC || {};

CC.LayerNames = (function () {
  "use strict";

  var NAMES = {
    /* solid */
    "atmosphere": "Atmosphere",
    "ocean": "Ocean",
    "ice-shell": "Ice shell",
    "crust": "Crust",
    "mantle": "Mantle",
    "outer-core": "Outer core",
    "core": "Core",
    "outer-shell": "Outer shell",
    "interior": "Interior",

    /* gaseous */
    "upper-cloud": "Upper clouds",
    "troposphere": "Troposphere",
    "water-cloud": "Water clouds",
    "molecular-h": "Molecular hydrogen",
    "metallic-h": "Metallic hydrogen",
    "icy-mantle": "Icy mantle",
    "superionic": "Superionic ice",
    "rock-core": "Rocky core",

    /* stellar */
    "corona": "Corona",
    "chromosphere": "Chromosphere",
    "photosphere": "Photosphere",
    "convective": "Convective zone",
    "tachocline": "Tachocline",
    "radiative": "Radiative zone",
    "convective-core": "Convective core",
    "fusion-core": "Fusion core",
    "shed-envelope": "Shed envelope",
    "h-shell": "Hydrogen-burning shell",
    "he-shell": "Helium-burning shell",
    "degenerate-core": "Degenerate core",

    /* compact */
    "magnetosphere": "Magnetosphere",
    "plasma-skin": "Plasma skin",
    "iron-lattice": "Iron crust",
    "nuclear-pasta": "Nuclear pasta",
    "superfluid": "Neutron superfluid",
    "quark-core": "Quark core",
    "photon-sphere": "Photon sphere",
    "infall": "Infall region",
    "cauchy-shell": "Cauchy horizon",
    "inner-region": "Inner region",

    /* diffuse */
    "halo": "Halo",
    "sparse-region": "Sparse region",
    "dense-region": "Dense region",
    "core-region": "Core region",
    "outer-shock": "Shock front",
    "cavity": "Cavity",
    "remnant-star": "Central star",

    /* machine */
    "defense-grid": "Defense grid",
    "outer-hull": "Outer hull",
    "surface-systems": "Surface systems",
    "habitation": "Habitation",
    "machinery": "Machinery",
    "computation": "Computation",
    "power-core": "Power core"
  };

  /* A role nobody named still gets a readable caption rather than a slug —
   * "rock-core" becomes "Rock core" — so a new family's overlay works before
   * its names are written. */
  function fallback(role) {
    var s = String(role || "").replace(/-/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function of(role) {
    return NAMES[role] || fallback(role);
  }

  return { of: of, table: NAMES };
})();
