(function (g) {
  'use strict';
  const H = g.HomeYear = {};
  H.rules = {
    version: '0.12', saveVersion: 11, initialCash: 300000, capacity: 20, weeks: 52, fee: 0.01,
    buybackNumer: 92, buybackDenom: 100, onSale: 8, replaceMin: 2, replaceMax: 3, maxAbsence: 3,
    headlineMoveBps: 800, revertRate: 0.15
  };
  H.loanRules = Object.freeze({
    weeklyNumer: 20, weeklyDenom: 1000, maxPrincipal: 1200000, repayAmount: 100000,
    tiers: Object.freeze({'1000': 100000, '3000': 300000, '6000': 600000, '12000': 1200000})
  });
  H.lotteryRules = Object.freeze({
    price: 3000, cells: 9, matches: 3, maxRepeat: 2,
    symbols: Object.freeze([
      Object.freeze({id: 'empty', name: '空信封', prize: 0, weight: 546}),
      Object.freeze({id: 'egg', name: '鸡蛋', prize: 1200, weight: 280}),
      Object.freeze({id: 'red', name: '红包', prize: 4000, weight: 130}),
      Object.freeze({id: 'umbrella', name: '雨伞', prize: 15000, weight: 35}),
      Object.freeze({id: 'watch', name: '金表', prize: 60000, weight: 8}),
      Object.freeze({id: 'key', name: '房门钥匙', prize: 500000, weight: 1})
    ])
  });
  H.roleHalf = {daily: 0.08, industry: 0.14, spec: 0.20};
  H.persistCap = {daily: 3000, industry: 6000, spec: 8000};
  H.difficulties = {
    fantasy: {name: '顺风', tagline: '马斯克是如何练成的', blurb: '你就是气运之子。买到手的多半会涨。黑天鹅和市面涨跌，也多半顺着你。', initialCash: 2100000, pocket: 1600000, houseFactor: 1, warehouseFactor: 1, volatility: 1.5, risk: 0.7, hintFlip: 0, revertRate: 0.09, startWarehouse: 'large', luck: true},
    easy: {name: '轻松', tagline: '花园里的钥匙备好了', blurb: '街坊不说谎。房价更松，仍一周周悄悄长个儿。小河平稳，也好行船。', initialCash: 400000, houseFactor: 0.8, warehouseFactor: 0.8, volatility: 0.85, risk: 0.8, hintFlip: 0},
    standard: {name: '标准', tagline: '先把城里两居安下来', blurb: '街坊多半靠谱，偶尔说反。房价按着星期慢慢涨。贷款垫一周，见好就收。', initialCash: 300000, houseFactor: 1, warehouseFactor: 1, volatility: 1, risk: 1},
    challenge: {name: '挑战', tagline: '灯到最后还是房东的', blurb: '街坊可能说反话，房价也更冲。自己名下没有余钱，还倒欠着，能花的都是贷款。风浪越大鱼越贵。', initialCash: -300000, houseFactor: 1.25, warehouseFactor: 1.2, volatility: 1.15, risk: 1.25, startLoan: '6000'}
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
    {id:'studio', name:'老旧单间', price:420000, district:'旧街', description:'小，但房门属于自己。', icon:'⌂', ending:'有了自己的门'},
    {id:'flat', name:'普通公寓', price:580000, district:'近郊', description:'有阳台，也有新的生活。', icon:'⌂', ending:'小有成就'},
    {id:'two', name:'舒适两居', price:700000, district:'河岸', description:'客厅不再兼任仓库。', icon:'⌂', ending:'安居有余'},
    {id:'city', name:'城市住宅', price:1200000, district:'中心', description:'通勤与风景都更从容。', icon:'⌂', ending:'城市新贵'},
    {id:'dream', name:'理想之家', price:1900000, district:'花园', description:'终于有地方安放所有梦想。', icon:'⌂', ending:'理想成真'},
    {id:'townhouse', name:'市中心小洋楼', price:3600000, district:'梧桐街', description:'梧桐影落在自家的窗台上。', icon:'⌂', ending:'街角有自己的灯'},
    {id:'courtyard', name:'首都四合院', price:6200000, district:'旧城', description:'旧城的砖还在，门却是自己的。', icon:'⌂', ending:'一进院子，一片天'},
    {id:'island', name:'独立海岛', price:10800000, district:'外海', description:'四面潮水，屋子只这一间。', icon:'⌂', ending:'潮声代替闹钟'},
    {id:'mars', name:'火星定居舱', price:20000000, district:'同步轨道', description:'舷窗外是红尘，舱里留着这一年的灯。', icon:'⌂', ending:'下一颗行星的门'}
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
    },
    // 0.3 copies 0.2 for the original five houses and all warehouses. New houses use exact 0.8 / 1.25.
    '0.3': {
      easy: book({studio:520000, flat:800000, two:1120000, city:1520000, dream:2000000, townhouse:2880000, courtyard:4960000, island:8640000, mars:16000000}, {room:0, small:56000, normal:176000, large:400000}),
      standard: book({studio:650000, flat:1000000, two:1400000, city:1900000, dream:2500000, townhouse:3600000, courtyard:6200000, island:10800000, mars:20000000}, {room:0, small:70000, normal:220000, large:500000}),
      challenge: book({studio:812500, flat:1250000, two:1750000, city:2375000, dream:3125000, townhouse:4500000, courtyard:7750000, island:13500000, mars:25000000}, {room:0, small:84000, normal:264000, large:600000})
    },
    // 0.4 lowers standard 1–5. Easy 1–5 stay at 0.3. Challenge 1–5 = standard × 1.25. 6–9 and warehouses copy 0.3.
    '0.4': {
      easy: book({studio:520000, flat:800000, two:1120000, city:1520000, dream:2000000, townhouse:2880000, courtyard:4960000, island:8640000, mars:16000000}, {room:0, small:56000, normal:176000, large:400000}),
      standard: book({studio:420000, flat:580000, two:700000, city:1200000, dream:1900000, townhouse:3600000, courtyard:6200000, island:10800000, mars:20000000}, {room:0, small:70000, normal:220000, large:500000}),
      challenge: book({studio:525000, flat:725000, two:875000, city:1500000, dream:2375000, townhouse:4500000, courtyard:7750000, island:13500000, mars:25000000}, {room:0, small:84000, normal:264000, large:600000}),
      fantasy: book({studio:420000, flat:580000, two:700000, city:1200000, dream:1900000, townhouse:3600000, courtyard:6200000, island:10800000, mars:20000000}, {room:0, small:70000, normal:220000, large:500000})
    }
  };
  for (const d of ['easy', 'standard', 'challenge']) {
    for (const id of ['studio', 'flat', 'two', 'city', 'dream']) {
      if (H.priceBooks['0.3'][d].houses[id] !== H.priceBooks['0.2'][d].houses[id]) throw Error('价格簿抄录错误');
    }
    for (const id of Object.keys(H.priceBooks['0.2'][d].warehouses)) {
      if (H.priceBooks['0.3'][d].warehouses[id] !== H.priceBooks['0.2'][d].warehouses[id]) throw Error('价格簿抄录错误');
      if (H.priceBooks['0.4'][d].warehouses[id] !== H.priceBooks['0.3'][d].warehouses[id]) throw Error('价格簿抄录错误');
    }
    for (const id of ['townhouse', 'courtyard', 'island', 'mars']) {
      if (H.priceBooks['0.4'][d].houses[id] !== H.priceBooks['0.3'][d].houses[id]) throw Error('更远处房价被改动');
    }
  }
  for (const id of ['studio', 'flat', 'two', 'city', 'dream']) {
    if (H.priceBooks['0.4'].easy.houses[id] !== H.priceBooks['0.3'].easy.houses[id]) throw Error('轻松档城里房价被改动');
    if (H.priceBooks['0.4'].challenge.houses[id] !== H.priceBooks['0.4'].standard.houses[id] * 125 / 100) throw Error('挑战档房价不是标准的 1.25 倍');
  }
  for (const h of H.houses) {
    if (h.price !== H.priceBooks['0.4'].standard.houses[h.id]) throw Error('住房目录与标准价格簿不一致');
  }
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
  H.swanRules = Object.freeze({probability: .42, firstWeek: 4, lastWeek: 50, gap: 4, limit: 8});
  const swans = [
    ['swan_route','主航道临时封航，进口柜台等不到货','在途货物延迟已经发生，进口耐用品供给收紧。本周变化以成交价为准。',3,['phone'],null,{phone:fx('persist',18000),gpu:fx('persist',12000),ac:fx('persist',10000)}],
    ['swan_efficiency','新算法落地，旧算力订单突然撤回','效率突破已改变旧硬件订单预期，部分订单已经撤回。本周变化以成交价为准。',1,['gpu'],null,{gpu:fx('immediate',-7000),phone:fx('immediate',-4500)}],
    ['swan_egg_short','多地蛋场临时停供，批发柜台告急','蛋品供给骤紧已经发生，常备主食的替代需求也有变化。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',20000),rice:fx('immediate',5000)}],
    ['swan_heat','异常热浪提前压城，制冷货源吃紧','热旱天气已牵动制冷、农产和雨具需求。本周变化以成交价为准。',3,['ac'],'夏',{ac:fx('persist',22000),fruit:fx('persist',7000),umbrella:fx('persist',-4500)}],
    ['swan_tariff','进口新规突然生效，柜台成本与消费预期分化','进口成本和可选消费预期已经分化，各商品可能有不同方向。本周变化以成交价为准。',2,['phone','collectible'],null,{phone:fx('persist',15000),watch:fx('persist',-6500),collectible:fx('persist',-7000)}],
    ['swan_protection','防护标准临时升级，常备用品突然紧俏','临时防护标准已经升级，常备用品需求挤压供给。本周变化以成交价为准。',1,['mask'],null,{mask:fx('immediate',40000),rice:fx('immediate',8000),eggs:fx('immediate',6000)}],
    ['swan_egg_relief','加急蛋品到货，短缺预期迅速消退','到货与需求降温已缓解短缺预期，并非此前事件的定时后续。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',-7000),rice:fx('immediate',-3500)}],
    ['swan_export','先进芯片出口许可收紧，显卡柜台断档','部分先进计算与半导体制造物项的出口管制已经加码，货源收紧。本周变化以成交价为准。',2,['gpu'],null,{gpu:fx('persist',16000),phone:fx('persist',8000)}],
    ['swan_redsea','红海航线遇袭，手机和名表改走远路','红海商船遇袭已经发生，部分进口货改道。本周变化以成交价为准。',2,['phone'],null,{phone:fx('persist',10000),watch:fx('persist',8000)}],
    ['swan_gas','寒冬气源告急，冬衣柜台被提前搬空','天然气供应缺口的风险已经写进公开报告，取暖季的冬衣需求被提前拉高。本周变化以成交价为准。',3,['coat'],'冬',{coat:fx('persist',16000)}],
    ['swan_nino','厄尔尼诺已经形成，果园和稻田一起紧张','热带太平洋的厄尔尼诺条件已经宣布，天气扰动牵动水果和大米。本周变化以成交价为准。',3,['fruit'],null,{fruit:fx('persist',9000),rice:fx('persist',5000)}],
    ['swan_grain','黑海粮食船重新出海，米价预期松了一截','黑海粮食出口恢复的协议已经宣布。这不是任何短缺事件的定时后续。本周变化以成交价为准。',1,['rice'],null,{rice:fx('immediate',-7000),pork:fx('immediate',-3500)}],
    ['swan_meat','猪价冲上公开指数的高位，屠宰柜台抬价','猪价冲高已经记入当月食品价格指数。大米不在这场冲击里。本周变化以成交价为准。',1,['pork'],null,{pork:fx('immediate',16000)}],
    ['swan_rates','政策利率上调落地，橱窗里的奢侈品先冷却','政策利率目标区间上调已经公布。奢侈品回落是本城映射，不是利率本身。本周变化以成交价为准。',1,['watch'],null,{watch:fx('immediate',-8000),collectible:fx('immediate',-9000)}],
    ['swan_bank','一家科技银行突然关门，风险偏好当周收缩','银行已被关闭并指定接管人。藏品和显卡的回落只是本城情绪映射。本周变化以成交价为准。',1,['collectible'],null,{collectible:fx('immediate',-9500),gpu:fx('immediate',-5000)}],
    ['swan_unbox','开箱视频把新机说成必须第一天拿到手','全面屏新机开售那周，开箱视频已经铺满视频网站。本周变化以成交价为准。',1,['phone'],null,{phone:fx('immediate',12000)}],
    ['swan_recall','一批新机被通报有起火隐患，柜台立刻凉了','官方召回已经公布。本周变化以成交价为准。',1,['phone'],null,{phone:fx('immediate',-6000)}],
    ['swan_mining','显卡被拿去挖矿，货架上长期没卡','显卡被拿去挖矿，玩家长期买不到新卡。本周变化以成交价为准。',2,['gpu'],null,{gpu:fx('persist',14000)}],
    ['swan_dump','矿卡失去用途，二手卡涌进市场','挖矿需求退潮，二手矿卡已经涌进市场。本周变化以成交价为准。',1,['gpu'],null,{gpu:fx('immediate',-6000)}],
    ['swan_instaegg','一枚鸡蛋的照片盖过了名人帖','一张鸡蛋照片的点赞已经超过当时的名人帖。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',14000)}],
    ['swan_rumoregg','「假鸡蛋」图片传开，蛋筐暂时没人碰','假鸡蛋图片已经在传。公开说明那些图片不能证明市面上的蛋是假的，但观望已经发生。本周变化以成交价为准。',1,['eggs'],null,{eggs:fx('immediate',-5500)}],
    ['swan_mukbang','吃播一个人吃完整桌肉，肉柜跟着热','吃播已经把整桌肉吃进镜头。本周变化以成交价为准。',1,['pork'],null,{pork:fx('immediate',12000)}],
    ['swan_veganuary','一月吃素的活动又开始了，肉柜冷清','一月吃素的活动已经重新变热。本周变化以成交价为准。',1,['pork'],null,{pork:fx('immediate',-5000)}],
    ['swan_tanghulu','糖葫芦视频把水果摊围了起来','糖壳水果的做法已经被大量翻拍。本周变化以成交价为准。',2,['fruit'],null,{fruit:fx('persist',8000)}],
    ['swan_avocado','牛油果吐司被说成乱花钱，水果摊被笑话','那句把买不起房怪到牛油果吐司上的话已经传开。本周变化以成交价为准。',1,['fruit'],null,{fruit:fx('immediate',-4500)}],
    ['swan_salmonrice','剩饭拌鱼的视频被照着做，米袋脱销','隔夜米饭拌剩鱼的做法已经被大量照着做。本周变化以成交价为准。',1,['rice'],null,{rice:fx('immediate',8000)}],
    ['swan_keto','不吃主食的吃法走红，米饭被说成负担','几乎不吃主食的吃法已经走红。本周变化以成交价为准。',1,['rice'],null,{rice:fx('immediate',-4000)}],
    ['swan_puffer','圆标羽绒服成为冬天的队，柜台被围住','圆标厚羽绒服已经变成这个冬天显眼的行头。本周变化以成交价为准。',2,['coat'],'冬',{coat:fx('persist',12000)}],
    ['swan_ugly','圆标羽绒服被笑土，这批衣不好出手','圆标羽绒服被嘲笑土、贵的说法已经传开。本周变化以成交价为准。',1,['coat'],null,{coat:fx('immediate',-5000)}],
    ['swan_fans','热浪里风扇被搬空，制冷柜跟着紧','热浪期间风扇被买空的消息已经传开。本周变化以成交价为准。',2,['ac'],'夏',{ac:fx('persist',10000)}],
    ['swan_leak','外机悬挂的视频看多了，装空调的人犹豫','空调外机悬挂、坠落的短视频已经看过很多。本周变化以成交价为准。',1,['ac'],null,{ac:fx('immediate',-5500)}],
    ['swan_film','动画里的透明伞被模仿，雨具柜台变忙','透明伞和暴雨的画面已经被大量模仿。本周变化以成交价为准。',1,['umbrella'],null,{umbrella:fx('immediate',9000)}],
    ['swan_mangkhut','台风里的伞被吹翻，轻便伞一时卖不动','台风把街上的伞吹翻的视频已经传开。本周变化以成交价为准。',2,['umbrella'],null,{umbrella:fx('persist',-4000)}],
    ['swan_blindbox','长牙小怪物的隐藏款挂满了包','长牙小怪物的盲盒已经挂满包带。本周变化以成交价为准。',1,['collectible'],null,{collectible:fx('immediate',12000)}],
    ['swan_emptybox','拆出一堆重复款，藏品摊冷了下来','重复普通款和「像赌博」的批评已经让藏品摊冷下来。本周变化以成交价为准。',1,['collectible'],null,{collectible:fx('immediate',-6000)}],
    ['swan_steel','钢款运动表被炒出配货队','钢款运动表在二级市场被炒高的讨论已经铺开。本周变化以成交价为准。',1,['watch'],null,{watch:fx('immediate',7000)}],
    ['swan_fakewatch','鉴定直播拆穿高仿表，名表柜台安静了','当众拆开高仿名表的鉴定直播已经很常见。本周变化以成交价为准。',1,['watch'],null,{watch:fx('immediate',-5500)}],
    ['swan_runway','口罩被当成穿搭，防护柜台变时装店','带设计的口罩已经被当成穿搭。本周变化以成交价为准。',1,['mask'],null,{mask:fx('immediate',15000)}],
    ['swan_maskne','「口罩痘」传开，罩被留在家里','「口罩痘」的说法已经传开。本周变化以成交价为准。',1,['mask'],null,{mask:fx('immediate',-4500)}],
    ['swan_bundle','社区群接龙把米和肉捆成套餐','社区团购已经把米和肉捆成补贴套餐。本周变化以成交价为准。',1,['rice'],null,{rice:fx('immediate',6000),pork:fx('immediate',8000)}],
    ['swan_station','团购补贴退了，自提点堆着没人取的货','社区团购补贴退潮，自提点的货已经堆住。本周变化以成交价为准。',1,['pork'],null,{rice:fx('immediate',-4000),pork:fx('immediate',-5000)}],
    ['swan_charm','手机挂件和包上的玩偶一起走红','手机链和挂在包上的玩偶已经一起走红。本周变化以成交价为准。',1,['collectible'],null,{collectible:fx('immediate',7000),phone:fx('immediate',5000)}],
    ['swan_blackout','大社交网络突然从互联网上消失','这家社交网络当天从互联网上消失。本周变化以成交价为准。',1,['gpu'],null,{gpu:fx('immediate',-4500),phone:fx('immediate',-4000),watch:fx('immediate',-3500)}],
    ['swan_haul','「买了一大堆」的开箱里堆满表和藏品','堆满手表和收藏品的开箱视频已经是固定类型。本周变化以成交价为准。',1,['watch'],null,{watch:fx('immediate',6500),collectible:fx('immediate',8000)}],
    ['swan_spinner','指尖陀螺从小摊转到每个人手里','指尖陀螺已经从小摊转到办公室。本周变化以成交价为准。',1,['collectible'],null,{collectible:fx('immediate',9000)}]
  ];
  H.events.push(...swans.map(r => ({id:r[0], type:'market', tier:'swan', title:r[1], situation:r[2], description:r[2],
    duration:r[3], primaryProducts:r[4], season:r[5], effects:r[6], fade:'none', reliability:'reliable', weight:1})));
  // Built-in factual summaries only: no network requests during offline play.
  const origin = (name, date, agency, title, url, facts, adaptation) => Object.freeze({kind:'verified', name, date, agency, title, url, facts, adaptation});
  const buzz = (name, date, facts, adaptation) => Object.freeze({kind:'original', name, date, agency:'当年的公开热度', title:name, url:'', facts, adaptation});
  const eggURL = 'https://ers.usda.gov/data-products/charts-of-note/112677';
  H.swanOrigins = Object.freeze({
    swan_route: origin('苏伊士运河 Ever Given 堵塞','2021-03-23—04-01','IMO','MV Ever Given incident – 23 March 2021','https://www.imo.org/en/MediaCentre/SecretaryGeneral/Pages/MV-Ever-Given-incident.aspx','3月23日事故导致航道临时关闭；4月1日声明记录恢复通行。','进口耐用品延迟及游戏商品变化为原创映射，不是新闻实测零售价或固定恢复倒计时。'),
    swan_efficiency: origin('DeepSeek 引发技术股重估','2025-01-27','Reuters（Kitco 转刊）',"Nasdaq, S&P 500 drop as China's DeepSeek AI model hits tech shares",'https://www.kitco.com/news/off-the-wire/2025-01-27/nasdaq-sp-500-drop-chinas-deepseek-ai-model-hits-tech-shares','报道低成本模型引发算力需求预期重估及科技股下跌，并非算法效率已经获现实验证。','股票跌幅不等于显卡零售价；订单撤回与手机联动均是虚构城市设定。'),
    swan_egg_short: origin('禽流感与蛋品供应收紧','2024-10—2025-03','USDA ERS','Retail egg prices fall, following declining wholesale prices',eggURL,'2024年10月至2025年3月蛋鸡数量减少，蛋品供应偏紧。','蛋场临时停供、大米替代需求和冲击幅度为游戏原创，不保证与缓解事件配对。'),
    swan_egg_relief: origin('需求降温与批发蛋价回落','2025-03—04','USDA ERS','Retail egg prices fall, following declining wholesale prices',eggURL,'需求降温与新增禽流感病例暂停伴随批发价回落，零售价调整滞后；不是产能已恢复。','加急到货和大米联动是原创；不是先涨后跌的定时后续，不保证反弹或配对。'),
    swan_heat: origin('欧洲极端高温','2025-06—07','WMO','Extreme heat grips Europe','https://wmo.int/media/news/extreme-heat-grips-europe','欧洲多地出现极端高温与热浪。','制冷、农产与热旱雨具需求映射是原创，不证明空调、水果或雨具的现实实测价格。'),
    swan_tariff: origin('关税与贸易不确定性','2025-04-16','WTO','Temporary tariff pause mitigates trade contraction, but strong downside risks persist','https://www.wto.org/english/news_e/news25_e/tfore_16apr25_e.htm','关税与政策不确定性导致当时贸易展望下调。','贸易预测不是全年实际结果或商品零售价；手机、名表与藏品方向为原创设计。'),
    swan_protection: origin('防护用品供给受扰','2020-03-03','WHO','Shortage of personal protective equipment endangering health workers worldwide','https://www.who.int/news/item/03-03-2020-shortage-of-personal-protective-equipment-endangering-health-workers-worldwide','防护用品供给受扰、需求上升，WHO呼吁增加生产。','虚构临时防护标准及常备需求，冲击非新闻实测幅度；不宣传囤积获利，不渲染伤亡。'),
    swan_export: origin('先进计算与半导体出口管制','2022-10-13','《联邦公报》（govinfo）','Implementation of Additional Export Controls: Certain Advanced Computing and Semiconductor Manufacturing Items; Supercomputer and Semiconductor End Use; Entity List Modification; Interim Final Rule','https://www.govinfo.gov/content/pkg/FR-2022-10-13/html/2022-21658.htm','2022年10月13日《联邦公报》第87卷第197期刊登临时最终规则，对部分先进计算和半导体制造物项、超级计算机与半导体最终用途加严出口管制，并调整实体清单。','显卡与手机的涨幅是虚构供给映射，不是公报里的价格或配额，也不构成买卖建议。'),
    swan_redsea: origin('安理会谴责红海航运袭击','2024-01-10','联合国新闻','Security Council strongly condemns Houthi attacks on Red Sea shipping','https://news.un.org/en/story/2024/01/1145382','2024年1月10日，安理会通过决议，以最强烈措辞谴责胡塞武装在红海沿岸对商船的多次袭击。','手机与名表涨幅是虚构改道映射，不是决议里的运价或零售价。不描写伤亡，也不与运河搁浅事件绑成一对。'),
    swan_gas: origin('欧盟如何避免天然气短缺','2022-12-12','IEA','How the European Union can avoid natural gas shortages in 2023','https://www.iea.org/news/how-the-european-union-can-avoid-natural-gas-shortages-in-2023','2022年12月12日IEA报告指出，若俄罗斯管道气降至零，欧盟2023年可能面临近300亿立方米的天然气供需缺口，并列出缩小缺口的行动。','羽绒服涨幅是虚构的取暖季映射，不是报告里的气价、缺口立方米数或服装零售价。'),
    swan_nino: origin('世界气象组织宣布厄尔尼诺开始','2023-07-04','WMO','World Meteorological Organization declares onset of El Niño conditions','https://wmo.int/media/news/world-meteorological-organization-declares-onset-of-el-nino-conditions','2023年7月4日WMO宣布，热带太平洋时隔七年再次形成厄尔尼诺，并可能推高全球温度、扰乱天气与气候型态。','水果与大米涨幅是虚构农产映射，不是公报里的气温或零售价。'),
    swan_grain: origin('黑海粮食出口协议','2022-07-22','联合国新闻','Black Sea grain exports deal ‘a beacon of hope’ amid Ukraine war - Guterres','https://news.un.org/en/story/2022/07/1123062','2022年7月22日，联合国新闻称一项前所未有的协议使乌克兰粮食得以经黑海恢复出口。','大米与猪肉的跌幅是虚构供给缓解映射，不是协议里的粮价，也不与任何短缺事件配对。不写伤亡，不构成买卖建议。'),
    swan_meat: origin('粮农组织食品价格指数三月跃升','2022-04-08','FAO','FAO Food Price Index posts significant leap in March','https://www.fao.org/newsroom/detail/fao-food-price-index-posts-significant-leap-in-march/en','页面 CreatedOn 为2022-04-08。正文称2022年3月世界食品商品价格大幅跃升；肉类价格指数当月上涨4.8%并创纪录，西欧屠宰猪短缺推动猪肉价格。同期大米价格指数几乎没有变化。','游戏只抬猪肉，幅度是虚构映射，不是指数里的4.8%，也不把几乎没变的大米写成同向冲击。'),
    swan_rates: origin('美联储公开市场委员会声明','2022-09-21','美联储','Federal Reserve issues FOMC statement','https://www.federalreserve.gov/newsevents/pressreleases/monetary20220921a.htm','2022年9月21日FOMC声明将联邦基金利率目标区间上调至3%至3.25%。','名表与藏品跌幅是虚构消费冷却映射，不是利率变动的幅度，也不是对后市的预测。'),
    swan_bank: origin('FDIC接管硅谷银行受保存款人','2023-03-10','FDIC','FDIC Creates a Deposit Insurance National Bank of Santa Clara to Protect Insured Depositors of Silicon Valley Bank, Santa Clara, California','https://www.fdic.gov/news/press-releases/2023/pr23016.html','2023年3月10日，加州金融保护与创新局关闭位于圣克拉拉的硅谷银行，并指定FDIC为接管人，以保护受保存款人。','藏品与显卡跌幅是虚构风险偏好映射，不是存款保险范围，也不是买卖建议。'),
    swan_unbox: buzz('全面屏新机开箱周','2017-11','2017年11月，全面屏新机开售那周，开箱视频铺满视频网站，第一天拿到手本身成了节目。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_recall: origin('三星 Galaxy Note7 召回','2016-09-15','CPSC','Samsung Recalls Galaxy Note7 Smartphones Due to Serious Fire and Burn Hazards','https://www.cpsc.gov/Recalls/2016/Samsung-Recalls-Galaxy-Note7-Smartphones','2016年9月15日，美国消费品安全委员会公布召回：约100万部 Galaxy Note7 因严重起火和烫伤风险，可以退款或更换。','手机跌幅是强行对应到本城柜台的虚构映射，不是召回数量，也不渲染受伤。'),
    swan_mining: buzz('显卡挖矿短缺','2020—2021','2020年到2021年，显卡被拿去挖矿，玩家长期买不到新卡。这是当时科技讨论里最响的牢骚之一。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_dump: buzz('以太坊停止靠显卡挖矿','2022-09-15','2022年9月15日，以太坊改成权益证明，不再靠显卡挖矿。矿卡失去用途后，二手卡涌进市场。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_instaegg: buzz('一枚鸡蛋的点赞记录','2019-01','2019年1月，一张鸡蛋的照片在社交网站上超过了当时点赞最高的名人帖，变成全球笑话。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_rumoregg: buzz('人造鸡蛋图片','2017','2017年前后，中文社交网络反复流传「人造鸡蛋」的图片。公开说明那些图片不能证明市面上的蛋是假的，但慌张已经让一些人暂时不敢买。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。不把谣言写成事实。'),
    swan_mukbang: buzz('吃播','2010年代中后期','韩国的吃播在2010年代中后期传到全球视频网站。一个人吃掉整桌肉的节目成为固定类型。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_veganuary: buzz('一月吃素','2010年代末—2020年代初','英国有一项从一月开始吃素一个月的公开活动。2010年代末到2020年代初，它每年都会重新变热，肉被说成这个月该放下的东西。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_tanghulu: buzz('糖葫芦短视频','2023','2023年，把葡萄、草莓裹上糖壳串成糖葫芦的视频在短视频平台上大量翻拍。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_avocado: buzz('牛油果吐司笑话','2017-05','2017年5月，澳洲开发商蒂姆·古纳在采访里说，年轻人买不起房，是因为钱花在牛油果吐司上。这句话变成全球嘲讽。','姓名是替换过的相近假名。价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_salmonrice: buzz('隔夜米饭拌剩鱼','2021','2021年，短视频作者埃玛丽把隔夜米饭、剩三文鱼、酱油、蛋黄酱和海苔拌在一起。那条视频被大量照着做。','姓名是替换过的相近假名。价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_keto: buzz('几乎不吃主食','2010年代末','2010年代末，「几乎不吃主食」的饮食法在英文互联网上很红，米饭被写成该躲开的东西。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_puffer: buzz('圆标羽绒服','2010年代中后期','2010年代中后期，带圆标的厚羽绒服在中国城市的冬天变成显眼的行头，店门口会排起试穿的队。人们叫它「大鹅」。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_ugly: buzz('圆标被笑土','2010年代末','圆标羽绒服穿的人多了以后，中文互联网开始嘲笑那个大标志土、贵。热度从炫耀转成躲着走。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_fans: buzz('热浪里的风扇','2022-07','2022年7月英国热浪期间，风扇和移动制冷设备被报道买空。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_leak: buzz('悬挂的空调外机','短视频常驻类型','中文短视频里长期有一类高播放：空调外机挂在防盗窗上，或用绳子吊着。看过坠落片段的人会犹豫要不要装。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_film: buzz('透明伞与暴雨动画','2019-07-19','2019年7月19日，新海成的《天气之子》在日本上映。透明伞和暴雨的画面被大量模仿。','姓名是替换过的相近假名。价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_mangkhut: buzz('台风山竹里的伞','2018-09','2018年9月台风山竹过境时，街上雨伞被吹翻的视频传得很广。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。轻便伞卖不动是强行对应，片子本身只显示伞被吹坏。'),
    swan_blindbox: buzz('长牙小怪物盲盒','2024','香港画师龙家声画的长牙小怪物被做成盲盒。2024年人们把玩偶挂在包上，隐藏款的讨论占满社交平台。','姓名是替换过的相近假名。价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_emptybox: buzz('拆到重复款','盲盒热期间','盲盒热起来以后，重复的普通款和「像赌博」的批评一直跟着。买到不想要的那款时，二手摊会冷一截。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_steel: buzz('钢款运动表配货','2021—2022','2021年到2022年，钢款运动表在二级市场被炒到明显高于专柜价，排队和配货成了手表圈的日常话题。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。游戏涨幅不是二级市场溢价。'),
    swan_fakewatch: buzz('拆穿高仿表的直播','约2020起','大约从2020年起，中文短视频里当众拆开高仿名表的鉴定直播非常常见。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_runway: buzz('口罩变成穿搭','2020','2020年口罩成为日常以后，带标志和设计感的口罩被当成穿搭，时装店也卖起了装饰口罩。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_maskne: buzz('口罩痘','2020','2020年，「口罩痘」这个说法在护肤讨论里传开。闷出痘的人开始能不戴就不戴。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。不构成护肤建议。'),
    swan_bundle: buzz('社区团购','2020','2020年，社区团购在中国迅速做大。平台用补贴把米和肉捆成很便宜的套餐，邻居在群里接龙。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_station: buzz('社区团购退潮','2021','2021年补贴退潮，多家社区团购收缩。自提点没人取的菜和肉被拍下来，变成团购退了的证据。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_charm: buzz('手机链和包挂玩偶','2024—2025','2024年到2025年，手机链、串珠挂绳，以及把玩偶挂在手机和包上，在东亚街头非常显眼。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_blackout: origin('脸书网络从互联网上消失','2021-10-04','Cloudflare','Understanding how Facebook disappeared from the Internet','https://blog.cloudflare.com/october-2021-facebook-outage/','2021年10月4日，Cloudflare 记录到脸书网络的流量消失，并说明当天这家网络从互联网上消失。','手机、显卡和名表的回落是强行对应，不是这篇记录里的流量，也不是零售价。'),
    swan_haul: buzz('买了一大堆的开箱','2019—2021','2019年到2021年，「买了一大堆」的开箱视频在视频网站上是固定类型，手表和收藏品经常被堆在镜头前。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。'),
    swan_spinner: buzz('指尖陀螺','2017','2017年，指尖陀螺从校园传到办公室，小摊上的塑料陀螺一度被抢购。','价格是强行对应到本城货架上的货，不是当年的实测零售价或带货数据。')
  });
  H.housingRules = Object.freeze({probability:.12, firstWeek:6, lastWeek:46, gap:8, limit:3});
  H.housingEvents = Object.freeze([
    Object.freeze({id:'housing_stimulus', title:'金融柜台贴出了支持房产的新告示', situation:'降准、降息和对房地产的金融支持已经宣布。本城房价已按这场消息重估，不是公报里的数字。', numer:108, denom:100}),
    Object.freeze({id:'housing_first', title:'房贷柜台改了套数认定的口径', situation:'认房不认贷的口径已经落地。本城房价跟着这场已经发生的调整重估，不是文件开出的报价。', numer:105, denom:100}),
    Object.freeze({id:'housing_default', title:'远方房企被标成限制性违约', situation:'评级下调已经公布，本城房价只计入预期冲击。这不是买卖建议，也不讨论断供。', numer:92, denom:100}),
    Object.freeze({id:'housing_index', title:'统计公报写下了七十城房价', situation:'七十个大中城市商品住宅价格公报已经发布。本城这笔跌幅不是公报上的实测数字。', numer:94, denom:100})
  ]);
  H.housingOrigins = Object.freeze({
    housing_stimulus: origin('国新办金融支持发布会','2024-09-24','新华社（中国政府网）','稳预期稳信心 多项金融政策齐发力支持经济高质量发展','https://www.gov.cn/zhengce/202409/content_6976242.htm','2024-09-24国新办发布会上，中国人民银行宣布下调存款准备金率0.5个百分点，并把7天期逆回购操作利率从1.7%下调到1.5%；同时宣布降低存量房贷利率、统一房贷最低首付比例等房地产金融支持。','游戏涨幅是虚构的城市房价映射，不是这场发布会的实测房价或政策报价。'),
    housing_first: origin('优化住房套数认定','2023-08-18','住房城乡建设部、中国人民银行、金融监管总局','住房城乡建设部 中国人民银行 金融监管总局关于优化个人住房贷款中住房套数认定标准的通知','https://www.gov.cn/zhengce/zhengceku/202308/content_6900164.htm','建房〔2023〕52号成文日期为2023年8月18日。居民家庭在当地名下无成套住房的，不论是否已利用贷款购买过住房，按首套住房信贷政策执行。不是未核实的8月30日。','认房不认贷只说明套数口径。游戏涨幅是原创映射，不是通知里的房价。'),
    housing_default: origin('惠誉将恒大、恒大地产与天基降至限制性违约','2021-12-09','The National（转述惠誉）','Fitch downgrades Evergrande and declares developer in default as restructuring looms','https://www.thenationalnews.com/business/2021/12/09/fitch-downgrades-evergrande-and-declares-developer-in-default-as-restructuring-looms/','2021-12-09报道：惠誉把中国恒大集团及其子公司恒大地产、天基控股降至限制性违约（restricted default）。天基债券宽限期于12月6日届满，评级行动见诸当周声明。','只把预期冲击映射为本城虚构跌幅，不是投资建议，不引导断供，也不等于任何房价实测。'),
    housing_index: origin('70个大中城市商品住宅销售价格','2026-08（2026-09-15发布）','国家统计局','2026年8月份70个大中城市商品住宅销售价格变动情况','https://www.stats.gov.cn/sj/zxfb/202609/t20260915_1965304.html','2026-09-15发布的2026年8月指数表，上月=100。新建商品住宅北京环比99.8、上海环比100.4，不是单一全国跌幅。','游戏里的下跌是原创映射，不是这份月报的实测跌幅。')
  });
  // Fail at catalog load, not after an invalid event enters a saved game.
  for (const e of H.events) for (const [id, effect] of Object.entries(e.effects)) {
    if (!H.products.some(p => p.id === id) || !['immediate','persist','structural'].includes(effect.kind) || !Number.isSafeInteger(effect.bps) || effect.bps <= -10000) throw Error('事件目录无效');
  }
  for (const e of H.events) if (e.tier === 'swan' && !H.swanOrigins[e.id]) throw Error('黑天鹅缺少出处');
  for (const [id, o] of Object.entries(H.swanOrigins)) {
    if (!H.events.some(e => e.id === id && e.tier === 'swan')) throw Error('出处没有事件');
    if (o.kind === 'verified') { if (typeof o.url !== 'string' || !/^https:\/\//.test(o.url)) throw Error('核实出处缺少链接'); }
    else if (o.kind === 'original') { if (o.url !== '') throw Error('热度原型不能带外链'); }
    else throw Error('出处类型无效');
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
    if (n.kind === 'housing') {
      const housing = H.housingEvents.find(e => e.id === n.id);
      return (housing && housing.situation) || '';
    }
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
  H.replaceDamagedConfirm = '当前新档已隔离。这一步会替换损坏的 v11。请先导出损坏原文。确认替换？';
})(window);
