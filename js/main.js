(() => {
  const RESOLUTIONS = {
    phone: [
      { label: 'iPhone 16 Pro Max — 1320×2868', w: 1320, h: 2868 },
      { label: 'iPhone 15 — 1179×2556',         w: 1179, h: 2556 },
      { label: 'Android FHD — 1080×2400',        w: 1080, h: 2400 },
    ],
    desktop: [
      { label: '4K — 3840×2160',        w: 3840, h: 2160 },
      { label: '5K — 5120×2880',        w: 5120, h: 2880 },
      { label: 'Ultrawide — 3440×1440', w: 3440, h: 1440 },
      { label: 'FHD — 1920×1080',       w: 1920, h: 1080 },
    ],
    square: [
      { label: '2048×2048', w: 2048, h: 2048 },
      { label: '1080×1080', w: 1080, h: 1080 },
    ],
  };

  /* Signature color per aesthetic mode for the lock dot */
  const MODE_COLORS = {
    ethereal:   '#9b8ce0',
    brutalist:  '#c4401f',
    organic:    '#3f5c2a',
    retrotech:  '#3df54a',
    cosmic:     '#4a3fa0',
    watercolor: '#c9a8a0',
    neonnoir:   '#ff2e9e',
    arctic:     '#7cb8cc',
    botanical:  '#7d9b4e',
    molten:     '#e0941e',
  };

  const MAX_HISTORY = 20;

  /* ── Device quality tier ── */
  function isMobileDevice() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      return navigator.userAgentData.mobile;
    }
    return window.innerWidth < 768;
  }
  const QUALITY = isMobileDevice()
    ? { octaves: 4, iters: 2 }
    : { octaves: 6, iters: 3 };

  const state = {
    seedInt:      0,
    device:       'phone',
    resolution:   RESOLUTIONS.phone[0],
    isConfigOpen: false,
    isShortcutsOpen: false,
    evolveMode:   false,
    lockedMode:   null,   /* null = Auto, else aesthetic id string */
    spec:         null,
    history:      [],
    historyIndex: -1,
  };

  /* ── Seed / URL ── */
  function randomSeedInt() {
    return Math.floor(Math.random() * 1000000);
  }

  function seedIntFromHash(hash) {
    const m = hash.match(/WF-(\d{1,6})/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return (n >= 0 && n <= 999999) ? n : null;
  }

  function updateHash(seedInt) {
    const tag = `WF-${String(seedInt).padStart(6, '0')}`;
    /* Use native history to avoid triggering hashchange listener */
    window.history.replaceState(null, '', `#${tag}`);
  }

  /* ── History ── */
  function pushHistory(seedInt) {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(seedInt);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateDots();
  }

  function canGoBack()    { return state.historyIndex > 0; }
  function canGoForward() { return state.historyIndex < state.history.length - 1; }

  function goBack() {
    if (!canGoBack()) return;
    state.historyIndex--;
    loadSeed(state.history[state.historyIndex], false);
  }

  function goForward() {
    if (!canGoForward()) return;
    state.historyIndex++;
    loadSeed(state.history[state.historyIndex], false);
  }

  /* ── Loading state (first render only) ── */
  let hasRenderedOnce = false;
  let loadingEl = null;

  function showLoading() {
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading-indicator';
    loadingEl.textContent = 'Generating...';
    document.body.appendChild(loadingEl);
  }

  function hideLoading() {
    if (!loadingEl) return;
    const el = loadingEl;
    loadingEl = null;
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 320);
  }

  /* ── Core load ── */
  function loadSeed(seedInt, addToHistory = true) {
    state.seedInt = seedInt;

    /* If a mode is locked, patch the spec after generation */
    let spec = Generator.generateWallpaper(seedInt);
    if (state.lockedMode) {
      const lockedAesthetic = AESTHETICS.find(a => a.id === state.lockedMode);
      if (lockedAesthetic) spec.aesthetic = lockedAesthetic;
    }
    state.spec = spec;

    const tag = `WF-${String(seedInt).padStart(6, '0')}`;
    document.getElementById('seedDisplay').textContent = tag;
    updateHash(seedInt);

    if (addToHistory) pushHistory(seedInt);
    updateBackBtn();
    Renderer.render(state.spec);

    if (!hasRenderedOnce) {
      hasRenderedOnce = true;
      hideLoading();
    }
  }

  /* ── Evolve ── */
  function evolve() {
    const delta = Math.floor(Math.random() * 500) + 1;
    const sign  = Math.random() < 0.5 ? 1 : -1;
    const next  = ((state.seedInt + sign * delta) + 1000000) % 1000000;
    loadSeed(next);
  }

  function next() {
    if (state.evolveMode) evolve();
    else if (canGoForward()) goForward();
    else loadSeed(randomSeedInt());
  }

  /* ── Evolve toggle ── */
  function setEvolveMode(on) {
    state.evolveMode = on;
    const btn = document.getElementById('evolveToggle');
    btn.classList.toggle('active', on);
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.textContent = on ? '⤡ Evolve' : 'Next →';
  }

  /* ── Mode lock ── */
  function setLockedMode(modeId) {
    state.lockedMode = modeId;

    /* Update mode pills */
    document.querySelectorAll('.mode-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.mode === (modeId || 'auto'));
    });

    /* Update lock dot */
    const dot   = document.getElementById('modeLockDot');
    const circle = document.getElementById('modeDotCircle');
    const label  = document.getElementById('modeDotLabel');

    if (modeId) {
      dot.hidden = false;
      circle.style.background = MODE_COLORS[modeId] || '#fff';
      const aesthetic = AESTHETICS.find(a => a.id === modeId);
      label.textContent = aesthetic ? aesthetic.name : modeId;
    } else {
      dot.hidden = true;
    }

    /* Re-render with locked mode */
    if (state.spec) loadSeed(state.seedInt, false);
  }

  /* ── UI helpers ── */
  function populateRes(device) {
    const sel = document.getElementById('resSelect');
    sel.innerHTML = '';
    RESOLUTIONS[device].forEach((r, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = r.label;
      sel.appendChild(opt);
    });
    state.resolution = RESOLUTIONS[device][0];
  }

  function toggleConfig(force) {
    const open = force !== undefined ? force : !state.isConfigOpen;
    state.isConfigOpen = open;
    document.getElementById('configPanel').classList.toggle('open', open);
    document.getElementById('configBackdrop').classList.toggle('open', open);
  }

  function toggleShortcuts(force) {
    const open = force !== undefined ? force : !state.isShortcutsOpen;
    state.isShortcutsOpen = open;
    document.getElementById('shortcutsOverlay').classList.toggle('open', open);
  }

  function updateBackBtn() {
    const btn = document.getElementById('backBtn');
    btn.style.opacity = canGoBack() ? '1' : '0.3';
  }

  function updateDots() {
    const dots = document.querySelectorAll('.hist-dot');
    const len  = state.history.length;
    const idx  = state.historyIndex;
    let start  = Math.max(0, idx - 1);
    const end  = Math.min(len, start + 3);
    start      = Math.max(0, end - 3);

    dots.forEach((dot, i) => {
      const hi = start + i;
      dot.classList.remove('current', 'nearby');
      if (hi < end) {
        dot.classList.add(hi === idx ? 'current' : 'nearby');
      }
    });
  }

  /* ── Seed copy ── */
  function copySeedURL() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const pill = document.getElementById('seedPill');
      const hint = document.getElementById('seedCopyHint');
      hint.textContent = 'Copied!';
      pill.classList.add('copied');
      setTimeout(() => {
        hint.textContent = 'Copy';
        pill.classList.remove('copied');
      }, 1800);
    }).catch(() => {
      /* Fallback: select the URL manually */
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  /* ── Save / Export ── */
  let savePopupEl = null;

  function ensureSavePopup() {
    if (savePopupEl) return savePopupEl;
    savePopupEl = document.createElement('div');
    savePopupEl.className = 'save-popup';
    savePopupEl.innerHTML = `
      <button data-device="phone">Phone</button>
      <button data-device="desktop">Desktop</button>
      <button data-device="square">Square</button>
    `;
    document.body.appendChild(savePopupEl);
    savePopupEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-device]');
      if (!btn) return;
      closeSavePopup();
      const device = btn.dataset.device;
      const res = RESOLUTIONS[device][0];
      runExport(device, res);
    });
    document.addEventListener('click', e => {
      if (!savePopupEl.classList.contains('open')) return;
      if (e.target.closest('.save-popup, #saveBtn')) return;
      closeSavePopup();
    });
    return savePopupEl;
  }

  function openSavePopup() {
    const popup = ensureSavePopup();
    const btn = document.getElementById('saveBtn');
    const rect = btn.getBoundingClientRect();
    popup.style.left = `${rect.left}px`;
    popup.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    popup.classList.add('open');
  }

  function closeSavePopup() {
    if (savePopupEl) savePopupEl.classList.remove('open');
  }

  function runExport(device, res) {
    Export.exportWallpaper(state.spec, device, res);
  }

  function save() {
    if (state.isConfigOpen) {
      runExport(state.device, state.resolution);
    } else {
      openSavePopup();
    }
  }

  /* ── Fade timer ── */
  let fadeTimer;
  function resetFade() {
    document.body.classList.remove('ui-hidden');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      if (!state.isConfigOpen && !state.isShortcutsOpen)
        document.body.classList.add('ui-hidden');
    }, 3500);
  }

  /* ════════════════════════════════════════
     TOUCH GESTURES
  ════════════════════════════════════════ */
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let longPressTimer = null;
  const SWIPE_THRESHOLD   = 50;   /* px */
  const LONG_PRESS_MS     = 600;

  function onTouchStart(e) {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      save();
    }, LONG_PRESS_MS);
  }

  function onTouchEnd(e) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    /* Ignore if touch originated on a UI element */
    if (e.target.closest('.ui-top, .ui-bottom, .config-panel, .shortcuts-overlay')) return;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else         goBack();
      return;
    }

    /* Short tap = toggle UI */
    if (dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (document.body.classList.contains('ui-hidden')) {
        resetFade();
      } else {
        clearTimeout(fadeTimer);
        document.body.classList.add('ui-hidden');
      }
    }
  }

  function onTouchMove() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    const canvas = document.getElementById('gl-canvas');
    Renderer.init(canvas);
    Renderer.setQuality(QUALITY);
    window.addEventListener('resize', () => { Renderer.resize(canvas); Renderer.render(state.spec); });

    populateRes(state.device);
    showLoading();

    /* Seed from URL hash, else random */
    const fromHash = seedIntFromHash(window.location.hash);
    const initSeed = fromHash !== null ? fromHash : randomSeedInt();
    loadSeed(initSeed);
    updateDots();

    /* Hash navigation (browser back/forward) */
    window.addEventListener('hashchange', () => {
      const s = seedIntFromHash(window.location.hash);
      if (s !== null && s !== state.seedInt) loadSeed(s);
    });

    /* ── Event bindings ── */
    document.getElementById('nextBtn').addEventListener('click', next);
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('saveBtn').addEventListener('click', save);
    document.getElementById('evolveToggle').addEventListener('click', () => setEvolveMode(!state.evolveMode));
    document.getElementById('configToggle').addEventListener('click', () => toggleConfig());
    document.getElementById('configClose').addEventListener('click',  () => toggleConfig(false));
    document.getElementById('configBackdrop').addEventListener('click', () => toggleConfig(false));
    document.getElementById('shortcutsClose').addEventListener('click', () => toggleShortcuts(false));
    document.getElementById('seedPill').addEventListener('click', copySeedURL);

    /* Mode lock dot: click to unlock */
    document.getElementById('modeLockDot').addEventListener('click', () => setLockedMode(null));

    /* Device segmented control */
    document.getElementById('deviceSeg').addEventListener('click', e => {
      const btn = e.target.closest('[data-device]');
      if (!btn) return;
      document.querySelectorAll('#deviceSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.device = btn.dataset.device;
      populateRes(state.device);
    });

    /* Resolution */
    document.getElementById('resSelect').addEventListener('change', e => {
      state.resolution = RESOLUTIONS[state.device][+e.target.value];
    });

    /* Mode pills */
    document.getElementById('modePills').addEventListener('click', e => {
      const pill = e.target.closest('.mode-pill');
      if (!pill) return;
      const mode = pill.dataset.mode;
      setLockedMode(mode === 'auto' ? null : mode);
    });

    /* Keyboard */
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === ' ')          { e.preventDefault(); next(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.key === 's' || e.key === 'S') save();
      if (e.key === 'e' || e.key === 'E') setEvolveMode(!state.evolveMode);
      if (e.key === 'c' || e.key === 'C') toggleConfig();
      if (e.key === 'b' || e.key === 'B') goBack();
      if (e.key === '?')               toggleShortcuts();
      if (e.key === 'Escape') {
        if (state.isShortcutsOpen) toggleShortcuts(false);
        else if (state.isConfigOpen) toggleConfig(false);
      }
    });

    /* Touch */
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });

    /* Fade */
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, resetFade, { passive: true })
    );
    resetFade();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
