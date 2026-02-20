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
          trigger(seq);
        }
      } else if (key === seq.keys[0]) {
        buffers[i] = 1;
      } else {
        buffers[i] = 0;
      }
    }
  }

  function trigger(seq) {
    // If a looping sequence with the same name is already playing, stop it
    if (seq.loop && activeAudio && activeName === seq.name) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
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

    document.dispatchEvent(new CustomEvent("easter-egg", { detail: { name: seq.name, playing: true } }));
  }

  document.addEventListener("keydown", onKeyDown);
})();
