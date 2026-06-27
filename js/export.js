const EXPORT_SIZES = {
  phone: [
    { label: "iPhone 16 Pro Max", w: 1320, h: 2868 },
    { label: "iPhone 16 Pro", w: 1206, h: 2622 },
    { label: "iPhone 15/14", w: 1170, h: 2532 },
    { label: "iPhone SE", w: 750, h: 1334 },
    { label: "Pixel 9 Pro", w: 1280, h: 2856 },
    { label: "Pixel 9", w: 1080, h: 2400 },
    { label: "Galaxy S24 Ultra", w: 1440, h: 3120 },
  ],
  desktop: [
    { label: "4K (3840×2160)", w: 3840, h: 2160 },
    { label: "QHD (2560×1440)", w: 2560, h: 1440 },
    { label: "FHD (1920×1080)", w: 1920, h: 1080 },
    { label: "MacBook Pro 16\"", w: 3456, h: 2234 },
    { label: "MacBook Pro 14\"", w: 3024, h: 1964 },
    { label: "Ultrawide (3440×1440)", w: 3440, h: 1440 },
    { label: "5K (5120×2880)", w: 5120, h: 2880 },
  ],
  square: [
    { label: "2048×2048", w: 2048, h: 2048 },
    { label: "1440×1440", w: 1440, h: 1440 },
  ]
};

