import React from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Head from '@docusaurus/Head';

export default function Root({children}: {children: React.ReactNode}): React.ReactElement {
  const {pathname} = useLocation();
  const {siteConfig: {url, trailingSlash}} = useDocusaurusContext();

  const base = url.replace(/\/$/, '');
  let path = pathname;
  if (path !== '/') {
    path = trailingSlash ? path.replace(/\/?$/, '/') : path.replace(/\/$/, '');
  }
  const canonical = base + path;

  return (
    <>
      <Head>
        <link rel="canonical" href={canonical} />
      </Head>
      {children}
    </>
  );
}
