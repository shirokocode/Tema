import { $, $$, serverId, isFilesRoute, request, apiBase, toast } from '../core/utils.js';
import { initTerminal } from './terminal.js';
import { highlight } from './highlight.js';
import { skeletonOverlay, skeletons } from '../core/ui.js';
import { icon as svg, fileIcon } from '../core/icons.js';

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const ROOT = '/'; // Wings memakai "/" sebagai root volume server (tampil sebagai /home/container di panel)
const LANG = { js:'javascript', mjs:'javascript', cjs:'javascript', ts:'typescript', tsx:'typescript', jsx:'javascript', json:'json', yml:'yaml', yaml:'yaml', toml:'ini', properties:'ini', py:'python', sh:'shell', php:'php', html:'html', css:'css', md:'markdown', sql:'sql', xml:'xml', env:'ini', txt:'plaintext', go:'go', java:'java', conf:'ini' };
const state = { id: null, dirs: new Map(), expanded: new Set([ROOT]), cwd: ROOT, opened: new Map(), active: null, dirty: new Set(), editor: null, poll: null, select: null };

const enc = encodeURIComponent;
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const join = (a, b) => (a === '/' ? `/${b}` : `${a}/${b}`);
const parent = p => p.substring(0, p.lastIndexOf('/')) || '/';
const base = p => p.split('/').pop();
const api = (endpoint, params) => `${apiBase(state.id)}${endpoint}${params ? '?' + params : ''}`;
const fail = e => toast(e?.message || 'Terjadi kesalahan.', 'error');
const jsonBody = o => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const textOf = s => new TextEncoder().encode(s).length;
function rel(root, target) {
  if (root === '/') return target.replace(/^\//, '');
  if (target.startsWith(root + '/')) return target.slice(root.length + 1);
  return '../'.repeat(root.split('/').filter(Boolean).length) + target.replace(/^\//, '');
}
function icon(name) { const e = name.split('.').pop().toLowerCase(); return ({ js:'JS', ts:'TS', json:'{}', yml:'YML', yaml:'YML', py:'PY', sh:'$_', php:'PHP', md:'MD', html:'<>', css:'#', png:'▧', jpg:'▧', webp:'▧', zip:'ZIP', log:'≡', env:'ENV', properties:'CFG' })[e] || '·'; }

/* ---------- data ---------- */
async function loadDir(path) {
  const d = await (await request(api('/files/list', `directory=${enc(path)}`))).json();
  const rows = Array.isArray(d) ? d : (d.data || []);
  const entries = rows.map(r => { const f = r.attributes || r; return { name: f.name, size: f.size, mtime: f.modified_at, isDir: !f.is_file, path: join(path, f.name) }; })
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || String(a.name).localeCompare(String(b.name)));
  state.dirs.set(path, entries);
  return entries;
}
async function refreshAll() {
  await Promise.all([...state.expanded].map(p => loadDir(p).catch(() => { if (p !== ROOT) state.expanded.delete(p); })));
  renderTree(); renderBreadcrumb();
}
async function toggleDir(f) {
  state.cwd = f.path;
  if (state.expanded.has(f.path)) state.expanded.delete(f.path);
  else { state.expanded.add(f.path); try { await loadDir(f.path); } catch (e) { state.expanded.delete(f.path); fail(e); } }
  renderTree(); renderBreadcrumb();
}

/* ---------- explorer tree ---------- */
function renderTree() {
  const root = $('#op-explorer'); if (!root || !state.id) return;
  const scroll = root.querySelector('.op-file-tree')?.scrollTop || 0;
  root.replaceChildren();
  const head = el('div', 'op-explorer-head'); head.append(el('strong', '', 'EXPLORER'));
  const actions = el('div', 'op-file-actions');
  [['File baru', 'file', () => newItem(false)], ['Folder baru', 'folder-plus', () => newItem(true)], ['Pilih banyak (archive / hapus)', 'check-square', () => { state.select = state.select ? null : new Set(); renderTree(); }], ['Refresh', 'refresh-cw', () => refreshAll().catch(fail)], ['Collapse all', 'chevrons-down-up', () => { state.expanded = new Set([ROOT]); state.cwd = ROOT; renderTree(); renderBreadcrumb(); }]]
    .forEach(([label, sym, fn]) => { const b = el('button', 'op-ico-btn' + (sym === 'refresh-cw' ? ' op-spin-hover' : ''), ''); b.innerHTML = svg(sym, { size: 16 }); b.title = label; b.setAttribute('aria-label', label); b.onclick = fn; actions.append(b); });
  head.append(actions); root.append(head);
  root.append(el('div', 'op-tree-path', 'CONTAINER' + (state.cwd === ROOT ? '' : ' › ' + state.cwd.slice(1))));
  const tree = el('div', 'op-file-tree');
  const walk = (dir, depth) => {
    const list = state.dirs.get(dir) || [];
    if (!list.length && depth === 0) tree.append(el('p', 'op-empty', 'Folder ini kosong. Gunakan tombol File baru di atas.'));
    for (const f of list) {
      const sel = state.select, picked = !!(sel && sel.has(f.path));
      const line = el('div', 'op-file-line');
      const row = el('button', 'op-file-row' + (state.active === f.path ? ' active' : '') + (state.cwd === f.path ? ' cwd' : '') + (picked ? ' selected' : ''));
      row.style.paddingLeft = (8 + depth * 14) + 'px'; row.title = f.path;
      const ic = el('span', 'op-file-icon', ''); ic.innerHTML = sel ? svg(picked ? 'check-square' : 'square', { size: 16, cls: picked ? 'op-ft-sel' : '' }) : (f.isDir ? svg(state.expanded.has(f.path) ? 'chevron-down' : 'chevron-right', { size: 14, cls: 'op-chev' }) + fileIcon(f.name, { dir: true, open: state.expanded.has(f.path) }) : '<i class="op-chev-sp"></i>' + fileIcon(f.name)); row.append(ic, el('span', 'op-file-name', f.name));
      row.onclick = () => {
        if (sel) { picked ? sel.delete(f.path) : sel.add(f.path); renderTree(); return; }
        if (f.isDir) toggleDir(f); else { state.cwd = parent(f.path); openFile(f.path); window.dispatchEvent(new CustomEvent('op:side', { detail: { on: false, persist: false, only_compact: true } })); }
      };
      row.oncontextmenu = e => { e.preventDefault(); contextMenu(e.clientX, e.clientY, f); };
      row.draggable = true;
      row.ondragstart = e => e.dataTransfer.setData('text/onepay-path', f.path);
      if (f.isDir) { row.ondragover = e => e.preventDefault(); row.ondrop = e => { e.preventDefault(); e.stopPropagation(); const from = e.dataTransfer.getData('text/onepay-path'); if (from) movePath(from, f.path); else if (e.dataTransfer.files?.length) upload(e.dataTransfer.files, f.path); }; }
      const more = el('button', 'op-row-menu', ''); more.innerHTML = svg('more-vertical', { size: 16 }); more.title = 'Menu'; more.setAttribute('aria-label', 'Menu ' + f.name);
      more.onclick = e => { e.stopPropagation(); const r = more.getBoundingClientRect(); contextMenu(r.left, r.bottom, f); };
      line.append(row, more); tree.append(line);
      if (f.isDir && state.expanded.has(f.path)) walk(f.path, depth + 1);
    }
  };
  walk(ROOT, 0);
  tree.ondragover = e => e.preventDefault();
  tree.ondrop = e => { e.preventDefault(); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files, state.cwd); };
  root.append(tree);
  if (state.select) {
    const bar = el('div', 'op-bulk'); const n = state.select.size; bar.append(el('span', '', `${n} dipilih`));
    const mk = (label, fn) => { const b = el('button', '', label); b.disabled = !n && label !== 'Batal'; b.onclick = fn; bar.append(b); };
    mk('Archive', () => compressPaths([...state.select])); mk('Hapus', () => deletePaths([...state.select])); mk('Batal', () => { state.select = null; renderTree(); });
    root.append(bar);
  }
  const up = el('button', 'op-upload', 'Upload ke folder terpilih'); up.onclick = () => pickUpload(state.cwd); root.append(up);
  tree.scrollTop = scroll;
}
function pickUpload(dir) { const i = el('input'); i.type = 'file'; i.multiple = true; i.onchange = () => upload(i.files, dir); i.click(); }
function renderBreadcrumb() {
  const node = $('#op-breadcrumbs'); if (!node) return; node.replaceChildren();
  const path = state.active || state.cwd;
  const crumb = (label, p) => { const b = el('button', '', label); b.onclick = () => { state.cwd = p; if (!state.expanded.has(p)) { state.expanded.add(p); loadDir(p).then(() => { renderTree(); renderBreadcrumb(); }).catch(fail); } else { renderTree(); renderBreadcrumb(); } }; return b; };
  node.append(crumb('container', ROOT));
  let acc = '';
  path.split('/').filter(Boolean).forEach(part => { acc += '/' + part; const sep = el('span', 'op-crumb-sep', ''); sep.innerHTML = svg('chevron-right', { size: 12 }); node.append(sep, crumb(part, acc)); });
}

