# 阶段 B 核心实施 / 自动化证据（2026-10-04）

**状态：实现与本轮自动化完成，交主审独立复核；不是整份方案完成或平衡批准。** 基线 HEAD `a53834511d58c127957da8873a1df18a7abf02a5`。Node `v24.14.1`、Edge `154.0.4258.53`、真实 `file:///C:/files/code/BuyingHouse/index.html`。未提交、推送、部署、启动其他 agent，未执行 `simulation/c1.cjs`、540 局或 36000 局模拟，未重写历史正式报告或阶段 A 证据。

## 变更记录与文件

- `js/data.js`：规则 `0.5/save4`、固定七事件、16%/4–50周/间隔6/年度6的冻结调度参数与升级确认文字。12 商品/8 退出商品、普通22/个人8事件、金额/费用/价格簿/上下界/体积/难度/房价/仓储标价不改。
- 新 `js/v3-baseline.js`：a538345 原 `data/math/v2-baseline/market/trading/statistics/validation/game` 的完整独立闭包，支持冻结0.4校验/创建/引擎/原v2转换，不调用实时0.5辅助函数。
- `js/game.js`：新局精确 `upgrade=null/swanLog=[]`；v3转换只改两个版本字段及这两个新增字段，其余深等；v2在冻结上下文转换后直接到4，不写中间3；提交后隔离副本的过去 `diagnostics().eventLog`，不进visible或存档。
- `js/market.js`：重大/普通分层、候选主商品上架/季节/普通短期冲突过滤、重大persist所有效果商品防普通重叠。事件选择不读现金/持仓/利润/价格。首冲/持续中枢/护栏/噪声/回归/上下界公式不改。
- `js/validation.js`：精确新增字段与升级链、log周窗口/间隔/唯一/夏季/上限、重大log-active-news双向关系与actual changeBps；普通旧消息保留原合法规则，不额外强制其关联。未知新id新闻本来就被冻结v3拒绝，**没有**升级周豁免。
- `js/save.js`：当前键4、旧3/2严格解析、统一原文内容id备份和碰撞处理、旧键保护、当前写入/readback失败尽力恢复。坏/未来v4隔离；确认本地迁移写4，旧导入只换内存。合法当前v4不因单个旧键读取异常降级。
- `index.html`：classic defer加载冻结v3，继续无远程资源/模块HTTP依赖。
- `js/ui.js` / `css/scenes.css`：非阻塞重大标签和一次性短强调，各受影响商品的实际涨跌/渠道/持仓/查看；持续快报仍分组。只在成功next显示一次；继续/迁移/导入不重播；设置和系统减动效/隐藏页面抑制；无新循环音轨/音效。v3/v2显式入口、未来路径警告与多原文备份导出。阶段 A 快卖/焦点/滚动/重复按键修复保留。
- 新 `tests/black-swan.cjs`、`tests/black-swan-browser.cjs`；原核心/迁移/浏览器加载器加冻结v3，当前活跃键测试定向改4，不删旧保护断言。`tests/suite.js`目录数改37并核对冻结v3仍30。
- `tests/ui-gameplay-improvements.cjs`保留历史465项全状态比较，但比较对象改为**冻结v3 vs git a538345**；正式UI操作仍跟当前0.5 Engine全状态比较，不拿不同经济规则相等当验收。
- `tests/milestone-d-edge.cjs`原0.4固定seed失配，换为真实0.5路径，仍精确测试2500/2499和无fresh头条；没有降低阈值。`surge-v5-fixtures.json`记录公开seed/周/id；仅查找阈值测试夹具，无策略/买房率/频率结论。
- `tests/acceptance-supplement.cjs`钉住初周rice上架的公开 `KEY-D1` 种子，避免时钟种子随机缺货导致空selector；原一次成交/22步Tab/音频断言不变。
- `tests/cdp-smoke.cjs`加入 `UI_EVIDENCE_DIR` 支持，避免输出散落历史路径。
- 当前文档：`README.md`、`docs/ui.md`，新增 `docs/gameplay-rules-0.5.md`、`docs/save-v4.md`。不改0.4冻结/模拟历史解读。

## 实跑命令与结果

浏览器/视听每条在独立子目录设置 `$env:UI_EVIDENCE_DIR = 'docs/black-swan-evidence/phase-b-20261004/<脚本名>'`，然后执行下表命令；stdout/stderr另存同名 `.log`。**最后完成的单项命令全部退出0**。

| 命令 | 最后结果 | 主要证据 |
|---|---|---|
| `node tests/black-swan.cjs` | 15组/0失败 | `unit-report.json`、`black-swan.log`、七个 `swan_*-fixture.json` |
| `node tests/black-swan-browser.cjs` | 89/89 | `black-swan-browser/browser-report.json`、多视口及迁移PNG |
| `node tests/run.cjs` | 21/21（含100种子52周不变式） | `run.log` |
| `node tests/review-b2.cjs` | 12组通过 | `review-b2.log` |
| `node tests/review-fixes.cjs` | 7组通过 | `review-fixes.log` |
| `node tests/milestone-b.cjs` | 5组通过 | `milestone-b.log` |
| `node tests/ui-gameplay-improvements.cjs` | 605/605（含历史465比较） | `ui-gameplay-improvements/report.json` |
| `node tests/milestone-b-edge.cjs` | failures=[]、0异常/外链 | `milestone-b-edge/edge-report.json` |
| `node tests/milestone-b-edge-migrate.cjs` | failures=[]、0异常 | `milestone-b-edge-migrate/migration-report.json` |
| `node tests/milestone-b-edge-review.cjs` | failures=[]、0异常，20品结果账本 | `milestone-b-edge-review/review-report.json`、四PNG |
| `node tests/ui-interaction.cjs` | 77检查通过 | `ui-interaction/report.json` |
| `node tests/milestone-d-edge.cjs` | failures=[]，2500/2499精确边界 | `milestone-d-edge/keys-surge.json` |
| `node tests/system-browser.cjs` | 28/28、0异常 | `system-browser/report.json` |
| `node tests/cdp-smoke.cjs` | 两file://页/core通过，无失败 | `cdp-smoke/report.json` |
| `node tests/av-visual.cjs` | 93/93，默认60秒idle | `av-visual/report.json` |
| `node tests/av-integration.cjs` | 24/24，默认60秒idle | `av-integration/integration-report.json` |
| `node tests/av-audio-director.cjs` | 17/17 | `av-audio-director.log` |
| `node tests/av-audio.cjs` | 96/96，数字测量非人工试听 | `av-audio.log` / 音频JSON |
| `node tests/acceptance-supplement.cjs` | 5/5、0异常 | `acceptance-supplement/supplement.json` |
| `git diff --check` | 通过 | 最终工作树检查 |

