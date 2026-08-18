<p align="center">
<img src="https://img.shields.io/badge/Docusaurus-3.10.2-34CA40?style=for-the-badge&logo=docusaurus&logoColor=white" alt="Docusaurus">
<img src="https://img.shields.io/badge/Bun-runtime-FCD34D?style=for-the-badge&logo=bun&logoColor=black" alt="Bun">
<img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<a href="https://auriya-wiki.pages.dev"><img src="https://img.shields.io/badge/Live Docs-auriya--wiki.pages.dev-4CAF50?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Live Docs"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/GPLv3-white?style=for-the-badge&logo=gnu&logoColor=white&label=License&labelColor=222" alt="License"></a>
</p>

## About Auriya Wiki
**Auriya Wiki** is the official technical documentation for the [Auriya](https://github.com/pavelc4/auriya) Magisk/KernelSU module. Built with Docusaurus, Bun, and Tailwind CSS — deployed to Cloudflare Pages.

## Tech Stack
- **[Docusaurus](https://docusaurus.io/)** - Static site generator
- **[Bun](https://bun.sh/)** - Runtime & package manager
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Deployment

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
| [Getting Started](https://auriya-wiki.pages.dev/docs/getting-started/installation) | Installation, requirements, first run |
| [Architecture](https://auriya-wiki.pages.dev/docs/architecture/overview) | System design, components, data flow |
| [Development](https://auriya-wiki.pages.dev/docs/development/building) | Build process, CI/CD, contributing |
| [Internals](https://auriya-wiki.pages.dev/docs/internals/fps-detection) | FPS detection, IPC, game detection |
| [Reference](https://auriya-wiki.pages.dev/docs/reference/settings) | Commands, settings, filesystem |

## i18n Support
Currently available in:
- English
- Bahasa Indonesia

## Star History
<a href="https://www.star-history.com/?repos=pavelc4%2Fauriya&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=pavelc4/auriya&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=pavelc4/auriya&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=pavelc4/auriya&type=date&legend=top-left" />
 </picture>
</a>

## License
Auriya Wiki is open-sourced software licensed under the [GNU General Public License v3.0](LICENSE).
