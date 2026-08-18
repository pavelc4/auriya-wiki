# Panduan Kontribusi

Terima kasih atas minat Anda berkontribusi pada pengembangan Auriya! Kami menyambut segala bentuk kontribusi — mulai dari perbaikan bug, penambahan fitur baru, perbaikan dokumentasi, hingga penambahan profil game.

## Cara Berkontribusi {#how-to-contribute}

1. **Fork & Branch**: Fork repositori [Auriya](https://github.com/pavelc4/auriya) dan buat branch baru:
   ```bash
   git checkout -b feat/fitur-baru
   ```
2. **Tulis Perubahan**: Lakukan perubahan kode atau dokumentasi dengan rapi.
3. **Validasi**: Pastikan kode dapat dikompilasi dan lolos pengujian linter serta unit test.
4. **Kirim Pull Request**: Buka Pull Request di GitHub dengan penjelasan singkat mengenai perubahan yang dibuat.

## Validasi Kode Sebelum Kirim {#validate-before-submitting}

Jalankan pengujian lokal sesuai komponen yang Anda ubah:

```bash
# Daemon Rust & CLI
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test

# Aplikasi Android & Companion
cd android && ./gradlew test
```

## Standar Kode & Format Commit {#coding-conventions}

- **Rust**: Mengikuti format standar `rustfmt` (indentasi 4 spasi), `snake_case` untuk fungsi/modul, `CamelCase` untuk struct/enum.
- **Kotlin**: Indentasi 4 spasi, `PascalCase` untuk composable/class, `camelCase` untuk fungsi/variabel.
- **Pesan Commit**: Gunakan pesan commit yang jelas dan deskriptif (disarankan format Conventional Commits: `feat(daemon): ...`, `fix(app): ...`, `docs: ...`).

## Keamanan & Privasi {#security-and-privacy}

Jangan pernah menyertakan signing key pribadi, token autentikasi, credential, atau path privat perangkat ke dalam commit.
