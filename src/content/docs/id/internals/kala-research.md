---
title: "Probe Frame eBPF Kala"
sidebar_position: 4
---
Halaman ini mendeskripsikan revisi Kala persis yang dikonsumsi oleh Auriya: dependensi git yang tercatat pada `Cargo.lock` sebagai `be1061bd032b4faf5e6ef1cf5eec19d924a5caf3` (`github.com/pavelc4/kala`, branch `main`).

Revisi sumber: [`pavelc4/kala@be1061b`](https://github.com/pavelc4/kala/tree/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3). File implementasi utama: [`kala/src/lib.rs`](https://github.com/pavelc4/kala/blob/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3/kala/src/lib.rs), [`kala/src/uprobe.rs`](https://github.com/pavelc4/kala/blob/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3/kala/src/uprobe.rs), [`kala/src/tracker.rs`](https://github.com/pavelc4/kala/blob/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3/kala/src/tracker.rs), [`kala/src/wire.rs`](https://github.com/pavelc4/kala/blob/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3/kala/src/wire.rs), dan [`kala-ebpf/src/main.rs`](https://github.com/pavelc4/kala/blob/be1061bd032b4faf5e6ef1cf5eec19d924a5caf3/kala-ebpf/src/main.rs).

## Apa yang Diukur oleh Kala

Kala adalah library Rust yang dipadukan dengan program eBPF `no_std`. Probe memasang **uprobe** (probe entry point fungsi userspace) ke library `/system/lib64/libgui.so` milik Android. Targetnya adalah salah satu simbol ter-mangle dari `android::Surface::queueBuffer` (`kala/src/uprobe.rs`, `QUEUE_BUFFER_SYMBOLS`). Fungsi `queueBuffer` dipanggil saat aplikasi menyerahkan buffer grafis ke SurfaceFlinger, sehingga Kala mengamati pengiriman frame (frame submission), bukan penyelesaian render GPU ataupun pemindaian layar fisik.

Entry point eBPF adalah `kala_frame_probe` dalam `kala-ebpf/src/main.rs`. Program ini membaca `ctx.arg(1)` sebagai pointer buffer dan mengambil timestamp monotonic kernel dengan `bpf_ktime_get_ns()`. Pasangan data ini ditulis ke ring buffer map (`RING_BUF`):

```text
FrameRecord {
    ktime_ns: u64,  // nanodetik monotonik
    buffer:   u64,  // pointer buffer queueBuffer
}
```

Ukuran ring buffer adalah 256 KiB (`RingBuf::with_byte_size(256 * 1024, 0)`). Jika alokasi reservasi gagal, event dilewati secara diam-diam.

## Siklus Hidup Probe

`FrameProbe::new` (`kala/src/lib.rs`) menginisialisasi map target. Pemanggilan `FrameProbe::attach(pid)` bersifat idempoten untuk PID yang sudah terpasang. Untuk PID baru, sistem memanggil `QueueBufferProbe::attach` (`kala/src/uprobe.rs`) yang memuat objek BPF tersemat dan mencoba simbol-simbol berikut secara berurutan:

1. `Surface::hook_queueBuffer(ANativeWindow*, ANativeWindowBuffer*, int)`
2. `Surface::queueBufferInternal(...)`
3. Simbol legacy `Surface::queueBuffer(ANativeWindowBuffer*, int)`
4. Overload legacy dengan `SurfaceQueueBufferOutput*`
5. Overload modern `sp<GraphicBuffer>`

`program.attach` pertama yang berhasil akan digunakan. Setelah berhasil, Kala membuat `FrameTracker` dan memperbarui registri `mio::Poll` untuk seluruh descriptor file ring-buffer.

`FrameProbe::detach(pid)` melepaskan PID dan memperbarui registri polling. Pelepasan `QueueBufferProbe` (`Drop`) akan meng-unload program uprobe dari kernel secara bersih.

## Rekonstruksi Waktu Frame (Frametime)

`FrameProbe::recv_with_deadline(timeout)` melakukan polling ke seluruh ring buffer terdaftar menggunakan `mio`. Fungsi ini mengembalikan `(pid, Duration)` pertama yang tersedia. `FrameTracker::record` (`kala/src/tracker.rs`) mencatat riwayat timestamp terpisah untuk setiap pointer buffer yang aktif guna menangani mekanisme multi-buffering Android (triple-buffering).

Dari riwayat tersebut, delta waktu antara penyerahan buffer dihitung dan dikembalikan sebagai durasi frametime.

## Integrasi dengan Auriya

`src/core/ebpf.rs` membungkus Kala ke dalam struct `EbpfFrameStream`. Modul ini menjalankan thread worker dan menyiarkan durasi frame yang diterima melalui Tokio `broadcast` channel (berkapasitas 4096 item).

Ketika game aktif di latar depan, loop tick daemon memasang probe ke PID game tersebut (`ebpf_attach`). Jika pembuatan stream gagal saat startup (misalnya pada kernel lama tanpa dukungan eBPF atau uprobe), Auriya beralih ke pembacaan FPS sysfs murni dan menonaktifkan FAS tanpa menghentikan daemon.

Kebutuhan runtime Kala:
- Kernel Linux dengan dukungan uprobe dan BPF ring-buffer (versi 5.8+, diuji pada 5.10).
- Izin root atau kapabilitas `CAP_SYS_ADMIN` + `CAP_BPF`.
- File sistem Android nyata dengan `/system/lib64/libgui.so`.

## Cakupan dan Batasan

Kala memfilter event berdasarkan PID melalui uprobe Aya. Interval yang diukur adalah waktu antara pemanggilan antrean buffer (`queueBuffer`), bukan timestamp tampilan fisik pada layar. Overflow pada ring buffer atau error pembacaan dilewati secara aman tanpa memutus koneksi probe.
