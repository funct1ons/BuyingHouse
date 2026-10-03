# 视觉升级 · 实测报告

范围：本报告只覆盖画面与 UI 集成（`js/art-kit.js`、`js/art-scenes.js`、`js/art.js`、`js/ui.js`、`css/scenes.css`、`index.html`、`assets/build-art.cjs`）。音频由另一位 worker 负责，记录在 `docs/audio.md`。**以下全部是 headless Edge 自动化实测，不等于人工试玩或人工审美评审。**

## 环境与时间

Windows 11，Node v24.14.1，Edge 154.0.4258.53（headless，`--disable-gpu`），file:// 打开 `index.html`。最终整合轮在同一工作树上按顺序执行，时间为 2026-10-03 16:25:06Z–16:31:17Z（UTC）。此时音频 worker 已停止写入，climate 已统一为 steady，“点击启用声音”提示已接入。

| 命令 | 结果 |
|---|---|
| `node tests/run.cjs` | 18 passed, 0 failed |
| `node tests/ui-interaction.cjs` | exit 0（16:25:44） |
| `node tests/acceptance-supplement.cjs` | exit 0，5/5（16:25:48） |
| `node tests/system-browser.cjs` | exit 0，28/28，无运行时错误（16:27:10） |
| `node tests/cdp-smoke.cjs --width 1366 --height 768` | 无失败 |
| `node assets/build-art.cjs` | PASS（20 个独立商品图标、9 个场景、45 个基础文件 + 21 个季节/阶段变体） |
| `node tests/av-audio-director.cjs`（音频 worker 的测试，只读运行） | 13/13 |
| `node tests/av-integration.cjs --idle 60` | **10 passed, 0 failed**（16:28:26） |
| `node tests/av-visual.cjs --idle 60` | **93 passed, 0 failed**（16:31:17，含 2 项迟滞一致性） |

现有测试文件、核心 JS、`css/main.css`、`simulation/`、平衡 JSON 都没有改动（`git diff --quiet` 确认）。旧测试会照常重写自己的截图与报告（`docs/ui-evidence/`、`docs/acceptance-evidence/`）。

**注意**：音频 worker 之后如果再修改 `js/audio*.js`，上面的旧回归需要在最终整合时重跑。本表只代表上述时间点的工作树。

## `tests/av-visual.cjs` 覆盖内容

脚本只通过 DOM 点击和设置对话框的公开 JSON 导入来驱动真实 `index.html`。fixture 用独立的 `HomeYear.Engine` 公开 `dispatch` 推进周数；需要现金时按 acceptance-final 的做法计入 `stats.grants`，这属于非自然经济。

- **6 种视口**：1366×768、1600×900、1920×1080、2560×1440，以及 1920×1080 在 125%（1536×864 @1.25）和 150%（1280×720 @1.5）缩放下。每种都截取开始页、市场、交易、住房传单、购房庆祝、购房后的市场、成功结算和未购房结算，共 48 张，另有季节/阶段截图 4 张、减少动效庆祝 1 张。
- **布局**：无页面溢出；`next-week` 可见；顶栏各块不重叠；关键文字不被裁切；第一张商品卡可见。所有视口都通过。
- **对比度**：脚本把背景链按 alpha 合成后计算 WCAG 对比度（正文 ≥4.5:1，大字 ≥3:1；插画上方的浮层另行处理）。实测各页最低值：开始页 4.94、市场 4.92、交易 4.92、住房 4.78、成功结算 4.74、150% 缩放市场 4.92，全部达标。早期 ☆ 关注星为 2.73，已改为 #8a6420。
- **SVG 预算**：市场画面全部 SVG 元素约 1659 个，各视口相同，低于 2500。
- **性能（headless 基线）**：
  - 开始页首次绘制 137ms：headless 没有 paint entry，取 load 后双 rAF；DOMContentLoaded 为 78ms。
  - `renderGame` 中位数 1.6ms（1366）。
  - 空闲 60s（市场页，音乐设置开，无交互）：TaskDuration 占墙钟时间 0.45%，低于 3%。此时 AudioContext 因从未有可信手势而处于 suspended，**所以这不代表音乐播放时的 CPU 开销**。
- **场景缓存**：切换分类、关注再取消（多次 `renderGame`/`renderProducts`）后，`street` 和 `home` 场景槽的构建次数不变。
- **庆祝**：彩纸与 `celebrating` 先确认开启；2.5s 后 rAF 停止，遮罩移除。系统减少动效时只显示静态卡片、没有 canvas，结束后也会清理。用模拟的 `visibilitychange`（headless 无法真正隐藏标签页）验证页面隐藏时 rAF 立即停止、遮罩移除。
- **阶段/季节**：第 5 周冬/early，第 16 周春/development（靠现金进度），第 27 周夏/development，第 47 周秋/sprint；冲刺期顶栏日历变成黄铜倒计时环。设置“动画：关闭”与系统减少动效时，`.product` 都不再有动画。
- **setScene 协议**（climate 取 hot/steady/cold）：测试在页面上包装 `HomeYear.Audio.setScene` 记录调用，共 234 次：
  - 键只包括 `screen/week/status/house/progress/season/climate/dialogOpen/dialog`，取值都是合法枚举；
  - 覆盖开始页、游戏、对话框开关和两种结局；
  - 相邻两次不重复；
  - 最后一次与可见状态一致。
- 无运行时或控制台错误，没有 http(s) 请求。

## 整合测试 `tests/av-integration.cjs`

使用 CDP 真实鼠标输入（isTrusted），只验证数字状态：

