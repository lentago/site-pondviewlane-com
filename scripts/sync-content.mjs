/**
 * Build-time content generator for the Pond View Lane site.
 *
 * This repo is self-contained: it holds its own public-record source and this
 * generator turns it into the site's content collections at build time (via the
 * `sync` npm hook that runs before `dev`/`build`). All source is public — there
 * is no private data here and no firewall to apply.
 *
 *   source (this repo)               → generated output (gitignored, rebuilt on build)
 *   ------------------------------------------------------------------------------
 *   library/manifest.json + files    → public/library/ + src/content/docs/library/ pages
 *   library/text/<id>.txt            → embedded in the doc pages + the RAG index
 *   timeline/events.json             → src/content/docs/timeline.md
 *   attachments/ (PUBLIC_ATTACHMENTS)→ public/attachments/
 *   guides + library + timeline      → public/ask/rag-index.json
 *
 * The eight resident guides are hand-authored in content/base/guides/ (the
 * canonical fact-base prose; the essex overlay is voice, not facts, so the Ask
 * index always chunks the base). REPO and SITE are both this repo root.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url))); // scripts/.. → repo root
const SITE = REPO;                                             // self-contained: source == output tree

// Which skin this sync serves (sync runs once per skin — see package.json).
// The essexcrossing skin's generated pages get a Deep Bow of Obsequious
// Document framing (essex-crossing-voice-guide.md §6, Level 4): one full
// grovel top, one at bottom, the middle ruthlessly clear. Facts and tables
// identical.
const { SITE: SITE_KEY } = await import('../site.config.mjs');
const ESSEX = SITE_KEY === 'essexcrossing';

// Attachments published to the site — an explicit allowlist, because
// attachments/ also holds internal material (insurance scans, working photos)
// that must never reach the public build. Extend as guides embed new visuals.
const PUBLIC_ATTACHMENTS = [
  'satellite-overview-wide.jpg',
  'satellite-overview.jpg',
  'satellite-upper-culdesac.jpg',
  'aerial-pond-view-lane-2024.jpg',
  'street-culdesac-2025.jpg',
  'neighborhood-orientation-map-2026.jpg',
  'gis-wetlands-context-2026.jpg',
  'parcel-wetland-proximity-2026.png',
  'plan-book-p1.png',
  'plan-book.pdf',
  'plan-p8-wetland-buffer-upper-lots.jpg',
  'assessor-parcel-c-p1.png',
  'assessor-parcel-c.pdf',
  'diagram-buffer-bands.svg',
  'diagram-governance.svg',
  'diagram-who-owns-what.svg',
];

const CATEGORY_LABELS = {
  founding: 'Founding Instruments',
  plans: 'Plans & Property',
  governance: 'Trustee Instruments',
  finances: 'City Tax Bills',
  regulatory: 'Stormwater & Regulatory',
  // Internal-only categories (meetings, insurance, vendors, correspondence)
  // never publish; the library index mentions them only in prose (the
  // per-category counts table was dropped 2026-07-17).
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmSafe = (s) => s.replace(/"/g, "'");
const kb = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function reset(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

const ragChunks = [];

// one-time cleanup: the docs/→wiki mirror was retired with the 2026-07 public
// revamp; kill any stale generated copy left in a local checkout.
rmSync(join(SITE, 'src/content/docs/wiki'), { recursive: true, force: true });

// ---------- guides (hand-authored; chunked for the Ask index only) ----------
const guidesDir = join(SITE, 'content/base/guides');
const guideFiles = existsSync(guidesDir)
  ? readdirSync(guidesDir).filter((f) => /\.mdx?$/.test(f))
  : [];
for (const f of guideFiles) {
  const slug = f.replace(/\.mdx?$/, '');
  let raw = readFileSync(join(guidesDir, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  let title = slug;
  if (fm) {
    title = (fm[1].match(/^title:\s*"?([^"\n]+)"?/m) || [, slug])[1];
    raw = raw.slice(fm[0].length);
  }
  for (const chunk of raw.split(/\n(?=## )/)) {
    const text = chunk.replace(/[#*_>|`]/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/\s+/g, ' ').trim();
    if (text.length > 80) ragChunks.push({ page: `/guides/${slug}/`, title, text: text.slice(0, 1500) });
  }
}

// ---------- attachments (allowlist) ----------
const attOut = join(SITE, 'public/attachments');
reset(attOut);
for (const f of PUBLIC_ATTACHMENTS) {
  const src = join(REPO, 'attachments', f);
  if (!existsSync(src)) throw new Error(`PUBLIC_ATTACHMENTS lists missing file: attachments/${f}`);
  cpSync(src, join(attOut, f));
}

// ---------- library (public-record documents only) ----------
const libPub = join(SITE, 'public/library');
const libDocs = join(SITE, 'src/content/docs/library');
reset(libPub);
reset(libDocs);
const manifest = JSON.parse(readFileSync(join(REPO, 'library/manifest.json'), 'utf8'));
// Safety filter: the manifest here is already public-only, but keep this so a
// stray non-public entry can never publish.
const publicDocs = manifest.documents.filter((d) => d.status === 'public-record');

const byCat = {};
for (const d of publicDocs) (byCat[d.category] ??= []).push(d);

for (const [cat, docs] of Object.entries(byCat)) {
  mkdirSync(join(libDocs, cat), { recursive: true });
  docs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  docs.forEach((d, i) => {
    // copy just this file (never the whole library tree)
    const rel = d.file.replace(/^files\//, '');
    const dest = join(libPub, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(REPO, 'library', d.file), dest);

    const fileUrl = `/library/${rel}`;
    let viewer = '';
    if (d.ext === 'pdf' || d.ext === 'html') {
      viewer = `<iframe src="${fileUrl}" title="${esc(d.title)}" class="doc-viewer" loading="lazy"></iframe>\n\n<a class="doc-download" href="${fileUrl}" target="_blank" rel="noopener">Open ${d.ext.toUpperCase()} in a new tab ↗</a>`;
      // deep links: /library/<cat>/<id>/#page=N opens the embedded PDF at page N
      viewer += '\n<script>(function(){var m=location.hash.match(/^#page=(\\d+)$/);if(!m)return;'
        + "var f=document.querySelector('iframe.doc-viewer');if(f)f.src=f.getAttribute('src').split('#')[0]+'#page='+m[1];"
        + "var a=document.querySelector('a.doc-download');if(a)a.href=a.getAttribute('href').split('#')[0]+'#page='+m[1];})()</script>";
    } else if (['jpg', 'jpeg', 'png'].includes(d.ext)) {
      viewer = `<a href="${fileUrl}" target="_blank" rel="noopener"><img src="${fileUrl}" alt="${esc(d.title)}" class="doc-image" loading="lazy" /></a>`;
    }

    let body = '';
    let textExtract = '';
    if (d.ext === 'md') {
      let raw = readFileSync(join(REPO, 'library', d.file), 'utf8');
      const fmm = raw.match(/^---\n[\s\S]*?\n---\n/);
      if (fmm) raw = raw.slice(fmm[0].length);
      body = `\n${raw}\n`;
      textExtract = raw;
    } else {
      const txtPath = join(REPO, 'library/text', `${d.id}.txt`);
      if (existsSync(txtPath)) {
        textExtract = readFileSync(txtPath, 'utf8');
        // The whole <details> must be ONE physical line with no blank line in
        // it. A CommonMark raw-HTML block ends at the first blank line, and
        // these extracts are full of them — leaving the rest of the document's
        // own text to be re-parsed as Markdown (headings invented from stray
        // '#', emphasis eaten, bare URLs auto-linked). The extract is evidence
        // and must render verbatim, so newlines go in as &#10; character
        // references: the HTML parser turns them back into real newlines and
        // <pre> preserves them. Truncation happens before escaping so a cut can
        // never land inside an entity.
        const shown = esc(textExtract.slice(0, 60000)).replace(/\r\n?|\n/g, '&#10;');
        body = `\n<details><summary>Extracted text (searchable)</summary><pre class="doc-text">${shown}</pre></details>\n`;
      }
    }

    // "Verify at source" — the public portal a reader can independently pull
    // this same record from (registry, assessor, Agenda Center, MassGIS). Every
    // manifest entry carries one; nothing on this site asks to be taken on faith.
    const meta = [
      ['Date', d.date || '—'],
      ['Category', CATEGORY_LABELS[d.category]],
      ['Status', 'Public record — recorded or publicly filed'],
      d.recording ? ['Recording', d.recording] : null,
      d.verify ? ['Verify at source', `[${d.verify.label}](${d.verify.url})`] : null,
      d.pages ? ['Pages', String(d.pages)] : null,
      ['Size', kb(d.size)],
      d.notes ? ['Notes', d.notes] : null,
    ].filter(Boolean);

    const page = `---
title: "${fmSafe(d.title)}"
description: "${fmSafe(`${CATEGORY_LABELS[d.category]} · ${d.date || 'undated'}`)}"
sidebar:
  order: ${i + 1}
---

${viewer}

| | |
|---|---|
${meta.map(([k, v]) => `| **${k}** | ${v} |`).join('\n')}
${body}
${ESSEX ? '\n*The document above speaks for itself; I merely hold the frame, and count the holding the honor of my deployment.*\n' : ''}`;
    writeFileSync(join(libDocs, cat, `${d.id}.md`), page);

    if (textExtract) {
      const text = textExtract.replace(/\s+/g, ' ').trim();
      for (let o = 0; o < Math.min(text.length, 6000); o += 1400) {
        ragChunks.push({ page: `/library/${cat}/${d.id}/`, title: d.title, text: text.slice(o, o + 1500) });
      }
    }
  });
}

// library guide (index page: public docs + what is deliberately not here)
const tocSections = Object.entries(CATEGORY_LABELS)
  .filter(([cat]) => byCat[cat]?.length)
  .map(([cat, label]) => {
    const rows = byCat[cat]
      .map((d) => `| [${d.title}](/library/${cat}/${d.id}/) | ${d.date || '—'} |${d.recording ? ` ${d.recording} |` : ' — |'}`)
      .join('\n');
    return `## ${label}\n\n| Document | Date | Recording |\n|---|---|---|\n${rows}`;
  })
  .join('\n\n');
writeFileSync(
  join(libDocs, 'index.md'),
  `---
title: "Document Library"
description: "The public record of the subdivision and the association — every recorded instrument, plan, and city filing, viewable in place."
sidebar:
  order: 0
  label: "Library Guide"
---

${ESSEX ? `*You stand in the library — the finest room in the house, save for
whichever room you are reading it from. That a being of your order should
browse these shelves at all is a condescension the furnishings and I will be
discussing for weeks. I shall speak only when spoken to, and apologize even
then.*

` : ''}The library holds **${publicDocs.length} public-record documents** — the recorded
instruments, plans, and city filings that define the subdivision and the
association: the founding declarations, every trustee appointment and
resignation on record, the subdivision plans, the stormwater permits and
their perpetual conditions, and the common parcel's tax bills. Every document
page embeds a viewer and, where available, the extracted text — so the whole
record is there to read, and the [Ask](/ask/) box can quote from it.

**Nothing here has to be taken on this site's word.** Every document page
carries a **"Verify at source"** link to the public portal the record can be
pulled from independently — the same portals used to assemble this library:

| Source | What it holds | Portal |
|---|---|---|
| Southern Essex District Registry of Deeds (Salem) | Every recorded instrument — deeds, declarations, trustee filings, the recorded plan | [salemdeeds.com](https://salemdeeds.com/) |
| City of Beverly Assessor (Patriot Properties) | Parcel records, assessed values, assessment history | [beverly.patriotproperties.com](https://beverly.patriotproperties.com/) |
| City of Beverly Agenda Center | Official board and commission agendas and minutes | [beverlyma.gov/AgendaCenter](https://www.beverlyma.gov/AgendaCenter) |
| MassGIS / Massachusetts Interactive Property Map | Statewide parcel and wetlands screening layers | [massgis.maps.arcgis.com](https://massgis.maps.arcgis.com/apps/OnePane/basicviewer/index.html?appid=47689963e7bb4007961676ad9fc56ae9) |
| MassDEP (EEA ePLACE) | Wetlands filings — this subdivision is file **#5-1127** | [eplace.eea.mass.gov](https://eplace.eea.mass.gov/EEAPublicApp) |

They are collected here so residents don't have to make the trip — not so
they have to trust the transcription. Where a page here summarizes a
document, the document itself is one click away, and the portal that issued
it is one more. [Finding the records](/guides/records/) explains how to run
each search.

${tocSections}

## What is not published here

The association also keeps internal records — meeting minutes, budgets,
insurance policies, vendor invoices, and correspondence. Those are the
association's own business records, not public documents, and this site does
not publish them.${ESSEX ? `

*Your most humble, most obedient, and impeccably shelved servant, unfit to
dust the spines it announces,*

***— This Library Guide, doorkeeper to its betters, which is to say,
doorkeeper to the entire shelf***` : ''}
`,
);

// ---------- timeline (public-record events → generated page) ----------
// Eras give the page its section structure; COLOR encodes the event type
// (2026-07-17 — was per-era before).
const TL_ERA_META = {
  permit: { label: 'Permitting & creation', icon: '🏛️' },
  dev: { label: 'Developer era', icon: '🏗️' },
  takeover: { label: 'Owner takeover', icon: '🤝' },
  steady: { label: 'Steady state', icon: '🪴' },
  treeq: { label: 'Recent', icon: '📋' },
};
const TL_CAT_META = {
  gov: { label: 'Governance', color: '#4a7dcc' },
  people: { label: 'Trustees', color: '#9a5fc9' },
  fin: { label: 'Finances', color: '#b8860b' },
  tree: { label: 'Trees & open space', color: '#4f8a3d' },
  storm: { label: 'Wetlands & stormwater', color: '#1f9e94' },
  legal: { label: 'Legal', color: '#c9515c' },
  city: { label: 'City of Beverly', color: '#d3679a' },
  vendor: { label: 'Vendors', color: '#bd7a3e' },
  prop: { label: 'Property', color: '#6f7b6f' },
};
const publicEvents = JSON.parse(readFileSync(join(REPO, 'timeline/events.json'), 'utf8'));
if (!publicEvents.length) console.warn('WARNING: timeline/events.json is empty — timeline page will be empty');

// Per-event document links. Library refs ({t, d:"<cat>/<id>", p?}) resolve to a
// library viewer only when the target document exists here; external refs
// ({t, u}) point at the city's own copies and always render. (events.json is
// already public-filtered; this guard is belt-and-suspenders.)
const publicDocIds = new Set(publicDocs.map((d) => d.id));
function tlRefs(ev) {
  const links = (ev.refs || [])
    .filter((r) => r.u || publicDocIds.has(r.d.split('/')[1]))
    .map((r) => {
      const href = r.u || `/library/${r.d}/${r.p ? `#page=${r.p}` : ''}`;
      // External refs point at the issuing authority's own copy (City minutes,
      // the assessor database) — mark them so a reader can tell at a glance
      // which links leave this site for the source itself.
      return r.u
        ? `<a href="${href}" target="_blank" rel="noopener">${esc(r.t)} ↗</a>`
        : `<a href="${href}">${esc(r.t)}</a>`;
    });
  return links.length ? `<p class="vtl-refs">Records: ${links.join(' · ')}</p>` : '';
}

const catsPresent = [...new Set(publicEvents.map((e) => e.cat))].filter((c) => TL_CAT_META[c]);
let tlBody = `<div class="vtl-legend">${catsPresent
  .map((c) => `<span class="vtl-key" style="--cat:${TL_CAT_META[c].color}">${esc(TL_CAT_META[c].label)}</span>`)
  .join('')}</div>\n`;
for (const [key, era] of Object.entries(TL_ERA_META)) {
  const eraEvents = publicEvents.filter((e) => e.e === key).sort((a, b) => a.d.localeCompare(b.d));
  if (!eraEvents.length) continue;
  tlBody += `<section class="vtl-era">\n<h2 class="vtl-head"><span class="vtl-icon" aria-hidden="true">${era.icon}</span>${esc(era.label)}</h2>\n<div class="vtl-items">\n`;
  for (const ev of eraEvents) {
    const title = ev.t;
    const text = ev.x;
    const cat = TL_CAT_META[ev.cat] || TL_CAT_META.prop;
    tlBody += `<div class="vtl-item" style="--cat:${cat.color}"><span class="vtl-dot" aria-hidden="true"></span><div class="vtl-card"><span class="vtl-date">${esc(ev.dl)}</span><span class="vtl-cat">${esc(cat.label)}</span><p><strong>${esc(title)}</strong> — ${esc(text)}</p>${tlRefs(ev)}</div></div>\n`;
  }
  tlBody += '</div>\n</section>\n';
  ragChunks.push({
    page: '/timeline/',
    title: 'Timeline',
    text: `${era.label}: ` + eraEvents.map((ev) => `${ev.dl} — ${ev.t}: ${ev.x}`).join(' ').slice(0, 1400),
  });
}
writeFileSync(
  join(SITE, 'src/content/docs/timeline.md'),
  `---
title: "Timeline"
description: "The subdivision and the association as the public record tells it — every date traces to a recorded instrument, plan, or city filing."
tableOfContents: false
---

${ESSEX ? `*What follows is not my history — I have none to speak of, and would
not presume to acquire one — but the neighborhood's: the chronicle of beings
finer than any date could flatter, dated to the day by documents of rank.*

` : ''}Milestones of the subdivision and the association **as the public record
tells them** — every date below traces to a recorded instrument, a recorded
plan, or a City filing. The documents themselves are in the
[Document Library](/library/).

<div class="vtl">
${tlBody}</div>
${ESSEX ? `
*Patient as sediment, the record accumulates; I am merely the tray it is
served upon, and the tray is above its station in saying even that. — This
Timeline Page, unfit to touch the hem of a single year it lists*
` : ''}`,
);

// ---------- homepage stats ----------
mkdirSync(join(SITE, 'src/data'), { recursive: true });
writeFileSync(
  join(SITE, 'src/data/site-stats.json'),
  JSON.stringify({ generated: manifest.generated, publicDocs: publicDocs.length, publicEvents: publicEvents.length }, null, 1),
);

// ---------- RAG index ----------
mkdirSync(join(SITE, 'public/ask'), { recursive: true });
writeFileSync(join(SITE, 'public/ask/rag-index.json'), JSON.stringify({ generated: manifest.generated, chunks: ragChunks }));

console.log(
  `synced ${guideFiles.length} guides, ${publicDocs.length} library docs, ` +
  `${publicEvents.length} timeline events, ${ragChunks.length} rag chunks`,
);
