# 这一年，安个家

新用户默认开启原创分阶段配乐；已有保存的音乐关闭偏好会继续保留。音乐只在首次用户交互后解锁，符合浏览器自动播放限制；无法启动时显示“点击启用声音”提示，不会静默假播放。

**视听升级（0.3）**：温暖都市纸本插画——黄昏开始页、市场街景横幅与“我的窗口”、六种时段光与四季附件、独立租房场景与五档住房构图、20 个重绘商品图标、交易小票、房产传单、开门购房庆祝、绘本式年度结算；按游戏阶段切换的原创 Web Audio 配乐（开始/起步/发展/冲刺/两种结局）。画面与音乐只读玩家可见信息，阶段由同一 director 判定。设计见 `docs/av-direction.md`，美术见 `docs/art.md`，音频见 `docs/audio.md`，收尾修复与实测见 `docs/av-closeout.md`。音频指标均为数字测量，**未经人工听验**。

现行版本是玩法规则 0.4，视听标签仍是 0.3。纯 HTML/CSS/Vanilla JavaScript；玩家无须安装工具、启动服务器、联网或下载依赖。已批准小样本是 [`docs/gameplay-v4-c1-r2.json`](docs/gameplay-v4-c1-r2.json)。正式两集是 [`docs/gameplay-v4-primary.json`](docs/gameplay-v4-primary.json) 与 [`docs/gameplay-v4-holdout.json`](docs/gameplay-v4-holdout.json)，各 18000 局。解读见 [`docs/gameplay-v4-balance.md`](docs/gameplay-v4-balance.md)，验收边界见 [`docs/gameplay-acceptance.md`](docs/gameplay-acceptance.md)。

## 运行与操作
直接双击 `index.html`，使用Chrome/Edge。默认标准难度、初始3000元、容量20、52周。轮换池 12 种，每周正好 8 种在售可买。未上架的池内持仓，以及旧档带来的 8 种退出商品，只能卖、不能买回。参考价不是预测。按整数数量交易，或买1/5/最大、清仓。第52周仍可交易、购房；“结束本年”只结算一次，不自动清仓，也没有第53周。

在售商品按市价买卖。未上架或已退出商品的卖出用回收报价 `floor(市价 × 92 / 100)`，手续费另计，买卖都是 `ceil(金额 × 1%)`。买入费计入成本，部分卖出向下取整分摊总成本，最后清仓带走成本余数。资金不足不借贷；个人支出不足记录困难，不产生债务。快报百分比是本周已经发生的涨跌，不预告下周。住房五档，可升档，按本局价格簿里的旧房价全额抵扣；仓储四档，升档支付累计租赁投入差额，仓储费用不算资产。购房不会提前结束。新局价格簿 id 是 `0.2`，住房和仓储差额只读这本簿。

标准住房6500/10000/14000/19000/25000元，容量20/40/75/120，仓储累计投入0/700/2200/5000元。轻松与挑战有明确的资金、住房、仓储、波动、生活风险参数。详情见 `docs/gameplay-rule-freeze.md` 和 `docs/gameplay-v4-balance.md`。`docs/balance.md` 是 0.2 历史解读，不是现行证据。

## 存档与恢复
- 新局存档键 `homeyear.save.v3`，设置单独位于 `homeyear.settings.v1`。旧键 `homeyear.save.v2` 不会被导入或迁入覆盖；迁入前先写入独立备份键。浏览器对file://存储的政策可能不同，导出JSON是可移植备份。
- 自动保存默认开，在交易/住房/仓储/周推进/结算成功后保存。关闭后仍可“手动保存”。新游戏有自制二次确认，默认自动保存新进度。
- 读取存档、粘贴JSON或选择本地文件导入；导入先严格校验，失败不改变当前游戏。成功导入只替换内存，手动保存或之后开启的自动保存才持久化。
- 导出JSON无须localStorage权限。存储被拒绝时游戏照常运行，明确提示未保存。
- 损坏的 v3 会隔离。读取失败不会静默覆盖原文。可以导出损坏原文。只有玩家明确确认覆盖之后，才允许 `replaceDamaged === true` 替换。
- 旧档 `homeyear.save.v2` 只做单向、明确确认后的迁入。迁入不覆盖原 v2 键。写入 v3 之前先写独立备份键，回读不一致就不写 v3。已结束的 v2 不迁移。
- 设置损坏使用明确默认值，并提示接口错误；设置不跟游戏JSON导入，当前用户的自动保存选择不被外来存档改变。

