---
title: "Referensi gamelist.toml"
---
`gamelist.toml` adalah file konfigurasi **per-aplikasi** milik Auriya: daftar putih (whitelist) paket Android yang menerima profil performa terkelola, beserta override khusus saat aplikasi tersebut aktif di latar depan (foreground). Pengaturan global sistem dikelola di [`settings.toml`](/id/reference/settings/).

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). Skema: [`src/core/config/gamelist.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/config/gamelist.rs). Konsumsi runtime: [`src/daemon/tick.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/daemon/tick.rs).
:::

## Lokasi dan Kepemilikan

| Properti | Nilai | Sumber Kode |
| --- | --- | --- |
| Jalur Terinstal | `/data/adb/.config/auriya/gamelist.toml` | `src/core/config/path.rs:11-13` (`gamelist_path()`) |
| Parameter Daemon | `auriya --gamelist <path>` | `module/service.sh` |
| Format Data | Array tabel TOML (`[[game]]`) | `GameList` = `Vec<GameProfile>`, `gamelist.rs:83-102` |
| Ditulis Oleh | Aplikasi manajer **dan** daemon saat mutasi IPC | `TomlParser.kt`; `gamelist.rs:118-130` |
| Dibaca Oleh | Daemon, dicache sebagai whitelist dan diperiksa setiap tick | `src/daemon/run.rs:212-217`, `tick.rs:222` |

Berbeda dengan `settings.toml`, file ini **dapat dimutasi saat runtime oleh daemon**. Saat klien mengirim perintah `ADD_GAME`, `REMOVE_GAME`, atau `UPDATE_GAME` via IPC, daemon memperbarui memori dan menulis ulang seluruh isi file secara atomik.

## Contoh File Bawaan (Default)

```toml
[[game]]
package = "com.mobile.legends"
cpu_governor = "performance"
enable_dnd = true
target_fps = 120

[[game]]
package = "com.supercell.clashroyale"
cpu_governor = "schedutil"
enable_dnd = false
target_fps = 60

[[game]]
package = "com.tencent.ig"
cpu_governor = "performance"
enable_dnd = true
target_fps = 120
```

## Perilaku Pemuatan (Loading Behavior)

- **File hilang bukan error fatal**: Jika `gamelist.toml` tidak ditemukan, daemon mencatat log `Gamelist file not found, using empty list` dan tetap berjalan dengan 0 paket terkelola (`gamelist.rs:108-111`).
- **File korup adalah error fatal**: Jika file ada tetapi gagal diparsing, startup dibatalkan demi keamanan.
- Kunci yang tidak dikenal diabaikan secara diam-diam (tanpa `deny_unknown_fields`).

## Referensi Field Lengkap

| Kunci | Tipe Data | Wajib | Default Saat Dikosongkan | Keterangan & Makna |
| --- | --- | :---: | --- | --- |
| `package` | string | **Ya** | — | Nama paket Android persis, misalnya `com.tencent.ig`. Dicocokkan dengan paket foreground companion (`tick.rs:222`). Tanpa wildcard. |
| `cpu_governor` | string | **Ya** | — | CPU governor untuk game ini. Diteruskan langsung ke kernel (`tick.rs:223-225`). Jika string kosong, fallback ke `balance_governor` global. |
| `enable_dnd` | bool | **Ya** | — | `true` → mengaktifkan mode Priority Do-Not-Disturb; `false` → notifikasi normal (`tick.rs:296-300`). |
| `target_fps` | int **atau** int[] | Tidak | `None` (FAS mempertahankan target saat ini) | Target frame rate FAS. Menerima nilai tunggal atau array nilai (adaptif). |
| `refresh_rate` | integer (Hz) | Tidak | `None` (tanpa override tampilan) | Target refresh rate layar (Hz) saat game aktif di foreground (`tick.rs:287-293`). Dipulihkan ke `0` saat keluar. |
| `mode` | string | Tidak | `None` → **Performance** | Profil game. Case-insensitive: `powersave`, `balance`, `fast`, **nilai lain / kosong → Performance** (`tick.rs`). |
| `ceiling` | string | Tidak | `None` (tanpa batas frekuensi) | Batas atas frekuensi (Low/Balance). Nilai yang tidak valid diabaikan tanpa error. |

### Field `target_fps`: Nilai Tunggal atau Array

`target_fps` memiliki deserializer kustom (`TargetFpsConfig`, `gamelist.rs:4-60`) yang mendukung dua format:

```toml
# Target tetap tunggal
target_fps = 120

# Array target adaptif
target_fps = [60, 90, 120]
```

## Bagaimana Entri Ditambahkan dan Diubah

### `ADD_GAME <package>` — Nilai Default Otomatis

Menambahkan paket via IPC menyuntikkan profil default tetap (`src/daemon/ipc/handlers.rs:208-217`):
- `cpu_governor`: `"performance"`
- `enable_dnd`: `true`
- `mode`: `"performance"`
- `target_fps`, `refresh_rate`, `ceiling`: tidak diatur (`None`)

### `UPDATE_GAME <package> [kunci=nilai ...]` — Pengeditan Parsial

Token yang didukung:
- `gov=<name>` → `cpu_governor`
- `dnd=<true|false>` → `enable_dnd`
- `fps=<n>` → `target_fps = Single(n)`
- `fps_array=<a,b,c>` → `target_fps = Array([...])`
- `rate=<hz>` → `refresh_rate`
- `mode=<name>` → `mode`
- `ceiling=<level>` → `ceiling`

### Penulisan Atomik (Persistence)

Setiap mutasi memanggil `GameList::save` yang menulis secara atomik: menserialisasi ke `gamelist.toml.tmp` lalu me-`rename` menimpa file target asli (`gamelist.rs:118-130`).
