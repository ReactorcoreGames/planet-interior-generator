/* Wiring for the export menu, its feedback, and the keyboard map.
 *
 * Split out of js/main.js, which passed the 500-line rule once the composed
 * export and the settings import landed. main.js keeps what only it can own —
 * the pipeline, the stage cache and the render loop — and this takes the
 * interface around exporting, which is a different concern that merely happened
 * to be wired from the same place.
 *
 * ALL FOUR PIECES HERE EXIST BECAUSE AN EXPORT IS INVISIBLE FROM INSIDE THE
 * PAGE. A file lands in the downloads folder, a clipboard changes, a pasted
 * string rewrites forty controls at once — and none of that produces anything
 * the user can see in the window they are looking at. Without a confirmation
 * each of them reads as a broken button, which is the same silently-inert
 * control test/domtest.mjs exists to catch (and which the export menu genuinely
 * was for four phases).
 *
 * It receives everything it needs from main.js rather than reaching for it:
 * the render request, and the two sync helpers a settings import has to call
 * because a paste can change controls that gate other controls.
 *
 * Loaded after js/ui/share.js and before js/main.js, which initialises it. */

var CC = CC || {};

CC.ExportUI = (function () {
  "use strict";

  var requestDraw = null;
  var syncRotationEnabled = null;
  var syncBackgroundColour = null;

  /* PASTING A SETTINGS BLOCK INTO THE SEED FIELD RESTORES THAT BODY.
   *
   * PARAMETERS.md always specified this — "pasting it into the seed field
   * restores that exact body" — and only the copy half had been built, which
   * left the exported string a thing you could produce and not consume.
   *
   * It needs NO NEW CONTROL, which is why it lives on the seed field rather
   * than behind an Import button: a settings block begins with a seed, so
   * pasting the whole thing where a seed goes is the obvious gesture. A plain
   * seed has no newline, so the two can never be confused.
   *
   * Handled on `paste` rather than on `input` so that typing a multi-line
   * value is still possible, and so the raw clipboard text is available before
   * the input mangles it into a single line. */
  function setupSettingsPaste() {
    var el = document.getElementById("seed");
    if (!el) return;

    el.addEventListener("paste", function (e) {
      var text = e.clipboardData && e.clipboardData.getData("text");
      if (!text || !CC.Export.looksLikeSettings(text)) return;

      e.preventDefault();
      var result = CC.Export.applySettingsText(text);
      syncRotationEnabled();
      syncBackgroundColour();
      requestDraw();
      flashSeed(result);

      /* A paste rewrites forty controls at once, so "it worked" is worth
       * saying in words as well as in a border colour — and the count is the
       * part that tells a good paste from a truncated one. */
      toast(result && result.ok
        ? { ok: true, message: "Settings applied - " + result.applied.length +
              " control" + (result.applied.length === 1 ? "" : "s") + " restored" }
        : { ok: false, error: "That did not look like a settings block." });
    });
  }

  /* Importing is invisible otherwise — the panel simply changes, and a user
   * who pasted the wrong thing gets no signal. */
  function flashSeed(result) {
    var el = document.getElementById("seed");
    if (!el) return;
    el.classList.add(result && result.ok ? "flash-ok" : "flash-err");
    setTimeout(function () { el.classList.remove("flash-ok", "flash-err"); }, 900);
  }

  function setupExportMenu(exportInit) {
    var btn = document.getElementById("export-btn");
    var menu = document.getElementById("export-menu");
    if (!btn || !menu) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", function () { menu.hidden = true; });
    menu.addEventListener("click", function (e) { e.stopPropagation(); });

    /* The four accessors are main.js closures over the pipeline and the
     * current body, so they are handed in rather than reached for — this
     * module never learns what a body is. */
    CC.Export.init(exportInit);

    var items = menu.querySelectorAll("[data-export]");
    for (var i = 0; i < items.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          menu.hidden = true;
          runExport(btn.getAttribute("data-export"));
        });
      })(items[i]);
    }
  }

  /* Export is the one action with no visible result inside the page — a file
   * lands in the downloads folder and the clipboard changes silently. Without
   * a confirmation the menu reads as broken, which is the same "silently inert
   * control" the domtest exists to catch.
   *
   * IT SAYS WHAT HAPPENED, IT DOES NOT MERELY GLOW. The first version tinted
   * the Export button's border green for 900ms, which is a signal you have to
   * already be looking at the button to catch — and the clipboard exports are
   * exactly the ones where the user is looking at the PICTURE, not at the menu
   * they just dismissed. So the confirmation is a line of text near the render,
   * naming the file and its size, or naming the reason it failed.
   *
   * A FAILURE STAYS UP LONGER THAN A SUCCESS. "Saved" is a glance; "the browser
   * refused clipboard access" is something to read and act on, so it gets four
   * seconds against two and does not fade until it has been up for that long.
   *
   * The button flash is kept alongside it — it costs nothing and it is the part
   * that reads without moving your eyes. */
  var toastTimer = null;

  function toast(result) {
    var el = document.getElementById("export-toast");
    if (!el || !result) return;

    var text = result.ok
      ? (result.message || "Done")
      : (result.error || "That export could not be completed.");

    el.textContent = text;
    el.className = "toast " + (result.ok ? "toast-ok" : "toast-err") +
      (result.pending ? " toast-pending" : "");
    el.hidden = false;
    /* Announced to a screen reader too: the whole point is that the result is
     * otherwise invisible, and that is more true, not less, without sight of
     * the button's border colour. */
    el.setAttribute("role", "status");

    if (toastTimer) clearTimeout(toastTimer);
    /* A pending toast is not dismissed on a timer at all — the settled result
     * replaces it. If the promise never settles the toast stays, which is
     * honest: the copy genuinely never finished. */
    if (result.pending) return;
    toastTimer = setTimeout(function () {
      el.hidden = true;
      toastTimer = null;
    }, result.ok ? 2400 : 4200);
  }

  function flashExport(result) {
    toast(result);

    var btn = document.getElementById("export-btn");
    if (!btn || !result) return;
    if (btn.getAttribute("data-flash")) return;
    btn.setAttribute("data-flash", result.ok ? "ok" : "err");
    btn.classList.add(result.ok ? "flash-ok" : "flash-err");
    if (!result.ok && result.error) btn.title = result.error;
    setTimeout(function () {
      btn.classList.remove("flash-ok", "flash-err");
      btn.removeAttribute("data-flash");
    }, 900);
  }

  /* Run an export and report BOTH of its results — the synchronous one and,
   * for the clipboard actions, the asynchronous one that supersedes it. Every
   * call site goes through this so none of them can forget the second half. */
  function runExport(action) {
    var result = CC.Export.run(action, flashExport);
    flashExport(result);
    return result;
  }

  function setupKeyboard() {
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      var inField = t && (t.tagName === "INPUT" || t.tagName === "SELECT" ||
                          t.tagName === "TEXTAREA");

      /* Ctrl+S and Ctrl+C work even from inside a control, because they are
       * about the render rather than about the field that happens to have
       * focus — and Ctrl+S in particular has a browser default worth
       * intercepting wherever the user is. Ctrl+C does NOT fire while text is
       * selected in a field, since copying that text is what they meant. */
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          runExport("current");
          return;
        }
        if ((e.key === "c" || e.key === "C") && !inField) {
          e.preventDefault();
          runExport("clipboard");
          return;
        }
        return;
      }

      if (inField) return;
      if (e.altKey) return;

      if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); CC.Randomize.run(); return; }
      if (e.key === "i" || e.key === "I") {
        CC.Controls.set("show-info", !CC.Controls.get("show-info"));
        requestDraw();
        return;
      }
      if (e.key >= "1" && e.key <= "8") { CC.Accordion.toggleByIndex(parseInt(e.key, 10)); }
    });
  }

  function init(opts) {
    requestDraw = opts.requestDraw;
    syncRotationEnabled = opts.syncRotationEnabled;
    syncBackgroundColour = opts.syncBackgroundColour;
    setupSettingsPaste();
    setupExportMenu(opts.exportInit);
    setupKeyboard();
  }

  return { init: init, flashExport: flashExport, toast: toast,
           runExport: runExport };
})();
