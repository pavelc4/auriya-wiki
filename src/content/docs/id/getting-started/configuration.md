---
title: "Konfigurasi"
---
:::tip Konfigurasi Semua Hal dari Aplikasi Manajer
**Anda tidak perlu mengedit file secara manual.** Aplikasi manajer Auriya dirancang untuk mengubah setiap setelan — baik perilaku global maupun override khusus per-game. Buka aplikasi, ubah pengaturan yang diinginkan, dan aplikasi akan menuliskan konfigurasi untuk Anda secara otomatis. Penjelasan file di bawah ini ditujukan untuk pemahaman teknis dan opsi fallback bagi pengguna mahir. Panduan memilih nilai yang optimal dapat dilihat di [Tuning performa](performance-tuning).
:::

Di balik layar, Auriya membaca dua file TOML di bawah direktori `/data/adb/.config/auriya/`:

| File Konfigurasi | Cakupan Pengaturan | Referensi Lengkap |
| --- | --- | --- |
| `settings.toml` | Nilai default **global** untuk daemon dan scheduler | [Referensi settings.toml](../reference/settings) |
| `gamelist.toml` | Whitelist dan override **per-aplikasi** | [Referensi gamelist.toml](../reference/gamelist) |

## Bagaimana Perubahan Diterapkan ke Daemon

- **Dari Aplikasi Manajer (Disarankan)** — Aplikasi menulis ke kedua file, dan untuk daftar game daemon juga menulis ulang file sebagai respons terhadap perintah IPC. Ini adalah alur utama yang didukung penuh.
- **Dari CLI (`auriyactl`)** — CLI dapat memodifikasi daftar game melalui perintah socket IPC (`add-game`, `remove-game`, `update-game`) dan memicu pemuatan ulang dengan `auriyactl reload`.
- **Edit Manual File Teks (Fallback)** — Anda dapat mengedit file langsung dengan teks editor, lalu menjalankan `auriyactl reload` (atau membiarkan watcher mendeteksinya).

## Dua Hal Penting Sebelum Mengubah Setelan

1. **Sebagian kunci berlaku live, sebagian besar saat startup.** Kunci `cpu.default_governor`, `daemon.default_mode`, dan `daemon.check_interval_ms` langsung dibaca ulang saat Anda mengubah `settings.toml`; sedangkan blok FAS (`[fas]`, `[dynamic_governor]`, `[modes.*]`) dibaca satu kali saat daemon dibuat dan memerlukan restart daemon (`auriyactl restart`) untuk tuning ulang. Rincian per-kunci ada di [referensi settings](../reference/settings#referensi-kunci-demi-kunci).
2. **`fas.default_mode` menentukan tabel `[modes.*]` yang aktif.** Hanya mode yang dinamai oleh field ini yang mengontrol nilai margin dan termal FAS; blok mode lainnya tidak aktif hingga dipilih.

## Langkah Selanjutnya

[Tuning performa](performance-tuning) · [Referensi settings.toml](../reference/settings) · [Referensi gamelist.toml](../reference/gamelist) · [Penjadwal profil](../internals/profile-scheduler).
