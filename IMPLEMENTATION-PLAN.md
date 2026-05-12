# IMPLEMENTATION-PLAN — v0.1

Detailed execution plan for the **first deployable version** of the site. Companion to `PLAN.md` (architecture & decisions). This file is the concrete checklist.

---

## 0. Scope of v0.1

**Goal**: a fully styled, content-complete site deployed at a temporary GitHub Pages URL (e.g. `https://<owner>.github.io/<repo>/`) for **design + copy review with Barbora**. No real domain, no working email, no analytics, no cookie banners.

**v0.1 IS:**
- All pages built with final design.
- All copy from `webovky.pdf` transcribed and rendered.
- Contact form **visible and styled**, but submits to nothing (see §2).
- Portrait image reused from existing site, will be replaced later.
- Deployed on push to `main` via GitHub Actions.
- Basic CI checks (build, type-check, link check).

**v0.1 IS NOT:**
- Not on the real `psychoterapie-zarubova.cz` domain (that's currently in use by the existing site — see §11 for cutover plan).
- No Cloudflare Worker.
- No Resend signup.
- No DNS changes.
- No branch protection yet (low value while it's still just us iterating).
- No analytics (see §5).
- No Barbora-direct editing access (deferred — see §10).

When v0.1 is approved by Barbora on design + content, we plan **v1.0**: domain cutover, working contact form, branch protection, analytics. That's a separate plan.

---

## 1. Versioning / milestones

| Version | Goal | Status gate |
|---|---|---|
| v0.1 | Design + content review on staging URL | Barbora & Ondra approve look + texts |
| v0.x | Iterate on feedback (copy tweaks, image refinement) | Stable approval |
| v1.0 | Real domain, working form, branch protection, analytics | Production launch |
| v1.x | Barbora self-edits via GitHub PR flow | She can make changes independently |

---

## 2. Mock contact form

The form is visually identical to the production version (so reviewers see exactly what users will see). Submission is intercepted client-side and never leaves the browser.

**Behavior on submit:**
1. Run all client-side validation (required fields, email shape, length caps). Show validation errors as normal.
2. If valid: disable submit button, simulate ~800ms of "sending" state.
3. Show a soft Czech notice in place of the form:
   > Děkujeme za zprávu. *(Tato verze stránek slouží k revizi designu — formulář bude aktivní po oficiálním spuštění. Pro skutečný kontakt prosím využijte e‑mail nebo telefon výše.)*

**Above the form**, a small notice block:
> *Toto je testovací verze webu. Formulář zatím není aktivní — pro kontakt napište prosím na e‑mail nebo zavolejte.*

Notice block uses a muted background and small italics, friendly but clear.

**Implementation detail**: the form's HTML and validation logic should be **production-ready** — same field names (`name`, `email`, `message`, `hp` honeypot), same client-side validation. Only the `fetch()` call to the Worker is replaced by `await new Promise(r => setTimeout(r, 800))` + success state. When v1.0 ships, the only change is swapping the simulated promise for the real `fetch()`.

---

## 3. Staging URL strategy

Astro `astro.config.mjs` for v0.1:

```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://<owner>.github.io',
  base: '/<repo>',
  trailingSlash: 'ignore',
})
```

`public/CNAME` is **NOT** created in v0.1 (creating it would only matter once we attach a custom domain).

`public/robots.txt` **IS** created with:

```
User-agent: *
Disallow: /
```

Reason: prevents Google from indexing the staging URL while we're iterating. When we go to v1.0, this is replaced with permissive rules + a sitemap reference.

Also add `<meta name="robots" content="noindex,nofollow" />` to `BaseLayout.astro` for v0.1 belt-and-braces. Remove for v1.0.

---

## 4. CI tests in the deploy workflow

Keep it small and fast. Each check earns its place.

Final v0.1 `deploy.yml` build job:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm exec astro check       # type checking + Astro file validity
- run: pnpm build                   # the actual build
- run: pnpm exec lychee --no-progress --offline dist/  # internal link check
```

What each does:
- **`astro check`** — runs the Astro language server in CLI mode. Catches type errors, broken imports, malformed frontmatter against the content schema, unused props. Built-in. ~5–10 s.
- **`pnpm build`** — the build itself. Fails on syntax errors, broken markdown, missing referenced files.
- **`lychee --offline dist/`** — scans the built HTML for broken internal anchors and references. Offline mode means it doesn't make network requests (we don't want CI to fail because some external site is temporarily down). ~5 s.

What we deliberately skip in v0.1 (revisit later):
- **Lighthouse CI** — would add 30–60 s and produce flaky failures on tiny perf regressions. Add once the site is stable.
- **HTML validation (`html-validate`)** — Astro's output is generally valid; adding a strict validator can flag false positives. Add if/when an issue surfaces.
- **Visual regression tests** — overkill for a 5-page site.
- **End-to-end tests** — no interactive features to test in v0.1 (form is mocked).

Total CI time target: under 90 seconds.

---

## 5. Analytics — recommendation

You asked: self-hosted possible? Google Analytics? Options:

| Option | GDPR-friendly | Cookies | Cost | Setup effort |
|---|---|---|---|---|
| **Cloudflare Web Analytics** | yes | no | free | low (already need Cloudflare for Worker in v1.0) |
| Plausible (hosted) | yes | no | ~9 USD/mo | low |
| Plausible (self-hosted) | yes | no | "free" + VPS (~150 CZK/mo) + your time | high — needs Docker, updates, backups |
| Umami (self-hosted) | yes | no | same as Plausible self-host | high |
| GoatCounter (hosted free tier) | yes | no | free for personal | low |
| Google Analytics 4 | **no** | yes (or kludged consentless mode) | free | low setup, **high legal+UX cost** (cookie banner) |
| Nothing | n/a | n/a | n/a | n/a |

**Recommendation:**
- **v0.1: nothing.** Site is hidden behind a staging URL with `noindex` — no point in analytics.
- **v1.0: Cloudflare Web Analytics.** Free, cookieless, no consent banner needed, integrates with the Cloudflare account that will already exist for the Worker. The script is a single `<script>` tag in `BaseLayout.astro` controlled by an env flag.

Avoid Google Analytics. For a Czech therapy practice, the cookie consent banner is bad UX and the data-to-Google story doesn't fit the tone.

Self-hosting Plausible/Umami is technically possible but the maintenance overhead (Docker, patches, backups, VPS cost) is not worth it for this traffic volume. Cloudflare Web Analytics gives you the same outcome with zero ops.

---

## 6. File-by-file deliverable list

Check each off as v0.1 implementation progresses.

### Repo root
- [ ] `package.json` (pnpm + Astro deps)
- [ ] `pnpm-lock.yaml`
- [ ] `astro.config.mjs`
- [ ] `tsconfig.json`
- [ ] `.gitignore` (incl. `.env`, `.env.*` except `.env.example`, `dist/`, `node_modules/`, `.astro/`)
- [ ] `.env.example`
- [ ] `README.md` (how to dev, build, deploy)

### CI
- [ ] `.github/workflows/deploy.yml`

### Astro source
- [ ] `src/content/config.ts`
- [ ] `src/styles/tokens.css`
- [ ] `src/styles/global.css`
- [ ] `src/styles/fonts.css` (font-face declarations)
- [ ] `src/layouts/BaseLayout.astro`
- [ ] `src/components/Nav.astro`
- [ ] `src/components/Footer.astro`
- [ ] `src/components/Hero.astro`
- [ ] `src/components/SectionHeading.astro`
- [ ] `src/components/ServiceCard.astro`
- [ ] `src/components/ServiceDetail.astro`
- [ ] `src/components/PricingTable.astro`
- [ ] `src/components/ContactForm.astro`
- [ ] `src/components/StagingNotice.astro` (the "testovací verze" banner — remove for v1.0)

### Pages
- [ ] `src/pages/index.astro`
- [ ] `src/pages/pribeh.astro`
- [ ] `src/pages/sluzby/psychoterapie.astro`
- [ ] `src/pages/sluzby/poradenstvi-pro-rodice.astro`
- [ ] `src/pages/sluzby/lesni-terapie.astro`
- [ ] `src/pages/obchodni-podminky.astro`
- [ ] `src/pages/404.astro`

### Markdown content
- [ ] `src/content/pribeh.md`
- [ ] `src/content/sluzby/psychoterapie.md`
- [ ] `src/content/sluzby/poradenstvi-pro-rodice.md`
- [ ] `src/content/sluzby/lesni-terapie.md` (placeholder)
- [ ] `src/content/obchodni-podminky.md` (draft, see §9)

### Assets in `public/`
- [ ] `public/fonts/*.woff2` (Cormorant Garamond + Manrope, Latin Extended A subset)
- [ ] `public/images/portrait.jpg` (bara.jpg downloaded — see §9)
- [ ] `public/images/*` (3–5 mood/background images from Unsplash)
- [ ] `public/favicon.svg` (simple custom mark)
- [ ] `public/robots.txt` (blocks crawling for v0.1)

### Documentation
- [x] `PLAN.md`
- [x] `IMPLEMENTATION-PLAN.md` (this file)
- [ ] `IMAGES.md` (provenance log: URL + photographer + license per image)

---

## 7. Implementation order

Each step has a verifiable stopping point. Don't proceed if the previous step is broken.

| # | Step | Verify |
|---|---|---|
| 1 | Scaffold Astro with the exact command in `PLAN.md` §3 | `pnpm dev` shows default Astro page on `localhost:4321/<repo>/` |
| 2 | Configure `astro.config.mjs` with `base: '/<repo>'`, add `.gitignore`, `.env.example`, `README.md` | local dev still works |
| 3 | Write `deploy.yml` (with the CI checks from §4) | commit, push, GitHub Actions build job green on PR |
| 4 | Confirm GH Pages serves the blank Astro page at the staging URL | curl returns 200 |
| 5 | Self-host fonts (`@fontsource` packages or manual woff2), write `tokens.css`, `fonts.css`, `global.css` | typography test page renders correctly with Czech diacritics |
| 6 | Build `BaseLayout`, `Nav`, `Footer`, `SectionHeading` | hello-world page with full chrome looks right |
| 7 | Build `Hero` component for the homepage | hero renders portrait + welcome copy |
| 8 | Build `ServiceCard`, render 3 cards on the homepage | three cards link to (still empty) `/sluzby/*` pages |
| 9 | Build content collection + `ServiceDetail` + the 3 service detail pages, fill in PDF content for psychoterapie and poradenství; Lesní terapie gets "připravujeme" placeholder | three URLs render markdown content correctly |
| 10 | Build `pribeh.astro` page from PDF "MŮJ PŘÍBĚH" section | bio renders with education/experience |
| 11 | Build `PricingTable` and Ceník section on homepage | numbers from PDF render in a clear table |
| 12 | Build mock `ContactForm` per §2 + `StagingNotice` above it | submit triggers fake "děkujeme" state, no network request |
| 13 | Fetch and place portrait image (`bara.jpg` from existing site) | image loads, displays on hero |
| 14 | Source 3–5 mood images from Unsplash, optimize, log in `IMAGES.md` | images appear, total page weight reasonable |
| 15 | Generate Obchodní podmínky draft (see §9) | renders on `/obchodni-podminky` |
| 16 | Run Lighthouse locally; fix obvious a11y / perf issues | a11y ≥95, perf ≥90 on mobile profile |
| 17 | Open PR with everything, merge to main, deploy goes live | staging URL serves the full site |
| 18 | Send staging URL to Barbora for review | feedback collected |

Estimated effort: ~1 focused day for steps 1–17, plus iteration time after feedback.

---

## 8. Technical specifications

### 8.1. Performance budget

- HTML: < 50 KB per page (gzipped)
- CSS: < 30 KB total
- JS: < 10 KB (form handler only)
- Fonts: subset to Latin Extended A (covers Czech), < 80 KB total across all weights
- Images: AVIF + WebP fallback, hero image < 200 KB
- Lighthouse mobile performance: ≥ 90
- Lighthouse accessibility: ≥ 95

### 8.2. Browser support

- Last 2 versions of Chrome, Firefox, Safari, Edge
- iOS Safari 15+
- No IE, no legacy Edge

### 8.3. Responsive breakpoints

- Mobile: `< 640px` — single column, stacked nav becomes hamburger
- Tablet: `640–1024px` — some 2-column sections
- Desktop: `> 1024px` — full layout, 3-card row, side-by-side hero

### 8.4. Czech typography (fonts)

Self-host via `@fontsource/cormorant-garamond` and `@fontsource/manrope` npm packages.

Subset: Latin + Latin Extended A. Czech needs: `á č ď é ě í ň ó ř š ť ú ů ý ž` (plus uppercase). Latin Extended A covers all of them.

Font weights to ship:
- Cormorant Garamond: 400 (regular), 500 (medium), 600 (semibold). Italic 400 for emphasis.
- Manrope: 400, 500, 600.

Total font weight: ~75 KB after subsetting + woff2 compression.

Font declarations:

```css
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/cormorant-garamond-400-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
```

(`unicode-range` ensures browsers only download the Czech subset when needed.)

### 8.5. Color contrast verification

Already validated:
- Ink `#2A2A28` on cream `#F7F2EA`: ~15:1 — AAA pass for body text ✓
- Sage `#5C6B4E` on cream `#F7F2EA`: ~5.6:1 — AA pass for normal text, AAA for large ✓
- Terracotta `#B96F4C` on cream: ~3.8:1 — AA for large text only (use for headings/CTAs, not small text)

Body text uses ink. Headings use sage or ink. Terracotta only as accent on large text, links (with underline), or buttons (where contrast is established by the button background, not the text color).

### 8.6. Form validation (client-side, v0.1)

Fields:
- `name` — required, 1–200 chars
- `email` — required, max 320 chars, matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `message` — required, 1–5000 chars
- `hp` — honeypot, hidden, must be empty

Error messages in Czech, displayed inline below each field:
- *"Prosím vyplňte své jméno."*
- *"Zadejte prosím platnou e‑mailovou adresu."*
- *"Napište prosím krátkou zprávu."*

These are the same field names + validation rules the v1.0 Worker expects, so no rewrite when we wire the real backend.

### 8.7. Pricing table content

From the PDF (verbatim numbers):

| Typ konzultace | Délka | Cena |
|---|---|---|
| Individuální (osobně nebo online) | 60 min | 1 100 Kč |
| Individuální (osobně nebo online) | 90 min | 1 600 Kč |
| Individuální nebo lesní terapie (Dobříkov u Chocně) | 60 min | 1 000 Kč |
| Individuální nebo lesní terapie (Dobříkov u Chocně) | 90 min | 1 500 Kč |
| Individuální nebo lesní terapie (Dobříkov u Chocně) | 2 hod | 2 000 Kč |

Below the table: payment methods (V hotovosti / Převodem / QR kódem), storno podmínky, příspěvky od pojišťoven, GDPR note. Each as its own subsection.

### 8.8. Navigation

Top nav (sticky after scroll past hero):
- Logo / name *"Mgr. Barbora Zárubová"* → links to `/`
- "Vítejte" → `#vitejte` (homepage anchor)
- "Co nabízím" → `#sluzby`
- "Můj příběh" → `/pribeh`
- "Ceník" → `#cenik`
- "Kontakt" → `#kontakt`

Mobile (`< 640px`): hamburger button opens a full-height drawer with the same links.

### 8.9. Footer

- Name: *Mgr. Barbora Zárubová*
- IČO: 87665565
- Email + phone (linked: `mailto:` and `tel:`)
- "Členka [České asociace pro psychoterapii](https://czap.cz/)"
- "Ve své praxi ctím [Etický kodex ČAP](https://czap.cz/eticky-kodex/)"
- Link: "Obchodní podmínky" → `/obchodni-podminky`
- Copyright current year
- Tiny line: "© 2026 Barbora Zárubová" (year auto-generated from build date)

### 8.10. SEO / meta (v0.1)

- `<title>` per page: `Mgr. Barbora Zárubová — Psychoterapie a psychologické poradenství` (homepage), customized per page.
- `<meta name="description">` per page, ~150 chars.
- Open Graph image: portrait or hero image.
- `<meta name="robots" content="noindex,nofollow">` on v0.1 (removed in v1.0).
- JSON-LD `Person` + `LocalBusiness` schema — prepare in v0.1, will be picked up by search engines once we remove noindex.

---

## 9. Content tasks

### 9.1. PDF transcription

All content from `webovky.pdf` goes into the codebase. Most into markdown files; structural content (pricing table, contact form labels) into Astro components directly.

Mapping:
- PDF "VÍTEJTE" → homepage hero + "nabízím vám" list, in `index.astro`
- PDF "CO NABÍZÍM" → 3 service cards (homepage) + 3 service detail pages (`src/content/sluzby/*.md`)
- PDF "PSYCHOTERAPIE jako návrat k sobě" → `src/content/sluzby/psychoterapie.md`
- PDF "PSYCHOLOGICKÉ PORADENSTVÍ PRO RODIČE" → `src/content/sluzby/poradenstvi-pro-rodice.md`
- PDF "LESNÍ TERAPIE jako lázeň pro duši i tělo" → placeholder text *"Obsah připravujeme. Pro více informací mě prosím kontaktujte."* in `src/content/sluzby/lesni-terapie.md`
- PDF "MŮJ PŘÍBĚH" + Vzdělání + Profesní zkušenosti → `src/content/pribeh.md`
- PDF "CENÍK A PODMÍNKY" → `index.astro` ceník section + `PricingTable` component
- PDF "KONTAKT" → `index.astro` kontakt section + `ContactForm` component + map embed (mapy.cz iframe pointing at Kostelní 94, Pardubice)

### 9.2. Obchodní podmínky draft

The PDF mentions this but provides no content. I'll generate a draft based on common patterns in Czech psychotherapist sites (the inspiration sites), covering:
- Provider identity (Mgr. Barbora Zárubová, IČO)
- Scope of services (psychoterapie, psychologické poradenství, lesní terapie)
- Pricing and payment (mirror §8.7)
- Cancellation policy (mirror PDF: 24h notice, 50% storno fee)
- Confidentiality (GDPR + supervision)
- Disclaimer (not medical care per §372/2011)
- Contact for complaints
- Effective date

Marked clearly in the file as "DRAFT — k revizi Barborou". Renders on `/obchodni-podminky`.

### 9.3. Portrait image

Download `https://www.psychoterapie-zarubova.cz/pics/bara.jpg` into `public/images/portrait.jpg`. Log in `IMAGES.md` as "reused from existing site, will be replaced". Use Astro's `<Image>` component to auto-generate AVIF + WebP variants at build time.

### 9.4. Mood / background imagery

Source 3–5 images from Unsplash matching the §1 aesthetic of `PLAN.md`. Search terms: *forest light morning*, *linen warm texture*, *path through trees*, *hands ceramic mug*, *botanical line drawing*. Each logged in `IMAGES.md` with source URL, photographer, Unsplash license.

---

## 10. Backlog — v1.0 and beyond

Tracked so nothing gets lost. **None of these are v0.1.**

### v1.0 — production launch
- [ ] Domain cutover to `psychoterapie-zarubova.cz` (see §11)
- [ ] Resend signup + sending-domain verification (SPF + DKIM records at registrar)
- [ ] Cloudflare Worker deployed (`worker/` per `PLAN.md` §7)
- [ ] Real `PUBLIC_CONTACT_ENDPOINT` set as GitHub Actions variable
- [ ] Swap mock form submit for real `fetch()` to Worker
- [ ] Remove `<meta name="robots" content="noindex,nofollow">`
- [ ] Replace `public/robots.txt` with permissive rules + sitemap reference
- [ ] Astro auto-sitemap integration
- [ ] Remove `StagingNotice` component from `ContactForm`
- [ ] Branch protection on `main` (require PR + green check)
- [ ] `PULL_REQUEST_TEMPLATE.md` + `CODEOWNERS`
- [ ] Cloudflare Web Analytics script in `BaseLayout`
- [ ] Update `astro.config.mjs`: `site: 'https://psychoterapie-zarubova.cz'`, remove `base`
- [ ] Create `public/CNAME` with `psychoterapie-zarubova.cz` (no trailing newline)

### v1.x — Barbora self-edits
- [ ] Set Barbora up with a GitHub account (if she doesn't have one)
- [ ] Walk her through the GitHub web-UI editing flow: navigate to `src/content/*.md` → pencil icon → edit → "Propose changes" → opens PR
- [ ] Add her as a collaborator with write access
- [ ] Optional: add a CMS layer (e.g. Decap CMS, Sveltia CMS) if raw markdown editing proves too clunky for her. This is a v1.x decision, not pre-decided.

### Nice-to-have / parking lot
- [ ] Updated portrait photo (Barbora to provide a professional one)
- [ ] Barbora reviews and edits the Obchodní podmínky draft
- [ ] Lesní terapie real content (when Barbora finalizes it)
- [ ] Mapy.cz embed on contact section
- [ ] Lighthouse CI in `deploy.yml`
- [ ] Visual regression CI (Percy / Chromatic) if iteration speed becomes a problem
- [ ] OG image generation per page (currently shared)
- [ ] `hreflang` if English version is ever added (not planned)
- [ ] Newsletter signup if Barbora ever wants one

---

## 11. Domain cutover plan (for v1.0, NOT now)

The domain `psychoterapie-zarubova.cz` is currently serving the existing site. Moving it to GitHub Pages is a coordinated DNS change. **Don't do this until v0.1 is approved and Barbora is ready to switch.**

### 11.1. Before touching anything
1. Identify the current host (registrar dashboard → DNS, or `dig` queries).
2. Screenshot **every** current DNS record. Especially MX, SPF, DKIM — Barbora's email (`barbora.zarubova@seznam.cz`) is on a different domain so MX records may or may not exist on `psychoterapie-zarubova.cz`. Still: don't assume, verify.
3. Note TTLs; reduce TTLs on records that will change to 300s a few hours in advance for faster rollback if needed.

### 11.2. Switchover
1. At registrar, replace the existing `@` A record(s) with the 4 GitHub Pages apex IPs (per `PLAN.md` §6.2).
2. Replace the existing `www` CNAME (or A record) with `<owner>.github.io.`
3. **Leave MX records alone** unless we're explicitly migrating email too (not planned for v1.0).
4. If Resend will be used to send from `kontakt@psychoterapie-zarubova.cz`, add Resend's SPF + DKIM records here too (Resend dashboard tells you exactly what to add). MX is optional unless you want replies to that address to land in an inbox.
5. Wait for DNS propagation (`dig +short psychoterapie-zarubova.cz` returns the GitHub IPs).
6. In repo: update `astro.config.mjs` (remove `base`, set `site`), add `public/CNAME`, remove `<meta name="robots" content="noindex">`, replace `public/robots.txt`.
7. GitHub → Settings → Pages → Custom domain → `psychoterapie-zarubova.cz` → Save.
8. Wait for "DNS check successful". Tick **Enforce HTTPS**.
9. Verify per `PLAN.md` §13 (Phase 2 checks).

### 11.3. Risk + rollback
- **Risk**: misconfigured DNS breaks Barbora's email (if MX is on this domain) or takes the site down for a propagation window.
- **Mitigation**: low TTLs ahead of cutover, screenshots of existing records, do it during quiet hours.
- **Rollback**: restore original A/CNAME records from screenshots. With 300s TTL, recovery is ~10 minutes worst case.

---

## 12. Repository coordinates (resolved)

- **GitHub owner**: `ochaloup`
- **Repo name**: `psychoterapie-zarubova`
- **Staging URL** (v0.1): `https://ochaloup.github.io/psychoterapie-zarubova/`
- **Production URL** (v1.0): `https://psychoterapie-zarubova.cz/`
- **Local directory**: `/home/chalda/my-testing/psychoterapie-zarubova` (renamed from `web-bara` by the user before the implementation session starts)

**Pre-session state — what's already done:**
- GitHub repo exists at `git@github.com:ochaloup/psychoterapie-zarubova.git` (empty, no commits pushed).
- Local `origin` remote already points at the new URL.
- Local directory has: `PLAN.md`, `IMPLEMENTATION-PLAN.md`, `TODO.md`, `webovky.pdf`. Git initialized, no commits yet.

No remaining open questions. Proceed to §7 step 1 (scaffold Astro).

---

## 13. Files in this repo (current)

- `PLAN.md` — architecture, decisions, deployment playbook.
- `IMPLEMENTATION-PLAN.md` — this file. v0.1 execution detail.
- `TODO.md` — original brief.
- `webovky.pdf` — content source.
- `IMAGES.md` — created at step 13 of §7, tracks image provenance.
- `README.md` — created at step 2 of §7, dev/build/deploy instructions.
