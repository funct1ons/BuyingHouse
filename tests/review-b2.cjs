'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({console});
context.window = context;
for (const file of ['js/data.js','js/math.js','js/v2-baseline.js','js/v3-baseline.js','js/market.js','js/trading.js','js/statistics.js','js/street.js','js/validation.js','js/game.js','js/save.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const H = context.HomeYear;
const fixturePath = path.join(root, 'docs/fixtures/v2-baseline-migrate.json');
const raw = fs.readFileSync(fixturePath, 'utf8');
let failed = 0;
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.stack.split('\n')[0] + ' ' + e.message); }
}
function storeFrom(map) {
  return {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
}
function act(e, type, id, qty, token) {
  const r = e.dispatch({type, id, qty, revision: e.visible().revision, token});
  if (!r.ok) throw Error(r.error);
  return r;
}
check('多种子每周替换2或3种', () => {
  for (let n = 0; n < 8; n++) {
    const e = new H.Engine('rot2-' + n);
    for (let w = 1; w < 52; w++) {
      const before = e.snapshot().listing;
      act(e, 'next', undefined, undefined, 'rot-' + n + '-' + w);
      const after = e.snapshot().listing;
      const replaced = before.filter(id => !after.includes(id)).length;
      if (replaced !== 2 && replaced !== 3) throw Error(n + ' 周' + w + ' 替换 ' + replaced);
    }
  }
});
check('快照和可见信息读取不消耗四个随机流', () => {
  const e = new H.Engine('rng-read');
  act(e, 'next', undefined, undefined, 'rng-next');
  const before = e.snapshot().rng;
  e.snapshot();
  e.visible();
  H.newsSituation({kind: 'holding', id: 'move'});
  H.newsSituation({kind: 'headline', id: 'weak'});
  const after = e.snapshot().rng;
  for (const key of ['market', 'events', 'visual', 'listing']) {
    if (before[key] !== after[key]) throw Error(key + ' 被读取消耗');
  }
});
check('立即冲击只生效一次，结构到52，到期无镜像', () => {
  const shocked = H.create('shock-once');
  shocked.week = 4;
  shocked.season = H.seasonAt(4);
  shocked.activeEvents = [{id: 'chips', started: 4, until: 6}];
  shocked.market.gpu.price = 80000;
  shocked.market.gpu.trend = 0;
  shocked.rng.market = 123456789;
  const quiet = H.clone(shocked);
  quiet.activeEvents = [{id: 'chips', started: 3, until: 5}];
  H.prices(shocked);
  H.prices(quiet);
  const gpu = H.product('gpu');
  const seasonal = 1 + gpu.season * Math.cos((4 - 1) / 52 * Math.PI * 2 + gpu.phase);
  const center = gpu.base * seasonal;
  const impact = Math.round(80000 * 7000 / 10000);
  const revert = Math.round(H.rules.revertRate * (center - 80000));
  if (shocked.market.gpu.price - quiet.market.gpu.price !== impact - revert) throw Error('冲击差 ' + (shocked.market.gpu.price - quiet.market.gpu.price));
  let structural = null, expired = null;
  for (let n = 0; n < 40 && (!structural || !expired); n++) {
    const e = new H.Engine('life-' + n);
    let seen = new Map();
    for (let w = 1; w < 52; w++) {
      const prev = e.snapshot().activeEvents.map(a => a.id);
      act(e, 'next', undefined, undefined, 'life-' + n + '-' + w);
      const s = e.snapshot();
      for (const a of s.activeEvents) {
        const ev = H.events.find(x => x.id === a.id);
        if (Object.values(ev.effects).some(fx => fx.kind === 'structural')) {
          if (a.until !== 52) throw Error(a.id + ' until ' + a.until);
          structural = a.id;
        }
        seen.set(a.id, a);
      }
      for (const id of prev) {
        if (!s.activeEvents.some(a => a.id === id)) {
          const ev = H.events.find(x => x.id === id);
          expired = ev;
          for (const other of s.activeEvents) {
            const alt = H.events.find(x => x.id === other.id);
            const keys = Object.keys(ev.effects);
            if (keys.length && keys.every(pid => alt.effects[pid] && alt.effects[pid].bps === -ev.effects[pid].bps)) throw Error('到期镜像 ' + id + ' -> ' + other.id);
          }
        }
      }
    }
    if (structural) {
      const end = new H.Engine('life-' + n);
      for (let w = 1; w < 52; w++) act(end, 'next', undefined, undefined, 'end-' + n + '-' + w);
      if (!end.snapshot().activeEvents.some(a => a.id === structural && a.until === 52)) {
        structural = null;
      }
    }
  }
  if (!structural) throw Error('样本没有留到第52周的结构事件');
  if (!expired) throw Error('样本没有到期事件');
});
check('持仓异动情境不冒充无新事件', () => {
  if (H.newsSituation({kind: 'holding', id: 'move'}) !== '这是已发生的本周涨跌，不代表下周方向。') throw Error('持仓情境错误');
  if (H.newsSituation({kind: 'headline', id: 'move'}) !== H.moveSituation) throw Error('无事件头条情境错误');
  if (H.newsSituation({kind: 'holding', id: 'move'}).includes('没有新的供应或需求事件')) throw Error('持仓行声称没有新事件');
  const weak = H.events.find(e => e.id === 'weak').situation;
  if (weak.includes('都已走弱') || weak.includes('必') || weak === '集中到货已经发生。本周涨跌以成交价为准，普通波动仍可能抵消。') throw Error('weak 情境');
  const situations = H.events.filter(e => e.type === 'market').map(e => e.situation);
  if (new Set(situations).size < 18) throw Error('情境重复过多 ' + new Set(situations).size);
});
check('fixture迁移严格保留stats20、market12、legacy8、旧三随机流', () => {
  const v2 = JSON.parse(raw);
  const map = new Map();
  const saves = new H.SaveAdapter(storeFrom(map));
  const staged = saves.stageLegacy(raw);
  if (!staged.ok) throw Error(staged.error);
  const s = staged.state;
  if (Object.keys(s.stats.byProduct).length !== 20) throw Error('byProduct');
  for (const id of Object.keys(v2.stats.byProduct)) if (s.stats.byProduct[id] !== v2.stats.byProduct[id]) throw Error('利润 ' + id);
  if (Object.keys(s.market).length !== 12 || Object.keys(s.legacy).length !== 8) throw Error('市场或退出数量');
  for (const id of Object.keys(s.market)) {
    if (s.market[id].price !== v2.market[id].price || s.inventory[id].qty !== v2.inventory[id].qty || s.inventory[id].cost !== v2.inventory[id].cost) throw Error('在售保留 ' + id);
  }
  for (const id of Object.keys(s.legacy)) {
    if (s.legacy[id].qty !== v2.inventory[id].qty || s.legacy[id].cost !== v2.inventory[id].cost || s.legacy[id].price !== v2.market[id].price) throw Error('退出保留 ' + id);
  }
  for (const key of ['market', 'events', 'visual']) if (s.rng[key] !== v2.rng[key]) throw Error('随机流 ' + key);
  if (JSON.stringify(s.stats) !== JSON.stringify(v2.stats)) throw Error('stats 未整份保留');
});
check('坏v2删事件或住房不能迁移', () => {
  for (const mutate of [s => { s.activeEvents = [{id: 'missing', started: 4, until: 6}]; }, s => { s.house = 'palace'; }]) {
    const bad = JSON.parse(raw);
    mutate(bad);
    const map = new Map();
    const saves = new H.SaveAdapter(storeFrom(map));
    const result = saves.migrate(JSON.stringify(bad));
    if (result.ok || map.has('homeyear.save.v4')) throw Error('坏档被迁移');
  }
});
check('备份回读失败不改已有v4', () => {
  const map = new Map();
  const existing = JSON.stringify(H.create('keep-v3'));
  map.set('homeyear.save.v4', existing);
  const store = {
    getItem: k => map.has(k) ? map.get(k) : null,
    setItem: (k, v) => { if (String(k).startsWith('homeyear.save.backup.')) { map.set(k, 'NOT-THE-RAW'); return; } map.set(k, v); },
    removeItem: k => map.delete(k)
  };
  const saves = new H.SaveAdapter(store);
  const result = saves.migrate(raw);
  if (result.ok) throw Error('回读失败仍迁移');
  if (map.get('homeyear.save.v4') !== existing) throw Error('已有v4被改写');
});
check('隔离档只有明确true才能覆盖', () => {
  const map = new Map();
  map.set('homeyear.save.v4', 'BROKEN');
  const saves = new H.SaveAdapter(storeFrom(map));
  if (saves.load().ok) throw Error('坏档未被隔离');
  const state = H.create('replace-flag');
  const fuzzy = saves.save(state, {replaceDamaged: 1});
  if (fuzzy.ok || map.get('homeyear.save.v4') !== 'BROKEN') throw Error('非true授权覆盖了隔离档');
  const exact = saves.save(state, {replaceDamaged: true});
  if (!exact.ok) throw Error(exact.error);
});
check('已结束v2不迁移', () => {
  const ended = JSON.parse(raw);
  ended.status = 'ended';
  ended.week = 52;
  const map = new Map();
  const saves = new H.SaveAdapter(storeFrom(map));
  const result = saves.migrate(JSON.stringify(ended));
  if (result.ok || map.has('homeyear.save.v4')) throw Error('结束档被迁移');
  let message = '';
  try { H.migrateV2(ended, 'homeyear.save.backup.ended'); }
  catch (e) { message = e.message; }
  if (!message.includes('已结束')) throw Error(message || '没有结束拒绝');
});
check('第52周缺货回收成功且不能进入第53周', () => {
  const e = new H.Engine('week52-buyback');
  const snap = e.snapshot();
  snap.stats.grants += 5000000 - snap.cash;
  snap.cash = 5000000;
  H.record(snap);
  e.restore(snap);
  const id = e.snapshot().listing[0];
  act(e, 'buy', id, 1, 'buy52');
  for (let w = 1; w < 52; w++) act(e, 'next', undefined, undefined, 'to52-' + w);
  if (e.snapshot().week !== 52) throw Error('week');
  const held = e.snapshot();
  if (held.listing.includes(id)) {
    const incoming = H.products.find(p => !held.listing.includes(p.id));
    const sorted = H.products.map(p => p.id).filter(x => held.listing.includes(x) && x !== id || x === incoming.id);
    if (!H.listingCovers(sorted)) throw Error('无法构造第52周缺货');
    held.listing = sorted;
    held.absence[id] = 1;
    held.onStreak[id] = 0;
    held.absence[incoming.id] = 0;
    held.onStreak[incoming.id] = 1;
    e.restore(held);
  }
  const before = e.snapshot();
  act(e, 'sell', id, 1, 'sell52');
  const after = e.snapshot();
  if (after.inventory[id].qty !== 0) throw Error('未卖出');
  if (after.stats.turnover <= before.stats.turnover) throw Error('回收未计入成交额');
  if (act && e.dispatch({type: 'next', revision: e.visible().revision, token: 'week53'}).ok) throw Error('进入了第53周');
});
check('迁移后卖光退出商品仍用旧峰值上界', () => {
  const map = new Map();
  const saves = new H.SaveAdapter(storeFrom(map));
  const staged = saves.stageLegacy(raw);
  const e = new H.Engine();
  e.restore(staged.state);
  let rev = e.visible().revision, token = 0;
  for (const p of H.legacyProducts) {
    const qty = e.snapshot().legacy[p.id].qty;
    if (!qty) continue;
    const r = e.dispatch({type: 'sell', id: p.id, qty, revision: rev, token: 'leg-' + (++token)});
    if (!r.ok) throw Error(r.error);
    rev++;
  }
  const s = e.snapshot();
  if (H.legacyProducts.some(p => s.legacy[p.id].qty)) throw Error('退出持仓未清');
  const unitNew = Math.max(...H.products.map(p => Math.ceil(p.max / p.size)));
  const unitOld = Math.max(...H.v2.catalog.products.map(p => Math.ceil(p.max / p.size)));
  const room = BigInt(s.difficulty ? 0 : 0);
  const cap = BigInt(s.capacity) * BigInt(unitOld);
  const sold = BigInt(s.stats.sold), grants = BigInt(s.stats.grants), initial = BigInt(H.difficulty(s).initialCash);
  const between = initial + grants + sold + BigInt(s.capacity) * BigInt(unitNew) + 1n;
  if (between > initial + grants + sold + cap) throw Error('上界差距不足');
  s.stats.peak = Number(between);
  s.stats.maxDrawdown = Math.max(s.stats.maxDrawdown, s.stats.peak ? Math.round((s.stats.peak - H.assets(s)) / s.stats.peak * 1000000) : 0);
  H.validate(s);
  s.stats.peak = Number(initial + grants + sold + cap + 1n);
  let rejected = false;
  try { H.validate(s); } catch (e2) { rejected = true; }
  if (!rejected) throw Error('超过旧上界仍通过');
});
check('关注排序先持仓再绝对涨跌再新到货', () => {
  const s = H.create('focus-order');
  const listed = s.listing.slice();
  const held = listed[0];
  const mover = listed[1];
  s.inventory[held].qty = 1;
  s.inventory[held].cost = 100;
  s.market[mover].previous = s.market[mover].price;
  s.market[mover].price = s.market[mover].price + 5000;
  s.onStreak[listed[2]] = 1;
  s.onStreak[held] = 3;
  const ordered = H.focusOrder(s, listed.map(id => H.product(id)));
  if (ordered[0].id !== held) throw Error('持仓未排第一 ' + ordered.map(p => p.id).join(','));
  const rest = ordered.slice(1);
  for (let i = 1; i < rest.length; i++) {
    const abs = id => Math.abs(H.changeBps(s.market[id]));
    if (abs(rest[i].id) > abs(rest[i - 1].id)) throw Error('涨跌未降序');
  }
});
console.log(failed ? failed + ' failed' : 'review-b2 passed');
process.exitCode = failed ? 1 : 0;
