---
title: "Debugging & Pemecahan Masalah"
---
Panduan diagnostik perbatasan (boundary-first) dan petunjuk pelaporan masalah untuk Auriya di perangkat Android fisik. Arsitektur modern Auriya menjangkau empat perbatasan:
1. **Aplikasi Manager Android**: Antarmuka Jetpack Compose dan overlay HUD mengambang.
2. **Unix Domain Socket**: Saluran kontrol IPC lokal di `/dev/socket/auriya.sock`.
3. **Native Binder IPC**: Panggilan RPC langsung ke framework Android (`IActivityManager`, `IPowerManager`, `IDisplayManager`, `IWifiManager`, `INotificationManager`, `IWindowManager`).
4. **Adapter Kernel & Hardware**: Node sysfs, pembaca procfs, dan Kala kernel eBPF Uprobes.

Saat terjadi kendala, identifikasi perbatasannya terlebih dahulu, lalu gunakan panduan dan perintah diagnostik di bawah ini.

## Toolset Diagnostik Modern (`auriyactl`)

Auriya menyediakan serangkaian perintah CLI lengkap melalui `auriyactl` untuk memeriksa, memonitor, dan menganalisis status daemon secara langsung di terminal root perangkat.

### 1. Status Umum & Informasi Perangkat

#### `auriyactl status`
Menampilkan ringkasan status operasional daemon, PID, paket aplikasi yang aktif, profil performa yang diterapkan, dan target FPS:

```bash
auriyactl status
```

Contoh output:
```text
       Auriya Daemon Status     
  Daemon:      Running
  Enabled:     true
  Binder IPC:  OPERATIONAL
  Games:       1 configured
  FPS:         42.8 (sysfs)
  Log Level:   Info
```

Jika menghasilkan `Daemon: Not running`, berarti proses daemon gagal berjalan atau mengalami crash saat inisialisasi boot. Periksa file log di `/data/adb/auriya/daemon.log`.

#### `auriyactl info`
Menjalankan audit mendalam terhadap kapabilitas hardware, platform SoC, topologi cluster CPU, backend GPU devfreq/KGSL, kesiapan subsistem eBPF kernel, serta penggunaan memori RSS daemon:

```bash
auriyactl info
```

Contoh output:
```text
Hardware & Platform:
  Brand:          Xiaomi
  Codename:       marble
  Android:        17 (API 37)
  SoC Board:      SM7475 (qcom)
  CPU Topology:   8 cores (4 Little, 3 Mid, 1 Prime)
  GPU:            Adreno 725
  GPU Driver:     v@0863.1 (kgsl)
  Vulkan:         Supported (v1.1)
  Active Render:  OpenGL ES (GLES)
  Display:        120Hz (1080x2400) [Supported: 60Hz, 90Hz, 120Hz]
  Root Manager:   KernelSU
  SELinux:        Enforcing
  Kernel:         5.10.269-Chandelier-prjkt+ (aarch64)

Kernel eBPF Diagnostics:
  BPF Mount:      Mounted (/sys/fs/bpf)
  BPF Syscall:    Available (SYS_bpf)
  JIT Compiler:   Enabled (bpf_jit_enable = 1)
  Kala Probe:     Supported & Ready
  Active Engine:  sysfs DRM Fallback

Daemon Runtime:
  PID:            11783 (Running)
  Memory (RSS):   5.4 MB
  CPU Load:       19.0%
  Workers:        7
```
  BPF Syscall:    Available
  JIT Compiler:   Enabled
  Kala Probe:     Available
  Active Engine:  Kala eBPF

Daemon Runtime:
  PID:            14210 (Running)
  Memory (RSS):   5.4 MB
  CPU Load:       0.3%
  Workers:        2
```

### 2. Manajemen Log & Streaming Langsung

Auriya menggunakan logger file langsung berkinerja tinggi (zero-allocation) dengan format timestamp presisi boottime dmesg tanpa perantara subshell.

#### Daftar File Log Utama

| Berkas Log | Lokasi | Keterangan |
| :--- | :--- | :--- |
| **Log Aktif Daemon** | `/data/adb/auriya/daemon.log` | Log runtime aktif dengan timestamp boottime kernel (`[ 1234.567890] [info] ...`). |
| **Log Rotasi Daemon** | `/data/adb/auriya/daemon.log.old` | Segmen log sebelumnya yang otomatis dirotasi saat ukuran mencapai 2 MB. |
| **Log Restart** | `/data/adb/auriya/restart.log` | Output tangkapan saat proses restart dijalankan oleh `service.sh`. |
| **Log Sistem Android** | `logcat -s auriya` | Tag logcat sistem untuk proses bootup daemon dan hook instalasi modul. |

#### `auriyactl log`
Membaca, memantau secara langsung, atau membersihkan file log daemon langsung dari terminal:

```bash
# Menampilkan 30 baris log terakhir (default)
auriyactl log

