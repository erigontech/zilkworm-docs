import React from 'react';
import Link from '@docusaurus/Link';
import status from '@site/src/data/status.json';
import styles from './styles.module.css';

export default function StatusStrip(): React.ReactElement {
  return (
    <dl className={styles.strip} aria-label="Project status">
      <div className={styles.stripItem}>
        <dt className={styles.label}>Release</dt>
        <dd className={styles.stripValue}>
          <Link href={status.releaseUrl}>{status.release}</Link>
        </dd>
      </div>
      <div className={styles.stripItem}>
        <dt className={styles.label}>EEST pin</dt>
        <dd className={styles.stripValue}>
          <Link to="/testing/execution-spec-tests">{status.eestPin}</Link>
        </dd>
      </div>
      <div className={styles.stripItem}>
        <dt className={styles.label}>Ethproofs</dt>
        <dd className={styles.stripValue}>
          <Link href={status.ethproofsUrl}>{status.ethproofs}</Link>
        </dd>
      </div>
    </dl>
  );
}
