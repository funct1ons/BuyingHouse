(function (H) {
  'use strict';
  H.int = function (n, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(n) || n < min || n > max) throw Error('数值必须是范围内的安全整数');
    return n;
  };
  H.add = (a,b) => H.int(a+b);
  H.mul = (a,b) => H.int(a*b);
  H.clone = function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value)) out[key] = clone(value[key]);
      return out;
    }
    return value;
  };
  H.random = function (s, stream) {
    let x = s.rng[stream] >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.rng[stream] = x >>> 0;
    return (x >>> 0) / 4294967296;
  };
  H.seed = function (text) {
    let x = 2166136261;
    for (let i=0;i<text.length;i++) x = Math.imul(x ^ text.charCodeAt(i),16777619);
    return (x >>> 0) || 1;
  };
  H.product = id => {
    const p = H.products.find(x => x.id === id);
    if (!p) throw Error('未知商品');
    return p;
  };
  H.holding = id => {
    const p = H.products.find(x => x.id === id) || H.legacyProducts.find(x => x.id === id);
    if (!p) throw Error('未知商品');
    return p;
  };
  H.heldProducts = () => H.products.concat(H.legacyProducts);
  H.quoteOf = (s,id) => id in s.inventory ? s.market[id] : s.legacy[id];
  H.qtyOf = (s,id) => H.quoteOf(s,id) && (id in s.inventory ? s.inventory[id].qty : s.legacy[id].qty);
  H.costOf = (s,id) => id in s.inventory ? s.inventory[id].cost : s.legacy[id].cost;
  H.difficulty = s => H.difficulties[s.difficulty];
  H.publishedBook = s => {
    const table = H.priceBooks[s.priceBook && s.priceBook.id];
    const book = table && table[s.difficulty];
    if (!book) throw Error('价格簿无效');
    return book;
  };
  H.housePrice = (s,h) => {
    const houses = s.priceBook && s.priceBook.houses;
    if (!houses || !Object.prototype.hasOwnProperty.call(houses, h.id)) throw Error('价格簿无效');
    return H.int(houses[h.id]);
  };
  H.warehousePrice = (s,w) => {
    const warehouses = s.priceBook && s.priceBook.warehouses;
    if (!warehouses || !Object.prototype.hasOwnProperty.call(warehouses, w.id)) throw Error('价格簿无效');
    return H.int(warehouses[w.id]);
  };
  H.used = s => H.heldProducts().reduce((n,p) => H.add(n, H.mul(H.qtyOf(s,p.id), p.size)), 0);
  H.inventoryValue = s => H.heldProducts().reduce((n,p) => H.add(n, H.mul(H.qtyOf(s,p.id), H.quoteOf(s,p.id).price)), 0);
  H.houseValue = s => s.house ? H.housePrice(s, H.houses.find(h => h.id === s.house)) : 0;
  // Closed form from the published base. Shocks with week<=target apply once, not each later week.
  H.houseAt = function (baseFen, week, housingLog) {
    H.int(baseFen);
    H.int(week, 1, 52);
    if (!Array.isArray(housingLog)) throw Error('住房冲击无效');
    let num = 1n, den = 1n;
    const steps = BigInt(week - 1);
    num *= 101n ** steps;
    den *= 100n ** steps;
    for (const entry of housingLog) {
      if (!entry || !Number.isSafeInteger(entry.week) || entry.week > week) continue;
      const ev = H.housingEvents.find(e => e.id === entry.id);
      if (!ev) throw Error('住房冲击无效');
      num *= BigInt(ev.numer);
      den *= BigInt(ev.denom);
    }
    return H.int(Number((BigInt(baseFen) * num + den / 2n) / den));
  };
  H.houseQuote = function (state, houseId, week = state.week) {
    const book = H.publishedBook(state);
    if (!Object.prototype.hasOwnProperty.call(book.houses, houseId)) throw Error('住房无效');
    return H.houseAt(book.houses[houseId], week, state.housingLog || []);
  };
  H.houseChangeBps = function (state, houseId) {
    if (state.week <= 1) return 0;
    const today = H.houseQuote(state, houseId, state.week);
    const yesterday = H.houseQuote(state, houseId, state.week - 1);
    return Math.round((today - yesterday) / yesterday * 10000);
  };
  H.maxHouseValue = function (difficulty) {
    const book = H.priceBooks['0.4'][difficulty];
    if (!book) throw Error('难度无效');
    const log = [{id: 'housing_stimulus', week: 6}, {id: 'housing_first', week: 6}];
    let max = 0;
    for (const price of Object.values(book.houses)) max = Math.max(max, H.houseAt(price, 52, log));
    return max;
  };
  H.assets = s => H.add(H.add(s.cash, H.inventoryValue(s)), H.houseValue(s));
  H.fee = amount => H.int(Math.ceil(amount * H.rules.fee));
  H.buybackQuote = price => {
    const q = Math.floor(price * H.rules.buybackNumer / H.rules.buybackDenom);
    if (q >= 1) return q;
    return price >= 1 ? 1 : 0;
  };
  H.channelUnit = (s,id) => {
    const price = H.quoteOf(s,id).price;
    if (H.legacyProducts.some(p => p.id === id) || !s.listing.includes(id)) return H.buybackQuote(price);
    return price;
  };
  H.channelGross = (s,id,qty) => H.mul(H.channelUnit(s,id), qty);
  H.channelNet = (s,id,qty) => {
    const gross = H.channelGross(s,id,qty);
    return gross - H.fee(gross);
  };
  H.liquidValue = s => H.heldProducts().reduce((n,p) => {
    const qty = H.qtyOf(s,p.id);
    return qty ? H.add(n, H.channelNet(s,p.id,qty)) : n;
  }, 0);
  H.changeBps = m => m.previous ? Math.round((m.price - m.previous) / m.previous * 10000) : 0;
  // Dedicated seed derivation: does not advance any economic or visual stream.
  H.calendarStart = seed => H.seed(seed + ':calendar') % 52 + 1;
  H.calendarWeek = (s, week = s.week) => (s.calendarStartWeek + week - 2) % 52 + 1;
  H.seasonAt = calendarWeek => ['冬','春','夏','秋'][Math.floor((calendarWeek-1)/13)];
})(window.HomeYear);
