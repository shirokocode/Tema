# Onepay-ID Panel

Tema visual dark-glass dengan aksen cyan untuk Pterodactyl Panel 1.x. Instalasi dilakukan dengan menyuntikkan stylesheet dan modul JavaScript ke Blade; tidak menjalankan `yarn build` dan tidak mengubah kode inti panel selain `resources/views/templates/wrapper.blade.php` serta `resources/views/layouts/admin.blade.php`. Tema mempertahankan LICENSE asli Pterodactyl di server.

> **Status fitur:** chrome, branding lokal, navigasi, Client API file listing/edit/save, tab sederhana, upload/download, rename/delete, dan fallback klasik telah dibuat. Monaco Editor belum disertakan dalam paket ini karena dependensi vendor tidak tersedia di lingkungan pembuatan; editor teks fallback tetap bisa dipakai. Terminal WebSocket real-time, power actions, drag/drop move yang lengkap, conflict resolution berbasis mtime, kompresi/ekstraksi, permissions, dan pengujian panel nyata masih perlu diselesaikan sebelum digunakan sebagai pengganti penuh UI produksi.

## Persyaratan
- Pterodactyl Panel 1.x dengan akses SSH ke server panel.
- Node.js 18+ dan npm di komputer yang menjalankan installer.
- Akun SSH yang dapat menulis direktori tema dan dua Blade template serta menjalankan `php artisan`.
- File `.env` lokal berisi kredensial SSH. Jangan bagikan atau commit kredensial.

## Instalasi

```bash
cp .env.example .env
# edit .env dan isi SSH_HOST, SSH_USER, SSH_PASSWORD atau SSH_KEY_PATH
npm install
node install.js --dry-run
node install.js
```

Installer membuat arsip `tar.gz` dari seluruh direktori `theme/`, mengunggah satu arsip, lalu mengekstraknya agar subdirektori ikut terpasang. Cache-busting memakai versi timestamp. Installer juga memigrasikan marker dan folder `vscode-glass` lama.

Untuk mengganti nama aplikasi di `.env` panel menjadi `APP_NAME=Onepay-ID`, jalankan secara eksplisit:

```bash
node install.js --set-app-name
```

Opsi ini memodifikasi `.env` panel dan menjalankan `php artisan config:clear`; jangan gunakan jika Anda tidak menginginkan perubahan nama global.

## Copot

```bash
node install.js uninstall
```

Installer menghapus marker tema, menghapus folder `public/themes/onepay-id` dan `public/themes/vscode-glass`, mencoba memulihkan backup `.onepay.bak`, lalu membersihkan cache. Periksa backup dan lakukan uji coba pada staging terlebih dahulu.

## Logo dan background

- Sumber logo: `theme/assets/logo-source.jpg`.
- Varian lokal: `logo-512.webp`, `logo-128.webp`, `logo-48.webp`, `favicon-32.png`, `favicon-180.png`, `favicon.ico`.
- Background: ganti `theme/bg.webp`.
- Gambar error yang disediakan: `theme/error.webp`.

Logo ditampilkan bulat melalui CSS; untuk membuat ulang varian gambar, gunakan Pillow dan crop persegi sebelum resize.

## Troubleshooting

- **Installer gagal SSH:** periksa host, port, username, password/kunci, dan passphrase. Kredensial tidak ditulis ke log.
- **Panel tidak ditemukan:** sesuaikan `PANEL_PATH` dengan direktori yang berisi file `artisan`.
- **Halaman tidak berubah:** lakukan hard refresh, lalu periksa `storage/logs/laravel.log` dan console browser.
- **Daftar file gagal:** Client API menggunakan sesi browser dan endpoint Pterodactyl Client API. Periksa permission akun, versi panel, dan respons API. Tombol `Tampilan klasik` mengembalikan file manager bawaan untuk halaman itu.
- **Monaco tidak aktif:** folder `theme/vendor/monaco/min/vs` harus diisi dengan distribusi Monaco Editor yang telah diaudit dan dipatok versinya. Jangan menggunakan CDN runtime.
- **Uninstall:** jika template tidak kembali seperti semula, periksa file `*.onepay.bak` di samping template.

## Keamanan
Semua permintaan browser diarahkan ke origin panel yang sama; tidak ada analytics atau CDN runtime. Nama file yang dirender menggunakan `textContent`. Gunakan panel staging dan backup database/server sebelum instalasi.
