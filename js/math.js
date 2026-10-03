(function (H) {
  'use strict';
  H.int = function (n, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(n) || n < min || n > max) throw Error('数值必须是范围内的安全整数');
    return n;
  };
  H.add = (a,b) => H.int(a+b);
  H.mul = (a,b) => H.int(a*b);
  H.clone = function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value)) out[key] = clone(value[key]);
      return out;
    }
    return value;
  };
  H.random = function (s, stream) {
    let x = s.rng[stream] >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.rng[stream] = x >>> 0;
    return (x >>> 0) / 4294967296;
  };
  H.seed = function (text) {
    let x = 2166136261;
    for (let i=0;i<text.length;i++) x = Math.imul(x ^ text.charCodeAt(i),16777619);
    return (x >>> 0) || 1;
  };
  H.product = id => {
    const p = H.products.find(x => x.id === id);
    if (!p) throw Error('未知商品');
    return p;
  };
  H.difficulty = s => H.difficulties[s.difficulty];
  H.housePrice = (s,h) => H.int(Math.round(h.price * H.difficulty(s).houseFactor));
  H.warehousePrice = (s,w) => H.int(Math.round(w.price * H.difficulty(s).warehouseFactor));
  H.used = s => H.products.reduce((n,p) => H.add(n,H.mul(s.inventory[p.id].qty,p.size)),0);
  H.inventoryValue = s => H.products.reduce((n,p) => H.add(n,H.mul(s.inventory[p.id].qty,s.market[p.id].price)),0);
  H.houseValue = s => s.house ? H.housePrice(s,H.houses.find(h => h.id === s.house)) : 0;
  H.assets = s => H.add(H.add(s.cash,H.inventoryValue(s)),H.houseValue(s));
  H.fee = amount => H.int(Math.ceil(amount * H.rules.fee));
  H.seasonAt = week => ['冬','春','夏','秋'][Math.floor((week-1)/13)];
})(window.HomeYear);
