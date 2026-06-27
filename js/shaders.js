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