/* ---------- tabs & editor ---------- */
function renderTabs() {
  const tabs = $('#op-tabs'); if (!tabs) return; tabs.replaceChildren();
  for (const path of state.opened.keys()) {
    const b = el('button', 'op-tab' + (state.active === path ? ' active' : ''));
    const ti = el('span', 'op-tab-ico', ''); ti.innerHTML = state.dirty.has(path) ? '<i class="op-dirty" title="Belum disimpan"></i>' : fileIcon(base(path), { size: 14 }); b.append(ti, el('span', '', base(path)));
    const x = el('span', 'op-tab-close', ''); x.innerHTML = svg('x', { size: 13 }); x.setAttribute('aria-label', 'Tutup tab'); x.setAttribute('role', 'button'); x.onclick = e => { e.stopPropagation(); closeFile(path); }; b.append(x);
    b.onclick = () => { state.active = path; state.cwd = parent(path); renderTabs(); renderEditor(); renderTree(); renderBreadcrumb(); };
    tabs.append(b);
  }
}
async function openFile(path) {
  if (state.opened.has(path)) { state.active = path; renderTabs(); renderEditor(); renderTree(); renderBreadcrumb(); return; }
  const skel = skeletonOverlay($('#op-workbench'), () => skeletons.editor(16));
  try {
    const name = base(path), meta = (state.dirs.get(parent(path)) || []).find(f => f.path === path);
    if (meta && Number(meta.size) > MAX_TEXT_BYTES) throw new Error('File lebih besar dari 2 MiB. Unduh file atau gunakan Tampilan klasik.');
    if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|jar|woff2?|ttf|mp4|mp3|sqlite|db)$/i.test(name)) {
      const d = await (await request(api('/files/download', `file=${enc(path)}`))).json(); const u = d.attributes?.url || d.url;
      if (/\.(png|jpe?g|gif|webp)$/i.test(name) && u) { showImage(u, name); return; }
      throw new Error('File biner tidak bisa dibuka di editor. Gunakan menu Download.');
    }
    const text = await (await request(api('/files/contents', `file=${enc(path)}`))).text();
    if (textOf(text) > MAX_TEXT_BYTES) throw new Error('File lebih besar dari 2 MiB.');
    state.opened.set(path, { text, original: text, language: LANG[name.split('.').pop().toLowerCase()] || 'plaintext', mtime: meta?.mtime || null });
    state.active = path; state.cwd = parent(path);
    renderTabs(); renderEditor(); renderTree(); renderBreadcrumb(); persistTabs();
  } catch (e) { fail(e); } finally { skel.done(); }
}
function renderEditor() {
  const host = $('#op-editor'); if (!host) return; host.replaceChildren();
  const data = state.opened.get(state.active);
  if (!data) { host.append(el('div', 'op-welcome', 'Pilih file di Explorer untuk mulai mengedit.')); state.editor = null; updateStatus(); return; }
  const bar = el('div', 'op-editor-toolbar'); bar.append(el('span', 'op-active-file', state.active));
  const save = el('button', 'op-btn op-btn-primary', 'Simpan  Ctrl+S'); save.onclick = saveActive; bar.append(save); host.append(bar);
  const ta = el('textarea', 'op-text-editor'); ta.spellcheck = false; ta.value = data.text; ta.setAttribute('aria-label', `Editor ${state.active}`);
  ta.addEventListener('input', () => { data.text = ta.value; if (data.text !== data.original) state.dirty.add(state.active); else state.dirty.delete(state.active); renderTabs(); updateStatus(); });
  ta.addEventListener('keyup', updateStatus); ta.addEventListener('click', updateStatus);
  ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
  // Lapisan highlight: <pre> di belakang textarea transparan (textarea tetap sumber kebenaran: caret, seleksi, IME).
  const wrap = el('div', 'op-code'), pre = el('pre', 'op-hl'), code = el('code'); pre.setAttribute('aria-hidden', 'true'); pre.append(code);
  ta.setAttribute('wrap', 'off'); wrap.append(pre, ta); host.append(wrap); state.editor = ta;
  const sync = () => { code.style.transform = `translate(${-ta.scrollLeft}px,${-ta.scrollTop}px)`; };
  const paint = () => {
    const cs = getComputedStyle(ta);
    Object.assign(pre.style, { fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, tabSize: cs.tabSize, padding: cs.padding });
    const html = highlight(ta.value, data.language);
    if (html === null) { wrap.classList.remove('op-hl-on'); code.textContent = ''; return; }
    code.innerHTML = html + '\n'; wrap.classList.add('op-hl-on'); sync();
  };
  let raf = 0; const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  ta.addEventListener('input', schedule); ta.addEventListener('scroll', sync, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(ta);
  paint(); updateStatus();
}
function updateStatus() {
  const left = $('#op-statusbar .op-status-left'), right = $('#op-statusbar .op-status-right'); if (!left || !right || !isFilesRoute()) return;
  const ta = state.editor, data = state.opened.get(state.active);
  if (!ta || !data) { left.textContent = `Server ${state.id || ''}`; right.textContent = 'Editor siap'; return; }
  const before = ta.value.slice(0, ta.selectionStart).split('\n');
  left.textContent = `Ln ${before.length}, Col ${before[before.length - 1].length + 1}`;
  right.textContent = `${data.language} • Spaces: 4 • UTF-8 • ${state.dirty.has(state.active) ? 'Belum disimpan' : 'Tersimpan'}`;
}
async function saveActive() {
  const path = state.active, data = state.opened.get(path); if (!data) return;
  try {
    if (data.mtime) { const latest = (await loadDir(parent(path))).find(f => f.path === path); if (latest?.mtime && latest.mtime !== data.mtime && !confirm('File berubah di server sejak dibuka. Timpa dengan versi lokal?')) return; }
    await request(api('/files/write', `file=${enc(path)}`), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: data.text });
    data.original = data.text; state.dirty.delete(path);
    data.mtime = (await loadDir(parent(path)).catch(() => []) || []).find(f => f.path === path)?.mtime || data.mtime;
    renderTabs(); renderTree(); updateStatus(); toast('File tersimpan.', 'success');
  } catch (e) { fail(e); }
}
function closeFile(path) {
  if (state.dirty.has(path) && !confirm(`${base(path)} belum disimpan. Tutup tanpa menyimpan?`)) return;
  state.opened.delete(path); state.dirty.delete(path);
  if (state.active === path) state.active = [...state.opened.keys()].pop() || null;
  renderTabs(); renderEditor(); renderTree(); renderBreadcrumb(); persistTabs();
}
function persistTabs() { try { sessionStorage.setItem(`op-tabs-${state.id}`, JSON.stringify([...state.opened.keys()])); } catch { } }
function showImage(url, name) { const m = el('div', 'op-image-preview'); const c = el('button', '', 'Tutup'); c.onclick = () => m.remove(); const i = el('img'); i.alt = name; i.src = url; m.append(c, i); document.body.append(m); }

