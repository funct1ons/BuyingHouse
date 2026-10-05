# 0.7 / save6 实施验证报告

七个重大事件首冲与七商品上限已更新，下周传闻通过共享 `advanceMarket` 的克隆预览生成并严格重算校验。经济四路 RNG 未被传闻独立抽签消耗；实际价格使用最终裁剪值。持续类仅首周全幅，随后沿原护栏中心与回归过程。右侧分区显示传闻和本周事实，来源为未核实闲谈说明。旧 v5 原文保留，不迁移；当前损坏或未来 v6 仍隔离。

验证结果：核心 21/21；calendar 8/8；mechanism 8/8；browser 331/0；warehouse 140/0；UI 77 项；smoke 无失败。权威目录为 `final/calendar`、`final/mechanism`、`browser-current`、`final/warehouse`、`final/ui`、`final/smoke`。见 verification-manifest.json 精确文件 hash，browser-current/screenshot-manifest.json 保存 viewport、状态、几何与截图 SHA。机制样本 correct 1378 / wrong 519 / empty 25 / offSale 572 仅为固定回归覆盖，不代表命中率或经济平衡。

逐项运行命令均以 PowerShell 设置独立输出环境变量后调用 Node：`node tests/run.cjs`；`CALENDAR_EVIDENCE_DIR=.../final/calendar` 对应 `node tests/calendar-event.cjs`；`RUMOR_EVIDENCE_DIR=.../final/mechanism` 对应 `node tests/rumor-shock.cjs`；`UI_EVIDENCE_DIR` 依次使用 `browser-current`、`final/warehouse`、`final/ui`、`final/smoke`，对应 calendar-event-browser、warehouse-current、ui-interaction、cdp-smoke。最后生产脚本 node --check 和核心重跑通过；未运行历史经济模拟。

保留失败记录：首轮浏览器输出 `final/browser/report.json` 因 UI 空传闻模板引号语法错误而 fatal、0 checks；修复后 `attempt2/browser` 331/0，但 rumors-1366.png 继承 700px 视口，不能作为 1366 证明。新 browser-current 331/0 恢复 1366 并加 viewport 元数据。终端曾误用 Unix heredoc 导致 PowerShell MissingFileSpecification（未执行 Node/未改变状态）；一次工具 edit 的 oldText 不匹配未写入，随后正确 edit 成功。首次核心 16/21 的五个失败来自手工经济 fixture 缺少重新生成严格必需传闻，修复 fixture 后最终 21/21。attempt1 机制原始输出保留，新增坏 current JSON/null/字段/传闻负例最终输出在 final/mechanism。

末周旧证据的三个遮挡截图保持原字节，相关可见性声明已通过 calendar-evidence-erratum.md 撤销；新截图通过真实鼠标 next 与真实 Esc 关闭，并在截图前检查 exact week/status/progress/warning、dialog closed 和几何可见性。保护列表覆盖旧 141 张日历截图及历史规则/模拟/冻结源，逐项 SHA 对比结果纳入 manifest。

限制：尚未经人工多局试玩、独立 Chrome 或真实扬声器听验，正式经济模拟暂停。此报告只声明自动化与实施自检，独立终审由主审阅执行。