const Export = (() => {
  const BLEND_IDS = {
    normal: 0, screen: 1, multiply: 2, overlay: 3, soft_light: 4, color_dodge: 5,
  };

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Export shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  function buildProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) {
      console.error('Export program build aborted: shader compile failed (see error above)');
      return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Export link error:', gl.getProgramInfoLog(prog)); return null;
    }
    return prog;
  }

  function seedToFloat(spec) {
    if (spec.seedInt !== undefined) return spec.seedInt;
    const n = parseInt(String(spec.seed || '').replace(/\D/g, ''), 10);
    return isNaN(n) ? 0.0 : n;
  }

  function createFBO(gl, width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer, texture, width, height };
  }

  function destroyFBO(gl, fbo) {
    gl.deleteTexture(fbo.texture);
    gl.deleteFramebuffer(fbo.framebuffer);
  }

  /* ── Progress toast ── */
  let toastEl = null, toastFillEl = null, toastLabelEl = null, toastTimer = null;

  function ensureToast() {
    if (toastEl) return;
    toastEl = document.createElement('div');
    toastEl.className = 'export-toast';
    toastEl.innerHTML = `
      <span class="export-toast-label"></span>
      <div class="export-toast-track"><div class="export-toast-fill"></div></div>
    `;
    document.body.appendChild(toastEl);
    toastLabelEl = toastEl.querySelector('.export-toast-label');
    toastFillEl = toastEl.querySelector('.export-toast-fill');
  }

  function showProgress(label, durationMs) {
    ensureToast();
    clearTimeout(toastTimer);
    toastEl.classList.remove('done');
    toastEl.classList.add('open');
    toastLabelEl.textContent = label;
    toastFillEl.style.transition = 'none';
    toastFillEl.style.width = '0%';
    requestAnimationFrame(() => {
      toastFillEl.style.transition = `width ${durationMs}ms linear`;
      toastFillEl.style.width = '95%';
    });
  }

  function showDone() {
    ensureToast();
    toastFillEl.style.transition = 'width 120ms ease';
    toastFillEl.style.width = '100%';
    toastLabelEl.textContent = 'Saved ↓';
    toastEl.classList.add('done');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('open'), 2000);
  }

  function showWarning(text) {
    ensureToast();
    clearTimeout(toastTimer);
    toastEl.classList.add('open');
    toastEl.classList.add('warn');
    toastFillEl.style.width = '0%';
    toastLabelEl.textContent = text;
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('open');
      toastEl.classList.remove('warn');
    }, 2400);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ── Core offscreen render ── */
  function renderAtResolution(gl, spec, w, h) {
    const passProgram = buildProgram(gl, SHADERS.vertex, SHADERS.fragment);
    const compositeProgram = buildProgram(gl, SHADERS.compositeVertex, SHADERS.compositeFragment);
    const postProgram = buildProgram(gl, SHADERS.postVertex, SHADERS.postFragment);
    if (!passProgram || !compositeProgram || !postProgram) throw new Error('shader build failed');

    const verts = new Float32Array([
      -1,-1,  1,-1,  -1, 1,
      -1, 1,  1,-1,   1, 1,
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const uLoc = {}, cLoc = {};
    ['u_resolution','u_seed','u_time','u_mode','u_pass','u_params',
     'u_color0','u_color1','u_color2','u_color3','u_color4','u_color5','u_color6',
     'u_focalX','u_focalY','u_rotation','u_scale',
     'u_warpOctaves','u_warpIters',
     'u_density','u_complexity','u_symmetry','u_colorShift'].forEach(n => {
      uLoc[n] = gl.getUniformLocation(passProgram, n);
    });
    ['u_layer0','u_layer1','u_layer2','u_layerCount',
     'u_blend0','u_blend1','u_opacity0','u_opacity1','u_opacity2'].forEach(n => {
      cLoc[n] = gl.getUniformLocation(compositeProgram, n);
    });

    const pLoc = {};
    ['u_frame','u_resolution','u_seed','u_vignette','u_grain',
     'u_chromAb','u_bloomStrength'].forEach(n => {
      pLoc[n] = gl.getUniformLocation(postProgram, n);
    });

    const seed   = seedToFloat(spec);
    const mode   = spec.aesthetic ? spec.aesthetic.mode : 0;
    const params = spec.params || [0,0,0,0];
    const p      = spec.palette || {};
    const tones  = p.tones || [];
    const color0 = p.color0 || tones[0] || [0.04,0.05,0.18];
    const color1 = p.color1 || tones[2] || [0.18,0.78,0.86];
    const color2 = p.color2 || tones[4] || [0.10,0.40,0.60];
    const color3 = p.color3 || tones[6] || [0.95,0.95,1.00];
    const color4 = tones[1] || color1;
    const color5 = tones[3] || color2;
    const color6 = tones[5] || color3;
    const cb     = spec.compositionBias || {};

    const baseLayers = (spec.aesthetic && spec.aesthetic.layers && spec.aesthetic.layers.length)
      ? spec.aesthetic.layers
      : [{ pass: 'single', blend: 'normal', opacity: 1.0 }];

    const opacities = spec.layerOpacities || baseLayers.map(l => l.opacity);
    const layers = baseLayers.map((l, i) => ({
      ...l,
      opacity: opacities[i] !== undefined ? opacities[i] : l.opacity,
    }));

    const fbos = layers.map(() => createFBO(gl, w, h));
    const sceneFBO = createFBO(gl, w, h);

    layers.forEach((layerDef, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[i].framebuffer);
      gl.viewport(0, 0, w, h);
      gl.useProgram(passProgram);

      const loc = gl.getAttribLocation(passProgram, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uLoc['u_resolution'], w, h);
      gl.uniform1f(uLoc['u_seed'], seed);
      gl.uniform1f(uLoc['u_time'], 0.0);
      gl.uniform1i(uLoc['u_mode'], mode);
      gl.uniform1i(uLoc['u_pass'], i);
      gl.uniform4fv(uLoc['u_params'], params);
      gl.uniform3fv(uLoc['u_color0'], color0);
      gl.uniform3fv(uLoc['u_color1'], color1);
      gl.uniform3fv(uLoc['u_color2'], color2);
      gl.uniform3fv(uLoc['u_color3'], color3);
      gl.uniform3fv(uLoc['u_color4'], color4);
      gl.uniform3fv(uLoc['u_color5'], color5);
      gl.uniform3fv(uLoc['u_color6'], color6);
      gl.uniform1f(uLoc['u_focalX'],   cb.focalX   !== undefined ? cb.focalX   : 0.5);
      gl.uniform1f(uLoc['u_focalY'],   cb.focalY   !== undefined ? cb.focalY   : 0.5);
      gl.uniform1f(uLoc['u_rotation'], cb.rotation || 0.0);
      gl.uniform1f(uLoc['u_scale'],    cb.scale    !== undefined ? cb.scale    : 1.0);
      gl.uniform1i(uLoc['u_warpOctaves'], 6);
      gl.uniform1i(uLoc['u_warpIters'], 3);
      const ss = spec.settings || spec.seedSettings || {};
      gl.uniform1f(uLoc['u_density'],    ss.density    !== undefined ? ss.density    : 0.5);
      gl.uniform1f(uLoc['u_complexity'], ss.complexity !== undefined ? ss.complexity : 0.5);
      gl.uniform1f(uLoc['u_symmetry'],   ss.symmetry   !== undefined ? ss.symmetry   : 0.0);
      gl.uniform1f(uLoc['u_colorShift'], ss.colorShift !== undefined ? ss.colorShift : 0.0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });

    /* composite into the scene FBO (not the canvas yet — post-process reads it) */
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.framebuffer);
    gl.viewport(0, 0, w, h);
    gl.useProgram(compositeProgram);

    const loc = gl.getAttribLocation(compositeProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const texUnits = ['u_layer0', 'u_layer1', 'u_layer2'];
    fbos.forEach((fbo, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.uniform1i(cLoc[texUnits[i]], i);
    });

    gl.uniform1i(cLoc['u_layerCount'], fbos.length);
    gl.uniform1i(cLoc['u_blend0'], layers[1] ? BLEND_IDS[layers[1].blend] ?? 0 : 0);
    gl.uniform1i(cLoc['u_blend1'], layers[2] ? BLEND_IDS[layers[2].blend] ?? 0 : 0);
    gl.uniform1f(cLoc['u_opacity0'], layers[0] ? layers[0].opacity : 1.0);
    gl.uniform1f(cLoc['u_opacity1'], layers[1] ? layers[1].opacity : 1.0);
    gl.uniform1f(cLoc['u_opacity2'], layers[2] ? layers[2].opacity : 1.0);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    /* post-process: scene FBO -> canvas (default framebuffer) */
    const BLOOM_MODES = [4, 9];
    const NEONNOIR_MODE = 6;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(postProgram);

    const postLoc = gl.getAttribLocation(postProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(postLoc);
    gl.vertexAttribPointer(postLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneFBO.texture);
    gl.uniform1i(pLoc['u_frame'], 0);
    gl.uniform2f(pLoc['u_resolution'], w, h);
    gl.uniform1f(pLoc['u_seed'], seed);
    gl.uniform1f(pLoc['u_vignette'], 0.4);
    gl.uniform1f(pLoc['u_grain'], 0.07);
    gl.uniform1f(pLoc['u_chromAb'], mode === NEONNOIR_MODE ? 0.008 : 0.0);
    gl.uniform1f(pLoc['u_bloomStrength'], BLOOM_MODES.includes(mode) ? 0.35 : 0.15);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    fbos.forEach(fbo => destroyFBO(gl, fbo));
    destroyFBO(gl, sceneFBO);
    gl.deleteProgram(passProgram);
    gl.deleteProgram(compositeProgram);
    gl.deleteProgram(postProgram);
    gl.deleteBuffer(positionBuffer);
  }

  function makeOffscreenCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function canvasToBlob(canvas) {
    if (canvas.convertToBlob) {
      return canvas.convertToBlob({ type: 'image/png' });
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    });
  }

  /* spec: generator spec; deviceType: 'phone'|'desktop'|'square'; res: { label, w, h } */
  async function exportWallpaper(spec, deviceType, res) {
    const { label, w, h } = res;
    const estMs = Math.max(400, (w * h / 2000000) * 1000);

    if (w * h >= 3120 * 1440) {
      showWarning('This may take a few seconds');
      await new Promise(r => setTimeout(r, 900));
    }

    showProgress(`Rendering ${w}×${h}...`, estMs);

    let canvas, gl, scaleNote = false;
    try {
      canvas = makeOffscreenCanvas(w, h);
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('no webgl context');
      gl.getExtension('OES_standard_derivatives');
    } catch (err) {
      /* Fallback: 2x screen resolution */
      const fw = window.innerWidth * 2, fh = window.innerHeight * 2;
      canvas = makeOffscreenCanvas(fw, fh);
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      scaleNote = true;
      if (!gl) {
        showWarning('Export failed: WebGL unavailable');
        return;
      }
      gl.getExtension('OES_standard_derivatives');
    }

    try {
      const targetW = scaleNote ? canvas.width : w;
      const targetH = scaleNote ? canvas.height : h;
      renderAtResolution(gl, spec, targetW, targetH);

      const blob = await canvasToBlob(canvas);
      const filename = `WF-${spec.seed ? spec.seed.replace('WF-','') : '000000'}-${label.replace(/[^a-z0-9]+/gi,'')}-${targetW}x${targetH}.png`;
      downloadBlob(blob, filename);

      if (scaleNote) showWarning('Export limited to 2x on this device');
      else showDone();
    } catch (err) {
      console.error('Export error:', err);
      showWarning('Export failed');
    } finally {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }

  return { exportWallpaper, renderAtResolution };
})();
