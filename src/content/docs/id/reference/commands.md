---
title: "Referensi Perintah (CLI)"
---
`auriyactl` adalah alat baris perintah (CLI) untuk mengontrol daemon Auriya melalui Unix domain socket `/dev/socket/auriya.sock`. CLI ini bertindak sebagai antarmuka alternatif selain aplikasi manajer Android.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). File implementasi: [`src/cli/app.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/cli/app.rs) (argumen CLI clap), [`src/cli/executor.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/cli/executor.rs) (koneksi & eksekusi socket), dan [`src/cli/output.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/cli/output.rs) (pemformatan output).
:::

## Gambaran Penggunaan

```bash
# Menampilkan status lengkap daemon
auriyactl status

# Mengatur profil performa secara manual
auriyactl profile performance
auriyactl profile balance
auriyactl profile powersave

# Menampilkan informasi aplikasi yang sedang fokus
auriyactl get-pid

# Menampilkan statistik telemetri (JSON)
auriyactl get-stats
```

## Daftar Perintah CLI

| Perintah | Perintah IPC Terkait | Penjelasan |
| --- | --- | --- |
| `status` | `STATUS` | Menampilkan ringkasan status daemon, paket aktif, FPS, serta metrik CPU/GPU/termal. |
| `profile <MODE>` | `SET_PROFILE <MODE>` | Mengatur profil performa aktif (`fast`, `performance`, `balance`, `powersave`). |
| `fps <TARGET>` | `SET_FPS <TARGET>` | Mengatur target FPS manual untuk sesi aktif. |
| `rates` | `GET_SUPPORTED_RATES` | Menampilkan daftar refresh rate layar yang didukung oleh perangkat. |
| `get-pid` | `GETPID` | Menampilkan nama paket dan PID aplikasi yang sedang aktif di latar depan. |
| `stats` | `GET_STATS` | Menampilkan snapshot telemetri performa dalam format JSON. |
| `reload` | `RELOAD` | Memuat ulang konfigurasi dari file `settings.toml`. |
| `restart` | — (lokal) | Menghentikan proses daemon lama dan menjalankannya kembali. |
| `enable` / `disable` | `ENABLE` / `DISABLE` | Mengaktifkan atau menonaktifkan pemrosesan tick daemon. |
| `log <LEVEL>` | `SETLOG <LEVEL>` | Mengubah level log secara dinamis (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`). |
| `inject <PKG>` | `INJECT <PKG>` | Memaksa paket foreground untuk kebutuhan pengujian/debugging. |
| `clear-inject` | `CLEAR_INJECT` | Menghapus status override paket inject. |

## Manajemen Game via CLI

| Perintah CLI | Perintah IPC Terkait | Penjelasan |
| --- | --- | --- |
| `game add <PKG>` | `ADD_GAME <PKG>` | Menambahkan paket baru ke whitelist game. |
| `game remove <PKG>` | `REMOVE_GAME <PKG>` | Menghapus paket dari daftar game. |
| `game update <PKG> [opsi]` | `UPDATE_GAME <PKG>` | Memperbarui pengaturan khusus game (`--gov`, `--dnd`, `--fps`, `--mode`, `--ceiling`). |
| `game list` | `GET_GAMELIST` | Menampilkan seluruh game yang terdaftar beserta konfigurasinya. |

Perintah `auriyactl restart` dijalankan secara lokal di sisi klien dengan membunuh proses daemon dan memanggil skrip `service.sh`, berbeda dengan perintah IPC murni. Rincian selengkapnya mengenai format protokol wire dijelaskan di [Protokol IPC](/id/internals/ipc-protocol/).
