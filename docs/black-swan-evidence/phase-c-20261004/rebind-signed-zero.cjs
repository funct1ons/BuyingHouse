'use strict';
// Explicit, one-time migration of THIS phase-C checkpoint identity only.
// Refuses any source change except the single signed-zero comparison repair.
// Original first-run files retained byte-identically; zero games are executed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const out=__dirname,root=path.resolve(out,'../../..'),hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const old=fs.readFileSync(path.join(out,'first-run/runner.cjs'),'utf8'),current=fs.readFileSync(path.join(root,'simulation/black-swan.cjs'),'utf8');
const from='assert.equal(bps,d.changes[p.id]);',to="assert.ok(bps===d.changes[p.id],'change bps mismatch (signed zero equivalent)');";
assert.equal(old.split(from).length,2);assert.equal(current,old.replace(from,to),'refusing unrelated source changes');
const rawMetadata=fs.readFileSync(path.join(out,'first-run/metadata.json'),'utf8'),rawCheckpoint=fs.readFileSync(path.join(out,'first-run/checkpoint.json'),'utf8');
const meta=JSON.parse(rawMetadata),checkpoint=JSON.parse(rawCheckpoint);assert.equal(meta.identity.sourceHashes['simulation/black-swan.cjs'],hash(old));assert.equal(checkpoint.identityHash,hash(meta.identity));assert.equal(checkpoint.dataHash,hash(checkpoint.completed));assert.equal(checkpoint.completed.length,540);
for(const [file,expected] of Object.entries(meta.identity.sourceHashes))if(file!=='simulation/black-swan.cjs')assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'other source changed '+file);
const oldIdentityHash=hash(meta.identity);meta.identity.sourceHashes['simulation/black-swan.cjs']=hash(current);const newIdentityHash=hash(meta.identity);checkpoint.identityHash=newIdentityHash;
meta.identityRepair={scope:'diagnostic equality assertion ONLY: IEEE -0 and JSON 0 compare economically equal',originalMetadataSha256:hash(rawMetadata),originalCheckpointSha256:hash(rawCheckpoint),originalSourceHash:hash(old),newSourceHash:hash(current),oldIdentityHash,newIdentityHash,completedGamesReused:540,newGamesExecuted:0,completedDataHash:checkpoint.dataHash,createdAfterOriginal540:true};
const existing=fs.readFileSync(path.join(out,'metadata.json'),'utf8');assert.ok(existing===rawMetadata||JSON.parse(existing).identityRepair?.newSourceHash===hash(current),'unexpected current metadata');
fs.writeFileSync(path.join(out,'metadata.json'),JSON.stringify(meta,null,2));fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify(checkpoint));
const audit={...meta.identityRepair,firstRunFiles:Object.fromEntries(['metadata.json','checkpoint.json','report.json','summary.md','verification.json','runner.cjs'].map(f=>[f,hash(fs.readFileSync(path.join(out,'first-run',f)))])),newMetadataSha256:hash(fs.readFileSync(path.join(out,'metadata.json'))),newCheckpointSha256:hash(fs.readFileSync(path.join(out,'checkpoint.json')))};
fs.writeFileSync(path.join(out,'signed-zero-migration.json'),JSON.stringify(audit,null,2));console.log('PASS exact single-source delta / first-run retained / 540 completed data hash unchanged / zero new games');
