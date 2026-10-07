(function (H) {
  'use strict';
  function blankLegacy(p) {
    return {qty: 0, cost: 0, price: p.base, previous: p.base, trend: 0, history: [p.base], low: p.base, high: p.base};
  }
  function priceBook(difficulty) {
    const published = H.priceBooks['0.4'][difficulty];
    return {id: '0.4', houses: H.clone(published.houses), warehouses: H.clone(published.warehouses)};
  }
  H.create = function (seed = 'CITY-382741', difficulty = 'standard') {
    if (typeof seed !== 'string' || !seed.length || seed.length > 128) throw Error('种子不能为空或过长');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties, difficulty)) throw Error('难度无效');
    const s = {version: H.rules.saveVersion, rulesVersion: H.rules.version, seed, difficulty,
      calendarStartWeek: H.calendarStart(seed), week: 1, cash: H.difficulties[difficulty].initialCash, capacity: H.rules.capacity, warehouse: 'room',
      revision: 0, status: 'playing', house: null, result: null, rng: {}, inventory: {}, market: {}, activeEvents: [],
      macro: 1, season: H.seasonAt(H.calendarStart(seed)), personal: 0, personalEvent: null, news: [], rumors: [], history: [], stats: {},
      listing: [], absence: {}, onStreak: {}, legacy: {}, migration: null, upgrade: null, swanLog: [], housingLog: [], purchases: [], houseBasis: 0, priceBook: priceBook(difficulty),
      loan: {principal: 0, interestDue: 0}};
    for (const key of H.statFields) s.stats[key] = 0;
    s.stats.byProduct = {};
    for (const stream of ['market', 'events', 'visual', 'listing', 'housing', 'lottery']) s.rng[stream] = H.seed(seed + ':' + stream);
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
    const startId = H.difficulties[difficulty].startWarehouse;
    if (startId && startId !== 'room') {
      const w = H.warehouses.find(x => x.id === startId);
      const price = H.warehousePrice(s, w);
      s.warehouse = w.id;
      s.capacity = w.capacity;
      s.cash -= price;
      s.stats.warehouseSpent = price;
      s.stats.upgrades = H.warehouses.findIndex(x => x.id === startId);
    }
    const startLoan = H.difficulties[difficulty].startLoan;
    if (startLoan) {
      H.borrowLoan(s, startLoan);
      H.accrueLoan(s);
    }
    s.rumors = H.makeRumors(s);
    H.record(s); H.validate(s);
    return s;
  };
  // Historical 0.5 conversion code retained below; unavailable in development rules 0.6.
  H.migrateV3 = function (raw, backup) {
    throw Error(H.oldSaveNotice);
    if (!H.v3 || !H.v3.validate(raw)) throw Error('旧 v3 校验失败');
    const s = H.clone(raw);
    s.version = H.rules.saveVersion;
    s.rulesVersion = H.rules.version;
    s.swanLog = [];
    s.upgrade = {fromVersion: 3, fromRules: '0.4', atWeek: raw.week, backup};
    H.validate(s);
    return s;
  };
  H.migrateV2 = function (raw, backup) {
    throw Error(H.oldSaveNotice);
    // Convert inside the immutable 0.4 context, never write an intermediate v3 key.
    if (!H.v3) throw Error('冻结旧规则转换不可用');
    const s = H.clone(H.v3.migrateV2(raw, backup));
    s.version = H.rules.saveVersion;
    s.rulesVersion = H.rules.version;
    s.swanLog = [];
    s.upgrade = null;
    H.validate(s);
    return s;
  };
  H.Engine = function (seed, difficulty) {
    let state = H.create(seed, difficulty), seen = new Set();
    this.onCommit = null;
    this.snapshot = () => H.clone(state);
    const blankDiag = () => ({clips: 0, persistCapTriggers: 0, specStarts: 0, specStartClips: 0,
      eventStartedClips: 0, noEventStartedClips: 0, eventStartedWeeks: 0, noEventStartedWeeks: 0,
      byProduct: {}, persistCapped: {}, clipLog: [], eventLog: []});
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
      eventLog: H.clone(diag.eventLog),
      clipLog: diag.clipLog.map(row => Object.assign({}, row, {clipped: row.clipped.slice(), startedProducts: row.startedProducts.slice(),
        persistCapped: row.persistCapped.slice(), persistProducts: row.persistProducts.slice()}))});
    this.visible = () => ({seed: state.seed, difficulty: state.difficulty, week: state.week, revision: state.revision,
      calendarStartWeek: state.calendarStartWeek, calendarWeek: H.calendarWeek(state), season: state.season,
      cash: state.cash, capacity: state.capacity, warehouse: state.warehouse, house: state.house, status: state.status,
      priceBook: H.clone(state.priceBook), purchases: H.clone(state.purchases), housingLog: H.clone(state.housingLog),
      listing: state.listing.slice(), inventory: H.clone(state.inventory),
      legacy: Object.fromEntries(H.legacyProducts.map(p => [p.id, {qty: state.legacy[p.id].qty, cost: state.legacy[p.id].cost, price: state.legacy[p.id].price, previous: state.legacy[p.id].previous}])),
      news: H.clone(state.news), rumors: H.clone(state.rumors), assets: H.assets(state), liquid: H.liquidValue(state),
      loan: {principal: state.loan.principal, interestDue: state.loan.interestDue, interestNext: H.loanInterest(state), open: H.loanOpen(state)},
      lottery: {price: H.lotteryRules.price, count: state.stats.lotteryCount},
      market: Object.fromEntries(H.products.map(p => { const m = state.market[p.id]; return [p.id,
        {price: m.price, previous: m.previous, history: m.history.slice(), low: m.low, high: m.high}]; }))});
    this.dispatch = op => {
      try {
        if (!op || typeof op.token !== 'string' || !op.token.length) throw Error('操作标识缺失');
        if (op.type === 'end' && state.status === 'ended') return {ok: true, result: H.clone(state.result)};
        if (seen.has(op.token)) throw Error('重复提交');
        if (op.revision !== state.revision) throw Error('操作已过期');
        if (state.status === 'ended') throw Error('本年已结束');
        if (state.status === 'rebuy' && !['house', 'end'].includes(op.type)) throw Error('拍卖后仅可再买一次住房或结束结算');
        const next = H.clone(state);
        let pending = null, eventDiag = null, card = null;
        switch (op.type) {
          case 'buy': case 'sell': H.trade(next, op.type, op.id, op.qty); break;
          case 'house':
            H.buyHouse(next, op.id);
            if (state.status === 'rebuy') next.status = 'ended';
            break;
          case 'warehouse': H.upgradeWarehouse(next, op.id); break;
          case 'loan': H.borrowLoan(next, op.id); break;
          case 'repay': H.repayLoan(next, op.id); break;
          case 'lottery': card = H.buyLottery(next); break;
          case 'next':
            if (next.week === 52) throw Error('第52周请结束本年');
            ({pending, eventDiag} = H.advanceMarket(next));
            H.accrueLoan(next);
            H.personal(next); H.news(next);
            next.rumors = H.makeRumors(next); break;
          case 'end':
            if (next.week !== 52) throw Error('尚未到年底');
            if (state.status === 'rebuy') { next.status = 'ended'; break; }
            if (next.loan.principal > 0) H.accrueLoan(next);
            if (H.loanOpen(next) && next.house) H.auctionHouse(next);
            else next.status = 'ended';
            break;
          default: throw Error('未知操作');
        }
        if (H.difficulty(next).luck && next.status === 'playing' && next.week < 52 && op.type !== 'next') next.rumors = H.makeRumors(next);
        H.record(next); next.revision++;
        if (next.status === 'ended') next.result = H.summary(next);
        H.validate(next);
        state = next; seen.add(op.token);
        if (pending) {
          diag.eventLog.push({...eventDiag, changes: Object.fromEntries(H.products.map(p => [p.id, H.changeBps(next.market[p.id])])),
            clipped: pending.clipped.slice(), persistCapped: pending.persistCapped.slice()});
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
        const out = {ok: true, saveError, result: state.result ? H.clone(state.result) : null};
        if (op.type === 'lottery') out.card = H.clone(card);
        return out;
      } catch (e) { return {ok: false, error: e.message}; }
    };
  };
})(window.HomeYear);
