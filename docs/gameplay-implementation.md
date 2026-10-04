# 玩法里程碑 B 实施记录

状态：C1 r2 已批准。r3 失效。C2 两集已完成，各 18000 局，合计 36000，无额外无租仓。证据是 `docs/gameplay-v4-primary.json` 与 `docs/gameplay-v4-holdout.json`。房价和事件幅度未改。没有提交，没有推送。交接见 `docs/gameplay-handoff.md`。下文若与这段冲突，以这段为准；冲突段落已标过时。

主审记录已在 `docs/gameplay-rule-freeze.md` 第 13 节改为 D1–D9 批准，并允许进入 B。

## 已实现

- 轮换池 12 种，每周正好 8 种在售。替换 2 或 3 种，连续缺席不超过 3 周。日常、产业、投机和至少 2 个低参考价商品由引擎约束。低参考价只看参考价 ≤ 20000 分，不承诺本周成交价便宜。
- 普通波动按角色半宽 0.08 / 0.14 / 0.20。事件分立即、持续、结构。首周只冲击一次，之后不把同一百分比再乘一遍。事件幅度不乘难度系数。
- 未上架不能买，引擎拒绝，不只藏按钮。持仓可按 8% 回收价卖。折价和 1% 手续费分列。退出商品冻结迁移时的价格，只能回收出售。
- 快报使用本周真实 `changeBps`。没有新事件但绝对涨跌达到 800 bps 时，头条 id 为 `move`，不编造原因。情境不把冲击方向写成已经锁定；百分比另附。
- 新局 `homeyear.save.v3`，`rulesVersion` 为 `0.4`，`priceBook.id` 为 `0.2`。住房和仓储差额只读这本簿。
- 迁移前用 `js/v2-baseline.js` 的冻结目录和冻结校验。不临时替换 v3 的 `H.products`。不支持旧局按旧规则继续演算。
- 备份键是同步内容校验码 `homeyear.save.backup.` 加 16 位十六进制。撞上不同原文就追加 `.n`。写入后必须回读一致，失败则不写 v3。这不是防作弊哈希，也不新增网络库。`homeyear.save.v2` 不会被导入或迁入覆盖。
- 成交额下界改为渠道最低价，当前目录算出 1380 分。费用恒等式没有放宽。
- 峰值上界：迁移局用冻结的 20 商品 `ceil(max/size)`，新局用 12 商品。卖掉退出商品后仍按迁移局上界。
- 库存显示未上架持仓和已退出持仓，并可打开卖出预览。视听脚本和素材没有重做。页面仍是经典 defer 脚本，file:// 可开。

## 规则变化导致的测试更新

- 商品计数从 20 / 40 事件改为 12 池 + 8 退出商品 + 30 事件。v2 夹具仍要求 20 商品和 40 事件。
- 大米费用数字 94951、75961、37981、2796、2453、13973、2045 未改。测试只先把大米写入仍能通过校验的货架。
- 100 种子循环改为买卖当周在售商品。旧断言假设每周都能买羽绒服，新规则下该假设不成立。
- `turnover >= 1500 × trades` 改为 `turnover >= channelMin × trades`。这是最低可成交价从 1500 变为回收价 1380 的规则更换。费用成对恒等式仍在，测试会拒绝把手续费改大 1 分。
- 住房差价 350000 分、仓储 70000 / 500000 分的断言未改。新局价格簿仍是 0.2。

## 实测命令

以下五条是自检修正之后的同一次实跑。五条退出码都是 0，没有失败项需要再改。

`node tests/review-fixes.cjs`：7 项通过。本局价格簿整数、20 商品结算名、快报最多三行且持续事件为 `normal`、v2 导入不覆盖本地 v2、损坏 v3 不带 `replaceDamaged` 不能迁移、存储读取失败返回结构化错误、确认文案与界面接线。

`node tests/run.cjs`：20 passed, 0 failed。包含 20 个种子各 52 周的轮换覆盖，以及口罩最低价回收 1380 分。大米成本 94951、75961、37981、利润 2796、2453、13973、费用 2045 仍在原断言里通过。标准住房差价 350000 分仍通过。

