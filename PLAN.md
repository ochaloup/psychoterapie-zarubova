# PLAN — Webové stránky Mgr. Barbora Zárubová

Working document. Combines design, architecture, and implementation playbook for the site. Goal: agree on direction (§§1–11) and then execute (§§12–17) without losing track of landmines.

---

## 1. Aesthetic direction

**Recommendation: refined organic minimalism with editorial typography.**

Reasoning — the audience is women seeking therapy. The interface itself should feel like the "klidný a bezpečný prostor" the copy promises: lots of breathing room, slow rhythm, no visual noise. The therapist's work blends body / mind / spirituality / nature (forest therapy, walk & talk, women's circles), so the palette should sit in that earth-and-sacred-feminine register — but stripped of the floral / mandala / watercolor clichés that crowd this niche.

What that means concretely:

- **Palette**: warm off-white (`#F7F2EA`-ish) as base, deep sage / olive green as primary (`#5C6B4E`-ish), dusty terracotta or muted rose as accent (sparingly, for CTAs and emphasis), deep ink for body text (not pure black — `#2A2A28`). Two-tone hero feel rather than gradient soup.
- **Typography**: a characterful serif for display (Cormorant Garamond, Fraunces, or PP Editorial New — distinctive italics matter for Czech `š ě č ř ž`), paired with a humanist sans for body (Inter is too generic — prefer Söhne, General Sans, or a free option like *Manrope* or *DM Sans*).
- **Spacing**: generous, magazine-like. The site shouldn't feel "filled in".
- **Motion**: minimal and slow. Fade-in on scroll, gentle parallax on hero, no bouncy effects. The pace itself communicates safety.
- **Imagery**: warm, soft-focus nature (forest light, hands holding tea, walking paths, abstract textures of bark / linen / paper). No stock-photo therapist-with-clipboard. No mandala overlays.
- **Decorative elements**: one subtle organic motif used as a thread — e.g. a thin hand-drawn line, or a single botanical illustration used as a section divider. Used 3–5 times total across the whole site, never repeated within a section.

**Alternatives if you'd prefer a different feel:**

- **(B) Editorial / magazine** — bolder typography, asymmetric layouts, more structure, slightly cooler palette. Reads more "professional" and less "spa." Closer to ajkadostalova.cz in spirit.
- **(C) Soft monochrome with photography** — almost no color, lets large beautiful nature photos carry the warmth. Most modern, riskier if good photography isn't available.

I recommend (A). Worth picking one before we go further.

---

## 2. Information architecture

The PDF lists 5 top-level sections. I'd keep them as a single-page scroll with anchor navigation, with one exception (see below). Rationale: the content is short enough, conversion goal is "make contact", and one-page builds trust by letting the visitor land softly and read in order.

```
/                              homepage (one-pager)
/pribeh                        full biography
/sluzby/psychoterapie          service detail
/sluzby/poradenstvi-pro-rodice service detail
/sluzby/lesni-terapie          service detail
```

`Ceník` and `Kontakt` live as sections on the homepage — separate pages aren't worth the navigation cost.

**Open design question from PDF** (your own note): "šlo by udělat 3 podskupiny anebo to spíš rozdělit na 3 odkazy v tom úvodu?" for *Co nabízím*.

My recommendation: **keep all three services on the homepage as a 3-card row**, each card linking to a dedicated detail page. Best of both — visitors see the three offerings at a glance, but the homepage doesn't drown in detail. Lesní terapie content is also still "to ještě doplním" — a separate page lets you fill it in later without bloating the home.

---

## 3. Tech stack

**Confirmed: Astro + pnpm + plain CSS.** No Tailwind, no client framework.

Why Astro:
- Component-based (matches "reusable components, manageable in future").
- Outputs pure static HTML/CSS — fast, perfect for GitHub Pages, no client-side framework runtime.
- **Content collections** with typed frontmatter — service pages and bio live as markdown that fails the build if a required field is missing (see §5).
- TypeScript out of the box, Czech UTF-8 is fine.
- First-class GitHub Pages deployment story.

