---
title: "Struktur Proyek"
---
```text
auriya/
├── src/                         [Rust] Kode sumber daemon inti dan CLI
│   ├── main.rs                  [Rust] Entry point biner daemon
│   ├── bin/auriyactl.rs         [Rust] Entry point biner CLI
│   ├── lib.rs                   [Rust] Facade library bersama
│   ├── common/                  [Rust] Konstanta bersama dan tipe IPC umum
│   ├── cli/                     [Rust] Parser aplikasi CLI, client, executor, dan output terminal
│   ├── platform/                [Rust] Layer 1: Adapter hardware dan kernel OS
│   │   ├── binder/              [Rust] Native Binder IPC (client, process observer, aktuator, services)
│   │   ├── cpu/                 [Rust] Topologi CPU, governor, dan batas frekuensi
│   │   ├── gpu/                 [Rust] Kontrol frekuensi devfreq Adreno KGSL dan MediaTek
│   │   ├── thermal/             [Rust] Pembaca thermal zone multi-SoC dan status throttling
│   │   ├── vendor/              [Rust] Hook hardware khusus Snapdragon dan MediaTek
│   │   └── common/              [Rust] Optimasi kernel (IO, memori, scheduler, touchpanel, procfs, display)
│   ├── core/                    [Rust] Layer 2: Logika domain inti
│   │   ├── config/              [Rust] Parser konfigurasi TOML settings dan gamelist
│   │   ├── ebpf/                [Rust] Loader program BPF dan wrapper bytecode
│   │   ├── fas/                 [Rust] Frame-Aware Scheduling (controller, buffer, bottleneck)
│   │   ├── fps/                 [Rust] Pengumpul waktu frame dan integrasi probe Kala
│   │   ├── logger/              [Rust] Engine logger format dmesg zero-allocation langsung ke file
│   │   ├── pid/                 [Rust] Pelacakan dan pendeteksi proses game target
│   │   ├── profile/             [Rust] State machine profil performa (mode, apply, tuning)
│   │   ├── scaling/             [Rust] Governor penskalaan frekuensi CPU dan GPU
│   │   ├── stats/               [Rust] Telemetri, kalkulasi 0.1% low, dan amplop ApiResponse
│   │   ├── status/              [Rust] Pelacakan status sistem dan serialisasi data
│   │   └── telemetry/           [Rust] Kolektor telemetri perangkat (baterai, termal, beban)
│   └── daemon/                  [Rust] Layer 3: Orkestrasi & Server IPC
│       ├── context/             [Rust] DaemonContext state bersama terpusat dan lock
│       ├── engine/              [Rust] Event loop async Tokio dan penanganan shutdown bersih
│       ├── ipc/                 [Rust] Server soket domain Unix (/dev/socket/auriya.sock)
│       ├── model/               [Rust] Model transfer status internal daemon
│       ├── pipeline/            [Rust] Pipeline orkestrasi: Ingest -> Decide -> Apply -> FasTick
│       └── watcher/             [Rust] Pengawas perubahan konfigurasi dan berkas sistem
├── android/                     [Android / Gradle Kotlin workspace]
│   ├── app/                     [Android] Aplikasi manager Jetpack Compose (UI, overlay HUD, tema dinamis Monet)
│   └── shared/                  [Android] Kelas model data, serialisasi, dan helper root shell
├── module/                      [Module] Template modul root flashable
│   ├── customize.sh             [Module] Script instalasi (verifikasi SHA256, pasang biner, instal app)
│   ├── service.sh               [Module] Script startup service latar belakang saat boot
│   ├── action.sh                [Module] Trigger tombol Action root manager
│   ├── uninstall.sh             [Module] Script pembersihan saat modul dicopot
│   ├── icon.png                 [Module] Icon modul 192x192 untuk UI root manager
│   ├── module.prop              [Module] Metadata modul Magisk / KernelSU / APatch
│   ├── libs/                    [Module] Staging sementara build (aarch64/, app/)
│   └── META-INF/                [Module] Script pembungkus installer recovery
├── doc/asset/                   [Asset] Aset icon untuk katalog dan dokumentasi (icon.png)
├── .github/
│   ├── workflows/               [CI/CD] Pipeline GitHub Actions build dan release (build.yml, release.yml)
│   └── actions/                 [CI/CD] Composite actions (setup-tools, package-module, telegram-notify)
├── module.yaml                  [Catalog] Spesifikasi resmi repositori KernelSU Modules
├── Cargo.toml                   [Rust] Konfigurasi workspace dependency dan target biner
├── settings.toml               [Config] Konfigurasi default global
├── gamelist.toml               [Config] Profil game default
└── update.json                 [Release] Metadata update OTA root manager
```

## Struktur Arsip ZIP Flashable

Aset ZIP rilis yang dibangun oleh pipeline CI/CD memiliki susunan struktur berikut:

```text
auriya-<version>-<commit-count>-<hash>-release.zip
├── customize.sh                 [Script instalasi yang dieksekusi saat flashing]
├── service.sh                   [Peluncur daemon saat startup boot]
├── action.sh                    [Script pemicu tombol Action root manager]
├── uninstall.sh                 [Script pembersihan saat modul dihapus]
├── module.prop                  [Metadata modul (id, version, versionCode)]
├── icon.png                     [Icon modul untuk antarmuka root manager]
├── settings.toml                [Pengaturan default untuk /data/adb/.config/auriya]
├── gamelist.toml                [Aturan game default untuk /data/adb/.config/auriya]
├── libs/                        [Folder staging sementara yang dihapus setelah install]
│   ├── aarch64/
│   │   ├── auriya               [Biner daemon Rust yang sudah di-strip]
│   │   ├── auriyactl            [Biner CLI Rust yang sudah di-strip]
│   │   └── checksums.sha256     [Checksum SHA256 biner]
│   └── app/
│       └── auriya-app.apk       [Aplikasi manager yang dipasang via pm install]
├── system/
│   └── bin/                     [Direktori biner overlay]
└── META-INF/com/google/android/
    ├── update-binary            [Entry point installer Magisk/KernelSU]
    └── updater-script
```

Saat proses instalasi berlangsung, folder `libs/` hanya berfungsi sebagai area staging sementara. Script `customize.sh` memverifikasi integritas biner terhadap `checksums.sha256`, menyalinnya ke `$MODPATH/system/bin/`, memasang aplikasi manager via `pm install -r -g`, membuat symlink ke `/data/adb/ksu/bin` dan `/data/adb/ap/bin` untuk integrasi PATH KernelSU/APatch, menyalin konfigurasi ke `/data/adb/.config/auriya/` (tanpa menimpa file konfigurasi pengguna yang sudah ada), lalu langsung menjalankan `rm -rf "$MODPATH/libs"`.
