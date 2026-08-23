/* Accordion sections for the settings panel.
 *
 * Multi-open: any number of sections may be expanded at once. Each open
 * section scrolls inside itself, so the panel never pushes Randomize and
 * Export off the page — that was a v2 failure the layout is designed against.
 * Those two buttons live outside the accordion entirely; see index.html. */

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
  }

  function syncAria(section, head, body) {
    var open = section.classList.contains("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    body.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function toggle(section, force) {
    var open = force === undefined ? !section.classList.contains("open") : !!force;
    section.classList.toggle("open", open);
    var head = section.querySelector(".section-head");
    var body = section.querySelector(".section-body");
    if (head && body) syncAria(section, head, body);
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

  return {
    init: init,
    toggle: toggle,
    toggleByIndex: toggleByIndex,
    openByName: openByName
  };
})();
