import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const paths = [
  {
    label: 'Run a prover',
    body: 'See how the provers differ, then start one on your own hardware.',
    page: 'Choosing a prover',
    to: '/provers/choosing-a-prover',
  },
  {
    label: 'Understand the proof',
    body: 'Follow one block from its witness, through the guest, to a proof.',
    page: 'Execution pipeline',
    to: '/inside-the-guest/execution-pipeline',
  },
  {
    label: 'Build and test',
    body: 'Build the guests and hosts yourself, then run the unit tests.',
    page: 'Building from source',
    to: '/reference/building-from-source',
  },
];

export default function ReaderCards(): React.ReactElement {
  return (
    <section className={styles.group} aria-labelledby="overview-paths">
      <h2 id="overview-paths" className={styles.groupLabel}>Where to start</h2>
      <div className={styles.grid}>
        {paths.map((p) => (
          <Link key={p.to} to={p.to} className={styles.card}>
            <span className={styles.cardTitle}>{p.label}</span>
            <span className={styles.cardBody}>{p.body}</span>
            <span className={styles.cardTarget}>{p.page}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
