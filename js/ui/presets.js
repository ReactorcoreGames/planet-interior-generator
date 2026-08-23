/* The preset gallery — the browsing entry point.
 *
 * WHY IT EXISTS (PARAMETERS.md): without it a user has to already know which
 * sliders to drag to get a named world type. The gallery is what makes the
 * parameter model discoverable — "what kinds of world can this make?" answered
 * by looking rather than by reading the docs.
 *
 * THREE BEHAVIOURS THE SPEC IS EXPLICIT ABOUT, all implemented here rather
 * than in the preset data, because they are properties of *applying* a preset
 * rather than of any particular one:
 *
 * 1. APPLYING RESPECTS LOCKS. A locked control is not overwritten. That makes
 *    a preset composable with the lock system rather than fighting it: lock
 *    the palette you like, then browse the structural presets under it.
 *
 * 2. IT DOES NOT CHANGE THE SEED. So every preset lands on the same underlying
 *    body and the comparison is between the presets rather than between ten
 *    unrelated worlds.
 *
 * 3. NO ACTIVE-PRESET STATE IS STORED. Once applied it is just control values;
 *    editing one of them does not need to clear a label, because there is no
 *    label. The button gets a brief highlight and that is all.
 *
 * The gallery is built FROM DATA at runtime, the same rule the trait picker
 * follows — adding a preset stays a single edit to js/data/presets.js. */

var CC = CC || {};

CC.PresetGallery = (function () {
  "use strict";

  var host = null;
  var onApply = null;
  var archetypeId = "planet";
  var lastApplied = null;

  function build() {
    if (!host) return;
    host.innerHTML = "";

    var list = CC.Presets.forArchetype(archetypeId);
    for (var i = 0; i < list.length; i++) {
      host.appendChild(cardFor(list[i]));
    }
  }

  function cardFor(preset) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-card" + (preset.id === lastApplied ? " applied" : "");
    btn.setAttribute("data-preset", preset.id);
    /* The blurb is the tooltip AND the visible sub-line: it is the only thing
     * telling a user what they are about to get, so it should not be hidden
     * behind a hover on a touch device. */
    btn.title = preset.blurb;

    var name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = preset.label;

    var blurb = document.createElement("span");
    blurb.className = "preset-blurb";
    blurb.textContent = preset.blurb;

    btn.appendChild(name);
    btn.appendChild(blurb);
    btn.addEventListener("click", function () { apply(preset.id); });
    return btn;
  }

  /* Apply a preset by id. Returns the list of control ids actually written,
   * so a harness can assert that locks were honoured rather than trusting the
   * comment above. */
  function apply(id) {
    var preset = CC.Presets.get(id);
    if (!preset) return [];

    var written = [];

    /* The archetype comes first, because switching it rebuilds the trait list
     * — and a trait written before the switch would be written into a picker
     * that is about to be thrown away. */
    if (preset.archetype && preset.archetype !== CC.Controls.get("archetype") &&
        !CC.Controls.isLocked("archetype")) {
      CC.Controls.set("archetype", preset.archetype);
      written.push("archetype");
      if (CC.TraitPicker) CC.TraitPicker.setArchetype(preset.archetype);
    }

    for (var key in preset.set) {
      if (!Object.prototype.hasOwnProperty.call(preset.set, key)) continue;
      /* THE LOCK CHECK. One line, and it is the whole of behaviour 1. */
      if (CC.Controls.isLocked(key)) continue;
      CC.Controls.set(key, preset.set[key]);
      written.push(key);
    }

    /* Traits go through the picker's existing tri-state rather than a second
     * mechanism, so the interface shows what the preset asked for and the user
     * can immediately untick it. */
    if (CC.TraitPicker) {
      CC.TraitPicker.setExcluded(preset.traitsOff || []);
      CC.TraitPicker.setSelection(preset.traits || []);
    }

    /* Deliberately NOT written: the seed. Behaviour 2. */

    lastApplied = id;
    markApplied(id);
    if (onApply) onApply(id, written);
    return written;
  }

  /* A transient highlight, not a stored selection — behaviour 3. It says "that
   * is the button you just pressed", which is useful, and stops short of
   * claiming the body is still that preset once a slider moves. */
  function markApplied(id) {
    if (!host) return;
    var cards = host.querySelectorAll(".preset-card");
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("applied", cards[i].getAttribute("data-preset") === id);
    }
  }

  function setArchetype(a) {
    archetypeId = a;
    build();
  }

  function init(el, changed) {
    host = el;
    onApply = changed;
    build();
  }

  return {
    init: init,
    build: build,
    apply: apply,
    setArchetype: setArchetype
  };
})();
