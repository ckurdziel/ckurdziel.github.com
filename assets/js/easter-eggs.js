(function () {
  "use strict";

  var sequences = [
    {
      name: "idkfa",
      keys: ["i", "d", "k", "f", "a"],
      audio: "/assets/audio/doom.ogg",
      loop: true
    },
    {
      name: "guile",
      keys: ["ArrowLeft", "ArrowRight", "a"],
      audio: "/assets/audio/Guile-Theme.mp3",
      sfx: "/assets/audio/guile-sonic-boom.mp3",
      loop: true
    },
    {
      name: "guile",
      keys: ["ArrowLeft", "ArrowRight", "b"],
      audio: "/assets/audio/Guile-Theme.mp3",
      sfx: "/assets/audio/guile-sonic-boom.mp3",
      loop: true
    },
    {
      name: "metroid",
      keys: ["j", "u", "s", "t", "i", "n", "b", "a", "i", "l", "e", "y"],
      audio: "/assets/audio/kraid.mp3",
      sfx: "/assets/audio/metroid.mp3",
      loop: true
    },
    {
      name: "warcraft",
      keys: ["i", "t", " ", "i", "s", " ", "a", " ", "g", "o", "o", "d", " ", "d", "a", "y", " ", "t", "o", " ", "d", "i", "e"],
      audio: "/assets/audio/orc2.mp3",
      sfx: "/assets/audio/zugzug.wav",
      loop: true
    },
    {
      name: "konami",
      keys: [
        "ArrowUp", "ArrowUp",
        "ArrowDown", "ArrowDown",
        "ArrowLeft", "ArrowRight",
        "ArrowLeft", "ArrowRight",
        "b", "a"
      ],
      audio: "/assets/audio/konami.mp3",
      loop: false
    },
    {
      name: "blood",
      keys: ["s", "t", "a", "r", "s", "p", "a", "w", "n"],
      loop: true
    }
  ];

  var buffers = [];
  var activeAudio = null;
  var activeName = null;

  for (var i = 0; i < sequences.length; i++) {
    buffers.push(0);
  }

  function resetBuffer(idx) {
    buffers[idx] = 0;
  }

  function onKeyDown(e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    var key = e.key;

    for (var i = 0; i < sequences.length; i++) {
      var seq = sequences[i];
      var pos = buffers[i];

      if (key === seq.keys[pos]) {
        buffers[i]++;
        if (buffers[i] === seq.keys.length) {
          buffers[i] = 0;
          // Suppress if a longer sequence is >50% complete
          var dominated = false;
          for (var j = 0; j < sequences.length; j++) {
            if (j !== i && sequences[j].keys.length > seq.keys.length &&
                buffers[j] / sequences[j].keys.length > 0.5) {
              dominated = true;
              break;
            }
          }
          if (!dominated) trigger(seq);
        }
      } else if (key === seq.keys[0]) {
        buffers[i] = 1;
      } else {
        buffers[i] = 0;
      }
    }
  }

  function trigger(seq) {
    // If a looping sequence with the same name is already active, stop it
    if (seq.loop && activeName === seq.name) {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio = null;
      }
      activeName = null;
      document.dispatchEvent(new CustomEvent("easter-egg", { detail: { name: seq.name, playing: false } }));
      return;
    }

    // Stop any currently playing audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }

    if (seq.audio) {
      var audio = new Audio(seq.audio);
      audio.loop = seq.loop;
      audio.volume = 0.5;
      activeAudio = audio;
      activeName = seq.name;

      audio.addEventListener("ended", function () {
        if (!seq.loop) { activeAudio = null; activeName = null; }
      });

      // Play optional sound effect before the main audio
      if (seq.sfx) {
        var sfx = new Audio(seq.sfx);
        sfx.volume = 0.6;
        sfx.play().catch(function () {});
        sfx.addEventListener("ended", function () {
          audio.play().catch(function () { activeAudio = null; activeName = null; });
        });
      } else {
        audio.play().catch(function () { activeAudio = null; activeName = null; });
      }
    } else {
      activeName = seq.name;
    }

    document.dispatchEvent(new CustomEvent("easter-egg", { detail: { name: seq.name, playing: true } }));
  }

  document.addEventListener("keydown", onKeyDown);

  var themeMap = {
    idkfa: "theme-doom",
    guile: "theme-guile",
    metroid: "theme-metroid",
    warcraft: "theme-warcraft",
    konami: "theme-konami",
    blood: "theme-blood"
  };

  var themeNames = {
    "theme-doom": "DOOM",
    "theme-guile": "GUILE",
    "theme-metroid": "METROID",
    "theme-warcraft": "WARCRAFT",
    "theme-konami": "KONAMI",
    "theme-blood": "STARSPAWN"
  };

  var indicator = document.createElement("span");
  indicator.className = "theme-indicator";
  indicator.style.display = "none";
  indicator.title = "click to clear theme";
  var hintBar = document.querySelector(".sidebar-hint");
  if (hintBar) hintBar.appendChild(indicator);

  function updateIndicator(cls) {
    if (!cls) {
      indicator.style.display = "none";
      indicator.textContent = "";
    } else {
      indicator.style.display = "";
      indicator.textContent = themeNames[cls] || cls;
    }
  }

  indicator.addEventListener("click", function () {
    var currentName = activeName;
    Object.keys(themeMap).forEach(function (k) {
      document.body.classList.remove(themeMap[k]);
    });
    localStorage.removeItem("easter-egg-theme");
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    activeName = null;
    updateIndicator(null);
    // Dispatch deactivation so JS effects (starfield, pixel mode, etc.) clean up
    if (currentName) {
      document.dispatchEvent(new CustomEvent("easter-egg", { detail: { name: currentName, playing: false } }));
    }
  });

  // Restore saved theme on page load
  var savedTheme = localStorage.getItem("easter-egg-theme");
  if (savedTheme) {
    document.body.classList.add(savedTheme);
    updateIndicator(savedTheme);
    // Find the egg name for this theme and dispatch event so JS effects (starfield, etc.) activate
    var savedName = null;
    Object.keys(themeMap).forEach(function (k) {
      if (themeMap[k] === savedTheme) savedName = k;
    });
    if (savedName) {
      activeName = savedName;
      document.dispatchEvent(new CustomEvent("easter-egg", { detail: { name: savedName, playing: true, restored: true } }));
    }
  }

  document.addEventListener("easter-egg", function (e) {
    var cls = themeMap[e.detail.name];
    if (!cls) return;
    // Remove all theme classes first
    Object.keys(themeMap).forEach(function (k) {
      document.body.classList.remove(themeMap[k]);
    });
    // Add theme if activating, save to localStorage
    if (e.detail.playing && !e.detail.restored) {
      document.body.classList.add(cls);
      localStorage.setItem("easter-egg-theme", cls);
      updateIndicator(cls);
      // Re-trigger CRT power-on animation
      document.body.classList.remove("crt-on");
      void document.body.offsetWidth; // force reflow to restart animation
      document.body.classList.add("crt-on");
    } else if (e.detail.playing) {
      document.body.classList.add(cls);
      localStorage.setItem("easter-egg-theme", cls);
      updateIndicator(cls);
    } else {
      localStorage.removeItem("easter-egg-theme");
      updateIndicator(null);
    }
  });
})();
