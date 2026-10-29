/* The keyboard map (D288).
 *
 * Split out of js/ui/exportui.js, where it began because Ctrl+S and Ctrl+C
 * were its first two keys. Most of the map is not about exporting at all —
 * Space, the arrows, L and ? — so it lives on its own.
 *
 * ONE TABLE BOTH READ. `MAP` is what the keydown handler walks AND what the
 * Help modal prints as its shortcut list (CC.Help builds the list from
 * `CC.Keys.list()` each time it opens). A key added here appears in Help with
 * no second edit, and a key cannot be listed without being bound, because the
 * list and the bindings are the same rows. A row with no `run` is listed only:
 * Esc, which the modal binds itself.
 *
 * EVERY KEY CHANGES CONTROLS THROUGH THE NORMAL PATH — `CC.Controls.set` and a
 * redraw, or the accordion's own toggle — so persistence (D287) saves what a
 * key did with no code here: `draw()` schedules the save.
 *
 * The rules, in the order the handler applies them:
 *   1. A modal owns the keyboard while it is up. It handles its own Esc and Tab.
 *   2. Ctrl/Cmd combinations pass through, except Ctrl+S (everywhere) and
 *      Ctrl+C (unless the user is copying text).
 *   3. Alt combinations pass through: Alt+arrows is the browser's back/forward.
 *   4. A focused control keeps the keys it uses itself, and only those (see
 *      `ownedBy`). Shift is allowed only where the key needs it (?).
 *
 * Loaded after js/ui/exportui.js (whose runExport Ctrl+S and Ctrl+C call) and
 * before js/main.js, which initialises it. */

var CC = CC || {};

