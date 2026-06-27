const AESTHETICS = [
  {
    id: 'ethereal',
    name: 'Ethereal',
    mode: 0,
    compatiblePalettes: ['aurora', 'bioluminescent', 'midnight', 'deepocean'],
    layers: [
      { pass: 'base_noise',    blend: 'normal', opacity: 1.0 },
      { pass: 'glow_centers',  blend: 'screen', opacity: 0.7 },
      { pass: 'vignette',      blend: 'multiply', opacity: 0.8 },
    ],
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    mode: 1,
    compatiblePalettes: ['monochrome', 'constructivist', 'acidnight', 'terracotta'],
    layers: [
      { pass: 'geo_fill',    blend: 'normal',  opacity: 1.0 },
      { pass: 'geo_outline', blend: 'normal',  opacity: 0.5 },
      { pass: 'grain',       blend: 'overlay', opacity: 0.15 },
    ],
  },
  {
    id: 'organic',
    name: 'Organic',
    mode: 2,
    compatiblePalettes: ['terrain', 'geological', 'savanna', 'tundra'],
    layers: [
      { pass: 'terrain_base',   blend: 'normal',  opacity: 1.0 },
      { pass: 'terrain_detail', blend: 'overlay', opacity: 0.4 },
      { pass: 'contours',       blend: 'normal',  opacity: 0.6 },
    ],
  },
  {
    id: 'retrotech',
    name: 'Retro Tech',
    mode: 3,
    compatiblePalettes: ['phosphor', 'terminal', 'cobalt', 'amber'],
    layers: [
      { pass: 'grid_bg',   blend: 'normal',   opacity: 1.0 },
      { pass: 'traces',    blend: 'screen',   opacity: 0.8 },
      { pass: 'scanlines', blend: 'multiply', opacity: 0.92 },
    ],
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    mode: 4,
    compatiblePalettes: ['nebula', 'deepspace', 'aurora', 'midnight'],
    layers: [
      { pass: 'space_bg', blend: 'normal', opacity: 1.0 },
      { pass: 'nebula',   blend: 'screen', opacity: 0.5 },
      { pass: 'stars',    blend: 'screen', opacity: 1.0 },
    ],
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    mode: 5,
    compatiblePalettes: ['pastel', 'wash', 'sakura', 'lagoon'],
    layers: [
      { pass: 'washes',      blend: 'normal',  opacity: 1.0 },
      { pass: 'pooling',     blend: 'multiply', opacity: 0.5 },
      { pass: 'paper_grain', blend: 'overlay', opacity: 0.2 },
    ],
  },
  {
    id: 'neonnoir',
    name: 'Neon Noir',
    mode: 6,
    compatiblePalettes: ['cyberpunk', 'midnight', 'acidnight', 'cobalt'],
    layers: [
      { pass: 'city_bg',     blend: 'normal', opacity: 1.0 },
      { pass: 'lights_rain', blend: 'screen', opacity: 0.85 },
      { pass: 'reflections', blend: 'screen', opacity: 0.6 },
    ],
  },
  {
    id: 'arctic',
    name: 'Arctic',
    mode: 7,
    compatiblePalettes: ['glacier', 'tundra', 'deepocean', 'monochrome'],
    layers: [
      { pass: 'ice_base',       blend: 'normal',     opacity: 1.0 },
      { pass: 'cracks',         blend: 'normal',     opacity: 0.85 },
      { pass: 'light_gradient', blend: 'soft_light', opacity: 0.5 },
    ],
  },
  {
    id: 'botanical',
    name: 'Botanical',
    mode: 8,
    compatiblePalettes: ['terrain', 'savanna', 'bioluminescent', 'terracotta'],
    layers: [
      { pass: 'canopy_back',     blend: 'normal',     opacity: 1.0 },
      { pass: 'canopy_front',    blend: 'normal',     opacity: 1.0 },
      { pass: 'overhead_light',  blend: 'soft_light', opacity: 0.5 },
    ],
  },
  {
    id: 'molten',
    name: 'Molten',
    mode: 9,
    compatiblePalettes: ['terracotta', 'amber', 'phosphor', 'acidnight'],
    layers: [
      { pass: 'heat_field', blend: 'normal', opacity: 1.0 },
      { pass: 'crust',      blend: 'multiply', opacity: 0.85 },
      { pass: 'glow',       blend: 'screen', opacity: 0.6 },
    ],
  },
  {
    id: 'crystalline',
    name: 'Crystalline',
    mode: 10,
    compatiblePalettes: ['glacier', 'steelglass', 'arcticdawn', 'ultraviolet', 'plasma'],
    layers: [
      { pass: 'facet_fill',  blend: 'normal',   opacity: 1.0 },
      { pass: 'facet_edges', blend: 'screen',    opacity: 0.7 },
      { pass: 'specular',    blend: 'screen',    opacity: 0.9 },
    ],
  },
  {
    id: 'silk',
    name: 'Fluid Silk',
    mode: 11,
    compatiblePalettes: ['dusklinen', 'ashplum', 'sagepaper', 'mothwing', 'pastel'],
    layers: [
      { pass: 'base_flow', blend: 'normal',    opacity: 1.0 },
      { pass: 'ribbons',   blend: 'screen',    opacity: 0.8 },
      { pass: 'sheen',     blend: 'soft_light', opacity: 0.6 },
    ],
  },
  {
    id: 'sacred',
    name: 'Sacred Geometry',
    mode: 12,
    compatiblePalettes: ['obsidianflame', 'midnightindigo', 'voidbloom', 'deepcrimson', 'ultraviolet'],
    layers: [
      { pass: 'background_rings', blend: 'normal',       opacity: 1.0 },
      { pass: 'star_lattice',     blend: 'screen',       opacity: 0.85 },
      { pass: 'center_glow',      blend: 'screen',       opacity: 0.9 },
    ],
  },
  {
    id: 'glitch',
    name: 'Glitch',
    mode: 13,
    compatiblePalettes: ['acidrain', 'neonsunset', 'reactorcore', 'plasma', 'voidbloom'],
    layers: [
      { pass: 'slice_base',      blend: 'normal',   opacity: 1.0 },
      { pass: 'block_glitch',    blend: 'screen',   opacity: 0.75 },
      { pass: 'scanlines_color', blend: 'overlay',  opacity: 0.4 },
    ],
  },
  {
    id: 'mycelium',
    name: 'Mycelium',
    mode: 14,
    compatiblePalettes: ['forestfloor', 'stonemoss', 'crypt', 'tarpit', 'sagepaper'],
    layers: [
      { pass: 'substrate', blend: 'normal',    opacity: 1.0 },
      { pass: 'network',   blend: 'screen',    opacity: 0.9 },
      { pass: 'spores',    blend: 'screen',    opacity: 0.8 },
    ],
  },
];