- **声音受阻**：模拟自动播放限制（新 AudioContext 处于 suspended，且 `resume()` 拒绝）。点击“开始新的一年”后，音频模块派发 `homeyear:audio-blocked`，`status().needsGesture=true`，UI 在右下角显示可点击的“🔈 点击启用声音”（`data-testid=audio-enable`）。放行后真实点击该提示，状态变为 running，提示移除。
- **音乐实际播放时的空闲 CPU**：可信点击开局后 AudioContext 为 running，音乐调度器开启且只有 1 个 setInterval，当前曲为 `early`，与画面阶段一致。随后无交互 60s：小节持续推进；主线程 TaskDuration 0.235s，占墙钟时间 **0.39%**（Script 0.21%），低于 3%。注意 Web Audio 渲染在音频线程，不计入这一指标。
- **停止**：模拟页面隐藏会停止调度器；在设置中真实点击关闭音乐后，调度器停止，interval 数为 0，也没有残留提示。
- 无运行时异常。

**发现的问题（属于音频文件，未修改，已报告）**：声音受阻时 `status()` 为 `state:"suspended"` 但 `musicRunning:true`，即上下文没在运行，调度定时器却在跑。用户看得到提示，不会静默，但与 av-direction 3.6 中“musicRunning 只在设置开启且调度器运行时为 true”的语义有出入，也会在受阻期间空转定时器。

**音频信号不代表听感**：以上与音频 worker 的 13+90 项测试都只证明浏览器内的数字信号与调度状态，不证明扬声器发声、音量合适或好听。人工听感没有验证。

## 截图（`docs/av-visual-evidence/`）

建议先看：

- `1366x768-02-market.jpg`：主界面，有街景顶栏、“我的窗口”、遮阳棚货架、品类色签和信笺新闻；
- `1366x768-01-start.jpg`：黄昏开始页；
- `1366x768-07-result-home.jpg` / `1366x768-08-result-rent.jpg`：两种结算绘本；
- `1366x768-03-trade.jpg`（小票）、`1366x768-04-houses.jpg`（传单）、`1366x768-05-celebration.jpg`（开门庆祝）；
- `season-{winter,spring,summer,autumn}-*.jpg`：季节附件与时段；
- `before/`：升级前的截图（取自 HEAD 中的旧证据），供对比；
- `grain/`：纸纹强度对比，见下节。

## 纸纹对比与取值

主审指出第一版纸纹是逐像素高频噪点，像照片噪声。现在的做法：

1. 生成器改成“低频色块（双线性插值的 9×9 值场）为主 + 极弱细噪 + 稀疏纤维”；
2. 强度用 `GRAIN` 统一缩放。

同一局 1366 市场在 1 / 0.3 / 0.15 / 0 四档下的对比见 `grain/market-1366-grain-*-{full,zoom}.png`（zoom 为 2 倍放大裁切）。最终取 **0.3**：面板呈现柔和的纸面明暗，标题、数字和正文区没有颗粒，视觉强度明显低于原来的 1/3。`?grain=` 查询参数只给开发对比用，不改变存档或设置。

## 阶段阈值与迟滞（已确认，与音频一致）

`av-direction.md` 原稿以 `p<0.45` 作为 early 条件，但标准难度开局 p = 3000/6500 = 0.46，轻松为 0.77，会让开局直接跳过 early。主审已批准改为**进入 0.90、退出 0.80**，`js/audio-director.js` 的 `RULES.upAt/downAt` 已改，`av-direction.md` 3.2/3.3/5.2 也已同步。

画面阶段不再单独计算：`ui.js` 持有一个 UI 专用的 `HomeYear.AudioDirector.createDirector()` 实例，每次 `syncScene`/渲染时用发给音频的同一份公开 payload 调 `request()`，取它的逻辑目标阶段（`target`）作为 `body[data-phase]` 和插画时段。它与音频引擎里的 director 不是同一个对象，也不读音频的实际 cue、乐句边界或驻留计时；所以画面立即切到逻辑阶段，音乐在下一个乐句边界跟上。director 脚本缺失时，ui.js 内有等价的回退实现（同样的 0.90/0.80 规则）。

`av-visual.cjs` 新增实测：在第 10 周依次导入 p = 0.50 → 0.92 → 0.85 → 0.75 → 0.85，画面阶段为 early → development → development → early → early，与一个新建的 `HomeYear.AudioDirector` 喂同一序列得到的结果完全一致。

**协议对齐**：climate 统一为 `hot/steady/cold`（与 `audio-director.js` 一致；此前 UI 发送 `neutral`，由 director 兜底为 steady，结果相同，现已改为直接发送 `steady`）。season 由 UI 以 `winter/spring/summer/autumn` 发送，director 的 `normalize()` 只识别中文季节，所以音频侧 season 为 null；当前音频实现没有任何地方使用 season，所以没有听感影响。将来如果音频要按季节变化，需要在 normalize 中接受英文值。

## 未完成与局限

- 视觉审美只来自开发者对自动截图的自查，没有人工用户测试，也没有在真实 GPU/显示器上目视检查。
- 性能数字来自 headless、禁用 GPU 的环境，只能作为回归基线，不代表低端笔记本的实际表现。音乐实际播放时的空闲 CPU 没有测（无可信手势时 AudioContext 不运行）。
- 页面隐藏只用模拟事件验证，没有真实切换标签页。
- 开始页视差只在 pointermove 时运行，没有做自动化截图验证（headless 没有真实指针）。亮灯动画只验证了数量 ≤12 和减少动效下关闭。
- 季节附件与早餐铺蒸汽都是静态的，没有循环动画。
- 本轮没有提交（commit/push）。
