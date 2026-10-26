import React from 'react';
import Link from '@docusaurus/Link';

const cards = [
  {label: 'Overview',           desc: 'What Zilkworm ships and where to start.',                  to: '/'},
  {label: 'Choosing a prover',  desc: 'Compare Airbender, Hypercube and ZisK.',                   to: '/provers/choosing-a-prover'},
  {label: 'Execution pipeline', desc: 'How a block becomes public values and a proof.',           to: '/inside-the-guest/execution-pipeline'},
  {label: 'CLI reference',      desc: 'Flags, subcommands and exit codes for each binary.',       to: '/reference/cli-reference'},
  {label: 'GitHub',             desc: 'Source code, issues and releases.',                        href: 'https://github.com/erigontech/zilkworm'},
];

export default function NotFoundContent(): React.ReactElement {
  return (
    <main>
      {/* Hero */}
      <section style={{padding: '6rem 2rem 5rem', textAlign: 'center'}}>
        <div style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 800,
          fontSize: 'clamp(5rem, 18vw, 10rem)', lineHeight: 1,
          color: '#1F9D3E', marginBottom: '1.5rem',
        }}>404</div>

        <h1 style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 800,
          fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', margin: '0 0 1rem',
        }}>
          This page is off the chain.
        </h1>

        <p style={{
          fontSize: '1.05rem', color: 'var(--ifm-color-emphasis-700)',
          maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.65,
        }}>
          This page does not exist or has moved. Pick a page below to keep reading.
        </p>

        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
          <Link to="/" className="button-404-primary">Back to docs</Link>
          <a href="https://erigon.tech/contact/" target="_blank" rel="noopener noreferrer" className="button-404-secondary">Contact Us</a>
        </div>
      </section>

      {/* Cards */}
      <section style={{maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem 5rem'}}>
        <h2 style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 800,
          fontSize: '1.1rem', marginBottom: '1.5rem',
          color: 'var(--ifm-color-emphasis-600)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Where would you like to go?
        </h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem'}}>
          {cards.map(({label, desc, to, href}) => {
            const inner = (
              <>
                <div style={{fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--ifm-font-color-base)'}}>{label}</div>
                <div style={{fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-700)', lineHeight: 1.5}}>{desc}</div>
              </>
            );
            return href ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="card-404">{inner}</a>
            ) : (
              <Link key={label} to={to!} className="card-404">{inner}</Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