/* ════════════════════════════════════════
   PALETTE CATALOGUE — 30 curated palettes
   colors: [c0, c1, c2, c3] hex, darkest→lightest
════════════════════════════════════════ */
const PALETTES = [
  /* ── DARK / MOODY (8) ── */
  { id:'obsidianflame',  name:'Obsidian Flame',  colors:['#0a0604','#3d120a','#c4401f','#f2a65a'], tags:['dark','warm','vibrant'] },
  { id:'midnightindigo', name:'Midnight Indigo', colors:['#05050f','#1c1850','#4a3fa0','#9b8ce0'], tags:['dark','cool'] },
  { id:'forestfloor',    name:'Forest Floor',    colors:['#070b06','#1f3018','#3f5c2a','#7d9b4e'], tags:['dark','earthy'] },
  { id:'deepcrimson',    name:'Deep Crimson',    colors:['#0a0203','#3a0810','#8c1024','#d14a4a'], tags:['dark','warm','vibrant'] },
  { id:'abyssal',        name:'Abyssal',         colors:['#000208','#031428','#0a3a52','#1f8fa8'], tags:['dark','cool'] },
  { id:'tarpit',         name:'Tarpit',          colors:['#060604','#22201a','#4a4636','#8a8166'], tags:['dark','earthy','muted'] },
  { id:'crypt',          name:'Crypt',           colors:['#040506','#16201c','#2c4038','#5a8070'], tags:['dark','cool','muted'] },
  { id:'voidbloom',      name:'Void Bloom',      colors:['#05030a','#2a0a3a','#7a1f8c','#d050c8'], tags:['dark','vibrant'] },

  /* ── VIBRANT / ELECTRIC (7) ── */
  { id:'neonsunset',     name:'Neon Sunset',     colors:['#1a0420','#d6166b','#ff7a1a','#ffe35a'], tags:['vibrant','warm'] },
  { id:'acidrain',       name:'Acid Rain',       colors:['#020803','#1a4d12','#7fd62e','#d4ff6a'], tags:['vibrant','cool'] },
  { id:'plasma',         name:'Plasma',          colors:['#06021a','#7a0ad6','#ff2e9e','#ffe0f0'], tags:['vibrant','dark'] },
  { id:'ultraviolet',    name:'Ultraviolet',     colors:['#03001a','#3a0a8c','#9b3fff','#c9a8ff'], tags:['vibrant','dark','cool'] },
  { id:'reactorcore',    name:'Reactor Core',    colors:['#020600','#0a3d0a','#3df54a','#d4ffb0'], tags:['vibrant','dark'] },
  { id:'bioluminescent', name:'Bioluminescent',  colors:['#00050a','#0a2a3a','#1ad6c8','#aef5ff'], tags:['vibrant','cool','dark'] },
  { id:'solarflare',     name:'Solar Flare',     colors:['#1a0500','#992200','#ff6a00','#ffd45a'], tags:['vibrant','warm'] },

  /* ── SOFT / MUTED (7) ── */
  { id:'dusklinen',      name:'Dusk Linen',      colors:['#3a3138','#7a6a72','#c9a8a0','#f2e4d8'], tags:['soft','muted','warm'] },
  { id:'sagepaper',      name:'Sage Paper',      colors:['#3a3f34','#7a8a6a','#b8c4a0','#f0eee0'], tags:['soft','muted','earthy'] },
  { id:'ashplum',        name:'Ash Plum',        colors:['#352832','#5e4a5c','#8f7488','#d8c8d4'], tags:['soft','muted','cool'] },
  { id:'stonemoss',      name:'Stone Moss',      colors:['#2e302a','#5c6452','#94a07c','#d2d8c0'], tags:['soft','muted','earthy'] },
  { id:'palerust',       name:'Pale Rust',       colors:['#3a2620','#8a5040','#c98870','#f0ddc8'], tags:['soft','warm','muted'] },
  { id:'winterbirch',    name:'Winter Birch',    colors:['#2a2e30','#6a767a','#aab4b8','#f4f6f2'], tags:['soft','cool','muted'] },
  { id:'mothwing',       name:'Moth Wing',       colors:['#2c2a24','#5e5848','#928a70','#d4cdb0'], tags:['soft','muted','earthy'] },

  /* ── WARM / EARTHY (5) ── */
  { id:'terracottacanyon', name:'Terracotta Canyon', colors:['#2a1208','#8c3a1e','#d4753a','#f0c08a'], tags:['warm','earthy'] },
  { id:'amberharvest',     name:'Amber Harvest',     colors:['#241004','#8a5210','#e0941e','#f7d77a'], tags:['warm','earthy','vibrant'] },
  { id:'desertsalt',       name:'Desert Salt',       colors:['#2c2418','#8a7150','#cfb284','#f5ead2'], tags:['warm','earthy','muted'] },
  { id:'papyrus',          name:'Papyrus',           colors:['#2a2416','#6e5e3a','#b6a06a','#ece0bc'], tags:['warm','earthy','muted'] },
  { id:'ember',            name:'Ember',             colors:['#1a0604','#5c1408','#c4421a','#ffae5a'], tags:['warm','vibrant','dark'] },

  /* ── COOL / CLEAN (3) ── */
  { id:'arcticdawn',     name:'Arctic Dawn',     colors:['#dce8ee','#aac4d2','#6f95ac','#283c48'], tags:['cool','clean'] },
  { id:'steelglass',     name:'Steel Glass',     colors:['#10141a','#3a4a58','#7c9aac','#dce8ee'], tags:['cool','clean','dark'] },
  { id:'glacier',        name:'Glacier',         colors:['#eef6f8','#bfe0e8','#7cb8cc','#2c5468'], tags:['cool','clean'] },

  /* ── NEW ADDITIONS (8) ── */
  { id:'prismatic',      name:'Prismatic',        colors:['#05030f','#2d0f4a','#7a2ab8','#f0c0ff'], tags:['vibrant','dark','cool'] },
  { id:'infrared',       name:'Infrared',         colors:['#0a0000','#5a0020','#ff1455','#ffb0c8'], tags:['vibrant','warm','dark'] },
  { id:'duskgold',       name:'Dusk Gold',        colors:['#1a0f00','#6a4400','#d4900a','#ffeaa0'], tags:['warm','vibrant','earthy'] },
  { id:'mintchrome',     name:'Mint Chrome',      colors:['#02100e','#0a3830','#1acc98','#b8fff0'], tags:['vibrant','cool','dark'] },
  { id:'violetmist',     name:'Violet Mist',      colors:['#1e1028','#5a3d7a','#a888cc','#f0e4ff'], tags:['soft','cool','muted'] },
  { id:'cinnabar',       name:'Cinnabar',         colors:['#1e0800','#7a2000','#d45020','#ffd0a0'], tags:['warm','earthy','vibrant'] },
  { id:'hailstone',      name:'Hailstone',        colors:['#10141c','#304060','#80a8c8','#e8f4ff'], tags:['cool','clean','dark'] },
  { id:'undergrowth',    name:'Undergrowth',      colors:['#060a04','#1a3010','#4a7830','#a0d060'], tags:['dark','earthy','vibrant'] },
];

