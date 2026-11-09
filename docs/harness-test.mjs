import http from 'http'; import fs from 'fs'; import path from 'path';
import puppeteer from '/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const ROOT=process.env.THEME_ROOT||'/home/claude/w/onepay-id-panel/theme';
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml'};
const html=`<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href="/themes/onepay-id/onepay.css"></head><body><div id="app"><h2>Dashboard</h2><p>konten panel</p><button>Tombol bawaan</button></div><script type=module src="/themes/onepay-id/main.js"></script></body></html>`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const srv=http.createServer(async(q,r)=>{
  const u=new URL(q.url,'http://x');
  if(u.pathname.startsWith('/themes/onepay-id/')){const f=path.join(ROOT,u.pathname.replace('/themes/onepay-id/',''));if(fs.existsSync(f)&&fs.statSync(f).isFile()){r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});return fs.createReadStream(f).pipe(r);}r.writeHead(404);return r.end();}
  if(u.pathname.endsWith('/files/list')){await sleep(700);r.writeHead(200,{'content-type':'application/json'});return r.end(JSON.stringify({data:[{attributes:{name:'src',is_file:false,size:0,modified_at:'2026-01-01'}},{attributes:{name:'index.js',is_file:true,size:120,modified_at:'2026-01-01'}},{attributes:{name:'config.yml',is_file:true,size:80,modified_at:'2026-01-01'}},{attributes:{name:'README.md',is_file:true,size:90,modified_at:'2026-01-01'}}]}));}
  if(u.pathname.endsWith('/files/contents')){await sleep(600);r.writeHead(200,{'content-type':'text/plain'});return r.end('console.log("halo");\n'.repeat(30));}
  if(u.pathname.startsWith('/api/')){r.writeHead(404,{'content-type':'application/json'});return r.end('{}');}
  r.writeHead(200,{'content-type':'text/html'});r.end(html);
}).listen(0);
const port=srv.address().port; const base=`http://127.0.0.1:${port}`;
const b=await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const out={};
for(const [name,w,h,mobile] of [['412',412,860,true],['900',900,700,false],['1280',1280,800,false],['landscape',844,390,true]]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const errs=[],ext=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());}); p.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))ext.push(r.url());});
  await p.evaluateOnNewDocument(()=>{window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
  await p.goto(base+'/server/abc/files',{waitUntil:'domcontentloaded'});
  const t0=Date.now(); let skelAt=null, skelGone=null;
  await sleep(120); const early=await p.$$eval('.op-skel-layer',n=>n.length);
  await sleep(180); const mid=await p.$$eval('.op-skel-layer',n=>n.length);
  await p.screenshot({path:`s_${name}_skeleton.png`});
  await sleep(1800); const late=await p.$$eval('.op-skel-layer',n=>n.length);
  await p.screenshot({path:`s_${name}_loaded.png`});
  if(name==='1280'){
    await p.click('.op-file-row:nth-child(2)').catch(()=>{});
    await p.evaluate(()=>[...document.querySelectorAll('.op-file-row')].find(r=>r.textContent.includes('index.js'))?.click());
    await sleep(900);
    await p.evaluate(()=>window.dispatchEvent(new Event('op:toggle-terminal'))); await sleep(400);
    const b=await p.$('.op-file-actions button:nth-child(4)'); await b.hover(); await sleep(350);
    await p.screenshot({path:'s_icons_1280.png'});
    const use=await p.evaluate(()=>{const u=document.querySelector('svg.op-i use');const r=u?.getBoundingClientRect();return {icons:document.querySelectorAll('svg.op-i').length,w:r&&r.width,glyphs:[...document.querySelectorAll('#op-activity,#op-explorer,#op-tabs,#op-titlebar,#op-terminal')].map(e=>e.innerText).join('').match(/[▤◉⚿⌘＋▰↻⌄☑⋮●×▸▾⛶☰✕▧▣]/g)};});
    out.icons=use; await p.hover('.op-nav-item:nth-child(3)'); await sleep(300); await p.screenshot({path:'s_tooltip_1280.png',clip:{x:0,y:0,width:420,height:300}});
  }
  // palette
  await p.keyboard.down('Control');await p.keyboard.down('Shift');await p.keyboard.press('KeyP');await p.keyboard.up('Shift');await p.keyboard.up('Control');
  await p.keyboard.type('tgx'); await sleep(100);
  const pal=await p.$$eval('.op-palette-list button',n=>n.map(x=>x.innerText.replace(/\n/g,' | ')+(x.querySelector('mark')?' [mark]':'')));
  if(name==='1280') await p.screenshot({path:`s_${name}_palette.png`});
  await p.keyboard.press('Escape');
  out[name]={early_skel:early,at300ms_skel:mid,after_load_skel:late,palette:pal,cls:await p.evaluate(()=>window.__cls),liteClass:await p.evaluate(()=>document.body.classList.contains('op-lite')),errors:errs,external:ext,overflowX:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  await p.close();
}
console.log(JSON.stringify(out,null,1)); await b.close(); srv.close();
