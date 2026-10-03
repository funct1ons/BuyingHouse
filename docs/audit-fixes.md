# 核心审计修复与实际验证

## 范围

仅修改 `js/math.js`、`js/trading.js`、`js/validation.js`、`tests/suite.js` 与本文件；按要求重新生成 `docs/balance-primary.json`、`docs/balance-holdout.json`、`docs/balance.md`。未修改 data/game/UI/index/CSS/art、模拟策略或参数，未委托子代理。

完整读取 math/trading/validation/statistics/game/market/data/save、tests/suite.js、tests/run.cjs、simulation/run.cjs、simulation/report.cjs 及原 balance.md。

## 独立确认的问题

使用 Node VM 在内存中恢复原来相关代码（没有改写生产文件），实际确认：

- 初始 audit 状态 `stats.fees=Number.MAX_SAFE_INTEGER` 仍通过原验证。
- 大米 `{qty:3,cost:5000000000000000}`，bought/grants 同为该成本，record 后通过原验证；卖 2 抛出安全整数错误，卖 3 成功。
- 原种子散列中 😀 与 😁 碰撞。

## 修复

### 统计一致性

使用 BigInt 验证利润累计及成交额恒等式：买入成本 B、卖出净收入 S、成交额 T、总费用 F 满足 `2*买入费用=B+S-T+F`。检查费用拆分非负、整数以及买卖成交额对应的 1% 费用累计范围。逐笔向上取整的累计误差允许至交易次数，不要求累计费用等于一次性收费。

检查持仓成本不大于累计买入成本；零交易时 bought/sold/fees/turnover/持仓成本/best/worst 必须为零。交易次数与最小商品成交额一致；最佳收益不超过累计卖出净收入，最大亏损不超过累计已实现成本，累计利润位于交易次数乘最佳/最差之间。

峰值至少为初始资产，上界采用初始现金+累计赠款+累计卖出净收入+容量可容纳的最大商品市值这一保守资源界限；零交易没有商品市值增益。最大回撤必须至少达到当前资产相对峰值的回撤，使用 record 的相同四舍五入。保留操作级峰值，绝不要求峰值等于已覆盖的每周历史最大值。测试明确保留同周买入后高于周历史的初始峰值。

### 持仓与精确分摊

每商品持仓成本下界为 `qty*(min+floor(min*fee))`。上界为 `qty*(max+ceil(max*fee))+trades`：买入费用逐笔向上取整，不超过逐单位向上取整；部分卖出向下分摊，每次留给剩余持仓不足一分误差，允许每历史交易一分作为保守容差。此界限拒绝不可能巨额持仓，仍容纳混合买入及反复部分卖出的舍入余量。

部分卖出改为 `Number(BigInt(cost)*BigInt(qty)/BigInt(totalQty))`，随后安全整数检查。BigInt 正数除法与原数学 floor 一致，但不会因中间乘积超出安全整数而拒绝；全卖仍直接取全部成本。测试直接调用交易辅助函数隔离验证原巨额成本的精确分摊（该状态现在不能 restore），另验证合法最高价满仓逐单位卖出及最低价买入/部分卖出。

### UTF-16 种子

散列改成按字符串索引逐 UTF-16 代码单元处理，ASCII/BMP 映射完全不变，非 BMP 的低代理单元不再丢失。未发行开发版规则仍为 0.2、存档版本仍为 2，不改 data。

**兼容性说明：已有非 BMP 种子存档的 RNG 状态可原样 restore，后续继续使用保存的随机流；同一非 BMP 种子重新开局的映射改变，不再承诺与旧实现开局轨迹一致。** 回归测试用旧算法构造保存 RNG，restore 后推进完整 52 周，并比较两个恢复实例的一致性。

## 实际验证

最终执行 `node tests/run.cjs`：**17 passed, 0 failed**。包含原 100 种子×52 周×三难度轮换的不变式测试及新增三组回归。

原命令、prefix、种子数不变，并发执行：

```powershell
node simulation/run.cjs --seeds 1000 --prefix balance-v3-primary --out docs/balance-primary.json
node simulation/run.cjs --seeds 1000 --prefix balance-v3-holdout --out docs/balance-holdout.json
node simulation/report.cjs
```

实际完成主样本 15000 局和留出 15000 局，两个程序均正常完成，没有吞掉失败操作。主样本 54.8s、留出 54.8s（报告保留精确耗时）。随后用 Node assert 对比修复前备份与新 JSON：两报告各 15 个完整 groups 对象深度相等，包含所有汇总字段与各 15000 个逐局 samples；command/prefix/seeds 相等。使用 crypto 对两 JSON 的全部 sourceHashes 逐个比对最终 js 源码，全部一致。最后实际运行 report.cjs 生成 balance.md。

因此成功率、资产分位、住房人数、购房周、升级、回撤、商品贡献及全部逐局结果与修复前**完全一致**；仅生成时间、耗时及修改源码的 SHA 更新，不存在调参。

## 未验证风险与边界

- 本次未运行浏览器/UI/音效/视觉交互测试，也未进行人工试玩；UI 正由其他 worker 修改，核心测试通过不等于 UI 集成通过。
- BigInt 要求支持该语言特性的现代 JS 环境，本次实际验证环境为 Node；没有验证旧浏览器兼容性。
- 统计校验是必要条件和保守可达范围，不是完整防作弊证明；没有重放交易日志，也不证明所有被接受的手造状态都能从种子产生。赠款/支出仍允许测试及恢复中的一致人工注入。
- 既有非法存档将被拒绝，没有自动迁移/修复；非 BMP 新局映射变化是有意开发版更正。
- 模拟仅覆盖既有五类策略和 ASCII 样本，不能证明不存在其他策略套利；非 BMP 由定向回归测试验证，没有另行改动模拟样本/策略。
