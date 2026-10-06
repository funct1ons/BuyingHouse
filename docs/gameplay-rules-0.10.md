# 0.10 / save9 当前规则

当前开发协议为规则 0.10，活跃存档键为 `homeyear.save.v9`。旧 v1–v8 原文保留但不迁移。房价每周 1%、住房冲击、手续费、仓储标价、52 周、难度系数、商品基准价、普通市场事件概率，以及 0.9 的黑天鹅频率都不变。价格簿 `0.2` 保持原样。新局仍使用价格簿 `0.3`。本文只记本版合同。池子变深没有做过平衡模拟，不能当作已经平衡。

商品黑天鹅仍走 `rng.events`，不占用 `rng.housing`。窗口仍是第 4–50 周。概率仍是 0.42，相邻至少隔 4 周，一年最多 8 次。每种事件一年最多一次。主商品本周未上架、季节不符，或与非结构性普通事件重叠时，该周不抽这只事件；没有候选时不消耗这次黑天鹅随机数。更大的候选池会改变同一种子的抽取路径，所以存档升到 v9。

原有 15 个事件的效果表不改。0.9 文档仍是上一版合同。

本版新增 30 个事件。效果按事件 id 固定。多数只在发生周冲击一次；少数持续 2 周，之后按 15% 向中枢回拉，并受角色上限约束。额外的季节锁只有一条冬装（`swan_puffer`）和一条夏日制冷（`swan_fans`）。十二种在售商品都有上涨和回落。方案讨论里曾写过一条手机与显卡一起下跌的行；落地时这一格是 `swan_dump`，只对显卡做一次性 −6000 基点，因为原型是显卡挖矿退潮。

弹窗百分比来自当周成交价。弹窗写出事件经过。有官方页面、并且本环境打开过该页的事件使用 `kind: 'verified'`，标题是「现实新闻原型 · 已核实事实」，并给出 https 链接。其余使用 `kind: 'original'`，`url` 为空，标题是「当年热度 · 原型」。玩家界面不写姓名处理、外链取舍和价格映射说明。目录里的 `adaptation` 仍保留，供规则和测试核对。

本版新核实的两页：

- `swan_recall`：2016-09-15，CPSC《Samsung Recalls Galaxy Note7 Smartphones Due to Serious Fire and Burn Hazards》。约 100 万部，严重起火和烫伤风险，可以退款或更换。https://www.cpsc.gov/Recalls/2016/Samsung-Recalls-Galaxy-Note7-Smartphones
- `swan_blackout`：2021-10-04，Cloudflare《Understanding how Facebook disappeared from the Internet》。页面记录脸书网络的流量当天消失。https://blog.cloudflare.com/october-2021-facebook-outage/

新增事件（基点；`imm` 为一次性，`persist` 为持续）：

| id | 主商品方向 | 效果 | 原型 |
| --- | --- | --- | --- |
| swan_unbox | 手机涨 | phone +12000 imm | 2017-11 全面屏新机开箱周 |
| swan_recall | 手机跌 | phone −6000 imm | 2016-09-15 Note7 召回 |
| swan_mining | 显卡涨 | gpu +14000 persist 2 周 | 2020–2021 显卡挖矿短缺 |
| swan_dump | 显卡跌 | gpu −6000 imm | 2022-09-15 以太坊改为权益证明 |
| swan_instaegg | 鸡蛋涨 | eggs +14000 imm | 2019-01 鸡蛋照片超过名人帖 |
| swan_rumoregg | 鸡蛋跌 | eggs −5500 imm | 2017 前后人造鸡蛋图片；公开说明不能证明市面的蛋是假的 |
| swan_mukbang | 猪肉涨 | pork +12000 imm | 吃播 |
| swan_veganuary | 猪肉跌 | pork −5000 imm | 英国一月吃素活动 |
| swan_tanghulu | 水果涨 | fruit +8000 persist 2 周 | 2023 糖葫芦短视频 |
| swan_avocado | 水果跌 | fruit −4500 imm | 2017-05 牛油果吐司采访；假名蒂姆·古纳 |
| swan_salmonrice | 大米涨 | rice +8000 imm | 2021 隔夜米饭拌剩鱼；假名埃玛丽 |
| swan_keto | 大米跌 | rice −4000 imm | 2010 年代末几乎不吃主食 |
| swan_puffer | 冬衣涨，仅冬 | coat +12000 persist 2 周 | 圆标羽绒服 / 大鹅 |
| swan_ugly | 冬衣跌 | coat −5000 imm | 圆标被笑土、贵 |
| swan_fans | 空调涨，仅夏 | ac +10000 persist 2 周 | 2022-07 英国热浪期间风扇被买空 |
| swan_leak | 空调跌 | ac −5500 imm | 外机悬挂短视频这一类 |
| swan_film | 雨伞涨 | umbrella +9000 imm | 2019-07-19 日本上映《天气之子》；假名新海成 |
| swan_mangkhut | 雨伞跌 | umbrella −4000 persist 2 周 | 2018-09 台风山竹里伞被吹翻 |
| swan_blindbox | 藏品涨 | collectible +12000 imm | 2024 长牙小怪物盲盒；假名龙家声 |
| swan_emptybox | 藏品跌 | collectible −6000 imm | 重复款和「像赌博」的批评 |
| swan_steel | 名表涨 | watch +7000 imm | 2021–2022 钢款运动表配货 |
| swan_fakewatch | 名表跌 | watch −5500 imm | 约 2020 起拆穿高仿表的直播 |
| swan_runway | 口罩涨 | mask +15000 imm | 2020 口罩被当成穿搭 |
| swan_maskne | 口罩跌 | mask −4500 imm | 2020「口罩痘」 |
| swan_bundle | 大米涨 | rice +6000、pork +8000 imm | 2020 社区团购 |
| swan_station | 猪肉跌 | rice −4000、pork −5000 imm | 2021 社区团购补贴退潮 |
| swan_charm | 藏品涨 | collectible +7000、phone +5000 imm | 2024–2025 手机链和包挂玩偶 |
| swan_blackout | 显卡跌 | gpu −4500、phone −4000、watch −3500 imm | 2021-10-04 脸书网络消失 |
| swan_haul | 名表涨 | watch +6500、collectible +8000 imm | 2019–2021「买了一大堆」开箱 |
| swan_spinner | 藏品涨 | collectible +9000 imm | 2017 指尖陀螺 |

文案里不写点赞数、报名人数、专柜溢价倍数、成交额、伤亡人数，也不把未打开的网页地址放进游戏。
