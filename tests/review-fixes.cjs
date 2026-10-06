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
let failed = 0;
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}
check('住房仓储价读取本局priceBook整数', () => {
  const s = H.create();
  const published = H.priceBooks['0.2'].standard.houses.studio;
  s.priceBook.houses.studio = published + 7;
  s.priceBook.warehouses.small = 222;
  if (H.housePrice(s, H.houses[0]) !== published + 7) throw Error('仍在读全局房价');
  if (H.warehousePrice(s, H.warehouses[1]) !== 222) throw Error('仍在读全局仓储价');
  const fresh = H.create();
  if (H.housePrice(fresh, H.houses[1]) - H.housePrice(fresh, H.houses[0]) !== 350000) throw Error('标准差价被改动');
});
check('结算名可解析全部20个商品', () => {
  for (const p of H.heldProducts()) {
    if (H.holding(p.id).name !== p.name) throw Error(p.id);
  }
  let threw = false;
  try { H.product('gold'); } catch (e) { threw = e.message === '未知商品'; }
  if (!threw) throw Error('黄金仍被当成在售商品');
  const ranked = H.heldProducts().map(p => p.id);
  if (ranked.length !== 20 || !ranked.includes('gold')) throw Error('统计名单不是20');
});
check('快报最多三行且持续事件为normal', () => {
  const fake = [
    {kind:'headline'}, {kind:'holding'}, {kind:'listing', id:'a'}, {kind:'listing', id:'b'}
  ];
  const rows = H.bulletinRows(fake);
  if (rows.length !== 3 || rows.filter(n => n && n.kind === 'listing').length !== 1) throw Error('快报行数 ' + rows.length);
  let sawOngoing = false;
  for (let n = 0; n < 12; n++) {
    const e = new H.Engine('news-' + n);
    let rev = 0, token = 0;
    for (let w = 0; w < 8; w++) {
      const r = e.dispatch({type:'next', revision:rev, token:'n-' + (++token)});
      if (!r.ok) throw Error(r.error);
      rev++;
      const s = e.snapshot();
      const bulletin = s.news.filter(x => x.kind === 'headline' || x.kind === 'holding' || x.kind === 'listing');
      if (bulletin.length > 3 || bulletin.filter(x => x.kind === 'listing').length > 1) throw Error('存档快报超过三行');
      for (const item of s.news) {
        if (item.kind === 'ongoing') {
          sawOngoing = true;
          if (item.reliability !== 'normal' || item.fresh !== false) throw Error(item.id + ' ' + item.reliability);
        }
      }
    }
  }
  if (!sawOngoing) throw Error('样本里没有持续事件');
});
check('v2导入写独立备份且不覆盖本地v2', () => {
  const raw = fs.readFileSync(path.join(root, 'docs/fixtures/v2-baseline-migrate.json'), 'utf8');
  const map = new Map();
  map.set('homeyear.save.v2', 'LOCAL-ORIGINAL');
  const store = {getItem:k=>map.has(k)?map.get(k):null, setItem:(k,v)=>map.set(k,v), removeItem:k=>map.delete(k)};
  const saves = new H.SaveAdapter(store);
  const staged = saves.stageLegacy(raw);
  if (!staged.ok) throw Error(staged.error);
  if (map.get('homeyear.save.v2') !== 'LOCAL-ORIGINAL') throw Error('导入覆盖了本地v2');
  if (map.has('homeyear.save.v4')) throw Error('导入提前写入了v4');
  if (map.get(staged.backup) !== raw) throw Error('备份不是导入原文');
  if (!staged.state.migration || staged.state.migration.backup !== staged.backup) throw Error('备份路径未写入存档');
  if (staged.state.activeEvents.length || staged.state.news.some(n => n.id === 'flu')) throw Error('旧事件或旧新闻未清空');
});
check('损坏v4不带replaceDamaged不能迁移', () => {
  const raw = fs.readFileSync(path.join(root, 'docs/fixtures/v2-baseline-migrate.json'), 'utf8');
  const map = new Map();
  map.set('homeyear.save.v4', 'BROKEN');
  map.set('homeyear.save.v2', raw);
  const store = {getItem:k=>map.has(k)?map.get(k):null, setItem:(k,v)=>map.set(k,v), removeItem:k=>map.delete(k)};
  const saves = new H.SaveAdapter(store);
  if (saves.load().ok) throw Error('坏档未被隔离');
  const denied = saves.migrate(raw);
  if (denied.ok) throw Error('隔离状态被偷带替换');
  if (map.get('homeyear.save.v4') !== 'BROKEN') throw Error('坏档被覆盖');
  if (map.get('homeyear.save.v2') !== raw) throw Error('v2被改写');
  const allowed = saves.migrate(raw, {replaceDamaged:true});
  if (!allowed.ok) throw Error(allowed.error);
  if (map.get('homeyear.save.v2') !== raw) throw Error('确认替换后仍改了v2');
});
check('存储读取失败返回结构化错误', () => {
  const saves = new H.SaveAdapter({
    getItem(){ throw Error('read denied'); },
    setItem(){ throw Error('write denied'); },
    removeItem(){ throw Error('remove denied'); }
  });
  let threw = false;
  let result;
  try { result = saves.migrate('{}'); }
  catch (e) { threw = true; }
  if (threw || !result || result.ok || !result.error) throw Error('迁移读取失败抛出了异常');
  const read = saves.readKey('homeyear.save.v2');
  if (read.ok || !read.error) throw Error('readKey未返回结构化错误');
});
check('迁移确认文案覆盖清空与旧路径', () => {
  const text = H.migrationConfirm;
  for (const part of ['旧市场事件', '旧新闻', '货架', '旧规则的未来路径', 'v2 原键不会被覆盖']) {
    if (!text.includes(part)) throw Error('确认文案缺少 ' + part);
  }
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  if (ui.includes('replaceDamaged:saves.isQuarantined()')) throw Error('隔离标志仍被偷带为替换授权');
  if (!ui.includes('H.migrationConfirm') || !ui.includes('H.replaceDamagedConfirm')) throw Error('界面未使用分步确认');
  if (!ui.includes('data-testid="trade-buy"') || !ui.includes("canBuy?'':'disabled'")) throw Error('买入页签未禁用');
  if (!ui.includes('data-testid="migration-note"') || !ui.includes('data-testid="export-backup"')) throw Error('迁移行或备份导出缺失');
  if (!ui.includes('H.holding(r.bestProduct)') || !ui.includes('H.heldProducts()')) throw Error('结算仍未覆盖退出商品');
});
console.log(failed ? failed + ' failed' : 'review fixes passed');
process.exitCode = failed ? 1 : 0;
