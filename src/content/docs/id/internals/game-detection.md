---
title: "Deteksi Game"
---
"Deteksi game" adalah mekanisme bagaimana daemon menentukan **paket mana yang sedang aktif di latar depan (foreground)**, apakah paket tersebut dikelola oleh Auriya (terdaftar di whitelist), dan apakah prosesnya masih hidup. Auriya **tidak** memindai sistem secara langsung — companion service Android bertugas menyuplai paket dan PID yang fokus, lalu daemon memvalidasi dan melacaknya.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). File terkait: [`src/core/dumpsys/activity.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/dumpsys/activity.rs) (validasi PID), [`src/core/pid_tracker.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/pid_tracker.rs) (pelacakan keaktifan & event keluar), [`src/daemon/tick.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/daemon/tick.rs) (alur keputusan).
:::

## Asal Usul Paket Foreground

Companion service memantau tumpukan tugas (task stack) Android dan menulis paket serta PID yang sedang fokus ke `/data/adb/.config/auriya/system_status`. Daemon membaca snapshot tersebut pada setiap tick — daemon tidak pernah menjalankan perintah lambat seperti `dumpsys` untuk mendeteksi foreground secara mandiri. Lihat [Aliran data](/id/architecture/data-flow/) dan [Protokol IPC → arah aliran data](/id/internals/ipc-protocol/#arah-aliran-data).

Perintah IPC `INJECT <package>` memungkinkan override paket foreground secara manual untuk kebutuhan debugging; `CLEAR_INJECT` menghapus status override tersebut.

## Whitelist Paket Game

Saat startup dan pada setiap perubahan file `gamelist.toml`, daemon membangun `HashSet` berisi nama-nama paket dari daftar game — yang disebut "whitelist" (`src/daemon/run.rs:212-217`). Suatu aplikasi dianggap sebagai "game" oleh Auriya jika dan hanya jika nama paketnya terdapat dalam set ini. Pencocokan bersifat **persis/exact** (tanpa wildcard); lihat [referensi gamelist](/id/reference/gamelist/).

## Validitas PID vs Verifikasi Paket

Dua pemeriksaan ringan di `dumpsys/activity.rs`:

| Fungsi | Pemeriksaan | Penggunaan |
| --- | --- | --- |
| `is_pid_valid(pid)` | `pid > 0` **dan** direktori `/proc/<pid>` ada | Membuang referensi PID yang sudah mati secara cepat. |
| `verify_pid_package(pid, pkg)` | Membaca `/proc/<pid>/cmdline` dan mencocokkan dengan `pkg` | Memastikan PID tersebut benar-benar milik paket aplikasi yang diharapkan. |

`verify_pid_package` mencocokkan nama proses hingga pemisah `\0` atau `:`, dan juga menerima kecocokan substring sehingga **proses terisolasi** bernama `<pkg>:<suffix>` (pola umum di Android) tetap dikenali sebagai bagian dari paket tersebut.

## Pelacakan Keaktifan dan Deteksi Keluar Instan

Setelah PID game yang terdaftar di whitelist tervalidasi, daemon membuat instance `PidTracker` (`pid_tracker.rs`) yang menjalankan dua fungsi:

1. **Pemeriksaan Cepat (Cheap Poll)** — `PidTracker::is_alive()` adalah pemeriksaan non-blocking yang digunakan oleh tick loop pada jalur cepat (fast path).
2. **Event Keluar Instan (Instant Exit Event)** — Thread latar belakang memblokir hingga proses target benar-benar mati, lalu mengirim event `DaemonEvent::PidExited`, sehingga daemon langsung mengevaluasi ulang status *seketika* tanpa menunggu jeda timer berikutnya.

Dua jalur kernel yang dipilih saat runtime:
- **`pidfd_open` (Linux ≥ 5.3)** — Pelacak membuka pidfd melalui syscall langsung (nomor `434` pada aarch64, `439` pada x86-64) dan menunggu di `poll()`. Tidak ada konsumsi CPU/wakeups hingga proses keluar.
- **Fallback `/proc`** — Pada kernel lama, watcher melakukan polling ke `/proc/<pid>` setiap **150 ms** (`POLL_INTERVAL_MS = 150`), dan `is_alive` memeriksa keberadaan file di `/proc/<pid>`.

Sebuah `eventfd` memungkinkan implementasi `Drop` membatalkan watcher yang sedang menunggu seketika saat daemon berhenti melacak (misalnya saat beralih game).

## Bagaimana Deteksi Mendorong Loop Tick

Setiap tick mengevaluasi paket dan PID:
- **Paket sama, PID masih hidup** → Jalur cepat (fast path): profil *tidak* diterapkan ulang; hanya FAS yang dapat menyesuaikan frekuensi.
- **Paket baru, atau PID lama telah keluar** → Evaluasi ulang profil secara penuh.
- **Paket terdaftar di whitelist dengan PID valid** → Memulai atau memperbarui sesi game.
- **Tidak ada di whitelist, PID tidak valid, atau layar mati** → Membersihkan status game dan menerapkan profil default.
