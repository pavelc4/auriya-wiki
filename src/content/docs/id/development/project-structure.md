---
title: "Struktur Proyek"
---
```text
auriya/
├── src/                         [Rust] Kode sumber daemon inti dan CLI
│   ├── main.rs                  [Rust] Entry point biner daemon
│   ├── bin/auriyactl.rs         [Rust] Entry point biner CLI
│   ├── lib.rs                   [Rust] Facade library bersama
│   ├── cli/                     [Rust] Parser CLI, client, executor, dan output
│   ├── platform/                [Rust] Layer 1: Adapter tingkat rendah (Hardware & OS)
│   │   ├── binder/              [Rust] Native Binder IPC (client, observer, aktuator, services)
│   │   ├── cpu/                 [Rust] Topologi CPU, governor, dan batas frekuensi
│   │   ├── gpu/                 [Rust] Kontrol devfreq Adreno KGSL dan MediaTek
│   │   ├── thermal/             [Rust] Pembaca thermal zone multi-SoC dan status throttling
│   │   ├── vendor/              [Rust] Hook hardware khusus Snapdragon dan MediaTek
│   │   ├── procfs.rs            [Rust] Pembaca status /proc dan cmdline
│   │   └── common/              [Rust] Optimasi kernel (IO, memori, scheduler, touchpanel)
│   ├── core/                    [Rust] Layer 2: Logika domain inti
│   │   ├── fas/                 [Rust] Frame-Aware Scheduling (controller, buffer, bottleneck)
│   │   ├── profile/             [Rust] State machine profil (mode, penerapan, tuning)
│   │   ├── config/              [Rust] Parser konfigurasi TOML settings dan gamelist
│   │   ├── stats/               [Rust] Telemetri, 0.1% low, dan amplop ApiResponse
│   │   └── logger/              [Rust] Engine logger format dmesg zero-allocation
│   └── daemon/                  [Rust] Layer 3: Orkestrasi & Server IPC
│       ├── context.rs           [Rust] State bersama terpusat DaemonContext
│       ├── engine.rs            [Rust] Event loop Tokio dan penanganan shutdown bersih
│       ├── pipeline.rs          [Rust] Pipeline: Ingest -> Decide -> Apply -> FasTick
│       └── ipc/                 [Rust] Server soket domain Unix (/dev/socket/auriya.sock)
├── android/                     [Android / Gradle Kotlin workspace]
│   ├── app/                     [Android] Aplikasi manager Jetpack Compose (UI, overlay HUD)
│   └── shared/                  [Android] Kelas model data, serialisasi, dan helper root shell
├── module/                      [Module] Template modul root flashable
│   ├── customize.sh             [Module] Script instalasi (verifikasi, pasang biner, instal app)
│   ├── service.sh               [Module] Script startup service latar belakang saat boot
│   ├── action.sh                [Module] Trigger tombol Action root manager
│   ├── uninstall.sh             [Module] Script pembersihan saat modul dicopot
│   ├── icon.png                 [Module] Icon modul 192x192 untuk UI root manager
│   ├── module.prop              [Module] Metadata modul Magisk / KernelSU / APatch
│   ├── libs/                    [Module] Staging sementara build (aarch64/, app/)
│   └── META-INF/                [Module] Script pembungkus installer recovery
├── doc/asset/                   [Asset] Aset icon untuk katalog dan dokumentasi (icon.png)
├── .github/
│   ├── workflows/               [CI/CD] Pipeline GitHub Actions build dan release
│   └── actions/                 [CI/CD] Composite actions (setup-tools, package-module, notify)
├── module.yaml                  [Catalog] Spesifikasi repositori KernelSU Modules
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

Saat proses instalasi berlangsung, folder `libs/` hanya berfungsi sebagai area staging sementara. Script `customize.sh` memverifikasi integritas checksum SHA256 biner, menyalinnya ke `$MODPATH/system/bin/`, memasang aplikasi manager via `pm install -r -g`, menyalin konfigurasi ke `/data/adb/.config/auriya/` (tanpa menimpa file konfigurasi pengguna yang sudah ada), lalu langsung menjalankan `rm -rf "$MODPATH/libs"`.
