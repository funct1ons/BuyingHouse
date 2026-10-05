# 0.6 日历证据末周截图勘误

撤销旧 `calendar-event-evidence/iteration-20261005/browser-final/week-50.png`、`week-51.png`、`week-52.png` 三张图作为末周提醒与进度“实际可见”证明的声明。原测试使用 DOM `.click()` 穿过 native dialog 的 inert 背景推进，旧第 50 周 tariff 弹窗持续遮住页面。因此这些图不能证明玩家可见的末周主界面，旧 326 项数字也不能代替这条实际鼠标路径。

原精确 snapshot.week 和 progress 断言仍有效；实际状态已推进，不把此问题描述为引擎没有推进。原图、report、manifest 与所有历史证据保持原字节，不删、不覆盖。

替代证明位于本轮 `browser-current/`。它通过真实 CDP 鼠标进入下一周；若事件弹窗打开，先真实 Esc 关闭，再截图。截图前分别断言 week/status 为 50/51/52、playing，dialog 已关闭，进度为 49/50/51，提醒为含本周 3/2/1 周，并检查提醒、进度、主按钮处于视口内且未被遮挡。元数据与 screenshot SHA-256 一起写入新 screenshot-manifest。
