# 现行规则 0.5：阶段 B 核心待独立复核

存档版本 4，活跃键 `homeyear.save.v4`。本次仅按已批准 [`gameplay-ui-and-black-swan-plan.md`](gameplay-ui-and-black-swan-plan.md) §§11–14 实施；不表示平衡冻结、540 局诊断、36000 局主/留出或人工试玩完成。旧 [`gameplay-rule-freeze.md`](gameplay-rule-freeze.md) 是 0.4 历史冻结，本次不改历史经济证据。

## 不变的经济规则

12 个轮换商品、每周 8 个在售、2–3 个轮换和最多缺席 3 周不变；8 个退出商品仅供旧档回收。金额为整数分，买卖费 `ceil(gross × 1%)`，回收单价 `floor(price × 92%)`；部分卖出成本 BigInt 向下分摊，清仓带走余数。价格上下界、体积、住房/仓储标价、价格簿 `0.2`、噪声、难度参数和 15% 均值回归不变。第 52 周仍可交易，无第 53 周；重复结算不改变账本。

## 分层抽取

周推进仍按：周数 → 环境 → 轮换 → 事件 → 趋势 → 定价 → 生活结算 → 新闻 → 记录/校验/提交/保存。

- 重大事件仅第 4–50 周可新抽。非空候选时用 events 流抽 16% 门槛，同权重选一个。
- 同事件 id 每年最多一次，年度最多 6 次。发生周 t 后 t+1…t+5 不可新抽，t+6 起恢复。
- 候选排除已发生 id、非夏季热浪、所有主商品均未上架、主商品与正在生效的普通短期事件重叠。普通结构中枢不构成此冲突，也不被删除。
- 重大事件成功替代普通市场抽取；未成功才走原 42% 普通门槛。重大 persist 生效期间，普通新事件排除其 **全部 persist 受影响商品** 的重叠。没有候选不耗重大门槛，不重抽、不记发生。
- 生活事件仍单独抽 8%。选择不读取现金、持仓、交易利润、历史结果或价格。
- 四条随机流仍分离；快报/诊断读取不消耗经济随机流，失败操作不提交 RNG 或日志。保存失败是经济已提交，不能重新抽奖。

| id / 情境 | 主商品 | 周数 | effects（基点） |
|---|---|---:|---|
| swan_route / 航道封航 | phone | 3 | persist phone +4000、gpu +3000、ac +2500 |
| swan_efficiency / 效率突破 | gpu | 1 | immediate gpu −5000、phone −1500 |
| swan_egg_short / 蛋品停供 | eggs | 1 | immediate eggs +5500、rice +1000 |
| swan_heat / 夏季异常热旱 | ac | 3 | persist ac +5000、fruit +3000、umbrella −1500 |
| swan_tariff / 进口规则分化 | phone、collectible | 2 | persist phone +3500、watch −2500、collectible −4000 |
| swan_protection / 防护需求 | mask | 1 | immediate mask +11000、rice +2000、eggs +1500 |
| swan_egg_relief / 到货缓解 | eggs | 1 | immediate eggs −4500、rice −1000 |

夏季为第 27–39 周。首冲仅发生在 started 周。immediate 不进入持续中枢；persist 后续只改变中枢，其合计护栏仍按 daily ±3000、industry ±6000、spec ±8000。到期不生成镜像反弹。配置 bps 不是实际涨跌保证；定价仍受噪声与原上下界裁剪。

## 状态与信息边界

`swanLog` 严格为 `{id,week}` 数组：过去 4–50 周、唯一 id、相邻间隔至少 6、最多 6 条。当前有效日志与 activeEvents 双向核对；重大 headline/ongoing 与 active/log、时间、fresh、实际 changeBps 和效果商品双向校验。过期日志保留，不能宣称仅凭当前快照能证明所有遥远历史完整。

重大事件新闻仍使用原八字段、原五种 kind；主摘要最多三行。多商品快报逐商品显示实际本周涨跌、渠道、持仓和查看入口，不把次级最大异动当成候选主商品。生活来信与持续快报不混组。

`visible()` 不泄露 swanLog、upgrade、RNG、activeEvents 或预测；当前已发生新闻仍可见。`diagnostics().eventLog` 仅在成功提交的 next 后记录已发生的门槛/候选过滤/事件/各商品实际变化及裁剪、护栏统计，返回隔离副本；恢复不重建之前未记的诊断。仅用于事后分析，禁止策略使用隐藏诊断决策。

迁移协议见 [`save-v4.md`](save-v4.md)。本轮自动化证据见 [`black-swan-evidence/phase-b-20261004/core-report.md`](black-swan-evidence/phase-b-20261004/core-report.md)。
