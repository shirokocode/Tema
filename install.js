#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
try { require('dotenv').config(); } catch {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if(m && process.env[m[1]]===undefined) process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/, '$2'); }
}
const os = require('node:os');
const { execFileSync } = require('node:child_process');


const ROOT = __dirname;
const HOST = process.env.SSH_HOST;
const PORT = Number.parseInt(process.env.SSH_PORT || '22', 10);
const USER = process.env.SSH_USER || 'root';
const PANEL = (process.env.PANEL_PATH || '/var/www/pterodactyl').replace(/\/+$/, '');
const MODE = (process.argv.includes('uninstall') ? 'uninstall' : 'install');
const DRY = process.argv.includes('--dry-run');
const SET_APP_NAME = process.argv.includes('--set-app-name') || process.env.SET_APP_NAME === 'true';
const REMOTE_THEME = `${PANEL}/public/themes/onepay-id`;
const OLD_THEME = `${PANEL}/public/themes/vscode-glass`;
const WRAPPER = `${PANEL}/resources/views/templates/wrapper.blade.php`;
const ADMIN = `${PANEL}/resources/views/layouts/admin.blade.php`;
const START = '<!-- ONEPAY-ID:START -->';
const END = '<!-- ONEPAY-ID:END -->';
const OLD_START = '<!-- VSCODE-GLASS:START -->';
const OLD_END = '<!-- VSCODE-GLASS:END -->';
const BLOCK_RE = /\n?[ \t]*<!-- (?:ONEPAY-ID|VSCODE-GLASS):START -->[\s\S]*?<!-- (?:ONEPAY-ID|VSCODE-GLASS):END -->\n?/g;
const BACKUP_SUFFIX = '.onepay.bak';

