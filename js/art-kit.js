(function (g) {
  'use strict';
  // HomeYear art kit: time-of-day tones, season tokens, shared SVG defs and drawing primitives.
  // Presentation only. Never reads game state, never consumes the game RNG.
  const H = g.HomeYear = g.HomeYear || {};
  const n = v => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const x = parseInt(h, 16); return [x >> 16 & 255, x >> 8 & 255, x & 255]; }
  function hex(a) { return '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }

  // Six time-of-day palettes (docs/av-direction.md 2.1). Light always comes from the upper left.
  const TONES = {
    dusk:     {sky:['#2c3a5c','#7b6380','#e9a77a'], lit:'#f1d2b0', shade:'#4a5a6e', win:'#ffd27a', on:.55, glow:.85, haze:'#a88591', ambient:'#9a7d86', ink:'#262b3d', ground:'#4f4b57', sun:'#ffc98a', night:true},
    morning:  {sky:['#b9d3df','#d9e1d8','#f6e7cf'], lit:'#f7ead6', shade:'#8fa3a6', win:'#fff1c9', on:.12, glow:.25, haze:'#d4dfdc', ambient:'#c9cfc6', ink:'#3a4648', ground:'#a9a798', sun:'#fff6dc', night:false},
    day:      {sky:['#9cc3cf','#c9dbd5','#f3e3c4'], lit:'#fbefd9', shade:'#7d9690', win:'#e9f0e8', on:0,   glow:0,   haze:'#c8d9d6', ambient:'#c3c7b9', ink:'#34413f', ground:'#a8a28e', sun:'#fffbe8', night:false},
    evening:  {sky:['#1f2a44','#4a4360','#c7785c'], lit:'#d9a888', shade:'#2f3a4f', win:'#ffc463', on:.8,  glow:1,   haze:'#5e5672', ambient:'#6b6075', ink:'#1a2033', ground:'#38364a', sun:'#f5d7a4', night:true},
    golden:   {sky:['#e89a5c','#f3bd7e','#fde3b0'], lit:'#ffe0b3', shade:'#8a6a5a', win:'#ffe6a8', on:.35, glow:.55, haze:'#f0c49a', ambient:'#d9a985', ink:'#3d2e2a', ground:'#9c7e66', sun:'#fff0c8', night:false},
    bluehour: {sky:['#33476b','#5f7393','#9fb2c6'], lit:'#c9d3da', shade:'#3b4a5e', win:'#ffd894', on:.06, glow:.9,  haze:'#7d8ea8', ambient:'#71809a', ink:'#1f2a3c', ground:'#4c5668', sun:'#e8eef4', night:true}
  };
  const PHASE_TONE = {menu:'dusk', early:'morning', development:'day', sprint:'evening', 'ending-home':'golden', 'ending-rent':'bluehour'};
  const SEASONS = ['winter','spring','summer','autumn'];
  const SEASON_CN = {'冬':'winter','春':'spring','夏':'summer','秋':'autumn'};
  // Foliage per season: [lit, mid, shade]. "plain" is used where no public season exists (start page).
  const LEAVES = {
    plain:  ['#9cbf84','#6f9a6a','#47705a'],
    winter: ['#b9a58e','#8c7a69','#5e5149'],
    spring: ['#bfdc8f','#8fbd74','#5f8f5c'],
    summer: ['#7fae6c','#4f8558','#2f5a43'],
    autumn: ['#f2c25a','#d9913f','#a8612f']
  };
  function tone(id) { return TONES[id] || TONES.day; }
  // Three-tone material lighting shared by every facade: lit / mid / shade / deep.
  function mat(base, t) {
    return {lit:mix(base, t.lit, .42), mid:mix(base, t.ambient, .22), shade:mix(base, t.shade, .55), deep:mix(base, t.ink, .72), far:mix(base, t.haze, .62)};
  }

  const attrs = o => o ? Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` ${k}="${v}"`).join('') : '';
  const P = {
    n, mix,
    rect: (x, y, w, h, fill, o) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${attrs(o)}/>`,
    path: (d, fill, o) => `<path d="${d}" fill="${fill}"${attrs(o)}/>`,
    circ: (x, y, r, fill, o) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"${attrs(o)}/>`,
    ell: (x, y, rx, ry, fill, o) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${attrs(o)}/>`,
    line: (x1, y1, x2, y2, stroke, w = 1, o) => `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${attrs(o)}/>`,
    stroke: (d, stroke, w = 1, o) => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${attrs(o)}/>`,
    g: (body, o) => `<g${attrs(o)}>${body}</g>`
  };

  // Presentation PRNG (mulberry32); seeded per drawing so art is deterministic and independent of game RNG.
  function prng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Shared defs: every id carries the hy- prefix and lives once per document (or once per exported file).
  function defs() {
    const lg = (id, stops, o = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${o}>${stops.map(([off, c, op = 1]) => `<stop offset="${off}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`).join('')}</linearGradient>`;
    const rg = (id, stops, o = '') => `<radialGradient id="${id}" ${o}>${stops.map(([off, c, op = 1]) => `<stop offset="${off}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`).join('')}</radialGradient>`;
    let d = '';
    for (const [id, t] of Object.entries(TONES)) d += lg('hy-sky-' + id, [[0, t.sky[0]], [.58, t.sky[1]], [1, t.sky[2]]]);
    for (const [id, t] of Object.entries(TONES)) d += lg('hy-glass-' + id, [[0, t.sky[0]], [.7, t.sky[2]], [1, mix(t.sky[2], t.shade, .4)]], 'x1="0" y1="0" x2=".35" y2="1"');
    d += rg('hy-glow', [[0, '#ffe2a0', .85], [.45, '#ffc76e', .32], [1, '#ffb45a', 0]]);
    d += rg('hy-sun', [[0, '#fff8e6', .95], [.25, '#ffe7b8', .55], [1, '#ffd7a0', 0]]);
    d += rg('hy-lamp', [[0, '#fff1c8', .9], [.5, '#ffd27a', .25], [1, '#ffd27a', 0]]);
    d += rg('hy-vignette', [[.55, '#1b2233', 0], [1, '#1b2233', .32]], 'cx=".45" cy=".42" r=".75"');
    d += lg('hy-haze', [[0, '#ffffff', 0], [1, '#ffffff', .38]]);
    d += lg('hy-fade', [[0, '#1b2233', 0], [1, '#1b2233', .3]]);
    d += lg('hy-shine', [[0, '#ffffff', .55], [.35, '#ffffff', 0], [.6, '#ffffff', .12], [.75, '#ffffff', 0]], 'x1="0" y1="0" x2="1" y2="1"');
    d += lg('hy-facelight', [[0, '#fff6e0', .2], [.45, '#fff6e0', 0], [1, '#101a2a', .16]], 'x1="0" y1="0" x2="1" y2="1"');
    d += lg('hy-ground', [[0, '#000000', 0], [1, '#000000', .22]]);
    d += lg('hy-water', [[0, '#9fbcc4'], [.5, '#6f8f9b'], [1, '#41606e']]);
    d += lg('hy-icon-hl', [[0, '#ffffff', .7], [.55, '#ffffff', 0]], 'x1="0" y1="0" x2=".6" y2="1"');
    d += lg('hy-chart', [[0, '#2f7a68', .26], [1, '#2f7a68', 0]]);
    d += lg('hy-chart-up', [[0, '#a5483a', .2], [1, '#a5483a', 0]]);
    d += lg('hy-steam', [[0, '#ffffff', 0], [.5, '#ffffff', .55], [1, '#ffffff', 0]]);
    // Material patterns (2–3 colors, userSpaceOnUse so scale is consistent inside one drawing).
    const pat = (id, w, h, body, extra = '') => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${extra}>${body}</pattern>`;
    d += pat('hy-brick', 16, 8, '<path d="M0 .5H16M0 4.5H16M5 .5V4.5M13 4.5V8.5" stroke="#3a2018" stroke-opacity=".22" stroke-width=".7"/><rect x="5.4" y=".9" width="7.2" height="3.2" fill="#000" fill-opacity=".05"/><rect x="0" y="4.9" width="4.6" height="3.2" fill="#fff" fill-opacity=".06"/>');
    d += pat('hy-tile', 6, 6, '<path d="M0 .3H6M.3 0V6" stroke="#2d3a3a" stroke-opacity=".12" stroke-width=".5"/>');
    d += pat('hy-roof', 10, 6, '<path d="M0 6Q5 .8 10 6" stroke="#2a1a14" stroke-opacity=".28" stroke-width=".8" fill="none"/><path d="M5 0V3" stroke="#fff" stroke-opacity=".12" stroke-width=".8"/>');
    d += pat('hy-wood', 36, 7, '<path d="M0 .4H36M22 .4V7" stroke="#3b2414" stroke-opacity=".25" stroke-width=".7"/><path d="M3 3.5Q9 2.6 15 3.6" stroke="#3b2414" stroke-opacity=".1" stroke-width=".5" fill="none"/>');
    d += pat('hy-shutter', 8, 4, '<path d="M0 .5H8" stroke="#1d2433" stroke-opacity=".28" stroke-width=".8"/><path d="M0 1.6H8" stroke="#fff" stroke-opacity=".14" stroke-width=".6"/>');
    d += pat('hy-hatch', 5, 5, '<path d="M-1 6L6 -1" stroke="#1d2433" stroke-opacity=".13" stroke-width=".6"/>');
    d += pat('hy-dapple', 14, 12, '<circle cx="3" cy="3" r="1.6" fill="#fff" fill-opacity=".16"/><circle cx="10" cy="8" r="1.2" fill="#fff" fill-opacity=".12"/><circle cx="8" cy="2" r="1" fill="#000" fill-opacity=".08"/><circle cx="2" cy="9" r="1.3" fill="#000" fill-opacity=".07"/>');
    d += pat('hy-ripple', 40, 8, '<path d="M2 3H14M22 6H36" stroke="#fff" stroke-opacity=".28" stroke-width=".8" stroke-linecap="round"/>');
    d += pat('hy-grille', 6, 24, '<path d="M3 0V24" stroke="#3c4547" stroke-opacity=".7" stroke-width=".9"/><path d="M0 12H6" stroke="#3c4547" stroke-opacity=".55" stroke-width=".7"/>');
    d += pat('hy-corr', 5, 10, '<path d="M1 0V10" stroke="#1d2433" stroke-opacity=".2" stroke-width="1"/><path d="M3 0V10" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/>');
    d += pat('hy-reed', 3, 6, '<path d="M1.5 0V6" stroke="#5a3d1c" stroke-opacity=".3" stroke-width=".7"/>');
    d += pat('hy-grass', 9, 6, '<path d="M1 6L2 2M4 6L5 1M7 6L6.5 3" stroke="#1f3a22" stroke-opacity=".2" stroke-width=".6"/>');
    d += pat('hy-paper', 14, 14, '<path d="M0 13.5H14" stroke="#7a6a50" stroke-opacity=".12" stroke-width=".6"/>');
    return `<defs>${d}</defs>`;
  }

  // Wrap a drawing as complete SVG. Scenes never carry ids; they only reference url(#hy-…).
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function svg(body, box, cls = '', extra = '') { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${esc(cls)}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`; }
  // Standalone export: embed the shared defs right after the opening tag.
  function standalone(s) { return s.replace(/^<svg([^>]*)>/, (m) => m + defs()); }

  let injected = false;
  // Final grain strength chosen after side-by-side 1366 captures (docs/av-visual-report.md, "纸纹对比").
  let GRAIN = .3;
  try { const q = g.location && /[?&]grain=([\d.]+)/.exec(g.location.search); if (q) GRAIN = Math.min(1, +q[1]); } catch (e) {}
  function inject(doc) {
    if (injected || !doc || !doc.body) return injected;
    if (doc.getElementById('hy-defs')) return (injected = true);
    const holder = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    holder.setAttribute('id', 'hy-defs'); holder.setAttribute('aria-hidden', 'true'); holder.setAttribute('focusable', 'false');
    holder.setAttribute('width', '0'); holder.setAttribute('height', '0');
    // Not display:none: Chromium drops gradients/patterns defined inside display:none SVG.
    holder.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
    holder.innerHTML = defs();
    doc.body.insertBefore(holder, doc.body.firstChild);
    return (injected = true);
  }
  // 256×256 paper grain generated once with a canvas (file:// safe) and exposed as a CSS variable.
  // strength scales alpha; low-frequency fibres (soft blotches) dominate so text areas stay clean.
  function grain(doc, strength = GRAIN) {
    try {
      const c = doc.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d'); if (!x) return false;
      const img = x.createImageData(256, 256), r = prng(20261003);
      // Coarse 32×32 value field, bilinearly sampled: soft tonal variation instead of pixel noise.
      const G = 9, field = []; for (let i = 0; i < G * G; i++) field.push(r() - .5);
      const at = (u, v) => { const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, F = (a, b) => field[(b % (G - 1)) * G + (a % (G - 1))]; return F(i, j) * (1 - fu) * (1 - fv) + F(i + 1, j) * fu * (1 - fv) + F(i, j + 1) * (1 - fu) * fv + F(i + 1, j + 1) * fu * fv; };
      for (let p = 0, i = 0; p < 256 * 256; p++, i += 4) {
        const px = p % 256, py = (p / 256) | 0, low = at(px / 32, py / 32) * 1.4, fine = (r() - .5) * .5, fibre = r() < .004 ? -1.2 : 0;
        const v = low + fine + fibre, dark = v < 0;
        img.data[i] = img.data[i + 1] = dark ? 70 : 255; img.data[i + 2] = dark ? 50 : 248;
        img.data[i + 3] = Math.min(255, Math.round(Math.abs(v) * (dark ? 22 : 16) * strength));
      }
      x.putImageData(img, 0, 0);
      doc.documentElement.style.setProperty('--paper-grain', `url("${c.toDataURL('image/png')}")`);
      return true;
    } catch (e) { return false; }
  }

  H.ArtKit = Object.freeze({TONES, PHASE_TONE, SEASONS, SEASON_CN, LEAVES, tone, mat, mix, prng, defs, svg, standalone, inject, grain, P, escape: esc});
})(typeof window !== 'undefined' ? window : globalThis);
