---
title: "Project Structure"
---
```text
auriya/
├── src/                         [Rust] Core daemon and CLI codebase
│   ├── main.rs                  [Rust] Daemon binary entry point
│   ├── bin/auriyactl.rs         [Rust] CLI binary entry point
│   ├── lib.rs                   [Rust] Shared library facade
│   ├── common/                  [Rust] Shared constants and common IPC types
│   ├── cli/                     [Rust] CLI app parser, client, executor, and terminal output
│   ├── platform/                [Rust] Layer 1: Hardware and OS adapters
│   │   ├── binder/              [Rust] Native Binder IPC (client, process observer, actuators, services)
│   │   ├── cpu/                 [Rust] CPU topology, governors, and frequency ceilings
│   │   ├── gpu/                 [Rust] Adreno KGSL and MediaTek devfreq frequency control
│   │   ├── thermal/             [Rust] Multi-SoC thermal zone readers and throttling state
│   │   ├── vendor/              [Rust] Snapdragon and MediaTek SoC hardware hooks
│   │   └── common/              [Rust] Kernel tweaks (IO, memory, sched, touchpanel, procfs, display)
│   ├── core/                    [Rust] Layer 2: Core domain logic
│   │   ├── config/              [Rust] Settings and gamelist TOML parser engines
│   │   ├── ebpf/                [Rust] Embedded BPF loader and bytecode wrappers
│   │   ├── fas/                 [Rust] Frame-Aware Scheduling (controller, buffer, bottleneck)
│   │   ├── fps/                 [Rust] Frame timing collector and Kala probe integration
│   │   ├── logger/              [Rust] Zero-allocation dmesg-style direct file logger
│   │   ├── pid/                 [Rust] Target game process tracking and detection
│   │   ├── profile/             [Rust] Profile state machine (mode, apply, tuning)
│   │   ├── scaling/             [Rust] CPU/GPU frequency scaling governors
│   │   ├── stats/               [Rust] Telemetry, 0.1% low calculations, and ApiResponse envelope
│   │   ├── status/              [Rust] System state tracking and status serialization
│   │   └── telemetry/           [Rust] System telemetry collector (battery, thermal, load)
│   └── daemon/                  [Rust] Layer 3: Orchestration & IPC server
│       ├── context/             [Rust] DaemonContext central shared state and locks
│       ├── engine/              [Rust] Tokio async event loop and graceful shutdown
│       ├── ipc/                 [Rust] Unix domain socket server (/dev/socket/auriya.sock)
│       ├── model/               [Rust] Internal daemon state transfer models
│       ├── pipeline/            [Rust] Orchestration pipeline: Ingest -> Decide -> Apply -> FasTick
│       └── watcher/             [Rust] Configuration and filesystem change watchers
├── android/                     [Android / Gradle Kotlin workspace]
│   ├── app/                     [Android] Jetpack Compose manager application (UI, HUD overlay, Monet theme)
│   └── shared/                  [Android] Reusable data classes, serialization models, and root shell helper
├── module/                      [Module] Flashable root module template
│   ├── customize.sh             [Module] Flashing script (verify SHA256, deploy binaries, install app)
│   ├── service.sh               [Module] Late-start background service launcher
│   ├── action.sh                [Module] Root manager Action button trigger
│   ├── uninstall.sh             [Module] Clean module uninstallation
│   ├── icon.png                 [Module] 192x192 module icon for root manager UIs
│   ├── module.prop              [Module] Magisk / KernelSU / APatch module metadata
│   ├── libs/                    [Module] Temporary build staging (aarch64/, app/)
│   └── META-INF/                [Module] Recovery installer bootstrap wrappers
├── doc/asset/                   [Asset] Catalog and documentation display assets (icon.png)
├── .github/
│   ├── workflows/               [CI/CD] GitHub Actions build and release pipelines (build.yml, release.yml)
│   └── actions/                 [CI/CD] Composite actions (setup-tools, package-module, telegram-notify)
├── module.yaml                  [Catalog] Official KernelSU Modules repository specification
├── Cargo.toml                   [Rust] Workspace dependencies and binary configurations
├── settings.toml               [Config] Default global configuration
├── gamelist.toml               [Config] Default game profiles
└── update.json                 [Release] Root manager OTA update metadata
```

## Flashable ZIP Archive Structure

The packaged ZIP asset produced by CI/CD conforms to the following layout:

```text
auriya-<version>-<commit-count>-<hash>-release.zip
├── customize.sh                 [Installation script executed at flash time]
├── service.sh                   [Boot-time daemon launcher]
├── action.sh                    [Root manager action button script]
├── uninstall.sh                 [Module removal script]
├── module.prop                  [Module metadata (id, version, versionCode)]
├── icon.png                     [Module icon for root manager UIs]
├── settings.toml                [Default settings copied to /data/adb/.config/auriya]
├── gamelist.toml                [Default game rules copied to /data/adb/.config/auriya]
├── libs/                        [Temporary staging area removed after install]
│   ├── aarch64/
│   │   ├── auriya               [Stripped Rust daemon binary]
│   │   ├── auriyactl            [Stripped Rust CLI binary]
│   │   └── checksums.sha256     [SHA256 checksums of binaries]
│   └── app/
│       └── auriya-app.apk       [Manager app installed via pm install]
├── system/
│   └── bin/                     [Overlay binary directory]
└── META-INF/com/google/android/
    ├── update-binary            [Magisk/KernelSU installer entry point]
    └── updater-script
```

During installation, `libs/` is used strictly as a staging area. `customize.sh` verifies the SHA256 integrity of the binaries against `checksums.sha256`, copies them into `$MODPATH/system/bin/`, installs the manager app via `pm install -r -g`, creates symlinks in `/data/adb/ksu/bin` and `/data/adb/ap/bin` for KernelSU/APatch PATH integration, copies configs to `/data/adb/.config/auriya/` (without overwriting existing user configs), and immediately executes `rm -rf "$MODPATH/libs"`.
