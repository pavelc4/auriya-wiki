---
title: "Instalasi"
---
Panduan langkah demi langkah untuk menginstal modul Auriya pada perangkat Android yang sudah di-root.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke [`module/customize.sh`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/module/customize.sh) pada commit `10fe7c6`.
:::

## Langkah Instalasi Cepat

1. **Unduh** file ZIP modul rilis terbaru dari [halaman rilis](https://github.com/pavelc4/auriya/releases). Anda tidak perlu mengunduh file APK terpisah — aplikasi manajer sudah dikemas di dalam file ZIP.
2. **Flash** file ZIP melalui manajer root pilihan Anda (Magisk / KernelSU / APatch).
3. **Perhatikan output log installer.** `customize.sh` menampilkan informasi perangkat dan log instalasi per tahap.
4. **Reboot** ponsel setelah instalasi selesai.
5. **Buka aplikasi Auriya** dari app drawer dan berikan izin root saat diminta (lihat [Menjalankan Pertama Kali](/id/getting-started/first-run/)).

## Apa yang Sebenarnya Dilakukan Installer

`customize.sh` menjalankan serangkaian pemeriksaan dan aksi berikut secara berurutan:

1. **Pemeriksaan Arsitektur** — jika `$ARCH` bukan `arm64`, instalasi dibatalkan dengan pesan "Unsupported architecture".
2. **Ekstraksi** isi ZIP ke direktori `/data/adb/modules/auriya`.
3. **Verifikasi Integritas** — mencocokkan hash SHA-256 binary daemon dengan `checksums.sha256`; ketidakcocokan akan **membatalkan** instalasi.
4. **Pemasangan Binary** — menyalin daemon ke `/data/adb/modules/auriya/system/bin/auriya` (`0755`), serta CLI `auriyactl` jika disertakan.
5. **Pemasangan Companion** — menyalin `service.apk` ke `system/etc/auriya/service.apk`. Ini adalah komponen **wajib**; ketiadaan companion akan membatalkan instalasi.
6. **Pemasangan Aplikasi Manajer** — menjalankan `pm install -r -g` untuk memasang `auriya-app.apk` (`dev.auriya.app`). Bersifat **best-effort**: jika gagal, installer menampilkan petunjuk instalasi manual dan tetap melanjutkan proses.
7. **Penyemaian Konfigurasi** — memindahkan `settings.toml` / `gamelist.toml` ke `/data/adb/.config/auriya/` **hanya jika belum ada konfigurasi sebelumnya**, sehingga pembaruan modul tidak pernah menimpa setelan Anda.
8. **Symlink Root Manager** — membuat symlink ke `/data/adb/ksu/bin` (KernelSU) atau `/data/adb/ap/bin` (APatch) jika direktori tersebut ditemukan, agar perintah `auriya`/`auriyactl` langsung tersedia di `PATH`.

Rincian jalur runtime dan staging lengkap didokumentasikan di [Referensi sistem file](/id/reference/filesystem/).

## Setelah Reboot Perangkat

Modul **tidak** menjalankan daemon melalui aplikasi UI. Saat booting, skrip `module/service.sh` (melalui hook `service.d`) menunggu sinyal `sys.boot_completed`, menjalankan companion dengan `app_process`, menunggu file status terbentuk, lalu menjalankan daemon dengan parameter `--settings` / `--gamelist` eksplisit. Lihat [Ringkasan arsitektur → Alur eksekusi binary](/id/architecture/overview/#alur-eksekusi-binary).

Jika terjadi kendala, file log daemon dan companion tersedia di `/data/adb/auriya/` (`daemon.log`, `companion.log`) — lihat [Debugging](/id/development/debugging/).

## Langkah Selanjutnya

[Menjalankan Pertama Kali](/id/getting-started/first-run/) · [Konfigurasi](/id/getting-started/configuration/).
