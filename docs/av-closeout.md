# 视听升级收尾（独立审计处置 + 合并前实测）

日期：2026-10-03（本地时间 2026-10-04 凌晨）。范围：`js/audio.js`、`js/audio-director.js`、`js/ui.js`、`tests/av-audio.cjs`、`tests/av-audio-director.cjs`、`tests/av-integration.cjs`、`tests/acceptance-supplement.cjs` 与相关文档。**没有 commit、没有 push**，交给主对话审核后提交推送。

**本文所有音频数值都是浏览器内部的数字信号测量，不代表扬声器发声，也不代表听感；本轮没有人工试听，也没有人工视觉评审。**

## 1. 处置总览（`docs/av-independent-review.md` 逐项）

| 编号 | 审计结论 | 处置 | 证据 |
|---|---|---|---|
| M1 | 结局曲 T 尾声无限重播，与 `audio.md` 的“不循环”不符 | **按原始设计定案 + 文档统一**：`av-direction.md` 写的是“32 小节后进入 8 小节**柔和尾声循环**”，`audio.md` 写的是“不循环”，两份文档互相矛盾。统一到原始设计：T 尾声持续柔和循环，主段 A/B/A′/C 只播一次，不静音。A/B 实验（把 HEAD 的 `advance` 重新打到原型上对比）确认 HEAD 的实际段落序列与现实现**完全相同**：`c.loop` 是曲目自身的循环开关（结局曲为 false），不是轮回计数，所以 `sec` 每次都回落到 T，从未回到 A。本轮把该条件写成显式判断、为“非循环且无尾段”的曲谱补防御分支，并在 `status()` 暴露 `inTail`/`loop` 供断言 | A/B 追踪（`A@4s, B@33s, A2@62s, C@91s, T@120s`，之后一直留在 T）；`tests/av-audio.cjs` 新增尾声用例 3 项 + 防御分支 1 项 |
| M2 | 结局曲整个结算期间被对话框低通压暗 | **修复**：`ui.js` 的 `scenePayload` 只在非 `result` 对话框时发 `dialogOpen:true`；普通弹窗仍 duck | `tests/av-integration.cjs` 真实结算 dialog 实测 `dialogOpen=false`、`layers.dialog=false`，settings 弹窗仍 `layers.dialog=true` |
| M3 | av-audio 的结局检查只渲染到“刚进 T”，发现不了 M1 | **修复**：渲染到主段 + 两轮尾声，断言 A 只出现一次、两轮 T 电平相近、`inTail=true` | 同上 |
| L1 | “返回标签页从 A2 恢复”的断言接受从头播放 | **收紧**：改为只接受 `section==='A2'` | `tests/av-audio.cjs` 返回标签页用例 |
| L2 | 引擎晚创建时丢失迟滞记忆 | **修复**：`createDirector(rules, initialPhase)` 新增第二参数，`ensureEngine()` 传入模块自己的 `lastPhase` | `tests/av-audio-director.cjs` 3 项 + `tests/av-integration.cjs` 晚启用用例 |
| 整合反馈 | 上下文 suspended 时 `musicRunning=true` 且调度器空转 | **修复**：`music()` 只在 `ctx.state==='running'` 时启动定时器；恢复被拒时不建定时器，改为记住请求（`status().musicWanted`） | `av-audio` 受阻用例 + `av-integration` 受阻/恢复用例 |
| 整合反馈 | `normalize()` 的 season 只认中文 | **修复**：`SEASON_EN` 映射英文季节 | `tests/av-audio-director.cjs` 季节用例 |

审计中“已确认没问题”的部分（单一调度定时器、实例清扫、voice 断开、隐藏页停止并从 A2 恢复、手势前不创建 AudioContext、旧 API 语义、无 `Math.random`/无网络引用）在本轮修改后仍然成立，相关断言原样保留并通过。

## 2. 代码改动（逐文件）