# Menampilkan 100 baris log terakhir
auriyactl log -n 100

# Mengikuti aliran log secara live (mirip tail -f)
auriyactl log -f

# Mengosongkan file log daemon
auriyactl log --clear
```

#### Mengubah Level Log Saat Runtime (`auriyactl set-log`)
Ubah tingkat verbositas pencatatan log daemon tanpa perlu melakukan restart:

```bash
auriyactl set-log debug     # Pilihan: trace | debug | info | warn | error
```

`log_level` tidak dibaca ulang dari file konfigurasi TOML saat reload biasa; `set-log` adalah perintah IPC live untuk keperluan debugging mendalam.

### 3. Telemetri & Monitoring Real-Time

#### `auriyactl monitor`
Membuka dashboard interaktif langsung di terminal yang memantau frame rate, frame time, frekuensi dan beban cluster CPU, frekuensi GPU, temperatur baterai dan SoC, laju arus baterai, serta aplikasi yang sedang aktif:

```bash
# Dashboard interaktif in-place (refresh setiap 1000ms)
auriyactl monitor

# Menyesuaikan interval refresh (misal: 500ms)
auriyactl monitor -i 500

# Format 1 baris terus-menerus (cocok untuk pencatatan log atau non-TTY)
auriyactl monitor -1
```

#### `auriyactl stats`
Mengambil snapshot telemetri pada saat perintah dijalankan:

```bash
# Ringkasan teks yang mudah dibaca
auriyactl stats
```

Contoh output:
```text
Auriya Live Telemetry (Ctrl+C to quit):
  FPS:            2.0 FPS (1% low: 0.1, 0.1% low: 0.1, peak: 98, σ: 1575.68ms)
  CPU Load:       17%
  GPU Load:       1% (20 MHz)
  Temperature:    CPU: 40°C, Bat: 36°C
  Battery:        19% (-252 mA)
  Active App:     com.whatsapp (performance)
```

```bash
# Envelope API JSON mentah (ApiResponse<StatsSnapshot>)
auriyactl stats --json

# Streaming snapshot telemetri terus-menerus
auriyactl stats --stream --interval-ms 1000
```

### 4. Diagnostik Native Android Binder IPC

Auriya berkomunikasi langsung dengan framework Android melalui Native Binder IPC tanpa menjalankan proses helper Java di latar belakang.

#### `auriyactl binder probe`
Memeriksa status `servicemanager` Android dan memastikan konektivitas dengan seluruh layanan sistem terkait:

```bash
auriyactl binder probe
```

Contoh output:
```text
Native Android Binder Probe:
  Binder IPC Status:          Operational
  PowerManager.isInteractive: true
  Foreground App:             com.whatsapp (PID: 13087) [Fullscreen]
  Display Mode (Binder):      null (dynamic)
  Wi-Fi Low-Latency Lock:     Inactive
  Status Bar Lock:            Inactive (Unlocked)
  High Touch Polling Rate:    Supported (Ready)
  Battery Saver (Native):     Disabled
  Display Rotation:           Frozen (Locked)
  Animation Scales:           [1.0, 1.0, 1.0]
  Vibrator HAL Caps:          0x0027
  PowerHAL Sustained:         Supported
  PowerHAL Expensive:         Supported
  Service 'power                         ': Available
  Service 'notification                  ': Available
  Service 'activity                      ': Available
  Service 'activity_task                 ': Available
  Service 'display                       ': Available
  Service 'statusbar                     ': Available
  Service 'window                        ': Available
  Service 'wifi                          ': Available
  Service 'thermalservice                ': Available
  Service 'android.hardware.power.IPower/default': Available
  Service 'android.hardware.vibrator.IVibrator/default': Available
  Service 'vendor.lineage.touch.IHighTouchPollingRate/default': Available
```

#### `auriyactl binder test`
Menjalankan pengujian otomatis menyeluruh (self-test) terhadap seluruh aktuator Binder:

```bash
auriyactl binder test
```

Contoh output:
```text
Native Binder Hardware Test:
[1/13] Binder Servicemanager: PASS
[2/13] PowerManager.isInteractive (true): PASS
[3/13] Native Binder Foreground (com.whatsapp | PID: 13087 | fullscreen): PASS
[4/13] Testing DnD actuator (Priority)...
       zen_mode is 1 (expected: 1)
       Restoring DnD actuator (All)...
       zen_mode restored to 0 (expected: 0)
[5/13] Testing Display Refresh Rate actuator (120Hz)...
       Native Binder mode: Some(120.0)
       peak_refresh_rate is 120 (expected: 120.0)
       Restoring Display Refresh Rate (0Hz / dynamic)...
       Native Binder mode restored to None
       peak_refresh_rate restored to 120
