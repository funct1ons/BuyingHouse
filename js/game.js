(function (H) {
  'use strict';
  function blankLegacy(p) {
    return {qty: 0, cost: 0, price: p.base, previous: p.base, trend: 0, history: [p.base], low: p.base, high: p.base};
  }
  function priceBook(difficulty) {
    const published = H.priceBooks['0.2'][difficulty];
    return {id: '0.2', houses: H.clone(published.houses), warehouses: H.clone(published.warehouses)};
  }
  H.create = function (seed = 'CITY-382741', difficulty = 'standard') {
    if (typeof seed !== 'string' || !seed.length || seed.length > 128) throw Error('种子不能为空或过长');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties, difficulty)) throw Error('难度无效');
    const s = {version: H.rules.saveVersion, rulesVersion: H.rules.version, seed, difficulty,
      week: 1, cash: H.difficulties[difficulty].initialCash, capacity: H.rules.capacity, warehouse: 'room',
      revision: 0, status: 'playing', house: null, result: null, rng: {}, inventory: {}, market: {}, activeEvents: [],
      macro: 1, season: '冬', personal: 0, personalEvent: null, news: [], history: [], stats: {},
      listing: [], absence: {}, onStreak: {}, legacy: {}, migration: null, priceBook: priceBook(difficulty)};
    for (const key of H.statFields) s.stats[key] = 0;
    s.stats.byProduct = {};
    for (const stream of ['market', 'events', 'visual', 'listing']) s.rng[stream] = H.seed(seed + ':' + stream);
    for (const p of H.products) {
      s.inventory[p.id] = {qty: 0, cost: 0};
      s.market[p.id] = {price: p.base, previous: p.base, trend: 0, history: [p.base], low: p.base, high: p.base};
      s.stats.byProduct[p.id] = 0;
      s.absence[p.id] = 0;
      s.onStreak[p.id] = 0;
    }
    for (const p of H.legacyProducts) {
      s.legacy[p.id] = blankLegacy(p);
      s.stats.byProduct[p.id] = 0;
    }
    s.listing = H.initialListing(s);
    for (const p of H.products) {
      const on = s.listing.includes(p.id);
      s.absence[p.id] = on ? 0 : 1;
      s.onStreak[p.id] = on ? 1 : 0;
    }
    H.record(s); H.validate(s);
    return s;
  };
  H.migrateV2 = function (raw, backup) {
    if (!raw || raw.status !== 'playing') throw Error('已结束旧档不迁移');
    if (!H.v2 || !H.v2.validate(raw)) throw Error('旧档校验失败');
    const book = H.priceBooks['0.2'][raw.difficulty];
    if (!book) throw Error('旧档难度无效');
    if (H.v2.houseValue(raw) !== (raw.house ? book.houses[raw.house] : 0)) throw Error('旧住房价与价格簿不一致');
    if (raw.stats.warehouseSpent !== book.warehouses[raw.warehouse]) throw Error('旧仓储价与价格簿不一致');
    const s = H.create(raw.seed, raw.difficulty);
    s.week = raw.week;
    s.cash = raw.cash;
    s.capacity = raw.capacity;
    s.warehouse = raw.warehouse;
    s.revision = raw.revision;
    s.house = raw.house;
    s.macro = raw.macro;
    s.season = raw.season;
    s.personal = raw.personal;
    s.personalEvent = raw.personalEvent;
    s.history = H.clone(raw.history);
    s.stats = H.clone(raw.stats);
    s.activeEvents = [];
    s.rng.market = raw.rng.market;
    s.rng.events = raw.rng.events;
    s.rng.visual = raw.rng.visual;
    s.rng.listing = H.seed(raw.seed + ':listing:' + raw.week + ':' + raw.revision);
    for (const p of H.products) {
      s.inventory[p.id] = H.clone(raw.inventory[p.id]);
      s.market[p.id] = H.clone(raw.market[p.id]);
    }
    for (const p of H.legacyProducts) {
      const src = raw.market[p.id];
      s.legacy[p.id] = {qty: raw.inventory[p.id].qty, cost: raw.inventory[p.id].cost,
        price: src.price, previous: src.previous, trend: src.trend, history: src.history.slice(), low: src.low, high: src.high};
    }
    s.listing = H.initialListing(s);
    for (const p of H.products) {
      const on = s.listing.includes(p.id);
      s.absence[p.id] = on ? 0 : 1;
      s.onStreak[p.id] = on ? 1 : 0;
    }
    s.migration = {fromVersion: 2, fromRules: '0.2', atWeek: raw.week, backup};
    s.news = [];
    const moves = H.products.filter(p => Math.abs(H.changeBps(s.market[p.id])) >= H.rules.headlineMoveBps)
      .sort((a, b) => Math.abs(H.changeBps(s.market[b.id])) - Math.abs(H.changeBps(s.market[a.id])));
    if (moves.length) {
      const bps = H.changeBps(s.market[moves[0].id]);
      s.news.push({id: 'move', title: moves[0].name + '本周价格已经明显变动', reliability: 'normal', week: s.week,
        kind: 'headline', productId: moves[0].id, changeBps: bps, fresh: true});
    }
    if (s.cash !== raw.cash || JSON.stringify(s.history) !== JSON.stringify(raw.history) || s.stats.warehouseSpent !== raw.stats.warehouseSpent || H.houseValue(s) !== H.v2.houseValue(raw)) {
      throw Error('迁移改变了现金、历史或住房仓储价');
    }
    H.validate(s);
    return s;
  };
  H.Engine = function (seed, difficulty) {
    let state = H.create(seed, difficulty), seen = new Set();
    this.onCommit = null;
    this.snapshot = () => H.clone(state);
    const blankDiag = () => ({clips: 0, persistCapTriggers: 0, specStarts: 0, specStartClips: 0,
      eventStartedClips: 0, noEventStartedClips: 0, eventStartedWeeks: 0, noEventStartedWeeks: 0,
      byProduct: {}, persistCapped: {}, clipLog: []});
    let diag = blankDiag();
    this.restore = s => {
      H.validate(s);
      state = H.clone(s);
      seen = new Set();
      diag = blankDiag();
    };
    this.diagnostics = () => ({clips: diag.clips, persistCapTriggers: diag.persistCapTriggers, specStarts: diag.specStarts, specStartClips: diag.specStartClips,
      eventStartedClips: diag.eventStartedClips, noEventStartedClips: diag.noEventStartedClips,
      eventStartedWeeks: diag.eventStartedWeeks, noEventStartedWeeks: diag.noEventStartedWeeks,
      byProduct: Object.assign({}, diag.byProduct), persistCapped: Object.assign({}, diag.persistCapped),
      clipLog: diag.clipLog.map(row => Object.assign({}, row, {clipped: row.clipped.slice(), startedProducts: row.startedProducts.slice(),
        persistCapped: row.persistCapped.slice(), persistProducts: row.persistProducts.slice()}))});
    this.visible = () => ({seed: state.seed, difficulty: state.difficulty, week: state.week, revision: state.revision,
      cash: state.cash, capacity: state.capacity, warehouse: state.warehouse, house: state.house, status: state.status,
      priceBook: H.clone(state.priceBook), listing: state.listing.slice(), inventory: H.clone(state.inventory),
      legacy: Object.fromEntries(H.legacyProducts.map(p => [p.id, {qty: state.legacy[p.id].qty, cost: state.legacy[p.id].cost, price: state.legacy[p.id].price, previous: state.legacy[p.id].previous}])),
      news: H.clone(state.news), assets: H.assets(state), liquid: H.liquidValue(state),
      market: Object.fromEntries(H.products.map(p => { const m = state.market[p.id]; return [p.id,
        {price: m.price, previous: m.previous, history: m.history.slice(), low: m.low, high: m.high}]; }))});
    this.dispatch = op => {
      try {
        if (!op || typeof op.token !== 'string' || !op.token.length) throw Error('操作标识缺失');
        if (op.type === 'end' && state.status === 'ended') return {ok: true, result: H.clone(state.result)};
        if (seen.has(op.token)) throw Error('重复提交');
        if (op.revision !== state.revision) throw Error('操作已过期');
        if (state.status !== 'playing') throw Error('本年已结束');
        const next = H.clone(state);
        let pending = null;
        switch (op.type) {
          case 'buy': case 'sell': H.trade(next, op.type, op.id, op.qty); break;
          case 'house': H.buyHouse(next, op.id); break;
          case 'warehouse': H.upgradeWarehouse(next, op.id); break;
          case 'next':
            if (next.week === 52) throw Error('第52周请结束本年');
            next.week++;
            H.environment(next); H.rotate(next); H.drawEvents(next); H.trends(next);
            pending = H.prices(next);
            pending.week = next.week;
            H.personal(next); H.news(next); break;
          case 'end':
            if (next.week !== 52) throw Error('尚未到年底');
            next.status = 'ended'; break;
          default: throw Error('未知操作');
        }
        H.record(next); next.revision++;
        if (next.status === 'ended') next.result = H.summary(next);
        H.validate(next);
        state = next; seen.add(op.token);
        if (pending) {
          diag.clips += pending.clips;
          diag.persistCapTriggers += pending.persistCapTriggers;
          diag.specStarts += pending.specStarts;
          diag.specStartClips += pending.specStartClips;
          for (const id of pending.clipped) diag.byProduct[id] = (diag.byProduct[id] || 0) + 1;
          for (const id of pending.persistCapped) diag.persistCapped[id] = (diag.persistCapped[id] || 0) + 1;
          if (pending.eventStarted) { diag.eventStartedClips += pending.clips; diag.eventStartedWeeks++; }
          else { diag.noEventStartedClips += pending.clips; diag.noEventStartedWeeks++; }
          diag.clipLog.push({week: pending.week, clips: pending.clips, clipped: pending.clipped.slice(),
            startedProducts: pending.startedProducts.slice(), persistCapTriggers: pending.persistCapTriggers,
            persistCapped: pending.persistCapped.slice(), persistProducts: pending.persistProducts.slice(),
            specStarts: pending.specStarts, specStartClips: pending.specStartClips, eventStarted: pending.eventStarted});
        }
        let saveError = null;
        if (this.onCommit) {
          try { this.onCommit(this.snapshot()); } catch (e) { saveError = e.message; }
        }
        return {ok: true, saveError, result: state.result ? H.clone(state.result) : null};
      } catch (e) { return {ok: false, error: e.message}; }
    };
  };
})(window.HomeYear);
