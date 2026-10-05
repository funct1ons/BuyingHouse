# 内测 save5 协议

现行规则0.6，活跃键`homeyear.save.v5`。完整日历/界面合同见[现行规则](gameplay-rules-0.6.md)。顶层在v4形状上增加`calendarStartWeek`，要求安全整数1…52且等于独立seed派生值；`version=5/rulesVersion='0.6'`，原生`migration/upgrade=null`，不接受旧迁移声明。未知/缺失字段拒绝，账本恒等式与事件交叉校验保持严格。

- `load`优先读取当前有效v5，不受旧键干扰；无v5时只检测旧键存在，显示内测不兼容提示，既不转换也不隔离旧档。
- `parse/import`拒绝旧1/2/3/4；失败不变内存、不写任何键。成功导入当前档只换内存。
- 当前档损坏/未来版本隔离，保留原文；save拒绝自动覆盖，明确恢复才允许`replaceDamaged:true`。删除只删v5。
- `save`严格校验且回读，失败尝试恢复之前v5原文。经济提交后存储失败通过`saveError`报告，不回滚成交，不重抽。
- 导出当前档不依赖存储权限；旧档和损坏原文可导出备存，不代表可跨版本导入。设置/关注/音量偏好不变。
- 历史v2/v3冻结校验和历史转换代码保留，但本版stage/migrate明确拒绝；不投入旧档兼容。

证据位于`calendar-event-evidence/iteration-20261005/`。旧`save-v4.md`及迁移专项仅为历史说明。
