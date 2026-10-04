# 玩法发布复核

状态：停等主审。没有提交，没有推送，没有部署。不要清理 `tmp-acceptance-rerun/`，不要删除历史报告。

C1 r2 已批准。`docs/gameplay-v4-c1-r3.*` 失效，它只是临时去掉缺货占仓比较的历史。现行策略保留 `offSaleSellQty`。

## 现行规则

- 轮换池 12 种，每周 8 种在售。8 种退出商品只能卖。
- 回收报价 `floor(市价 × 92 / 100)`，手续费另计 `ceil(金额 × 1%)`。
- 快报是本周已经发生的涨跌。
- 新局价格簿 `0.2`。住房底价仍是 650000 / 1000000 / 1400000 / 1900000 / 2500000 分。
- v2 单向、明确确认后迁入。原键不覆盖。先写独立备份，回读失败不写 v3。可导出损坏原文。损坏 v3 不能静默覆写。
- 人工试玩和人工试听待验。脚本买房率不是玩家胜率。
- 核心经济再改，须主审重新冻结并重跑模拟。

## 已核对的命令与哈希

`simulation/c1.cjs` SHA-256 `43f9dd9a8f67e45bd9cce7c2dd4fa9a40187364e08daef62580b0861cbc19479`。与 r2 记录一致。`sourceHashes` 共 10 项：`js/data.js`、`js/math.js`、`js/v2-baseline.js`、`js/market.js`、`js/trading.js`、`js/statistics.js`、`js/validation.js`、`js/game.js`、`js/save.js`、`simulation/c1.cjs`。不是七个。

正式模式 `primary` / `holdout` 不额外跑无租仓。脚本里只有 `mode === 'c1'` 才收集 `sensitivityGroups`。没有为这一点改冻结脚本。

主样本命令：

`node simulation/c1.cjs --mode primary --seeds 1000 --prefix gameplay-v4-primary --approved yes --out docs/gameplay-v4-primary.json --report docs/gameplay-v4-primary.md`

模拟子代理 `01a10595-c331-7271-93aa-0d0dae42826b` 报告主样本退出码 0，`elapsedSeconds` 253.569。`totalGames` 18000，`sensitivityGames` 0，源码哈希与冻结值相同。

`docs/gameplay-v4-primary.json` SHA-256 `ce1cc8107784fd582588e4f71c2058b6849a653aa0bb18f652723f45bb9b29cc`

`docs/gameplay-v4-primary.md` SHA-256 `2dec6e29a6b6480525873025ef2eea00875b3f4dfe59065fe5b1af504c690ac4`

`docs/gameplay-v4-c1-r2.json` SHA-256 `fd647cde0cf72528a69fd0126baae132789690ac0c05b3cae332cab94cb3442e`

`docs/gameplay-v4-c1-r2.md` SHA-256 `4491f543bfb919be2585345400f46681dcedc9f01ad056c23c808a96e4d5f8a5`

留出命令：

`node simulation/c1.cjs --mode holdout --seeds 1000 --prefix gameplay-v4-holdout --approved yes --out docs/gameplay-v4-holdout.json --report docs/gameplay-v4-holdout.md`

模拟子代理 `01a10595-c331-7271-93aa-0d0dae42826b` 报告退出码 0。`elapsedSeconds` 251.963。`totalGames` 18000。`sensitivityGames` 0。源码哈希与冻结值相同。

`docs/gameplay-v4-holdout.json` SHA-256 `6c83f4d51637b61f0f648dfc059d29d562e590a2fcd88e4a90b40449b35f2888`

`docs/gameplay-v4-holdout.md` SHA-256 `8863be9fb2754414b8b1b9b4a2071ddcb43003a4fe52d5dd05eb9ac3a1f1a303`

两集合计 36000 局。摘要 `docs/gameplay-v4-formal-summary.md`。平衡记录 `docs/gameplay-v4-balance.md`。

## 主样本买房率

脚本策略的实际购房率，不是玩家胜率。95% 区间取 JSON 的 Wilson 区间。

