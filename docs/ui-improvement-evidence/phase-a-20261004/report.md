# 阶段 A：U1–U5 实施与自动化交付

日期：2026-10-04；工作区基线 `a538345`；只实施已委托的阶段 A，**阶段 B 未开始**。未提交、推送、部署、重跑经济模拟或人工试玩/试听。批准方案原文未改；历史冻结文档、报告、截图与模拟证据保持原样。

## 独立审核修复（P2 / P3，权威补充）

原首次交付的571/571不足以证明精确焦点，且 `b-review/week2-trade-1600.png` **撤销交易窗口证据资格**：它实际与同目录bulletin截图相同。原文件保留以公开失误；`b-review/invalidation.json` 与总manifest的 `status=withdrawn` 明确标注，不再用作交易窗口通过证据。下面首次结果表是当时记录，最新权威结果如下。

- **P2生产修复** `js/ui.js`：首次打开modal记录逻辑商品/按钮入口、原持仓顺序与列表位置；关闭时优先解析同商品同入口，即使原DOM已因交易重建。显式逐项查找，不再误把逗号querySelector当优先列表。卖5变disabled落到同商品卖1；自定义确认变disabled落到同商品输入；清仓详情落到后邻/前邻同详情入口，最终清仓落到仓库标题。普通快捷清仓落到邻卡卖1。仓库来源绝不落到帮助/下一周。
- **P2精确测试** `tests/ui-gameplay-improvements.cjs`：新增同商品同sell1、disabled卖5/自定义确认、大米买5→详情卖1→关闭同详情、首/中/末快捷与详情清仓、最后详情清仓标题等精确焦点断言。独立 `review-p2-ui/report.json` **605/605、退出0、错误/外部请求空**，原生Enter/Space重复保护和465次经济基线比较继续通过。初次补充夹具种子没有上架大米导致构造失败；换成已有合法大米初始种子后完整通过，未放松断言。
- **P3测试修复** `tests/milestone-b-edge-review.cjs`：1366与1600截图前断言dialog.open、kind=trade、可见尺寸；不以关闭modal遗留的trade-submit节点当打开状态。独立 `review-p3-b/review-report.json` 退出0、failures/consoleErrors空，notes.trade1600={open:true,kind:trade,visible:true}。新1600交易图已读取视觉自查，确为商品交易窗口。
- 定向旧回归：`UI_EVIDENCE_DIR=.../review-system` 执行 `node tests/system-browser.cjs`，**28/28、退出0、errors空**；`.../review-ui-interaction` 执行 `node tests/ui-interaction.cjs`，**77检查、退出0**。3个修改JS/CJS的 `node --check`、`git diff --check`通过；重新生成core-hashes仍10文件字节相同。未进入阶段B。
- 权威1600新截图：`review-p3-b/week2-trade-1600.png` 450871字节，SHA-256 `74db3cdc3c2a21752e882bfc985dffa33018ec0b1588a7de2f3ce2067bc27416`；bulletin图766175字节，SHA-256 `27897a680a8f72c902d1380386dcf8fcfaafa9739d82882fb35c55acb30d1853`，两者明确不同。所有旧/新截图汇总manifest现在132项，失效原图标注withdrawn。

## 实施范围

- `js/ui.js`：完全删除搜索输入/状态/监听；保留分类、关注、持仓范围、五种排序、当前可见商品的数字键映射和详情交易路径。
- 左侧“我的仓库”合并容量、升级与全部持仓；包含12个池内商品和8个旧档退出商品，不受市场筛选影响。卖1/卖5/卖全部直接走原 `act()` → `Engine.dispatch`；卖5不足5禁用，自定义整数数量在卡片内确认。
- 金额直接使用 `channelUnit/channelGross/channelNet/fee/costOf/liquidValue`；部分成本以同引擎的BigInt整数分摊。持续显示渠道、单价、成本、卖全部净额和浮盈；快捷按钮聚焦时显示对应整笔货款、折价、手续费、净回款、成本与盈亏。未新增经济计算规则。
- 提交期间禁用该持仓的出售控件；保留revision/token/错误/保存回调/音效。原生双击第二击（含间隔超过220ms）忽略；原生Enter/Space长按不重复成交，也不在清仓后激活邻商品或下一周。独立手势仍可继续。
- 整体重渲染恢复仓库逻辑焦点和滚动；清仓移到下一张/上一张卡或仓库标题。草稿只在UI内存中，切周清理；新局/继续/导入/迁入清理草稿与旧列表位置。原详情仍可选用。
- 右侧“街区快报”保留原 `bulletinRows` 的最多三条主摘要，另外展示原 `ongoing`。中央紧凑城市来信仅展示 `personal`，不重复持续消息，不把应付而未付现金说成已扣款。展开详情有独立高度上限。
- 轮换行没有百分比；其他快报百分比明确紧邻商品名、来源为实际 `changeBps`，对比上一自然周。
- `css/scenes.css`：后加载的局部布局覆盖，左280/270px、右310/300px；三列表内部滚动；保留住房插画和纸本视觉。底栏Grid左右等宽，青绿主按钮自身居中；1100px以下与700px以下降级。新快报下跌文本加深以通过对比度检查。没有全局重定义年度账本 `.inventory-line`。
- `README.md`、`docs/ui.md`：同步新入口、快报分工、键盘语义、稳定测试接口；旧验收记录保留并明确标作历史。

## 不变证据

`core-hashes.json` 对比 `git show a538345:<文件>` 与当前字节：以下10个文件全部逐字节相同：data/math/v2-baseline/market/trading/statistics/validation/game/save，以及 `simulation/c1.cjs`。规则仍0.4、存档仍v3、价格簿仍0.2，没有新增经济状态或保存字段。

