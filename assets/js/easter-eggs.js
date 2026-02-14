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
    // If this looping sequence is already playing, stop it
    if (seq.loop && activeAudio && seq._playing) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
      seq._playing = false;
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
    seq._playing = true;

    audio.addEventListener("ended", function () {
      if (!seq.loop) {
        activeAudio = null;
        seq._playing = false;
      }
    });

    audio.play().catch(function () {
      seq._playing = false;
      activeAudio = null;
    });
  }

  document.addEventListener("keydown", onKeyDown);
})();
