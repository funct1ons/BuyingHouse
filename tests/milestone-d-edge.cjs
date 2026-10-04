'use strict';
// Edge file:// checks: number keys follow visible card order; surge is only the fresh
// headline card when abs(changeBps) >= 2500 and motion is on; continue/import do not replay it.
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');

const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const outDir = path.join(root, 'docs', 'gameplay-d-evidence');
const BIG = {seed: 'SURGE-45', week: 24, id: 'fruit', abs: 2500};
const SMALL = {seed: 'SURGE-24', week: 5, id: 'mask', abs: 2499};
const NONE = {seed: 'SURGE-49', week: 42};

(async () => {
  fs.mkdirSync(outDir, {recursive: true});
  const failures = [];
  const notes = {};
  const consoleErrors = [];
  const external = [];
  let edge;
  function fail(msg) {
    failures.push(msg);
    console.error('FAIL ' + msg);
  }
  try {
    edge = await launchEdge();
    const cdp = edge.cdp;
    notes.browser = edge.version && (edge.version.Browser || edge.version);
    cdp.on('Runtime.exceptionThrown', p => consoleErrors.push(JSON.stringify(p.exceptionDetails || p).slice(0, 400)));
    cdp.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') consoleErrors.push(p.args.map(a => a.value || a.description).join(' ')); });
    cdp.on('Network.requestWillBeSent', p => { if (/^https?:|^wss?:/i.test(p.request.url)) external.push(p.request.url); });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});

    async function ready(expr, ms = 15000) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        try { if (await cdp.evaluate(expr)) return true; } catch (e) {}
        await delay(100);
      }
      return false;
    }
    async function click(sel) {
      const status = await cdp.evaluate(`(() => {
        const e = document.querySelector(${JSON.stringify(sel)});
        if (!e) return 'missing';
        if (e.disabled) return 'disabled';
        e.click();
        return 'ok';
      })()`);
      if (status !== 'ok') throw Error(status + ' ' + sel);
      await delay(280);
    }
    async function dialogOpen() {
      return cdp.evaluate(`!!(document.querySelector('dialog') && document.querySelector('dialog').open)`);
    }
    async function closeDialog() {
      if (await dialogOpen()) await click('[data-action=close]');
    }
    async function blurFields() {
      await cdp.evaluate(`(() => { const a = document.activeElement; if (a && a !== document.body) a.blur(); return document.activeElement ? document.activeElement.tagName : 'NONE'; })()`);
    }
    async function pressDigit(n) {
      await blurFields();
      const key = String(n);
      const code = 'Digit' + key;
      const vk = 48 + n;
      await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: key});
      await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk});
      await delay(150);
    }
    async function market() {
      return cdp.evaluate(`(() => {
        const s = HomeYear.UI.snapshot();
        if (!s) return {error: 'no snapshot'};
        const head = (s.news || []).find(n => n.kind === 'headline' && n.fresh) || null;
        const cards = [...document.querySelectorAll('#market-list [data-testid^=product-]')].map(el => el.dataset.id);
        const surge = [...document.querySelectorAll('#market-list .product.surge')].map(el => el.dataset.id);
        const dialog = document.querySelector('dialog');
        const open = !!(dialog && dialog.open);
        const title = open && document.querySelector('#modal-title') ? document.querySelector('#modal-title').textContent : '';
        const opened = open ? HomeYear.products.concat(HomeYear.legacyProducts).find(p => title === p.name + ' · 商品与交易') : null;
        return {
          week: s.week,
          cards,
          surge,
          catalog0: HomeYear.products[0].id,
          listed: s.listing.slice(),
          head: head ? {id: head.productId, abs: Math.abs(head.changeBps), fresh: head.fresh} : null,
          dialogOpen: open,
          opened: opened ? opened.id : '',
          submit: !!(open && document.querySelector('[data-testid=trade-submit]')),
          animation: document.body.dataset.animation || '',
          reduce: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
        };
      })()`);
    }
    async function weekRaw(seed, week) {
      return cdp.evaluate(`(() => {
        const e = new HomeYear.Engine(${JSON.stringify(seed)}, 'standard');
        for (let w = 1; w < ${week}; w++) {
          const v = e.visible();
          const r = e.dispatch({type: 'next', revision: v.revision, token: 'd' + w});
          if (!r.ok) throw Error(r.error);
        }
        return JSON.stringify(e.snapshot());
      })()`);
    }
    async function importRaw(raw) {
      await closeDialog();
      await click('[data-action=settings]');
      const placed = await cdp.evaluate(`(() => {
        const t = document.querySelector('[data-testid=save-text]');
        if (!t) return 'missing save-text';
        t.value = ${JSON.stringify(raw)};
        t.dispatchEvent(new Event('input', {bubbles: true}));
        return 'ok';
      })()`);
      if (placed !== 'ok') throw Error(placed);
      await click('[data-testid=import]');
      await click('[data-testid=confirm-yes]');
      await delay(200);
      await closeDialog();
    }
    async function setAnimation(value) {
      await closeDialog();
      await click('[data-action=settings]');
      const got = await cdp.evaluate(`(() => {
        const s = document.querySelector('[data-setting=animation]');
        if (!s) return 'missing animation setting';
        s.value = ${JSON.stringify(value)};
        s.dispatchEvent(new Event('change', {bubbles: true}));
        return document.body.dataset.animation;
      })()`);
      await delay(150);
      await closeDialog();
      if (got !== value) throw Error('animation became ' + got);
    }
    async function nextWeek() {
      const before = await market();
      if (!before || before.error) throw Error(before && before.error || 'market missing before next');
      await closeDialog();
      await click('[data-testid=next-week]');
      const after = await market();
      if (!after || after.error) throw Error('market missing after next');
      if (after.week !== before.week + 1) throw Error('next did not advance ' + before.week + ' -> ' + after.week);
      return after;
    }
    function expectSurge(view, spec, want) {
      if (!view || !view.cards || !view.cards.length) {
        fail(spec + ' market cards missing');
        return;
      }
      if (!view.head || view.head.id !== spec.id || view.head.abs !== spec.abs || view.head.fresh !== true) {
        fail(spec + ' headline ' + JSON.stringify(view.head));
        return;
      }
      if (!view.cards.includes(spec.id)) {
        fail(spec + ' headline card not visible ' + view.cards.join(','));
        return;
      }
      if (want) {
        if (view.surge.length !== 1 || view.surge[0] !== spec.id) fail(spec + ' surge ' + JSON.stringify(view.surge));
      } else if (view.surge.length) {
        fail(spec + ' unexpected surge ' + JSON.stringify(view.surge));
      }
    }

    await cdp.send('Page.navigate', {url});
    if (!await ready(`document.readyState==='complete' && !!window.HomeYear && !!document.querySelector('[data-testid=new-game]')`)) {
      throw Error('page not ready');
    }
    await cdp.evaluate(`localStorage.clear(); localStorage.setItem('homeyear.tutorial','seen')`);
    await cdp.evaluate(`(() => { const e = document.querySelector('[data-testid=seed]'); if (!e) throw Error('missing seed'); e.value = 'KEY-D1'; })()`);
    await click('[data-testid=new-game]');
    if (!await ready(`!!document.querySelector('[data-testid=next-week]') && document.querySelectorAll('#market-list [data-testid^=product-]').length === 8`)) {
      throw Error('game shelf not ready');
    }

    const shelf = await market();
    notes.shelf = {cards: shelf.cards, catalog0: shelf.catalog0};
    if (!shelf.cards || shelf.cards.length !== 8) fail('week listing is not 8 visible cards ' + JSON.stringify(shelf.cards));
    else {
      await pressDigit(1);
      const opened = await market();
      if (!opened.submit || opened.opened !== shelf.cards[0]) fail('key 1 opened ' + opened.opened + ' visible ' + shelf.cards[0]);
      if (shelf.cards[0] !== shelf.catalog0 && opened.opened === shelf.catalog0) fail('key 1 fell back to catalog[0]');
      await closeDialog();
      if (await dialogOpen()) fail('trade dialog did not close');
      await pressDigit(9);
      const ninth = await market();
      if (ninth.dialogOpen) fail('key 9 opened a card when only 8 are visible ' + ninth.opened);
    }

    const searched = await cdp.evaluate(`(() => {
      const e = document.querySelector('[data-testid=search]');
      if (!e) return 'missing search';
      e.value = '。';
      e.dispatchEvent(new Event('input', {bubbles: true}));
      e.blur();
      const sort = document.querySelector('[data-testid=sort]');
      if (!sort) return 'missing sort';
      sort.value = 'price';
      sort.dispatchEvent(new Event('change', {bubbles: true}));
      sort.blur();
      return [...document.querySelectorAll('#market-list [data-testid^=product-]')].map(el => el.dataset.id);
    })()`);
    if (!Array.isArray(searched) || searched.length < 9) fail('price-sorted visible cards ' + JSON.stringify(searched));
    else if (searched[0] === shelf.catalog0) fail('price order still starts at catalog[0] ' + searched[0]);
    else {
      notes.priceOrder = searched;
      const openedIds = [];
      for (let n = 1; n <= 9; n++) {
        await pressDigit(n);
        const view = await market();
        openedIds.push(view.opened);
        if (!view.submit || view.opened !== searched[n - 1]) fail('key ' + n + ' opened ' + view.opened + ' visible ' + searched[n - 1]);
        if (view.opened === shelf.catalog0 && searched[n - 1] !== shelf.catalog0) fail('key ' + n + ' used catalog[0] instead of visible card');
        await closeDialog();
        if (await dialogOpen()) fail('dialog stayed open after key ' + n);
      }
      notes.openedByKey = openedIds;
    }

    await cdp.evaluate(`(() => {
      const e = document.querySelector('[data-testid=search]');
      if (!e) throw Error('missing search');
      e.value = '';
      e.dispatchEvent(new Event('input', {bubbles: true}));
      e.blur();
      const sort = document.querySelector('[data-testid=sort]');
      if (!sort) throw Error('missing sort');
      sort.value = 'default';
      sort.dispatchEvent(new Event('change', {bubbles: true}));
      sort.blur();
    })()`);

    async function arrive(spec) {
      await importRaw(await weekRaw(spec.seed, spec.week - 1));
      const imported = await market();
      if (!imported.cards || !imported.cards.length) throw Error('cards missing after import ' + spec.seed);
      if (imported.surge.length) fail(spec.seed + ' import of prior week already surged ' + JSON.stringify(imported.surge));
      if (imported.week !== spec.week - 1) throw Error('imported week ' + imported.week);
      return nextWeek();
    }

    const big = await arrive(BIG);
    notes.big = {week: big.week, head: big.head, surge: big.surge, animation: big.animation, reduce: big.reduce};
    if (big.animation !== 'normal' || big.reduce) fail('motion was not on for the 2500 case ' + big.animation + ' reduce=' + big.reduce);
    expectSurge(big, BIG, true);

    const replayRaw = await weekRaw(BIG.seed, BIG.week);
    await importRaw(replayRaw);
    const importedBig = await market();
    notes.importReplay = {week: importedBig.week, head: importedBig.head, surge: importedBig.surge};
    expectSurge(importedBig, BIG, false);

    await cdp.evaluate(`location.reload()`);
    if (!await ready(`!!document.querySelector('[data-testid=continue]') && !document.querySelector('[data-testid=continue]').disabled`)) {
      throw Error('continue missing');
    }
    await click('[data-testid=continue]');
    const continued = await market();
    notes.continueReplay = {week: continued.week, head: continued.head, surge: continued.surge};
    expectSurge(continued, BIG, false);

    const small = await arrive(SMALL);
    notes.small = {week: small.week, head: small.head, surge: small.surge};
    expectSurge(small, SMALL, false);

    const quiet = await arrive(NONE);
    notes.none = {week: quiet.week, head: quiet.head, surge: quiet.surge, cards: quiet.cards.length};
    if (quiet.head) fail('expected no fresh headline ' + JSON.stringify(quiet.head));
    if (!quiet.cards.length) fail('quiet week cards missing');
    if (quiet.surge.length) fail('quiet week surged ' + JSON.stringify(quiet.surge));
    if (quiet.week !== NONE.week) fail('quiet week ' + quiet.week);

    await setAnimation('reduced');
    const reduced = await arrive(BIG);
    notes.reducedSetting = {week: reduced.week, head: reduced.head, surge: reduced.surge, animation: reduced.animation};
    if (reduced.animation !== 'reduced') fail('animation setting did not stick ' + reduced.animation);
    expectSurge(reduced, BIG, false);

    await setAnimation('normal');
    await cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
    const media = await cdp.evaluate(`({animation: document.body.dataset.animation, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches})`);
    if (!media.reduce || media.animation !== 'normal') fail('system reduced motion not applied ' + JSON.stringify(media));
    const system = await arrive(BIG);
    notes.systemReduce = {week: system.week, head: system.head, surge: system.surge, animation: system.animation, reduce: system.reduce};
    if (!system.reduce || system.animation !== 'normal') fail('system reduced motion dropped before next ' + JSON.stringify(system));
    expectSurge(system, BIG, false);

    if (external.length) fail('page https/wss requests ' + external.slice(0, 5).join(' | '));
    if (consoleErrors.length) fail('console errors ' + consoleErrors[0]);
    notes.external = external;
    notes.consoleErrors = consoleErrors.length;
  } catch (e) {
    fail(e && e.stack ? e.stack.split('\n')[0] + ' ' + e.message : String(e));
    console.error(e);
  } finally {
    if (edge) await edge.cleanup().catch(e => fail('cleanup ' + e.message));
    const report = {browser: notes.browser, notes, failures, externalCount: external.length, consoleErrors};
    fs.writeFileSync(path.join(outDir, 'keys-surge.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({browser: notes.browser, failures, notes}, null, 2));
    if (failures.length) process.exitCode = 1;
  }
})();
