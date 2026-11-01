---
title: "Debugging"
---
A boundary-first playbook. Auriya spans four boundaries — the Android Manager UI, the Unix domain socket, Native Binder IPC with the Android OS framework, and direct kernel `/sys` & `/proc` nodes. A symptom usually points at one boundary. Identify the boundary, then use the matching diagnostic below.

## Logs first

| Log | Path | Format & Details |
| :--- | :--- | :--- |
| Daemon | `/data/adb/auriya/daemon.log` (+ `.1`, `.2`) | Direct zero-allocation writer with dmesg-style boottime timestamps: `[ 1234.567890] [info] ...`. Auto-rotates at 2 MB. |
| Restart | `/data/adb/auriya/restart.log` | Output captured during daemon restarts triggered by `service.sh`. |
| Logcat | `logcat -s auriya` | Android system logcat messages from daemon startup and shell hooks. |

Paths are from the [Filesystem reference](/reference/filesystem/#logs--dataadbauriya).

## Adjust log verbosity

The daemon's log level comes from `settings.daemon.log_level` at startup
([Settings](/reference/settings/#daemon)). To change it **at runtime without a
restart**, use IPC:

```bash
auriyactl set-log debug     # or info | warn | error | trace
```

`log_level` is **not** re-read on config reload — `set-log` is the live path
([Settings → reload behavior](/reference/settings/#reload-behavior)).

## Boundary-by-boundary

### 1. Is the daemon even up?

```bash
auriyactl ping        # → "Daemon is alive (PONG)"
auriyactl status      # → status block, or "Daemon: Not running"
```

`Not running` $\rightarrow$ the boot sequence failed. Inspect `/data/adb/auriya/daemon.log`.
Common causes include missing configuration files, corrupted binary SHA256 checksums, or missing root privileges on the Unix socket.

### 2. Socket / IPC

Talk to the socket directly to observe raw protocol transactions:

```bash
printf 'STATUS\nQUIT\n' | nc -U /dev/socket/auriya.sock
printf 'GET_STATS\nQUIT\n' | nc -U /dev/socket/auriya.sock
```

Full command and response reference: [IPC Protocol](/internals/ipc-protocol/).
All modern queries return responses enclosed in the `ApiResponse<T>` envelope format.

### 3. Foreground / game detection

If a game is not being recognized:

```bash
auriyactl get-pid                      # daemon's resolved PKG and PID
auriyactl get-stats                    # inspect data.binder and data.session
auriyactl inject com.your.game         # force a package (debug); clear-inject to undo
```

Auriya receives foreground changes directly from Android's `IActivityManager` via Native Binder IPC (`ProcessObserver`). If `data.binder.operational` is `false`, check `daemon.log` for Binder initialization warnings.

### 4. Profile not applying / wrong profile

- Confirm the package is in the whitelist (`auriyactl list-games`).
- Remember the [decision order](/internals/profile-scheduler/#decision-order): screen-off or battery-saver overrides gaming profiles.
- The daemon only writes when the target profile differs from the current one ([idempotence guard](/internals/profile-scheduler/#the-idempotence-guard)).
- Inspect `data.daemon.active_profile` in `auriyactl get-stats` to verify the active state.

### 5. Kernel node / tweak not taking effect

Tweaks are **best-effort**: a missing node is skipped silently without errors
([System tweaks](/internals/system-tweaks/#guarded-best-effort-writes)). Raise
the log level to `debug` (`auriyactl set-log debug`) to see which sysfs paths were discovered and written. If an OEM service is fighting Auriya, verify that the relevant [Vendor Lock](/internals/system-tweaks/#vendor-lock--stopping-vendor-services-from-fighting-back) node exists on your device.

## Restarting cleanly

```bash
auriyactl restart
```

`auriyactl restart` is a native Rust command that gracefully terminates the existing daemon process via `SIGTERM`, cleans stale sockets, and relaunches `service.sh`. See [Command reference](/reference/commands/#restart-is-local-not-an-ipc-command).
