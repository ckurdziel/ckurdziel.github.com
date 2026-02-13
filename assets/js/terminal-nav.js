(function () {
  "use strict";

  var items = [];
  var currentIndex = 0;

  function isExternal(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      return url.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function init() {
    var navLinks = document.getElementById("sidebar-nav-links");
    var iconLinks = document.getElementById("sidebar-icon-links");

    items = [];

    // Collect nav links
    if (navLinks) {
      var navAnchors = navLinks.querySelectorAll("a");
      for (var i = 0; i < navAnchors.length; i++) {
        navAnchors[i].setAttribute("data-nav-item", "");
        items.push(navAnchors[i]);
      }
    }

    // Collect external/icon links
    if (iconLinks) {
      var iconAnchors = iconLinks.querySelectorAll("a");
      for (var j = 0; j < iconAnchors.length; j++) {
        iconAnchors[j].setAttribute("data-nav-item", "");
        items.push(iconAnchors[j]);
      }
    }

    if (items.length === 0) return;

    // Set initial index to active page, or -1 (no highlight)
    currentIndex = -1;
    for (var k = 0; k < items.length; k++) {
      if (items[k].classList.contains("active")) {
        currentIndex = k;
        break;
      }
    }

    if (currentIndex >= 0) {
      updateHighlight();
    }
    document.addEventListener("keydown", onKeyDown);
  }

  function updateHighlight() {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("highlighted");
    }
    if (items[currentIndex]) {
      items[currentIndex].classList.add("highlighted");
      items[currentIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function onKeyDown(e) {
    // Don't capture when typing in inputs
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    var key = e.key;

    if (key === "ArrowDown" || key === "j") {
      e.preventDefault();
      if (currentIndex < 0) {
        currentIndex = 0;
      } else {
        currentIndex = (currentIndex + 1) % items.length;
      }
      updateHighlight();
    } else if (key === "ArrowUp" || key === "k") {
      e.preventDefault();
      if (currentIndex < 0) {
        currentIndex = items.length - 1;
      } else {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
      }
      updateHighlight();
    } else if (key === "Enter") {
      var href = items[currentIndex] && items[currentIndex].getAttribute("href");
      if (href) {
        e.preventDefault();
        if (isExternal(href)) {
          window.open(href, "_blank", "noopener");
        } else {
          window.location.href = href;
        }
      }
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
