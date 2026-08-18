<p align="center">
<img src="https://img.shields.io/badge/Docusaurus-3.10.2-34CA40?style=for-the-badge&logo=docusaurus&logoColor=white" alt="Docusaurus">
<img src="https://img.shields.io/badge/Bun-runtime-FCD34D?style=for-the-badge&logo=bun&logoColor=black" alt="Bun">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<a href="https://github.com/pavelc4/auriya"><img src="https://img.shields.io/badge/Auriya-Core%20Repo-blue?style=for-the-badge&logo=github&logoColor=white" alt="Auriya Core"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/GPLv3-white?style=for-the-badge&logo=gnu&logoColor=white&label=License&labelColor=222" alt="License"></a>
</p>

## About Auriya Wiki

**Auriya Wiki** is the official technical documentation website for the [Auriya](https://github.com/pavelc4/auriya) Magisk/KernelSU/APatch module. Built with Docusaurus and Bun, featuring full multi-language support (English & Bahasa Indonesia).

## Quick Start

```bash
# Install dependencies
bun install

# Run preview server
bun run start
```
Opens the multi-locale documentation at `http://localhost:3000`.

## Building for Production

```bash
bun run build
```

## Documentation Sections

| Section | Description |
|---------|-------------|
| [Getting Started](https://pavelc4.github.io/auriya-wiki/docs/getting-started/installation) | Installation, requirements, first run, configuration |
| [Architecture](https://pavelc4.github.io/auriya-wiki/docs/architecture/overview) | System design, components, data flow, lifecycle |
| [Internals](https://pavelc4.github.io/auriya-wiki/docs/internals/fps-detection) | FPS detection, IPC, game detection, scheduler, system tweaks |
| [Reference](https://pavelc4.github.io/auriya-wiki/docs/reference/settings) | Commands (`auriyactl`), settings TOML, filesystem |
| [Development](https://pavelc4.github.io/auriya-wiki/docs/development/building) | Build process, CI/CD, contributing, debugging |

## Resources

- [Main Repository](https://github.com/pavelc4/auriya) — Auriya Rust daemon & Android manager app
- [Releases](https://github.com/pavelc4/auriya/releases) — Download latest module ZIP
- [Issues](https://github.com/pavelc4/auriya-wiki/issues) — Report documentation issues

## License

Auriya Wiki is open-sourced software licensed under the [GNU General Public License v3.0](LICENSE).
