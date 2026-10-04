# 玩法 B 交接

状态：C1 r2 已批准，源码 SHA-256 `43f9dd9a8f67e45bd9cce7c2dd4fa9a40187364e08daef62580b0861cbc19479`。缺货占仓比较保留。r3 失效。正式两集各 18000，合计 36000，无额外无租仓。证据是 `docs/gameplay-v4-primary.json` 与 `docs/gameplay-v4-holdout.json`。不改核心、不改价、不提交、不推送、不部署。不要清理 `tmp-acceptance-rerun/`，不要删除历史报告。核心再改须主审重新冻结并重跑模拟。D 已结束，证据是 `docs/gameplay-d-evidence/report.md`。音频 96/96，整合 24/24，三支 Edge B 的 `failures` 为空。
本文件是后续 worker 的权威进度，避免再通读全库。金额与迁移约束以这里和 `docs/gameplay-rule-freeze.md` 为准。

主审复跑：`node tests/run.cjs` 21 项、`node tests/review-b2.cjs` 12 项、C1 540 加无租仓 540。各组买房率与 r2 控制台相同。不要把这次复跑再做一遍。

不要删除或清理主审目录。`tmp-acceptance-rerun/c1-review.json` 是主审的全字段比较文件，刚被并发清掉。该目录当前不在工作区。若它再出现，保持原样，不要删。

## 不可丢失的约束

- 金额是整数分。手续费 `ceil(金额 × 0.01)`。部分卖出成本 `floor(cost × qty / heldQty)`，清仓带走余数。失败在克隆上拒绝，不写回。
- 未上架不能买。缺货和退出商品按 `floor(市价 × 92 / 100)` 回收，手续费另计。`turnover` 记渠道成交额。下界由渠道最低价推导，当前目录为 1380，费用恒等式不放宽。
- 账面净资产 = 现金 + 参考市值 + 本局 `priceBook` 住房价。买房和仓储只扣现金，差额读 `s.priceBook` 整数，不回查可变全局目录。新局 `priceBook.id` 仍是 `0.2`。住房底价仍是 650000 / 1000000 / 1400000 / 1900000 / 2500000 分。
- 迁移不改现金、历史、`stats`、20 个 `byProduct`、12 个保留商品市价与成本、8 个退出商品数量成本与冻结价、旧三随机流 `market/events/visual`。清空旧市场事件和旧新闻。不靠改现金或历史通过校验。
- `homeyear.save.v2` 永不因导入或迁入被覆盖。备份是独立键，回读失败不写 v3、不改已有 v3。损坏 v3 只有 `replaceDamaged === true` 才替换。已结束 v2 不迁移。
- 卖掉全部退出商品后，迁移局峰值上界仍按旧 20 商品。第 52 周可回收卖出，`next` 拒绝，没有第 53 周。
- `H.moveSituation` 只给没有新事件的 `move` 头条。持仓异动只用“这是已发生的本周涨跌，不代表下周方向。”

## 源码位置

- 规则与 12 池、事件情境、`0.2` 价格簿、`newsSituation`、`focusOrder`：`js/data.js`
- 轮换、一次冲击、新闻、快报行数：`js/market.js`
- 买卖权限与回收：`js/trading.js`
- 本局房价、渠道净额、费用：`js/math.js`
- 创建、`migrateV2`、`next` 顺序、`visible` 的本局 `priceBook`、钳制旁路：`js/game.js`
- 价格公式与 `raw !== clamped` 钳制计数：`js/market.js`
- C1 已批准证据：`simulation/c1.cjs` 与 `docs/gameplay-v4-c1-r2.json`。r3 失效。正式主样本：`docs/gameplay-v4-primary.json`。不要覆盖这些文件。
- 旧五策略工具，不能当 v4 证据：`simulation/run.cjs`
- v3 校验与峰值上界：`js/validation.js`
- 冻结 v2 目录和校验，不替换 v3 命名空间：`js/v2-baseline.js`
- 备份、迁入、导入：`js/save.js`
- 快报、排序、导入确认、数字键、`surge`：`js/ui.js`
- 行为测试：`tests/review-b2.cjs`、`tests/review-fixes.cjs`、`tests/milestone-b.cjs`
- Edge：`tests/milestone-b-edge.cjs`、`tests/milestone-b-edge-migrate.cjs`、`tests/milestone-b-edge-review.cjs`
- 截图：`docs/gameplay-evidence/week2-bulletin-1366.png`、`week2-trade-1366.png`、`week2-bulletin-1600.png`、`week2-trade-1600.png`
- 实施记录：`docs/gameplay-implementation.md`
- 规则冻结：`docs/gameplay-rule-freeze.md`

