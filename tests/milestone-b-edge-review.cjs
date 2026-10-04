'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');
const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const raw = fs.readFileSync(path.join(root, 'docs/fixtures/v2-baseline-migrate.json'), 'utf8');
function endedSave() {
  const vm = require('node:vm');
  const context = vm.createContext({console});
  context.window = context;
  for (const file of ['js/data.js','js/math.js','js/v2-baseline.js','js/market.js','js/trading.js','js/statistics.js','js/validation.js','js/game.js','js/save.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  const H = context.HomeYear;
  const map = new Map();
  const store = {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
  const staged = new H.SaveAdapter(store).stageLegacy(raw);
  if (!staged.ok) throw Error(staged.error);
  const e = new H.Engine();
  e.restore(staged.state);
  let rev = e.visible().revision, token = 0;
  function go(type, id, qty) {
    const r = e.dispatch({type, id, qty, revision: rev, token: 'end-' + (++token)});
    if (!r.ok) throw Error(r.error);
    rev++;
  }
  for (const p of H.legacyProducts) {
    const qty = e.snapshot().legacy[p.id].qty;
    if (qty) go('sell', p.id, qty);
  }
  while (e.snapshot().week < 52) go('next');
  go('end');
  const s = e.snapshot();
  return {save: JSON.stringify(s), best: H.holding(s.result.bestProduct).name, worst: H.holding(s.result.worstProduct).name, bestLegacy: !!H.holding(s.result.bestProduct).legacy, worstLegacy: !!H.holding(s.result.worstProduct).legacy};
}
const outDir = path.join(root, 'docs', 'gameplay-evidence');
fs.mkdirSync(outDir, {recursive: true});
(async () => {
  const failures = [];
  const notes = {};
  const edge = await launchEdge();
  const cdp = edge.cdp;
  const consoleErrors = [];
  cdp.on('Runtime.exceptionThrown', p => consoleErrors.push(JSON.stringify(p.exceptionDetails || p).slice(0, 300)));
  cdp.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') consoleErrors.push(String(p.args && p.args[0] && (p.args[0].value || p.args[0].description))); });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  async function ready(expr, ms = 12000) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      try { if (await cdp.evaluate(expr)) return true; } catch (e) {}
      await delay(100);
    }
    return false;
  }
  async function shot(name) {
    await cdp.evaluate(`document.querySelectorAll('.toast').forEach(el => el.remove())`);
    const png = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    await fs.promises.writeFile(path.join(outDir, name), Buffer.from(png.data, 'base64'));
  }
  async function overflow() {
    return cdp.evaluate(`(() => {
      const d = document.documentElement;
      const offenders = [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 2 && (r.right > innerWidth + 2 || r.left < -2);
      }).slice(0, 8).map(el => el.tagName + '.' + String(el.className).slice(0, 40));
      return {width: innerWidth, height: innerHeight, scrollWidth: d.scrollWidth, horizontal: d.scrollWidth > innerWidth + 2, offenders};
    })()`);
  }
  async function openGame() {
    await cdp.send('Page.navigate', {url});
    if (!await ready(`document.readyState==='complete' && !!document.querySelector('[data-testid=new-game]')`)) throw Error('page not ready');
    await cdp.evaluate(`localStorage.setItem('homeyear.tutorial','seen')`);
    await cdp.evaluate(`document.querySelector('[data-testid=seed]').value='EDGE-B1'`);
    await cdp.evaluate(`document.querySelector('[data-testid=new-game]').click()`);
    if (!await ready(`!!document.querySelector('[data-testid=next-week]')`)) throw Error('game not open');
  }
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  await openGame();
  await cdp.evaluate(`document.querySelector('[data-testid=next-week]').click()`);
  await delay(400);
  const week2 = await cdp.evaluate(`(() => {
    const s = HomeYear.UI.snapshot();
    const sort = document.querySelector('#sort');
    const bulletin = document.querySelector('[data-testid=bulletin]').innerText;
    const letter = document.querySelector('.news-panel').innerText;
    const personalTitles = s.news.filter(n => n.kind === 'personal').map(n => n.title);
    const shown = [...document.querySelectorAll('.news-panel .news p')].map(el => el.textContent);
    return {week: s.week, sort: sort.value, sortLabel: sort.selectedOptions[0] && sort.selectedOptions[0].textContent, bulletin, letter, headline: (s.news.find(n => n.kind === 'headline') || {}).id, personalTitles, shown};
  })()`);
  notes.week2 = {week: week2.week, sort: week2.sort, sortLabel: week2.sortLabel, headline: week2.headline};
  if (week2.week !== 2 || week2.sort !== 'focus' || week2.sortLabel !== '本周关注') failures.push('sort ' + JSON.stringify(notes.week2));
  if (!week2.bulletin.includes('热情降温已经发生') || week2.bulletin.includes('没有新的供应或需求事件')) failures.push('headline situation leaked');
  if (!week2.bulletin.includes('这是已发生的本周涨跌，不代表下周方向')) failures.push('holding situation missing');
  if (week2.letter.includes('街区很安静')) failures.push('quiet letter on headline week');
  if (!week2.letter.includes('这周没有仍在持续的市场消息') && !week2.letter.includes('仍在影响')) failures.push('letter copy ' + week2.letter.slice(0, 180));
  const dup = week2.shown.filter((title, i) => week2.shown.indexOf(title) !== i);
  if (dup.length) failures.push('duplicate letter ' + dup.join(','));
  const over1366 = await overflow();
  notes.overflow1366 = over1366;
  if (over1366.horizontal) failures.push('overflow 1366 ' + over1366.offenders.join(','));
  await shot('week2-bulletin-1366.png');
  await cdp.evaluate(`document.querySelector('[data-testid=bulletin] [data-action=trade]').click()`);
  await delay(300);
  const tradeOpen = await cdp.evaluate(`document.querySelector('[data-testid=trade-submit]') ? document.querySelector('.dialog-body').innerText.slice(0, 180) : ''`);
  if (!tradeOpen.includes('名表') && !tradeOpen.includes('奢侈')) notes.tradeOpen = tradeOpen;
  if (!tradeOpen) failures.push('bulletin trade did not open');
  await shot('week2-trade-1366.png');
  await cdp.evaluate(`document.querySelector('[data-action=close]') && document.querySelector('[data-action=close]').click()`);
  await delay(200);
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1600, height: 900, deviceScaleFactor: 1, mobile: false});
  await delay(300);
  const over1600a = await overflow();
  notes.overflow1600Bulletin = over1600a;
  if (over1600a.horizontal) failures.push('overflow 1600 bulletin ' + over1600a.offenders.join(','));
  await shot('week2-bulletin-1600.png');
  if (!await cdp.evaluate(`!!document.querySelector('[data-testid=trade-submit]')`)) {
    await cdp.evaluate(`document.querySelector('[data-testid=bulletin] [data-action=trade]').click()`);
    await delay(300);
  }
  await shot('week2-trade-1600.png');
  const over1600b = await overflow();
  notes.overflow1600Trade = over1600b;
  if (over1600b.horizontal) failures.push('overflow 1600 trade ' + over1600b.offenders.join(','));
  await cdp.evaluate(`document.querySelector('[data-action=close]') && document.querySelector('[data-action=close]').click()`);
  await delay(200);
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  const bought = await cdp.evaluate(`(() => {
    const s = HomeYear.UI.snapshot();
    const id = s.listing.find(id => s.market[id].price * 1.02 < s.cash);
    return id || '';
  })()`);
  if (!bought) failures.push('no affordable listed good');
  else {
    await cdp.evaluate(`document.querySelector('[data-testid=product-${bought}]').click()`);
    await delay(200);
    await cdp.evaluate(`document.querySelector('[data-testid=trade-submit]').click()`);
    await delay(300);
    let found = false;
    for (let i = 0; i < 16 && !found; i++) {
      found = await cdp.evaluate(`(document.querySelector('.inventory-panel')?.innerText || '').includes('未上架')`);
      if (found) break;
      await cdp.evaluate(`document.querySelector('[data-testid=next-week]').click()`);
      await delay(250);
    }
    if (!found) failures.push('held good never left the shelf');
    else {
      await cdp.evaluate(`[...document.querySelectorAll('.inventory-line')].find(el => el.innerText.includes('未上架')).click()`);
      await delay(250);
      const sell = await cdp.evaluate(`(() => ({preview: document.querySelector('#preview')?.innerText || '', buyDisabled: document.querySelector('[data-testid=trade-buy]')?.disabled === true, qty: HomeYear.UI.snapshot().inventory[${JSON.stringify(bought)}].qty}))()`);
      if (!sell.preview.includes('回收报价') || !sell.buyDisabled) failures.push('off-sale sell UI ' + JSON.stringify(sell));
      await cdp.evaluate(`document.querySelector('[data-testid=trade-submit]').click()`);
      await delay(300);
      const left = await cdp.evaluate(`HomeYear.UI.snapshot().inventory[${JSON.stringify(bought)}].qty`);
      if (left !== 0) failures.push('off-sale sell qty ' + left);
      notes.offSale = {id: bought, sold: left === 0};
    }
  }
  await cdp.evaluate(`localStorage.setItem('homeyear.save.v3','BROKEN'); localStorage.setItem('homeyear.save.v2', ${JSON.stringify(raw)}); localStorage.setItem('homeyear.tutorial','seen'); location.reload()`);
  if (!await ready(`!!document.querySelector('[data-testid=migrate]')`)) failures.push('migrate missing for damaged v3');
  else {
    await cdp.evaluate(`document.querySelector('[data-testid=migrate]').click()`);
    await delay(200);
    await cdp.evaluate(`document.querySelector('[data-testid=confirm-yes]').click()`);
    await delay(250);
    const second = await cdp.evaluate(`document.querySelector('.dialog-body')?.innerText || ''`);
    if (!second.includes('替换损坏的 v3')) failures.push('second confirm missing ' + second.slice(0, 120));
    await cdp.evaluate(`[...document.querySelectorAll('button')].find(el => el.textContent === '取消').click()`);
    await delay(250);
    const cancelled = await cdp.evaluate(`localStorage.getItem('homeyear.save.v3')`);
    if (cancelled !== 'BROKEN') failures.push('cancel replaced damaged v3');
    await cdp.evaluate(`document.querySelector('[data-testid=migrate]').click()`);
    await delay(200);
    await cdp.evaluate(`document.querySelector('[data-testid=confirm-yes]').click()`);
    await delay(200);
    await cdp.evaluate(`document.querySelector('[data-testid=confirm-yes]').click()`);
    await delay(500);
    const accepted = await cdp.evaluate(`(() => ({week: HomeYear.UI.snapshot()?.week, v2: localStorage.getItem('homeyear.save.v2') === ${JSON.stringify(raw)}, v3ok: !!JSON.parse(localStorage.getItem('homeyear.save.v3') || 'null')?.week}))()`);
    if (accepted.week !== 4 || !accepted.v2 || !accepted.v3ok) failures.push('accept migrate ' + JSON.stringify(accepted));
    notes.damaged = accepted;
  }
  await cdp.evaluate(`localStorage.setItem('homeyear.save.v2','LOCAL-ORIGINAL'); localStorage.removeItem('homeyear.save.v3'); localStorage.setItem('homeyear.tutorial','seen'); location.reload()`);
  if (!await ready(`!!document.querySelector('[data-action=settings]')`)) failures.push('settings missing');
  else {
    await cdp.evaluate(`document.querySelector('[data-action=settings]').click()`);
    await delay(200);
    await cdp.evaluate(`document.querySelector('[data-testid=save-text]').value = ${JSON.stringify(raw)}`);
    await cdp.evaluate(`document.querySelector('[data-testid=import]').click()`);
    await delay(250);
    await cdp.evaluate(`document.querySelector('[data-testid=confirm-yes]').click()`);
    await delay(500);
    const imported = await cdp.evaluate(`(() => ({week: HomeYear.UI.snapshot()?.week, cash: HomeYear.UI.snapshot()?.cash, v2: localStorage.getItem('homeyear.save.v2'), exited: (document.querySelector('.inventory-panel')?.innerText || '').includes('已退出')}))()`);
    if (imported.week !== 4 || imported.cash !== 6233900 || imported.v2 !== 'LOCAL-ORIGINAL' || !imported.exited) failures.push('settings import ' + JSON.stringify(imported));
    notes.import = imported;
  }
  const ended = endedSave();
  if (!ended.bestLegacy || !ended.worstLegacy) failures.push('ended setup not legacy extremes ' + ended.best + '/' + ended.worst);
  else {
    await cdp.evaluate(`localStorage.setItem('homeyear.save.v3', ${JSON.stringify(ended.save)}); localStorage.setItem('homeyear.tutorial','seen'); location.reload()`);
    if (!await ready(`!!document.querySelector('[data-testid=continue]')`)) failures.push('continue missing');
    else {
      await cdp.evaluate(`document.querySelector('[data-testid=continue]').click()`);
      await delay(500);
      const modal = await cdp.evaluate(`document.querySelector('.dialog-body')?.innerText || ''`);
      const lines = await cdp.evaluate(`document.querySelectorAll('.dialog-body .inventory-line').length`);
      if (!modal.includes(ended.best) || !modal.includes(ended.worst) || lines < 20) failures.push('result modal ' + ended.best + '/' + ended.worst + ' lines ' + lines);
      notes.result = {best: ended.best, worst: ended.worst, lines};
    }
  }
  const report = {notes, consoleErrors, failures, screenshots: fs.readdirSync(outDir).filter(name => name.endsWith('.png'))};
  console.log(JSON.stringify(report, null, 2));
  await edge.cleanup();
  if (failures.length || consoleErrors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