### `js/audio.js`
1. `Engine.prototype.advance`：把“非循环曲目停在尾部段”写成显式条件——`loop:true` 仍回到 A；`loop:false` 且有 `tail` 的曲目停在尾段（T）；没有 tail 的非循环曲目回落到最后一段而不是越界。`inTail` 改为每次推进都重算，并在 `Engine.status()` 暴露 `inTail` / `loop` 只读字段（旧字段未改）。
   **行为澄清（重要，已用 A/B 实验核实）**：HEAD 的实现 `inst.sec=c.loop?0:c.order.length` 对结局曲而言已经是“停在 T、不回 A”。把 HEAD 的 `advance` 重新打到 `AudioEngine.prototype` 上，与当前实现逐 0.5 s 追踪得到的段落序列完全相同。所以审计 M1 描述的现象中，“T 会重复”是原始设计（`av-direction.md` 的“柔和尾声循环”），但“主段会重播”不成立。**本次没有改变可听行为**，只统一了文档、把条件写显式、补上断言。唯一可观察的实现差异在“非循环且**无**尾段”的假想曲谱上（现存六首都不是这个形状）：HEAD 会走到 `order.length` 得到 `undefined` 段，现在的实现回落到最后一段；`tests/av-audio.cjs` 已为此加防御断言。若主审要的是“T 播完即静音”，本轮**没有**实现该行为，需要另立一条需求。
2. `Engine` 构造新增 `opts.initialPhase`，透传给 `D.createDirector(rules, initialPhase)`。
3. `ensureEngine()` 用模块级 `lastPhase` 初始化 director。
4. `music()` 增加 `ctx.state!=='running'` 分支：不启动调度定时器（受阻期间没有任何 setInterval 空转）。
5. `resumeCtx()`：恢复失败不吞异常（由调用点 `catch(blocked)` 处理），恢复成功且音乐开启时才 `music()`。
6. `status()` 新增只读 `musicWanted`（用户已开启音乐但还没能出声），用于恢复路径与测试。

### `js/audio-director.js`
- 新增 `PHASES` 白名单；`createDirector(rules, initialPhase)` 接受初始目标阶段，非法值回落到 `menu`。`request()`、`phaseOf()` 的迟滞逻辑本身没有改动。

### `js/ui.js`
- `scenePayload()` 的 `dialogOpen` 改为 `dialog.open && dialogKind!=='result'`。其余字段（含 `dialog` 本身仍报 `'result'`）不变，`av-visual.cjs` 的 setScene 协议断言（键、枚举、去重）不受影响。

### 测试
- `tests/av-audio.cjs`：新增尾声用例（3 项）与“非循环且无尾段”防御分支（1 项）；受阻用例按新语义改写（原“受阻时 `musicRunning=true`”断言是审计指出的错误语义，改为“无空转调度器 + 请求被记住”）；返回标签页断言收紧为只接受 `A2`。
- `tests/av-audio-director.cjs`：新增 `initialPhase` 迟滞记忆、默认仍从 `menu` 起步、非法值回落 3 项。
- `tests/av-integration.cjs`：**原有断言全部保留**（`scheduler kept running (bars advanced)` 等原样未改），新增受阻恢复（定时器 0 → 真实点击提示后恰好 1 个）、晚创建 Engine 迟滞、真实结算 dialog 不压暗、临时弹窗仍 duck 等断言，并把“真实点击提示后恢复”这一条从“state running + 无提示”加强为同时要求 `musicRunning`、`playing` 与恰好 1 个定时器。检查项从 10 条增至 24 条。
- `tests/acceptance-supplement.cjs`、`tests/ui-interaction.cjs`：合成 `.click()` 改用 CDP `Runtime.evaluate{userGesture:true}`，让页面拿到与真实鼠标一致的用户激活。**断言文字与判定条件一字未改**（`music starts one repeating timer`、`music off clears timer`、`music enabled starts loop`、`music off stops loop` 等），只修了注入方式。原因见第 5 节。

## 3. 合并前实测（同一工作树，按顺序执行）

命令、退出码、耗时与关键数字如下（`node v24.14.1`，Microsoft Edge headless `Edg/154.0.4258.53`，file://；产品代码在批次开始前已冻结，全部 `js/*.js` 的修改时间早于 02:25:07 本地时间）：

