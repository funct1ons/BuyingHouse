# 音频系统（分阶段互动配乐）

全部为原创 Web Audio 实时合成，无音频文件、无第三方库、无网络请求；file:// 与 GitHub Pages 行为一致。设计依据见 `docs/av-direction.md`，实测结果见 `docs/av-audio-report.md`。**未经人工听验。**

## 文件与加载顺序

`… js/art.js → js/audio-score.js → js/audio-director.js → js/audio-instruments.js → js/audio.js → js/ui.js`（经典 defer 脚本）。

| 文件 | 内容 |
|---|---|
| `js/audio-score.js` | `HomeYear.AudioScore`：六首曲谱数据（和弦、旋律、声部、变奏规则）与逐小节事件生成器 `bar()`；表现层 PRNG（mulberry32，按会话种子派生，**不触碰游戏 RNG**）。纯 JS，可在 Node 运行。 |
| `js/audio-director.js` | `HomeYear.AudioDirector`：只读公开字段的阶段判定 `phaseOf()`、层级 `layers()`、带迟滞/驻留/最新请求合并的 `createDirector()`。纯 JS。 |
| `js/audio-instruments.js` | `HomeYear.AudioInstruments`：18 种合成音色与程序生成的立体声房间脉冲响应；每个音符的节点在声源结束后全部 disconnect。 |
| `js/audio.js` | `HomeYear.Audio`（原 API 不变 + `setScene`）与 `HomeYear.AudioEngine`（调度器类，实时与离线渲染共用）。 |

新脚本缺失时 `audio.js` 降级为静音，原 API 与 `status().gain/musicRunning` 语义不变。

## 公开接口

- `unlock()`、`configure(settings)`、`volume()`、`setVolume(v)`、`play(kind)`：签名和含义与原版一致。`play` 支持 buy/sell/next/news/error/click/house，其中 house 是购房 stinger。
- `setScene({screen,week,status,house,progress,season,climate,dialogOpen})` 返回当前阶段名，不会创建或恢复 AudioContext。未知字段直接丢弃。`season` 接受 `冬/春/夏/秋` 或 `winter/spring/summer/autumn`。`climate` 接受 `hot/steady/cold` 或 `偏热/平稳/偏冷`，其他值按 steady 处理。
- `status()`：原有的 `volume, gain, state, musicRunning` 不变，`musicRunning` 仍表示“音乐设置开启且调度定时器存在”（旧测试依赖这一点）。新增 `playing`，只有定时器存在且 AudioContext 为 running 时才是 true，表示真的在出声，界面应以它为准。上下文被浏览器挂起时，tick 直接返回，不会排任何音。新增的其他只读字段：`needsGesture, engine, cue, section, bar, bpm, chord, target, pendingCue, lastSwitchAt, switches, requests, layers, queued, voices, stolen, retiring, nodes{created,live}`。
- 浏览器拒绝恢复音频时（resume 失败，或 1 秒后仍不是 running），`needsGesture=true`，并在 window 上派发 `homeyear:audio-blocked`。

## 阶段规则（实现以此为准）

优先级：`menu`（screen≠game）> 结局（status=ended；有房为 `ending-home`，否则为 `ending-rent`）> `sprint`（week≥45）> `development`（week≥18，或已购房，或进度达到阈值）> `early`。

- 进度迟滞：进入 development 需要 progress ≥ 0.90，退回 early 需要 < 0.80。按这套规则，三种难度开局都是 early（轻松 0.769、标准 0.462、挑战 0.308，已在真实引擎上验证）。
- 纵向层：progress ≥ 0.6 加一层，≥ 0.85 再加一层；已购房至少一层；第 45 周起至少一层，第 49 周起满层；第 51–52 周加定音鼓滚奏；景气“偏冷”时打击乐减一层，景气“偏热/偏冷”时音色亮度 ±20%。
- 对话框打开时不换曲，只切混音快照：音乐低通到 2.5 kHz，约 −4 dB，时间常数 0.1 s。

## 切换规则

