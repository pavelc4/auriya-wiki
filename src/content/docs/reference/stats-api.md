---
title: "Telemetry Protocol (GET_STATS)"
---
Auriya exposes real-time hardware telemetry and frame pacing statistics over `/dev/socket/auriya.sock`. The Jetpack Compose manager app and floating overlay HUD consume this stream to render metric cards, graphs, and benchmark session records.

:::info Standardized JSON Envelope
Starting in v2.2.0, all IPC responses are enclosed in the standardized `ApiResponse<T>` envelope format (`{"status":"ok","data":{...}}` or `{"status":"error","message":"..."}`).
:::

## Transport & Access

| Parameter | Specification |
| :--- | :--- |
| **Command** | `GET_STATS` |
| **Transport** | Unix domain socket `/dev/socket/auriya.sock` (mode `0666`) |
| **Response** | Single-line JSON containing the `ApiResponse<StatsSnapshot>` envelope |
| **Performance** | Computed on-demand with zero background buffer allocation when no clients are polling |

From any root shell or terminal:

```console
$ printf 'GET_STATS\nQUIT\n' | nc -U /dev/socket/auriya.sock
{"status":"ok","data":{"fps":{"avg":119.4,"peak":120.2,"low_1pct":114.2,"low_0_1pct":98.6,...},"thermal":{...},"daemon":{...},"binder":{...}}}
```

## JSON Payload Schema

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

## Field Reference

### `daemon`
- **`version`**: Semantic version string (e.g. `2.2.0`).
- **`rss_mb`**: Current memory RSS footprint in megabytes (typically ~5.5 MB).
- **`active_profile`**: Current profile state (`fast`, `performance`, `balance`, `powersave`).
- **`commit`**: Short Git commit hash of the running build.

### `binder`
- **`operational`**: True if direct connection to Android `servicemanager` is healthy.
- **`screen_interactive`**: Screen status queried via `IPowerManager.isInteractive()`.
- **`is_floating`**: True if current foreground activity is in freeform/floating window mode.
- **`wifi_low_latency`**: True if `acquireWifiLock` low-latency lock is held via `IWifiManager`.
- **`dnd_mode`**: Active Do Not Disturb filter (`1` for All, `2` for Priority gaming).
- **`refresh_rate_hz`**: Active display refresh rate queried from `IDisplayManager`.

### `fps` (Frame Pacing & Performance)
- **`avg`**: Window mean frame rate ($1 / \text{mean frame duration}$).
- **`low_1pct`**: Mean frame rate of the slowest 1% of frames (primary stutter index).
- **`low_0_1pct`**: Mean frame rate of the slowest 0.1% of frames (extreme hitch index).
- **`dropped_frames`**: Number of frames presentation-time weighted as dropped.
- **`jank`**: Frames where rendering duration exceeded $1.5\times$ target frame interval.

### `cpu` & `gpu`
- **`cpu.load_pct`**: Global CPU utilization aggregated across all cores.
- **`cpu.cores[]`**: Per-core frequency (`khz`), governor (`gov`), cluster classification (`Little`/`Big`/`Prime`), online status, and load percentage.
- **`gpu.mhz`**: Active GPU frequency step.
- **`gpu.load_pct`**: Active GPU busy percentage.

### `thermal` & `battery`
- **`thermal.cpu_c` / `gpu_c` / `battery_c`**: Temperatures in degrees Celsius.
- **`battery.pct`**: Remaining battery percentage (0–100%).
- **`battery.current_ma`**: Instantaneous current in milliamperes.
- **`battery.voltage_v`**: Battery terminal voltage.
