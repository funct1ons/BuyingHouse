'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const primary=JSON.parse(fs.readFileSync(path.join(root,'docs/balance-primary.json'),'utf8'));
const holdout=JSON.parse(fs.readFileSync(path.join(root,'docs/balance-holdout.json'),'utf8'));
const names={easy:'轻松',standard:'标准',challenge:'挑战',conservative:'保守',random:'随机',momentum:'追涨',value:'低价',idle:'不交易'};
const percentage=n=>(n*100).toFixed(1)+'%';
const money=n=>(n/100).toFixed(2);
const triple=o=>[o.p10,o.p50,o.p90].map(n=>n===null?'—':n).join('/');
const moneyTriple=o=>[o.p10,o.p50,o.p90].map(money).join('/');
const lines=[
  '# 阶段3真实经济模拟报告',
  '',
  '本报告由 `node simulation/report.cjs` 从原始JSON生成。自动策略模拟与浏览器自动交互均不称为人工试玩。',
  '',
  '## 复现与样本',
  '',
  '```powershell',
  'node simulation/run.cjs --seeds 1000 --prefix balance-v3-primary --out docs/balance-primary.json',
  'node simulation/run.cjs --seeds 1000 --prefix balance-v3-holdout --out docs/balance-holdout.json',
  'node simulation/report.cjs',
  '```',
  '',
  `最终主样本 ${primary.seeds} 种子×三难度×五策略；独立留出 ${holdout.seeds} 种子×三难度×五策略，共30000局。耗时主样本${primary.elapsedSeconds.toFixed(1)}s、留出${holdout.elapsedSeconds.toFixed(1)}s（并发运行；不是单局耗时）。`,
  `规则版本${primary.rulesVersion}；JSON有配置/引擎SHA256、实际命令、每局seed/资产/住房/购房周/升级/商品贡献/回撤。分位采用排序floor((N−1)×q)，成功=实际买过住房。金额表用元，原始JSON用分。`,
  '',
  '全部复用生产Engine.dispatch；没有替代经济模型或跳过校验。决策只读取Engine.visible以及UI公开的商品指南，不访问内部趋势/隐藏效果/RNG/未来行情。策略独立随机流。共同住房政策为够现金先买最低房，末周清仓后升到最高可负担档；引擎本身不强制清仓。升级政策见design和源码。',
  '',
  '## 迭代（保留真实中间结果）',
  '',
  '- tuning-a：30种子/组，初始住房8500、仓储累计1000/2800/6500；标准追涨23.3%、低价6.7%。',
  '- tuning-b：100种子/组，最低房6500、仓储700/2200/5000；标准追涨52%、低价37%，随机0%。没有调到随机稳赢。',
  '- iteration2-primary/validation：每组1000。较高住房15000/26000/43000/70000使高档极少出现；主样本标准追涨最大资产21420元，轻松低价最大27947元。最高房70000缺乏样本支持。',
  '- 最终仅压缩上档房价到10000/14000/19000/25000，最低6500、仓储/商品/事件/策略不动。最终primary与holdout使用全新prefix；holdout没有用于再调整参数。中间validation已经观察，所以不冒充最终留出。',
  '',
  '## 成功率与资产分布',
  '',
  '|难度|策略|主样本成功|主资产P10/P50/P90（元）|留出成功|留出资产P10/P50/P90（元）|',
  '|---|---|---:|---|---:|---|'
];
for(const g of primary.groups){
  const h=holdout.groups.find(x=>x.difficulty===g.difficulty&&x.strategy===g.strategy);
  lines.push(`|${names[g.difficulty]}|${names[g.strategy]}|${percentage(g.successRate)}|${moneyTriple(g.assets)}|${percentage(h.successRate)}|${moneyTriple(h.assets)}|`);
}
lines.push('', '## 主样本住房、买房周数、升级与回撤', '',
  '住房分布按“租房/单间/公寓/两居/城市/理想”记录人数（每行1000）。购房周分位只计成功者；没有成功者为—。回撤在每个操作后按资产峰值计算，仓储投入不可变现，因此租仓成本也会造成真实回撤。', '',
  '|难度|策略|住房人数|首次购房周P10/P50/P90|升级率|回撤% P10/P50/P90|',
  '|---|---|---|---|---:|---|');
for(const g of primary.groups){
  lines.push(`|${names[g.difficulty]}|${names[g.strategy]}|${Object.values(g.houses).join('/')}|${triple(g.purchaseWeek)}|${percentage(g.upgradeRate)}|${triple(g.drawdownPercent)}|`);
}
lines.push('', '留出详细住房分布、购房周、升级、回撤均保留在balance-holdout.json，不只留成功率。', '',
  '## 商品贡献（主样本每局平均已实现收益，元）', '',
  '每行列出前五商品，并单独列黄金/名表；全部20商品含负贡献保留JSON。未实现库存已在共同末周政策中清仓，故可做已实现贡献比较。', '',
  '|难度|策略|前五商品与收益|黄金|名表|', '|---|---|---|---:|---:|');
for(const g of primary.groups){
  const top=Object.entries(g.meanContribution).sort((a,b)=>b[1]-a[1]).slice(0,5);
  lines.push(`|${names[g.difficulty]}|${names[g.strategy]}|${top.map(([id,n])=>id+': '+money(n)).join('，')}|${money(g.meanContribution.gold)}|${money(g.meanContribution.watch)}|`);
}
lines.push('', '## 容量、房价与集中度判断', '',
  '- 小体积昂贵品没有在这些策略里垄断：黄金波动低，交易手续费吞噬小波动；名表贡献低于高波动显卡/藏品及明显季节性的羽绒服。商品尺寸并非均为1；显卡3、相机3、空调5、名表2、藏品2，黄金虽1但回报不与体积线性挂钩。',
  '- 标准追涨/低价主要收益来自藏品、羽绒服、显卡，存在高波动品集中，不把“没有黄金垄断”说成“所有商品同等有效”。这是策略和模型的联合观察，不是最优策略证明。',
  '- 初始20容量会显著约束廉价批量品。有效策略升级率高，仓储是重要成本/机会选择；保守和随机也可能过早升级，导致净资产低于不交易。不是升级即可赢，后续正式UI应明确展示租赁投入不返还。',
  '- 最低住房为初始标准资金的2.17倍。标准随机成功率接近零而追涨有可观胜率，低价也有成功窗口；“理解规律能赢”与“盲买稳赢”分开。挑战难度明显更严，不承诺新手可稳定赢。',
  '- 上档调价让高手/好种子有阶梯目标，但顶档仍稀少；最终住房分布是证据，不承诺每一档都有高获得率。最低目标不因调高档而变简单。',
  '', '## 剩余风险与停止点', '',
  '- 保守策略几乎不买房，说明低风险盈利不足以实现一年目标；它也会在容量政策下支付不划算租仓成本。不能据此断言所有稳健人工策略都必败，也不隐瞒此弱点。',
  '- 追涨胜率高于朴素低价；趋势惯性可被利用。未证明复杂策略、只做单商品策略或完美择时不存在套利。没用未来信息，但策略固定阈值只是几类行为样本。',
  '- 市场价格未因玩家交易量改变；无限市场深度由现金/容量限制，不模拟买卖盘。个人事件克制，但极端坏运气仍会让低资金玩家受压。',
  '- 这些不是人工试玩。最终视觉、教程、声音、不同分辨率正式界面与自然经济多局人工试玩留后续阶段。到阶段2–3停止，等待主审。', ''
);
fs.writeFileSync(path.join(root,'docs/balance.md'),lines.join('\n'));
console.log('Generated docs/balance.md from final primary and holdout JSON');
