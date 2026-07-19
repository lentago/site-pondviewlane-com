// Per-domain robots.txt. public/ is copied verbatim into every skin's build, so
// a static robots.txt would advertise one domain's sitemap on the other — this
// endpoint derives the Sitemap URL from the SITE switch's `site` value instead.
export function GET({ site }) {
  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`,
  );
}
