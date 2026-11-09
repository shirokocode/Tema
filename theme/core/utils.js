export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export const serverId = () => location.pathname.match(/^\/server\/([^/]+)/)?.[1] || null;
export const isFilesRoute = () => !!serverId() && /^\/server\/[^/]+\/files(?:\/(?:edit|new))?\/?$/.test(location.pathname);
import { icon as svgIcon } from './icons.js';
const NAV_ICON = { servers:'layout-grid', account:'user', api:'key-round', ssh:'terminal', activity:'activity', admin:'shield', console:'square-terminal', files:'folder', databases:'database', schedules:'clock', users:'users', backups:'archive', network:'network', startup:'play', settings:'settings', palette:'search', logout:'log-out', refresh:'refresh-cw', folder:'folder', file:'file' };
export const icon = (name, opts = { size: 20, stroke: 1.6 }) => svgIcon(NAV_ICON[name] || 'file', opts);
export function toast(message, type = 'info') {
  let root = $('#op-toasts'); if (!root) { root = document.createElement('div'); root.id = 'op-toasts'; root.setAttribute('aria-live','polite'); document.body.append(root); }
  const node = document.createElement('div'); node.className = `op-toast op-toast-${type}`; node.textContent = String(message); root.append(node);
  window.setTimeout(() => node.remove(), 5000);
}
export function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { Accept:'application/json', 'X-Requested-With':'XMLHttpRequest', ...(options.headers || {}) };
  if (method !== 'GET' && method !== 'HEAD') {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (match) headers['X-XSRF-TOKEN'] = decodeURIComponent(match[1]);
  }
  return fetch(url, { credentials:'same-origin', ...options, method, headers }).then(async response => {
    if (!response.ok) {
      let detail = ''; try { const j = await response.clone().json(); detail = j.errors?.map(e => e.detail || e.code).filter(Boolean).join('; ') || j.message || ''; } catch {}
      throw new Error(detail || `Permintaan gagal (${response.status})`);
    }
    return response;
  });
}
export const apiBase = id => `/api/client/servers/${encodeURIComponent(id)}`;

export function installRouteHook() {
  if (window.__opRouteHook) return; window.__opRouteHook = true;
  let last = location.pathname;
  const emit = () => { if (location.pathname !== last) { last = location.pathname; window.dispatchEvent(new Event('op:navigate')); } };
  ['pushState', 'replaceState'].forEach(k => { const orig = history[k]; history[k] = function () { const r = orig.apply(this, arguments); setTimeout(emit, 0); return r; }; });
  window.addEventListener('popstate', emit);
  setInterval(emit, 500);
}
