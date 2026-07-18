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

export default defineConfig({
  site: 'https://pondviewlane.com',
  integrations: [
    // Supplying our own sitemap integration (Starlight defers to it) so the
    // post-submit /report/thanks/ page stays out of the sitemap.
    sitemap({ filter: (page) => !page.includes('/report/thanks/') }),
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
        // Preload the brand display serif (Lora) so the hero wordmark doesn't
        // flash from the Georgia fallback on first paint.
        { tag: 'link', attrs: { rel: 'preload', href: '/fonts/lora-latin-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' } },
        // Icon fallbacks beyond the SVG favicon Starlight links: .ico for
        // browsers without SVG-favicon support (desktop Safari), the 180px
        // PNG for iOS home-screen/share-sheet.
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '48x48' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        // Browser-chrome tint matching the site background in each scheme.
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#faf8f3' } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#17181c' } },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://pondviewlane.com/og.jpg' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Pond View Lane — a resident’s guide to the lane. A white pine at the water’s edge.' } },
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
