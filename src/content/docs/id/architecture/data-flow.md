---
title: "Aliran Data"
---
Dua jenis aliran independen melintasi ketiga lapisan runtime yang sama: **perintah** (klien meminta perubahan status) dan **telemetri/status** (data observasi sistem dialirkan kembali). Keduanya harus dipahami secara terpisah — perintah bersifat permintaan (request), sedangkan telemetri adalah laporan (report) — dan kegagalan pada setiap batas antarmuka harus tetap terlihat oleh pemanggil.

## End-to-End: Seluruh Sistem Berjalan

Gambaran lengkap saat modul terpasang dan sesi game berjalan di latar depan — siapa berkomunikasi dengan siapa, melalui saluran apa, dengan jalur file/perintah nyata. Setiap panah mewakili salah satu dari empat saluran pada [tabel di bawah ini](#empat-saluran-komunikasi-secara-konkret).

```mermaid
flowchart TD
    app["Aplikasi Manajer (Compose) / auriyactl<br/><code>dev.auriya.app</code>"]
    sock["Unix Domain Socket<br/><code>/dev/socket/auriya.sock</code>"]
    daemon["Daemon Rust (auriya)<br/>Tokio Async Event Loop"]
    comp["Companion Service (AuriyaSysMon)<br/><code>app_process (root uid)</code>"]
    kernel["Antarmuka Kernel<br/><code>/proc</code> · <code>/sys</code>"]

    subgraph config_files ["File Konfigurasi & Status"]
        cfg[("settings.toml<br/>gamelist.toml")]
        status["system_status"]
        cmd["auriya_cmd"]
    end

    app -->|"menulis config (root)"| cfg
    cfg -.->|"dipantau oleh"| daemon
    app -->|"perintah IPC: STATUS, SET_PROFILE, GET_STATS"| sock
    sock <-->|"request / balasan JSON"| daemon

    comp -->|"menulis status Android"| status
    status -.->|"dipantau oleh"| daemon
    daemon -->|"menulis DnD & refresh rate"| cmd
    cmd -.->|"dipantau & dieksekusi via API Android"| comp

    daemon -->|"penulisan terproteksi: governor / ceiling / FAS"| kernel
    kernel -->|"pembacaan telemetri: frek / beban / suhu"| daemon
```

Aplikasi dan `auriyactl` berkomunikasi dengan daemon **secara langsung** melalui socket Unix untuk perintah dan status. Companion adalah partisipan yang *terpisah*: ia menyuplai status observasi Android ke daemon (`system_status`) dan mengeksekusi tindakan framework Android yang tidak dapat dijangkau langsung oleh daemon root (`auriya_cmd`) — lihat [Tweak sistem → CmdWriter](/id/internals/system-tweaks/#actions-routed-through-android--cmdwriter).

## Urutan Boot (Cold Start → Tick Pertama)

Alur yang terjadi sejak ponsel dinyalakan hingga daemon siap melayani permintaan klien, sesuai `module/service.sh` dan `src/daemon/run.rs` (rincian lengkap: [ringkasan arsitektur → alur eksekusi binary](/id/architecture/overview/#alur-eksekusi-binary)):

```mermaid
flowchart TD
    boot([Android boot_completed]) --> svc["service.sh: hentikan proses lama,<br/>hapus socket/status/lock kadaluarsa"]
    svc --> comp["app_process → jalankan Companion (AuriyaSysMon)"]
    comp --> cw["Companion menulis system_status awal"]
    cw --> wait{"system_status<br/>muncul ≤ 10s?"}
    wait -->|tidak| fail1["boot batal — daemon tidak dijalankan"]
    wait -->|ya| exec["exec auriya --settings … --gamelist …"]
    exec --> load{"muat settings.toml<br/>+ gamelist.toml"}
    load -->|error parsing| fail2["main return — daemon berhenti"]
    load -->|sukses| trace["inisialisasi tracing (log_level)"]
    trace --> ebpf["inisialisasi stream frame eBPF<br/>(atau fallback: FPS sysfs, FAS nonaktif)"]
    ebpf --> build["bangun Daemon: whitelist,<br/>FasController(FasTuning), ceiling, telemetri"]
    build --> bind["bind /dev/socket/auriya.sock<br/>+ spawn listener IPC"]
    bind --> watch["jalankan watcher: settings, gamelist,<br/>module-update, companion.lock"]
    watch --> tick0["jalankan satu tick instan"]
    tick0 --> loop([masuk ke adaptive event loop])
```

## Kondisi Steady-State: Satu Sesi Game Berjalan

Alur bolak-balik perintah dan telemetri selama game yang terdaftar di whitelist berjalan dan aplikasi memantau metrik:

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna / Game
    participant Comp as Companion (AuriyaSysMon)
    participant Daemon as Daemon Rust (tick loop)
    participant Kernel as Kernel (/proc, /sys)
    participant App as Aplikasi (UI Manajer ~1Hz)

    User->>Comp: Game masuk ke latar depan (foreground)
    Comp->>Daemon: Tulis system_status (paket, PID)
    Note over Daemon: Watcher aktif → tick instan<br/>Kunci vendor, terapkan profil, pasang eBPF
    Daemon->>Comp: Tulis auriya_cmd (DnD, refresh rate)
    Comp->>User: Eksekusi via API Framework Android

    loop Setiap Tick (~500ms sesi game aktif)
        Daemon->>Daemon: Ambil frame → keputusan penskalaan FAS
        Daemon->>Kernel: Tulis ScalingAction (frekuensi CPU/GPU)
        Daemon->>Daemon: Perbarui CurrentState (FPS, telemetri)
        App->>Daemon: GET_STATS (Unix socket)
        Daemon-->>App: JSON (FpsStats, suhu, baterai)
        App->>App: Render kartu telemetri & benchmark
    end

    User->>Comp: Game keluar dari latar depan
    Comp->>Daemon: Tulis system_status (home/launcher)
    Note over Daemon: Tick instan → bersihkan status game,<br/>pulihkan profil default, lepas eBPF
    App->>Daemon: GET_STATS
    Daemon-->>App: JSON (fps: null, standby)
```

Worker eBPF hanya memproses frame saat ada PID game yang terpasang, sehingga tidak membebani sistem di luar sesi game. `GET_STATS` dihitung berdasarkan permintaan — lihat [API Stats](/id/reference/stats-api/).

## Empat Saluran Komunikasi Secara Konkret

| Arah Aliran | Mekanisme | Payload / Data | Referensi Terkait |
| --- | --- | --- | --- |
| Klien → daemon | Socket Unix, teks berbaris baru | Perintah: `STATUS`, `SET_PROFILE`, `ADD_GAME`, `GET_STATS`, … | [Protokol IPC](/id/internals/ipc-protocol/) |
| Companion → daemon | File `system_status` (dipantau) | Aplikasi foreground/PID/UID, layar, penghemat baterai, Zen | di bawah ini |
| Daemon → companion | File `auriya_cmd` (dipantau) | Filter DnD, refresh rate | [Tweak sistem → CmdWriter](/id/internals/system-tweaks/#actions-routed-through-android--cmdwriter) |
| Daemon → kernel | Penulisan `/proc`, `/sys` | Governor, ceiling frekuensi, tweak sistem | [Tweak sistem](/id/internals/system-tweaks/) |

Struktur struct dan field yang tepat dari payload ini didokumentasikan di [Model data](/id/architecture/data-model/).

## File `system_status` — Companion → Daemon

Companion menulis `/data/adb/.config/auriya/system_status` setiap kali terjadi perubahan aplikasi foreground, status layar, mode penghemat baterai, atau mode Zen. Format datanya berbasis baris teks (`src/core/system_status/mod.rs:8-11`):

```text
focused_app <package> <pid> <uid>
screen_awake <0|1>
battery_saver <0|1>
zen_mode <0|1|2|3>
```

Watcher daemon memuat ulang file ini dan menggabungkannya ke snapshot `CurrentState` yang dibaca oleh klien IPC. Field bersifat opsional — penulisan parsial hanya memperbarui baris yang ada (`SystemStatus`, `mod.rs:27-56`). Daemon menggunakan `focused_app` + `focused_pid` untuk [deteksi game](/id/internals/game-detection/), serta `screen_awake` + `battery_saver` untuk memicu cabang hemat daya pada [penjadwal profil](/id/internals/profile-scheduler/#urutan-pengambilan-keputusan).

## Alur Loop Tick

Daemon menjalankan tick dengan interval yang adaptif (lihat [Ringkasan arsitektur → Event loop](/id/architecture/overview/#event-loop-dan-irama-eksekusi) untuk tabel event):

- **≈ 500 ms** saat sesi game tervalidasi aktif,
- **`daemon.check_interval_ms`** (default 2 detik) pada kondisi normal di latar depan,
- **10 detik** saat layar mati / mode penghemat baterai aktif.

Setiap tick membaca snapshot companion yang dicache, memproses cabang hemat daya terlebih dahulu, membaca paket/PID (atau override `INJECT`), lalu menjalankan FAS untuk game yang terdaftar atau menerapkan profil yang sesuai ([Penjadwal profil](/id/internals/profile-scheduler/)). Snapshot daftar game copy-on-write menghindari penahanan lock saat operasi asynchronous berlangsung. Tick juga dapat dipicu lebih cepat — di luar timer — oleh pembaruan status companion, perubahan konfigurasi, atau saat PID yang dilacak keluar ([deteksi game](/id/internals/game-detection/#pelacakan-keaktifan-dan-keluar-instan)).

## Visibilitas Kesalahan (Failure Visibility)

- Error IPC dikembalikan ke klien dalam format baris `ERR …` ([Protokol IPC → konvensi respons](/id/internals/ipc-protocol/#konvensi-respons)).
- Kegagalan penulisan kernel bersifat best-effort dan dicatat ke log, bukan error fatal ([Tweak sistem](/id/internals/system-tweaks/#penulisan-best-effort-terproteksi)).
- Companion yang mati dideteksi melalui `companion.lock`; pengaturan layar/DnD kemudian beralih ke fallback `settings put` Android ([ringkasan arsitektur](/id/architecture/overview/#jalur-kontrol-dan-status)).
