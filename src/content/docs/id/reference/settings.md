---
title: "Referensi settings.toml"
---
`settings.toml` adalah file konfigurasi **global** milik Auriya: nilai default di tingkat daemon yang berlaku terlepas dari aplikasi apa yang sedang aktif di latar depan. Konfigurasi khusus per-aplikasi dikelola di [`gamelist.toml`](gamelist).

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6). Tipe Rust yang mendefinisikan skema ini adalah [`src/core/config/settings.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/config/settings.rs). Di sisi Android: `android/shared/src/main/kotlin/dev/auriya/shared/config/TomlParser.kt`.
:::

## Lokasi dan Kepemilikan

| Properti | Nilai | Sumber Kode |
| --- | --- | --- |
| Jalur Terinstal | `/data/adb/.config/auriya/settings.toml` | `src/core/config/path.rs:5-9` (`settings_path()`) |
| Parameter Daemon | `auriya --settings <path>` | `module/service.sh` |
| Format Data | TOML | `Settings::load`, `settings.rs:96-103` |
| Ditulis Oleh | **Aplikasi Manajer** (Kotlin `TomlParser.serializeSettings`), `TomlParser.kt:109-134` | — |
| Dibaca Oleh | **Daemon Rust** saat startup dan saat terjadi perubahan file | `main.rs:11`, `src/daemon/run.rs:288-317` |

:::note Aplikasi Adalah Otoritas Konfigurasi
Hingga rilis ini, CLI (`auriyactl`) **tidak** memiliki perintah untuk mengedit `settings.toml`. File ini ditulis oleh aplikasi manajer dan dibaca ulang oleh daemon (sebagian kunci live, sebagian besar saat startup — lihat [Perilaku reload](#perilaku-reload-pemuatan-ulang)).
:::

## Contoh File Bawaan (Default)

```toml
[daemon]
log_level = "info"
check_interval_ms = 2000
default_mode = "balance"

[cpu]
default_governor = "schedutil"

[dnd]
default_enable = true

[fas]
enabled = true
default_mode = "balance"
thermal_threshold = 90.0
poll_interval_ms = 300
target_fps = 60

[dynamic_governor]
enabled = true
cv_threshold = 0.15
debounce_frames = 3

[modes.powersave]
margin = 5.0
thermal_threshold = 80.0

[modes.balance]
margin = 2.0
thermal_threshold = 90.0

[modes.performance]
margin = 1.0
thermal_threshold = 95.0

[modes.fast]
margin = 0.0
thermal_threshold = 95.0
```

## Bagaimana File Dimuat

`Settings::load` membaca file dan memanggil `toml::from_str` **tanpa** atribut `#[serde(deny_unknown_fields)]` (`settings.rs:6`).
1. **Kunci tidak dikenal diabaikan**: Kunci yang tidak dideklarasikan pada struct `Settings` dilewati tanpa error.
2. **Bagian tanpa nilai default serde wajib ada**: Jika bagian wajib tidak ditemukan, `toml::from_str` mengembalikan error dan daemon membatalkan startup demi keamanan.

### Bagian yang Wajib Ada

| Bagian | Wajib Saat Startup? | Alasan & Sumber |
| --- | :---: | --- |
| `[daemon]` | Opsional | Memiliki `#[serde(default)]` pada setiap kunci (`settings.rs:20-30`) |
| `[cpu]` | **Wajib** | Tidak ada serde default (`settings.rs:33-35`) |
| `[dnd]` | **Wajib** | Tidak ada serde default (`settings.rs:38-40`) |
| `[fas]` | **Wajib** | Tidak ada serde default (`settings.rs:43-49`) |
| `[dynamic_governor]` | Opsional | `#[serde(default)]` (`settings.rs:67-75`) |
| `[ceiling]` | Opsional | `#[serde(default)]` (`settings.rs:85-93`) |
| `[modes.*]` | **Wajib (≥1 tabel)** | `modes: HashMap` tidak memiliki serde default (`settings.rs:17`) |

## Referensi Kunci demi Kunci

### `[daemon]`

| Kunci | Tipe Data | Default | Keterangan & Makna |
| --- | --- | --- | --- |
| `log_level` | string | `"info"` | Arahan env-filter `tracing` saat **startup** (`error`/`warn`/`info`/`debug`/`trace`). Gunakan perintah IPC `SETLOG` untuk mengubah level secara live saat runtime. |
| `check_interval_ms` | integer (ms) | `2000` | Interval cadence loop tick dalam kondisi idle/normal di latar depan. |
| `default_mode` | string | `"balance"` | Profil performa default saat tidak ada game yang aktif di foreground (`fast`, `performance`, `balance`, `powersave`). |

### `[cpu]`

| Kunci | Tipe Data | Default | Keterangan & Makna |
| --- | --- | --- | --- |
| `default_governor` | string | tidak ada (**wajib**) | CPU governor yang diterapkan untuk profil Balance (`schedutil`, `walt`, dll.). |

### `[dnd]`

| Kunci | Tipe Data | Default | Keterangan & Makna |
| --- | --- | --- | --- |
| `default_enable` | bool | tidak ada (**wajib**) | Status default mode Do-Not-Disturb saat game baru ditambahkan melalui `ADD_GAME`. |

### `[fas]`

| Kunci | Tipe Data | Default | Keterangan & Makna |
| --- | --- | --- | --- |
| `enabled` | bool | tidak ada (**wajib**) | Sakelar utama untuk Frame-Aware Scheduling. |
| `default_mode` | string | tidak ada (**wajib**) | Memilih preset mode `[modes.*]` yang aktif untuk FAS. |
| `thermal_threshold` | float (°C) | tidak ada (**wajib**) | Batas suhu termal fallback untuk pemicu `Reduce` FAS. |
| `poll_interval_ms` | integer (ms) | `100` | Batas waktu polling frame eBPF (dibatasi pada rentang `[1, 500]` ms). |
| `target_fps` | integer | `60` | Target global FAS saat game tidak memiliki target FPS per-game. |

### `[dynamic_governor]`

| Kunci | Tipe Data | Default | Keterangan & Makna |
| --- | --- | --- | --- |
| `enabled` | bool | `true` | Mengaktifkan klasifikasi bottleneck dinamis (GPU vs CPU). |
| `cv_threshold` | float | `0.15` | Ambang koefisien variasi untuk memisahkan beban GPU dan CPU. |
| `debounce_frames` | integer | `3` | Jumlah frame stabil yang diperlukan sebelum beralih kelas bottleneck. |

### `[modes.*]`

Setiap tabel mendefinisikan konfigurasi mode FAS (`powersave`, `balance`, `performance`, `fast`):

| Kunci | Tipe Data | Keterangan |
| --- | --- | --- |
| `margin` | float (fps) | Headroom FPS yang dikurangi dari target untuk mode aktif. `fast` menggunakan `margin = 0.0`. Format per-mode ini diadopsi dari [fas-rs](https://github.com/shadow3aaa/fas-rs). |
| `thermal_threshold` | float (°C) | Batas suhu termal spesifik untuk mode tersebut; di atas suhu ini, FAS memaksa `Reduce`. |

## Perilaku Reload (Pemuatan Ulang)

| Kunci | Dimuat Ulang Secara Live? | Efek yang Terjadi |
| --- | :---: | --- |
| `cpu.default_governor` | Ya | Memperbarui `balance_governor`; langsung diterapkan jika profil aktif adalah Balance. |
| `daemon.default_mode` | Ya | Memperbarui profil fallback untuk tick berikutnya. |
| `daemon.check_interval_ms` | Ya | Memperbarui interval waktu tidur loop tick berikutnya. |
| `[fas]` / `[dynamic_governor]` / `[modes.*]` | Ya | Memperbarui parameter tuning `FasController` secara langsung via `set_tuning`. |
| Lainnya | Tidak | Diterapkan hanya saat startup daemon. |

## Sinkronisasi Skema (Rust ↔ Aplikasi)

`TomlParser.kt` di aplikasi Android menguraikan dan menuliskan kembali seluruh kunci di atas. Menambahkan atau menghapus kunci konfigurasi harus dilakukan di **kedua sisi** (struct Rust + model Kotlin + default `settings.toml`), agar setelan tidak hilang atau diabaikan.
