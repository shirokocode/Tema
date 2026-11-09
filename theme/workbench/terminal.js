import { $, serverId, request, apiBase, toast } from '../core/utils.js';

const S = { ws: null, id: null, status: 'offline', retry: 0, hist: [], hi: -1 };
const ANSI = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07]*\x07/g;
import { icon as svg } from '../core/icons.js';
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const mb = b => (b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(0) + ' MB');
const dur = ms => { const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m`; };

function panel() {
  let p = $('#op-terminal'); if (p) return p;
  p = el('section'); p.id = 'op-terminal'; p.hidden = true;
  p.innerHTML = '<div class="op-terminal-head"><span class="op-term-dot"></span><strong>Terminal</strong><span class="op-term-state">offline</span><span class="op-term-spacer"></span>' +
    '<button data-p="start" title="Start">'+svg('play',{size:13})+'<span>Start</span></button><button data-p="restart" title="Restart">'+svg('refresh-cw',{size:13})+'<span>Restart</span></button><button data-p="stop" title="Stop">'+svg('stop',{size:13})+'<span>Stop</span></button><button data-p="kill" title="Kill">'+svg('zap',{size:13})+'<span>Kill</span></button><button data-a="clear" title="Bersihkan" aria-label="Bersihkan">'+svg('eraser',{size:14})+'</button><button data-a="close" title="Tutup" aria-label="Tutup terminal">'+svg('x',{size:14})+'</button></div>' +
    '<pre class="op-terminal-output" aria-live="polite"></pre><div class="op-terminal-input"><span>$</span><input autocomplete="off" spellcheck="false" placeholder="Ketik perintah server lalu Enter"></div>';
  document.body.append(p);
  p.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) send('set state', [b.dataset.p]);
    if (b.dataset.a === 'clear') $('.op-terminal-output', p).textContent = '';
    if (b.dataset.a === 'close') toggle(false);
  });
  const input = $('input', p);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) { send('send command', [input.value]); S.hist.unshift(input.value); S.hi = -1; input.value = ''; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (S.hi < S.hist.length - 1) input.value = S.hist[++S.hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = S.hi > 0 ? S.hist[--S.hi] : (S.hi = -1, ''); }
  });
  return p;
}
function write(text) {
  const out = $('.op-terminal-output', panel()); const stick = out.scrollTop + out.clientHeight >= out.scrollHeight - 30;
  out.append(document.createTextNode(String(text).replace(ANSI, '').replace(/\r?\n?$/, '\n')));
  while (out.childNodes.length > 1500) out.removeChild(out.firstChild);
  if (stick) out.scrollTop = out.scrollHeight;
}
function setStatus(s) { S.status = s; const p = panel(); $('.op-term-state', p).textContent = s; p.dataset.status = s; renderMid(); }
function renderMid(stats) {
  const mid = $('#op-statusbar .op-status-mid'); if (!mid) return;
  if (!serverId()) { mid.textContent = ''; return; }
  if (stats) S.stats = stats;
  const st = S.stats; const parts = [`● ${S.status}`];
  if (st && S.status !== 'offline') parts.push(`CPU ${Number(st.cpu_absolute).toFixed(1)}%`, `RAM ${mb(st.memory_bytes)}${st.memory_limit_bytes ? ' / ' + mb(st.memory_limit_bytes) : ''}`, `Disk ${mb(st.disk_bytes)}`, `Up ${dur(st.uptime)}`);
  mid.textContent = parts.join('  •  ');
}
function send(event, args) { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify({ event, args })); else toast('Terminal belum terhubung ke server.', 'error'); }
async function creds() { const j = await (await request(`${apiBase(S.id)}/websocket`)).json(); return j.data || j; }
async function refreshToken() { try { const { token } = await creds(); send('auth', [token]); } catch (e) { write('[Onepay-ID] Gagal memperbarui token: ' + e.message); } }
function handle(m) {
  const a = m.args || [];
  switch (m.event) {
    case 'auth success': S.retry = 0; send('send logs', [null]); send('send stats', [null]); break;
    case 'console output': case 'install output': case 'daemon message': write(a[0]); break;
    case 'status': setStatus(a[0]); break;
    case 'stats': try { renderMid(JSON.parse(a[0])); if (JSON.parse(a[0]).state) setStatus(JSON.parse(a[0]).state); } catch { } break;
    case 'token expiring': refreshToken(); break;
    case 'token expired': case 'jwt error': connect(true); break;
  }
}
async function connect(force) {
  const id = serverId(); if (!id) return;
  if (!force && S.ws && S.id === id && S.ws.readyState <= 1) return;
  disconnect(); S.id = id; panel();
  try {
    const { token, socket } = await creds();
    const ws = new WebSocket(socket); S.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ event: 'auth', args: [token] }));
    ws.onmessage = ev => { try { handle(JSON.parse(ev.data)); } catch { } };
    ws.onclose = () => { if (S.ws !== ws) return; S.ws = null; setStatus('offline'); if (S.id === serverId() && S.retry++ < 10) setTimeout(() => connect(), 3000); };
  } catch (e) { write('[Onepay-ID] Gagal terhubung: ' + e.message); if (S.retry++ < 5) setTimeout(() => connect(), 5000); }
}
function disconnect() { const ws = S.ws; S.ws = null; if (ws) try { ws.close(); } catch { } }
function toggle(force) {
  if (!serverId()) { toast('Buka sebuah server untuk memakai terminal.'); return; }
  const p = panel(); p.hidden = typeof force === 'boolean' ? !force : !p.hidden;
  document.body.classList.toggle('op-term-open', !p.hidden);
  if (!p.hidden) { connect(); setTimeout(() => $('input', p).focus(), 50); }
}
export function initTerminal() {
  panel();
  window.addEventListener('op:toggle-terminal', () => toggle());
  window.addEventListener('op:route', () => {
    const p = panel();
    if (serverId()) { if (S.id !== serverId()) { $('.op-terminal-output', p).textContent = ''; S.stats = null; } connect(); renderMid(); }
    else { disconnect(); S.id = null; p.hidden = true; document.body.classList.remove('op-term-open'); renderMid(); }
  });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggle(); } });
  if (serverId()) connect();
}
