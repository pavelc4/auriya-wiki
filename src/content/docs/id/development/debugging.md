---
title: "Debugging & Pemecahan Masalah"
---
Panduan diagnostik untuk menemukan dan menyelesaikan masalah pada Auriya di perangkat fisik Android.

## File Log Utama

| Log | Jalur File | Keterangan Data |
| --- | --- | --- |
| Daemon | `/data/adb/auriya/daemon.log` (+ `.1`, `.2`) | Output stdout/stderr daemon, dialirkan oleh `service.sh`. |
| Companion | `/data/adb/auriya/companion.log` (+ `.1`) | Log output service Android `AuriyaSysMon`. |
| Restart | `/data/adb/auriya/restart.log` | Output saat `service.sh` dipanggil ulang oleh `auriyactl restart`. |
| Logcat | `logcat -s auriya` | Tag log sistem untuk daemon dan skrip instalasi. |

## Mengubah Tingkat Detail Log (Verbosity)

Untuk mengubah level log **secara live tanpa restart daemon**, gunakan perintah CLI berikut:

```bash
auriyactl set-log debug     # pilihan: debug | info | warn | error
```

## Pemeriksaan Langkah demi Langkah

### 1. Apakah Daemon Berjalan?

```bash
auriyactl ping        # Menghasilkan "Daemon is alive (PONG)"
auriyactl status      # Menampilkan status, atau "Daemon: Not running"
```

Jika `Not running`, periksa `daemon.log` dan `companion.log` untuk mengetahui penyebab kegagalan boot.

### 2. Memeriksa Socket IPC Secara Mentah

```bash
printf 'STATUS\nQUIT\n' | nc -U /dev/socket/auriya.sock
```

Format respons selengkapnya didokumentasikan di [Protokol IPC](/id/internals/ipc-protocol/).

### 3. Deteksi Game & Aplikasi Foreground

Jika game tidak terdeteksi secara otomatis:

```bash
cat /data/adb/.config/auriya/system_status   # Snapshot status dari companion
auriyactl get-pid                            # Paket/PID yang diselesaikan oleh daemon
auriyactl inject com.nama.game               # Memaksa paket tertentu untuk pengujian
```

### 4. Profil Tidak Diterapkan

- Pastikan paket terdaftar di whitelist (`auriyactl list-games`).
- Ingat [urutan keputusan penjadwal](/id/internals/profile-scheduler/#urutan-pengambilan-keputusan): layar mati atau penghemat baterai selalu mengesampingkan mode game.
- Daemon hanya menulis ke kernel jika profil target berbeda dari profil saat ini ([perlindungan idempotensi](/id/internals/profile-scheduler/#perlindungan-idempotensi-idempotence-guard)).
- Periksa file `/data/adb/.config/auriya/current_profile` (`1`/`2`/`3`) untuk mengetahui profil terakhir yang diterapkan.

## Melakukan Restart Bersih

```bash
auriyactl restart
```

Perintah ini akan menghentikan proses daemon dan companion, menghapus file socket/status/lock lama, dan menjalankan ulang `service.sh`.
