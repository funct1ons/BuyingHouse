# 阶段 C 最终执行与审计（UTF-8）

状态：540 小样本实施/诊断完成，等待独立复核；**不是正式平衡批准**。规则 0.5 / save 4 / book 0.2。没有 production 改动、旧 c1 改动、历史/A/B证据改动、commit/push/deploy、派生 agent、正式主批或新留出执行。本文补充 `summary.md`，尤其精确护栏次数和分事件裁剪警告。

## 执行范围与方法

- 六策略 × easy/standard/challenge × 历史 main 前30种子 = **540局实际运行**，全部 ended、第52周、52历史点、51次成功 next，失败 dispatch=0。固定 main 为 `gameplay-v4-primary-0..29`，非根据结果选种子。
- `metadata.json` 的 main/holdout 各1000名单互不相交，来源是历史正式 prefix 生成规则；本轮新 holdout 和正式集运行数均0。main 30 seeds 跨难度配对：90市场路径，只30 seed簇，六策略完整 prices/listing/eventLog/clipLog hash一致，不乘6。
- 单元回归另用 `simulation-test-* / simulation-catalog-test-* / spy-no-future` 等固定测试种子；其夹具不进入540结果，也没有使用holdout。
- 策略复制旧 c1 的参数/决策块字节，独立VM只接收 JSON visible、公开商品属性和公开金额函数；没有 host callback/Engine/events/swanRules/fs/process/RNG流传入VM。可执行 poison probes、getter/Engine spy、constructor逃逸负例通过。动态value重新visible/random独立政策序列/第52周清仓和住房语义与旧策略逐项回归相等。
- diagnostics/snapshot 仅完成全部决策后读取。仅全新局从已提交 started 事件重建有效期及structural/persist，不恢复中途诊断、不补造前缀。金额为分，回撤为引擎每次dispatch记录的ppm，不用周历史代替现金低谷或资产峰值。

## 实跑命令及退出结果

所有 Node 命令在项目 cwd `C:/files/code/BuyingHouse` 执行。PowerShell 5.1 `Tee-Object` 产生的既有 .log 为UTF-16，保留原文；本文为UTF-8可读记录。

|命令|最终结果|证据|
|---|---|---|
|`node tests/black-swan-simulation.cjs`|10/10，退出0；实现后、正式540前、修复后均通过|`tests.log`、`tests-final.log`、`tests/unit-report.json`|
|`node simulation/black-swan.cjs --seeds 30 --set main --out docs/black-swan-evidence/phase-c-20261004`|540/540，退出0|`run.log`、`first-run/metadata.json`、`first-run/report.json`、`first-run/verification.json`|
|`node docs/black-swan-evidence/phase-c-20261004/rebind-signed-zero.cjs`|唯一明确源码差异、数据hash不变，退出0，0新游戏|`signed-zero-migration.log`、`signed-zero-migration.json`|
|`node docs/black-swan-evidence/phase-c-20261004/audit-resumption.cjs`|完整resume、4负例、cap相等/超过测试，退出0，0新游戏|权威最终 `resumption-r3.log`、`resumption-report.json`|
|`node --check simulation/black-swan.cjs` / policy / tests|全部退出0|最终语法检查|
|`git diff --check`|退出0|最终工作树检查|
|`verifyProtected(metadata.protected)`|752文件逐字节sha256通过|`verification.json`、`final-manifest.json`|

## 失败与修复（不是通过记录）

