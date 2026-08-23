/* Sharing a body as TEXT — the settings string, the factsheet, and the import.
 *
 * Split out of ui/export.js, which passed the 500-line rule once the factsheet
 * and the import landed. The seam is real rather than arbitrary: everything in
 * export.js produces PIXELS and everything here produces or consumes CHARACTERS,
 * and the two share only the filename helper.
 *
 * THE THREE PIECES ARE ONE FEATURE, which is why they sit together:
 *
 *   settingsText()       the body as a short diff against the shipped defaults
 *   factsheetText()      the card as a document, with that diff embedded
 *   applySettingsText()  the diff read back, restoring the body
 *
 * The third is what makes the first two worth having. Without it the string was
 * something a user could produce and not consume, and with forty controls,
 * re-entering one by hand is not a thing anyone does — see PROGRESS.md D57.
 *
 * The three collaborators below are injected by ui/export.js rather than
 * reached for, so this module never learns about the pipeline or about how a
 * canvas gets made.
 *
 * Loaded after js/ui/export.js, which owns the menu that calls it. */

var CC = CC || {};

CC.Share = (function () {
  "use strict";

  var getSettings = null;
  var getStats = null;
  var filenameFor = null;

  /* ---- the settings string ---------------------------------------------- */

  /* THE SHAREABLE STATE (PARAMETERS.md): the seed plus every NON-DEFAULT
   * control. Only the differences, because a string listing all forty controls
   * is not something anyone pastes into a chat window — and because the
   * defaults are in the HTML, so a value that matches one carries no
   * information.
   *
   * Defaults are read from the DOM's own `defaultValue` / `defaultChecked`
   * rather than from a second table, so the string cannot drift from what the
   * page actually ships with. That is the same reason doccheck reads
   * index.html rather than a manifest. */
  function settingsText() {
    var lines = [];
    var seed = CC.Controls.get("seed");
    lines.push("seed: " + seed);

    var els = document.querySelectorAll("#panel input, #panel select");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.id || el.id.indexOf("lock-") === 0) continue;
      if (el.id === "seed") continue;

      var isDefault, value;
      if (el.type === "checkbox") {
        isDefault = el.checked === el.defaultChecked;
        value = el.checked ? "on" : "off";
      } else if (el.tagName === "SELECT") {
        var def = null;
        for (var o = 0; o < el.options.length; o++) {
          if (el.options[o].defaultSelected) def = el.options[o].value;
        }
        if (def === null && el.options.length) def = el.options[0].value;
        isDefault = el.value === def;
        value = el.value;
      } else {
        isDefault = el.value === el.defaultValue;
        value = el.value;
      }
      if (!isDefault) lines.push(el.id + ": " + value);
    }

    /* Traits are part of the body and are not a control value, so they need
     * their own line or the string would restore a different world. */
    if (CC.TraitPicker) {
      var sel = CC.TraitPicker.selection();
      if (sel && sel.length) lines.push("traits: " + sel.join(", "));
      var ex = CC.TraitPicker.excluded();
      if (ex && ex.length) lines.push("traits-off: " + ex.join(", "));
    }

    return lines.join("\n");
  }

  /* Like the image copy in ui/export.js, this settles asynchronously and so
   * reports twice — the synchronous return says the write was started, and
   * `onDone` says whether it landed. A clipboard write is the export with the
   * least visible result, so claiming success before the promise resolves is
   * exactly the wrong place to be optimistic. */
  function copySettings(onDone) {
    var text = settingsText();
    var lines = text.split("\n").length;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return { ok: false, text: text,
               error: "This browser can't copy text to the clipboard." };
    }
    try {
      var p = navigator.clipboard.writeText(text);
      if (p && p.then && onDone) {
        p.then(function () {
          onDone({ ok: true, text: text,
                   message: "Seed + settings copied (" + lines + " lines)" });
        }, function () {
          onDone({ ok: false, text: text,
                   error: "The browser refused clipboard access." });
        });
      }
    } catch (e) {
      return { ok: false, text: text,
               error: "The browser refused clipboard access." };
    }
    return { ok: true, pending: true, text: text, message: "Copying settings…" };
  }

  /* ---- the markdown factsheet -------------------------------------------
   *
   * The card as a document rather than a picture: a handout a GM can drop into
   * their notes, edit, and search. It carries BOTH halves — the factsheet and
   * the parameters that produced it — so one file is enough to hand a world to
   * somebody who wants to regenerate it as well as read it.
   *
   * OVERFLOW IS NOT A PROBLEM HERE, which is worth saying because it is a
   * problem in both PNG exports: markdown has no frame to overflow. So this
   * export always emits EVERY line regardless of the detail level, and the
   * level only governs the pictures. A file is the right place to be complete.
   *
   * The parameters section is the same diff `settingsText` produces, in a
   * fenced block so it can be copied straight back into the Seed field. */
  function factsheetText() {
    var stats = getStats();
    var settings = getSettings();
    var out = [];

    out.push("# " + stats.name);
    out.push("");
    out.push("*" + stats.typeLabel + " · hazard rating: **" + stats.hazard + "**" + "*");
    out.push("");

    /* Every line, not the filtered set — see above. */
    for (var i = 0; i < stats.lines.length; i++) {
      out.push("**" + stats.lines[i].label + "**  ");
      out.push(stats.lines[i].value);
      out.push("");
    }

    var fp = stats.fingerprint || [];
    if (fp.length) {
      out.push("## Palette");
      out.push("");
      out.push("| Layer | Colour |");
      out.push("|---|---|");
      for (var f = 0; f < fp.length; f++) {
        out.push("| " + fp[f].role + " | `" + fp[f].hex + "` |");
      }
      out.push("");
    }

    out.push("## Settings");
    out.push("");
    out.push("Paste the block below into the **Seed** field to restore this " +
             "exact body.");
    out.push("");
    out.push("```");
    out.push(settingsText());
    out.push("```");
    out.push("");
    out.push("---");
    out.push("");
    /* THE ONE PIECE OF BRANDING IN THE WHOLE TOOL, and the factsheet is the
     * right place for it: it is the export that travels — a handout dropped
     * into someone else's campaign notes, where the only clue to where the
     * world came from is what the file says. The PNGs carry no watermark and
     * are not going to grow one. */
    out.push("*Generated with Celestial Cutaway.*  ");
    out.push("<https://reactorcoregames.github.io/>");

    return out.join("\n");
  }

  function saveFactsheet() {
    var text = factsheetText();
    var settings = getSettings();

    /* A data: URL rather than a Blob, for the same reason the PNG path uses
     * one: it needs no object-URL lifetime to manage and works everywhere
     * this ships. encodeURIComponent keeps non-ASCII intact. */
    var a = document.createElement("a");
    a.href = "data:text/markdown;charset=utf-8," + encodeURIComponent(text);
    a.download = filenameFor(settings, "factsheet").replace(/\.png$/, ".md");
    a.click();
    return { ok: true, filename: a.download, bytes: text.length,
             message: "Saved " + a.download };
  }

  /* ---- importing a settings string --------------------------------------
   *
   * THE OTHER HALF OF "COPY SEED + SETTINGS", and the half that makes it worth
   * having. PARAMETERS.md always specified it — "pasting it into the seed field
   * restores that exact body" — but only the copy direction was built, which
   * left the string a thing you could produce and not consume. Forty controls
   * is too many to re-enter by hand, so without this the export was a souvenir
   * rather than a share.
   *
   * IT NEEDS NO NEW CONTROL. The seed field is where a seed goes, and a
   * settings block BEGINS with one — so pasting the whole block there is the
   * obvious gesture, and detecting it costs one test: does the text contain a
   * newline and a `key: value` line? A plain seed never does.
   *
   * UNKNOWN KEYS ARE SKIPPED, NOT REJECTED. A string from a future version
   * naming a control this build lacks should still restore everything it CAN —
   * a body that is mostly right beats an error message. The count of applied
   * and skipped keys is returned so the caller can say which happened.
   *
   * LOCKS ARE NOT CONSULTED. A lock means "Randomize must not touch this"; an
   * explicit paste is the user asking for exactly this body, and silently
   * dropping half of it because something was locked would be the surprise. */
  function looksLikeSettings(text) {
    return /\n/.test(String(text)) && /^\s*[a-z][a-z0-9-]*\s*:/im.test(String(text));
  }

  function applySettingsText(text) {
    var lines = String(text).split(/\r?\n/);
    var applied = [], skipped = [], traits = null, traitsOff = null;

    for (var i = 0; i < lines.length; i++) {
      var m = /^\s*([a-z][a-z0-9-]*)\s*:\s*(.*?)\s*$/i.exec(lines[i]);
      if (!m) continue;
      var key = m[1].toLowerCase(), value = m[2];

      if (key === "traits") {
        traits = value ? value.split(/\s*,\s*/) : [];
        continue;
      }
      if (key === "traits-off") {
        traitsOff = value ? value.split(/\s*,\s*/) : [];
        continue;
      }

      var el = document.getElementById(key);
      if (!el || key.indexOf("lock-") === 0) { skipped.push(key); continue; }

      if (el.type === "checkbox") CC.Controls.set(key, value === "on" || value === "true");
      else CC.Controls.set(key, value);
      applied.push(key);
    }

    /* EVERY CONTROL THE STRING DID NOT MENTION GOES BACK TO ITS DEFAULT.
     * The string is a DIFF against the shipped defaults, so a control it omits
     * is not "leave as-is" — it is "this one is default". Without this, pasting
     * a string over a heavily-edited panel gives a body that is the paste
     * merged with whatever was already there, which is not the world the string
     * describes. */
    var els = document.querySelectorAll("#panel input, #panel select");
    for (var e = 0; e < els.length; e++) {
      var c = els[e];
      if (!c.id || c.id.indexOf("lock-") === 0) continue;
      if (applied.indexOf(c.id) >= 0) continue;
      if (c.type === "checkbox") {
        if (c.checked !== c.defaultChecked) CC.Controls.set(c.id, c.defaultChecked);
      } else if (c.tagName === "SELECT") {
        var def = null;
        for (var o = 0; o < c.options.length; o++) {
          if (c.options[o].defaultSelected) def = c.options[o].value;
        }
        if (def === null && c.options.length) def = c.options[0].value;
        if (c.value !== def) CC.Controls.set(c.id, def);
      } else if (c.value !== c.defaultValue) {
        CC.Controls.set(c.id, c.defaultValue);
      }
    }

    if (CC.TraitPicker) {
      CC.TraitPicker.setExcluded(traitsOff || []);
      CC.TraitPicker.setSelection(traits || []);
    }

    return { ok: applied.length > 0, applied: applied, skipped: skipped,
             traits: traits };
  }

  function init(opts) {
    getSettings = opts.getSettings;
    getStats = opts.getStats;
    filenameFor = opts.filenameFor;
  }

  return {
    init: init,
    settingsText: settingsText,
    factsheetText: factsheetText,
    saveFactsheet: saveFactsheet,
    copySettings: copySettings,
    looksLikeSettings: looksLikeSettings,
    applySettingsText: applySettingsText
  };
})();
