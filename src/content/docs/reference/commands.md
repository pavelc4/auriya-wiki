---
title: "Command Reference (auriyactl)"
---
`auriyactl` is the command-line control and hardware diagnostics client for the Auriya daemon. It provides an ergonomic interface over the Unix domain socket IPC protocol and Native Android Binder IPC diagnostics.

:::info Verified against source
Traced to Auriya v2.2.0.
Files:
- [`src/cli/app/`](file:///home/sineva/prjkt/rust/auriya/src/cli/app/) (Clap command definitions and arguments)
- [`src/cli/executor.rs`](file:///home/sineva/prjkt/rust/auriya/src/cli/executor.rs) (Command dispatch and execution timing)
- [`src/cli/commands/`](file:///home/sineva/prjkt/rust/auriya/src/cli/commands/) (Subcommand handlers and implementations)
- [`src/cli/output/`](file:///home/sineva/prjkt/rust/auriya/src/cli/output/) (Formatted terminal output and dashboard rendering)
:::

## Synopsis

```text
auriyactl [--socket <path>] <subcommand> [args]
```

- Running `auriyactl` with **no subcommand prints help and exits** non-zero (`arg_required_else_help = true`).
- `--socket <path>` / `-s <path>` overrides the daemon socket. Default: `/dev/socket/auriya.sock`.

## Subcommands

### 1. Daemon Lifecycle

| Subcommand | Arguments | IPC Command | Output / Action |
| :--- | :--- | :--- | :--- |
| `status` | — | `STATUS` | Formatted status block (enabled, profile, games, FPS, core metrics). |
| `enable` | — | `ENABLE` | `OK ENABLED`. |
| `disable` | — | `DISABLE` | `OK DISABLED`. |
| `reload` | — | `RELOAD` | `Configuration reloaded: OK RELOADED <n>`. |
| `restart` | — | *(local)* | Gracefully restarts the daemon via `service.sh`. |
| `ping` | — | `PING` | `Daemon is alive (PONG)`. |
| `get-pid` | — | `GET_PID` | Displays the daemon process PID and active game PID. |

### 2. Tuning & Profiles

| Subcommand | Arguments | IPC Command | Description |
| :--- | :--- | :--- | :--- |
| `set-profile` | `<fast\|performance\|balance\|powersave>` | `SET_PROFILE <MODE>` | Sets the active global performance profile. |
| `set-fps` | `<fps>` | `SET_FPS <fps>` | Dynamically adjusts the target frame rate. |
| `get-fps` | — | `GET_FPS` | Prints current measured FPS and target rate. |
| `add-game` | `<package>` | `ADD_GAME <pkg>` | Adds package to `gamelist.toml`. |
| `remove-game` | `<package>` | `REMOVE_GAME <pkg>` | Removes package from `gamelist.toml`. |
| `list-games` | — | `GET_GAMELIST` | Lists all configured games in `gamelist.toml`. |

### 3. Diagnostics & Telemetry

| Subcommand | Options | Description |
| :--- | :--- | :--- |
| `info` | — | Inspects device SoC, CPU topology, GPU KGSL nodes, and eBPF capabilities. |
| `stats` | `--json`, `--stream`, `--interval-ms <ms>` | Displays formatted telemetry snapshot or raw JSON `ApiResponse<StatsSnapshot>` envelope. |
| `monitor` | `-1` / `--oneline`, `-i` / `--interval-ms <ms>` | Live real-time terminal dashboard or compact 1-line stream (FPS, CPU, GPU, temp, battery). |
| `log` | `-f` / `--follow`, `-n` / `--lines <n>`, `--clear` | Displays, follows, or truncates `/data/adb/auriya/daemon.log`. |
| `get-rates` | — | Queries supported display refresh rates from Android display modes. |
| `list-packages` | — | Lists installed Android packages via package manager. |

### 4. Developer & Debug

| Subcommand | Arguments | Description |
| :--- | :--- | :--- |
| `set-log` | `<trace\|debug\|info\|warn\|error>` | Sets daemon live `tracing` log filter without restarting. |
| `inject` | `<package>` | Manually overrides detected foreground package for testing. |
| `clear-inject` | — | Clears manual foreground override. |
| `binder <subcommand>` | See below | Direct Android Native Binder IPC diagnostics and actuators. |

#### `auriyactl binder` Subcommands

- `probe`: Tests connection to Android `servicemanager` and probes core system services.
- `test`: Executes end-to-end automated Binder RPC self-tests.
- `dnd <all|priority>`: Toggles Do Not Disturb via `INotificationManager`.
- `rate <hz>`: Sets display refresh rate override via `IDisplayManager` (`0` to restore).
- `wifi [on|off|status]`: Controls low-latency Wi-Fi lock (`WIFI_MODE_FULL_LOW_LATENCY`).
- `touch [on|off|status]`: Controls high touch polling rate sampling boost.
- `statusbar [lock|unlock|status]`: Locks or unlocks notification panel and alerts.
- `power <action> [name] [value]`: Interacts with vendor Hardware PowerHAL modes.
- `toast <message> [--long]`: Displays native Android Toast message on screen.
- `window <action> [param]`: Manages display orientation lock and window animation scales.

## Restart Behavior

`auriyactl restart` does **not** send an IPC command. It executes locally in the CLI (`src/cli/commands/restart.rs`):

1. Sets module status to `sleep`, then dispatches `killall -q -TERM auriya`, waits 2 seconds, and escalates to `killall -q -KILL auriya`.
2. Truncates `/data/adb/auriya/daemon.log`.
3. Relaunches `sh /data/adb/modules/auriya/service.sh >> /data/adb/auriya/restart.log 2>&1 &`.

## Examples

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
# Opens interactive full-terminal live telemetry dashboard
```
