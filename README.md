<p align="center">
<img src="https://img.shields.io/badge/Docusaurus-3.10.2-34CA40?style=for-the-badge&logo=docusaurus&logoColor=white" alt="Docusaurus">
<img src="https://img.shields.io/badge/Bun-runtime-FCD34D?style=for-the-badge&logo=bun&logoColor=black" alt="Bun">
<img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<a href="LICENSE"><img src="https://img.shields.io/badge/MIT-white?style=for-the-badge&logo=opensourceinitiative&logoColor=white&label=License&labelColor=222" alt="License"></a>
</p>

## About Auriya Wiki

**Auriya Wiki** is the official technical documentation for the [Auriya](https://github.com/pavelc4/auriya) Magisk/KernelSU module. Built with Docusaurus, Bun, and Tailwind CSS.

## Tech Stack

- **[Docusaurus](https://docusaurus.io/)** - Static site generator
- **[Bun](https://bun.sh/)** - Runtime & package manager
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

## Quick Start

```bash
bun install
bun dev
```

Validate the production build:

```bash
bun run typecheck
bun run build
```

## Documentation Sections

| Section | Description |
|---------|-------------|
| [Getting Started](/docs/getting-started/installation) | Installation, requirements, first run |
| [Architecture](/docs/architecture/overview) | System design, components, data flow |
| [Development](/docs/development/building) | Build process, CI/CD, contributing |
| [Internals](/docs/internals/fps-detection) | FPS detection, IPC, game detection |
| [Reference](/docs/reference/settings) | Commands, settings, filesystem |

## i18n Support

Currently available in:

- English
- Bahasa Indonesia

## License

Auriya Wiki is open-sourced software licensed under the [MIT License](LICENSE).
