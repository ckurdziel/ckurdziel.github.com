(function () {
  "use strict";

  function isInternalLink(a) {
    if (!a || !a.href) return false;
    if (a.target === "_blank") return false;
    try {
      var url = new URL(a.href, window.location.origin);
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function swap(html, url) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var newContainer = doc.querySelector(".container");
    var currentContainer = document.querySelector(".container");
    if (!newContainer || !currentContainer) return false;

    currentContainer.innerHTML = newContainer.innerHTML;
    document.title = doc.title || "";

    // Update sidebar active class
    var sidebarLinks = document.querySelectorAll("#sidebar-nav-links a");
    var pathname = new URL(url, window.location.origin).pathname;
    for (var i = 0; i < sidebarLinks.length; i++) {
      var linkPath = new URL(sidebarLinks[i].href, window.location.origin).pathname;
      if (linkPath === pathname) {
        sidebarLinks[i].classList.add("active");
      } else {
        sidebarLinks[i].classList.remove("active");
      }
    }

    currentContainer.scrollTop = 0;

    if (window.reinitTerminalNav) {
      window.reinitTerminalNav();
    }

    return true;
  }

  function navigate(href, pushState) {
    fetch(href)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (html) {
        if (swap(html, href) && pushState) {
          history.pushState({}, "", href);
        }
      })
      .catch(function () {
        window.location.href = href;
      });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (!isInternalLink(a)) return;
    e.preventDefault();
    navigate(a.href, true);
  });

  window.addEventListener("popstate", function () {
    navigate(window.location.href, false);
  });
})();