- 普通切换（early ↔ development）只发生在 4 小节乐句边界，并且距上次切换至少 24 s。
- 进入 sprint 也要等乐句边界，但不受 24 s 驻留限制。
- 菜单和结局在两个方向上都属于“紧急”切换，不等乐句，在当前曲的下一拍切入，并且不受驻留限制。
- 请求可以随时发，只保留最新目标；连续快速请求最终只会切一次。
- 交叉淡化方式：新曲从 60% 电平开始、0.5 s 内升到满电平（不重复引子小节）；旧曲按时间常数 0.45 s 衰减（紧急切换为 0.3 s），混响发送在推子之后，跟着一起淡出。
- 首次启动：先播 1 小节引子（只有垫音、低音和底噪），然后进入 A 段。

## 曲目

| id | 标题 | 调 / BPM | 声部（音色） | 结构 |
|---|---|---|---|---|
| menu | 窗台夜灯 | D 大调 72 | 钢琴旋律、钢琴分解和弦、垫音、sub、弦乐（C）、钟琴（A′/C）、磁带底噪 | 32 小节循环 |
| early | 出租屋的早晨 | F 大调 92，摇摆 0.58 | 马林巴旋律、FM 电钢琴切分、拨弦贝斯、沙锤、底鼓/边击（随层级）、长笛导音、垫音 | 32 小节循环 |
| development | 街区在发光 | A♭ 大调 100 | 长笛旋律、钢琴 charleston、弦乐、步进贝斯、鼓组 3 件、钟琴应答 | 32 小节循环 |
| sprint | 最后的几周 | C 小调 116，C 段转 E♭ 大调 | 铜管旋律、拨弦八分音型、切分贝斯、木鱼“钟表”、鼓组、弦乐渐强、垫音、定音鼓（第 51 周起） | 32 小节循环 |
| ending-home | 钥匙 | E♭ 大调 84 | 钢琴、钢琴分解和弦、弦乐、sub、钟琴、长笛 | A/B/A′/C 后接 8 小节尾声 T，不循环 |
| ending-rent | 还是那间小屋 | D 大调 66（借用 ♭VI/iv） | 钢琴、钢琴和弦、垫音、sub、底噪 | A/B/A′/C 后接尾声 T，不循环 |

六首共用“家”动机（音级 3–5–6–5–1′），每首按自己的调式和节奏变形。每轮循环由 PRNG 选择变奏：伴奏型、经过音或倚音装饰、鼓过门、开放或密集排列。第一轮的 A 段固定不加变奏。和弦按声部进行规则选最近的转位。所有带音高的声部有 ±10 ms 时间和 ±6% 力度的微小人性化处理。

## 混音与生命周期

- 混音链：`各曲实例 → pre → 对话框低通 → duck → bus(0.42) → 25 Hz 隔直 → 压缩(−16 dB, 4:1) → musicGain → masterGain → 输出`。音效链：`sfxBus → 限幅器(−14 dB, 20:1, 1 ms) → 输出微调 → masterGain`。
- 同时最多 48 个音；超出时偷走最早结束的音，20 ms 淡出。
- 调度：25 ms 唤醒一次，前瞻 150 ms，每个 AudioContext 只有一个调度定时器。
- 关闭音乐：清除定时器，`musicRunning` 立即变为 false，约 0.36 s 后 musicGain 归零。已淡出的曲目实例会被延迟清扫并 disconnect。
- 页面隐藏：同上，并记住当前曲目；页面返回后从该曲的 A′ 段开头淡入 1.5 s。
- 音量 0：master gain 为 0，调度器不再发新音。

## 开发工具与测试（运行游戏不需要）

- `tests/av-preview.html`：试听页，用来切换预设阶段、调对话框/进度/景气/音量、触发音效。页内的 `avRender()` 用 OfflineAudioContext 加 `suspend()` 逐步驱动真实的 `AudioEngine`，供自动化测试使用。
- `node tests/av-audio-director.cjs`：在 Node 中用真实 Engine 跑三种难度的开局、迟滞扫描和一整局 52 周的阶段序列。
- `node tests/av-audio.cjs [--samples]`：在 Edge headless 下打开 file://，测各曲电平和结构、切换、防抖、音效、实时生命周期和节点泄漏。报告写入 `docs/av-samples/report.json`；加 `--samples` 时同时输出 WAV。
