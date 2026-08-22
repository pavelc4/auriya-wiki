---
title: "Membangun (Building)"
---
Cara mengompilasi setiap bagian dari Auriya. Kompilasi Rust memiliki **catatan khusus repositori** yang wajib diketahui sebelum menjalankan perintah cargo apa pun.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit `10fe7c6`: [`Cargo.toml`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/Cargo.toml), [`.cargo/config.toml`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/.cargo/config.toml), `android/*/build.gradle.kts`, `website/package.json`. Resep CI resmi ada di [Workflow CI/CD](/id/development/ci-cd/).
:::

## Cargo Dikonfigurasi Cross-Compile untuk Android

File `.cargo/config.toml` menetapkan:

```toml
[build]
target = "aarch64-linux-android"

[target.aarch64-linux-android]
linker = "/opt/android-ndk/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android29-clang"
runner = "bash .cargo/adb-runner.sh"
```

Konsekuensi penting bagi kontributor:
- **`cargo build` tidak membangun untuk host lokal secara default.** Perintah ini melakukan cross-compile ke binary `aarch64-linux-android` dan membutuhkan Android NDK pada jalur hardcoded `/opt/android-ndk`.
- **`cargo test` dijalankan langsung di perangkat fisik.** Nilai `runner` mengirimkan setiap binary pengujian ke perangkat yang terhubung melalui adb (`.cargo/adb-runner.sh`). Sejumlah tes (`pid_tracker`, `cmd_writer`) memang memerlukan lingkungan Android/Linux nyata.

Untuk melakukan build di komputer host (misal untuk unit test lokal non-perangkat):

```bash
cargo build --target x86_64-unknown-linux-gnu
cargo test  --target x86_64-unknown-linux-gnu
```

## Rust — Resep Kompilasi CI

Perintah persis yang digunakan di alur CI ([CI/CD → rust-binary](/id/development/ci-cd/#rust-binary)):

```bash
# Memerlukan: Android NDK, Rust nightly dengan target aarch64-linux-android,
#             rust-src, dan cargo-ndk.
cargo ndk -t aarch64-linux-android --platform 26 -- build --release --bin auriya --bin auriyactl
```

`cargo ndk` menyuplai jalur toolchain NDK secara otomatis. Profil release dioptimalkan untuk ukuran (`Cargo.toml`): `opt-level = "z"`, `lto = "fat"`, `codegen-units = 1`, `panic = "abort"`, `strip = true`.

:::note Toolchain Rust Nightly
CI menggunakan Rust **nightly** dengan `edition = "2024"` dan komponen `rust-src`. Dependensi Kala eBPF dikelola sebagai git dependency (`Cargo.toml`); objek eBPF-nya telah dikompilasi sebelumnya sehingga Anda tidak memerlukan `bpf-linker` saat membangun Auriya.
:::

## Linting dan Format Kode

Repositori menerapkan aturan lint ketat (`Cargo.toml` `[lints]`):

```bash
cargo fmt --all -- --check                                  # cek pemformatan
cargo clippy --all-targets --all-features -- -D warnings    # lint tingkat deny
```

## Android

Dua modul Gradle menghasilkan APK (`android/app`, `android/service`; `minSdk = 30` / Android 11):

```bash
cd android
./gradlew build                                            # semua modul (debug + release)
./gradlew :app:assembleRelease :service:assembleRelease   # paket release
./gradlew test                                             # unit test JVM
```

## Situs Dokumentasi

Situs web wiki menggunakan **Bun** (`website/package.json`):

```bash
cd website
bun install
bun run start     # development server lokal dengan hot-reload
bun run build     # static production build
```
