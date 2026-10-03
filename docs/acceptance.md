# 独立最终验收（2026-10-03）

## 结论与边界
**主要自动交互通过，但不宣称全部门禁无条件通过。** ui-fix修复后，本轮最终独立复核实际执行：核心17组通过、UI74条断言通过、Edge系统28检查与补充5检查通过；缓存Chromium系统28检查与补充5检查也通过，CDP smoke无失败。这些是不同层级且覆盖可能重叠的组/断言，不能相加成一个“总测试数”。历史补充4通过/1失败已修复，不是当前状态。不是人工试玩，不是自然经济购房胜率证明。本轮未修改任何产品、测试代码或README，也未委托代理。

前轮QA记录：完整阅读 `prompt.txt`（2030行）、`docs/design.md`、`docs/ui.md`、`README.md`。本轮独立阅读UI/audio代码、实际测试入口及README，并重新执行下列命令。测试读取UI的只读snapshot，实际交易、周推进、买房、仓储和保存均点击正式DOM；没有dispatch/restore绕过UI。现金fixture增加grants并调用record仅准备自洽JSON，经设置页公开导入，**非自然经济**。

## 实际环境与命令
Windows，Node **v24.14.1**，Edge **154.0.4258.53**，CDP1.3；缓存Playwright Chromium **153.0.8010.12**（不是独立Google Chrome，虽CDP名称为Chrome）。headless真实浏览器，`file:///C:/files/code/BuyingHouse/index.html`，无HTTP服务，无npm安装。

```powershell
node tests/run.cjs
node tests/ui-interaction.cjs
node tests/system-browser.cjs
node tests/acceptance-supplement.cjs
node tests/cdp-smoke.cjs
# Chromium补验；不要把这个缓存浏览器叫Google Chrome
$env:EDGE_PATH="$env:LOCALAPPDATA\ms-playwright\chromium-1243\chrome-win64\chrome.exe"
$env:ACCEPTANCE_DIR='acceptance-chromium-evidence'
node tests/system-browser.cjs
node tests/acceptance-supplement.cjs
# 补充脚本固定写入Edge目录：将Chromium supplement.json复制到Chromium目录后恢复Edge副本
Remove-Item Env:EDGE_PATH
Remove-Item Env:ACCEPTANCE_DIR
```

本轮执行时间为2026-10-03 12:08–12:13 UTC；上述7次命令均成功（exit0）。Chromium补充证据已独立保存在其目录，Edge副本已恢复。

主脚本入口迁移到 `tests/acceptance-final.cjs`，复用未改动 `tests/cdp-helper.cjs`。默认helper cleanup会删除profile；因此存档关机测试先Browser.close、关闭CDP、等待，再启动**同一个专属profile路径**，期间不调用cleanup，最后统一删除。不是仅刷新页面。第20周来自真实19次推进；为了对比后续随机轨迹，先实际推进3周记录基线，再通过公开JSON导入20周快照并手动保存、关机重开继续；20周完整快照及后续3周完整快照逐字一致。