## 开发测试（玩家不需要Node）
使用现代Node运行以下零npm依赖命令：
```powershell
node tests/run.cjs
node tests/cdp-smoke.cjs
node tests/ui-interaction.cjs
node tests/system-browser.cjs
node tests/acceptance-supplement.cjs
node assets/build-art.cjs
node tests/av-visual.cjs        # 视觉：6视口截图/对比度/性能/庆祝清理/setScene协议
node tests/av-integration.cjs   # 整合：声音受阻与恢复、结算dialog不压暗结局BGM、晚创建Engine迟滞、播放时空闲CPU
node tests/av-audio-director.cjs
node tests/av-audio.cjs
# 下面两条是 0.2 历史工具，不能当作 0.4 证据
node simulation/run.cjs --seeds 1000 --prefix balance-v3-primary --out docs/balance-primary.json
node simulation/run.cjs --seeds 1000 --prefix balance-v3-holdout --out docs/balance-holdout.json
node simulation/report.cjs
```
`tests/browser.html` 可双击执行同一核心测试。CDP自动化依赖本机Edge和Node24内置WebSocket，**只是开发工具，不是游戏运行依赖**，参阅QA文档 `docs/browser-tooling.md`。

已批准的 0.4 小样本是 `docs/gameplay-v4-c1-r2.json`。`docs/gameplay-v4-c1-r3.*` 失效。`docs/balance-*.json` 是旧报告，不是新证据。正式主样本见 `docs/gameplay-v4-primary.json`。脚本买房率不是玩家胜率。人工试玩和试听仍待验。

0.3视听升级后（2026-10-03 16:25–16:31 UTC）实测：核心18项、UI交互、系统浏览器28检查、补充5检查、smoke全部通过，旧断言未改；新增视觉93项、整合10项、音频director 13项通过（音频90项见 `docs/av-audio-report.md`）。

**0.3 收尾复跑（2026-10-03 18:25–18:34 UTC，收尾修复之后在同一工作树上按顺序执行）**：`tests/run.cjs` 18 passed；`tests/cdp-smoke.cjs` 无失败；`tests/ui-interaction.cjs` 通过；`tests/system-browser.cjs` 28/28（`docs/acceptance-evidence/report.json`，0 异常）；`tests/acceptance-supplement.cjs` 5/5；`tests/av-audio-director.cjs` 17/17；`tests/av-audio.cjs --samples` 95/95（随后补了一条“非循环无尾段”防御断言并复跑为 96/96）；`tests/av-integration.cjs --idle 60` 24/24；`tests/av-visual.cjs --idle 60` 93/93。逐条命令、退出码与数字见 `docs/av-closeout.md`。以下为0.2版当时记录：核心17组、UI74条断言（原20检查加音量与键盘循环回归）、系统浏览器28检查、补充审核5检查全部通过。系统测试含浏览器完整退出重启继续、存档拒绝/隔离、52周结算；住房/仓储覆盖使用明确资金fixture，不声称自然经济成功或人工试玩。历史smoke证据见 `docs/ui.md`。

以下整段是 0.2 历史，不是 0.4 证据：当时最终模拟每难度每策略 1000 训练种子及 1000 未用于调参的留出种子，共 30000 局，五个旧策略。历史文件是 `docs/balance*.json`，历史解读是 `docs/balance.md`。不要把这些链接当成现行正式结果。

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
- `js/art-kit.js`/`art-scenes.js`/`art.js`、`css/scenes.css`、`assets/`：原创SVG街区、住房、商品与共享defs；`js/audio-score.js`/`audio-director.js`/`audio-instruments.js`/`audio.js`：用户交互后启动的分阶段WebAudio配乐
- `simulation/`：开发模拟/报告；`tests/ui-interaction.cjs`：新版UI自动交互与多分辨率截图

`window.HomeYear`：`new Engine(seed, difficulty='standard')`；`snapshot()`隔离副本；`restore(snapshot)`严格校验后恢复；失败保留原状态。`visible()`仅投影玩家可见信息（无RNG、趋势、隐藏事件），供策略公平使用。`dispatch({type,id,qty,revision,token})` 返回 `{ok,error,saveError,result}`；type为buy/sell/house/**warehouse**/next/end。revision来自当前状态；唯一非空token阻止重复提交。`onCommit(snapshot)`保存异常只报告saveError，不回滚成功操作。

`SaveAdapter(storage?)` 的load/save/remove/import/export返回明确结果；`save(state,{replaceDamaged:true})`只能由明确恢复动作使用。`parse(raw)`可在提交前独立校验。`loadSettings/saveSettings/isQuarantined/damaged`支持设置与恢复UI。`validate/create/record/summary/assets/used/housePrice/warehousePrice`可供核心测试使用。

正式界面快捷键：Space下一周、1–9商品详情、B买入、S卖出、Esc关闭。输入时快捷键停用，长按不连续推进；第52周结束本年必须确认。开始页可设置种子与难度，帮助内可重看四步引导。音乐与音效在用户交互后才启动，可在设置关闭；音量滑块0–100%，0静音，偏好独立存于 `homeyear.audio.volume.v1`。Tab/ShiftTab显式循环于对话框可见可用控件，Esc关闭并返回焦点；减少动效遵循系统偏好。

UI测试还覆盖Tab/ShiftTab各24步、音量范围/百分比/0 master gain、方向键调音、重载持久化、未交互不创建音频、音乐关闭停止循环。截图与报告见 `docs/ui-evidence/`，接口见 `docs/ui.md`。自动化不等于人工试玩；人工多局策略体验、Chrome独立复验、真实扬声器听感及长期性能未测。
