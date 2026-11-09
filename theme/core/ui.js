/* Onepay-ID v1.3 — util UI: mode ringan, ripple, skeleton, tooltip, indikator nav, navigasi keyboard menu. */
import { $, $$ } from './utils.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---- mode ringan: blur dimatikan pada perangkat lemah / reduced-transparency ---- */
export function initLiteMode() {
  const mq = matchMedia('(prefers-reduced-transparency:reduce)');
  const weak = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  const apply = () => document.body.classList.toggle('op-lite', mq.matches || weak);
  apply(); (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
}

/* ---- ripple halus (delegasi) ---- */
const RIPPLE = '.op-btn,.op-title-actions button,.op-file-actions button,.op-editor-toolbar button,.op-workbench-actions button,.op-terminal-head button,.op-bulk button,.op-upload,.op-context-menu button,.op-palette-list button,.op-nav-item,.op-row-menu';
export function initRipple() {
  document.addEventListener('pointerdown', e => {
    if (reduceMotion() || e.button > 0) return;
    const b = e.target.closest(RIPPLE); if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'op-ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.classList.add('op-ripple-host'); b.append(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
}

/* ---- tombol loading: lebar tetap, spinner kecil ---- */
export function setBusy(btn, busy) {
  if (!btn) return;
  if (busy) { btn.style.minWidth = btn.offsetWidth + 'px'; btn.classList.add('op-busy'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
  else { btn.classList.remove('op-busy'); btn.disabled = false; btn.removeAttribute('aria-busy'); btn.style.minWidth = ''; }
}

/* ---- skeleton: tampil hanya bila > 150 ms, tahan >= 300 ms, fade keluar.
        Dipasang sebagai lapisan overlay (absolute) di atas host sehingga konten asli
        bisa dirender di bawahnya tanpa layout shift. ---- */
export const SKEL_DELAY = 150, SKEL_HOLD = 300;
const sk = (cls, style) => { const n = document.createElement('div'); n.className = 'op-skel ' + cls; if (style) n.style.cssText = style; return n; };
export const skeletons = {
  tree: (rows = 9) => { const w = document.createElement('div'); w.className = 'op-skel-stack'; for (let i = 0; i < rows; i++) { const r = document.createElement('div'); r.className = 'op-skel-row'; r.style.paddingLeft = (14 + (i % 3) * 14) + 'px'; r.append(sk('op-skel-ico'), sk('op-skel-line', `width:${42 + ((i * 17) % 40)}%`)); w.append(r); } return w; },
  tabs: () => { const w = document.createElement('div'); w.className = 'op-skel-tabs'; for (let i = 0; i < 3; i++) w.append(sk('op-skel-tab')); return w; },
  editor: (lines = 14) => { const w = document.createElement('div'); w.className = 'op-skel-stack op-skel-editor'; w.append(sk('op-skel-line', 'width:38%;height:12px;margin-bottom:10px')); for (let i = 0; i < lines; i++) w.append(sk('op-skel-line', `width:${28 + ((i * 29) % 60)}%`)); return w; },
  cards: (n = 4) => { const w = document.createElement('div'); w.className = 'op-skel-cards'; for (let i = 0; i < n; i++) w.append(sk('op-skel-card')); return w; },
  table: (rows = 6) => { const w = document.createElement('div'); w.className = 'op-skel-stack'; for (let i = 0; i < rows; i++) { const r = document.createElement('div'); r.className = 'op-skel-trow'; r.append(sk('op-skel-line', 'width:24%'), sk('op-skel-line', 'width:38%'), sk('op-skel-line', 'width:14%')); w.append(r); } return w; }
};
export function skeletonOverlay(host, build, cls = '') {
  if (!host) return { done() {} };
  const fixed = cls.includes('op-skel-fixed');
  let layer = null, shownAt = 0, finished = false;
  const timer = setTimeout(() => {
    if (finished) return;
    if (!fixed && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    layer = document.createElement('div'); layer.className = ('op-skel-layer ' + cls).trim(); layer.setAttribute('aria-hidden', 'true'); layer.append(build());
    host.append(layer); if (!fixed) host.setAttribute('aria-busy', 'true'); shownAt = performance.now();
  }, SKEL_DELAY);
  return {
    done() {
      finished = true; clearTimeout(timer);
      if (!layer) return;
      const wait = Math.max(0, SKEL_HOLD - (performance.now() - shownAt));
      setTimeout(() => { layer.classList.add('out'); if (!fixed) host.removeAttribute('aria-busy'); setTimeout(() => layer.remove(), reduceMotion() ? 0 : 220); }, wait);
    }
  };
}

/* ---- tooltip glass untuk item activity bar ---- */
export function initTooltip() {
  const tip = document.createElement('div'); tip.id = 'op-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.append(tip);
  const show = el => { const t = el.dataset.label; if (!t) return; tip.textContent = t; tip.hidden = false; const r = el.getBoundingClientRect(); tip.style.left = (r.right + 8) + 'px'; tip.style.top = (r.top + r.height / 2) + 'px'; };
  const hide = () => { tip.hidden = true; };
  document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const n = e.target.closest?.('#op-activity .op-nav-item'); if (n) show(n); else hide(); });
  document.addEventListener('focusin', e => { const n = e.target.closest?.('#op-activity .op-nav-item'); if (n && e.target.matches(':focus-visible')) show(n); });
  document.addEventListener('focusout', hide); document.addEventListener('scroll', hide, true);
}

/* ---- indikator aktif yang bergeser halus antar item ---- */
export function initNavIndicator() {
  const ind = document.createElement('div'); ind.id = 'op-nav-ind'; ind.hidden = true; document.body.append(ind);
  const act = $('#op-activity'); if (!act) return;
  let raf = 0;
  const sync = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
    const a = $('.op-nav-item.active', act), vis = a && getComputedStyle(act).display !== 'none';
    if (!vis) { ind.hidden = true; return; }
    const r = a.getBoundingClientRect(), ar = act.getBoundingClientRect();
    const top = Math.max(ar.top, Math.min(r.top, ar.bottom)), bot = Math.max(ar.top, Math.min(r.bottom, ar.bottom));
    ind.hidden = bot - top < 8; ind.style.transform = `translateY(${top}px)`; ind.style.height = (bot - top) + 'px'; ind.style.left = ar.left + 'px';
  }); };
  new MutationObserver(sync).observe(act, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  act.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); addEventListener('op:route', sync);
  document.body.addEventListener('transitionend', sync); sync();
}

/* ---- menu klik kanan / ⋮: fokus awal + panah/Home/End/Esc ---- */
export function initMenuKeyboard() {
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) {
    if (n.nodeType === 1 && n.classList?.contains('op-context-menu')) {
      n.setAttribute('role', 'menu'); $$('button', n).forEach(b => b.setAttribute('role', 'menuitem'));
      const first = $('button', n); first?.focus({ preventScroll: true });
    }
  } }).observe(document.body, { childList: true });
  document.addEventListener('keydown', e => {
    const menu = e.target.closest?.('.op-context-menu') || (e.key === 'Escape' && $('.op-context-menu')); if (!menu) return;
    const items = $$('button', menu), i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); menu.remove(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
  });
}

/* ---- fuzzy match untuk palette: subsequence + skor, kembalikan indeks huruf cocok ---- */
export function fuzzy(query, text) {
  if (!query) return { score: 0, idx: [] };
  const q = query.toLowerCase(), t = text.toLowerCase(), idx = []; let ti = 0, score = 0, last = -2;
  for (const ch of q) { const f = t.indexOf(ch, ti); if (f < 0) return null; idx.push(f); score += (f === last + 1 ? 5 : 1) + (f === 0 || t[f - 1] === ' ' ? 4 : 0); last = f; ti = f + 1; }
  return { score: score - text.length * .01, idx };
}

/* ---- spotlight: cahaya lembut mengikuti kursor di atas tombol (hanya perangkat hover) ---- */
export function initSpotlight() {
  if (!matchMedia('(hover:hover)').matches) return;
  let raf = 0;
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const b = e.target.closest?.(RIPPLE); if (!b) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  }, { passive: true });
}

export function initUI() { initLiteMode(); initRipple(); initSpotlight(); initTooltip(); initMenuKeyboard(); }
window.OnepayUI = { skeletonOverlay, skeletons, setBusy };
