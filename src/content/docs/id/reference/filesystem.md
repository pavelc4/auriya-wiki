---
title: "Referensi Sistem Berkas"
---
Seluruh path berkas yang dibaca, ditulis, atau dipasang oleh Auriya pada perangkat Android, dikelompokkan berdasarkan peran dan tahap siklus hidupnya.

:::info Diverifikasi terhadap sumber
Konstanta path didefinisikan pada `src/platform/common/mod.rs` dan `src/core/config/mod.rs`. Script runtime: `module/customize.sh`, `module/service.sh`, `module/uninstall.sh`.
:::

## Path Runtime (Perangkat Terpasang & Berjalan)

### Direktori Konfigurasi — `/data/adb/.config/auriya/`

| Path | Ditulis oleh | Dibaca oleh | Fungsi |
| :--- | :--- | :--- | :--- |
| `settings.toml` | Manager App / Pengguna | Daemon | Konfigurasi global daemon, governor default, parameter tuning, dan toggle fitur. Tidak terhapus saat pembaruan modul. |
| `gamelist.toml` | Manager App / Pengguna / Daemon IPC | Daemon | Whitelist per-game, profil target, batas frekuensi maksimal, dan preferensi refresh rate. Tidak terhapus saat pembaruan modul. |

### Soket Domain Unix Daemon

| Path | Fungsi |
| :--- | :--- |
| `/dev/socket/auriya.sock` | Soket domain Unix lokal untuk seluruh komunikasi IPC client-daemon (`GET_STATS`, `SET_PROFILE`, `INJECT_APP`). Dibuat dengan izin `0666` saat daemon startup; dihapus bersih saat terminasi. |

### Direktori Log — `/data/adb/auriya/`

| Path | Ditulis oleh | Fungsi |
| :--- | :--- | :--- |
| `auriya.log` | DmesgLogger | Log berformat kernel dmesg dengan timestamp boottime presisi (`[   12.345678] [INFO] ...`). Otomatis dirotasi saat melebihi 1 MB. |
| `auriya.log.1` | DmesgLogger | Arsip log hasil rotasi sebelumnya. |

### Direktori Modul — `/data/adb/modules/auriya/`

Direktori root modul yang di-mount ke dalam sistem berkas overlay Android oleh KernelSU, Magisk, atau APatch:

| Path | Izin | Fungsi |
| :--- | :--- | :--- |
| `module.prop` | `0644` | Metadata modul (`id=auriya`, `name`, `version`, `versionCode`, `author`, `description`). |
| `icon.png` | `0644` | Icon 192x192 PNG yang ditampilkan pada UI aplikasi root manager. |
| `service.sh` | `0755` | Script latar belakang late-start yang dijalankan saat boot selesai (`sys.boot_completed`). |
| `action.sh` | `0755` | Script tombol aksi yang dieksekusi saat ditekan di antarmuka root manager. |
| `uninstall.sh` | `0755` | Script pembersihan yang dijalankan saat modul dihapus. |
| `system/bin/auriya` | `0755` | Biner daemon aarch64 Rust yang terkompilasi. |
| `system/bin/auriyactl` | `0755` | Biner CLI kontrol aarch64 Rust yang terkompilasi. |

### Symlink Integrasi Terminal Root

| Path Sumber | Tujuan Symlink | Fungsi |
| :--- | :--- | :--- |
| `/data/adb/modules/auriya/system/bin/auriya` | `/data/adb/ksu/bin/auriya`<br/>`/data/adb/ap/bin/auriya` | Memungkinkan pemanggilan biner `auriya` langsung dari shell root tanpa mengetik path lengkap. |
| `/data/adb/modules/auriya/system/bin/auriyactl` | `/data/adb/ksu/bin/auriyactl`<br/>`/data/adb/ap/bin/auriyactl` | Memungkinkan pemanggilan CLI `auriyactl` langsung dari terminal. |

## Path Staging (Hanya Ada di Dalam ZIP Flashable)

Path berikut hanya ada secara sementara di dalam arsip ZIP flashable dan langsung dihapus oleh `customize.sh` setelah instalasi:

| Path di Dalam ZIP | Tujuan Saat Flashing | Fungsi |
| :--- | :--- | :--- |
| `libs/aarch64/auriya` | `/data/adb/modules/auriya/system/bin/auriya` | Biner daemon sementara; disalin lalu dihapus. |
| `libs/aarch64/auriyactl` | `/data/adb/modules/auriya/system/bin/auriyactl` | Biner CLI sementara; disalin lalu dihapus. |
| `libs/aarch64/checksums.sha256` | Diverifikasi di memori | Checksum SHA256 untuk memverifikasi integritas biner. |
| `libs/app/auriya-app.apk` | Dipasang via `pm install -r -g` | Aplikasi manager antarmuka; dihapus dari direktori modul setelah instalasi. |
