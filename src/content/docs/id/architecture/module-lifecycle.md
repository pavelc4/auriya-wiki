---
title: "Siklus Hidup Modul"
---
Dari pengemasan CI/CD, proses flashing, startup saat boot, hingga proses uninstalasi bersih: dokumen ini menjelaskan seluruh siklus hidup modul root Auriya.

:::info Diverifikasi terhadap sumber
`module/customize.sh`, `module/service.sh`, `module/uninstall.sh`, dan `.github/actions/package-module/action.yml`.
:::

## 1. Pengemasan (CI / CD)

GitHub Actions membangun arsip ZIP flashable yang mandiri dan immutable:
1. Mengompilasi daemon `auriya` dan CLI `auriyactl` untuk target `aarch64-linux-android` dengan strip simbol penuh.
2. Mengompilasi `auriya-app.apk` (aplikasi manager Jetpack Compose) via `./gradlew :app:assembleRelease`.
3. Mengumpulkan seluruh file ke dalam direktori `build/release/module/`:
   - `module.prop` (diperbarui dengan nomor versi dan commit hash).
   - `icon.png` (icon 192x192 untuk tampilan KernelSU / Magisk / APatch).
   - `service.sh`, `customize.sh`, `action.sh`, `uninstall.sh`.
   - `settings.toml`, `gamelist.toml`.
   - `libs/aarch64/` (`auriya`, `auriyactl`, `checksums.sha256`).
   - `libs/app/` (`auriya-app.apk`).
4. Menghapus file `.placeholder` dan mengompresi arsip menggunakan 7-Zip (`Deflate -mx=9`).
5. Menghasilkan file checksum pendamping `.sha256`.

Aset rilis diberi nama `auriya-<version>-<commit-count>-<hash>-release.zip`.

## 2. Ekstraksi (Root Manager)

Saat di-flash di KernelSU, Magisk, atau APatch, root manager mengekstrak isi arsip ZIP langsung ke `$MODPATH` (`/data/adb/modules/auriya`).

## 3. Instalasi (`customize.sh`)

Dieksekusi otomatis saat proses flashing modul:
1. **Pemeriksaan Arsitektur**: Memastikan `$ARCH == "arm64"`; proses dibatalkan jika bukan perangkat arm64.
2. **Verifikasi Integritas**: Memverifikasi checksum SHA256 biner `auriya` dan `auriyactl` terhadap file `checksums.sha256`.
3. **Penyebaran Biner**:
   - Menyalin `auriya` ke `$MODPATH/system/bin/auriya` (izin `0755`).
   - Menyalin `auriyactl` ke `$MODPATH/system/bin/auriyactl` (izin `0755`).
4. **Instalasi Aplikasi Manager**:
   - Memasang `libs/app/auriya-app.apk` langsung ke sistem Android via `pm install -r -g`.
5. **Pembersihan Folder Staging**:
   - Menjalankan `rm -rf "$MODPATH/libs"` untuk menghapus folder temporary instalasi, sehingga tidak meninggalkan file sisa yang membuang ruang penyimpanan.
6. **Inisialisasi Konfigurasi**:
   - Membuat folder `/data/adb/.config/auriya/`.
   - Memindahkan `settings.toml` dan `gamelist.toml` default ke `/data/adb/.config/auriya/` **hanya jika belum ada sebelumnya**, sehingga konfigurasi pengguna tidak akan tertimpa saat update modul.
   - Menghapus template konfigurasi dari `$MODPATH`.
7. **Integrasi PATH KernelSU / APatch**:
   - Membuat symlink `auriya` dan `auriyactl` ke `/data/adb/ksu/bin` dan `/data/adb/ap/bin` agar biner dapat dipanggil langsung dari terminal root tanpa path absolut.
8. **Pengaturan Izin (Permissions)**:
   - Menetapkan izin rekursif `0755` / `0644` untuk seluruh direktori `$MODPATH`.

## 4. Startup Saat Boot (`service.sh`)

Dijalankan pada setiap boot perangkat oleh service hook late-start milik root manager:
1. **Pemeriksaan Penghapusan**: Memeriksa apakah modul ditandai untuk dihapus. Jika ya, langsung memicu `uninstall.sh` dan keluar.
2. **Sinkronisasi Boot Selesai**: Memeriksa properti `sys.boot_completed` hingga bernilai `1`, dilanjutkan jeda 3 detik untuk memastikan framework Android telah siap.
3. **Pembersihan Proses Lama**: Mematikan proses `auriya` lama jika ada dan menghapus file soket lama `/dev/socket/auriya.sock`.
4. **Peluncuran Daemon**: Menjalankan daemon di latar belakang tanpa memblokir boot:
   ```sh
   nohup "$AURIYA_BIN" --settings "$SETTINGS_CFG" --gamelist "$GAMELIST_CFG" >/dev/null 2>&1 &
   ```
5. **Pemeriksaan Kesiapan**: Menunggu hingga 5 detik untuk memastikan proses `auriya` aktif dan soket `/dev/socket/auriya.sock` telah siap melayani permintaan.

## 5. Uninstalasi (`uninstall.sh`)

Dijalankan ketika modul dihapus dari root manager:
1. Menghentikan daemon `auriya` secara bersih (`SIGTERM`, lalu `SIGKILL` jika tidak merespons).
2. Menghentikan paksa dan mencopot pemasangan aplikasi `dev.auriya.app` via `pm uninstall`.
3. Menghapus file soket `/dev/socket/auriya.sock`.
4. Membersihkan konfigurasi `/data/adb/.config/auriya` dan folder log `/data/adb/auriya`.
5. Menghapus symlink dari `/data/adb/ksu/bin` dan `/data/adb/ap/bin`.