[6/13] Testing Wi-Fi Low-Latency lock actuator...
       Acquire Wi-Fi Low-Latency result: Ok(true) (Active: true)
       Restoring Wi-Fi Low-Latency lock...
       Release Wi-Fi Low-Latency result: Ok(false) (Active: false)
[7/13] Testing Status Bar lock actuator...
       Lock Status Bar result: Ok(true) (Active: true)
       Restoring Status Bar lock...
       Unlock Status Bar result: Ok(false) (Active: false)
[8/13] Testing PowerHAL modes actuator...
       Set ExpensiveRendering=true: Ok(())
       Trigger Interaction boost: Ok(())
[9/13] Testing Vibrator HAL actuator...
       Vibrator HAL capabilities: Ok(39)
       Pulse vibrator (30ms): Ok(())
       Silence vibrator: Ok(())
[10/13] Testing WindowManager actuator...
        Freeze rotation: Ok(()) (is_frozen: Ok(true))
        Thaw rotation: Ok(())
        Animation scales: Ok([1.0, 1.0, 1.0])
[11/13] Testing Battery Saver actuator...
        Battery Saver active: Ok(false)
[12/13] Testing Native Toast actuator...
        Show toast result: Ok(true)
[13/13] Testing Direct Binder Broadcast actuator...
        Broadcast result: Ok(())

Native Binder self-test completed successfully (all 13 checks passed).
```

#### Perintah Manual Aktuator Binder
Menguji fungsionalitas aktuator hardware satu per satu:

```bash
# Mengatur mode Do Not Disturb
auriyactl binder dnd priority         # atau 'all'

# Mengatur override refresh rate layar (0 untuk kembali ke otomatis)
auriyactl binder rate 120
auriyactl binder rate 0

# Mengaktifkan/menonaktifkan Wi-Fi Low-Latency Lock (WIFI_MODE_FULL_LOW_LATENCY)
auriyactl binder wifi on
auriyactl binder wifi off
auriyactl binder wifi status

# Mengaktifkan boost laju sampling sentuhan (High Touch Polling Rate)
auriyactl binder touch on
auriyactl binder touch status

# Mengunci/membuka panel status bar notifikasi
auriyactl binder statusbar lock
auriyactl binder statusbar unlock
```

### 5. Pengujian Runtime & Simulasi

#### Simulasi Paket Game (`auriyactl inject`)
Menguji penjadwalan profil dan aturan game tanpa harus membuka game 3D yang berat:

```bash
# Masukkan nama paket game tiruan
auriyactl inject com.miHoYo.GenshinImpact

# Periksa apakah profil otomatis berpindah ke Performance
auriyactl status

