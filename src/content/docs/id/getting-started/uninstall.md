---
title: "Penghapusan (Uninstall)"
---
Hapus modul Auriya melalui daftar modul manajer root Anda (Magisk / KernelSU / APatch) — tandai modul untuk dihapus lalu lakukan reboot perangkat. Skrip `uninstall.sh` milik modul akan membersihkan seluruh file secara otomatis.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke [`module/uninstall.sh`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/module/uninstall.sh) pada commit `10fe7c6`.
:::

## Urutan Tindakan yang Dijalankan `uninstall.sh`

1. **Menghentikan Daemon** — Mengirim sinyal `SIGTERM` ke binary `auriya`, menunggu hingga 5 detik, lalu mengirim `SIGKILL` jika diperlukan.
2. **Menghentikan Companion** — Urutan TERM→KILL yang sama untuk proses `AuriyaSysMon`.
3. **Menghentikan dan Menghapus Paket Aplikasi** — Menjalankan `am force-stop` kemudian `pm uninstall` untuk `dev.auriya.app`, `dev.auriya.app.debug`, dan `dev.auriya.service`.
4. **Menghapus Data Runtime & Konfigurasi**:
   - Socket IPC `/dev/socket/auriya.sock`
   - Direktori konfigurasi `/data/adb/.config/auriya` — **seluruh konfigurasi**, termasuk `settings.toml` dan `gamelist.toml`
   - Direktori log `/data/adb/auriya`
   - Symlink KernelSU/APatch (`/data/adb/ksu/bin/*`, `/data/adb/ap/bin/*`)
5. **Hitung Mundur Aman** — Memberikan jeda waktu beberapa detik agar Android menyelesaikan penghapusan paket sebelum muncul pesan "Safe to reboot".

Direktori modul fisik (`/data/adb/modules/auriya`) dihapus oleh manajer root setelah proses reboot selesai.

:::warning Konfigurasi Anda Akan Dihapus
Langkah 4 menghapus `/data/adb/.config/auriya` secara menyeluruh. Jika Anda ingin menyimpan file `settings.toml` / `gamelist.toml`, buat cadangan (backup) **sebelum** melakukan uninstall.
:::

## Jangan Reboot Terlalu Cepat

`pm uninstall` berjalan secara asynchronous di latar belakang Android. Me-reboot perangkat saat proses uninstaller sedang berjalan dapat menyebabkan paket aplikasi tertinggal dalam kondisi setengah terhapus. Tunggu hingga pesan **"Auriya uninstall complete. Safe to reboot."** muncul sebelum me-reboot ponsel Anda.
