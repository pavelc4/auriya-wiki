---
title: "Referensi Perintah (auriyactl)"
---
`auriyactl` adalah alat baris perintah (CLI) untuk mengontrol daemon Auriya dan melakukan diagnostik hardware tingkat rendah. CLI ini menyediakan antarmuka ergonomis di atas protokol IPC Unix domain socket dan diagnostik Native Android Binder IPC.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke Auriya v2.2.0. File terkait:
- [`src/cli/app/`](file:///home/sineva/prjkt/rust/auriya/src/cli/app/) (Definisi perintah dan argumen Clap)
- [`src/cli/executor.rs`](file:///home/sineva/prjkt/rust/auriya/src/cli/executor.rs) (Penyaluran perintah dan pengukuran waktu eksekusi)
- [`src/cli/commands/`](file:///home/sineva/prjkt/rust/auriya/src/cli/commands/) (Handler dan implementasi subperintah)
- [`src/cli/output/`](file:///home/sineva/prjkt/rust/auriya/src/cli/output/) (Pemformatan tampilan terminal dan dashboard)
:::

## Sinopsis

```text
auriyactl [--socket <jalur>] <subcommand> [argumen]
```

- Menjalankan `auriyactl` tanpa subperintah akan mencetak bantuan (help) dan keluar.
- Opsi global `--socket <jalur>` / `-s <jalur>` digunakan untuk menentukan jalur socket kustom (default: `/dev/socket/auriya.sock`).

## Daftar Subperintah

### 1. Siklus Hidup Daemon (Daemon Lifecycle)

| Subperintah | Argumen | Perintah IPC | Penjelasan / Aksi |
| :--- | :--- | :--- | :--- |
| `status` | — | `STATUS` | Menampilkan ringkasan status terformat (status aktif, profil, game, FPS, metrik CPU/GPU). |
| `enable` | — | `ENABLE` | Mengaktifkan optimasi daemon (`OK ENABLED`). |
| `disable` | — | `DISABLE` | Menonaktifkan optimasi daemon (`OK DISABLED`). |
| `reload` | — | `RELOAD` | Memuat ulang konfigurasi dari disk (`OK RELOADED <n>`). |
| `restart` | — | *(lokal)* | Me-restart daemon secara aman melalui `service.sh`. |
| `ping` | — | `PING` | Memeriksa respon socket IPC (`Daemon is alive (PONG)`). |
| `get-pid` | — | `GET_PID` | Menampilkan PID daemon dan PID game aktif. |

### 2. Penyetelan & Profil (Tuning & Profiles)

| Subperintah | Argumen | Perintah IPC | Penjelasan |
| :--- | :--- | :--- | :--- |
| `set-profile` | `<fast\|performance\|balance\|powersave>` | `SET_PROFILE <MODE>` | Mengatur profil performa aktif secara global. |
| `set-fps` | `<fps>` | `SET_FPS <fps>` | Mengatur target frame rate dinamis. |
| `get-fps` | — | `GET_FPS` | Menampilkan FPS terukur saat ini dan target yang aktif. |
| `add-game` | `<package>` | `ADD_GAME <pkg>` | Menambahkan paket baru ke file `gamelist.toml`. |
| `remove-game` | `<package>` | `REMOVE_GAME <pkg>` | Menghapus paket dari `gamelist.toml`. |
| `list-games` | — | `GET_GAMELIST` | Menampilkan daftar seluruh game di `gamelist.toml`. |

### 3. Diagnostik & Telemetri

| Subperintah | Opsi | Penjelasan |
| :--- | :--- | :--- |
| `info` | — | Memeriksa informasi chipset SoC perangkat, topologi CPU, node Adreno KGSL, dan kapabilitas eBPF kernel. |
| `stats` | `--json`, `--stream`, `--interval-ms <ms>` | Menampilkan snapshot telemetri terformat atau envelope raw JSON `ApiResponse<StatsSnapshot>`. |
| `monitor` | `-1` / `--oneline`, `-i` / `--interval-ms <ms>` | Dashboard telemetri live real-time di terminal atau aliran kompak 1-baris. |
| `log` | `-f` / `--follow`, `-n` / `--lines <n>`, `--clear` | Membaca, mengikuti (follow), atau mengosongkan log daemon `/data/adb/auriya/daemon.log`. |
| `get-rates` | — | Menampilkan refresh rate layar yang didukung dari mode display Android. |
| `list-packages` | — | Menampilkan seluruh paket aplikasi yang terpasang di sistem. |

### 4. Pengembang & Debug (Developer & Debug)

| Subperintah | Argumen | Penjelasan |
| :--- | :--- | :--- |
| `set-log` | `<trace\|debug\|info\|warn\|error>` | Mengubah filter log `tracing` daemon secara live tanpa restart. |
| `inject` | `<package>` | Menimpa (override) paket foreground secara manual untuk pengujian. |
| `clear-inject` | — | Menghapus status override paket inject. |
| `binder <subperintah>` | Lihat di bawah | Diagnostik langsung dan pengujian aktuator Native Android Binder IPC. |

#### Subperintah `auriyactl binder`

- `probe`: Menguji konektivitas ke `servicemanager` Android dan memeriksa service sistem utama.
- `test`: Menjalankan pengujian otomatis end-to-end Binder RPC.
- `dnd <all|priority>`: Mengatur Do Not Disturb melalui `INotificationManager`.
- `rate <hz>`: Mengatur refresh rate layar via `IDisplayManager` (`0` untuk memulihkan).
- `wifi [on|off|status]`: Mengatur low-latency Wi-Fi lock (`WIFI_MODE_FULL_LOW_LATENCY`).
- `touch [on|off|status]`: Mengatur sampling boost sentuhan (touch polling rate).
- `statusbar [lock|unlock|status]`: Mengunci panel notifikasi dan alert statusbar.
- `power <action> [name] [value]`: Berinteraksi dengan mode Hardware PowerHAL vendor.
- `toast <pesan> [--long]`: Menampilkan pesan Toast native Android di layar.
- `window <action> [param]`: Mengelola rotasi layar dan skala animasi jendela.

## Perilaku Perintah Restart

`auriyactl restart` **tidak** mengirim perintah IPC socket, melainkan dieksekusi secara lokal di dalam CLI (`src/cli/commands/restart.rs`):

1. Mengatur status modul ke `sleep`, mengirim sinyal `killall -q -TERM auriya`, menunggu 2 detik, lalu mengirim `killall -q -KILL auriya`.
2. Mengosongkan file log `/data/adb/auriya/daemon.log`.
3. Menjalankan ulang `sh /data/adb/modules/auriya/service.sh >> /data/adb/auriya/restart.log 2>&1 &`.

## Contoh Penggunaan

```console
$ auriyactl ping
Daemon is alive (PONG)

$ auriyactl set-profile performance
Profile set: OK SET_PROFILE Performance

$ auriyactl stats
[Auriya Telemetry Snapshot]
Profile: performance | Game: None
FPS: 119.8 (avg: 120.0, 1% low: 114.2)
CPU Load: 42% | GPU Load: 58% (680 MHz)
Thermal: CPU 56.4°C | Battery 38.5°C

$ auriyactl monitor
# Membuka dashboard interaktif telemetri real-time di terminal
```
