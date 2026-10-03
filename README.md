# 这一年，安个家

完整系统与经济平衡基础上的0.2正式界面与审核修复版本。纯HTML/CSS/Vanilla JavaScript；玩家无须安装工具、启动服务器、联网或下载依赖。

## 运行与操作
直接双击 `index.html`，使用Chrome/Edge。默认标准难度、初始3000元、容量20、52周。20种商品都有历史曲线、公开参考价与商品说明；参考价不是预测。按整数数量交易，或买1/5/最大、清仓。第52周仍可交易、购房；“结束本年”只结算一次，不自动清仓。

手续费买卖各1%，按分向上取整。买入费计入成本，部分卖出向下取整分摊总成本，最后清仓带走成本余数。资金不足不借贷；个人支出不足记录困难，不产生债务。住房五档，可升档，按旧房原购买价全额抵扣；仓储四档，升档支付累计租赁投入差额，仓储费用不算资产。购房不会提前结束。

标准住房6500/10000/14000/19000/25000元，容量20/40/75/120，仓储累计投入0/700/2200/5000元。轻松与挑战有明确的资金、住房、仓储、波动、生活风险参数。详情见 `docs/design.md` 和 `docs/balance.md`。

## 存档与恢复
- 存档键 `homeyear.save.v2`，设置单独位于 `homeyear.settings.v1`；同一浏览器/配置文件/file URL下保存。浏览器对file://存储的政策可能不同，导出JSON是可移植备份。
- 自动保存默认开，在交易/住房/仓储/周推进/结算成功后保存。关闭后仍可“手动保存”。新游戏有自制二次确认，默认自动保存新进度。
- 读取存档、粘贴JSON或选择本地文件导入；导入先严格校验，失败不改变当前游戏。成功导入只替换内存，手动保存或之后开启的自动保存才持久化。
- 导出JSON无须localStorage权限。存储被拒绝时游戏照常运行，明确提示未保存。
- 损坏/旧版/未来版存档隔离，**不因读取失败而自动覆盖原文**。可以导出损坏原文；必须明确确认覆盖或删除后解除隔离。阶段1版本没有迁移承诺，v1不会静默读取。
- 设置损坏使用明确默认值，并提示接口错误；设置不跟游戏JSON导入，当前用户的自动保存选择不被外来存档改变。

## 开发测试（玩家不需要Node）
使用现代Node运行以下零npm依赖命令：
```powershell
node tests/run.cjs
node tests/cdp-smoke.cjs
node tests/ui-interaction.cjs
node tests/system-browser.cjs
node tests/acceptance-supplement.cjs
node simulation/run.cjs --seeds 1000 --prefix balance-v3-primary --out docs/balance-primary.json
node simulation/run.cjs --seeds 1000 --prefix balance-v3-holdout --out docs/balance-holdout.json
node simulation/report.cjs
```
`tests/browser.html` 可双击执行同一核心测试。CDP自动化依赖本机Edge和Node24内置WebSocket，**只是开发工具，不是游戏运行依赖**，参阅QA文档 `docs/browser-tooling.md`。

当前实际执行：核心17组、UI74条断言（原20检查加音量与键盘循环回归）、系统浏览器28检查、补充审核5检查全部通过。系统测试含浏览器完整退出重启继续、存档拒绝/隔离、52周结算；住房/仓储覆盖使用明确资金fixture，不声称自然经济成功或人工试玩。历史smoke证据见 `docs/ui.md`。

最终模拟每难度每策略1000训练种子及1000未用于调参的留出种子，共30000局，保守/随机/追涨/低价买入/不交易，均直接复用引擎和玩家可见数据。完整结果、源代码哈希与逐种子样本见 `docs/balance*.json`，解读见 `docs/balance.md`。模拟不等于人工试玩。

## 结构/API
经典defer脚本保证直接双击与离线，不使用fetch、模块HTTP加载或外部资源。
- `js/data.js`：商品/事件/住房/仓储/难度/设置
- `js/math.js`：安全整数、随机、资产与容量
- `js/market.js`：季节/宏观/持续市场事件/克制个人事件/新闻
- `js/trading.js`：买卖、住房与仓储升级
- `js/statistics.js`：逐周现金/库存/住房/资产、峰值/回撤、完整结算
- `js/validation.js`：严格必需字段、数值、历史、事件、收支与结果一致性
- `js/game.js`：原子操作与状态调度；`js/save.js`：隔离式持久化
- `js/ui.js`：正式开始页、三栏市场、交易/住房/仓储、帮助/教程、设置存档和结算
- `js/art.js`、`assets/`：原创SVG城市、住房、商品；`js/audio.js`：用户交互后启动的WebAudio合成声音
- `simulation/`：开发模拟/报告；`tests/ui-interaction.cjs`：新版UI自动交互与多分辨率截图

`window.HomeYear`：`new Engine(seed, difficulty='standard')`；`snapshot()`隔离副本；`restore(snapshot)`严格校验后恢复；失败保留原状态。`visible()`仅投影玩家可见信息（无RNG、趋势、隐藏事件），供策略公平使用。`dispatch({type,id,qty,revision,token})` 返回 `{ok,error,saveError,result}`；type为buy/sell/house/**warehouse**/next/end。revision来自当前状态；唯一非空token阻止重复提交。`onCommit(snapshot)`保存异常只报告saveError，不回滚成功操作。

`SaveAdapter(storage?)` 的load/save/remove/import/export返回明确结果；`save(state,{replaceDamaged:true})`只能由明确恢复动作使用。`parse(raw)`可在提交前独立校验。`loadSettings/saveSettings/isQuarantined/damaged`支持设置与恢复UI。`validate/create/record/summary/assets/used/housePrice/warehousePrice`可供核心测试使用。

正式界面快捷键：Space下一周、1–9商品详情、B买入、S卖出、Esc关闭。输入时快捷键停用，长按不连续推进；第52周结束本年必须确认。开始页可设置种子与难度，帮助内可重看四步引导。音乐与音效在用户交互后才启动，可在设置关闭；音量滑块0–100%，0静音，偏好独立存于 `homeyear.audio.volume.v1`。Tab/ShiftTab显式循环于对话框可见可用控件，Esc关闭并返回焦点；减少动效遵循系统偏好。

UI测试还覆盖Tab/ShiftTab各24步、音量范围/百分比/0 master gain、方向键调音、重载持久化、未交互不创建音频、音乐关闭停止循环。截图与报告见 `docs/ui-evidence/`，接口见 `docs/ui.md`。自动化不等于人工试玩；人工多局策略体验、Chrome独立复验、真实扬声器听感及长期性能未测。
