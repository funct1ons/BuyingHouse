(function (H) {
  'use strict';
  const marketEvents = () => H.events.filter(e => e.type === 'market' && e.tier !== 'swan');
  const personalEvents = () => H.events.filter(e => e.type === 'personal');
  const pick = (s, list) => list[Math.floor(H.random(s, 'events') * list.length)];
  const favor = (u, strength) => {
    const lifted = 1 - Math.pow(1 - u, 3);
    return u * (1 - strength) + lifted * strength;
  };
  const eventScore = e => Object.values(e.effects || {}).reduce((n, fx) => n + (fx.bps || 0), 0);
  const luckyPick = (s, list) => {
    if (!H.difficulty(s).luck || list.length < 2) return pick(s, list);
    const helpful = list.filter(e => eventScore(e) > 0);
    if (!helpful.length || H.random(s, 'events') >= 0.8) return pick(s, list);
    return helpful[Math.floor(H.random(s, 'events') * helpful.length)];
  };
  const luckyUnit = s => {
    const u = H.random(s, 'market');
    if (!H.difficulty(s).luck) return u;
    return favor(u, 0.75);
  };
  const poolIndex = id => H.products.findIndex(p => p.id === id);
  const byPool = (a, b) => poolIndex(a) - poolIndex(b);
  const shuffle = (list, s) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(H.random(s, 'listing') * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  H.listingCovers = ids => {
    if (!Array.isArray(ids) || ids.length !== H.rules.onSale || new Set(ids).size !== ids.length) return false;
    const goods = ids.map(id => H.products.find(p => p.id === id));
    if (goods.some(p => !p)) return false;
    const roles = new Set(goods.map(p => p.role));
    return roles.has('daily') && roles.has('industry') && roles.has('spec') && goods.filter(p => p.lowRef).length >= 2;
  };
  function repair(order) {
    const listed = order.slice(0, H.rules.onSale);
    const off = order.slice(H.rules.onSale);
    const swapIn = (incoming, accept) => {
      for (let i = listed.length - 1; i >= 0; i--) {
        const outgoing = listed[i];
        const trial = listed.slice();
        trial[i] = incoming;
        if (!accept(trial, outgoing)) continue;
        listed[i] = incoming;
        const at = off.indexOf(incoming);
        off[at] = outgoing;
        return true;
      }
      return false;
    };
    for (const role of ['daily', 'industry', 'spec']) {
      if (listed.some(id => H.product(id).role === role)) continue;
      const incoming = off.filter(id => H.product(id).role === role).sort(byPool)[0];
      if (!incoming || !swapIn(incoming, trial => ['daily', 'industry', 'spec'].every(r => r === role || trial.some(id => H.product(id).role === r)))) {
        throw Error('轮换约束无解');
      }
    }
    while (listed.filter(id => H.product(id).lowRef).length < 2) {
      const incoming = off.filter(id => H.product(id).lowRef).sort(byPool)[0];
      if (!incoming || !swapIn(incoming, (trial, outgoing) => !H.product(outgoing).lowRef && ['daily', 'industry', 'spec'].every(r => trial.some(id => H.product(id).role === r)))) {
        throw Error('轮换约束无解');
      }
    }
    if (!H.listingCovers(listed)) throw Error('轮换约束无解');
    return listed.slice().sort(byPool);
  }
  H.initialListing = s => repair(shuffle(H.products.map(p => p.id), s));
  function combinations(arr, k) {
    const out = [];
    const walk = (start, acc) => {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (let i = start; i < arr.length; i++) { acc.push(arr[i]); walk(i + 1, acc); acc.pop(); }
    };
    walk(0, []);
    return out;
  }
  H.rotate = s => {
    const prev = s.listing.slice();
    const off = H.products.map(p => p.id).filter(id => !prev.includes(id));
    const mustIn = off.filter(id => s.absence[id] >= H.rules.maxAbsence);
    if (mustIn.length > H.rules.replaceMax) throw Error('轮换约束无解');
    const k = H.rules.replaceMin + Math.floor(H.random(s, 'listing') * (H.rules.replaceMax - H.rules.replaceMin + 1));
    if (k < mustIn.length) throw Error('轮换约束无解');
    const extras = shuffle(off.filter(id => !mustIn.includes(id)), s);
    const returners = mustIn.concat(extras.slice(0, k - mustIn.length));
    const valid = combinations(prev.slice().sort(byPool), k).filter(leavers => H.listingCovers(prev.filter(id => !leavers.includes(id)).concat(returners)));
    if (!valid.length) throw Error('轮换约束无解');
    valid.sort((a, b) => {
      const streak = list => list.reduce((n, id) => n + s.onStreak[id], 0);
      const diff = streak(b) - streak(a);
      if (diff) return diff;
      for (let i = 0; i < a.length; i++) {
        const d = poolIndex(a[i]) - poolIndex(b[i]);
        if (d) return d;
      }
      return 0;
    });
    const leavers = valid[0];
    const next = prev.filter(id => !leavers.includes(id)).concat(returners).sort(byPool);
    s.turn = {arrived: returners.slice(), departed: leavers.map(id => ({id, streak: s.onStreak[id]}))};
    s.listing = next;
    for (const p of H.products) {
      if (next.includes(p.id)) {
        s.onStreak[p.id] = prev.includes(p.id) ? s.onStreak[p.id] + 1 : 1;
        s.absence[p.id] = 0;
      } else {
        s.absence[p.id] = s.absence[p.id] + 1;
        s.onStreak[p.id] = 0;
      }
    }
  };
  H.environment = s => {
    s.season = H.seasonAt(H.calendarWeek(s));
    s.macro = Math.max(.8, Math.min(1.2, s.macro * .8 + (.9 + .2 * luckyUnit(s)) * .2));
  };
  // Only already-known scheduling state is read here; never cash, holdings, P&L or prices.
  function swanCandidates(s, filtered) {
    return H.events.filter(e => e.tier === 'swan').filter(e => {
      let reason = null;
      if (s.swanLog.some(l => l.id === e.id)) reason = 'used';
      else if (e.season && s.season !== e.season) reason = 'season';
      else if (!e.primaryProducts.some(id => s.listing.includes(id))) reason = 'offSale';
      else if (s.activeEvents.some(a => {
        const ordinary = H.events.find(e => e.id === a.id);
        return ordinary.tier !== 'swan' && e.primaryProducts.some(id => ordinary.effects[id] && ordinary.effects[id].kind !== 'structural');
      })) reason = 'overlap';
      if (reason) filtered[e.id] = reason;
      return !reason;
    });
  }
  H.drawEvents = s => {
    s.activeEvents = s.activeEvents.filter(e => e.until >= s.week);
    s.personal = 0;
    s.personalEvent = null;
    s.news = [];
    const cfg = H.swanRules, last = s.swanLog[s.swanLog.length - 1];
    const eligible = s.week >= cfg.firstWeek && s.week <= cfg.lastWeek && s.swanLog.length < cfg.limit && (!last || s.week - last.week >= cfg.gap);
    const filtered = {}, candidates = eligible ? swanCandidates(s, filtered) : [];
    let chosen = null, swanAttempt = false, ordinaryAttempt = false;
    if (candidates.length) {
      swanAttempt = true;
      if (H.random(s, 'events') < cfg.probability) chosen = luckyPick(s, candidates);
    }
    if (chosen) {
      s.swanLog.push({id: chosen.id, week: s.week});
    } else {
      ordinaryAttempt = H.random(s, 'events') < .42;
      if (ordinaryAttempt) {
        const blocked = new Set();
        for (const a of s.activeEvents) {
          const e = H.events.find(e => e.id === a.id);
          if (e.tier === 'swan') for (const [id, fx] of Object.entries(e.effects)) if (fx.kind === 'persist') blocked.add(id);
        }
        const ordinary = marketEvents().filter(e => !Object.keys(e.effects).some(id => blocked.has(id)));
        if (ordinary.length) {
          const e = luckyPick(s, ordinary);
          if (!s.activeEvents.some(a => a.id === e.id)) chosen = e;
        }
      }
    }
    if (chosen) s.activeEvents.push({id: chosen.id, started: s.week, until: Math.min(52, s.week + chosen.duration - 1)});
    if (H.random(s, 'events') < .08) {
      const e = pick(s, personalEvents());
      s.personalEvent = e.id;
      s.personal = e.cash < 0 ? Math.round(e.cash * H.difficulty(s).risk) : e.cash;
    }
    return {week:s.week, eligible, swanAttempt, candidates:candidates.map(e => e.id), filtered, ordinaryAttempt,
      started:chosen ? chosen.id : null, swan:!!chosen && chosen.tier === 'swan'};
  };
  H.trends = s => {
    for (const p of H.products) {
      const m = s.market[p.id];
      const half = H.roleHalf[p.role];
      m.trend = Math.max(-1, Math.min(1, m.trend * .7 + (luckyUnit(s) - .5) * half * .5));
    }
  };
  function effectsFor(s, id) {
    const found = [];
    for (const a of s.activeEvents) {
      const e = H.events.find(e => e.id === a.id);
      const fx = e && e.effects[id];
      if (fx) found.push({active: a, fx});
    }
    return found;
  }
  H.prices = s => {
    let clips = 0, persistCapTriggers = 0, specStarts = 0, specStartClips = 0;
    const clipped = [], persistCapped = [], persistProducts = [], startedProducts = [];
    for (const p of H.products) {
      const m = s.market[p.id];
      const half = H.roleHalf[p.role];
      let shock = (luckyUnit(s) - .5) * 2 * half * H.difficulty(s).volatility;
      if (H.difficulty(s).luck && s.inventory[p.id].qty > 0) shock = Math.max(shock, 0.06) + half * 0.25;
      const found = effectsFor(s, p.id);
      let structural = 1, persist = 0, start = 0, starts = false;
      for (const item of found) {
        if (item.fx.kind === 'structural') structural *= 1 + item.fx.bps / 10000;
        if (item.fx.kind === 'persist') persist += item.fx.bps;
        if (item.active.started === s.week) { starts = true; start += item.fx.bps; }
      }
      const cap = H.persistCap[p.role];
      if (persist > cap || persist < -cap) {
        persistCapTriggers++;
        persistCapped.push(p.id);
      }
      persist = Math.max(-cap, Math.min(cap, persist));
      if (persist !== 0) persistProducts.push(p.id);
      if (starts) startedProducts.push(p.id);
      const seasonal = 1 + p.season * Math.cos((H.calendarWeek(s) - 1) / 52 * Math.PI * 2 + p.phase);
      const center = p.base * seasonal * s.macro * structural * (1 + persist / 10000);
      const noise = Math.round(m.price * (m.trend * p.trendSensitivity + shock));
      m.previous = m.price;
      let raw = starts
        ? m.price + Math.round(m.price * start / 10000) + noise
        : m.price + Math.round((H.difficulty(s).revertRate != null ? H.difficulty(s).revertRate : H.rules.revertRate) * (center - m.price)) + noise;
      if (H.difficulty(s).luck && s.inventory[p.id].qty > 0 && !starts) raw += Math.round(m.price * 0.045);
      const clamped = Math.max(p.min, Math.min(p.max, raw));
      if (clamped !== raw) {
        clips++;
        clipped.push(p.id);
      }
      if (starts && p.role === 'spec') {
        specStarts++;
        if (clamped !== raw) specStartClips++;
      }
      m.price = H.int(clamped);
      m.history.push(m.price);
      if (m.history.length > 12) m.history.shift();
      m.low = Math.min(m.low, m.price);
      m.high = Math.max(m.high, m.price);
    }
    for (const p of H.legacyProducts) {
      const m = s.legacy[p.id];
      m.previous = m.price;
      m.history.push(m.price);
      if (m.history.length > 12) m.history.shift();
    }
    return {clips, clipped, persistCapTriggers, persistCapped, persistProducts, startedProducts, specStarts, specStartClips,
      eventStarted: s.activeEvents.some(a => a.started === s.week)};
  };
  // Shared by real next and clone preview, including personal-event RNG draws.
  // Ineligible weeks, counts, or gaps do not touch the housing stream.
  H.drawHousing = s => {
    const cfg = H.housingRules, log = s.housingLog, last = log[log.length - 1];
    const eligible = s.week >= cfg.firstWeek && s.week <= cfg.lastWeek && log.length < cfg.limit && (!last || s.week - last.week >= cfg.gap);
    if (!eligible) return;
    if (!(H.random(s, 'housing') < cfg.probability)) return;
    const used = new Set(log.map(entry => entry.id));
    const pool = H.housingEvents.filter(e => !used.has(e.id));
    if (!pool.length) return;
    const chosen = pool[Math.floor(H.random(s, 'housing') * pool.length)];
    s.housingLog.push({id: chosen.id, week: s.week});
  };
  H.applyHousePrices = s => {
    for (const h of H.houses) s.priceBook.houses[h.id] = H.houseQuote(s, h.id);
  };
  H.advanceMarket = s => {
    if (s.week >= 52 || s.status !== 'playing') throw Error('没有下一经营周');
    s.week++;
    H.drawHousing(s);
    H.applyHousePrices(s);
    H.environment(s); H.rotate(s);
    const eventDiag = H.drawEvents(s); H.trends(s);
    const pending = H.prices(s); pending.week = s.week;
    return {eventDiag, pending};
  };
  H.previewMarket = s => {
    const preview = H.clone(s);
    H.advanceMarket(preview);
    return preview;
  };
  H.makeRumors = s => {
    if (s.week >= 52 || s.status !== 'playing') return [];
    const preview = H.previewMarket(s), cfg = H.hintRules;
    const candidates = s.listing.filter(id => Math.abs(H.changeBps(preview.market[id])) >= cfg.thresholdBps);
    let x = H.seed(s.seed + ':hint:' + s.week);
    const random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const sources = Object.keys(H.hintSources);
    return candidates.slice(0,cfg.limit).map(productId => {
      let up = H.changeBps(preview.market[productId]) > 0;
      const flip = H.difficulty(s).hintFlip != null ? H.difficulty(s).hintFlip : cfg.flipProbability;
      if (random() < flip) up = !up;
      return {productId, direction:up ? 'up' : 'down', sourceId:sources[Math.floor(random()*sources.length)]};
    });
  };
  H.personal = s => {
    if (s.personal < 0) {
      const paid = Math.min(s.cash, -s.personal);
      s.cash -= paid;
      s.stats.hardship = H.add(s.stats.hardship, -s.personal - paid);
      s.stats.expenses = H.add(s.stats.expenses, paid);
    } else {
      s.cash = H.add(s.cash, s.personal);
      s.stats.grants = H.add(s.stats.grants, s.personal);
    }
  };
  H.bulletinRows = news => {
    const head = news.find(n => n.kind === 'headline') || null;
    const hold = news.find(n => n.kind === 'holding') || null;
    const list = news.find(n => n.kind === 'listing') || null;
    const rows = [head];
    if (hold) rows.push(hold);
    if (list && rows.length < 3) rows.push(list);
    return rows.slice(0, 3);
  };
  function item(s, id, title, reliability, kind, productId, fresh) {
    return {id, title, reliability, week: s.week, kind, productId, changeBps: productId ? H.changeBps(H.quoteOf(s, productId)) : 0, fresh};
  }
  H.news = s => {
    const turn = s.turn || {arrived: [], departed: []};
    delete s.turn;
    const fresh = s.activeEvents.filter(a => a.started === s.week);
    s.news = [];
    let headlineId = null;
    if (fresh.length) {
      const e = H.events.find(ev => ev.id === fresh[0].id);
      const affected = Object.keys(e.effects);
      affected.sort((a, b) => Math.abs(H.changeBps(s.market[b])) - Math.abs(H.changeBps(s.market[a])));
      headlineId = affected[0];
      s.news.push(item(s, e.id, e.title, e.reliability, 'headline', headlineId, true));
    } else {
      const moves = H.products.filter(p => Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps)
        .sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])));
      if (moves.length) {
        headlineId = moves[0].id;
        s.news.push(item(s, 'move', moves[0].name + '本周价格已经明显变动', 'normal', 'headline', headlineId, true));
      }
    }
    const rest = H.products.filter(p => p.id !== headlineId && Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps);
    const held = rest.filter(p => s.inventory[p.id].qty > 0);
    const second = (held.length ? held : rest).sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])))[0];
    if (second) s.news.push(item(s, 'move', second.name + '本周价格已经明显变动', 'normal', 'holding', second.id, true));
    const arrived = turn.arrived.slice().sort((a, b) => H.product(a).basePrice - H.product(b).basePrice || byPool(a, b));
    const departed = turn.departed.slice().sort((a, b) => b.streak - a.streak || byPool(a.id, b.id));
    if (arrived.length || departed.length) {
      const primary = arrived[0] || departed[0].id;
      const parts = [];
      if (arrived.length) parts.push('新到货：' + H.product(arrived[0]).name);
      if (departed.length) parts.push('暂时缺货：' + H.product(departed[0].id).name);
      s.news.push(item(s, 'listing', parts.join('；'), 'normal', 'listing', primary, true));
    }
    for (const a of s.activeEvents) {
      if (a.started === s.week) continue;
      const e = H.events.find(ev => ev.id === a.id);
      const affected = Object.keys(e.effects).sort((x, y) => Math.abs(H.changeBps(s.market[y])) - Math.abs(H.changeBps(s.market[x])));
      s.news.push(item(s, e.id, e.title, 'normal', 'ongoing', affected[0], false));
    }
    if (s.personalEvent) {
      const e = H.events.find(ev => ev.id === s.personalEvent);
      s.news.push(item(s, e.id, e.title, 'reliable', 'personal', null, true));
    }
    for (const hit of s.housingLog.filter(entry => entry.week === s.week)) {
      const ev = H.housingEvents.find(e => e.id === hit.id);
      s.news.push({id: ev.id, title: ev.title, reliability: 'reliable', week: s.week, kind: 'housing', productId: null, changeBps: H.houseChangeBps(s, 'studio'), fresh: true});
    }
  };
})(window.HomeYear);
