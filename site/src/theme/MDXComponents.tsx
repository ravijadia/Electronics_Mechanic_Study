import MDXComponents from '@theme-original/MDXComponents';
import Figure from '@site/src/components/Figure';
import Video from '@site/src/components/Video';

// Registered globally so <Figure /> and <Video /> work in every .md / .mdx
// lesson without adding an import line to each file.
export default {
  ...MDXComponents,
  Figure,
  Video,
};
