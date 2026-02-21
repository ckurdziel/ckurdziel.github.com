(function () {
  "use strict";

  // Two panes: sidebar (left) and content (right)
  var panes = { sidebar: [], content: [] };
  var activePane = "sidebar";
  var indices = { sidebar: -1, content: -1 };

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
    // Sidebar pane: nav links + icon links
    panes.sidebar = [];
    var navLinks = document.getElementById("sidebar-nav-links");
    var iconLinks = document.getElementById("sidebar-icon-links");

    if (navLinks) {
      var navAnchors = navLinks.querySelectorAll("a");
      for (var i = 0; i < navAnchors.length; i++) {
        panes.sidebar.push(navAnchors[i]);
      }
    }
    if (iconLinks) {
      var iconAnchors = iconLinks.querySelectorAll("a");
      for (var j = 0; j < iconAnchors.length; j++) {
        panes.sidebar.push(iconAnchors[j]);
      }
    }

    // Content pane: post list links
    panes.content = [];
    var postList = document.querySelector(".post-list");
    if (postList) {
      var postAnchors = postList.querySelectorAll("li > article > a, li > article a:first-of-type");
      for (var k = 0; k < postAnchors.length; k++) {
        panes.content.push(postAnchors[k]);
      }
    }

    // Set sidebar initial index to active page, or -1
    indices.sidebar = -1;
    for (var m = 0; m < panes.sidebar.length; m++) {
      if (panes.sidebar[m].classList.contains("active")) {
        indices.sidebar = m;
        break;
      }
    }

    indices.content = -1;

    // Start on sidebar if there's an active item, otherwise no highlight
    if (indices.sidebar >= 0) {
      activePane = "sidebar";
      updateHighlight();
    }

    document.addEventListener("keydown", onKeyDown);
  }

  function clearAllHighlights() {
    var all = panes.sidebar.concat(panes.content);
    for (var i = 0; i < all.length; i++) {
      all[i].classList.remove("highlighted");
    }
  }

  function updateHighlight() {
    clearAllHighlights();
    var items = panes[activePane];
    var idx = indices[activePane];
    if (idx >= 0 && items[idx]) {
      items[idx].classList.add("highlighted");
      items[idx].scrollIntoView({ block: "nearest" });
      items[idx].dispatchEvent(new CustomEvent("nav-highlight", { bubbles: true }));
    }
  }

  function onKeyDown(e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    var key = e.key;
    var items = panes[activePane];

    if (key === "ArrowDown" || key === "j") {
      e.preventDefault();
      if (items.length === 0) return;
      if (indices[activePane] < 0) {
        indices[activePane] = 0;
      } else {
        indices[activePane] = (indices[activePane] + 1) % items.length;
      }
      updateHighlight();

    } else if (key === "ArrowUp" || key === "k") {
      e.preventDefault();
      if (items.length === 0) return;
      if (indices[activePane] < 0) {
        indices[activePane] = items.length - 1;
      } else {
        indices[activePane] = (indices[activePane] - 1 + items.length) % items.length;
      }
      updateHighlight();

    } else if (key === "ArrowRight" || key === "l") {
      if (panes.content.length > 0 && activePane === "sidebar") {
        e.preventDefault();
        activePane = "content";
        if (indices.content < 0) indices.content = 0;
        updateHighlight();
      }

    } else if (key === "ArrowLeft" || key === "h") {
      if (activePane === "content") {
        e.preventDefault();
        activePane = "sidebar";
        if (indices.sidebar < 0) indices.sidebar = 0;
        updateHighlight();
      }

    } else if (key === "Enter") {
      var idx = indices[activePane];
      if (items[idx]) {
        e.preventDefault();
        items[idx].click();
      }
    }
  }

  window.reinitTerminalNav = function () {
    // Re-scan panes but don't re-add the keydown listener
    panes.sidebar = [];
    panes.content = [];

    var navLinks = document.getElementById("sidebar-nav-links");
    var iconLinks = document.getElementById("sidebar-icon-links");

    if (navLinks) {
      var navAnchors = navLinks.querySelectorAll("a");
      for (var i = 0; i < navAnchors.length; i++) {
        panes.sidebar.push(navAnchors[i]);
      }
    }
    if (iconLinks) {
      var iconAnchors = iconLinks.querySelectorAll("a");
      for (var j = 0; j < iconAnchors.length; j++) {
        panes.sidebar.push(iconAnchors[j]);
      }
    }

    var postList = document.querySelector(".post-list");
    if (postList) {
      var postAnchors = postList.querySelectorAll("li > article > a, li > article a:first-of-type");
      for (var k = 0; k < postAnchors.length; k++) {
        panes.content.push(postAnchors[k]);
      }
    }

    indices.sidebar = -1;
    for (var m = 0; m < panes.sidebar.length; m++) {
      if (panes.sidebar[m].classList.contains("active")) {
        indices.sidebar = m;
        break;
      }
    }
    indices.content = -1;

    if (indices.sidebar >= 0) {
      activePane = "sidebar";
      updateHighlight();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
