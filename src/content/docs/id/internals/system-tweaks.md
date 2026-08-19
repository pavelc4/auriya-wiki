---
title: "Tweak Sistem"
---
Lapisan tweak adalah tempat di mana daemon berinteraksi langsung dengan perangkat: penulisan terproteksi ke `/proc` dan `/sys`, ditambah sejumlah tindakan framework yang dialirkan melalui companion Android. Seluruh operasi di sini bersifat **best-effort dan bergantung pada perangkat** — node yang tidak ada akan dilewati dengan aman tanpa menyebabkan error fatal.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke commit Auriya [`10fe7c6`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6), [`src/core/tweaks/`](https://github.com/pavelc4/auriya/tree/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/tweaks) dan [`src/core/cmd_writer/mod.rs`](https://github.com/pavelc4/auriya/blob/10fe7c6b56474a00513fec34ebac1376b30e95e6/src/core/cmd_writer/mod.rs).
:::

## Peta Modul

`src/core/tweaks/` (`tweaks/mod.rs`) membagi modul berdasarkan fungsinya:

| Modul | Tanggung Jawab |
| --- | --- |
| `paths.rs` | Memindai dan **menyimpan cache** jalur sysfs (governor CPU, online status, Snapdragon KGSL). |
| `cpu.rs` | Governor, CPU boost, online core, dan afinitas per-core. |
| `gpu.rs` | Mode performa/seimbang GPU. |
| `sched.rs` | Parameter scheduler kernel. |
| `memory.rs` | Manajemen memori / swappiness / pembersihan cache (drop caches). |
| `storage.rs` | Parameter Block-I/O penyimpanan. |
| `touchpanel.rs` | Mode game panel sentuh (touchscreen). |
| `ceiling.rs` | Pengontrol batas atas frekuensi CPU/GPU (Low/Balance). |
| `init.rs` | Tweak umum satu kali yang diterapkan bersama profil Performance. |
| `vendor/` (`detect.rs`, `mtk.rs`, `snapdragon.rs`) | Deteksi SoC + hook khusus vendor. |
| `vendor_lock.rs` | Mengunci node perfmgr vendor agar service bawaan tidak menimpa nilai Auriya. |

Daftar perubahan yang dipicu oleh setiap profil dapat dilihat di [Ringkasan arsitektur → Perubahan statis setiap profil](../architecture/overview#perubahan-yang-dilakukan-oleh-setiap-profil-statis).

## Deteksi dan Caching Jalur (Path Caching)

Tata letak sysfs bervariasi pada setiap perangkat Android, sehingga jalur dipindai **satu kali** dan disimpan dalam memori menggunakan `OnceLock`. `CpuPaths::scan` memeriksa node governor `cpu0..15` dan `policy0..7` serta `cpu1..15/online`, hanya menyimpan jalur yang benar-benar ada (`paths.rs`, `cpu_paths()`). Fungsi `set_governor_cached` kemudian menulis ke seluruh node governor yang tersimpan:

```rust
pub fn set_governor_cached(governor: &str) {
    let paths = cpu_paths();
    for path in &paths.governors_cpu    { let _ = std::fs::write(path, governor); }
    for path in &paths.governors_policy { let _ = std::fs::write(path, governor); }
}
```

Pola yang sama digunakan untuk menyimpan cache jalur Snapdragon KGSL/memlat **beserta nilai aslinya** agar dapat dipulihkan kembali saat keluar dari game (`SnapdragonPaths::scan`, `paths.rs`).

## Penulisan Terproteksi Best-Effort

Prinsip utama yang diterapkan (misalnya pada `init.rs`): periksa keberadaan node, tulis nilainya, dan abaikan kegagalan. Node yang tidak ditemukan dilewati secara aman agar kompatibilitas lintas kernel tetap terjaga:

```rust
// menonaktifkan kernel panic (hanya pada node yang ada)
for (path, value) in [
    ("/proc/sys/kernel/panic", "0"),
    ("/proc/sys/kernel/panic_on_oops", "0"),
    ("/proc/sys/kernel/panic_on_warn", "0"),
    ("/proc/sys/kernel/softlockup_panic", "0"),
] {
    if Path::new(path).exists() { fs::write(path, value)?; }
}
```

`apply_general_tweaks` juga mengatur parameter block-I/O per `/sys/block/*/queue` (`iostats=0`, `add_random=0`, `read_ahead_kb=32`, `nr_requests=32`), memilih algoritma TCP congestion control terbaik yang tersedia (`bbr3 → bbr2 → bbrplus → bbr → westwood → cubic`), menerapkan parameter memori virtual/scheduler, serta menonaktifkan modul "assist" bawaan vendor.

## Aksi Melalui Android — `CmdWriter`

Dua keputusan memerlukan API framework Android (`NotificationManager` untuk DnD dan `DisplayManager` untuk refresh rate). Daemon menserialisasikan perintah ini ke file kecil yang dipantau oleh companion service (`cmd_writer/mod.rs`):

- File: `/data/adb/.config/auriya/auriya_cmd` (`CMD_FILE`).
- Format teks (sesuai `CmdFormat.kt` milik companion):

  ```text
  seq 42
  dnd 1              # 0 = Normal/All, 1 = Priority
  refresh_rate 90    # Hz; 0 berarti "kembalikan ke default"
  ```

- **Pancaran Ulang Penuh (Stateful Re-emit)**: Writer selalu mengingat status terakhir dari seluruh field dan menulis ulang **seluruh** status pada setiap penulisan (`CmdWriter::write`).
- **Pengiriman Atomik**: Ditulis ke `.auriya_cmd.tmp` lalu di-`rename` agar watcher inotify companion hanya membaca payload yang utuh.

:::note Fallback Saat Companion Tidak Aktif
Jika companion mati, permintaan refresh rate dan DnD beralih ke perintah `settings put` Android langsung dari daemon (lihat [Ringkasan arsitektur → Jalur kontrol dan status](../architecture/overview#jalur-kontrol-dan-status)).
:::

## Deteksi SoC

Hook vendor mendeteksi chipset perangkat dan menyimpannya di `OnceLock` (`vendor/detect.rs`, `detect_soc`). Pengecekan memeriksa awalan `ro.board.platform` (`mt`/`k6` → MediaTek; `sm`/`sdm`/`msm`/`apq` → Snapdragon; `exynos`; `ud710`/`ums` → Unisoc; `gs` → Tensor), lalu substring `ro.hardware`, dan probe sistem file (`/proc/ppm` → MediaTek, `/sys/class/kgsl/kgsl-3d0` → Snapdragon).

## Penguncian Vendor (Vendor Lock)

Pada banyak perangkat, service bawaan vendor (seperti "perfmgr" atau game turbo) terus-menerus menimpa setelan CPU/GPU yang diatur oleh Auriya dalam hitungan milidetik. `VendorLock` menetralkan hal ini dengan mengunci sakelar vendor secara **read-only melalui bind mount** (`vendor_lock.rs`, `lock_all`):

Untuk setiap jalur yang ada di `VENDOR_PATHS`: menyimpan nilai saat ini, menulis nilai nonaktif (`0` atau `1`), mengubah izin file (`chmod 0444`), lalu melakukan **bind-mount** file milik Auriya di atasnya (`MS_BIND | MS_REC`). Dengan demikian, bahkan proses root lain yang mencoba menulis hanya akan mengenai overlay tersebut. Fungsi `unlock_all` melepaskan unmount, memulihkan izin file, dan mengembalikan nilai aslinya.

Daftar jalur yang dikunci (`VENDOR_PATHS`):

```text
/sys/module/mtk_fpsgo/parameters/perfmgr_enable      → 0
/sys/module/perfmgr/parameters/perfmgr_enable        → 0
/sys/module/perfmgr_policy/parameters/perfmgr_enable → 0
/sys/module/perfmgr_mtk/parameters/perfmgr_enable    → 0
/sys/module/migt/parameters/glk_fbreak_enable        → 0
/sys/module/migt/parameters/glk_disable              → 1
/proc/game_opt/disable_cpufreq_limit                 → 1
```

Penguncian dilakukan saat memasuki sesi game dan dibuka kembali saat keluar (lihat [Penjadwal profil](profile-scheduler#memasuki-game-yang-ada-di-whitelist)).