| 命令 | 退出码 | 结果 |
|---|---|---|
| `node tests/run.cjs` | 0 | 18 passed, 0 failed |
| `node tests/cdp-smoke.cjs --width 1366 --height 768` | 0 | smoke observations passed，failures 0 |
| `node tests/ui-interaction.cjs` | 0 | 全部断言通过 |
| `node tests/system-browser.cjs` | 0 | 28/28（写入 `docs/acceptance-evidence/report.json`，`errors: []`） |
| `node tests/acceptance-supplement.cjs` | 0 | 5/5，0 errors |
| `node tests/av-audio-director.cjs` | 0 | 17/17 passed |
| `node tests/av-audio.cjs --samples` | 0 | 95/95 passed（顺序批次内的版本）；批次结束后补了 1 项“非循环且无尾段”防御断言，复跑为 **96/96 passed**（产品代码未变） |
| `node tests/av-integration.cjs --idle 60` | 0 | 24/24 passed |
| `node tests/av-visual.cjs --idle 60` | 0 | 93/93 passed（53 张截图） |

关键数字（来自本次运行的报告文件）：

- **尾声**（`docs/av-samples/report.json` 的 `endingCoda`，取自 96/96 那次复跑）：主段结束 120 s（66 BPM，4×8 小节 + 1 小节引子），段落序列 `A,B,A2,C,T`，A 只出现一次；两轮尾声 300 ms RMS 中位 −21.2 dB / −24.1 dB（相差 2.9 dB，上限 6 dB），结束时仍为 `ending-rent`/`T`，`inTail=true`（`loop` 为 2，计的是尾声圈数）。另用 280 s 渲染按 0.5 s 步长追踪段落切换点：A@4 s、B@33 s、A2@62 s、C@91 s、T@120 s，之后一直留在 T；把 HEAD 的 `advance` 打到原型上重跑得到完全相同的序列（探针脚本在仓库外，未改动产品代码）。防御分支 `guards.noTailCue = {maxSec:3, distinct:[0,1,2,3], inTail:false, lastSection:"C"}`（HEAD 的实现在同一探针下为 `maxSec:4`、`inTail:true`，段落越界）。
- **各曲电平**：与改动前一致（ending-rent 峰值 −3.0 dBFS、中位 −19.1 dBFS，sections 仍为 A/B/A2/C/T）。`--samples` 重新生成的 WAV 与提交版本逐采样差值 ≤23/32768、整段 RMS 完全相同（5 位小数，15 个文件逐一比对），只是 Float32→Int16 取整与离线渲染的抖动，不是内容变化；因此**已用 `git checkout -- docs/av-samples/*.wav` 恢复提交版本，仓库里的 WAV 未被改动**（每次 `--samples` 运行后都恢复一次），只更新了 `docs/av-samples/report.json`（新增尾声与防御分支的测量）。
- **受阻恢复**（`docs/av-visual-evidence/integration-report.json`）：受阻时 `state=suspended`、`musicRunning=false`、`playing=false`、`queued=0`、定时器 0 个、`needsGesture=true`、`musicWanted=true`；放行后真实点击提示，`state=running`、`musicRunning=true`、`playing=true`、定时器恰好 1 个、提示移除。
- **晚创建 Engine**：声音关闭时按公开进度依次导入 p=0.50 → 0.92 → 0.85，画面阶段为 `early, development, development`，引擎未创建（cue null、定时器 0）；随后在设置里真实点击开启音乐，`target=cue=development`、`switches=1`、定时器 1 个，与画面一致。
- **结算 dialog**：真实结算页 `dialog.dataset.kind=result`、`.storybook` 存在、`audioScene().dialogOpen=false`、`layers.dialog=false`、`cue=ending-home`；关闭绘本后阶段与混音不变；随后打开设置弹窗 `layers.dialog=true`，关闭后恢复 `false`。
- **播放时空闲 CPU**：60.02 s 内 TaskDuration 0.202 s（0.336%），Script 0.181%，单一定时器，voices 6，cue 与 `body[data-phase]` 一致（`early`）。
- **视觉**：93 项通过，包含 6 视口布局/对比度/SVG 预算、季节阶段、迟滞一致性、庆祝清理、`setScene` 协议（254 次调用，键与枚举合法）。空闲 60 s TaskDuration 0.067%。

## 4. 经济核心与范围确认

