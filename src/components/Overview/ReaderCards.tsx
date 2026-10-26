import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const paths = [
  {
    label: 'Run a prover',
    body: 'Compare the provers, then start one on your hardware.',
    page: 'Choosing a prover',
    to: '/provers/choosing-a-prover',
  },
  {
    label: 'Understand the proof',
    body: 'Follow a block from witness to public values to proof.',
    page: 'Execution pipeline',
    to: '/inside-the-guest/execution-pipeline',
  },
  {
    label: 'Build and test',
    body: 'Build the guests and hosts, then run the unit tests.',
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
