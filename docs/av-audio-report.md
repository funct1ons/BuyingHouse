# 音频分支实现报告

日期：2026-10-03。范围：`js/audio-score.js`、`js/audio-director.js`、`js/audio-instruments.js`、`js/audio.js`，以及 `tests/av-audio*.cjs`、`tests/av-preview.html`、`docs/audio.md`、本报告和 `docs/av-samples/`。ui/index/css/art/core 和已有测试都没有改动。没有 commit，也没有 push。

**这里的所有数值都是浏览器内部的数字信号测量，不代表扬声器实际发声，也不代表听感。人工听感未验证。**

## 实际执行的测试

| 命令 | 结果 | 环境 |
|---|---|---|
| `node tests/av-audio-director.cjs` | **14/14 通过**（0.3 收尾后为 17/17） | Node，加载真实游戏脚本，跑真实 Engine |
| `node tests/av-audio.cjs` | **91/91 通过**（0.3 收尾后为 95/95；试听样本已用 `--samples` 重新生成） | Microsoft Edge headless，file://，临时配置目录 |

`av-audio.cjs` 驱动的是真实的调度器：离线渲染通过 `OfflineAudioContext.suspend()` 按 50 ms 步长调用同一个 `AudioEngine.tick()`；实时用例使用 CDP 的可信鼠标点击，并在真实 AudioContext 的 master 输出上挂 AnalyserNode 旁路采样。

## 各曲电平（离线渲染，masterGain=1，前 4 s 不计）

| 曲目 | 时长 | 采样峰值 dBFS | 300 ms RMS 中位 | P10 / P90 | 实际播放的段落 |
|---|---:|---:|---:|---|---|
| menu | 108 s（64 小节） | −4.1 | −18.9 | −22.7 / −16.6 | A/B/A2/C，循环 |
| early | 84 s | −5.4 | −21.1 | −24.6 / −18.7 | A/B/A2/C，循环 |
| development | 78 s | −4.2 | −20.7 | −24.1 / −17.5 | A/B/A2/C，循环 |
| sprint | 67 s | −7.2 | −21.4 | −25.3 / −19.4 | A/B/A2/C（C 段转调），循环 |
| sprint（第 51 周，含定音鼓） | 26 s | −6.6 | −21.1 | −24.3 / −19.2 | A/B |
| ending-home | 117 s | −4.3 | −18.8 | −21.9 / −16.7 | A/B/A2/C/T 尾声 |
| ending-rent | 152 s | −3.0 | −19.1 | −22.5 / −16.4 | A/B/A2/C/T 尾声 |

门槛（与 av-direction 一致，未放宽）：峰值 ≤ −1 dBFS；RMS 中位在 −24 到 −18 之间（menu/ending-rent 下限放宽到 −28）；游戏内曲目之间 RMS 中位差 ≤ 3 dB（实测 2.6 dB）；直流偏移 < 1e−3。

## 切换（33.3 s 时在乐句中途发出请求）

| 切换 | 等待 s | 对齐 | 下凹 dB | 上冲 dB | 最大相邻采样跳变 |
|---|---:|---|---:|---:|---:|
| menu→early（紧急） | 0.1 | 拍 | 5.1 | 2.1 | 0.116 |
| early→development | 0.7 | 4 小节乐句 | 0.7 | 0.2 | 0.074 |
| development→sprint | 7.5 | 4 小节乐句 | 4.4 | −3.3 | 0.033 |
| sprint→ending-home（紧急） | 0.4 | 拍 | −0.3 | 0 | 0.114 |
| sprint→ending-rent（紧急） | 0.4 | 拍 | 5.5 | −0.4 | 0.088 |
| development→menu（紧急） | 0.4 | 拍 | 1.0 | 0.3 | 0.077 |
| ending-home→menu（紧急） | 0.3 | 拍 | 1.9 | 0.3 | 0.079 |

门槛：对齐误差 ≤ 5 ms；下凹 ≤ 6 dB（以两侧稳态 RMS 中位中较低的一侧为基准）；上冲 ≤ 3 dB（以两侧稳态窗口 P90 中较高的一侧为基准）；最大跳变 ≤ 0.25。
**口径调整（如实说明）**：第一版测上冲时用的是两侧中位数，正常音乐的强拍窗口本来就比中位数高 3 dB 以上，换曲前后都会误报，所以改成“过渡区最大值对比稳态 P90”。3 dB 门槛本身没变。下凹的口径没有改动；之前不达标的下凹（14–21 dB）是通过修改实现解决的：新曲改为从 60% 电平切入，去掉换曲时重复的引子小节，旧曲衰减时间改为 0.45 s。