Why not Tailwind: this site has a strong, narrow visual language (one palette, ~5 typographic styles). Plain CSS with custom properties is shorter and easier to maintain than a Tailwind config + utility soup, and it keeps the codebase legible for non-frontend collaborators. CSS will be ~200 lines total.

Stack summary:
- **Framework**: Astro (TypeScript strict)
- **Package manager**: pnpm (CI uses `--frozen-lockfile`)
- **Styling**: plain CSS with CSS custom properties + a small reset
- **Fonts**: self-hosted woff2 in `public/fonts/` (better performance + GDPR-clean — no Google Fonts request to Google servers)
- **Contact form**: Cloudflare Worker → Resend → therapist inbox (see §7)
- **Icons**: inline SVG, ~5 icons total
- **Analytics**: optional — Plausible (cookieless) or none

Recurring cost: domain only (~250–400 CZK/year). Everything else stays on free tiers.

Scaffold command (Phase 1):

```
pnpm create astro@latest . --template minimal --typescript strict --no-install --no-git
pnpm install
```

If `create astro` complains about non-empty directory, pass `--force` after confirming — `PLAN.md`, `TODO.md`, `webovky.pdf` are in the directory and must not be overwritten.

---

## 4. Component architecture

Small, focused set. Naming in English (code), content in Czech.

```
src/
├── pages/
│   ├── index.astro
│   ├── pribeh.astro
│   ├── sluzby/
│   │   ├── psychoterapie.astro
│   │   ├── poradenstvi-pro-rodice.astro
│   │   └── lesni-terapie.astro
├── layouts/
│   └── BaseLayout.astro            ← <head>, nav, footer, meta
├── components/
│   ├── Nav.astro
│   ├── Footer.astro
│   ├── Hero.astro
│   ├── ServiceCard.astro           ← reused 3× on home
│   ├── ServiceDetail.astro         ← reused on the 3 service pages, renders the markdown body
│   ├── PricingTable.astro
│   ├── ContactForm.astro
│   └── SectionHeading.astro
├── content/
│   ├── config.ts                   ← collection schemas (typed frontmatter)
│   ├── pribeh.md
│   └── sluzby/
│       ├── psychoterapie.md
│       ├── poradenstvi-pro-rodice.md
│       └── lesni-terapie.md
├── styles/
│   ├── tokens.css                  ← colors, fonts, spacing (CSS vars)
│   └── global.css
└── public/
    ├── CNAME                       ← custom domain marker
    ├── fonts/
    └── images/
worker/                             ← Cloudflare Worker for contact form (see §7)
.github/
├── workflows/deploy.yml
├── PULL_REQUEST_TEMPLATE.md
└── CODEOWNERS
```

Design tokens (preview):

```css
:root {
  --color-cream: #F7F2EA;
  --color-sage: #5C6B4E;
  --color-sage-dark: #3F4A36;
  --color-terracotta: #B96F4C;
  --color-ink: #2A2A28;
  --color-mute: #6B655C;

  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body:    "Manrope", system-ui, sans-serif;

  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 2rem;
  --space-4: 4rem;
  --space-5: 8rem;
}
```

---

## 5. Content workflow — markdown via PR

All editable prose lives as markdown in `src/content/`. Astro's **content collections** validate frontmatter at build time against a schema in `src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content'

const pribeh = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date().optional(),
  }),
})

const sluzby = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
})

export const collections = { pribeh, sluzby }
```

A service-page file looks like:

```md
---
title: "Psychoterapie"
summary: "Krátký popis pro kartu na úvodu."
order: 1
---

Tady je obsah v markdownu...
```

Editing flow:
1. Editor opens a PR (via GitHub web UI or local checkout) that changes a markdown file.
2. GitHub Actions runs the build on every PR. If frontmatter is invalid or markdown breaks the build, the PR check goes red and merge is blocked.
3. Reviewer (initially you, later potentially Barbora herself) approves; merge to `main` triggers the deploy job.
4. New version is live within ~1 minute.

**Branch protection on `main`** (set in GitHub UI → Settings → Branches):
- Require a pull request before merging.
- Require status checks to pass: the `build` job from `deploy.yml`.
- Require branches to be up to date before merging.
- (Optional) Require linear history.

Without this, anyone with write access could push directly to main and bypass the build check.

**PR template** (`.github/PULL_REQUEST_TEMPLATE.md`):

```
## Co se mění

