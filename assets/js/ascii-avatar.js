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

  fetch(img.src)
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (buff) {
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

      document.addEventListener('easter-egg', function (e) {
        if (e.detail.name === 'idkfa') wrap.classList.toggle('pixelated', e.detail.playing);
      });

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
