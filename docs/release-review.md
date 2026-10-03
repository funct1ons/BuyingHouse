# 最终独立发布复核 — 2026-10-03

## 结论
本轮无新增已确认产品bug。历史焦点循环、缺音量控件两项已修复且独立复测通过；主要自动验收通过，不等于所有Gate无条件通过。未委托子代理，未修改产品/测试代码/README，未重跑30000局。

## 最终入口与证据
- 玩家入口：`index.html`；`css/main.css`、`js/*.js`、本地原创`assets/`。经典defer脚本，直接file运行，无服务器、npm安装或外部运行依赖。
- 引擎入口：`js/game.js`；经济模块`data/math/market/trading/statistics/validation`；持久化`js/save.js`。
- 正式UI：`js/ui.js`；音频：`js/audio.js`。文档入口`README.md`、`docs/design.md`、`docs/ui.md`、`docs/balance.md`及`docs/acceptance.md`。
- 本轮命令均exit0：`node tests/run.cjs`（17核心组）；`node tests/ui-interaction.cjs`（74 UI断言）；`node tests/system-browser.cjs`（28系统检查）；`node tests/acceptance-supplement.cjs`（5补充检查）；`node tests/cdp-smoke.cjs`（smoke无失败）。17是测试组，74含正反Tab各24条逐步断言，不是74独立场景；不同套件有重叠，不合并为虚假总数。
- 环境Node v24.14.1、Windows、Edge154.0.4258.53；本轮12:08–12:13 UTC。Edge证据`docs/acceptance-evidence/report.json`、`supplement.json`及截图；UI证据`docs/ui-evidence/report.json`及截图。两系统报告runtime/console errors均0，全部页面请求为本地file资源。
- 缓存Playwright Chromium153.0.8010.12另跑系统28、补充5，全部通过。路径与命令见`docs/acceptance.md`；证据`docs/acceptance-chromium-evidence/report.json`、`supplement.json`及截图。CDP标识Chrome不意味着独立Google Chrome。本轮补充脚本固定输出Edge目录，复制Chromium结果后已恢复Edge结果。
- smoke证据`docs/browser-evidence-2026-10-03T12-10-08-043Z/`；只作为观察，不冒充最终门禁。
- 只读Node脚本自动证据`docs/release-review-evidence.json`：读取primary/holdout的sourceHashes，对当前7份经济源逐项计算SHA256，全匹配；17核心另实际重跑通过。未再次模拟30000局。

## 代码与异常复核
- 显式Tab/ShiftTab循环筛除disabled、隐藏、inert及不可见控件，支持当前焦点不在候选列表时回到首/尾；UI在设置对话框各24步，补充在交易对话框22步均通过。系统Esc真实CDP输入返回原按钮通过；关闭时原控件已移除则有fallback。
- 音量范围0–100%，Audio内部0–1；零gain、箭头键调音、重载恢复且重载前无用户交互不创建AudioContext均通过。音量独立键`homeyear.audio.volume.v1`不影响原`homeyear.settings.v1`/存档格式。
- 只读VM桩检查NaN/Infinity/负数/>1/字符串/null/对象等输入拒绝且不抛异常；缺失/坏JSON/错误类型/越界偏好回默认0.5；localStorage读写拒绝不抛异常；旧设置无volume字段仍成功读取。
- 振荡器经自身包络gain接统一masterGain，再接destination。上下文/master只创建一次；music的timer guard阻止重复。桩中20次unlock仅一个master连接与一个interval，关闭音乐清理interval；两浏览器补充测试实际音乐开/关timer通过。桩不代表真实WebAudio设备和听感验证。
- README已描述17/74/28/5、音量独立键、显式焦点循环及未测边界，未发现影响发布的过时叙述；未修改。小提示：补充测试名称仍叫native dialog，但实际产品已显式trap；系统报告kind固定写Edge，Chromium真实身份应看browser字段。均为证据标签措辞，不是产品bug。

## 全部剩余风险/未验证边界
1. 人工多局自然策略、自然购房成功率体验、长期重玩与美术主观审评未做；自动现金fixture不是自然经济成功证明，模拟不是人工试玩。
2. 独立Google Chrome未复验；Safari/Firefox/移动设备及所有file存储政策未测；断网网卡环境未实测（只确认页面无外部请求）。
3. 真实扬声器听感、混音质量、设备/权限限制、全部浏览器AudioContext失败路径未测；拒绝音量持久化时只能保留当前会话音量，不承诺重启保留。
4. 长期CPU/内存/动画帧率、低配设备、后台24h未测；报告的推进roundtrip包含260ms测试节流，不能当引擎/render性能或长期性能通过。
5. 文件选择器实际选文件、跨浏览器JSON迁移与拒绝存储时导出下载文件未新增实测；保留JSON备份建议。
6. OS真实长按、屏幕阅读器、浏览器菜单缩放/WindowsDPI未测；125%/150%是等价有效视口，键盘repeat/input隔离使用DOM事件，Tab/Esc为CDP输入。
7. 没有逐商品逐价格穷举；焦点自动检查仅覆盖已报告对话框路径，不宣称完整辅助技术审计。结局/房屋内部滚动，截图不是整页全部内容。

最终交付应说明上述边界，不使用“所有Gate全通过”或合成测试总计。
