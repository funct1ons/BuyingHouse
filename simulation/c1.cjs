'use strict';
// C1 diagnostic runner. Decision functions read Engine.visible only.
// Outcome stats are measured after the decision. This file does not change house prices.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.join(__dirname, '..'), window = {};
const coreFiles = ['data', 'math', 'v2-baseline', 'market', 'trading', 'statistics', 'validation', 'game', 'save'];
for (const name of coreFiles) new Function('window', fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'))(window);
const H = window.HomeYear;
const args = process.argv.slice(2);
const get = (key, fallback) => { const i = args.indexOf('--' + key); return i < 0 ? fallback : args[i + 1]; };
const count = Number(get('seeds', 30));
const prefix = get('prefix', 'gameplay-v4-c1');
const mode = get('mode', 'c1');
const out = get('out', 'docs/gameplay-v4-c1-r2.json');
const reportOut = get('report', 'docs/gameplay-v4-c1-r2.md');
if (!Number.isInteger(count) || count < 1) throw Error('Invalid seed count');
if (!['c1', 'primary', 'holdout'].includes(mode)) throw Error('mode must be c1, primary, or holdout');
if (mode !== 'c1' && get('approved', '') !== 'yes') throw Error('formal mode needs --approved yes');
if (mode === 'c1' && count > 30 && get('approved', '') !== 'yes') throw Error('c1 sample above 30 needs --approved yes');
if (String(prefix).toLowerCase().includes('holdout') && mode !== 'holdout' && get('allow-holdout', '') !== 'yes') throw Error('holdout prefix needs --mode holdout');
const historical = ['docs/gameplay-v4-c1.json', 'docs/gameplay-v4-c1.md'];
for (const file of [out, reportOut]) {
  const norm = String(file).replace(/\\/g, '/');
  if (/balance-/i.test(norm) || historical.includes(norm)) throw Error('refusing to overwrite historical report ' + norm);
}
const strategies = ['conservative', 'random', 'momentum', 'value', 'event-aware', 'idle'];
const parameters = {
  informationBoundary: 'Engine.visible 的公开字段，加商品资料 role、lowRef、basePrice、size、category。不读 snapshot、activeEvents、onStreak、absence、rng、trend，也不读下一周价格。',
  sellGain: '收益 = (H.channelNet(visible, id, qty) - cost) / cost。不用 price * 0.99。',
  buyCheck: '当前 listing 含该 id，空间够，qty * price + fee <= min(cash, budget)。dispatch 失败就抛出，不吞掉。',
  housing: '每周没有住房且现金够本局 priceBook 最低档，就买最低档。第 52 周这次检查发生在清仓之前。非 idle 再按当前渠道卖光持仓，然后买现金加现房价值够到的最高档。idle 不清仓。成功只看实际买到的住房 id。',
  warehouse: '沿用旧模拟：非 idle、周数 < 38、占用 >= 容量 80%、现金 > 升级差价的 2 倍，就升一档。随机策略在独立政策随机数 < 0.25 时才升。',
  everLowCash: '每次成功 dispatch 之后记录现金。年内最低现金 < 起步现金的 10%，记 everLowCash。',
  terminalLowCash: '终局现金 < 起步现金的 10%，记 terminalLowCash。不与 everLowCash 混用。前一版表头「极低现金」实际是终局口径，且 minCash 只在周初读取。',
  bankrupt: '年内最低现金 <= 0。最低现金含买入、租仓和买房之后。',
  capacityStuck: '当周占用 >= 容量 95%，且现金够买一件当前在售、但剩余空间放不下的商品。组比率是这种周数 >= 4 的局占比。',
  newEventMoves: 'visible 头条存在且 id 不是 move。统计该周全部 12 个商品，含未受影响商品。不是“只有受影响商品”。',
  noNewEventMoves: '没有新事件头条。持续项和结构项仍可能在作用，不叫无事件背景。统计全部 12 个商品。',
  affectedFirstShock: '只统计冲击首周、本周效果命中的商品。事后从 H.prices 返回值连接，决策函数不读它。',
  sampleDependence: '同一难度 30 条价格路径被 6 个策略重复。可以对照策略，不能把观测数乘 6 当成独立样本。',
  clip: 'H.prices 返回本次诊断。raw !== clamped 才计钳制。贴界且 raw 未越出不算。persistCap 触发单独计数，不并进钳制。诊断在 validate 成功并提交后才累加，restore 重置，拒绝的 next 不增加。',
  sensitivityNoWarehouse: '同一种子、同一买卖和住房规则。仓储函数仍抽随机数以保持随机策略的序列，但不提交升级。只诊断共同 80% 租仓政策，不是第七个正式策略。',
  wilsonZ: 1.959963984540054,
  seeds: 'prefix-0 到 prefix-(n-1)，同一序号跨策略配对。本轮不使用留出种子。',
  conservative: {buyRatioBelow: 0.92, cashShare: 0.4, sellGainAtLeast: 0.08, sellRatioAtLeast: 1.03, stopGainBelow: -0.18},
  random: {sellChance: 0.5, buyChance: 0.5, cashShareMin: 0.2, cashShareSpan: 0.6, warehouseChance: 0.25, rng: 'H.seed("policy:"+seed+":"+strategy)，不碰引擎四个随机流'},
  momentum: {riseAbove: 1.025, priceOverBaseBelow: 1.55, cashShare: 0.8, sellBelowPrevious: 0.985, sellGainAtLeast: 0.2, stopGainBelow: -0.15},
  value: {buyRatioBelow: 0.84, cashShare: 0.8, sellGainAtLeast: 0.18, sellRatioAtLeast: 1.03, stopGainBelow: -0.3, offSale: '未上架时，卖出能腾出空间、并且 channelNet 加现有现金够买那件被挡住的折价商品的最少数量。同一周按卖出后的新 visible 再比较。'},
  eventAware: {sellOffListing: true, sellLegacy: true, sellNewsBpsAtMost: -800, stopGainBelow: -0.12, buyFreshNewsBpsAtLeast: 800, cashShare: 0.6},
  idle: '不买卖商品。共同住房规则仍然生效。'
};
const publicKeys = ['seed', 'difficulty', 'week', 'revision', 'cash', 'capacity', 'warehouse', 'house', 'status', 'priceBook', 'listing', 'inventory', 'legacy', 'news', 'assets', 'liquid', 'market'];

function quantile(list, q) {
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * q)];
}
function wilson(k, n) {
  if (!n) return {low: null, high: null};
  const z = parameters.wilsonZ, p = k / n, z2 = z * z, den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / den;
  return {low: Math.max(0, center - margin), high: Math.min(1, center + margin)};
}
function assertPublic(v) {
  for (const key of ['rng', 'activeEvents', 'onStreak', 'absence', 'macro', 'personal', 'stats']) {
    if (key in v) throw Error('visible leaked ' + key);
  }
  for (const id of Object.keys(v.market)) if ('trend' in v.market[id]) throw Error('visible market leaked hidden field');
  for (const id of Object.keys(v.legacy)) if (v.legacy[id] && 'trend' in v.legacy[id]) throw Error('visible legacy leaked hidden field');
}
function playerView(v) {
  assertPublic(v);
  const out = {};
  for (const key of publicKeys) out[key] = v[key];
  return out;
}
function qtyOf(v, id) {
  if (v.inventory[id]) return v.inventory[id].qty;
  return v.legacy && v.legacy[id] ? v.legacy[id].qty : 0;
}
function costOf(v, id) {
  if (v.inventory[id]) return v.inventory[id].cost;
  return v.legacy[id].cost;
}
function gain(v, id) {
  const qty = qtyOf(v, id);
  if (!qty) return 0;
  const cost = costOf(v, id);
  return cost ? (H.channelNet(v, id, qty) - cost) / cost : 0;
}
function maxBuy(v, id, budget) {
  const p = H.products.find(x => x.id === id);
  if (!p || !v.listing.includes(id)) return 0;
  const price = v.market[id].price;
  const room = Math.floor((v.capacity - H.used(v)) / p.size);
  let n = Math.min(room, Math.floor(Math.min(v.cash, budget) / price));
  while (n > 0 && n * price + H.fee(n * price) > Math.min(v.cash, budget)) n--;
  return n;
}
function affordableUnits(cash, price) {
  if (price <= 0) return 0;
  let n = Math.floor(cash / price);
  while (n > 0 && n * price + H.fee(n * price) > cash) n--;
  return n;
}
function offSaleSellQty(v, holding) {
  if (v.listing.includes(holding.id)) return 0;
  const held = qtyOf(v, holding.id);
  if (!held) return 0;
  const free = v.capacity - H.used(v);
  for (let q = 1; q <= held; q++) {
    const space = free + q * holding.size;
    const cash = v.cash + H.channelNet(v, holding.id, q);
    const opens = H.products.some(p => v.listing.includes(p.id)
      && v.market[p.id].price / p.basePrice < parameters.value.buyRatioBelow
      && p.size > free && p.size <= space
      && cash >= v.market[p.id].price + H.fee(v.market[p.id].price));
    if (opens) return q;
  }
  return 0;
}
function decideSells(strategy, v, rand) {
  if (strategy === 'idle' || v.week >= 52) return [];
  const out = [];
  if (strategy === 'random') {
    const held = H.products.filter(p => qtyOf(v, p.id)).concat(H.legacyProducts.filter(p => qtyOf(v, p.id)));
    if (held.length && rand() < parameters.random.sellChance) {
      const p = held[Math.floor(rand() * held.length)];
      const qty = Math.max(1, Math.min(qtyOf(v, p.id), Math.floor(qtyOf(v, p.id) * (.25 + .75 * rand()))));
      out.push({type: 'sell', id: p.id, qty});
    }
    return out;
  }
  for (const p of H.products) {
    const qty = qtyOf(v, p.id);
    if (!qty) continue;
    const m = v.market[p.id], g = gain(v, p.id), ratio = m.price / p.basePrice;
    const news = (v.news || []).find(n => n.productId === p.id);
    const off = !v.listing.includes(p.id);
    const sell = strategy === 'conservative' ? (g >= parameters.conservative.sellGainAtLeast || ratio >= parameters.conservative.sellRatioAtLeast || g < parameters.conservative.stopGainBelow)
      : strategy === 'value' ? (g >= parameters.value.sellGainAtLeast || ratio >= parameters.value.sellRatioAtLeast || g < parameters.value.stopGainBelow)
      : strategy === 'momentum' ? (m.price < m.previous * parameters.momentum.sellBelowPrevious || g >= parameters.momentum.sellGainAtLeast || g < parameters.momentum.stopGainBelow)
      : strategy === 'event-aware' ? (off || (news && news.changeBps <= parameters.eventAware.sellNewsBpsAtMost) || g < parameters.eventAware.stopGainBelow)
      : false;
    if (sell) out.push({type: 'sell', id: p.id, qty});
    else if (strategy === 'value') {
      const partial = offSaleSellQty(v, p);
      if (partial) out.push({type: 'sell', id: p.id, qty: partial});
    }
  }
  if (strategy === 'event-aware') {
    for (const p of H.legacyProducts) if (qtyOf(v, p.id)) out.push({type: 'sell', id: p.id, qty: qtyOf(v, p.id)});
  }
  return out;
}
function decideBuy(strategy, v, rand) {
  if (strategy === 'idle' || v.week >= 52) return null;
  if (strategy === 'random') {
    if (rand() < parameters.random.buyChance) return null;
    const listed = v.listing.slice();
    if (!listed.length) return null;
    const id = listed[Math.floor(rand() * listed.length)];
    const qty = maxBuy(v, id, Math.floor(v.cash * (parameters.random.cashShareMin + parameters.random.cashShareSpan * rand())));
    return qty > 0 ? {type: 'buy', id, qty} : null;
  }
  const listed = H.products.filter(p => v.listing.includes(p.id));
  let picks = [];
  if (strategy === 'conservative') {
    picks = listed.filter(p => (p.role === 'daily' || p.lowRef) && v.market[p.id].price / p.basePrice < parameters.conservative.buyRatioBelow)
      .sort((a, b) => v.market[a.id].price / a.basePrice - v.market[b.id].price / b.basePrice);
  } else if (strategy === 'value') {
    picks = listed.filter(p => v.market[p.id].price / p.basePrice < parameters.value.buyRatioBelow)
      .sort((a, b) => v.market[a.id].price / a.basePrice - v.market[b.id].price / b.basePrice);
  } else if (strategy === 'momentum') {
    picks = listed.filter(p => v.market[p.id].price / v.market[p.id].previous > parameters.momentum.riseAbove && v.market[p.id].price / p.basePrice < parameters.momentum.priceOverBaseBelow)
      .sort((a, b) => v.market[b.id].price / v.market[b.id].previous - v.market[a.id].price / v.market[a.id].previous);
  } else if (strategy === 'event-aware') {
    const up = new Set((v.news || []).filter(n => n.fresh && n.productId && n.changeBps >= parameters.eventAware.buyFreshNewsBpsAtLeast).map(n => n.productId));
    picks = listed.filter(p => up.has(p.id)).sort((a, b) => {
      const ba = (v.news.find(n => n.productId === b.id) || {changeBps: 0}).changeBps;
      const aa = (v.news.find(n => n.productId === a.id) || {changeBps: 0}).changeBps;
      return ba - aa;
    });
  }
  if (!picks.length) return null;
  const share = strategy === 'conservative' ? parameters.conservative.cashShare : strategy === 'event-aware' ? parameters.eventAware.cashShare : strategy === 'momentum' ? parameters.momentum.cashShare : parameters.value.cashShare;
  const qty = maxBuy(v, picks[0].id, Math.floor(v.cash * share));
  return qty > 0 ? {type: 'buy', id: picks[0].id, qty} : null;
}
function warehouse(strategy, v, rand) {
  if (strategy === 'idle' || v.week >= 38) return null;
  if (H.used(v) < v.capacity * .8) return null;
  const index = H.warehouses.findIndex(w => w.id === v.warehouse);
  const next = H.warehouses[index + 1];
  if (!next) return null;
  const due = H.warehousePrice(v, next) - H.warehousePrice(v, H.warehouses[index]);
  if (v.cash <= due * 2) return null;
  if (strategy === 'random' && rand() >= parameters.random.warehouseChance) return null;
  return {type: 'warehouse', id: next.id};
}
function housing(v) {
  if (!v.house && v.cash >= H.housePrice(v, H.houses[0])) return {type: 'house', id: H.houses[0].id};
  return null;
}
function yearEndHouse(v) {
  let best = null;
  for (let h = H.houses.length - 1; h >= 0; h--) {
    if (H.houses.findIndex(x => x.id === v.house) >= h) break;
    if (v.cash + H.houseValue(v) >= H.housePrice(v, H.houses[h])) { best = H.houses[h].id; break; }
  }
  return best ? {type: 'house', id: best} : null;
}
function stuck(v) {
  if (H.used(v) < v.capacity * .95) return false;
  return H.products.some(p => v.listing.includes(p.id) && v.capacity - H.used(v) < p.size && v.cash >= v.market[p.id].price + H.fee(v.market[p.id].price));
}

