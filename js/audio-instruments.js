(function (g) {
  'use strict';
  // Original synthesised instruments. Each voice is several oscillators/noise sources shaped by
  // filters and envelopes; every node is disconnected when its sources end, so nothing leaks.
  const H = g.HomeYear = g.HomeYear || {};
  const cache = new WeakMap();
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function shared(ac) {
    let c = cache.get(ac);
    if (c) return c;
    const len = Math.floor(ac.sampleRate * 2), noise = ac.createBuffer(1, len, ac.sampleRate), d = noise.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < len; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; d[i] = ((seed >>> 0) / 4294967296) * 2 - 1; }
    // Felt-piano spectrum: strong low partials, quickly thinning top.
    const amps = [0, 1, .52, .3, .2, .12, .08, .05, .035, .02, .012], real = new Float32Array(amps.length), imag = new Float32Array(amps);
    const piano = ac.createPeriodicWave(real, imag);
    const ep = ac.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, .18, .06, .03, .01]));
    c = {noise, piano, ep};
    cache.set(ac, c);
    return c;
  }

  // Voice bookkeeping: register nodes, disconnect them all after the last source ends.
  // stats.live counts voices whose sources have not all ended yet (driven by real onended events).
  const stats = {created:0, live:0};
  function Voice(ac) { this.ac = ac; this.nodes = []; this.sources = []; this.live = 0; stats.created++; stats.live++; }
  Voice.prototype.node = function (n) { this.nodes.push(n); return n; };
  Voice.prototype.source = function (s, t0, t1) {
    this.nodes.push(s); this.sources.push(s); this.live++;
    s.onended = () => { if (--this.live === 0) { stats.live--; for (const n of this.nodes) { try { n.disconnect(); } catch (e) {} } } };
    s.start(t0); s.stop(t1); return s;
  };
  Voice.prototype.osc = function (type, freq, t0, t1, detune) {
    const o = this.ac.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    return this.source(o, t0, t1);
  };
  Voice.prototype.noise = function (buf, t0, t1) { const s = this.ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.loopEnd = buf.duration; return this.source(s, t0, t1); };
  Voice.prototype.gain = function (v) { const n = this.ac.createGain(); n.gain.value = v === undefined ? 0 : v; return this.node(n); };
  Voice.prototype.filter = function (type, f, q) { const n = this.ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q !== undefined) n.Q.value = q; return this.node(n); };
  Voice.prototype.handle = function (amp, end) {
    const v = this;
    return {end, stop(at) {
      // Steal: 20 ms fade then stop sources early.
      const t = Math.max(at, v.ac.currentTime);
      try { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, .006); } catch (e) {}
      for (const s of v.sources) { try { s.stop(t + .04); } catch (e) {} }
    }};
  };

  // ADSR-ish helper with exponential decay; avoids zero targets for exponential ramps.
  function env(p, t, peak, attack, decayTo, decay, releaseAt, release) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + attack);
    p.setTargetAtTime(peak * decayTo, t + attack, decay);
    p.setTargetAtTime(0, releaseAt, release);
  }

  const I = {};
  I.piano = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), s = shared(ac), f = hz(m), amp = v.gain(), lp = v.filter('lowpass', 0, .7);
    const hold = Math.min(dur, 2.4 - Math.min(1.6, (m - 48) * .03)), decay = Math.max(.35, 1.6 - (m - 50) * .025);
    const end = t + hold + .9;
    v.osc(s.piano, f, t, end).connect(lp);
    v.osc(s.piano, f, t, end, 4).connect(lp);
    const bright = 1 + .2 * (o.bright || 0), top = Math.min(9000, f * (5 + 7 * vel) * bright);
    lp.frequency.setValueAtTime(top, t); lp.frequency.setTargetAtTime(Math.max(f * 2.2, 500), t + .01, .35);
    env(amp.gain, t, .34 * vel, .004, .25, decay, t + hold, .14);
    lp.connect(amp);
    // Felt hammer: short band-passed noise thump.
    const hn = v.gain(), bp = v.filter('bandpass', Math.min(3000, f * 3), 1.2);
    v.noise(s.noise, t, t + .05).connect(bp); bp.connect(hn); hn.connect(amp);
    hn.gain.setValueAtTime(.16 * vel, t); hn.gain.exponentialRampToValueAtTime(.0005, t + .045);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.epiano = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), s = shared(ac), f = hz(m), amp = v.gain(), end = t + dur + .5;
    const car = v.osc(s.ep, f, t, end), mod = v.osc('sine', f, t, end), idx = v.gain();
    const tine = v.osc('sine', f * 14, t, t + .1), tg = v.gain();
    idx.gain.setValueAtTime(f * .9 * vel, t); idx.gain.setTargetAtTime(f * .15, t, .22);
    mod.connect(idx); idx.connect(car.frequency);
    tg.gain.setValueAtTime(.05 * vel, t); tg.gain.exponentialRampToValueAtTime(.0004, t + .08);
    tine.connect(tg); tg.connect(amp);
    const lp = v.filter('lowpass', 3200 * (1 + .2 * (o.bright || 0)), .5);
    car.connect(lp); lp.connect(amp);
    env(amp.gain, t, .26 * vel, .006, .3, .9, t + dur, .12);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.pad = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + dur + 1.6, lp = v.filter('lowpass', 900 * (1 + .2 * (o.bright || 0)), .6);
    const lfo = v.osc('sine', .23 + (m % 5) * .03, t, end), depth = v.gain(6);
    lfo.connect(depth);
    for (const d of [-9, 8]) { const o2 = v.osc('sawtooth', f, t, end, d); depth.connect(o2.detune); o2.connect(lp); }
    v.osc('triangle', f / 2, t, end).connect(lp);
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(900 * (1 + .2 * (o.bright || 0)), t + 1.2);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(.05 * vel, t + 1.1); amp.gain.setTargetAtTime(0, t + dur, .45);
    lp.connect(amp); amp.connect(out);
    return v.handle(amp, end);
  };
  I.strings = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + dur + 1.1, lp = v.filter('lowpass', 2300 * (1 + .2 * (o.bright || 0)), .5);
    const hp = v.filter('highpass', 180, .5), vib = v.osc('sine', 5.1, t, end), vd = v.gain(0);
    vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(9, t + .5);
    vib.connect(vd);
    for (const d of [-7, 0, 7]) { const o2 = v.osc('sawtooth', f, t, end, d); vd.connect(o2.detune); o2.connect(lp); }
    lp.connect(hp); hp.connect(amp);
    const peak = .045 * vel;
    amp.gain.setValueAtTime(0, t);
    if (o.swell) { amp.gain.linearRampToValueAtTime(peak * .35, t + .3); amp.gain.linearRampToValueAtTime(peak * 1.15, t + dur * .9); }
    else amp.gain.linearRampToValueAtTime(peak, t + .32);
    amp.gain.setTargetAtTime(0, t + dur, .28);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.flute = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), s = shared(ac), f = hz(m), amp = v.gain(), end = t + dur + .4;
    const body = v.osc('triangle', f, t, end), h2 = v.osc('sine', f * 2, t, end), h2g = v.gain(.12), vib = v.osc('sine', 5.3, t, end), vd = v.gain(0);
    vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(dur > .8 ? 12 : 4, t + Math.min(.45, dur));
    vib.connect(vd); vd.connect(body.detune); vd.connect(h2.detune);
    h2.connect(h2g);
    const lp = v.filter('lowpass', 3800 * (1 + .2 * (o.bright || 0)), .4);
    body.connect(lp); h2g.connect(lp);
    const br = v.gain(), bp = v.filter('bandpass', f * 2.2, 2);
    v.noise(s.noise, t, end).connect(bp); bp.connect(br);
    br.gain.setValueAtTime(.06 * vel, t); br.gain.setTargetAtTime(.012 * vel, t + .05, .08); br.gain.setTargetAtTime(0, t + dur, .06);
    lp.connect(amp); br.connect(amp);
    env(amp.gain, t, .2 * vel, .05, .82, .4, t + dur, .07);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.marimba = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + Math.min(1.1, .35 + dur * .5);
    const parts = [[1, 1, .5], [3.98, .32, .08], [10.6, .08, .025]];
    for (const [r, a, d] of parts) { const g2 = v.gain(); v.osc('sine', f * r, t, end).connect(g2); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(a * .32 * vel, t + .003); g2.gain.setTargetAtTime(0, t + .003, d); g2.connect(amp); }
    amp.gain.value = 1; amp.connect(out);
    return v.handle(amp, end);
  };
  I.glock = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(1), end = t + 1.9;
    for (const [r, a, d] of [[1, 1, .7], [2.76, .35, .25], [5.4, .14, .09], [8.93, .06, .05]]) { const g2 = v.gain(); v.osc('sine', f * r, t, end).connect(g2); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(a * .17 * vel, t + .002); g2.gain.setTargetAtTime(0, t + .002, d); g2.connect(amp); }
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.bass = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + dur + .2, lp = v.filter('lowpass', 0, 3);
    v.osc('sawtooth', f, t, end).connect(lp);
    const sub = v.gain(.9); v.osc('sine', f, t, end).connect(sub); sub.connect(amp);
    lp.frequency.setValueAtTime(f * (7 + 3 * (o.bright || 0)), t); lp.frequency.setTargetAtTime(f * 2.2, t + .005, .09);
    const sg = v.gain(.35); lp.connect(sg); sg.connect(amp);
    env(amp.gain, t, .3 * vel, .006, .55, .35, t + dur, .05);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.sub = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + dur + .8;
    v.osc('sine', f, t, end).connect(amp);
    const t2 = v.gain(.22); v.osc('triangle', f * 2, t, end).connect(t2); t2.connect(amp);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(.24 * vel, t + .25); amp.gain.setTargetAtTime(.17 * vel, t + .25, 1.2); amp.gain.setTargetAtTime(0, t + dur, .3);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.pluck = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + .55, lp = v.filter('lowpass', 0, 4);
    v.osc('sawtooth', f, t, end).connect(lp);
    const sq = v.gain(.4); v.osc('square', f, t, end, 6).connect(sq); sq.connect(lp);
    lp.frequency.setValueAtTime(Math.min(8000, f * 9 * (1 + .2 * (o.bright || 0))), t); lp.frequency.setTargetAtTime(f * 1.4, t, .06);
    env(amp.gain, t, .13 * vel, .002, .0, .14, end - .05, .03);
    lp.connect(amp); amp.connect(out);
    return v.handle(amp, end);
  };
  I.brass = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(), end = t + dur + .35, lp = v.filter('lowpass', 0, 1.6);
    for (const d of [-5, 5]) v.osc('sawtooth', f, t, end, d).connect(lp);
    const vib = v.osc('sine', 5.6, t, end), vd = v.gain(0); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(dur > .9 ? 10 : 0, t + .5); vib.connect(vd);
    const open = Math.min(5200, f * 6 * (1 + .2 * (o.bright || 0)));
    lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(open, t + .07); lp.frequency.setTargetAtTime(open * .55, t + .08, .3);
    vd.connect(lp.detune);
    env(amp.gain, t, .1 * vel, .045, .78, .5, t + dur, .09);
    lp.connect(amp); amp.connect(out);
    return v.handle(amp, end);
  };
  I.kick = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), amp = v.gain(), end = t + .45, o2 = v.osc('sine', 140, t, end);
    o2.frequency.setValueAtTime(140, t); o2.frequency.exponentialRampToValueAtTime(44, t + .12);
    amp.gain.setValueAtTime(.62 * vel, t); amp.gain.setTargetAtTime(0, t + .01, .09);
    o2.connect(amp); amp.connect(out);
    return v.handle(amp, end);
  };
  I.rim = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), s = shared(ac), amp = v.gain(1), end = t + .12, bp = v.filter('bandpass', o.alt ? 2600 : 1700, 3), ng = v.gain(), tg = v.gain();
    v.noise(s.noise, t, end).connect(bp); bp.connect(ng);
    ng.gain.setValueAtTime(.42 * vel, t); ng.gain.exponentialRampToValueAtTime(.0005, t + .07);
    v.osc('triangle', o.alt ? 1100 : 820, t, end).connect(tg); tg.gain.setValueAtTime(.2 * vel, t); tg.gain.exponentialRampToValueAtTime(.0005, t + .03);
    ng.connect(amp); tg.connect(amp); amp.connect(out);
    return v.handle(amp, end);
  };
  I.shaker = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), s = shared(ac), amp = v.gain(), end = t + .09, hp = v.filter('highpass', 5200, .7), pk = v.filter('peaking', 8000, 1); pk.gain.value = 4;
    v.noise(s.noise, t, end).connect(hp); hp.connect(pk); pk.connect(amp);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime((o.alt ? .1 : .2) * vel, t + .012); amp.gain.exponentialRampToValueAtTime(.0005, t + .08);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.wood = (ac, out, t, m, dur, vel, o) => {
    const v = new Voice(ac), amp = v.gain(1), end = t + .16, base = o.alt ? 1550 : 1050;
    for (const [r, a] of [[1, 1], [1.48, .45]]) { const g2 = v.gain(); v.osc('sine', base * r, t, end).connect(g2); g2.gain.setValueAtTime(a * .3 * vel, t); g2.gain.exponentialRampToValueAtTime(.0005, t + .1); g2.connect(amp); }
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.timpani = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), s = shared(ac), f = hz(m), amp = v.gain(1), end = t + .9, tone = v.gain(), o2 = v.osc('sine', f * 1.03, t, end);
    o2.frequency.setTargetAtTime(f, t, .05);
    const ov = v.gain(.3); v.osc('sine', f * 1.5, t, end).connect(ov); ov.connect(tone);
    o2.connect(tone); tone.gain.setValueAtTime(.4 * vel, t); tone.gain.setTargetAtTime(0, t + .01, .25); tone.connect(amp);
    const lp = v.filter('lowpass', 900, .7), ng = v.gain(); v.noise(s.noise, t, t + .1).connect(lp); lp.connect(ng);
    ng.gain.setValueAtTime(.18 * vel, t); ng.gain.exponentialRampToValueAtTime(.0005, t + .08); ng.connect(amp);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.hiss = (ac, out, t, m, dur, vel) => {
    // Quiet tape-room bed: band-limited noise, slow fades so bars join seamlessly.
    const v = new Voice(ac), s = shared(ac), amp = v.gain(), end = t + dur + .3, bp = v.filter('bandpass', 2400, .4);
    v.noise(s.noise, t, end).connect(bp); bp.connect(amp);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(.006 * vel, t + .3); amp.gain.setValueAtTime(.006 * vel, t + dur); amp.gain.linearRampToValueAtTime(0, end);
    amp.connect(out);
    return v.handle(amp, end);
  };
  I.bell = (ac, out, t, m, dur, vel) => {
    const v = new Voice(ac), f = hz(m), amp = v.gain(1), end = t + 3.2;
    for (const [r, a, d] of [[.5, .5, 1.2], [1, 1, .9], [2.4, .4, .45], [3, .25, .3], [4.07, .15, .2]]) { const g2 = v.gain(); v.osc('sine', f * r, t, end).connect(g2); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(a * .14 * vel, t + .003); g2.gain.setTargetAtTime(0, t + .003, d); g2.connect(amp); }
    amp.connect(out);
    return v.handle(amp, end);
  };

  // Procedural stereo room: 2.4 s decay, highs fade faster than lows, short pre-delay.
  function impulse(ac, seconds) {
    const sr = ac.sampleRate, len = Math.floor(sr * (seconds || 2.4)), pre = Math.floor(sr * .018), buf = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let seed = ch ? 0x51ed270b : 0x2545f491, lp = 0;
      for (let i = pre; i < len; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const n = ((seed >>> 0) / 4294967296) * 2 - 1, x = (i - pre) / (len - pre), k = .25 + .7 * x;
        lp += (n - lp) * (1 - k);
        d[i] = lp * Math.pow(1 - x, 2.2) * Math.exp(-3 * x) * .9;
      }
    }
    return buf;
  }

  H.AudioInstruments = Object.freeze({play(name, ac, out, t, midi, dur, vel, opts) { const fn = I[name]; if (!fn) throw Error('unknown instrument ' + name); return fn(ac, out, t, midi, dur, vel, opts || {}); },
    names:Object.freeze(Object.keys(I)), impulse, hz, stats:() => ({created:stats.created, live:stats.live})});
})(typeof window !== 'undefined' ? window : globalThis);