function log(s) { console.log(s); }
function shellQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function run(conn, command) {
  if (DRY) { log(`[dry-run] ${command.replace(/(SSH_PASSWORD=)[^ ]+/g, '$1[redacted]')}`); return Promise.resolve({ code:0, out:'', err:'' }); }
  return new Promise((resolve, reject) => conn.exec(command, (err, stream) => {
    if (err) return reject(err); let out='', stderr='';
    stream.on('data', d => out += d); stream.stderr.on('data', d => stderr += d);
    stream.on('close', code => resolve({ code, out:out.trim(), err:stderr.trim() }));
  }));
}
const sftpOf = conn => new Promise((resolve,reject)=>conn.sftp((e,s)=>e?reject(e):resolve(s)));
const readRemote = (sftp, file) => new Promise((resolve,reject)=>sftp.readFile(file,'utf8',(e,d)=>e?reject(e):resolve(d)));
const writeRemote = (sftp,file,data)=>new Promise((resolve,reject)=>sftp.writeFile(file,data,e=>e?reject(e):resolve()));
const putRemote = (sftp,local,remote)=>new Promise((resolve,reject)=>sftp.fastPut(local,remote,e=>e?reject(e):resolve()));
async function exists(conn, file) { const r=await run(conn,`test -e ${shellQuote(file)} && echo yes`); return r.out==='yes'; }
async function ensureBackup(conn,file) { if (!(await exists(conn,`${file}${BACKUP_SUFFIX}`))) await run(conn,`cp -p ${shellQuote(file)} ${shellQuote(file+BACKUP_SUFFIX)}`); }
async function cleanBlocks(sftp, file) {
  if (!(await exists(connGlobal,file))) return;
  let content=await readRemote(sftp,file); const cleaned=content.replace(BLOCK_RE,'\n');
  if (cleaned!==content) await writeRemote(sftp,file,cleaned);
}
let connGlobal;
async function inject(conn,sftp,file,snippet) {
  if (!(await exists(conn,file))) { log(`  - lewati file tidak ditemukan: ${file}`); return; }
  await ensureBackup(conn,file); let html=await readRemote(sftp,file); html=html.replace(BLOCK_RE,'\n');
  if (!/<\/head>/i.test(html)) throw new Error(`Tidak menemukan </head> di ${file}; file tidak diubah.`);
  html=html.replace(/<\/head>/i,`    ${START}\n${snippet}\n    ${END}\n</head>`); await writeRemote(sftp,file,html); log(`  ✔ Inject ${path.basename(file)}`);
}
async function removeBlocks(conn,sftp,file) {
  if (!(await exists(conn,file))) return;
  const backup=`${file}${BACKUP_SUFFIX}`;
  if (await exists(conn,backup)) { await run(conn,`cp -p ${shellQuote(backup)} ${shellQuote(file)}`); log(`  ✔ Pulihkan backup ${path.basename(file)}`); return; }
  const html=await readRemote(sftp,file); await writeRemote(sftp,file,html.replace(BLOCK_RE,'\n'));
}
function stampImports(dir, version) {
  // Setiap import relatif diberi ?v=<versi> agar browser/CDN (mis. Cloudflare) tidak mencampur modul lama dan baru.
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { stampImports(full, version); continue; }
    if (!ent.name.endsWith('.js')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const out = src.replace(/((?:from\s*|import\s*\(\s*)['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g, `$1$2?v=${version}$3`);
    if (out !== src) fs.writeFileSync(full, out);
  }
}
function makeArchive(version) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'onepay-id-stage-'));
  fs.cpSync(path.join(ROOT, 'theme'), stage, { recursive: true }); stampImports(stage, version);
  const archive = path.join(os.tmpdir(), `onepay-id-theme-${process.pid}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', stage, '.']); fs.rmSync(stage, { recursive: true, force: true }); return archive;
}
async function main(conn) {
  connGlobal=conn; log(DRY?'Mode dry-run aktif; tidak ada perubahan yang ditulis.':'SSH tersambung.');
  const check=await run(conn,`test -f ${shellQuote(PANEL+'/artisan')} && echo ok`);
  if (!DRY && check.out!=='ok') throw new Error(`Panel tidak ditemukan di ${PANEL}. Periksa PANEL_PATH.`);
  if (DRY) log(`[dry-run] Validasi lokasi panel: ${PANEL}`);
  if (MODE==='uninstall') {
    log('→ Copot Onepay-ID dan migrasi penanda lama…');
    const sftp=DRY?null:await sftpOf(conn);
    if (!DRY) { await removeBlocks(conn,sftp,WRAPPER); await removeBlocks(conn,sftp,ADMIN); }
    await run(conn,`rm -rf ${shellQuote(REMOTE_THEME)} ${shellQuote(OLD_THEME)}`);
  } else {
    if (!DRY) {
      const sftp=await sftpOf(conn); await ensureBackup(conn,WRAPPER); await ensureBackup(conn,ADMIN); const version=Date.now(); const archive=makeArchive(version); const remoteArchive=`/tmp/onepay-id-${Date.now()}.tar.gz`;
      await putRemote(sftp,archive,remoteArchive); fs.unlinkSync(archive);
      const extract=await run(conn,`mkdir -p ${shellQuote(REMOTE_THEME)} && tar -xzf ${shellQuote(remoteArchive)} -C ${shellQuote(REMOTE_THEME)} && rm -f ${shellQuote(remoteArchive)}`);
      if(extract.code!==0) throw new Error(`Gagal ekstrak tema: ${extract.err||extract.out}`);
      // Remove the legacy theme and both old marker blocks to avoid duplicate chrome.
      const oldExists=await exists(conn,OLD_THEME); if(oldExists) await run(conn,`rm -rf ${shellQuote(OLD_THEME)}`);
      let wrapper=await readRemote(sftp,WRAPPER); wrapper=wrapper.replace(/\n?[ \t]*<!-- VSCODE-GLASS:START -->[\s\S]*?<!-- VSCODE-GLASS:END -->\n?/g,'\n'); await writeRemote(sftp,WRAPPER,wrapper);
      let admin=await readRemote(sftp,ADMIN); admin=admin.replace(/\n?[ \t]*<!-- VSCODE-GLASS:START -->[\s\S]*?<!-- VSCODE-GLASS:END -->\n?/g,'\n'); await writeRemote(sftp,ADMIN,admin);
      const snippet=`<link rel="stylesheet" href="/themes/onepay-id/onepay.css?v=${version}">\n<link rel="icon" type="image/png" href="/themes/onepay-id/assets/favicon-32.png?v=${version}">\n<link rel="apple-touch-icon" href="/themes/onepay-id/assets/favicon-180.png?v=${version}">\n<script type="module" src="/themes/onepay-id/main.js?v=${version}"></script>`;
      const adminCss=`<link rel="stylesheet" href="/themes/onepay-id/onepay.css?v=${version}">\n<link rel="stylesheet" href="/themes/onepay-id/admin.css?v=${version}">\n<link rel="icon" type="image/png" href="/themes/onepay-id/assets/favicon-32.png?v=${version}">`;
      await inject(conn,sftp,WRAPPER,snippet); await inject(conn,sftp,ADMIN,adminCss);
      const owner=await run(conn,`stat -c '%U:%G' ${shellQuote(PANEL+'/public/index.php')}`); if(owner.out) await run(conn,`chown -R ${shellQuote(owner.out)} ${shellQuote(REMOTE_THEME)}`);
      await run(conn,`find ${shellQuote(REMOTE_THEME)} -type d -exec chmod 755 {} + && find ${shellQuote(REMOTE_THEME)} -type f -exec chmod 644 {} +`);
    } else {
      log('[dry-run] Akan membuat arsip tema, mengunggah rekursif, migrasi VSCODE-GLASS, inject blade, dan membersihkan cache.');
    }
    if (SET_APP_NAME) {
      log('→ Opsi APP_NAME diminta.');
      const app=await run(conn,`grep -q '^APP_NAME=' ${shellQuote(PANEL+'/.env')} && sed -i 's/^APP_NAME=.*/APP_NAME=Onepay-ID/' ${shellQuote(PANEL+'/.env')} || printf '\\nAPP_NAME=Onepay-ID\\n' >> ${shellQuote(PANEL+'/.env')}`);
      if(app.code!==0) throw new Error('Gagal mengubah APP_NAME.');
      await run(conn,`cd ${shellQuote(PANEL)} && php artisan config:clear`);
    } else log('ℹ APP_NAME tidak diubah. Tambahkan --set-app-name untuk mengubahnya setelah konfirmasi Anda.');
  }
  const cache=await run(conn,`cd ${shellQuote(PANEL)} && php artisan view:clear && php artisan cache:clear`);
  if(cache.code!==0) log(`⚠ Pembersihan cache: ${cache.err||cache.out}`);
  log(DRY?'✔ Dry-run selesai; tidak ada perubahan yang ditulis.':MODE==='uninstall'?'✔ Copot selesai.':'✔ Instalasi selesai. Muat ulang panel dengan hard refresh.');
}
if (!DRY && !HOST) { console.error('SSH_HOST wajib diisi di .env.'); process.exit(1); }
if (!DRY && !process.env.SSH_PASSWORD && !process.env.SSH_KEY_PATH) { console.error('Isi SSH_PASSWORD atau SSH_KEY_PATH di .env.'); process.exit(1); }
if(DRY){ main({exec:(cmd,cb)=>{log(`[dry-run] ${cmd}`);const stream={on:(event,fn)=>{if(event==='close')setImmediate(()=>fn(0));return stream;},stderr:{on:()=>{} }};cb(null,stream);}}).catch(e=>{console.error('✖',e.message);process.exitCode=1;}); }
else { const Client = require('ssh2').Client; const conn = new Client(); conn.on('ready',()=>main(conn).catch(e=>{console.error('✖',e.message);process.exitCode=1;}).finally(()=>conn.end())).on('error',e=>{console.error('✖ SSH gagal:',e.message);process.exitCode=1;}).connect({host:HOST,port:PORT,username:USER,readyTimeout:20000, ...(process.env.SSH_KEY_PATH?{privateKey:fs.readFileSync(path.resolve(process.env.SSH_KEY_PATH)),passphrase:process.env.SSH_KEY_PASSPHRASE}: {password:process.env.SSH_PASSWORD})}); }
