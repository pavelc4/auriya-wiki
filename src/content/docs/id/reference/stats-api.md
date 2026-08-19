---
title: "Protokol Telemetri & Perekam FPS (GET_STATS)"
---
Auriya mengekspos snapshot performa internal yang di-polling oleh aplikasi manajer untuk merender kartu telemetri (FPS, suhu, status baterai, clock CPU/GPU) serta menggerakkan fitur perekaman FPS per-game.

:::info Protokol Internal Daemon
Payload `GET_STATS` adalah **format komunikasi IPC internal** yang dirancang khusus antara daemon Rust Auriya dan aplikasi Android manajer Auriya. Format ini bukan ditujukan sebagai API publik umum untuk proyek eksternal tanpa adaptasi.
:::

## Lapisan Transportasi

| Properti | Nilai |
| --- | --- |
| Perintah IPC | `GET_STATS` (alias `GETSTATS`) |
| Saluran Komunikasi | Socket Unix `/dev/socket/auriya.sock` (lihat [Protokol IPC](../internals/ipc-protocol)) |
| Format Respons | Satu baris string JSON, lalu koneksi ditutup dengan perintah `QUIT` |
| Beban Komputasi | Dihitung **hanya saat diminta** — daemon tidak mengakumulasikan data antar polling |

Contoh kueri dari root shell:

```console
$ printf 'GET_STATS\nQUIT\n' | nc -U /dev/socket/auriya.sock
OK AURIYA IPC
{"fps":{"avg":118.0,...},"thermal":{...},...}
BYE
```

## Skema JSON (Satu Grup = Satu Kartu UI)

```json
{
  "fps":     { "avg": 118.0, "peak": 258.9, "low_1pct": 78.5, "jank": 2, "frames": 600 },
  "thermal": { "cpu_c": 64.7, "gpu_c": null, "battery_c": 41.5 },
  "battery": { "pct": 100, "current_ma": 573, "voltage_v": 4.23, "status": "Charging", "health": "Good" },
  "cpu":     { "load_pct": 60.0, "cores": [ { "id": 0, "khz": 1804800, "gov": "walt", "cluster": "Little", "online": true } ] },
  "gpu":     { "mhz": 580, "load_pct": null, "vendor": "kgsl" },
  "session": { "pkg": "com.mobile.legends", "profile": "performance", "active": true }
}
```

### Referensi Field Data

| Grup | Field | Makna & Definisi |
| --- | --- | --- |
| `fps` | `avg` | Rata-rata FPS dalam rentang jendela (`1 / rata-rata frametime`). |
| | `peak` | Nilai FPS tercepat pada satu frame (`1 / frametime minimum`). |
| | `low_1pct` | Rata-rata FPS pada 1% frame terburuk — metrik stutter/patah-patah. |
| | `jank` | Jumlah frame yang lebih lambat dari `target × 1.5`. |
| | `frames` | Jumlah sampel frame yang digunakan untuk kalkulasi. |
| `thermal` | `cpu_c` / `gpu_c` / `battery_c` | Suhu dalam satuan °C. `battery_c` berada di grup ini karena merupakan temperatur. |
| `battery` | `pct` | Persentase daya baterai 0–100 %. |
| | `current_ma` | Arus instan dalam mA. Gunakan field `status` untuk menentukan arah pengisian. |
| | `voltage_v` | Tegangan baterai dalam Volt. |
| | `status` / `health` | Status baterai, misalnya `Charging` / `Good`. |
| `cpu` | `load_pct` | Total beban kerja CPU (persentase). |
| | `cores[]` | Informasi per-core: `id`, `khz` (frekuensi), `gov` (governor), `cluster` (`Little`/`Big`/`Prime`), `online`. |
| `gpu` | `mhz` / `load_pct` / `vendor` | Frekuensi clock GPU, persentase sibuk (load), driver vendor. |
| `session` | `pkg` | Nama paket aplikasi yang sedang aktif di latar depan. |
| | `profile` | Profil performa yang aktif (`performance`/`balance`/`powersave`). |
| | `active` | **Bernilai `true` hanya saat game di whitelist berjalan dengan PID aktif.** Ini merupakan sinyal pemicu rekaman. |

### Aturan Penanganan Nilai Null

- **`fps` bernilai `null`** saat tidak ada game yang berjalan (idle) — render kartu FPS sebagai "tidak aktif", bukan "0".
- **Semua field dapat bernilai `null`** jika kernel perangkat tidak mengekspos node sensor tersebut (misalnya `gpu_c` pada beberapa chipset). Kartu UI harus dapat melewati nilai null tanpa crash.
- **`session.active == false`** menandakan tidak ada game terkelola yang sedang berjalan.

## Metode Akses yang Disarankan (Sisi Aplikasi Android)

Socket dilindungi oleh izin root, sehingga diakses melalui root shell bawaan aplikasi (libsu) dengan coroutine:

```kotlin
fun fetchStats(): Stats? {
    val raw = RootShell.run("printf 'GET_STATS\\nQUIT\\n' | timeout 2 nc -U /dev/socket/auriya.sock")
    val json = raw?.lineSequence()?.firstOrNull { it.startsWith("{") } ?: return null
    return Json { ignoreUnknownKeys = true }.decodeFromString<Stats>(json)
}
```

## Auto-Record FPS di Sisi Aplikasi

Fitur auto-record diatur sepenuhnya **di dalam aplikasi manajer**:
- **Preferensi Per-Game**: Disimpan di SharedPreferences aplikasi berdasarkan nama paket.
- **Pemicu (Trigger)**: Memantau perubahan `session.active`. Pada transisi `false → true`, aplikasi memulai buffer perekaman; selama `true`, data `fps` disimpan setiap detik; pada `true → false`, aplikasi menyelesaikan ringkasan sesi benchmark (rata-rata FPS, 1% low minimum, suhu puncak CPU, total jank, dan durasi bermain).
- **Penyimpanan Lokal**: Rekaman disimpan di sandbox internal aplikasi (`filesDir` / Room Database), tidak pernah ditulis ke `/data/adb`.
