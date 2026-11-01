---
title: "Protokol Telemetri (GET_STATS)"
---
Auriya mengekspos telemetri perangkat keras dan statistik frame pacing secara real-time melalui `/dev/socket/auriya.sock`. Aplikasi manajer Jetpack Compose dan floating overlay HUD membaca stream ini untuk merender kartu metrik, grafik, serta rekaman sesi benchmark.

:::info Standarisasi Envelope JSON
Mulai v2.2.0, seluruh respons IPC dibungkus dalam format envelope standar `ApiResponse<T>` (`{"status":"ok","data":{...}}` atau `{"status":"error","message":"..."}`).
:::

## Transport & Akses

| Parameter | Spesifikasi |
| :--- | :--- |
| **Perintah** | `GET_STATS` (alias `GETSTATS`) atau `STREAM_STATS [interval_ms]` |
| **Transport** | Unix domain socket `/dev/socket/auriya.sock` (mode `0666`) |
| **Format Respons** | String JSON satu baris dengan envelope `ApiResponse<StatsSnapshot>` |
| **Performa** | Dihitung on-demand dengan zero-allocation buffer saat tidak ada client yang melakukan polling |

Contoh kueri dari terminal atau root shell:

```console
$ printf 'GET_STATS\nQUIT\n' | nc -U /dev/socket/auriya.sock
{"status":"ok","data":{"fps":{"avg":119.4,"peak":120.2,"low_1pct":114.2,"low_0_1pct":98.6,...},"thermal":{...},"daemon":{...},"binder":{...}}}
```

## Skema Payload JSON

```json
{
  "status": "ok",
  "data": {
    "daemon": {
      "version": "2.2.0",
      "pid": 1337,
      "rss_mb": 5.4,
      "uptime_secs": 3600,
      "active_profile": "performance",
      "version_code": "52",
      "commit": "9aef31b",
      "arch": "aarch64"
    },
    "binder": {
      "operational": true,
      "screen_interactive": true,
      "is_floating": false,
      "wifi_low_latency": true,
      "statusbar_locked": false,
      "dnd_mode": 2,
      "refresh_rate_hz": 120.0
    },
    "system": {
      "uptime_secs": 86400,
      "ram_total_mb": 11500,
      "ram_avail_mb": 4200
    },
    "session": {
      "pkg": "com.miHoYo.GenshinImpact",
      "profile": "fast",
      "active": true,
      "is_game": true
    },
    "fps": {
      "current": 60.0,
      "min": 54.2,
      "max": 60.5,
      "avg": 59.8,
      "peak": 61.2,
      "low_1pct": 57.1,
      "low_0_1pct": 52.4,
      "dropped_frames": 3,
      "jank": 1,
      "frames": 1800
    },
    "cpu": {
      "load_pct": 48.5,
      "cores": [
        { "id": 0, "khz": 1804800, "gov": "schedutil", "cluster": "Little", "online": true, "load_pct": 35.0 },
        { "id": 4, "khz": 2400000, "gov": "performance", "cluster": "Big", "online": true, "load_pct": 62.0 },
        { "id": 7, "khz": 2841600, "gov": "performance", "cluster": "Prime", "online": true, "load_pct": 78.0 }
      ],
      "available_governors": ["schedutil", "performance", "powersave"]
    },
    "gpu": {
      "mhz": 680,
      "load_pct": 74,
      "vendor": "kgsl"
    },
    "thermal": {
      "cpu_c": 56.4,
      "gpu_c": 52.0,
      "battery_c": 38.5,
      "sconfig_supported": false
    },
    "battery": {
      "pct": 82,
      "current_ma": -450,
      "voltage_v": 4.12,
      "status": "Discharging",
      "health": "Good"
    }
  }
}
```

## Referensi Field Data

### `daemon`
- **`version`**: String versi semantik daemon (misalnya `2.2.0`).
- **`rss_mb`**: Jejak memori Resident Set Size (RSS) daemon dalam megabyte (~5.5 MB).
- **`active_profile`**: Status profil yang aktif (`fast`, `performance`, `balance`, `powersave`).
- **`commit`**: Short Git commit hash dari biner yang sedang berjalan.

### `binder`
- **`operational`**: `true` jika koneksi RPC Native Binder ke `servicemanager` Android aktif normal.
- **`screen_interactive`**: Status interaktivitas layar yang dikueri via `IPowerManager.isInteractive()`.
- **`is_floating`**: `true` jika aktivitas foreground berada dalam mode jendela mengambang / freeform (`IActivityTaskManager`).
- **`wifi_low_latency`**: `true` jika lock Wi-Fi latensi rendah aktif melalui `IWifiManager.acquireWifiLock`.
- **`dnd_mode`**: Filter Do Not Disturb aktif (`1` untuk Semua/Normal, `2` untuk Prioritas Game).
- **`refresh_rate_hz`**: Refresh rate layar aktif yang dikueri dari `IDisplayManager`.

### `fps` (Frame Pacing & Performa)
- **`avg`**: Rata-rata frame rate jendela pengukuran ($1 / \text{rata-rata durasi frame}$).
- **`low_1pct`**: Rata-rata frame rate dari 1% frame terburuk (indikator utama micro-stutter).
- **`low_0_1pct`**: Rata-rata frame rate dari 0.1% frame terburuk (indikator hitching ekstrem).
- **`dropped_frames`**: Estimasi frame yang terlewat berdasarkan durasi presentasi.
- **`jank`**: Jumlah frame yang durasi render-nya melebihi $1.5\times$ target interval frame.

### `cpu` & `gpu`
- **`cpu.load_pct`**: Persentase utilisasi beban kerja CPU total lintas semua core.
- **`cpu.cores[]`**: Informasi frekuensi per core (`khz`), governor (`gov`), klaster (`Little`/`Big`/`Prime`), status online, dan beban per core (`load_pct`).
- **`gpu.mhz`**: Frekuensi langkah clock GPU yang aktif.
- **`gpu.load_pct`**: Persentase beban kerja GPU yang aktif.

### `thermal` & `battery`
- **`thermal.cpu_c` / `gpu_c` / `battery_c`**: Suhu dalam derajat Celsius.
- **`battery.pct`**: Persentase kapasitas baterai (0–100%).
- **`battery.current_ma`**: Arus instan dalam miliampere (negatif saat discharging).
- **`battery.voltage_v`**: Tegangan baterai dalam Volt.

## Metode Konsumsi di Aplikasi Android

Aplikasi Manajer Auriya membuka socket Unix melalui libsu root shell atau biner client, lalu mendecode respons JSON menggunakan `kotlinx.serialization`:

```kotlin
@Serializable
data class ApiResponse<T>(
    val status: String,
    val data: T? = null,
    val message: String? = null
)

fun fetchTelemetry(): StatsSnapshot? {
    val raw = RootShell.run("printf 'GET_STATS\\nQUIT\\n' | nc -U /dev/socket/auriya.sock")
    val json = raw?.lineSequence()?.firstOrNull { it.startsWith("{") } ?: return null
    val response = Json { ignoreUnknownKeys = true }.decodeFromString<ApiResponse<StatsSnapshot>>(json)
    return response.data
}
```
