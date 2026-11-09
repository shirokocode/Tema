import { $$, serverId } from '../core/utils.js';
export function initPages(){
  // Pastikan viewport meta ada (Android): tanpa ini browser memakai layout ~980px lalu mengecilkannya.
  if(!document.querySelector('meta[name="viewport"]')){const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1';document.head.append(m);}
  // Cari ancestor terdekat yang bisa di-scroll horizontal (Pterodactyl memakai twin.macro: tidak ada class Tailwind, jadi pakai computed style).
  const scrollBar=(a,app)=>{for(let n=a&&a.parentElement;n&&n!==app;n=n.parentElement){const o=getComputedStyle(n).overflowX;if(o==='auto'||o==='scroll')return n;}return null;};
  const markNative=()=>{
    const app=document.querySelector('#app'); if(!app)return; const id=serverId();
    if(id){const probe=app.querySelector([...'startup,settings,network,backups,databases,schedules,users'.split(',')].map(k=>`a[href="/server/${id}/${k}"]`).join(','));const bar=scrollBar(probe,app);if(bar)bar.classList.add('op-native-subnav');}
    const lg=app.querySelector('img[src*="pterodactyl.svg"]'); if(lg){lg.src='/themes/onepay-id/assets/logo-512.webp';lg.alt='Onepay-ID';lg.classList.add('op-login-logo');}
    const nb=scrollBar(app.querySelector('a[href="/account"]'),app); if(nb&&!nb.classList.contains('op-native-subnav'))nb.classList.add('op-native-nav');
  };
  // Permukaan gelap bawaan panel (kartu, tabel, kotak konsol) ditandai supaya CSS bisa menerangkannya.
  // Tombol/link/input dilewati agar warna & hover aslinya tetap.
  const SKIP=/^(?:BUTTON|INPUT|SELECT|TEXTAREA|svg|path|IMG|CANVAS|SCRIPT|STYLE)$/i;
  const TXT=/^(?:H[1-6]|P|LABEL|LEGEND)$/;
  const hasBg=e=>{const m=getComputedStyle(e).backgroundColor.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/);return !!m&&(m[4]===undefined?1:+m[4])>.1;};
  const tagInk=n=>{
    if(!TXT.test(n.tagName)||n.hasAttribute('data-op-ink'))return;
    const app=document.querySelector('#app');
    for(let a=n.parentElement;a&&a!==app&&a!==document.body;a=a.parentElement){if(a.hasAttribute('data-op-surf')||hasBg(a))return;}
    n.setAttribute('data-op-ink','');
  };
  const tagSurface=n=>{
    if(n.nodeType!==1||n.hasAttribute('data-op-surf')||SKIP.test(n.tagName)||n.getAttribute('role')==='button')return;
    if(n.tagName==='A'&&!(n.offsetWidth>=200&&n.offsetHeight>=56))return;
    const m=getComputedStyle(n).backgroundColor.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/); if(!m)return;
    const r=+m[1],g=+m[2],b=+m[3],a=m[4]===undefined?1:+m[4]; if(a<.95||Math.max(r,g,b)-Math.min(r,g,b)>45)return;
    const l=(.2126*r+.7152*g+.0722*b)/255; if(l>.45)return;
    const k=l<.12?'0':l<.2?'1':l<.33?'2':'3'; n.setAttribute('data-op-surf',k);
    if((k==='2'||k==='3')&&n.offsetWidth>=200&&n.offsetHeight>=56)n.setAttribute('data-op-card','');
  };
  const tagTree=root=>{if(root.nodeType!==1)return;tagSurface(root);let n=0;for(const e of root.querySelectorAll('*')){if(++n>400)break;tagSurface(e);}};
  const apply=()=>{
    document.body.classList.toggle('op-auth-page',location.pathname.startsWith('/auth'));
    document.body.classList.toggle('op-admin-page',location.pathname.startsWith('/admin'));
    // Hide the stock navigation chrome only; leave page controls and functionality intact.
    const app=document.querySelector('#app'); if(!app)return;
    app.querySelectorAll('a[href^="/server/"]').forEach(a=>{a.removeAttribute('data-op-link-scraped');});
    app.querySelectorAll('button,[role="button"]').forEach(b=>{if(!b.hasAttribute('aria-label')&&!b.textContent.trim())b.setAttribute('aria-hidden','true');});
  };
  apply();markNative();window.addEventListener('popstate',()=>setTimeout(markNative,0));window.addEventListener('op:navigate',()=>setTimeout(markNative,0));
  let mq=0;const queue=new Set();
  const mo0=new MutationObserver(list=>{list.forEach(m=>m.addedNodes.forEach(n=>queue.add(n)));if(mq)return;mq=requestAnimationFrame(()=>{mq=0;markNative();const batch=[...queue];queue.clear();batch.slice(0,200).forEach(tagTree);});});
  mo0.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
  const mo=new MutationObserver(list=>{list.forEach(m=>m.addedNodes.forEach(n=>queue.add(n)));if(mq)return;mq=requestAnimationFrame(()=>{mq=0;const batch=[...queue];queue.clear();batch.slice(0,200).forEach(tagTree);});});
  const mp=document.querySelector('#modal-portal'); if(mp)mo.observe(mp,{childList:true,subtree:true});
  const first=document.querySelector('#app'); if(first)tagTree(first);
  window.addEventListener('popstate',apply);window.addEventListener('op:navigate',apply);
  new MutationObserver(()=>{if(!document.body.classList.contains('op-page-refresh')){document.body.classList.add('op-page-refresh');requestAnimationFrame(()=>document.body.classList.remove('op-page-refresh'));}}).observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
}
