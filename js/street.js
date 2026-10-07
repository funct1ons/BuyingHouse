(function (H) {
  'use strict';
  const lotteryWeight = H.lotteryRules.symbols.reduce((n, row) => n + row.weight, 0);
  if (lotteryWeight !== 1000) throw Error('刮刮乐权重之和必须为 1000');
  function shuffle(list, s) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(H.random(s, 'lottery') * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  H.loanOpen = s => s.loan.principal > 0 || s.loan.interestDue > 0;
  H.activeLoanRules = function (s) {
    const extra = s && H.difficulties[s.difficulty] && H.difficulties[s.difficulty].loan;
    const base = H.loanRules;
    if (!extra) return base;
    return {
      weeklyNumer: extra.weeklyNumer != null ? extra.weeklyNumer : base.weeklyNumer,
      weeklyDenom: extra.weeklyDenom != null ? extra.weeklyDenom : base.weeklyDenom,
      maxPrincipal: extra.maxPrincipal != null ? extra.maxPrincipal : base.maxPrincipal,
      repayAmount: extra.repayAmount != null ? extra.repayAmount : base.repayAmount,
      tiers: extra.tiers || base.tiers
    };
  };
  H.loanInterest = function (s) {
    const principal = s.loan.principal;
    if (!principal) return 0;
    const rules = H.activeLoanRules(s);
    const denom = rules.weeklyDenom;
    return Math.floor((principal * rules.weeklyNumer + denom - 1) / denom);
  };
  H.accrueLoan = function (s) {
    const interest = H.loanInterest(s);
    if (!interest) return;
    s.loan.interestDue = H.add(s.loan.interestDue, interest);
    s.stats.loanInterestAccrued = H.add(s.stats.loanInterestAccrued, interest);
  };
  H.borrowLoan = function (s, id) {
    const rules = H.activeLoanRules(s);
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(rules.tiers, id)) throw Error('贷款档位无效');
    if (H.loanOpen(s)) throw Error('请先还清当前贷款');
    const amount = rules.tiers[id];
    if (amount > rules.maxPrincipal) throw Error('贷款档位无效');
    s.cash = H.add(s.cash, amount);
    s.loan.principal = amount;
    s.stats.loanDrawn = H.add(s.stats.loanDrawn, amount);
  };
  H.repayLoan = function (s, id) {
    if (typeof id !== 'string' || !['interest', '500', 'all'].includes(id)) throw Error('还款方式无效');
    const principal = s.loan.principal, due = s.loan.interestDue, total = principal + due;
    if (total === 0) throw Error('没有未还贷款');
    if (id === 'interest' && due === 0) throw Error('没有待付利息');
    const chunk = H.activeLoanRules(s).repayAmount;
    const amount = id === 'interest' ? due : id === 'all' ? total : chunk;
    if (id === '500' && total < amount) throw Error('欠款不足这一档，请还清全部');
    if (amount > total) throw Error('还款超过欠款');
    if (s.cash < amount) throw Error('还款资金不足');
    const toInterest = Math.min(due, amount), toPrincipal = amount - toInterest;
    s.cash = H.int(s.cash - amount);
    s.loan.interestDue = H.int(due - toInterest);
    s.loan.principal = H.int(principal - toPrincipal);
    s.stats.loanInterestPaid = H.add(s.stats.loanInterestPaid, toInterest);
    s.stats.loanPrincipalPaid = H.add(s.stats.loanPrincipalPaid, toPrincipal);
  };
  H.buyLottery = function (s) {
    const rules = H.lotteryRules;
    if (s.cash < rules.price) throw Error('现金不够一张刮刮乐');
    const symbols = rules.symbols;
    let roll = Math.floor(H.random(s, 'lottery') * lotteryWeight);
    let win = symbols[symbols.length - 1];
    for (const row of symbols) {
      if (roll < row.weight) { win = row; break; }
      roll -= row.weight;
    }
    const cells = [];
    for (let n = 0; n < rules.matches; n++) cells.push(win.id);
    const counts = {};
    const others = symbols.filter(row => row.id !== win.id);
    while (cells.length < rules.cells) {
      const choices = others.filter(row => (counts[row.id] || 0) < rules.maxRepeat);
      if (!choices.length) throw Error('刮刮乐牌面无效');
      const pick = choices[Math.floor(H.random(s, 'lottery') * choices.length)];
      counts[pick.id] = (counts[pick.id] || 0) + 1;
      cells.push(pick.id);
    }
    const dealt = shuffle(cells, s);
    s.cash = H.add(s.cash - rules.price, win.prize);
    s.stats.lotterySpent = H.add(s.stats.lotterySpent, rules.price);
    s.stats.lotteryWon = H.add(s.stats.lotteryWon, win.prize);
    s.stats.lotteryCount = H.add(s.stats.lotteryCount, 1);
    return {symbolId: win.id, prize: win.prize, cells: dealt};
  };
})(window.HomeYear);
