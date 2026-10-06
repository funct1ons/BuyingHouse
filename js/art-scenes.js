(function (g) {
  'use strict';
  // HomeYear scenes: original paper-illustration city life. Every scene reads only its options
  // ({phase, season, tone, lamps}); nothing here touches game state or the game RNG.
  const H = g.HomeYear = g.HomeYear || {};
  const K = H.ArtKit;
  if (!K) throw Error('art-kit.js must load before art-scenes.js');
  const {rect, path, circ, ell, line, stroke, g: grp, n} = K.P, mix = K.mix;

  function ctx(o, seed, fallbackTone) {
    const tid = o.tone && K.TONES[o.tone] ? o.tone : o.phase && K.PHASE_TONE[o.phase] ? K.PHASE_TONE[o.phase] : fallbackTone;
    const season = K.SEASONS.includes(o.season) ? o.season : null;
    return {tid, t: K.tone(tid), season, L: K.LEAVES[season || 'plain'], rnd: K.prng(seed), lamps: o.lamps ? 0 : -1};
  }
  const pick = (c, a) => a[Math.floor(c.rnd() * a.length)];

  // ---------- sky, haze and weather ----------
  function sky(c, w, h, sun = [w * .22, h * .3, 30]) {
    const t = c.t;
    let s = rect(0, 0, w, h, `url(#hy-sky-${c.tid})`);
    s += circ(sun[0], sun[1], sun[2] * 4.2, 'url(#hy-sun)', {opacity: t.night && c.tid !== 'dusk' ? .45 : 1});
    s += circ(sun[0], sun[1], sun[2], t.night && c.tid !== 'dusk' ? '#f4efe0' : t.sun);
    if (t.night && c.tid !== 'dusk') s += circ(sun[0] + sun[2] * .35, sun[1] - sun[2] * .2, sun[2] * .85, t.sky[0], {opacity: .9});
    if (t.night) for (let i = 0; i < 18; i++) s += circ(c.rnd() * w, c.rnd() * h * .42, .6 + c.rnd() * .9, '#fff6dc', {opacity: n(.35 + c.rnd() * .5)});
    const cl = mix(t.sky[1], '#ffffff', t.night ? .12 : .55), cs = mix(t.sky[2], t.sun, .35);
    for (let i = 0; i < 4; i++) {
      const x = w * (.12 + i * .24 + c.rnd() * .08), y = h * (.12 + c.rnd() * .22), r = w * (.05 + c.rnd() * .04);
      s += ell(x, y, r, r * .16, cl, {opacity: .55}) + ell(x + r * .25, y + r * .07, r * .7, r * .08, cs, {opacity: .5});
    }
    return s;
  }
  function weather(c, w, h, count = 22) {
    if (!c.season || c.season === 'summer') return '';
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = c.rnd() * w, y = c.rnd() * h, r = 1 + c.rnd() * 1.6;
      if (c.season === 'winter') s += circ(x, y, r, '#fbfdff', {opacity: n(.55 + c.rnd() * .4)});
      else if (c.season === 'spring') s += ell(x, y, r * 1.6, r * .9, pick(c, ['#f6d2da', '#fbe9ee', '#f1bccb']), {transform: `rotate(${Math.round(c.rnd() * 180)} ${n(x)} ${n(y)})`});
      else s += ell(x, y, r * 2, r, pick(c, ['#e9b44a', '#d98a35', '#f2cc6a']), {transform: `rotate(${Math.round(c.rnd() * 180)} ${n(x)} ${n(y)})`});
    }
    return s;
  }
  function skyline(c, w, base, hmin, hmax, depth, step = [40, 90]) {
    const t = c.t, col = mix(t.haze, t.sky[2], depth < 1 ? .35 : 0), shade = mix(col, t.shade, .18);
    let s = '', x = -10;
    while (x < w) {
      const bw = step[0] + c.rnd() * (step[1] - step[0]), bh = hmin + c.rnd() * (hmax - hmin), top = base - bh;
      s += rect(x, top, bw, bh + 2, depth < 1 ? col : mix(col, t.ink, .12));
      s += rect(x + bw * .72, top, bw * .28, bh + 2, shade, {opacity: .55});
      if (c.rnd() < .25) s += line(x + bw * .3, top, x + bw * .3, top - 10 - c.rnd() * 18, shade, 1.2);
      if (c.rnd() < .2) s += rect(x + bw * .2, top - 6, bw * .3, 6, col);
      if (t.on > .3) for (let i = 0; i < 4; i++) if (c.rnd() < t.on) s += rect(x + 4 + c.rnd() * (bw - 10), top + 6 + c.rnd() * (bh - 14), 2.4, 3, t.win, {opacity: .8});
      if (c.season === 'winter') s += rect(x, top - 1.5, bw, 2.2, '#f2f6f8', {opacity: .8});
      x += bw + c.rnd() * 6;
    }
    return s + rect(0, base - (hmax * .5), w, hmax * .5 + 2, 'url(#hy-haze)', {opacity: depth < 1 ? .9 : .5});
  }

  // ---------- architecture ----------
  function box(c, x, y, w, h, base, o = {}) {
    const m = K.mat(base, c.t), d = o.depth === undefined ? Math.min(14, w * .07) : o.depth;
    let s = '';
    if (o.shadow !== false) s += path(`M${n(x + w)} ${n(y + h)}L${n(x + w + h * .24 + d)} ${n(y + h)}L${n(x + w + d)} ${n(y + h - d * .55)}Z`, c.t.shade, {opacity: .28});
    if (d > 0) {
      s += path(`M${n(x + w)} ${n(y)}L${n(x + w + d)} ${n(y - d * .55)}V${n(y + h - d * .55)}L${n(x + w)} ${n(y + h)}Z`, m.shade);
      if (o.roof !== 'none') s += path(`M${n(x)} ${n(y)}L${n(x + d)} ${n(y - d * .55)}H${n(x + w + d)}L${n(x + w)} ${n(y)}Z`, m.lit);
    }
    s += rect(x, y, w, h, m.mid);
    if (o.pattern) s += rect(x, y, w, h, `url(#hy-${o.pattern})`);
    s += rect(x, y, w, h, 'url(#hy-facelight)');
    if (o.cornice !== false) s += rect(x - 2, y - 1, w + 4, 4, m.lit) + rect(x - 2, y + 3, w + 4, 1.6, m.shade, {opacity: .7});
    if (c.season === 'winter' && o.snow !== false) s += snow(x - 2, x + w + 2 + d, y - 1 - (d ? d * .55 : 0));
    return {s, m, d};
  }
  function gable(c, x, y, w, rh, base, o = {}) {
    const m = K.mat(base, c.t), ov = o.overhang || 8, inset = o.inset === undefined ? rh * .9 : o.inset;
    let s = path(`M${n(x - ov)} ${n(y)}L${n(x + inset)} ${n(y - rh)}H${n(x + w - inset)}L${n(x + w + ov)} ${n(y)}Z`, m.mid);
    s += path(`M${n(x - ov)} ${n(y)}L${n(x + inset)} ${n(y - rh)}H${n(x + w - inset)}L${n(x + w + ov)} ${n(y)}Z`, 'url(#hy-roof)');
    s += path(`M${n(x + w - inset)} ${n(y - rh)}L${n(x + w + ov)} ${n(y)}H${n(x + w - inset * .2)}Z`, m.shade, {opacity: .6});
    s += line(x + inset, y - rh, x + w - inset, y - rh, m.lit, 2.4) + rect(x - ov, y, w + ov * 2, 2.4, m.deep, {opacity: .55});
    if (c.season === 'winter') s += snow(x + inset - 2, x + w - inset + 2, y - rh - 1) + path(`M${n(x - ov + 6)} ${n(y - 3)}L${n(x + inset)} ${n(y - rh + 2)}H${n(x + w * .55)}Q${n(x + w * .4)} ${n(y - rh * .4)} ${n(x + w * .2)} ${n(y - 3)}Z`, '#f3f7fa', {opacity: .85});
    return s;
  }
  function snow(x1, x2, y) {
    let d = `M${n(x1)} ${n(y + 1)}`;
    for (let x = x1; x < x2; x += 9) d += `Q${n(x + 4.5)} ${n(y - 4.5)} ${n(Math.min(x + 9, x2))} ${n(y - .5)}`;
    return path(d + `V${n(y + 2)}H${n(x1)}Z`, '#f6f9fb') + line(x1, y + 2, x2, y + 2, '#b8c7d4', 1, {opacity: .7});
  }

  function interior(c, kinds, x, y, w, h, on) {
    const t = c.t, wall = on ? mix(t.win, '#c7843f', .28) : mix(t.shade, '#1a2232', .35);
    const ink = on ? mix(t.ink, wall, .25) : mix(t.ink, wall, .45);
    const warm = on ? '#fff1c4' : mix(wall, '#ffffff', .15);
    let s = rect(x, y, w, h, wall);
    if (on) s += rect(x, y + h * .62, w, h * .38, mix(wall, '#8a4a22', .22));
    const B = (fx, fy) => [x + w * fx, y + h * fy];
    for (const k of kinds) {
      if (k === 'lamp') { const [a, b] = B(.72, .62); s += circ(a, b - h * .1, w * .45, 'url(#hy-lamp)', {opacity: on ? 1 : 0}) + line(a, b, a - w * .08, b - h * .18, ink, 1.2) + path(`M${n(a - w * .16)} ${n(b - h * .14)}L${n(a - w * .02)} ${n(b - h * .26)}L${n(a + w * .04)} ${n(b - h * .17)}Z`, on ? '#f5c26b' : ink) + rect(a - w * .07, b, w * .14, h * .03, ink); }
      if (k === 'bed') { const [a, b] = B(.04, .74); s += rect(a, b, w * .6, h * .08, mix(ink, '#7e8fa6', .35)) + rect(a + w * .02, b - h * .04, w * .14, h * .05, warm, {opacity: .8}) + line(a + w * .05, b + h * .08, a + w * .15, b + h * .2, ink, 1) + line(a + w * .15, b + h * .08, a + w * .05, b + h * .2, ink, 1) + line(a + w * .45, b + h * .08, a + w * .55, b + h * .2, ink, 1); }
      if (k === 'box') { const [a, b] = B(.58, .68); s += rect(a, b, w * .3, h * .2, on ? '#c89a62' : mix('#a98458', wall, .4)) + line(a + w * .15, b, a + w * .15, b + h * .07, '#8a6a42', 1.2) + rect(a + w * .04, b - h * .05, w * .1, h * .05, '#e8e2d4', {opacity: .9}); }
      if (k === 'shelf') { const [a, b] = B(.06, .2); s += rect(a, b, w * .3, h * .58, ink); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) s += rect(a + w * (.025 + j * .065), b + h * (.04 + i * .19), w * .05, h * .14, pick(c, ['#c96a52', '#7a9b8a', '#e3b55f', '#6f7fa3', '#d9cbb0']), {opacity: on ? 1 : .55}); }
      if (k === 'painting') { const [a, b] = B(.44, .14); s += rect(a, b, w * .2, h * .17, '#7a5a3a') + rect(a + w * .025, b + h * .025, w * .15, h * .12, on ? '#9cc3b0' : '#5b6e74') + path(`M${n(a + w * .025)} ${n(b + h * .145)}L${n(a + w * .09)} ${n(b + h * .07)}L${n(a + w * .175)} ${n(b + h * .145)}Z`, on ? '#e8b65e' : '#465860'); }
      if (k === 'sofa') { const [a, b] = B(.1, .66); s += rect(a, b, w * .62, h * .16, on ? '#b0543f' : mix('#8a4a3a', wall, .3), {rx: 3}) + rect(a - w * .03, b + h * .04, w * .07, h * .14, on ? '#9a4635' : mix('#73402f', wall, .3), {rx: 2}) + rect(a + w * .58, b + h * .04, w * .07, h * .14, on ? '#9a4635' : mix('#73402f', wall, .3), {rx: 2}) + rect(a + w * .08, b - h * .05, w * .13, h * .08, '#f0d9a8', {rx: 2, opacity: .85}); }
      if (k === 'floorlamp') { const [a, b] = B(.84, .25); s += circ(a, b + h * .05, w * .4, 'url(#hy-lamp)', {opacity: on ? 1 : 0}) + line(a, b + h * .06, a, b + h * .6, ink, 1.2) + path(`M${n(a - w * .07)} ${n(b + h * .08)}L${n(a - w * .04)} ${n(b - h * .03)}H${n(a + w * .04)}L${n(a + w * .07)} ${n(b + h * .08)}Z`, on ? '#f9d48a' : ink); }
      if (k === 'cat') { const [a, b] = B(.18, .93); s += ell(a, b - h * .06, w * .07, h * .07, '#2b2a33') + circ(a + w * .05, b - h * .15, w * .045, '#2b2a33') + path(`M${n(a + w * .03)} ${n(b - h * .19)}l${n(w * .015)} ${n(-h * .05)}l${n(w * .02)} ${n(h * .04)}M${n(a + w * .06)} ${n(b - h * .19)}l${n(w * .02)} ${n(-h * .05)}l${n(w * .012)} ${n(h * .05)}`, '#2b2a33') + stroke(`M${n(a - w * .06)} ${n(b - h * .02)}q${n(-w * .08)} ${n(h * .02)} ${n(-w * .06)} ${n(-h * .12)}`, '#2b2a33', 1.4); }
      if (k === 'kitchen') { s += rect(x, y + h * .64, w, h * .1, on ? '#e7dccb' : mix('#cfc6b6', wall, .4)) + rect(x, y + h * .74, w, h * .26, on ? '#8b6b4f' : mix('#6b5440', wall, .3)) + rect(x + w * .05, y + h * .12, w * .9, h * .14, mix(ink, wall, .3)); for (let i = 0; i < 3; i++) { const a = x + w * (.25 + i * .25); s += line(a, y, a, y + h * .34, ink, .8) + path(`M${n(a - w * .05)} ${n(y + h * .42)}Q${n(a)} ${n(y + h * .3)} ${n(a + w * .05)} ${n(y + h * .42)}Z`, on ? '#ffd27a' : ink) + (on ? circ(a, y + h * .44, w * .1, 'url(#hy-lamp)') : ''); } }
      if (k === 'greenwall') { for (let i = 0; i < 14; i++) s += circ(x + w * (.86 + c.rnd() * .12), y + h * (.08 + c.rnd() * .8), w * .04, pick(c, ['#5d8a5a', '#77a36a', '#3f6a4c'])); }
      if (k === 'plant') { const [a, b] = B(.86, .8); s += rect(a - w * .05, b, w * .1, h * .12, '#b5654b') + ell(a - w * .05, b - h * .06, w * .07, h * .05, '#5f8f5c', {transform: `rotate(-30 ${n(a)} ${n(b)})`}) + ell(a + w * .05, b - h * .09, w * .07, h * .05, '#4f7f52', {transform: `rotate(30 ${n(a)} ${n(b)})`}); }
      if (k === 'table') { const [a, b] = B(.15, .7); s += rect(a, b, w * .7, h * .05, on ? '#7b5537' : ink) + line(a + w * .05, b, a + w * .05, b + h * .2, ink, 1.2) + line(a + w * .65, b, a + w * .65, b + h * .2, ink, 1.2); for (let i = 0; i < 2; i++) { const p = a + w * (.2 + i * .3); s += line(p, y, p, b - h * .3, ink, .8) + path(`M${n(p - w * .06)} ${n(b - h * .22)}Q${n(p)} ${n(b - h * .36)} ${n(p + w * .06)} ${n(b - h * .22)}Z`, on ? '#ffd685' : ink); } }
      if (k === 'books') { for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) s += rect(x + w * (.04 + j * .065), y + h * (.12 + i * .2), w * .05, h * .15, pick(c, ['#b65a45', '#728f80', '#d9a94f', '#5e6f96', '#cbb994', '#8a6040']), {opacity: on ? 1 : .55}); s += rect(x + w * .02, y + h * .7, w * .48, h * .3, mix(ink, wall, .2)); }
      if (k === 'desk') { const [a, b] = B(.56, .66); s += rect(a, b, w * .38, h * .05, on ? '#8a6040' : ink) + rect(a + w * .12, b - h * .14, w * .14, h * .11, on ? '#cfe3e8' : mix('#7d8f99', wall, .4)) + line(a + w * .03, b, a + w * .03, b + h * .3, ink, 1.1); }
      if (k === 'bike') { const [a, b] = B(.3, .82); s += circ(a, b, w * .1, 'none', {stroke: ink, 'stroke-width': 1.2}) + circ(a + w * .3, b, w * .1, 'none', {stroke: ink, 'stroke-width': 1.2}) + stroke(`M${n(a)} ${n(b)}L${n(a + w * .12)} ${n(b - h * .14)}H${n(a + w * .25)}L${n(a + w * .3)} ${n(b)}M${n(a + w * .12)} ${n(b - h * .14)}L${n(a + w * .15)} ${n(b)}H${n(a)}`, ink, 1.2); }
      if (k === 'curtain') { s += path(`M${n(x)} ${n(y)}H${n(x + w * .2)}Q${n(x + w * .12)} ${n(y + h * .5)} ${n(x + w * .18)} ${n(y + h)}H${n(x)}Z`, on ? '#d98f5c' : mix('#a35f45', wall, .45), {opacity: .9}) + path(`M${n(x + w)} ${n(y)}H${n(x + w * .8)}Q${n(x + w * .88)} ${n(y + h * .5)} ${n(x + w * .82)} ${n(y + h)}H${n(x + w)}Z`, on ? '#d98f5c' : mix('#a35f45', wall, .45), {opacity: .9}); }
    }
    return s;
  }
  // Window with frame, recess shadow, sill, optional interior, grille, blinds and evening glow.
  function win(c, x, y, w, h, o = {}) {
    const t = c.t, on = o.lit !== undefined ? o.lit : c.rnd() < t.on;
    const frame = o.frame || mix('#ece3d3', t.ambient, .3);
    let s = rect(x - 1.6, y - 1.6, w + 3.2, h + 3.2, frame);
    const glass = () => {
      let q = o.inside ? interior(c, o.inside, x, y, w, h, false) + rect(x, y, w, h, `url(#hy-glass-${c.tid})`, {opacity: .55}) : rect(x, y, w, h, `url(#hy-glass-${c.tid})`);
      return w >= 20 ? q + rect(x, y, w, h, 'url(#hy-shine)') : q;
    };
    const light = () => (o.inside ? interior(c, o.inside, x, y, w, h, true) : rect(x, y, w, h, t.win) + rect(x, y + h * .55, w, h * .45, '#d38a3c', {opacity: .28}) + (o.silhouette !== false && w > 10 ? path(`M${n(x + w * .2)} ${n(y + h)}V${n(y + h * .6)}Q${n(x + w * .32)} ${n(y + h * .48)} ${n(x + w * .44)} ${n(y + h * .6)}V${n(y + h)}Z`, mix(t.win, '#7a4a2a', .45), {opacity: .5}) : ''));
    if (on && c.lamps >= 0 && c.lamps < 12 && o.lamp !== false) {
      s += glass() + `<g class="hy-lamp" style="--d:${n(.8 + c.lamps * .55 + c.rnd() * .4)}s">${light()}${t.glow ? circ(x + w / 2, y + h / 2, Math.max(w, h) * .9, 'url(#hy-glow)', {opacity: n(t.glow * .7)}) : ''}</g>`;
      c.lamps++;
    } else s += on ? light() : glass();
    if (o.blind && c.season === 'summer') s += rect(x, y, w, h * .55, 'url(#hy-reed)') + rect(x, y, w, h * .55, '#c9a46a', {opacity: .55}) + line(x, y + h * .55, x + w, y + h * .55, '#8a6a3a', 1);
    let bars = '';
    if (o.mull !== false && w > 13) bars += `M${n(x + w / 2)} ${n(y)}V${n(y + h)}`;
    if (o.transom !== false && h > 20) bars += `M${n(x)} ${n(y + h * .32)}H${n(x + w)}`;
    if (bars) s += stroke(bars, frame, 1.2);
    // Recess shadow (top + left edge) and sill: one path each, cheaper for dense facades.
    if (w >= 20) s += path(`M${n(x)} ${n(y)}h${n(w)}v2h${n(-w + 1.6)}v${n(h - 2)}h-1.6z`, t.shade, {opacity: .4});
    s += rect(x - 3, y + h + 1.6, w + 6, 2.6, mix(frame, t.lit, .35));
    if (o.grille) s += rect(x - 3, y - 3, w + 6, h + 6, 'url(#hy-grille)') + rect(x - 3, y - 3, w + 6, h + 6, 'none', {stroke: '#3c4547', 'stroke-width': 1.1, 'stroke-opacity': .7}) + rect(x - 5, y + h + 3, w + 10, 2.4, '#4a5254', {opacity: .8});
    if (o.pot) s += rect(x + w * .1, y + h - 1, 6, 5, '#b5654b') + circ(x + w * .1 + 3, y + h - 3, 4, c.season === 'winter' ? '#6b7d63' : '#5d8a5a');
    if (on && t.glow > .4 && !(c.lamps >= 0)) s += circ(x + w / 2, y + h / 2, Math.max(w, h) * .9, 'url(#hy-glow)', {opacity: n(t.glow * .55)});
    return s;
  }
  function grid(c, x, y, cols, rows, w, h, gx, gy, o = {}) {
    let s = '';
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const oo = typeof o === 'function' ? o(k, r) : o;
      if (oo === null) continue;
      s += win(c, x + k * gx, y + r * gy, w, h, oo);
    }
    return s;
  }
  function acUnit(c, x, y, s = 1) {
    const m = K.mat('#d9d6cc', c.t);
    return line(x + 6 * s, y + 13 * s, x + 6 * s, y + 30 * s, '#6c7470', 1, {opacity: .7}) + rect(x - 1 * s, y + 13 * s, 20 * s, 1.6 * s, '#5b6463') + rect(x, y, 18 * s, 13 * s, m.mid) + rect(x + 14 * s, y, 4 * s, 13 * s, m.shade) + rect(x, y, 18 * s, 2 * s, m.lit) + circ(x + 7 * s, y + 7 * s, 4.2 * s, m.shade) + circ(x + 7 * s, y + 7 * s, 1.3 * s, m.deep);
  }
  function clothes(c, x1, x2, y) {
    const cols = ['#d97a5f', '#7ea3b8', '#f0e3c8', '#6f8f6d', '#e6b85c', '#b48aa8'];
    let s = line(x1, y, x2, y, '#5c6264', .9);
    for (let x = x1 + 6; x < x2 - 12; x += 14 + c.rnd() * 6) {
      const col = pick(c, cols), k = c.rnd();
      if (k < .4) s += path(`M${n(x)} ${n(y)}h12l3 4-3 1v11h-12v-11l-3-1z`, col) + rect(x + 6, y, 1, 16, '#000', {opacity: .08});
      else if (k < .7) s += rect(x, y, 9, 15, col) + rect(x, y + 12, 9, 1.4, '#fff', {opacity: .4});
      else s += path(`M${n(x)} ${n(y)}h11v6l-2 12h-3l-1-8-1 8h-3l-1-12z`, col);
    }
    return s;
  }
  function tree(c, x, y, s = 1, o = {}) {
    const L = c.L, t = c.t, bark = mix('#7d6c5a', t.ambient, .3), lit = mix('#d9ccb3', t.lit, .3), S = v => n(v * s);
    let b = ell(x + 18 * s, y + 1, 36 * s, 5 * s, t.shade, {opacity: .28});
    b += path(`M${n(x - 5 * s)} ${n(y)}C${n(x - 4 * s)} ${n(y - 30 * s)} ${n(x - 3 * s)} ${n(y - 52 * s)} ${n(x - 1 * s)} ${n(y - 72 * s)}H${n(x + 3 * s)}C${n(x + 4 * s)} ${n(y - 50 * s)} ${n(x + 5 * s)} ${n(y - 28 * s)} ${n(x + 7 * s)} ${n(y)}Z`, bark);
    b += ell(x - 1.6 * s, y - 20 * s, 2.2 * s, 5 * s, lit, {opacity: .75}) + ell(x + 2.4 * s, y - 38 * s, 1.8 * s, 4 * s, lit, {opacity: .6}) + ell(x - .5 * s, y - 55 * s, 1.5 * s, 3 * s, lit, {opacity: .5});
    b += stroke(`M${n(x)} ${n(y - 46 * s)}q${S(-14)} ${S(-10)} ${S(-26)} ${S(-30)}M${n(x + 1 * s)} ${n(y - 56 * s)}q${S(16)} ${S(-8)} ${S(26)} ${S(-30)}M${n(x + 1 * s)} ${n(y - 68 * s)}l${S(1)} ${S(-30)}`, bark, 3.2 * s);
    if (c.season === 'winter') {
      b += stroke(`M${n(x - 26 * s)} ${n(y - 76 * s)}l${S(-8)} ${S(-10)}m${S(8)} ${S(10)}l${S(2)} ${S(-14)}M${n(x + 27 * s)} ${n(y - 86 * s)}l${S(9)} ${S(-8)}m${S(-9)} ${S(8)}l${S(-2)} ${S(-13)}M${n(x + 2 * s)} ${n(y - 98 * s)}l${S(-7)} ${S(-10)}m${S(7)} ${S(10)}l${S(6)} ${S(-9)}`, bark, 1.6 * s);
      b += stroke(`M${n(x - 18 * s)} ${n(y - 63 * s)}q${S(-6)} ${S(-8)} ${S(-8)} ${S(-12)}M${n(x + 17 * s)} ${n(y - 70 * s)}q${S(6)} ${S(-6)} ${S(8)} ${S(-12)}`, '#f6f9fb', 1.8 * s);
      return b + ell(x + 4 * s, y + 1, 30 * s, 3.5 * s, '#f6f9fb', {opacity: .9});
    }
    const k = c.season === 'summer' ? 1.12 : 1, cl = o.small ? [[-14, -78, 17], [12, -84, 18], [0, -96, 16]] : [[-26, -82, 20], [0, -100, 24], [25, -88, 21], [-10, -70, 17], [14, -70, 17], [-2, -84, 20]];
    for (const [dx, dy, r] of cl) b += circ(x + (dx + 4) * s, y + (dy + 5) * s, r * k * s, L[2]);
    for (const [dx, dy, r] of cl) b += circ(x + dx * s, y + dy * s, r * .9 * k * s, L[1]);
    for (const [dx, dy, r] of cl) b += circ(x + (dx - 5) * s, y + (dy - 6) * s, r * .55 * k * s, L[0], {opacity: .9});
    b += circ(x - 2 * s, y - 86 * s, 34 * k * s, 'url(#hy-dapple)');
    if (c.season === 'spring') for (let i = 0; i < 16; i++) b += circ(x + (c.rnd() * 70 - 35) * s, y + (-112 + c.rnd() * 52) * s, (1.4 + c.rnd()) * s, pick(c, ['#f7d6df', '#fff2f5', '#f1b9c9']));
    if (c.season === 'autumn') for (let i = 0; i < 10; i++) b += ell(x + (c.rnd() * 80 - 30) * s, y - c.rnd() * 3, 2.2 * s, 1.1 * s, pick(c, [L[0], L[1], '#c4772f']));
    return b;
  }
  function shrub(c, x, y, s = 1) {
    const L = c.season === 'winter' ? ['#8e9a82', '#6e7c66', '#4f5c4b'] : c.L;
    return ell(x + 4 * s, y, 18 * s, 4 * s, c.t.shade, {opacity: .25}) + circ(x + 3 * s, y - 7 * s, 11 * s, L[2]) + circ(x - 6 * s, y - 8 * s, 9 * s, L[1]) + circ(x + 6 * s, y - 10 * s, 9 * s, L[1]) + circ(x - 3 * s, y - 13 * s, 6 * s, L[0], {opacity: .9}) + (c.season === 'winter' ? ell(x, y - 17 * s, 10 * s, 3 * s, '#f6f9fb') : '');
  }
  function person(c, x, y, s = 1, o = {}) {
    const t = c.t, coat = mix(o.color || '#6d6a78', t.ink, t.night ? .55 : .3), dark = mix(t.ink, coat, .2), S = v => n(v * s);
    const scarf = c.season === 'winter' ? rect(x - 4.5 * s, y - 30 * s, 9 * s, 2.6 * s, '#c0503f') : '';
    let b = ell(x + 6 * s, y + 1, 9 * s, 1.8 * s, t.shade, {opacity: .3});
    b += stroke(`M${n(x - 2 * s)} ${n(y - 14 * s)}l${S(o.walk ? -4 : -1)} ${S(14)}M${n(x + 2 * s)} ${n(y - 14 * s)}l${S(o.walk ? 4 : 1)} ${S(14)}`, dark, 2.6 * s);
    b += path(`M${n(x - 5.5 * s)} ${n(y - 29 * s)}Q${n(x)} ${n(y - 32 * s)} ${n(x + 5.5 * s)} ${n(y - 29 * s)}L${n(x + 6.5 * s)} ${n(y - 12 * s)}H${n(x - 6.5 * s)}Z`, coat);
    b += path(`M${n(x - 5.5 * s)} ${n(y - 29 * s)}L${n(x - 6.5 * s)} ${n(y - 12 * s)}H${n(x - 4 * s)}L${n(x - 3 * s)} ${n(y - 29.6 * s)}Z`, t.lit, {opacity: .35});
    b += circ(x, y - 35 * s, 4.4 * s, mix('#3b3036', t.ink, .3)) + scarf;
    if (o.bag) b += rect(x + 6 * s, y - 20 * s, 5 * s, 6 * s, o.bag);
    if (o.umbrella && c.season === 'spring') b += path(`M${n(x - 12 * s)} ${n(y - 40 * s)}Q${n(x)} ${n(y - 56 * s)} ${n(x + 12 * s)} ${n(y - 40 * s)}Z`, '#5b7fa0') + line(x, y - 40 * s, x, y - 26 * s, dark, 1);
    return b;
  }
  function ebike(c, x, y, s = 1, col = '#4d7f86') {
    const t = c.t, ink = mix('#262b33', t.ink, .3), body = mix(col, t.ambient, .2);
    return ell(x + 16 * s, y + 1, 24 * s, 2.4 * s, t.shade, {opacity: .3}) + circ(x, y - 7 * s, 7 * s, 'none', {stroke: ink, 'stroke-width': n(2.4 * s)}) + circ(x + 30 * s, y - 7 * s, 7 * s, 'none', {stroke: ink, 'stroke-width': n(2.4 * s)}) + path(`M${n(x)} ${n(y - 7 * s)}L${n(x + 9 * s)} ${n(y - 16 * s)}H${n(x + 20 * s)}L${n(x + 24 * s)} ${n(y - 26 * s)}H${n(x + 29 * s)}L${n(x + 30 * s)} ${n(y - 7 * s)}H${n(x + 22 * s)}L${n(x + 17 * s)} ${n(y - 11 * s)}H${n(x + 8 * s)}Z`, body) + rect(x + 6 * s, y - 20 * s, 11 * s, 3.4 * s, ink, {rx: 1.5}) + rect(x + 25 * s, y - 32 * s, 8 * s, 6 * s, 'none', {stroke: ink, 'stroke-width': n(1.2 * s)}) + path(`M${n(x + 6 * s)} ${n(y - 20 * s)}a${S(5, s)} ${S(5, s)} 0 0 1 ${S(10, s)} 0z`, '#e2a24a');
    function S(v) { return n(v * s); }
  }
  function lampPost(c, x, y, h) {
    const t = c.t, ink = mix('#30363a', t.ink, .3);
    let s = rect(x - 1.6, y - h, 3.2, h, ink) + path(`M${n(x)} ${n(y - h)}q10 -6 16 2`, 'none', {stroke: ink, 'stroke-width': 2.2}) + path(`M${n(x + 11)} ${n(y - h + 2)}h10l-2 4h-6z`, ink);
    if (t.night || c.tid === 'golden') s += circ(x + 16, y - h + 8, 26, 'url(#hy-lamp)', {opacity: t.night ? .95 : .4}) + rect(x + 13, y - h + 6, 6, 2, '#fff1c4');
    return s;
  }
  function ground(c, w, y, h, o = {}) {
    const t = c.t, pave = mix(o.pave || '#c9bfae', t.ambient, .3), road = mix('#5b5f66', t.ink, .25);
    let s = rect(0, y, w, h, pave) + rect(0, y, w, h, 'url(#hy-tile)');
    if (o.road) s += rect(0, o.road, w, y + h - o.road, road) + rect(0, o.road, w, 3, mix(pave, '#ffffff', .2)) + rect(0, o.road + 3, w, 2, t.shade, {opacity: .5}) + stroke(`M0 ${n(o.road + (y + h - o.road) * .55)}H${w}`, '#e8e0cc', 2, {'stroke-dasharray': '28 22', opacity: .6});
    s += rect(0, y, w, h, 'url(#hy-ground)');
    if (c.season === 'winter') s += rect(0, y, w, 4, '#f3f7fa', {opacity: .85});
    if (c.season === 'autumn') for (let i = 0; i < 14; i++) s += ell(c.rnd() * w, y + 3 + c.rnd() * (h - 6), 2.4, 1.2, pick(c, ['#e9b44a', '#d98a35', '#c4772f']), {opacity: .9});
    return s;
  }
  function stall(c, x, y) {
    const t = c.t, wood = mix('#a8734a', t.ambient, .25), bam = mix('#d9b27a', t.lit, .2);
    let s = ell(x + 40, y + 1, 50, 4, t.shade, {opacity: .3}) + rect(x, y - 34, 74, 34, wood) + rect(x, y - 34, 74, 34, 'url(#hy-wood)') + rect(x, y - 38, 78, 5, mix(wood, '#ffffff', .2));
    for (let i = 0; i < 3; i++) s += rect(x + 10, y - 50 - i * 10, 30, 10, bam) + line(x + 10, y - 50 - i * 10, x + 40, y - 50 - i * 10, mix(bam, '#6b4a2a', .5), 1);
    s += rect(x + 7, y - 81, 36, 3, mix(bam, '#6b4a2a', .3));
    s += stroke(`M${x + 18} ${y - 86}q-6 -10 2 -18t-2 -16M${x + 30} ${y - 86}q6 -10 -2 -18t2 -18`, '#ffffff', 3.4, {opacity: .45});
    s += circ(x + 58, y - 46, 8, '#d9d2c2') + rect(x + 50, y - 46, 16, 8, mix('#c9c0ae', t.shade, .2));
    s += path(`M${x - 6} ${y - 98}h90l-6 14h-78z`, mix('#c8553d', t.ambient, .15)) + path(`M${x - 6} ${y - 98}h90l-6 14h-78z`, 'url(#hy-shutter)') + line(x - 2, y - 84, x - 2, y - 38, '#3c3f43', 1.6) + line(x + 76, y - 84, x + 76, y - 38, '#3c3f43', 1.6);
    return s;
  }
  function shopfront(c, x, y, w, h, o = {}) {
    const t = c.t, glassLit = t.night || c.tid === 'golden';
    let s = rect(x, y, w, h, mix('#2f3b45', t.ink, .2));
    s += rect(x + 4, y + 18, w - 8, h - 18, glassLit ? mix('#fff1c8', t.win, .4) : `url(#hy-glass-${c.tid})`);
    if (o.shelves) for (let r = 0; r < 3; r++) { s += rect(x + 8, y + 30 + r * (h - 34) / 3, w * .6, 2, mix('#6f6a60', t.ink, .2)); for (let i = 0; i < 6; i++) s += rect(x + 10 + i * w * .09, y + 22 + r * (h - 34) / 3, w * .06, 8, pick(c, ['#d9774f', '#6f9fb0', '#e3be5c', '#7da36d', '#c6a0c8']), {opacity: .85}); }
    s += rect(x + w * .66, y + 20, w * .3, h - 20, mix('#9fb7bd', t.sky[2], .3), {opacity: glassLit ? .5 : .7}) + line(x + w * .81, y + 20, x + w * .81, y + h, mix('#30383d', t.ink, .2), 1.2);
    s += rect(x, y, w, 16, o.sign || '#2f8a74') + rect(x + 6, y + 5, w * .22, 6, '#ffffff', {opacity: .85}) + rect(x + w * .32, y + 6, w * .12, 4, '#ffd36b', {opacity: .9});
    if (glassLit) s += rect(x, y + h, w, 18, '#ffd994', {opacity: .18});
    return s + rect(x + 4, y + 18, w - 8, h - 18, 'url(#hy-shine)');
  }
  function shutterShop(c, x, y, w, h, half) {
    const m = K.mat('#a9aba4', c.t);
    return rect(x, y, w, h, mix('#33393e', c.t.ink, .2)) + rect(x + 3, y + 3, w - 6, half ? h * .45 : h - 3, m.mid) + rect(x + 3, y + 3, w - 6, half ? h * .45 : h - 3, 'url(#hy-shutter)') + (half ? rect(x + 3, y + h * .48, w - 6, h * .52 - 3, c.t.on > .3 ? '#f2c77a' : mix('#6e6458', c.t.ink, .2)) : '');
  }
  function lockers(c, x, y) {
    const m = K.mat('#6f9a8e', c.t);
    let s = rect(x, y - 52, 60, 52, m.mid) + rect(x + 52, y - 52, 8, 52, m.shade) + rect(x, y - 56, 62, 5, m.lit);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) s += rect(x + 3 + j * 16.5, y - 49 + i * 12, 14, 10, m.lit, {opacity: .55});
    return s + rect(x + 20, y - 32, 12, 8, '#d7e6ea');
  }
  function notice(c, x, y) {
    let s = rect(x, y - 40, 44, 32, mix('#7b5b3f', c.t.ambient, .2)) + line(x + 6, y - 8, x + 6, y, '#3c3f43', 2) + line(x + 38, y - 8, x + 38, y, '#3c3f43', 2);
    for (let i = 0; i < 4; i++) s += rect(x + 4 + (i % 2) * 19, y - 37 + Math.floor(i / 2) * 14, 16, 12, ['#f4ecd8', '#e7d4a8', '#f8f1e2', '#e3c1b0'][i], {transform: `rotate(${i % 2 ? 3 : -2} ${x + 12 + (i % 2) * 19} ${y - 31 + Math.floor(i / 2) * 14})`});
    return s;
  }
  function cat(c, x, y, s = 1, col = '#2f2d35') {
    return ell(x, y - 5 * s, 7 * s, 5 * s, col) + circ(x + 6 * s, y - 11 * s, 3.6 * s, col) + path(`M${n(x + 3.6 * s)} ${n(y - 13 * s)}l1 ${n(-4 * s)}l2 ${n(3 * s)}zM${n(x + 6.6 * s)} ${n(y - 14 * s)}l2 ${n(-4 * s)}l1 ${n(4 * s)}z`, col) + stroke(`M${n(x - 6 * s)} ${n(y - 3 * s)}q${n(-6 * s)} ${n(-1 * s)} ${n(-5 * s)} ${n(-9 * s)}`, col, 1.4 * s);
  }
  function wires(c, x1, x2, y, sag = 12) {
    return stroke(`M${n(x1)} ${n(y)}Q${n((x1 + x2) / 2)} ${n(y + sag)} ${n(x2)} ${n(y)}`, mix('#2e3338', c.t.ink, .3), 1, {opacity: .7}) + stroke(`M${n(x1)} ${n(y + 5)}Q${n((x1 + x2) / 2)} ${n(y + 5 + sag * .8)} ${n(x2)} ${n(y + 5)}`, mix('#2e3338', c.t.ink, .3), .8, {opacity: .55});
  }
  function frameVignette(w, h, k = 1) { return rect(0, 0, w, h, 'url(#hy-vignette)', {opacity: k}); }

  // ---------- compositions ----------
  function rent(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [92, 70, 16]);
    s += skyline(c, W, 210, 40, 120, .6, [26, 60]);
    // Neighbor roof and water tank on the right.
    const nb = box(c, 330, 150, 170, 160, '#b9a48e', {pattern: 'tile', depth: 0});
    s += nb.s + rect(360, 108, 40, 30, mix('#8c9aa0', t.ambient, .2)) + rect(394, 108, 6, 30, mix('#5f6c74', t.shade, .3)) + ell(380, 108, 20, 4, mix('#aab7bd', t.lit, .3)) + line(368, 138, 368, 150, '#4b4f52', 2) + line(392, 138, 392, 150, '#4b4f52', 2);
    s += grid(c, 346, 176, 3, 2, 26, 32, 46, 70, (k, r) => ({grille: true, pot: k === 1 && r === 0}));
    // Main tenement: top floor partition room, brick facade.
    const b = box(c, 34, 92, 286, 230, '#b98a6a', {pattern: 'brick', depth: 16});
    s += b.s + rect(34, 92, 286, 10, b.m.lit) + line(30, 88, 322, 88, b.m.deep, 2.2);
    s += line(60, 92, 60, 60, '#3d4246', 1.6) + path('M50 60l10 -16l10 16', 'none', {stroke: '#3d4246', 'stroke-width': 1.4});
    s += rect(240, 60, 52, 32, mix('#9aa2a0', t.ambient, .2)) + rect(240, 60, 52, 32, 'url(#hy-corr)') + rect(236, 56, 60, 6, mix('#7d8686', t.shade, .3));
    s += win(c, 62, 128, 112, 84, {lit: t.on > 0, inside: ['bed', 'box', 'lamp', 'curtain'], grille: true, lamp: false});
    s += acUnit(c, 186, 150, 1.5);
    s += win(c, 230, 132, 52, 66, {grille: true, blind: true});
    s += clothes(c, 60, 300, 236);
    s += line(60, 236, 60, 228, '#4b4f52', 1.5) + line(300, 236, 300, 228, '#4b4f52', 1.5);
    s += win(c, 74, 266, 64, 46, {grille: true}) + win(c, 214, 266, 64, 46, {grille: true});
    s += stroke('M326 96V300', '#5b6062', 2.4) + stroke('M323 120h6M323 180h6M323 240h6', '#5b6062', 1.6);
    if (c.season === 'winter') s += weather(c, W, Hh, 26); else s += weather(c, W, Hh, 12);
    s += cat(c, 304, 90, 1.2) + frameVignette(W, Hh, t.night ? 1 : .5);
    return K.svg(s, '0 0 480 300', 'art-scene art-house art-rent');
  }
  function house0(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [380, 52, 18]) + skyline(c, W, 150, 30, 80, .6, [30, 60]);
    s += wires(c, -10, 490, 64, 18);
    const left = box(c, -20, 92, 120, 172, '#a9b4a8', {pattern: 'tile', depth: 0});
    s += left.s + shutterShop(c, 0, 196, 86, 68, true) + win(c, 18, 116, 30, 40, {grille: true}) + win(c, 60, 116, 30, 40, {grille: true, pot: true});
    const main = box(c, 100, 76, 230, 188, '#c4a07e', {pattern: 'brick', depth: 0});
    s += main.s + gable(c, 100, 78, 230, 28, '#5b6a73', {inset: 20});
    s += win(c, 122, 104, 92, 64, {lit: t.on > 0, inside: ['shelf', 'painting', 'plant', 'lamp'], lamp: false});
    s += win(c, 238, 104, 66, 64, {blind: true, curtain: true, inside: ['curtain']});
    s += rect(110, 176, 210, 8, main.m.lit) + rect(110, 184, 210, 2, main.m.shade);
    // Freshly painted front door, door plate, flower pot.
    s += rect(166, 192, 58, 74, mix('#3b4a50', t.ink, .3)) + rect(170, 196, 50, 70, mix('#2f7a68', t.ambient, .15)) + rect(170, 196, 50, 70, 'url(#hy-facelight)') + rect(176, 204, 38, 26, mix('#38897a', t.lit, .2)) + rect(176, 236, 38, 24, mix('#2a6e5e', t.shade, .2)) + circ(212, 232, 2.4, '#e2b45a');
    s += rect(232, 204, 26, 14, '#e9e2cf') + rect(234, 206, 22, 10, '#2f5a68') + rect(238, 209, 14, 4, '#e9e2cf', {opacity: .8});
    s += lampPost(c, 268, 262, 52);
    s += rect(130, 248, 22, 18, '#b5654b') + rect(130, 248, 22, 4, '#d17d5f') + shrub(c, 141, 248, .9);
    if (c.season !== 'winter') s += circ(136, 236, 3, c.season === 'autumn' ? '#e7a43b' : '#e86f6f') + circ(146, 233, 3, c.season === 'autumn' ? '#d98a35' : '#f2a7b5');
    const right = box(c, 330, 108, 170, 156, '#d9cbb3', {pattern: 'tile', depth: 0});
    s += right.s + shopfront(c, 342, 198, 120, 66, {shelves: true, sign: '#b9573f'}) + win(c, 350, 130, 38, 44, {grille: true}) + win(c, 410, 130, 38, 44, {grille: true});
    s += ground(c, W, 264, 36, {road: 284});
    s += tree(c, 44, 266, .95) + ebike(c, 300, 280, .8, '#4d7f86') + person(c, 410, 282, .95, {color: '#8a6a5a', bag: '#d9a54a', walk: true});
    s += weather(c, W, Hh, 14) + frameVignette(W, Hh, t.night ? 1 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  function house1(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [70, 60, 20]) + skyline(c, W, 190, 40, 110, .6, [40, 80]);
    s += box(c, 380, 70, 110, 196, '#b7bfc0', {pattern: 'tile', depth: 0}).s + grid(c, 392, 90, 3, 5, 18, 22, 32, 36);
    // Slab apartment: elevator core + enclosed balconies.
    const b = box(c, 70, 40, 300, 228, '#e3d7c2', {pattern: 'tile', depth: 14});
    s += b.s;
    const core = K.mat('#c46f55', t);
    s += rect(190, 26, 46, 242, core.mid) + rect(190, 26, 46, 242, 'url(#hy-facelight)') + rect(226, 26, 10, 242, core.shade) + rect(188, 22, 50, 6, core.lit);
    for (let r = 0; r < 6; r++) s += win(c, 204, 44 + r * 36, 16, 20, {mull: false, transom: false, frame: core.lit});
    for (let r = 0; r < 6; r++) for (const bx of [82, 248]) {
      const yy = 44 + r * 36, hero = bx === 248 && r === 3;
      s += rect(bx - 4, yy + 22, 110, 8, mix('#efe7d8', t.lit, .3)) + rect(bx - 4, yy + 30, 110, 2, t.shade, {opacity: .5});
      s += win(c, bx, yy, 100, 22, hero ? {lit: t.on > 0, inside: ['table', 'bike', 'plant'], lamp: false, transom: false} : {transom: false, blind: r % 2 === 0});
      if (!hero && c.rnd() < .5) s += clothes(c, bx + 6, bx + 94, yy + 3);
      if (hero) s += rect(bx - 6, yy - 4, 114, 38, 'none', {stroke: '#e6b35a', 'stroke-width': 1.6, opacity: .9});
    }
    s += rect(176, 238, 74, 30, mix('#4a5458', t.ink, .2)) + rect(182, 242, 62, 26, mix('#a7c4c6', t.sky[2], .3)) + rect(170, 232, 86, 6, b.m.lit);
    s += ground(c, W, 268, 32);
    s += path('M0 268h480v6h-480z', mix('#8aa07a', t.ambient, .3));
    s += rect(286, 248, 84, 20, mix('#6d7c80', t.ink, .2)) + path('M282 248h92l-6 -8h-80z', mix('#5a8f84', t.ambient, .2)) + ebike(c, 300, 268, .55, '#d07a54') + ebike(c, 330, 268, .55, '#5a7fa0');
    s += tree(c, 36, 270, .9) + tree(c, 448, 272, .75, {small: true}) + shrub(c, 150, 270, .8) + person(c, 130, 288, .85, {color: '#4f7b8a', walk: true});
    s += weather(c, W, Hh, 14) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  function house2(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [400, 66, 20]) + skyline(c, W, 170, 30, 90, .6, [30, 70]);
    // Distant bridge across the river.
    const bridge = mix(t.haze, t.shade, .25);
    s += rect(0, 168, W, 5, bridge) + stroke('M-10 168Q60 124 130 168Q200 124 270 168', bridge, 3);
    for (let x = 10; x < 270; x += 20) s += line(x, 168, x, 152 + Math.abs(x - 130) * .12 % 18, bridge, 1);
    const b = box(c, 120, 64, 250, 150, '#e7dccb', {pattern: 'tile', depth: 14});
    s += b.s + rect(112, 56, 266, 10, mix('#6a7a80', t.ambient, .2)) + rect(112, 64, 266, 2, t.shade, {opacity: .5});
    for (let r = 0; r < 3; r++) {
      const y = 76 + r * 46, hero = r === 1;
      s += win(c, 134, y, 104, 34, hero ? {lit: t.on > 0, inside: ['sofa', 'floorlamp', 'cat', 'painting'], lamp: false, transom: false} : {transom: false, curtain: r === 0});
      s += win(c, 252, y, 104, 34, {transom: false, inside: r === 2 ? ['plant'] : null});
      s += rect(128, y + 36, 234, 3, mix('#d7cfbf', t.lit, .3)) + rect(128, y + 39, 234, 6, 'none', {stroke: mix('#4b5357', t.ink, .2), 'stroke-width': 1});
    }
    s += path('M0 214H480V300H0Z', 'url(#hy-water)') + path('M0 214H480V300H0Z', mix(t.sky[2], t.sky[1], .3), {opacity: .35}) + path('M0 214H480V300H0Z', 'url(#hy-ripple)');
    s += grp(rect(120, 214, 250, 70, mix('#e7dccb', t.ambient, .3)) + rect(134, 220, 104, 20, t.on > 0 ? t.win : mix(t.sky[2], t.shade, .3)), {opacity: .22});
    if (t.on > 0) s += rect(150, 230, 70, 2, t.win, {opacity: .6}) + rect(160, 242, 50, 2, t.win, {opacity: .45});
    s += rect(0, 204, W, 10, mix('#b4ab98', t.ambient, .3)) + rect(0, 212, W, 3, t.shade, {opacity: .5});
    for (let x = 6; x < W; x += 22) s += rect(x, 196, 2, 9, mix('#4b5357', t.ink, .2));
    s += line(0, 197, W, 197, mix('#4b5357', t.ink, .2), 1.4);
    s += tree(c, 66, 204, .78) + tree(c, 430, 204, .7, {small: true}) + person(c, 392, 204, .75, {color: '#9a6a5a'}) + person(c, 404, 204, .6, {color: '#5b7fa0'});
    s += path('M300 262q22 -10 46 0l-6 8h-36z', mix('#7a5a3a', t.ink, .2)) + line(323, 254, 323, 230, mix('#7a5a3a', t.ink, .2), 1.4) + path('M324 232l14 14h-14z', '#f2e6cc', {opacity: .85});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  function house3(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [64, 50, 16]) + skyline(c, W, 210, 60, 160, .6, [24, 50]);
    s += box(c, 18, 90, 90, 180, '#a9b4bb', {depth: 0}).s + grid(c, 26, 100, 4, 8, 14, 12, 20, 20, {mull: false, transom: false});
    // Tower with glass curtain wall reflecting the sky.
    const tx = 150, tw = 190, ty = 20, th = 250, m = K.mat('#7d8f99', t);
    s += path(`M${tx + tw} ${ty}l18 -10v${th}l-18 10z`, m.shade) + rect(tx, ty, tw, th, `url(#hy-glass-${c.tid})`) + rect(tx, ty, tw, th, 'url(#hy-shine)');
    for (let x = tx; x <= tx + tw; x += 19) s += line(x, ty, x, ty + th, mix('#2e3a44', t.ink, .2), 1.2, {opacity: .7});
    for (let y = ty; y <= ty + th; y += 22) s += line(tx, y, tx + tw, y, mix('#d9e2e6', t.lit, .3), 1.8, {opacity: .75});
    for (let i = 0; i < 26; i++) { const x = tx + 19 * Math.floor(c.rnd() * 10), y = ty + 22 * Math.floor(c.rnd() * 11); if (c.rnd() < t.on * 1.3) s += rect(x + 1, y + 1, 17, 20, t.win, {opacity: .75}); }
    s += win(c, tx + 38, ty + 132, 95, 42, {lit: t.on > 0, inside: ['kitchen', 'greenwall'], lamp: false, mull: false, transom: false, frame: mix('#2e3a44', t.ink, .2)});
    if (t.night || c.tid === 'golden') s += rect(tx, ty + 6, tw, 3, '#ffe2a0', {opacity: .9}) + rect(tx, ty + 6, tw, 10, 'url(#hy-glow)', {opacity: .4});
    s += rect(tx - 6, ty - 8, tw + 24, 10, mix('#33414b', t.ink, .2)) + rect(tx + 30, ty - 22, 40, 14, mix('#4a5560', t.ink, .2));
    s += box(c, 352, 110, 110, 160, '#d5c4ac', {pattern: 'tile', depth: 0}).s + grid(c, 362, 124, 3, 5, 22, 18, 34, 28, {transom: false});
    s += ground(c, W, 270, 30, {pave: '#c6c0b4'});
    s += rect(tx - 10, 240, tw + 20, 30, mix('#2f3b45', t.ink, .2)) + rect(tx - 4, 244, tw + 8, 26, t.on > .3 ? mix('#ffe2a0', t.win, .4) : `url(#hy-glass-${c.tid})`) + rect(tx - 14, 236, tw + 28, 5, mix('#c9ced0', t.lit, .3));
    s += tree(c, 128, 272, .62, {small: true}) + tree(c, 362, 272, .62, {small: true}) + shrub(c, 250, 270, .7) + person(c, 210, 290, .8, {color: '#3f5a6b', bag: '#c9a37a', walk: true}) + person(c, 300, 292, .82, {color: '#8b5a4a'});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  function house4(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [84, 56, 20]);
    s += path('M0 190Q120 150 250 176T480 160V300H0Z', mix(c.L[2], t.haze, .55)) + path('M0 206Q140 182 300 198T480 190V300H0Z', mix(c.L[1], t.haze, .45));
    s += tree(c, 400, 236, 1.12);
    const lower = box(c, 104, 160, 260, 92, '#efe3cc', {depth: 14, snow: false});
    s += lower.s + rect(104, 160, 260, 92, 'url(#hy-wood)', {opacity: .25});
    const upper = box(c, 170, 100, 150, 60, '#e8d9bf', {depth: 12, snow: false, cornice: false});
    s += upper.s + gable(c, 164, 102, 162, 34, '#7b4a3a', {inset: 30, overhang: 10}) + gable(c, 98, 162, 272, 22, '#7b4a3a', {inset: 16, overhang: 8});
    s += win(c, 184, 112, 54, 36, {lit: t.on > 0, inside: ['books', 'desk', 'lamp'], lamp: false});
    s += win(c, 252, 112, 50, 36, {curtain: true, inside: ['curtain']});
    s += win(c, 120, 180, 120, 54, {lit: t.on > 0, inside: ['table', 'plant'], lamp: false, transom: false});
    // Timber front door with canopy, porch lamps.
    s += rect(262, 186, 40, 66, mix('#6a3f28', t.ink, .2)) + rect(266, 190, 32, 62, mix('#a8693f', t.ambient, .15)) + rect(266, 190, 32, 62, 'url(#hy-wood)') + circ(292, 222, 2, '#e8c160') + path('M254 184h56l-6 -8h-44z', mix('#7b4a3a', t.ambient, .2));
    s += circ(252, 196, 14, 'url(#hy-lamp)', {opacity: t.night || c.tid === 'golden' ? 1 : .25}) + rect(250, 192, 4, 7, '#ffe2a0') + win(c, 318, 186, 34, 40, {inside: ['plant']});
    s += path('M0 252H480V300H0Z', mix(c.season === 'winter' ? '#dfe6e8' : c.L[1], t.ambient, .3)) + path('M0 252H480V300H0Z', 'url(#hy-grass)');
    s += path('M262 252h40l26 48h-96z', mix('#d9cbb0', t.lit, .25)) + path('M262 252h40l26 48h-96z', 'url(#hy-tile)');
    // Low garden wall, swing under the tree, garden lamps.
    s += rect(0, 262, 220, 16, mix('#d6c8b0', t.ambient, .25)) + rect(0, 262, 220, 16, 'url(#hy-brick)') + rect(0, 260, 222, 4, mix('#ece2d0', t.lit, .3)) + rect(344, 262, 136, 16, mix('#d6c8b0', t.ambient, .25)) + rect(344, 262, 136, 16, 'url(#hy-brick)') + rect(342, 260, 138, 4, mix('#ece2d0', t.lit, .3));
    s += line(386, 186, 386, 236, '#5a4a3c', 1.2) + line(410, 186, 410, 236, '#5a4a3c', 1.2) + rect(382, 236, 32, 4, mix('#8a5a38', t.ambient, .2));
    for (const x of [228, 336]) s += rect(x - 2, 238, 4, 22, mix('#3b3f42', t.ink, .2)) + rect(x - 4, 234, 8, 6, '#ffe2a0') + circ(x, 237, 16, 'url(#hy-lamp)', {opacity: t.night || c.tid === 'golden' ? .95 : .2});
    s += shrub(c, 70, 262, 1.1) + shrub(c, 456, 264, .9) + tree(c, 40, 256, .9, {small: true});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  function warehouse(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [400, 54, 18]) + skyline(c, W, 170, 30, 70, .6, [40, 80]);
    const b = box(c, 60, 104, 340, 156, '#9fb3aa', {depth: 16});
    s += b.s + rect(60, 104, 340, 156, 'url(#hy-corr)', {opacity: .7}) + rect(56, 98, 348, 10, b.m.deep);
    s += rect(76, 118, 180, 18, mix('#f1e7d2', t.lit, .2)) + rect(84, 124, 70, 6, mix('#2f6d60', t.ink, .2)) + rect(162, 124, 30, 6, '#e0a243');
    const door = (x, open) => {
      let d = rect(x, 150, 92, 110, mix('#2e3338', t.ink, .2));
      if (open) {
        d += rect(x + 4, 150, 84, 22, mix('#c2c6c0', t.ambient, .2)) + rect(x + 4, 150, 84, 22, 'url(#hy-shutter)') + rect(x + 4, 172, 84, 88, t.on > .3 ? '#f2cf8a' : mix('#6b6458', t.shade, .2));
        for (let r = 0; r < 3; r++) { d += rect(x + 8, 196 + r * 22, 76, 3, mix('#5b4a3a', t.ink, .2)); for (let i = 0; i < 4; i++) d += rect(x + 10 + i * 18, 180 + r * 22, 15, 15, mix('#c9955a', t.ambient, .15)) + line(x + 17.5 + i * 18, 180 + r * 22, x + 17.5 + i * 18, 186 + r * 22, '#8a6a42', 1.4); }
      } else d += rect(x + 4, 150, 84, 110, mix('#c2c6c0', t.ambient, .2)) + rect(x + 4, 150, 84, 110, 'url(#hy-shutter)') + rect(x + 36, 250, 20, 4, '#4b5054');
      return d;
    };
    s += door(80, false) + door(184, true) + door(288, false);
    s += ground(c, W, 260, 40, {pave: '#bdb6a6'});
    // Hand truck with boxes and a cargo tricycle.
    s += line(176, 284, 168, 238, '#3c4044', 2.4) + rect(168, 282, 24, 3, '#3c4044') + circ(178, 287, 4, '#2e3338') + rect(172, 252, 20, 15, '#c9955a') + rect(170, 266, 22, 16, '#d6a66a') + line(181, 266, 181, 282, '#8a6a42', 1.2);
    s += path('M352 270h70v-22h-70z', mix('#4d7f86', t.ambient, .2)) + rect(352, 248, 70, 4, mix('#6c9fa6', t.lit, .2)) + circ(360, 282, 9, 'none', {stroke: '#2e3338', 'stroke-width': 2.6}) + circ(414, 282, 9, 'none', {stroke: '#2e3338', 'stroke-width': 2.6}) + circ(446, 282, 9, 'none', {stroke: '#2e3338', 'stroke-width': 2.6}) + stroke('M422 268l14 -2l10 16M436 266l2 -18h8', '#2e3338', 2.4) + rect(358, 236, 24, 13, '#c9955a') + rect(386, 232, 30, 17, '#d6a66a');
    s += tree(c, 32, 262, .8) + person(c, 140, 284, .85, {color: '#4f6f7a'}) + weather(c, W, Hh, 10) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-warehouse');
  }
  // Wide street banner used behind the market top bar; ground hugs the bottom (xMidYMax slice).
  function street(c) {
    const W = 2400, Hh = 120, t = c.t;
    let s = sky(c, W, Hh, [380, 34, 12]) + skyline(c, W, 74, 20, 56, .6, [30, 70]);
    let x = 0;
    const bases = ['#c4a07e', '#d9cbb3', '#a9b4a8', '#cfa58a', '#e3d7c2', '#b7a493', '#c9b9a0'];
    let i = 0;
    while (x < W) {
      const w = 110 + c.rnd() * 90, h = 46 + c.rnd() * 40, top = 104 - h, base = bases[i % bases.length];
      const b = box(c, x, top, w, h, base, {pattern: i % 3 === 0 ? 'brick' : 'tile', depth: 0, shadow: false});
      s += b.s;
      const cols = Math.floor((w - 16) / 26);
      for (let r = 0; r < Math.floor((h - 26) / 22); r++) for (let k = 0; k < cols; k++) s += win(c, x + 12 + k * 26, top + 8 + r * 22, 14, 13, {mull: false, transom: false, grille: i % 4 === 1 && r > 0});
      const shopY = 104 - 22;
      if (i % 3 === 0) s += shopfront(c, x + 8, shopY, Math.min(96, w - 16), 22, {sign: pick(c, ['#2f8a74', '#b9573f', '#3f6d9a', '#c98a2e'])});
      else if (i % 3 === 1) s += shutterShop(c, x + 10, shopY, Math.min(70, w - 20), 22, true) + path(`M${n(x + 6)} ${shopY}h${Math.min(78, w - 12)}l-4 6h-${Math.min(70, w - 20)}z`, pick(c, ['#c8553d', '#d29a3a', '#5a8f84']));
      else s += rect(x + 12, shopY + 2, 30, 20, mix('#3b4a50', t.ink, .3)) + rect(x + 14, shopY + 4, 26, 18, mix('#2f7a68', t.ambient, .2));
      if (i % 4 === 2) s += acUnit(c, x + w - 24, top + 14, .9);
      if (i % 5 === 3) s += clothes(c, x + 10, x + w - 10, top + 6);
      x += w; i++;
    }
    s += ground(c, W, 104, 16, {});
    for (let k = 0; k < 10; k++) s += tree(c, 90 + k * 240 + c.rnd() * 40, 110, .46, {small: true});
    for (let k = 0; k < 8; k++) s += lampPost(c, 200 + k * 300, 110, 42);
    for (let k = 0; k < 9; k++) s += person(c, 60 + k * 265 + c.rnd() * 60, 116, .62, {color: pick(c, ['#8a6a5a', '#4f7b8a', '#6d6a78', '#a35f45', '#5b7fa0']), walk: c.rnd() < .5, bag: c.rnd() < .3 ? '#d9a54a' : null});
    for (let k = 0; k < 5; k++) s += ebike(c, 160 + k * 470, 116, .5, pick(c, ['#4d7f86', '#d07a54', '#5a7fa0']));
    s += grp(stall(c, 0, 0), {transform: 'translate(1180 108) scale(.5)'}) + weather(c, W, Hh, 30);
    return K.svg(s, '0 0 2400 120', 'art-scene art-street', ' preserveAspectRatio="xMidYMax slice"');
  }
  // Start page: dusk city, three parallax layers, up to 12 windows that light up one by one.
  function city(c) {
    const W = 1600, Hh = 900, t = c.t;
    let far = sky(c, W, Hh, [340, 560, 54]) + skyline(c, W, 610, 120, 330, .5, [50, 110]) + skyline(c, W, 650, 60, 200, 1, [60, 120]);
    let mid = '';
    // A: old brick tenement with grilles, AC units and laundry.
    const A = box(c, 30, 360, 300, 410, '#b98a6a', {pattern: 'brick', depth: 18});
    mid += A.s + rect(30, 360, 300, 12, A.m.lit);
    mid += grid(c, 54, 400, 4, 5, 44, 52, 70, 72, (k, r) => ({grille: r > 0, pot: (k + r) % 3 === 0, inside: (k + r) % 4 === 1 ? ['lamp', 'curtain'] : null, blind: k === 3}));
    for (let r = 0; r < 4; r++) mid += acUnit(c, 296, 420 + r * 72, 1.3);
    mid += clothes(c, 52, 316, 393);
    mid += shutterShop(c, 50, 720, 120, 50, true) + rect(190, 712, 120, 58, mix('#3b4a50', t.ink, .3)) + rect(196, 718, 108, 52, 'url(#hy-corr)') + rect(196, 718, 108, 52, mix('#b9a48e', t.ambient, .2), {opacity: .7});
    // B: white-tiled building with breakfast shop.
    const B = box(c, 350, 420, 250, 350, '#e3d7c2', {pattern: 'tile', depth: 0});
    mid += B.s + gable(c, 350, 422, 250, 30, '#5b6a73', {inset: 24});
    mid += grid(c, 372, 450, 4, 4, 38, 46, 58, 66, (k, r) => ({inside: (k * 3 + r) % 5 === 0 ? ['shelf', 'lamp'] : (k + r) % 3 === 0 ? ['curtain'] : null, blind: r === 1}));
    for (let r = 0; r < 4; r++) mid += rect(366, 498 + r * 66, 218, 3, B.m.lit);
    mid += shopfront(c, 362, 706, 226, 64, {sign: '#c8553d'});
    // C: convenience store with lightbox, older building above.
    const C = box(c, 620, 340, 230, 430, '#a9b4a8', {pattern: 'tile', depth: 16});
    mid += C.s + grid(c, 640, 372, 3, 5, 44, 50, 70, 66, (k, r) => ({grille: k !== 1, pot: k === 1, inside: k === 1 && r === 2 ? ['plant', 'painting'] : null}));
    mid += wires(c, 330, 880, 350, 34) + shopfront(c, 632, 696, 206, 74, {shelves: true, sign: '#2f8a74'});
    // D: newer slab further back, E: brick block with stairwell, lockers and notice board.
    const D = box(c, 880, 250, 260, 520, '#c9c2b4', {pattern: 'tile', depth: 0});
    mid += D.s; for (let r = 0; r < 9; r++) mid += grid(c, 900, 272 + r * 52, 5, 1, 30, 30, 48, 0, {transom: false, mull: false, blind: r % 3 === 0});
    const E = box(c, 1150, 380, 460, 390, '#c4a07e', {pattern: 'brick', depth: 0});
    mid += E.s + gable(c, 1150, 382, 460, 34, '#56656e', {inset: 30, overhang: 6});
    mid += grid(c, 1176, 416, 6, 4, 42, 50, 72, 72, (k, r) => k === 3 ? null : ({grille: r > 0, inside: (k + r) % 4 === 0 ? ['books', 'lamp'] : null}));
    for (let r = 0; r < 4; r++) mid += win(c, 1394, 430 + r * 72, 16, 30, {mull: false, transom: false});
    mid += rect(1376, 700, 52, 70, mix('#2f3b45', t.ink, .2)) + rect(1382, 706, 40, 64, mix('#59757a', t.ambient, .2)) + circ(1402, 690, 22, 'url(#hy-lamp)', {opacity: t.night ? 1 : .4}) + rect(1394, 686, 16, 5, '#fff1c4');
    mid += lockers(c, 1450, 770) + notice(c, 1300, 770);
    // Near layer: street, plane trees, stall, neighbors.
    let near = ground(c, W, 770, 130, {road: 820});
    near += stall(c, 470, 790) + lampPost(c, 340, 808, 128) + lampPost(c, 1120, 808, 128);
    near += tree(c, 270, 812, 2.4) + tree(c, 1010, 812, 2.2) + tree(c, 1560, 816, 2.1);
    near += ebike(c, 600, 812, 1.4, '#4d7f86') + ebike(c, 660, 812, 1.4, '#d07a54') + ebike(c, 1240, 812, 1.3, '#5a7fa0');
    near += person(c, 420, 810, 1.8, {color: '#8a6a5a', bag: '#d9a54a'}) + person(c, 452, 812, 1.4, {color: '#a35f45'}) + person(c, 770, 814, 1.9, {color: '#4f7b8a', walk: true, umbrella: true}) + person(c, 1330, 812, 1.7, {color: '#6d6a78', walk: true}) + person(c, 900, 878, 2.3, {color: '#5b4f6a', walk: true});
    near += cat(c, 178, 770, 2);
    near += path('M0 900V842q50 -18 110 -6l20 64z', mix('#1f2433', t.ink, .2), {opacity: .9}) + shrub(c, 60, 846, 2.2) + path('M1600 900V856q-70 -10 -150 16l-14 28z', mix('#1f2433', t.ink, .2), {opacity: .9});
    near += weather(c, W, Hh, 40) + frameVignette(W, Hh, .9);
    const body = `<g class="hy-far">${far}</g><g class="hy-mid">${mid}</g><g class="hy-near">${near}</g>`;
    return K.svg(body, '0 0 1600 900', 'art-scene art-city', ' preserveAspectRatio="xMidYMax slice"');
  }

  // Downtown townhouse: two storeys, pitched roof, dormer, iron balcony, plane trees.
  function house5(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [400, 44, 15]);
    const left = box(c, -40, 146, 156, 110, '#cbb89a', {pattern: 'tile', depth: 0});
    s += left.s + gable(c, -40, 148, 156, 30, '#5c6a72', {inset: 16, overhang: 6});
    s += win(c, 4, 166, 30, 36, {pot: true}) + win(c, 48, 166, 30, 36, {blind: true});
    s += win(c, 22, 216, 36, 28, {transom: false});
    const right = box(c, 368, 138, 150, 118, '#d5c0a4', {pattern: 'brick', depth: 0});
    s += right.s + gable(c, 368, 140, 150, 32, '#6a4034', {inset: 16, overhang: 6});
    s += win(c, 386, 160, 32, 38) + win(c, 434, 160, 32, 38, {pot: true});
    s += win(c, 400, 214, 38, 28, {transom: false, curtain: true, inside: ['curtain']});
    const main = box(c, 148, 124, 184, 132, '#e7d3b6', {pattern: 'brick', depth: 12});
    s += main.s + gable(c, 144, 126, 192, 42, '#6d4034', {inset: 26, overhang: 10});
    const dorm = box(c, 210, 92, 48, 28, '#f3e6d0', {depth: 0, cornice: false});
    s += dorm.s + gable(c, 204, 94, 60, 16, '#6d4034', {inset: 8, overhang: 5});
    s += win(c, 220, 98, 26, 18, {mull: false, transom: false});
    s += win(c, 166, 140, 42, 34, {lit: t.on > 0, inside: ['shelf', 'lamp'], lamp: false});
    s += win(c, 262, 140, 50, 34, {curtain: true, inside: ['curtain']});
    const ink = mix('#3c342f', t.ink, .25), bx = 162, by = 176, bw = 156;
    s += rect(bx, by, bw, 4, mix('#c9b8a4', t.ambient, .25)) + rect(bx, by + 4, bw, 2, t.shade, {opacity: .35});
    s += line(bx + 2, by, bx + 2, by - 14, ink, 1.3) + line(bx + bw - 2, by, bx + bw - 2, by - 14, ink, 1.3);
    s += line(bx + 2, by - 14, bx + bw - 2, by - 14, ink, 1.3) + line(bx + 2, by - 7, bx + bw - 2, by - 7, ink, 1);
    for (let i = 8; i < bw - 4; i += 8) s += line(bx + i, by, bx + i, by - 14, ink, 1);
    s += stroke(`M${bx + 2} ${by - 14}q5 -6 10 0M${bx + bw - 2} ${by - 14}q-5 -6 -10 0`, ink, 1.1);
    if (c.season !== 'winter') {
      s += rect(bx + 18, by - 18, 16, 5, '#b5654b') + circ(bx + 24, by - 21, 4, c.L[1]) + circ(bx + 30, by - 23, 3.4, c.L[0]);
      if (c.season === 'spring') s += circ(bx + 22, by - 25, 1.5, '#f2b7c4') + circ(bx + 29, by - 26, 1.4, '#fff2f5');
    }
    s += win(c, 164, 196, 34, 42);
    s += rect(226, 192, 40, 64, mix('#3f322c', t.ink, .25)) + rect(230, 196, 32, 60, mix('#8d4e32', t.ambient, .12)) + rect(230, 196, 32, 60, 'url(#hy-wood)');
    s += rect(234, 200, 24, 14, mix('#a35c3c', t.lit, .15)) + circ(256, 230, 2, '#e2b45a') + path('M228 192h36l-4 -7h-28z', mix('#6d4034', t.ambient, .15));
    s += win(c, 284, 198, 30, 38, {pot: true});
    s += ground(c, W, 256, 44, {road: 280});
    s += path('M220 256h52l12 10H208Z', mix('#d9cbb0', t.lit, .25)) + path('M220 256h52l12 10H208Z', 'url(#hy-tile)');
    s += tree(c, 52, 258, 1.02) + tree(c, 424, 260, .9);
    s += shrub(c, 198, 256, .62) + shrub(c, 338, 258, .52);
    s += lampPost(c, 118, 278, 54) + person(c, 390, 292, .88, {color: '#7a5a48', bag: '#d9a54a', walk: true, umbrella: true});
    s += weather(c, W, Hh, 14) + frameVignette(W, Hh, t.night ? 1 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  // One courtyard: screen wall, hanging-pillar gate, jujube. Stylized, not a real residence.
  function house6(c) {
    const W = 480, Hh = 300, t = c.t, tile = '#5e6c74', wall = '#d2c0a4', wood = '#7a5340';
    let s = sky(c, W, Hh, [78, 36, 14]);
    const hall = box(c, 158, 70, 164, 72, '#e4d2b4', {pattern: 'brick', depth: 10});
    s += hall.s + gable(c, 150, 72, 180, 28, tile, {inset: 18, overhang: 8});
    s += win(c, 186, 86, 34, 30, {lit: t.on > 0, inside: ['lamp', 'painting'], lamp: false}) + win(c, 262, 86, 34, 30);
    s += rect(228, 88, 26, 54, mix(wood, t.ink, .12)) + rect(231, 92, 20, 50, mix('#a8693f', t.ambient, .12)) + rect(231, 92, 20, 50, 'url(#hy-wood)') + circ(246, 118, 1.7, '#e2b45a');
    const wingL = box(c, 16, 104, 132, 110, wall, {pattern: 'brick', depth: 0});
    s += wingL.s + gable(c, 12, 106, 140, 22, tile, {inset: 14, overhang: 6});
    s += win(c, 36, 126, 28, 32) + win(c, 84, 126, 28, 32, {pot: true});
    const wingR = box(c, 336, 104, 132, 110, wall, {pattern: 'brick', depth: 0});
    s += wingR.s + gable(c, 332, 106, 140, 22, tile, {inset: 14, overhang: 6});
    s += win(c, 356, 126, 28, 32) + win(c, 406, 126, 28, 32);
    s += rect(148, 142, 188, 78, mix('#cbb892', t.ambient, .25)) + rect(148, 142, 188, 78, 'url(#hy-tile)', {opacity: .7});
    if (c.season === 'winter') s += rect(148, 142, 188, 4, '#f3f7fa', {opacity: .85});
    if (c.season === 'autumn') for (let i = 0; i < 6; i++) s += ell(160 + c.rnd() * 150, 158 + c.rnd() * 46, 2.2, 1.1, pick(c, ['#e9b44a', '#d98a35', '#c4772f']));
    s += path('M214 220h36l-12 -58h-20z', mix('#e6d7bc', t.lit, .2));
    const tx = 168, ty = 200, sc = .58;
    s += tree(c, tx, ty, sc, {small: true});
    if (c.season !== 'winter' && c.season !== 'spring') for (const [dx, dy] of [[-10, -80], [8, -86], [2, -96], [14, -76], [-6, -68], [12, -92], [0, -74]]) s += circ(tx + dx * sc, ty + dy * sc, 2, '#b4332a');
    const screen = box(c, 206, 150, 68, 48, '#e8d8bc', {pattern: 'brick', depth: 0, cornice: false});
    s += screen.s + gable(c, 202, 152, 76, 16, tile, {inset: 10, overhang: 4});
    s += rect(218, 164, 44, 26, mix('#f6ead4', t.lit, .3)) + circ(240, 177, 10, mix('#8d3f34', t.ambient, .1)) + circ(240, 177, 6.2, mix('#e6c56a', t.lit, .22));
    s += path('M240 172.5l3.4 4.5-3.4 4.5-3.4-4.5z', '#f8efdc');
    s += shrub(c, 188, 196, .48);
    s += rect(16, 214, 152, 42, mix(wall, t.shade, .06)) + rect(16, 214, 152, 42, 'url(#hy-brick)') + rect(12, 210, 160, 6, mix('#ece2d0', t.lit, .3));
    s += rect(312, 214, 152, 42, mix(wall, t.shade, .06)) + rect(312, 214, 152, 42, 'url(#hy-brick)') + rect(308, 210, 160, 6, mix('#ece2d0', t.lit, .3));
    s += gable(c, 168, 220, 144, 16, tile, {inset: 18, overhang: 10});
    s += path('M184 220H296V228Q240 236 184 228Z', mix('#8d3f34', t.ambient, .12));
    s += rect(186, 220, 7, 36, mix(wood, t.ambient, .15)) + rect(287, 220, 7, 36, mix(wood, t.ambient, .15));
    s += rect(184, 218, 112, 5, mix(wood, t.ink, .1));
    s += rect(214, 224, 5, 16, mix('#8a5a3c', t.ambient, .12)) + rect(261, 224, 5, 16, mix('#8a5a3c', t.ambient, .12));
    s += circ(216.5, 242, 4.2, mix('#c4553d', t.ambient, .08)) + circ(263.5, 242, 4.2, mix('#c4553d', t.ambient, .08));
    s += circ(216.5, 242, 1.8, '#f3ddb4') + circ(263.5, 242, 1.8, '#f3ddb4');
    s += ground(c, W, 256, 44, {pave: '#cfc3ae'});
    s += shrub(c, 52, 256, .58) + shrub(c, 436, 258, .52);
    s += lampPost(c, 78, 294, 42) + person(c, 408, 294, .76, {color: '#6a5348', walk: true});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .35);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  // Island cabin, shore rocks and a short pier. Sea only — no skyline.
  function house7(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [392, 56, 18]);
    s += ground(c, W, 148, 152, {pave: '#e6d2b4'});
    const isle = 'M72 236C48 210 70 184 124 176C170 168 196 188 240 180C300 170 348 198 372 220C400 246 386 278 330 286C260 296 200 274 150 280C104 286 88 258 72 236Z';
    const sea = `M0 150H${W}V${Hh}H0Z ${isle}`;
    s += path(sea, 'url(#hy-water)', {'fill-rule': 'evenodd'}) + path(sea, mix(t.sky[2], t.sky[1], .25), {'fill-rule': 'evenodd', opacity: .32}) + path(sea, 'url(#hy-ripple)', {'fill-rule': 'evenodd'});
    s += path(isle, mix('#ecd8b6', t.ambient, .12)) + path(isle, 'none', {stroke: mix('#b5a48c', t.shade, .35), 'stroke-width': 5, opacity: .4});
    if (c.season === 'autumn') for (const [x, y] of [[150, 230], [190, 248], [248, 236], [210, 220]]) s += ell(x, y, 2.2, 1.1, '#d98a35');
    s += line(0, 156, W, 156, mix('#f6f1e6', t.lit, .45), 1.6, {opacity: .75});
    s += path('M40 198l30 -16 20 12 -8 16 -28 2z', mix('#8d7b70', t.ambient, .2)) + path('M52 190l14 -8 8 10 -14 6z', mix('#d2c0ae', t.lit, .25));
    s += path('M412 206l28 -10 16 18 -24 10z', mix('#7e6e66', t.shade, .15)) + path('M424 200l12 -6 6 8 -10 4z', mix('#d9c8b6', t.lit, .3));
    s += ell(108, 248, 22, 9, mix('#6e625c', t.shade, .18)) + ell(292, 270, 30, 11, mix('#6e625c', t.shade, .15));
    const cab = box(c, 156, 172, 118, 58, '#c4926a', {pattern: 'wood', depth: 10});
    s += cab.s + gable(c, 148, 174, 134, 30, '#7b4a3a', {inset: 16, overhang: 9});
    s += rect(246, 150, 10, 24, mix('#8d5a40', t.ambient, .2)) + rect(244, 148, 14, 4, mix('#6b4030', t.ink, .15));
    s += win(c, 170, 188, 36, 28, {lit: t.on > 0, inside: ['lamp', 'plant'], lamp: false});
    s += rect(220, 186, 26, 44, mix('#5a3a28', t.ink, .2)) + rect(223, 190, 20, 40, mix('#a8693f', t.ambient, .12)) + rect(223, 190, 20, 40, 'url(#hy-wood)') + circ(238, 210, 1.7, '#e2b45a');
    s += path('M274 214H424L436 230H264Z', mix('#a8734a', t.ambient, .2)) + path('M274 214H424L436 230H264Z', 'url(#hy-wood)');
    s += line(274, 220, 428, 220, mix('#6b442c', t.ink, .15), 1);
    s += line(312, 230, 312, 252, mix('#5a3c2c', t.ink, .2), 2.2) + line(356, 226, 356, 258, mix('#5a3c2c', t.ink, .2), 2.2) + line(404, 228, 406, 260, mix('#5a3c2c', t.ink, .2), 2.2);
    s += tree(c, 112, 228, .68) + shrub(c, 196, 230, .5) + shrub(c, 268, 226, .46);
    s += lampPost(c, 132, 228, 44) + person(c, 360, 222, .58, {color: '#6a5346', walk: true});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }
  // Warm paper habitat on red ground, with a small Earth. Not a metal poster.
  function house8(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [84, 62, 14]);
    s += circ(410, 40, 9, mix('#1c3a44', t.ink, .15)) + circ(409, 39, 7.2, '#6ea0b8');
    s += path('M405 36q4 -3 6 1q-2 2 -5 2q-1 -1 -1 -3z', '#7eae86') + path('M410 42q3 1 4 3q-4 1 -5 -1z', '#8fba90') + circ(407, 37.5, 1.4, '#fff6e4', {opacity: .7});
    s += path('M0 200Q120 166 220 188T400 174T480 196V224H0Z', mix('#d36a48', t.haze, .45));
    s += ground(c, W, 206, 94, {pave: '#d24a30'});
    s += rect(0, 214, W, 86, '#c4472e', {opacity: .42});
    s += path('M28 230l36 -20 24 10 -12 18 -34 2z', mix('#7a3024', t.shade, .12)) + path('M42 218l16 -10 8 8 -14 8z', mix('#f0a07a', t.lit, .28));
    s += ell(438, 240, 28, 11, mix('#8d3e2c', t.shade, .18)) + path('M64 252l24 -8 14 10 -22 8z', mix('#a84834', t.ambient, .12));
    const hab = box(c, 168, 162, 156, 66, '#e7b48a', {pattern: 'tile', depth: 8, cornice: false});
    s += hab.s;
    s += path('M154 180Q158 114 246 108Q334 114 338 180Z', mix('#f0c8a4', t.ambient, .12));
    s += path('M154 180Q158 114 228 112Q190 142 166 180Z', mix('#fff1dc', t.lit, .5), {opacity: .8});
    s += path('M270 126Q334 114 338 180Q300 154 270 140Z', mix('#c48462', t.shade, .2), {opacity: .5});
    s += gable(c, 196, 172, 104, 22, '#8a4532', {inset: 14, overhang: 8});
    s += win(c, 184, 184, 40, 28, {lit: t.on > 0, inside: ['lamp', 'plant'], lamp: false});
    s += win(c, 272, 186, 32, 26, {curtain: true, inside: ['curtain']});
    s += rect(236, 182, 24, 46, mix('#6b3a2a', t.ink, .2)) + rect(239, 186, 18, 42, mix('#b46a42', t.ambient, .12)) + rect(239, 186, 18, 42, 'url(#hy-wood)') + circ(252, 208, 1.6, '#e2b45a');
    s += circ(300, 146, 11, mix('#6b3a2a', t.ink, .15)) + circ(300, 146, 8, t.on > .15 ? t.win : mix(t.sky[2], t.shade, .35));
    s += path('M214 228h28l48 72h-96z', mix('#e7a07a', t.lit, .3), {opacity: .55});
    s += tree(c, 86, 214, .6, {small: true}) + shrub(c, 140, 214, .58) + shrub(c, 372, 220, .66);
    s += lampPost(c, 352, 224, 46) + person(c, 414, 248, .8, {color: '#8a4030', walk: true});
    s += weather(c, W, Hh, 12) + frameVignette(W, Hh, t.night ? 1 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-house');
  }

  // Unscratched card: plain paper and a blank silver film, never a prize mark.
  function blankCard(x, y, w, h, rot) {
    const tf = `rotate(${rot} ${n(x + w / 2)} ${n(y + h / 2)})`;
    return rect(x, y, w, h, '#f6f0e4', {rx: 2, transform: tf})
      + rect(x + w * .14, y + h * .3, w * .72, h * .4, '#d8dbdf', {rx: 1.5, transform: tf})
      + rect(x + w * .18, y + h * .36, w * .22, h * .12, '#fff', {opacity: .4, transform: tf});
  }
  function foilCard(x, y, w, h, rot, paper) {
    const tf = `rotate(${rot} ${n(x + w / 2)} ${n(y + h / 2)})`;
    return rect(x, y, w, h, paper, {rx: 2, transform: tf})
      + rect(x + 3, y + 3, 5.5, h - 6, '#c6cad0', {rx: 1, transform: tf})
      + rect(x + 4.2, y + 5, 2.2, h * .3, '#fff', {opacity: .45, transform: tf})
      + rect(x + w * .26, y + h * .3, w * .6, h * .36, '#d8dbdf', {rx: 1.2, transform: tf});
  }
  function dollarBill(c, x, y, w, h, rot) {
    const paper = mix('#6f9a84', c.t.ambient, .14), deep = mix('#2f7a68', c.t.ink, .16), light = mix('#d7eadc', c.t.lit, .18);
    const ink = mix('#3a2e2a', c.t.ink, .25);
    let b = rect(0, 0, w, h, paper, {rx: 1.4, stroke: ink, 'stroke-width': .6, 'stroke-opacity': .45});
    b += rect(0, 0, w, h, 'url(#hy-paper)', {rx: 1.4, opacity: .3});
    b += rect(1.8, 1.8, w - 3.6, h - 3.6, 'none', {stroke: light, 'stroke-width': .85, rx: 1});
    b += circ(w * .26, h * .5, h * .3, 'none', {stroke: deep, 'stroke-width': 1});
    b += circ(w * .26, h * .5, h * .18, light, {opacity: .7});
    b += signText(w * .26, h * .54, '$', deep, Math.max(8, h * .4));
    b += circ(w * .78, h * .5, h * .16, 'none', {stroke: deep, 'stroke-width': .8, opacity: .7});
    b += rect(w * .46, h * .22, w * .16, h * .12, light, {opacity: .45, rx: .4});
    b += rect(w * .46, h * .42, w * .2, h * .08, deep, {opacity: .18, rx: .4});
    b += rect(w * .46, h * .58, w * .14, h * .1, light, {opacity: .35, rx: .4});
    return grp(b, {transform: `translate(${n(x)} ${n(y)}) rotate(${rot} ${n(w / 2)} ${n(h / 2)})`});
  }
  function signText(x, y, label, fill, size) {
    return `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" dominant-baseline="middle" font-family="Microsoft YaHei,sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${label}</text>`;
  }
  // Neighborhood credit co-op: close interior, wood counter, cage, lamp, passbook, ink pad.
  function credit(c) {
    const W = 480, Hh = 300, t = c.t, wall = K.mat('#e6d3b8', t), wood = K.mat('#a8734a', t);
    const ink = mix('#3a2e2a', t.ink, .35);
    let s = rect(0, 0, W, Hh, wall.mid);
    s += rect(0, 0, W, 150, 'url(#hy-facelight)');
    s += rect(0, 0, W, 22, wall.deep) + rect(0, 22, W, 5, wall.shade) + rect(0, 0, 220, 22, wall.lit, {opacity: .2});
    const wx = 26, wy = 36, ww = 84, wh = 50;
    s += rect(wx - 5, wy - 5, ww + 10, wh + 12, wood.mid) + rect(wx - 5, wy - 5, ww + 10, wh + 12, 'url(#hy-wood)');
    s += rect(wx, wy, ww, wh, `url(#hy-sky-${c.tid})`);
    if (c.season === 'winter') {
      s += circ(wx + 22, wy + 34, 1.5, '#fbfdff') + circ(wx + 48, wy + 28, 1.2, '#fbfdff') + circ(wx + 66, wy + 38, 1.1, '#fbfdff');
    } else if (c.season === 'spring') {
      s += ell(wx + 24, wy + 32, 3, 1.5, '#f6d2da', {transform: `rotate(-24 ${n(wx + 24)} ${n(wy + 32)})`});
      s += ell(wx + 58, wy + 36, 2.6, 1.3, '#f1bccb', {transform: `rotate(28 ${n(wx + 58)} ${n(wy + 36)})`});
    } else if (c.season === 'autumn') {
      s += ell(wx + 30, wy + 38, 3.2, 1.4, c.L[0], {transform: `rotate(24 ${n(wx + 30)} ${n(wy + 38)})`});
      s += ell(wx + 60, wy + 30, 2.6, 1.2, c.L[1], {transform: `rotate(-16 ${n(wx + 60)} ${n(wy + 30)})`});
    }
    if (t.night) s += circ(wx + 18, wy + 36, 1, '#fff6dc', {opacity: .85}) + circ(wx + 44, wy + 32, .7, '#fff6dc', {opacity: .6}) + circ(wx + 68, wy + 40, .8, '#fff6dc', {opacity: .75});
    if (c.season === 'summer') s += rect(wx, wy, ww, wh * .45, 'url(#hy-reed)') + rect(wx, wy, ww, wh * .45, '#c9a46a', {opacity: .42});
    s += rect(wx, wy, ww, wh, `url(#hy-glass-${c.tid})`, {opacity: .28}) + rect(wx, wy, ww, wh, 'url(#hy-shine)', {opacity: .3});
    s += rect(wx + ww / 2 - 1.2, wy, 2.4, wh, wood.mid) + rect(wx, wy + wh * .42, ww, 2.2, wood.mid);
    s += rect(wx - 8, wy + wh + 3, ww + 16, 5, wood.lit);
    if (c.season === 'winter') s += rect(wx - 6, wy - 2, ww + 12, 3.2, '#f6f9fb');
    s += rect(22, 108, 92, 40, wood.shade) + rect(22, 108, 92, 5, wood.mid);
    ['#c96a52', '#7a9b8a', '#e3b55f', '#6f7fa3', '#d9cbb0', '#8a6040'].forEach((col, i) => { s += rect(26 + i * 14, 115, 12, 30, col); });
    s += rect(372, 40, 90, 108, wood.mid) + rect(372, 40, 90, 108, 'url(#hy-wood)') + rect(372, 40, 8, 108, wood.lit, {opacity: .4});
    for (let i = 0; i < 3; i++) s += rect(384, 50 + i * 30, 68, 24, wood.lit, {opacity: .32}) + line(384, 50 + i * 30, 452, 50 + i * 30, wood.deep, 1) + circ(418, 62 + i * 30, 2.2, '#e2b45a');
    s += rect(128, 78, 204, 72, mix('#243038', t.ink, .4));
    s += circ(214, 112, 22, 'url(#hy-lamp)', {opacity: t.night ? .55 : .22});
    s += rect(128, 78, 204, 72, 'url(#hy-grille)');
    s += rect(124, 74, 212, 80, 'none', {stroke: ink, 'stroke-width': 4});
    s += rect(120, 146, 220, 10, wood.mid) + rect(120, 146, 220, 10, 'url(#hy-wood)') + rect(120, 144, 220, 4, wood.lit);
    const lx = 196;
    s += circ(lx, 108, 74, 'url(#hy-lamp)', {opacity: n(t.night ? .9 : .48)});
    s += circ(lx, 96, 26, 'url(#hy-glow)', {opacity: n(Math.max(t.glow, .3) * .5)});
    s += line(lx, 22, lx, 44, ink, 1.3);
    s += path(`M${lx - 24} 44H${lx + 24}L${lx + 14} 62H${lx - 14}Z`, mix('#f0d7a0', t.lit, .25));
    s += path(`M${lx - 18} 46H${lx - 8}L${lx - 6} 60H${lx - 16}Z`, '#fff', {opacity: .35});
    s += rect(148, 84, 164, 30, wood.deep) + rect(148, 84, 164, 30, 'url(#hy-wood)');
    s += rect(152, 87, 156, 24, mix('#6a3a24', t.ink, .08));
    s += signText(230, 100, '信用社', '#f6e4c8', 18);
    s += rect(0, 156, W, 58, wood.mid) + rect(0, 156, W, 58, 'url(#hy-wood)');
    s += rect(0, 156, 140, 58, wood.lit, {opacity: .16}) + rect(340, 156, 140, 58, wood.shade, {opacity: .25});
    s += rect(0, 152, W, 8, wood.lit);
    s += path('M16 198H464L432 246H48Z', wood.lit) + path('M16 198H464L432 246H48Z', 'url(#hy-wood)', {opacity: .6});
    s += path('M16 198H170L78 246H48Z', '#fff', {opacity: .12});
    s += path('M48 246H432L410 286H70Z', wood.mid) + path('M48 246H432L410 286H70Z', 'url(#hy-wood)', {opacity: .4});
    s += path('M300 246H432L410 286H330Z', wood.shade, {opacity: .28});
    s += rect(0, 286, W, 14, mix('#6d5344', t.ink, .35)) + rect(0, 286, W, 14, 'url(#hy-wood)', {opacity: .35});
    s += rect(52, 214, 16, 12, '#b5654b') + circ(54, 208, 8, c.L[2]) + circ(64, 204, 7, c.L[1]) + circ(56, 198, 5, c.L[0]);
    if (c.season === 'spring') s += circ(50, 196, 1.6, '#f2b7c4') + circ(66, 194, 1.4, '#fff2f5');
    let book = path('M-8 3H66L70 44H-4Z', '#2f6a5c') + path('M-6 6L4 6L2 42L-4 42Z', '#3e8f7c');
    book += path('M0 0H64L68 40H4Z', '#f4efe3') + path('M0 0H64L68 40H4Z', 'url(#hy-paper)');
    book += path('M68 0H136L132 40H72Z', '#fffaf2') + path('M68 0H136L132 40H72Z', 'url(#hy-paper)');
    book += path('M64 0H72V40H64Z', '#c9b18a');
    for (let i = 0; i < 4; i++) {
      book += line(10, 8 + i * 8, 56, 10 + i * 8, '#d5c4a4', .9);
      book += line(80, 8 + i * 8, 126, 10 + i * 8, '#d5c4a4', .9);
    }
    book += line(12, 2, 14, 38, '#c9453a', 1.2);
    s += grp(book, {transform: 'translate(128 206) rotate(-7)'});
    s += grp(ell(0, 10, 24, 8, t.shade, {opacity: .22}) + path('M-26 0H26L22 14H-22Z', '#6e342e') + ell(0, 0, 20, 8, '#f6efe4') + ell(0, -1, 14, 5.5, '#c9453a') + ell(-5, -3, 5, 2, '#ee8d82', {opacity: .8}), {transform: 'translate(360 222)'});
    s += rect(404, 206, 14, 18, '#d9d2c6') + rect(406, 202, 10, 6, '#c9c0b2') + rect(408, 198, 6, 5, '#b7ad9e');
    s += frameVignette(W, Hh, t.night ? .85 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-credit');
  }
  // Street-corner scratch stall: shade-cloth banner, blank cards, dollar bills and coin jar on the table.
  function scratchStand(c) {
    const W = 480, Hh = 300, t = c.t, wood = K.mat('#a8734a', t);
    const ink = mix('#3a2e2a', t.ink, .4), cloth = mix('#d15a42', t.ambient, .22), stripe = mix('#f3e0b8', t.lit, .28);
    let s = sky(c, W, Hh, [78, 42, 16]) + skyline(c, W, 150, 22, 64, .55, [32, 68]);
    const back = box(c, 392, 108, 108, 100, '#d9cbb3', {pattern: 'tile', depth: 0});
    s += back.s + win(c, 408, 122, 26, 32, {lit: t.on > .45, transom: false, grille: true}) + win(c, 448, 122, 26, 32, {lit: false, transom: false});
    s += tree(c, 4, 204, .68);
    s += ground(c, W, 196, 104, {pave: '#cfc6b6', road: 286});
    s += rect(62, 56, 8, 150, ink) + rect(346, 52, 8, 154, ink);
    s += rect(58, 52, 16, 6, wood.lit) + rect(342, 48, 16, 6, wood.lit);
    s += path('M56 62H370Q358 84 370 106H56Q70 84 56 62Z', cloth);
    s += path('M56 76H370Q364 88 370 98H56Q64 88 56 76Z', stripe, {opacity: .92});
    s += path('M300 62H370Q358 84 370 106H300Q312 84 300 62Z', mix(cloth, t.shade, .4), {opacity: .4});
    s += path('M56 100H370L362 122Q200 144 64 122Z', cloth);
    s += path('M56 100H150L96 122Q70 112 64 122L56 100Z', mix('#f0c2b4', t.lit, .35), {opacity: .4});
    s += stroke('M118 64Q126 92 112 124', '#fff', 2.2, {opacity: .28});
    s += stroke('M210 68Q218 98 200 132', mix('#8a3030', t.ink, .35), 1.4, {opacity: .4});
    s += stroke('M292 64Q300 94 282 124', '#fff', 2, {opacity: .22});
    for (let i = 0; i < 8; i++) s += stroke(`M${78 + i * 36} 120Q${94 + i * 36} 136 ${110 + i * 36} 120`, mix('#8a3030', t.ink, .3), 1.15);
    if (c.season === 'winter') s += path('M56 58H374Q300 72 56 64Z', '#f7fafc', {opacity: .88});
    if (c.season === 'autumn') s += ell(168, 130, 3.2, 1.5, c.L[0], {transform: 'rotate(28 168 130)'});
    if (c.season === 'spring') s += ell(240, 126, 2.8, 1.4, '#f6d2da', {transform: 'rotate(-20 240 126)'});
    s += signText(213, 118, '幸运刮刮乐', '#f7efe2', 18);
    s += ell(220, 228, 120, 10, t.shade, {opacity: .2});
    s += path('M78 174H358L398 232H30Z', wood.mid) + path('M78 174H358L398 232H30Z', 'url(#hy-wood)', {opacity: .58});
    s += path('M78 174H190L86 232H30Z', '#fff', {opacity: .12});
    s += path('M30 232H398L384 260H48Z', wood.shade) + path('M30 232H398L384 260H48Z', 'url(#hy-wood)', {opacity: .32});
    s += rect(78, 252, 10, 34, wood.deep) + rect(352, 250, 10, 36, wood.deep);
    const jx = 96, jy = 180;
    s += ell(jx + 16, jy + 30, 7, 3, '#c98a3a') + ell(jx + 24, jy + 26, 7, 3, '#e2b45a') + ell(jx + 12, jy + 24, 6, 2.5, '#d5d8dc') + ell(jx + 20, jy + 20, 6.5, 2.6, '#e8c56a');
    s += path(`M${jx + 2} ${jy + 8}H${jx + 38}L${jx + 44} ${jy + 40}H${jx - 4}Z`, mix('#d5e7ec', t.lit, .3), {opacity: .5});
    s += path(`M${jx + 2} ${jy + 8}H${jx + 38}L${jx + 44} ${jy + 40}H${jx - 4}Z`, 'url(#hy-shine)', {opacity: .4});
    s += ell(jx + 20, jy + 8, 18, 5, mix('#eef6f8', t.lit, .4)) + ell(jx + 20, jy + 40, 24, 6, mix('#c5d5da', t.shade, .3), {opacity: .75});
    s += ell(jx + 20, jy + 6, 7, 2.4, '#e2b45a');
    s += ell(162, 222, 7, 3, '#e2b45a') + ell(154, 228, 6, 2.5, '#d5d8dc');
    s += ell(214, 214, 40, 6, t.shade, {opacity: .18});
    for (let i = 0; i < 5; i++) s += blankCard(174 + i * 2, 196 - i * 3, 64, 36, 0);
    s += blankCard(214, 214, 72, 40, -8);
    s += ell(304, 208, 50, 7, t.shade, {opacity: .16});
    s += blankCard(248, 186, 58, 32, 12);
    s += blankCard(270, 194, 60, 34, -9);
    s += foilCard(300, 188, 56, 30, 7, mix('#efe0c4', t.lit, .1));
    s += dollarBill(c, 274, 196, 54, 24, -16);
    s += dollarBill(c, 300, 202, 56, 25, 11);
    s += dollarBill(c, 282, 208, 50, 22, -5);
    s += weather(c, W, Hh, 16) + frameVignette(W, Hh, t.night ? .8 : .38);
    return K.svg(s, '0 0 480 300', 'art-scene art-scratch');
  }
  // Sales office shut for the day: shutter halfway, blank door paper, someone turned away.
  function housingClosed(c) {
    const W = 480, Hh = 300, t = c.t;
    let s = sky(c, W, Hh, [90, 44, 16]) + skyline(c, W, 150, 18, 56, .55, [30, 62]);
    const b = box(c, 78, 56, 324, 198, '#e6d7c2', {pattern: 'tile', depth: 12});
    s += b.s;
    s += rect(96, 106, 292, 12, mix('#2f6d60', t.ambient, .25)) + rect(96, 106, 292, 3, mix('#cfe8df', t.lit, .45), {opacity: .75});
    s += win(c, 118, 68, 42, 30, {lit: t.on > .35, transom: false});
    s += win(c, 186, 68, 42, 30, {lit: false, blind: true, transom: false});
    s += win(c, 308, 68, 42, 30, {lit: t.on > .6, transom: false});
    const wx = 112, wy = 128, ww = 108, wh = 112;
    const room = mix(t.night ? '#e7b56a' : '#c6a07a', t.ambient, t.night ? .12 : .32);
    s += rect(wx - 6, wy - 6, ww + 12, wh + 14, mix('#efe6d6', t.lit, .25));
    s += rect(wx, wy, ww, wh, room);
    if (t.night || c.tid === 'golden') s += circ(wx + 64, wy + 58, 42, 'url(#hy-glow)', {opacity: t.night ? .5 : .25});
    s += rect(wx + 8, wy + 14, 26, 4, mix('#8a6040', t.ink, .25)) + rect(wx + 8, wy + 34, 26, 4, mix('#8a6040', t.ink, .25));
    s += rect(wx + 10, wy + 18, 14, 14, '#f4ecd8') + rect(wx + 14, wy + 38, 14, 12, '#e7d8c0');
    s += rect(wx + ww - 28, wy + 16, 16, 20, '#f7f1e4') + rect(wx + ww - 24, wy + 20, 10, 14, '#e4d5bc');
    s += rect(wx, wy + wh - 14, ww, 14, mix('#8a6040', t.ink, .28)) + rect(wx, wy + wh - 14, ww, 14, 'url(#hy-wood)', {opacity: .4});
    s += person(c, wx + 62, wy + wh - 12, 1.12, {color: '#52616c'});
    s += rect(wx, wy, ww, wh, `url(#hy-glass-${c.tid})`, {opacity: .18}) + rect(wx, wy, ww, wh, 'url(#hy-shine)', {opacity: .2});
    s += path(`M${wx} ${wy}h${ww}v3h${n(-ww + 2)}v${n(wh - 3)}h-2z`, t.shade, {opacity: .28});
    s += rect(wx - 6, wy + wh + 2, ww + 12, 5, mix('#d9cbb8', t.lit, .3));
    const dx = 268, dy = 152, dw = 84, dh = 100, half = dh * .5;
    s += rect(dx - 4, dy - 4, dw + 8, dh + 6, mix('#efe6d6', t.lit, .2));
    s += rect(dx, dy, dw, dh, mix('#2a3338', t.ink, .35));
    s += rect(dx + 5, dy + half, dw - 10, half - 4, t.on > .25 ? mix('#f0c48a', t.win, .3) : `url(#hy-glass-${c.tid})`);
    s += rect(dx + 4, dy, dw - 8, half, K.mat('#c5c6be', t).mid) + rect(dx + 4, dy, dw - 8, half, 'url(#hy-shutter)');
    s += rect(dx + dw - 18, dy, 12, half, t.shade, {opacity: .16});
    s += rect(dx + 4, dy + half - 4, dw - 8, 5, mix('#3e464a', t.ink, .3));
    s += rect(dx + dw / 2 - 6, dy + half - 2, 12, 3, '#d9b15a');
    s += rect(dx - 6, dy - 12, dw + 12, 12, mix('#343a3e', t.ink, .3)) + rect(dx - 6, dy - 12, dw + 12, 3, mix('#8a9296', t.lit, .35));
    s += grp(rect(0, 0, 36, 28, '#f7f1e4') + rect(0, 0, 36, 28, 'url(#hy-paper)') + circ(18, 3.2, 2.3, '#c9453a'), {transform: `translate(${n(dx + 22)} ${n(dy + 64)}) rotate(-5)`});
    s += rect(dx + dw - 16, dy + half + 22, 4, 16, '#d9b15a');
    if (t.night) s += rect(dx + 8, dy + dh, dw - 10, 12, '#ffd994', {opacity: .16});
    s += ground(c, W, 252, 48, {pave: '#cfc6b6'});
    s += path(`M${dx - 10} 252H${dx + dw + 10}L${dx + dw + 24} 270H${dx - 24}Z`, mix('#d9d0c2', t.lit, .22));
    s += path(`M${dx - 10} 252H${dx + dw + 10}L${dx + dw + 24} 270H${dx - 24}Z`, 'url(#hy-tile)', {opacity: .65});
    s += tree(c, 16, 254, .78) + shrub(c, 246, 252, .5) + lampPost(c, 442, 274, 62);
    s += weather(c, W, Hh, 14) + frameVignette(W, Hh, t.night ? .85 : .4);
    return K.svg(s, '0 0 480 300', 'art-scene art-closed');
  }

  const builders = {city: [city, 'dusk'], street: [street, 'day'], rent: [rent, 'morning'], 'house-0': [house0, 'morning'], 'house-1': [house1, 'day'], 'house-2': [house2, 'golden'], 'house-3': [house3, 'evening'], 'house-4': [house4, 'golden'], warehouse: [warehouse, 'day'], 'house-5': [house5, 'golden'], 'house-6': [house6, 'morning'], 'house-7': [house7, 'day'], 'house-8': [house8, 'golden'], credit: [credit, 'golden'], 'scratch-stand': [scratchStand, 'day'], 'housing-closed': [housingClosed, 'evening']};
  const seeds = {city: 101, street: 202, rent: 303, 'house-0': 404, 'house-1': 505, 'house-2': 606, 'house-3': 707, 'house-4': 808, warehouse: 909, 'house-5': 1005, 'house-6': 1006, 'house-7': 1007, 'house-8': 1008, credit: 1110, 'scratch-stand': 1220, 'housing-closed': 1330};
  const cache = new Map();
  function scene(kind, opts) {
    const o = opts || {}, key = kind + '|' + (o.phase || '') + '|' + (o.tone || '') + '|' + (o.season || '') + '|' + (o.lamps ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const [fn, tone] = builders[kind];
    const slice = kind !== 'city' && kind !== 'street' && kind !== 'scratch-stand';
    const out = fn(ctx(o, seeds[kind], tone)).replace(/^<svg /, slice ? '<svg preserveAspectRatio="xMidYMid slice" ' : '<svg ');
    if (cache.size > 80) cache.clear();
    cache.set(key, out);
    return out;
  }
  H.ArtScenes = Object.freeze({scene, ids: Object.freeze(Object.keys(builders))});
})(typeof window !== 'undefined' ? window : globalThis);
