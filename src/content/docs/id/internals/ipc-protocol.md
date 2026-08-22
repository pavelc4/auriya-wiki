---
title: "Protokol IPC"
---
Daemon mengekspos Unix domain socket lokal. Aplikasi manajer dan `auriyactl` menggunakannya untuk mengirim perintah dan membaca status. Halaman ini mendokumentasikan format wire data dan seluruh perintah, permintaan, serta format respons yang diimplementasikan.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). Tata bahasa perintah: [`src/daemon/ipc/commands.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/daemon/ipc/commands.rs) (`Command::from_str`). Handler dan respons: [`src/daemon/ipc/handlers.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/daemon/ipc/handlers.rs).
:::

## Lapisan Transportasi (Transport)

| Properti | Nilai | Sumber Kode |
| --- | --- | --- |
| Jalur Socket | `/dev/socket/auriya.sock` | `SOCKET_PATH`, `src/common/constants.rs:1` |
| Tipe Socket | Stream `AF_UNIX` | `handle_client(stream: UnixStream, …)`, `handlers.rs` |
| Format Data | Teks UTF-8 berbaris baru (`\n`), satu perintah per baris | `reader.read_line`, `handlers.rs` |
| Salam Awal (Greeting) | Server mengirim `OK AURIYA IPC\n` saat koneksi terhubung | `handlers.rs` (`write_all(b"OK AURIYA IPC\n")`) |
| Batas Input Maksimal | **256 byte per baris**; lebih panjang → `ERR input too long` | `handlers.rs` (`if s.len() > 256`) |
| Karakter Spasi | Setiap baris di-trim; dipisahkan spasi | `commands.rs` (`s.split_whitespace()`) |
| Durasi Sesi | Multi-perintah per koneksi hingga `QUIT` atau EOF | `while reader.read_line(...) > 0` |

Contoh pertukaran data sederhana dengan `nc`:

```console
$ nc -U /dev/socket/auriya.sock
OK AURIYA IPC          ← salam awal (server → client)
PING                   ← dikirim oleh Anda
PONG                   ← balasan server
QUIT
BYE
```

### Konvensi Respons

- Respons sukses diawali dengan `OK ` (untuk operasi mutasi) atau langsung mengembalikan data (misal `PONG`, payload JSON, field `STATUS`).
- Respons error diawali dengan `ERR `. Kegagalan parsing menghasilkan `ERR <alasan>`; perintah tidak dikenal membalas `ERR unknown command (try HELP)` (`commands.rs`).
- Perintah `QUIT` membalas `BYE` lalu menutup koneksi.

## Tata Bahasa Perintah & Alias

`Command::from_str` menerima token standar dan sejumlah alias tanpa garis bawah (`commands.rs`). Token perintah bersifat **case-sensitive** (huruf besar):

| Perintah Kanonikal | Alias | Argumen |
| --- | --- | --- |
| `HELP` | `?` | — |
| `STATUS` | — | — |
| `ENABLE` / `DISABLE` | — | — |
| `RELOAD` | — | — |
| `RESTART` | — | — |
| `SETLOG` | `SET_LOG` | `<TRACE\|DEBUG\|INFO\|WARN\|ERROR>` |
| `SET_FPS` | `SETFPS` | `<u32>` |
| `GET_FPS` | `GETFPS` | — |
| `GET_SUPPORTED_RATES` | `GETRATES` | — |
| `GET_STATS` | `GETSTATS` | — |
| `INJECT` | — | `<package>` |
| `CLEAR_INJECT` | `CLEARINJECT` | — |
| `GETPID` | `GET_PID` | — |
| `PING` | — | — |
| `QUIT` | — | — |
| `SET_PROFILE` | `SETPROFILE` | `<FAST\|PERFORMANCE\|BALANCE\|POWERSAVE\|1\|2\|3\|4>` |
| `ADD_GAME` | `ADDGAME` | `<package>` |
| `REMOVE_GAME` | `REMOVEGAME` | `<package>` |
| `UPDATE_GAME` | `UPDATEGAME` | `<package> [gov= dnd= fps= fps_array= rate= mode= ceiling=]` |
| `GET_GAMELIST` | `GETGAMELIST` | — |
| `LIST_PACKAGES` | `LISTPACKAGES` | — |

## Referensi Perintah Lengkap

### 1. Introspeksi & Status

