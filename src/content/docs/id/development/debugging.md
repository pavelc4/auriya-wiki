---
title: "Debugging & Pemecahan Masalah"
---
Panduan diagnostik perbatasan (boundary-first) untuk menemukan dan menyelesaikan masalah pada Auriya di perangkat Android fisik. Auriya menjangkau empat perbatasan: antarmuka UI aplikasi manajer, Unix domain socket, Native Binder IPC dengan framework sistem Android, serta penulisan node kernel `/sys` dan `/proc`.

## File Log Utama

| Log | Jalur File | Keterangan Format |
| :--- | :--- | :--- |
| Daemon | `/data/adb/auriya/daemon.log` (+ `.1`, `.2`) | Penulis file langsung (zero-allocation) dengan format timestamp presisi boottime dmesg: `[ 1234.567890] [info] ...`. Auto-rotasi saat ukuran mencapai 2 MB. |
| Restart | `/data/adb/auriya/restart.log` | Output saat proses restart dijalankan oleh `service.sh`. |
| Logcat | `logcat -s auriya` | Tag logcat sistem untuk startup daemon dan hook instalasi. |

## Mengubah Tingkat Detail Log (Verbosity)

Untuk mengubah level log **secara live tanpa restart daemon**, gunakan perintah CLI berikut:

```bash
auriyactl set-log debug     # pilihan: trace | debug | info | warn | error
```

`log_level` tidak dibaca ulang saat reload konfigurasi biasa — `set-log` adalah jalur perubahan live saat runtime ([Settings → reload behavior](/id/reference/settings/#perilaku-reload-tanpa-restart)).

## Pemeriksaan Langkah demi Langkah

### 1. Apakah Daemon Berjalan?

```bash
auriyactl ping        # Menghasilkan "Daemon is alive (PONG)"
auriyactl status      # Menampilkan status, atau "Daemon: Not running"
```

Jika `Daemon: Not running`, berarti urutan boot mengalami kendala. Periksa `/data/adb/auriya/daemon.log`. Penyebab umum mencakup file konfigurasi yang hilang, checksum biner SHA256 yang tidak cocok, atau kendala hak akses socket Unix.

### 2. Memeriksa Socket IPC Secara Mentah

```bash
printf 'STATUS\nQUIT\n' | nc -U /dev/socket/auriya.sock
printf 'GET_STATS\nQUIT\n' | nc -U /dev/socket/auriya.sock
```

Format respons selengkapnya didokumentasikan di [Protokol IPC](/id/internals/ipc-protocol/). Seluruh query modern mengembalikan envelope berstandar `ApiResponse<T>`.

### 3. Deteksi Game & Aplikasi Foreground

Jika game tidak terdeteksi secara otomatis:

```bash
auriyactl get-pid                      # Paket dan PID yang aktif
auriyactl get-stats                    # Periksa data.binder dan data.session
auriyactl inject com.nama.game         # Memaksa paket tertentu untuk pengujian
```

Auriya menerima perubahan aktivitas foreground langsung dari `IActivityManager` Android melalui Native Binder IPC (`ProcessObserver`). Jika `data.binder.operational` bernilai `false`, periksa pesan peringatan inisialisasi Binder di `daemon.log`.

### 4. Profil Tidak Diterapkan

- Pastikan paket terdaftar di whitelist (`auriyactl list-games`).
- Ingat [urutan keputusan penjadwal](/id/internals/profile-scheduler/#urutan-pengambilan-keputusan): layar mati atau penghemat baterai selalu mengesampingkan mode game.
- Daemon hanya menulis ke kernel jika profil target berbeda dari profil saat ini ([perlindungan idempotensi](/id/internals/profile-scheduler/#perlindungan-idempotensi-idempotence-guard)).
- Periksa `data.daemon.active_profile` pada `auriyactl get-stats` untuk memverifikasi profil yang sedang aktif.

### 5. Node Kernel / Tweak Tidak Berubah

Tweak sistem bersifat **best-effort**: node yang tidak ada pada kernel tertentu akan dilewati tanpa pesan error fatal ([Tweak Sistem](/id/internals/system-tweaks/#penulisan-terproteksi-best-effort)). Ubah level log ke `debug` (`auriyactl set-log debug`) untuk melihat jalur sysfs mana saja yang ditemukan dan ditulis. Jika service game turbo bawaan vendor terus menimpa nilai setelan, periksa apakah node [Vendor Lock](/id/internals/system-tweaks/#penguncian-vendor-vendor-lock) tersedia pada perangkat Anda.

## Melakukan Restart Bersih

```bash
auriyactl restart
```

`auriyactl restart` adalah perintah native Rust yang menghentikan proses daemon lama secara aman via sinyal `SIGTERM`, membersihkan socket usang, dan menjalankan ulang `service.sh`. Lihat [Referensi Perintah](/id/reference/commands/#restart-bersifat-lokal-bukan-perintah-ipc).
