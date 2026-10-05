# 阶段 C 独立审核：三项 P2 定向修复

状态：三项定向修复和回归完成，停止修改等待独立终验。**不批准经济平衡或正式批次。** 新权威证据在本目录；原阶段C及其first-run、负零审计、final-manifest 29 artifacts保持原文。production、policy VM、旧c1、A/B/历史证据未改。未提交/推送/部署、未派生agent。

## Supersedes / 范围

本记录 supersedes 原 `../commands.md`、`../summary.md` 对**输出目录安全、formal摘要准确性、formal CLI可运行性**的声明；不撤回540实际数据、市场/购房诊断及前期通过事实。之前完成540后，仅负零assert修复的来源仍由原 `../signed-zero-migration.json` 记录；**本次不是“只有负零差异”**，而是独立的三项P2修复，明确更换runner/test两个source身份。

本次精确允许文件：

1. `simulation/black-swan.cjs`：
   - P2-1：`canonicalOutput/outputPreflight` 在任何mkdir/write/new Engine之前验证路径及目录。使用绝对resolve、existing ancestor realpath、大小写折叠；拒绝不明确的Windows路径段、symbolic link/reparse point、multiply-linked输出文件；拒绝A/B及原阶段C归档保护子树（本次独立review-fixes-output子树可用），并拒绝范围外路径。非空无metadata（包括仅有report）、坏/未知/陈旧metadata、seed/catalog/protected身份不符均在写之前拒绝。新/空目录只接受非resume；合法匹配metadata支持完整游戏边界resume。输出io注入用于**纯内存**副作用验证，不在真实旧证据目录复现覆盖。
   - P2-2：summary根据`identity.mode/set/count/rules/save/book`、`totalGames/uniquePaths/holdoutUsed`生成标题、范围、组数与路径数。formal-main/holdout合成18000单集不冒称合计36000；不误写固定540或no-holdout。此格式支持不是实际正式执行证明。
   - P2-3：legacy CLI仅接受small/main、每组≤30 seeds（≤540局），匹配resume同样受限。formal模式即使`--approved yes`也在任何mkdir/write/Engine前拒绝，明示需独立有界分片formal harness。保留`R.run`、policy、market统计/经济全部原文。
2. `tests/black-swan-simulation.cjs`：保留原10组字节，新增虚拟FS/零write+零Engine的输出保护负例、有界CLI负例和synthetic正式摘要测试。支持`BLACK_SWAN_SIMULATION_EVIDENCE_DIR`，本轮显式新路径输出，未覆盖原`../tests/unit-report.json`。

修改前真实runner SHA256 `1714fad451deb7315c3e0f499c746c69c61e6fe4b6c10998545e4d6a31daf23c`、tests `8827051b6312f0d7a320f1df9a8d33f31cc0fcd7f1c97ee44ded51b348ad6956` 分别保存在 `before/runner.cjs`、`before/tests.cjs`。完整UTF8差异在 `runner.diff/tests.diff`。修改后hash在manifest与migration审计。

## 原始数据与显式身份迁移

- `before/c-evidence-hashes.json` 在改源前记录原阶段C的30文件（原final-manifest的29artifacts加manifest本身），排除本次新fix目录。全部前后hash相等。
- `migrate-and-resume.cjs` 钉住两个源的before/after hash；验证runner的summary之前全部代码（包含R.run、重建和统计）逐字节相等，原10组测试逐字节相等。
- 核心production、policy、旧c1以及format/rules/save/book/mode/set/count/policyHash/seedListsHash/catalogHash/seedsHash全部与原metadata一致。复制已完成540 checkpoint到新 `resumed/`，**不改原canonical metadata/checkpoint**，以明确reviewRepair记录三项P2、新旧identity hash和createdAfterOriginal540。
- 给新metadata保护清单加入原C30文件，合法resume前后保护共782文件。Engine poison在整次resume期间会拒绝新游戏；最终调用数0。completedDataHash不变，`outcomes.json/market-paths.json`与原文件不仅数据hash相等，**完整文件字节也相同**。
- 新 `resumed/report.json/summary.md/metadata.json/verification.json` 是修复后的权威派生视图，不是重跑。原540由旧首跑完成，新formal/holdout运行0。

## 命令与结果

项目cwd `C:/files/code/BuyingHouse`，Node v24.14.1。原PowerShell Tee日志为UTF16，保留原文；本报告UTF8。

|命令|结果|证据|
|---|---|---|
|`$env:BLACK_SWAN_SIMULATION_EVIDENCE_DIR='docs/black-swan-evidence/phase-c-20261004/review-fixes-output/tests'; node tests/black-swan-simulation.cjs`|最终13/13，退出0；原10+新增3全部通过|`tests-three-p2.log`、`tests/unit-report.json`|
|`node .../review-fixes-output/migrate-and-resume.cjs`|退出0，540记录沿用、0 Engine调用、原C原文不变|`migration-resumption.log`、`migration-resumption-report.json`|
|`node --check simulation/black-swan.cjs` / `tests/black-swan-simulation.cjs`|退出0|语法检查|
|`git diff --check`|退出0|末检查|
|原752保护、原C30文件、53项B live/history SHA256|全部通过|`manifest.json`|

过程：最初两P2完成时12/12通过（`tests.log`）；随后主审新增确认正式内存P2-3，再补有界拒绝和负例，最终13/13。一次精确文本edit因不匹配被工具拒绝，未写入；更正后语法/回归通过。没有将失败或旧记录当最终通过。

虚拟FS覆盖：B/A/原C及子树、大小写、范围外、仅report非空目录（resume与非resume）、未知/坏/stale metadata、无metadata resume、symlink/reparse、realpath短别名指向B、hardlinked报告/metadata、seed列表不符、新目录/空目录，以及匹配身份resume预检。所有拒绝断言0mkdir/write/Engine，**未真实写入B/历史路径**。

有界拒绝覆盖：formal approved=yes/main1000、formal holdout1000、small31、resume1000、formal resume30；均0write/Engine。synthetic formal-main和formal-holdout摘要格式覆盖18000单集、1000/group、3000路径，不运行任何正式游戏。

## 诊断与未验项

原540结果不变：年均4.20；全部primary abs≥25% easy95.30%/standard94.63%/challenge92.62%；整体primary裁剪3/149、5/149、5/149；caps每难度1/2014而非0。heat主商品ac仍各2/7=28.57%复核预警：独立review指出seed16 w30与seed22 w31高前价撞原上界170000，不是机制bug；不修改经济。标准及挑战多数策略0/30、value集中度警告仍保留原 `../diagnostic-supplement.json/commands.md`。

**正式内存限制：**当前legacy whole-checkpoint `hash(completed)/JSON.stringify` 方案不适用于18000单集，Node24 MAX_STRING_LENGTH536870888，而保守shape估算18000字符串下界856008001。故formal已明确禁用，不声明正式入口可实际运行。后续必须独立批准/实现有界分片、增量聚合正式harness；本修复不擅自扩大范围。

未执行：540重跑、正式main18000/holdout18000/36000、浏览器/人工试玩、经济参数调整、分片正式harness实现。停止修改等待终验。
