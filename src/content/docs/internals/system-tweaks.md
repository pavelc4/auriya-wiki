---
title: "System Tweaks"
---
The tweak layer is where the daemon actually touches the device: guarded writes
to `/proc` and `/sys`, plus framework actions routed directly through Android via
Native Binder IPC. Everything here is **best-effort and device-dependent** — a node
that does not exist is skipped, never fatal.

:::info Verified against source
Traced to Auriya v2.2.0.
Files:
- [`src/platform/`](file:///home/sineva/prjkt/rust/auriya/src/platform/) (Hardware and kernel subsystem adapters)
- [`src/platform/binder/actuators.rs`](file:///home/sineva/prjkt/rust/auriya/src/platform/binder/actuators.rs) (Native Binder IPC actuators)
- [`src/core/profile/apply.rs`](file:///home/sineva/prjkt/rust/auriya/src/core/profile/apply.rs) (Profile execution engine)
:::

## Module map

Hardware adapters live under `src/platform/`:

| Module | Responsibility |
| --- | --- |
| `cpu/` (`governor.rs`, `ceiling.rs`, `topology.rs`) | CPU governor, frequency ceilings, boost, and topology probing. |
| `gpu/` (`adreno.rs`, `devfreq.rs`) | Adreno KGSL GPU performance/balanced mode and generic devfreq. |
| `thermal/` (`zones.rs`, `sconfig.rs`) | Multi-SoC thermal sensor monitoring and Xiaomi sconfig mode control. |
| `vendor/` (`detect.rs`, `snapdragon.rs`, `mtk.rs`) | Dynamic SoC detection and vendor-specific tuning hooks. |
| `common/` (`init.rs`, `memory.rs`, `sched.rs`, `storage.rs`, `touchpanel.rs`) | Generic OS tweaks (block-I/O, vm/swappiness, scheduler, touchpanel). |
| `binder/` (`actuators.rs`, `client.rs`, `observer.rs`) | Native Binder RPC client, actuators (DnD, refresh rate, Wi-Fi lock), and process observer. |

Which of these a given profile triggers is the single-source table in
[Architecture overview → What each static profile changes](/architecture/overview/#what-each-static-profile-changes).

## Path detection and caching

Sysfs layout varies per device, so paths are discovered **once** and memoized in
a `OnceLock`. `CpuPaths::scan` probes `cpu0..15` and `policy0..7` governor nodes
plus `cpu1..15/online`, keeping only those that exist (`paths.rs`,
`cpu_paths()`). `set_governor_cached` then writes every cached governor node,
ignoring individual write errors:

```rust
pub fn set_governor_cached(governor: &str) {
    let paths = cpu_paths();
    for path in &paths.governors_cpu    { let _ = std::fs::write(path, governor); }
    for path in &paths.governors_policy { let _ = std::fs::write(path, governor); }
}
```

The same pattern caches Snapdragon KGSL/memlat paths **and their original values**
so they can be restored later (`SnapdragonPaths::scan`, `paths.rs`).

## Guarded, best-effort writes

The prevailing idiom (e.g. `init.rs`) is: check existence, write, ignore failure.
Missing nodes are silently skipped so a different kernel layout keeps running. A
concrete slice of the general tweaks (`apply_general_tweaks`, `init.rs`):

```rust
// disable kernel panics (only nodes that exist)
for (path, value) in [
    ("/proc/sys/kernel/panic", "0"),
    ("/proc/sys/kernel/panic_on_oops", "0"),
    ("/proc/sys/kernel/panic_on_warn", "0"),
    ("/proc/sys/kernel/softlockup_panic", "0"),
] {
    if Path::new(path).exists() { fs::write(path, value)?; }
}
```

`apply_general_tweaks` also: sets block-I/O tunables per `/sys/block/*/queue`
(`iostats=0`, `add_random=0`, `read_ahead_kb=32`, `nr_requests=32`), picks the
best available TCP congestion control from `bbr3 → bbr2 → bbrplus → bbr →
westwood → cubic`, applies VM/scheduler tunables, and disables several OEM
"assist"/bloat modules and the OEM battery-saver kernel module (`init.rs`). These
are OEM-node-dependent and mostly no-ops on a device that lacks them.

## Actions routed through Android — Native Binder Actuators

Framework-level system settings cannot be toggled via `/sys` or `/proc` because they are owned by Android system services (`notification`, `display`, `wifi`, `activity_task`). Auriya interacts with these services directly via **Native Binder IPC** (`src/platform/binder/actuators.rs`), eliminating intermediate companion processes and disk files:

- **Do Not Disturb (DnD)**: Dispatches `INotificationManager.setInterruptionFilter` via Binder RPC (`1` = `INTERRUPTION_FILTER_ALL` to restore normal notifications; `2` = `INTERRUPTION_FILTER_PRIORITY` during gaming).
- **Refresh Rate**: Dispatches `IDisplayManager` display configuration calls via Binder RPC, with automatic fallback to Android `settings put system min_refresh_rate` / `peak_refresh_rate`.
- **Wi-Fi Low-Latency Lock**: Calls `IWifiManager.acquireWifiLock` with `WIFI_MODE_FULL_LOW_LATENCY` (mode `4`) when entering a game session, disabling Wi-Fi power-save polling and packet coalescing to prevent ping spikes.
- **Floating Window Detection**: Queries `IActivityTaskManager.getAllRootTaskInfos` to detect if the active game is running in a freeform or picture-in-picture window, capping render target to 30 FPS to save power.

All Binder client RPCs run directly in memory with zero disk writes, ensuring sub-millisecond execution times.

## SoC detection

Vendor hooks pick a SoC family once, cached in a `OnceLock` (`vendor/detect.rs`,
`detect_soc`). Detection tries, in order: `ro.board.platform` prefixes (`mt`/`k6`
→ MediaTek; `sm`/`sdm`/`msm`/`apq` → Snapdragon; `exynos`; `ud710`/`ums` → Unisoc;
`gs` → Tensor), then `ro.hardware` substrings, then filesystem probes (`/proc/ppm`
→ MediaTek, `/sys/class/kgsl/kgsl-3d0` → Snapdragon). Falls back to `Unknown`.
Only MediaTek and Snapdragon have implemented hook modules at this revision.

## Vendor lock — stopping vendor services from fighting back

On many devices a vendor "perfmgr"/game service continuously rewrites the same
CPU/GPU nodes Auriya sets, undoing Auriya's changes within milliseconds.
`VendorLock` neutralizes this by pinning a set of vendor toggles **read-only via a
bind mount** (`vendor_lock.rs`, `lock_all`):

For each existing path in `VENDOR_PATHS` it: saves the current value, writes the
desired value, `chmod`s the node to `0444`, then **bind-mounts** a Auriya-owned
file over it (`MS_BIND | MS_REC`) so even privileged writes hit the overlay, not
the real node. `unlock_all` unmounts, restores permissions, and writes the saved
value back. The locked set (`VENDOR_PATHS`):

```text
/sys/module/mtk_fpsgo/parameters/perfmgr_enable      → 0
/sys/module/perfmgr/parameters/perfmgr_enable        → 0
/sys/module/perfmgr_policy/parameters/perfmgr_enable → 0
/sys/module/perfmgr_mtk/parameters/perfmgr_enable    → 0
/sys/module/migt/parameters/glk_fbreak_enable        → 0
/sys/module/migt/parameters/glk_disable              → 1
/proc/game_opt/disable_cpufreq_limit                 → 1
```

Locking happens when entering a game session and unlocking when leaving it (see
[Profile scheduler](/internals/profile-scheduler/#entering-a-whitelisted-game)). A failed
mount-bind reverts the node's permissions and logs a warning rather than aborting.

:::warning This performs mounts as root
`VendorLock` calls `mount`/`umount2` and `chmod`s kernel nodes — a genuine trust
boundary. It only touches the fixed `VENDOR_PATHS` list above, and only nodes that
already exist.
:::

## Likely to drift first

`VENDOR_PATHS`, the general-tweak node lists and their values in `init.rs`, and
the SoC-detection prefixes. These are hardware-specific and change most often.
Re-verify against `src/core/tweaks/init.rs`, `vendor_lock.rs`, and
`vendor/detect.rs`.
