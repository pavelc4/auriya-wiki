---
title: "Menjalankan Pertama Kali"
---
Setelah menginstal dan me-reboot perangkat, buka aplikasi **Auriya** dari peluncur aplikasi (launcher). Halaman ini menjelaskan apa yang terjadi saat pertama kali dijalankan.

:::note Batasan Halaman Ini
Proses onboarding aplikasi manajer (pilihan tema, navigasi) adalah fitur UI di `android/app`. Kontrak runtime sistem adalah: aplikasi bertindak sebagai klien dari daemon root dan membutuhkan izin akses root agar dapat berfungsi penuh.
:::

## Apa yang Terjadi Saat Pertama Kali Dijalankan

1. **Otorisasi Root**: Aplikasi manajer mengontrol daemon melalui Unix socket `/dev/socket/auriya.sock` serta membaca/menulis konfigurasi di `/data/adb/.config/auriya` — seluruhnya merupakan jalur yang dilindungi izin root. Tanpa izin root, aplikasi tidak dapat memantau status ataupun mengubah setelan.
2. **Daemon Sudah Berjalan di Latar Belakang**: Berbeda dengan aplikasi tweak biasa, daemon Auriya **tidak** dimulai oleh aplikasi Android — melainkan dijalankan saat booting oleh skrip `module/service.sh` (lihat [Instalasi → Setelah Reboot](/id/getting-started/installation/#setelah-reboot-perangkat)).
3. **Preferensi Tampilan**: Disimpan secara lokal oleh aplikasi untuk peluncuran berikutnya.

## Memverifikasi Status Berjalan

Jika Anda memiliki akses CLI terminal, cara tercepat untuk memeriksa status adalah melalui IPC:

```console
$ auriyactl ping
 Daemon is alive (PONG)

$ auriyactl status
   	   Auriya Daemon Status
Daemon: Running

    Enabled:  true
    Games:    3 configured
    FPS:      59.8 SOURCE=ebpf
```

Jika muncul `Daemon: Not running`, berarti urutan boot mengalami kendala — periksa `/data/adb/auriya/daemon.log` dan `companion.log` ([Debugging](/id/development/debugging/)). Daftar perintah selengkapnya dapat dilihat di [Referensi perintah](/id/reference/commands/).

## Langkah Selanjutnya

- [Konfigurasi](/id/getting-started/configuration/) — menyesuaikan perilaku global dan per-game.
- [Ringkasan arsitektur](/id/architecture/overview/) — memahami bagaimana setiap komponen bekerja bersama.
