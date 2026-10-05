# v4 存档与旧规则保护

现行 economy `0.5` / save `4`，活跃键 `homeyear.save.v4`。设置/关注/音量独立保存，不属于游戏 JSON，不随迁移或导入重置。

## 明确选择，不静默回退

读取优先当前 v4；另展示 v3，再展示 v2 迁入选择。坏或未来版本 v4 隔离，不自动恢复旧档，也不被普通保存覆盖；可导出原文，只有独立明确确认且 `replaceDamaged === true` 能替换。取消迁移、取消二次替换、load/settings/export 均不写新档。旧键读取异常不应否定已合法读取的 v4。

`js/v3-baseline.js` 是从 a538345 的完整 0.4 data/math/v2/market/trading/statistics/validation/game 封入独立闭包的冻结上下文，不调用实时 0.5 校验辅助函数。`js/v2-baseline.js` 保留原 20 商品严格上下文。旧版本必须先通过自己的完整严格校验，不能只信 version 或删字段绕过。

## v3 → v4

确认文案明确：当前周账目/行情/历史/普通事件/已有结算保留，不重放冲击；未来采用新事件规则，同一种子不再沿旧规则继续。

除以下四处外，所有旧 state 字段深等不变：

1. `version = 4`
2. `rulesVersion = '0.5'`
3. `swanLog = []`
4. `upgrade = {fromVersion:3, fromRules:'0.4', atWeek:旧周数, backup:原文独立备份键}`

四 RNG、普通 active/news、12 market/8 legacy、history、stats/20 byProduct、priceBook、revision、已有 migration/result 全保留。合法 ended v3 仍 ended，结果深等；不得交易、next 或进入第 53 周；原重复 end 的幂等行为保留。upgrade 四字段精确、来源固定、周数合法、备份键严格限定。已有 migration 链必须 `migration.atWeek <= upgrade.atWeek`；重大日志必须在升级之后周数才可新增。

## v2 → v4

严格验证 v2 后，在冻结 0.4 上下文内执行原 migrateV2，再内存改版本、补空 swanLog 和 `upgrade=null`，不写中间 v3。原三经济/视觉随机流保留，新 listing 流按原转换初始化/耗用；普通旧事件和旧新闻按原转换清理/重建。原 20 品交易统计、迁移峰值上界、退出商品被冻结行情和只卖权限不放宽。已结束 v2 仍拒绝迁移。migration 来源继续真实表示 v2→新规则，不伪称经过玩家 v3 存档。

## 原文备份和写入

- v2/v3 原键不会因导入、迁入而写入或删除。
- 统一原备份命名：`homeyear.save.backup.<16位小写hex内容id>`，不同原文碰撞时 `.1`…`.999`；同文本可复用；耗尽返回失败。
- 保留输入 JSON 原文，包括空白/换行，不重序列化旧文。备份先写/回读确认，再转换并校验新档；备份失败不写当前 v4。
- 本地迁入写 v4 并回读；写入或回读失败尽力还原原 v4，返回失败不切内存。无法保证任意恶意存储实现或还原写入也拒绝时的物理原子性。
- 旧导入先备份与转换，**只替换内存**，不立即写活跃 v4。普通自动/手动保存之后才持久化；坏 v4 的隔离授权不因内存导入清除。
- UI 可分别导出升级备份、链中原 v2 备份、旧原文及 v2 原键。保留已存在 migration.backup 的原合法前缀；新 upgrade.backup 使用上面的固定内容 id 格式。

`SaveAdapter` 新增 `v3Key/parseV3/stageV3/stageOld/oldRaw`，原 stageLegacy 和 export 字符串接口不变。迁移/导入适配均无网络调用，classic defer 顺序支持 file://。
