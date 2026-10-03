'use strict';
// Development-only, Node 24 built-ins; no application dependency.
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function getJSON(url){return new Promise((resolve,reject)=>{const req=http.get(url,res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{try{if(res.statusCode!==200)throw Error(`HTTP ${res.statusCode}: ${text}`);resolve(JSON.parse(text));}catch(e){reject(e);}});});req.setTimeout(2000,()=>req.destroy(Error('HTTP timeout')));req.on('error',reject);});}
class CDP {
  constructor(ws){this.ws=ws;this.next=0;this.pending=new Map();this.listeners=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{for(const cb of this.listeners.get(m.method)||[])cb(m.params);}});ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP socket closed'));}this.pending.clear();});}
  static async connect(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('WebSocket connection timeout'));},10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',e=>{clearTimeout(timer);reject(Error(`WebSocket error: ${e.message||url}`));},{once:true});});return new CDP(ws);}
  on(method,cb){const list=this.listeners.get(method)||[];list.push(cb);this.listeners.set(method,list);}
  send(method,params={},timeout=10000){return new Promise((resolve,reject)=>{const id=++this.next;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`CDP timeout: ${method}`));},timeout);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}
  async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  close(){this.ws.close();}
}
async function launchEdge(options={}){
  const executable=options.executable||process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  await fs.access(executable);
  const profile=await fs.mkdtemp(path.join(options.tempRoot||os.tmpdir(),'buyinghouse-cdp-'));
  let child,stderr='',spawnError,connection;
  const cleanup=async()=>{if(connection){try{await connection.send('Browser.close',{},3000);}catch{}connection.close();await delay(300);}if(child&&child.exitCode===null&&!child.killed){child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),delay(4000)]);}let last;for(let i=0;i<10;i++){try{await fs.rm(profile,{recursive:true,force:true});return;}catch(e){last=e;await delay(300);}}throw Error(`Profile cleanup failed: ${last.message}`);};
  try{
    child=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
    child.on('error',e=>spawnError=e);child.stderr.on('data',c=>stderr+=c);
    const deadline=Date.now()+(options.startupTimeout||20000);let port;
    while(Date.now()<deadline){if(spawnError)throw spawnError;if(child.exitCode!==null)throw Error(`Edge exited ${child.exitCode}: ${stderr}`);try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}await delay(100);}
    if(!port)throw Error(`Edge startup timeout: ${stderr}`);
    const version=await getJSON(`http://127.0.0.1:${port}/json/version`);
    const targets=await getJSON(`http://127.0.0.1:${port}/json/list`);const page=targets.find(t=>t.type==='page');if(!page)throw Error('No CDP page target');
    connection=await CDP.connect(page.webSocketDebuggerUrl.replace('localhost','127.0.0.1'));
    return {cdp:connection,version,port,pid:child.pid,profile,executable,cleanup,get stderr(){return stderr;}};
  }catch(e){try{await cleanup();}catch(c){e.message+=`; ${c.message}`;}throw e;}
}
module.exports={CDP,launchEdge,getJSON,delay};