`node tests/milestone-b.cjs`：5 项通过。夹具迁移后现金 6233900、历史、住房 650000、仓储投入 220000 不变；备份失败不写 v3；导入另一份 v2 不覆盖本地 v2；删掉黄金持仓的 v2 不能迁移；读档后继续推进与原轨迹一致。

`node tests/milestone-b-edge.cjs`：Edge headless，`file:///C:/files/code/BuyingHouse/index.html`，1366×768。新局第 1 周 8 张在售卡，`priceBook` 为 `0.2`。推进到第 2 周后头条为“奢侈柜台前的人少了 -52.3%”，`changeBps` 为 -5231。快报第三行是“新到货：雨具；暂时缺货：猪肉 +3.6%”，到货和暂时缺货合在一行。刷新后继续仍是第 2 周，并与从推进前快照再执行一次 `next` 的结果一致。控制台错误 0，页面没有 http/ws 请求。`failures` 为空。

`node tests/milestone-b-edge-migrate.cjs`：把夹具写入 `homeyear.save.v2` 后从 file:// 点迁入。结果周数 4，现金 6233900，黄金数量 1，价格簿 `0.2`，备份键 `homeyear.save.backup.bcdb6797abf6f5ae`，v2 原文未改。卖出预览为食用油回收报价 ¥233.62、折价 ¥20.32、手续费 ¥2.34。控制台错误 0。`failures` 为空。

## B 复审修正

- `H.moveSituation` 只用于没有新事件的 `move` 头条。有 `weak` 的周里，名表 -44.9% 的持仓行改为“这是已发生的本周涨跌，不代表下周方向。”
- 排序增加“本周关注”。比较顺序是先持仓、再实际绝对涨跌降序、再新到货，不再用 4/2/1 分桶。
- 右侧不再重复个人事件。没有持续事件时写“这周没有仍在持续的市场消息。”，不再在重大头条周写“街区很安静”。
- 22 条事件情境恢复为各自的具体句子。只改掉声称本周方向已经锁定的词。
- 数字键 1–9 按当前可见卡片顺序选择。新局、继续、导入都会把 `enteredByNext` 置回 false。只有绝对涨跌达到 2500 bps 的新头条在正常动效下加 `surge`。
- 快报三行不再被遮棚裁切。1366 和 1600 的文档横向 `scrollWidth` 都等于视口宽度。

`node tests/review-b2.cjs`：12 项通过。先前写成 11 项，计数已改。包括每次替换 2 或 3 种、快照不消耗四个随机流、冲击只一次且结构事件留到第 52 周、夹具 stats/market/legacy/旧三随机流严格保留、坏 v2、备份回读失败不改已有 v3、隔离档只有明确 true 才能覆盖、已结束 v2 不迁移、第 52 周回收、清掉退出持仓后仍用旧峰值上界。

`node tests/milestone-b-edge-review.cjs`：退出码 0。Edge 实际点击了快报交易、大米缺货卖出、损坏 v3 二次确认的取消和接受、设置页导入 v2。继续终局后结算弹窗显示最佳“常备药”、最差“相机”，商品行 20。截图：

- `docs/gameplay-evidence/week2-bulletin-1366.png`
- `docs/gameplay-evidence/week2-trade-1366.png`
- `docs/gameplay-evidence/week2-bulletin-1600.png`
- `docs/gameplay-evidence/week2-trade-1600.png`

同一次复跑里，`node tests/milestone-b-edge.cjs` 和 `node tests/milestone-b-edge-migrate.cjs` 退出码也是 0。第 2 周快报持仓行已是中性句，不再出现“没有新的供应或需求事件”。

收尾时三个原生子代理只读核对。测试代理发现 `week2-bulletin-1600.png` 与交易图字节相同。主 worker 关闭弹窗后重拍，两张图哈希不同。迁移代理指出 `save` 接受任意真值就能覆盖隔离档。已改为必须 `replaceDamaged === true`，并由 `node tests/review-b2.cjs` 复跑通过。界面代理 7 项复审要求全部 PASS。没有使用 Herdr pane，没有再委托。

