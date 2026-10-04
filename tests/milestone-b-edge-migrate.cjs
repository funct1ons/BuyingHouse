'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');
const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const raw = fs.readFileSync(path.join(root, 'docs/fixtures/v2-baseline-migrate.json'), 'utf8');
(async () => {
  const failures = [];
  const edge = await launchEdge();
  const cdp = edge.cdp;
  const consoleErrors = [];
  cdp.on('Runtime.exceptionThrown', p => consoleErrors.push(JSON.stringify(p.exceptionDetails || p).slice(0, 300)));
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  await cdp.send('Page.navigate', {url});
  const until = Date.now() + 15000;
  let ready = false;
  while (Date.now() < until) {
    try { ready = await cdp.evaluate(`document.readyState==='complete' && !!window.HomeYear`); } catch (e) {}
    if (ready) break;
    await delay(100);
  }
  if (!ready) failures.push('page not ready');
  await cdp.evaluate(`localStorage.setItem('homeyear.save.v2', ${JSON.stringify(raw)})`);
  await cdp.evaluate(`location.reload()`);
  await delay(900);
  const until2 = Date.now() + 10000;
  let button = false;
  while (Date.now() < until2) {
    try { button = await cdp.evaluate(`!!document.querySelector('[data-testid=migrate]')`); } catch (e) {}
    if (button) break;
    await delay(100);
  }
  if (!button) failures.push('migrate button missing');
  await cdp.evaluate(`document.querySelector('[data-testid=migrate]').click()`);
  await delay(200);
  await cdp.evaluate(`document.querySelector('[data-testid=confirm-yes]').click()`);
  await delay(600);
  const view = await cdp.evaluate(`(() => {
    const s = HomeYear.UI.snapshot();
    const text = document.querySelector('.inventory-panel')?.innerText || '';
    return {week:s.week, cash:s.cash, gold:s.legacy.gold.qty, book:s.priceBook.id, inventory:text.slice(0, 500), backup:s.migration && s.migration.backup, v2:localStorage.getItem('homeyear.save.v2')===${JSON.stringify(raw)}};
  })()`);
  if (!view.v2) failures.push('v2 overwritten');
  if (view.book !== '0.2' || view.gold < 1 || !view.inventory.includes('已退出')) failures.push('legacy inventory ' + JSON.stringify(view));
  await cdp.evaluate(`[...document.querySelectorAll('.inventory-line')].find(el => el.innerText.includes('已退出')).click()`);
  await delay(250);
  const preview = await cdp.evaluate(`document.querySelector('#preview')?.innerText || ''`);
  if (!preview.includes('回收报价') || !preview.includes('手续费')) failures.push('buyback preview ' + preview.slice(0, 240));
  const report = {view:{week:view.week, cash:view.cash, gold:view.gold, book:view.book, backup:view.backup, v2:view.v2}, preview:preview.slice(0, 240), consoleErrors, failures};
  console.log(JSON.stringify(report, null, 2));
  await edge.cleanup();
  if (failures.length || consoleErrors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