const policySource = [decideSells, decideBuy, housing, warehouse, yearEndHouse, offSaleSellQty, maxBuy, gain, playerView].map(fn => fn.toString()).join('\n');
for (const banned of ['snapshot', 'activeEvents', 'onStreak', 'absence', '.rng', 'diagnostics', 'price * .99', 'price*.99']) {
  if (policySource.includes(banned)) throw Error('policy sees hidden or approximate sell path: ' + banned);
}
if (policySource.includes('trend')) throw Error('policy sees hidden or approximate sell path: trend');

function run(seed, difficulty, strategy, rentWarehouse) {
  const e = new H.Engine(seed, difficulty);
  const policy = {rng: {policy: H.seed('policy:' + seed + ':' + strategy)}};
  const rand = () => H.random(policy, 'policy');
  let token = 0;
  const observed = {noNewEvent: [], newEvent: [], noNewEventByRole: {daily: [], industry: [], spec: []}, bpsByWeek: {}, newEventByWeek: {}, minAsks: [], afford: [],
    buybacks: 0, buybackQty: 0, absentWeeks: 0, stuckWeeks: 0, minCash: Infinity, headlineChecks: 0, headlineMatches: 0};
  function noteCash() { observed.minCash = Math.min(observed.minCash, e.visible().cash); }
  function apply(action) {
    if (!action) return;
    const v = playerView(e.visible());
    if (action.type === 'buy') {
      if (!v.listing.includes(action.id) || maxBuy(v, action.id, v.cash) < action.qty) throw Error(seed + '/' + strategy + ' illegal buy ' + action.id);
    }
    if (action.type === 'sell' && !v.listing.includes(action.id)) {
      observed.buybacks++;
      observed.buybackQty += action.qty;
    }
    const r = e.dispatch({type: action.type, id: action.id, qty: action.qty, revision: v.revision, token: 'c1-' + (++token)});
    if (!r.ok) throw Error(seed + '/' + strategy + '/' + action.type + ': ' + r.error);
    noteCash();
  }
  for (let week = 1; week <= 52; week++) {
    let v = playerView(e.visible());
    noteCash();
    if (v.listing.length) {
      const ask = Math.min(...v.listing.map(id => v.market[id].price));
      observed.minAsks.push(ask);
      observed.afford.push(affordableUnits(H.difficulty(v).initialCash, ask));
    }
    if (H.products.some(p => qtyOf(v, p.id) && !v.listing.includes(p.id))) observed.absentWeeks++;
    if (week > 1) {
      const headline = (v.news || []).find(n => n.kind === 'headline');
      const newEvent = !!(headline && headline.id !== 'move');
      observed.newEventByWeek[v.week] = newEvent;
      observed.bpsByWeek[v.week] = {};
      let maxId = null, maxAbs = -1;
      for (const p of H.products) {
        const bps = H.changeBps(v.market[p.id]);
        (newEvent ? observed.newEvent : observed.noNewEvent).push(bps);
        if (!newEvent) observed.noNewEventByRole[p.role].push(bps);
        observed.bpsByWeek[v.week][p.id] = bps;
        const abs = Math.abs(bps);
        if (abs > maxAbs) { maxAbs = abs; maxId = p.id; }
      }
      const headlineProduct = (v.news || []).find(n => n.kind === 'headline' && n.productId);
      observed.headlineChecks++;
      if (headlineProduct && headlineProduct.productId === maxId) observed.headlineMatches++;
    }
    if (strategy !== 'idle' && week < 52) {
      if (strategy === 'value') {
        for (let guard = 0; guard < 12; guard++) {
          v = playerView(e.visible());
          const actions = decideSells(strategy, v, rand);
          if (!actions.length) break;
          apply(actions[0]);
          if (guard === 11 && decideSells(strategy, playerView(e.visible()), rand).length) throw Error(seed + ' value sells did not finish');
        }
      } else {
        for (const action of decideSells(strategy, v, rand)) apply(action);
      }
      v = playerView(e.visible());
      apply(decideBuy(strategy, v, rand));
      v = playerView(e.visible());
      const upgrade = warehouse(strategy, v, rand);
      if (rentWarehouse !== false) apply(upgrade);
    }
    v = playerView(e.visible());
    if (stuck(v)) observed.stuckWeeks++;
    apply(housing(v));
    if (week === 52) {
      if (strategy !== 'idle') {
        v = playerView(e.visible());
        for (const p of H.products.concat(H.legacyProducts)) {
          const qty = qtyOf(v, p.id);
          if (qty) apply({type: 'sell', id: p.id, qty});
        }
      }
      apply(yearEndHouse(playerView(e.visible())));
      apply({type: 'end'});
    } else apply({type: 'next'});
  }
  const end = e.snapshot();
  const diag = e.diagnostics();
  const initial = H.difficulty(end).initialCash;
  const lowLine = Math.floor(initial * .1);
  return {seed, difficulty, strategy, arm: rentWarehouse === false ? 'noWarehouse' : 'primary', assets: end.history[end.history.length - 1].assets, cash: end.cash,
    house: end.house || 'renting', houseWeek: end.stats.houseWeek, warehouse: end.warehouse, warehouseSpent: end.stats.warehouseSpent,
    upgrades: end.stats.upgrades, profit: end.stats.profit, byProduct: end.stats.byProduct,
    drawdown: end.stats.maxDrawdown, minCash: observed.minCash, everLowCash: observed.minCash < lowLine, terminalLowCash: end.cash < lowLine, bankrupt: observed.minCash <= 0,
    buybacks: observed.buybacks, buybackQty: observed.buybackQty, absentWeeks: observed.absentWeeks, stuckWeeks: observed.stuckWeeks,
    minAsks: observed.minAsks, afford: observed.afford, noNewEvent: observed.noNewEvent, newEvent: observed.newEvent,
    noNewEventByRole: observed.noNewEventByRole, bpsByWeek: observed.bpsByWeek, newEventByWeek: observed.newEventByWeek,
    headlineChecks: observed.headlineChecks, headlineMatches: observed.headlineMatches, diagnostics: diag};
}

