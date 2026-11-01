---
title: "Debugging & Troubleshooting"
---
A boundary-first diagnostic guide and issue reporting manual for Auriya on physical Android devices. Auriya spans four architectural boundaries:
1. **Android Manager Application**: Jetpack Compose UI and floating HUD overlay.
2. **Unix Domain Socket**: Local control plane at `/dev/socket/auriya.sock`.
3. **Native Binder IPC**: Direct framework RPCs (`IActivityManager`, `IPowerManager`, `IDisplayManager`, `IWifiManager`, `INotificationManager`, `IWindowManager`).
4. **Kernel & Hardware Adapters**: sysfs nodes, procfs readers, and Kala kernel eBPF Uprobes.

When an issue occurs, pinpoint the boundary first, then use the specialized tools and workflows below.

## Modern Diagnostic Toolset (`auriyactl`)

Auriya provides an extensive suite of CLI commands via `auriyactl` to audit, monitor, and troubleshoot the daemon in real time.

### 1. General Status & Hardware Info

#### `auriyactl status`
Displays the daemon's operational state, PID, active package, active profile mode, and target FPS:

```bash
auriyactl status
```

Output:
```text
Daemon: Running (PID: 14210)
Active App: com.miHoYo.GenshinImpact (PID: 15302)
Profile: Performance (Auto)
Target FPS: 60 (Measured: 59.8 FPS)
```

If it prints `Daemon: Not running`, the daemon process failed to start or crashed during initialization. Inspect `/data/adb/auriya/daemon.log`.

#### `auriyactl info`
Executes a deep audit of hardware capabilities, SoC platform, CPU cluster topology, GPU devfreq/KGSL backend, kernel eBPF subsystem readiness, and daemon runtime RSS memory:

```bash
auriyactl info
```

Output:
```text
Hardware & Platform:
  Brand:          Xiaomi
  Codename:       marble
  Android:        14 (API 34)
  SoC Board:      taro
  CPU Topology:   1x Cortex-X3 + 4x Cortex-A715 + 3x Cortex-A510
  GPU:            Adreno 725
  GPU Driver:     kgsl-3d0
  Vulkan:         Supported
  Active Render:  SkiaVK
  Display:        120Hz [Supported: 60Hz, 120Hz]
  Root Manager:   KernelSU
  SELinux:        Enforcing
  Kernel:         Linux 5.10.198-android12-9-00045-g84e491295b92 aarch64

Kernel eBPF Diagnostics:
  BPF Mount:      Mounted (/sys/fs/bpf)
  BPF Syscall:    Available
  JIT Compiler:   Enabled
  Kala Probe:     Available
  Active Engine:  Kala eBPF

Daemon Runtime:
  PID:            14210 (Running)
  Memory (RSS):   5.4 MB
  CPU Load:       0.3%
  Workers:        2
```

### 2. Log Management & Live Streaming

Auriya uses a high-performance, zero-allocation file logger that writes dmesg-style timestamps directly to disk without intermediate shell buffers.

#### Primary Log Files

| Log File | Path | Details |
| :--- | :--- | :--- |
| **Daemon Active Log** | `/data/adb/auriya/daemon.log` | Active runtime log with boottime timestamps (`[ 1234.567890] [info] ...`). |
| **Daemon Rotated Log** | `/data/adb/auriya/daemon.log.old` | Previous log segment rotated automatically at 2 MB. |
| **Restart Log** | `/data/adb/auriya/restart.log` | Startup captures generated during service restarts by `service.sh`. |
| **Android System Log** | `logcat -s auriya` | Android system logcat entries from daemon bootup and root scripts. |

#### `auriyactl log`
Inspects, streams, or truncates the daemon log file directly from the terminal:

```bash
# View the last 30 log lines (default)
auriyactl log

# View the last 100 log lines
auriyactl log -n 100

# Stream logs continuously in real-time (equivalent to tail -f)
auriyactl log -f

# Truncate / clear the daemon log file
auriyactl log --clear
```

#### Adjust Log Verbosity Live (`auriyactl set-log`)
Change the daemon's log level at runtime without restarting:

```bash
auriyactl set-log debug     # Options: trace | debug | info | warn | error
```

`log_level` is not re-read from TOML on standard config reload; `set-log` is the live IPC mechanism for on-the-fly tracing.

### 3. Real-Time Telemetry & Monitoring

#### `auriyactl monitor`
Launches an interactive live telemetry dashboard tracking real-time frame rates, frame times, CPU cluster frequencies and loads, GPU frequencies, device temperatures, battery discharge current, and active package:

```bash
# Standard in-place dashboard (refreshes every 1000ms)
auriyactl monitor

# Specify refresh interval (e.g. 500ms)
auriyactl monitor -i 500

# Single-line rolling output (ideal for log files or non-interactive terminals)
auriyactl monitor -1
```

