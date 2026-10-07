(function (H) {
  'use strict';
  function object(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(label + '必须是对象');
  }
  function keys(value, expected, label) {
    object(value, label);
    const actual = Object.keys(value);
    if (actual.length !== expected.length || expected.some(k => !Object.prototype.hasOwnProperty.call(value, k))) throw Error(label + '字段缺失或未知');
  }
  function finite(n, min, max, label) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw Error(label + '无效');
  }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
  }
  function channelFloor(minPrice) {
    return Math.min(minPrice, H.buybackQuote(minPrice));
  }
  H.channelMin = () => Math.min(...H.heldProducts().map(p => channelFloor(p.min)));
  H.validateSettings = settings => {
    keys(settings, Object.keys(H.defaultSettings), '设置');
    for (const key of ['autoSave', 'sound', 'music']) if (typeof settings[key] !== 'boolean') throw Error('设置类型错误');
    if (!['normal', 'reduced', 'off'].includes(settings.animation) || !['decimal', 'compact'].includes(settings.numberFormat)) throw Error('设置值无效');
  };
  function quoteRow(p, m, week) {
    H.int(m.price, p.min, p.max); H.int(m.previous, p.min, p.max);
    finite(m.trend, -1, 1, '趋势');
    H.int(m.low, p.min, m.price); H.int(m.high, m.price, p.max);
    if (!Array.isArray(m.history) || m.history.length !== Math.min(week, 12)) throw Error('行情历史长度无效');
    m.history.forEach(v => H.int(v, m.low, m.high));
    if (m.history[m.history.length - 1] !== m.price || (week > 1 && m.history[m.history.length - 2] !== m.previous)) throw Error('行情历史与当前价不一致');
    if (week === 1 && m.previous !== m.price) throw Error('初周前价无效');
  }
  H.validate = function (s) {
    keys(s, ['version', 'rulesVersion', 'seed', 'difficulty', 'calendarStartWeek', 'week', 'cash', 'capacity', 'warehouse', 'revision', 'status', 'house', 'result',
      'rng', 'inventory', 'market', 'activeEvents', 'macro', 'season', 'personal', 'personalEvent', 'news', 'rumors', 'history', 'stats',
      'listing', 'absence', 'onStreak', 'legacy', 'migration', 'upgrade', 'swanLog', 'housingLog', 'purchases', 'houseBasis', 'priceBook', 'loan'].concat(Object.prototype.hasOwnProperty.call(s, 'auction') ? ['auction'] : []), '存档');
    if (s.version !== H.rules.saveVersion || s.rulesVersion !== H.rules.version) throw Error('存档版本不兼容（不支持旧版或未来版本）');
    if (typeof s.seed !== 'string' || !s.seed.length || s.seed.length > 128) throw Error('种子无效');
    if (!Object.prototype.hasOwnProperty.call(H.difficulties, s.difficulty)) throw Error('难度无效');
    H.int(s.calendarStartWeek, 1, 52);
    if (s.calendarStartWeek !== H.calendarStart(s.seed)) throw Error('日历起点与种子不一致');
    if (s.migration !== null || s.upgrade !== null) throw Error(H.oldSaveNotice);
    H.int(s.week, 1, 52); H.int(s.cash); H.int(s.revision);
    const warehouse = H.warehouses.find(w => w.id === s.warehouse);
    if (!warehouse || s.capacity !== warehouse.capacity) throw Error('仓储等级与容量不一致');
    if (s.house !== null && !H.houses.some(h => h.id === s.house)) throw Error('住房无效');
    if (!['playing', 'rebuy', 'ended'].includes(s.status)) throw Error('状态无效');
    if (s.status !== 'ended' && s.result !== null) throw Error('未结束状态不能有结算');
    if (s.status !== 'playing' && s.week !== 52) throw Error('结算周无效');
    const auction = s.auction;
    if (Object.prototype.hasOwnProperty.call(s, 'auction')) {
      keys(auction, ['houseId', 'proceeds', 'purchaseCount', 'cashBefore', 'principalBefore', 'interestBefore'], '拍卖记录');
      if (s.week !== 52 || s.status === 'playing' || !H.houses.some(h => h.id === auction.houseId)) throw Error('拍卖状态无效');
      H.int(auction.purchaseCount, 1, H.houses.length);
      H.int(auction.cashBefore); H.int(auction.proceeds);
      H.int(auction.principalBefore, 1, H.loanRules.maxPrincipal); H.int(auction.interestBefore);
    }
    if (s.status === 'rebuy' && !auction) throw Error('缺少拍卖记录');
    keys(s.priceBook, ['id', 'houses', 'warehouses'], '价格簿');
    if (s.priceBook.id !== '0.4') throw Error('价格簿无效');
    const published = H.priceBooks['0.4'][s.difficulty];
    if (!published) throw Error('价格簿无效');
    keys(s.priceBook.houses, Object.keys(published.houses), '住房价');
    keys(s.priceBook.warehouses, Object.keys(published.warehouses), '仓储价');
    for (const id of Object.keys(published.warehouses)) if (s.priceBook.warehouses[id] !== published.warehouses[id]) throw Error('仓储价与价格簿不一致');
    if (s.migration !== null) {
      keys(s.migration, ['fromVersion', 'fromRules', 'atWeek', 'backup'], '迁移');
      if (s.migration.fromVersion !== 2 || s.migration.fromRules !== '0.2') throw Error('迁移来源无效');
      H.int(s.migration.atWeek, 1, s.week);
      if (typeof s.migration.backup !== 'string' || !s.migration.backup.startsWith('homeyear.save.backup.')) throw Error('迁移备份无效');
    }
    if (s.upgrade !== null) {
      keys(s.upgrade, ['fromVersion', 'fromRules', 'atWeek', 'backup'], '规则升级');
      if (s.upgrade.fromVersion !== 3 || s.upgrade.fromRules !== '0.4') throw Error('规则升级来源无效');
      H.int(s.upgrade.atWeek, 1, s.week);
      if (s.migration && s.migration.atWeek > s.upgrade.atWeek) throw Error('迁移链周数不一致');
      if (typeof s.upgrade.backup !== 'string' || !/^homeyear\.save\.backup\.[0-9a-f]{16}(?:\.[1-9]\d{0,2})?$/.test(s.upgrade.backup)) throw Error('规则升级备份无效');
    }
    if (!Array.isArray(s.swanLog) || s.swanLog.length > H.swanRules.limit) throw Error('重大事件日志无效');
    const swanIds = new Set();
    let swanWeek = null;
    for (const entry of s.swanLog) {
      keys(entry, ['id', 'week'], '重大事件日志');
      const e = H.events.find(e => e.id === entry.id && e.tier === 'swan');
      H.int(entry.week, H.swanRules.firstWeek, Math.min(H.swanRules.lastWeek, s.week));
      if (!e || swanIds.has(entry.id) || (swanWeek !== null && entry.week - swanWeek < H.swanRules.gap) || (e.season && H.seasonAt(H.calendarWeek(s, entry.week)) !== e.season)) throw Error('重大事件日志冲突');
      if ((s.upgrade && entry.week <= s.upgrade.atWeek) || (!s.upgrade && s.migration && entry.week <= s.migration.atWeek)) throw Error('规则升级前不能有重大事件');
      swanIds.add(entry.id); swanWeek = entry.week;
    }
    if (!Array.isArray(s.housingLog) || s.housingLog.length > H.housingRules.limit) throw Error('住房冲击无效');
    const housingIds = new Set();
    let previousHousingWeek = null;
    for (const entry of s.housingLog) {
      keys(entry, ['id', 'week'], '住房冲击');
      const ev = H.housingEvents.find(e => e.id === entry.id);
      if (!ev || housingIds.has(entry.id)) throw Error('住房冲击无效');
      H.int(entry.week, H.housingRules.firstWeek, Math.min(H.housingRules.lastWeek, s.week));
      if (previousHousingWeek !== null && entry.week - previousHousingWeek < H.housingRules.gap) throw Error('住房冲击无效');
      housingIds.add(entry.id);
      previousHousingWeek = entry.week;
    }
    for (const id of Object.keys(published.houses)) if (s.priceBook.houses[id] !== H.houseQuote(s, id)) throw Error('住房价与公式不一致');
    keys(s.rng, ['market', 'events', 'visual', 'listing', 'housing', 'lottery'], '随机流');
    for (const key of ['market', 'events', 'visual', 'listing', 'housing', 'lottery']) H.int(s.rng[key], 1, 4294967295);
    keys(s.loan, ['principal', 'interestDue'], '贷款');
    H.int(s.loan.principal, 0, H.loanRules.maxPrincipal);
    H.int(s.loan.interestDue);
    const ids = H.products.map(p => p.id);
    const legacyIds = H.legacyProducts.map(p => p.id);
    keys(s.inventory, ids, '库存'); keys(s.market, ids, '市场'); keys(s.legacy, legacyIds, '退出商品');
    keys(s.absence, ids, '缺席'); keys(s.onStreak, ids, '在售连续');
    if (!Array.isArray(s.listing) || s.listing.length !== 8 || s.listing.some((id, i) => id !== ids.filter(x => s.listing.includes(x))[i])) throw Error('在售名单无效');
    if (!H.listingCovers(s.listing)) throw Error('在售覆盖无效');
    let costs = 0;
    for (const p of H.products) {
      const i = s.inventory[p.id], m = s.market[p.id];
      keys(i, ['qty', 'cost'], '持仓'); H.int(i.qty); H.int(i.cost);
      if ((i.qty === 0) !== (i.cost === 0)) throw Error('数量与成本不一致');
      costs = H.add(costs, i.cost);
      keys(m, ['price', 'previous', 'trend', 'history', 'low', 'high'], '行情');
      quoteRow(p, m, s.week);
      H.int(s.absence[p.id], 0, 3); H.int(s.onStreak[p.id], 0, 52);
      if (s.listing.includes(p.id)) {
        if (s.absence[p.id] !== 0 || s.onStreak[p.id] < 1) throw Error('在售计数无效');
      } else if (s.absence[p.id] < 1 || s.onStreak[p.id] !== 0) throw Error('缺席计数无效');
    }
    for (const p of H.legacyProducts) {
      const i = s.legacy[p.id];
      keys(i, ['qty', 'cost', 'price', 'previous', 'trend', 'history', 'low', 'high'], '退出持仓');
      H.int(i.qty); H.int(i.cost);
      if ((i.qty === 0) !== (i.cost === 0)) throw Error('数量与成本不一致');
      costs = H.add(costs, i.cost);
      quoteRow(p, i, s.week);
    }
    if (H.used(s) > s.capacity) throw Error('容量溢出');
    finite(s.macro, .8, 1.2, '宏观');
    if (s.season !== H.seasonAt(H.calendarWeek(s))) throw Error('本周季节无效');
    if (!Array.isArray(s.activeEvents) || s.activeEvents.length > H.events.length) throw Error('持续事件无效');
    const unique = new Set();
    for (const a of s.activeEvents) {
      keys(a, ['id', 'started', 'until'], '持续事件');
      if (H.housingEvents.some(e => e.id === a.id)) throw Error('住房冲击不能写入商品事件');
      const e = H.events.find(e => e.id === a.id && e.type === 'market');
      if (!e || unique.has(a.id)) throw Error('事件无效或重复');
      unique.add(a.id);
      if (e.tier === 'swan' && !s.swanLog.some(l => l.id === a.id && l.week === a.started)) throw Error('重大事件缺少一致日志');
      H.int(a.started, 2, s.week); H.int(a.until, s.week, 52);
      if (a.until !== Math.min(52, a.started + e.duration - 1)) throw Error('事件持续时间不一致');
    }
    for (const l of s.swanLog) {
      const e = H.events.find(e => e.id === l.id);
      if (Math.min(52, l.week + e.duration - 1) >= s.week && !s.activeEvents.some(a => a.id === l.id && a.started === l.week)) throw Error('重大事件有效期缺少事件');
    }
    if (s.activeEvents.some(a => swanIds.has(a.id) && a.started === s.week) && s.activeEvents.filter(a => a.started === s.week).length > 1) throw Error('同周新市场事件超过一个');
    H.int(s.personal, -1000000, 1000000);
    if (s.personalEvent !== null) {
      const e = H.events.find(e => e.id === s.personalEvent && e.type === 'personal');
      if (!e || s.personal !== (e.cash < 0 ? Math.round(e.cash * H.difficulty(s).risk) : e.cash)) throw Error('个人事件不一致');
    } else if (s.personal !== 0) throw Error('个人收支缺少事件');
    keys(s.stats, H.statFields.concat('byProduct'), '统计');
    for (const k of H.statFields) H.int(s.stats[k], ['profit', 'worst'].includes(k) ? -Number.MAX_SAFE_INTEGER : 0);
    H.int(s.stats.worst, -Number.MAX_SAFE_INTEGER, 0);
    H.int(s.stats.houseWeek, 0, s.week); H.int(s.stats.upgrades, 0, 3); H.int(s.stats.maxDrawdown, 0, 1000000);
    H.int(s.houseBasis, 0);
    if (!Array.isArray(s.purchases) || s.purchases.length > H.houses.length + (auction ? 1 : 0)) throw Error('购房记录无效');
    if ((s.purchases.length === 0) !== (s.stats.houseWeek === 0)) throw Error('购房周数不一致');
    let paidSum = 0, previousTier = -1;
    for (let i = 0; i < s.purchases.length; i++) {
      const row = s.purchases[i];
      keys(row, ['houseId', 'week', 'price', 'paid'], '购房记录');
      const index = H.houses.findIndex(h => h.id === row.houseId);
      const repurchase = auction && i === auction.purchaseCount;
      if (repurchase) previousTier = -1;
      if (index < 0 || index <= previousTier) throw Error('购房记录无效');
      H.int(row.week, i === 0 ? 1 : s.purchases[i - 1].week, s.week);
      if (repurchase && row.week !== 52) throw Error('再次购房周数无效');
      const log = s.housingLog.filter(entry => entry.week <= row.week);
      const price = H.houseAt(published.houses[row.houseId], row.week, log);
      const prevPrice = i === 0 || repurchase ? 0 : H.houseAt(published.houses[s.purchases[i - 1].houseId], row.week, log);
      if (row.price !== price || row.paid !== price - prevPrice) throw Error('购房记录无效');
      H.int(row.price); H.int(row.paid);
      paidSum = H.add(paidSum, row.paid);
      previousTier = index;
    }
    if (paidSum !== s.houseBasis) throw Error('购房成本不一致');
    if (auction) {
      const count = auction.purchaseCount, last = s.purchases[count - 1];
      if (!last || last.houseId !== auction.houseId || s.purchases.length < count || s.purchases.length > count + 1 ||
          auction.proceeds !== H.houseQuote(s, auction.houseId, 52)) throw Error('拍卖与住房记录不一致');
      const available = H.add(auction.cashBefore, auction.proceeds);
      const interestPaid = Math.min(available, auction.interestBefore);
      const principalPaid = Math.min(available - interestPaid, auction.principalBefore);
      const repurchased = s.purchases.length === count + 1;
      if (s.loan.interestDue !== auction.interestBefore - interestPaid || s.loan.principal !== auction.principalBefore - principalPaid ||
          s.stats.loanInterestPaid < interestPaid || s.stats.loanPrincipalPaid < principalPaid ||
          s.cash !== available - interestPaid - principalPaid - (repurchased ? s.purchases[count].paid : 0)) throw Error('拍卖还款账目不一致');
      if (s.house !== (repurchased ? s.purchases[count].houseId : null) ||
          (repurchased && (s.status !== 'ended' || H.loanOpen(s)))) throw Error('再次购房状态无效');
    } else if (s.house === null) {
      if (s.purchases.length !== 0 || s.houseBasis !== 0) throw Error('购房记录无效');
    } else if (!s.purchases.length || s.purchases[s.purchases.length - 1].houseId !== s.house) throw Error('购房记录无效');
    if (s.purchases.length && s.purchases[0].week !== s.stats.houseWeek) throw Error('购房周数不一致');
    if (s.stats.warehouseSpent !== H.warehousePrice(s, warehouse) || (s.warehouse === 'room') !== (s.stats.upgrades === 0)) throw Error('仓储统计不一致');
    keys(s.stats.byProduct, ids.concat(legacyIds), '商品利润');
    const st = s.stats, big = BigInt;
    let profits = 0n;
    for (const p of H.heldProducts()) {
      H.int(st.byProduct[p.id], -Number.MAX_SAFE_INTEGER); profits += big(st.byProduct[p.id]);
      const i = p.legacy ? s.legacy[p.id] : s.inventory[p.id];
      const lower = big(i.qty) * big(p.min + Math.floor(p.min * H.rules.fee));
      const upper = big(i.qty) * big(p.max + Math.ceil(p.max * H.rules.fee)) + big(st.trades);
      if (i.cost && (big(i.cost) < lower || big(i.cost) > upper)) throw Error('持仓成本超出可达价格范围');
    }
    const bought = big(st.bought), sold = big(st.sold), fees = big(st.fees), turnover = big(st.turnover), trades = big(st.trades);
    const realized = bought - big(costs);
    if (realized < 0n || profits !== big(st.profit) || big(st.profit) !== sold - realized) throw Error('交易利润不一致');
    const twiceBuyFees = bought + sold - turnover + fees;
    if (twiceBuyFees < 0n || twiceBuyFees > 2n * fees || twiceBuyFees % 2n) throw Error('手续费与成交额不一致');
    const buyFees = twiceBuyFees / 2n, sellFees = fees - buyFees;
    const buyGross = bought - buyFees, sellGross = sold + sellFees;
    for (const [gross, fee] of [[buyGross, buyFees], [sellGross, sellFees]]) {
      if (gross < 0n || (gross === 0n && fee !== 0n) || fee < gross / 100n || fee > gross / 100n + trades) throw Error('手续费统计无效');
    }
    const floorGross = big(H.channelMin());
    if ((trades === 0n && (bought || sold || fees || turnover || big(costs) || st.best || st.worst)) ||
        (trades > 0n && (turnover === 0n || fees === 0n || turnover < floorGross * trades)) ||
        big(st.best) > sold || -big(st.worst) > realized ||
        big(st.profit) > big(st.best) * trades || big(st.profit) < big(st.worst) * trades) throw Error('交易次数或最佳最差统计不一致');
    if (s.loan.principal !== st.loanDrawn - st.loanPrincipalPaid || s.loan.interestDue !== st.loanInterestAccrued - st.loanInterestPaid) throw Error('贷款本息与统计不一致');
    if (s.loan.principal === 0 && s.loan.interestDue !== 0) throw Error('无本金不能留有利息');
    if (st.loanDrawn % H.loanRules.repayAmount !== 0) throw Error('贷款发放不是档位倍数');
    const rateNumer = Object.values(H.difficulties).reduce((n, d) => Math.max(n, d.loan && d.loan.weeklyNumer || 0), H.loanRules.weeklyNumer);
    const maxWeekly = Math.floor((H.loanRules.maxPrincipal * rateNumer + H.loanRules.weeklyDenom - 1) / H.loanRules.weeklyDenom);
    // Challenge includes an opening charge in addition to 51 advances and closing.
    const openingPrincipal = H.activeLoanRules(s).tiers[H.difficulty(s).startLoan] || 0;
    const openingInterest = H.loanInterest({difficulty: s.difficulty, loan: {principal: openingPrincipal}});
    if (st.loanInterestAccrued > H.rules.weeks * maxWeekly + openingInterest) throw Error('贷款利息超出一年上限');
    const topPrize = H.lotteryRules.symbols.reduce((n, row) => Math.max(n, row.prize), 0);
    if (big(st.lotterySpent) !== big(st.lotteryCount) * big(H.lotteryRules.price)) throw Error('刮刮乐支出不一致');
    if (big(st.lotteryWon) > big(st.lotteryCount) * big(topPrize)) throw Error('刮刮乐奖金不可达');
    const unit = s.migration ? Math.max(...H.v2.catalog.products.map(p => Math.ceil(p.max / p.size))) : Math.max(...H.products.map(p => Math.ceil(p.max / p.size)));
    const maxStock = trades === 0n ? 0n : big(s.capacity) * big(unit);
    const startWarehouse = H.warehouses.find(w => w.id === (H.difficulty(s).startWarehouse || 'room'));
    const openingCash = H.difficulty(s).initialCash - H.warehousePrice(s, startWarehouse);
    if (st.peak < openingCash || big(st.peak) > big(H.difficulty(s).initialCash) + big(st.grants) + sold + maxStock + big(H.maxHouseValue(s.difficulty)) + big(st.loanDrawn) + big(st.lotteryWon)) throw Error('资产峰值不可达');
    const minimumDrawdown = st.peak ? Math.round((st.peak - H.assets(s)) / st.peak * 1000000) : 0;
    if (st.maxDrawdown < minimumDrawdown) throw Error('最大回撤小于当前回撤');
    const expectedCash = H.difficulty(s).initialCash - s.stats.bought + s.stats.sold + s.stats.grants - s.stats.expenses - s.houseBasis - s.stats.warehouseSpent + s.stats.loanDrawn - s.stats.loanPrincipalPaid - s.stats.loanInterestPaid + s.stats.lotteryWon - s.stats.lotterySpent + (auction ? auction.proceeds : 0);
    if (!Number.isSafeInteger(expectedCash) || expectedCash !== s.cash) throw Error('现金与收支统计不一致');
    if (!Array.isArray(s.history) || s.history.length !== s.week) throw Error('资产历史长度无效');
    for (let index = 0; index < s.history.length; index++) {
      const v = s.history[index]; keys(v, ['week', 'cash', 'inventory', 'house', 'assets'], '资产历史');
      H.int(v.week, index + 1, index + 1);
      for (const k of ['cash', 'inventory', 'house', 'assets']) H.int(v[k]);
      if (v.assets !== H.add(H.add(v.cash, v.inventory), v.house) || v.assets > s.stats.peak) throw Error('资产历史不一致');
    }
    const current = s.history[s.week - 1];
    if (current.cash !== s.cash || current.inventory !== H.inventoryValue(s) || current.house !== H.houseValue(s) || current.assets !== H.assets(s)) throw Error('本周资产历史不一致');
    if (!Array.isArray(s.news) || s.news.length > H.events.length + 5) throw Error('新闻无效');
    let headlines = 0, moves = 0;
    for (const n of s.news) {
      keys(n, ['id', 'title', 'reliability', 'week', 'kind', 'productId', 'changeBps', 'fresh'], '新闻');
      if (typeof n.title !== 'string' || !n.title.length || n.title.length > 200 || !Object.prototype.hasOwnProperty.call(H.reliability, n.reliability) || n.week !== s.week) throw Error('新闻内容无效');
      if (!['headline', 'holding', 'listing', 'ongoing', 'personal', 'housing'].includes(n.kind) || typeof n.fresh !== 'boolean') throw Error('新闻种类无效');
      H.int(n.changeBps, -1000000, 1000000);
      if (n.id === 'rumor') throw Error('新闻内容无效');
      if (n.kind === 'housing') {
        const ev = H.housingEvents.find(e => e.id === n.id);
        if (!ev || n.productId !== null || n.title !== ev.title || n.reliability !== 'reliable' || n.fresh !== true || n.changeBps !== H.houseChangeBps(s, 'studio') || !s.housingLog.some(l => l.id === n.id && l.week === s.week)) throw Error('住房新闻无效');
      } else if (H.housingEvents.some(e => e.id === n.id)) throw Error('住房新闻无效');
      else if (n.productId !== null) {
        if (!ids.concat(legacyIds).includes(n.productId) || n.changeBps !== H.changeBps(H.quoteOf(s, n.productId))) throw Error('新闻涨跌与行情不一致');
      } else if (n.changeBps !== 0 || n.kind !== 'personal') throw Error('新闻内容无效');
      if (n.kind === 'ongoing' && (n.reliability !== 'normal' || n.fresh !== false)) throw Error('持续事件新闻无效');
      const swan = H.events.find(e => e.id === n.id && e.tier === 'swan');
      if (swan) {
        const a = s.activeEvents.find(a => a.id === n.id);
        if (!a || !s.swanLog.some(l => l.id === n.id && l.week === a.started) ||
            !Object.prototype.hasOwnProperty.call(swan.effects, n.productId) || n.title !== swan.title ||
            (a.started === s.week ? n.kind !== 'headline' || !n.fresh || n.reliability !== swan.reliability : n.kind !== 'ongoing' || n.fresh)) throw Error('重大事件新闻与日志不一致');
      }
      if (n.kind === 'headline') headlines++;
      if (n.kind === 'housing') continue;
      if (n.id === 'move') {
        moves++;
        if (n.kind !== 'headline' && n.kind !== 'holding') throw Error('新闻内容无效');
        if (n.kind === 'headline' && s.activeEvents.some(a => a.started === s.week)) throw Error('无事件头条与新事件冲突');
      } else if (n.id === 'listing') {
        if (n.kind !== 'listing') throw Error('新闻内容无效');
      } else if (!H.events.some(e => e.id === n.id)) throw Error('新闻内容无效');
    }
    for (const a of s.activeEvents.filter(a => swanIds.has(a.id))) {
      if (s.news.filter(n => n.id === a.id && n.kind === (a.started === s.week ? 'headline' : 'ongoing')).length !== 1) throw Error('重大事件缺少唯一新闻');
    }
    if (headlines > 1) throw Error('新闻内容无效');
    const housingNow = s.housingLog.filter(l => l.week === s.week);
    if (s.news.filter(n => n.kind === 'housing').length !== housingNow.length) throw Error('住房新闻无效');
    for (const l of housingNow) {
      if (s.news.filter(n => n.kind === 'housing' && n.id === l.id).length !== 1) throw Error('住房新闻无效');
    }
    const bulletinRows = s.news.filter(n => n.kind === 'headline' || n.kind === 'holding' || n.kind === 'listing');
    if (bulletinRows.length > 3 || bulletinRows.filter(n => n.kind === 'listing').length > 1) throw Error('快报超过三行');
    if (!Array.isArray(s.rumors) || s.rumors.length > H.hintRules.limit) throw Error('传闻数量无效');
    const rumorIds = new Set();
    for (const rumor of s.rumors) {
      keys(rumor, ['productId','direction','sourceId'], '传闻');
      if (!s.listing.includes(rumor.productId) || rumorIds.has(rumor.productId) ||
          !['up','down'].includes(rumor.direction) || !Object.prototype.hasOwnProperty.call(H.hintSources,rumor.sourceId)) throw Error('传闻内容无效');
      rumorIds.add(rumor.productId);
    }
    if (!same(s.rumors,H.makeRumors(s))) throw Error('传闻与本周市场不一致');
    if (s.status === 'ended' && !same(s.result, H.summary(s))) throw Error('结算与状态不一致');
    return true;
  };
})(window.HomeYear);