function moveStats(list) {
  const values = list || [];
  const abs = values.map(x => Math.abs(x));
  return {n: values.length, p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9),
    absP50: quantile(abs, .5), absP90: quantile(abs, .9), extreme2500: values.filter(x => Math.abs(x) >= 2500).length};
}
function concentrationOf(samples) {
  const positiveSum = {}, negativeSum = {}, positiveGames = {}, negativeGames = {}, meanNet = {};
  let denominator = 0;
  for (const p of H.heldProducts()) {
    positiveSum[p.id] = 0; negativeSum[p.id] = 0; positiveGames[p.id] = 0; negativeGames[p.id] = 0;
    meanNet[p.id] = samples.reduce((sum, s) => sum + (s.byProduct[p.id] || 0), 0) / samples.length;
  }
  for (const s of samples) for (const p of H.heldProducts()) {
    const value = s.byProduct[p.id] || 0;
    if (value > 0) { positiveSum[p.id] += value; denominator += value; positiveGames[p.id]++; }
    else if (value < 0) { negativeSum[p.id] += value; negativeGames[p.id]++; }
  }
  const shares = {};
  if (denominator) for (const [id, value] of Object.entries(positiveSum)) if (value > 0) shares[id] = value / denominator;
  const oldPositive = Object.entries(meanNet).filter(([, value]) => value > 0);
  const oldDenom = oldPositive.reduce((sum, [, value]) => sum + value, 0);
  const legacyMeanNetShares = oldDenom ? Object.fromEntries(oldPositive.map(([id, value]) => [id, value / oldDenom])) : {};
  const negativeContribution = {};
  for (const [id, sum] of Object.entries(negativeSum)) if (sum < 0) negativeContribution[id] = {sum, games: negativeGames[id]};
  const compactIds = ['watch', 'collectible', 'phone'];
  const compactShare = denominator ? compactIds.reduce((sum, id) => sum + (positiveSum[id] || 0), 0) / denominator : null;
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const firstPositive = ranked[0] ? {id: ranked[0][0], share: ranked[0][1], positiveSum: positiveSum[ranked[0][0]]} : null;
  return {positiveSumShares: shares, positiveSum, positiveGames, negativeContribution, compactShare, firstPositive, legacyMeanNetShares, denominator};
}
function buildGroup(samples, difficulty, strategy, arm) {
  const wins = samples.filter(s => s.house !== 'renting');
  const asks = samples.flatMap(s => s.minAsks);
  const afford = samples.flatMap(s => s.afford);
  const conc = concentrationOf(samples);
  const affected = [];
  const clipByProduct = {}, persistByProduct = {};
  let newEventClips = 0, noNewEventClips = 0;
  for (const s of samples) {
    for (const [id, n] of Object.entries(s.diagnostics.byProduct)) clipByProduct[id] = (clipByProduct[id] || 0) + n;
    for (const [id, n] of Object.entries(s.diagnostics.persistCapped)) persistByProduct[id] = (persistByProduct[id] || 0) + n;
    for (const row of s.diagnostics.clipLog) {
      if (s.newEventByWeek[row.week]) newEventClips += row.clips;
      else noNewEventClips += row.clips;
      if (!row.startedProducts.length || !s.bpsByWeek[row.week]) continue;
      for (const id of row.startedProducts) if (s.bpsByWeek[row.week][id] !== undefined) affected.push(s.bpsByWeek[row.week][id]);
    }
  }
  const roleMoves = {};
  for (const role of ['daily', 'industry', 'spec']) roleMoves[role] = moveStats(samples.flatMap(s => s.noNewEventByRole[role]));
  const clipTotal = samples.reduce((sum, s) => sum + s.diagnostics.clips, 0);
  const specStarts = samples.reduce((sum, s) => sum + s.diagnostics.specStarts, 0);
  const specStartClips = samples.reduce((sum, s) => sum + s.diagnostics.specStartClips, 0);
  const persistCapTriggers = samples.reduce((sum, s) => sum + s.diagnostics.persistCapTriggers, 0);
  const priceWrites = samples.length * 51 * H.products.length;
  return {difficulty, strategy, arm, count: samples.length,
    successRate: wins.length / samples.length, successInterval: wilson(wins.length, samples.length),
    assets: {p10: quantile(samples.map(s => s.assets), .1), p50: quantile(samples.map(s => s.assets), .5), p90: quantile(samples.map(s => s.assets), .9)},
    profit: {mean: samples.reduce((sum, s) => sum + s.profit, 0) / samples.length, p50: quantile(samples.map(s => s.profit), .5)},
    drawdownPpm: {p10: quantile(samples.map(s => s.drawdown), .1), p50: quantile(samples.map(s => s.drawdown), .5), p90: quantile(samples.map(s => s.drawdown), .9)},
    houses: Object.fromEntries(['renting', ...H.houses.map(h => h.id)].map(id => [id, samples.filter(s => s.house === id).length])),
    warehouses: Object.fromEntries(H.warehouses.map(w => [w.id, samples.filter(s => s.warehouse === w.id).length])),
    meanWarehouseSpent: samples.reduce((sum, s) => sum + s.warehouseSpent, 0) / samples.length,
    purchaseWeek: {p10: quantile(wins.map(s => s.houseWeek), .1), p50: quantile(wins.map(s => s.houseWeek), .5), p90: quantile(wins.map(s => s.houseWeek), .9)},
    upgradeRate: samples.filter(s => s.upgrades > 0).length / samples.length,
    upgradeInterval: wilson(samples.filter(s => s.upgrades > 0).length, samples.length),
    capacityStuckRate: samples.filter(s => s.stuckWeeks >= 4).length / samples.length,
    meanStuckWeeks: samples.reduce((sum, s) => sum + s.stuckWeeks, 0) / samples.length,
    everLowCashRate: samples.filter(s => s.everLowCash).length / samples.length,
    terminalLowCashRate: samples.filter(s => s.terminalLowCash).length / samples.length,
    bankruptRate: samples.filter(s => s.bankrupt).length / samples.length,
    meanBuybacks: samples.reduce((sum, s) => sum + s.buybacks, 0) / samples.length,
    meanBuybackQty: samples.reduce((sum, s) => sum + s.buybackQty, 0) / samples.length,
    meanAbsentWeeks: samples.reduce((sum, s) => sum + s.absentWeeks, 0) / samples.length,
    minAsk: {p10: quantile(asks, .1), p50: quantile(asks, .5), p90: quantile(asks, .9)},
    startingCashAffordUnits: {p10: quantile(afford, .1), p50: quantile(afford, .5), p90: quantile(afford, .9), initialCash: H.difficulties[difficulty].initialCash},
    noNewEventMovesBps: moveStats(samples.flatMap(s => s.noNewEvent)),
    newEventMovesBps: moveStats(samples.flatMap(s => s.newEvent)),
    affectedFirstShockBps: moveStats(affected),
    noNewEventByRole: roleMoves,
    headlineMatchRate: samples.reduce((sum, s) => sum + s.headlineMatches, 0) / samples.reduce((sum, s) => sum + s.headlineChecks, 0),
    clips: {total: clipTotal, priceWrites, rate: priceWrites ? clipTotal / priceWrites : null, newEventWeeks: newEventClips, noNewEventWeeks: noNewEventClips,
      eventStartedClips: samples.reduce((sum, s) => sum + s.diagnostics.eventStartedClips, 0),
      noEventStartedClips: samples.reduce((sum, s) => sum + s.diagnostics.noEventStartedClips, 0),
      specStarts, specStartClips, specStartRate: specStarts ? specStartClips / specStarts : null, byProduct: clipByProduct},
    persistCap: {triggers: persistCapTriggers, byProduct: persistByProduct},
    positiveSumShares: conc.positiveSumShares, negativeContribution: conc.negativeContribution, compactShare: conc.compactShare,
    firstPositive: conc.firstPositive, legacyMeanNetShares: conc.legacyMeanNetShares, positiveDenominator: conc.denominator,
    samples: samples.map(s => ({seed: s.seed, assets: s.assets, cash: s.cash, house: s.house, houseWeek: s.houseWeek,
      warehouse: s.warehouse, warehouseSpent: s.warehouseSpent, upgrades: s.upgrades, profit: s.profit, byProduct: s.byProduct,
      drawdown: s.drawdown, minCash: s.minCash, everLowCash: s.everLowCash, terminalLowCash: s.terminalLowCash, bankrupt: s.bankrupt,
      buybacks: s.buybacks, buybackQty: s.buybackQty, absentWeeks: s.absentWeeks, stuckWeeks: s.stuckWeeks,
      clips: s.diagnostics.clips, persistCapTriggers: s.diagnostics.persistCapTriggers}))};
}
function warnGroup(group) {
  const difficulty = group.difficulty, strategy = group.strategy;
  if (strategy === 'conservative' && group.successInterval.high < .15) report.warnings.push(difficulty + ' 保守买房95%区间上界低于15%。这是诊断，不因此自动降房价。');
  if (strategy === 'event-aware' && group.purchaseWeek.p50 !== null && group.purchaseWeek.p50 < 28) report.warnings.push(difficulty + ' 事件感知买房周中位数 ' + group.purchaseWeek.p50 + '。只记录候选，本轮不改价。');
  if (strategy === 'momentum' && group.purchaseWeek.p50 !== null && group.purchaseWeek.p50 < 20) report.warnings.push(difficulty + ' 追涨买房周中位数 ' + group.purchaseWeek.p50 + '。只记录候选，本轮不改价。');
  if (group.upgradeRate >= .95 && group.capacityStuckRate >= .5) report.warnings.push(difficulty + '/' + strategy + ' 升级率高且容量经常卡住。先分析是否被迫升级，不降低大仓库价格。');
  if (strategy !== 'idle' && group.upgradeRate < .2) report.warnings.push(difficulty + '/' + strategy + ' 升级率低于20%。只报告，不自动改仓储价。');
  if (group.firstPositive && group.firstPositive.share > .35) report.warnings.push(difficulty + '/' + strategy + ' ' + group.firstPositive.id + ' 正部和份额 ' + (100 * group.firstPositive.share).toFixed(1) + '% 且排名第一。新口径，不自动改事件。');
  for (const id of ['watch', 'collectible', 'phone']) if ((group.positiveSumShares[id] || 0) > .4) report.warnings.push(difficulty + '/' + strategy + ' ' + id + ' 正部和份额 ' + (100 * group.positiveSumShares[id]).toFixed(1) + '%，超过40%。诊断预警，不自动改事件或房价。');
  if (group.compactShare !== null && group.compactShare >= .4) report.warnings.push(difficulty + '/' + strategy + ' watch/collectible/phone 合份额 ' + (100 * group.compactShare).toFixed(1) + '%，达到40%。诊断预警，不自动改事件或房价。');
}
function collect(rentWarehouse) {
  const groups = [];
  for (const difficulty of Object.keys(H.difficulties)) for (const strategy of strategies) {
    const samples = [];
    for (let n = 0; n < count; n++) samples.push(run(prefix + '-' + n, difficulty, strategy, rentWarehouse));
    const group = buildGroup(samples, difficulty, strategy, rentWarehouse === false ? 'noWarehouse' : 'primary');
    groups.push(group);
    console.log((rentWarehouse === false ? 'noWarehouse ' : '') + difficulty + '/' + strategy + ': ' + (100 * group.successRate).toFixed(1) + '% house week ' + group.purchaseWeek.p50 + ' clips ' + group.clips.total + ' persistCap ' + group.persistCap.triggers);
  }
  return groups;
}
const difficulties = Object.keys(H.difficulties);
const totalGames = strategies.length * difficulties.length * count;
const format = mode === 'c1' ? 'gameplay-v4-c1-r2' : mode === 'primary' ? 'gameplay-v4-primary' : 'gameplay-v4-holdout';
const hashes = Object.fromEntries([...coreFiles.map(f => ['js/' + f + '.js', crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'js', f + '.js'))).digest('hex')]),
  ['simulation/c1.cjs', crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'simulation/c1.cjs'))).digest('hex')]]);
