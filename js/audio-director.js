(function (g) {
  'use strict';
  // Public-state music director. Consumes only the setScene fields; never reads engine/core state.
  const H = g.HomeYear = g.HomeYear || {};
  const SEASONS = ['冬', '春', '夏', '秋'], SEASON_EN = {winter:'冬', spring:'春', summer:'夏', autumn:'秋'}, CLIMATE = {hot:'hot', steady:'steady', cold:'cold', '偏热':'hot', '平稳':'steady', '偏冷':'cold'};
  const URGENT = new Set(['menu', 'ending-home', 'ending-rent']), PHASES = ['menu', 'early', 'development', 'sprint', 'ending-home', 'ending-rent'];
  const RULES = Object.freeze({devWeek:18, sprintWeek:45, finalWeek:51, upAt:.90, downAt:.80, dwellSeconds:24, phraseBars:4});

  function normalize(scene) {
    const s = scene && typeof scene === 'object' ? scene : {};
    const week = Number.isInteger(s.week) && s.week >= 1 && s.week <= 52 ? s.week : 1;
    const progress = typeof s.progress === 'number' && Number.isFinite(s.progress) ? Math.max(0, Math.min(1, s.progress)) : 0;
    return {screen:s.screen === 'game' ? 'game' : 'start', week, status:s.status === 'ended' ? 'ended' : 'playing',
      house:typeof s.house === 'string' && s.house ? s.house : null, progress, season:SEASONS.includes(s.season) ? s.season : SEASON_EN[s.season] || null,
      climate:CLIMATE[s.climate] || 'steady', dialogOpen:s.dialogOpen === true};
  }

  // Priority: menu > endings > sprint > development > early. prev supplies progress hysteresis.
  function phaseOf(scene, prev) {
    const s = normalize(scene);
    if (s.screen !== 'game') return 'menu';
    if (s.status === 'ended') return s.house ? 'ending-home' : 'ending-rent';
    if (s.week >= RULES.sprintWeek) return 'sprint';
    if (s.week >= RULES.devWeek || s.house) return 'development';
    return s.progress >= (prev === 'development' ? RULES.downAt : RULES.upAt) ? 'development' : 'early';
  }

  // Vertical layers inside a cue: one extra layer per quarter of progress, sprint always busy.
  function layers(scene) {
    const s = normalize(scene);
    let level = s.progress >= .85 ? 2 : s.progress >= .6 ? 1 : 0;
    if (s.screen === 'game' && s.status === 'playing' && s.week >= RULES.sprintWeek) level = Math.max(1, s.week >= 49 ? 2 : level);
    if (s.house) level = Math.max(level, 1);
    return {level, cold:s.climate === 'cold', bright:s.climate === 'hot' ? 1 : s.climate === 'cold' ? -1 : 0,
      final:s.screen === 'game' && s.status === 'playing' && s.week >= RULES.finalWeek, dialog:s.dialogOpen};
  }

  // Stateful wrapper: requests merge (latest wins); switching is only granted at musical boundaries.
  // initialPhase seeds the hysteresis memory so an engine created late (music enabled after the player
  // already crossed the 0.90 line) still agrees with the phase UI has been showing.
  function createDirector(rules, initialPhase) {
    const R = Object.assign({}, RULES, rules || {});
    let scene = normalize(null), target = PHASES.indexOf(initialPhase) >= 0 ? initialPhase : 'menu', requests = 0;
    return {
      request(next) { requests++; scene = normalize(next); target = phaseOf(scene, target); return target; },
      scene:() => Object.assign({}, scene), target:() => target, requests:() => requests, layers:() => layers(scene),
      urgent:cue => URGENT.has(cue),
      // ctx: {current, now, lastSwitchAt, barInSection}. Returns the cue to start or null.
      decide(ctx) {
        if (!ctx.current) return target;
        if (target === ctx.current) return null;
        if (URGENT.has(target) || URGENT.has(ctx.current)) return target;
        if (ctx.barInSection % R.phraseBars !== 0) return null;
        if (target === 'sprint') return target;
        return ctx.now - ctx.lastSwitchAt >= R.dwellSeconds ? target : null;
      }
    };
  }

  H.AudioDirector = Object.freeze({RULES, normalize, phaseOf, layers, createDirector, urgent:cue => URGENT.has(cue)});
})(typeof window !== 'undefined' ? window : globalThis);
