# 正式 36000 局摘要

本次只跑已批准的正式模拟。运行前用 node `crypto` 读取 `simulation/c1.cjs` 的字节并计算 SHA-256，结果为 `43f9dd9a8f67e45bd9cce7c2dd4fa9a40187364e08daef62580b0861cbc19479`，与指定值相同，因此没有中止。运行后再次计算，同一文件仍是这个哈希。没有改 `simulation/c1.cjs`，没有改房价、事件参数或策略阈值，也没有增加种子数。正式模式本身不跑无租仓臂，本次没有另加该臂。

两集各 6 策略 × 3 难度 × 1000 种子 = 18000 局，合计 36000 局。每个 JSON 记录的是单集，所以各自的 `formal36000` 为 false；两集合在一起才是 36000 局。同一难度的 1000 条价格路径被 6 个策略重复，涨跌观测数不乘 6。

## 命令、退出码、耗时

主样本命令：

`node simulation/c1.cjs --mode primary --seeds 1000 --prefix gameplay-v4-primary --approved yes --out docs/gameplay-v4-primary.json --report docs/gameplay-v4-primary.md`

退出码 0。JSON `elapsedSeconds` 为 253.569。报告正文写成 253.6 秒。包含进程启动的墙钟时间为 253.842 秒。`totalGames` 18000。`sensitivityGames` 0。`sensitivityGroups` 长度为 0。`seeds` 1000。`prefix` 为 `gameplay-v4-primary`。`mode` 为 primary。`holdoutUsed` 为 false。

留出样本命令：

`node simulation/c1.cjs --mode holdout --seeds 1000 --prefix gameplay-v4-holdout --approved yes --out docs/gameplay-v4-holdout.json --report docs/gameplay-v4-holdout.md`

退出码 0。JSON `elapsedSeconds` 为 251.963。报告正文写成 252.0 秒。包含进程启动的墙钟时间为 252.204 秒。`totalGames` 18000。`sensitivityGames` 0。`sensitivityGroups` 长度为 0。`seeds` 1000。`prefix` 为 `gameplay-v4-holdout`。`mode` 为 holdout。`holdoutUsed` 为 true。

两份 JSON 的 `sourceHashes["simulation/c1.cjs"]` 都是 `43f9dd9a8f67e45bd9cce7c2dd4fa9a40187364e08daef62580b0861cbc19479`。规则版本 0.4，价格簿 0.2。`housePricesUnchanged`、`eventParametersUnchanged`、`strategyThresholdsUnchanged` 均为 true。

## 运行后文件 SHA-256

哈希在两集都成功写出之后计算。

- `docs/gameplay-v4-primary.json`：`ce1cc8107784fd582588e4f71c2058b6849a653aa0bb18f652723f45bb9b29cc`
- `docs/gameplay-v4-primary.md`：`2dec6e29a6b6480525873025ef2eea00875b3f4dfe59065fe5b1af504c690ac4`
- `docs/gameplay-v4-holdout.json`：`6c83f4d51637b61f0f648dfc059d29d562e590a2fcd88e4a90b40449b35f2888`
- `docs/gameplay-v4-holdout.md`：`8863be9fb2754414b8b1b9b4a2071ddcb43003a4fe52d5dd05eb9ac3a1f1a303`

## 难度 × 策略

每格 1000 局。买房率是 `successRate`，也就是买到住房的局数除以 1000。95% 区间是脚本的 Wilson 区间，`z = 1.959963984540054`，下表按脚本的 1 位小数显示。0 成功时 JSON 的 `successInterval.low` 约为 `2.17e-19`，是浮点残差，显示为 0.0%，不是另有成功局。未取整的上下界在 JSON。

买房周 p50 只在买到住房的局上计算。一局都没买到则为 null，表内写 —。只有 1 局买到时，p50 就是那一局的周数。

住房档计数顺序是租 / 单间 / 公寓 / 两居 / 城 / 梦，对应 `renting/studio/flat/two/city/dream`。仓储档计数顺序是 `room/small/normal/large`。`meanWarehouseSpent` 是 JSON 原值，单位是分。报告里的仓储投入是分除以 100 后四舍五入到元。`compactShare` 为 null 时写 —，0 是实测零，不是缺失。`clips` 是 `clips.total`。`everLowCashRate` 是年内最低现金低于起步现金 10% 的局占比。`terminalLowCashRate` 是终局现金低于起步现金 10% 的局占比。二者不混用。

