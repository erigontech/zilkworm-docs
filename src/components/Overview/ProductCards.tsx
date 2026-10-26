import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './styles.module.css';

type Status = 'live' | 'shipped' | 'in progress';

type Fact = {label: string; value: string; code?: boolean};

type Product = {title: string; to: string; status: Status; facts: Fact[]};

const products: Product[] = [
  {
    title: 'Airbender prover',
    to: '/provers/airbender-prover',
    status: 'live',
    facts: [
      {label: 'Image', value: 'ghcr.io/erigontech/zilkworm-airbender', code: true},
      {label: 'GPU', value: 'At least 32 GB VRAM per GPU'},
      {label: 'Ethproofs', value: 'Live'},
    ],
  },
  {
    title: 'Hypercube prover',
    to: '/provers/hypercube-prover',
    status: 'shipped',
    facts: [
      {label: 'Binary', value: 'z6m_prover_hypercube', code: true},
      {label: 'GPU', value: 'SP1 CUDA'},
      {label: 'Ethproofs', value: 'Not live'},
    ],
  },
  {
    title: 'HashState guest',
    to: '/testing/ere-validation',
    status: 'shipped',
    facts: [
      {label: 'ELF', value: 'stateless-validator-zilkworm-sp1-v6.9.0.elf', code: true},
      {label: 'Use', value: 'ERE validation and cost estimates'},
    ],
  },
];

const statusClass: Record<Status, string> = {
  live: styles.statusLive,
  shipped: styles.statusShipped,
  'in progress': styles.statusInProgress,
};

export default function ProductCards(): React.ReactElement {
  return (
    <section className={styles.group} aria-labelledby="overview-products">
      <h2 id="overview-products" className={styles.groupLabel}>Provers and guests</h2>
      <div className={styles.grid}>
        {products.map((p) => (
          <Link key={p.to} to={p.to} className={styles.card}>
            <span className={clsx(styles.status, statusClass[p.status])}>{p.status}</span>
            <span className={styles.cardTitle}>{p.title}</span>
            <dl className={styles.facts}>
              {p.facts.map((f) => (
                <div key={f.label}>
                  <dt className={styles.label}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.code ? <code>{f.value}</code> : f.value}</dd>
                </div>
              ))}
            </dl>
          </Link>
        ))}
      </div>
    </section>
  );
}
