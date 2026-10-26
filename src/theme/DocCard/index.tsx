import React, {type ReactNode} from 'react';
import {useDocById, findFirstSidebarItemLink} from '@docusaurus/plugin-content-docs/client';
import {useDocCardDescriptionCategoryItemsPlural} from '@docusaurus/theme-common/internal';
import isInternalUrl from '@docusaurus/isInternalUrl';
import {TerminalRow} from '@site/src/components/TerminalList';
import type {Props} from '@theme/DocCard';
import type {PropSidebarItemCategory, PropSidebarItemLink} from '@docusaurus/plugin-content-docs';

function summaryOf(item: PropSidebarItemCategory | PropSidebarItemLink): string | undefined {
  const summary = item.customProps?.summary;
  return typeof summary === 'string' ? summary : undefined;
}

function CardCategory({item}: {item: PropSidebarItemCategory}): ReactNode {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useDocCardDescriptionCategoryItemsPlural();
  if (!href) {
    return null;
  }
  return (
    <TerminalRow
      href={href}
      title={`${item.label}/`}
      description={summaryOf(item) ?? item.description ?? categoryItemsPlural(item.items.length)}
      className={item.className}
    />
  );
}

function CardLink({item}: {item: PropSidebarItemLink}): ReactNode {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <TerminalRow
      href={item.href}
      title={item.label}
      description={summaryOf(item) ?? item.description ?? doc?.description}
      external={!isInternalUrl(item.href)}
      className={item.className}
    />
  );
}

export default function DocCard({item}: Props): ReactNode {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
