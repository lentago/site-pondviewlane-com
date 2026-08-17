// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

// Per-page <lastmod> for the sitemap. scripts/compose-content.mjs writes a
// { "/path/": "<git ISO date>" } map at build time (prose pages carry their
// source file's git date; library/timeline pages carry their data source's).
// Absent/uncommitted pages simply get no lastmod. Read lazily + cached.
let _pageDates;
function pageDates() {
  if (!_pageDates) {
    try {
      _pageDates = JSON.parse(readFileSync(new URL('./src/data/page-dates.json', import.meta.url), 'utf8'));
    } catch {
      _pageDates = {};
    }
  }
  return _pageDates;
}

// Public-record library categories only. Documents are added directly to this
// repo's library/ with manifest status "public-record"; internal categories
// (meetings, insurance, vendors, correspondence, internal finances) have no
// home here at all, and scripts/check-content.mjs fails the build if such
// material reaches the rendered output.
const LIB_GROUPS = [
  ['Founding Instruments', 'founding'],
  ['Plans & Property', 'plans'],
  ['Trustee Instruments', 'governance'],
  ['City Tax Bills', 'finances'],
  ['Stormwater & Regulatory', 'regulatory'],
];

// Two domains, one content tree: the per-site registry (SITE switch, URLs,
// titles, brand assets, stylesheets, content overlay) lives in site.config.mjs.
import { SITE, cfg } from './site.config.mjs';

export default defineConfig({
  site: cfg.url,
  // Per-site output so CI can build both variants side by side and the Dockerfile
  // can copy each into its own nginx root.
  outDir: `./dist-${SITE}`,
  integrations: [
    // Supplying our own sitemap integration (Starlight defers to it) so the
    // post-submit /report/thanks/ page stays out of the sitemap, and each URL
    // carries a git-derived <lastmod> (see pageDates() above).
    sitemap({
      filter: (page) => !page.includes('/report/thanks/'),
      serialize(item) {
        const date = pageDates()[new URL(item.url).pathname];
        if (date) item.lastmod = date;
        return item;
      },
    }),
    starlight({
      title: cfg.title,
      description: cfg.description,
      logo: { src: cfg.logo },
      favicon: cfg.favicon,
      customCss: cfg.customCss,
      // No Pagefind: the Ask chat retrieves over the same corpus and answers
      // instead of listing hits; the search slot becomes an Ask entry point
      // (HeaderAsk.astro). Footer adds the "Report an issue" link + Ask dock.
      pagefind: false,
      components: {
        Footer: './src/components/Footer.astro',
        Search: './src/components/HeaderAsk.astro',
        // Appends JSON-LD (WebSite on the homepage, BreadcrumbList elsewhere).
        Head: './src/components/Head.astro',
      },
      head: [
        // Preload the brand display face(s) so the wordmark/headings don't flash
        // the fallback on first paint.
        ...cfg.preloadFonts.map((href) => ({
          tag: 'link',
          attrs: { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        })),
        // Icon fallbacks beyond the SVG favicon Starlight links: .ico for
        // browsers without SVG-favicon support (desktop Safari), the 180px
        // PNG for iOS home-screen/share-sheet.
        { tag: 'link', attrs: { rel: 'icon', href: cfg.faviconIco, sizes: '48x48' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: cfg.appleTouch } },
        // Browser-chrome tint matching the site background in each scheme.
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: cfg.themeColorLight } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: cfg.themeColorDark } },
        { tag: 'meta', attrs: { property: 'og:image', content: `${cfg.url}${cfg.ogImage}` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: cfg.ogAlt } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        // Edge-fade scroll hints on wide tables (see public/js/table-fade.js).
        { tag: 'script', attrs: { src: '/js/table-fade.js', defer: true } },
      ],
      lastUpdated: true,
      pagination: false,
      social: [],
      sidebar: [
        { label: 'Ask', link: '/ask/', badge: { text: 'Beta', variant: 'tip' } },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'Timeline', link: '/timeline/' },
        {
          label: 'Document Library',
          collapsed: true,
          items: [
            { label: 'Library Guide', link: '/library/' },
            ...LIB_GROUPS.map(([label, dir]) => ({
              label,
              collapsed: true,
              // Starlight v0.39 removed `label` + `autogenerate` on the same
              // group; the autogenerate config now nests inside `items`.
              items: [{ autogenerate: { directory: `library/${dir}` } }],
            })),
          ],
        },
        { label: 'About this site', link: '/about/' },
      ],
    }),
  ],
});
