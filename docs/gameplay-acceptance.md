# 玩法验收边界

现行证据链接：

- 已批准小样本：`docs/gameplay-v4-c1-r2.json`
- 正式主样本：`docs/gameplay-v4-primary.json`
- 正式留出样本：`docs/gameplay-v4-holdout.json`
- 平衡记录：`docs/gameplay-v4-balance.md`
- 发布复核：`docs/gameplay-release-review.md`

`docs/balance.md`、`docs/balance-*.json` 和 README 末段的 30000 局是 0.2 历史，不是本文件的证据。`docs/acceptance.md` 与 `docs/acceptance-evidence/` 是更早的界面验收记录，不是本轮新跑。

脚本买房率不是玩家胜率。人工试玩和人工试听待验。

D 的 `milestone-b-edge-review.cjs` 把截图写到固定路径 `docs/gameplay-evidence/`。那次跑完后，`week2-bulletin-1600.png` 与 `week2-trade-1600.png` 曾是同一张交易图。不能把 D 当时写下的 1600 快报说成与交易图不同。主审随后运行 `node tests/recapture-1600-bulletin.cjs`，两张图恢复为不同文件：快报 `fae8f86df37dd40c10d727c0f4b1001ff06dac9de6410ae11968575557f719d4`，交易 `2350ff8ee4c3c2847c585ff4695d1555f04524a7bcd54cb3b8b03bf3558c8538`。

未验边界：没有人工试玩，没有人工听验。`ui-interaction.cjs` 没有覆盖 125%/150% 视口，也没有做第 52 周缺货回收。`acceptance-final.cjs` 的第 52 周大米买卖发生在当周在售，不是缺货回收。第 52 周缺货回收且不能进入第 53 周由 `review-b2.cjs` 在 Node 里通过，不是 Edge 点击。`milestone-b-edge-migrate.cjs` 的回收预览是第 4 周退出商品。`av-visual.cjs` 只检查减少动效时 `animationName` 为 `none`；`surge` 类门闩在 `milestone-d-edge.cjs`。没有把缓存 Chromium 称作 Google Chrome。没有重生成 WAV。

D 测试子代理 `01a10597-c5e7-77a1-9fa7-ebf82df2e215` 已结束。证据是 `docs/gameplay-d-evidence/report.md`。下列命令退出码都是 0：`tests/run.cjs` 21 项，`review-b2.cjs` 12 项，`ui-interaction.cjs`，`acceptance-final.cjs` 28 项且页面请求为空，`acceptance-supplement.cjs` 5 项，`av-audio-director.cjs` 17/17，`av-audio.cjs` 96/96，`av-integration.cjs --idle 60` 24/24，`av-visual.cjs` 93/93，`milestone-b-edge.cjs`、`milestone-b-edge-migrate.cjs`、`milestone-b-edge-review.cjs` 的 `failures` 都为空。`milestone-d-edge.cjs` 第一次退出码 1，修正断言后复跑退出码 0。浏览器是 Edge `Edg/154.0.4258.53`，不是 Google Chrome。没有重生成 WAV。
