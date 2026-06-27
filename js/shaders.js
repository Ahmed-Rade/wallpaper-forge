const SHADERS = {
  vertex: `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,

  /* ════════════════════════════════════════════════════════
     PASS SHADER
     Renders ONE named pass (per aesthetic) to an FBO.
     Selected via u_mode (aesthetic) + u_pass (0,1,2 = layer index).
     Each pass function fills the screen independently and
     returns vec4(rgb, alpha) so transparent passes (glow, stars,
     contours, etc.) composite correctly later.
  ════════════════════════════════════════════════════════ */
  fragment: `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;

    uniform vec2  u_resolution;
    uniform float u_seed;
    uniform float u_time;
    uniform int   u_mode;
    uniform int   u_pass;
    uniform vec4  u_params;
    uniform vec3  u_color0;
    uniform vec3  u_color1;
    uniform vec3  u_color2;
    uniform vec3  u_color3;
    uniform vec3  u_color4;
    uniform vec3  u_color5;
    uniform vec3  u_color6;
    uniform float u_focalX;
    uniform float u_focalY;
    uniform float u_rotation;
    uniform float u_scale;
    uniform int   u_warpOctaves;  /* quality knob: 6 desktop / 4 mobile */
    uniform int   u_warpIters;    /* domain-warp iterations: 3 desktop / 2 mobile */
    uniform float u_density;      /* 0.0-1.0: element density/count multiplier */
    uniform float u_complexity;   /* 0.0-1.0: detail/subdivision level */
    uniform float u_symmetry;     /* 0.0=none, 1.0=mirror, 2.0=4-fold, 3.0=6-fold */
    uniform float u_colorShift;   /* 0.0-1.0: hue rotation / palette interpolation */

    /* ════════════════════════════════════════
       NOISE CORE
    ════════════════════════════════════════ */
    vec3 mod289v3(vec3 x) { return x - floor(x*(1.0/289.0))*289.0; }
    vec2 mod289v2(vec2 x) { return x - floor(x*(1.0/289.0))*289.0; }
    vec3 permute(vec3 x) { return mod289v3(((x*34.0)+10.0)*x); }

    /* GLSL ES 1.00 has no int overload of min() — roll our own */
    int iMin(int a, int b) { return a < b ? a : b; }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1  = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289v2(i);
      vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x  = 2.0*fract(p*C.www) - 1.0;
      vec3 h  = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x *x0.x  + h.x *x0.y;
      g.yz = a0.yz*x12.xz + h.yz*x12.yw;
      return 130.0*dot(m,g);
    }

    float fbm(vec2 p, int oct, float lac, float gain) {
      float v=0.0, a=0.5, f=1.0, mx=0.0;
      for (int i=0;i<8;i++) {
        float active = step(float(i), float(oct) - 1.0);
        v  += snoise(p*f)*a*active;
        mx += a*active;
        a  *= gain; f *= lac;
      }
      return v / max(mx, 0.0001);
    }

    float warp(vec2 p) {
      float lac=2.1, gain=0.48; int oct=u_warpOctaves;
      vec2 q = vec2(fbm(p + vec2(0.0,0.0), oct,lac,gain),
                    fbm(p + vec2(5.2,1.3),  oct,lac,gain));
      if (u_warpIters < 3) {
        return fbm(p + 4.0*q, oct,lac,gain);
      }
      vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7,9.2), oct,lac,gain),
                    fbm(p + 4.0*q + vec2(8.3,2.8),  oct,lac,gain));
      vec2 s = vec2(fbm(p + 4.0*r + vec2(3.1,6.7), oct,lac,gain),
                    fbm(p + 4.0*r + vec2(0.4,4.1),  oct,lac,gain));
      return fbm(p + 4.0*s, oct,lac,gain);
    }

    /* Multi-iteration domain warp — feeds back through itself 'iters'
       times so structure (ridges, blob boundaries) reads as intentional
       composition rather than flat noise. */
    vec2 domainWarp(vec2 p, float seed, int octaves, int iters) {
      vec2 q = p;
      for (int i = 0; i < 4; i++) {
        if (i >= iters) break;
        q = vec2(fbm(q + vec2(seed*0.1, 0.0), octaves, 2.1, 0.48),
                 fbm(q + vec2(0.0, seed*0.1), octaves, 2.1, 0.48));
        p += 0.8 * q;
      }
      return p;
    }

    /* Seed-stable hash */
    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7) + u_seed * 0.001);
      p += dot(p, p + 19.31);
      return fract(p.x * p.y);
    }
    vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + vec2(43.7, 91.3))); }

    /* ════════════════════════════════════════
       MODE 0 — ETHEREAL  (passes: base_noise, glow_centers, vignette)
    ════════════════════════════════════════ */
    vec4 ethereal_base_noise(vec2 uv, vec2 p) {
      float bg = warp(p * 0.7) * 0.5 + 0.5;
      vec3 col = u_color0 * 0.18 + mix(u_color0, u_color1, bg * 0.4) * 0.25;
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 ethereal_glow_centers(vec2 uv, vec2 p) {
      vec3 col = vec3(0.0);
      float totalGlow = 0.0;
      int orbCount = 2 + int(floor(hash(vec2(u_seed*0.0023, 9.9)) * 3.0)); /* 2-4 */
      for (int i = 0; i < 4; i++) {
        if (i >= orbCount) break;
        float fi = float(i);
        vec2 center = vec2(
          hash(vec2(fi*3.71 + u_seed*0.001, 1.23)),
          hash(vec2(fi*5.13 + u_seed*0.001, 4.56))
        );
        vec2 cp = center - 0.5;
        cp.x *= u_resolution.x / u_resolution.y;
        vec2 diff = p - cp;
        float wn = fbm(p*1.8 + vec2(fi*2.7, fi*1.4), iMin(5, u_warpOctaves), 2.0, 0.5);
        float dist = length(diff + vec2(wn*0.3, wn*0.2));
        float radius = 0.18 + hash(vec2(fi*7.1, 2.9)) * 0.22;
        float glow = exp(-dist * dist / (radius * radius));
        float t = fi / 3.0;
        vec3 blobCol = mix(u_color1, u_color2, t);
        col += blobCol * glow * 0.9;
        totalGlow += glow;

        /* soft light rays from the brightest orb */
        if (i == 0) {
          float ang = atan(diff.y, diff.x);
          float rays = pow(0.5 + 0.5 * cos(ang * 6.0 + u_seed*0.01), 8.0);
          float rayFall = exp(-dist * 1.6);
          col += u_color3 * rays * rayFall * 0.35;
          totalGlow += rays * rayFall * 0.2;
        }
      }
      float coreMask = clamp(totalGlow - 0.6, 0.0, 1.0);
      col = mix(col, u_color2 * 1.4, coreMask * 0.6);
      float alpha = clamp(totalGlow, 0.0, 1.0);
      return vec4(clamp(col, 0.0, 1.0), alpha);
    }
    vec4 ethereal_vignette(vec2 uv, vec2 p) {
      float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 2.4;
      vig = clamp(vig, 0.0, 1.0);
      return vec4(vec3(vig), 1.0);
    }

    /* ════════════════════════════════════════
       MODE 1 — BRUTALIST  (passes: geo_fill, geo_outline, grain)
    ════════════════════════════════════════ */
    vec4 brutalist_geo_fill(vec2 uv, vec2 p) {
      float cells = 8.0 + floor(u_params.x * 3.0 + 3.5);
      vec2 cell  = floor(uv * cells);
      vec2 local = fract(uv * cells);
      float cn  = hash(cell + vec2(u_seed * 0.01));
      float cn2 = hash(cell + vec2(u_seed * 0.01 + 17.3));
      vec3 col = u_color0;
      if (cn < 0.25) {
        col = u_color0;
      } else if (cn < 0.5) {
        col = (cn2 < 0.5) ? u_color1 : u_color2;
      } else if (cn < 0.72) {
        float diag = step(local.x, local.y);
        vec3 a = (cn2 < 0.5) ? u_color1 : u_color0;
        vec3 b = (cn2 < 0.5) ? u_color2 : u_color1;
        col = mix(a, b, diag);
      } else if (cn < 0.85) {
        float bar = step(0.25, local.y) * step(local.y, 0.75);
        col = mix(u_color0, u_color1, bar);
      } else {
        vec2 sub = floor(local * 4.0);
        float chk = mod(sub.x + sub.y, 2.0);
        col = mix(u_color0, u_color2, chk);
      }
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 brutalist_geo_outline(vec2 uv, vec2 p) {
      float cells = 8.0 + floor(u_params.x * 3.0 + 3.5);
      vec2 cuv   = uv * cells;
      vec2 cell  = floor(cuv);
      vec2 local = fract(cuv);
      float cn  = hash(cell + vec2(u_seed * 0.01));

      /* crisp 1px-wide line independent of resolution/cell count */
      vec2 cw = fwidth(cuv);
      vec2 distToEdge = min(local, 1.0 - local);
      float lineX = 1.0 - smoothstep(0.0, cw.x * 1.5, distToEdge.x);
      float lineY = 1.0 - smoothstep(0.0, cw.y * 1.5, distToEdge.y);
      float line = clamp(lineX + lineY, 0.0, 1.0);

      float border = 1.0 - step(0.04, local.x) * step(local.x, 0.96)
                         * step(0.04, local.y) * step(local.y, 0.96);
      float mask = line + border * step(0.25, cn);
      mask = clamp(mask, 0.0, 1.0);
      return vec4(vec3(0.0), mask * 0.85);
    }
    vec4 brutalist_grain(vec2 uv, vec2 p) {
      float dotSize = 7.0;
      vec2 hUV = uv * u_resolution / dotSize;
      vec2 cell = floor(hUV);
      vec2 local = fract(hUV) - 0.5;
      float tone = hash(cell * 0.31 + u_seed * 0.0009);
      float r = mix(0.08, 0.42, tone);
      float dot = 1.0 - smoothstep(r, r + 0.08, length(local));
      float n = hash(floor(uv * u_resolution * 0.5) + u_seed * 0.0007);
      vec3 col = mix(vec3(n), vec3(0.0), dot * 0.5);
      return vec4(col, 1.0);
    }

    /* ════════════════════════════════════════
       MODE 2 — ORGANIC  (passes: terrain_base, terrain_detail, contours)
    ════════════════════════════════════════ */
    float organic_height(vec2 p) {
      float h = warp(p * 1.4) * 0.5 + 0.5;
      float h2 = fbm(p * 0.6 + vec2(3.1, 7.4), iMin(5, u_warpOctaves), 2.0, 0.52) * 0.5 + 0.5;
      return clamp(h * 0.7 + h2 * 0.3, 0.0, 1.0);
    }
    vec4 organic_terrain_base(vec2 uv, vec2 p) {
      float bands = 6.0 + floor(u_params.x * 4.0);
      float h = organic_height(p);
      float band = floor(h * bands) / bands;
      vec3 stops[7];
      stops[0]=u_color0; stops[1]=u_color4; stops[2]=u_color1;
      stops[3]=u_color5; stops[4]=u_color2; stops[5]=u_color6; stops[6]=u_color3;
      float t = clamp(band, 0.0, 0.999) * 6.0;
      int lo = int(floor(t));
      float ft = fract(t);
      vec3 bandCol = stops[0];
      for (int i = 0; i < 6; i++) {
        if (i == lo) bandCol = mix(stops[i], stops[i+1], ft);
      }
      /* ridge highlight: brighten near local elevation maxima */
      float hx = organic_height(p + vec2(0.01, 0.0));
      float hy = organic_height(p + vec2(0.0, 0.01));
      float slope = length(vec2(hx - h, hy - h)) / 0.01;
      float ridge = smoothstep(0.6, 1.4, h) * smoothstep(2.0, 0.2, slope);
      bandCol = mix(bandCol, u_color3 * 1.15, ridge * 0.4);
      return vec4(clamp(bandCol, 0.0, 1.0), 1.0);
    }
    vec4 organic_terrain_detail(vec2 uv, vec2 p) {
      float detail = fbm(p * 3.5, iMin(4, u_warpOctaves), 2.0, 0.5) * 0.5 + 0.5;
      return vec4(vec3(detail), 0.5);
    }
    vec4 organic_contours(vec2 uv, vec2 p) {
      float bands = 6.0 + floor(u_params.x * 4.0);
      float h = organic_height(p);
      float bandFrac = fract(h * bands);
      float contourWidth = 0.045;
      float edgeMask = smoothstep(0.0, contourWidth, bandFrac)
                     * smoothstep(0.0, contourWidth, 1.0 - bandFrac);
      float lineMask = 1.0 - edgeMask;
      return vec4(vec3(0.0), lineMask * 0.7);
    }

    /* ════════════════════════════════════════
       MODE 3 — RETRO TECH  (passes: grid_bg, traces, scanlines)
    ════════════════════════════════════════ */
    vec4 retrotech_grid_bg(vec2 uv, vec2 p) {
      float aspect = u_resolution.x / u_resolution.y;
      vec2 gUV = vec2(uv.x * aspect, uv.y) / 0.03;
      vec2 local = fract(gUV) - 0.5;
      float dot = 1.0 - smoothstep(0.05, 0.09, length(local));
      vec3 col = mix(u_color0, u_color0 * 1.4, dot * 0.5);
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 retrotech_traces(vec2 uv, vec2 p) {
      float aspect = u_resolution.x / u_resolution.y;
      vec2 gUV = vec2(uv.x * aspect, uv.y);
      float gridSize = 0.06;
      vec2  cell   = floor(gUV / gridSize);
      vec2  local  = fract(gUV / gridSize);
      vec2  lc     = local - 0.5;

      float nodeMask = step(length(lc), 0.12 + hash(cell) * 0.06);
      float traceNoise  = hash(cell + vec2(31.7, 0.0));
      float traceNoise2 = hash(cell + vec2(0.0, 31.7));

      float hTrace = 0.0;
      if (traceNoise > 0.35) {
        float tw = 0.07 + hash(cell + 0.5) * 0.04;
        hTrace = step(abs(lc.y), tw) * step(0.0, lc.x);
      }
      float vTrace = 0.0;
      if (traceNoise2 > 0.35) {
        float tw = 0.07 + hash(cell + 0.9) * 0.04;
        vTrace = step(abs(lc.x), tw) * step(0.0, lc.y);
      }
      float traceMask = clamp(hTrace + vTrace, 0.0, 1.0);

      vec3 col = u_color1 * 0.75 * traceMask;
      col = mix(col, u_color1, nodeMask);
      float innerDot = step(length(lc), 0.05);
      col = mix(col, u_color2, innerDot);

      float via = 0.0;
      if (hash(cell + vec2(7.1, 3.9)) > 0.82) {
        via = step(0.14, length(lc)) * step(length(lc), 0.20);
        col = mix(col, u_color2, via);
      }
      float alpha = clamp(traceMask + nodeMask + via, 0.0, 1.0);
      return vec4(clamp(col, 0.0, 1.0), alpha);
    }
    vec4 retrotech_scanlines(vec2 uv, vec2 p) {
      float scan = 0.97 + 0.03 * sin(uv.y * u_resolution.y * 0.5);
      return vec4(vec3(scan), 1.0);
    }

    /* ════════════════════════════════════════
       MODE 4 — COSMIC  (passes: space_bg, nebula, stars)
       (stars pass also draws the celestial body — both are "foreground")
    ════════════════════════════════════════ */
    vec4 cosmic_space_bg(vec2 uv, vec2 p) {
      vec3 col = u_color0 * 0.12 + vec3(0.01, 0.01, 0.04);
      float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.1;
      col *= clamp(vig, 0.0, 1.0);
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 cosmic_nebula(vec2 uv, vec2 p) {
      float neb1 = fbm(p * 0.55 + vec2(1.3, 0.7), u_warpOctaves, 2.0, 0.5) * 0.5 + 0.5;
      float neb2 = fbm(p * 0.40 + vec2(4.1, 2.9), iMin(5, u_warpOctaves), 2.1, 0.48) * 0.5 + 0.5;
      neb1 = smoothstep(0.38, 0.85, neb1);
      neb2 = smoothstep(0.42, 0.80, neb2);
      vec3 col = u_color1 * neb1 * 0.38 + u_color2 * neb2 * 0.28;
      float alpha = clamp(neb1 + neb2, 0.0, 1.0);
      return vec4(clamp(col, 0.0, 1.0), alpha);
    }
    vec4 cosmic_stars(vec2 uv, vec2 p) {
      vec3 col = vec3(0.0);
      float alpha = 0.0;

      /* celestial body */
      vec2 bodyCenter = vec2(
        0.25 + hash(vec2(u_seed*0.01, 1.0)) * 0.5,
        0.25 + hash(vec2(u_seed*0.01, 2.0)) * 0.5
      );
      float bodyRadius = 0.08 + hash(vec2(u_seed*0.01, 3.0)) * 0.10;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 bodyDiff = (uv - bodyCenter) * vec2(aspect, 1.0);
      float bodyDist = length(bodyDiff);
      float sphere = pow(1.0 - clamp(bodyDist / bodyRadius, 0.0, 1.0), 0.7);
      float surfNoise = fbm(bodyDiff * 8.0 + vec2(u_seed*0.001), iMin(4, u_warpOctaves), 2.0, 0.5) * 0.5 + 0.5;
      vec3 bodyCol = mix(u_color3 * 0.5, u_color3, surfNoise);
      float limb = 1.0 - clamp(bodyDist / bodyRadius, 0.0, 1.0);
      bodyCol *= (0.5 + 0.5 * limb);
      float atmo = exp(-bodyDist / (bodyRadius * 1.4)) * 0.35;
      col += u_color3 * atmo * 0.5;
      alpha = max(alpha, atmo);
      float bodyMask = sphere * step(bodyDist, bodyRadius);
      col = mix(col, bodyCol, bodyMask);
      alpha = max(alpha, bodyMask);

      /* stars — 3 layers of dense grids ≈ 1500+ candidate points */
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 starUV = uv * (180.0 + fi * 120.0) + vec2(fi * 7.3, fi * 4.1);
        vec2 starCell = floor(starUV);
        vec2 starLocal = fract(starUV);
        float starNoise = hash(starCell + vec2(u_seed * 0.001));
        if (starNoise > 0.93) {
          float brightness = (starNoise - 0.93) / 0.07;
          float twinkle = hash(starCell + vec2(13.7, 0.0));
          float size = 0.15 + twinkle * 0.25;
          float starMask = 1.0 - smoothstep(size * 0.3, size, length(starLocal - 0.5));
          float starAlpha = starMask * brightness * (0.5 + twinkle * 0.5);
          col += vec3(0.85, 0.90, 1.0) * starAlpha;
          alpha = max(alpha, starAlpha);
        }
      }

      /* lens flare streaks through the celestial body */
      vec2 flareDiff = bodyDiff;
      float flareAng = atan(flareDiff.y, flareDiff.x);
      float flareDist = length(flareDiff);
      float flare = pow(0.5 + 0.5 * cos(flareAng * 2.0), 24.0) * exp(-flareDist * 3.0);
      col += u_color3 * flare * 0.6;
      alpha = max(alpha, flare * 0.4);

      return vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
    }

    /* ════════════════════════════════════════
       MODE 5 — WATERCOLOR  (passes: washes, pooling, paper_grain)
    ════════════════════════════════════════ */
    vec4 watercolor_washes(vec2 uv, vec2 p) {
      float w1 = warp(p*0.9 + vec2(1.1,0.3));
      float w2 = warp(p*0.8 + vec2(4.7,2.1));
      float w3 = warp(p*1.0 + vec2(8.2,6.6));
      w1 = w1*0.5+0.5; w2 = w2*0.5+0.5; w3 = w3*0.5+0.5;
      float sum = w1 + w2 + w3 + 0.001;
      vec3 col = (u_color1*w1 + u_color2*w2 + u_color3*w3) / sum;
      col = mix(u_color0, col, smoothstep(0.15, 0.6, max(w1, max(w2,w3))));
      /* hard edge right at the wash boundary, like dried pigment */
      float edge = fwidth(max(w1, max(w2, w3))) * 1.5;
      float boundary = 1.0 - smoothstep(0.18, 0.18 + edge * 8.0, abs(max(w1, max(w2,w3)) - 0.4));
      col = mix(col, col * 0.7, boundary * 0.4);
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 watercolor_pooling(vec2 uv, vec2 p) {
      float w1 = warp(p*0.9 + vec2(1.1,0.3))*0.5+0.5;
      float w2 = warp(p*0.8 + vec2(4.7,2.1))*0.5+0.5;
      float w3 = warp(p*1.0 + vec2(8.2,6.6))*0.5+0.5;
      float spread = abs(w1 - w2) + abs(w2 - w3) + abs(w1 - w3);
      float pool = smoothstep(0.15, 0.0, spread);
      return vec4(vec3(0.0), pool * 0.5);
    }
    vec4 watercolor_paper_grain(vec2 uv, vec2 p) {
      float paper = fbm(p*40.0, 3, 2.2, 0.5)*0.5+0.5;
      return vec4(vec3(0.9,0.88,0.82) * paper, 0.2);
    }

    /* ════════════════════════════════════════
       MODE 6 — NEON NOIR  (passes: city_bg, lights_rain, reflections)
    ════════════════════════════════════════ */
    vec4 neonnoir_city_bg(vec2 uv, vec2 p) {
      return vec4(clamp(u_color0 * 0.06, 0.0, 1.0), 1.0);
    }
    vec4 neonnoir_lights_rain(vec2 uv, vec2 p) {
      vec2 uvR = uv + vec2(0.002, 0.0);
      vec2 uvB = uv - vec2(0.002, 0.0);
      vec3 col = vec3(0.0);
      float aspect = u_resolution.x / u_resolution.y;
      float alpha = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 c = vec2(hash(vec2(fi*4.3+u_seed*0.001,2.0)),
                      0.15 + hash(vec2(fi*6.1+u_seed*0.001,5.0))*0.55);
        vec2 cc = c; cc.x *= aspect;
        vec3 nc = (mod(fi,2.0) < 1.0) ? u_color1 : u_color2;
        float dR = length((vec2(uvR.x*aspect,uvR.y)) - cc);
        float dG = length((vec2(uv.x*aspect,uv.y)) - cc);
        float dB = length((vec2(uvB.x*aspect,uvB.y)) - cc);
        float glow = exp(-dG*dG/0.01);
        col.r += nc.r * exp(-dR*dR/0.01) * 0.8;
        col.g += nc.g * glow * 0.8;
        col.b += nc.b * exp(-dB*dB/0.01) * 0.8;
        alpha = max(alpha, glow);
      }

      /* vertical neon light-streak columns */
      int columnCount = 2 + int(step(0.5, hash(vec2(u_seed*0.0017, 4.4))));
      for (int i = 0; i < 3; i++) {
        if (i >= columnCount) break;
        float fi = float(i);
        float cx = hash(vec2(fi*9.1 + u_seed*0.001, 6.6)) * aspect;
        float dist = abs(uv.x * aspect - cx);
        float width = 0.012 + hash(vec2(fi, 7.7)) * 0.01;
        float streak = exp(-dist*dist/(width*width)) * (0.6 + 0.4*uv.y);
        vec3 sc = (mod(fi,2.0) < 1.0) ? u_color1 : u_color2;
        col += sc * streak * 0.5;
        alpha = max(alpha, streak * 0.4);
      }

      vec2 rp = uv * vec2(40.0, 4.0) + vec2(0.0, u_seed*0.13);
      float streak2 = fbm(rp, 3, 2.0, 0.5);
      float rain = smoothstep(0.55, 0.95, streak2);
      col += vec3(0.6,0.7,0.8) * rain * 0.2;
      alpha = max(alpha, rain * 0.2);
      return vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
    }
    vec4 neonnoir_reflections(vec2 uv, vec2 p) {
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      float aspect = u_resolution.x / u_resolution.y;
      if (uv.y < 0.33) {
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 c = vec2(hash(vec2(fi*4.3+u_seed*0.001,2.0)),
                        0.15 + hash(vec2(fi*6.1+u_seed*0.001,5.0))*0.55);
          vec3 nc = (mod(fi,2.0) < 1.0) ? u_color1 : u_color2;
          vec2 rc = vec2(c.x, 0.33 - (c.y - 0.33));
          rc.x *= aspect;
          float rd = length(vec2(uv.x*aspect,uv.y) - rc);
          float g = exp(-rd*rd/0.05);
          col += nc * g * 0.3;
          alpha = max(alpha, g * 0.3);
        }
      }
      return vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
    }

    /* ════════════════════════════════════════
       MODE 7 — ARCTIC  (passes: ice_base, cracks, light_gradient)
    ════════════════════════════════════════ */
    void arctic_voronoi(vec2 gp, out float minD1, out float minD2, out vec2 closestCell) {
      vec2 gi = floor(gp);
      minD1 = 8.0; minD2 = 8.0;
      for (int y=-1;y<=1;y++) {
        for (int x=-1;x<=1;x++) {
          vec2 nb = vec2(float(x),float(y));
          vec2 cellId = gi + nb;
          vec2 pt = nb + hash2(cellId) - (gp - gi);
          float d = dot(pt,pt);
          if (d < minD1) { minD2 = minD1; minD1 = d; closestCell = cellId; }
          else if (d < minD2) { minD2 = d; }
        }
      }
    }
    vec4 arctic_ice_base(vec2 uv, vec2 p) {
      float minD1, minD2; vec2 closestCell;
      arctic_voronoi(p * 5.0, minD1, minD2, closestCell);
      float shade = hash(closestCell + vec2(3.3,7.7));
      vec3 col = mix(u_color0, u_color0*0.93, shade*0.5);
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 arctic_cracks(vec2 uv, vec2 p) {
      float minD1, minD2; vec2 closestCell;
      arctic_voronoi(p * 5.0, minD1, minD2, closestCell);
      float edge = sqrt(minD2) - sqrt(minD1);
      float w = fwidth(edge) * 1.6 + 0.0025; /* keeps crack width ~constant in screen pixels */
      float crack = 1.0 - smoothstep(0.0, w * 6.0, edge);
      float deepCrack = 1.0 - smoothstep(0.0, w * 1.8, edge);
      float deepGate = step(0.88, hash(closestCell + vec2(9.4,2.1)));
      vec3 col = mix(u_color1*0.5, u_color1*0.15, deepCrack*deepGate);
      float alpha = clamp(crack*0.7 + deepCrack*deepGate*0.8, 0.0, 1.0);
      return vec4(clamp(col, 0.0, 1.0), alpha);
    }
    vec4 arctic_light_gradient(vec2 uv, vec2 p) {
      vec3 base = mix(vec3(1.0), u_color1*0.4 + vec3(0.6), uv.y);
      /* subsurface scatter: soft internal glow biased toward the focal point */
      float scatter = fbm(p * 2.0, 4, 2.0, 0.5) * 0.5 + 0.5;
      vec3 col = mix(base, u_color3, scatter * 0.25);
      return vec4(clamp(col, 0.0, 1.0), 0.5);
    }

    /* ════════════════════════════════════════
       MODE 8 — BOTANICAL  (passes: canopy_back, canopy_front, overhead_light)
    ════════════════════════════════════════ */
    vec4 botanical_leaves(vec2 uv, vec2 p, int lo, int hi) {
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      float aspect = u_resolution.x / u_resolution.y;
      for (int i = 19; i >= 0; i--) {
        if (i < lo || i >= hi) continue;
        float fi = float(i);
        vec2 seed2 = vec2(fi*2.17 + u_seed*0.001, fi*5.31);
        vec2 center = (hash2(seed2) - 0.5) * vec2(2.4*aspect, 2.4);
        float angle = hash(seed2 + 1.0) * 6.2832;
        float len = 0.5 + hash(seed2 + 2.0) * 0.5;
        float wid = len * (0.22 + hash(seed2+3.0)*0.12);
        vec2 d = p - center;
        float ca = cos(angle), sa = sin(angle);
        vec2 lp = vec2(ca*d.x + sa*d.y, -sa*d.x + ca*d.y);
        vec2 ln = lp / vec2(len, wid);
        float leafDist = dot(ln, ln);
        if (leafDist < 1.0) {
          float t = hash(seed2 + 4.0);
          vec3 leafCol = (t < 0.7) ? mix(u_color1, u_color2, t/0.7) : u_color3;
          float shade = 1.0 - smoothstep(0.6, 1.0, leafDist) * 0.3;
          vec3 lc = leafCol * shade;
          float ribWidth = max(0.02*len, fwidth(lp.y) * 1.5);
          float midrib = 1.0 - smoothstep(0.0, ribWidth, abs(lp.y));
          lc = mix(lc, leafCol*1.5, midrib*step(abs(lp.x), len));
          float m = smoothstep(1.0, 0.85, leafDist);
          col = mix(col, lc, m);
          alpha = max(alpha, m);
        }
      }
      return vec4(clamp(col, 0.0, 1.0), alpha);
    }
    vec4 botanical_canopy_back(vec2 uv, vec2 p) {
      vec4 leaves = botanical_leaves(uv, p, 0, 10);
      vec3 col = mix(u_color0, leaves.rgb, leaves.a);
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 botanical_canopy_front(vec2 uv, vec2 p) {
      return botanical_leaves(uv, p, 10, 20);
    }
    vec4 botanical_overhead_light(vec2 uv, vec2 p) {
      vec2 lc2 = uv - vec2(0.5, 0.85);
      float light = 1.0 - smoothstep(0.0, 1.1, length(lc2*vec2(1.0,1.4)));
      float dapple = fbm(p * 6.0, 4, 2.0, 0.5) * 0.5 + 0.5;
      float mask = step(0.45, dapple);
      light *= mix(0.55, 1.0, mask);
      return vec4(vec3(light), 0.5);
    }

    /* ════════════════════════════════════════
       MODE 9 — MOLTEN  (passes: heat_field, crust, glow)
    ════════════════════════════════════════ */
    float molten_heat(vec2 p) {
      int oct = u_warpOctaves;
      vec2 q = vec2(fbm(p + vec2(0.0,0.0), oct, 2.0, 0.5),
                    fbm(p + vec2(5.2,1.3), oct, 2.0, 0.5));
      if (u_warpIters < 3) {
        return fbm(p + 4.0*q, oct, 2.0, 0.5) * 0.5 + 0.5;
      }
      vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7,9.2), oct, 2.0, 0.5),
                    fbm(p + 4.0*q + vec2(8.3,2.8), oct, 2.0, 0.5));
      vec2 s = vec2(fbm(p + 4.0*r + vec2(3.1,6.7), oct, 2.0, 0.5),
                    fbm(p + 4.0*r + vec2(0.4,4.1), oct, 2.0, 0.5));
      return fbm(p + 4.0*s, oct, 2.0, 0.5) * 0.5 + 0.5;
    }
    vec4 molten_heat_field(vec2 uv, vec2 p) {
      float heat = molten_heat(p);
      vec3 col;
      if (heat < 0.35) {
        col = mix(vec3(0.0), u_color1*0.3, heat/0.35);
      } else if (heat < 0.6) {
        col = mix(u_color1*0.3, u_color1, (heat-0.35)/0.25);
      } else if (heat < 0.82) {
        col = mix(u_color1, u_color2, (heat-0.6)/0.22);
      } else {
        col = mix(u_color2, u_color3, (heat-0.82)/0.18);
      }
      return vec4(clamp(col, 0.0, 1.0), 1.0);
    }
    vec4 molten_crust(vec2 uv, vec2 p) {
      float heat = molten_heat(p);
      float crust = 1.0 - smoothstep(0.08, 0.18, heat);
      /* glowing seam right at the crust/lava boundary */
      float seam = 1.0 - smoothstep(0.0, 0.05, abs(heat - 0.12));
      vec3 col = mix(vec3(0.0), u_color2, seam * 0.7);
      return vec4(clamp(col, 0.0, 1.0), clamp(crust * 0.85 + seam * 0.5, 0.0, 1.0));
    }
    vec4 molten_glow(vec2 uv, vec2 p) {
      float heat = molten_heat(p);
      float core = smoothstep(0.85, 1.0, heat);
      return vec4(clamp(u_color3, 0.0, 1.0), core * 0.6);
    }

    /* ════════════════════════════════════════
       SYMMETRY HELPER — folds p according to u_symmetry
       0=none, 1=mirror-x, 2=4-fold, 3=6-fold
    ════════════════════════════════════════ */
    vec2 applySymmetry(vec2 p) {
      if (u_symmetry < 0.5) return p;
      if (u_symmetry < 1.5) {
        /* mirror x */
        p.x = abs(p.x);
        return p;
      }
      if (u_symmetry < 2.5) {
        /* 4-fold: fold into first octant then replicate */
        p = abs(p);
        if (p.x < p.y) { float t = p.x; p.x = p.y; p.y = t; }
        return p;
      }
      /* 6-fold: fold into 60-degree sector */
      float a = atan(p.y, p.x);
      float r = length(p);
      a = mod(a, 3.14159265 / 3.0);
      if (a > 3.14159265 / 6.0) a = 3.14159265 / 3.0 - a;
      return vec2(cos(a), sin(a)) * r;
    }

    /* HSV shift utility */
    vec3 hueShift(vec3 col, float shift) {
      float h = mod(atan(col.g - col.b, col.r - col.b) + shift * 6.2832, 6.2832);
      float s = length(vec2(col.r - col.b, col.g - col.b));
      float v = max(col.r, max(col.g, col.b));
      /* approximate HSV→RGB */
      vec3 k = vec3(1.0, 2.0/3.0, 1.0/3.0);
      vec3 rgb = clamp(abs(fract(h/6.2832 + k) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      return v * mix(vec3(1.0), rgb, s / max(v, 0.001));
    }

    /* ════════════════════════════════════════
       MODE 10 — CRYSTALLINE
       Voronoi-based faceted gem structure.
       pass0: facet_fill, pass1: facet_edges, pass2: specular
    ════════════════════════════════════════ */
    void crystalline_voronoi(vec2 p, out float minD1, out float minD2, out vec2 cell1, out vec2 cell2) {
      float scale = 3.0 + u_density * 6.0;
      vec2 gp = applySymmetry(p) * scale;
      vec2 gi = floor(gp);
      minD1 = 99.0; minD2 = 99.0;
      for (int y=-2;y<=2;y++) for (int x=-2;x<=2;x++) {
        vec2 nb = gi + vec2(float(x),float(y));
        vec2 pt = nb + hash2(nb) - gp;
        float d = dot(pt,pt);
        if (d < minD1) { minD2=minD1; cell2=cell1; minD1=d; cell1=nb; }
        else if (d < minD2) { minD2=d; cell2=nb; }
      }
    }
    vec4 crystalline_facet_fill(vec2 uv, vec2 p) {
      float minD1, minD2; vec2 c1 = vec2(0.0), c2 = vec2(0.0);
      crystalline_voronoi(p, minD1, minD2, c1, c2);
      float h1 = hash(c1 + vec2(3.1, 7.4));
      float h2 = hash(c1 + vec2(9.1, 2.8));
      /* pick from 7 palette tones */
      vec3 tones[7];
      tones[0]=u_color0; tones[1]=u_color4; tones[2]=u_color1;
      tones[3]=u_color5; tones[4]=u_color2; tones[5]=u_color6; tones[6]=u_color3;
      int ti = int(floor(h1 * 7.0));
      vec3 base = tones[0];
      for (int i=0;i<6;i++) if (i==ti) base = mix(tones[i], tones[i+1], fract(h1*7.0));
      /* angle-dependent facet shading */
      vec2 dir = normalize(c2 - c1);
      float angle = atan(dir.y, dir.x);
      float facetLight = 0.55 + 0.45 * sin(angle * 2.0 + hash(c1)*6.28);
      /* depth-from-edge shading */
      float edgeDist = (sqrt(minD2) - sqrt(minD1));
      float depthShade = 1.0 - smoothstep(0.0, 0.2, edgeDist) * 0.35;
      vec3 col = base * facetLight * depthShade;
      col = hueShift(col, u_colorShift);
      return vec4(clamp(col,0.0,1.0),1.0);
    }
    vec4 crystalline_facet_edges(vec2 uv, vec2 p) {
      float minD1, minD2; vec2 c1=vec2(0.0), c2=vec2(0.0);
      crystalline_voronoi(p, minD1, minD2, c1, c2);
      float edge = sqrt(minD2) - sqrt(minD1);
      float w = fwidth(edge) * 1.5 + 0.002;
      float lineW = 0.01 + u_complexity * 0.03;
      float edgeMask = 1.0 - smoothstep(0.0, w + lineW, edge);
      /* Thin bright inner highlight, darker outer shadow */
      float highlight = 1.0 - smoothstep(0.0, w * 0.5, edge);
      vec3 col = mix(u_color1 * 0.3, u_color3 * 1.2, highlight);
      col = hueShift(col, u_colorShift);
      return vec4(col, edgeMask * 0.9);
    }
    vec4 crystalline_specular(vec2 uv, vec2 p) {
      float minD1, minD2; vec2 c1=vec2(0.0), c2=vec2(0.0);
      crystalline_voronoi(p, minD1, minD2, c1, c2);
      float h = hash(c1 + vec2(1.7,5.3));
      /* only some facets get a specular hotspot */
      float spec = 0.0;
      if (h > 0.55) {
        vec2 facetCenter = c1 / (3.0 + u_density * 6.0);
        float dist = length(applySymmetry(p) - facetCenter);
        spec = exp(-dist * dist * (20.0 + u_complexity * 40.0)) * (h - 0.55) * 2.5;
      }
      vec3 col = hueShift(u_color3, u_colorShift) * spec;
      return vec4(clamp(col,0.0,1.0), clamp(spec * 0.8, 0.0, 1.0));
    }

    /* ════════════════════════════════════════
       MODE 11 — FLUID SILK
       Smooth curling ribbons via layered domain warp.
       pass0: base_flow, pass1: ribbons, pass2: sheen
    ════════════════════════════════════════ */
    vec4 silk_base_flow(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float freq = 0.6 + u_density * 1.2;
      float w1 = warp(sp * freq + vec2(0.5, 1.3));
      float w2 = fbm(sp * freq * 1.4 + vec2(3.1, 7.4), iMin(4,u_warpOctaves), 2.1, 0.5);
      float t = w1 * 0.5 + 0.5;
      float t2 = w2 * 0.5 + 0.5;
      vec3 col = mix(u_color0, u_color1, t * 0.6);
      col = mix(col, u_color2, t2 * 0.35);
      col = hueShift(col, u_colorShift);
      return vec4(clamp(col,0.0,1.0),1.0);
    }
    vec4 silk_ribbons(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float freq = 1.0 + u_density * 3.0;
      int ribbonCount = 3 + int(u_density * 5.0);
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      float detail = 2.0 + u_complexity * 4.0;
      for (int i = 0; i < 8; i++) {
        if (i >= ribbonCount) break;
        float fi = float(i);
        vec2 off = vec2(fi * 1.37, fi * 2.71);
        float flow = fbm(sp * freq + off, iMin(5,u_warpOctaves), 2.0, 0.48) * 0.5 + 0.5;
        float flow2 = fbm(sp * freq * detail + off * 1.5, iMin(3,u_warpOctaves), 2.0, 0.5) * 0.5 + 0.5;
        float ribbon = smoothstep(0.40, 0.55, flow) * smoothstep(0.75, 0.55, flow);
        ribbon *= (0.6 + 0.4 * flow2);
        float t = fi / float(ribbonCount);
        vec3 rc = mix(u_color1, u_color3, t);
        rc = hueShift(rc, u_colorShift + t * 0.15);
        col += rc * ribbon;
        alpha = max(alpha, ribbon);
      }
      return vec4(clamp(col,0.0,1.0), clamp(alpha*0.85,0.0,1.0));
    }
    vec4 silk_sheen(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      /* anisotropic sheen along flow direction */
      float freq = 0.8 + u_density;
      vec2 grad = vec2(
        fbm(sp * freq + vec2(0.1,0.0), 3, 2.0, 0.5) - fbm(sp * freq - vec2(0.1,0.0), 3, 2.0, 0.5),
        fbm(sp * freq + vec2(0.0,0.1), 3, 2.0, 0.5) - fbm(sp * freq - vec2(0.0,0.1), 3, 2.0, 0.5)
      );
      float flow = length(grad);
      float sheen = pow(clamp(flow * 3.0, 0.0, 1.0), 2.0) * 0.6;
      vec3 col = hueShift(u_color3, u_colorShift) * sheen;
      return vec4(col, sheen * 0.5);
    }

    /* ════════════════════════════════════════
       MODE 12 — SACRED GEOMETRY
       Layered geometric mandalas: rings, polygons, stars.
       pass0: background_rings, pass1: star_lattice, pass2: center_glow
    ════════════════════════════════════════ */
    float sdRegularPolygon(vec2 p, float r, int n) {
      float an = 6.2832 / float(n);
      float a = atan(p.y, p.x) + an * 0.5;
      float bn = an * floor(a / an);
      vec2 q = mat2(cos(bn),-sin(bn),sin(bn),cos(bn)) * p;
      return length(q - vec2(r, 0.0)) - r * tan(3.14159265 / float(n));
    }
    vec4 sacred_background_rings(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float ringCount = 4.0 + u_density * 6.0;
      float ringWidth = 0.012 + (1.0 - u_complexity) * 0.02;
      float r = length(sp);
      float rings = 0.0;
      for (int i = 1; i <= 10; i++) {
        float fi = float(i);
        if (fi > ringCount) break;
        float rr = fi * 0.15;
        float d = abs(r - rr);
        float w = fwidth(d) * 1.5 + ringWidth;
        rings += 1.0 - smoothstep(0.0, w, d);
      }
      rings = clamp(rings, 0.0, 1.0);
      /* rotating polygon grid */
      int sides = 3 + int(u_complexity * 4.0);
      float rot = hash(vec2(u_seed * 0.0001, 1.0)) * 6.28;
      float ca = cos(rot), sa = sin(rot);
      vec2 rp = mat2(ca,-sa,sa,ca) * sp;
      float polyDist = sdRegularPolygon(rp, 0.5, sides);
      float polyMask = 1.0 - smoothstep(0.0, 0.015, abs(polyDist));
      vec3 col = mix(u_color0, u_color1, rings * 0.7);
      col = mix(col, u_color2, polyMask * 0.6);
      col = hueShift(col, u_colorShift);
      return vec4(clamp(col,0.0,1.0), 1.0);
    }
    vec4 sacred_star_lattice(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float r = length(sp);
      float a = atan(sp.y, sp.x);
      float petals = 6.0 + u_density * 6.0;
      float starPat = 0.5 + 0.5 * cos(a * petals + hash(vec2(u_seed*0.001, 3.0)) * 6.28);
      starPat = pow(starPat, 2.0 + u_complexity * 3.0);
      /* nested star layers */
      float totalStar = 0.0;
      for (int i = 1; i <= 4; i++) {
        float fi = float(i);
        float layerR = fi * 0.2;
        float ring = exp(-pow(r - layerR, 2.0) * 80.0);
        float petals2 = petals * fi;
        float sp2 = 0.5 + 0.5 * cos(a * petals2);
        totalStar += ring * pow(sp2, 3.0);
      }
      totalStar = clamp(totalStar, 0.0, 1.0);
      /* flower of life circles */
      float fol = 0.0;
      for (int i = 0; i < 6; i++) {
        float ang = float(i) * 6.2832 / 6.0;
        vec2 cp = vec2(cos(ang), sin(ang)) * 0.3;
        float cd = abs(length(sp - cp) - 0.3);
        fol += 1.0 - smoothstep(0.0, 0.015, cd);
      }
      fol = clamp(fol, 0.0, 1.0);
      vec3 col = hueShift(u_color2, u_colorShift) * totalStar + hueShift(u_color1, u_colorShift * 0.5) * fol * 0.7;
      float alpha = clamp(totalStar + fol * 0.7, 0.0, 1.0);
      return vec4(clamp(col,0.0,1.0), alpha);
    }
    vec4 sacred_center_glow(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float r = length(sp);
      float glow = exp(-r * r * (4.0 + u_density * 4.0));
      /* radial spokes */
      float a = atan(sp.y, sp.x);
      float spokes = floor(6.0 + u_density * 6.0);
      float spoke = pow(0.5 + 0.5 * cos(a * spokes), 8.0 + u_complexity * 12.0);
      float spokeFall = exp(-r * (3.0 + u_density * 3.0));
      float combined = glow * 0.8 + spoke * spokeFall * 0.6;
      vec3 col = hueShift(u_color3, u_colorShift) * combined;
      return vec4(clamp(col,0.0,1.0), clamp(combined, 0.0, 1.0));
    }

    /* ════════════════════════════════════════
       MODE 13 — GLITCH
       Datamosh-style: horizontal slices, pixel drift, chromatic block artifacts.
       pass0: slice_base, pass1: block_glitch, pass2: scanlines_color
    ════════════════════════════════════════ */
    vec4 glitch_slice_base(vec2 uv, vec2 p) {
      /* Slice rows with different horizontal offsets */
      float sliceH = 0.02 + (1.0 - u_density) * 0.1;
      float sliceIdx = floor(uv.y / sliceH);
      float sliceNoise = hash(vec2(sliceIdx, u_seed * 0.001));
      float offset = 0.0;
      if (sliceNoise > 0.6) {
        offset = (sliceNoise - 0.6) * u_density * 0.25 * (sliceNoise > 0.85 ? 4.0 : 1.0);
      }
      float sampleX = fract(uv.x + offset);
      vec2 sp = vec2(sampleX, uv.y) - 0.5;
      sp.x *= u_resolution.x / u_resolution.y;
      float n = warp(sp * (0.8 + u_complexity * 1.2));
      float t = n * 0.5 + 0.5;
      vec3 col = mix(u_color0, mix(u_color1, u_color2, t * 1.5), t);
      col = hueShift(col, u_colorShift + sliceNoise * 0.3);
      return vec4(clamp(col,0.0,1.0),1.0);
    }
    vec4 glitch_block_glitch(vec2 uv, vec2 p) {
      float blockW = 0.04 + (1.0 - u_complexity) * 0.12;
      float blockH = 0.015 + (1.0 - u_complexity) * 0.04;
      vec2 blockId = floor(uv / vec2(blockW, blockH));
      float bn = hash(blockId + vec2(u_seed * 0.0007, 3.0));
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      if (bn > 0.7) {
        /* Color block artifact */
        float intensity = (bn - 0.7) / 0.3;
        float colorChoice = hash(blockId + vec2(u_seed * 0.0013, 7.0));
        vec3 glitchCol = colorChoice < 0.33
          ? u_color1
          : (colorChoice < 0.66 ? u_color2 : u_color3);
        glitchCol = hueShift(glitchCol, u_colorShift);
        /* pixel drift: offset the block */
        float driftX = (hash(blockId + vec2(11.3, 0.0)) - 0.5) * 0.08 * u_density;
        vec2 driftUV = fract(uv + vec2(driftX, 0.0));
        float blockMask = step(fract((driftUV.x - blockId.x * blockW) / blockW), 1.0)
                        * step(fract((driftUV.y - blockId.y * blockH) / blockH), 1.0);
        col = glitchCol * intensity;
        alpha = intensity * 0.75 * u_density;
      }
      return vec4(clamp(col,0.0,1.0), clamp(alpha,0.0,1.0));
    }
    vec4 glitch_scanlines_color(vec2 uv, vec2 p) {
      /* RGB channel split scanlines */
      float scanFreq = 1.5 + u_density * 3.0;
      float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * scanFreq);
      float scanLine = smoothstep(0.35, 0.65, scan);
      /* Horizontal noise bars */
      float barN = hash(vec2(floor(uv.y * 80.0), u_seed * 0.001));
      float barMask = step(0.88, barN) * (barN - 0.88) / 0.12;
      /* RGB fringe on scanlines */
      float rOff = u_density * 0.006;
      vec3 col = vec3(
        mix(1.0, 1.0 + rOff, scanLine),
        1.0,
        mix(1.0, 1.0 - rOff, scanLine)
      ) * (1.0 - barMask * 0.5);
      vec3 barCol = hueShift(u_color1, u_colorShift) * barMask;
      col = mix(col, barCol * 2.0, barMask * 0.6);
      return vec4(clamp(col,0.0,1.0), 0.3 + barMask * 0.6);
    }

    /* ════════════════════════════════════════
       MODE 14 — MYCELIUM
       Branching network of filaments + spore nodes.
       pass0: substrate, pass1: network, pass2: spores
    ════════════════════════════════════════ */
    vec4 mycelium_substrate(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      float soil = warp(sp * (0.6 + u_complexity * 0.8));
      float soil2 = fbm(sp * 1.8, iMin(4, u_warpOctaves), 2.0, 0.55) * 0.5 + 0.5;
      float t = clamp(soil * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(u_color0, mix(u_color0 * 1.3, u_color1 * 0.35, soil2), t * 0.6);
      col = hueShift(col, u_colorShift);
      return vec4(clamp(col,0.0,1.0),1.0);
    }
    vec4 mycelium_network(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      /* Use domain-warped Voronoi edges as the filament network */
      float nodeCount = 3.0 + u_density * 8.0;
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      float filW = 0.006 + u_complexity * 0.01;
      /* For each pair of nearby nodes, draw a filament segment */
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        vec2 na = hash2(vec2(fi, u_seed * 0.001)) * 2.0 - 1.0;
        na *= u_resolution.x / u_resolution.y;
        for (int j = 0; j < 8; j++) {
          if (j <= i) continue;
          float fj = float(j);
          vec2 nb = hash2(vec2(fj + 17.3, u_seed * 0.001)) * 2.0 - 1.0;
          nb *= u_resolution.x / u_resolution.y;
          float dist = length(na - nb);
          if (dist > 1.2 + u_density * 0.8) continue;
          /* Distance from sp to segment na→nb */
          vec2 ba = nb - na;
          float t2 = clamp(dot(sp - na, ba) / (dot(ba,ba) + 0.0001), 0.0, 1.0);
          float segDist = length(sp - (na + t2 * ba));
          /* Warp the filament slightly */
          float wn = fbm(sp * 3.0 + vec2(fi * 1.37, fj * 2.71), 3, 2.0, 0.5) * 0.05;
          segDist += wn;
          float filament = 1.0 - smoothstep(filW * 0.5, filW * 2.5, segDist);
          float bright = hash(vec2(fi * 3.17, fj + u_seed * 0.001));
          vec3 fc = mix(u_color1 * 0.5, u_color2, bright);
          fc = hueShift(fc, u_colorShift + bright * 0.2);
          col += fc * filament;
          alpha = max(alpha, filament * 0.9);
        }
      }
      return vec4(clamp(col,0.0,1.0), clamp(alpha,0.0,1.0));
    }
    vec4 mycelium_spores(vec2 uv, vec2 p) {
      vec2 sp = applySymmetry(p);
      vec3 col = vec3(0.0);
      float alpha = 0.0;
      float aspect = u_resolution.x / u_resolution.y;
      int sporeCount = 5 + int(u_density * 12.0);
      for (int i = 0; i < 17; i++) {
        if (i >= sporeCount) break;
        float fi = float(i);
        vec2 spos = hash2(vec2(fi * 7.13 + u_seed * 0.0013, fi * 3.97)) * 2.0 - 1.0;
        spos *= vec2(aspect, 1.0);
        float radius = 0.02 + hash(vec2(fi * 2.11, u_seed * 0.001)) * 0.05 * (1.0 + u_complexity);
        float d = length(sp - spos);
        /* inner spore disc */
        float disc = 1.0 - smoothstep(radius * 0.5, radius, d);
        /* glow halo */
        float halo = exp(-d * d / (radius * radius * 4.0)) * 0.5;
        float sporeGlow = disc + halo;
        float t = hash(vec2(fi + 5.3, u_seed * 0.001));
        vec3 sc = mix(u_color2, u_color3, t);
        sc = hueShift(sc, u_colorShift);
        col += sc * sporeGlow;
        alpha = max(alpha, clamp(sporeGlow, 0.0, 1.0));
      }
      return vec4(clamp(col,0.0,1.0), clamp(alpha,0.0,1.0));
    }

    /* ════════════════════════════════════════
       MAIN — dispatch to (mode, pass)
    ════════════════════════════════════════ */
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      p += vec2(sin(u_seed * 0.00713) * 12.3,
                cos(u_seed * 0.00931) *  9.7);

      /* composition bias: re-center on focal point, rotate, scale —
         gives every mode a distinct focal point instead of dead-center noise */
      vec2 focal = (vec2(u_focalX, u_focalY) - 0.5) * vec2(aspect, 1.0);
      p -= focal * 0.6;
      float cr = cos(u_rotation), sr = sin(u_rotation);
      p = mat2(cr, -sr, sr, cr) * p;
      p *= mix(1.0, 1.0 / max(u_scale, 0.001), 0.5);
      p = applySymmetry(p); /* was only applied inside 4 of 15 modes — now global */

      vec4 outc = vec4(0.0, 0.0, 0.0, 1.0);

      if (u_mode == 0) {
        if (u_pass == 0) outc = ethereal_base_noise(uv, p);
        else if (u_pass == 1) outc = ethereal_glow_centers(uv, p);
        else outc = ethereal_vignette(uv, p);
      } else if (u_mode == 1) {
        if (u_pass == 0) outc = brutalist_geo_fill(uv, p);
        else if (u_pass == 1) outc = brutalist_geo_outline(uv, p);
        else outc = brutalist_grain(uv, p);
      } else if (u_mode == 2) {
        if (u_pass == 0) outc = organic_terrain_base(uv, p);
        else if (u_pass == 1) outc = organic_terrain_detail(uv, p);
        else outc = organic_contours(uv, p);
      } else if (u_mode == 3) {
        if (u_pass == 0) outc = retrotech_grid_bg(uv, p);
        else if (u_pass == 1) outc = retrotech_traces(uv, p);
        else outc = retrotech_scanlines(uv, p);
      } else if (u_mode == 4) {
        if (u_pass == 0) outc = cosmic_space_bg(uv, p);
        else if (u_pass == 1) outc = cosmic_nebula(uv, p);
        else outc = cosmic_stars(uv, p);
      } else if (u_mode == 5) {
        if (u_pass == 0) outc = watercolor_washes(uv, p);
        else if (u_pass == 1) outc = watercolor_pooling(uv, p);
        else outc = watercolor_paper_grain(uv, p);
      } else if (u_mode == 6) {
        if (u_pass == 0) outc = neonnoir_city_bg(uv, p);
        else if (u_pass == 1) outc = neonnoir_lights_rain(uv, p);
        else outc = neonnoir_reflections(uv, p);
      } else if (u_mode == 7) {
        if (u_pass == 0) outc = arctic_ice_base(uv, p);
        else if (u_pass == 1) outc = arctic_cracks(uv, p);
        else outc = arctic_light_gradient(uv, p);
      } else if (u_mode == 8) {
        if (u_pass == 0) outc = botanical_canopy_back(uv, p);
        else if (u_pass == 1) outc = botanical_canopy_front(uv, p);
        else outc = botanical_overhead_light(uv, p);
      } else if (u_mode == 9) {
        if (u_pass == 0) outc = molten_heat_field(uv, p);
        else if (u_pass == 1) outc = molten_crust(uv, p);
        else outc = molten_glow(uv, p);
      } else if (u_mode == 10) {
        if (u_pass == 0) outc = crystalline_facet_fill(uv, p);
        else if (u_pass == 1) outc = crystalline_facet_edges(uv, p);
        else outc = crystalline_specular(uv, p);
      } else if (u_mode == 11) {
        if (u_pass == 0) outc = silk_base_flow(uv, p);
        else if (u_pass == 1) outc = silk_ribbons(uv, p);
        else outc = silk_sheen(uv, p);
      } else if (u_mode == 12) {
        if (u_pass == 0) outc = sacred_background_rings(uv, p);
        else if (u_pass == 1) outc = sacred_star_lattice(uv, p);
        else outc = sacred_center_glow(uv, p);
      } else if (u_mode == 13) {
        if (u_pass == 0) outc = glitch_slice_base(uv, p);
        else if (u_pass == 1) outc = glitch_block_glitch(uv, p);
        else outc = glitch_scanlines_color(uv, p);
      } else if (u_mode == 14) {
        if (u_pass == 0) outc = mycelium_substrate(uv, p);
        else if (u_pass == 1) outc = mycelium_network(uv, p);
        else outc = mycelium_spores(uv, p);
      } else {
        outc = vec4(mix(u_color0, u_color1, warp(p)*0.5+0.5), 1.0);
      }

      gl_FragColor = outc;
    }
  `,

  /* ════════════════════════════════════════════════════════
     COMPOSITE SHADER
     Blends up to 3 layer textures onto the screen.
     u_blend0 blends layer1 onto layer0; u_blend1 blends layer2 onto that result.
     Blend modes: 0 normal, 1 screen, 2 multiply, 3 overlay, 4 soft light, 5 color dodge.
  ════════════════════════════════════════════════════════ */
  compositeVertex: `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,
  compositeFragment: `
    precision highp float;
    varying vec2 v_uv;

    uniform sampler2D u_layer0;
    uniform sampler2D u_layer1;
    uniform sampler2D u_layer2;
    uniform int   u_layerCount;
    uniform int   u_blend0;
    uniform int   u_blend1;
    uniform float u_opacity0;
    uniform float u_opacity1;
    uniform float u_opacity2;

    vec3 blendScreen(vec3 b, vec3 a)     { return 1.0 - (1.0-a)*(1.0-b); }
    vec3 blendMultiply(vec3 b, vec3 a)   { return a*b; }
    vec3 blendOverlay(vec3 b, vec3 a) {
      return mix(2.0*a*b, 1.0 - 2.0*(1.0-a)*(1.0-b), step(0.5, b));
    }
    vec3 blendSoftLight(vec3 b, vec3 a) {
      vec3 d = mix(((16.0*a - 12.0)*a + 4.0)*a, sqrt(a), step(0.5, a));
      return mix(b - (1.0-2.0*b)*a*(1.0-a), b + (2.0*b-1.0)*(d-a), step(0.5, b));
    }
    vec3 blendColorDodge(vec3 b, vec3 a) {
      return min(vec3(1.0), b / max(vec3(0.001), 1.0 - a));
    }

    vec3 applyBlend(int mode, vec3 base, vec3 top, float topAlpha) {
      vec3 blended;
      if      (mode == 1) blended = blendScreen(base, top);
      else if (mode == 2) blended = blendMultiply(base, top);
      else if (mode == 3) blended = blendOverlay(base, top);
      else if (mode == 4) blended = blendSoftLight(base, top);
      else if (mode == 5) blended = blendColorDodge(base, top);
      else                blended = top; /* normal: alpha-over below */
      return mix(base, blended, topAlpha);
    }

    void main() {
      vec4 l0 = texture2D(u_layer0, v_uv);
      vec3 result = l0.rgb;

      if (u_layerCount > 1) {
        vec4 l1 = texture2D(u_layer1, v_uv);
        result = applyBlend(u_blend0, result, l1.rgb, l1.a * u_opacity1);
      }
      if (u_layerCount > 2) {
        vec4 l2 = texture2D(u_layer2, v_uv);
        result = applyBlend(u_blend1, result, l2.rgb, l2.a * u_opacity2);
      }

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `,

  /* ════════════════════════════════════════════════════════
     POST-PROCESS SHADER
     Final pass: vignette, grain, chromatic aberration (Neon Noir
     only), color grading S-curve, soft bloom (Cosmic/Molten only).
     Reads the composited frame as a texture, samples 9 ish times
     max (CA does 3, bloom does a small kernel) so it stays cheap.
  ════════════════════════════════════════════════════════ */
  postVertex: `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,
  postFragment: `
    precision highp float;
    varying vec2 v_uv;

    uniform sampler2D u_frame;
    uniform vec2  u_resolution;
    uniform float u_seed;
    uniform float u_vignette;     /* ~0.35, always on */
    uniform float u_grain;        /* ~0.04, always on */
    uniform float u_chromAb;      /* 0 default, 0.003 Neon Noir */
    uniform float u_bloomStrength;/* 0 default, ~0.3 Cosmic/Molten */

    float hashP(vec2 p) {
      p = fract(p * vec2(127.1, 311.7) + u_seed * 0.0013);
      p += dot(p, p + 19.31);
      return fract(p.x * p.y);
    }

    /* Subtle S-curve: lifts shadows a touch, compresses highlights */
    vec3 colorGrade(vec3 c) {
      vec3 x = clamp(c, 0.0, 1.0);
      vec3 lifted = x + (0.04 * (1.0 - x)) * smoothstep(0.0, 0.4, 0.4 - x);
      vec3 graded = lifted - (0.05 * lifted) * smoothstep(0.6, 1.0, lifted);
      return clamp(graded, 0.0, 1.0);
    }

    vec3 sampleBloom(vec2 uv) {
      vec3 sum = vec3(0.0);
      float total = 0.0;
      vec2 px = 1.0 / u_resolution;
      for (int y = -2; y <= 2; y++) {
        for (int x = -2; x <= 2; x++) {
          vec2 off = vec2(float(x), float(y)) * px * 3.0;
          vec3 s = texture2D(u_frame, uv + off).rgb;
          float lum = dot(s, vec3(0.299, 0.587, 0.114));
          float bright = smoothstep(0.85, 1.0, lum);
          float w = 1.0 / (1.0 + float(x*x + y*y));
          sum += s * bright * w;
          total += w;
        }
      }
      return sum / max(total, 0.001);
    }

    void main() {
      vec2 uv = v_uv;
      vec3 col = texture2D(u_frame, uv).rgb;

      if (u_chromAb > 0.0001) {
        vec2 dir = uv - 0.5;
        col.r = texture2D(u_frame, uv - dir * u_chromAb).r;
        col.b = texture2D(u_frame, uv + dir * u_chromAb).b;
      }

      if (u_bloomStrength > 0.0001) {
        vec3 bloom = sampleBloom(uv);
        col += bloom * u_bloomStrength;
      }

      col = colorGrade(col);
      col = col / (col + 0.5) * 1.5;
      col = clamp(col, 0.0, 1.0);

      /* vignette */
      vec2 vc = uv - 0.5;
      float vig = 1.0 - dot(vc, vc) * 1.65 * u_vignette / 0.35;
      vig = clamp(vig, 1.0 - u_vignette, 1.0);
      col *= vig;

      /* film grain */
      float g = (hashP(gl_FragCoord.xy) - 0.5) * 2.0;
      col += g * u_grain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};
