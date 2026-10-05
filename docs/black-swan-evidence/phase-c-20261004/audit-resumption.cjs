'use strict';
// Evidence-only verifier. No simulations / holdout / new decisions are run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require('../../../simulation/black-swan.cjs');
const out=__dirname,args=['--seeds','30','--set','main','--out',path.relative(path.resolve(__dirname,'../../..'),out),'--resume','yes'];
const originalVerification=JSON.parse(fs.readFileSync(path.join(out,'verification.json'),'utf8'));
const Engine=R.H.Engine;R.H.Engine=()=>{throw Error('resume attempted to run a new game');};
try { const r=R.main(args);assert.equal(r.verification.outcomesHash,originalVerification.outcomesHash);assert.equal(r.verification.marketPathsHash,originalVerification.marketPathsHash); }finally{R.H.Engine=Engine;}
const negative=path.join(out,'resume-negative');fs.mkdirSync(negative,{recursive:true});
const metadata=fs.readFileSync(path.join(out,'metadata.json'),'utf8'),checkpoint=JSON.parse(fs.readFileSync(path.join(out,'checkpoint.json'),'utf8'));
const negativeArgs=['--seeds','30','--set','main','--out',path.relative(path.resolve(__dirname,'../../..'),negative),'--resume','yes'];
fs.writeFileSync(path.join(negative,'metadata.json'),metadata);
fs.writeFileSync(path.join(negative,'checkpoint.json'),JSON.stringify({...checkpoint,dataHash:'tampered'}));assert.throws(()=>R.main(negativeArgs),/tampered checkpoint/);
const stale=JSON.parse(metadata);stale.identity.seedsHash='stale';fs.writeFileSync(path.join(negative,'metadata.json'),JSON.stringify(stale));assert.throws(()=>R.main(negativeArgs),/identity changed/);
fs.writeFileSync(path.join(negative,'metadata.json'),metadata);const completed=[checkpoint.completed[0],checkpoint.completed[0]];fs.writeFileSync(path.join(negative,'checkpoint.json'),JSON.stringify({...checkpoint,completed,dataHash:R.hash(completed)}));assert.throws(()=>R.main(negativeArgs),/duplicate/);
assert.throws(()=>R.main(args.filter(x=>x!=='--resume'&&x!=='yes')),/output exists/);
// Focused caps fixture: equal cap is NOT clipping/cap; persist first shock
// computes caps but does not use center. Only synthetic unit state, not balance data.
const H=R.H,random=H.random,cap=H.persistCap.industry;const s=H.create('cap-unit-only');s.week=3;s.activeEvents=[{id:'heat',started:2,until:4},{id:'crop_loss',started:3,until:6}];
H.random=()=>.5;try{H.persistCap.industry=6500;assert.equal(H.prices(H.clone(s)).persistCapped.includes('fruit'),false);H.persistCap.industry=6499;assert.equal(H.prices(H.clone(s)).persistCapped.includes('fruit'),true);}finally{H.persistCap.industry=cap;H.random=random;}
fs.writeFileSync(path.join(out,'resumption-report.json'),JSON.stringify({completeResumeNoNewGames:true,outcomesHashUnchanged:true,marketHashUnchanged:true,negativeChecks:['tampered checkpoint hash','stale seed/source identity','duplicate completed game','existing output refusal'],exactCapNotTriggered:true,aboveCapTriggered:true,syntheticCapFixtureNotBalanceSample:true},null,2));
console.log('PASS completed resume / unchanged data hashes / 4 negative cases / cap equality and strict exceedance; zero new simulations');
