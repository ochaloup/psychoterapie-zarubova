# psychoterapie-zarubova

Personal website for Mgr. Barbora Zárubová — psychotherapy and psychological counselling.

The production site is published at `https://psychoterapie-zarubova.cz/` via GitHub Pages. The contact form posts to a Cloudflare Worker (`worker/`) that relays through Resend. See `IMPLEMENTATION-PLAN.md` for scope history and `PLAN.md` for the architecture; `DNS-RUNBOOK.md` documents the domain/DNS setup.

## Stack

- **Astro** (TypeScript strict)
- **pnpm**
- Plain CSS with custom properties (no Tailwind, no client framework)
- Self-hosted fonts (Cormorant Garamond + Manrope, Latin Extended A subset)

## Local development

```
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321/`.

## Useful scripts

```
pnpm dev        # start the dev server
pnpm build      # produce a static build in dist/
pnpm preview    # serve the built site locally
pnpm check      # run astro check (type + Astro file validity)
```

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the site on every push and PR. Merges to `main` are published to GitHub Pages.

## Repository layout

```
src/
├── pages/                 routes
├── layouts/               BaseLayout (head, nav, footer)
├── components/            Hero, ServiceCard, PricingTable, ContactForm, ...
├── content/               markdown content collections + schema
└── styles/                tokens.css, fonts.css, global.css
public/
├── fonts/                 self-hosted woff2
├── images/                portrait, mood imagery
├── CNAME                  custom-domain marker for GitHub Pages
└── robots.txt             permissive + sitemap reference
```

## Editing content

Most prose lives as markdown in `src/content/`. Frontmatter is validated at build time against `src/content/config.ts`.

## Documentation

- `PLAN.md` — design, architecture, and deployment playbook
- `IMPLEMENTATION-PLAN.md` — v0.1 execution detail
- `IMAGES.md` — image source / license log
- `TODO.md` — original brief
