const Generator = (() => {

  /* ── Mulberry32 PRNG ── */
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToVec3(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
  }

  function lerp3(a, b, t) {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }

  /* 4 hex stops -> 7 vec3 tones (lerp c0→c1, c1→c2, c2→c3) */
  function expandPalette(hexColors) {
    const [c0, c1, c2, c3] = hexColors.map(hexToVec3);
    return [
      c0,
      lerp3(c0, c1, 0.5),
      c1,
      lerp3(c1, c2, 0.5),
      c2,
      lerp3(c2, c3, 0.5),
      c3,
    ];
  }

  /* Weighted aesthetic pick — weights must sum to 1.0 */
  const AESTHETIC_WEIGHTS = [
    { id: 'ethereal',    w: 0.10 },
    { id: 'organic',     w: 0.10 },
    { id: 'cosmic',      w: 0.09 },
    { id: 'watercolor',  w: 0.09 },
    { id: 'molten',      w: 0.08 },
    { id: 'botanical',   w: 0.08 },
    { id: 'neonnoir',    w: 0.07 },
    { id: 'arctic',      w: 0.07 },
    { id: 'crystalline', w: 0.09 },
    { id: 'silk',        w: 0.08 },
    { id: 'sacred',      w: 0.07 },
    { id: 'glitch',      w: 0.05 },
    { id: 'mycelium',    w: 0.06 },
    { id: 'brutalist',   w: 0.04 },
    { id: 'retrotech',   w: 0.03 },
  ];

  function pickAesthetic(rng) {
    const r = rng();
    let acc = 0;
    for (const { id, w } of AESTHETIC_WEIGHTS) {
      acc += w;
      if (r < acc) return AESTHETICS.find(a => a.id === id);
    }
    return AESTHETICS[AESTHETICS.length - 1];
  }

  function pickPalette(aestheticId, rng, opts) {
    const force = opts && opts.force;
    const aesthetic = AESTHETICS.find(a => a.id === aestheticId);
    const tags = AESTHETIC_PALETTE_MAP[aesthetic ? aesthetic.mode : 0] || [];
    const compatible = PALETTES.filter(p => p.tags.some(t => tags.includes(t)));
    let pool = compatible.length ? compatible : PALETTES;
    if (!force) {
      const highContrast = pool.filter(p => !p.lowContrast);
      if (highContrast.length) pool = highContrast;
    }
    return pool[Math.floor(rng() * pool.length)];
  }

  /* Per-mode param semantics — same as before, but rng() instead of seedRand */
  function pickParams(aestheticId, rng) {
    const aesthetic = AESTHETICS.find(a => a.id === aestheticId);
    const mode = aesthetic ? aesthetic.mode : 0;
    const r = () => rng();
    switch (mode) {
      case 0: return [0.3 + r()*0.5, 0.6 + r()*0.4, 0.5 + r()*1.0, 0.4 + r()*0.5];
      case 1: return [r(), 0.3 + r()*0.5, r(), 0.3 + r()*0.5];
      case 2: return [r(), 0.4 + r()*0.8, r(), 0.3 + r()*0.5];
      case 3: return [r(), 0.3 + r()*0.5, r(), 0.2 + r()*0.3];
      case 4: return [0.3 + r()*0.5, r(), 0.5 + r()*0.5, 0.2 + r()*0.4];
      case 5: return [0.6 + r()*0.6, 0.3 + r()*0.5, 0.3 + r()*0.4, 0.05 + r()*0.08];
      case 6: return [r(), 0.4 + r()*0.5, 0.2 + r()*0.4, 0.001 + r()*0.003];
      case 7: return [4.0 + r()*3.0, 0.03 + r()*0.05, r(), 0.5 + r()*0.5];
      case 8: return [r(), 0.4 + r()*0.6, r(), 0.1 + r()*0.3];
      case 9: return [0.8 + r()*0.6, 0.3 + r()*0.2, 0.15 + r()*0.15, 0.5 + r()*0.4];
      case 10: return [r(), r(), r(), r()]; // density/complexity/symmetry/colorShift driven by settings
      case 11: return [r(), r(), r(), r()];
      case 12: return [r(), r(), r(), r()];
      case 13: return [r(), r(), r(), r()];
      case 14: return [r(), r(), r(), r()];
      default: return [r(), r(), r(), r()];
    }
  }

  /* Slight per-seed opacity variation on each layer (±10%) */
  function deriveLayerOpacities(aestheticId, rng) {
    const aesthetic = AESTHETICS.find(a => a.id === aestheticId);
    const layers = aesthetic ? aesthetic.layers : [];
    return layers.map(l => Math.max(0.05, Math.min(1.0, l.opacity + (rng() - 0.5) * 0.56)));
  }

  /* seedInt: integer 0-999999 */
  function generateWallpaper(seedInt) {
    seedInt = seedInt >>> 0;
    const rng = mulberry32(seedInt);

    const aesthetic      = pickAesthetic(rng);
    const paletteDef     = pickPalette(aesthetic.id, rng);
    const params         = pickParams(aesthetic.id, rng);
    const layerOpacities = deriveLayerOpacities(aesthetic.id, rng);
    const noiseOffset    = { x: rng() * 1000, y: rng() * 1000 };
    const compositionBias = {
      focalX:   0.2 + rng() * 0.6,
      focalY:   0.2 + rng() * 0.6,
      rotation: rng() * Math.PI * 2,
      scale:    0.6 + rng() * 0.8,
    };

    const tones = expandPalette(paletteDef.colors);
    const palette = {
      color0: tones[0], color1: tones[2], color2: tones[4], color3: tones[6],
      tones,
    };

    /* Seed-driven base values for the new settings sliders */
    const seedSettings = {
      density:    0.3 + rng() * 0.5,   /* 0–1, default ~0.5 */
      complexity: 0.3 + rng() * 0.6,   /* 0–1 */
      symmetry:   Math.floor(rng() * 2.5), /* 0,1,2 (rarely 3 for sacred) */
      colorShift: rng() * 0.25,         /* subtle by default */
    };
    /* Sacred geometry benefits from higher symmetry */
    if (aesthetic.id === 'sacred') seedSettings.symmetry = Math.floor(rng() * 3) + 1;

    /* seed string for display / URL */
    const seed = `WF-${String(seedInt).padStart(6, '0')}`;

    return { seedInt, seed, aesthetic, palette, paletteDef, params, layerOpacities, noiseOffset, compositionBias, seedSettings };
  }

  return { pickAesthetic, pickPalette, pickParams, deriveLayerOpacities, generateWallpaper, hexToVec3, expandPalette, mulberry32 };
})();
