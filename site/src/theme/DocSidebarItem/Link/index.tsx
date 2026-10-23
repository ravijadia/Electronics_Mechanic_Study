import React from 'react';
import clsx from 'clsx';
import Link from '@theme-original/DocSidebarItem/Link';
import type LinkType from '@theme/DocSidebarItem/Link';
import type {WrapperProps} from '@docusaurus/types';
import {pageKey} from '@site/src/progress/store';
import useProgress from '@site/src/progress/useProgress';

type Props = WrapperProps<typeof LinkType>;

// Marks lessons the trainee has already read with a tick in the sidebar.
export default function LinkWrapper(props: Props): React.JSX.Element {
  const read = useProgress().lessons;
  const key = props.item.href ? pageKey(props.item.href) : null;
  const done = key != null && !!read[key];
  const item = done ? {...props.item, className: clsx(props.item.className, 'lesson-read')} : props.item;
  return <Link {...props} item={item} />;
}