CC.Keys = (function () {
  "use strict";

  var requestDraw = null;

  function isKey(e, names) {
    for (var i = 0; i < names.length; i++) if (e.key === names[i]) return true;
    return false;
  }

  function plain(e, names) {
    return !e.shiftKey && isKey(e, names);
  }

  function toggleControl(id) {
    CC.Controls.set(id, !CC.Controls.get(id));
    requestDraw();
  }

  /* ---- the seed step ----------------------------------------------------
   *
   * "Increment the numeric part" (PARAMETERS.md), read as THE LAST RUN OF
   * DIGITS, since every seed Randomize makes ends in one (`zarvo-4821`).
   * Done on the digit string rather than through Number, so a pasted
   * twenty-digit seed steps exactly instead of rounding.
   *
   * - Zero-padding is kept when the number had it: `x-009` -> `x-010`, but
   *   `zarvo-1000` <- `zarvo-999`, not `zarvo-0999`.
   * - No number at all (`first-light`, a pasted word): -> appends `-1`, and
   *   <- does nothing, since there is nothing below it to reach.
   * - At zero, <- does nothing; `-` is the separator, not a sign.
   * - The seed lock is not consulted. It means "Randomize will keep this
   *   seed", and like typing in the field or the dice button, an arrow is a
   *   deliberate change by hand. */
  function stepDigits(digits, dir) {
    var d = digits.split("");
    var i = d.length - 1;
    if (dir > 0) {
      while (i >= 0 && d[i] === "9") { d[i] = "0"; i--; }
      if (i < 0) d.unshift("1"); else d[i] = String(+d[i] + 1);
    } else {
      if (/^0+$/.test(digits)) return null;
      while (d[i] === "0") { d[i] = "9"; i--; }
      d[i] = String(+d[i] - 1);
    }
    var out = d.join("").replace(/^0+(?=\d)/, "");
    var padded = digits.length > 1 && digits.charAt(0) === "0";
    while (padded && out.length < digits.length) out = "0" + out;
    return out;
  }

  function nextSeed(seed, dir) {
    var m = /(\d+)(\D*)$/.exec(seed);
    if (!m) return dir > 0 ? seed + "-1" : null;
    var n = stepDigits(m[1], dir);
    if (n === null) return null;
    return seed.slice(0, m.index) + n + m[2];
  }

  function stepSeed(e) {
    var next = nextSeed(CC.Controls.get("seed") || "", e.key === "ArrowRight" ? 1 : -1);
    if (next === null) return;
    CC.Controls.set("seed", next);
    requestDraw();
  }

  /* ---- the table --------------------------------------------------------
   *
   * `show` is what Help prints, `join` how it joins them ("+" a chord, "–" a
   * range, "/" a pair). `match` decides, `run` acts. `anywhere` rows fire even
   * from inside a control; the rest give way to whatever has focus. */
  var MAP = [
    { show: ["Space"], label: "Randomize",
      match: function (e) { return plain(e, [" ", "Spacebar"]); },
      run: function () { CC.Randomize.run(); } },
    { show: ["←", "→"], join: "/", label: "Previous or next seed",
      match: function (e) { return plain(e, ["ArrowLeft", "ArrowRight"]); },
      run: stepSeed },
    { show: ["L"], label: "Show or hide the layer labels",
      match: function (e) { return isKey(e, ["l", "L"]); },
      run: function () { toggleControl("show-labels"); } },
    { show: ["I"], label: "Show or hide the info card",
      match: function (e) { return isKey(e, ["i", "I"]); },
      run: function () { toggleControl("show-info"); } },
    { show: ["1", "8"], join: "–", label: "Open or close a settings section",
      match: function (e) { return !e.shiftKey && e.key >= "1" && e.key <= "8" && e.key.length === 1; },
      run: function (e) { CC.Accordion.toggleByIndex(parseInt(e.key, 10)); } },
    { show: ["Ctrl", "S"], join: "+", label: "Export a PNG", ctrl: true, anywhere: true,
      match: function (e) { return isKey(e, ["s", "S"]); },
      run: function () { CC.ExportUI.runExport("current"); } },
    { show: ["Ctrl", "C"], join: "+", label: "Copy the render to the clipboard", ctrl: true,
      match: function (e) { return isKey(e, ["c", "C"]) && !copyingText(); },
      run: function () { CC.ExportUI.runExport("clipboard"); } },
    { show: ["?"], label: "Show this list",
      match: function (e) { return e.key === "?"; },
      run: function () { CC.Help.open(null, "keys"); } },
    { show: ["Esc"], label: "Close this window, or leave a text field" }
  ];

  /* Ctrl+C copies the render unless the user has selected text to copy: in a
   * field, or anywhere on the page (the info panel's lines, say). */
  function copyingText() {
    var t = document.activeElement;
    if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" &&
        typeof t.selectionStart === "number" && t.selectionStart !== t.selectionEnd))) {
      return true;
    }
    var sel = window.getSelection && window.getSelection();
    return !!(sel && String(sel).length);
  }

  /* ---- what a focused control keeps -------------------------------------
   *
   * The old rule gave every input the whole keyboard, and focus stays on a
   * slider after it is dragged: Space, L and I went dead until the user
   * clicked somewhere else. Now a control keeps only the keys it uses.
   *
   *   text, number, textarea, select   everything (typing, type-ahead)
   *   range                            the arrows, Home, End, Page keys
   *   checkbox, colour                 Space, which presses it
   *
   * A button keeps nothing, as before: Space randomizes rather than pressing
   * whatever was last clicked, which is what makes Space-Space-Space work
   * after a click on Randomize. Enter still presses a focused button. */
  var SLIDER_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                     "Home", "End", "PageUp", "PageDown"];

  function ownedBy(t, e) {
    if (!t || !t.tagName) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    var type = (t.type || "text").toLowerCase();
    if (type === "range") return isKey(e, SLIDER_KEYS);
    if (type === "checkbox" || type === "radio" || type === "color") {
      return isKey(e, [" ", "Spacebar"]) || (type === "radio" && isKey(e, SLIDER_KEYS));
    }
    return true;
  }

  function isTextEntry(t) {
    if (!t || !t.tagName) return false;
    if (t.tagName === "TEXTAREA") return true;
    if (t.tagName !== "INPUT") return false;
    var type = (t.type || "text").toLowerCase();
    return type === "text" || type === "number" || type === "search";
  }

  function onKeydown(e) {
    if (CC.Help && CC.Help.isOpen()) return;
    var t = e.target;

    /* Esc leaves a text field, so the shortcuts work again at once instead of
     * after a click on the canvas. The field's value is untouched. */
    if (e.key === "Escape" || e.key === "Esc") {
      if (isTextEntry(t) && t.blur) t.blur();
      return;
    }

    var ctrl = e.ctrlKey || e.metaKey;
    if (e.altKey) return;

    for (var i = 0; i < MAP.length; i++) {
      var row = MAP[i];
      if (!row.run || !!row.ctrl !== ctrl) continue;
      if (!row.match(e)) continue;
      if (!row.anywhere && !row.ctrl && ownedBy(t, e)) return;
      if (row.ctrl && !row.anywhere && isTextEntry(t)) return;
      e.preventDefault();
      row.run(e);
      return;
    }
  }

  /* What Help prints: label and keys, never the handlers. */
  function list() {
    return MAP.map(function (row) {
      return { show: row.show.slice(), join: row.join || null, label: row.label };
    });
  }

  function init(opts) {
    requestDraw = opts.requestDraw;
    document.addEventListener("keydown", onKeydown);
  }

  return { init: init, list: list, nextSeed: nextSeed };
})();
