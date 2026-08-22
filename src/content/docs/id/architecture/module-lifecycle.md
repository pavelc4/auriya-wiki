---
title: "Siklus Hidup Modul"
---
Mulai dari proses build di CI, booting sistem, hingga uninstall — ini adalah perjalanan hidup paket modul Auriya. Setiap tahap merujuk langsung ke skrip yang mengimplementasikannya. Untuk *rincian instalasi*, lihat [Instalasi](/id/getting-started/installation/); untuk *eksekusi boot*, lihat [Ringkasan arsitektur](/id/architecture/overview/#alur-eksekusi-binary).

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit `10fe7c6`: `module/customize.sh`, `module/service.sh`, `module/uninstall.sh`, dan `.github/actions/package-module` ([Workflow CI/CD](/id/development/ci-cd/)).
:::

## 1. Pemaketan / Package (CI)

Alur CI membangun **satu** file ZIP mandiri (self-contained): skrip siklus hidup, `module.prop`, file default `settings.toml` / `gamelist.toml`, binary aarch64 `auriya` (+ opsional `auriyactl`) beserta `checksums.sha256`, dan kedua file APK di bawah direktori `libs/companion/`. Tidak ada unduhan yang dilakukan saat boot. Mekanisme pemaketan selengkapnya (urutan pencarian APK, penomoran versi, pemanggilan 7-zip) didokumentasikan di [CI/CD → package-module](/id/development/ci-cd/#package-module). Nama file ZIP berformat `auriya-<version>-<commit-count>-<sha>-<build_type>.zip`.

## 2. Ekstraksi (Root Manager)

Magisk / KernelSU / APatch mengekstrak isi ZIP ke direktori `/data/adb/modules/auriya`. Direktori `module/` di repositori **adalah** root dari file ZIP, sehingga tidak ada struktur bertingkat `module/module/` di perangkat.

## 3. Instalasi (`customize.sh`)

Berjalan saat modul di-flash di root manager (lihat [Instalasi → apa yang dilakukan installer](/id/getting-started/installation/#apa-yang-sebenarnya-dilakukan-installer)):

1. Membatalkan instalasi jika arsitektur `$ARCH` bukan `arm64`.
2. Memverifikasi binary daemon terhadap hash di `checksums.sha256` (jika tidak cocok, instalasi dibatalkan).
3. Menyalin binary daemon → `system/bin/auriya`, dan CLI → `system/bin/auriyactl` (jika tersedia).
4. Menyalin APK companion → `system/etc/auriya/service.apk` (**wajib**; jika hilang, instalasi dibatalkan).
5. Memasang aplikasi manajer `auriya-app.apk` via `pm install` (**best-effort**; jika gagal hanya memunculkan peringatan dan tetap melanjutkan instalasi).
6. Menghapus direktori sementara `libs/`.
7. Memindahkan `settings.toml` / `gamelist.toml` ke `/data/adb/.config/auriya` **hanya jika belum ada** (tidak pernah menimpa konfigurasi pengguna yang sudah ada).
8. Membuat symlink `bin` untuk KernelSU/APatch jika manajer tersebut terdeteksi.

Perbedaan jalur runtime vs staging dijelaskan di [Referensi sistem file](/id/reference/filesystem/#jalur-staging-zip-di-dalam-arsip--hanya-selama-instalasi).

## 4. Booting Sistem (`service.sh`)

Pada setiap kali perangkat dinyalakan (boot), melalui hook `service.d` milik root manager: menunggu sinyal `sys.boot_completed`, menghentikan proses companion/daemon lama yang tertinggal, menghapus file socket/status/lock kadaluarsa, menjalankan companion dengan `app_process`, menunggu hingga 10 detik file `system_status` dibuat, kemudian menjalankan daemon dengan parameter jalur `--settings` / `--gamelist` eksplisit, serta mengalirkan output ke logcat dan `/data/adb/auriya/daemon.log`. Urutan boot lengkap ada di [Ringkasan arsitektur → Alur eksekusi binary](/id/architecture/overview/#alur-eksekusi-binary).

## 5. Runtime Berjalan

Loop tick daemon memilih profil performa dan mempublikasikan status live; klien terhubung melalui Unix socket. Lihat [Aliran data](/id/architecture/data-flow/) dan [Penjadwal profil](/id/internals/profile-scheduler/).

## 6. Pembaruan (Update)

File `update.json` (di-commit ke branch `main` oleh workflow rilis) memuat informasi versi terbaru, `versionCode`, URL unduhan aset rilis, dan URL changelog; field `updateJson` di `module.prop` mengarahkan root manager ke file tersebut. Lihat [CI/CD → release.yml](/id/development/ci-cd/#releaseyml).

## 7. Penghapusan / Uninstall (`uninstall.sh`)

Menghentikan proses `auriya` dan `AuriyaSysMon`, menghapus paket via `pm uninstall`, serta menghapus file socket, `/data/adb/.config/auriya`, `/data/adb/auriya`, dan symlink terkait. Skrip ini juga dapat dipicu saat booting oleh flag `remove`. Rincian lengkap: [Uninstall](/id/getting-started/uninstall/).
