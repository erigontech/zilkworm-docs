# Zilkworm Docusaurus Site

Source for **https://zilkworm.erigon.tech**, the public documentation for Zilkworm, built with [Docusaurus 3](https://docusaurus.io/).

This repo is the entire site: configuration, theme overrides, the Overview components, and the markdown content under `docs/`. The Docusaurus build emits a static site that is published via GitHub Pages.

## How it works

- **Pages**: every `.md` file under [`docs/`](docs/) becomes a page, served from the site root (`routeBasePath: '/'`). The sidebar is explicit in [`sidebars.ts`](sidebars.ts); a new page needs an entry there. Each `_category_.json` mirrors its category label for the llms generator.
- **Overview**: [`docs/index.md`](docs/index.md) is served at `/`. Its status strip and cards are components in [`src/components/Overview/`](src/components/Overview/); the strip reads [`src/data/status.json`](src/data/status.json).
- **Releases**: Update `src/data/status.json` and `docs/reference/releases-and-assets.md` together on each release.
- **Redirects**: `@docusaurus/plugin-client-redirects` maps the old `/documentation/...` URLs and `/collaboration` to their new pages (see `docusaurus.config.ts`).
- **Navbar / footer**: configured in [`docusaurus.config.ts`](docusaurus.config.ts) and the swizzled [`src/theme/Footer/index.tsx`](src/theme/Footer/index.tsx). The footer links GitHub, releases, Ethproofs, the blog and Erigon.
- **Theme tokens**: brand colour Zilkworm green `#1F9D3E`, Quantify / Montserrat / Nunito Sans fonts, light and dark surfaces, navbar buttons. All live in [`src/css/custom.css`](src/css/custom.css). Fonts are self-hosted under [`static/fonts/`](static/fonts/).
- **Diagrams**: Mermaid is enabled (`@docusaurus/theme-mermaid`); fenced ` ```mermaid ` blocks render inline.
- **Search**: client-side via `@easyops-cn/docusaurus-search-local`, indexed at build time.
- **Analytics**: Plausible script is injected via `headTags` in the config.
- **Custom domain**: [`static/CNAME`](static/CNAME) pins the site to `zilkworm.erigon.tech` when published from GitHub Pages.
- **SEO**: Each page has `title` + `description` frontmatter that becomes `<meta name="description">` and `og:description`. Global `og:image`, Twitter card, and site metadata are set in `docusaurus.config.ts`. `sitemap.xml` is generated at build time by `@docusaurus/preset-classic`; `static/robots.txt` references it.
- **LLM-friendly**: [`scripts/generate-llms.py`](scripts/generate-llms.py) walks `docs/` and writes `static/llms.txt` (page index with descriptions) and `static/llms-full.txt` (full corpus). Regenerate after any docs change:
  ```bash
  python3 scripts/generate-llms.py
  ```

## Render it locally

Requirements: **Node ≥ 24** (`engines` in `package.json`; CI uses Node 24). Python 3 runs the llms generator.

```bash
npm install        # one-time
npm run start      # dev server with hot reload on http://localhost:3000
```

Other useful scripts (all defined in [`package.json`](package.json)):

```bash
npm run build      # production build into ./build (static HTML/CSS/JS)
npm run serve      # serve the production build locally
npm run typecheck  # tsc — verifies docusaurus.config.ts, sidebars.ts, components
npm run clear      # clear the .docusaurus cache
```

## Authoring content

Add a new doc:

1. Create `docs/<section>/<page>.md` and add its doc id to [`sidebars.ts`](sidebars.ts). A new section also needs a `_category_.json` with its label.
2. Add Docusaurus frontmatter:

   ```yaml
   ---
   title: Page Title
   description: One-line meta description used for SEO + cards.
   sidebar_position: 3
   ---
   ```

3. Save — the dev server hot-reloads.

Notes:

- If the title contains a colon, **quote it** (`title: "Foo: Bar"`) — otherwise YAML parsing fails.
- MDX rejects raw `<` outside code fences. Use `&lt;` or rephrase. Email/URL autolinks (`<a@b.com>`, `<https://…>`) need to be markdown links.
- Inline JSX is allowed in `.md` files (Docusaurus treats them as MDX). The Overview page (`docs/index.md`) imports its components this way. Keep prose outside the components so `llms.txt` picks it up.

## Layout

```
zilkworm-docs/
├── docs/                         # markdown content, served at /
│   ├── index.md                  # Overview, slug /
│   ├── provers/                  # choosing a prover, Airbender, Hypercube, ZisK, Ethproofs posting
│   ├── inside-the-guest/         # execution pipeline, witness formats, precompiles, proof guarantees
│   ├── testing/                  # execution spec tests, QEMU, ERE validation
│   └── reference/                # CLI, releases and assets, building, benchmarks and CI
├── src/
│   ├── components/Overview/      # status strip, product cards, reader cards
│   ├── data/status.json          # release tag, EEST pin, Ethproofs status
│   ├── css/custom.css            # all theme tokens (colors, fonts, buttons, etc.)
│   └── theme/
│       ├── Footer/index.tsx      # swizzled footer
│       ├── NotFound/             # swizzled 404
│       └── Root.tsx              # canonical link tag
├── scripts/
│   ├── generate-llms.py          # writes static/llms.txt and llms-full.txt
│   └── check-tsconfig-drift.mjs
├── static/
│   ├── CNAME                     # zilkworm.erigon.tech
│   ├── fonts/                    # self-hosted woff2: Quantify, Montserrat, Nunito Sans
│   ├── img/                      # logos, favicon, OG image
│   └── llms.txt, llms-full.txt
├── docusaurus.config.ts          # site identity, plugins, redirects, navbar, themeConfig
├── sidebars.ts                   # explicit sidebar
└── package.json
```

## Design spec

This site has two source-of-truth specs in `erigontech/erigon-documents`:

- **[public-docs/docusaurus-design-spec.md](https://github.com/erigontech/erigon-documents/blob/master/public-docs/docusaurus-design-spec.md)** — Shared design across all Erigon docs sites (theme, fonts, footer pattern, NotFound shape, broken-link policy, gotchas). Read this first.
- **[public-docs/zilkworm-docs-spec.md](https://github.com/erigontech/erigon-documents/blob/master/public-docs/zilkworm-docs-spec.md)**: Zilkworm-specific deltas, such as site identity, the MDX-conversion map from the GitBook migration, page content goals, tradenames and open questions.

When something visual feels ambiguous or you need to add a new chrome element (navbar button, footer column, color token), check the design spec first. It is the source of truth across all Erigon docs sites. Anything Zilkworm-specific (content structure, page intent, the Overview page, the llms generator) belongs in `zilkworm-docs-spec.md`.
