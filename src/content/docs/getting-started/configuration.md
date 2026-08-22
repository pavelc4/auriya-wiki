---
title: "Configuration"
---
:::tip Configure everything from the manager app
**You do not need to edit any files by hand.** The Auriya manager app is the
intended way to change every setting global behavior and per-game overrides
alike. Open the app, change what you want, and it writes the config for you; the
daemon picks it up automatically. The file details below are for understanding
and power-user fallback only a normal setup never touches a terminal or a text
editor. For which values to choose, see [Performance tuning](performance-tuning).
:::

Under the hood Auriya reads two TOML files, both under `/data/adb/.config/auriya/`
(the app writes these — you don't have to):

| File | Scope | Full reference |
| --- | --- | --- |
| `settings.toml` | **Global** daemon and scheduler defaults | [settings.toml reference](../reference/settings) |
| `gamelist.toml` | **Per-app** whitelist and overrides | [gamelist.toml reference](../reference/gamelist) |

This page is the orientation; the reference pages are the source of truth for
every key (type, default, whether the daemon actually consumes it, and evidence).

## Dynamic Reload & Directory Watcher

Auriya features a built-in, low-overhead background **Inotify Directory Watcher** running on a dedicated thread (`auriya-config-watcher`) that monitors `/data/adb/.config/auriya/`:

- **Atomic File Detection** — Captures both standard `Modify` events and atomic rename `Create` events (e.g. write-to-temp-then-rename workflows used by Android file writers and editors).
- **Settings Dynamic Reload** — Modifications to `settings.toml` immediately trigger `daemon.reload_settings()` and an instant scheduler tick. Runtime keys like `cpu.default_governor`, `daemon.default_mode`, and `daemon.check_interval_ms` apply on the fly without restarting the daemon.
- **Resilient Gamelist Reload** — When `gamelist.toml` changes, the watcher safely loads the new configuration into the daemon's atomic shared memory (`Arc<RwLock<Arc<GameList>>>`) with a retry loop (up to 3 retries with backoff) to guard against partial in-flight writes, rebuilds the active process whitelist, and wakes the scheduling loop immediately.

## How edits reach the daemon

- **From the manager app (recommended)** — The app writes both files, and for the
  game list the daemon also rewrites it in response to app commands. The directory
  watcher detects these updates instantly. This is the primary, supported path
  and covers every setting.
- **From the CLI** — `auriyactl` mutates the game list over IPC (`add-game`,
  `remove-game`, and raw `UPDATE_GAME`) and can trigger a settings reload with
  `auriyactl reload`. It has **no** command to edit individual `settings.toml`
  keys. See [Command reference](../reference/commands).
- **By hand (fallback)** — You *can* edit the files directly with a root text editor.
  The directory watcher will automatically pick up your edits and reload them live;
  running `auriyactl reload` is also available as an explicit trigger.

## Two things to know before editing

1. **Live configuration updates.** `cpu.default_governor`, `daemon.default_mode`,
   `daemon.check_interval_ms`, and the FAS block (`[fas]`, `[dynamic_governor]`,
   `[modes.*]`) are re-read live when `settings.toml` is modified and updated directly
   via `FasController::set_tuning`. The directory watcher safely captures atomic writes.
2. **`fas.default_mode` picks the active `[modes.*]`.** Only the mode it names
   drives FAS margin/thermal; the other `[modes.*]` blocks are inactive until
   selected. See [settings → `[modes.*]`](../reference/settings#modes).

## Invalid values

There is no `deny_unknown_fields`, so unknown keys are **silently ignored** and
some fields fall back to defaults rather than erroring (e.g. an unknown game
`mode` resolves to Performance, an unparseable `ceiling` is dropped). A malformed
`settings.toml` **aborts daemon startup**; a malformed `gamelist.toml` does too,
but a *missing* game list is treated as empty. Details in the reference pages.

## Next

[Performance tuning](performance-tuning) — which values to choose ·
[settings.toml reference](../reference/settings) ·
[gamelist.toml reference](../reference/gamelist) ·
[Profile scheduler](../internals/profile-scheduler).
