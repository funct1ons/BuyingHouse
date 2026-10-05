# 独立审核定向修复：v1 残留优先级与测试目标

状态：P2 实现与 P3 测试缺口已修复、定向及必要全回归通过，**等待 reviewer 再复核；没有获准执行540诊断**。不改重大事件参数、金额规则、随机调度、v3冻结、UI或模拟工具；未提交/推送/部署/派生agent。

## Withdraw / supersedes

上一交付 `../core-report.md` 和 `../manifest.json` **保留原文，不静默重写**。其单项通过事实仍是当时记录，但“合法旧档读取优先级完整”的证据不足，不能据旧报告批准540。本记录 supersedes 其中 v1 共存读取和 P3 实际字段/getter覆盖声明；新源码哈希以本目录 `manifest.json` 为准。

- 修复前完整 `js/save.js` 原文存于 [`save-before.js`](save-before.js)，SHA-256 与归档的 [`previous-manifest.json`](previous-manifest.json) 中旧 `js/save.js` 哈希一致。
- [`targeted/targeted-report.json`](targeted/targeted-report.json) 的 `withdrawnBefore` 使用该真实修复前源码复现两种误隔离：无v4、合法v3+v2+v1或合法v2+v1，返回 `ok:false/raw:null/quarantine:true`，旧原文未写。这是缺陷证据，不是假装旧实现通过。
- 原19个历史保护哈希、旧交付报告/manifest/截图和阶段A目录未被本次脚本覆盖；所有新输出只位于本目录。

## 精确修复范围

1. **生产代码仅 `js/save.js` 的 load() v1 检查。** 当无当前v4且已经严格识别合法v3或v2时，不再查询/否定其后的v1残留，返回 `ok:true/state:null`、相关旧档 `ok:true`、`quarantine:false`。仍要求明确确认迁移，不自动恢复旧状态。仅没有任何可识别合法v3/v2时才查询并拒绝不支持的v1。坏/未来v4隔离逻辑不变，绝不借旧档偷回退。
2. `tests/black-swan.cjs`：
   - 原 `result.netAssets++` / `stats.peakNet` 不是真实字段，不应算结算/峰值边界覆盖。现在改 `result.assets++`、`stats.peak=Number.MAX_SAFE_INTEGER`，先确认真实字段/安全整数，核对修改前后对象键完全相同；冻结v3和git原规则分别命中**“结算与状态不一致”**、**“资产峰值不可达”**，证明不是未知键拒绝。
   - 另保留 `result.netAssets`、`stats.peakNet` 明确未知键负例，以及既有顶层exact键等负例。
   - 原传函数给 `SaveAdapter(storage)` 只是错误对象，不是真实 localStorage getter。现在在独立VM内部对 `window.localStorage` 安装会抛错的属性getter，不传storage；断言抛错消息被结构化返回且getter确实调用。`unit-report.json` 记录 **9次实际getter调用**，未改生产接口。
   - 增加 `BLACK_SWAN_EVIDENCE_DIR` 输出重定向以保留原交付证据。
3. 新 `tests/review-save-v1.cjs`：9 Node checks +27 真实Edge file:// checks，记录修复前错误及修复后行为。覆盖v3+v2+v1、v2+v1、坏v3+合法v2+v1的显式v2入口；仅一次确认、取消零写入、迁移成功v4、v1/v2/v3原文全不变；未知/坏旧格式与v1仍拒绝、坏/未来v4不回退、实际getItem读取异常与真正localStorage属性getter异常仍结构化拒绝。支持合法旧格式时不应读取无关且可能抛错的v1键。

生产和旧测试文件相对上一交付仅上述 `js/save.js`、`tests/black-swan.cjs` 两个哈希改变；新加定向测试。其余31个上一manifest文件逐字节不变。冻结v3、经济参数、旧规范/报告仍未修改。

## 实跑与新证据

Node `v24.14.1`、Edge `154.0.4258.53`，真实 `file:///C:/files/code/BuyingHouse/index.html`。下表最后完成的命令均退出0。浏览器按各脚本名独立设置 `UI_EVIDENCE_DIR=<本目录>/<脚本名>`；黑天鹅单元另设置 `BLACK_SWAN_EVIDENCE_DIR=<本目录>`。stdout/stderr是本目录同名 `.log`。

| 命令 | 结果 | 新证据 |
|---|---|---|
| `node tests/review-save-v1.cjs` | 9 Node +27 browser，0异常/外链 | `targeted/targeted-report.json`、三张迁移截图 |
| `node tests/black-swan.cjs` | 15/15，含780冻结经济差分 | `unit-report.json`、七合法夹具、`black-swan.log` |
| `node tests/run.cjs` | 21/21，100种子52周不变式 | `run.log` |
| `node tests/review-b2.cjs` | 12组通过 | `review-b2.log` |
| `node tests/review-fixes.cjs` | 7组通过 | `review-fixes.log` |
| `node tests/milestone-b.cjs` | 5组通过 | `milestone-b.log` |
| `node tests/black-swan-browser.cjs` | 89/89、0异常 | `black-swan-browser/browser-report.json` |
| `node tests/ui-gameplay-improvements.cjs` | 605/605，含465原0.4冻结对git比较 | `ui-gameplay-improvements/report.json` |
| `node tests/milestone-b-edge.cjs` | failures=[] | `milestone-b-edge/edge-report.json` |
| `node tests/milestone-b-edge-migrate.cjs` | failures=[] | `milestone-b-edge-migrate/migration-report.json` |
| `node tests/milestone-b-edge-review.cjs` | failures=[]，结果20品 | `milestone-b-edge-review/review-report.json` |
| `node tests/ui-interaction.cjs` | 77检查通过 | `ui-interaction/report.json` |
| `node tests/system-browser.cjs` | 28/28、0异常 | `system-browser/report.json` |
| `git diff --check` | 通过 | 工作树末检查 |

初次P3 getter测试在VM外定义属性未产生预期错误（仍不能算真实覆盖），已改在VM内部安装会抛错getter并复跑15/15；本次最终报告如实记录调用数，不把假getter作为通过证据。既有金额/费用/行情/冷却/持续中枢/界面代码未改，不重跑经济模拟或重做音频。

## 风险与下一步

P2/P3本次目标无已知未解决错误，待主审独立复核。仍沿原交付边界：任意恶意/崩溃存储环境不能保证多键物理事务，人工试玩/Chrome独立流程/真实听验及新540/36000平衡尚未完成。修复不能替代540审批，完成后停止改文件/启动Edge，等待复核结果。
