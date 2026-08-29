/* Control binding, value readout, and the lock system.
 *
 * Every control declares itself in the DOM and is bound here by id. A control
 * may carry a lock toggle; locked controls are skipped by Randomize. That is a
 * v1 feature and one of the tool's highlights — it is what makes "keep this
 * palette but re-roll everything else" work, so it is built in from the start
 * rather than retrofitted.
 *
 * Controls report changes through one callback with a `stage` tag, so the
 * caller can recompute only what actually changed:
 *
 *   "colour"    -> redraw cached geometry
 *   "detail"    -> re-run the detail stage
 *   "structure" -> re-run everything
 *   "output"    -> reframe only
 *
 * (Phase 0/1 recompute everything regardless; the tags are recorded now so the
 * caching in ARCHITECTURE.md has somewhere to attach later.) */

var CC = CC || {};

CC.Controls = (function () {
  "use strict";

  var bound = {};      /* id -> descriptor */
  var onChange = null;
  var suppress = false;

  function $(id) { return document.getElementById(id); }

  /* --- binding ------------------------------------------------------- */

  /* spec: { id, stage, format, lockable }
   * `format` turns the raw value into the text shown in the row's readout. */
  function bind(spec) {
    var el = $(spec.id);
    if (!el) return null;

    var desc = {
      id: spec.id,
      el: el,
      stage: spec.stage || "structure",
      format: spec.format || null,
      lock: $("lock-" + spec.id) || null,
      readout: document.querySelector('[data-readout="' + spec.id + '"]')
    };
    bound[spec.id] = desc;

    var evt = (el.tagName === "SELECT" || el.type === "checkbox" ||
               el.type === "radio" || el.type === "color") ? "change" : "input";

    el.addEventListener(evt, function () {
      updateReadout(desc);
      if (!suppress && onChange) onChange(spec.id, valueOf(desc), desc.stage);
    });

    if (desc.lock) {
      desc.lock.addEventListener("change", function () {
        var row = desc.lock.closest(".control-row");
        if (row) row.classList.toggle("locked", desc.lock.checked);
      });
    }

    updateReadout(desc);
    return desc;
  }

  function bindAll(specs) {
    specs.forEach(bind);
  }

  function valueOf(desc) {
    var el = desc.el;
    if (el.type === "checkbox") return el.checked;
    if (el.type === "range" || el.type === "number") return parseFloat(el.value);
    return el.value;
  }

  function updateReadout(desc) {
    if (!desc.readout) return;
    var v = valueOf(desc);
    desc.readout.textContent = desc.format ? desc.format(v) : String(v);
  }

  /* --- reading and writing ------------------------------------------- */

  function get(id) {
    var d = bound[id];
    return d ? valueOf(d) : undefined;
  }

  /* RETIRED VALUES, TRANSLATED ON THE WAY IN.
   *
   * Setting a <select> to an option it no longer has leaves it BLANK rather
   * than erroring, so a stale saved value would silently produce an empty
   * control and a default render — the worst kind of failure, because nothing
   * reports it. Every writer goes through set(), so translating here covers
   * presets, shared settings strings and Randomize at one point instead of
   * three.
   *
   * "starfield" was a background MODE before stars became an overlay
   * checkbox. It meant a solid fill with stars on top, which is exactly what
   * solid + stars is now, so old presets and old share links keep rendering
   * the picture they described. */
  function migrate(id, value) {
    if (id === "background" && value === "starfield") {
      var st = bound["stars"];
      if (st) st.el.checked = true;
      return "solid";
    }
    return value;
  }

  /* Write a value without firing the change callback — used when Randomize
   * or a preset sets many controls at once and wants a single re-render. */
  function set(id, value) {
    var d = bound[id];
    if (!d) return;
    value = migrate(id, value);
    suppress = true;
    if (d.el.type === "checkbox") d.el.checked = !!value;
    else d.el.value = value;
    updateReadout(d);
    suppress = false;
  }

  /* Snapshot of every bound control, keyed by id. This is the settings object
   * the pipeline consumes. */
  function readAll() {
    var out = {};
    for (var id in bound) {
      if (Object.prototype.hasOwnProperty.call(bound, id)) out[id] = valueOf(bound[id]);
    }
    return out;
  }

  /* --- locks ---------------------------------------------------------- */

  function isLocked(id) {
    var d = bound[id];
    return !!(d && d.lock && d.lock.checked);
  }

  function setLocked(id, locked) {
    var d = bound[id];
    if (!d || !d.lock) return;
    d.lock.checked = !!locked;
    var row = d.lock.closest(".control-row");
    if (row) row.classList.toggle("locked", !!locked);
  }

  function eachLock(fn) {
    for (var id in bound) {
      if (Object.prototype.hasOwnProperty.call(bound, id) && bound[id].lock) fn(id);
    }
  }

  function lockAll() { eachLock(function (id) { setLocked(id, true); }); }
  function unlockAll() { eachLock(function (id) { setLocked(id, false); }); }
  function invertLocks() { eachLock(function (id) { setLocked(id, !isLocked(id)); }); }

  /* --- misc ------------------------------------------------------------ */

  function setEnabled(id, enabled) {
    var d = bound[id];
    if (!d) return;
    d.el.disabled = !enabled;
    var row = d.el.closest(".control-row");
    if (row) row.classList.toggle("disabled", !enabled);
  }

  /* Show or hide a whole control row — used for archetype-specific controls,
   * which appear only when the relevant archetype is selected. */
  function setVisible(id, visible) {
    var d = bound[id];
    if (!d) return;
    var row = d.el.closest(".control-row");
    if (row) row.hidden = !visible;
  }

  /* RELABEL A CONTROL, so one slider can honestly serve two bodies.
   *
   * `tidalLock` drives the planet's tidal-locking axis and the star's
   * binary-companion axis — the same quantity ("how hard is the asymmetry
   * being driven") pointed at a different cause. A second slider for that
   * would be D27's mistake, and leaving it labelled "Tidal locking" on a star
   * would be a control lying about what it does.
   *
   * The label and the row's tooltip both move, because a tooltip left
   * describing oceans boiling off a dayside is worse than no tooltip. Passing
   * a falsy `title` leaves the tooltip alone, which is what the default case
   * wants.
   *
   * The archetype's axis names both strings (`dial`, `dialTitle`), so this
   * function knows nothing about stars or planets — it is handed text. */
  function setLabel(id, text, title) {
    var d = bound[id];
    if (!d || !text) return;
    var row = d.el.closest(".control-row");
    if (!row) return;
    var label = row.querySelector("label[for='" + d.el.id + "']");
    if (label) label.textContent = text;
    if (title) row.title = title;
  }

  /* THE ANGULAR AXIS'S SLIDER SAYS WHAT IT DOES ON *THIS* BODY.
   *
   * One slider, two causes. On a planet `tidalLock` drives tidal locking; on
   * a star it drives a binary companion's pull on the envelope. Those are the
   * same quantity — how hard the asymmetry is driven — aimed at different
   * things, so they share the control rather than growing a second one (D27).
   * What they cannot share is the LABEL: "Tidal locking" on a body with
   * nothing to be locked to is a control lying about itself.
   *
   * The strings come from the archetype's own `axes` declaration (`dial`,
   * `dialTitle`, `facingDial`), so nothing here names a body type and adding
   * a third cause is a data edit.
   *
   * IT LIVES IN THIS FILE RATHER THAN IN main.js BECAUSE THERE ARE THREE
   * ROUTES INTO THE ARCHETYPE CONTROL and only one of them fires a change
   * event. D114 is the audit that found them: the control's own change, a
   * settings PASTE, and applying a PRESET. A copy per route is how the trait
   * picker ended up stale on two of the three.
   *
   * THE DEFAULTS ARE CAPTURED FROM THE DOM ON FIRST CALL rather than written
   * out here. Duplicating the label text in JavaScript would give two places
   * that must agree about what a slider is called, and index.html is already
   * the one that says it.
   *
   * CALLED AT INIT AND ON CHANGE, WHICH IS THE WHOLE OF D79/D114. A page
   * reloaded with a star already selected fires no change event, so a
   * change-only hook shows the planet's label on a star — the exact defect the
   * trait picker shipped with, and the reason the audit found two more. */
  var axisDialDefaults = null;
  function syncAxisDials() {
    var arch = CC.Archetypes.get(get("archetype") || "planet");
    var axis = arch && arch.axes && arch.axes.tidalLock;

    if (!axisDialDefaults) {
      var row = document.querySelector(".control-row label[for='tidal-lock']");
      var fRow = document.querySelector(".control-row label[for='tidal-facing']");
      axisDialDefaults = {
        dial: row ? row.textContent : "Tidal locking",
        dialTitle: (row && row.closest(".control-row").title) || "",
        facingDial: fRow ? fRow.textContent : "Lock facing",
        facingTitle: (fRow && fRow.closest(".control-row").title) || ""
      };
    }

    var d = axisDialDefaults;
    setLabel("tidal-lock",
      (axis && axis.dial) || d.dial,
      (axis && axis.dialTitle) || d.dialTitle);
    setLabel("tidal-facing",
      (axis && axis.facingDial) || d.facingDial,
      (axis && axis.facingTitle) || d.facingTitle);
  }


  function setChangeHandler(fn) { onChange = fn; }

  return {
    bind: bind,
    bindAll: bindAll,
    get: get,
    set: set,
    readAll: readAll,
    isLocked: isLocked,
    setLocked: setLocked,
    lockAll: lockAll,
    unlockAll: unlockAll,
    invertLocks: invertLocks,
    setEnabled: setEnabled,
    setVisible: setVisible,
    setLabel: setLabel,
    syncAxisDials: syncAxisDials,
    setChangeHandler: setChangeHandler
  };
})();