## 防抖与阶段（都驱动真实调度器）

- 进度在 0.79 和 0.91 之间来回抖动 2 分钟（以最后一次 `--samples` 运行为准）：一共 4 次切换（含开场），间隔分别为 44.3 s、28.8 s、31.3 s，都满足 ≥ 24 s 的驻留要求。
- 进度在迟滞区内（0.81 ↔ 0.89）抖动：不切换。
- 0.8 s 内连发 41 次请求：只切换一次，切到最新目标 sprint。
- 第 45 周进入 sprint，不受驻留阻塞。
- 真实引擎开局：轻松 0.769、标准 0.462、挑战 0.308，三者都是 early。真实标准局 52 周：第 18 周进入 development，第 45 周进入 sprint，结算后为 ending-rent，且不会倒退。

## 音效

各音效最响 300 ms 窗口：buy −13.3、sell −14.7、next −13.7、news −14.1、error −12.8、click −13.9 dBFS，都比 early 的音乐中位（−21.1）高出 6 dB 以上。所有音效加 stinger 连放时，峰值为 −7.0 dBFS（门槛 −6）。购房 stinger 叠在 development 上时，峰值 −3.7，比音乐垫底高约 5 dB，播放期间音乐 duck 约 6 dB，持续 2 小节。
调整过程：最初峰值 −1.5 dBFS 不达标。改法是给音效改用持续的电钢琴音色、单独设一条带限幅器的音效总线，并把输出微调放到压缩器之后（DynamicsCompressorNode 的自动补偿增益会抵消放在它前面的增益调整），没有放宽门槛。

## 生命周期（实时，可信点击）

- 首次交互前没有 AudioContext；在交互前调用 setScene 也不会创建。
- 点击后 running，只有 1 个调度定时器，并且有真实信号。
- 切到别的标签页：信号为 0，调度器停止。切回来：从 A2 段恢复。
- 关闭音乐：600 ms 内信号为 0，定时器清除，`musicRunning=false`。重新开启：仍只有 1 个定时器。
- 音量 0：gain 为 0，信号为 0；恢复音量后有信号。
- 对话框打开时切混音快照，不换曲。
- 结局和回菜单都能及时切换。
- 节点：播放期间同时存活的音保持在 15 个左右（上限 64）。关闭音乐 4.5 s 后，存活音为 0，等待清扫的旧曲实例也为 0。这个计数来自真实 `onended` 回调。

## 被挂起状态（视觉 worker 反馈后修正）

> **本节在 0.3 收尾时已被修订，请以 `docs/av-closeout.md` 为准。** 下面是当时的记录，其中 `musicRunning` 与 season 两项的最终处置已经改变（见本节末尾）。

视觉 worker 指出：resume 被浏览器拒绝时，`status()` 显示 `state:'suspended'`，`musicRunning` 却是 true，调度器一直在空转。我实测确认了这一点：旧测试用 `element.click()`（不算可信手势）打开音乐后，就会进入这个状态。

当时的修正：
- 上下文不是 running 时，`tick()` 直接返回，不排音、不空耗。
- 新增 `status().playing`，表示真的在出声。
- `musicRunning` **保留原义**（音乐设置开启且定时器存在），没有改成随 running 变化，也没有改成 resume 成功后才启动定时器。原因是 `ui-interaction` 的“music enabled starts loop”和 `acceptance-supplement` 的“只有一个定时器”都在这种 suspended 状态下断言，改了会让旧测试失败。这与 av-direction 3.6 的写法有出入，以本报告为准，请主审确认。
- 新增测试：不可信解锁时 `playing=false`、`musicRunning=true`、没有排任何音、`needsGesture=true`，已通过。
- 季节字段：ui.js 传的是英文 `winter/spring/summer/autumn`，现在 normalize 也接受英文。目前音乐还没有用到季节。

