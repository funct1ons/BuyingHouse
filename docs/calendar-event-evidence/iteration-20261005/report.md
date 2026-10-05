# 0.6 随机日历与黑天鹅来源弹窗：实施及验证

基线：`main f0fc8dcc39aad55f28f562db9ab36e049cf067e7`。本轮实施在未提交工作树，未commit/push/deploy、未派生agent、未运行正式模拟。现行规则：[gameplay-rules-0.6.md](../../gameplay-rules-0.6.md)，存档：[save-v5.md](../../save-v5.md)。

## 实现

- 独立seed派生日历起点，经营仍1…52周。当前季节、价格余弦、夏季候选与日志校验、画面共用日历；公开visible只增加必要日历，不泄露RNG/未来事件。
- 规则0.6/save5、新键`homeyear.save.v5`，严格验证起点与种子。旧档只提示内测不兼容，不迁移、不展示迁移入口，不删除旧键原文；损坏当前档仍隔离、明确覆盖，保存失败不回滚经济。
- 纸本横条取代圆环/小牌；playing已完成week-1、ended52/52；本季剩余含本周与下一季，末3/2/1周持续提醒+推进toast，第52周仍可交易且确认结束。
- 成功next中仅本周fresh swan headline匹配日志自动打开原dialog。完整商品实际涨跌、渠道持仓、持续影响说明；事实/原创映射分区，七来源离线内置、安全外链。Esc/Tab/ShiftTab、native长按/双击和body Space跨modal手势验证；关闭事件/随后的商品窗回逻辑next，不嵌套modal、不成交或推进。
- 旧事件概率/幅度/冷却/窗口/上下界/费率/住房仓储/策略不变。历史v2/v3冻结、simulation/c1、black-swan runners/policy及旧A/B/C证据未改。

## 最终结果

| 命令 | 独立输出 | 结果 |
|---|---|---|
| `node tests/run.cjs` | `suite-final-command.txt` | 21组通过、0失败 |
| `node tests/calendar-event.cjs` | `core/core-report.json` | 8组通过、0失败（包括全部52起点×52周边界） |
| `node tests/calendar-event-browser.cjs` | `browser-final/report.json` | 326检查通过、0失败；无页面异常/外部请求 |
| `node tests/warehouse-current.cjs` | `warehouse-final/report.json` | 140检查通过、0失败；无页面异常/外部请求 |
| `node tests/ui-interaction.cjs` | `ui-interaction-final/report.json` | 77检查通过；完整52周、音频/键盘/存档断言保留 |
| `node tests/cdp-smoke.cjs --width 1366 --height 768` | `smoke-final/report.json` | 页面/core smoke通过（不是最终体验验收） |
| `git diff --check` | 命令日志下述 | 最终无错误 |

浏览器为报告中记录的本机Edge，file://离线加载。进度条/长金额/metrics/操作按钮在1366×768、1280×720、1536×864、1600×900、1920×1080、2560×1440和1100/1000/700降级均无横向溢出或相互覆盖，next中心偏差0px。六桌面新局1366首屏完整四卡目标仍通过。来源弹窗另在六桌面+700检验单层dialog几何/正文横向无溢出。

`warehouse-current.cjs`从旧通用UI套件定向提取当前适用部分，用实际买入/轮换取得12当前商品持仓，不实现旧迁移。覆盖卖1/5/全部、剩4件卖5禁用的精确focus、自定义invalid/费用/成本整状态、确认回input、详情卖1关闭回原入口、清仓相邻/末卡标题、筛选不隐藏仓库及滚动保留、off-sale净额、native双击/长按一次、SecurityError/QuotaExceededError与保存重试不二次成交、autosaveoff、周52出售/取消结算/ended。未知字段/费用账本/交易安全断言未静默跳过。

## 完整执行记录与失败修复

所有重跑使用不同子目录，未覆盖历史或本轮失败截图。PowerShell 5.1执行环境，日志为对应`*-command.txt`。

1. 初次 `node --check js/ui.js; node tests/run.cjs`：语法通过，核心20/21。唯一失败为旧v1存在时要求隔离并阻止新档的旧断言，和本轮“不兼容旧档但允许v5新局”合同冲突。定向改为notice+允许v5，旧键仍保留；其余交易/费用/未知字段断言保留。最终21/21。
2. 核心：`$env:CALENDAR_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/core'; node tests/calendar-event.cjs`，8/8；完整`core-command.txt`。
3. 浏览器初次：上述核心env + `$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/browser-attempt1'; node tests/calendar-event-browser.cjs`，304通过/2失败。仅1000/700下页面滚动条把按钮中心偏移7.5px；`scrollbar-gutter: stable both-edges`修正为0。不改变经济。`browser-attempt1-command.txt`及原report/截图保留。
4. 第二次browser输出`browser-attempt2`，317/317。增加body Space跨modal、关闭商品精确回next，并将手动重开事件的焦点也统一到next。
5. 截图自查发现来源弹窗外层与正文双滚动条；局部改为major-event flex容器，只正文滚动，不影响其他dialog。新增初开顶部截图、来源阅读截图及7视口modal几何回归。最终`browser-final`326/326，完整`browser-final-command.txt`。
6. 当前仓库首次`$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/warehouse-attempt1'; node tests/warehouse-current.cjs`，140/140。最终同命令输出改为`warehouse-final`，140/140。
7. 通用UI首次及attempt2/3均在“zero volume mutes master gain”失败（保留相应日志）。测试此前多为非可信DOM `.click()`，音频context/graph异步ready，固定100ms并不可靠。**未修改生产音频**；测试保留实际gain===0严格断言，加入真实CDP滑块点击、focus emulation、等待真实running和gain applied，并在失败时附状态诊断。attempt4原断言77条全过；最终`ui-interaction-final`77通过。无删断言或把未启动音频冒充静音通过。
8. Smoke初次输出`smoke`通过，最终输出`smoke-final`通过。首次`git diff --check`报告新增CSS混合CRLF为trailing whitespace；仅规范换行后最终通过。

最终执行命令（每支浏览器脚本输出env独立）：

```powershell
$env:CALENDAR_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/core'
node tests/calendar-event.cjs
node tests/run.cjs
$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/browser-final'
node tests/calendar-event-browser.cjs
$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/warehouse-final'
node tests/warehouse-current.cjs
$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/ui-interaction-final'
node tests/ui-interaction.cjs
$env:UI_EVIDENCE_DIR='docs/calendar-event-evidence/iteration-20261005/smoke-final'
node tests/cdp-smoke.cjs --width 1366 --height 768
git diff --check
```

未执行任何历史black-swan测试或模拟runner（无默认路径覆盖）；因此不宣称旧全套全绿。旧`ui-gameplay-improvements.cjs`、旧迁移专项是0.5历史，取消兼容使其不再适用，已向主审核明确报告。当前适用交互回归由新current套件替代。

## 截图与未验证范围

全截图SHA256/生产与测试文件摘要见`screenshot-manifest.json`/`verification-manifest.json`；browser-final另有shot清单。已读取检查关税事件初开与来源分区、700事件单列、1280长金额末周横条及700降级截图；不是人工试玩。

独立in-memory边界fixture不是540局或正式经济样本。旧0.5日历固定冬季的540诊断不是当前0.6经济证据；历史0.4主/留出亦不证明本版平衡。不运行/升级它们，不调整未批准参数。

未验证：人工多局经营体验、真实扬声器听感、Chrome独立浏览器、屏幕阅读器完整流程、长期性能/全部存储设备组合、正式经济平衡。来源正文采用主审核本轮已经取回并核实的机构原型，不在离线运行或测试中fetch远端。
