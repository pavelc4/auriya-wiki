import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';

function HeroSection(): ReactNode {
  return (
    <header className="hero-section">
      <div className="hero-container">
        
        {/* Left Column: Mascot GIF with oval pedestal plate */}
        <div className="hero-media">
          <div className="hero-pedestal-wrapper">
            <img
              src={useBaseUrl('/gif/kurukuru.gif')}
              alt="Auriya Mascot"
              className="hero-gif"
              width="240"
              height="240"
            />
            <div className="hero-pedestal" />
          </div>
        </div>

        {/* Right Column: Title, Headline, and Actions */}
        <div className="hero-content">
          <h1 className="hero-title">
            Auriya
          </h1>

          <p className="hero-headline">
            <Translate id="homepage.hero.headline" description="Hero headline on the home page">
              Just a personal playground for experiments.
            </Translate>
          </p>

          <div className="hero-actions">
            <Link
              className="hero-btn-primary"
              to="/docs/getting-started/installation">
              <Translate id="homepage.hero.getStarted" description="Primary CTA button">
                Get Started →
              </Translate>
            </Link>
            <Link
              className="hero-btn-secondary"
              href="https://github.com/pavelc4/auriya"
              target="_blank"
              rel="noopener noreferrer">
              <svg
                className="hero-btn-icon"
                viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </Link>
          </div>
        </div>

      </div>
    </header>
  );
}

function FeaturesSection(): ReactNode {
  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
      ),
      title: 'Frame-Aware Scheduling',
      desc: 'Real-time frame latency measurement via Kala eBPF uprobes and sysfs fallback for adaptive CPU/GPU power budgeting.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z M2 4v16h20V4H2zm9 4h2v6h-2z"/></svg>
      ),
      title: 'Per-App Refresh Rate',
      desc: 'Dynamically adapts display panel refresh rates (60Hz, 90Hz, 120Hz, 144Hz) per foreground application stack.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
      ),
      title: 'Per-Game Custom Profiles',
      desc: 'Configure custom FPS targets, dedicated governor overrides, and automated Do Not Disturb mode for individual titles.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
      ),
      title: 'Kernel & System Tweaks',
      desc: 'CPU core online management, GPU power governor control, memory swap optimizations, and vendor lock mitigation.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
      ),
      title: 'Material Expressive UI',
      desc: 'Native Android management app built with Jetpack Compose, featuring real-time telemetry cards and quick settings tiles.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      ),
      title: 'Pure Rust Daemon',
      desc: 'Zero-overhead asynchronous background service built on Tokio, Unix domain sockets, and safe kernel interfaces.',
    },
  ];

  return (
    <section className="features-section">
      <div className="features-header">
        <span className="features-tag">Capabilities</span>
        <h2 className="features-title">Engineered for Performance</h2>
        <p className="features-subtitle">
          A modular optimization suite connecting kernel-level tracing with userspace control.
        </p>
      </div>

      <div className="features-grid">
        {features.map((item, idx) => (
          <div key={idx} className="feature-card">
            <div className="feature-icon-wrapper">
              {item.icon}
            </div>
            <h3 className="feature-title">{item.title}</h3>
            <p className="feature-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickNavSection(): ReactNode {
  const sections = [
    {
      title: 'Getting Started',
      desc: 'Installation steps, system requirements, and first-run verification.',
      to: '/docs/getting-started/installation',
    },
    {
      title: 'Architecture',
      desc: 'System component layout, execution flow, and module lifecycle.',
      to: '/docs/architecture/overview',
    },
    {
      title: 'Internals',
      desc: 'eBPF Kala frame probe, profile scheduler, and IPC protocol.',
      to: '/docs/internals/fps-detection',
    },
    {
      title: 'Reference',
      desc: 'Command line interface (auriyactl), configuration TOML, and Stats API.',
      to: '/docs/reference/settings',
    },
  ];

  return (
    <section className="quicknav-section">
      <div className="quicknav-grid">
        {sections.map((sec, idx) => (
          <Link key={idx} to={sec.to} className="quicknav-card">
            <div className="quicknav-card-header">
              <h4 className="quicknav-card-title">{sec.title}</h4>
              <span className="quicknav-card-arrow">→</span>
            </div>
            <p className="quicknav-card-desc">{sec.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} | Android Performance & Telemetry Module`}
      description="Technical documentation for Auriya Android root daemon, companion service, and manager app.">
      <main>
        <HeroSection />
        <FeaturesSection />
        <QuickNavSection />
      </main>
    </Layout>
  );
}