## 主审自检后的修正

- 年度结算用 `H.holding` 和全部 20 个商品列收益。黄金等退出商品可以成为最佳或最差，不再抛“未知商品”。
- 导入先认 v3。不是 v3 时走完整 v2 校验、同一套迁入确认和独立备份，不写本地 v2，也不在导入这一步写 v3。
- 迁入不再把隔离布尔值直接当成 `replaceDamaged`。损坏 v3 要再确认一次才会替换。确认文案写明旧市场事件清空、旧新闻清空、货架重排、未来不复现旧路径。
- 持续事件新闻固定为 `normal` 且 `fresh=false`。快报只取头条、持仓、一条到货或暂时缺货，最多三行。
- 买房和仓储差价读取本局 `priceBook` 里的整数，不回查全局目录。校验仍要求这些整数等于已发布的 `0.2` 簿。
- 迁移和读键在存储抛错时返回 `{ok:false, error}`，不把界面抛停。
- 未上架和已退出商品的买入页签带 `disabled`。迁入说明常驻在市场面板，并有“导出迁移备份”读取 `migration.backup`。

上述五条命令已在修正后复跑，结果见“实测命令”。大米成本和标准住房差价没有改。

## C1 小样本（过时）

这一整节写于 r3 交审时。它把 r3 当成现行、把 r2 写成未批准、并写正式尚未开跑。这些句子已过时。现行替代：r2 已批准，r3 失效，正式两集已完成。不要用本节的哈希或买房率做现行证据。

主审暂不批准正式 36000 局。当前交审文件是 `docs/gameplay-v4-c1-r3.json` 与 `docs/gameplay-v4-c1-r3.md`。`docs/gameplay-v4-c1-r2.*` 含未批准的价值缺货占仓，保留但不作为同策略修订。`docs/gameplay-v4-c1.json` 在 2026-10-04T06:00:06.675Z 被同名重跑覆盖，价值买房率已是 73.3%，本轮没有再写它。更早公开表的价值买房率是 66.7% / 30.0% / 20.0%，r3 与这组对齐。

`node simulation/c1.cjs --mode c1 --seeds 30 --prefix gameplay-v4-c1 --out docs/gameplay-v4-c1-r3.json --report docs/gameplay-v4-c1-r3.md`：14.7 秒。`totalGames` 是 540。无租仓对照另 540 局。价值缺货占仓比较写在 `candidates.valueOffSale`，`applied` 为 false。`simulation/c1.cjs` 哈希 `176449ca2247461959d210e13a6901b521b73ae793f0fcbe99ff66185dc4ddc2`。

计量修正：

- `minCash` 在每次成功 `dispatch` 之后更新。`everLowCash` 是年内曾低于起步现金 10%。`terminalLowCash` 是终局低于 10%。前一版表头「极低现金」实际是终局口径。轻松保守现在是年内 63.3%、终局 3.3%。
- 每局保留完整 `byProduct`、`drawdown`、仓储档和 `warehouseSpent`。
- 集中度分母是各局各商品正已实现利润之和。负贡献单独列出。第一版标准事件感知名表 55.1% 只属于旧的跨局均值口径，不能延用。本修订合份额达到 40% 才预警。
- 钳制与 `persistCap` 分开。`H.prices` 返回本次诊断，成功 `validate` 并提交后才累加，`restore` 重置。这 30 条路径的护栏触发是 0，不能写成护栏永远不会触发。
- 涨跌分成 `noNewEvent`、`newEvent` 全池、受影响品首冲。`noNewEvent` 不是无事件背景。观测数不乘 6。

无租仓对照：轻松保守买房率 13.3% 到 20.0%，买房周中位数从 52 到 22，平均利润从 1424 元降到 668 元。轻松价值买房率 66.7% 到 83.3%，利润从 4659 元降到 3038 元。标准价值买房率仍是 30.0%，利润从 3818 元降到 2644 元。租仓不是一律损耗。不因此改房价。

因为改了 `js/game.js`、`js/market.js` 和 `tests/suite.js`，已复跑 `node tests/run.cjs`（21 passed）、`node tests/review-b2.cjs`（12 项）和 `node tests/milestone-b.cjs`（5 项），退出码都是 0。Edge 脚本这次没有复跑，不写成已通过。

