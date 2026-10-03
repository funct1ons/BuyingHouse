# 视听升级独立代码审计

- 范围：`js/audio.js`、`js/audio-score.js`、`js/audio-director.js`、`js/audio-instruments.js`、`js/art.js`、`js/art-kit.js`（`js/art-scenes.js` 只抽查了纯度）、`js/ui.js` 的 diff、`css/scenes.css`、`tests/av-audio.cjs`、`tests/av-audio-director.cjs`、`tests/av-visual.cjs`、`tests/av-preview.html`。
- 方式：逐行读代码，另跑了两个独立诊断。脚本放在仓库外的 `%TEMP%\avrev\`，没有覆盖任何已有证据，也没有改产品代码或测试。
  - `diag.cjs`：在 Node 里加载真实的 audio-score/director/instruments/audio.js，配一个只记录调用的 AudioContext 桩，用来检查调度逻辑。
  - `result-dialog.cjs`：真实 Edge headless，打开 file:// 的 index.html，先发一次可信点击解锁音频，再导入一局已结束的存档。
- 以下已知修复正在进行，本报告不重复：视觉 phase 迟滞复用、steady 枚举、unlock 失败时的 UI 提示、实际播放时的 CPU 回归，以及整合方后来报告的两项：AudioContext 处于 suspended 时 musicRunning 为 true、调度器空转；`normalize` 的 season 只认中文。

## 结论

找到 3 个中等问题（2 个功能问题、1 个测试缺口，测试缺口让前两个都没被发现），另有 2 个测试偏松的低优先级问题。没有发现严重问题。

**0.3 收尾处置（2026-10-03，逐项，详见 `docs/av-closeout.md`）**：M1 按原始设计定案——结局曲的 T 尾声持续柔和循环、主段 A/B/A′/C 只播一次且不停音，两份文档统一到 `av-direction.md` 的写法，并新增“T 循环不重播主段”的断言；A/B 追踪确认 HEAD 的实际段落序列与之一致（`c.loop` 是曲目循环开关，不是轮回计数），本轮把条件写显式并为“非循环且无尾段”的曲谱补防御分支；M2 结算绘本不再发送 `dialogOpen:true`，结局 BGM 不再被压暗，普通弹窗仍 duck；M3 结局检查改为渲染主段 + 两轮尾声并断言 A 只出现一次；L1 返回标签页断言收紧为只接受 `A2`；L2 `createDirector(rules, initialPhase)` + `audio.js` 传入 `lastPhase`，晚创建引擎不再丢失迟滞。另修：受阻/suspended 时不再启动空转定时器（`musicRunning` 只在真正运行时为 true），`normalize()` 接受英文季节。

已确认没问题的部分：
- 调度定时器只有一个：`timer` 有 null 保护，`stopMusic` 会 clear。
- 退役的曲目实例会被 `sweep` 断开。关闭音乐、或 context 挂起后，也会由 `sweepLater` 用 `Infinity` 清空。
- 乐器 voice 在 `onended` 时断开全部节点。
- 隐藏页面时会停止并记住当前曲目，返回后从 A2 淡入。
- 用户手势之前不会创建 AudioContext：`setScene` 不碰 ctx，`change` 事件里只在 `e.isTrusted` 时才调 unlock。
- 旧 API（`unlock/configure/volume/setVolume/status/play`）的签名和语义都还在；`status()` 只增加了字段。
- 美术和音频代码里没有 `Math.random`，也没有用游戏 RNG，都用各自独立的 mulberry32。
- 没有 http(s) 引用：纸纹用 canvas 生成 dataURL，defs 内联注入。
- UI 的新增代码只读 `engine.snapshot()` 和公开的价格函数，不写存档，也不影响经济系统。

---

## M1 结局曲的尾声 T 会无限循环，与“不循环”的设计不符

- 代码：`js/audio.js:62-66` 的 `Engine.advance`
  ```js
  if(inst.sec>=c.order.length+(c.tail?1:0)){inst.loop++;inst.sec=c.loop?0:c.order.length;}
  if(!c.loop&&inst.sec===c.order.length)inst.inTail=true;
  ```
  对于 `loop:false` 的曲目，T 段放完后 `sec` 会被重新设回 `order.length`，也就是 T 段本身，于是 T 一直重播。`inTail` 被赋值了，但在整个代码库里没有任何地方读取它，没有“播完 T 后停止或保持静音”的逻辑。
- 设计依据：`docs/audio.md:50-51` 写的是“A/B/A′/C 后接 8 小节尾声 T，**不循环**”。
- 复现（`diag.cjs`，真实 Engine，模拟 70 小节）：

  | cue | 每个段落第 1 小节的出现顺序 | T 段重复次数 | `loop` 计数 |
  |---|---|---|---|
  | ending-home | A B A2 C T T T T T | 5 | 4 |
  | ending-rent | A B A2 C T T T T T | 5 | 4 |

  在游戏里，结算对话框不关，T 段就一直重播：ending-rent 66 BPM，约 29 s 一轮；ending-home 84 BPM，约 23 s 一轮。最后一小节 `r:4` 加回到起点的和弦，听起来就是一个短循环。每轮 `loop++` 还会让 PRNG 重新抽变奏，并且会触发 `later` 声部。
- 测试为什么没发现：见 M3。
- 修复方向：在 `advance` 里，当 `!c.loop && inst.inTail` 并且 T 已经放完时，停止排新小节（例如把 `nextBar` 设为 `Infinity`，或者调用 `halt`）；或者在 `tick` 里读取 `inTail`。

## M2 结局曲在整个结算期间都被对话框低通压暗

- 代码：
  - `js/ui.js:72` 的 `result()` 总是通过 `modal(..., 'result')` 打开，`modal()` 会调用 `syncScene()`（`js/ui.js:25`）。
  - `scenePayload` 发出的 `dialogOpen:dialog.open` 是 true（`js/ui.js:20`）。
  - `js/audio-director.js:35` 由此得到 `layers.dialog=true`。
  - `js/audio.js:27` 把音乐低通到 2.5 kHz，并把 pre 增益降到 0.63（约 −4 dB）。
- 后果：两首结局曲（“钥匙”和“还是那间小屋”）只在结算对话框里出现，也就是说它们从头到尾都是 2.5 kHz 低通、−4 dB 的“对话框混音”，玩家从来听不到原本的音色。只有关掉结算框才恢复。`docs/audio.md:31` 说的“对话框打开时只切混音快照”本意是给交易、设置这类临时对话框用的。
- 复现（`result-dialog.cjs`，真实 Edge，file://，先可信点击解锁）：
  ```
  结算框打开: state=running cue=ending-rent dialog=result layers.dialog=true
  关闭结算框: cue=ending-rent layers.dialog=false
  ```
- 测试为什么没发现：`tests/av-audio.cjs:9-10` 的 `SC['ending-home'|'ending-rent']` 没有 `dialogOpen`，测出来的电平和结构都是未被压暗的版本。和真实游戏里的情况不一样。
- 修复方向：
  - UI 侧：`dialogKind==='result'` 时不把 `dialogOpen` 置 true。
  - 或者 director 侧：结局阶段忽略 `dialogOpen`。

  这两处都只改一个条件。

## M3 av-audio 的结局检查只渲染到“刚进 T”，无法发现 M1

- `tests/av-audio.cjs:29`：非循环曲目只渲染 `cue.bars+2` 小节，也就是 40+2，只比 T 开始多 2 小节。
- `tests/av-audio.cjs:41`：只断言 `sections.includes('T')`。

所以“到达尾声”能通过，但“尾声结束后停止”从来没有被验证过。T 无限重复也能拿到 PASS。建议改成渲染 `cue.bars+16`，并断言 T 之后 RMS 回到底噪以下，或者 `timeline` 里 T 只出现一次。同时建议加一个带 `dialogOpen:true` 的结局场景，用来覆盖 M2。

---

## 低优先级（测试偏松，不影响产品行为）

**L1 “返回标签页从 A2 恢复”的断言实际上接受从头播放。**
`tests/av-audio.cjs:107` 接受的段落是 `['A2','C','A']`。如果实现退化成从 A 段开头重播，这条检查照样 PASS。返回后才 2.2 s，还处在 A2 的前一两个小节，应该只接受 `'A2'`。

**L2 引擎晚创建时丢失迟滞记忆。**
`js/audio.js:122` 的 `ensureEngine()` 新建 Engine 时，`D.createDirector()` 的初始 target 是 `'menu'`，然后只用当前一个 scene 调一次 `request`。模块自己维护的 `lastPhase`（`js/audio.js:136`）没有传给它。

复现（`diag.cjs`）：
- 场景：音乐和音效都关着，依次 `setScene` 进度 .5 → .92 → .85，然后开启音乐。
- `setScene` 依次返回 early、development、development，UI 的视觉 phase 同样是 development。
- 但引擎 `target/cue = early`。

结果是声音和画面不一致，要等进度回到 ≥0.90 或到第 18 周才会对齐。只有“音乐和音效都关着时跨过 0.90，回落到 0.80–0.90 之间再开声音”这一种路径会触发。修复：创建 director 时用 `lastPhase` 作为初始 target。如果视觉 worker 的“phase 迟滞复用”已经覆盖了 audio.js 里的这一处，可以忽略本条；不过音频 worker 已经停止写代码，这一处属于 audio.js。

---

## 未覆盖或未复现

- 没有实际听音频，也没有测扬声器输出。本报告的结论只基于代码和数字信号层面的诊断。
- 没有重跑完整的 `av-visual.cjs` 和 `av-audio.cjs`：前者会覆盖 `docs/av-visual-evidence/`，后者会覆盖 `docs/av-samples/report.json`。
- `art-scenes.js` 只用 grep 检查了 RNG 和网络引用，没有审查绘制逻辑本身。

## 修复后的复验（0.3 收尾补记）

- M1/M2/M3/L1/L2 每条都有对应断言：`tests/av-audio.cjs`（尾声循环、受阻恢复、A2）与 `tests/av-audio-director.cjs`（`initialPhase`）/`tests/av-integration.cjs`（真实结算 dialog、晚启用迟滞）。
- 按顺序实跑：核心 18、smoke、UI 交互、系统浏览器 10/10、补充 5/5、director 17/17、av-audio 95/95、整合 24/24、视觉 93/93，全部通过；命令与数字见 `docs/av-closeout.md`。
- 审计中“已确认没问题”的项（单一调度定时器、实例清扫、voice 断开、隐藏页停止、手势前不创建 AudioContext、旧 API 语义）在修复后仍由原断言覆盖并通过。
- 仍未做：人工听感、真实扬声器、真实标签页切换、真实 GPU 目视检查。
