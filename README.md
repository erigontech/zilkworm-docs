# Zilkworm Docusaurus Site

Source for **https://zilkworm.erigon.tech**, the public documentation for Zilkworm, built with [Docusaurus 3](https://docusaurus.io/). Read on to see how the site fits together, how to run it on your machine and how to add a page.

Everything the site needs lives in this repo: configuration, theme overrides, the Overview components, and the markdown content under `docs/`. The Docusaurus build turns it into a static site, which is published through GitHub Pages.

## How it works

- **Pages**: every `.md` file under [`docs/`](docs/) becomes a page, served from the site root (`routeBasePath: '/'`). The sidebar is explicit in [`sidebars.ts`](sidebars.ts), so a new page needs an entry there. Each `_category_.json` mirrors its category label for the llms generator.
- **Overview**: [`docs/index.md`](docs/index.md) is served at `/`. Its status strip and cards are components in [`src/components/Overview/`](src/components/Overview/); the strip reads [`src/data/status.json`](src/data/status.json).
- **Releases**: update `src/data/status.json` and `docs/reference/releases-and-assets.md` together on each release.
- **Redirects**: `@docusaurus/plugin-client-redirects` maps the old `/documentation/...` URLs and `/collaboration` to their new pages (see `docusaurus.config.ts`).
- **Navbar / footer**: configured in [`docusaurus.config.ts`](docusaurus.config.ts) and the swizzled [`src/theme/Footer/index.tsx`](src/theme/Footer/index.tsx). The footer links GitHub, releases, Ethproofs, the blog and Erigon.
- **Theme tokens**: the brand colour is Zilkworm green `#1F9D3E`, the fonts are Quantify, Montserrat and Nunito Sans, and the tokens also cover light and dark surfaces and navbar buttons. All of them live in [`src/css/custom.css`](src/css/custom.css). Fonts are self-hosted under [`static/fonts/`](static/fonts/).
- **Diagrams**: Mermaid is enabled (`@docusaurus/theme-mermaid`); fenced ` ```mermaid ` blocks render inline.
- **Search**: client-side via `@easyops-cn/docusaurus-search-local`, indexed at build time.
- **Analytics**: the Plausible script is injected through `headTags` in the config.
- **Custom domain**: [`static/CNAME`](static/CNAME) pins the site to `zilkworm.erigon.tech` when published from GitHub Pages.
- **SEO**: each page has `title` and `description` frontmatter that becomes `<meta name="description">` and `og:description`. Global `og:image`, Twitter card, and site metadata are set in `docusaurus.config.ts`. `sitemap.xml` is generated at build time by `@docusaurus/preset-classic`; `static/robots.txt` references it.
- **LLM-friendly**: [`scripts/generate-llms.py`](scripts/generate-llms.py) walks `docs/` and writes `static/llms.txt` (page index with descriptions) and `static/llms-full.txt` (full corpus). Regenerate after any docs change:
  ```bash
  python3 scripts/generate-llms.py
  ```

## Render it locally

You need **Node 24 or newer** (`engines` in `package.json`; CI uses Node 24), plus Python 3 for the llms generator.

```bash
npm install        # one-time
npm run start      # dev server with hot reload on http://localhost:3000
```

A few more scripts, all defined in [`package.json`](package.json):

```bash
npm run build      # production build into ./build (static HTML/CSS/JS)
npm run serve      # serve the production build locally
npm run typecheck  # runs tsc over docusaurus.config.ts, sidebars.ts and components
npm run clear      # clear the .docusaurus cache
```

## Authoring content

To add a new doc:

1. Create `docs/<section>/<page>.md` and add its doc id to [`sidebars.ts`](sidebars.ts). A new section also needs a `_category_.json` with its label.
2. Add Docusaurus frontmatter:

   ```yaml
   ---
   title: Page Title
   description: One-line meta description used for SEO + cards.
   sidebar_position: 3
   ---
   ```

3. Save the file, and the dev server hot-reloads it.

Keep three things in mind:

- If the title contains a colon, **quote it** (`title: "Foo: Bar"`), or YAML parsing fails.
- MDX rejects a raw `<` outside code fences, so use `&lt;` or rephrase. Email and URL autolinks (`<a@b.com>`, `<https://…>`) need to be markdown links.
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

- **[public-docs/docusaurus-design-spec.md](https://github.com/erigontech/erigon-documents/blob/master/public-docs/docusaurus-design-spec.md)**: the shared design across all Erigon docs sites (theme, fonts, footer pattern, NotFound shape, broken-link policy, gotchas). Read this one first.
- **[public-docs/zilkworm-docs-spec.md](https://github.com/erigontech/erigon-documents/blob/master/public-docs/zilkworm-docs-spec.md)**: the Zilkworm-specific deltas, such as site identity, the MDX-conversion map from the GitBook migration, page content goals, tradenames and open questions.

When something visual feels ambiguous or you need to add a new chrome element (navbar button, footer column, color token), check the design spec first. It is the source of truth across all Erigon docs sites. Anything Zilkworm-specific (content structure, page intent, the Overview page, the llms generator) belongs in `zilkworm-docs-spec.md`.
