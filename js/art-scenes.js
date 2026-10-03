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

  const builders = {city: [city, 'dusk'], street: [street, 'day'], rent: [rent, 'morning'], 'house-0': [house0, 'morning'], 'house-1': [house1, 'day'], 'house-2': [house2, 'golden'], 'house-3': [house3, 'evening'], 'house-4': [house4, 'golden'], warehouse: [warehouse, 'day']};
  const seeds = {city: 101, street: 202, rent: 303, 'house-0': 404, 'house-1': 505, 'house-2': 606, 'house-3': 707, 'house-4': 808, warehouse: 909};
  const cache = new Map();
  function scene(kind, opts) {
    const o = opts || {}, key = kind + '|' + (o.phase || '') + '|' + (o.tone || '') + '|' + (o.season || '') + '|' + (o.lamps ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const [fn, tone] = builders[kind];
    const out = fn(ctx(o, seeds[kind], tone)).replace(/^<svg /, kind === 'city' || kind === 'street' ? '<svg ' : '<svg preserveAspectRatio="xMidYMid slice" ');
    if (cache.size > 80) cache.clear();
    cache.set(key, out);
    return out;
  }
  H.ArtScenes = Object.freeze({scene, ids: Object.freeze(Object.keys(builders))});
})(typeof window !== 'undefined' ? window : globalThis);
