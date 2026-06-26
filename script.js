(function(){
  "use strict";

  // ---------- Seedable RNG ----------
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rand = mulberry32(Date.now() & 0xffffffff);
  let currentSeed = 0;
  function reseed() {
    currentSeed = Math.floor(Math.random() * 1e9);
    rand = mulberry32(currentSeed);
    document.getElementById('seedDisplay').textContent = 'seed ' + currentSeed;
  }

  // ---------- Sizes ----------
  const SIZES = {
    phone: [
      { label: "iPhone 16 Pro Max — 1320×2868", w: 1320, h: 2868 },
      { label: "iPhone 15/14 — 1170×2532", w: 1170, h: 2532 },
      { label: "iPhone SE — 750×1334", w: 750, h: 1334 },
      { label: "Pixel 9 — 1080×2400", w: 1080, h: 2400 },
      { label: "Galaxy S24 — 1080×2340", w: 1080, h: 2340 },
    ],
    desktop: [
      { label: "1920×1080 (FHD)", w: 1920, h: 1080 },
      { label: "2560×1440 (QHD)", w: 2560, h: 1440 },
      { label: "3840×2160 (4K)", w: 3840, h: 2160 },
      { label: "3024×1964 (MBP 14\")", w: 3024, h: 1964 },
      { label: "2560×1600 (16:10)", w: 2560, h: 1600 },
    ],
    square: [
      { label: "1080×1080", w: 1080, h: 1080 },
      { label: "1440×1440", w: 1440, h: 1440 },
      { label: "2048×2048", w: 2048, h: 2048 },
    ],
  };

  // ---------- Palettes (each: bg + array of accent colors) ----------
  const PALETTES = [
    { name: "Terracotta Dusk", bg: "#241f1a", colors: ["#b5532c", "#e8a04e", "#f4f1ea", "#5c6e4f"] },
    { name: "Acid Night", bg: "#0c0d0a", colors: ["#c8ff4d", "#1a1d14", "#f4f1ea", "#3a3f2c"] },
    { name: "Paper & Rust", bg: "#f4f1ea", colors: ["#b5532c", "#16140f", "#8a8166", "#5c6e4f"] },
    { name: "Deep Moss", bg: "#1b2417", colors: ["#5c6e4f", "#a9b88c", "#f4f1ea", "#3d4a32"] },
    { name: "Ink & Bone", bg: "#16140f", colors: ["#f4f1ea", "#8a8166", "#b5532c", "#3a362c"] },
    { name: "Cobalt Pop", bg: "#0e1b33", colors: ["#3e6df0", "#f4f1ea", "#e8a04e", "#1a2c52"] },
    { name: "Clay Sand", bg: "#e4d8bf", colors: ["#b5532c", "#16140f", "#7a6a4f", "#f4f1ea"] },
    { name: "Plum Static", bg: "#1f1326", colors: ["#9b5de5", "#f4f1ea", "#e8a04e", "#3a2747"] },
    { name: "Mono Slate", bg: "#222222", colors: ["#f4f1ea", "#888888", "#555555", "#cccccc"] },
    { name: "Citrus Field", bg: "#fdf4dc", colors: ["#e8a04e", "#b5532c", "#16140f", "#5c6e4f"] },
    { name: "Blackcurrant", bg: "#120e16", colors: ["#7c4dff", "#ff6f91", "#f4f1ea", "#2a2233"] },
    { name: "Glacier", bg: "#eef3f4", colors: ["#2c6e7f", "#16140f", "#9fc7cf", "#e8a04e"] },
  ];

  const PATTERN_DEFS = [
    { id: "stripes",   label: "Stripes" },
    { id: "grid",      label: "Grid" },
    { id: "dots",      label: "Dot Field" },
    { id: "waves",     label: "Waves" },
    { id: "blobs",     label: "Blobs" },
    { id: "triangles", label: "Triangles" },
    { id: "rings",     label: "Rings" },
    { id: "shards",    label: "Shards" },
    { id: "scatter",   label: "Scatter Marks" },
  ];

  // ---------- State ----------
  const state = {
    device: "phone",
    sizeIdx: 1,
    pattern: "blobs",
    paletteIdx: 0,
    density: 5,
    grain: 3,
  };

  // ---------- DOM ----------
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const frameLabel = document.getElementById('frameLabel');
  const sizeSelect = document.getElementById('sizeSelect');
  const patternGrid = document.getElementById('patternGrid');
  const paletteGrid = document.getElementById('paletteGrid');
  const deviceSeg = document.getElementById('deviceSeg');
  const densitySlider = document.getElementById('densitySlider');
  const densityVal = document.getElementById('densityVal');
  const grainSlider = document.getElementById('grainSlider');
  const grainVal = document.getElementById('grainVal');

  function buildSizeOptions() {
    sizeSelect.innerHTML = "";
    SIZES[state.device].forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = s.label;
      sizeSelect.appendChild(opt);
    });
    sizeSelect.value = state.sizeIdx;
  }

  function buildPatternGrid() {
    patternGrid.innerHTML = "";
    PATTERN_DEFS.forEach(p => {
      const btn = document.createElement('button');
      btn.dataset.pattern = p.id;
      if (p.id === state.pattern) btn.classList.add('active');
      const span = document.createElement('span');
      span.textContent = p.label;
      btn.appendChild(span);
      btn.addEventListener('click', () => {
        state.pattern = p.id;
        [...patternGrid.children].forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      patternGrid.appendChild(btn);
    });
  }

  function buildPaletteGrid() {
    paletteGrid.innerHTML = "";
    PALETTES.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.className = 'swatch-pair';
      dot.title = p.name;
      dot.style.background = `conic-gradient(${p.bg} 0% 50%, ${p.colors[0]} 50% 100%)`;
      if (i === state.paletteIdx) dot.classList.add('active');
      dot.addEventListener('click', () => {
        state.paletteIdx = i;
        [...paletteGrid.children].forEach(c => c.classList.remove('active'));
        dot.classList.add('active');
        render();
      });
      paletteGrid.appendChild(dot);
    });
  }

  deviceSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.device = btn.dataset.device;
    state.sizeIdx = 0;
    [...deviceSeg.children].forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    buildSizeOptions();
    render();
  });

  sizeSelect.addEventListener('change', () => {
    state.sizeIdx = parseInt(sizeSelect.value, 10);
    render();
  });

  densitySlider.addEventListener('input', () => {
    state.density = parseInt(densitySlider.value, 10);
    densityVal.textContent = state.density;
    render();
  });

  grainSlider.addEventListener('input', () => {
    state.grain = parseInt(grainSlider.value, 10);
    grainVal.textContent = state.grain;
    render();
  });

  document.getElementById('rerollBtn').addEventListener('click', () => {
    reseed();
    render();
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const dims = SIZES[state.device][state.sizeIdx];
    const link = document.createElement('a');
    link.download = `wallpaper-${state.pattern}-${dims.w}x${dims.h}-${currentSeed}.png`;
    link.href = cv.toDataURL('image/png');
    link.click();
  });

  // ---------- Helpers ----------
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbaFix(hex, a) {
    const [r,g,b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---------- Pattern renderers ----------
  // Each receives (ctx, w, h, palette, density 1-10)

  function drawStripes(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const bandCount = Math.round(lerp(5, 40, density / 10));
    const angle = pick([0, 45, 90, -45]) * Math.PI / 180;
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(angle);
    const diag = Math.sqrt(w*w + h*h) * 1.2;
    const bw = diag / bandCount;
    for (let i = -bandCount; i < bandCount * 2; i++) {
      if (rand() > 0.55) continue;
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
      ctx.fillRect(-diag/2 + i * bw, -diag, bw * lerp(0.4, 1, rand()), diag * 2);
    }
    ctx.restore();
  }

  function drawGrid(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(4, 16, density / 10));
    const cellW = w / cols;
    const rows = Math.round(h / cellW);
    const cellH = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rand() > 0.62) continue;
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.55, 1, rand()));
        const pad = cellW * 0.08;
        ctx.fillRect(x*cellW+pad, y*cellH+pad, cellW-pad*2, cellH-pad*2);
      }
    }
    // hairlines
    ctx.strokeStyle = rgbaFix(pal.colors[0], 0.12);
    ctx.lineWidth = Math.max(1, w * 0.0008);
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath(); ctx.moveTo(x*cellW, 0); ctx.lineTo(x*cellW, h); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y*cellH); ctx.lineTo(w, y*cellH); ctx.stroke();
    }
  }

  function drawDots(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(40, 600, density / 10));
    const baseR = Math.min(w, h) * 0.012;
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h;
      const r = baseR * lerp(0.3, 2.6, rand());
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.4, 1, rand()));
      ctx.fill();
    }
  }

  function drawWaves(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const lines = Math.round(lerp(6, 30, density / 10));
    const amp = h * lerp(0.03, 0.09, rand());
    const freq = lerp(1.5, 4, rand());
    const phase0 = rand() * 10;
    for (let i = 0; i < lines; i++) {
      const baseY = (h / lines) * i + (h / lines) * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      const steps = 60;
      for (let s = 0; s <= steps; s++) {
        const x = (w / steps) * s;
        const y = baseY + Math.sin((x / w) * Math.PI * freq + phase0 + i * 0.3) * amp;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.4, 0.95, rand()));
      ctx.lineWidth = Math.max(1.5, h * lerp(0.004, 0.014, density/10));
      ctx.stroke();
    }
  }

  function drawBlobs(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(3, 14, density / 10));
    for (let i = 0; i < count; i++) {
      const cx = rand() * w, cy = rand() * h;
      const baseR = Math.min(w, h) * lerp(0.08, 0.32, rand());
      const points = 10 + Math.floor(rand() * 4);
      ctx.beginPath();
      for (let p = 0; p <= points; p++) {
        const ang = (p / points) * Math.PI * 2;
        const r = baseR * lerp(0.7, 1.3, rand());
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 0.9, rand()));
      ctx.filter = `blur(${Math.round(baseR * 0.05)}px)`;
      ctx.fill();
      ctx.filter = 'none';
    }
  }

  function drawTriangles(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(4, 14, density / 10));
    const cellW = w / cols;
    const rows = Math.round(h / cellW);
    const cellH = h / rows;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        if (rand() > 0.7) continue;
        const flip = rand() > 0.5;
        ctx.beginPath();
        const px = x * cellW, py = y * cellH;
        if (flip) {
          ctx.moveTo(px, py); ctx.lineTo(px+cellW, py); ctx.lineTo(px, py+cellH);
        } else {
          ctx.moveTo(px+cellW, py); ctx.lineTo(px+cellW, py+cellH); ctx.lineTo(px, py+cellH);
        }
        ctx.closePath();
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
        ctx.fill();
      }
    }
  }

  function drawRings(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(3, 12, density / 10));
    for (let i = 0; i < count; i++) {
      const cx = rand() * w, cy = rand() * h;
      const maxR = Math.min(w,h) * lerp(0.15, 0.4, rand());
      const rings = 4 + Math.floor(rand() * 5);
      for (let r = rings; r >= 1; r--) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * (r / rings), 0, Math.PI * 2);
        ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.3, 0.9, rand()));
        ctx.lineWidth = Math.max(2, maxR * 0.04);
        ctx.stroke();
      }
    }
  }

  function drawShards(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(8, 50, density / 10));
    for (let i = 0; i < count; i++) {
      const cx = rand() * w, cy = rand() * h;
      const len = Math.min(w,h) * lerp(0.08, 0.3, rand());
      const wid = len * lerp(0.15, 0.4, rand());
      const ang = rand() * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -len/2);
      ctx.lineTo(wid/2, 0);
      ctx.lineTo(0, len/2);
      ctx.lineTo(-wid/2, 0);
      ctx.closePath();
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
      ctx.fill();
      ctx.restore();
    }
  }

  function drawScatter(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(80, 1000, density / 10));
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h;
      const s = Math.min(w,h) * lerp(0.004, 0.018, rand());
      const type = rand();
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = s * 0.4;
      if (type < 0.33) {
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fill();
      } else if (type < 0.66) {
        ctx.beginPath();
        ctx.moveTo(x-s, y-s); ctx.lineTo(x+s, y+s);
        ctx.moveTo(x-s, y+s); ctx.lineTo(x+s, y-s);
        ctx.stroke();
      } else {
        ctx.fillRect(x-s/2, y-s/2, s, s);
      }
    }
  }

  const RENDERERS = {
    stripes: drawStripes,
    grid: drawGrid,
    dots: drawDots,
    waves: drawWaves,
    blobs: drawBlobs,
    triangles: drawTriangles,
    rings: drawRings,
    shards: drawShards,
    scatter: drawScatter,
  };

  function addGrain(ctx, w, h, amount) {
    if (amount <= 0) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const strength = amount * 2.4;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rand() - 0.5) * strength;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ---------- Render ----------
  function render() {
    const dims = SIZES[state.device][state.sizeIdx];
    cv.width = dims.w;
    cv.height = dims.h;
    frameLabel.textContent = `${dims.w} × ${dims.h}`;

    const pal = PALETTES[state.paletteIdx];
    const fn = RENDERERS[state.pattern] || drawBlobs;

    // Use a frozen rng draw per render based on currentSeed, deterministic per reroll
    const localRand = mulberry32(currentSeed ^ (state.pattern.length * 7919) ^ state.paletteIdx ^ (dims.w + dims.h));
    rand = localRand;

    fn(ctx, dims.w, dims.h, pal, state.density);
    addGrain(ctx, dims.w, dims.h, state.grain);
  }

  // ---------- Init ----------
  reseed();
  buildSizeOptions();
  buildPatternGrid();
  buildPaletteGrid();
  render();
})();
