import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

/* Monospace throughout; the Quantify wordmark is the exception. */
const MONO = 'var(--ifm-font-family-monospace)';
/* -700 not -600: -600 is only 3.06:1 on the light surface (AA needs 4.5:1). */
const FINE_BASE = 'var(--ifm-color-emphasis-700)';
const ACCENT = 'var(--brand-accent)';
const BOX_BORDER = 'var(--ifm-toc-border-color)';

export default function Footer(): React.ReactElement {
  const logoUrl = useBaseUrl('/img/logo-icon-orange.png');

  return (
    <footer style={{
      background: 'var(--footer-bg)',
      color: 'var(--footer-fg)',
      borderTop: '2px solid var(--ifm-color-primary)',
      fontFamily: MONO,
    }}>
      {/* Top section: one horizontal line */}
      <div className="footer-top-grid" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '1.25rem 2rem 0.75rem',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}>

        {/* Erigon lockup: one anchor, one hit target. */}
        <a href="https://erigon.tech" target="_blank" rel="noopener noreferrer"
          aria-label="Erigon home page" className="footer-brand">
          <img src={logoUrl} alt="Erigon" style={{height: '32px', width: 'auto'}} />
          <span style={{fontFamily: "'Quantify', sans-serif", fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em'}}>erigon.tech</span>
        </a>

        {/* Project links, right aligned */}
        <nav className="footer-links" aria-label="Zilkworm links">
          {[
            {label: 'github', href: 'https://github.com/erigontech/zilkworm', title: 'Zilkworm on GitHub'},
            {label: 'releases', href: 'https://github.com/erigontech/zilkworm/releases', title: 'Zilkworm releases'},
            {label: 'ethproofs', href: 'https://ethproofs.org/provers', title: 'Ethproofs provers'},
            {label: 'blog', href: 'https://zilkworm.hashnode.dev', title: 'Zilkworm blog'},
          ].map(({label, href, title}) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={title}
              className="footer-link">
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div style={{borderTop: `1px solid ${BOX_BORDER}`, margin: '0.25rem 2rem'}} />

      {/* Bottom bar */}
      <div className="footer-bottom-bar" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.7rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <span style={{fontSize: '0.8rem', color: FINE_BASE, fontFamily: MONO}}>
          <span style={{color: ACCENT, fontWeight: 700}}>$</span>{' '}
          © {new Date().getFullYear()} Erigon Technologies AG. All rights reserved.{' '}
          <span style={{color: ACCENT, fontWeight: 700}}>▊</span>
        </span>
        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap'}}>
          {[
            {label: 'Privacy Policy', href: 'https://erigon.tech/privacy/'},
            {label: 'Cookie Policy', href: 'https://erigon.tech/cookies/'},
            {label: 'About Us', href: 'https://erigon.tech/about/'},
          ].map(({label, href}) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="footer-legal">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
