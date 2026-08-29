/* The trait picker — a filtered checkbox list built from data/traits.js.
 *
 * The list is GENERATED, never authored in HTML, so adding a trait stays a
 * single edit to data/traits.js. Two rules from TRAIT-SYSTEM.md shape it:
 *
 *   INCOMPATIBLE TRAITS ARE HIDDEN, NOT GREYED. A long list of options you
 *   cannot pick is noise. Selecting one trait may therefore make others
 *   disappear, which is intended.
 *
 *   EXCLUSIONS APPLY IMMEDIATELY. The list is rebuilt on every change rather
 *   than filtered once at startup, because selecting a trait can exclude
 *   others and a stale list would let an impossible pair be chosen.
 *
 * Selection state lives here rather than in the DOM, so a trait hidden by an
 * exclusion is REMEMBERED: unticking the trait that excluded it brings it back
 * still ticked, instead of silently losing the user's choice. */

var CC = CC || {};

CC.TraitPicker = (function () {
  "use strict";

  var host = null;
  var onChange = null;
  var selected = {};      /* id -> true, including currently-hidden ones */
  var banned = {};        /* id -> true: never rolled by Randomize */
  var archetypeId = "planet";

  /* Category order and labels for the grouped list. Traits declare their group
   * through `tags`; the first tag that matches a known group wins. */
  /* The picker's sections. A trait lands in the first group whose id appears
   * in its `tags`, so ORDER IS PRECEDENCE — `atmospheric` sits above
   * `interior` because a storm belt tagged both belongs under weather.
   *
   * A tag with no group here falls through to "Interior" silently, which is
   * how `atmospheric` and `artificial` would have been swallowed when the
   * gaseous traits landed: the traits worked and the picker put a Great Storm
   * under Interior. Adding a family means checking this list. */
  var GROUPS = [
    { id: "atmospheric", label: "Weather" },
    { id: "artificial",  label: "Built" },
    { id: "interior",    label: "Interior" },
    { id: "orbital",     label: "Orbital" },
    { id: "damage",      label: "Damage" }
  ];

  function groupOf(trait) {
    var tags = trait.tags || [];
    for (var g = 0; g < GROUPS.length; g++) {
      if (tags.indexOf(GROUPS[g].id) >= 0) return GROUPS[g].id;
    }
    return "interior";
  }

  /* Whether `trait` can be added to the current selection.
   *
   * Exclusion is symmetric — declared on either side is enough — so a pair
   * only needs recording once, and the same test serves the picker and the
   * roller in gen/traitroll.js. */
  function compatible(trait, chosenIds) {
    for (var i = 0; i < chosenIds.length; i++) {
      if (chosenIds[i] === trait.id) continue;
      var other = CC.Traits.get(chosenIds[i]);
      if (!other) continue;
      if ((trait.excludes || []).indexOf(other.id) >= 0) return false;
      if ((other.excludes || []).indexOf(trait.id) >= 0) return false;
    }
    return true;
  }

  function chosenIds() {
    var out = [];
    for (var id in selected) {
      if (Object.prototype.hasOwnProperty.call(selected, id) && selected[id]) {
        out.push(id);
      }
    }
    return out;
  }

  /* Descriptions for the picker's tooltips: what the trait changes VISUALLY,
   * which is what the user is choosing between. Kept here rather than in
   * data/traits.js because it is UI copy, not generation data. */
  var BLURB = {
    "mineral-veins": "Branching bright veins threading through the mantle.",
    "ore-deposits": "Clustered pockets of valuable rock in the crust.",
    "void-pockets": "Dark cavities and empty space inside the crust.",
    "magma-chambers": "Glowing pockets of melt high in the mantle, pushing toward the surface.",
    "metal-rich": "Bright metallic flecks scattered through the whole interior.",
    "ring-system": "Bands of orbiting material passing behind and in front of the body.",
    "debris-belt": "A scattered field of rubble and fragments in orbit.",
    "cratered": "Impact scars across the surface, in every size.",
    "impact-basin": "One to five enormous craters, deep enough to show in the crust."
  };

  function build() {
    if (!host) return;

    var archetype = CC.Archetypes.get(archetypeId);
    var pool = CC.Traits.eligible(archetype);
    var chosen = chosenIds();

    host.innerHTML = "";

    for (var g = 0; g < GROUPS.length; g++) {
      var group = GROUPS[g];
      var rows = [];

      for (var i = 0; i < pool.length; i++) {
        var t = pool[i];
        if (groupOf(t) !== group.id) continue;

        /* Hidden unless it is either already chosen or still addable. */
        var isOn = !!selected[t.id];
        if (!isOn && !compatible(t, chosen)) continue;

        rows.push(t);
      }

      if (!rows.length) continue;

      var head = document.createElement("div");
      head.className = "trait-group";
      head.textContent = group.label;
      host.appendChild(head);

      for (i = 0; i < rows.length; i++) {
        host.appendChild(rowFor(rows[i]));
      }
    }
  }

  function rowFor(trait) {
    var row = document.createElement("label");
    row.className = "trait-row";
    row.title = BLURB[trait.id] || trait.label;

    var box = document.createElement("input");
    box.type = "checkbox";
    box.id = "trait-" + trait.id;
    box.checked = !!selected[trait.id];

    box.addEventListener("change", function () {
      selected[trait.id] = box.checked;
      /* Ticking a trait un-bans it: "give me this" and "never give me this"
       * are contradictory, and the click the user just made is the newer
       * statement of intent. */
      if (box.checked) banned[trait.id] = false;
      /* Rebuild before notifying: an exclusion must take effect in the list
       * at the same moment it takes effect in the render. */
      build();
      if (onChange) onChange();
    });

    var name = document.createElement("span");
    name.className = "trait-name";
    name.textContent = trait.label;

    row.appendChild(box);
    row.appendChild(name);

    /* THE EXCLUDE TOGGLE — a third state, not a lock.
     *
     * A lock means "keep this value"; what this says is "never pick this",
     * which is a genuinely different thing and needs its own control. So a
     * trait row is TRI-STATE: ticked forces it on, X bans it from the roll,
     * and neither leaves it free to be rolled. */
    var ban = document.createElement("button");
    ban.type = "button";
    ban.className = "trait-ban" + (banned[trait.id] ? " on" : "");
    ban.textContent = "×";
    ban.title = banned[trait.id]
      ? "Excluded from Randomize. Click to allow it again."
      : "Exclude this trait from Randomize.";
    ban.setAttribute("aria-pressed", banned[trait.id] ? "true" : "false");
    ban.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();      /* the row is a <label>; don't toggle the box */
      banned[trait.id] = !banned[trait.id];
      /* Banning a trait unticks it, for the same reason ticking un-bans. */
      if (banned[trait.id]) selected[trait.id] = false;
      build();
      if (onChange) onChange();
    });
    row.appendChild(ban);

    return row;
  }

  /* ---- public ----------------------------------------------------------- */

  function init(hostEl, changeHandler) {
    host = hostEl;
    onChange = changeHandler;
    build();
  }

  function setArchetype(id) {
    if (archetypeId === id) return;
    archetypeId = id;
    /* Selections that the new archetype cannot carry are dropped, so a trait
     * cannot survive an archetype change into a body that has no place for
     * it. gen/traitroll.js re-checks anyway; this keeps the UI honest. */
    var pool = CC.Traits.eligible(CC.Archetypes.get(id));
    var ok = {};
    for (var i = 0; i < pool.length; i++) ok[pool[i].id] = true;
    for (var s in selected) {
      if (Object.prototype.hasOwnProperty.call(selected, s) && !ok[s]) {
        selected[s] = false;
      }
    }
    build();
  }

  /* The selection, as the list gen/traitroll.js expects. Returns null when
   * nothing is ticked, which is what tells the pipeline to ROLL traits rather
   * than honour an empty explicit selection — "I have chosen none" and "I have
   * chosen nothing yet" are different states and only the first should
   * produce a bare body. */
  function selection() {
    var out = chosenIds();
    return out.length ? out : null;
  }

  /* Traits the user has excluded from the roll. Null when none, so the roller
   * can skip the check entirely on the common path. */
  function excluded() {
    var out = [];
    for (var id in banned) {
      if (Object.prototype.hasOwnProperty.call(banned, id) && banned[id]) {
        out.push(id);
      }
    }
    return out.length ? out : null;
  }

  /* Write a selection in — used by Randomize and Re-roll traits, so the picker
   * always shows what was actually generated rather than drifting from it. */
  function setSelection(ids) {
    selected = {};
    for (var i = 0; i < (ids || []).length; i++) selected[ids[i]] = true;
    build();
  }

  /* Write the exclusions in — used by a preset, which may want to bar a trait
   * that would fight what it is trying to show. Deliberately REPLACES rather
   * than merges: applying a preset twice must give the same picker state as
   * applying it once, and a merge would accumulate bans nothing ever cleared. */
  function setExcluded(ids) {
    banned = {};
    for (var i = 0; i < (ids || []).length; i++) banned[ids[i]] = true;
    build();
  }

  /* Clears the forced selection only. EXCLUSIONS SURVIVE, which is the whole
   * point of them: "never roll this" is a standing instruction, not a one-off,
   * so Randomize must not quietly forget it. */
  function clear() { selected = {}; build(); }

  return {
    init: init,
    build: build,
    setArchetype: setArchetype,
    selection: selection,
    excluded: excluded,
    setSelection: setSelection,
    setExcluded: setExcluded,
    clear: clear
  };
})();