const report = {format, mode, createdAt: new Date().toISOString(), command: 'node simulation/c1.cjs ' + args.join(' '),
  seeds: count, prefix, totalGames, sensitivityGames: mode === 'c1' ? totalGames : 0,
  rulesVersion: H.rules.version, priceBook: '0.2', housePricesUnchanged: true, eventParametersUnchanged: true, strategyThresholdsUnchanged: true,
  cohort: mode, holdoutUsed: mode === 'holdout', formal36000: false,
  pricePathNote: '涨跌分位的 n 是本难度 ' + count + ' 条价格路径的观测。六策略重复同一条路径，n 不乘 6。',
  concentrationNote: '官方份额是各局各商品正已实现利润求和。负贡献单独列出。legacyMeanNetShares 是旧的跨局均值口径，会抵消同商品负局。docs/gameplay-v4-c1.md 的名表 55.1% 只属于旧口径。',
  parameters, sourceHashes: hashes, strategies, groups: [], sensitivityGroups: [], warnings: [], diagnosis: []};
const start = Date.now();
report.groups = collect(true);
for (const group of report.groups) warnGroup(group);
if (mode === 'c1') report.sensitivityGroups = collect(false);
for (const difficulty of difficulties) {
  const rows = report.groups.filter(g => g.difficulty === difficulty);
  const base = rows[0];
  for (const row of rows) {
    if (row.clips.total !== base.clips.total || row.minAsk.p50 !== base.minAsk.p50 || row.noNewEventMovesBps.p50 !== base.noNewEventMovesBps.p50) throw Error(difficulty + ' market path differs across strategies');
  }
  if (mode === 'c1') for (const row of report.sensitivityGroups.filter(g => g.difficulty === difficulty)) {
    if (row.clips.total !== base.clips.total || row.minAsk.p50 !== base.minAsk.p50) throw Error(difficulty + ' noWarehouse arm changed the price path');
  }
}
for (const strategy of strategies) for (const id of ['watch', 'collectible', 'phone']) {
  const rows = report.groups.filter(g => g.strategy === strategy);
  if (rows.length === 3 && rows.every(g => g.firstPositive && g.firstPositive.id === id && g.firstPositive.share > .35)) report.warnings.push(strategy + ' 在三种难度里 ' + id + ' 都是正部和第一且份额超过35%。诊断预警，不自动改事件。');
}
const pct = x => x === null || x === undefined || Number.isNaN(x) ? '—' : (100 * x).toFixed(1) + '%';
const num = x => x === null || x === undefined ? '—' : String(x);
const yuan = cents => cents === null || cents === undefined ? '—' : (cents / 100).toFixed(0);
function band(g, other) {
  if (!other) return '没有对照样本';
  if (g.successRate > other.successRate) return '高于';
  if (g.successRate === other.successRate) return '持平';
  return '低于';
}
if (mode === 'c1') {
  for (const difficulty of difficulties) {
    const rows = Object.fromEntries(report.groups.filter(g => g.difficulty === difficulty).map(g => [g.strategy, g]));
    const ev = rows['event-aware'], idle = rows.idle, cons = rows.conservative, mom = rows.momentum;
    report.diagnosis.push(difficulty + '：事件感知买房率 ' + pct(ev.successRate) + '，' + band(ev, idle) + '不交易 ' + pct(idle.successRate) + '，' + band(ev, cons) + '保守 ' + pct(cons.successRate) + '。追涨买房周中位数 ' + num(mom.purchaseWeek.p50) + '。');
    const ask = cons.minAsk, afford = cons.startingCashAffordUnits, clip = cons.clips;
    report.diagnosis.push(difficulty + '：在售最低买价 p10/p50/p90 为 ' + ask.p10 + '/' + ask.p50 + '/' + ask.p90 + ' 分。起步现金 ' + afford.initialCash + ' 分可买件数 p10/p50/p90 为 ' + afford.p10 + '/' + afford.p50 + '/' + afford.p90 + '。');
    report.diagnosis.push(difficulty + '：价格钳制 ' + clip.total + ' / ' + clip.priceWrites + '（' + pct(clip.rate) + '）。persistCap 触发 ' + cons.persistCap.triggers + '，与钳制分开。' + (cons.persistCap.triggers ? '' : '这 ' + count + ' 条路径没有触发护栏，不能写成护栏永远不会触发。') + '投机品冲击首周钳制 ' + clip.specStartClips + ' / ' + clip.specStarts + '。');
    report.diagnosis.push(difficulty + '：noNewEvent 观测 ' + cons.noNewEventMovesBps.n + '，newEvent 全池观测 ' + cons.newEventMovesBps.n + '，受影响品首冲观测 ' + cons.affectedFirstShockBps.n + '。这是 ' + count + ' 条路径，不是六策略相乘后的独立样本。');
  }
  for (const g of report.groups) if (g.purchaseWeek.p10 !== null && g.purchaseWeek.p10 < 20) report.diagnosis.push(g.difficulty + '/' + g.strategy + ' 买房周 p10 为 ' + g.purchaseWeek.p10 + '，中位数 ' + g.purchaseWeek.p50 + '。只记录，本轮不改价。');
  const roleBits = difficulties.map(difficulty => {
    const g = report.groups.find(row => row.difficulty === difficulty && row.strategy === 'conservative');
    const fmt = role => (g.noNewEventByRole[role].absP50 / 100).toFixed(1) + '%';
    return difficulty + ' ' + fmt('daily') + '/' + fmt('industry') + '/' + fmt('spec');
  });
  report.diagnosis.push('没有新事件头条的周，绝对涨跌中位（日常/产业/投机）为 ' + roleBits.join('，') + '。这组仍可能含持续项，不叫无事件背景，也不据此改 roleHalf。');
  report.diagnosis.push('docs/gameplay-v4-c1.md 的标准事件感知名表 55.1% 是旧口径。本次官方份额见 positiveSumShares。旧数字不能延用。');
  for (const g of report.groups) {
    const other = report.sensitivityGroups.find(row => row.difficulty === g.difficulty && row.strategy === g.strategy);
    report.diagnosis.push(g.difficulty + '/' + g.strategy + '：有租仓买房率 ' + pct(g.successRate) + '，无租仓买房率 ' + pct(other.successRate) + '，平均仓储投入 ' + Math.round(g.meanWarehouseSpent) + ' 分，平均已实现利润 ' + Math.round(g.profit.mean) + ' / ' + Math.round(other.profit.mean) + ' 分。');
  }
  report.diagnosis.push('无租仓对照只看共同 80% 升级规则是否占用买房现金。不因此改房价，也不要求各策略买房率相等。');
}
report.diagnosis.push('房价、仓储标价、事件幅度和六个策略的买卖阈值本轮没有改。');
report.elapsedSeconds = (Date.now() - start) / 1000;
fs.mkdirSync(path.dirname(path.join(root, out)), {recursive: true});
fs.writeFileSync(path.join(root, out), JSON.stringify(report, null, 2));
const title = mode === 'c1' ? '# C1 计量修订 r2' : mode === 'primary' ? '# 正式主样本' : '# 正式留出样本';
const intro = mode === 'c1'
  ? totalGames + ' 局 = ' + strategies.length + ' 策略 × ' + difficulties.length + ' 难度 × ' + count + ' 主种子。另有同种子无租仓对照 ' + totalGames + ' 局，不是正式策略。未使用留出种子，不是正式 36000 局。'
  : '本文件是正式' + (mode === 'primary' ? '主样本' : '留出样本') + '单集，totalGames = ' + totalGames + '。6 策略 × 3 难度 × 1000 种子 = 18000，是一集，不是 36000，也不是 C1。另一集单独成文件。';
