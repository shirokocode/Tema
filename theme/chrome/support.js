/* Tombol Support (WhatsApp + saluran resmi): hanya di luar halaman server (login, dashboard, akun).
   Tombol bisa digeser (drag / sentuh-geser); posisinya diingat. Ketuk tanpa menggeser = buka menu. */
import { serverId } from '../core/utils.js';
const WA = 'https://wa.me/62895623055666';
const CHANNEL = 'https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q';
const KEY = 'op-support-pos';
const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>';
const MEGA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6"/></svg>';
export function initSupport() {
  if (document.getElementById('op-support')) return;
  const root = document.createElement('div'); root.id = 'op-support';
  root.innerHTML = `<div class="op-sup-menu" id="op-sup-menu" role="menu" hidden>
      <a role="menuitem" class="op-sup-item op-sup-wa" href="${WA}" target="_blank" rel="noopener noreferrer"><span class="op-sup-ic">${WA_ICON}</span><span><b>Chat Support</b><small>WhatsApp +62 895-6230-55666</small></span></a>
      <a role="menuitem" class="op-sup-item op-sup-ch" href="${CHANNEL}" target="_blank" rel="noopener noreferrer"><span class="op-sup-ic">${MEGA_ICON}</span><span><b>Saluran Resmi</b><small>Info &amp; pengumuman</small></span></a>
    </div>
    <button type="button" class="op-sup-fab" aria-expanded="false" aria-controls="op-sup-menu" aria-label="Support (geser untuk memindahkan)">${WA_ICON}<span>Support</span></button>`;
  document.body.append(root);
  const fab = root.querySelector('.op-sup-fab'), menu = root.querySelector('.op-sup-menu');
  const set = open => { menu.hidden = !open; fab.setAttribute('aria-expanded', String(open)); };

  // posisi disimpan sebagai pecahan (0..1) area yang tersedia, supaya tetap masuk akal saat layar diputar/di-resize
  let pos = { fx: 1, fy: 1 };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && isFinite(v.fx) && isFinite(v.fy)) pos = { fx: Math.min(1, Math.max(0, v.fx)), fy: Math.min(1, Math.max(0, v.fy)) }; } catch { }
  const M = 8;
  const bounds = () => {
    const top = (document.getElementById('op-titlebar')?.offsetHeight || 40) + M, bottom = (document.getElementById('op-statusbar')?.offsetHeight || 24) + M;
    const w = fab.offsetWidth || 120, h = fab.offsetHeight || 44;
    return { minX: M, minY: top, maxX: Math.max(M, innerWidth - w - M), maxY: Math.max(top, innerHeight - bottom - h - M) };
  };
  const place = () => {
    if (root.hidden) return; const b = bounds();
    const x = b.minX + pos.fx * (b.maxX - b.minX), y = b.minY + pos.fy * (b.maxY - b.minY);
    root.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    root.classList.toggle('below', pos.fy < .5); root.classList.toggle('left', pos.fx < .5);
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch { } };

  let drag = null, moved = false;
  fab.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const r = root.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, on: false };
    try { fab.setPointerCapture(e.pointerId); } catch { }
  });
  fab.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    if (!drag.on) { drag.on = true; moved = true; set(false); root.classList.add('dragging'); }
    const b = bounds(), x = Math.min(b.maxX, Math.max(b.minX, e.clientX - drag.dx)), y = Math.min(b.maxY, Math.max(b.minY, e.clientY - drag.dy));
    pos = { fx: b.maxX > b.minX ? (x - b.minX) / (b.maxX - b.minX) : 1, fy: b.maxY > b.minY ? (y - b.minY) / (b.maxY - b.minY) : 1 };
    place();
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const was = drag.on; drag = null; root.classList.remove('dragging');
    try { fab.releasePointerCapture(e.pointerId); } catch { }
    if (was) { save(); setTimeout(() => { moved = false; }, 0); }
  };
  fab.addEventListener('pointerup', end); fab.addEventListener('pointercancel', end);
  fab.addEventListener('click', e => { e.stopPropagation(); if (moved) { moved = false; return; } set(menu.hidden); });
  document.addEventListener('click', e => { if (!root.contains(e.target)) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  menu.addEventListener('click', () => setTimeout(() => set(false), 120));
  window.addEventListener('resize', place); window.addEventListener('orientationchange', () => setTimeout(place, 200));
  const sync = () => { root.hidden = !!serverId(); if (root.hidden) set(false); else place(); };
  sync(); ['popstate', 'op:route', 'op:navigate'].forEach(ev => window.addEventListener(ev, () => setTimeout(sync, 0)));
  requestAnimationFrame(place); // ukuran tombol baru final setelah render pertama
}
