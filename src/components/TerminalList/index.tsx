import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type FrameProps = {command: string; className?: string; children: ReactNode};

export function TerminalFrame({command, className, children}: FrameProps): ReactNode {
  return (
    <section className={clsx(styles.frame, className)}>
      <div className={styles.titleBar}>
        <span className={styles.dollar} aria-hidden="true">$</span> {command}
      </div>
      <ul className={styles.rows}>
        {React.Children.map(children, (child) => <li>{child}</li>)}
      </ul>
      <div className={styles.cursorLine} aria-hidden="true">
        <span className={styles.cursor}>▊</span>
      </div>
    </section>
  );
}

type RowProps = {
  href: string;
  title: string;
  description?: string;
  external?: boolean;
  className?: string;
};

export function TerminalRow({href, title, description, external, className}: RowProps): ReactNode {
  return (
    <Link
      href={href}
      className={clsx(styles.row, className)}
      {...(external && {target: '_blank', rel: 'noopener noreferrer'})}>
      <span className={styles.prompt} aria-hidden="true">&gt;</span>
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
    </Link>
  );
}