# Hapus simulasi dan kembalikan ke sensor Binder langsung
auriyactl clear-inject
```

#### Perintah Kontrol Lainnya

```bash
auriyactl ping            # Memeriksa respons soket IPC ("PONG")
auriyactl get-pid         # Mengetahui PID proses daemon yang sedang berjalan
auriyactl get-fps         # Melihat FPS terukur dan target saat ini
auriyactl get-rates       # Menampilkan refresh rate layar yang didukung sistem
auriyactl reload          # Memuat ulang file settings.toml dan gamelist.toml
auriyactl restart         # Menghentikan daemon secara bersih (SIGTERM) dan menyalakan ulang
```

---

## Pemecahan Masalah per Perbatasan (Troubleshooting)

### 1. Daemon Tidak Berjalan / Crash Saat Boot

**Gejala**: `auriyactl status` menghasilkan `Daemon: Not running`, atau `auriyactl ping` gagal terkoneksi.

1. Buka dan periksa `/data/adb/auriya/daemon.log` dan `/data/adb/auriya/restart.log`.
2. Jalankan `logcat -s auriya` untuk melihat pesan crash awal kernel atau script instalasi.
3. Kemungkinan penyebab utama:
   - **Kerusakan Biner**: Checksum SHA256 biner tidak cocok saat instalasi. Flash ulang modul ZIP.
   - **Penolakan SELinux**: SELinux memblokir pembuatan file soket di `/dev/socket/auriya.sock`. Periksa log audit via `dmesg | grep -i avc`.
   - **Soket Usang**: Sisa berkas soket lama belum terhapus. Jalankan `auriyactl restart` untuk membersihkan dan memulai ulang.

### 2. Game Tidak Terdeteksi / Profil Tidak Berpindah

**Gejala**: Game sedang berjalan di layar, tetapi status Auriya tetap di `Powersave` atau `Balanced`.

1. Jalankan `auriyactl binder probe` untuk memeriksa bagian `Foreground App`. Jika bernilai `None`, periksa pesan peringatan `ProcessObserver` di `daemon.log`.
2. Pastikan paket game terdaftar di konfigurasi:
   ```bash
   auriyactl list-games
   ```
   Jika belum ada, tambahkan via `auriyactl add-game <nama_paket>`.
3. Ingat [urutan keputusan penjadwal](/id/internals/profile-scheduler/#urutan-pengambilan-keputusan):
   - Apakah layar dalam kondisi mati? (PowerManager Interactive = `false`).
   - Apakah mode Penghemat Baterai Android aktif? Penghemat baterai selalu memaksa profil `Powersave`.
4. Uji dengan simulasi: `auriyactl inject <nama_paket>`. Jika profil berhasil berubah saat inject, masalah hanya terletak pada sensor deteksi foreground.

### 3. FPS Selalu 0 atau Tidak Berubah

**Gejala**: Game berjalan lancar, namun FPS terbaca `0` atau `N/A`.

1. Jalankan `auriyactl info` dan periksa bagian **Kernel eBPF Diagnostics**:
   - Jika `BPF Mount` belum mounted, periksa keberadaan `/sys/fs/bpf`.
   - Jika `BPF Syscall` tidak tersedia, kernel perangkat tidak mengaktifkan `CONFIG_BPF_SYSCALL=y`.
   - Jika `Kala Probe` tidak aktif, periksa `daemon.log` untuk melihat apakah Kala gagal menemukan fungsi `android::Surface::queueBuffer` di `/system/lib64/libgui.so`.
2. Auriya secara otomatis menggunakan fallback sysfs jika eBPF tidak didukung kernel. Jika node sysfs terkait juga tidak disediakan oleh vendor, FPS tidak dapat dipantau.

### 4. Override Refresh Rate Layar / DND Gagal Berfungsi

**Gejala**: Membuka game tidak mengubah refresh rate ke nilai yang ditentukan di profil atau DND tidak menyala.

1. Jalankan `auriyactl binder probe` untuk memastikan status `Display Mode (Binder)` aktif.
2. Jalankan `auriyactl binder test` untuk melihat log eksekusi aktuator langkah demi langkah.
3. Jalankan `auriyactl get-rates` untuk memastikan refresh rate yang ditargetkan memang didukung oleh panel layar perangkat.
4. Pada ROM kustom OEM yang dimodifikasi berat (MIUI, HyperOS, ColorOS), framework display bawaan vendor terkadang mengabaikan panggilan Binder standar `IDisplayManager`.

---

## Panduan Pelaporan Masalah (Issue Reporting Guide)

Jika Anda menemukan bug, perilaku tidak terduga, atau ketidakcocokan perangkat/kernel, silakan laporkan masalah melalui [GitHub Issues Auriya](https://github.com/pavelc4/auriya/issues).

Saat membuat laporan issue, cantumkan model perangkat, versi kernel, versi Android, root manager yang digunakan beserta versinya (KernelSU, Magisk, atau APatch), versi Auriya, serta lampirkan cuplikan log dari `/data/adb/auriya/daemon.log`.

Anda dapat menyalin dan mengisi template berikut:

````markdown
### Ringkasan Masalah
[Jelaskan secara singkat dan jelas masalah atau bug yang terjadi]

### Informasi Perangkat & Sistem
- **Model Perangkat**: [contoh: Xiaomi POCO F5 (marble)]
- **Platform SoC / Board**: [contoh: Snapdragon 7+ Gen 2 (SM7475)]
- **Versi Android**: [contoh: Android 14 (API 34)]
- **ROM / OS**: [contoh: HyperOS 1.0.8.0.UMRMIXM / LineageOS 21]
- **Versi Kernel**: [contoh: Linux 5.10.198-android12-9-00045-g84e491295b92 aarch64]
- **Root Manager & Versi**: [contoh: KernelSU v0.9.5 / Magisk v27.0 / APatch v10763]
- **Versi Auriya**: [contoh: v2.2.0 (release)]

### Aplikasi / Game yang Terpengaruh
- **Nama Paket**: [contoh: com.miHoYo.GenshinImpact atau N/A jika masalah umum]
- **Profil yang Dikonfigurasi**: [contoh: Performance / Balanced]

### Langkah-langkah Mereproduksi Masalah
1. [Langkah pertama]
2. [Langkah kedua]
3. [Langkah ketiga]

### Perilaku yang Diharapkan
[Apa yang seharusnya terjadi]

### Perilaku yang Terjadi
[Apa yang sebenarnya terjadi, sertakan pesan error jika ada]

### Cuplikan Log Daemon (`/data/adb/auriya/daemon.log`)
[Tempelkan 50-100 baris terakhir dari /data/adb/auriya/daemon.log saat masalah berlangsung di sini]
````
