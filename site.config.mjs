// ── Two domains, one content tree ───────────────────────────────────────────
// This repo builds two visually distinct front doors onto the SAME records:
//   SITE=pondview       → pondviewlane.com              (residents' entrance)
//   SITE=essexcrossing  → essexcrossingatmontserrat.com (the subdivision's legal
//                                                         name — buyers/title/attorneys)
// Only the presentation shell differs per site — the `site` URL (so sitemaps and
// canonicals self-reference each domain), the title/description, the brand asset
// set, the per-scheme theme-color, and the stylesheet. Everything else — the
// sidebar, the content collections, the sitemap filter, lastUpdated — is shared,
// so the prose stays byte-identical across both skins. CI builds both variants
// (dist-pondview / dist-essexcrossing) into one Host-switched nginx container;
// see nginx.conf and the Dockerfile.
//
// This registry is imported by astro.config.mjs (the build shell) and
// src/route-data.mjs (per-site homepage branding) so the per-site values have
// one home. The variant *list* is still repeated in package.json's build
// script, the Dockerfile COPYs, nginx.conf, and .gitignore — keep those in
// step when adding a skin.
export const SITES = {
  pondview: {
    url: 'https://pondviewlane.com',
    title: 'Pond View Lane',
    description:
      'A resident’s guide to the rules, records, and obligations of owning a home on Pond View Lane — Beverly, Massachusetts.',
    logo: './src/assets/logo.svg',
    favicon: '/favicon.svg',
    faviconIco: '/favicon.ico',
    appleTouch: '/apple-touch-icon.png',
    customCss: ['./src/styles/custom.css'],
    // Self-hosted display serif preloaded so the hero wordmark doesn't flash the
    // fallback on first paint.
    preloadFonts: ['/fonts/lora-latin-var.woff2'],
    themeColorLight: '#faf8f3',
    themeColorDark: '#17181c',
    ogImage: '/og.jpg',
    ogAlt: 'Pond View Lane — a resident’s guide to the lane. A white pine at the water’s edge.',
    // No `home` block: the homepage frontmatter in src/content/docs/index.mdx IS
    // the pondview branding; src/route-data.mjs leaves it untouched.
  },
  essexcrossing: {
    url: 'https://essexcrossingatmontserrat.com',
    title: 'Essex Crossing at Montserrat',
    description:
      'A plain-English reference to the recorded covenants, plans, and public record of Essex Crossing at Montserrat — the subdivision on Pond View Lane in Beverly, Massachusetts.',
    logo: './src/assets/logo-essex.svg',
    favicon: '/favicon-essex.svg',
    faviconIco: '/favicon-essex.ico',
    appleTouch: '/apple-touch-icon-essex.png',
    // custom.css is the shared structural base; essex.css layers the estate skin
    // on top (loaded after, so it wins where it overrides).
    customCss: ['./src/styles/custom.css', './src/styles/essex.css'],
    // Headings (Playfair) and body (EB Garamond) are above the fold everywhere;
    // the Pinyon hero wordmark can swap in from its fallback.
    preloadFonts: ['/fonts/playfair.woff2', '/fonts/eb-garamond.woff2'],
    themeColorLight: '#f7f2e6',
    themeColorDark: '#14180f',
    ogImage: '/og-essex.jpg',
    ogAlt: 'Essex Crossing at Montserrat — the recorded record of the subdivision. Beverly, Massachusetts.',
    // Homepage branding overrides applied by src/route-data.mjs — the homepage's
    // title/hero/head are hardcoded for pondview in index.mdx frontmatter
    // (frontmatter is static and can't read the SITE switch).
    home: {
      headTitle: 'Essex Crossing at Montserrat — the subdivision’s public record',
    },
  },
};

export const SITE = process.env.SITE || 'pondview';
export const cfg = SITES[SITE];
if (!cfg) {
  throw new Error(`Unknown SITE "${SITE}" — expected one of: ${Object.keys(SITES).join(', ')}`);
}
