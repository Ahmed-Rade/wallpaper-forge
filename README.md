# Wallpaper Forge

A browser-based wallpaper generator. Pick a device, a pattern, and a palette — get a unique, downloadable wallpaper. No backend, no uploads, no tracking. Everything renders client-side on an HTML canvas.

**🚧 v1 — early version, actively improving.**

## Features

- **Device presets** — Phone, Desktop, or Square, each with real resolutions (iPhone 16 Pro Max, 4K, MacBook Pro, etc.)
- **9 procedural patterns** — stripes, grid, dots, waves, blobs, triangles, rings, shards, scatter marks
- **12 curated palettes** — terracotta dusk, acid night, cobalt pop, and more
- **Density & grain controls** — tune complexity and texture
- **Reroll** — generate a new random variation of the current pattern
- **Download PNG** — exports at full native resolution

## Usage

No build step, no dependencies. Just open `index.html` in a browser.

```bash
git clone https://github.com/<your-username>/wallpaper-forge.git
cd wallpaper-forge
open index.html   # or just double-click the file
```

Or visit the live GitHub Pages version: `https://<your-username>.github.io/wallpaper-forge/`

## Roadmap

Planned for future versions:

- [ ] More pattern types (gradients, noise fields, typography-based)
- [ ] Custom palette editor
- [ ] Save/share generated wallpapers via URL (seed in query string)
- [ ] Animated/live wallpaper export
- [ ] Mobile-friendly touch controls polish

## Tech

Single HTML file. Vanilla JS, Canvas API, no frameworks.

## License

MIT — do whatever you want with it.
