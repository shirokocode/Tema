# Changelog

## 1.0.0 — Onepay-ID baseline

- Mengganti identitas tema dan jalur instalasi menjadi `public/themes/onepay-id`.
- Memecah runtime menjadi modul `core/`, `chrome/`, `workbench/`, `pages/`, dan `brand/` tanpa bundler.
- Menambahkan installer SSH berbasis arsip tar, dukungan password atau SSH key, `--dry-run`, migrasi marker lama, cache-busting, dan opsi eksplisit `--set-app-name`.
- Menambahkan aset logo lokal dan varian favicon dari foto sumber.
- Mengganti chrome visual dengan brand Onepay-ID, navigasi aktivitas, title bar, status bar, dan command palette sederhana.
- Menyediakan Client API workbench awal: daftar folder, buka/simpan file teks, tab, breadcrumb, buat file/folder, rename, delete, upload, download, dan preview gambar.
- Explorer hanya ditampilkan di route Files; halaman lain tidak memakai daftar file palsu.
- Menambahkan tema glass cyan, aturan responsif, fokus keyboard, reduced motion/transparency, serta style admin dasar.

## Batasan yang diketahui

- Distribusi Monaco Editor belum disertakan karena pengunduhan dependensi vendor tidak tersedia di lingkungan build ini; editor fallback adalah textarea. Tidak ada CDN runtime.
- Integrasi terminal WebSocket dan power controls belum diimplementasikan; panel console bawaan tetap menjadi jalur console yang didukung.
- Belum diuji langsung pada `tes.pteroku.web.id`; endpoint dan bentuk respons Client API dapat berbeda menurut versi panel/Wings.
- Perilaku upload, move, rename, dan delete harus diverifikasi di panel staging sebelum penggunaan produksi.
- Screenshot before/after dari panel live tidak dapat dibuat tanpa akses sesi panel uji yang terautentikasi.

## Perbaikan pemeriksaan statis (2026-10-29)
- Memperbaiki pembacaan file Blade melalui SFTP agar konten selalu dikonversi eksplisit menjadi UTF-8, bukan mengandalkan argumen encoding yang tidak konsisten pada implementasi SFTP.
- Memperbaiki fallback salin path agar tidak memanggil `.then()` pada nilai kosong saat Clipboard API tidak tersedia; sekarang ada fallback `document.execCommand('copy')` dan pesan error.
- Memperbaiki payload rename untuk pemindahan file agar memakai path relatif dari root container `/home/container`.
- Memperbaiki siklus tampilan file manager klasik: konten bawaan disembunyikan saat workbench aktif dan dipulihkan ketika berpindah halaman atau menekan “Tampilan klasik”.
- Memastikan pemeriksaan sintaks JavaScript modul, sintaks installer, keseimbangan kurung CSS, metadata paket, aset logo, dan mode installer `--dry-run` lolos.
- Catatan: pemeriksaan statis tidak menggantikan uji integrasi pada panel Pterodactyl/Wings. Monaco vendor dan terminal WebSocket tetap belum tersedia/selesai.
