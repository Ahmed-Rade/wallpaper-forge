const Renderer = (() => {
  let gl, passProgram, compositeProgram, postProgram, positionBuffer;
  let uLoc = {};      /* pass-shader uniform locations */
  let cLoc = {};      /* composite-shader uniform locations */
  let pLoc = {};      /* post-process uniform locations */
  let fbos = [];       /* pool of FBOs, sized lazily to canvas */
  let sceneFBO = null;  /* holds the composited (pre-post) frame */
  let quality = { octaves: 6, iters: 3 };

  const BLEND_IDS = {
    normal: 0, screen: 1, multiply: 2, overlay: 3, soft_light: 4, color_dodge: 5,
  };

  /* Modes that get bloom / chromatic aberration */
  const BLOOM_MODES = [4, 9];   /* cosmic, molten */
  const NEONNOIR_MODE = 6;

  function setQuality(q) {
    quality = q;
  }

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  function buildProgram(vertSrc, fragSrc) {
    const vert = compileShader(gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) {
      console.error('Program build aborted: shader compile failed (see error above)');
      return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog)); return null;
    }
    return prog;
  }

  function seedToFloat(spec) {
    if (spec.seedInt !== undefined) return spec.seedInt;
    const n = parseInt(String(spec.seed || '').replace(/\D/g, ''), 10);
    return isNaN(n) ? 0.0 : n;
  }

  /* ── FBO management ── */
  function createFBO(width, height) {
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

  function destroyFBO(fbo) {
    gl.deleteTexture(fbo.texture);
    gl.deleteFramebuffer(fbo.framebuffer);
  }

  function ensureFBOPool(count, width, height) {
    const needsResize = fbos.length && (fbos[0].width !== width || fbos[0].height !== height);
    if (needsResize) {
      fbos.forEach(destroyFBO);
      fbos = [];
    }
    while (fbos.length < count) {
      fbos.push(createFBO(width, height));
    }
  }

  function ensureSceneFBO(width, height) {
    if (sceneFBO && (sceneFBO.width !== width || sceneFBO.height !== height)) {
      destroyFBO(sceneFBO);
      sceneFBO = null;
    }
    if (!sceneFBO) sceneFBO = createFBO(width, height);
  }

  /* ── pass rendering: runs the pass shader, writes into fbo (or screen if fbo is null) ── */
  function renderToFBO(fbo, uniforms) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.framebuffer : null);
    gl.viewport(0, 0, fbo ? fbo.width : gl.canvas.width, fbo ? fbo.height : gl.canvas.height);
    gl.useProgram(passProgram);

    const loc = gl.getAttribLocation(passProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uLoc['u_resolution'], fbo ? fbo.width : gl.canvas.width, fbo ? fbo.height : gl.canvas.height);
    gl.uniform1f(uLoc['u_seed'],   uniforms.seed);
    gl.uniform1f(uLoc['u_time'],   0.0);
    gl.uniform1i(uLoc['u_mode'],   uniforms.mode);
    gl.uniform1i(uLoc['u_pass'],   uniforms.pass);
    gl.uniform4fv(uLoc['u_params'], uniforms.params);
    gl.uniform3fv(uLoc['u_color0'], uniforms.color0);
    gl.uniform3fv(uLoc['u_color1'], uniforms.color1);
    gl.uniform3fv(uLoc['u_color2'], uniforms.color2);
    gl.uniform3fv(uLoc['u_color3'], uniforms.color3);
    gl.uniform1i(uLoc['u_warpOctaves'], quality.octaves);
    gl.uniform1i(uLoc['u_warpIters'],   quality.iters);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ── composite: blends rendered layer FBOs into the scene FBO (not the screen) ── */
  function composite(layerFBOs, layerDefs) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.framebuffer);
    gl.viewport(0, 0, sceneFBO.width, sceneFBO.height);
    gl.useProgram(compositeProgram);

    const loc = gl.getAttribLocation(compositeProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const texUnits = ['u_layer0', 'u_layer1', 'u_layer2'];
    layerFBOs.forEach((fbo, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.uniform1i(cLoc[texUnits[i]], i);
    });

    gl.uniform1i(cLoc['u_layerCount'], layerFBOs.length);
    gl.uniform1i(cLoc['u_blend0'], layerDefs[1] ? BLEND_IDS[layerDefs[1].blend] ?? 0 : 0);
    gl.uniform1i(cLoc['u_blend1'], layerDefs[2] ? BLEND_IDS[layerDefs[2].blend] ?? 0 : 0);
    gl.uniform1f(cLoc['u_opacity0'], layerDefs[0] ? layerDefs[0].opacity : 1.0);
    gl.uniform1f(cLoc['u_opacity1'], layerDefs[1] ? layerDefs[1].opacity : 1.0);
    gl.uniform1f(cLoc['u_opacity2'], layerDefs[2] ? layerDefs[2].opacity : 1.0);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ── post-process: vignette, grain, CA (Neon Noir), grade, bloom (Cosmic/Molten) ── */
  function postProcess(mode, seed) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(postProgram);

    const loc = gl.getAttribLocation(postProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneFBO.texture);
    gl.uniform1i(pLoc['u_frame'], 0);
    gl.uniform2f(pLoc['u_resolution'], gl.canvas.width, gl.canvas.height);
    gl.uniform1f(pLoc['u_seed'], seed);
    gl.uniform1f(pLoc['u_vignette'], 0.35);
    gl.uniform1f(pLoc['u_grain'], 0.04);
    gl.uniform1f(pLoc['u_chromAb'], mode === NEONNOIR_MODE ? 0.003 : 0.0);
    gl.uniform1f(pLoc['u_bloomStrength'], BLOOM_MODES.includes(mode) ? 0.3 : 0.0);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function init(canvas) {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { console.error('WebGL not supported'); return false; }
    gl.getExtension('OES_standard_derivatives');

    passProgram = buildProgram(SHADERS.vertex, SHADERS.fragment);
    compositeProgram = buildProgram(SHADERS.compositeVertex, SHADERS.compositeFragment);
    postProgram = buildProgram(SHADERS.postVertex, SHADERS.postFragment);
    if (!passProgram || !compositeProgram || !postProgram) return false;

    const verts = new Float32Array([
      -1,-1,  1,-1,  -1, 1,
      -1, 1,  1,-1,   1, 1,
    ]);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const passNames = ['u_resolution','u_seed','u_time','u_mode','u_pass',
                        'u_params','u_color0','u_color1','u_color2','u_color3',
                        'u_warpOctaves','u_warpIters'];
    passNames.forEach(n => { uLoc[n] = gl.getUniformLocation(passProgram, n); });

    const compNames = ['u_layer0','u_layer1','u_layer2','u_layerCount',
                        'u_blend0','u_blend1','u_opacity0','u_opacity1','u_opacity2'];
    compNames.forEach(n => { cLoc[n] = gl.getUniformLocation(compositeProgram, n); });

    const postNames = ['u_frame','u_resolution','u_seed','u_vignette','u_grain',
                        'u_chromAb','u_bloomStrength'];
    postNames.forEach(n => { pLoc[n] = gl.getUniformLocation(postProgram, n); });

    resize(canvas);
    return true;
  }

  function resize(canvas) {
    canvas = canvas || document.getElementById('gl-canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    canvas.width  = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  /* spec: { aesthetic, palette, params, seed } from Generator.generateWallpaper
     aesthetic.layers: [{ pass, blend, opacity }, ...] (1-3 entries)
     aesthetic.mode: int 0-9 */
  function render(spec) {
    if (!gl || !passProgram || !spec) return;
    const t0 = performance.now();

    const seed   = seedToFloat(spec);
    const mode   = spec.aesthetic ? spec.aesthetic.mode : 0;
    const params = spec.params || [0,0,0,0];
    const p      = spec.palette || {};
    const color0 = p.color0 || [0.04,0.05,0.18];
    const color1 = p.color1 || [0.18,0.78,0.86];
    const color2 = p.color2 || [0.10,0.40,0.60];
    const color3 = p.color3 || [0.95,0.95,1.00];

    const baseLayers = (spec.aesthetic && spec.aesthetic.layers && spec.aesthetic.layers.length)
      ? spec.aesthetic.layers
      : [{ pass: 'single', blend: 'normal', opacity: 1.0 }];

    /* Apply per-seed layer opacity variation */
    const opacities = spec.layerOpacities || baseLayers.map(l => l.opacity);
    const layers = baseLayers.map((l, i) => ({
      ...l,
      opacity: opacities[i] !== undefined ? opacities[i] : l.opacity,
    }));

    const w = gl.canvas.width, h = gl.canvas.height;
    ensureFBOPool(layers.length, w, h);
    ensureSceneFBO(w, h);

    layers.forEach((layerDef, i) => {
      renderToFBO(fbos[i], { seed, mode, pass: i, params, color0, color1, color2, color3 });
    });

    composite(fbos.slice(0, layers.length), layers);
    postProcess(mode, seed);

    const elapsed = performance.now() - t0;
    if (elapsed > 100) {
      console.warn(`[Renderer] slow render: ${elapsed.toFixed(1)}ms`);
    }
  }

  return { init, render, resize, createFBO, renderToFBO, composite, setQuality };
})();