新测试在Node独立加载历史和当前引擎，3个种子 × 52周，同一买/卖/推进序列共 **465次完整结果和完整经济快照比较**，全部一致，不仅比较价格或随机流。浏览器中的分类/关注/查看等UI操作也检查完整快照不变。所有浏览器测试通过 `file:///C:/files/code/BuyingHouse/index.html` 或原音频预览页加载；新测试无外部请求、无运行异常。

## 命令与结果

旧证据生产脚本先增加 `UI_EVIDENCE_DIR` 可配置绝对输出路径（保留旧默认入口），再执行。每支脚本指定独立子目录，避免 `av-visual` 的截图清理影响其他脚本或历史目录。`system-browser.cjs` 调用的 `acceptance-final.cjs` 也读取此变量。

复现模式（PowerShell，替换子目录后执行各命令）：

```powershell
$env:UI_EVIDENCE_DIR = (Join-Path (Get-Location) 'docs/ui-improvement-evidence/phase-a-20261004/<子目录>')
node tests/<脚本>.cjs
```

| 命令 | 独立子目录 | 最终结果 |
|---|---|---|
| `node tests/run.cjs` | `logs/core.txt` | 退出0，21/21 |
| `node tests/review-b2.cjs` | `logs/review-b2.txt` | 退出0，12/12 |
| `node tests/ui-gameplay-improvements.cjs` | 默认 `new-ui` | 退出0，571/571 |
| `node tests/ui-interaction.cjs` | `ui-interaction` | 退出0，77检查 |
| `node tests/system-browser.cjs` | `acceptance` | 退出0，28/28，errors空 |
| `node tests/acceptance-supplement.cjs` | `supplement` | 退出0，5/5 |
| `node tests/milestone-b-edge.cjs` | `b-migration` | 退出0，failures/consoleErrors/external空，完整未来一致 |
| `node tests/milestone-b-edge-migrate.cjs` | `b-migration` | 最终退出0，failures/consoleErrors空 |
| `node tests/milestone-b-edge-review.cjs` | `b-review` | 退出0，failures/consoleErrors空；保留20行结算回归 |
| `node tests/milestone-d-edge.cjs` | `keys` | 退出0，failures空；8卡按9无动作、20持仓按1–9正确、surge/减动效/导入继续不重播 |
| `node tests/av-visual.cjs --idle 60` | `av-visual` | 最终退出0，93/93（完整六视口，非quick） |
| `node tests/av-integration.cjs --idle 60` | `av-integration` | 退出0，24/24 |
| `node tests/av-audio.cjs` | `av-audio` | 退出0，96/96；未使用--samples、未输出WAV |
| `node tests/av-audio-director.cjs` | `logs/audio-director.txt` | 退出0，17/17 |
| `node --check`（所有改变的JS/CJS）与 `git diff --check` | 终端 | 通过 |

新测试除465条经济比较外，覆盖：多次买入/非整百价格卖1/5/全部后的完整账本与成本余数，1/4/5/9件边界、自定义空/负/小数/科学计数/超量输入，原生按键与双击/交叉快点，清仓焦点、仓库滚动，全部20持仓与缺货/冻结回收，第52周实际缺货回收、取消/确认结束、结束后只看结算，SecurityError/QuotaExceededError下交易成功但未保存/仅重试保存/导出可用，自动保存关闭，personal与多ongoing分组、轮换无百分比、真实商品涨跌一致，长金额与全旧持仓六视口，1000/650px降级。

### 发现与修复记录

- 新脚本早期夹具qty=1误提交买0、数字属性CSS选择器未加引号、CDP Enter缺少keypress文本，以及无焦点模拟时focusin不触发：已修正测试构造/原生输入；最终571/571。没有为通过测试放宽交易断言。
- 首次完整AV视觉跑88/93，5条失败是右栏绿字在渐变纸色上对比度不足；仅将快报 `.down` 改深色，完整重跑93/93。renderGame中位10ms、p90 12.9ms，60秒idle主线程0.125%；不是长期性能结论。
- 首次迁移浏览器检查本身通过，但Edge临时profile清理出现一次 `EBUSY`；原脚本未改为忽略清理错误，重新独立执行退出0。没有删除项目/主审文件。

## 视口与截图

新局六视口均无页面溢出、主按钮完整可见，按钮水平中心偏差均 **0 CSS px**。完整卡片数量为：1366×768=4，1600×900=6，1920×1080=8，2560×1440=8，1536×864=4，1280×720=4。长金额+全部20持仓在六种尺寸无顶栏重叠或水平溢出。

关键截图（机器捕获）：

- `new-ui/new-1366x768.png`（已读取自查）、其余 `new-<宽>x<高>.png`。
- `new-ui/full-legacy-long-1366.png` 与其他五种尺寸；`full-legacy-filtered.png`、`legacy-sale.png`。
- `new-ui/off-sale.png`（已读取自查）、`personal-expanded-ongoing.png`、`fallback-1000.png`、`fallback-650.png`。
- `b-review/week2-bulletin-1366.png` / `week2-bulletin-1600.png` 和原详情回归截图。
- `av-visual/` 包含完整六视口开始/市场/交易/住房/庆祝/结算与季节、减动效截图。

截图SHA-256与大小见 `artifact-manifest.json`。各子目录JSON是逐条机器检查，不是人工试玩结论。

## 剩余边界

阶段A完成待主审独立复核，不自动批准阶段B。人工新手/经营体验、真实扬声器听感、Chrome独立复验、屏幕阅读器全流程和长时间性能未做；降级布局不是完整移动端重设计。既有0.4经济的低购房率/策略集中风险仍属于历史平衡报告，本轮不调整房价、手续费、事件概率或商品目录。旧脚本默认输出仍指向旧证据目录，复跑必须明确设置上面的独立输出变量。