过时句：正式模式用 `--mode primary` 或 `--mode holdout`。当时写“本轮没有跑正式模式”。现行替代是文首：两集已完成。

`Engine.visible` 带本局 `priceBook` 克隆。读取 visible 和 diagnostics 不消耗四个随机流。策略卖出用 `H.channelNet`。买入失败会中断。同一难度六个策略的钳制次数和最低买价中位数一致，无租仓对照也一致，说明诊断没有改行情路径。

仍待审批、本轮没有执行的候选：标准与挑战保守买房区间上界 11.4%，不因此降房价。事件感知没有稳定高于保守。轻松无租仓能更早买房，但利润下降；标准价值无租仓买房率和利润都更低。合份额达到 40% 的组见 r2 警告。没有新事件头条的周绝对中位仍低于第 5.2 节数字，但这组不是纯普通周，不改 `roleHalf`。钳制率 0.1%–0.2%，不放宽上下界。

## 主审独立回归补充

这些结果单独记录。没有跑通的不写成已通过。生产 `H.housePrice` 仍要求本局 `priceBook`，没有放宽。

- `node tests/av-audio-director.cjs`：17/17 通过，退出码 0。`progressOf(visible)` 在 visible 带上 `priceBook` 后不再报价格簿无效。
- 子代理 `01a1057d-f0a7-7cb2-9f12-0b850bab36fc` 只改了测试脚本，并报告 `node tests/ui-interaction.cjs`、`node tests/av-integration.cjs --idle 60`、`node tests/acceptance-final.cjs`、修复后的 `node tests/av-visual.cjs` 退出码都是 0。主 worker 本轮没有重跑这四条。生产 `H.housePrice` 没有放宽。

## 未做

- 正式两集已完成。下面若仍写“未跑正式”或“r2 未批准”，属于过时句，以文首状态为准。房价和仓储标价没有改。
- 没有提交，没有推送，没有部署。
- 人工试玩和人工试听待验。脚本买房率不是玩家胜率。
- 核心经济若要再改，须主审重新冻结并重跑模拟。不要清理 `tmp-acceptance-rerun/`，不要删除历史报告。
- 钳制钩子之后的 Edge B 脚本还没有复跑：`tests/milestone-b-edge.cjs`、`tests/milestone-b-edge-migrate.cjs`、`tests/milestone-b-edge-review.cjs`。
- 上述四条 Edge 脚本由子代理报告退出码 0。主 worker 没有复跑，也不把子代理报告写成自己的复跑。
- `docs/design.md`、`CHANGELOG.md` 没有按新规则全文改写。
- `simulation/run.cjs` 是旧工具，仍用 `price * 0.99`。v4 证据只用 `simulation/c1.cjs`。

## 触及的文件

产品：`js/data.js`、`js/math.js`、`js/market.js`、`js/trading.js`、`js/statistics.js`、`js/validation.js`、`js/game.js`、`js/save.js`、`js/ui.js`、`js/v2-baseline.js`、`index.html`、`css/main.css`。

测试与说明：`tests/suite.js`、`tests/run.cjs`、`tests/browser.html`、`tests/milestone-b.cjs`、`tests/milestone-b-edge.cjs`、`tests/milestone-b-edge-migrate.cjs`、`tests/milestone-b-edge-review.cjs`、`tests/review-fixes.cjs`、`tests/review-b2.cjs`、`docs/fixtures/v2-baseline-migrate.json`、`docs/gameplay-evidence/`、`docs/gameplay-rule-freeze.md`、`README.md`、`assets/build-art.cjs`、`simulation/c1.cjs`、`simulation/run.cjs`、`docs/gameplay-v4-c1.json`、`docs/gameplay-v4-c1.md`、`docs/gameplay-v4-c1-r2.json`、`docs/gameplay-v4-c1-r2.md`。

`assets/build-art.cjs` 只把图标计数改为轮换池加退出商品共 20 个。没有重导 SVG，也没有重做画面。
