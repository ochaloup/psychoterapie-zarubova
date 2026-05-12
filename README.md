# psychoterapie-zarubova

Personal website for Mgr. Barbora Zárubová — psychotherapy and psychological counselling.

This repository hosts the **v0.1 staging build**: a fully designed, content-complete site published at `https://ochaloup.github.io/psychoterapie-zarubova/` for design and copy review. The contact form is intentionally mocked client-side. See `IMPLEMENTATION-PLAN.md` for the full v0.1 scope and `PLAN.md` for the architecture and v1.0 roadmap (domain cutover, working form, analytics).

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

The dev server runs at `http://localhost:4321/psychoterapie-zarubova/` (note the base path).

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
└── robots.txt             blocks crawling for v0.1
```

## Editing content

Most prose lives as markdown in `src/content/`. Frontmatter is validated at build time against `src/content/config.ts`.

## v0.1 notice

The site shows a small banner above the contact form indicating this is a staging build. The form runs all client-side validation but does not send anything. Both will be removed in v1.0.

## Documentation

- `PLAN.md` — design, architecture, and deployment playbook
- `IMPLEMENTATION-PLAN.md` — v0.1 execution detail
- `IMAGES.md` — image source / license log
- `TODO.md` — original brief
