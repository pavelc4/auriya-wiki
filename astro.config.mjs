import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://auriya.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mermaid(),
    starlight({
      title: 'Auriya',
      favicon: '/kurukuru.gif',
      expressiveCode: {
        themes: ['catppuccin-mocha', 'catppuccin-latte'],
        styleOverrides: {
          borderRadius: '16px',
          borderWidth: '1px',
          borderColor: 'var(--m3-outline-variant)',
          codeBackground: 'var(--m3-surface-container)',
          codeFontFamily: "'Geist', 'JetBrains Mono', 'Fira Code', monospace",
          codeFontSize: '0.88rem',
          codeLineHeight: '1.65',
          uiFontFamily: "'Geist', 'JetBrains Mono', monospace",
          frames: {
            shadowColor: 'rgba(0, 0, 0, 0.15)',
            terminalBackground: 'var(--m3-surface-container)',
            terminalTitlebarBackground: 'var(--m3-surface-container-high)',
            terminalTitlebarBorderBottomColor: 'var(--m3-outline-variant)',
            editorBackground: 'var(--m3-surface-container)',
            editorTabBarBackground: 'var(--m3-surface-container-high)',
            editorTabBarBorderBottomColor: 'var(--m3-outline-variant)',
            editorActiveTabBackground: 'transparent',
            editorActiveTabBorderColor: 'transparent',
            editorActiveTabIndicatorTopColor: 'transparent',
            editorActiveTabIndicatorBottomColor: 'transparent',
            editorActiveTabForeground: 'var(--m3-on-surface)',
            editorTabBorderRadius: '0',
          },
        },
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/gif',
            href: '/kurukuru.gif',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/fonts/Geist/Geist-Variable.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous',
          },
        },
        {
          tag: 'script',
          attrs: {
            type: 'module',
          },
          content: `
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
            function initMermaid() {
              const isDark = document.documentElement.dataset.theme !== 'light';
              mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                fontFamily: 'inherit',
              });
              document.querySelectorAll('pre[data-language="mermaid"], .language-mermaid, pre.mermaid').forEach((el) => {
                const code = el.textContent || '';
                const graphDiv = document.createElement('div');
                graphDiv.className = 'mermaid';
                graphDiv.textContent = code;
                el.replaceWith(graphDiv);
              });
              mermaid.run();
            }
            function enhanceTables() {
              document.querySelectorAll('.sl-markdown-content table').forEach((table) => {
                if (!table.parentElement.classList.contains('table-wrapper')) {
                  const wrapper = document.createElement('div');
                  wrapper.className = 'table-wrapper';
                  table.parentNode.insertBefore(wrapper, table);
                  wrapper.appendChild(table);
                }
              });
            }

            function initEnhancements() {
              if (document.title.includes('Auriya | Auriya') || document.title.includes('Auriya Wiki | Auriya')) {
                document.title = 'Auriya Wiki';
              }
              initMermaid();
              enhanceTables();
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initEnhancements);
            } else {
              initEnhancements();
            }
            document.addEventListener('astro:page-load', initEnhancements);
          `,
        },
      ],
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
          dir: 'ltr',
        },
        id: {
          label: 'Bahasa Indonesia',
          lang: 'id',
          dir: 'ltr',
        },
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: { id: 'Memulai' },
          items: [
            { label: 'Requirements', slug: 'getting-started/requirements' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'First Run', slug: 'getting-started/first-run' },
            { label: 'Configuration', slug: 'getting-started/configuration' },
            { label: 'Performance Tuning', slug: 'getting-started/performance-tuning' },
            { label: 'Uninstall', slug: 'getting-started/uninstall' },
          ],
        },
        {
          label: 'Architecture',
          translations: { id: 'Arsitektur' },
          items: [
            { label: 'Overview', slug: 'architecture/overview' },
            { label: 'Components', slug: 'architecture/components' },
            { label: 'Data Flow', slug: 'architecture/data-flow' },
            { label: 'Data Model', slug: 'architecture/data-model' },
            { label: 'Use Cases', slug: 'architecture/use-cases' },
            { label: 'Module Lifecycle', slug: 'architecture/module-lifecycle' },
          ],
        },
        {
          label: 'Internals',
          translations: { id: 'Internal' },
          items: [
            { label: 'IPC Protocol', slug: 'internals/ipc-protocol' },
            { label: 'Companion Service', slug: 'internals/companion' },
            { label: 'FPS Detection', slug: 'internals/fps-detection' },
            { label: 'Kala Frame Probe', slug: 'internals/kala-research' },
            { label: 'Game Detection', slug: 'internals/game-detection' },
            { label: 'Profile Scheduler', slug: 'internals/profile-scheduler' },
            { label: 'System Tweaks', slug: 'internals/system-tweaks' },
          ],
        },
        {
          label: 'Reference',
          translations: { id: 'Referensi' },
          items: [
            { label: 'Settings Configuration', slug: 'reference/settings' },
            { label: 'Game List Profile', slug: 'reference/gamelist' },
            { label: 'Command Reference', slug: 'reference/commands' },
            { label: 'Telemetry Protocol', slug: 'reference/stats-api' },
            { label: 'Filesystem Layout', slug: 'reference/filesystem' },
          ],
        },
        {
          label: 'Development',
          translations: { id: 'Pengembangan' },
          items: [
            { label: 'Project Structure', slug: 'development/project-structure' },
            { label: 'Building', slug: 'development/building' },
            { label: 'CI/CD Workflows', slug: 'development/ci-cd' },
            { label: 'Debugging', slug: 'development/debugging' },
            { label: 'Contributing', slug: 'development/contributing' },
          ],
        },
      ],
      components: {
        Hero: './src/components/Hero.astro',
      },
      customCss: [
        './src/styles/custom.css',
      ],
    }),
  ],
});