### 0.3 收尾修订（2026-10-03，独立审计 M1–M3 / L1–L2 处置）

- `musicRunning` 改为 av-direction 3.6 的语义：**只有音乐设置开启且调度器真的在运行时才为 true**。恢复被拒或上下文 suspended 时不再创建空转定时器，开启音乐的请求由 `status().musicWanted` 记录，恢复成功后只启动一次。原先“不可信解锁时 `musicRunning=true`”的断言是错误语义，已改写为“无空转定时器 + 请求被记住”，判定没有放宽。
- 季节：`normalize()` 接受英文季节（`winter/spring/summer/autumn`），与 UI 实际发送的值一致；当前音乐实现仍未使用 season。
- 结局曲尾声：`av-direction.md` 的原始设计是 T 尾声循环，`audio.md` 的“不循环”措辞已改正；主段 A/B/A′/C 只播一次，之后停在 T，不停音（A/B 追踪确认实现本来就如此，本轮把条件写显式并新增断言）。结算 dialog 不再压暗结局 BGM，晚创建 Engine 保留迟滞记忆。详见 `docs/av-closeout.md`。
- 收尾后 `node tests/av-audio.cjs --samples` 为 95/95（新增尾声与受阻恢复用例）；`--samples` 重新生成的 `docs/av-samples/*.wav` 与提交版本逐采样差异 ≤16/32768、RMS 相同。

## 整合冒烟（本分支外，只读验证）

视觉 worker 已在 `index.html` 加入三个新脚本，并在 `ui.js` 中调用 `setScene`。我在 Edge 中做了只读验证：加载后没有 AudioContext；用可信点击新开轻松局后 cue=early、调度器正在运行、只有 1 个定时器、`body[data-phase]=early`，音频和画面一致；打开交易对话框后 dialog 层生效；回到主页后 cue=menu。全程没有页面异常。

发现一个问题，交给视觉 worker 或主审处理：
- `ui.js` 原来发的 climate 是 `'neutral'`，视觉 worker 已经改成 `'steady'`。

## 试听样本（`docs/av-samples/`）

- `cue-*.wav`：每首 45 s（循环曲取开头，结局曲取最后 45 s，包含尾声），共 7 个。
- `switch-*-to-*.wav`：7 段切换，每段 24 s，切换请求发生在第 8 s。
- `stinger-house.wav`：development 背景上叠购房 stinger。
- 格式为 22.05 kHz 单声道 16-bit，从立体声混成单声道，所以听不到声像和混响的立体感。总计约 21 MB，是否提交进仓库请主审决定；也可以只保留 `report.json`，需要时用 `--samples` 重新生成。

## 遗留风险

1. **听感未经人工验证**。合成钢琴、弦乐、铜管只是用多振荡器加滤波包络模拟，质感和采样乐器有差距；在笔记本小扬声器上，低音部分（sub、kick）可能听不到。需要有人用真实设备听一遍并记录结果。
2. 测试测的是采样峰值和窗口 RMS，**不是 true-peak 或 LUFS**。
3. 离线渲染在 headless 下比实时快 7–10 倍（例如 menu 的 108 s 用 11.9 s 渲染完），所以没有测出低端设备上实时运行的 CPU 余量。48 音上限和卷积混响在低端机上可能偏重。
4. 1 s 后检查是否 running 的逻辑，在页面隐藏时不会提示；从隐藏返回后如果浏览器拒绝 resume，依赖 `homeyear:audio-blocked` 事件，而 UI 是否处理这个事件由视觉 worker 决定。0.3 收尾已用 `tests/av-integration.cjs` 的真实受阻/恢复用例覆盖这条路径。
5. 原有全部测试（ui-interaction、acceptance-supplement 等）本轮没有运行，由最终整合者回归；0.3 收尾已全部补跑（见 `docs/av-closeout.md`）。**注意**：我当时设计的兼容点“`musicRunning` 立即反映状态”在收尾时被有意改掉了——独立审计与 av-direction 3.6 都要求它只在调度器真的运行时为 true，`acceptance-supplement` / `ui-interaction` 的合成点击改为 CDP `userGesture` 后，这两条旧断言按原文字通过。
6. 本轮不是新修复的问题：原版的 `configure()` 里已经有 resume，这一版沿用了它，并加上被拒绝时的提示。
