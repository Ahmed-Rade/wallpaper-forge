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

  /* Weighted aesthetic pick — weights must sum to 1.0 */
  const AESTHETIC_WEIGHTS = [
    { id: 'ethereal',   w: 0.15 },
    { id: 'organic',    w: 0.15 },
    { id: 'cosmic',     w: 0.12 },
    { id: 'watercolor', w: 0.12 },
    { id: 'molten',     w: 0.10 },
    { id: 'botanical',  w: 0.10 },
    { id: 'neonnoir',   w: 0.08 },
    { id: 'arctic',     w: 0.08 },
    { id: 'brutalist',  w: 0.06 },
    { id: 'retrotech',  w: 0.04 },
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

  function pickPalette(aestheticId, rng) {
    const aesthetic = AESTHETICS.find(a => a.id === aestheticId);
    const tags = AESTHETIC_PALETTE_MAP[aesthetic ? aesthetic.mode : 0] || [];
    const compatible = PALETTES.filter(p => p.tags.some(t => tags.includes(t)));
    const pool = compatible.length ? compatible : PALETTES;
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
      default: return [r(), r(), r(), r()];
    }
  }

  /* Slight per-seed opacity variation on each layer (±10%) */
  function deriveLayerOpacities(aestheticId, rng) {
    const aesthetic = AESTHETICS.find(a => a.id === aestheticId);
    const layers = aesthetic ? aesthetic.layers : [];
    return layers.map(l => Math.max(0.05, Math.min(1.0, l.opacity + (rng() - 0.5) * 0.2)));
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

    const palette = {
      color0: hexToVec3(paletteDef.colors[0]),
      color1: hexToVec3(paletteDef.colors[1]),
      color2: hexToVec3(paletteDef.colors[2]),
      color3: hexToVec3(paletteDef.colors[3]),
    };

    /* seed string for display / URL */
    const seed = `WF-${String(seedInt).padStart(6, '0')}`;

    return { seedInt, seed, aesthetic, palette, paletteDef, params, layerOpacities, noiseOffset };
  }

  return { pickAesthetic, pickPalette, pickParams, deriveLayerOpacities, generateWallpaper, hexToVec3, mulberry32 };
})();
