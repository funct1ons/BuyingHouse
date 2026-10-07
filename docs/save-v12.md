# save v12

- 当前键：`homeyear.save.v12`。`version: 12`，`rulesVersion: "0.13"`，价格簿仍为 `0.4`。
- 设置键 `homeyear.settings.v1`、里程碑键 `homeyear.milestones.v1` 不变。
- v1–v11 原键原文保留，可在设置中导出旧档。不自动迁移、不覆盖、不删除；旧版本导入会明确提示重新开局。
- 当前键损坏或包含未来版本时仍进入隔离，未明确同意替换前不能覆盖原文。

## 结算状态

`status` 为 `playing`、`rebuy` 或 `ended`。后两种状态只允许发生在第 52 周。

- `playing`：经营中，`settlement` 和 `result` 为 `null`。
- `rebuy`：住房已拍卖，允许一次购房或放弃，`result` 仍为 `null`；保存后可以恢复此阶段。
- `ended`：年度结算完成，保留偿债记录与最终结果，不能重新经营。

## 偿债记录

`settlement` 是必需字段；年末计息后、自动偿债前建立记录：

- `cashBefore`：自动偿债前现金。
- `principalBefore`：自动偿债前贷款本金。
- `interestAfterAccrual`：包含末周利息的待付利息。
- `purchaseCount`：进入年末结算时已有购房记录数量。
- `auction`：未拍卖时为 `null`；发生拍卖时为 `{houseId, proceeds}`，记录被拍卖住房与第 52 周市价收入。

正常经营中的购房仍只允许首次置业或升级。拍卖后的最后一条购房记录可降档，须在第 52 周以完整房价购买，并立即结束。`purchases` 和 `houseBasis` 保留全部历史支出，现金收支恒等式额外计入拍卖收入。

校验需要核对记录与贷款余额、住房、购房历史、现金和结算状态的关系；拍卖记录不能被当作额外赠款。重复结束不会重新计息或再次拍卖。

玩法顺序见 [gameplay-rules-0.13.md](gameplay-rules-0.13.md)。此前字段说明见 [save-v11.md](save-v11.md)，与本版冲突处以本文及当前校验代码为准。