/* ---------- operasi file ---------- */
async function newItem(folder) {
  const name = prompt(folder ? 'Nama folder baru:' : 'Nama file baru:'); if (!name) return;
  if (name.includes('/') || name === '.' || name === '..') { toast('Nama tidak boleh berisi path.', 'error'); return; }
  try {
    if (folder) await request(api('/files/create-folder'), { method: 'POST', ...jsonBody({ root: state.cwd, name }) });
    else await request(api('/files/write', `file=${enc(join(state.cwd, name))}`), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: '' });
    state.expanded.add(state.cwd); await refreshAll();
    if (!folder) openFile(join(state.cwd, name));
  } catch (e) { fail(e); }
}
async function renameItem(f) {
  const name = prompt('Nama baru:', f.name); if (!name || name === f.name) return;
  try { await request(api('/files/rename'), { method: 'PUT', ...jsonBody({ root: parent(f.path), files: [{ from: f.name, to: name }] }) }); if (state.opened.has(f.path) && !state.dirty.has(f.path)) closeFile(f.path); await refreshAll(); } catch (e) { fail(e); }
}
const ARCHIVE_RE = /\.(zip|tar|tgz|gz|bz2|xz|rar|7z)$/i;
const groupByParent = paths => { const m = new Map(); for (const p of paths) { const r = parent(p); if (!m.has(r)) m.set(r, []); m.get(r).push(base(p)); } return m; };
const removeItem = f => deletePaths([f.path]);
async function deletePaths(paths) {
  if (!paths.length) return;
  if (!confirm(paths.length === 1 ? `Hapus ${base(paths[0])}? Tindakan ini tidak bisa dibatalkan.` : `Hapus ${paths.length} item terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    for (const [root, files] of groupByParent(paths)) await request(api('/files/delete'), { method: 'POST', ...jsonBody({ root, files }) });
    paths.forEach(p => { if (state.opened.has(p)) { state.dirty.delete(p); closeFile(p); } });
    state.select = null; await refreshAll(); toast('Berhasil dihapus.', 'success');
  } catch (e) { fail(e); }
}
async function compressPaths(paths) {
  if (!paths.length) return;
  try {
    toast('Membuat arsip… tunggu sebentar.');
    for (const [root, files] of groupByParent(paths)) await request(api('/files/compress'), { method: 'POST', ...jsonBody({ root, files }) });
    state.select = null; await refreshAll(); toast('Arsip dibuat.', 'success');
  } catch (e) { fail(e); }
}
async function extractItem(f) {
  try { toast('Mengekstrak… tunggu sebentar.'); await request(api('/files/decompress'), { method: 'POST', ...jsonBody({ root: parent(f.path), file: f.name }) }); await refreshAll(); toast('Ekstrak selesai.', 'success'); } catch (e) { fail(e); }
}
async function moveItem(f) {
  let dest = prompt('Pindahkan ke folder (contoh: /plugins):', parent(f.path)); if (!dest) return;
  dest = '/' + dest.trim().replace(/^\/+|\/+$/g, ''); await movePath(f.path, dest);
}
async function movePath(from, toDir) {
  if (from === toDir || parent(from) === toDir || toDir.startsWith(from + '/')) return;
  try { const root = parent(from); await request(api('/files/rename'), { method: 'PUT', ...jsonBody({ root, files: [{ from: base(from), to: rel(root, join(toDir, base(from))) }] }) }); state.expanded.add(toDir); await refreshAll(); toast('Item dipindahkan.', 'success'); } catch (e) { fail(e); }
}
async function download(f) {
  try { const j = await (await request(api('/files/download', `file=${enc(f.path)}`))).json(); const u = j.attributes?.url || j.url; if (!u) throw new Error('Panel tidak mengembalikan URL unduhan.'); location.href = u; } catch (e) { fail(e); }
}
async function upload(files, dir) {
  try {
    for (const file of files) {
      const j = await (await request(api('/files/upload'))).json(); const target = j.attributes?.url || j.url; if (!target) throw new Error('URL upload tidak tersedia.');
      const u = new URL(target); u.searchParams.set('directory', dir);
      const fd = new FormData(); fd.append('files', file, file.name);
      const r = await fetch(u, { method: 'POST', body: fd }); if (!r.ok) throw new Error(`Upload ${file.name} gagal (${r.status})`);
    }
    state.expanded.add(dir); await refreshAll(); toast('Upload selesai.', 'success');
  } catch (e) { fail(e); }
}
function contextMenu(x, y, f) {
  document.querySelector('.op-context-menu')?.remove();
  const menu = el('div', 'op-context-menu'); menu.append(el('div', 'op-menu-title', f.name));
  menu.style.left = `${Math.max(4, Math.min(x, innerWidth - 220))}px`; menu.style.top = `${Math.max(4, Math.min(y, innerHeight - 330))}px`;
  const acts = [];
  if (f.isDir) acts.push(['File baru di sini', () => { state.cwd = f.path; newItem(false); }], ['Folder baru di sini', () => { state.cwd = f.path; newItem(true); }], ['Upload ke sini', () => pickUpload(f.path)]);
  acts.push(['Rename (F2)', () => renameItem(f)], ['Pindahkan…', () => moveItem(f)], ['Archive (kompres)', () => compressPaths([f.path])]);
  if (!f.isDir && ARCHIVE_RE.test(f.name)) acts.push(['Unarchive (ekstrak di sini)', () => extractItem(f)]);
  if (!f.isDir) acts.push(['Download', () => download(f)]);
  acts.push(['Salin path', () => navigator.clipboard?.writeText(f.path).then(() => toast('Path disalin.'))], ['Pilih banyak', () => { state.select = new Set([f.path]); renderTree(); }], ['Hapus (Del)', () => removeItem(f)]);
  acts.forEach(([label, fn]) => { const b = el('button', label.startsWith('Hapus') ? 'danger' : '', label); b.onclick = () => { menu.remove(); fn(); }; menu.append(b); });
  document.body.append(menu); setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

/* ---------- mount / unmount (di luar #app agar tidak dihapus React) ---------- */
function unmount() {
  $('#op-workbench')?.remove(); document.body.classList.remove('op-wb-on');
  clearInterval(state.poll); state.poll = null;
}
async function mount() {
  if (!isFilesRoute()) return;
  const id = serverId(); let shell = $('#op-workbench');
  document.body.classList.add('op-wb-on');
  if (shell && state.id === id) return;
  if (!shell) {
    shell = el('section'); shell.id = 'op-workbench';
    shell.innerHTML = '<div id="op-editor"><div class="op-welcome">Memuat file server…</div></div><div class="op-workbench-actions"><button type="button" id="op-classic">Tampilan klasik</button></div>';
    document.body.append(shell);
    $('#op-classic', shell).onclick = () => { unmount(); const ex = $('#op-explorer'); if (ex) ex.hidden = true; document.body.classList.remove('op-has-explorer'); toast('Tampilan klasik dipulihkan untuk halaman ini.'); };
  }
  state.id = id; state.dirs.clear(); state.expanded = new Set([ROOT]); state.cwd = ROOT; state.opened.clear(); state.dirty.clear(); state.active = null;
  renderTabs(); renderEditor();
  const skTree = skeletonOverlay(document.body, () => skeletons.tree(11), 'op-skel-fixed op-skel-explorer');
  const skTabs = skeletonOverlay(document.body, () => skeletons.tabs(), 'op-skel-fixed op-skel-tabsbar');
  const skEd = skeletonOverlay($('#op-workbench'), () => skeletons.editor(16));
  try {
    await refreshAll();
    let restored = []; try { restored = JSON.parse(sessionStorage.getItem(`op-tabs-${id}`) || '[]'); } catch { }
    const hash = decodeURIComponent(location.hash.replace(/^#/, '')); if (hash.startsWith('/') && !restored.includes(hash)) restored.push(hash);
    for (const p of restored.slice(-8)) await openFile(p);
    clearInterval(state.poll);
    state.poll = setInterval(() => { if (!document.hidden && $('#op-workbench') && !document.querySelector('.op-context-menu')) refreshAll().catch(() => { }); }, 8000);
  } catch (e) { fail(e); $('#op-editor')?.replaceChildren(el('div', 'op-error', `Tidak dapat memuat file lewat Client API: ${e.message}. Gunakan "Tampilan klasik".`)); } finally { skTree.done(); skTabs.done(); skEd.done(); }
}

export function initWorkbench() {
  initTerminal();
  window.addEventListener('op:route', e => { if (e.detail.files) mount(); else { unmount(); state.id = null; } });
  document.addEventListener('keydown', e => {
    if (!isFilesRoute()) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveActive(); }
    const f = state.active && (state.dirs.get(parent(state.active)) || []).find(x => x.path === state.active);
    if (e.key === 'F2' && f) { e.preventDefault(); renameItem(f); }
    if (e.key === 'Delete' && f && !/TEXTAREA|INPUT/.test(document.activeElement.tagName)) removeItem(f);
  });
  if (isFilesRoute()) mount();
}
