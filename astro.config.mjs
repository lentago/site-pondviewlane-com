// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Public-record library categories only. The library content committed here is
// produced by the private source repo's one-way publish tool, which publishes
// just the manifest documents whose status is "public-record"; internal
// categories (meetings, insurance, vendors, correspondence, internal finances)
// never reach this repo or the site.
const LIB_GROUPS = [
  ['Founding Instruments', 'founding'],
  ['Plans & Property', 'plans'],
  ['Trustee Instruments', 'governance'],
  ['City Tax Bills', 'finances'],
  ['Stormwater & Regulatory', 'regulatory'],
];

export default defineConfig({
  site: 'https://pondviewlane.com',
  integrations: [
    starlight({
      title: 'Pond View Lane',
      description:
        'A resident’s guide to the rules, records, and obligations of owning a home on Pond View Lane — Beverly, Massachusetts.',
      logo: { src: './src/assets/logo.svg' },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/custom.css'],
      // Adds the "Report an issue" mailto link under every page's footer.
      components: { Footer: './src/components/Footer.astro' },
      head: [
        // Hidden trustee-review preview: keep it out of search indexes. The site
        // is served on an unlisted host and is not for public discovery yet;
        // remove this (and public/robots.txt) at the real public launch.
        { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://pondviewlane.com/og.jpg' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        // Edge-fade scroll hints on wide tables (see public/js/table-fade.js).
        { tag: 'script', attrs: { src: '/js/table-fade.js', defer: true } },
      ],
      lastUpdated: true,
      pagination: false,
      social: [],
      sidebar: [
        { label: 'Ask', link: '/ask/', badge: { text: 'Beta', variant: 'tip' } },
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        { label: 'Timeline', link: '/timeline/' },
        {
          label: 'Document Library',
          collapsed: true,
          items: [
            { label: 'Library Guide', link: '/library/' },
            ...LIB_GROUPS.map(([label, dir]) => ({
              label,
              collapsed: true,
              autogenerate: { directory: `library/${dir}` },
            })),
          ],
        },
        { label: 'About this site', link: '/about/' },
      ],
    }),
  ],
});
