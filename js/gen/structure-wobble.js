/* Boundary wobble: the vocabulary of characters, and the wobble a layer sets
 * as a proportion of its own thickness.
 *
 * Split out of gen/structure.js, which passed the 500-line rule. Attached to
 * CC.Structure; gen/structure.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;

  /* How much wobble each boundary character means, as a fraction of body
   * radius. Multiplied by the Boundary irregularity control. */
  var WOBBLE = {
    "perfect":       0.000,
    "near-perfect":  0.004,
    "slight":        0.010,
    "irregular":     0.028,
    "heavy":         0.065,
    "extreme":       0.140,
    "soft-gradient": 0.000
  };

  /* ---- WOBBLE MEASURED AGAINST THE LAYER'S OWN THICKNESS -------------
   *
   * `WOBBLE` above is a fraction of the BODY radius, which is the right
   * unit for a mantle or a crust: those are statements about how uneven a
   * planet is. It is the wrong unit for a fringe. A chromosphere is a few
   * percent of the radius thick, so a body-radius wobble either does
   * nothing to it or swallows it whole, and there is no setting in between.
   *
   * `wobbleRel: { base, peak, driver }` says the other thing: this
   * boundary is wavy by a proportion OF ITSELF. 0.10 at the calm end, 0.50
   * at the violent end — half the layer's own thickness — which is the
   * user's calibration taken directly. Because it is a proportion, a wide
   * layer wobbles further in absolute terms than a narrow one from the same
   * figure, and that is wanted: a corona's edge should heave where a
   * chromosphere's ripples.
   *
   * `driver` names the parameter that moves it between `base` and `peak`.
   * On a star that is `starActivity` — one axis, more consumers (D27), not
   * a second violence dial.
   *
   * RESOLVED HERE, AFTER RENORMALIZATION, because thickness is not known
   * until then and this is a proportion OF thickness. Computing it earlier
   * would calibrate it against a number that is about to move (D75/D119).
   * It REPLACES the character's body-radius figure rather than adding to
   * it, so a layer declares one or the other and never both silently. */
  function relativeWobble(st) {
    var layers = st.layers, params = st.params, irregularity = st.irregularity;
    var i;
    for (i = 0; i < layers.length; i++) {
      var wr = layers[i].wobbleRel;
      if (!wr) continue;
      var base = wr.base === undefined ? 0.10 : wr.base;
      var peakW = wr.peak === undefined ? 0.50 : wr.peak;
      var dv = wr.driver === undefined ? 1 : params[wr.driver];
      if (dv === undefined) dv = 1;
      var frac = lerp(base, peakW, clamp(dv, 0, 1));
      /* Still scaled by Boundary irregularity, which is the user's global
       * "how ragged is everything" control and must keep meaning that. */
      layers[i].wobble = frac * layers[i].thickness * irregularity;
      layers[i].wobbleFrac = frac;
    }
  }

  CC.Structure.WOBBLE = WOBBLE;
  CC.Structure.relativeWobble = relativeWobble;
})();
