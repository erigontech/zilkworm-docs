import React from 'react';
import Link from '@docusaurus/Link';
import {TerminalFrame, TerminalRow} from '@site/src/components/TerminalList';

const cards = [
  {label: 'Overview',           desc: 'what Zilkworm ships and where to start',  to: '/'},
  {label: 'Choosing a prover',  desc: 'which prover to run',                      to: '/provers/choosing-a-prover'},
  {label: 'Execution pipeline', desc: 'block and witness in, proof out',          to: '/inside-the-guest/execution-pipeline'},
  {label: 'CLI reference',      desc: 'flags, subcommands, env vars, exit codes', to: '/reference/cli-reference'},
  {label: 'GitHub',             desc: 'source, issues and releases',              href: 'https://github.com/erigontech/zilkworm'},
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
          This page does not exist, or it has moved. Pick one of the pages below and keep reading.
        </p>

        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
          <Link to="/" className="button-404-primary">Back to docs</Link>
          <a href="https://erigon.tech/contact/" target="_blank" rel="noopener noreferrer" className="button-404-secondary">Contact us</a>
        </div>
      </section>

      {/* Links */}
      <section style={{maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem 5rem'}}>
        <h2 style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 800,
          fontSize: '1.1rem', marginBottom: '1.5rem',
          color: 'var(--ifm-color-emphasis-600)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Where would you like to go?
        </h2>
        <TerminalFrame>
          {cards.map(({label, desc, to, href}) => (
            <TerminalRow key={label} href={href ?? to!} title={label} description={desc} external={!!href} />
          ))}
        </TerminalFrame>
      </section>
    </main>
  );
}
