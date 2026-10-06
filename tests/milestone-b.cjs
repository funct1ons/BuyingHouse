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
const v2 = JSON.parse(raw);
H.v2.validate(v2);
let failed = 0;
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}
check('fixture迁移保留现金历史住房仓储', () => {
  const map = new Map();
  map.set('homeyear.save.v2', raw);
  const store = {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
  const saves = new H.SaveAdapter(store);
  const result = saves.migrate(raw);
  if (!result.ok) throw Error(result.error);
  if (map.get('homeyear.save.v2') !== raw) throw Error('v2原键被改写');
  if (map.get(result.backup) !== raw) throw Error('备份回读不一致');
  if (!result.backup.startsWith('homeyear.save.backup.')) throw Error('备份键无效');
  const s = result.state;
  if (s.cash !== v2.cash || JSON.stringify(s.history) !== JSON.stringify(v2.history)) throw Error('现金或历史变化');
  if (s.stats.warehouseSpent !== v2.stats.warehouseSpent || s.house !== 'studio' || H.houseValue(s) !== 650000) throw Error('住房仓储价变化');
  if (s.legacy.gold.qty !== v2.inventory.gold.qty || s.legacy.gold.cost !== v2.inventory.gold.cost) throw Error('退出持仓变化');
  if (s.priceBook.id !== '0.2') throw Error('价格簿不是0.2');
  H.validate(s);
  const e = new H.Engine();
  e.restore(s);
  if (!e.snapshot().listing.includes('gold') && e.snapshot().legacy.gold.qty > 0) {
    const sold = e.dispatch({type:'sell', id:'gold', qty:1, revision:e.visible().revision, token:'sell-gold'});
    if (!sold.ok) throw Error(sold.error);
    H.validate(e.snapshot());
  }
});
check('备份失败不写v4且不改v2', () => {
  const map = new Map();
  map.set('homeyear.save.v2', raw);
  const store = {
    getItem: k => map.has(k) ? map.get(k) : null,
    setItem: (k, v) => { if (String(k).startsWith('homeyear.save.backup.')) throw Error('quota'); map.set(k, v); },
    removeItem: k => map.delete(k)
  };
  const saves = new H.SaveAdapter(store);
  const result = saves.migrate(raw);
  if (result.ok) throw Error('备份失败仍迁移');
  if (map.get('homeyear.save.v2') !== raw) throw Error('v2被覆盖');
  if (map.has('homeyear.save.v4')) throw Error('失败后写入了v4');
});
check('导入另一份v2不覆盖本地v2', () => {
  const map = new Map();
  map.set('homeyear.save.v2', 'LOCAL-ORIGINAL');
  const store = {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
  const saves = new H.SaveAdapter(store);
  const result = saves.migrate(raw);
  if (!result.ok) throw Error(result.error);
  if (map.get('homeyear.save.v2') !== 'LOCAL-ORIGINAL') throw Error('本地v2被导入覆盖');
  if (map.get(result.backup) !== raw) throw Error('导入备份不是导入原文');
});
check('只信version不能迁移坏v2', () => {
  const bad = JSON.parse(raw);
  delete bad.inventory.gold;
  const map = new Map();
  const store = {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
  const saves = new H.SaveAdapter(store);
  const result = saves.migrate(JSON.stringify(bad));
  if (result.ok || map.has('homeyear.save.v4')) throw Error('坏v2被迁移');
});
check('读档后未来轨迹一致', () => {
  const a = new H.Engine('continue-future');
  let rev = 0, token = 0;
  const act = (e, type) => {
    const r = e.dispatch({type, revision: e.visible().revision, token: 'c-' + (++token)});
    if (!r.ok) throw Error(r.error);
  };
  for (let i = 0; i < 8; i++) act(a, 'next');
  const saved = a.snapshot();
  const b = new H.Engine();
  b.restore(H.clone(saved));
  for (let i = 0; i < 6; i++) { act(a, 'next'); act(b, 'next'); }
  if (JSON.stringify(a.snapshot()) !== JSON.stringify(b.snapshot())) throw Error('恢复后轨迹分歧');
});
console.log(failed ? failed + ' failed' : 'milestone-b node checks passed');
process.exitCode = failed ? 1 : 0;
