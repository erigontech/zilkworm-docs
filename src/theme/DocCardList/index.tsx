import React, {type ReactNode} from 'react';
import {
  useCurrentSidebarSiblings,
  filterDocCardListItems,
} from '@docusaurus/plugin-content-docs/client';
import DocCard from '@theme/DocCard';
import {TerminalFrame} from '@site/src/components/TerminalList';
import type {Props} from '@theme/DocCardList';

function DocCardListForCurrentSidebarCategory({className}: Props): ReactNode {
  const items = useCurrentSidebarSiblings();
  return <DocCardList items={items} className={className} />;
}

export default function DocCardList(props: Props): ReactNode {
  const {items, className} = props;
  if (!items) {
    return <DocCardListForCurrentSidebarCategory {...props} />;
  }
  return (
    <TerminalFrame className={className}>
      {filterDocCardListItems(items).map((item, index) => (
        <DocCard key={index} item={item} />
      ))}
    </TerminalFrame>
  );
}
