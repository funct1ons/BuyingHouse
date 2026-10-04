'use strict';
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');
const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
(async () => {
  const failures = [];
  const edge = await launchEdge();
  const cdp = edge.cdp;
  const consoleErrors = [];
  const external = [];
  cdp.on('Runtime.exceptionThrown', p => consoleErrors.push(JSON.stringify(p.exceptionDetails || p).slice(0, 400)));
  cdp.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') consoleErrors.push(p.args.map(a => a.value || a.description).join(' ')); });
  cdp.on('Network.requestWillBeSent', p => { if (/^https?:|^wss?:/i.test(p.request.url)) external.push(p.request.url); });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  await cdp.send('Page.navigate', {url});
  const until = Date.now() + 15000;
  let ready = false;
  while (Date.now() < until) {
    try { ready = await cdp.evaluate(`document.readyState==='complete' && !!window.HomeYear && !!document.querySelector('[data-testid=new-game]')`); } catch (e) {}
    if (ready) break;
    await delay(100);
  }
  if (!ready) failures.push('page not ready');
  await cdp.evaluate(`document.querySelector('[data-testid=seed]').value='EDGE-B1'`);
  await cdp.evaluate(`document.querySelector('[data-testid=new-game]').click()`);
  await delay(400);
  await cdp.evaluate(`document.querySelector('[data-action=tour-finish]') && document.querySelector('[data-action=tour-finish]').click()`);
  await delay(300);
  const opened = await cdp.evaluate(`(() => {
    const s = HomeYear.UI.snapshot();
    const cards = [...document.querySelectorAll('[data-testid^=product-]')].map(el => el.dataset.testid);
    return {week:s.week, listed:s.listing.length, cards:cards.length, bulletin:document.querySelector('[data-testid=bulletin]')?.innerText||'', priceBook:s.priceBook.id, footer:!!document.querySelector('[data-testid=next-week]')};
  })()`);
  if (opened.week !== 1 || opened.listed !== 8 || opened.cards !== 8 || opened.priceBook !== '0.2' || !opened.footer) failures.push('open ' + JSON.stringify(opened));
  if (!opened.bulletin.includes('街区快报')) failures.push('bulletin missing');
  await cdp.evaluate(`document.querySelector('[data-testid^=product-]').click()`);
  await delay(200);
  const trade = await cdp.evaluate(`(() => ({open:!!document.querySelector('[data-testid=trade-submit]'), preview:document.querySelector('#preview')?.innerText||''}))()`);
  if (!trade.open || !trade.preview.includes('手续费')) failures.push('trade preview ' + JSON.stringify(trade));
  await cdp.evaluate(`document.querySelector('[data-action=close]').click()`);
  await delay(200);
  const before = await cdp.evaluate(`JSON.stringify(HomeYear.UI.snapshot())`);
  await cdp.evaluate(`document.querySelector('[data-testid=next-week]').click()`);
  await delay(400);
  const afterNext = await cdp.evaluate(`(() => {
    const s = HomeYear.UI.snapshot();
    const head = (s.news.find(n => n.kind==='headline')||{});
    return {week:s.week, bulletin:document.querySelector('[data-testid=bulletin]').innerText, change:head.changeBps, id:head.id, title:head.title||''};
  })()`);
  if (afterNext.week !== 2) failures.push('week ' + afterNext.week);
  if (afterNext.id && afterNext.title && /即将上涨|建议买入|稳赚/.test(afterNext.bulletin)) failures.push('advice in bulletin');
  await cdp.evaluate(`location.reload()`);
  await delay(800);
  const until2 = Date.now() + 10000;
  let back = false;
  while (Date.now() < until2) {
    try { back = await cdp.evaluate(`!!document.querySelector('[data-testid=continue]')`); } catch (e) {}
    if (back) break;
    await delay(100);
  }
  await cdp.evaluate(`document.querySelector('[data-testid=continue]').click()`);
  await delay(500);
  const continued = await cdp.evaluate(`HomeYear.UI.snapshot().week`);
  if (continued !== 2) failures.push('continue week ' + continued);
  const matched = await cdp.evaluate(`(() => {
    const live = HomeYear.UI.snapshot();
    const other = new HomeYear.Engine();
    other.restore(JSON.parse(${JSON.stringify(before)}));
    const r = other.dispatch({type:'next', revision:other.visible().revision, token:'edge-compare'});
    if (!r.ok) return r.error;
    return JSON.stringify(other.snapshot()) === JSON.stringify(live);
  })()`);
  if (matched !== true) failures.push('continue future mismatch ' + matched);
  const report = {url, opened:{week:opened.week, listed:opened.listed, cards:opened.cards, priceBook:opened.priceBook}, afterNext, continued, matched, consoleErrors, external, failures};
  console.log(JSON.stringify(report, null, 2));
  await edge.cleanup();
  if (failures.length || consoleErrors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
