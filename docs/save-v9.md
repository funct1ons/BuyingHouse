# save v9

- 当前键：`homeyear.save.v9`。`version: 9`，`rulesVersion: 0.10`。`priceBook.id` 必须是 `0.3`。
- 沿用 v7 / v8 的 `houseBasis`、`purchases`、`housingLog`。`rng` 必须含 `housing`，范围与其他流相同。
- 仓储价逐项等于 0.3 公布簿。住房价等于当周公式，要求等于按周增长后的当周市价。
- 现金恒等式减去 `houseBasis`。资产峰值上界另加该难度第 52 周、两个上涨冲击都记在第 6 周时的最贵住房市价。
- `purchases` 只含 `houseId, week, price, paid`，档位下标严格递增，实付合计等于 `houseBasis`。`housingLog` 最多 3 条，只含 `id, week`，写入范围停在住房日志，不进入 `activeEvents`。
- `swanLog` 最多 8 条，相邻至少隔 4 周，周数落在第 4–50 周，且符合该事件季节。条目只含 `id, week`。候选池有 45 个黑天鹅，每个 id 一年最多一次。
- v1–v8 原键原文保留，并提示旧档不兼容。不迁移、不覆盖、不删除。当前键损坏或未来版本进入隔离；未明确替换时不覆盖。
- 里程碑键 `homeyear.milestones.v1` 与对局存档隔离。损坏的里程碑不阻止对局存档。未传 `{replaceDamaged:true}` 时不覆盖损坏里程碑。
- 里程碑条目只含 `houseId, week, difficulty, seed, calendarStartWeek, price, paid`。去重键是这些字段的 `contentId`。保存时记下当时实付，不按房价公式重算。最多 1000 条。
- 新游戏、删除 v9、覆盖 v9 都不清里程碑。
