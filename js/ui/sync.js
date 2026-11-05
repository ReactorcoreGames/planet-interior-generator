/* The setup syncs — interface state that follows a control, and touches no
 * pipeline: the section toggle's label, the rotation slider's enabled state,
 * and what the background section greys out.
 *
 * Split out of js/main.js, which passed the 500-line rule. Must load before
 * js/main.js. */

var CC = CC || {};

CC.Sync = (function () {
  "use strict";

    /* THE SECTION TOGGLE ALTERNATES; IT DOES NOT REFLECT.
   *
   * The label is a statement about what the next press will do, which stays
   * true no matter what the user has done to individual sections by hand — the
   * alternative, describing the accordion's current state, has no honest
   * answer once the panel is half-open. See js/ui/accordion.js.
   *
   * The one exception is the initial label, which the accordion derives from
   * the RESTORED layout: on load there has been no click to alternate from, so
   * a panel that reopened with sections showing must offer Collapse and a
   * panel that reopened shut must offer Expand. */
  function setupSectionToggle() {
    var btn = document.getElementById("sections-btn");
    var label = document.getElementById("sections-label");
    if (!btn) return;

    function syncLabel() {
      if (!label) return;
      var next = CC.Accordion.pendingMode();
      label.textContent = (next === CC.Accordion.EXPAND) ? "Expand" : "Collapse";
      btn.title = (next === CC.Accordion.EXPAND)
        ? "Open every settings section."
        : "Close every settings section.";
    }

    btn.addEventListener("click", function () {
      CC.Accordion.cycle();
      syncLabel();
    });

    syncLabel();
  }

    function syncRotationEnabled() {
    CC.Controls.setEnabled("rotation", !CC.Controls.get("keep-upright"));
  }

    /* WHAT IS GREYED OUT IS ONLY WHAT THE STACK CANNOT USE. Transparent is the
   * one field that ignores the colours entirely, because it paints nothing.
   * Every other field reads colour 1, and gradient and nebula both read
   * colour 2 — so the second picker stays live for both rather than being a
   * gradient-only control that a nebula happens to borrow.
   *
   * Under Transparent the star controls go too: a starfield on alpha zero is
   * not a cutout, and drawBackground refuses to draw one, so an enabled
   * checkbox there would be a control that does nothing. */
  function syncBackgroundColour(canvas) {
    var mode = CC.Controls.get("background");
    var paints = mode !== "transparent";

    /* The checkerboard lives in CSS behind the canvas, so Transparent looks
     * transparent instead of looking black. Nothing is drawn into the render
     * for it — see style.css #stage.transparent-bg. */
    if (canvas) canvas.classList.toggle("transparent-bg", !paints);
    CC.Controls.setEnabled("background-color", paints);
    CC.Controls.setEnabled("background-color2", mode === "gradient" || mode === "nebula");
    CC.Controls.setEnabled("background-angle", mode === "gradient");
    CC.Controls.setEnabled("nebula-scale", mode === "nebula");
    CC.Controls.setEnabled("stars", paints);
    CC.Controls.setEnabled("star-density", paints && !!CC.Controls.get("stars"));
  }

  return {
    setupSectionToggle: setupSectionToggle,
    syncRotationEnabled: syncRotationEnabled,
    syncBackgroundColour: syncBackgroundColour
  };
})();