## 已测与未测

本轮子代理实跑，退出码 0：

- `node tests/review-fixes.cjs`
- `node tests/review-b2.cjs`，其中新增“隔离档只有明确 true 才能覆盖”，复跑通过
- `node tests/run.cjs`：20 passed, 0 failed
- `node tests/milestone-b.cjs`

截图存在。1600 快报原先与交易图字节相同，已用 `node tests/recapture-1600-bulletin.cjs` 重拍。新文件 697186 字节，哈希 `ef1c12736cb3cc6a400f3d0aa3c9af0721d3c262e21bb434ff40d2b08a66fa47`，与交易图不同。画面是第 2 周快报三行，不是弹窗。

C1 已批准证据是 `docs/gameplay-v4-c1-r2.json`。r3 失效。正式两集已完成：`docs/gameplay-v4-primary.json` 与 `docs/gameplay-v4-holdout.json`，各 18000，合计 36000，没有额外无租仓。这些文件都不要覆盖。

未测、未做：

- 下面这条已过时，不要执行：正式主样本 1000 加留出 1000 等批准再开。现行替代是文首的两集文件。
- 过时句：钳制钩子之后的 Edge B 三支没有复跑。现行替代是 `docs/gameplay-d-evidence/report.md`，三支退出码 0，`failures` 为空。
- `docs/design.md`、`CHANGELOG.md` 未按新规则全文改写。

## 子代理

只用原生子代理，默认模型。没有指定昂贵模型，没有继承 Pi 参数，没有开 Herdr pane，没有再委托。子代理只读或只跑测试。整合与 `js/save.js` 的严格比较由主 worker 完成。

| 名称 | id | 范围 | 结果 |
|---|---|---|---|
| Run B review tests | 01a10555-ecd0-7c43-be8f-7d55daaa192d | 只跑四条 node 测试并核对截图大小 | 四条退出码 0。发现两张 1600 图字节相同 |
| Audit UI review fixes | 01a10555-ecd0-7c43-be8f-7d623dd40baa | 只读界面、数据和行情 | 7 项复审要求全部 PASS |
| Audit migration atomicity | 01a10555-ecd0-7c43-be8f-7d721c71b117 | 只读存档、交易、校验 | 8 项里 7 项 PASS。`save` 曾接受任意真值作为替换授权，已改为必须 `=== true` |
| Adapt AV UI tests | 01a1057d-f0a7-7cb2-9f12-0b850bab36fc | 只改测试脚本，不改 `js/`、`simulation/c1.cjs`、C1 JSON | 已结束。见下方短交接。主 worker 没有重跑这四条。 |

## 测试子代理短交接

子代理 `01a1057d-f0a7-7cb2-9f12-0b850bab36fc` 已结束。默认模型，没有再委托，没有开 Herdr。它只改了这四个文件：

- `tests/av-visual.cjs`：房价改从 `new HomeYear.Engine(seed, 'standard').visible()` 读取。收藏星改为当周在售商品。第一次退出码 1，失败是 `Missing [data-action=favorite][data-id=rice]`。改选择器后子代理报告退出码 0。
- `tests/av-integration.cjs`：同样改为本局 `visible` 价格簿。子代理报告 `node tests/av-integration.cjs --idle 60` 退出码 0。
- `tests/ui-interaction.cjs`：新开一页，使 `new-game` 和 `tour-finish` 存在。买入当周在售卡片，卖出用 `trade-sell`。缺失元素仍会在 `.click()` 抛错。手动存档核对 `homeyear.save.v3`，并确认 `homeyear.save.v2` 不存在。子代理报告退出码 0。
- `tests/acceptance-final.cjs`：活档键改为 `homeyear.save.v3`。损坏 v3 在明确替换前保持 `BROKEN ORIGINAL`。`homeyear.save.v2` 必须仍是 `V2-MUST-STAY`。子代理报告退出码 0，证据被重定向到 `docs/` 以外。

生产 `H.housePrice` 没有放宽。不要再改这四个测试去重复同一适配。主 worker 没有亲自重跑这四条，所以不要把子代理报告写成主 worker 的复跑。
