/* The help / welcome modal.
 *
 * A big wide overlay rather than a narrow popup: it carries the app's name,
 * what it is for, how to drive it, and the Reactorcore links, and every one of
 * those reads better with room. It is sized off the viewport rather than off a
 * fixed pixel width so a large screen gets a large panel.
 *
 * The words live in index.html. This file is the shell: open, close, focus,
 * escape, and the keyboard list. */

var CC = CC || {};

CC.Help = (function () {
  "use strict";

  var overlay = null;
  var panel = null;
  var opener = null;   /* who to hand focus back to on close */

  function init() {
    overlay = document.getElementById("help-overlay");
    panel = document.getElementById("help-panel");
    if (!overlay) return;

    var btn = document.getElementById("help-btn");
    if (btn) btn.addEventListener("click", function () { open(btn); });

    var closeBtn = document.getElementById("help-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    var dismiss = document.getElementById("help-dismiss");
    if (dismiss) dismiss.addEventListener("click", close);

    /* Backdrop click closes; a click that lands inside the panel does not. */
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    /* Escape is bound on the overlay's own keydown rather than on the
     * document, so it cannot compete with the keyboard map (js/ui/keys.js) —
     * the modal takes focus when it opens, so the event arrives here. */
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") trapTab(e);
    });
  }

  /* Keep Tab inside the dialog while it is open. Without this, tabbing walks
   * out into the settings panel behind the backdrop, where nothing is
   * clickable — focus would be somewhere the user cannot see. */
  function trapTab(e) {
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function focusable() {
    if (!panel) return [];
    return [].slice.call(panel.querySelectorAll(
      "a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  /* The shortcut list is BUILT FROM THE KEYBOARD MAP's own table (D288), so
   * it cannot drift from the bindings: there is no second copy to forget.
   * Rebuilt on every open, which costs nothing and needs no load order. */
  function renderKeys() {
    var ul = document.getElementById("help-keys");
    if (!ul || !CC.Keys) return;
    ul.textContent = "";
    CC.Keys.list().forEach(function (row) {
      var li = document.createElement("li");
      row.show.forEach(function (k, i) {
        if (i > 0 && row.join) li.appendChild(document.createTextNode(row.join));
        var kbd = document.createElement("kbd");
        kbd.textContent = k;
        li.appendChild(kbd);
      });
      var span = document.createElement("span");
      span.textContent = row.label;
      li.appendChild(span);
      ul.appendChild(li);
    });
  }

  /* `section` "keys" is the ? key: the same modal, scrolled to the list.
   * Focus still goes to the close button, so Tab and Esc behave as ever. */
  function open(from, section) {
    if (!overlay) return;
    opener = from || document.activeElement;
    renderKeys();
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    var closeBtn = document.getElementById("help-close");
    if (closeBtn && closeBtn.focus) closeBtn.focus();
    var title = section === "keys" && document.getElementById("help-keys-title");
    if (title && title.scrollIntoView) title.scrollIntoView({ block: "nearest" });
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  function isOpen() { return !!overlay && !overlay.hidden; }

  return { init: init, open: open, close: close, isOpen: isOpen };
})();