| Perintah | Respons Sukses | Respons Error |
| --- | --- | --- |
| `PING` | `PONG` | — |
| `HELP` / `?` | Daftar bantuan perintah multi-baris | — |
| `GETPID` / `GET_PID` | `PKG={pkg} PID={pid}`, atau `PKG=None PID=None` | — |
| `GET_FPS` | `FPS={measured:.1} TARGET={target}` | — |
| `GET_SUPPORTED_RATES` | Array JSON refresh rate unik, misal `[60,90,120]` | `ERR JSON {e}` |
| `GET_STATS` | Snapshot JSON single-line (fps/termal/baterai/cpu/gpu/sesi) — skema lengkap di [API Stats](/id/reference/stats-api/) | `ERR JSON {e}` |
| `STATUS` | Rincian status multi-baris (lihat format di bawah) | — |

#### Format Respons STATUS

Baris pertama selalu ada:
```text
ENABLED={bool} PACKAGES={count} OVERRIDE={Option<pkg>} LOG_LEVEL={level}
```

Diikuti oleh baris telemetri:
```text
FPS={value:.1} SOURCE={ebpf|sysfs|?}
CPU_CORES={n} CPU_LOAD={pct}
CORE_{id}={id} online={bool} freq={khz} governor={name} cluster={Little|Big|Prime|…}
GPU_FREQ={mhz} GPU_LOAD={pct} GPU_VENDOR={vendor}
TEMP_CPU={c|N/A} TEMP_GPU={c|N/A}
```

### 2. Sakelar Status (Toggles)

| Perintah | Sukses | Keterangan |
| --- | --- | --- |
| `ENABLE` | `OK ENABLED` | Mengaktifkan flag atomic daemon. |
| `DISABLE` | `OK DISABLED` | Menonaktifkan flag atomic daemon. |
| `SETLOG <LEVEL>` | `OK SET_LOG` | Mengubah level log runtime `tracing` secara live (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`). |
| `INJECT <pkg>` | `OK INJECT` | Memaksa paket foreground untuk debugging (mengabaikan companion). |
| `CLEAR_INJECT` | `OK CLEAR_INJECT` | Menghapus status override inject. |

### 3. Siklus Hidup Konfigurasi

| Perintah | Sukses | Error |
| --- | --- | --- |
| `RELOAD` | `OK RELOADED {n}` | `ERR RELOAD {e}` |
| `RESTART` | *(koneksi ditutup sebelum reload)* | `ERR RESTART_FAILED` |

### 4. Kontrol Profil

| Perintah | Sukses | Error |
| --- | --- | --- |
| `SET_PROFILE <MODE>` | `OK SET_PROFILE {Mode}` | `ERR SET_PROFILE {e}` |
| `SET_FPS <n>` | `OK SET_FPS {n}` | `ERR usage: SET_FPS <number>` |

`SET_PROFILE` mengambil lock eksklusif sebelum menerapkan setelan ke kernel. `MODE` yang valid: `FAST`, `PERFORMANCE`, `BALANCE`, `POWERSAVE` (atau angka `4`, `1`, `2`, `3`).

### 5. Mutasi Daftar Game (Gamelist)

Seluruh perintah ini menulis perubahan secara atomik ke `gamelist.toml`:

| Perintah | Sukses | Error |
| --- | --- | --- |
| `ADD_GAME <pkg>` | `OK ADD_GAME {pkg}` | `ERR ADD_GAME {e}` |
| `REMOVE_GAME <pkg>` | `OK REMOVE_GAME {pkg}` | `ERR REMOVE_GAME {e}` |
| `UPDATE_GAME <pkg> [k=v…]` | `OK UPDATE_GAME {pkg}` | `ERR UPDATE_GAME {e}` |
| `GET_GAMELIST` | Array JSON profil game | `ERR GET_GAMELIST {e}` |
| `LIST_PACKAGES` | Output mentah dari `pm list packages` | `ERR LIST_PACKAGES {e}` |

## Arah Aliran Data

Perintah dan kueri status mengalir **masuk** ke daemon melalui Unix socket ini. Data status yang diamati oleh companion (aplikasi fokus, layar, baterai, Zen) mengalir melalui saluran **berbeda** — companion menulis ke `/data/adb/.config/auriya/system_status` yang dipantau oleh daemon. Lihat [Aliran data](/id/architecture/data-flow/) dan [Deteksi game](/id/internals/game-detection/).
