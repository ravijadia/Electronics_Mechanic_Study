import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {LessonStatus} from '@site/src/components/Progress';

type Props = WrapperProps<typeof FooterType>;

// Under every lesson: read status and the result of its test.
export default function FooterWrapper(props: Props): React.JSX.Element {
  return (
    <>
      <LessonStatus />
      <Footer {...props} />
    </>
  );
}