1. 实现过程中给PowerShell内嵌Node字符串嵌套模板字面量的拼接命令发生syntax error；未运行游戏、未改生产。改用PowerShell literal here-string追加新policy，随后单元全部通过。
2. 初次 `audit-resumption.cjs` 相对路径多一层，退出1、MODULE_NOT_FOUND。保留 `resumption.log`。只修 evidence verifier路径。
3. 第二次resume真实暴露序列化负零：内存 `H.changeBps` 可为IEEE `-0`，JSON checkpoint写成 `0`，`assert.strictEqual(-0,0)`失败。退出1，保留 `resumption-r2.log`，**绝不当通过**；没有新游戏。
4. 仅runner的 `assert.equal(bps,d.changes[p.id])` 改为 `assert.ok(bps===d.changes[p.id],...)`，经济百分点的负零与零等价。除此之外无runner差异。不是更改价格公式、RNG、策略、分母或概率。
5. 修改前归档首跑 `runner.cjs/metadata/checkpoint/report/summary/verification` 至 `first-run/`。`rebind-signed-zero.cjs` 实测原runner hash与原metadata的sourceHashes匹配，并严格验证新源码只包含上述唯一替换；其余source哈希仍匹配。`signed-zero-migration.json` 给出每个归档文件hash、新旧source和identity hash、completedDataHash。
6. 身份迁移只复用已结束540局，canonical metadata明确 `createdAfterOriginal540` 的repair，不伪装为初跑前已采用修正源码。首跑真实冻结时间/源码留在first-run。随后resume把Engine改成会立即抛错的spy，证明0新游戏；outcomesHash/marketPathsHash与首跑verification相同。最终 `resumption-r3.log` 全通过。
7. 负例证据仅在 `resume-negative/`：篡改checkpoint hash、stale身份、重复completed游戏、无resume覆盖均拒绝。不是待分析的正式结果。

## 精确结果与分层复核警告

每难度相同市场调度：合格819周、空候选29；重大门槛126/790=15.9494%；普通门槛582/1404=41.4530%。`ordinaryAttempt`只表示门槛命中，调用次数不是582；普通实际新增/总市场实际新增另列JSON。年均4.20，首发生周p10/p50/p90=4/8/16，最长已观察interarrival=9/14/21（29局有至少两个start）。

|难度|全部primary abs≥25%|在售primary abs≥25%|primary bounds|persist caps|
|---|---|---|---|---|
|easy|142/149=95.30%|133/139=95.68%|3/149=2.01%|**1/2014=0.04965%**|
|standard|141/149=94.63%|133/139=95.68%|5/149=3.36%|**1/2014=0.04965%**|
|challenge|138/149=92.62%|131/139=94.24%|5/149=3.36%|**1/2014=0.04965%**|

**护栏并非0。** summary表用一位百分比显示0.0%，早先给主审简报将它误写为0，现明确纠正；machine JSON一直记录1/2014。有效persist product-week分母包含首冲时已计算的persist，首冲不用center，真正center使用周数另列。相等cap不触发，超过才触发。

**分事件裁剪复核告警：`swan_heat` 的primary `ac` 各难度都是2/7=28.57%，超过20%。** 总primary裁剪率未超过20不能抹去这个集中问题。样本仅7事件观测，不提供伪独立CI；需独立review检查heat高价与原bounds相互作用，不自动提高上下界/修改幅度。各商品×事件×难度完整strata在report，active attribution多归属不可求和成总数。

次数3–5和主冲击≥70%的整体体验目标本次满足，但**不是正式平衡改善**：standard除value21/30外所有策略0/30；challenge除value10/30外所有策略0/30。easy保守11/30、random3/30、momentum4/30、value27/30、event-aware与idle0/30。购房Wilson95在report/summary，value与event-aware的watch/collectible/phone正部合份额超过40%，负贡献不与正部抵消。

建议仅单独提案：仓储共同升级政策的敏感性、visible策略的失败原因/回收损耗/容量阻塞、heat裁剪来源；不直接改房价/手续费/仓储/事件目录。70%主冲击观测是相关事件/商品描述性比例，非独立成功试验。

## 最终稳定路径与未验项

- implementation：`simulation/black-swan.cjs`、`simulation/black-swan-policy.cjs`
- tests：`tests/black-swan-simulation.cjs`；补充 evidence verifier `audit-resumption.cjs`
- canonical：`metadata.json`、`report.json`、`summary.md`、`verification.json`、`outcomes.json`、`market-paths.json`、`checkpoint.json`
- provenance：`first-run/`、`signed-zero-migration.json`、`rebind-signed-zero.cjs`、失败与成功resume日志、`final-manifest.json`

未执行：正式main18000/新holdout18000/36000、经济参数候选变更、人工试玩趣味性/独立Chrome/听验/新浏览器UI复测。恢复设计只在**完整游戏边界** checkpoint；中途存档恢复缺失的诊断前缀不支持也不伪造。未来正式使用说明在summary；必须先独立复核并另行授权，不因本报告自动启动。
