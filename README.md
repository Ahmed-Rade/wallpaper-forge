# Wallpaper Forge

A generative wallpaper machine that runs entirely in your browser. Every
seed produces a unique, deterministic wallpaper — pick one you like, export
it at your device's native resolution, and set it as your background.

No backend. No accounts. No tracking. No build step.

## Run it

Open `index.html` in any modern browser.

```bash
git clone https://github.com/<your-username>/wallpaper-forge.git
cd wallpaper-forge
open index.html
```

Or host it for free on GitHub Pages:
`https://<your-username>.github.io/wallpaper-forge/`

## How it works

Every wallpaper is generated from a single integer **seed** (0–999999) fed
into a seeded PRNG. That seed deterministically picks:

- an **aesthetic** (Ethereal, Cosmic, Molten, Botanical, and 7 more),
- a compatible **color palette** from a curated set of 30,
- a handful of per-mode shader parameters and per-layer opacity variation.

The same seed always produces the same wallpaper, on any device, forever.
Rendering happens in real time with WebGL — there are no pre-baked images.

## Controls

| Action | Key / Gesture |
|---|---|
| Next wallpaper | `Space` / `→` / swipe left |
| Back | `←` / `B` / swipe right |
| Save / export | `S` / long press |
| Toggle Evolve mode | `E` |
| Toggle settings | `C` |
| Show shortcuts | `?` |
| Copy seed URL | Click the seed pill (top right) |
| Toggle UI visibility | Tap/click the canvas |

## Saving wallpapers

Tap **Save** (or press `S`). If the settings panel is closed, you'll get a
quick picker for **Phone / Desktop / Square** and it exports at that
category's default resolution. Open the settings panel first to choose an
exact resolution (iPhone 16 Pro Max, 5K, Ultrawide, etc.) before saving.

Exports render at full native resolution off-screen — the live preview on
your screen is never affected and stays smooth while the export runs.
Large exports (5K and up) may take a few seconds; you'll see a progress
toast in the bottom-left corner while it renders.

If your browser can't create a second WebGL context, export falls back to
2× your current screen resolution and lets you know.

## URL sharing

Every wallpaper has a permanent, shareable URL:

```
index.html#WF-482910
```

Click the seed pill to copy it. Anyone who opens that link sees the exact
same wallpaper, pixel for pixel.

## Evolve mode

Normally, **Next** jumps to a random seed. Turn on **Evolve** (`E`) and
**Next** instead drifts ±1–500 seeds from where you are — a way to explore
a neighborhood of similar-looking wallpapers instead of jumping blindly.

## Mode lock

By default the generator picks a random aesthetic per seed. Open
**Settings** and pick a specific style (Cosmic, Arctic, Brutalist, …) to
lock the generator to it — every subsequent seed keeps that aesthetic. A
small colored dot appears top-right while locked; click it to return to
Auto.

## Look & feel

Every wallpaper passes through a finishing pass before it hits the screen:
a soft vignette, fine film grain, and a gentle color grade. Neon Noir adds
a touch of chromatic aberration; Cosmic and Molten get a soft bloom on
their brightest highlights. It's tuned to be felt, not noticed.

## Performance

- The live canvas renders at your screen's pixel ratio, capped at 2×, so
  retina displays look sharp without burning unnecessary GPU time.
- On phones and small screens, internal noise detail (octaves and domain-warp
  iterations) automatically steps down a notch to keep things fast — exports
  always render at full quality regardless of device.

## Project status

Session 4 — Post-processing pipeline, full-resolution export, mobile
performance tuning, aesthetic fixes, and ship-ready polish.