`git status` 里**没有** `js/data.js`、`js/game.js`、`js/market.js`、`js/math.js`、`js/trading.js`、`js/statistics.js`、`js/validation.js`、`js/save.js`、`js/art*.js`、`js/audio-score.js`、`js/audio-instruments.js`、`css/*`、`index.html`、`simulation/`、`assets/` 以及任何 `balance*.json` 的改动。存档版本（`H.rules.saveVersion=2`）、`rules.version='0.2'`、种子与经济参数、file:// 与 Pages 加载方式（经典 defer 脚本，无 fetch/模块/外链）都没有变化。`tests/suite.js`、`tests/run.cjs` 与旧断言未修改，`tests/audio-diagnostic.cjs` 也没有改。

## 5. 测试注入方式的说明（唯一一处测试基础改动）

改造后产品在“上下文没有 running”时不再启动调度定时器，这是审计要求的行为。旧测试 `acceptance-supplement.cjs` / `ui-interaction.cjs` 用 `element.click()` 合成点击开音乐，在 headless 下这类事件**不是用户激活**，浏览器因此保持 `suspended`；旧断言“music starts one repeating timer”依赖的正是那个被审计判定为 bug 的空转定时器。实测确认（探针脚本在仓库外）：

```
load                         state=uncreated  musicRunning=false timers=0
合成 click 开局               state=suspended  musicRunning=true  timers=1   ← 旧行为（已修）
CDP userGesture click 开局    state=running    musicRunning=true  timers=1   ← 新注入方式
```

因此把这两个脚本的合成点击改为 CDP `Runtime.evaluate{userGesture:true}`（页面看到的事件语义与真实鼠标一致），**断言与判定条件没有放宽或改写**：开音乐后仍要求“恰好 1 个循环定时器”，关音乐后仍要求“0 个”。`tests/av-integration.cjs` 与 `audio-diagnostic.cjs` 本来就用真实 CDP 鼠标输入，未改动其注入方式（`audio-diagnostic.cjs` 本轮未运行，见下）。

## 6. 局限与未验证

- **没有人工试听**（笔记本扬声器/耳机、音量校准、长时间疲劳度均未做），也没有在真实 GPU/显示器上目视检查；本文档只声明数字测量与自动化结果。
- **M1 的结论需要主审确认**：审计认为 T 无限重复与设计不符，但 `av-direction.md` 的原始设计就是“8 小节柔和尾声循环”，且 HEAD 的实现本来就没有重播主段（A/B 追踪一致）。本轮按原始设计定案并统一了文档；主段不重播、曲目不停音。若主审要的是“T 播完即静音”，本轮没有实现该行为。
- WAV 样本每 45 s 约 2 MB，共约 21 MB，仍在仓库里（`docs/av-samples/`）且本轮未改动。是否保留请主审决定；不保留可只留 `report.json`，需要时用 `--samples` 重生成。
- 音频仍是“窗口 RMS/采样峰值”，不是 true-peak 或 LUFS；离线渲染比实时快，不能代表低端设备的实时余量。
- 页面隐藏仍用模拟 `visibilitychange` 验证，没有真实切换标签页。
- 本轮没有运行 `tests/audio-diagnostic.cjs`（它会把 `docs/audio-diagnostic-report.json` 当作新证据覆盖，而该文件记录的是改造前的基线）；`tests/av-visual-grain.cjs`、`tests/av-visual-gallery.cjs` 同理未跑（不属于收尾清单）。
- 未能验证真实浏览器自动播放策略下“被拒绝后用户手势恢复”以外的路径（例如浏览器在后台标签页拒绝 resume 的具体时机）；实现上仍以 `homeyear:audio-blocked` 事件 + 可点击提示兜底。

## 主对话发布审核

收尾后主对话复核产品差异与 `git diff --check`，并重新运行 core（18/18）、director（17/17）、integration（24/24，`--idle 5` 快速复核）和 UI interaction，全部通过。最新 integration-report.json 对应这次 5 秒复核；上文 60 秒数据为 worker 的前一轮完整测量。批准保留原设计的柔和 T 尾声循环及已提交 WAV。CDP `userGesture:true` 提供用户激活上下文，但不会把合成 `.click()` 事件变为 `isTrusted=true`；真实鼠标输入路径由 integration 测试覆盖。仍未进行人工试听。
