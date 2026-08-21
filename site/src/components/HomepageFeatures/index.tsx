import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  to: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'સ્ટડી મટીરીયલ (Study Material)',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    to: '/docs/intro',
    description: (
      <>Module 2 થી Module 14 સુધીના પ્રકરણો, ગુજરાતીમાં સમજૂતી સાથે.</>
    ),
  },
  {
    title: 'MCQ ટેસ્ટ (Tests)',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    to: '/tests',
    description: (
      <>દરેક પ્રકરણ પછી પ્રેક્ટિસ ટેસ્ટ આપો — તરત જ સ્કોર જુઓ, કોઈ લોગિન નહીં.</>
    ),
  },
  {
    title: 'જાહેરાતો (Announcements)',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    to: '/blog',
    description: (
      <>નવું કન્ટેન્ટ, પરીક્ષા તારીખો અને અગત્યની જાહેરાતો અહીં જુઓ.</>
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
