// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

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
    // post-submit /report/thanks/ page stays out of the sitemap.
    sitemap({ filter: (page) => !page.includes('/report/thanks/') }),
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