### 主样本

|难度|策略|买房率|95%区间|买房周p50|住房档|仓储档|meanWarehouseSpent（分）|compactShare|clips|everLowCashRate|terminalLowCashRate|
|---|---|---:|---|---:|---|---|---:|---:|---:|---:|---:|
|easy|conservative|20.5%（205/1000）|18.1–23.1%|50|795/203/2/0/0/0|0/401/599/0|127880|0.0%|488|62.8%|9.7%|
|easy|random|5.8%（58/1000）|4.5–7.4%|52|942/54/4/0/0/0|40/951/9/0|54840|28.4%|488|79.2%|2.0%|
|easy|momentum|11.4%（114/1000）|9.6–13.5%|52|886/88/22/4/0/0|10/811/174/5|78040|36.7%|488|100.0%|4.5%|
|easy|value|77.0%（770/1000）|74.3–79.5%|52|230/405/239/80/37/9|17/456/484/43|127920|39.7%|488|100.0%|12.7%|
|easy|event-aware|4.3%（43/1000）|3.2–5.7%|28|957/40/3/0/0/0|20/954/26/0|58000|46.4%|488|74.7%|2.1%|
|easy|idle|0.2%（2/1000）|0.1–0.7%|47|998/2/0/0/0/0|1000/0/0/0|0|—|488|0.2%|0.2%|
|standard|conservative|0.5%（5/1000）|0.2–1.2%|52|995/5/0/0/0/0|0/973/27/0|74050|0.0%|687|57.8%|0.5%|
|standard|random|0.1%（1/1000）|0.0–0.6%|52|999/1/0/0/0/0|387/613/0/0|42910|28.9%|687|64.9%|0.0%|
|standard|momentum|2.1%（21/1000）|1.4–3.2%|52|979/18/2/1/0/0|251/718/30/1|57360|36.6%|687|99.9%|1.0%|
|standard|value|38.9%（389/1000）|35.9–42.0%|52|611/273/89/19/7/1|62/700/234/4|102480|41.6%|687|99.3%|5.3%|
|standard|event-aware|0.1%（1/1000）|0.0–0.6%|45|999/1/0/0/0/0|276/722/2/0|50980|40.9%|687|70.8%|0.5%|
|standard|idle|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|1000/0/0/0|0|—|687|0.0%|0.0%|
|challenge|conservative|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|154/846/0/0|71064|0.0%|915|48.0%|0.0%|
|challenge|random|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|886/114/0/0|9576|29.1%|915|43.7%|0.1%|
|challenge|momentum|0.4%（4/1000）|0.2–1.0%|52|996/4/0/0/0/0|700/294/6/0|26280|36.9%|915|99.5%|1.9%|
|challenge|value|16.5%（165/1000）|14.3–18.9%|52|835/134/25/6/0/0|195/688/116/1|89016|43.8%|915|98.8%|2.6%|
|challenge|event-aware|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|839/161/0/0|13524|40.5%|915|55.7%|1.4%|
|challenge|idle|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|1000/0/0/0|0|—|915|0.0%|0.0%|

主样本里买房率低于 15% 的实测计数：easy/random 58/1000，easy/momentum 114/1000，easy/event-aware 43/1000，easy/idle 2/1000，standard/conservative 5/1000，standard/random 1/1000，standard/momentum 21/1000，standard/event-aware 1/1000，standard/idle 0/1000，challenge/conservative 0/1000，challenge/random 0/1000，challenge/momentum 4/1000，challenge/event-aware 0/1000，challenge/idle 0/1000。其余为 easy/conservative 205/1000，easy/value 770/1000，standard/value 389/1000，challenge/value 165/1000。

### 留出样本