const lines = [title, '', intro, '', '模式 ' + mode + '。规则版本 ' + H.rules.version + '，价格簿 0.2。耗时 ' + report.elapsedSeconds.toFixed(1) + ' 秒。', '', report.pricePathNote, report.concentrationNote, '', '## 参数', ''];
for (const key of ['informationBoundary', 'sellGain', 'buyCheck', 'housing', 'warehouse', 'everLowCash', 'terminalLowCash', 'bankrupt', 'capacityStuck', 'newEventMoves', 'noNewEventMoves', 'affectedFirstShock', 'sampleDependence', 'clip', 'sensitivityNoWarehouse']) lines.push('- ' + parameters[key]);
lines.push('- 保守：在售，且 role 为 daily 或 lowRef，且 price/base < ' + parameters.conservative.buyRatioBelow + '。仓位 ' + parameters.conservative.cashShare + '。卖出收益 >= ' + parameters.conservative.sellGainAtLeast + '，或价格/参考价 >= ' + parameters.conservative.sellRatioAtLeast + '，或收益 < ' + parameters.conservative.stopGainBelow + '。');
lines.push('- 随机：卖出概率 ' + parameters.random.sellChance + '，买入概率 ' + parameters.random.buyChance + '，仓位 ' + parameters.random.cashShareMin + ' 到 ' + (parameters.random.cashShareMin + parameters.random.cashShareSpan) + '。' + parameters.random.rng + '。');
lines.push('- 追涨：周涨幅 > ' + parameters.momentum.riseAbove + ' 且价格/参考价 < ' + parameters.momentum.priceOverBaseBelow + '，仓位 ' + parameters.momentum.cashShare + '。卖出：价格 < 上期 × ' + parameters.momentum.sellBelowPrevious + '，或收益 >= ' + parameters.momentum.sellGainAtLeast + '，或收益 < ' + parameters.momentum.stopGainBelow + '。');
lines.push('- 价值：价格/参考价 < ' + parameters.value.buyRatioBelow + '，仓位 ' + parameters.value.cashShare + '。卖出收益 >= ' + parameters.value.sellGainAtLeast + '，或价格/参考价 >= ' + parameters.value.sellRatioAtLeast + '，或收益 < ' + parameters.value.stopGainBelow + '。' + parameters.value.offSale);
lines.push('- 事件感知：缺货或退出持仓卖出。新闻 changeBps <= ' + parameters.eventAware.sellNewsBpsAtMost + ' 也卖。收益 < ' + parameters.eventAware.stopGainBelow + ' 也卖。买入本周 fresh 新闻且 changeBps >= ' + parameters.eventAware.buyFreshNewsBpsAtLeast + ' 的在售商品，仓位 ' + parameters.eventAware.cashShare + '。');
lines.push('- 不交易：' + parameters.idle);
lines.push('', '## 警告');
if (!report.warnings.length) lines.push('- 没有触发预设诊断警告。');
for (const w of report.warnings) lines.push('- ' + w);
lines.push('', '## 买房与现金', '', '|难度|策略|买房率|95%区间|买房周P50|升级率|容量卡住|年内低现金|终局低现金|回收动作|最低买价P50|钳制|护栏|', '|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const g of report.groups) {
  const iv = g.successInterval;
  lines.push('|' + [g.difficulty, g.strategy, pct(g.successRate), iv.low === null ? '—' : pct(iv.low).replace('%', '') + '–' + pct(iv.high), num(g.purchaseWeek.p50), pct(g.upgradeRate), pct(g.capacityStuckRate), pct(g.everLowCashRate), pct(g.terminalLowCashRate), g.meanBuybacks.toFixed(2), g.minAsk.p50, g.clips.total, g.persistCap.triggers].join('|') + '|');
}
lines.push('', '年内低现金是 everLowCash，终局低现金是 terminalLowCash。前一版「极低现金」列是终局口径，而且漏记了买入、租仓和买房之后的现金。', '', '## 住房、仓储、回撤与正部和集中度', '', '|难度|策略|租/单间/公寓/两居/城/梦|仓储档计数|仓储投入|利润均值|回撤P50|破产|第一正部和|合份额|', '|---|---|---|---|---:|---:|---:|---:|---|---:|');
for (const g of report.groups) {
  const h = g.houses, w = g.warehouses;
  const first = g.firstPositive ? g.firstPositive.id + ' ' + pct(g.firstPositive.share) : '无正利润';
  lines.push('|' + [g.difficulty, g.strategy, [h.renting, h.studio, h.flat, h.two, h.city, h.dream].join('/'),
    H.warehouses.map(x => w[x.id]).join('/'), yuan(g.meanWarehouseSpent), yuan(g.profit.mean),
    g.drawdownPpm.p50 === null ? '—' : (g.drawdownPpm.p50 / 10000).toFixed(1) + '%', pct(g.bankruptRate), first, pct(g.compactShare)].join('|') + '|');
}
lines.push('', '仓储档计数按 room/small/normal/large 顺序。表内仓储投入和利润均值是元。每局 byProduct、drawdown、warehouse、warehouseSpent 在 JSON，单位是分。负贡献在 negativeContribution。', '');
if (mode === 'c1') {
  lines.push('## 无租仓对照', '', '同一 ' + count + ' 个种子。买卖阈值不变。仓储随机数仍抽取，但不提交升级。', '', '|难度|策略|有租仓买房率|无租仓买房率|有租仓利润|无租仓利润|有租仓投入|', '|---|---|---:|---:|---:|---:|---:|');
  for (const g of report.groups) {
    const other = report.sensitivityGroups.find(row => row.difficulty === g.difficulty && row.strategy === g.strategy);
    lines.push('|' + [g.difficulty, g.strategy, pct(g.successRate), pct(other.successRate), yuan(g.profit.mean), yuan(other.profit.mean), yuan(g.meanWarehouseSpent)].join('|') + '|');
  }
  lines.push('');
}
lines.push('## 涨跌分位', '', 'noNewEvent 是没有新事件头条的周，全池 12 品，仍可能有持续项。newEvent 是新事件头条周的全池涨跌，含未受影响商品。affected 只含冲击首周被效果命中的商品。n 不乘策略数。', '', '|难度|序列|n|p10|p50|p90|绝对p50|绝对p90|极端2500|', '|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const difficulty of difficulties) {
  const g = report.groups.find(row => row.difficulty === difficulty && row.strategy === 'conservative');
  for (const [name, row] of [['noNewEvent', g.noNewEventMovesBps], ['newEvent', g.newEventMovesBps], ['affected', g.affectedFirstShockBps]]) {
    lines.push('|' + [difficulty, name, row.n, num(row.p10), num(row.p50), num(row.p90), num(row.absP50), num(row.absP90), row.extreme2500].join('|') + '|');
  }
}
lines.push('', '没有新事件头条的周，分角色绝对中位见 JSON 的 noNewEventByRole。对照第 5.2 节时要记住这组不是纯普通周。', '', '## 候选诊断', '');
for (const item of report.diagnosis) lines.push('- ' + item);
lines.push('', mode === 'c1' ? '参数审批前不跑正式 36000 局，不改房价。' : '本文件不覆盖 C1 历史报告。', '', '## 源码哈希', '');
for (const [file, hash] of Object.entries(hashes)) lines.push('- `' + file + '` `' + hash + '`');
lines.push('');
fs.writeFileSync(path.join(root, reportOut), lines.join('\n'));
console.log('Saved ' + out + ' and ' + reportOut + '; ' + report.elapsedSeconds.toFixed(1) + 's; warnings ' + report.warnings.length + '; totalGames ' + totalGames);
