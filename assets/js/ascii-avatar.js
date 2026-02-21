(function () {
  // ── Minimal GIF frame decoder ──────────────────────────────────────

  function decodeGIF(buffer) {
    var bytes = new Uint8Array(buffer);
    var pos = 0;

    function u8() { return bytes[pos++]; }
    function u16() { var v = bytes[pos] | (bytes[pos + 1] << 8); pos += 2; return v; }
    function skip(n) { pos += n; }

    function readColorTable(size) {
      var ct = [];
      for (var i = 0; i < size; i++) ct.push([u8(), u8(), u8()]);
      return ct;
    }

    function skipSubBlocks() {
      while (true) { var n = u8(); if (!n) break; skip(n); }
    }

    // Header
    var sig = String.fromCharCode(u8(), u8(), u8(), u8(), u8(), u8());
    if (sig !== 'GIF89a' && sig !== 'GIF87a') return null;

    // Logical Screen Descriptor
    var width = u16(), height = u16(), packed = u8();
    skip(2);
    var gct = (packed >> 7) & 1 ? readColorTable(1 << ((packed & 7) + 1)) : null;

    var frames = [];
    var gce = null;

    while (pos < bytes.length) {
      var block = u8();

      if (block === 0x21) {
        var label = u8();
        if (label === 0xF9) {
          skip(1);
          var gcPacked = u8(), delay = u16(), ti = u8();
          skip(1);
          gce = { disposal: (gcPacked >> 2) & 7, transparentFlag: gcPacked & 1, transparentIndex: ti, delay: delay };
        } else {
          skipSubBlocks();
        }
      } else if (block === 0x2C) {
        var left = u16(), top = u16(), w = u16(), h = u16(), imgPacked = u8();
        var ct = (imgPacked >> 7) & 1 ? readColorTable(1 << ((imgPacked & 7) + 1)) : gct;
        var interlaced = (imgPacked >> 6) & 1;

        var minCodeSize = u8(), lzwData = [];
        while (true) { var n = u8(); if (!n) break; for (var k = 0; k < n; k++) lzwData.push(u8()); }

        var pixels = lzwDecode(minCodeSize, lzwData, w * h);
        if (interlaced) pixels = deinterlace(pixels, w, h);

        var patch = new Uint8ClampedArray(w * h * 4);
        var tIdx = gce && gce.transparentFlag ? gce.transparentIndex : -1;
        for (var p = 0; p < pixels.length; p++) {
          var ci = pixels[p], off = p * 4, c = ct[ci] || [0, 0, 0];
          patch[off] = c[0]; patch[off + 1] = c[1]; patch[off + 2] = c[2];
          patch[off + 3] = ci === tIdx ? 0 : 255;
        }

        frames.push({
          dims: { left: left, top: top, width: w, height: h },
          patch: patch,
          delay: gce ? gce.delay * 10 : 100
        });
        gce = null;
      } else if (block === 0x3B) {
        break;
      } else {
        skipSubBlocks();
      }
    }

    return { width: width, height: height, frames: frames };
  }

  function lzwDecode(minCodeSize, data, pixelCount) {
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;
    var codeSize, codeMask, table, nextTableIndex;
    var output = [], bitBuf = 0, bitCount = 0, dataPos = 0;

    function reset() {
      table = [];
      for (var i = 0; i < clearCode; i++) table[i] = [i];
      table[clearCode] = []; table[eoiCode] = [];
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
      nextTableIndex = eoiCode + 1;
    }

    function nextCode() {
      while (bitCount < codeSize) {
        if (dataPos >= data.length) return eoiCode;
        bitBuf |= data[dataPos++] << bitCount;
        bitCount += 8;
      }
      var code = bitBuf & codeMask;
      bitBuf >>= codeSize; bitCount -= codeSize;
      return code;
    }

    reset();
    var code = nextCode();
    if (code === clearCode) reset();
    var prevEntry = null;

    while (output.length < pixelCount) {
      code = nextCode();
      if (code === eoiCode || code < 0) break;
      if (code === clearCode) { reset(); prevEntry = null; continue; }

      var entry = (code < nextTableIndex && table[code])
        ? table[code]
        : (code === nextTableIndex && prevEntry) ? prevEntry.concat(prevEntry[0]) : null;
      if (!entry) break;

      for (var i = 0; i < entry.length && output.length < pixelCount; i++) output.push(entry[i]);
      if (prevEntry) {
        table[nextTableIndex++] = prevEntry.concat(entry[0]);
        if (nextTableIndex > codeMask && codeSize < 12) { codeSize++; codeMask = (1 << codeSize) - 1; }
      }
      prevEntry = entry;
    }
    return output;
  }

  function deinterlace(pixels, w, h) {
    var out = new Array(pixels.length);
    var passes = [[0, 8], [4, 8], [2, 4], [1, 2]], srcRow = 0;
    for (var p = 0; p < 4; p++)
      for (var y = passes[p][0]; y < h; y += passes[p][1])
        for (var x = 0; x < w; x++) out[y * w + x] = pixels[srcRow * w + x], srcRow += (x === w - 1 ? 1 : 0);
    return out;
  }

  // ── ASCII renderer ─────────────────────────────────────────────────

  var pre = document.querySelector('.ascii-avatar');
  var img = document.querySelector('.sidebar-avatar');
  var pixelCanvas = document.querySelector('.pixel-avatar');
  if (!pre || !img || !pixelCanvas) return;

  var wrap = pre.parentNode;
  var pixelCtx = pixelCanvas.getContext('2d');
  pixelCtx.imageSmoothingEnabled = false;

  var CHARS = '@%#*+=-:,. ';
  var COLS = 60, ROWS = 36;

  var sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = COLS; sampleCanvas.height = ROWS;
  var sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  var avatarUrl = img.getAttribute('data-src') || img.src;
  fetch(avatarUrl)
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (buff) {
      // Set the <img> src from the same fetched data (single network request)
      img.src = URL.createObjectURL(new Blob([buff]));
      var gif = decodeGIF(buff);
      if (!gif || !gif.frames.length) return;

      // Compositing canvas (full GIF resolution)
      var comp = document.createElement('canvas');
      comp.width = gif.width; comp.height = gif.height;
      var compCtx = comp.getContext('2d');

      // Reusable patch canvas
      var patch = document.createElement('canvas');
      var patchCtx = patch.getContext('2d');

      var frameIndex = 0;
      var crtFired = false;

      function renderFrame(frame) {
        compCtx.clearRect(0, 0, gif.width, gif.height);

        // Draw frame patch
        if (patch.width !== frame.dims.width || patch.height !== frame.dims.height) {
          patch.width = frame.dims.width; patch.height = frame.dims.height;
        }
        patchCtx.putImageData(
          new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height), 0, 0
        );
        compCtx.drawImage(patch, frame.dims.left, frame.dims.top);

        // Pixel canvas (IDKFA mode)
        pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
        pixelCtx.drawImage(comp, 0, 0, pixelCanvas.width, pixelCanvas.height);

        // Apply doom color palette when in IDKFA mode
        if (doomMode) {
          var pd = pixelCtx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
          var px = pd.data;
          for (var pi = 0; pi < px.length; pi += 4) {
            if (px[pi + 3] < 30) continue;
            var br = (px[pi] * 0.299 + px[pi + 1] * 0.587 + px[pi + 2] * 0.114) / 255;
            var r, g, b;
            if (br < 0.3) {
              // Deep shadow: near-black blue (#060D2E) → dark navy (#0D1B6B)
              var t = br / 0.3;
              r = 6 + t * (13 - 6) | 0;
              g = 13 + t * (27 - 13) | 0;
              b = 46 + t * (107 - 46) | 0;
            } else if (br < 0.55) {
              // Mid blue: dark navy (#0D1B6B) → steel blue (#2A4A9A)
              var t = (br - 0.3) / 0.25;
              r = 13 + t * (42 - 13) | 0;
              g = 27 + t * (74 - 27) | 0;
              b = 107 + t * (154 - 107) | 0;
            } else if (br < 0.7) {
              // Transition: steel blue (#2A4A9A) → doom red-orange (#C04010)
              var t = (br - 0.55) / 0.15;
              r = 42 + t * (192 - 42) | 0;
              g = 74 + t * (64 - 74) | 0;
              b = 154 + t * (16 - 154) | 0;
            } else {
              // Fire: doom orange (#C04010) → doom gold (#F5A623)
              var t = (br - 0.7) / 0.3;
              r = 192 + t * (245 - 192) | 0;
              g = 64 + t * (166 - 64) | 0;
              b = 16 + t * (35 - 16) | 0;
            }
            px[pi] = r; px[pi + 1] = g; px[pi + 2] = b;
          }
          pixelCtx.putImageData(pd, 0, 0);
        }

        // Apply nebula color palette when in Blood Incantation mode
        if (bloodMode) {
          var pd2 = pixelCtx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
          var px2 = pd2.data;
          for (var pi2 = 0; pi2 < px2.length; pi2 += 4) {
            if (px2[pi2 + 3] < 30) continue;
            var br2 = (px2[pi2] * 0.299 + px2[pi2 + 1] * 0.587 + px2[pi2 + 2] * 0.114) / 255;
            var r2, g2, b2;
            if (br2 < 0.25) {
              // Void black-blue: #08061A → #1A0A3E
              var t2 = br2 / 0.25;
              r2 = 8 + t2 * (26 - 8) | 0;
              g2 = 6 + t2 * (10 - 6) | 0;
              b2 = 26 + t2 * (62 - 26) | 0;
            } else if (br2 < 0.5) {
              // Deep purple: #1A0A3E → #6B1FA0
              var t2 = (br2 - 0.25) / 0.25;
              r2 = 26 + t2 * (107 - 26) | 0;
              g2 = 10 + t2 * (31 - 10) | 0;
              b2 = 62 + t2 * (160 - 62) | 0;
            } else if (br2 < 0.7) {
              // Nebula magenta: #6B1FA0 → #FF2975
              var t2 = (br2 - 0.5) / 0.2;
              r2 = 107 + t2 * (255 - 107) | 0;
              g2 = 31 + t2 * (41 - 31) | 0;
              b2 = 160 + t2 * (117 - 160) | 0;
            } else {
              // Cosmic hot white/cyan: #FF2975 → #E0C0FF
              var t2 = (br2 - 0.7) / 0.3;
              r2 = 255 + t2 * (224 - 255) | 0;
              g2 = 41 + t2 * (192 - 41) | 0;
              b2 = 117 + t2 * (255 - 117) | 0;
            }
            px2[pi2] = r2; px2[pi2 + 1] = g2; px2[pi2 + 2] = b2;
          }
          pixelCtx.putImageData(pd2, 0, 0);
        }

        // ASCII sampling
        sampleCtx.clearRect(0, 0, COLS, ROWS);
        sampleCtx.drawImage(comp, 0, 0, COLS, ROWS);
        var data = sampleCtx.getImageData(0, 0, COLS, ROWS).data;
        var text = '';

        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var i = (y * COLS + x) * 4;
            if (data[i + 3] < 30) { text += ' '; continue; }
            var brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
            text += CHARS[Math.floor((1 - brightness) * (CHARS.length - 1))];
          }
          text += '\n';
        }
        pre.textContent = text;

        if (!crtFired) {
          crtFired = true;
          var bootText = document.createElement('div');
          bootText.className = 'crt-boot-text';
          bootText.textContent = 'MAIN SCREEN TURN ON';
          document.body.appendChild(bootText);
          document.body.classList.add('crt-on');
          setTimeout(function () { bootText.remove(); }, 400);
        }
      }

      function tick() {
        var frame = gif.frames[frameIndex];
        renderFrame(frame);
        var delay = frame.delay || 100;
        frameIndex = (frameIndex + 1) % gif.frames.length;
        setTimeout(tick, delay < 20 ? 100 : delay);
      }

      tick();

      // ── IDKFA easter egg ─────────────────────────────────────────

      var doomMode = false;
      var bloodMode = false;
      var DEFAULT_CHARS = '@%#*+=-:,. ';
      var BLOOD_CHARS = '\u2588\u2593\u2592\u2591\u00B7 ';
      var corruptedElements = [];

      function createStarfield() {
        var el = document.createElement('div');
        el.className = 'starfield';

        // Layer 1: ~80 small stars, slow drift
        var layer1 = document.createElement('div');
        layer1.className = 'star-layer star-layer-1';
        var shadows1 = [];
        for (var s = 0; s < 80; s++) {
          var x = Math.random() * 100;
          var y = Math.random() * 200;
          var opacity = 0.4 + Math.random() * 0.6;
          shadows1.push(x + 'vw ' + y + 'vh 0 0 rgba(255,255,255,' + opacity.toFixed(2) + ')');
        }
        layer1.style.boxShadow = shadows1.join(',');
        el.appendChild(layer1);

        // Layer 2: ~30 larger stars, slightly faster, purple/pink tint
        var layer2 = document.createElement('div');
        layer2.className = 'star-layer star-layer-2';
        var shadows2 = [];
        var tints = [
          [200, 160, 255],
          [255, 41, 117],
          [176, 68, 255],
          [255, 255, 255]
        ];
        for (var s2 = 0; s2 < 30; s2++) {
          var x2 = Math.random() * 100;
          var y2 = Math.random() * 200;
          var tint = tints[Math.floor(Math.random() * tints.length)];
          var opacity2 = 0.5 + Math.random() * 0.5;
          var size = (1 + Math.random()).toFixed(1);
          shadows2.push(x2 + 'vw ' + y2 + 'vh 0 ' + size + 'px rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',' + opacity2.toFixed(2) + ')');
        }
        layer2.style.boxShadow = shadows2.join(',');
        el.appendChild(layer2);

        document.body.appendChild(el);
      }

      function removeStarfield() {
        var sf = document.querySelector('.starfield');
        if (sf) sf.remove();
      }

      // Zalgo-style corruption characters
      var ZALGO_UP = ['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u030B','\u030C','\u030D','\u030E','\u030F','\u0310','\u0311','\u0312'];
      var ZALGO_MID = ['\u0315','\u031B','\u0334','\u0335','\u0336','\u0337','\u0338'];
      var ZALGO_DOWN = ['\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F','\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328'];

      // Eldritch word substitutions — ~8% chance per word
      var ELDRITCH_SUBS = {
        'the': 'T\u0336H\u0335E', 'and': '\u2227ND', 'this': 'TH\u0338\u00CDS',
        'that': 'TH\u0336\u00C6T', 'with': 'W\u0335\u012ATH', 'from': 'FR\u0336\u00D8M',
        'have': 'H\u0338\u00C6VE', 'are': '\u00C6RE', 'was': 'W\u0336\u00C6S',
        'been': 'B\u0335\u0190EN', 'will': 'W\u0338\u012ALL', 'into': '\u012ANT\u00D8',
        'time': 'T\u0336\u012AME', 'here': 'H\u0335\u018ERE', 'they': 'TH\u0336\u018EY',
        'about': '\u00C6B\u00D8UT', 'just': 'J\u0335\u00DCST', 'not': 'N\u0336\u00D8T',
        'you': 'Y\u0335\u00D8U', 'all': '\u00C6LL', 'can': 'C\u0336\u00C6N',
        'more': 'M\u0338\u00D8RE', 'some': 'S\u0335\u00D8ME', 'what': 'WH\u0336\u00C6T'
      };
      var ELDRITCH_KEYS = Object.keys(ELDRITCH_SUBS);

      function corruptText(text) {
        // First pass: eldritch word substitutions
        var words = text.split(/(\s+)/);
        for (var w = 0; w < words.length; w++) {
          var lower = words[w].toLowerCase();
          if (ELDRITCH_SUBS[lower] && Math.random() < 0.08) {
            words[w] = ELDRITCH_SUBS[lower];
          }
        }
        text = words.join('');

        // Second pass: zalgo corruption on individual characters
        var out = '';
        for (var i = 0; i < text.length; i++) {
          var ch = text[i];
          if (ch === ' ' || ch === '\n') { out += ch; continue; }
          out += ch;
          if (Math.random() < 0.3) {
            var count = 1 + Math.floor(Math.random() * 3);
            for (var j = 0; j < count; j++) {
              var pool = [ZALGO_UP, ZALGO_MID, ZALGO_DOWN][Math.floor(Math.random() * 3)];
              out += pool[Math.floor(Math.random() * pool.length)];
            }
          }
        }
        return out;
      }

      // ── Letter flicker — randomly flicker text elements ──────────
      var flickerRunning = false;
      var flickerTimeout = null;

      function startFlicker() {
        if (flickerRunning) return;
        flickerRunning = true;
        var allSelectors = SIDEBAR_SELECTORS + ', ' + CONTENT_SELECTORS;

        function doFlicker() {
          if (!flickerRunning) return;
          var els = document.querySelectorAll(allSelectors);
          if (!els.length) { flickerTimeout = setTimeout(doFlicker, 1000); return; }

          // Flicker 1-3 elements at once
          var count = 1 + Math.floor(Math.random() * 3);
          for (var f = 0; f < count; f++) {
            var el = els[Math.floor(Math.random() * els.length)];
            // Force animation restart: remove, reflow, re-add
            el.classList.remove('flicker');
            void el.offsetWidth;
            el.classList.add('flicker');
            (function (target) {
              setTimeout(function () { target.classList.remove('flicker'); }, 200);
            })(el);
          }

          flickerTimeout = setTimeout(doFlicker, 800 + Math.random() * 2000);
        }
        doFlicker();
      }

      function stopFlicker() {
        flickerRunning = false;
        if (flickerTimeout) { clearTimeout(flickerTimeout); flickerTimeout = null; }
      }

      // ── "OPEN THE STARGATE" transmission flash ─────────────────
      var stargateInterval = null;

      function startStargateTransmissions() {
        if (stargateInterval) return;
        function scheduleNext() {
          stargateInterval = setTimeout(function () {
            if (!bloodMode) return;
            var container = document.createElement('div');
            container.className = 'stargate-transmission';

            var staticLayer = document.createElement('div');
            staticLayer.className = 'stargate-static';
            container.appendChild(staticLayer);

            var text = document.createElement('div');
            text.className = 'stargate-text';
            text.textContent = 'OPEN THE STARGATE';
            container.appendChild(text);

            document.body.appendChild(container);
            setTimeout(function () { container.remove(); }, 750);
            scheduleNext();
          }, 15000 + Math.random() * 30000);
        }
        scheduleNext();
      }

      function stopStargateTransmissions() {
        if (stargateInterval) { clearTimeout(stargateInterval); stargateInterval = null; }
        var existing = document.querySelector('.stargate-transmission');
        if (existing) existing.remove();
      }

      function corruptNodes(selector) {
        var els = document.querySelectorAll(selector);
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          for (var j = 0; j < el.childNodes.length; j++) {
            var node = el.childNodes[j];
            if (node.nodeType === 3 && node.textContent.trim()) {
              corruptedElements.push({ node: node, original: node.textContent });
              node.textContent = corruptText(node.textContent);
            }
          }
        }
      }

      var SIDEBAR_SELECTORS = '.site-title a, #sidebar-nav-links a span, #sidebar-icon-links a span, .sidebar-section-label';
      var CONTENT_SELECTORS = '.post-title, .page-title, .post-list a, .posts-list a, .post-body p, .post-body li, .post-body h2, .post-body h3, .post-meta, .content h1, .content h2, .content h3, .content p, .content li';

      function applyTextCorruption() {
        corruptNodes(SIDEBAR_SELECTORS + ', ' + CONTENT_SELECTORS);
      }

      function applyContentCorruption() {
        corruptNodes(CONTENT_SELECTORS);
      }

      function removeTextCorruption() {
        for (var i = 0; i < corruptedElements.length; i++) {
          corruptedElements[i].node.textContent = corruptedElements[i].original;
        }
        corruptedElements = [];
      }

      // Re-corrupt content after PJAX navigation swaps the container
      document.addEventListener('pjax:swap', function () {
        if (bloodMode) {
          // Remove stale content refs (sidebar ones are still valid)
          var kept = [];
          for (var i = 0; i < corruptedElements.length; i++) {
            if (document.body.contains(corruptedElements[i].node)) {
              kept.push(corruptedElements[i]);
            }
          }
          corruptedElements = kept;
          applyContentCorruption();
        }
      });

      document.addEventListener('easter-egg', function (e) {
        if (e.detail.name === 'idkfa') {
          doomMode = e.detail.playing;
          wrap.classList.toggle('pixelated', doomMode);
          document.body.classList.toggle('doom-mode', doomMode);
          // Clear blood mode if doom activates
          if (doomMode && bloodMode) {
            bloodMode = false;
            CHARS = DEFAULT_CHARS;
            removeStarfield();
            removeTextCorruption();
            stopFlicker();
            stopStargateTransmissions();
          }
        } else if (e.detail.name === 'blood') {
          bloodMode = e.detail.playing;
          CHARS = bloodMode ? BLOOD_CHARS : DEFAULT_CHARS;
          wrap.classList.toggle('pixelated', bloodMode);
          if (bloodMode) {
            createStarfield();
            applyTextCorruption();
            startFlicker();
            startStargateTransmissions();
          } else {
            removeStarfield();
            removeTextCorruption();
            stopFlicker();
            stopStargateTransmissions();
          }
          // Clear doom mode if blood activates
          if (bloodMode && doomMode) {
            doomMode = false;
            document.body.classList.remove('doom-mode');
          }
        } else if (e.detail.playing) {
          // Another theme activated — clear special modes
          if (doomMode) {
            doomMode = false;
            wrap.classList.remove('pixelated');
            document.body.classList.remove('doom-mode');
          }
          if (bloodMode) {
            bloodMode = false;
            CHARS = DEFAULT_CHARS;
            wrap.classList.remove('pixelated');
            removeStarfield();
            removeTextCorruption();
            stopFlicker();
            stopStargateTransmissions();
          }
        }
      });

      // Restore blood/doom effects from saved theme (event fires before this listener exists)
      var savedTheme = localStorage.getItem('easter-egg-theme');
      if (savedTheme === 'theme-blood') {
        bloodMode = true;
        CHARS = BLOOD_CHARS;
        wrap.classList.add('pixelated');
        createStarfield();
        applyTextCorruption();
        startFlicker();
        startStargateTransmissions();
      } else if (savedTheme === 'theme-doom') {
        doomMode = true;
        wrap.classList.add('pixelated');
        document.body.classList.add('doom-mode');
      }

      // ── Avatar hover glitch ──────────────────────────────────────

      var hovering = false, glitchTimer = null;

      function scheduleGlitch() {
        if (!hovering) return;
        glitchTimer = setTimeout(function () {
          if (!hovering) return;
          img.classList.add('glitching');
          setTimeout(function () { img.classList.remove('glitching'); scheduleGlitch(); }, 200);
        }, 3000 + Math.random() * 4000);
      }

      wrap.addEventListener('mouseenter', function () {
        hovering = true;
        img.classList.add('glitching-hard');
        setTimeout(function () { img.classList.remove('glitching-hard'); scheduleGlitch(); }, 400);
      });

      wrap.addEventListener('mouseleave', function () {
        hovering = false;
        clearTimeout(glitchTimer);
        img.classList.remove('glitching', 'glitching-hard');
      });

      // ── Sidebar link glitch ──────────────────────────────────────

      var GLITCH_STEPS = [
        { clip: 'inset(15% 0 40% 0)', tx: -3 },
        { clip: 'inset(60% 0 5% 0)',  tx: 4 },
        { clip: 'inset(0)',            tx: 0 },
        { clip: 'inset(5% 0 65% 0)',  tx: -2 },
        { clip: 'inset(35% 0 20% 0)', tx: 3 },
        { clip: 'inset(0)',            tx: 0 }
      ];

      function glitchLink(link) {
        if (link._glitching) return;
        var target = link._glitchTarget;
        if (!target) return;
        link._glitching = true;
        var step = 0;
        (function next() {
          if (step >= GLITCH_STEPS.length) {
            target.style.clipPath = target.style.transform = '';
            link._glitching = false;
            link._glitchTimeout = null;
            return;
          }
          var s = GLITCH_STEPS[step++];
          target.style.clipPath = s.clip;
          target.style.transform = 'translateX(' + s.tx + 'px)';
          link._glitchTimeout = setTimeout(next, 50);
        })();
      }

      var links = document.querySelectorAll('#sidebar-nav-links a, #sidebar-icon-links a');
      for (var i = 0; i < links.length; i++) {
        // Wrap content in span so clip-path doesn't alter <a> hit area
        var span = document.createElement('span');
        span.style.display = 'inline-block';
        while (links[i].firstChild) span.appendChild(links[i].firstChild);
        links[i].appendChild(span);
        links[i]._glitchTarget = span;
      }

      function bindLink(link) {
        var hoverTimer = null;
        link.addEventListener('mouseenter', function () {
          hoverTimer = setTimeout(function () { glitchLink(link); }, 100);
        });
        link.addEventListener('mouseleave', function () {
          clearTimeout(hoverTimer);
          clearTimeout(link._glitchTimeout);
          link._glitchTimeout = null;
          if (link._glitchTarget) link._glitchTarget.style.clipPath = link._glitchTarget.style.transform = '';
          link._glitching = false;
        });
        link.addEventListener('nav-highlight', function () { glitchLink(link); });
      }

      for (var j = 0; j < links.length; j++) bindLink(links[j]);
    });
})();
