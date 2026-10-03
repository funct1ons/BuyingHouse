# 正式界面与测试接口

## 设计与实现
温暖纸色、青绿经营主色与陶红涨幅，系统中文字体。固定高度三栏主场景：左侧人物/住房目标/容量，中部街区商品卡片，右侧城市新闻和持仓。区域内部滚动，页本身不滚动。原创城市、20商品和5住房SVG来自 `HomeYear.Art`，脚本位于UI之前；没有fetch或远程依赖。

`index.html`、`css/main.css`、`js/ui.js`、`js/audio.js` 是界面层。没有修改引擎、商品经济配置、存档校验或协议。全部交易通过Engine.dispatch，数量预览调用同一费用/容量/难度价格辅助函数。

- 开始页包含种子、三难度、新局、继续禁用原因、设置、帮助。
- 商品卡包含体积、价格涨幅、持仓、均价、浮盈和最近12周曲线；支持搜索、分类、持仓/关注过滤、四种排序、持久化关注。
- 详情同时提供商品策略指南和买卖模式，数量1/5/最大或全部、整数容错、费用/资金/容量预览，禁用原因；成功操作有音效及toast。
- 住房原创插画浏览、旧价全额抵扣、差额/现金缺口/进度；仓储累计投入与差价明确标注投入不可回收。
- 帮助、四步可跳过/重看的教程、显式Tab/ShiftTab焦点循环dialog（每次动态筛选可见enabled控件，无控件时聚焦dialog本体）、Esc关闭和焦点返回、自制toast/tooltip/confirm，不使用原生弹窗。
- 52周按钮要求确认，完整年度统计、资产曲线、逐商品收益、结局叙事、种子和重开。
- 设置包括音效、音乐、0–100%音量滑块与百分比（0静音）、动画、数字、自动存档；手动保存、JSON文件/文本导入导出、损坏原文导出、明确覆盖恢复、删除确认。导入先校验，成功只替换内存。
- WebAudio原创16音暖调短旋律与合成反馈；仅用户交互后创建/恢复AudioContext，关闭音乐停止循环，静音可暂停context，页面隐藏停止旋律。音乐及音效共同经过masterGain；调音不重建音乐定时器。音量独立保存在 `homeyear.audio.volume.v1`，严格接受有限number 0..1，损坏或读异常默认50%，存取异常不阻断游戏，不改变原settings或save协议。实际听感未经人工听验。

## 自动化稳定接口
只读 `window.HomeYear.UI.snapshot()` 返回当前引擎隔离快照，尚未新局返回null；`screen()`返回start/game；`settings()`返回设置副本（旧接口不变）；`audioVolume()`只读返回0..1音量，`HomeYear.Audio.status()`只读返回volume/gain/state/musicRunning；`openHelp()`与`openSettings()`仅打开界面。没有额外修改核心状态或经济随机流的调试入口。

主要data-testid：
- `seed`, `difficulty`, `new-game`, `continue`
- `cash`, `storage-status`, `market-list`, `search`, `product-<商品id>`
- `trade-qty`, `trade-submit`, `next-week`, `save`
- `houses`, `warehouses`, `house-<住房id>`, `warehouse-<仓储id>`
- `confirm-yes`, `tour-next`, `save-text`, `import`, `save-status`, `restart`, `audio-volume`

通用 `data-action`：close/help/settings/home/trade/favorite/category/trade-mode/quantity/submit-trade/buy-house/buy-warehouse/next/save/export/damaged/replace/delete/import/restart/tutorial/tour-finish。交易mode用data-mode=buy/sell，数量用data-qty=1/5/max，商品用data-id。设置控件data-setting=autoSave/sound/music/animation/numberFormat。system-browser已使用当前界面选择器，不再保留旧调试页面选择器。

## 已执行的自动化证据
- `node tests/run.cjs`：17组核心通过，含100种子完整52周不变式。
- `node tests/cdp-smoke.cjs --width 1366 --height 768`：Edge file://页面与核心浏览器测试通过，无页面运行异常和横向溢出。证据 `docs/browser-evidence-2026-10-03T11-41-42-818Z`。
- `node tests/ui-interaction.cjs`：74条断言通过（原20检查加54条音量/焦点回归）。Tab/ShiftTab各24步始终在dialog内；真实方向键调音、0 gain、百分比、localStorage及重载恢复、未交互不创建AudioContext、音乐启停均通过。DOM按钮新局/非法数量/买1/卖全部/周推进/搜索/设置/保存重载继续/周52确认及结算。1366×768、1600×900、1920×1080、2560×1440无页面溢出、推进按钮可见。
- `node tests/system-browser.cjs`：28检查通过，包括浏览器退出重启确定性继续、存储拒绝/导入/隔离、全周流程、住房仓储fixture、四分辨率和缩放等效布局、Esc焦点返回、无外部请求或运行异常。
- `node tests/acceptance-supplement.cjs`：5检查全部通过，原断言未修改；22次Tab全部在dialog内，音乐只启动一个循环且关闭停止，连点只提交一次。脚本正常覆盖 `docs/acceptance-evidence/supplement.json`。
- 截图与报告：`docs/ui-evidence/market-*.png`、`result.png`、`report.json`。已读取1366主界面和2560结算截图自查；截图不是人工试玩。

未验证：人工多局策略试玩、Chrome独立运行、真实扬声器听感/音频设备限制、屏幕阅读器全流程、长期性能、全部音频设备/存储异常组合。自动化证据不冒充人工体验或听感。
