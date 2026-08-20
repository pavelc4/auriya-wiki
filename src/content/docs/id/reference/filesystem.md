---
title: "Referensi Sistem File"
---
Seluruh jalur file yang dibaca, ditulis, atau diinstal oleh Auriya, dikelompokkan berdasarkan **kapan file tersebut ada**. Hal ini penting dipahami karena tata letak file di dalam arsip ZIP *berbeda* dengan tata letak saat terinstal: `customize.sh` menyalin file ke lokasi runtime lalu menghapus direktori staging sementara.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). Konstanta jalur: [`src/common/constants.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/common/constants.rs) dan [`src/core/config/path.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/config/path.rs).
:::

## Jalur Runtime (Saat Perangkat Berjalan)

Jalur ini aktif setelah modul terpasang dan sistem telah melakukan booting.

### Konfigurasi dan Status Runtime — `/data/adb/.config/auriya/`

`CONFIG_DIR`, didefinisikan pada `src/common/constants.rs:3`:

| Jalur File | Ditulis Oleh | Dibaca Oleh | Fungsi / Tujuan |
| --- | --- | --- | --- |
| `settings.toml` | Aplikasi manajer | Daemon (startup + watcher) | Konfigurasi global sistem. Lihat [referensi settings](settings). |
| `gamelist.toml` | Aplikasi manajer **dan** Daemon (mutasi IPC) | Daemon (startup + watcher) | Whitelist game dan profil per-aplikasi. Lihat [referensi gamelist](gamelist). |
| `system_status` | Companion service | Daemon (watcher file) | Snapshot status Android: aplikasi foreground, status layar/baterai/Zen. |
| `companion.lock` | Companion service (flock) | Daemon (watcher lock) | File pelacak keaktifan companion; pelepasan lock menandakan companion mati. |
| `current_profile` | Daemon | Pembaca legacy/skrip eksternal | File kompatibilitas berisi angka `1`/`2`/`3`/`4` untuk Performance/Balance/Powersave/Fast. |
| `gpu_type` | `customize.sh` (saat instalasi) | — | Tipe GPU terdeteksi (`adreno`/`mali`/`unknown`). |
| `arch` | `customize.sh` (saat instalasi) | — | ABI perangkat terdeteksi (`arm64-v8a`). |

### Socket IPC Daemon

| Jalur File | Fungsi / Tujuan |
| --- | --- |
| `/dev/socket/auriya.sock` | Unix domain socket untuk seluruh komunikasi IPC (aplikasi manajer & `auriyactl`). Lihat [Protokol IPC](../internals/ipc-protocol). |

### File Log — `/data/adb/auriya/`

| Jalur File | Fungsi / Tujuan |
| --- | --- |
| `daemon.log` | Output stdout/stderr daemon, dialirkan oleh `service.sh`. |
| `daemon.log.1`, `daemon.log.2` | File rotasi log daemon (dirotasi saat ukuran melebihi 1 MB). |
| `companion.log`, `companion.log.1` | Log output companion service dan rotasinya. |
| `restart.log` | Output saat `service.sh` dipanggil ulang oleh `auriyactl restart`. |

### Pohon Modul Terpasang — `/data/adb/modules/auriya/`

| Jalur File | Fungsi / Tujuan |
| --- | --- |
| `system/bin/auriya` | **Binary daemon utama yang dieksekusi.** Izin eksekusi `0755`. |
| `system/bin/auriyactl` | Binary CLI kontrol (jika disertakan). |
| `system/etc/auriya/service.apk` | APK companion service; dijalankan saat boot via `app_process`. |
| `service.sh` | Skrip booting otomatis melalui hook root manager `service.d`. |
| `uninstall.sh` | Skrip pembersihan saat modul dihapus. |
| `module.prop` | Metadata modul Magisk/KernelSU/APatch. |

### Symlink Root Manager (Kondisional)

`customize.sh` membuat symlink ke direktori `bin` milik root manager **hanya jika direktori tersebut ada**:
- KernelSU: `/data/adb/ksu/bin/auriya`, `/data/adb/ksu/bin/auriyactl`
- APatch: `/data/adb/ap/bin/auriya`, `/data/adb/ap/bin/auriyactl`

## Jalur Staging ZIP (Hanya di Dalam Arsip / Saat Instalasi)

File-file berikut **hanya** ada di dalam file ZIP dan selama proses eksekusi `customize.sh`. Direktori sementara `libs/` dihapus setelah instalasi selesai:

| Jalur di Dalam ZIP | Perlakuan Saat Instalasi |
| --- | --- |
| `libs/aarch64/auriya` | Diverifikasi hash SHA256, disalin ke `system/bin/auriya`, lalu `libs/` dihapus. |
| `libs/aarch64/auriyactl` | Disalin ke `system/bin/auriyactl` jika ada, lalu dihapus. |
| `libs/aarch64/checksums.sha256` | Digunakan untuk verifikasi integritas binary. |
| `libs/companion/service.apk` | Disalin ke `system/etc/auriya/service.apk`, lalu dihapus. |
| `libs/companion/auriya-app.apk` | Dipasang ke sistem via `pm install` (aplikasi manajer `dev.auriya.app`). |
| `settings.toml` | Dipindahkan ke `CONFIG_DIR/settings.toml` **hanya jika belum ada file sebelumnya**. |
| `gamelist.toml` | Dipindahkan ke `CONFIG_DIR/gamelist.toml` **hanya jika belum ada file sebelumnya**. |

## Penghapusan Modul (Uninstall)

Skrip `uninstall.sh` menghentikan proses `auriya` dan companion `AuriyaSysMon`, menghapus aplikasi manajer via `pm uninstall`, serta menghapus `/dev/socket/auriya.sock`, `/data/adb/.config/auriya`, `/data/adb/auriya`, dan seluruh symlink biner.