-

## Checklist

- [ ] Build prošel (zelená fajfka u PR)
- [ ] Texty zkontrolovány (překlepy, diakritika)
- [ ] Změny dávají smysl pro běžného návštěvníka
```

**CODEOWNERS** (`.github/CODEOWNERS`) — auto-assigns reviewers, future-proof:

```
src/content/**     @<owner>
src/pages/**       @<owner>
worker/**          @<owner>
.github/**         @<owner>
```

PR previews per branch (separate URL per PR) are skipped for v1 — GitHub Pages serves only one branch's artifact. Local `pnpm dev` is enough for content editors. Revisit if it becomes friction.

---

## 6. Deployment architecture

```
src/content/*.md  ──┐
src/pages/*.astro ──┴── push/PR ──► GitHub Actions ──► dist/ ──► GitHub Pages CDN ──► https://psychoterapie-zarubova.cz
```

### 6.1. GitHub Actions workflow

Single workflow `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          PUBLIC_CONTACT_ENDPOINT: ${{ vars.PUBLIC_CONTACT_ENDPOINT }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Build runs on PRs (catches errors), deploys only from `main`.

GitHub UI setup (one-time, human-only):
- Repo → Settings → Pages → Source → **GitHub Actions** (not "Deploy from a branch").
- Repo → Actions → enable workflows if prompted.

### 6.2. Custom domain — DNS records

Apex (`psychoterapie-zarubova.cz`) as the canonical URL, `www` redirects to apex. Records to add at the registrar:

| Type  | Host | Value                    | TTL  |
|-------|------|--------------------------|------|
| A     | @    | 185.199.108.153          | 3600 |
| A     | @    | 185.199.109.153          | 3600 |
| A     | @    | 185.199.110.153          | 3600 |
| A     | @    | 185.199.111.153          | 3600 |
| CNAME | www  | `<owner>.github.io.`     | 3600 |

(Cross-check the apex IPs against https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site at execution time — they're stable but can change.)

Remove any pre-existing conflicting A or CNAME records on `@` and `www` first.

DNS propagation: minutes typically, up to 24 h occasionally. Verify with `dig +short psychoterapie-zarubova.cz` and `dig +short www.psychoterapie-zarubova.cz` before proceeding.

### 6.3. CNAME file (required)

`public/CNAME`, one line, **no trailing newline**:

```
psychoterapie-zarubova.cz
```

Astro copies `public/` verbatim into `dist/`. This file tells GitHub Pages the canonical host on every deploy — without it, the custom-domain setting can revert.

### 6.4. astro.config.mjs phasing

**Phase 1** (default GitHub URL, before custom domain):

```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://<owner>.github.io',
  base: '/<repo>',
  trailingSlash: 'ignore',
})
```

**Phase 2** (after custom domain is attached, remove `base`):

```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://psychoterapie-zarubova.cz',
  trailingSlash: 'ignore',
})
```

### 6.5. GitHub UI — final domain setup

- Settings → Pages → Custom domain → enter `psychoterapie-zarubova.cz` → Save.
- Wait until "DNS check successful" appears (refresh every ~30 s).
- Tick **Enforce HTTPS**. Greyed out for up to ~15 min while GitHub provisions the Let's Encrypt cert. Do not proceed until enforced.

---

## 7. Contact form — Cloudflare Worker + Resend

Static site can't send email by itself, but a tiny serverless function can.

- **Cloudflare Worker** (free tier, ~100k requests/day) — receives the form POST, validates, calls Resend.
- **Resend** (free tier, 3000 emails/month) — sends to Barbora's inbox.

```
visitor browser ──fetch POST──► Cloudflare Worker ──HTTPS──► Resend API ──► therapist inbox
                                  │
                                  ├ validates Origin (must match site)
                                  ├ validates name/email/message length & shape
                                  ├ honeypot drop (silent)
                                  ├ rate-limits per IP (KV-backed, 10/hour)
                                  └ sets reply_to = visitor email
```

### 7.1. Resend domain verification (DO NOT SKIP)

Resend dashboard → Domains → Add Domain → `psychoterapie-zarubova.cz`. Resend gives ~3 DNS records (SPF, DKIM, optionally MX for replies). Add them at the registrar alongside the GitHub A records — they don't conflict. Wait for "Verified" badge.

Without this, Resend will only deliver email to the account's own signup email and will silently fail for any other recipient.

### 7.2. Worker layout

Lives in this repo under `worker/` (same repo, deployed independently):

```
worker/
├── wrangler.toml
├── package.json
└── src/index.ts
```

Init:

```
mkdir -p worker
cd worker
pnpm init
pnpm add -D wrangler typescript @cloudflare/workers-types
```

### 7.3. wrangler.toml

```toml
name = "psychoterapie-zarubova-contact"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ALLOWED_ORIGIN = "https://psychoterapie-zarubova.cz"
CONTACT_TO_EMAIL = "REPLACE_WITH_THERAPIST_INBOX"
CONTACT_FROM_EMAIL = "kontakt@psychoterapie-zarubova.cz"

[[kv_namespaces]]
binding = "RL"
id = "REPLACE_AFTER_wrangler_kv_namespace_create"
```

KV namespace is for rate limiting (§7.5). Create with `pnpm exec wrangler kv namespace create RL` and paste the returned id.

### 7.4. Worker source — `worker/src/index.ts`

```ts
export interface Env {
  RESEND_API_KEY: string
  ALLOWED_ORIGIN: string
  CONTACT_TO_EMAIL: string
  CONTACT_FROM_EMAIL: string
  RL: KVNamespace
}

const MAX_NAME = 200
const MAX_EMAIL = 320
const MAX_MESSAGE = 5000

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

function bad(status: number, msg: string, origin: string): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') return bad(405, 'method_not_allowed', origin)

    const reqOrigin = request.headers.get('Origin')
    if (reqOrigin !== origin) return bad(403, 'forbidden_origin', origin)

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const key = `rl:${ip}`
    const count = parseInt((await env.RL.get(key)) ?? '0', 10)
    if (count >= 10) return bad(429, 'rate_limited', origin)
    await env.RL.put(key, String(count + 1), { expirationTtl: 3600 })

    let body: { name?: string; email?: string; message?: string; hp?: string }
    try {
      body = await request.json()
    } catch {
      return bad(400, 'invalid_json', origin)
    }

    if (body.hp) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim()
    const message = (body.message ?? '').trim()

    if (!name || name.length > MAX_NAME) return bad(400, 'invalid_name', origin)
    if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return bad(400, 'invalid_email', origin)
    }
    if (!message || message.length > MAX_MESSAGE) return bad(400, 'invalid_message', origin)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `Web kontakt: ${name}`,
        text: `Od: ${name} <${email}>\n\n${message}`,
      }),
    })

    if (!res.ok) return bad(502, 'email_send_failed', origin)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  },
}
```

Key security decisions baked in:
- Strict origin equality check **and** explicit CORS header — both required, neither sufficient alone.
- Honeypot field `hp` accepted silently (so bots don't learn they've been caught).
- `reply_to` = visitor email so the therapist can reply directly from her inbox.
- Server-side validation (length + email shape). Client validation is ignored.
- Rate limit 10/hour/IP via Cloudflare KV.

### 7.5. Deploy commands (user-side, requires Cloudflare login)

```
cd worker
pnpm exec wrangler login
pnpm exec wrangler kv namespace create RL
# paste returned id into wrangler.toml
pnpm exec wrangler secret put RESEND_API_KEY
# paste Resend API key when prompted
pnpm exec wrangler deploy
```

`wrangler deploy` prints the Worker URL (something like `https://psychoterapie-zarubova-contact.<account-subdomain>.workers.dev`). Capture it — the site needs it as `PUBLIC_CONTACT_ENDPOINT`.

### 7.6. Wire form into Astro

`ContactForm.astro` includes a hidden honeypot input:

```html
<input type="text" name="hp" tabindex="-1" autocomplete="off"
       style="position:absolute;left:-9999px" aria-hidden="true" />
```

Client submit handler:

```js
fetch(import.meta.env.PUBLIC_CONTACT_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, message, hp }),
})
```

Show Czech success / error states. Disable button while in-flight. Endpoint URL is **not** a secret (browsers will see it) — it's env-var'd to avoid hardcoding.

Set the same variable in two places:
- Local `.env`: `PUBLIC_CONTACT_ENDPOINT=https://...workers.dev`
- GitHub: Settings → Secrets and variables → Actions → **Variables** (not Secrets) → `PUBLIC_CONTACT_ENDPOINT`

### 7.7. Rate limiting path choice (open question — §16, Q6)

- **(A) Stay on workers.dev URL** with in-Worker KV rate limit (code above) — no DNS migration needed. **Default.**
- **(B) Move DNS to Cloudflare** to gain CDN, DDoS protection, free per-zone rate-limit, and clean `api.psychoterapie-zarubova.cz` URL — more setup, but the only way to get a branded API URL.

---

## 8. Images

We have no original photography yet. Plan:

1. **Reuse from psychoterapie-zarubova.cz** — only photos that are clearly hers (portrait of Barbora, Centrum Živa interior). Confirm she owns them.
2. **Stock photography from sources with permissive licenses** for background / mood imagery:
   - **Unsplash** (https://unsplash.com) — free for commercial use, no attribution required but encouraged.
   - **Pexels** (https://pexels.com) — similar terms.
3. For each image used, I'll keep `IMAGES.md` recording source URL, photographer, license — so we have a paper trail if anything changes.
4. Target search terms: *forest light Czech*, *linen texture warm*, *hands tea ceramic*, *path through woods morning*, *quiet room window light*, *botanical line drawing*. Avoid clichés (lotus flowers, mandalas, women-in-meditation-pose).
5. All raster images compressed to AVIF + WebP fallback at the build step. Astro has built-in `<Image>` for this.

Portrait photo of Barbora is the single highest-impact asset. If she can get one good professional photo taken (warm, natural light, looking off-camera or gentle smile, no clinical setting), it should anchor the hero.

---

## 9. Accessibility, SEO, legal

- WCAG AA contrast on all text. Sage on cream needs checking — may need to darken the sage for body copy.
- Semantic HTML (`<main>`, `<nav>`, `<article>`, headings in order).
- Czech `lang="cs"` on `<html>`.
- Meta: title, description, OG image per page. JSON-LD `Person` + `LocalBusiness` for SEO.
- Sitemap auto-generated by Astro.
- GDPR: no third-party fonts loaded from Google. The existing copy ("Odesláním formuláře souhlasíte se zpracováním údajů...") covers consent for the contact form. No cookies unless analytics is added — and if so, prefer Plausible (no cookies, no consent banner needed).
- Footer: IČO 87665565, link to Etický kodex ČAP, link to ČAP membership page.

---

## 10. Secrets and environment

| Where | Name | Value source | Sensitive? |
|---|---|---|---|
| Cloudflare Worker secret | `RESEND_API_KEY` | Resend dashboard | **Yes** |
| Cloudflare Worker var | `ALLOWED_ORIGIN` | `https://psychoterapie-zarubova.cz` | No |
| Cloudflare Worker var | `CONTACT_TO_EMAIL` | from Barbora | Mild |
| Cloudflare Worker var | `CONTACT_FROM_EMAIL` | `kontakt@psychoterapie-zarubova.cz` | No |
| GitHub Actions variable | `PUBLIC_CONTACT_ENDPOINT` | workers.dev URL after deploy | No |
| Local `.env` (gitignored) | `PUBLIC_CONTACT_ENDPOINT` | same | No |
| `.env.example` (committed) | dummy values | — | — |

`.gitignore` must include `.env` and `.env.*` (except `.env.example`). Only `PUBLIC_*`-prefixed env vars are exposed to client code by Astro's build.

---

## 11. Prerequisites — human-only tasks

The worker (Claude) **cannot** do these. Confirm each item is done and paste the resulting identifiers/secrets into the conversation before the relevant phase starts.

| # | Task | Output |
|---|---|---|
| 1 | Buy domain. Suggested registrars: Forpsi, Wedos, Active24 (CZ); Namecheap, Porkbun, Cloudflare Registrar (international). | Domain name |
| 2 | Create GitHub repo (public is fine; private requires GitHub Pro for Pages). | `<owner>/<repo>` |
| 3 | Sign up at https://resend.com (free tier). Create an API key. | `RESEND_API_KEY` |
| 4 | Sign up at https://cloudflare.com (free) — needed for the Worker even if DNS stays at the registrar. | account email |
| 5 | Decide therapist's inbox address (where contact-form emails land). | `CONTACT_TO_EMAIL` |
| 6 | Decide sender address on the custom domain (e.g. `kontakt@psychoterapie-zarubova.cz`). Resend will need to verify this domain. | `CONTACT_FROM_EMAIL` |

Don't start Phase 2 until item 1 is confirmed. Don't start the form wiring (Phase 5) until items 3–6 are confirmed.

---

## 12. Phasing — execution order

Each phase has a verifiable stopping point. Don't proceed until the previous phase is green.

| Phase | What | Status gate |
|---|---|---|
| 1 | Scaffold Astro, ship blank page to `<owner>.github.io/<repo>` | Actions green, URL returns 200 |
| 2 | Buy domain (human), DNS, `public/CNAME`, switch `astro.config.mjs` | HTTPS works on apex + www |
| 3 | Branch protection, content collections, PR template, CODEOWNERS | PR with bad frontmatter fails build |
| 4 | Build the actual site (per §§1–9) | Visual review, Lighthouse pass |
| 5 | Resend domain verification, deploy Worker, wire form | Test submit → email arrives |

Phase 3 deliberately comes before Phase 4 — content editing should already have the safety net (branch protection + schema validation) in place when copy starts being written.

After Phase 1: don't push from the worker. Ask the user (`git push -u origin main`) — remote-writing git commands are user-only per standing instructions.

Estimated effort for first publishable version: ~1–2 focused days once §16 questions are answered and assets are in hand.

---

## 13. Verification — run before declaring each phase done

| Check | Command / action | Expected |
|---|---|---|
| **Phase 1** | | |
| Actions build green | GitHub Actions tab | green ✓ |
| GH default URL serves | `curl -I https://<owner>.github.io/<repo>/` | 200 |
| **Phase 2** | | |
| Apex resolves to GH IPs | `dig +short psychoterapie-zarubova.cz` | 4 lines, 185.199.108–111.153 |
| www CNAME to GH | `dig +short www.psychoterapie-zarubova.cz` | `<owner>.github.io.` |
| Apex HTTPS works | `curl -I https://psychoterapie-zarubova.cz` | 200, `server: GitHub.com` |
| www → apex redirect | `curl -I https://www.psychoterapie-zarubova.cz` | 301 → apex |
| HTTP → HTTPS redirect | `curl -I http://psychoterapie-zarubova.cz` | 301 → https |
| Cert valid in browser | open in browser | no mixed-content / cert warnings |
| **Phase 3** | | |
| Branch protection live | try direct push to main from clean clone | rejected |
| Bad frontmatter fails | open PR with missing required field | build red, merge blocked |
| Valid PR succeeds | open PR with valid markdown | build green, merge unblocks deploy |
| **Phase 5** | | |
| Resend domain verified | Resend dashboard | "Verified" badge |
| Worker rejects bad origin | `curl -X POST <worker> -H "Origin: https://evil.example"` | 403 |
| Worker accepts site origin | curl with correct Origin + valid JSON | 200, email arrives |
| Honeypot silently drops | curl with `hp: "x"` in body | 200, but no email arrives |
| Rate limit kicks in | 11 submits from same IP within an hour | 11th returns 429 |

---

## 14. Things to NOT do

Landmines learned the hard way. These are non-negotiable.

- **Don't commit secrets.** `RESEND_API_KEY`, `.env` with real values, Cloudflare tokens — none of these go in git. `.env` must be gitignored. Only `PUBLIC_*` vars belong in client code.
- **Don't set CORS to `*`** on the Worker. Pin to the site origin.
- **Don't typo `ALLOWED_ORIGIN`.** It is the **site** URL (`https://psychoterapie-zarubova.cz`), not the Worker URL. Common confusion.
- **Don't push to main directly** once branch protection is on. Even fixups go through PRs.
- **Don't use `actions/configure-pages@v...`.** `deploy-pages@v4` doesn't need it.
- **Don't remove `public/CNAME`** "to clean things up". Removing it on a deploy can revert the Pages custom-domain setting.
- **Don't `git push --force`** to main, ever.
- **Don't run `pnpm install` without `--frozen-lockfile`** in CI — that masks lockfile drift.
- **Don't add Google Fonts via `<link>` to fonts.googleapis.com.** Fetches from Google's servers, GDPR issue. Self-host woff2 in `public/fonts/`.
- **Don't skip Resend domain verification.** Sending from an unverified domain works for the account's own email only and silently fails for everyone else.
- **Don't put a trailing newline in `public/CNAME`.** Pages parses the file strictly; trailing whitespace can break the custom domain.

---

## 15. Troubleshooting — common failures

- **Build fails on `pnpm install`** → lockfile drift. Run `pnpm install` locally, commit `pnpm-lock.yaml`.
- **Pages deploy succeeds but site 404s** → usually `base` mismatch in `astro.config.mjs` (custom domain set but `base: '/<repo>'` still there), or missing `public/CNAME`.
- **HTTPS cert won't enforce** → DNS not fully propagated, or A records incomplete. Wait, re-check with `dig`, re-save the custom-domain field in GH Settings.
- **Worker returns 403 on legit submit** → `Origin` header doesn't match `ALLOWED_ORIGIN`. Compare exactly: `http` vs `https`, trailing slash, www vs apex.
- **Email not arriving** → check Resend dashboard logs first. If Resend reports 200 but no email lands: spam folder, then verify the sending domain is fully verified (SPF + DKIM both green).
- **Form submit succeeds in browser but no email** → honeypot field auto-filled by browser password manager. Confirm `autocomplete="off"` and `tabindex="-1"` on the input.
- **GH Pages source set to wrong thing** → Settings → Pages → Source must be **GitHub Actions**, not "Deploy from a branch". 404 on the default GH URL is the giveaway.

Always read the Actions log fully before reporting failure — most issues say exactly what's wrong if you scroll.

---

## 16. Resolved decisions

All questions from the planning conversation are resolved. Summary:

1. **Aesthetic**: (A) refined organic minimalism — confirmed. Can revisit if review feedback says otherwise.
2. **Service pages**: three sub-pages under `/sluzby/`, summary cards on the home — confirmed.
3. **Lesní terapie**: ship with a "připravujeme" placeholder.
4. **Domain**: `psychoterapie-zarubova.cz` — already in use by the existing site; cutover happens in v1.0 per `IMPLEMENTATION-PLAN.md` §11.
5. **Email infrastructure**: Cloudflare Worker + Resend approach accepted; **setup deferred to v1.0** (no signups in v0.1).
6. **Rate limiting**: (A) workers.dev URL with KV-backed in-Worker rate limit.
7. **Portrait photo**: reuse `bara.jpg` from existing site for v0.1; replace later with a new photo.
8. **Analytics**: nothing in v0.1. v1.0 plan: Cloudflare Web Analytics (free, cookieless, no consent banner).
9. **Obchodní podmínky**: generate draft based on inspiration sites; Barbora reviews and edits later.
10. **Barbora editing access**: deferred to v1.x — noted in `IMPLEMENTATION-PLAN.md` §10 ("set up Barbora with GitHub web-UI edit flow for markdown files").

Detailed execution plan with all decisions applied: **`IMPLEMENTATION-PLAN.md`**.

---

## 17. Files in this repo

- `PLAN.md` — this file. Design, architecture, and deployment playbook.
- `IMPLEMENTATION-PLAN.md` — v0.1 execution plan (scope, mock form approach, CI tests, file-by-file checklist, backlog).
- `TODO.md` — the original brief.
- `webovky.pdf` — content source from Barbora.
- `IMAGES.md` — will be created when image collection begins; tracks source / license / photographer per image.
