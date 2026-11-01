---
title: "Tweak Sistem"
---
Lapisan tweak adalah tempat di mana daemon berinteraksi langsung dengan perangkat: penulisan terproteksi ke `/proc` dan `/sys`, ditambah tindakan framework yang dieksekusi langsung ke sistem Android melalui Native Binder IPC. Seluruh operasi di sini bersifat **best-effort dan bergantung pada perangkat** — node yang tidak ada akan dilewati dengan aman tanpa menyebabkan error fatal.

:::info Diverifikasi langsung terhadap kode sumber
Dilacak ke Auriya v2.2.0. File terkait:
- [`src/platform/`](file:///home/sineva/prjkt/rust/auriya/src/platform/) (Adapter subsistem perangkat keras dan kernel)
- [`src/platform/binder/actuators.rs`](file:///home/sineva/prjkt/rust/auriya/src/platform/binder/actuators.rs) (Aktuator Native Binder IPC)
- [`src/core/profile/apply.rs`](file:///home/sineva/prjkt/rust/auriya/src/core/profile/apply.rs) (Mesin eksekusi profil)
:::

## Peta Modul

Adapter perangkat keras berada di dalam `src/platform/`:

| Modul | Tanggung Jawab |
| --- | --- |
| `cpu/` (`governor.rs`, `ceiling.rs`, `topology.rs`) | Governor CPU, batas frekuensi (ceiling), boost, dan deteksi topologi core. |
| `gpu/` (`adreno.rs`, `devfreq.rs`) | Mode performa/seimbang GPU Adreno KGSL dan devfreq umum. |
| `thermal/` (`zones.rs`, `sconfig.rs`) | Pemantauan sensor termal multi-SoC dan kontrol mode thermal Xiaomi sconfig. |
| `vendor/` (`detect.rs`, `snapdragon.rs`, `mtk.rs`) | Deteksi SoC dinamis dan kait optimasi khusus vendor. |
| `common/` (`init.rs`, `memory.rs`, `sched.rs`, `storage.rs`, `touchpanel.rs`) | Tweak umum OS Android (block-I/O, swappiness/memori, scheduler, panel sentuh). |
| `binder/` (`actuators.rs`, `client.rs`, `observer.rs`) | Klien RPC Native Binder, aktuator (DnD, refresh rate, lock Wi-Fi), dan observer proses. |

Daftar perubahan yang dipicu oleh setiap profil dapat dilihat di [Ringkasan arsitektur → Perubahan statis setiap profil](/id/architecture/overview/#perubahan-yang-dilakukan-oleh-setiap-profil-statis).

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

## Aksi Melalui Android — Aktuator Native Binder

Pengaturan sistem di tingkat framework tidak dapat diubah hanya melalui node `/sys` atau `/proc` karena dikelola langsung oleh service sistem Android (`notification`, `display`, `wifi`, `activity_task`). Auriya berinteraksi langsung dengan service ini via **Native Binder IPC** (`src/platform/binder/actuators.rs`), mengeliminasi service perantara dan penulisan file disk:

- **Do Not Disturb (DnD)**: Menjalankan RPC Binder `INotificationManager.setInterruptionFilter` (`1` = `INTERRUPTION_FILTER_ALL` untuk memulihkan notifikasi normal; `2` = `INTERRUPTION_FILTER_PRIORITY` saat bermain game).
- **Refresh Rate**: Menjalankan konfigurasi display `IDisplayManager` via Binder RPC, dengan fallback otomatis ke perintah `settings put system min_refresh_rate` / `peak_refresh_rate`.
- **Lock Wi-Fi Latensi Rendah**: Memanggil `IWifiManager.acquireWifiLock` dengan mode `WIFI_MODE_FULL_LOW_LATENCY` (`4`) saat sesi game aktif, mencegah power-saving throttling dan packet coalescing pada Wi-Fi agar ping stabil.
- **Deteksi Jendela Mengambang (Floating Window)**: Mengueri `IActivityTaskManager.getAllRootTaskInfos` untuk mendeteksi apakah game yang aktif berjalan dalam mode freeform atau picture-in-picture, membatasi target frame ke 30 FPS untuk menghemat daya.

Seluruh panggilan RPC Binder berjalan langsung di dalam memori tanpa penulisan disk, menghasilkan kecepatan eksekusi sub-milidetik.

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

Penguncian dilakukan saat memasuki sesi game dan dibuka kembali saat keluar (lihat [Penjadwal profil](/id/internals/profile-scheduler/#memasuki-game-yang-ada-di-whitelist)).
