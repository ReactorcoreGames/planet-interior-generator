/* Settings persistence and Reset to defaults.
 *
 * THE APP REOPENS ON THE BODY IT WAS CLOSED ON. Every panel control, the
 * traits, the framing and the locks survive a refresh, and one button puts the
 * whole lot back to a first launch.
 *
 * NO SECOND SERIALISER. What is stored is the "Copy seed + settings" string
 * from ui/share.js — the seed and every control that differs from the page's
 * own defaults — so a control added later is persisted the moment it exists,
 * and restoring is the same code path as pasting a string into the seed field.
 * Locks ride beside it rather than inside it: a lock is not part of the body,
 * which is why the share string leaves them out.
 *
 * RESET IS AN EMPTY STRING. The string is a diff against the DOM's own
 * `defaultValue` / `defaultChecked`, and applying it puts every control it does
 * not mention back to that default — so applying nothing is a reset, with no
 * copy of the defaults written anywhere but index.html.
 *
 * SAVING IS HOOKED TO THE REDRAW, NOT TO EACH CONTROL. Randomize, presets, a
 * paste, dragging the preview and the trait picker all write through
 * `CC.Controls.set`, which fires no change event, but every one of them ends in
 * a draw. A draw-side hook covers all of them and any route added later. Locks
 * redraw nothing, so changes and clicks inside the panel schedule a save too.
 *
 * NOTHING HERE MAY STOP THE APP BOOTING. localStorage throws in private
 * windows and can be blocked outright, and a stored value can be junk. Every
 * read and write is wrapped; a value that cannot be used is discarded and the
 * app opens on its defaults.
 *
 * Not stored: the accordion (it keeps its own key, see ui/accordion.js — it is
 * layout, not the body), the preset gallery's highlight (transient by design,
 * ui/presets.js), and anything derived — disabled and hidden rows are
 * recomputed by the sync helpers every restore calls.
 *
 * Loaded after js/ui/exportui.js and before js/main.js, which initialises it. */

var CC = CC || {};

CC.Persist = (function () {
  "use strict";

  var STORE_KEY = "cc.state.v1";
  var VERSION = 1;
  var SAVE_DELAY = 300;    /* ms; a pan drag redraws every frame */
  var ARM_TIME = 3000;     /* ms the Reset button waits for its second press */

  var afterApply = null;   /* main.js's syncs, run after any bulk write */
  var requestDraw = null;
  var toast = null;

  var timer = null;
  var lastWritten = null;
  var armed = null;        /* the pending disarm timeout while Reset is armed */

  /* ---- storage, every access wrapped ---------------------------------- */

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || parsed.v !== VERSION ||
          typeof parsed.settings !== "string") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeRaw(raw) {
    try {
      window.localStorage.setItem(STORE_KEY, raw);
      lastWritten = raw;
    } catch (e) {
      /* Storage unavailable or full. The app still works; it just forgets. */
    }
  }

  function clearStore() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* as above */ }
    lastWritten = null;
  }

  /* ---- what is stored ------------------------------------------------- */

  function lockedIds() {
    var out = [];
    var els = document.querySelectorAll("#panel input[id^='lock-']");
    for (var i = 0; i < els.length; i++) {
      if (els[i].checked) out.push(els[i].id.slice(5));
    }
    return out;
  }

  function snapshot() {
    return JSON.stringify({ v: VERSION, settings: CC.Share.settingsText(),
                            locks: lockedIds() });
  }

  /* Debounced, and skipped when nothing changed — a window resize redraws
   * without changing a single setting. */
  function schedule() {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY);
  }

  function flush() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    try {
      var raw = snapshot();
      if (raw !== lastWritten) writeRaw(raw);
    } catch (e) {
      /* A snapshot that throws is a bug elsewhere; it must not become a crash
       * on every redraw. */
    }
  }

  /* ---- restoring ------------------------------------------------------ */

  function applyLocks(ids) {
    CC.Controls.unlockAll();
    for (var i = 0; i < (ids || []).length; i++) {
      if (typeof ids[i] === "string") CC.Controls.setLocked(ids[i], true);
    }
  }

  /* Called once at start-up, before the first draw. Unknown keys are skipped
   * and missing ones defaulted by applySettingsText itself, and a dropdown
   * value with no option (a renamed archetype) is skipped there too. Anything
   * that still throws resets the app to defaults and drops the stored value. */
  function restore() {
    var stored = readStore();
    if (!stored) return false;
    try {
      CC.Share.applySettingsText(stored.settings);
      applyLocks(stored.locks instanceof Array ? stored.locks : []);
      lastWritten = JSON.stringify(stored);
      if (afterApply) afterApply();
      return true;
    } catch (e) {
      try { resetState(); } catch (e2) { /* the DOM defaults still stand */ }
      clearStore();
      return false;
    }
  }

  /* ---- Reset to defaults ---------------------------------------------- */

  /* Everything a first launch has: every control including the seed and the
   * framing, no trait picks or exclusions, trait salt 0, and no locks — the
   * locks are not consulted, since "defaults" includes having none. The
   * accordion is left alone, so the section holding the button does not fold
   * shut under the click. */
  function resetState() {
    CC.Share.applySettingsText("");
    CC.Controls.unlockAll();
    if (afterApply) afterApply();
  }

  function reset() {
    resetState();
    clearStore();
    if (requestDraw) requestDraw();
    if (toast) toast({ ok: true, message: "Settings reset to defaults" });
  }

  /* TWO PRESSES. Reset throws away an unsaved body, so one stray click must
   * not be able to do it — but a modal is heavier than the risk. The first
   * press arms the button and relabels it; a second inside ARM_TIME resets. */
  function setupResetButton() {
    var btn = document.getElementById("reset-defaults");
    if (!btn) return;
    var idle = btn.textContent;

    function disarm() {
      if (armed !== null) clearTimeout(armed);
      armed = null;
      btn.textContent = idle;
      btn.classList.remove("armed");
    }

    btn.addEventListener("click", function () {
      if (armed === null) {
        btn.textContent = "Click again to reset";
        btn.classList.add("armed");
        armed = setTimeout(disarm, ARM_TIME);
        return;
      }
      disarm();
      reset();
    });
  }

  /* ---- wiring --------------------------------------------------------- */

  function init(opts) {
    afterApply = opts.afterApply || null;
    requestDraw = opts.requestDraw || null;
    toast = opts.toast || null;

    setupResetButton();

    var panel = document.getElementById("panel");
    if (panel) {
      panel.addEventListener("change", schedule);
      panel.addEventListener("click", schedule);
    }
    if (window.addEventListener) window.addEventListener("pagehide", flush);
  }

  return {
    init: init,
    restore: restore,
    schedule: schedule,
    flush: flush,
    reset: reset,
    STORE_KEY: STORE_KEY
  };
})();