## Gate逐项
|Gate|已验证|未验证/限制|
|---|---|---|
|A 运行|干净专属profile直接file启动；Edge和缓存Chromium；全部页面请求file本地；runtime/console errors均0|独立Google Chrome、真实无网络网卡环境未测（检查的是页面资源请求）|
|B 一局|真实UI1→52→确认结束，两条路径：少量交易后未买房自然资金路径、公开资金fixture购房路径；结局截图；结束再次点按钮只看结算不产生53周|人工多局自然策略购房/长期重玩体验未测|
|C 交易|买1/5/最大，卖1/5/全部；含费现金与成本精确；跨周不同价格累计成本；满仓不能再买；0现金、空仓禁用；快速三次提交仅一笔|未逐商品逐价格穷举；核心精确部分卖出分摊等另由17组覆盖|
|D 存档|20周全浏览器关闭、同profile重开继续、后续3周随机轨迹一致；坏JSON/缺字段/未知版本拒绝且内存和原档不变；自动存档关不覆盖、手动保存有效；注入setItem拒绝仍推进且提示未保存；损坏原档普通保存保留、明确确认后覆盖|文件选择器实际选文件/跨浏览器迁移、拒绝存储时导出下载文件未新增实测|
|E 边界|零现金、空仓、满仓、大现金fixture；五房渲染逐档购买/抵扣，四仓渲染逐档升级至120；已购房仍经营；52周继续买卖及最高档购房；重复结算不变；seed同初始市场；repeat键不推进，搜索输入隔离|未做所有异常浏览器存储政策、OS真实长按；键盘repeat/input检查为DOM KeyboardEvent，Tab/Esc使用CDP真实输入|
|F UI|1366×768、1600×900、1920×1080、2560×1440，以及1536×864/1280×720等价125%/150%有效视口；页面无横纵溢出、next可见；dialog Esc返回原按钮；交易dialog22次Tab轨迹、设置dialog正反Tab各24步均圈定|历史Tab缺陷已修复；等价视口不是浏览器菜单缩放/WindowsDPI测试；屏幕阅读器未测|
|G 视觉|真实截图开始页、市场六视口、交易、房屋、设置、两结局；读取1366市场、交易、购房结局截图自查：统一暖色插画/商品图标/卡片，非debug后台|不是人工美术评审；结局/房屋内容需内部滚动，截图非整页完整内容|
|H 性能|有限冷导航与5次推进roundtrip采样，报告原始ms；本轮Edge冷导航89ms、Chromium78ms；动作耗时包含260ms测试节流等待，不能当纯引擎/render耗时|长期CPU/内存/动画帧率/低配设备/后台24h**未测**，不判为长期性能通过|

## 历史独立发现（已由ui-fix修复，本轮复验通过）
1. **中低：严格dialog焦点循环不满足文档承诺。** Edge交易dialog，实际CDP连续Tab，第8和18步activeElement为BODY，下一步DIALOG后回到控件；没有证据背景业务控件可操作，但“焦点始终圈在dialog”断言不成立。最小复现：新局→跳引导→大米详情→Tab遍历至确认买入后再Tab。前轮focusTrace曾记录该失败，已即时报告主对话。ui-fix增加显式Tab/ShiftTab trap；当前 `acceptance-evidence/supplement.json` 为本轮22步全部圈定的新证据，UI报告另有正反各24步通过，Esc返回通过。
2. **低：音量设置遗漏。** 需求§25明确要求音量，正式设置仅音乐/音效开关，无volume控件。历史音频固定gain，已即时报告。ui-fix增加0–100%滑块、统一masterGain和独立偏好键；本轮0静音、键盘调音、重载持久化通过。未自行修产品。

声音补验通过：实际点击音乐开启存在一个interval，关闭清除interval，音效关闭保存为false；音量控制与master gain已自动验证；**真实听感、扬声器和设备限制未测**。

## 证据
- Edge最后主跑：`acceptance-evidence/report.json`（28通过）、`console.txt`；最后补跑：`supplement.json`（5通过，runtime errors0），`supplement-edge.json`为同一Edge副本。
- Chromium：`acceptance-chromium-evidence/report.json`（28通过）及同目录截图和 `supplement.json`（5通过）；旧 `acceptance-chromium-console.txt` 为前轮输出，不代表本轮计时。
- 两目录图片：`start.png`，`market-1366.png` / `1600` / `1920` / `2560` / `125-equivalent` / `150-equivalent`，`trade.png`，`houses.png`，`settings.png`，`result-no-house.png`，`result-owned.png`。
- 主测的早期dialog截图使用默认headless800×600视口，市场多分辨率截图使用标明尺寸；截图是自动化证据，非人工试玩。
- 核心最终实际 `node tests/run.cjs`：17 passed,0 failed。无硬编码核心组数断言。

- UI独立重跑：`ui-evidence/report.json`，实际读取长度74；含48条正反Tab逐步断言，不能把它称为74个独立场景。
- smoke本轮：`browser-evidence-2026-10-03T12-10-08-043Z/`，无失败，仅smoke观察，不是最终Gate。
- 只读Node复核生成 `release-review-evidence.json`：primary/holdout中7份经济源SHA256逐项匹配；异常音量值/损坏偏好/拒绝存储容错、旧设置兼容、20次unlock仍仅一个master连接和音乐interval。AudioContext使用桩，仅验证控制逻辑，不证明听感；未重跑30000局。

前轮QA曾新增验收测试；本轮最终复核仅更新此文档、新增 `release-review.md` 与自动证据，未改任何产品或测试代码。完整剩余风险见 `release-review.md`。
