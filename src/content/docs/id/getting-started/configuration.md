---
title: "Konfigurasi"
---
:::tip Konfigurasi Semua Hal dari Aplikasi Manajer
**Anda tidak perlu mengedit file secara manual.** Aplikasi manajer Auriya dirancang untuk mengubah setiap setelan — baik perilaku global maupun override khusus per-game. Buka aplikasi, ubah pengaturan yang diinginkan, dan aplikasi akan menuliskan konfigurasi untuk Anda secara otomatis. Penjelasan file di bawah ini ditujukan untuk pemahaman teknis dan opsi fallback bagi pengguna mahir. Panduan memilih nilai yang optimal dapat dilihat di [Tuning performa](/id/getting-started/performance-tuning/).
:::

Di balik layar, Auriya membaca dua file TOML di bawah direktori `/data/adb/.config/auriya/`:

| File Konfigurasi | Cakupan Pengaturan | Referensi Lengkap |
| --- | --- | --- |
| `settings.toml` | Nilai default **global** untuk daemon dan scheduler | [Referensi settings.toml](/id/reference/settings/) |
| `gamelist.toml` | Whitelist dan override **per-aplikasi** | [Referensi gamelist.toml](/id/reference/gamelist/) |

## Dynamic Reload & Directory Watcher

Auriya dilengkapi dengan **Inotify Directory Watcher** background berbasis thread khusus (`auriya-config-watcher`) yang sangat efisien untuk memantau direktori `/data/adb/.config/auriya/`:

- **Deteksi File Atomik** — Mendeteksi event `Modify` standar maupun event `Create` hasil penamaan ulang atomik (*write-to-temp-then-rename*) yang sering digunakan oleh text editor dan manajer Android.
- **Muat Ulang Pengaturan Instan (Settings Reload)** — Modifikasi pada `settings.toml` langsung memicu `daemon.reload_settings()` dan *scheduler tick* seketika. Parameter dinamis seperti `cpu.default_governor`, `daemon.default_mode`, dan `daemon.check_interval_ms` langsung aktif tanpa perlu merestart daemon.
- **Pembaruan Daftar Game yang Resilien** — Saat `gamelist.toml` diperbarui, watcher memuat konfigurasi baru ke dalam memori bersama atomik (`Arc<RwLock<Arc<GameList>>>`) dengan mekanisme *retry loop* otomatis (hingga 3 percobaan dengan backoff) untuk mencegah pembacaan data yang belum selesai ditulis, memperbarui whitelist proses game yang aktif, dan langsung membangunkan siklus penjadwalan.

## Bagaimana Perubahan Diterapkan ke Daemon

- **Dari Aplikasi Manajer (Disarankan)** — Aplikasi menulis ke kedua file, dan untuk daftar game daemon juga menulis ulang file sebagai respons terhadap perintah IPC. Directory watcher mendeteksi perubahan ini secara instan.
- **Dari CLI (`auriyactl`)** — CLI dapat memodifikasi daftar game melalui perintah socket IPC (`add-game`, `remove-game`, `update-game`) dan memicu pemuatan ulang dengan `auriyactl reload`.
- **Edit Manual File Teks (Fallback)** — Anda dapat mengedit file langsung dengan teks editor, lalu menjalankan `auriyactl reload` (atau membiarkan watcher mendeteksinya secara live).

## Dua Hal Penting Sebelum Mengubah Setelan

1. **Pembaruan Konfigurasi Secara Live.** Kunci `cpu.default_governor`, `daemon.default_mode`, `daemon.check_interval_ms`, serta seluruh blok FAS (`[fas]`, `[dynamic_governor]`, `[modes.*]`) langsung dibaca ulang saat `settings.toml` berubah dan di-update realtime via `set_tuning`. Directory watcher kini aman menangani penulisan atomic write.
2. **`fas.default_mode` menentukan tabel `[modes.*]` yang aktif.** Hanya mode yang dinamai oleh field ini yang mengontrol nilai margin dan termal FAS; blok mode lainnya tidak aktif hingga dipilih.

## Langkah Selanjutnya

[Tuning performa](/id/getting-started/performance-tuning/) · [Referensi settings.toml](/id/reference/settings/) · [Referensi gamelist.toml](/id/reference/gamelist/) · [Penjadwal profil](/id/internals/profile-scheduler/).