#### `auriyactl stats`
Queries a point-in-time telemetry snapshot:

```bash
# Plain text human-readable summary
auriyactl stats

# Raw JSON API envelope (ApiResponse<StatsSnapshot>)
auriyactl stats --json

# Continuous telemetry snapshot stream
auriyactl stats --stream --interval-ms 1000
```

### 4. Native Android Binder IPC Diagnostics

Auriya interacts directly with Android's system framework via Native Binder IPC without spawning child helper processes.

#### `auriyactl binder probe`
Probes Android's `servicemanager` and audits connectivity with all core framework services:

```bash
auriyactl binder probe
```

Output:
```text
Native Android Binder Probe:
  Binder IPC Status:          Operational
  PowerManager.isInteractive: true
  Foreground App:             com.miHoYo.GenshinImpact (PID: 15302) [Fullscreen]
  Display Mode (Binder):      120Hz
  Wi-Fi Low-Latency Lock:     Active (Held)
  Status Bar Lock:            Inactive (Unlocked)
  High Touch Polling Rate:    Supported (Ready)
  Battery Saver (Native):     Disabled
  Display Rotation:           Thawed (Unlocked)
```

#### `auriyactl binder test`
Executes an end-to-end automated self-test across all registered actuators:

```bash
auriyactl binder test
```

#### Manual Binder Actuator Commands
Test individual hardware actuators directly:

```bash
# Set Do Not Disturb filter
auriyactl binder dnd priority         # or 'all'

# Set display refresh rate override (0 to restore auto)
auriyactl binder rate 120
auriyactl binder rate 0

# Toggle Wi-Fi Low-Latency Lock (WIFI_MODE_FULL_LOW_LATENCY)
auriyactl binder wifi on
auriyactl binder wifi off
auriyactl binder wifi status

# Toggle High Touch Polling Rate boost
auriyactl binder touch on
auriyactl binder touch status

# Toggle notification status bar lock
auriyactl binder statusbar lock
auriyactl binder statusbar unlock
```

### 5. Runtime Tuning & Simulation

#### Mock Package Injection (`auriyactl inject`)
To debug profile scheduling and game detection without launching a heavy 3D game:

```bash
# Inject a mock package name
auriyactl inject com.miHoYo.GenshinImpact

# Check if profile switched to Performance
auriyactl status

# Clear mock injection and return to live Binder ProcessObserver
auriyactl clear-inject
```

#### Other Control Commands

```bash
auriyactl ping            # Verify Unix domain socket responsiveness ("PONG")
auriyactl get-pid         # Get PID of the running daemon process
auriyactl get-fps         # Query current measured FPS and target rate
auriyactl get-rates       # Query display refresh rates supported by Android
auriyactl reload          # Hot-reload settings.toml and gamelist.toml from disk
auriyactl restart         # Gracefully terminate daemon (SIGTERM) and relaunch
```

---

## Systematic Troubleshooting by Boundary

### 1. Daemon Not Running / Crashes on Boot

**Symptoms**: `auriyactl status` reports `Daemon: Not running`, or `auriyactl ping` fails.

1. Inspect `/data/adb/auriya/daemon.log` and `/data/adb/auriya/restart.log`.
2. Check `logcat -s auriya` for early kernel aborts or abort messages from `service.sh`.
3. Common root causes:
   - **Corrupted Installation**: Binary SHA256 checksum mismatch. Re-flash the module ZIP.
   - **SELinux Denial**: SELinux blocking socket creation under `/dev/socket/auriya.sock`. Check `dmesg | grep -i avc`.
   - **Stale Socket**: A leftover socket file exists. Run `auriyactl restart` to trigger cleanup and relaunch.

### 2. Game Not Recognized / Profile Not Switching

**Symptoms**: The game is open in the foreground, but `auriyactl status` remains on `Powersave` or `Balanced`.

1. Run `auriyactl binder probe` to verify `Foreground App`. If it displays `None`, check `daemon.log` for `ProcessObserver` errors.
2. Confirm the game package name is present in the configuration:
   ```bash
   auriyactl list-games
   ```
   If absent, add it via `auriyactl add-game <package_name>`.
