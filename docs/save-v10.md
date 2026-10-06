# save v10

- 当前键：`homeyear.save.v10`。`version: 10`，`rulesVersion: 0.11`。`priceBook.id` 仍必须是 `0.3`。
- 新字段 `loan` 只含 `principal`、`interestDue`：未还本金、未还利息，单位与现金相同。无贷款时都是 0。
- `rng` 增加 `lottery`。范围与其他流相同。不并入市场随机流。
- `stats` 增加 `loanDrawn`（累计借出本金）、`loanPrincipalPaid`（累计归还本金）、`loanInterestAccrued`（累计计息）、`loanInterestPaid`（累计实付利息）、`lotterySpent`（累计票价）、`lotteryWon`（累计奖金）、`lotteryCount`（张数）。
- 现金恒等式在 v9 上追加 `+loanDrawn -loanPrincipalPaid -loanInterestPaid +lotteryWon -lotterySpent`。`loanInterestAccrued` 不进现金恒等式。
- 净资产历史公式不变：现金 + 参考市值 + 住房市价，不扣贷款。峰值上界在 v9 上界上追加 `loanDrawn` 和 `lotteryWon`。追加的是累计借出和累计奖金，不是未还余额。
- v1–v9 原键原文保留，并提示旧档不兼容。不迁移、不覆盖、不删除。当前键损坏或未来版本进入隔离；未明确替换时不覆盖。
- 里程碑键 `homeyear.milestones.v1` 不变。新游戏、删除 v10、覆盖 v10 都不清里程碑。

其余沿用 [save-v9.md](save-v9.md)。
