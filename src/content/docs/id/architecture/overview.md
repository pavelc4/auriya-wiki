---
title: "Ikhtisar Arsitektur"
---
Auriya adalah sistem optimasi performa Android berbasis root yang terdiri dari dua bidang runtime utama: aplikasi manager modern berbasis Jetpack Compose dan daemon Rust `aarch64`. Daemon berkomunikasi langsung dengan antarmuka kernel (`/proc`, `/sys`) serta layanan sistem Android via **Native Binder IPC** (`rsbinder`), menghasilkan eksekusi scheduling real-time dan aliran telemetri instan tanpa I/O disk.

```mermaid
flowchart TD
    app["Android Manager (Jetpack Compose)"]
    cli["Control CLI (auriyactl)"]
    daemon["Auriya Rust Daemon (auriya)"]

    subgraph rust_daemon ["Arsitektur Internal Daemon"]
        binder["Native Binder Layer (IActivityManager, INotificationManager, dll.)"]
        fas["FAS Engine (FrameBuffer, BottleneckDetector)"]
        sched["Profile Pipeline (Ingest, Decide, Apply)"]
        tweaks["System Tweak Layer (CPU, GPU, Thermal, Kernel)"]
    end

    kernel["/proc & /sys & /dev/binder"]

    app <-->|Unix Domain Socket /dev/socket/auriya.sock| daemon
    cli <-->|Unix Domain Socket| daemon
    daemon --> binder
    binder <-->|Direct RPC| kernel
    daemon --> fas
    fas --> sched
    sched --> tweaks
    tweaks --> kernel
```

Aplikasi manager mengelola konfigurasi pengguna, tampilan overlay HUD interaktif, dan grafik benchmark. Daemon Rust mengelola pemantauan sistem jangka panjang, penjadwalan frame-aware, telemetri real-time, dan modulasi hardware. Biner CLI `auriyactl` menyediakan antarmuka terminal untuk kontrol dan automasi.

## Alur Eksekusi Biner

Modul yang terpasang tidak menjalankan daemon melalui aplikasi Android. Saat boot, script `module/service.sh` menunggu sinyal Android `sys.boot_completed`, menghentikan sisa proses daemon lama, menghapus file soket lama, dan mengeksekusi `/data/adb/modules/auriya/system/bin/auriya` dengan path konfigurasi settings dan gamelist. Log output dicatat langsung ke file `/data/adb/auriya/auriya.log` melalui engine logger dmesg zero-allocation.

```mermaid
flowchart TD
    boot([Android boot selesai]) --> svc["module/service.sh"]
    svc --> c1["Hentikan proses lama auriya"]
    svc --> c2["Hapus file soket /dev/socket/auriya.sock lama"]
    svc --> c3["Jalankan daemon auriya dengan --settings dan --gamelist"]
    c3 --> wait_ready{"Cek kesiapan proses & soket<br/>(≤ 5s batas waktu)"}
    wait_ready -->|ready| running([Daemon Berjalan])
    wait_ready -->|timeout| fallback["Catat error dan keluar"]

    running --> d1["Muat settings.toml & gamelist.toml"]
    running --> d2["Inisialisasi DmesgLogger zero-allocation"]
    running --> d3["Inisialisasi Native BinderClient & ProcessObserver"]
    running --> d4["Buka /dev/socket/auriya.sock"]
    running --> d5["Mulai watcher inotify konfigurasi"]
    running --> d6["Masuk ke event loop Tokio"]
```

## Siklus Pipeline Terstruktur

Event loop daemon dijalankan oleh runtime Tokio single-thread dengan pemisahan tahapan pipeline `ingest -> decide -> apply -> fas_tick`:

| Sumber Event | Hasil Eksekusi |
| :--- | :--- |
| **Callback ProcessObserver** | `IActivityManager` mendeteksi perpindahan aplikasi ke foreground (`onForegroundActivitiesChanged`); evaluasi profil dilakukan seketika tanpa polling. |
| **Timer Tick Berkala** | 500 ms saat sesi game aktif; 5 detik pada desktop normal (Balance); 10 detik saat layar mati (`IPowerManager.isInteractive() == false`). |
| **Inotify Settings / Gamelist** | Konfigurasi dimuat ulang secara otomatis saat file TOML disimpan; aturan profil dan governor diperbarui langsung. |
| **Request Unix Domain Socket** | Perintah client (`GET_STATS`, `SET_PROFILE`, `INJECT_APP`) diproses dan dibalas dengan amplop JSON terstandarisasi. |
| **SIGINT / SIGTERM** | Shutdown aman: melepas lock hardware, mereset limit frekuensi, memutus observer, dan menutup soket. |

