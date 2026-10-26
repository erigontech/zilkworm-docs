import React, {type ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import {
  useCurrentSidebarSiblings,
  useSidebarBreadcrumbs,
  filterDocCardListItems,
} from '@docusaurus/plugin-content-docs/client';
import DocCard from '@theme/DocCard';
import {TerminalFrame} from '@site/src/components/TerminalList';
import type {Props} from '@theme/DocCardList';

// Deepest category's URL segment, e.g. "provers".
function useCategoryDir(): string {
  const {pathname} = useLocation();
  const categories = (useSidebarBreadcrumbs() ?? []).filter((c) => c.type === 'category');
  const href = categories.slice(-1)[0]?.href ?? pathname;
  return href.split('/').filter(Boolean).pop() ?? '';
}

function DocCardListForCurrentSidebarCategory({className}: Props): ReactNode {
  const items = useCurrentSidebarSiblings();
  return <DocCardList items={items} className={className} />;
}

export default function DocCardList(props: Props): ReactNode {
  const {items, className} = props;
  const dir = useCategoryDir();
  if (!items) {
    return <DocCardListForCurrentSidebarCategory {...props} />;
  }
  return (
    <TerminalFrame command={`zilkworm docs ${dir}/`} className={className}>
      {filterDocCardListItems(items).map((item, index) => (
        <DocCard key={index} item={item} />
      ))}
    </TerminalFrame>
  );
}
