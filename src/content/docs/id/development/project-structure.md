---
title: "Struktur Proyek"
---
```text
auriya/
├── src/                         [Rust] Library dan binary daemon
│   ├── main.rs                  [Rust] Entry point binary daemon utama
│   ├── ctl.rs                   [Rust] Entry point binary CLI auriyactl
│   ├── cli/                     [Rust] Parser, klien socket, dan output CLI
│   ├── daemon/                  [Rust] Loop tick, state, watcher, IPC
│   ├── core/                    [Rust] Konfigurasi, telemetri, FPS/FAS, tweaks
│   └── common/                  [Rust] Konstanta dan tipe data bersama
├── android/                     [Android/Gradle]
│   ├── app/                     [Android] Aplikasi manajer Compose UI
│   ├── service/                 [Android] Headless companion service
│   └── shared/                  [Android] Model data, parser TOML, status codecs
├── module/                      [Module] Sumber muatan modul root (Magisk/KSU)
│   ├── customize.sh             [Module] Skrip instalasi & verifikasi payload
│   ├── service.sh               [Module] Skrip inisialisasi saat boot
│   ├── uninstall.sh             [Module] Skrip pembersihan saat dihapus
│   ├── module.prop              [Module] Metadata modul root
│   └── META-INF/                [Module] Entry point installer recovery
├── website/                     [Docusaurus] Situs wiki dokumentasi
│   ├── docs/                    [Docusaurus] Konten markdown wiki
│   ├── src/                     [Docusaurus] Tema dan styling CSS
│   ├── static/                  [Docusaurus] Font dan aset media
│   └── docusaurus.config.ts     [Docusaurus] Konfigurasi situs web
├── .github/
│   ├── workflows/               [CI/CD] Pipeline otomatis build dan release
│   └── actions/                 [CI/CD] Aksi komposit (setup, package, notify)
├── Cargo.toml                   [Rust] Dependensi dan target binary
├── settings.toml               [Config] Setelan default bawaan
├── gamelist.toml               [Config] Profil game default bawaan
└── update.json                 [Release] Metadata pembaruan untuk root manager
```

## Pratinjau Struktur File ZIP Terpasang

```text
auriya-<version>-<commit-count>-<sha>-<build-type>.zip
├── customize.sh
├── service.sh
├── uninstall.sh
├── module.prop
├── settings.toml
├── gamelist.toml
├── libs/
│   ├── aarch64/
│   │   ├── auriya                [Daemon Rust]
│   │   ├── auriyactl             [CLI Rust]
│   │   └── checksums.sha256
│   └── companion/
│       ├── service.apk           [Companion Android]
│       └── auriya-app.apk        [Aplikasi Manajer Compose]
└── META-INF/com/google/android/
    ├── update-binary
    └── updater-script
```

Selama proses flashing/instalasi, direktori `libs/` hanya bertindak sebagai direktori staging sementara. `customize.sh` memindahkan binary dan APK ke lokasi runtime permanen di sistem, lalu menghapus direktori `libs/`.
