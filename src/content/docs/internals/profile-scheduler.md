---
title: "Profile Scheduler"
---
The scheduler is the daemon's decision core: once per tick it decides which
performance profile the device should be in and applies it. This page documents
the exact decision function; for the **system-level** view and the tables of what
each profile writes, see
[Architecture overview](/architecture/overview/#profile-decision-workflow) — this
page is the source-precise companion to it, not a duplicate.

:::info Verified against source
Traced to Auriya v2.2.0:
[`src/daemon/pipeline/`](https://github.com/pavelc4/auriya/tree/main/src/daemon/pipeline/) ([`decide.rs`](https://github.com/pavelc4/auriya/blob/main/src/daemon/pipeline/decide.rs), [`apply.rs`](https://github.com/pavelc4/auriya/blob/main/src/daemon/pipeline/apply.rs))
and
[`src/daemon/engine/`](https://github.com/pavelc4/auriya/tree/main/src/daemon/engine/).
:::

## Decision order

`PipelineDecider::decide` (`decide.rs`) and `PipelineApplier::apply` (`apply.rs`) evaluate conditions in **strict
priority order**; the first matching branch wins and no lower branch runs:

```mermaid
flowchart TD
    tick([Tick Triggered]) --> branch1{"1. Screen OFF or<br/>Battery Saver ON?"}
    branch1 -->|yes| act1["POWERSAVE + Low ceiling<br/>+ detach eBPF + disable game DnD"]
    branch1 -->|no| branch2{"2. IPC foreground override<br/>(INJECT) exists?"}

    branch2 -->|yes| act2["Treat injected package as foreground"]
    branch2 -->|no| branch3{"3. Native Binder reports<br/>focused package?"}

    branch3 -->|no| act3["Default mode<br/>+ release game-owned state"]
    branch3 -->|yes| branch4{"4. Same package &<br/>tracked PID alive?"}

    branch4 -->|yes| act4["Fast path: FAS adjusts if available;<br/>Profile NOT reapplied"]
    branch4 -->|no| branch5{"5. Package is whitelisted?"}

    branch5 -->|yes| val_pid{"Validate PID against /proc"}
    val_pid -->|valid| act5["Enter / update game session"]
    val_pid -->|invalid| act3

    branch5 -->|no| act6["6. Default mode<br/>+ release game-owned state"]
```

Screen-off / battery-saver is checked first and unconditionally, so it wins even
while a game is foregrounded. The injected override (2) exists for debugging via
`INJECT` (see [Game detection](/internals/game-detection/#where-the-foreground-package-comes-from)).

## The idempotence guard

Profiles are only (re)applied when the target differs from what is already
active (`if last.profile_mode != Some(target_mode)` in `apply.rs`). Repeated ticks in a steady state
therefore do **not** rewrite kernel nodes — a tick that changes nothing performs
no writes.

## Entering a whitelisted game

When branch 5 validates a live PID, `apply_enter_game` (`apply.rs`)
runs the game-session setup. The full ordered sequence (vendor lock, toast
broadcast, mode resolution, ceiling, refresh rate, eBPF attach, DnD, PID tracker)
is enumerated in
[Architecture overview → Entering a whitelisted game](/architecture/overview/#entering-a-whitelisted-game).
Source-level specifics worth pinning here:

- **Mode resolution is case-insensitive with a Performance default.** `powersave`
  → Powersave, `balance` → Balance, `fast` → Fast, **anything else or missing → Performance**
  (`decide.rs`). A typo silently resolves to Performance.
- **Governor fallback**: an empty per-game `cpu_governor` falls back to the global
  `balance_governor` (`apply.rs`).
- **Ceiling**: an unparseable per-game `ceiling` string is dropped to
  no-override, not an error (`apply.rs`).
- **Refresh rate** is only requested when it differs from the currently applied
  rate (`apply.rs`), and released (request `0`) when leaving
  (`apply.rs`).

What each profile actually writes to the kernel is the single-source-of-truth
table in
[Architecture overview → What each static profile changes](/architecture/overview/#what-each-static-profile-changes).

## FAS adjustments within a session

On the fast path (branch 4), if Frame-Aware Scheduling exists it consumes the
Kala frame stream and picks one scaling action per tick. The action→effect
mapping (`BoostGpu`, `BoostCpu`, `BoostBalanced`, `Maintain`, `Reduce`) is
documented in
[Architecture overview → FAS dynamic changes](/architecture/overview/#fas-dynamic-changes-inside-the-same-game).
The frame-measurement mechanism itself is in
[Kala](/internals/kala-research/).

## Leaving a game / no foreground

The clear path (`apply_balance_and_clear`, `apply.rs`) applies
`daemon.default_mode` only if it differs from the current mode, then restores
default ceiling, detaches eBPF, requests normal notifications (DnD All), releases
any refresh-rate override (request `0`), unlocks vendor controls, and clears the
PID tracker.

## The `current_profile` file

On each applied profile change the daemon also writes
`/data/adb/.config/auriya/current_profile` (`status_file.rs`). It contains a single digit:

| Value | Profile |
| --- | --- |
| `1` | Performance |
| `2` | Balance |
| `3` | Powersave |
| `4` | Fast |

This is a **legacy/compatibility** status output for external readers. It is
best-effort (write failures are logged, not fatal) and is **not** the
authoritative UI state — live daemon status over IPC is. See
[Filesystem reference](/reference/filesystem/#configuration-and-runtime-state--dataadbconfigauriya).

## Error handling

A failed profile application logs an error and leaves `last.profile_mode`
unchanged, so the next tick retries (`apply.rs`). A tick that
errors does not terminate the loop; identical errors are debounced for 30 s (see
[Architecture overview → Event loop](/architecture/overview/#event-loop-and-execution-cadence)).

## Likely to drift first

The branch order and the mode/ceiling parsing defaults. Re-verify against
`PipelineDecider::decide` and `apply_enter_game` in `src/daemon/pipeline/`.
