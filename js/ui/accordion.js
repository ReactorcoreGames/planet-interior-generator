/* Accordion sections for the settings panel.
 *
 * Multi-open: any number of sections may be expanded at once. Each open
 * section scrolls inside itself, so the panel never pushes Randomize and
 * Export off the page — that was a v2 failure the layout is designed against.
 * Those two buttons live outside the accordion entirely; see index.html.
 *
 * WHICH SECTIONS ARE OPEN SURVIVES A REFRESH, stored in localStorage. This is
 * the ONLY thing the app persists: it is invisible state that cannot produce a
 * wrong render, unlike control values, which would hand a returning user a
 * half-configured app with no obvious way back to defaults. A seed and a
 * settings block already cover reproducing an actual body — see ui/share.js. */

var CC = CC || {};

CC.Accordion = (function () {
  "use strict";

  var sections = [];

  function init(root) {
    root = root || document;
    sections = [].slice.call(root.querySelectorAll(".section"));

    sections.forEach(function (section, i) {
      var head = section.querySelector(".section-head");
      var body = section.querySelector(".section-body");
      if (!head || !body) return;

      head.setAttribute("role", "button");
      head.setAttribute("tabindex", "0");
      syncAria(section, head, body);

      head.addEventListener("click", function () { toggle(section); });
      head.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          toggle(section);
        }
      });

      section.dataset.index = String(i + 1);
    });

    /* AFTER the headers are wired, so a restored section's aria state is set
     * by the same path a clicked one uses. */
    restore();
  }

  function syncAria(section, head, body) {
    var open = section.classList.contains("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    body.setAttribute("aria-hidden", open ? "false" : "true");
  }

  /* `quiet` suppresses the save, so a bulk operation writes localStorage once
   * at the end rather than once per section. Every ordinary caller — a header
   * click, a number key — leaves it off and is persisted immediately. */
  function toggle(section, force, quiet) {
    var open = force === undefined ? !section.classList.contains("open") : !!force;
    section.classList.toggle("open", open);
    var head = section.querySelector(".section-head");
    var body = section.querySelector(".section-body");
    if (head && body) syncAria(section, head, body);
    if (!quiet) writeStore();
    return open;
  }

  /* Keyboard shortcut target: keys 1-6 toggle sections by position. */
  function toggleByIndex(n) {
    var s = sections[n - 1];
    if (s) toggle(s);
  }

  function openByName(name) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].dataset.section === name) return toggle(sections[i], true);
    }
    return false;
  }

  /* ---- persistence -----------------------------------------------------
   *
   * Sections are recorded by NAME rather than by position, so adding or
   * reordering a section in a later phase cannot make a stored layout apply
   * itself to the wrong ones — an unknown name is simply ignored, and a
   * section the store has never heard of falls back to the default.
   *
   * Every failure here is non-fatal by design. localStorage throws in private
   * windows and can be disabled outright, and a stored value can be junk left
   * by an older build; in every one of those cases the app must open normally
   * on the default rather than fail to start over a cosmetic preference. */

  var STORE_KEY = "cc.sections.v1";

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      /* Must be a plain object of name -> boolean. Anything else is treated as
       * absent rather than repaired. */
      if (!parsed || typeof parsed !== "object" || parsed instanceof Array) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeStore() {
    try {
      var state = {};
      sections.forEach(function (s) {
        if (s.dataset.section) {
          state[s.dataset.section] = s.classList.contains("open");
        }
      });
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* Storage unavailable or full. The panel still works; it just forgets. */
    }
  }

  /* Apply the stored layout over the markup's defaults.
   *
   * WITH NOTHING STORED, EVERYTHING CLOSES. A first-time user meeting eight
   * expanded sections of sliders reads it as a wall rather than as an
   * interface, so the app opens shut and lets them choose what to look at.
   * The markup keeps `class="open"` on the sections it does because that is
   * the sensible state to fall back to if this file is ever removed. */
  function restore() {
    var stored = readStore();
    sections.forEach(function (s) {
      var name = s.dataset.section;
      var open = (stored && name && Object.prototype.hasOwnProperty.call(stored, name))
        ? !!stored[name]
        : false;
      toggle(s, open, true);
    });
    /* A restored panel that is entirely shut wants Expand next; anything else
     * wants Collapse. This is the one moment the button reads the accordion,
     * because on load there has been no click to alternate from. */
    pending = sections.some(function (s) { return s.classList.contains("open"); })
      ? COLLAPSE : EXPAND;
  }

  /* ---- the two-mode section toggle -------------------------------------
   *
   * One button alternating between everything open and everything shut. It is
   * deliberately NOT a reflection of the accordion's current state: sections
   * can also be opened and closed individually from their headers, which
   * leaves the panel in neither pure state, and a button that tried to
   * describe that would have to invent an answer. Instead it blindly
   * ALTERNATES, and is labelled with what it will do next, so the label is
   * always a true statement about the click even in a mixed state. The cost is
   * that after manual fiddling the user may need two presses to reach the mode
   * they want, which the user judged the right trade.
   *
   * An earlier version left Output open when collapsing, on the theory that
   * export mode wants it. In use that failed: Output sits at the bottom, so
   * reaching it still meant scrolling past seven collapsed headers, and the
   * exception bought nothing for the complication. Collapse now means shut. */

  var COLLAPSE = "collapse";
  var EXPAND   = "expand";

  /* What the NEXT press will do. Overwritten by restore() once the stored
   * layout is known; this initial value only matters if restore never runs. */
  var pending = EXPAND;

  function setAll(open) {
    sections.forEach(function (s) { toggle(s, open, true); });
    writeStore();
  }

  /* Apply a mode without advancing the alternation. */
  function applyMode(mode) {
    setAll(mode === EXPAND);
    pending = (mode === EXPAND) ? COLLAPSE : EXPAND;
    return mode;
  }

  /* The button's action: do the pending thing, then flip. */
  function cycle() {
    return applyMode(pending);
  }

  function pendingMode() { return pending; }

  return {
    init: init,
    toggle: toggle,
    toggleByIndex: toggleByIndex,
    openByName: openByName,
    setAll: setAll,
    applyMode: applyMode,
    cycle: cycle,
    pendingMode: pendingMode,
    restore: restore,
    COLLAPSE: COLLAPSE,
    EXPAND: EXPAND
  };
})();