/* ════════════════════════════════════════
   AESTHETIC ↔ PALETTE TAG COMPATIBILITY
════════════════════════════════════════ */
/* ════════════════════════════════════════
   CONTRAST CHECK — flag palettes whose tonal
   range is too narrow to read as a wallpaper
════════════════════════════════════════ */
function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n>>16)&255)/255, g = ((n>>8)&255)/255, b = (n&255)/255;
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
PALETTES.forEach(p => {
  const lums = p.colors.map(luminance);
  p.lowContrast = (Math.max(...lums) - Math.min(...lums)) < 0.3;
  /* Weighted toward the darker stops, since the base/background layer
     (rendered at full opacity) dominates perceived brightness far more
     than the lighter accent/highlight stops blended on top at <1 opacity. */
  const sorted = [...lums].sort((a, b) => a - b);
  const weighted = sorted[0]*0.4 + sorted[1]*0.3 + sorted[2]*0.2 + sorted[3]*0.1;
  p.brightness = weighted < 0.3 ? 'dark' : 'light';
});

const AESTHETIC_PALETTE_MAP = {
  0:  ['dark', 'vibrant', 'cool'],           // Ethereal
  1:  ['dark', 'muted', 'clean', 'earthy'],  // Brutalist
  2:  ['earthy', 'muted', 'warm'],           // Organic
  3:  ['vibrant', 'dark', 'cool'],           // Retro Tech
  4:  ['dark', 'vibrant', 'cool'],           // Cosmic
  5:  ['soft', 'warm', 'earthy'],            // Watercolor
  6:  ['dark', 'vibrant'],                   // Neon Noir (only)
  7:  ['cool', 'clean', 'muted'],            // Arctic
  8:  ['earthy', 'vibrant', 'warm', 'dark'], // Botanical
  9:  ['warm', 'dark', 'vibrant'],           // Molten
  10: ['cool', 'vibrant', 'dark'],           // Crystalline
  11: ['soft', 'muted', 'warm'],             // Fluid Silk
  12: ['dark', 'vibrant', 'cool'],           // Sacred Geometry
  13: ['vibrant', 'dark'],                   // Glitch
  14: ['dark', 'earthy', 'muted'],           // Mycelium
};
