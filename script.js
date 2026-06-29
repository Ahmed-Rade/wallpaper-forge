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
      { label: "iPhone 16 Pro — 1206×2622", w: 1206, h: 2622 },
      { label: "iPhone 15/14 — 1170×2532", w: 1170, h: 2532 },
      { label: "iPhone SE — 750×1334", w: 750, h: 1334 },
      { label: "Pixel 9 Pro — 1280×2856", w: 1280, h: 2856 },
      { label: "Pixel 9 — 1080×2400", w: 1080, h: 2400 },
      { label: "Galaxy S24 — 1080×2340", w: 1080, h: 2340 },
      { label: "Galaxy S24 Ultra — 1440×3120", w: 1440, h: 3120 },
    ],
    desktop: [
      { label: "1920×1080 (FHD)", w: 1920, h: 1080 },
      { label: "2560×1440 (QHD)", w: 2560, h: 1440 },
      { label: "3840×2160 (4K)", w: 3840, h: 2160 },
      { label: "5120×2880 (5K)", w: 5120, h: 2880 },
      { label: "3024×1964 (MBP 14\")", w: 3024, h: 1964 },
      { label: "3456×2234 (MBP 16\")", w: 3456, h: 2234 },
      { label: "2560×1600 (16:10)", w: 2560, h: 1600 },
      { label: "3440×1440 (Ultrawide)", w: 3440, h: 1440 },
      { label: "5120×1440 (Super Ultrawide)", w: 5120, h: 1440 },
      { label: "1280×720 (HD)", w: 1280, h: 720 },
    ],
    square: [
      { label: "1080×1080", w: 1080, h: 1080 },
      { label: "1440×1440", w: 1440, h: 1440 },
      { label: "2048×2048", w: 2048, h: 2048 },
      { label: "2880×2880", w: 2880, h: 2880 },
    ],
  };

  // ---------- Palettes (each: bg + array of accent colors) ----------
  // Each palette ships a dark variant (default) and a light variant.
  const PALETTES = [
    // — Earth & Organic —
    { name: "Terracotta Dusk",
      dark:  { bg: "#241f1a", colors: ["#b5532c", "#e8a04e", "#f4f1ea", "#5c6e4f"] },
      light: { bg: "#f4ece1", colors: ["#b5532c", "#a3742f", "#3a3026", "#5c6e4f"] } },
    { name: "Paper & Rust",
      dark:  { bg: "#3a342c", colors: ["#e8895a", "#f4f1ea", "#bdb18f", "#8aa179"] },
      light: { bg: "#f4f1ea", colors: ["#b5532c", "#16140f", "#8a8166", "#5c6e4f"] } },
    { name: "Deep Moss",
      dark:  { bg: "#1b2417", colors: ["#5c6e4f", "#a9b88c", "#f4f1ea", "#3d4a32"] },
      light: { bg: "#eef2e9", colors: ["#4a5c3d", "#1b2417", "#7c8f63", "#cdd9bb"] } },
    { name: "Clay Sand",
      dark:  { bg: "#2c2418", colors: ["#d97a45", "#f4f1ea", "#a3936c", "#5c6e4f"] },
      light: { bg: "#e4d8bf", colors: ["#b5532c", "#16140f", "#7a6a4f", "#f4f1ea"] } },
    { name: "Citrus Field",
      dark:  { bg: "#2c2410", colors: ["#e8a04e", "#d97a45", "#f4f1ea", "#7c8f63"] },
      light: { bg: "#fdf4dc", colors: ["#e8a04e", "#b5532c", "#16140f", "#5c6e4f"] } },
    { name: "Sage Linen",
      dark:  { bg: "#1e2420", colors: ["#7aab6e", "#c8d8a2", "#f4f1ea", "#3a5233"] },
      light: { bg: "#f0f4eb", colors: ["#4a7a3c", "#1e2420", "#8fad7a", "#d8e8c2"] } },
    { name: "Dried Petal",
      dark:  { bg: "#2a1e1b", colors: ["#c47a6a", "#e8b89a", "#f2ddd5", "#7a5248"] },
      light: { bg: "#f7ede8", colors: ["#a05040", "#7a3830", "#d4a090", "#3a2020"] } },
    { name: "Sandstone",
      dark:  { bg: "#28221a", colors: ["#d4b483", "#f0d9b0", "#a08050", "#e8c87a"] },
      light: { bg: "#f5edd8", colors: ["#8a6830", "#5a4018", "#c4a060", "#2a1e08"] } },
    // — Cool & Oceanic —
    { name: "Glacier",
      dark:  { bg: "#16282c", colors: ["#6fc4d6", "#f4f1ea", "#2c6e7f", "#e8a04e"] },
      light: { bg: "#eef3f4", colors: ["#2c6e7f", "#16140f", "#9fc7cf", "#e8a04e"] } },
    { name: "Arctic Mint",
      dark:  { bg: "#081a1c", colors: ["#00e5c4", "#0ab8d4", "#f4f1ea", "#004d4a"] },
      light: { bg: "#e8faf8", colors: ["#007a6a", "#005f7a", "#16140f", "#a8e8e2"] } },
    { name: "Midnight Ocean",
      dark:  { bg: "#040d1f", colors: ["#1a4fd6", "#00b4d8", "#90e0ef", "#f4f1ea"] },
      light: { bg: "#e8f4fb", colors: ["#0a3a9a", "#006a8a", "#3a8abf", "#c0dff0"] } },
    { name: "Deep Brine",
      dark:  { bg: "#060e18", colors: ["#0066cc", "#00aaff", "#004488", "#88ddff"] },
      light: { bg: "#dff0fa", colors: ["#003f88", "#0070c0", "#005fa0", "#b0ddf5"] } },
    { name: "Seafoam",
      dark:  { bg: "#0a1e1a", colors: ["#2dd4bf", "#67e8d4", "#0f766e", "#f0fdfa"] },
      light: { bg: "#e6faf8", colors: ["#0d7a6a", "#0a5a50", "#2dd4bf", "#ccf5f0"] } },
    // — Neon & Electric —
    { name: "Acid Night",
      dark:  { bg: "#0c0d0a", colors: ["#c8ff4d", "#1a1d14", "#f4f1ea", "#3a3f2c"] },
      light: { bg: "#f6fbe9", colors: ["#5b8a00", "#1a1d14", "#dfeec2", "#3a3f2c"] } },
    { name: "Neon Sunset",
      dark:  { bg: "#0d0814", colors: ["#ff2d78", "#ff8c42", "#ffe548", "#c724f7"] },
      light: { bg: "#fff0f5", colors: ["#d4006a", "#b85a00", "#c4a800", "#8b00c4"] } },
    { name: "Electric Indigo",
      dark:  { bg: "#08071a", colors: ["#5c4dff", "#00d4ff", "#ff4dc4", "#f4f1ea"] },
      light: { bg: "#eeeeff", colors: ["#3a2ed4", "#007aaa", "#c4006a", "#1a1640"] } },
    { name: "Cyber Lime",
      dark:  { bg: "#080f08", colors: ["#39ff14", "#00ff88", "#ccff00", "#005522"] },
      light: { bg: "#f0fce8", colors: ["#1a7a00", "#007a44", "#5faa00", "#002200"] } },
    { name: "Hot Plasma",
      dark:  { bg: "#0e0010", colors: ["#ff00cc", "#ff6600", "#ffcc00", "#cc00ff"] },
      light: { bg: "#fff0fc", colors: ["#cc0088", "#cc4400", "#aa8800", "#8800cc"] } },
    { name: "UV Rave",
      dark:  { bg: "#07000f", colors: ["#bf00ff", "#00ffff", "#ff007f", "#7700ff"] },
      light: { bg: "#f5eaff", colors: ["#7700cc", "#007a7a", "#cc005a", "#4400aa"] } },
    // — Pastel & Soft —
    { name: "Cotton Candy",
      dark:  { bg: "#1a1020", colors: ["#ffb3d9", "#b3d9ff", "#d9ffb3", "#ffd9b3"] },
      light: { bg: "#fff5fb", colors: ["#e080b0", "#70a0d0", "#80c070", "#d09050"] } },
    { name: "Chalk Dust",
      dark:  { bg: "#1c1c28", colors: ["#c8b8e8", "#b8d8c8", "#e8d8b8", "#d8b8c8"] },
      light: { bg: "#f8f4ff", colors: ["#8060c0", "#406080", "#805030", "#804060"] } },
    { name: "Peach Bloom",
      dark:  { bg: "#201418", colors: ["#ffb09a", "#ffd0a0", "#ff90b0", "#c8a0d0"] },
      light: { bg: "#fff8f5", colors: ["#d06040", "#c08030", "#b04060", "#8050a0"] } },
    { name: "Baby Deco",
      dark:  { bg: "#141a20", colors: ["#a8d8ea", "#f9e4b7", "#e8c5d8", "#c8e6c0"] },
      light: { bg: "#f5faff", colors: ["#4a8aaa", "#a07820", "#905070", "#3a7040"] } },
    // — Moody & Dark —
    { name: "Ink & Bone",
      dark:  { bg: "#16140f", colors: ["#f4f1ea", "#8a8166", "#b5532c", "#3a362c"] },
      light: { bg: "#f4f1ea", colors: ["#16140f", "#8a8166", "#b5532c", "#cfc9b8"] } },
    { name: "Cobalt Pop",
      dark:  { bg: "#0e1b33", colors: ["#3e6df0", "#f4f1ea", "#e8a04e", "#1a2c52"] },
      light: { bg: "#eaf0fb", colors: ["#2748b0", "#16140f", "#c9762e", "#aac0ec"] } },
    { name: "Plum Static",
      dark:  { bg: "#1f1326", colors: ["#9b5de5", "#f4f1ea", "#e8a04e", "#3a2747"] },
      light: { bg: "#f1eaf7", colors: ["#7a3dc4", "#2a1f33", "#c9762e", "#d8c3ea"] } },
    { name: "Blackcurrant",
      dark:  { bg: "#120e16", colors: ["#7c4dff", "#ff6f91", "#f4f1ea", "#2a2233"] },
      light: { bg: "#f3eefb", colors: ["#5c2ed1", "#c43f63", "#2a2233", "#d9c9f0"] } },
    { name: "Bloodmoon",
      dark:  { bg: "#0e0606", colors: ["#cc1a1a", "#ff5c3a", "#f4ede0", "#3a0a0a"] },
      light: { bg: "#fdf0ec", colors: ["#aa1010", "#c4410a", "#2a0808", "#f0c4b8"] } },
    { name: "Amber Noir",
      dark:  { bg: "#100c00", colors: ["#f5a623", "#f7d06a", "#c47800", "#f4f1ea"] },
      light: { bg: "#fdf8e8", colors: ["#a06800", "#6a3e00", "#d4a020", "#16140f"] } },
    { name: "Obsidian",
      dark:  { bg: "#080808", colors: ["#444444", "#888888", "#cccccc", "#222222"] },
      light: { bg: "#f2f2f2", colors: ["#111111", "#555555", "#999999", "#dddddd"] } },
    // — Warm & Rich —
    { name: "Rose Quartz",
      dark:  { bg: "#1a0f12", colors: ["#e8728c", "#f4a0b5", "#c44a6a", "#f4f1ea"] },
      light: { bg: "#fdf0f3", colors: ["#c0395a", "#8a1a38", "#e8a0b5", "#3a1520"] } },
    { name: "Velvet Room",
      dark:  { bg: "#1a0a1a", colors: ["#cc44aa", "#ff88cc", "#882266", "#f4d0f0"] },
      light: { bg: "#fceefa", colors: ["#aa2288", "#6a1060", "#dd66bb", "#2a0828"] } },
    { name: "Saffron Dusk",
      dark:  { bg: "#1c1000", colors: ["#ff9500", "#ffcc44", "#cc6600", "#fff0b0"] },
      light: { bg: "#fffbe8", colors: ["#cc6600", "#884400", "#ffaa00", "#221100"] } },
    // — Mono & Minimal —
    { name: "Mono Slate",
      dark:  { bg: "#222222", colors: ["#f4f1ea", "#888888", "#555555", "#cccccc"] },
      light: { bg: "#f0f0f0", colors: ["#222222", "#777777", "#aaaaaa", "#444444"] } },
    { name: "Warm Mono",
      dark:  { bg: "#1e1a16", colors: ["#e8dfd0", "#b0a090", "#786858", "#f8f0e8"] },
      light: { bg: "#f8f4ee", colors: ["#2a2018", "#6a5848", "#9a8878", "#c8b8a8"] } },
    { name: "Cool Mono",
      dark:  { bg: "#141820", colors: ["#d0d8e8", "#8898b8", "#485870", "#f0f4ff"] },
      light: { bg: "#f0f4ff", colors: ["#182040", "#385070", "#6880a0", "#b0c0d8"] } },
  ];

  const PATTERN_DEFS = [
    { id: "solid",     label: "Solid Color" },
    { id: "stripes",   label: "Stripes" },
    { id: "grid",      label: "Grid" },
    { id: "dots",      label: "Dot Field" },
    { id: "waves",     label: "Waves" },
    { id: "blobs",     label: "Blobs" },
    { id: "triangles", label: "Triangles" },
    { id: "rings",     label: "Rings" },
    { id: "shards",    label: "Shards" },
    { id: "scatter",   label: "Scatter Marks" },
    { id: "voronoi",   label: "Voronoi" },
    { id: "hexgrid",   label: "Hex Grid" },
    { id: "noise",     label: "Noise Field" },
    { id: "spiral",    label: "Spiral" },
    { id: "crosshatch", label: "Crosshatch" },
    { id: "confetti",  label: "Confetti" },
    { id: "gradient",  label: "Gradient" },
    { id: "checker",   label: "Checker" },
    { id: "chevron",   label: "Chevron" },
    { id: "ripple",    label: "Ripple" },
    { id: "arches",    label: "Arches" },
    { id: "glassbars", label: "Glass Bars" },
    { id: "diamondnet", label: "Diamond Net" },
    { id: "starburst",  label: "Starburst" },
    { id: "circuit",    label: "Circuit" },
    { id: "brushstroke",label: "Brushstrokes" },
    { id: "topography", label: "Topography" },
  ];

  // ---------- State ----------
  const state = {
    device: "phone",
    sizeIdx: 2,
    pattern: "blobs",
    paletteIdx: 0,
    mode: "dark",
    density: 5,
    grain: 3,
    solidColor: "#16282c",
  };

  // ---------- DOM ----------
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const frameLabel = document.getElementById('frameLabel');
  const sizeSelect = document.getElementById('sizeSelect');
  const patternGrid = document.getElementById('patternGrid');
  const paletteGrid = document.getElementById('paletteGrid');
  const deviceSeg = document.getElementById('deviceSeg');
  const modeSeg = document.getElementById('modeSeg');
  const densitySlider = document.getElementById('densitySlider');
  const densityVal = document.getElementById('densityVal');
  const grainSlider = document.getElementById('grainSlider');
  const grainVal = document.getElementById('grainVal');
  const solidColorField = document.getElementById('solidColorField');
  const paletteField = document.getElementById('paletteField');
  const densityField = document.getElementById('densityField');
  const solidColorPicker = document.getElementById('solidColorPicker');
  const solidColorHex = document.getElementById('solidColorHex');

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

  // ---------- Thumbnails ----------
  function activePalette() {
    return PALETTES[state.paletteIdx][state.mode];
  }

  const THUMB_SIZE = 90;
  function renderThumb(canvas, patternId) {
    const tctx = canvas.getContext('2d');
    const pal = activePalette();
    const fn = RENDERERS[patternId] || drawBlobs;
    const savedRand = rand;
    rand = mulberry32(currentSeed ^ (patternId.length * 7919) ^ state.paletteIdx ^ 1337);
    fn(tctx, THUMB_SIZE, THUMB_SIZE, pal, state.density);
    rand = savedRand;
  }

  function refreshThumbs() {
    patternGrid.querySelectorAll('canvas').forEach(c => {
      renderThumb(c, c.dataset.pattern);
    });
  }

  function updateFieldVisibility() {
    const isSolid = state.pattern === 'solid';
    solidColorField.style.display = isSolid ? '' : 'none';
    paletteField.style.display = isSolid ? 'none' : '';
    densityField.style.display = isSolid ? 'none' : '';
  }

  function buildPatternGrid() {
    patternGrid.innerHTML = "";
    PATTERN_DEFS.forEach(p => {
      const btn = document.createElement('button');
      btn.dataset.pattern = p.id;
      if (p.id === state.pattern) btn.classList.add('active');
      const thumb = document.createElement('canvas');
      thumb.width = THUMB_SIZE;
      thumb.height = THUMB_SIZE;
      thumb.dataset.pattern = p.id;
      thumb.className = 'pattern-thumb';
      btn.appendChild(thumb);
      const span = document.createElement('span');
      span.textContent = p.label;
      btn.appendChild(span);
      btn.addEventListener('click', () => {
        state.pattern = p.id;
        [...patternGrid.children].forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        updateFieldVisibility();
        render();
      });
      patternGrid.appendChild(btn);
      renderThumb(thumb, p.id);
    });
  }

  function buildPaletteGrid() {
    paletteGrid.innerHTML = "";
    PALETTES.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.className = 'swatch-pair';
      dot.title = p.name;
      const variant = p[state.mode];
      dot.style.background = `conic-gradient(${variant.bg} 0% 50%, ${variant.colors[0]} 50% 100%)`;
      if (i === state.paletteIdx) dot.classList.add('active');
      dot.addEventListener('click', () => {
        state.paletteIdx = i;
        [...paletteGrid.children].forEach(c => c.classList.remove('active'));
        dot.classList.add('active');
        render();
        refreshThumbs();
      });
      paletteGrid.appendChild(dot);
    });
  }

  modeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    [...modeSeg.children].forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    buildPaletteGrid();
    render();
    refreshThumbs();
  });

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
    refreshThumbs();
  });

  grainSlider.addEventListener('input', () => {
    state.grain = parseInt(grainSlider.value, 10);
    grainVal.textContent = state.grain;
    render();
  });

  function setSolidColor(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    state.solidColor = hex;
    solidColorPicker.value = hex;
    solidColorHex.value = hex.toUpperCase();
    render();
  }

  solidColorPicker.addEventListener('input', () => setSolidColor(solidColorPicker.value));
  solidColorHex.addEventListener('change', () => {
    let v = solidColorHex.value.trim();
    if (v[0] !== '#') v = '#' + v;
    setSolidColor(v);
  });

  document.getElementById('rerollBtn').addEventListener('click', () => {
    reseed();
    render();
    refreshThumbs();
  });

  // Pattern → palette affinity groups for smart combos
  const PATTERN_PALETTE_AFFINITY = {
    neon:    ["Acid Night","Neon Sunset","Electric Indigo","Cyber Lime","Hot Plasma","UV Rave","Bloodmoon"],
    organic: ["Terracotta Dusk","Paper & Rust","Deep Moss","Clay Sand","Citrus Field","Sage Linen","Dried Petal","Sandstone","Warm Mono"],
    cool:    ["Glacier","Arctic Mint","Midnight Ocean","Deep Brine","Seafoam","Cool Mono","Cobalt Pop"],
    moody:   ["Ink & Bone","Plum Static","Blackcurrant","Amber Noir","Obsidian","Velvet Room","Saffron Dusk"],
    soft:    ["Cotton Candy","Chalk Dust","Peach Bloom","Baby Deco","Rose Quartz"],
  };
  const PATTERN_MOOD = {
    stripes:"organic", grid:"cool", dots:"soft", waves:"cool", blobs:"organic",
    triangles:"moody", rings:"cool", shards:"neon", scatter:"soft", voronoi:"organic",
    hexgrid:"cool", noise:"moody", spiral:"neon", crosshatch:"moody", confetti:"soft",
    gradient:"neon", checker:"moody", chevron:"organic", ripple:"cool", arches:"organic",
    glassbars:"neon", diamondnet:"cool", starburst:"neon", circuit:"neon",
    brushstroke:"organic", topography:"organic",
  };

  document.getElementById('randomBtn').addEventListener('click', () => {
    // Flash animation
    const btn = document.getElementById('randomBtn');
    btn.style.transition = 'background 0.08s, color 0.08s';
    btn.style.background = 'var(--rust)';
    btn.style.color = 'var(--paper)';
    setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 180);

    // Random pattern (exclude solid)
    const visualPatterns = PATTERN_DEFS.filter(p => p.id !== 'solid');
    const rp = visualPatterns[Math.floor(Math.random() * visualPatterns.length)];
    state.pattern = rp.id;
    [...patternGrid.children].forEach(c => {
      c.classList.toggle('active', c.dataset.pattern === rp.id);
    });

    // Smart palette: 70% mood-matched, 30% fully random
    const mood = PATTERN_MOOD[rp.id] || 'moody';
    const affinityNames = PATTERN_PALETTE_AFFINITY[mood] || [];
    let chosenPaletteIdx;
    if (Math.random() < 0.7 && affinityNames.length) {
      const name = affinityNames[Math.floor(Math.random() * affinityNames.length)];
      const idx = PALETTES.findIndex(p => p.name === name);
      chosenPaletteIdx = idx >= 0 ? idx : Math.floor(Math.random() * PALETTES.length);
    } else {
      chosenPaletteIdx = Math.floor(Math.random() * PALETTES.length);
    }
    state.paletteIdx = chosenPaletteIdx;
    [...paletteGrid.children].forEach((c, i) => c.classList.toggle('active', i === state.paletteIdx));

    // Mode: bias dark for neon patterns
    const darkBias = mood === 'neon' ? 0.8 : 0.5;
    state.mode = Math.random() < darkBias ? 'dark' : 'light';
    [...modeSeg.children].forEach(c => c.classList.toggle('active', c.dataset.mode === state.mode));

    // Aggressive density — weighted toward extremes
    const densityRoll = Math.random();
    state.density = densityRoll < 0.25
      ? 1 + Math.floor(Math.random() * 3)
      : densityRoll < 0.5
        ? 8 + Math.floor(Math.random() * 3)
        : 1 + Math.floor(Math.random() * 10);
    densitySlider.value = state.density;
    densityVal.textContent = state.density;

    // Aggressive grain — often clean or heavy, rarely mid
    const grainRoll = Math.random();
    state.grain = grainRoll < 0.3
      ? 0
      : grainRoll < 0.6
        ? 7 + Math.floor(Math.random() * 4)
        : Math.floor(Math.random() * 11);
    grainSlider.value = state.grain;
    grainVal.textContent = state.grain;

    updateFieldVisibility();
    buildPaletteGrid();
    reseed();
    render();
    refreshThumbs();
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const dims = SIZES[state.device][state.sizeIdx];
    const link = document.createElement('a');
    link.download = `wallpaper-${state.pattern}-${state.mode}-${dims.w}x${dims.h}-${currentSeed}.png`;
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

  function drawVoronoi(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(6, 40, density / 10));
    const cellSize = Math.max(w, h) / Math.sqrt(count) * 0.5;
    const cols = Math.ceil(w / cellSize), rows = Math.ceil(h / cellSize);
    const sites = [];
    for (let i = 0; i < count; i++) {
      sites.push({ x: rand() * w, y: rand() * h, c: pick(pal.colors) });
    }
    const step = Math.max(4, Math.min(w, h) * 0.01);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        let best = 0, bestD = Infinity;
        for (let i = 0; i < sites.length; i++) {
          const dx = sites[i].x - x, dy = sites[i].y - y;
          const d = dx*dx + dy*dy;
          if (d < bestD) { bestD = d; best = i; }
        }
        ctx.fillStyle = rgbaFix(sites[best].c, lerp(0.55, 0.9, rand()));
        ctx.fillRect(x, y, step, step);
      }
    }
    void cols; void rows;
  }

  function drawHexgrid(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const size = Math.min(w, h) / lerp(6, 22, density / 10);
    const hexH = size * Math.sqrt(3);
    const cols = Math.ceil(w / (size * 1.5)) + 2;
    const rows = Math.ceil(h / hexH) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        if (rand() > 0.78) continue;
        const x = col * size * 1.5;
        const y = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i;
          const px = x + size * Math.cos(ang);
          const py = y + size * Math.sin(ang);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
        ctx.fill();
      }
    }
  }

  function drawNoise(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cell = Math.max(2, Math.min(w, h) * lerp(0.025, 0.006, density / 10));
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const fx = lerp(2, 8, rand()), fy = lerp(2, 8, rand());
    const px = rand() * 100, py = rand() * 100;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = (Math.sin((x/cols)*fx + px) + Math.cos((y/rows)*fy + py) + 2) / 4;
        const idx = Math.min(pal.colors.length - 1, Math.floor(v * pal.colors.length));
        ctx.fillStyle = rgbaFix(pal.colors[idx], lerp(0.5, 0.95, v));
        ctx.fillRect(x*cell, y*cell, cell+1, cell+1);
      }
    }
  }

  function drawSpiral(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cx = w/2, cy = h/2;
    const arms = Math.round(lerp(2, 7, density/10));
    const maxR = Math.sqrt(w*w + h*h) * 0.6;
    for (let a = 0; a < arms; a++) {
      const offset = (a / arms) * Math.PI * 2;
      ctx.beginPath();
      const turns = lerp(2, 5, rand());
      const steps = 200;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const ang = offset + t * Math.PI * 2 * turns;
        const r = t * maxR;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.5, 0.95, rand()));
      ctx.lineWidth = Math.max(2, Math.min(w,h) * lerp(0.006, 0.02, rand()));
      ctx.stroke();
    }
  }

  function drawCrosshatch(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const lines = Math.round(lerp(10, 70, density/10));
    const gap = Math.max(w, h) / lines;
    [Math.PI/4, -Math.PI/4].forEach(angle => {
      ctx.save();
      ctx.translate(w/2, h/2);
      ctx.rotate(angle);
      const diag = Math.sqrt(w*w + h*h) * 1.3;
      for (let i = -lines; i < lines; i++) {
        if (rand() > 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(-diag/2 + i*gap, -diag/2);
        ctx.lineTo(-diag/2 + i*gap, diag/2);
        ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.3, 0.8, rand()));
        ctx.lineWidth = Math.max(1, gap * lerp(0.1, 0.3, rand()));
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawConfetti(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(60, 700, density / 10));
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h;
      const s = Math.min(w,h) * lerp(0.008, 0.03, rand());
      const ang = rand() * Math.PI * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.6, 1, rand()));
      if (rand() > 0.5) {
        ctx.fillRect(-s/2, -s/4, s, s/2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s/2.4, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawSolid(ctx, w, h, pal, density) {
    ctx.fillStyle = state.solidColor;
    ctx.fillRect(0, 0, w, h);
    void pal; void density;
  }

  function drawGradient(ctx, w, h, pal, density) {
    const ang = pick([0, 45, 90, 135, 180]) * Math.PI / 180;
    const cx = w/2, cy = h/2;
    const r = Math.sqrt(w*w + h*h) / 2;
    const x0 = cx - Math.cos(ang)*r, y0 = cy - Math.sin(ang)*r;
    const x1 = cx + Math.cos(ang)*r, y1 = cy + Math.sin(ang)*r;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const stops = 2 + Math.floor(lerp(0, 2, density/10));
    g.addColorStop(0, pal.bg);
    for (let i = 1; i < stops; i++) {
      g.addColorStop(i/stops, rgbaFix(pick(pal.colors), lerp(0.7, 1, rand())));
    }
    g.addColorStop(1, pick(pal.colors));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawChecker(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(4, 20, density / 10));
    const cellW = w / cols;
    const rows = Math.ceil(h / cellW);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.6, 1, rand()));
        ctx.fillRect(x*cellW, y*cellW, cellW, cellW);
      }
    }
  }

  function drawChevron(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const rows = Math.round(lerp(5, 22, density / 10));
    const bandH = h / rows;
    const zig = bandH * 1.4;
    for (let r = 0; r <= rows; r++) {
      const y = r * bandH;
      ctx.beginPath();
      ctx.moveTo(-zig, y);
      let x = -zig, dir = 1;
      while (x < w + zig) {
        x += zig;
        ctx.lineTo(x, y + dir * bandH * 0.5);
        dir *= -1;
      }
      ctx.lineWidth = Math.max(2, bandH * lerp(0.15, 0.4, rand()));
      ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, rand()));
      ctx.stroke();
    }
  }

  function drawRipple(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cx = w * lerp(0.3, 0.7, rand()), cy = h * lerp(0.3, 0.7, rand());
    const maxR = Math.sqrt(w*w + h*h) * 0.75;
    const rings = Math.round(lerp(8, 40, density / 10));
    for (let i = rings; i >= 1; i--) {
      const r = maxR * (i / rings);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.2, 0.7, (rings - i) / rings));
      ctx.lineWidth = Math.max(1.5, maxR * 0.01 * lerp(0.5, 1.5, rand()));
      ctx.stroke();
    }
  }

  function drawArches(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(3, 10, density / 10));
    const cellW = w / cols;
    const baseY = h * 0.92;
    for (let i = 0; i < cols; i++) {
      const cx = cellW * (i + 0.5);
      const archH = h * lerp(0.3, 0.85, rand());
      const archW = cellW * lerp(0.5, 0.9, rand());
      ctx.beginPath();
      ctx.moveTo(cx - archW/2, baseY);
      ctx.lineTo(cx - archW/2, baseY - archH + archW/2);
      ctx.arc(cx, baseY - archH + archW/2, archW/2, Math.PI, 0);
      ctx.lineTo(cx + archW/2, baseY);
      ctx.closePath();
      ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.6, 1, rand()));
      ctx.fill();
    }
  }

  function drawGlassbars(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    const barCount = Math.round(lerp(40, 220, density / 10));
    const barW = w / barCount;
    const glow = pick(pal.colors);

    // Build a jagged ridge line: a slow random walk (the diagonal slope)
    // with a fast sawtooth riding on top (the spiky teeth), per reference.
    const baseTilt = pick([1, -1]) * lerp(0.25, 0.6, rand());
    let walk = lerp(0.15, 0.55, rand());
    const walkStep = lerp(0.01, 0.04, rand());
    const toothFreq = lerp(0.15, 0.4, rand());

    const heights = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / barCount;
      walk += (rand() - 0.5) * walkStep;
      walk = Math.max(0.05, Math.min(0.95, walk));
      const slope = 0.5 + (t - 0.5) * baseTilt;
      const tooth = Math.abs(Math.sin(i * toothFreq + rand() * 0.3)) * lerp(0.08, 0.22, rand());
      let level = (walk * 0.5 + slope * 0.5) + tooth;
      level = Math.max(0.03, Math.min(0.98, level));
      heights.push(level * h);
    }

    // Draw each bar as a vertical glow: bright core fading to transparent,
    // clipped to the region below its ridge height.
    for (let i = 0; i < barCount; i++) {
      const x = i * barW;
      const topY = h - heights[i];
      const g = ctx.createLinearGradient(0, topY, 0, h);
      g.addColorStop(0, rgbaFix(glow, 0.95));
      g.addColorStop(0.15, rgbaFix(glow, 0.7));
      g.addColorStop(0.5, rgbaFix(glow, 0.35));
      g.addColorStop(1, rgbaFix(glow, 0.08));
      ctx.fillStyle = g;
      ctx.fillRect(x, topY, barW * 0.82, h - topY);
    }

    // Soften into the frosted-glass streak look.
    const snap = document.createElement('canvas');
    snap.width = w; snap.height = h;
    snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.filter = `blur(${Math.max(0.5, w * 0.0015)}px)`;
    ctx.drawImage(snap, 0, 0, w, h);
    ctx.restore();

    // Occasional brighter "key" bars for variation, like the thin
    // bright lines breaking through the field in the reference.
    const keyCount = Math.round(lerp(1, 5, rand()));
    for (let k = 0; k < keyCount; k++) {
      const i = Math.floor(rand() * barCount);
      const x = i * barW;
      const topY = 0;
      const g = ctx.createLinearGradient(0, topY, 0, h);
      g.addColorStop(0, rgbaFix(glow, 0.0));
      g.addColorStop(Math.max(0.05, heights[i] / h - 0.1), rgbaFix(glow, 0.0));
      g.addColorStop(Math.min(0.99, heights[i] / h + 0.02), rgbaFix(glow, 0.9));
      g.addColorStop(1, rgbaFix(glow, 0.25));
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, barW * 0.4, h);
    }
  }

  function drawDiamondNet(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(4, 18, density / 10));
    const cellW = w / cols;
    const cellH = cellW;
    const rows = Math.ceil(h / cellH) + 1;
    ctx.lineWidth = Math.max(1, w * 0.001);
    for (let y = -1; y < rows; y++) {
      for (let x = 0; x < cols + 1; x++) {
        const cx = x * cellW + (y % 2 === 0 ? 0 : cellW * 0.5);
        const cy = y * cellH;
        const hw = cellW * 0.46, hh = cellH * 0.46;
        ctx.beginPath();
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx, cy + hh);
        ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        if (rand() > 0.55) {
          ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.3, 0.85, rand()));
          ctx.fill();
        }
        ctx.strokeStyle = rgbaFix(pal.colors[0], 0.2);
        ctx.stroke();
      }
    }
  }

  function drawStarburst(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(2, 9, density / 10));
    for (let i = 0; i < count; i++) {
      const cx = rand() * w, cy = rand() * h;
      const rays = 8 + Math.floor(rand() * 10);
      const outerR = Math.min(w, h) * lerp(0.1, 0.45, rand());
      const innerR = outerR * lerp(0.2, 0.5, rand());
      const rot = rand() * Math.PI;
      const color = pick(pal.colors);
      const alpha = lerp(0.4, 0.9, rand());
      ctx.beginPath();
      for (let r = 0; r < rays * 2; r++) {
        const ang = (r / (rays * 2)) * Math.PI * 2 + rot;
        const radius = r % 2 === 0 ? outerR : innerR;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
      g.addColorStop(0, rgbaFix(color, alpha));
      g.addColorStop(1, rgbaFix(color, 0));
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function drawCircuit(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const grid = Math.round(lerp(8, 28, density / 10));
    const cellW = w / grid;
    const nodeR = cellW * 0.12;
    ctx.lineWidth = Math.max(1, cellW * 0.08);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    // draw wires
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (rand() > 0.45) continue;
        const cx = (x + 0.5) * cellW, cy = (y + 0.5) * cellW;
        const [dx, dy] = pick(dirs);
        const nx = (x + dx + 0.5) * cellW;
        const ny = (y + dy + 0.5) * cellW;
        if (nx < 0 || nx > w || ny < 0 || ny > h) continue;
        const col = pick(pal.colors);
        ctx.strokeStyle = rgbaFix(col, lerp(0.3, 0.8, rand()));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        // L-shaped trace
        if (rand() > 0.5) {
          ctx.lineTo(nx, cy);
          ctx.lineTo(nx, ny);
        } else {
          ctx.lineTo(cx, ny);
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
    }
    // draw nodes
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (rand() > 0.3) continue;
        const cx = (x + 0.5) * cellW, cy = (y + 0.5) * cellW;
        ctx.beginPath();
        ctx.arc(cx, cy, nodeR * lerp(0.5, 1.8, rand()), 0, Math.PI * 2);
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.6, 1, rand()));
        ctx.fill();
      }
    }
  }

  function drawBrushstroke(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round(lerp(4, 22, density / 10));
    for (let i = 0; i < count; i++) {
      const x0 = rand() * w, y0 = rand() * h;
      const len = Math.min(w, h) * lerp(0.15, 0.6, rand());
      const ang = rand() * Math.PI;
      const x1 = x0 + Math.cos(ang) * len;
      const y1 = y0 + Math.sin(ang) * len;
      const brushW = Math.min(w, h) * lerp(0.01, 0.07, rand());
      const color = pick(pal.colors);
      const alpha = lerp(0.35, 0.85, rand());
      const segs = 12;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const mid = (t0 + t1) / 2;
        const w0 = brushW * Math.sin(t0 * Math.PI) * lerp(0.7, 1, rand());
        const cx = lerp(x0, x1, mid), cy = lerp(y0, y1, mid);
        const px = -Math.sin(ang) * w0, py = Math.cos(ang) * w0;
        ctx.beginPath();
        ctx.moveTo(lerp(x0,x1,t0) + px, lerp(y0,y1,t0) + py);
        ctx.quadraticCurveTo(cx + px * 0.5, cy + py * 0.5, lerp(x0,x1,t1), lerp(y0,y1,t1));
        ctx.quadraticCurveTo(cx - px * 0.5, cy - py * 0.5, lerp(x0,x1,t0) - px, lerp(y0,y1,t0) - py);
        ctx.closePath();
        ctx.fillStyle = rgbaFix(color, alpha * (0.5 + 0.5 * rand()));
        ctx.fill();
      }
    }
  }

  function drawTopography(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const levels = Math.round(lerp(4, 18, density / 10));
    // simple 2D Perlin-ish via summed sines
    const freqs = [
      { fx: rand() * 2 + 1, fy: rand() * 2 + 1, ph: rand() * 10 },
      { fx: rand() * 4 + 2, fy: rand() * 4 + 2, ph: rand() * 10 },
      { fx: rand() * 6 + 3, fy: rand() * 6 + 3, ph: rand() * 10 },
    ];
    function field(x, y) {
      let v = 0;
      for (const f of freqs) v += Math.sin(x / w * Math.PI * f.fx + f.ph) * Math.cos(y / h * Math.PI * f.fy + f.ph);
      return v / freqs.length;
    }
    const step = Math.max(2, Math.round(Math.min(w, h) / 160));
    const cols = Math.ceil(w / step) + 1;
    const rows = Math.ceil(h / step) + 1;
    // precompute grid
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) grid[r][c] = field(c * step, r * step);
    }
    ctx.lineWidth = Math.max(1, w * 0.0008);
    for (let lv = 0; lv < levels; lv++) {
      const threshold = lerp(-0.9, 0.9, lv / levels);
      ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.25, 0.85, rand()));
      ctx.beginPath();
      // marching squares lite: just draw horizontal isocontour crossings
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const v00 = grid[r][c], v10 = grid[r][c+1], v01 = grid[r+1][c], v11 = grid[r+1][c+1];
          const x = c * step, y = r * step;
          // top edge
          if ((v00 < threshold) !== (v10 < threshold)) {
            const t = (threshold - v00) / (v10 - v00);
            ctx.moveTo(x + t * step, y);
            ctx.lineTo(x + t * step, y + (rand() < 0.5 ? step * 0.25 : step));
          }
          // left edge
          if ((v00 < threshold) !== (v01 < threshold)) {
            const t = (threshold - v00) / (v01 - v00);
            ctx.moveTo(x, y + t * step);
            ctx.lineTo(x + (rand() < 0.5 ? step * 0.25 : step), y + t * step);
          }
        }
      }
      ctx.stroke();
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
    voronoi: drawVoronoi,
    hexgrid: drawHexgrid,
    noise: drawNoise,
    spiral: drawSpiral,
    crosshatch: drawCrosshatch,
    confetti: drawConfetti,
    solid: drawSolid,
    gradient: drawGradient,
    checker: drawChecker,
    chevron: drawChevron,
    ripple: drawRipple,
    arches: drawArches,
    glassbars: drawGlassbars,
    diamondnet: drawDiamondNet,
    starburst: drawStarburst,
    circuit: drawCircuit,
    brushstroke: drawBrushstroke,
    topography: drawTopography,
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

  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  // ---------- Render ----------
  function render() {
    const dims = SIZES[state.device][state.sizeIdx];
    cv.width = dims.w;
    cv.height = dims.h;
    frameLabel.textContent = `${dims.w} × ${dims.h}`;

    const pal = activePalette();
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
  updateFieldVisibility();
  render();
})();
