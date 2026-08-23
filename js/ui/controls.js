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

  /* Write a value without firing the change callback — used when Randomize
   * or a preset sets many controls at once and wants a single re-render. */
  function set(id, value) {
    var d = bound[id];
    if (!d) return;
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
    setChangeHandler: setChangeHandler
  };
})();
