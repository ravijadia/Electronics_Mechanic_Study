import MDXComponents from '@theme-original/MDXComponents';
import Figure from '@site/src/components/Figure';
import Video from '@site/src/components/Video';
import OhmsLawLab from '@site/src/components/Lab/OhmsLawLab';

// Registered globally so <Figure />, <Video /> and the virtual labs work in every .md / .mdx
// lesson without adding an import line to each file.
export default {
  ...MDXComponents,
  Figure,
  Video,
  OhmsLawLab,
};
