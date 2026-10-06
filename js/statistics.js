(function (H) {
  'use strict';
  H.statFields = ['bought','sold','profit','grants','expenses','hardship','trades','best','worst','peak','fees','turnover',
    'houseWeek','warehouseSpent','upgrades','maxDrawdown',
    'loanDrawn','loanPrincipalPaid','loanInterestAccrued','loanInterestPaid','lotterySpent','lotteryWon','lotteryCount'];
  H.record = s => {
    const point = {week:s.week, cash:s.cash, inventory:H.inventoryValue(s), house:H.houseValue(s), assets:H.assets(s)};
    s.history[s.week-1] = point;
    s.stats.peak = Math.max(s.stats.peak,point.assets);
    const drawdown = s.stats.peak ? Math.round((s.stats.peak-point.assets)/s.stats.peak*1000000) : 0;
    s.stats.maxDrawdown = Math.max(s.stats.maxDrawdown,drawdown);
  };
  H.summary = s => {
    const ranked = H.heldProducts().map(p => ({id:p.id,profit:s.stats.byProduct[p.id]})).sort((a,b) => b.profit-a.profit);
    const h = H.houses.find(h => h.id === s.house);
    return {ending:h ? h.ending : '仍在租房', assets:H.assets(s), cash:s.cash, house:s.house,
      inventoryValue:H.inventoryValue(s), liquidValue:H.liquidValue(s), houseValue:H.houseValue(s), profit:s.stats.profit,
      unrealized:H.heldProducts().reduce((n,p) => n + H.channelNet(s,p.id,H.qtyOf(s,p.id)) - H.costOf(s,p.id), 0),
      turnover:s.stats.turnover, bought:s.stats.bought, sold:s.stats.sold, fees:s.stats.fees,
      best:s.stats.best, worst:s.stats.worst, bestProduct:ranked[0].id, worstProduct:ranked[ranked.length-1].id,
      peak:s.stats.peak, trades:s.stats.trades, houseWeek:s.stats.houseWeek, upgrades:s.stats.upgrades,
      maxDrawdown:s.stats.maxDrawdown, byProduct:H.clone(s.stats.byProduct), history:H.clone(s.history),
      purchases:H.clone(s.purchases),
      loanPrincipal:s.loan.principal, loanInterestDue:s.loan.interestDue,
      loanDrawn:s.stats.loanDrawn, loanPrincipalPaid:s.stats.loanPrincipalPaid,
      loanInterestAccrued:s.stats.loanInterestAccrued, loanInterestPaid:s.stats.loanInterestPaid,
      lotterySpent:s.stats.lotterySpent, lotteryWon:s.stats.lotteryWon, lotteryCount:s.stats.lotteryCount,
      assetsAfterLoan:H.assets(s) - s.loan.principal - s.loan.interestDue};
  };
})(window.HomeYear);
