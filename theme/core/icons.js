/* Ikon bergaya Lucide: sprite lokal (tanpa CDN). icon(name,{size,stroke,cls}) -> string <svg><use/></svg> */
import { SPRITE_SVG } from './sprite.js';
export function ensureSprite() {
  if (document.getElementById('op-sprite')) return;
  const host = document.createElement('div'); host.id = 'op-sprite'; host.setAttribute('aria-hidden', 'true'); host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  host.innerHTML = SPRITE_SVG; (document.body || document.documentElement).prepend(host);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureSprite, { once: true }); else ensureSprite();
export function icon(name, { size = 18, stroke = 1.6, cls = '' } = {}) {
  return `<svg class="op-i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
const EXT = {
  js:['file-code','js'],mjs:['file-code','js'],cjs:['file-code','js'],ts:['file-code','ts'],jsx:['file-code','js'],tsx:['file-code','ts'],
  json:['file-json','json'],yml:['file-cog','yml'],yaml:['file-cog','yml'],toml:['file-cog','yml'],properties:['file-cog','yml'],
  md:['file-text','md'],txt:['file-text','txt'],html:['file-code','html'],htm:['file-code','html'],css:['file-code','css'],php:['file-code','php'],py:['file-code','py'],
  sh:['file-terminal','sh'],bash:['file-terminal','sh'],log:['file-text','log'],env:['file-cog','env'],
  png:['file-image','img'],jpg:['file-image','img'],jpeg:['file-image','img'],gif:['file-image','img'],webp:['file-image','img'],ico:['file-image','img'],svg:['file-image','img'],
  zip:['file-archive','zip'],gz:['file-archive','zip'],tar:['file-archive','zip'],tgz:['file-archive','zip'],jar:['file-archive','zip'],
};
/* ikon file per ekstensi + warna aksen halus (kelas op-ft-*) */
export function fileIcon(name, { dir = false, open = false, size = 16 } = {}) {
  if (dir) return icon(open ? 'folder-open' : 'folder', { size, cls: 'op-ft-folder' });
  const base = String(name).toLowerCase();
  const ext = base === '.env' || base.startsWith('.env.') ? 'env' : base.split('.').pop();
  const [sym, kind] = EXT[ext] || ['file', 'def'];
  return icon(sym, { size, cls: 'op-ft-' + kind });
}
