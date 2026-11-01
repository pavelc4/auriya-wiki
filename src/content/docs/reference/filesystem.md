---
title: "Filesystem Reference"
---
Every path Auriya reads, writes, or installs on an Android device, categorized by role and lifecycle stage.

:::info Verified against source
Path constants defined in `src/platform/common/mod.rs` and `src/core/config/mod.rs`. Runtime scripts: `module/customize.sh`, `module/service.sh`, `module/uninstall.sh`.
:::

## Runtime Paths (Installed & Running Device)

### Configuration Directory — `/data/adb/.config/auriya/`

| Path | Written by | Read by | Purpose |
| :--- | :--- | :--- | :--- |
| `settings.toml` | Manager App / User | Daemon | Global daemon configuration, default governors, tuning parameters, and feature toggles. Preserved across module updates. |
| `gamelist.toml` | Manager App / User / Daemon IPC | Daemon | Per-game whitelists, target profiles, frequency ceilings, and refresh rate preferences. Preserved across module updates. |

### Daemon Unix Domain Socket

| Path | Purpose |
| :--- | :--- |
| `/dev/socket/auriya.sock` | Local Unix domain socket used for all client-daemon IPC (`GET_STATS`, `SET_PROFILE`, `INJECT_APP`). Created with permissions `0666` by the daemon upon startup; unlinked cleanly on termination. |

### Log Directory — `/data/adb/auriya/`

| Path | Written by | Purpose |
| :--- | :--- | :--- |
| `auriya.log` | DmesgLogger | Structured kernel-style logs with boottime precision stamps (`[   12.345678] [INFO] ...`). Automatically rotated when exceeding 1 MB. |
| `auriya.log.1` | DmesgLogger | Previous rotated log archive. |

### Module Directory — `/data/adb/modules/auriya/`

Root module directory mounted into the Android overlay filesystem by KernelSU, Magisk, or APatch:

| Path | Permissions | Purpose |
| :--- | :--- | :--- |
| `module.prop` | `0644` | Module metadata (`id=auriya`, `name`, `version`, `versionCode`, `author`, `description`). |
| `icon.png` | `0644` | 192x192 PNG icon rendered in root manager interfaces. |
| `service.sh` | `0755` | Late-start background service script executed at boot (`sys.boot_completed`). |
| `action.sh` | `0755` | Action button trigger script executed when tapped in the root manager UI. |
| `uninstall.sh` | `0755` | Cleanup script triggered when the module is removed. |
| `system/bin/auriya` | `0755` | The compiled aarch64 Rust daemon binary. |
| `system/bin/auriyactl` | `0755` | The compiled aarch64 Rust CLI control client. |

### Symlinks for Shell Integration

| Source Path | Symlink Destination | Purpose |
| :--- | :--- | :--- |
| `/data/adb/modules/auriya/system/bin/auriya` | `/data/adb/ksu/bin/auriya`<br/>`/data/adb/ap/bin/auriya` | Allows invoking `auriya` directly from any root shell without specifying full paths. |
| `/data/adb/modules/auriya/system/bin/auriyactl` | `/data/adb/ksu/bin/auriyactl`<br/>`/data/adb/ap/bin/auriyactl` | Allows invoking `auriyactl` directly from any terminal. |

## Staging Paths (Inside Flashable ZIP Only)

These paths exist temporarily inside the flashable ZIP archive and are purged immediately by `customize.sh` after deployment:

| ZIP Path | Destination during Flash | Purpose |
| :--- | :--- | :--- |
| `libs/aarch64/auriya` | `/data/adb/modules/auriya/system/bin/auriya` | Staged daemon binary; deleted after copying. |
| `libs/aarch64/auriyactl` | `/data/adb/modules/auriya/system/bin/auriyactl` | Staged CLI binary; deleted after copying. |
| `libs/aarch64/checksums.sha256` | Verified in memory | SHA256 checksums used to verify binary integrity. |
| `libs/app/auriya-app.apk` | Installed via `pm install -r -g` | User-facing manager app; deleted from module directory after installation. |