## Alur Pengambilan Keputusan Profil

Pipeline profil mengevaluasi kondisi sistem dan identitas aplikasi secara berurutan:

```mermaid
flowchart TD
    tick([Pipeline Tick Berjalan]) --> check_screen{"Layar Mati atau<br/>Penghemat Baterai Aktif?"}
    check_screen -->|ya| p_powersave["POWERSAVE + Frekuensi Rendah<br/>+ Kembalikan Notifikasi Normal"]
    check_screen -->|tidak| check_fg{"Paket foreground<br/>terdaftar di gamelist.toml?"}

    check_fg -->|tidak| default_mode["Terapkan mode default (Balance)<br/>+ Lepas konfigurasi game"]
    check_fg -->|ya| check_same{"Paket sama &<br/>PID masih hidup?"}

    check_same -->|ya| check_fas{"FAS aktif &<br/>target FPS disetel?"}
    check_fas -->|ya| run_fas["Jalankan penyesuaian FAS (Controller tick)"]
    check_fas -->|tidak| skip_reapply["Lewati penerapan ulang profil"]

    check_same -->|tidak| enter_game["Masuk Sesi Game<br/>1. Terapkan profil target (Performance/Fast)<br/>2. Set batas frekuensi CPU/GPU<br/>3. Ubah refresh rate layar<br/>4. Kunci Wi-Fi low-latency<br/>5. Set filter prioritas Jangan Ganggu (DnD)"]
```

### Mode Profil Statis

Profil diterapkan berdasarkan definisi pada [`src/core/profile/`](https://github.com/pavelc4/auriya/blob/main/src/core/profile):

| Profil | Aksi |
| :--- | :--- |
| **Fast** | Responsivitas maksimal: governor agresif, aktifkan CPU boost, nyalakan semua core CPU, optimasi vendor, devfreq GPU performa tinggi, optimasi antrean memori/IO, dan afinitas proses game. |
| **Performance** | Gaming seimbang: governor performa, aktifkan CPU boost, optimasi Snapdragon/MediaTek, devfreq GPU mode performa, dan tuning latensi scheduler. |
| **Balance** | Kondisi sistem normal: governor seimbang hemat daya, matikan CPU boost, devfreq GPU seimbang, kembalikan nilai default kernel memori dan storage. |
| **Powersave** | Penghematan baterai: governor `powersave`, turunkan batas frekuensi maksimal, batasi GPU, dan perlambat tick scheduler background. |

### Modulasi Dinamis FAS

Saat berada dalam game dengan Frame-Aware Scheduling (FAS) aktif, `FasController` secara kontinu menghitung penyesuaian PID demi menjaga kestabilan frame rate tanpa memicu thermal throttle:

| Aksi FAS | Efek yang Diterapkan |
| :--- | :--- |
| **BoostGpu** | Menaikkan level frekuensi GPU devfreq tanpa mengubah CPU. |
| **BoostCpu** | Menaikkan frekuensi cluster CPU dan afinitas proses tanpa menaikkan GPU. |
| **BoostBalanced** | Menaikkan frekuensi CPU dan GPU secara bersamaan. |
| **Maintain** | Frekuensi saat ini mencukupi target FPS; tidak ada penulisan ke hardware. |
| **Reduce** | Menurunkan frekuensi ke tingkat yang lebih hemat energi. |

## Batasan Bidang Runtime

- **Manager App (`android/app`)**: UI Jetpack Compose modern, tema M3 Monet dinamis, DataStore Preferences, model `@Immutable`, overlay HUD sub-pixel yang mulus, dan evaluasi riwayat sesi benchmark.
- **Shared Kotlin (`android/shared`)**: Model data bersama, serialisasi, dan eksekusi root shell helper.
- **Rust Daemon (`src/main.rs`, `src/daemon/`)**: Mesin event terpusat, orkestrasi pipeline (`ingest -> decide -> apply`), server Native Binder IPC, dan Unix domain socket handler.
- **Platform Layer (`src/platform/`)**: Client Native Binder (`IActivityManager`, `INotificationManager`, dll.), kontrol cluster CPU, devfreq GPU, dan pembaca multi-sensor thermal.
- **Core Domain Layer (`src/core/`)**: FAS (`FasController`, `BottleneckDetector`), state machine profil, parser TOML, dan engine logger zero-allocation.
- **Control CLI (`src/cli/`, `src/bin/auriyactl.rs`)**: Client baris perintah mandiri yang berkomunikasi via `/dev/socket/auriya.sock`.
