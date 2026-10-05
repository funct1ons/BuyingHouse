(function (g) {
  'use strict';
  const H = g.HomeYear = {};
  H.rules = {
    version: '0.7', saveVersion: 6, initialCash: 300000, capacity: 20, weeks: 52, fee: 0.01,
    buybackNumer: 92, buybackDenom: 100, onSale: 8, replaceMin: 2, replaceMax: 3, maxAbsence: 3,
    headlineMoveBps: 800, revertRate: 0.15
  };
  H.roleHalf = {daily: 0.08, industry: 0.14, spec: 0.20};
  H.persistCap = {daily: 3000, industry: 6000, spec: 8000};
  H.difficulties = {
    easy: {name: '轻松', initialCash: 400000, houseFactor: 0.8, warehouseFactor: 0.8, volatility: 0.85, risk: 0.8},
    standard: {name: '标准', initialCash: 300000, houseFactor: 1, warehouseFactor: 1, volatility: 1, risk: 1},
    challenge: {name: '挑战', initialCash: 250000, houseFactor: 1.25, warehouseFactor: 1.2, volatility: 1.15, risk: 1.25}
  };
  // base/min/max/size remain frozen aliases. role is the rotation role; category stays the shelf tab.
  const rows = [
    ['rice','大米','生活','耐存储的主食，体积大但价格稳。',18000,7000,100000,2,.045,.7,.7,.08,0,'米','daily'],
    ['pork','猪肉','生活','供给周期长，疫病与集中出栏都会改变行情。',12000,3500,38000,2,.105,1,1.3,.15,0,'肉','industry'],
    ['eggs','鸡蛋','生活','薄利日用品，供应恢复速度快。',7000,2500,100000,1,.065,.6,1,.08,0,'蛋','daily'],
    ['fruit','水果','生活','夏日需求与丰收相互拉扯。',14000,4000,100000,2,.095,.8,1.2,.25,Math.PI,'果','industry'],
    ['phone','手机','电子','换代与促销令旧款承压。',65000,22000,1000000,2,.11,1.2,1.1,.08,4,'机','industry'],
    ['gpu','显卡','电子','高波动硬件，缺货与迭代风险突出。',80000,20000,800000,3,.18,1.4,1.5,.05,1,'卡','spec'],
    ['watch','名表','贵重','紧凑奢侈品，消费冷却时难免回调。',150000,50000,350000,2,.09,1.1,1,.08,0,'表','spec'],
    ['collectible','城市藏品','贵重','小众收藏，热度反转可能很猛烈。',70000,12000,250000,2,.20,1.5,1.4,.05,2,'藏','spec'],
    ['coat','羽绒服','季节','冬旺夏淡，提前布局仍有天气风险。',30000,8000,90000,2,.08,.8,1.1,.5,0,'衣','industry'],
    ['ac','空调','季节','夏季旺销，但大体积压缩仓位。',65000,20000,800000,5,.09,.9,1.3,.5,Math.PI,'凉','industry'],
    ['umbrella','雨具','季节','梅雨季需求突出，单价低。',9000,2500,27000,1,.085,.7,1.25,.28,3.6,'伞','industry'],
    ['mask','口罩','应急','平时廉价，防护需求出现时跳涨。',6000,1500,200000,1,.12,.6,1.6,.1,0,'罩','spec']
  ];
  const legacyRows = [
    ['oil','食用油','生活','已退出轮换。旧档持仓只能按冻结回收价出售。',24000,9000,65000,2,.065,.8,.9,.12,0,'油'],
    ['milk','牛奶','生活','已退出轮换。旧档持仓只能按冻结回收价出售。',11000,4500,24000,2,.04,.5,.7,.05,0,'奶'],
    ['console','游戏机','电子','已退出轮换。旧档持仓只能按冻结回收价出售。',50000,15000,140000,3,.13,1.2,1.1,.2,0,'游'],
    ['camera','相机','电子','已退出轮换。旧档持仓只能按冻结回收价出售。',90000,30000,230000,3,.09,1.1,.9,.18,Math.PI,'摄'],
    ['gold','黄金饰品','贵重','已退出轮换。旧档持仓只能按冻结回收价出售。',120000,70000,190000,1,.035,.4,.65,.03,0,'金'],
    ['medicine','常备药','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',16000,5500,48000,1,.075,.7,1.2,.25,0,'药'],
    ['battery','电池','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',20000,7000,60000,2,.10,1,1.3,.08,0,'电'],
    ['food','应急食品','应急','已退出轮换。旧档持仓只能按冻结回收价出售。',13000,4000,40000,2,.07,.7,1.2,.1,0,'备']
  ];
  const mapRow = (r, role) => ({id:r[0], name:r[1], category:r[2], description:r[3],
    basePrice:r[4], minPrice:r[5], maxPrice:r[6], unitSize:r[7], volatility:r[8],
    trendSensitivity:r[9], eventSensitivity:r[10], season:r[11], phase:r[12], icon:r[13],
    base:r[4], min:r[5], max:r[6], size:r[7], role:role || null, lowRef:r[4] <= 20000, legacy:!role});
  H.products = rows.map(r => mapRow(r, r[14]));
  H.legacyProducts = legacyRows.map(r => mapRow(r, null));
  H.houses = [
    {id:'studio', name:'老旧单间', price:650000, district:'旧街', description:'小，但房门属于自己。', icon:'⌂', ending:'勉强上车'},
    {id:'flat', name:'普通公寓', price:1000000, district:'近郊', description:'有阳台，也有新的生活。', icon:'⌂', ending:'小有成就'},
    {id:'two', name:'舒适两居', price:1400000, district:'河岸', description:'客厅不再兼任仓库。', icon:'⌂', ending:'安居有余'},
    {id:'city', name:'城市住宅', price:1900000, district:'中心', description:'通勤与风景都更从容。', icon:'⌂', ending:'城市新贵'},
    {id:'dream', name:'理想之家', price:2500000, district:'花园', description:'终于有地方安放所有梦想。', icon:'⌂', ending:'理想成真'}
  ];
  H.warehouses = [
    {id:'room', name:'出租屋角落', capacity:20, price:0},
    {id:'small', name:'小仓库', capacity:40, price:70000},
    {id:'normal', name:'普通仓库', capacity:75, price:220000},
    {id:'large', name:'大型仓库', capacity:120, price:500000}
  ];
  // Published integer books already include the difficulty factor. 0.2 is immutable.
  const book = (houses, warehouses) => ({houses, warehouses});
  H.priceBooks = {
    '0.2': {
      easy: book({studio:520000, flat:800000, two:1120000, city:1520000, dream:2000000}, {room:0, small:56000, normal:176000, large:400000}),
      standard: book({studio:650000, flat:1000000, two:1400000, city:1900000, dream:2500000}, {room:0, small:70000, normal:220000, large:500000}),
      challenge: book({studio:812500, flat:1250000, two:1750000, city:2375000, dream:3125000}, {room:0, small:84000, normal:264000, large:600000})
    }
  };
  const fx = (kind, bps) => ({kind, bps});
  const market = [
    ['egg_supply','蛋筐在店门口叠了起来','集中到货已经发生，鸡蛋的本周价格里看得到。',2,'temporary','reliable',{eggs:fx('persist',-1800)}],
    ['egg_demand','烘焙坊把蛋订走了','订单已经落到蛋品上，本周价格已经变化。',3,'none','normal',{eggs:fx('persist',2000)}],
    ['harvest','新米进了街口粮店','丰收的米已经到货，本周米价里看得到。',4,'temporary','reliable',{rice:fx('persist',-2000)}],
    ['crop_loss','田里少收了一季','减收已经牵动大米和水果。本周涨跌以成交价为准。',4,'none','normal',{rice:fx('persist',2200), fruit:fx('persist',3500)}],
    ['pork_glut','屠宰场门口排起了队','集中出栏已经发生，猪肉本周价格已经变化。',3,'temporary','reliable',{pork:fx('persist',-2800)}],
    ['pork_short','栏里一时补不上猪','供应收紧已经发生，猪肉本周价格已经变化。',4,'none','normal',{pork:fx('persist',4000)}],
    ['heat','热气贴着店门不散','高温已经牵动空调和水果。本周涨跌以成交价为准。',3,'none','reliable',{ac:fx('persist',4000), fruit:fx('persist',3000)}],
    ['cold','寒潮贴着窗玻璃','冷空气已经到了，羽绒服本周价格已经变化。',3,'none','reliable',{coat:fx('persist',4500)}],
    ['rain','雨顺着屋檐下了整条街','连续降雨已经发生，雨具和水果的本周价格都已变化。',3,'none','reliable',{umbrella:fx('persist',4000), fruit:fx('persist',-2000)}],
    ['dry','放晴以后伞架空了半边','转晴已经发生，雨具本周价格已经变化。',2,'temporary','normal',{umbrella:fx('persist',-3000)}],
    ['coat_sale','冬衣挂上了清仓牌','换季清仓已经发生，羽绒服本周价格已经变化。',3,'temporary','reliable',{coat:fx('persist',-3500)}],
    ['ac_factory','空调车停在店门口','出厂促销已经发生，空调本周价格已经变化。',3,'temporary','reliable',{ac:fx('persist',-3000)}],
    ['electronics_sale','手机柜贴上了促销条','促销已经发生，手机本周价格已经变化。',2,'temporary','reliable',{phone:fx('persist',-2200)}],
    ['phone_launch','新机亮相，旧款还在柜上','换代已经记入旧手机的价格中枢，本年不会自动改回。本周涨跌以成交价为准。',52,'structural','reliable',{phone:fx('structural',-3000)}],
    ['chips','芯片盒子迟迟没到店','供应趋紧已经发生，显卡和手机的本周价格都已变化。',3,'none','reliable',{gpu:fx('immediate',7000), phone:fx('persist',2200)}],
    ['new_gpu','新卡到店，旧卡还在架上','新品上市已经记入显卡的价格中枢，本年不会自动改回。本周涨跌以成交价为准。',52,'structural','reliable',{gpu:fx('structural',-3500)}],
    ['luxury','橱窗的灯亮到很晚','消费回暖已经牵动名表和藏品。本周涨跌以成交价为准。',4,'none','normal',{watch:fx('persist',2500), collectible:fx('immediate',8000)}],
    ['weak','奢侈柜台前的人少了','热情降温已经发生。之后可以反弹，也可以继续走低。本周涨跌以成交价为准。',4,'unwind','normal',{watch:fx('persist',-3000), collectible:fx('persist',-4000)}],
    ['collection','展览把藏品请上了台面','开幕已经发生，藏品本周价格已经变化。',1,'none','reliable',{collectible:fx('immediate',9000)}],
    ['bubble','展览散场，热度跟着走了','热度消退已经发生。之后可以反弹，也可以继续走低。本周涨跌以成交价为准。',1,'unwind','normal',{collectible:fx('immediate',-5000)}],
    ['flu','药房门口排起了夜班','防护需求已经起来，口罩本周价格已经变化。',1,'none','reliable',{mask:fx('immediate',8000)}],
    ['supply','防护厂的灯通宵亮着','增产已经发生，口罩本周价格已经变化。',3,'temporary','reliable',{mask:fx('persist',-3500)}]
  ];
  H.events = market.map(r => ({id:r[0], type:'market', title:r[1], situation:r[2], description:r[2],
    duration:r[3], fade:r[4], reliability:r[5], effects:r[6], weight:1}));
  H.swanRules = Object.freeze({probability: .16, firstWeek: 4, lastWeek: 50, gap: 6, limit: 6});
  const swans = [
    ['swan_route','主航道临时封航，进口柜台等不到货','在途货物延迟已经发生，进口耐用品供给收紧。本周变化以成交价为准。',3,['phone'],null,{phone:fx('persist',18000),gpu:fx('persist',12000),ac:fx('persist',10000)}],
    ['swan_efficiency','新算法落地，旧算力订单突然撤回','效率突破已改变旧硬件订单预期，部分订单已经撤回。本周变化以成交价为准。',1,['gpu'],null,{gpu:fx('immediate',-7000),phone:fx('immediate',-4500)}],
    ['swan_egg_short','多地蛋场临时停供，批发柜台告急','蛋品供给骤紧已经发生，常备主食的替代需求也有变化。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',20000),rice:fx('immediate',5000)}],
    ['swan_heat','异常热浪提前压城，制冷货源吃紧','热旱天气已牵动制冷、农产和雨具需求。本周变化以成交价为准。',3,['ac'],'夏',{ac:fx('persist',22000),fruit:fx('persist',7000),umbrella:fx('persist',-4500)}],
    ['swan_tariff','进口新规突然生效，柜台成本与消费预期分化','进口成本和可选消费预期已经分化，各商品可能有不同方向。本周变化以成交价为准。',2,['phone','collectible'],null,{phone:fx('persist',15000),watch:fx('persist',-6500),collectible:fx('persist',-7000)}],
    ['swan_protection','防护标准临时升级，常备用品突然紧俏','临时防护标准已经升级，常备用品需求挤压供给。本周变化以成交价为准。',1,['mask'],null,{mask:fx('immediate',40000),rice:fx('immediate',8000),eggs:fx('immediate',6000)}],
    ['swan_egg_relief','加急蛋品到货，短缺预期迅速消退','到货与需求降温已缓解短缺预期，并非此前事件的定时后续。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',-7000),rice:fx('immediate',-3500)}]
  ];
  H.events.push(...swans.map(r => ({id:r[0], type:'market', tier:'swan', title:r[1], situation:r[2], description:r[2],
    duration:r[3], primaryProducts:r[4], season:r[5], effects:r[6], fade:'none', reliability:'reliable', weight:1})));
  // Built-in factual summaries only: no network requests during offline play.
  const origin = (name, date, agency, title, url, facts, adaptation) => Object.freeze({name,date,agency,title,url,facts,adaptation});
  const eggURL = 'https://ers.usda.gov/data-products/charts-of-note/112677';
  H.swanOrigins = Object.freeze({
    swan_route: origin('苏伊士运河 Ever Given 堵塞','2021-03-23—04-01','IMO','MV Ever Given incident – 23 March 2021','https://www.imo.org/en/MediaCentre/SecretaryGeneral/Pages/MV-Ever-Given-incident.aspx','3月23日事故导致航道临时关闭；4月1日声明记录恢复通行。','进口耐用品延迟及游戏商品变化为原创映射，不是新闻实测零售价或固定恢复倒计时。'),
    swan_efficiency: origin('DeepSeek 引发技术股重估','2025-01-27','Reuters（Kitco 转刊）',"Nasdaq, S&P 500 drop as China's DeepSeek AI model hits tech shares",'https://www.kitco.com/news/off-the-wire/2025-01-27/nasdaq-sp-500-drop-chinas-deepseek-ai-model-hits-tech-shares','报道低成本模型引发算力需求预期重估及科技股下跌，并非算法效率已经获现实验证。','股票跌幅不等于显卡零售价；订单撤回与手机联动均是虚构城市设定。'),
    swan_egg_short: origin('禽流感与蛋品供应收紧','2024-10—2025-03','USDA ERS','Retail egg prices fall, following declining wholesale prices',eggURL,'2024年10月至2025年3月蛋鸡数量减少，蛋品供应偏紧。','蛋场临时停供、大米替代需求和冲击幅度为游戏原创，不保证与缓解事件配对。'),
    swan_egg_relief: origin('需求降温与批发蛋价回落','2025-03—04','USDA ERS','Retail egg prices fall, following declining wholesale prices',eggURL,'需求降温与新增禽流感病例暂停伴随批发价回落，零售价调整滞后；不是产能已恢复。','加急到货和大米联动是原创；不是先涨后跌的定时后续，不保证反弹或配对。'),
    swan_heat: origin('欧洲极端高温','2025-06—07','WMO','Extreme heat grips Europe','https://wmo.int/media/news/extreme-heat-grips-europe','欧洲多地出现极端高温与热浪。','制冷、农产与热旱雨具需求映射是原创，不证明空调、水果或雨具的现实实测价格。'),
    swan_tariff: origin('关税与贸易不确定性','2025-04-16','WTO','Temporary tariff pause mitigates trade contraction, but strong downside risks persist','https://www.wto.org/english/news_e/news25_e/tfore_16apr25_e.htm','关税与政策不确定性导致当时贸易展望下调。','贸易预测不是全年实际结果或商品零售价；手机、名表与藏品方向为原创设计。'),
    swan_protection: origin('防护用品供给受扰','2020-03-03','WHO','Shortage of personal protective equipment endangering health workers worldwide','https://www.who.int/news/item/03-03-2020-shortage-of-personal-protective-equipment-endangering-health-workers-worldwide','防护用品供给受扰、需求上升，WHO呼吁增加生产。','虚构临时防护标准及常备需求，冲击非新闻实测幅度；不宣传囤积获利，不渲染伤亡。')
  });
  // Fail at catalog load, not after an invalid event enters a saved game.
  for (const e of H.events) for (const [id, effect] of Object.entries(e.effects)) {
    if (!H.products.some(p => p.id === id) || !['immediate','persist','structural'].includes(effect.kind) || !Number.isSafeInteger(effect.bps) || effect.bps <= -10000) throw Error('事件目录无效');
  }
  const personal = [
    ['rent','临时租住维护费',-18000],['repair','手机维修',-24000],['ill','看诊支出',-20000],
    ['fare','通勤补缴',-12000],['bonus','公司小奖金',25000],['repay','朋友归还借款',16000],
    ['gift','亲友红包',12000],['refund','账单退款',9000]
  ];
  H.events.push(...personal.map(r => ({id:r[0], type:'personal', title:r[1], situation:'生活的一点插曲，不改变商品行情。',
    description:'生活的一点插曲，不改变商品行情。', duration:1, cash:r[2], effects:{}, reliability:'reliable', fade:'none', weight:1})));
  H.reliability = {
    reliable:{name:'可靠消息', description:'已经发生的供应或需求变化，不保证下一周继续上涨或下跌'},
    normal:{name:'一般新闻', description:'事件仍在影响价格中枢，幅度不再另加一笔'}
  };
  H.moveSituation = '没有新的供应或需求事件。下面的百分比来自本周成交价，不是原因说明。';
  H.holdingSituation = '这是已发生的本周涨跌，不代表下周方向。';
  H.newsSituation = n => {
    if (!n) return '';
    if (n.kind === 'holding') return H.holdingSituation;
    if (n.id === 'move' && n.kind === 'headline') return H.moveSituation;
    const ev = H.events.find(e => e.id === n.id);
    return (ev && ev.situation) || '';
  };
  H.focusOrder = (s, list) => list.slice().sort((a, b) => {
    const qty = p => p.legacy ? s.legacy[p.id].qty : s.inventory[p.id].qty;
    const abs = p => Math.abs(H.changeBps(p.legacy ? s.legacy[p.id] : s.market[p.id]));
    const arrival = p => !p.legacy && s.onStreak && s.onStreak[p.id] === 1 ? 1 : 0;
    const held = (qty(b) > 0) - (qty(a) > 0);
    if (held) return held;
    const delta = abs(b) - abs(a);
    if (delta) return delta;
    const fresh = arrival(b) - arrival(a);
    if (fresh) return fresh;
    return (H.products.findIndex(p => p.id === a.id) - H.products.findIndex(p => p.id === b.id));
  });
  H.hintRules = Object.freeze({thresholdBps:1000, limit:2, flipProbability:.30});
  H.hintSources = Object.freeze({stall:'摊主闲谈',queue:'排队时听来的',street:'街坊传话'});
  H.defaultSettings = {autoSave:true, sound:true, music:true, animation:'normal', numberFormat:'decimal'};
  H.migrationConfirm = '迁入会清空尚未结束的旧市场事件，并清空本周旧新闻。货架会按新规则重排。此后同一种子不会再走出旧规则的未来路径。已退出商品价格冻结，只能回收出售。现金、持仓成本、历史和住房仓储价不会被改写。本地 v2 原键不会被覆盖，原文写入独立备份键。拒绝则不写新档。';
  H.upgradeConfirm = '本周已有账目与行情、历史、普通事件及结算保留，不重放冲击。迁移后未来采用新事件规则，同一种子不会沿旧规则继续。原 v3 和 v2 键不会被覆盖，原文另存独立备份；取消不写新档。';
  H.oldSaveNotice = '内测规则更新，旧档不兼容，请开始新游戏';
  H.replaceDamagedConfirm = '当前新档已隔离。这一步会替换损坏的 v6。请先导出损坏原文。确认替换？';
})(window);
