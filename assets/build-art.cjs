'use strict';
// Development-only local export and API smoke test. Never needed by the game.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window:{}};
vm.createContext(context);
for (const f of ['js/data.js','js/art-kit.js','js/art-scenes.js','js/art.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const H=context.window.HomeYear;
const out=path.join(__dirname,'svg');
fs.mkdirSync(out,{recursive:true});
const defs=H.Art.defs(), defined=new Set([...defs.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
if([...defined].some(id=>!id.startsWith('hy-')))throw Error('Shared defs ids must use the hy- prefix');
// Inline art must carry no id at all and may only reference shared hy- defs that actually exist.
const check=(s,id)=>{
  if(!s.startsWith('<svg ')||!s.endsWith('</svg>')||/undefined|NaN/.test(s)||/\bid=|https?:\/\/(?!www\.w3\.org)/.test(s)) throw Error('Invalid SVG: '+id);
  for(const m of s.matchAll(/url\(#([^)]+)\)/g)) if(!m[1].startsWith('hy-')||!defined.has(m[1])) throw Error(`Bad reference ${m[1]} in ${id}`);
  if(/href=/.test(s)) throw Error('No href allowed: '+id);
};
const write=(name,s)=>fs.writeFileSync(path.join(out,name),H.Art.standalone(s)+'\n');
let count=0,elements={};
for(const id of H.Art.iconIds){const s=H.Art.icon(id);check(s,id);write('icon-'+id+'.svg',s);count++;}
for(const id of H.Art.sceneIds){const s=H.Art.scene(id);check(s,id);write(id+'.svg',s);count++;elements[id]=(s.match(/<(rect|path|circle|ellipse|g)\b/g)||[]).length;}
// Seasonal and phase variants for review: the house the player sees in each season, plus the two endings.
const variants=[];
for(const season of H.Art.seasons)for(const id of ['rent','house-0','house-2','house-4']){const s=H.Art.scene(id,{season,phase:'development'});check(s,id+season);write(`${id}-${season}.svg`,s);variants.push(`${id}-${season}`);}
for(const [id,phase] of [['rent','ending-rent'],['house-4','ending-home'],['house-1','sprint'],['street','sprint'],['street','early']]){const s=H.Art.scene(id,{phase,season:'autumn'});check(s,id+phase);write(`${id}-${phase}.svg`,s);variants.push(`${id}-${phase}`);}
for(const tone of H.Art.tones)for(const season of H.Art.seasons){const s=H.Art.scene('house-3',{tone,season,lamps:true});check(s,tone);}
const catalog=H.products.concat(H.legacyProducts||[]);
for(const p of catalog) check(H.Art.icon(p.id,'smoke'),p.id);
if(catalog.length!==20)throw Error('Expected 20 product icons across pool and legacy');
if(new Set(catalog.map(p=>H.Art.icon(p.id))).size!==20)throw Error('Duplicate product art');
if(catalog.some(p=>!H.Art.productIconIds.includes(p.id)))throw Error('Product without dedicated icon');
if(!H.Art.icon('rice','x" onload="evil').includes('&quot;'))throw Error('Class escaping failed');
for(const id of ['city','rent','street',...H.houses.map((_,i)=>'house-'+i)])check(H.Art.scene(id),id);
check(H.Art.scene('warehouse'),'warehouse');
if(H.Art.scene('studio')!==H.Art.scene('house-0')||H.Art.scene('nope')!==H.Art.scene('city'))throw Error('Scene aliases changed');
// Scenes must differ per house (independent compositions) and per season (accessory layer).
if(new Set(['rent','house-0','house-1','house-2','house-3','house-4'].map(id=>H.Art.scene(id))).size!==6)throw Error('Housing scenes not distinct');
if(new Set(H.Art.seasons.map(s=>H.Art.scene('house-0',{season:s}))).size!==4)throw Error('Season variants not distinct');
const storyScenes=['credit','scratch-stand','housing-closed'];
const storyArt=storyScenes.map(id=>{const s=H.Art.scene(id);check(s,id);if(!s.includes('viewBox="0 0 480 300"')||!s.includes('class="art-scene'))throw Error('Scene frame: '+id);return s;});
if(new Set(storyArt).size!==3)throw Error('Story scenes not distinct');
if(storyArt.some(s=>s===H.Art.scene('city')))throw Error('Story scene fell back to city');
for(const id of storyScenes){
  if(new Set(H.Art.seasons.map(season=>H.Art.scene(id,{season,phase:'development'}))).size!==4)throw Error('Season ignored: '+id);
  if(new Set(H.Art.tones.map(tone=>H.Art.scene(id,{tone}))).size!==H.Art.tones.length)throw Error('Tone ignored: '+id);
}
const lotIds=['lot-empty','lot-egg','lot-red','lot-umbrella','lot-watch','lot-key'];
const lotArt=lotIds.map(id=>{const s=H.Art.icon(id);check(s,id);return s;});
if(new Set(lotArt).size!==6)throw Error('Lot icons not distinct');
if(lotIds.some(id=>H.Art.productIconIds.includes(id)))throw Error('Lot icons must stay out of productIconIds');
if(H.Art.icon('lot-egg')===H.Art.icon('eggs')||H.Art.icon('lot-watch')===H.Art.icon('watch'))throw Error('Lot icon repeats a product drawing');
if(H.Art.icon('lot-umbrella')!==H.Art.icon('umbrella'))throw Error('Lot umbrella should match the product umbrella');
if(!H.Art.scene('credit').includes('信用社'))throw Error('Credit scene missing shop name');
if(!H.Art.scene('scratch-stand').includes('幸运刮刮乐'))throw Error('Scratch stall missing banner');
fs.writeFileSync(path.join(out,'defs.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${defs}</svg>\n`);
console.log(`PASS: 20 distinct product icons; ${H.Art.sceneIds.length} scenes (${H.Art.sceneIds.join(', ')}); ${count} base files + ${variants.length} season/phase variants exported with embedded hy- defs.`);
console.log('Scene element counts: '+JSON.stringify(elements));
