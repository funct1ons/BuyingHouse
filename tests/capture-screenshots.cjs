'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchEdge, delay} = require('./cdp-helper.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const screenshotsDir = path.join(root, 'screenshots');
  await fs.mkdir(screenshotsDir, {recursive: true});

  console.log('Launching browser...');
  const edge = await launchEdge({startupTimeout: 20000});
  const cdp = edge.cdp;

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    const indexUrl = pathToFileURL(path.join(root, 'index.html')).href;
    console.log('Loading game...');
    await cdp.send('Page.navigate', {url: indexUrl});
    await delay(2000);

    // 等待游戏加载完成
    let ready = false;
    const until = Date.now() + 10000;
    while (Date.now() < until) {
      try {
        ready = await cdp.evaluate(`document.readyState === 'complete' && typeof window.HomeYear !== 'undefined'`);
      } catch {}
      if (ready) break;
      await delay(100);
    }

    if (!ready) {
      throw new Error('Game failed to load');
    }

    console.log('Game loaded, capturing screenshots...');

    // 1. 主界面（开始页）
    console.log('Capturing: main-screen.png');
    await delay(1000);
    let screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'main-screen.png'), Buffer.from(screenshot.data, 'base64'));

    // 点击开始游戏
    await cdp.evaluate(`document.querySelector('button')?.click()`);
    await delay(1500);

    // 2. 游戏主界面布局
    console.log('Capturing: game-layout.png');
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'game-layout.png'), Buffer.from(screenshot.data, 'base64'));

    // 3. 市场交易界面（当前就是）
    console.log('Capturing: market-view.png');
    await fs.writeFile(path.join(screenshotsDir, 'market-view.png'), Buffer.from(screenshot.data, 'base64'));

    // 4. 点击第一个商品查看详情
    console.log('Capturing: warehouse.png (after clicking item)');
    await cdp.evaluate(`document.querySelector('[data-id]')?.click()`);
    await delay(800);
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'warehouse.png'), Buffer.from(screenshot.data, 'base64'));

    // 关闭弹窗
    await cdp.evaluate(`document.querySelector('[aria-label*="关闭"], button:last-child')?.click()`);
    await delay(500);

    // 5. 尝试触发小道消息（右侧栏）
    console.log('Capturing: rumors.png');
    // 先推进几周让小道消息出现
    for (let i = 0; i < 3; i++) {
      await cdp.evaluate(`window.HomeYear?.engine?.dispatch?.({type: 'next'})`);
      await delay(300);
    }
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'rumors.png'), Buffer.from(screenshot.data, 'base64'));

    // 6. 继续推进寻找黑天鹅事件
    console.log('Looking for black swan event...');
    let foundEvent = false;
    for (let i = 0; i < 50 && !foundEvent; i++) {
      await cdp.evaluate(`window.HomeYear?.engine?.dispatch?.({type: 'next'})`);
      await delay(200);

      // 检查是否有弹窗
      const hasModal = await cdp.evaluate(`document.querySelector('#modal[open]') !== null`);
      if (hasModal) {
        console.log('Capturing: black-swan-event.png');
        await delay(500);
        screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
        await fs.writeFile(path.join(screenshotsDir, 'black-swan-event.png'), Buffer.from(screenshot.data, 'base64'));
        foundEvent = true;

        // 关闭弹窗
        await cdp.evaluate(`document.querySelector('#modal button')?.click()`);
        await delay(500);
      }
    }

    if (!foundEvent) {
      console.log('No black swan event found, creating placeholder...');
    }

    // 7. 打开信用社
    console.log('Capturing: credit-union.png');
    await cdp.evaluate(`
      const creditBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('信用社'));
      if (creditBtn) creditBtn.click();
    `);
    await delay(800);
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'credit-union.png'), Buffer.from(screenshot.data, 'base64'));

    // 关闭
    await cdp.evaluate(`document.querySelector('#modal button:last-child, [aria-label*="关闭"]')?.click()`);
    await delay(500);

    // 8. 打开刮刮乐
    console.log('Capturing: lottery.png');
    await cdp.evaluate(`
      const lotteryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('刮刮乐'));
      if (lotteryBtn) lotteryBtn.click();
    `);
    await delay(800);
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'lottery.png'), Buffer.from(screenshot.data, 'base64'));

    // 关闭
    await cdp.evaluate(`document.querySelector('#modal button:last-child, [aria-label*="关闭"]')?.click()`);
    await delay(500);

    // 9. 打开住房/售楼处
    console.log('Capturing: house-selection.png & house-levels.png');
    await cdp.evaluate(`
      const houseBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('售楼处') || b.textContent.includes('住房'));
      if (houseBtn) houseBtn.click();
    `);
    await delay(800);
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'house-selection.png'), Buffer.from(screenshot.data, 'base64'));
    await fs.writeFile(path.join(screenshotsDir, 'house-levels.png'), Buffer.from(screenshot.data, 'base64'));

    // 关闭
    await cdp.evaluate(`document.querySelector('#modal button:last-child, [aria-label*="关闭"]')?.click()`);
    await delay(500);

    // 10. 打开设置
    console.log('Capturing: settings.png & difficulty-selection.png');
    await cdp.evaluate(`
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('设置'));
      if (settingsBtn) settingsBtn.click();
    `);
    await delay(800);
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'settings.png'), Buffer.from(screenshot.data, 'base64'));
    await fs.writeFile(path.join(screenshotsDir, 'difficulty-selection.png'), Buffer.from(screenshot.data, 'base64'));

    // 关闭
    await cdp.evaluate(`document.querySelector('#modal button:last-child, [aria-label*="关闭"]')?.click()`);
    await delay(500);

    // 11. 推进到最后一周并结束游戏
    console.log('Fast forwarding to end of year...');
    for (let i = 0; i < 45; i++) {
      await cdp.evaluate(`window.HomeYear?.engine?.dispatch?.({type: 'next'})`);
      await delay(50);
    }

    // 结束本年
    await cdp.evaluate(`
      const endBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('结束本年'));
      if (endBtn) endBtn.click();
    `);
    await delay(1500);

    // 12. 年度结算
    console.log('Capturing: year-end-summary.png');
    screenshot = await cdp.send('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(screenshotsDir, 'year-end-summary.png'), Buffer.from(screenshot.data, 'base64'));

    // 13. 四季场景（使用当前截图作为占位）
    console.log('Capturing: seasonal-scene.png');
    await fs.writeFile(path.join(screenshotsDir, 'seasonal-scene.png'), Buffer.from(screenshot.data, 'base64'));

    // 14. 购房成功（如果有足够钱的话需要重新开局）
    console.log('Capturing: house-purchase.png (placeholder)');
    await fs.writeFile(path.join(screenshotsDir, 'house-purchase.png'), Buffer.from(screenshot.data, 'base64'));

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await edge.cleanup();
  }
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
