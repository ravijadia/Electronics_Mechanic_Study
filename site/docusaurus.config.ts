import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Electronic Mechanic Trade',
  tagline: 'Study Material, MCQ Tests and Announcements for Electronic Mechanic Trade Trainees',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://ravijadia.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/Electronics_Mechanic_Study/',

  // GitHub pages deployment config.
  organizationName: 'ravijadia', // GitHub org/user name.
  projectName: 'Electronics_Mechanic_Study', // GitHub repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'gu',
    locales: ['gu', 'en'],
    localeConfigs: {
      gu: {
        label: 'ગુજરાતી',
        htmlLang: 'gu',
      },
      en: {
        label: 'English',
        htmlLang: 'en',
      },
    },
  },

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: true,
        indexPages: true,
        language: ['en'],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/ravijadia/Electronics_Mechanic_Study/tree/main/site/',
        },
        blog: {
          blogTitle: 'Announcements',
          blogSidebarTitle: 'તાજેતરની જાહેરાતો',
          blogSidebarCount: 10,
          showReadingTime: false,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/ravijadia/Electronics_Mechanic_Study/tree/main/site/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Electronic Mechanic Trade',
      logo: {
        alt: 'Electronic Mechanic Trade Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'studySidebar',
          position: 'left',
          label: 'Study Material',
        },
        {to: '/tests', label: 'Tests', position: 'left'},
        {to: '/blog', label: 'Announcements', position: 'left'},
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/ravijadia/Electronics_Mechanic_Study',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Site',
          items: [
            {
              label: 'Study Material',
              to: '/docs/intro',
            },
            {
              label: 'Tests',
              to: '/tests',
            },
            {
              label: 'Announcements',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Electronic Mechanic Trade Study Material.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
