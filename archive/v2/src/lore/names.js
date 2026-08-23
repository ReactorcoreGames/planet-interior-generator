/* Procedural body names.
 *
 * A name is assembled from up to four slots:
 *   [greek?] [stem][tail][tail?] [suffix?] [designation?]
 * The Greek-letter slot mimics real star-catalog convention (Alpha Centauri,
 * Epsilon Eridani) and appears occasionally rather than always, so it stays
 * a flavor note instead of a formula. */

import { pick } from "../core/math.js";

export const GREEK = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];

export const NAME_PARTS = {
  a: ["Ka", "Ver", "Tho", "Ael", "Bra", "Cin", "Dro", "Ery", "Fen", "Gal", "Hal",
      "Ish", "Jor", "Kel", "Lum", "Mor", "Nyx", "Or", "Phy", "Qua", "Rha", "Sol",
      "Tyr", "Umb", "Vex", "Wyn", "Xan", "Yra", "Zeph"],
  b: ["ra", "lo", "mi", "dun", "vek", "sha", "ri", "gol", "na", "thi", "bor",
      "el", "us", "ax", "ien", "or", "eth", "ath", "yn", "ossa"],
  c: ["", "", "", " Prime", " Minor", " Deep", "-9", " III", " VII",
      " of the Verge", " Reach"]
};

/* Catalog-style designations, e.g. "KX-2291". Occasional, never with a suffix. */
function catalogTag(rng) {
  const letters = "ABCDEFGHJKLMNPRSTVXZ";
  const l1 = letters[Math.floor(rng() * letters.length)];
  const l2 = letters[Math.floor(rng() * letters.length)];
  const num = 100 + Math.floor(rng() * 9900);
  return ` ${l1}${l2}-${num}`;
}

export function makeName(rng) {
  const stem = pick(rng, NAME_PARTS.a) + pick(rng, NAME_PARTS.b) +
    (rng() < 0.5 ? pick(rng, NAME_PARTS.b) : "");

  const roll = rng();
  let prefix = "";
  let tail = "";

  if (roll < 0.26) {
    // Greek-lettered: "Kappa Verossa". Suffix stays rare here to avoid
    // over-long names like "Kappa Verossa of the Verge".
    prefix = pick(rng, GREEK) + " ";
    tail = rng() < 0.2 ? pick(rng, NAME_PARTS.c) : "";
  } else if (roll < 0.34) {
    // Catalog designation: "Verossa KX-2291".
    tail = catalogTag(rng);
  } else {
    tail = pick(rng, NAME_PARTS.c);
  }

  return prefix + stem + tail;
}
