'use strict';
// Development-only local export and API smoke test. Never needed by the game.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window:{}};
vm.createContext(context);
for (const f of ['js/data.js','js/art.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const H=context.window.HomeYear;
const out=path.join(__dirname,'svg');
fs.mkdirSync(out,{recursive:true});
const check=(s,id)=>{if(!s.startsWith('<svg ')||!s.endsWith('</svg>')||s.includes('undefined')||/\bid=|https?:\/\/(?!www\.w3\.org)/.test(s)) throw Error('Invalid SVG: '+id);};
for(const id of H.Art.iconIds){const s=H.Art.icon(id);check(s,id);fs.writeFileSync(path.join(out,'icon-'+id+'.svg'),s+'\n');}
for(const id of H.Art.sceneIds){const s=H.Art.scene(id);check(s,id);fs.writeFileSync(path.join(out,id+'.svg'),s+'\n');}
for(const p of H.products) check(H.Art.icon(p.id,'smoke'),p.id);
if(H.products.length!==20)throw Error('Expected 20 products');
if(new Set(H.products.map(p=>H.Art.icon(p.id))).size!==20)throw Error('Duplicate product art');
if(!H.Art.icon('rice','x" onload="evil').includes('&quot;'))throw Error('Class escaping failed');
for(const id of ['city',...H.houses.map((_,i)=>'house-'+i)])check(H.Art.scene(id),id);
check(H.Art.scene('warehouse'),'warehouse');
console.log('PASS: 20 distinct product icons; 6 city/housing scenes + warehouse; '+H.Art.iconIds.length+' icons exported, 7 scenes exported.');
