import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: ReactNode;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  to: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: (
      <Translate id="homepage.feature.study.title">Study Material</Translate>
    ),
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    to: '/docs/intro',
    description: (
      <Translate id="homepage.feature.study.description">
        Chapters from Module 2 through Module 14, with explanations in
        Gujarati.
      </Translate>
    ),
  },
  {
    title: <Translate id="homepage.feature.tests.title">MCQ Tests</Translate>,
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    to: '/tests',
    description: (
      <Translate id="homepage.feature.tests.description">
        Take a practice test after each chapter — see your score instantly,
        no login required.
      </Translate>
    ),
  },
  {
    title: (
      <Translate id="homepage.feature.announcements.title">
        Announcements
      </Translate>
    ),
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    to: '/blog',
    description: (
      <Translate id="homepage.feature.announcements.description">
        New content, exam dates, and important announcements posted here.
      </Translate>
    ),
  },
];

function Feature({title, Svg, description, to}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={to} className={styles.featureLink}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
        <div className="text--center padding-horiz--md">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
