import { $, $$, icon, serverId, isFilesRoute, toast, escapeHTML } from '../core/utils.js';
import { fuzzy, initNavIndicator } from '../core/ui.js';
import { icon as svg } from '../core/icons.js';
export function initChrome() {
  const title = document.createElement('header'); title.id='op-titlebar'; title.innerHTML = `<div class="op-brand"><img src="/themes/onepay-id/assets/logo-48.webp?v=2" alt=""><strong>Onepay-ID</strong></div><button class="op-mobile-menu" aria-label="Buka navigasi">${svg('menu',{size:18})}</button><div class="op-title-center">Workspace</div><div class="op-title-actions"><button data-op="terminal" title="Tampilkan terminal" aria-label="Terminal">${svg('terminal',{size:15})}<span>Terminal</span></button><button data-op="explorer" class="op-title-explorer" title="Tampilkan / sembunyikan Explorer (Ctrl+B)" aria-label="Explorer">${svg('folder',{size:15})}<span>Explorer</span></button><button data-op="fullscreen" title="Layar penuh" aria-label="Layar penuh">${svg('maximize',{size:15})}</button></div>`;
  const activity = document.createElement('nav'); activity.id='op-activity'; activity.setAttribute('aria-label','Navigasi utama');
  const sidebar = document.createElement('aside'); sidebar.id='op-explorer'; sidebar.hidden=true;
  const status = document.createElement('footer'); status.id='op-statusbar'; status.innerHTML='<span class="op-status-left">Onepay-ID</span><span class="op-status-mid"></span><span class="op-status-right">Panel siap</span>';
  const tabs = document.createElement('div'); tabs.id='op-tabs'; tabs.hidden=true;
  const crumb = document.createElement('div'); crumb.id='op-breadcrumbs'; crumb.hidden=true;
  const palette = document.createElement('div'); palette.id='op-palette'; palette.hidden=true; palette.innerHTML='<div class="op-palette-box"><input aria-label="Cari perintah atau halaman" placeholder="Cari perintah atau halaman…"><div class="op-palette-list"></div></div>';
  document.body.append(title,activity,sidebar,tabs,crumb,status,palette); document.body.classList.add('onepay-id');
  const items = [ ['servers','Servers','/'],['account','Account','/account'],['api','API Keys','/account/api'],['ssh','SSH Keys','/account/ssh'],['activity','Activity','/account/activity'] ];
  const serverItems = [['console','Console',''],['files','Files','/files'],['databases','Databases','/databases'],['schedules','Schedules','/schedules'],['users','Users','/users'],['backups','Backups','/backups'],['network','Network','/network'],['startup','Startup','/startup'],['settings','Settings','/settings'],['activity','Activity','/activity']];
  const nav = (key,label,path) => { const b=document.createElement('button'); b.className='op-nav-item'; b.dataset.label=label; b.setAttribute('aria-label',label); b.innerHTML=`<span>${icon(key)}</span><small>${label}</small>`; b.addEventListener('click',()=>{ if(path) navigate(path); else toast('Pilih server untuk membuka halaman ini.'); }); return b; };
  function navigate(path) { if(location.pathname===path) return; history.pushState({},'',path); window.dispatchEvent(new PopStateEvent('popstate')); }
  function drawNav() {
    activity.replaceChildren(); const id=serverId(); const list=id?serverItems:items;
    list.forEach(([k,l,p])=>activity.append(nav(k,l,id?`/server/${id}${p}`:p)));
    if ($('#app a[href="/admin"]')) activity.append(nav('admin','Admin','/admin'));
    const bottom=document.createElement('div'); bottom.className='op-nav-bottom'; bottom.append(nav('palette','Perintah',null),nav('logout','Akun','/account')); activity.append(bottom);
    const active = id ? location.pathname : location.pathname;
    $$('.op-nav-item',activity).forEach(b=>{ if(b.dataset.label==='Files' && isFilesRoute()) b.classList.add('active'); else if(b.dataset.label!=='Files' && b.dataset.label!=='Perintah' && b.dataset.label!=='Akun' && b.dataset.label!=='Admin' && b.dataset.label!=='Servers' && b.dataset.label!=='Account' && b.dataset.label!=='API Keys' && b.dataset.label!=='SSH Keys' && b.dataset.label!=='Activity' && active.endsWith('/'+b.dataset.label.toLowerCase())) b.classList.add('active'); });
  }

  /* ---- explorer show/hide + mode compact (HP / layar pendek / sentuh) ---- */
  const scrim=document.createElement('div'); scrim.id='op-scrim'; document.body.append(scrim);
  const mq=window.matchMedia('(max-width:900px),(max-height:560px),(pointer:coarse)');
  let sideOn=true; const sideKey=()=> 'op_side_'+(mq.matches?'c':'d');
  function loadSide(){ let v=null; try{v=localStorage.getItem(sideKey());}catch{} sideOn = v===null ? !mq.matches : v==='1'; }
  function applySide(){ document.body.classList.toggle('op-compact',mq.matches); document.body.classList.toggle('op-side-off',!sideOn); }
  window.addEventListener('op:side',e=>{ const d=e.detail||{}; if(typeof d.on==='boolean'&&d.only_compact&&!mq.matches) return; sideOn=typeof d.on==='boolean'?d.on:!sideOn; if(d.persist!==false){try{localStorage.setItem(sideKey(),sideOn?'1':'0');}catch{}} applySide(); });
  scrim.addEventListener('click',()=>{ sideOn=false; applySide(); });
  (mq.addEventListener?mq.addEventListener('change',()=>{loadSide();applySide();}):mq.addListener(()=>{loadSide();applySide();}));
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='b'&&isFilesRoute()){e.preventDefault();window.dispatchEvent(new CustomEvent('op:side',{detail:{}}));} });
  loadSide(); applySide();
  function update() {
    const id=serverId(), path=location.pathname; const segs=path.split('/').filter(Boolean); const page=id ? (segs[2]||'console') : (segs.pop() || 'Servers');
    $('.op-title-center',title).textContent=`${page[0]?.toUpperCase()||''}${page.slice(1)}${id?' • '+id:''}`;
    sidebar.hidden=!isFilesRoute(); tabs.hidden=!isFilesRoute(); crumb.hidden=!isFilesRoute();
    document.body.classList.toggle('op-has-explorer',isFilesRoute());
    status.querySelector('.op-status-left').textContent=id?`Server ${id}`:'Onepay-ID';
    status.querySelector('.op-status-right').textContent=isFilesRoute()?'Editor siap':'Panel';
    drawNav(); window.dispatchEvent(new CustomEvent('op:route',{detail:{id,path,files:isFilesRoute()}}));
  }
  title.addEventListener('click',e=>{const action=e.target.closest('[data-op]')?.dataset.op;if(action==='fullscreen'){if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();} if(action==='terminal') window.dispatchEvent(new Event('op:toggle-terminal')); if(action==='explorer') window.dispatchEvent(new CustomEvent('op:side',{detail:{}}));});
  $('.op-mobile-menu',title).addEventListener('click',()=>document.body.classList.toggle('op-nav-open'));
  const commands=[['Buka Dashboard','/'],['Buka Account','/account'],['Buka API Keys','/account/api'],['Buka SSH Keys','/account/ssh'],['Toggle Explorer',()=>{window.dispatchEvent(new CustomEvent('op:side',{detail:{}}));},'Ctrl+B'],['Toggle Terminal',()=>window.dispatchEvent(new Event('op:toggle-terminal')),'Ctrl+`'],['Layar penuh',()=>document.documentElement.requestFullscreen?.()]];
  let pActive=0, pItems=[];
  const hl=(text,idx)=>{const set=new Set(idx);return [...text].map((c,i)=>set.has(i)?`<mark>${escapeHTML(c)}</mark>`:escapeHTML(c)).join('');};
  function runItem(c){palette.hidden=true;typeof c[1]==='string'?navigate(c[1]):c[1]();}
  function setActive(n){pActive=(n+pItems.length)%Math.max(pItems.length,1);$$('.op-palette-list button',palette).forEach((b,i)=>{b.classList.toggle('active',i===pActive);b.setAttribute('aria-selected',i===pActive?'true':'false');if(i===pActive)b.scrollIntoView({block:'nearest'});});}
  function showPalette(){palette.hidden=false;const input=$('input',palette);input.value='';filter();input.focus();}
  function filter(){const q=$('input',palette).value.trim();const list=$('.op-palette-list',palette);list.replaceChildren();list.setAttribute('role','listbox');
    pItems=commands.map(c=>({c,m:fuzzy(q,c[0])})).filter(x=>x.m).sort((x,y)=>y.m.score-x.m.score);
    pItems.forEach(({c,m})=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.innerHTML=`<span class="op-pal-label">${hl(c[0],m.idx)}</span>${c[2]?`<kbd>${escapeHTML(c[2])}</kbd>`:''}`;b.addEventListener('click',()=>runItem(c));list.append(b);});
    if(!pItems.length){const p=document.createElement('p');p.className='op-empty';p.textContent='Tidak ada hasil.';list.append(p);}
    setActive(0);}
  palette.addEventListener('mousedown',e=>{if(e.target===palette)palette.hidden=true;});$('input',palette).addEventListener('input',filter);
  $('input',palette).addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(pActive+1);}else if(e.key==='ArrowUp'){e.preventDefault();setActive(pActive-1);}else if(e.key==='Enter'&&pItems[pActive]){e.preventDefault();runItem(pItems[pActive].c);}});
  activity.addEventListener('click',e=>{if(e.target.closest('[data-label="Perintah"]')) showPalette();});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();showPalette();}if(e.key==='Escape')palette.hidden=true;});
  window.addEventListener('op:navigate',update); update(); setTimeout(drawNav,1500); initNavIndicator();
}