过程记录：最早目录计数未适配、几处新测试API/fixture假设、0.4 D固定seed与当前规则失配均已更正并复跑通过。额外AV批次因累计420秒命令超时中断，不能算通过；随后独立 `node tests/av-audio.cjs` 以300秒预算完成96/96退出0。补充测试最初时钟seed缺rice失败，固定公开seed后5/5。smoke首跑误用了默认新时间戳目录，**仅该本轮新目录**移至 `cdp-smoke-first-run/`，随后支持env并在 `cdp-smoke/`复跑；历史目录不动。早期 `browser/` 是本轮预跑，权威最后报告在 `black-swan-browser/`。

## 重点机制/迁移证据

单元测试包含780次冻结v3对git原经济完整状态/返回值比较（5公开seed、交易/周推进/结算）；覆盖persist/structural/personal/ended，原生和已有v2迁移v3正例，以及exact键/账本/费用/20品利润/随机流越界/priceBook/history/listing/result/迁移峰值负例。

v3转换前后除版本/swanLog/upgrade外逐字段深等，含四RNG、普通active/news、migration/result；已结算v3禁交易/next而保留原幂等end。v2直接转换等于冻结原转换，原文和原3键不改。备份同文复用/异文碰撞/999耗尽/写拒绝/回读异常，当前写拒绝/回读异常/写后备份校验失败、取消/二次取消、未来v4隔离、只读设置导出、内存导入均有回归。

调度强制RNG用例覆盖1–3/51–52禁新事件、4/50边界、50开始事件到52仍生效、t+1…5禁/t+6恢复、6次上限、重复id、heat27–39、只次级上架无候选、短期主商品冲突与保留结构中枢、persist所有受影响商品防普通重叠、到期恢复、无候选不耗重大门槛、成功不耗普通门槛但个人照抽、不读取财富/持仓/利润/报价。真实提交路径得到七事件夹具，新闻实际百分比/多商品反向/原子失败/RNG日志提交/保存失败不能重抽均通过。重大log/active/news各方向缺失、错周/错until/假kind/错fresh/配置百分点冒充实际/效果外商品/重复新闻均拒绝。

浏览器重大场景包括1366/1600/1920/2560、125%/150%等效（含1093降级布局）无横向溢出/主按钮可见且按实际clientWidth居中。已读取 `black-swan-browser/major-mixed-directions-1366.png` 和 `v3-upgrade-preserved-current-week.png` 自查：标签、手机正向/名表与藏品负向、各渠道、原普通事件/结算入口、左仓/来信/居中按钮均可读。截图不是人工试玩。

## 不变式与历史保护哈希

[`manifest.json`](manifest.json)列出完整源码/测试SHA-256以及受保护历史逐字节对比。原v2夹具仍 `210805df7e971053efe47544beb3eb6c85b13d1aa80444e56ad5ec590b5f7c7c`。`simulation/c1.cjs`、原v2基线、原math/trading/statistics、0.4规则冻结与现有gameplay-v4报告/JSON均与a538345字节相同。

加载后的目录JSON哈希在当前0.5与原0.4深等：

- products `df89f4c4e6a28aed4c3b9bff4aa69fc41c2aef0e9c4201ac657f9fe05b434fb4`
- legacyProducts `be14e8d2db700ac90d9c07de0cca35a9e76f85372378150791b421eb701f5152`
- houses `9d8d7d7376ac15aacc30445ce2ecba1e245c53bc58f893d704941c4ca3df57e1`
- warehouses `26660c4c0bb8b6770b3a2d4b8cf4e3e7074d95cb716828e7114cc1ba55b582e8`
- difficulties `01c621235874d9fd820df8fec86b373389cdd02aa86f62bbce4113a50d63dd7e`

## 未解决边界 / 下一阶段

- 待独立review和主审批准。未做540/36000新经济模拟，不能引用旧0.4结果证明0.5平衡；未做自然多策略趣味性/胜率结论或人工试玩。
- 未独立Chrome/屏幕阅读器全流程或真实扬声器听验；音频为已有协议回归与数字测量。
- 存储异常返回失败且尽力还原当前档，但任意恶意存储实现、还原操作也拒绝或浏览器突然崩溃无法承诺多键物理事务；可导原文/备份，绝不将这种情况表述为成功迁移。
- 当前快照只能严格关联仍生效重大事件与当前新闻，无法凭没有完整事件历史的状态证明任意远古日志都未被删。diagnostics只记录本引擎恢复后已提交next，不补造历史。
- 新v3完整冻结代码体积约76KiB，为独立历史语义的有意重复；以后不可把它重定向实时目录/辅助函数。
