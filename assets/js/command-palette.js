(function () {
  "use strict";

  var data = null;
  var overlay = null;
  var input = null;
  var resultsList = null;
  var selectedIndex = -1;
  var visible = [];
  var isOpen = false;

  // --- Fuzzy matching ---

  function fuzzyScore(query, text) {
    if (!query || !text) return 0;
    var q = query.toLowerCase();
    var t = text.toLowerCase();

    // Exact substring match — high score
    var subIdx = t.indexOf(q);
    if (subIdx !== -1) {
      // Bonus for match at start of word
      var bonus = (subIdx === 0 || t[subIdx - 1] === " " || t[subIdx - 1] === "/") ? 20 : 0;
      return 100 + bonus + (q.length / t.length) * 30;
    }

    // Subsequence match — scored by density
    var qi = 0;
    var firstMatch = -1;
    var lastMatch = -1;
    for (var ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        if (firstMatch === -1) firstMatch = ti;
        lastMatch = ti;
        qi++;
      }
    }
    if (qi < q.length) return 0; // not a full subsequence

    var span = lastMatch - firstMatch + 1;
    var density = q.length / span;
    return 40 * density + (q.length / t.length) * 10;
  }

  function scoreItem(query, item) {
    var titleScore = fuzzyScore(query, item.title);
    var descScore = fuzzyScore(query, item.description) * 0.6;
    var urlScore = fuzzyScore(query, item.url) * 0.4;
    return Math.max(titleScore, descScore, urlScore);
  }

  // --- Highlight matched chars ---

  function highlightMatch(query, text) {
    if (!query || !text) return escapeHtml(text || "");
    var q = query.toLowerCase();
    var t = text.toLowerCase();

    // Try substring first
    var subIdx = t.indexOf(q);
    if (subIdx !== -1) {
      return escapeHtml(text.substring(0, subIdx)) +
        '<span class="cmd-palette-match">' + escapeHtml(text.substring(subIdx, subIdx + q.length)) + '</span>' +
        escapeHtml(text.substring(subIdx + q.length));
    }

    // Subsequence
    var result = "";
    var qi = 0;
    for (var i = 0; i < text.length; i++) {
      if (qi < q.length && t[i] === q[qi]) {
        result += '<span class="cmd-palette-match">' + escapeHtml(text[i]) + '</span>';
        qi++;
      } else {
        result += escapeHtml(text[i]);
      }
    }
    return result;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // --- DOM ---

  function buildDom() {
    overlay = document.createElement("div");
    overlay.className = "cmd-palette-overlay";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    var dialog = document.createElement("div");
    dialog.className = "cmd-palette";

    var inputWrap = document.createElement("div");
    inputWrap.className = "cmd-palette-input-wrap";

    var prompt = document.createElement("span");
    prompt.className = "cmd-palette-prompt";
    prompt.textContent = "$ grep -i ";

    input = document.createElement("input");
    input.className = "cmd-palette-input";
    input.setAttribute("type", "text");
    input.setAttribute("placeholder", "search pages, posts, links...");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");

    inputWrap.appendChild(prompt);
    inputWrap.appendChild(input);

    resultsList = document.createElement("div");
    resultsList.className = "cmd-palette-results";

    var footer = document.createElement("div");
    footer.className = "cmd-palette-footer";
    footer.innerHTML = "<span>\u2191\u2193 navigate</span><span>\u23CE open</span><span>esc close</span>";

    dialog.appendChild(inputWrap);
    dialog.appendChild(resultsList);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onInputKeydown);
  }

  // --- Search & render ---

  function onInput() {
    var query = input.value.trim();
    if (!query) {
      renderAll();
      return;
    }

    var scored = [];
    for (var i = 0; i < data.length; i++) {
      var s = scoreItem(query, data[i]);
      if (s > 0) scored.push({ item: data[i], score: s });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    scored = scored.slice(0, 8);

    // Group by type
    var groups = { page: [], post: [], link: [] };
    for (var j = 0; j < scored.length; j++) {
      var type = scored[j].item.type;
      if (groups[type]) groups[type].push(scored[j].item);
    }

    renderGroups(groups, query);
  }

  function renderAll() {
    if (!data) return;
    var groups = { page: [], post: [], link: [] };
    for (var i = 0; i < data.length; i++) {
      var type = data[i].type;
      if (groups[type]) groups[type].push(data[i]);
    }
    // Cap posts at 5 for the unfiltered view
    groups.post = groups.post.slice(0, 5);
    renderGroups(groups, "");
  }

  var groupLabels = {
    page: "[pages]",
    post: "[posts]",
    link: "[links]"
  };

  function renderGroups(groups, query) {
    resultsList.innerHTML = "";
    visible = [];
    selectedIndex = -1;

    var order = ["post", "link", "page"];
    var hasAny = false;

    for (var g = 0; g < order.length; g++) {
      var key = order[g];
      var items = groups[key];
      if (!items || items.length === 0) continue;
      hasAny = true;

      var label = document.createElement("div");
      label.className = "cmd-palette-group-label";
      label.textContent = groupLabels[key];
      resultsList.appendChild(label);

      for (var i = 0; i < items.length; i++) {
        var el = createItemEl(items[i], query);
        resultsList.appendChild(el);
        visible.push({ el: el, item: items[i] });
      }
    }

    if (!hasAny) {
      var empty = document.createElement("div");
      empty.className = "cmd-palette-empty";
      empty.textContent = "no matches found";
      resultsList.appendChild(empty);
    }

    if (visible.length > 0) {
      selectedIndex = 0;
      visible[0].el.classList.add("selected");
    }
  }

  function createItemEl(item, query) {
    var el = document.createElement("div");
    el.className = "cmd-palette-item";

    var indicator = document.createElement("span");
    indicator.className = "cmd-palette-indicator";
    indicator.textContent = ">";

    var title = document.createElement("span");
    title.className = "cmd-palette-item-title";
    title.innerHTML = highlightMatch(query, item.title);

    var desc = document.createElement("span");
    desc.className = "cmd-palette-item-desc";
    if (item.date) {
      desc.textContent = item.date;
    } else if (item.description) {
      desc.textContent = item.description;
    }

    el.appendChild(indicator);
    el.appendChild(title);
    el.appendChild(desc);

    el.addEventListener("click", function () {
      navigateTo(item.url);
    });

    return el;
  }

  // --- Navigation ---

  function navigateTo(url) {
    close();
    // Use a temporary anchor so pjax intercepts internal links
    var a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- Keyboard ---

  function onInputKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && visible[selectedIndex]) {
        navigateTo(visible[selectedIndex].item.url);
      }
    }
  }

  function moveSelection(dir) {
    if (visible.length === 0) return;
    if (selectedIndex >= 0) {
      visible[selectedIndex].el.classList.remove("selected");
    }
    selectedIndex += dir;
    if (selectedIndex < 0) selectedIndex = visible.length - 1;
    if (selectedIndex >= visible.length) selectedIndex = 0;
    visible[selectedIndex].el.classList.add("selected");
    visible[selectedIndex].el.scrollIntoView({ block: "nearest" });
  }

  // --- Open / Close ---

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (!overlay) buildDom();
    overlay.style.display = "flex";
    // Force reflow then add visible class for transition
    overlay.offsetHeight;
    overlay.classList.add("visible");
    input.value = "";

    if (data) {
      renderAll();
    } else {
      resultsList.innerHTML = '<div class="cmd-palette-empty">loading...</div>';
      loadData();
    }

    input.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("visible");
    setTimeout(function () {
      overlay.style.display = "none";
    }, 150);
  }

  // --- Data loading ---

  function loadData() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/search.json", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          data = JSON.parse(xhr.responseText);
          if (isOpen) renderAll();
        } catch (e) {
          data = [];
        }
      }
    };
    xhr.send();
  }

  // --- Global keyboard shortcut ---

  document.addEventListener("keydown", function (e) {
    // Cmd/Ctrl+K toggles the palette regardless of state
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      isOpen ? close() : open();
      return;
    }

    if (isOpen) return;

    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "/") {
      e.preventDefault();
      open();
    }
  });

  // Expose for external use if needed
  window.commandPalette = { open: open, close: close };
})();
