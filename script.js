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
      { label: "1320 × 2868", w: 1320, h: 2868 },
      { label: "1206 × 2622", w: 1206, h: 2622 },
      { label: "1170 × 2532", w: 1170, h: 2532 },
      { label: "750 × 1334", w: 750, h: 1334 },
      { label: "1280 × 2856", w: 1280, h: 2856 },
      { label: "1080 × 2400", w: 1080, h: 2400 },
      { label: "1080 × 2340", w: 1080, h: 2340 },
      { label: "1440 × 3120", w: 1440, h: 3120 },
    ],
    desktop: [
      { label: "1920 × 1080", w: 1920, h: 1080 },
      { label: "2560 × 1440", w: 2560, h: 1440 },
      { label: "3840 × 2160", w: 3840, h: 2160 },
      { label: "5120 × 2880", w: 5120, h: 2880 },
      { label: "3024 × 1964", w: 3024, h: 1964 },
      { label: "3456 × 2234", w: 3456, h: 2234 },
      { label: "2560 × 1600", w: 2560, h: 1600 },
      { label: "3440 × 1440", w: 3440, h: 1440 },
      { label: "5120 × 1440", w: 5120, h: 1440 },
      { label: "1280 × 720", w: 1280, h: 720 },
    ],
    square: [
      { label: "1080 × 1080", w: 1080, h: 1080 },
      { label: "1440 × 1440", w: 1440, h: 1440 },
      { label: "2048 × 2048", w: 2048, h: 2048 },
      { label: "2880 × 2880", w: 2880, h: 2880 },
    ],
  };

  // ---------- Palettes (each: bg + array of accent colors) ----------
  // Each palette ships a dark variant (default) and a light variant.
  const PALETTES = [
    // — DARK MOODY —
    // Deep backgrounds, one dominant accent, one contrast, two supporting
    { name: "Ember",
      dark:  { bg: "#0f0a08", colors: ["#e8490f", "#f5a623", "#ffffff", "#3a1a0a"] },
      light: { bg: "#fdf3ec", colors: ["#c83200", "#a06010", "#1a0800", "#f0c090"] } },
    { name: "Midnight",
      dark:  { bg: "#080c18", colors: ["#4d7cfe", "#a0c4ff", "#ffffff", "#1a2240"] },
      light: { bg: "#eef2ff", colors: ["#2040c0", "#0010a0", "#001080", "#90b0ff"] } },
    { name: "Obsidian",
      dark:  { bg: "#0a0a0a", colors: ["#e0e0e0", "#888888", "#ffffff", "#333333"] },
      light: { bg: "#f5f5f5", colors: ["#111111", "#444444", "#888888", "#cccccc"] } },
    { name: "Blood Orange",
      dark:  { bg: "#0d0505", colors: ["#ff3a00", "#ff8c42", "#ffffff", "#3a0a00"] },
      light: { bg: "#fff4f0", colors: ["#cc2200", "#aa5500", "#1a0800", "#ffb090"] } },
    { name: "Deep Purple",
      dark:  { bg: "#0c0814", colors: ["#9b5de5", "#e040fb", "#ffffff", "#2a1040"] },
      light: { bg: "#f5eeff", colors: ["#6010c0", "#9000c0", "#200060", "#d0a0ff"] } },
    { name: "Sulfur",
      dark:  { bg: "#0a0c00", colors: ["#d4ff00", "#88cc00", "#ffffff", "#2a3000"] },
      light: { bg: "#f8ffe0", colors: ["#5a7a00", "#3a5000", "#1a2000", "#aadd00"] } },
    { name: "Void",
      dark:  { bg: "#050508", colors: ["#00e5ff", "#0090ff", "#ffffff", "#001830"] },
      light: { bg: "#e8f8ff", colors: ["#0060b0", "#0030a0", "#001050", "#80d0ff"] } },
    { name: "Charcoal Rose",
      dark:  { bg: "#100c0e", colors: ["#ff4d6d", "#ff8fa3", "#ffffff", "#3a1020"] },
      light: { bg: "#fff0f3", colors: ["#c0002a", "#800020", "#1a0010", "#ff9090"] } },
    // — VIBRANT / NEON —
    // True neon: saturated, glowing, meant for dark mode
    { name: "Neon Tokyo",
      dark:  { bg: "#08050f", colors: ["#ff00aa", "#00ffcc", "#ffe600", "#7700ff"] },
      light: { bg: "#f0eaff", colors: ["#cc0088", "#008866", "#aa8800", "#5500cc"] } },
    { name: "Acid",
      dark:  { bg: "#080f00", colors: ["#aaff00", "#00ffaa", "#ffffff", "#224400"] },
      light: { bg: "#f0ffe0", colors: ["#448800", "#006644", "#001a00", "#88dd00"] } },
    { name: "Plasma",
      dark:  { bg: "#0a0014", colors: ["#ff0080", "#8000ff", "#00ccff", "#ff6600"] },
      light: { bg: "#ffeeff", colors: ["#aa0060", "#5500cc", "#0066aa", "#cc4400"] } },
    { name: "Synthwave",
      dark:  { bg: "#0d0020", colors: ["#ff2fff", "#00e5ff", "#ff8800", "#7700ff"] },
      light: { bg: "#f5eaff", colors: ["#aa00aa", "#007799", "#aa5500", "#5500cc"] } },
    { name: "Infrared",
      dark:  { bg: "#100000", colors: ["#ff1a00", "#ff6600", "#ffcc00", "#660000"] },
      light: { bg: "#fff5f0", colors: ["#cc1000", "#aa4400", "#886600", "#ff6040"] } },
    // — NATURAL / WARM —
    // Earthy, muted, analog feel — good contrast, no muddy mixes
    { name: "Terracotta",
      dark:  { bg: "#1c1208", colors: ["#c45e2a", "#e8a060", "#f0dcc0", "#4a3018"] },
      light: { bg: "#f8efe4", colors: ["#a04020", "#703010", "#2a1008", "#e0a060"] } },
    { name: "Desert Sand",
      dark:  { bg: "#1a1408", colors: ["#d4a855", "#e8c880", "#f5e8c0", "#5a4020"] },
      light: { bg: "#fdf5e0", colors: ["#886020", "#604010", "#1e1008", "#c8960a"] } },
    { name: "Forest",
      dark:  { bg: "#0a1408", colors: ["#4a8c3f", "#8fbc6a", "#d0e8b0", "#1a3010"] },
      light: { bg: "#edf5e8", colors: ["#2a6020", "#1a4018", "#0a1808", "#70a050"] } },
    { name: "Olive Drab",
      dark:  { bg: "#10120a", colors: ["#8a9a30", "#c0cc60", "#e8e8b0", "#303818"] },
      light: { bg: "#f5f5e0", colors: ["#505a10", "#303800", "#101800", "#a0aa40"] } },
    { name: "Clay",
      dark:  { bg: "#180e0a", colors: ["#b86840", "#e09a6a", "#f0d0b0", "#4a2010"] },
      light: { bg: "#faf0e8", colors: ["#904828", "#603018", "#200c08", "#d08050"] } },
    { name: "Dusk",
      dark:  { bg: "#140c18", colors: ["#d4607a", "#e8a0a8", "#f0d0c0", "#6a2040"] },
      light: { bg: "#fdf0f3", colors: ["#a02840", "#702030", "#200010", "#e09090"] } },
    { name: "Moss",
      dark:  { bg: "#0c1610", colors: ["#3a7a50", "#70b070", "#c0ddb0", "#18381e"] },
      light: { bg: "#edf8f0", colors: ["#1a5830", "#0a3820", "#041808", "#60a060"] } },
    { name: "Rust",
      dark:  { bg: "#140a04", colors: ["#c04820", "#e08040", "#f0c090", "#4a1808"] },
      light: { bg: "#fdf0e8", colors: ["#a03010", "#702008", "#1e0808", "#e07040"] } },
    // — COOL / OCEANIC —
    // Blues, teals, cyans — clean and minimal
    { name: "Ocean",
      dark:  { bg: "#04101c", colors: ["#0088cc", "#00c8e8", "#a0e0f8", "#002a48"] },
      light: { bg: "#e8f6fc", colors: ["#005888", "#003a6a", "#001830", "#60c0e8"] } },
    { name: "Teal",
      dark:  { bg: "#041414", colors: ["#009988", "#00ccaa", "#a0eedf", "#002a28"] },
      light: { bg: "#e8faf7", colors: ["#006858", "#004038", "#001818", "#40c0a0"] } },
    { name: "Arctic",
      dark:  { bg: "#060e14", colors: ["#40a0cc", "#80ccee", "#d0eeff", "#102030"] },
      light: { bg: "#edf6fc", colors: ["#1060a0", "#083060", "#041828", "#70b8e8"] } },
    { name: "Cobalt",
      dark:  { bg: "#06081e", colors: ["#2248e8", "#6080ff", "#c0d0ff", "#0c1448"] },
      light: { bg: "#eef1ff", colors: ["#1430c0", "#0820a0", "#040c60", "#7090ff"] } },
    // — MINIMAL / MONO —
    // One or two hue families, clean structure
    { name: "Warm Paper",
      dark:  { bg: "#181410", colors: ["#d8cdb8", "#a09080", "#685848", "#f5f0e8"] },
      light: { bg: "#f8f4ee", colors: ["#2a2018", "#5a4838", "#8a7868", "#c8baa8"] } },
    { name: "Cool Steel",
      dark:  { bg: "#0e1218", colors: ["#c0ccd8", "#8898a8", "#506070", "#e8eef4"] },
      light: { bg: "#f0f4f8", colors: ["#1a2838", "#384858", "#607080", "#b0bec8"] } },
    { name: "Sepia",
      dark:  { bg: "#120e08", colors: ["#c0a060", "#e0c890", "#f5e8c0", "#3a2c10"] },
      light: { bg: "#fdf8ee", colors: ["#604820", "#402808", "#180e00", "#c09840"] } },
  ];

  const PATTERN_DEFS = [
    { id: "solid",      label: "Solid Color" },
    { id: "stripes",    label: "Stripes" },
    { id: "grid",       label: "Grid" },
    { id: "dots",       label: "Dot Field" },
    { id: "waves",      label: "Waves" },
    { id: "triangles",  label: "Triangles" },
    { id: "shards",     label: "Shards" },
    { id: "scatter",    label: "Scatter Marks" },
    { id: "hexgrid",    label: "Hex Grid" },
    { id: "spiral",     label: "Spiral" },
    { id: "crosshatch", label: "Crosshatch" },
    { id: "confetti",   label: "Confetti" },
    { id: "gradient",   label: "Gradient" },
    { id: "checker",    label: "Checker" },
    { id: "chevron",    label: "Chevron" },
    { id: "ripple",     label: "Ripple" },
    { id: "diamondnet", label: "Diamond Net" },
    { id: "circuit",    label: "Circuit" },
    { id: "halftone",   label: "Halftone" },
    { id: "mosaic",     label: "Mosaic" },
    { id: "truchet",    label: "Truchet" },
  ];

  // ---------- State ----------
  const state = {
    device: "phone",
    sizeIdx: 2,
    pattern: "stripes",
    paletteIdx: 0,
    mode: "dark",
    density: 5,
    grain: 3,
    solidColor: "#16282c",
    customW: 1170,
    customH: 2532,
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
  const customResRow = document.getElementById('customResRow');
  const customW = document.getElementById('customW');
  const customH = document.getElementById('customH');
  const detectResBtn = document.getElementById('detectResBtn');

  function currentDims() {
    if (state.device === 'custom') return { w: state.customW, h: state.customH };
    return SIZES[state.device][state.sizeIdx];
  }

  function buildSizeOptions() {
    const isCustom = state.device === 'custom';
    sizeSelect.style.display = isCustom ? 'none' : '';
    customResRow.style.display = isCustom ? 'flex' : 'none';
    detectResBtn.style.display = isCustom ? 'block' : 'none';
    if (isCustom) {
      customW.value = state.customW;
      customH.value = state.customH;
      return;
    }
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
    const fn = RENDERERS[patternId] || drawStripes;
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

  function clampRes(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) return 1;
    return Math.max(1, Math.min(8000, v));
  }

  customW.addEventListener('change', () => {
    state.customW = clampRes(customW.value);
    customW.value = state.customW;
    render();
  });
  customH.addEventListener('change', () => {
    state.customH = clampRes(customH.value);
    customH.value = state.customH;
    render();
  });

  detectResBtn.addEventListener('click', () => {
    const dpr = window.devicePixelRatio || 1;
    state.customW = clampRes(Math.round(window.screen.width * dpr));
    state.customH = clampRes(Math.round(window.screen.height * dpr));
    customW.value = state.customW;
    customH.value = state.customH;
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
    neon:    ["Neon Tokyo","Acid","Plasma","Synthwave","Infrared","Void","Sulfur"],
    organic: ["Terracotta","Desert Sand","Forest","Clay","Moss","Rust","Dusk","Olive Drab"],
    cool:    ["Ocean","Teal","Arctic","Cobalt","Void","Midnight"],
    moody:   ["Midnight","Obsidian","Deep Purple","Ember","Charcoal Rose","Sepia","Warm Paper","Cool Steel","Blood Orange"],
    warm:    ["Ember","Terracotta","Desert Sand","Clay","Rust","Dusk","Sepia"],
  };
  const PATTERN_MOOD = {
    stripes:"organic", grid:"cool", dots:"warm", waves:"cool", triangles:"moody",
    shards:"neon", scatter:"warm", hexgrid:"cool", spiral:"neon", crosshatch:"moody",
    confetti:"warm", gradient:"neon", checker:"moody", chevron:"organic", ripple:"cool",
    diamondnet:"cool", circuit:"neon", halftone:"moody", mosaic:"organic", truchet:"cool",
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
    const dims = currentDims();
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
    const cols = Math.round(lerp(8, 28, density / 10));
    const cellW = w / cols;
    const rows = Math.ceil(h / cellW);
    const nodeR = cellW * 0.12;
    ctx.lineWidth = Math.max(1, cellW * 0.08);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rand() > 0.45) continue;
        const cx = (x + 0.5) * cellW, cy = (y + 0.5) * cellW;
        const [dx, dy] = pick(dirs);
        const nx = (x + dx + 0.5) * cellW;
        const ny = (y + dy + 0.5) * cellW;
        if (nx < 0 || nx > w || ny < 0 || ny > h) continue;
        ctx.strokeStyle = rgbaFix(pick(pal.colors), lerp(0.3, 0.8, rand()));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        if (rand() > 0.5) {
          ctx.lineTo(nx, cy); ctx.lineTo(nx, ny);
        } else {
          ctx.lineTo(cx, ny); ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rand() > 0.3) continue;
        const cx = (x + 0.5) * cellW, cy = (y + 0.5) * cellW;
        ctx.beginPath();
        ctx.arc(cx, cy, nodeR * lerp(0.5, 1.8, rand()), 0, Math.PI * 2);
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.6, 1, rand()));
        ctx.fill();
      }
    }
  }

  function drawHalftone(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(20, 80, density / 10));
    const cell = w / cols;
    const rows = Math.ceil(h / cell) + 1;
    const angle = pick([0, 15, 30, 45]) * Math.PI / 180;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);
    const diag = Math.sqrt(w * w + h * h);
    const gcols = Math.ceil(diag / cell) + 2;
    const grows = Math.ceil(diag / cell) + 2;
    for (let row = -grows; row < grows; row++) {
      for (let col = -gcols; col < gcols; col++) {
        const cx = col * cell + (row % 2 === 0 ? 0 : cell * 0.5);
        const cy = row * cell;
        // map center back to canvas coords to sample a "brightness" value
        const wx = cx + w / 2;
        const wy = cy + h / 2;
        const nx = wx / w, ny = wy / h;
        const v = (Math.sin(nx * Math.PI * 3 + rand() * 0.3) * 0.5 + 0.5) *
                  (Math.cos(ny * Math.PI * 5 + rand() * 0.3) * 0.5 + 0.5);
        const r = cell * 0.48 * lerp(0.05, 0.95, v);
        if (r < 0.5) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.5, 1, v));
        ctx.fill();
      }
    }
    ctx.restore();
    void rows; void cols;
  }

  function drawMosaic(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(6, 28, density / 10));
    const cell = w / cols;
    const rows = Math.ceil(h / cell) + 1;
    const groutW = Math.max(1, cell * 0.06);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // slight random offset per tile for organic feel
        const ox = (rand() - 0.5) * cell * 0.08;
        const oy = (rand() - 0.5) * cell * 0.08;
        const x = col * cell + groutW / 2 + ox;
        const y = row * cell + groutW / 2 + oy;
        const s = cell - groutW + (rand() - 0.5) * groutW * 0.5;
        if (rand() > 0.88) continue; // occasional missing tile
        ctx.fillStyle = rgbaFix(pick(pal.colors), lerp(0.65, 1, rand()));
        ctx.fillRect(x, y, s, s);
      }
    }
  }

  function drawTruchet(ctx, w, h, pal, density) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const cols = Math.round(lerp(6, 28, density / 10));
    const cell = w / cols;
    const rows = Math.ceil(h / cell) + 1;
    ctx.lineWidth = Math.max(1, cell * lerp(0.08, 0.18, rand()));
    const useFill = rand() > 0.5; // either arc-fill or arc-stroke style
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cell;
        const y = row * cell;
        const flip = rand() > 0.5;
        const color = pick(pal.colors);
        const alpha = lerp(0.55, 1, rand());
        ctx.strokeStyle = rgbaFix(color, alpha);
        ctx.fillStyle   = rgbaFix(color, alpha * 0.35);
        ctx.beginPath();
        if (flip) {
          ctx.arc(x,        y,        cell * 0.5, 0,           Math.PI / 2);
          ctx.arc(x + cell, y + cell, cell * 0.5, Math.PI,     Math.PI * 3 / 2);
        } else {
          ctx.arc(x + cell, y,        cell * 0.5, Math.PI / 2, Math.PI);
          ctx.arc(x,        y + cell, cell * 0.5, Math.PI * 3 / 2, Math.PI * 2);
        }
        ctx.stroke();
        if (useFill) ctx.fill();
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
    stripes:    drawStripes,
    grid:       drawGrid,
    dots:       drawDots,
    waves:      drawWaves,
    triangles:  drawTriangles,
    shards:     drawShards,
    scatter:    drawScatter,
    hexgrid:    drawHexgrid,
    spiral:     drawSpiral,
    crosshatch: drawCrosshatch,
    confetti:   drawConfetti,
    solid:      drawSolid,
    gradient:   drawGradient,
    checker:    drawChecker,
    chevron:    drawChevron,
    ripple:     drawRipple,
    diamondnet: drawDiamondNet,
    circuit:    drawCircuit,
    halftone:   drawHalftone,
    mosaic:     drawMosaic,
    truchet:    drawTruchet,
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
    const dims = currentDims();
    cv.width = dims.w;
    cv.height = dims.h;
    frameLabel.textContent = `${dims.w} × ${dims.h}`;

    const pal = activePalette();
    const fn = RENDERERS[state.pattern] || drawStripes;

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
