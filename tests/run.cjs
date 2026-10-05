'use strict';
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const context=vm.createContext({console});
context.window=context;
for (const file of ['js/data.js','js/math.js','js/v2-baseline.js','js/v3-baseline.js','js/market.js','js/trading.js','js/statistics.js','js/validation.js','js/game.js','js/save.js','tests/suite.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
}
const result=context.runCoreTests();
console.log(result.log.join('\n'));
console.log(`${result.passed} passed, ${result.failed} failed`);
process.exitCode=result.failed?1:0;
