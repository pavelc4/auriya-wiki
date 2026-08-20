---
title: "Tuning Performa"
---
Panduan praktis untuk memilih setelan performa terbaik sesuai kebutuhan Anda. Untuk spesifikasi mendalam mengenai tipe data, nilai default, dan perilaku internal daemon, lihat [referensi settings](../reference/settings) dan [referensi gamelist](../reference/gamelist).

:::tip Gunakan Aplikasi Manajer
**Seluruh pengaturan pada halaman ini dapat dikonfigurasi melalui aplikasi manajer Auriya.** Anda tidak perlu membuka terminal atau mengedit file secara manual.
:::

## Dua Tingkatan Konfigurasi

| Tingkatan | Mengatur | Lokasi Pengeditan di Aplikasi |
| --- | --- | --- |
| **Global** (`settings.toml`) | Default daemon, perilaku FAS, batas termal | Layar Settings / Konfigurasi |
| **Per-Game** (`gamelist.toml`) | Governor CPU, target FPS, refresh rate, mode profil, batas frekuensi | Entri masing-masing game di layar Games |

Override per-game memiliki prioritas tertinggi saat game tersebut aktif di latar depan (foreground); nilai global berlaku untuk kondisi lainnya.

## Frame-Aware Scheduling (FAS)

FAS mengamati timing frame secara real-time melalui eBPF Kala dan secara dinamis menyesuaikan frekuensi CPU/GPU untuk mempertahankan target FPS dengan konsumsi daya seefisien mungkin. FAS hanya berjalan untuk **game yang terdaftar di whitelist** dan saat probe eBPF tersedia (lihat [Deteksi FPS](../internals/fps-detection) dan [Probe frame eBPF Kala](../internals/kala-research)).

### Mode FAS (Parameter `margin`)

Perilaku FAS ditentukan oleh **mode**. Setiap mode memiliki nilai `margin` (headroom FPS) ditambah `thermal_threshold`. `fas.default_mode` menentukan mode mana yang aktif. **Margin lebih kecil = lebih agresif** (menaikkan clock lebih cepat agar FPS stabil di target); **margin lebih besar = lebih tenang** (mengizinkan penurunan sedikit di bawah target untuk menghemat baterai/suhu).

| Mode | `margin` | `thermal_threshold` | Karakteristik Performa |
| --- | --- | --- | --- |
| `powersave` | 5.0 | 80 °C | Paling hemat daya & dingin; mentoleransi FPS turun di bawah target |
| `balance` | 2.0 | 90 °C | **Default** — FPS stabil dengan suhu terkendali |
| `performance` | 1.0 | 95 °C | Mengejar target FPS secara ketat |
| `fast` | 0.0 | 95 °C | Margin nol — responsivitas frame maksimal |

Nilai bawaan ini selaras dengan preset upstream [fas-rs](https://github.com/shadow3aaa/fas-rs) yang menjadi dasar adaptasi pengontrol FAS Auriya.

### Rekomendasi Pengaturan Sesuai Kebutuhan

| Tujuan Anda | `fas.default_mode` | Catatan |
| --- | --- | --- |
| Penggunaan Harian Seimbang | `balance` | Biarkan seluruh pengaturan pada nilai default. |
| Kelancaran Maksimal (Game Kompetitif) | `performance` | Frame pacing lebih ketat; suhu dan baterai sedikit lebih tinggi. |
| Latensi Terendah | `fast` | Hanya jika pendinginan perangkat Anda mencukupi (batas suhu 95 °C). |
| Sesi Bermain Lama / Baterai Hemat | `powersave` | Menerima sedikit penurunan FPS agar suhu tetap dingin. |

:::note Perubahan Tuning FAS Berlaku Saat Restart Daemon
Perubahan pada `[fas]`, `[dynamic_governor]`, dan `[modes.*]` dibaca saat startup daemon. Setelah mengubahnya, lakukan restart daemon (melalui aplikasi atau `auriyactl restart`). Kunci `cpu.default_governor` dan `daemon.default_mode` berlaku secara live tanpa restart.
:::

## Tuning Khusus Per-Game

Pada layar Games, setiap game yang terdaftar di whitelist dapat dikonfigurasi secara mandiri:

| Field | Fungsi | Contoh Nilai Umum |
| --- | --- | --- |
| `target_fps` | Target FPS untuk FAS; nilai tunggal (`120`) atau array langkah (`[60,90,120]`) | Batas FPS game, misal `120` |
| `cpu_governor` | Governor CPU saat game ini berjalan | `performance` atau `walt` |
| `mode` | Profil statis: `powersave` / `balance` / `performance` / `fast` | `performance` atau `fast` untuk game berat |
| `refresh_rate` | Target refresh rate layar (Hz) | Samakan dengan `target_fps` |
| `ceiling` | Batas atas frekuensi (Low/Balance) | Biarkan default kecuali throttling |
| `enable_dnd` | Mode Jangan Ganggu saat bermain | `true` untuk fokus bermain |

**Rekomendasi awal untuk game berat:** `mode = performance` (atau `fast`), `target_fps` = batas frame game (misal `120`), `refresh_rate` = `120`, `cpu_governor = performance`. Jika perangkat terasa terlalu panas, ubah ke `balance`.

Format array pada `target_fps` (`[60, 90, 120]`) memungkinkan FAS menyesuaikan target secara adaptif saat game berganti frame rate antara menu lobi dan saat pertandingan.

## Profil Mode dan Tuning FAS

- **Mode Profil** — `powersave` / `balance` / `performance` / `fast` (4 mode). Mengatur governor CPU, mode performa GPU, dan tweak kernel. Dipilih per-game via `mode`, atau secara global via `daemon.default_mode`.
- **Mode Tuning FAS** — `powersave` / `balance` / `performance` / `fast` (4 mode). Merupakan preset `margin` + `thermal_threshold` untuk algoritma controller FAS.

Mode profil menentukan baseline sistem, sedangkan preset tuning FAS mengatur seberapa agresif algoritma mengejar target frame di atas baseline tersebut.