|难度|策略|买房率|95%区间|买房周P50|年内低现金|终局低现金|
|---|---|---:|---|---:|---:|---:|
|easy|conservative|20.5%|18.1–23.1%|50|62.8%|9.7%|
|easy|random|5.8%|4.5–7.4%|52|79.2%|2.0%|
|easy|momentum|11.4%|9.6–13.5%|52|100.0%|4.5%|
|easy|value|77.0%|74.3–79.5%|52|100.0%|12.7%|
|easy|event-aware|4.3%|3.2–5.7%|28|74.7%|2.1%|
|easy|idle|0.2%|0.1–0.7%|47|0.2%|0.2%|
|standard|conservative|0.5%|0.2–1.2%|52|57.8%|0.5%|
|standard|random|0.1%|0.0–0.6%|52|64.9%|0.0%|
|standard|momentum|2.1%|1.4–3.2%|52|99.9%|1.0%|
|standard|value|38.9%|35.9–42.0%|52|99.3%|5.3%|
|standard|event-aware|0.1%|0.0–0.6%|45|70.8%|0.5%|
|standard|idle|0.0%|0.0–0.4%|—|0.0%|0.0%|
|challenge|conservative|0.0%|0.0–0.4%|—|48.0%|0.0%|
|challenge|random|0.0%|0.0–0.4%|—|43.7%|0.1%|
|challenge|momentum|0.4%|0.2–1.0%|52|99.5%|1.9%|
|challenge|value|16.5%|14.3–18.9%|52|98.8%|2.6%|
|challenge|event-aware|0.0%|0.0–0.4%|—|55.7%|1.4%|
|challenge|idle|0.0%|0.0–0.4%|—|0.0%|0.0%|

低买房率是实测结果：标准与挑战的保守、随机、事件感知、不交易，以及挑战追涨，区间上界都不高。不因此自动降房价，也不宣称平衡通过。

主样本轻松保守：住房计数租/单间/公寓/两居/城/梦为 795/203/2/0/0/0。仓储 room/small/normal/large 为 0/401/599/0，平均投入 127880 分，升级率 100%。钳制 488 / 612000。persistCap 触发 165，都在水果。没有新事件头条的全池观测 n=370776，绝对中位 603 bps。这组仍含持续项。受影响品首冲 n=25692，绝对中位 3274 bps。这些 n 是 1000 条价格路径，不乘 6。

JSON 字段 `bankrupt` 表示现金曾经降到 0，包括买房后现金为 0。它不是资不抵债。逐商品 `meanProfit` 不是冻结脚本的正式字段，本轮没有为它改脚本。

正式生成的 MD 参数段写「同一难度 30 条价格路径」。这句是冻结脚本旧模板的错误。两集 JSON 与涨跌分位 n 按 1000 条路径计算。`bankrupt` 列名像破产，实际是现金耗尽，包括买房后现金为 0。没有改模拟源码，也没有改两集原始报告。

## D 实测

测试子代理 `01a10597-c5e7-77a1-9fa7-ebf82df2e215` 已结束。报告在 `docs/gameplay-d-evidence/report.md`。`node tests/run.cjs`、`review-b2.cjs`、`ui-interaction.cjs`、`acceptance-final.cjs`、`acceptance-supplement.cjs`、`av-audio-director.cjs`、`av-audio.cjs`（96/96）、`av-integration.cjs --idle 60`（24/24）、`av-visual.cjs`、`milestone-b-edge.cjs`、`milestone-b-edge-migrate.cjs`、`milestone-b-edge-review.cjs` 退出码都是 0。三支 Edge B 的 `failures` 为空。`milestone-d-edge.cjs` 第一次退出码 1，原因是关闭的对话框仍留着交易标记；断言改为要求 `dialog.open` 后复跑退出码 0。数字键按当前可见顺序。surge 只在 fresh 头条绝对涨跌至少 2500 bps 且动效开启时出现。减少动效不出现。继续和导入不重播。

## 剩余风险与未验边界

- 标准价值 38.9% / 41.2%，同难度其他策略很弱。合份额预警、标准保守 100% 升仓且容量卡住约 87%，见平衡记录。不自动改价。
- 人工试玩和人工试听未做。音频 96 与整合 24 是数字测量。
- `ui-interaction.cjs` 没有覆盖 125%/150%，也没有第 52 周缺货回收。`acceptance-final.cjs` 的第 52 周大米买卖是当周在售。第 52 周缺货回收且无第 53 周由 `review-b2.cjs` 在 Node 通过。
- `docs/balance-*.json` 与 README 末段 30000 局是 0.2 历史，不是新证据。