|难度|策略|买房率|95%区间|买房周p50|住房档|仓储档|meanWarehouseSpent（分）|compactShare|clips|everLowCashRate|terminalLowCashRate|
|---|---|---:|---|---:|---|---|---:|---:|---:|---:|---:|
|easy|conservative|19.1%（191/1000）|16.8–21.7%|50|809/189/2/0/0/0|0/406/594/0|127280|0.0%|464|61.3%|9.7%|
|easy|random|7.0%（70/1000）|5.6–8.8%|52|930/68/2/0/0/0|37/952/11/0|55248|28.9%|464|80.1%|3.3%|
|easy|momentum|9.9%（99/1000）|8.2–11.9%|52|901/83/13/3/0/0|10/812/175/3|77472|35.7%|464|100.0%|3.5%|
|easy|value|77.0%（770/1000）|74.3–79.5%|52|230/407/226/106/22/9|17/463/494/26|123272|41.3%|464|100.0%|12.2%|
|easy|event-aware|3.9%（39/1000）|2.9–5.3%|21|961/38/1/0/0/0|17/956/27/0|58288|44.5%|464|74.4%|1.8%|
|easy|idle|0.1%（1/1000）|0.0–0.6%|52|999/1/0/0/0/0|1000/0/0/0|0|—|464|0.1%|0.1%|
|standard|conservative|0.7%（7/1000）|0.3–1.4%|51|993/7/0/0/0/0|0/968/32/0|74800|0.0%|630|59.3%|0.2%|
|standard|random|0.2%（2/1000）|0.1–0.7%|52|998/2/0/0/0/0|357/643/0/0|45010|27.1%|630|65.4%|0.0%|
|standard|momentum|1.1%（11/1000）|0.6–2.0%|52|989/11/0/0/0/0|253/724/23/0|55740|35.4%|630|100.0%|2.4%|
|standard|value|41.2%（412/1000）|38.2–44.3%|52|588/297/93/20/2/0|79/682/231/8|102560|42.3%|630|99.6%|6.4%|
|standard|event-aware|0.1%（1/1000）|0.0–0.6%|16|999/1/0/0/0/0|292/708/0/0|49560|43.6%|630|70.9%|0.2%|
|standard|idle|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|1000/0/0/0|0|—|630|0.0%|0.0%|
|challenge|conservative|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|176/824/0/0|69216|0.0%|852|44.5%|0.0%|
|challenge|random|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|881/119/0/0|9996|27.3%|852|42.8%|0.1%|
|challenge|momentum|0.2%（2/1000）|0.1–0.7%|44|998/2/0/0/0/0|731/262/7/0|23856|35.7%|852|99.9%|3.3%|
|challenge|value|17.9%（179/1000）|15.6–20.4%|52|821/142/29/6/2/0|199/674/125/2|90816|44.5%|852|98.4%|2.3%|
|challenge|event-aware|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|853/147/0/0|12348|41.8%|852|57.9%|0.9%|
|challenge|idle|0.0%（0/1000）|0.0–0.4%|—|1000/0/0/0/0/0|1000/0/0/0|0|—|852|0.0%|0.0%|

留出样本里买房率低于 15% 的实测计数：easy/random 70/1000，easy/momentum 99/1000，easy/event-aware 39/1000，easy/idle 1/1000，standard/conservative 7/1000，standard/random 2/1000，standard/momentum 11/1000，standard/event-aware 1/1000，standard/idle 0/1000，challenge/conservative 0/1000，challenge/random 0/1000，challenge/momentum 2/1000，challenge/event-aware 0/1000，challenge/idle 0/1000。其余为 easy/conservative 191/1000，easy/value 770/1000，standard/value 412/1000，challenge/value 179/1000。

同一难度内，6 个策略的 `clips.total` 相同：主样本 easy 488、standard 687、challenge 915；留出样本 easy 464、standard 630、challenge 852。

## 字段口径

JSON 字段 `bankrupt` 表示现金到达 0，也就是现金耗尽。脚本定义为年内最低现金 `<= 0`，最低现金含买入、租仓和买房之后，因此也包括买房之后现金为 0。它不是资不抵债检验。键名仍是 `bankrupt`，本次不改名。报告里的「破产」列是 `bankruptRate`，沿用这个键的含义。

按商品的 `meanProfit` 不是这份冻结脚本的单独官方字段。组对象有整体 `profit.mean`，样本里有 `byProduct`，但没有按商品汇总的官方 `meanProfit`。本次没有改脚本去添加该字段，摘要也不另算一套官方数。

## C1 证据

`docs/gameplay-v4-c1-r2.json` 仍是已批准的 C1 证据，本次没有覆盖。它的修改时间仍是 2026-10-04T06:10:49.011Z，早于两集正式输出。本次读到的 SHA-256 为 `fd647cde0cf72528a69fd0126baae132789690ac0c05b3cae332cab94cb3442e`。`docs/gameplay-v4-c1-r3.json` 只是去掉未上架卖出之后的临时历史，不是本次正式结果，本次也没有写它。`docs/gameplay-handoff.md` 没有改。
