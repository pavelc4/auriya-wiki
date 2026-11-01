---
title: "Module Lifecycle"
---
From CI packaging to flash time, boot, and clean uninstallation: this document traces the complete lifecycle of the Auriya root module payload.

:::info Verified against source
`module/customize.sh`, `module/service.sh`, `module/uninstall.sh`, and `.github/actions/package-module/action.yml`.
:::

## 1. Package (CI / CD)

GitHub Actions builds a self-contained, immutable flashable ZIP:
1. Compiles `auriya` daemon and `auriyactl` CLI for `aarch64-linux-android` with full symbol stripping.
2. Compiles `auriya-app.apk` (Jetpack Compose manager app) via `./gradlew :app:assembleRelease`.
3. Packages files into `build/release/module/`:
   - `module.prop` (populated with release version and commit hash).
   - `icon.png` (192x192 module icon for KernelSU / Magisk / APatch).
   - `service.sh`, `customize.sh`, `action.sh`, `uninstall.sh`.
   - `settings.toml`, `gamelist.toml`.
   - `libs/aarch64/` (`auriya`, `auriyactl`, `checksums.sha256`).
   - `libs/app/` (`auriya-app.apk`).
4. Strips `.placeholder` files and compresses the archive using 7-Zip (`Deflate -mx=9`).
5. Generates an accompanying `.sha256` checksum asset.

The release artifact is named `auriya-<version>-<commit-count>-<hash>-release.zip`.

## 2. Extraction (Root Manager)

When flashed in KernelSU, Magisk, or APatch, the root manager extracts the ZIP archive directly into `$MODPATH` (`/data/adb/modules/auriya`).

## 3. Installation (`customize.sh`)

Executed during the flashing process:
1. **Architecture Check**: Verifies that `$ARCH == "arm64"`; aborts on unsupported architectures.
2. **Integrity Verification**: Checks SHA256 checksums of `auriya` and `auriyactl` against `checksums.sha256`.
3. **Binary Deployment**:
   - Copies `auriya` to `$MODPATH/system/bin/auriya` (mode `0755`).
   - Copies `auriyactl` to `$MODPATH/system/bin/auriyactl` (mode `0755`).
4. **Manager App Installation**:
   - Installs `libs/app/auriya-app.apk` directly via `pm install -r -g`.
5. **Staging Cleanup**:
   - Runs `rm -rf "$MODPATH/libs"` to delete the temporary staging directory, leaving zero leftover install files.
6. **Configuration Deployment**:
   - Creates `/data/adb/.config/auriya/`.
   - Moves default `settings.toml` and `gamelist.toml` into `/data/adb/.config/auriya/` **only if they do not already exist**, preserving existing user customizations across updates.
   - Removes config templates from `$MODPATH`.
7. **Root Manager PATH Integration**:
   - Symlinks `auriya` and `auriyactl` into `/data/adb/ksu/bin` and `/data/adb/ap/bin` for direct shell execution without full paths.
8. **Permission Hardening**:
   - Sets recursive permissions `0755` / `0644` across `$MODPATH`.

## 4. Boot Startup (`service.sh`)

Executed on every device boot by the root manager's late-start service trigger:
1. **Removal Check**: Verifies if the module is flagged for removal. If so, triggers `uninstall.sh` and exits immediately.
2. **Boot Synchronization**: Polls `sys.boot_completed` until Android initialization finishes, followed by a 3-second grace period.
3. **Instance Cleanup**: Terminates any lingering `auriya` processes and unlinks stale socket files `/dev/socket/auriya.sock`.
4. **Daemon Launch**: Launches the daemon non-blocking in the background:
   ```sh
   nohup "$AURIYA_BIN" --settings "$SETTINGS_CFG" --gamelist "$GAMELIST_CFG" >/dev/null 2>&1 &
   ```
5. **Readiness Probe**: Waits up to 5 seconds to verify that `pidof auriya` is running and `/dev/socket/auriya.sock` is open and responsive.

## 5. Uninstallation (`uninstall.sh`)

Executed when the module is deleted from the root manager:
1. Stops the `auriya` daemon process gracefully (`SIGTERM`, escalating to `SIGKILL` if unresponsive).
2. Force-stops and uninstalls `dev.auriya.app` via `pm uninstall`.
3. Removes `/dev/socket/auriya.sock`.
4. Cleans `/data/adb/.config/auriya` and runtime log directory `/data/adb/auriya`.
5. Removes symlinks from `/data/adb/ksu/bin` and `/data/adb/ap/bin`.
