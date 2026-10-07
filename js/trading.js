(function (H) {
  'use strict';
  H.trade = function (s,kind,id,qty) {
    const p = H.holding(id);
    H.int(qty,1);
    const legacy = H.legacyProducts.some(x => x.id === id);
    const item = legacy ? s.legacy[id] : s.inventory[id];
    if (kind === 'buy' && legacy) throw Error('已退出市场，只能按冻结回收价出售');
    if (kind === 'buy' && !s.listing.includes(id)) throw Error('本周未上架');
    const unit = kind === 'buy' ? s.market[id].price : H.channelUnit(s, id);
    const gross = H.mul(unit, qty), fee = H.fee(gross);
    if (kind === 'buy') {
      const cost = H.add(gross,fee);
      if (cost > s.cash) throw Error('资金不足');
      if (H.add(H.used(s),H.mul(qty,p.size)) > s.capacity) throw Error('库存已满');
      s.cash -= cost;
      item.qty = H.add(item.qty,qty);
      item.cost = H.add(item.cost,cost);
      s.stats.bought = H.add(s.stats.bought,cost);
    } else {
      if (qty > item.qty) throw Error('持仓不足');
      const allocated = qty === item.qty ? item.cost : H.int(Number(BigInt(item.cost)*BigInt(qty)/BigInt(item.qty)));
      const net = gross-fee, profit = net-allocated;
      s.cash = H.add(s.cash,net);
      item.qty -= qty;
      item.cost -= allocated;
      s.stats.profit = H.int(s.stats.profit+profit,-Number.MAX_SAFE_INTEGER);
      s.stats.sold = H.add(s.stats.sold,net);
      s.stats.byProduct[id] = H.int(s.stats.byProduct[id]+profit,-Number.MAX_SAFE_INTEGER);
      s.stats.best = Math.max(s.stats.best,profit);
      s.stats.worst = Math.min(s.stats.worst,profit);
    }
    s.stats.fees = H.add(s.stats.fees,fee);
    s.stats.turnover = H.add(s.stats.turnover,gross);
    s.stats.trades = H.add(s.stats.trades,1);
  };
  H.buyHouse = function (s,id) {
    if (s.status === 'rebuy' && H.loanOpen(s)) throw Error('清偿贷款后才能重新置业');
    const index = H.houses.findIndex(h => h.id === id), old = H.houses.findIndex(h => h.id === s.house);
    if (index < 0 || index <= old) throw Error('仅允许首次购买或升级住房');
    const price = H.housePrice(s, H.houses[index]);
    const due = price - (s.house ? H.houseValue(s) : 0);
    if (!Number.isSafeInteger(due) || due <= 0) throw Error('购房金额无效');
    if (s.cash < due) throw Error('购房资金不足');
    s.cash -= due;
    s.house = id;
    s.houseBasis = H.add(s.houseBasis || 0, due);
    if (!Array.isArray(s.purchases)) s.purchases = [];
    s.purchases.push({houseId: id, week: s.week, price, paid: due});
    if (s.stats.houseWeek === 0) s.stats.houseWeek = s.week;
    if (s.status === 'rebuy') s.status = 'ended';
  };
  // Closing payments are partial and always interest first; inventory is untouched.
  H.settleDebt = function (s) {
    if (s.status !== 'playing' || s.week !== 52 || s.settlement !== null) throw Error('偿债阶段无效');
    H.accrueLoan(s);
    s.settlement = {cashBefore: s.cash, principalBefore: s.loan.principal,
      interestAfterAccrual: s.loan.interestDue, auction: null, purchaseCount: s.purchases.length};
    const pay = () => {
      const interest = Math.min(s.cash, s.loan.interestDue);
      s.cash -= interest; s.loan.interestDue -= interest;
      s.stats.loanInterestPaid = H.add(s.stats.loanInterestPaid, interest);
      const principal = Math.min(s.cash, s.loan.principal);
      s.cash -= principal; s.loan.principal -= principal;
      s.stats.loanPrincipalPaid = H.add(s.stats.loanPrincipalPaid, principal);
    };
    pay();
    if (H.loanOpen(s) && s.house !== null) {
      const proceeds = H.houseValue(s);
      s.settlement.auction = {houseId: s.house, proceeds};
      s.cash = H.add(s.cash, proceeds); s.house = null;
      pay(); s.status = 'rebuy';
    } else s.status = 'ended';
  };
  H.upgradeWarehouse = function (s,id) {
    const index = H.warehouses.findIndex(w => w.id === id), old = H.warehouses.findIndex(w => w.id === s.warehouse);
    if (index < 0 || index <= old) throw Error('仅允许升级仓储');
    const due = H.warehousePrice(s,H.warehouses[index])-H.warehousePrice(s,H.warehouses[old]);
    if (s.cash < due) throw Error('仓储资金不足');
    s.cash -= due;
    s.warehouse = id;
    s.capacity = H.warehouses[index].capacity;
    s.stats.warehouseSpent = H.add(s.stats.warehouseSpent,due);
    s.stats.upgrades = H.add(s.stats.upgrades,1);
  };
})(window.HomeYear);
