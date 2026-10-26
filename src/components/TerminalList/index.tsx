import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type FrameProps = {
  command: string;
  heading?: string;
  comment?: string;
  className?: string;
  children: ReactNode;
};

export function TerminalFrame({command, heading, comment, className, children}: FrameProps): ReactNode {
  const commandLine = (
    <>
      <span className={styles.dollar} aria-hidden="true">$</span>
      <span>{command}</span>
    </>
  );
  return (
    <section className={clsx(styles.frame, className)}>
      {heading ? (
        <header>
          <h1 className={styles.label}>{heading}</h1>
          <div className={styles.line}>{commandLine}</div>
          {comment && (
            <p className={clsx(styles.line, styles.comment)}>
              <span aria-hidden="true">#</span>
              <span>{comment}</span>
            </p>
          )}
        </header>
      ) : (
        <div className={clsx(styles.label, styles.line)}>{commandLine}</div>
      )}
      <ul className={styles.rows}>
        {React.Children.map(children, (child) => <li>{child}</li>)}
      </ul>
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
