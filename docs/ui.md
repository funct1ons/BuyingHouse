# 正式界面与测试接口

## 设计与实现
温暖纸色、青绿经营主色与陶红涨幅，系统中文字体。固定高度三栏主场景：左侧紧凑住房目标与统一仓库，中部紧凑生活来信和市场商品卡片，右侧街区快报与“仍在影响”。仓库/市场/快报分别内部滚动，桌面页本身不滚动；1100px以下降级布局允许纵向页面滚动。底栏三段式Grid让下一周按钮真正水平居中。原创城市、20商品和5住房SVG来自 `HomeYear.Art`，脚本位于UI之前；没有fetch或远程依赖。

`index.html`、`css/main.css`、`js/ui.js`、`js/audio.js` 是界面层。阶段 A 未修改引擎、商品经济配置、存档校验或协议；阶段 B 当前协议为规则 0.5 / save 4，见 [现行规则](gameplay-rules-0.5.md) 与 [存档保护](save-v4.md)。全部交易通过Engine.dispatch，数量预览调用同一费用/容量/难度价格辅助函数。

- 开始页包含种子、三难度、新局、继续禁用原因、设置、帮助。
- 商品卡包含体积、价格涨幅、持仓、均价、浮盈和最近12周曲线；支持分类、持仓/关注过滤、五种排序和持久化关注；搜索输入、状态和监听已删除。
- 左侧仓库展示全部保留/退出持仓、渠道、容量、成本、单价和卖全部净额。卖1/5/全部直接通过同一 `act()` 提交；自定义数量内联校验/确认。报价用 `channelUnit/channelGross/channelNet/fee/costOf/liquidValue`，部分成本采用与引擎一致的BigInt分摊。成功更新逻辑焦点与仓库滚动；清仓落到相邻卡或仓库标题，不落到下一周。草稿仅活在UI内存，换局/导入/周推进清理；保存失败是已成交未保存，只需重试保存。
- 右侧保留引擎最多三条主摘要，额外展示原 `ongoing` 分组，不新增新闻或预测。到货/缺货行不附百分比；其他快报百分比紧邻商品名并用实际 `changeBps`。中央来信只保留个人事件，不把应扣金额误称实付。
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
- `cash`, `storage-status`, `market-list`, `product-<商品id>`（不再提供 `search`）
- `trade-qty`, `trade-submit`, `next-week`, `save`
- `warehouse`, `warehouse-list`, `personal-letter`, `bulletin`
- `houses`, `warehouses`, `house-<住房id>`, `warehouse-<仓储id>`
- `confirm-yes`, `tour-next`, `save-text`, `import`, `save-status`, `restart`, `audio-volume`

通用 `data-action`：close/help/settings/home/trade/favorite/category/trade-mode/quantity/submit-trade/buy-house/buy-warehouse/next/save/export/damaged/replace/delete/import/restart/tutorial/tour-finish，以及 quick-sell/custom-sell/custom-submit/reset-filter。仓库快捷数量为 data-qty=1/5/all，持仓卡为 data-holding，内联输入为 data-sale-input。交易mode用data-mode=buy/sell，数量用data-qty=1/5/max，商品用data-id。设置控件data-setting=autoSave/sound/music/animation/numberFormat。system-browser已使用当前界面选择器，不再保留旧调试页面选择器。

## 阶段A新证据（2026-10-04）

当前实施与结果见 [`ui-improvement-evidence/phase-a-20261004/report.md`](ui-improvement-evidence/phase-a-20261004/report.md)。六种桌面视口含125%/150%等效，1366新局四张完整卡片，主按钮中心偏差0px。新脚本覆盖直接出售、回收、旧持仓、自定义边界、原生重复按键/双击、焦点滚动、保存失败、信息分组和 `a538345` 全经济状态比较。自动化和截图不是人工试玩。

## 阶段 B 核心（2026-10-04，待独立复核）

重大快报用非阻塞“重大事件”标签，同一条内对所有受影响商品分别展示实际本周涨跌、渠道/持仓/净额及查看入口；持续分组保留“仍在影响”。只在成功 next 后的一次渲染附短暂强调，不开弹窗、不循环音乐、不新增音效。导入/继续/迁移不重播；动画设置、系统减动效和隐藏页面停用强调。静音保留原用户偏好。

开始页明确区分 v3 升级和 v2 迁入（同时有旧档时可显式选择 v2），不自动回退坏 v4。升级确认明确未来不沿旧规则，取消不写；结果局保留结算。设置提供当前/坏档/旧原文、v2 原键、升级备份与迁移链原 v2 备份导出；原设置/关注/音量不重置。仓库逻辑焦点与独立滚动等阶段 A 修复继续保留。

稳定接口新增只读核心 `diagnostics().eventLog`（仅已提交的过去诊断，非策略接口），UI 不提供隐式经济 mutation hook。重大 DOM 标记 `data-major-event` 与单次 `data-major-new` 供自动化观察，存档不增加 UI 通知已播状态。

本轮证据：[core-report.md](black-swan-evidence/phase-b-20261004/core-report.md)。旧证据未重写；自动化不是人工试玩或平衡结论。

## 历史已执行的自动化证据（以下原记录保留）
- `node tests/run.cjs`：17组核心通过，含100种子完整52周不变式。
- `node tests/cdp-smoke.cjs --width 1366 --height 768`：Edge file://页面与核心浏览器测试通过，无页面运行异常和横向溢出。证据 `docs/browser-evidence-2026-10-03T11-41-42-818Z`。
- `node tests/ui-interaction.cjs`：74条断言通过（原20检查加54条音量/焦点回归）。Tab/ShiftTab各24步始终在dialog内；真实方向键调音、0 gain、百分比、localStorage及重载恢复、未交互不创建AudioContext、音乐启停均通过。DOM按钮新局/非法数量/买1/卖全部/周推进/搜索/设置/保存重载继续/周52确认及结算。1366×768、1600×900、1920×1080、2560×1440无页面溢出、推进按钮可见。
- `node tests/system-browser.cjs`：28检查通过，包括浏览器退出重启确定性继续、存储拒绝/导入/隔离、全周流程、住房仓储fixture、四分辨率和缩放等效布局、Esc焦点返回、无外部请求或运行异常。
- `node tests/acceptance-supplement.cjs`：5检查全部通过，原断言未修改；22次Tab全部在dialog内，音乐只启动一个循环且关闭停止，连点只提交一次。脚本正常覆盖 `docs/acceptance-evidence/supplement.json`。
- 截图与报告：`docs/ui-evidence/market-*.png`、`result.png`、`report.json`。已读取1366主界面和2560结算截图自查；截图不是人工试玩。

未验证：人工多局策略试玩、Chrome独立运行、真实扬声器听感/音频设备限制、屏幕阅读器全流程、长期性能、全部音频设备/存储异常组合。自动化证据不冒充人工体验或听感。
