'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');
const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const dest = path.join(root, 'docs', 'gameplay-evidence', 'week2-bulletin-1600.png');
(async () => {
  const edge = await launchEdge();
  const cdp = edge.cdp;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1600, height: 900, deviceScaleFactor: 1, mobile: false});
  await cdp.send('Page.navigate', {url});
  const until = Date.now() + 15000;
  let ready = false;
  while (Date.now() < until) {
    try { ready = await cdp.evaluate(`document.readyState==='complete' && !!document.querySelector('[data-testid=new-game]')`); } catch (e) {}
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw Error('page not ready');
  await cdp.evaluate(`localStorage.setItem('homeyear.tutorial','seen'); document.querySelector('[data-testid=seed]').value='EDGE-B1'; document.querySelector('[data-testid=new-game]').click()`);
  const until2 = Date.now() + 10000;
  let game = false;
  while (Date.now() < until2) {
    try { game = await cdp.evaluate(`!!document.querySelector('[data-testid=next-week]')`); } catch (e) {}
    if (game) break;
    await delay(100);
  }
  if (!game) throw Error('game not open');
  await cdp.evaluate(`document.querySelector('[data-testid=next-week]').click()`);
  await delay(400);
  await cdp.evaluate(`document.querySelectorAll('.toast').forEach(el => el.remove())`);
  const closed = await cdp.evaluate(`!document.querySelector('[data-testid=trade-submit]') && (document.querySelector('[data-testid=bulletin]')?.innerText || '').includes('街区快报')`);
  if (!closed) throw Error('bulletin not visible');
  const png = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  await fs.promises.writeFile(dest, Buffer.from(png.data, 'base64'));
  const tradeHash = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'docs', 'gameplay-evidence', 'week2-trade-1600.png'))).digest('hex');
  const bulletinHash = require('node:crypto').createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  console.log(JSON.stringify({bytes: fs.statSync(dest).size, bulletinHash, tradeHash, distinct: bulletinHash !== tradeHash}));
  await edge.cleanup();
  if (bulletinHash === tradeHash) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
