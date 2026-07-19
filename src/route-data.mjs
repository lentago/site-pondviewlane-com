// Per-site homepage branding. The homepage's title, hero, and <head> branding
// are hardcoded in src/content/docs/index.mdx frontmatter, which is static —
// it can't read the SITE switch. For any site whose registry entry defines a
// `home` block, this Starlight route middleware rebrands the homepage's route
// data from the registry; the pondview build defines none, so its output is
// untouched. Every other page already derives its branding from the config.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { SITE, cfg } from '../site.config.mjs';
import essexLogo from './assets/logo-essex.svg';

// Hero images go through Astro's image pipeline, so each skin's logo must be a
// static import — mapped by SITES key.
const HERO_LOGOS = { essexcrossing: essexLogo };

export const onRequest = defineRouteMiddleware((context) => {
  if (!cfg.home || context.url.pathname !== '/') return;

  const route = context.locals.starlightRoute;
  const data = route.entry.data;
  data.title = cfg.title;
  data.description = cfg.description;
  if (data.hero) {
    data.hero.title = cfg.title;
    const logo = HERO_LOGOS[SITE];
    if (logo && data.hero.image) data.hero.image = { ...data.hero.image, file: logo };
  }

  // The <head> tags were resolved before middleware runs — rewrite the branded
  // ones in place (the frontmatter title override plus the derived metas).
  for (const tag of route.head) {
    const { attrs = {} } = tag;
    if (tag.tag === 'title') tag.content = cfg.home.headTitle;
    else if (attrs.name === 'description') attrs.content = cfg.description;
    else if (attrs.property === 'og:title' || attrs.name === 'twitter:title') attrs.content = cfg.title;
    else if (attrs.property === 'og:description' || attrs.name === 'twitter:description') attrs.content = cfg.description;
  }
});
