<p align="center">
<img src="https://img.shields.io/badge/Astro-5.x-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro">
<img src="https://img.shields.io/badge/Starlight-0.32-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Starlight">
<img src="https://img.shields.io/badge/Bun-runtime-FCD34D?style=for-the-badge&logo=bun&logoColor=black" alt="Bun">
<img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages">
<a href="https://github.com/pavelc4/auriya"><img src="https://img.shields.io/badge/Auriya-Core%20Repo-blue?style=for-the-badge&logo=github&logoColor=white" alt="Auriya Core"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/GPLv3-white?style=for-the-badge&logo=gnu&logoColor=white&label=License&labelColor=222" alt="License"></a>
</p>

## About Auriya Wiki

**Auriya Wiki** is the official technical documentation website for the [Auriya](https://github.com/pavelc4/auriya) Magisk/KernelSU/APatch module. Built with **Astro + Starlight** and **Bun**, featuring full native multi-language support (English & Bahasa Indonesia), Pagefind local search, and zero-JS client delivery.

## Quick Start

```bash
# Install dependencies
bun install

# Run local development server
bun run dev
```

Opens the documentation at `http://localhost:3000`.

## Building for Production

```bash
bun run build
```

Generates optimized static HTML in `dist/`.

## Deploying to Cloudflare Pages

```bash
# Direct deployment via Wrangler CLI
bun run deploy
```

## Documentation Sections

| Section | Description |
|---------|-------------|
| **Getting Started** | Installation, requirements, first run, configuration |
| **Architecture** | System design, components, data flow, lifecycle |
| **Internals** | FPS detection, IPC, game detection, scheduler, system tweaks |
| **Reference** | Commands (`auriyactl`), settings TOML, filesystem |
| **Development** | Build process, CI/CD, contributing, debugging |

## Resources

- [Main Repository](https://github.com/pavelc4/auriya) — Auriya Rust daemon & Android manager app
- [Releases](https://github.com/pavelc4/auriya/releases) — Download latest module ZIP

## License

Auriya Wiki is open-sourced software licensed under the [GNU General Public License v3.0](LICENSE).