3. Verify the [decision order](/internals/profile-scheduler/#decision-order):
   - Is the screen off? (PowerManager Interactive = `false`).
   - Is Android Battery Saver mode turned on? Battery Saver always forces `Powersave` regardless of whitelist status.
4. Test with mock injection: `auriyactl inject <package_name>`. If the profile switches during injection, the issue is restricted to the foreground detection sensor.

### 3. FPS Stuck at 0 or Not Updating

**Symptoms**: Game runs smoothly, but FPS reads `0` or `N/A`.

1. Run `auriyactl info` and examine the **Kernel eBPF Diagnostics** section:
   - If `BPF Mount` is not mounted, check if `/sys/fs/bpf` exists.
   - If `BPF Syscall` is unavailable, the running kernel lacks `CONFIG_BPF_SYSCALL=y`.
   - If `Kala Probe` is unavailable, check `daemon.log` to see if Kala failed to resolve `android::Surface::queueBuffer` in `/system/lib64/libgui.so`.
2. Auriya automatically falls back to sysfs frame timing when eBPF is unavailable. If sysfs nodes are also absent on your vendor tree, FPS detection cannot operate.

### 4. Refresh Rate Override / DND Actuators Failing

**Symptoms**: Entering a game does not switch the display to the configured refresh rate or DND fails to activate.

1. Run `auriyactl binder probe`. Ensure `Display Mode (Binder)` or relevant actuator fields are operational.
2. Run `auriyactl binder test` to review step-by-step actuator execution logs.
3. Check `auriyactl get-rates` to verify the target refresh rate is actually supported by the display panel.
4. On heavily customized vendor ROMs (MIUI, HyperOS, ColorOS), OEM display frameworks may override standard `IDisplayManager` Binder calls.

---

## Issue Reporting Guide

If you discover a bug, unexpected behavior, or a kernel incompatibility, please submit an issue on the [Auriya GitHub Issues](https://github.com/pavelc4/auriya/issues) tracker.

### Step 1: Capture One-Liner System Diagnostic

Run this command in Termux, ADB Shell, or any root terminal. It gathers all essential environment, kernel, root manager, and Auriya diagnostic data into a single output:

```bash
su -c 'echo "=== Auriya Issue Diagnostics ===" && \
echo "Manufacturer: $(getprop ro.product.manufacturer)" && \
echo "Model: $(getprop ro.product.model) ($(getprop ro.product.device))" && \
echo "Board: $(getprop ro.board.platform) / Hardware: $(getprop ro.hardware)" && \
echo "Android: $(getprop ro.build.version.release) (SDK $(getprop ro.build.version.sdk))" && \
echo "ROM: $(getprop ro.build.display.id)" && \
echo "Kernel: $(uname -a)" && \
echo "Root Manager: $([ -n "$KSU" ] || which ksud >/dev/null 2>&1 && echo "KernelSU ($(ksud -V 2>/dev/null || echo unknown))" || ([ -n "$MAGISK_VER" ] || which magisk >/dev/null 2>&1 && echo "Magisk ($(magisk -v 2>/dev/null || echo unknown))" || ([ -n "$APATCH" ] || which ap >/dev/null 2>&1 && echo "APatch ($(ap -v 2>/dev/null || echo unknown))" || echo "Other/Unknown")))" && \
echo "Auriya: $(auriyactl --version 2>/dev/null || grep -E "^version=" /data/adb/modules/auriya/module.prop 2>/dev/null)" && \
echo -e "\n=== auriyactl status ===" && auriyactl status 2>&1 && \
echo -e "\n=== auriyactl info ===" && auriyactl info 2>&1 && \
echo -e "\n=== auriyactl binder probe ===" && auriyactl binder probe 2>&1'
```

### Step 2: Fill Out the Issue Template

Copy the Markdown template below when opening an issue:

```markdown
### Issue Summary
[Provide a clear and concise description of the bug or unexpected behavior]

### Environment & Device Information
- **Device Model**: [e.g. Xiaomi POCO F5 (marble)]
- **SoC Platform**: [e.g. Snapdragon 7+ Gen 2 (SM7475)]
- **Android Version**: [e.g. Android 14 (API 34)]
- **ROM / OS**: [e.g. HyperOS 1.0.8.0.UMRMIXM / LineageOS 21]
- **Kernel Version**: [e.g. Linux 5.10.198-android12-9-00045-g84e491295b92 aarch64]
- **Root Solution & Version**: [e.g. KernelSU v0.9.5 / Magisk v27.0 / APatch v10763]
- **Auriya Version**: [e.g. v2.2.0 (release)]

### Diagnostic Command Output
```text
[Paste the complete output from the one-liner diagnostic command here]
```

### Target Application
- **Package Name**: [e.g. com.miHoYo.GenshinImpact or N/A]
- **Configured Profile**: [e.g. Performance / Balanced]

### Steps to Reproduce
1. [First Step]
2. [Second Step]
3. [Third Step]

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened, including any error messages]

### Relevant Daemon Logs (`/data/adb/auriya/daemon.log`)
```text
[Paste the last 50-100 lines of /data/adb/auriya/daemon.log captured during the issue]
```
```
