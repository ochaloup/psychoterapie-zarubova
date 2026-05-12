# PLAN — Webové stránky Mgr. Barbora Zárubová

Working document. Goal: agree on direction before implementation begins.

---

## 1. Aesthetic direction

**Recommendation: refined organic minimalism with editorial typography.**

Reasoning — the audience is women seeking therapy. The interface itself should feel like the "klidný a bezpečný prostor" the copy promises: lots of breathing room, slow rhythm, no visual noise. The therapist's work blends body / mind / spirituality / nature (forest therapy, walk & talk, women's circles), so the palette should sit in that earth-and-sacred-feminine register — but stripped of the floral / mandala / watercolor clichés that crowd this niche.

What that means concretely:

- **Palette**: warm off-white (`#F7F2EA`-ish) as base, deep sage / olive green as primary (`#5C6B4E`-ish), dusty terracotta or muted rose as accent (sparingly, for CTAs and emphasis), deep ink for body text (not pure black — `#2A2A28`). Two-tone hero feel rather than gradient soup.
- **Typography**: a characterful serif for display (Cormorant Garamond, Fraunces, or PP Editorial New — distinctive italics matter for Czech `š ě č ř ž`), paired with a humanist sans for body (Inter is too generic — prefer Söhne, General Sans, or a free option like Söhne-likes from Google: e.g. *Manrope* or *DM Sans*, or even keep it serif throughout with a smaller body serif).
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
/ (single page)
├── Hero — Vítejte
├── Co nabízím (3 services teaser)
├── Můj příběh (condensed; full version on /pribeh)
├── Ceník a podmínky
└── Kontakt + formulář
```

**Exception**: `/pribeh` as a separate page for the full bio + education + training + experience. The full version is long and not what most first-time visitors need; the homepage gets a 2–3 paragraph condensed version with a "číst celý příběh" link.

**Open design question from PDF** (your own note): "šlo by udělat 3 podskupiny anebo to spíš rozdělit na 3 odkazy v tom úvodu?" for *Co nabízím*.

My recommendation: **keep all three services on the homepage as a 3-card row**, each card linking to a dedicated detail page (`/sluzby/psychoterapie`, `/sluzby/poradenstvi-pro-rodice`, `/sluzby/lesni-terapie`). Best of both — visitors see the three offerings at a glance, but the homepage doesn't drown in detail. Lesní terapie content is also still "to ještě doplním" — a separate page lets you fill it in later without bloating the home.

So the final structure becomes:

```
/                              homepage (one-pager)
/pribeh                        full biography
/sluzby/psychoterapie          service detail
/sluzby/poradenstvi-pro-rodice service detail
/sluzby/lesni-terapie          service detail
/cenik                         optional — could live on homepage only
/kontakt                       optional — could live on homepage only
```

---

## 3. Tech stack

**Recommendation: Astro + plain CSS (no Tailwind).**

Why Astro:
- Component-based (matches "reusable components, manageable in future")
- Outputs pure static HTML/CSS — fast, perfect for GitHub Pages, no client-side framework runtime
- Markdown-friendly — `Můj příběh` and service pages can be markdown files the therapist can edit later
- TypeScript out of the box, Czech UTF-8 is fine
- First-class GitHub Pages deployment story

Why not Tailwind: this site has a strong, narrow visual language (one palette, ~5 typographic styles). Plain CSS with custom properties is shorter and easier to maintain than a Tailwind config + utility soup, and it keeps the codebase legible for non-frontend collaborators. CSS will be ~200 lines total.

Why not plain HTML: copy-pasting the nav/footer across 5+ pages is the kind of friction that compounds. Astro components solve it without adding any client JS.

If you'd prefer something simpler / more familiar, alternatives:
- **(B) 11ty** — same outcome, more "raw" templates. Lighter than Astro but less ergonomic.
- **(C) Plain HTML + small build script** — only sensible if you want zero dependencies.

Stack summary:
- **Framework**: Astro
- **Styling**: plain CSS with CSS custom properties + a small reset
- **Fonts**: self-hosted woff2 (better performance + GDPR-clean — no Google Fonts request to Google servers)
- **Forms**: Formspree or Web3Forms (free tier) — pure-HTML form posts to a third party that emails her. Avoids needing a backend.
- **Icons**: inline SVG, ~5 icons total
- **Analytics**: optional — Plausible or none (GDPR-friendly)

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
│   └── BaseLayout.astro          ← <head>, nav, footer, meta
├── components/
│   ├── Nav.astro
│   ├── Footer.astro
│   ├── Hero.astro
│   ├── ServiceCard.astro         ← reused 3× on home
│   ├── ServiceDetail.astro       ← reused on the 3 service pages
│   ├── PricingTable.astro
│   ├── ContactForm.astro
│   └── SectionHeading.astro      ← consistent heading style
├── content/                      ← markdown for editable text
│   ├── pribeh.md
│   └── sluzby/*.md
├── styles/
│   ├── tokens.css                ← colors, fonts, spacing (CSS vars)
│   └── global.css
└── public/
    ├── fonts/
    └── images/
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

## 5. GitHub Pages deployment

- Repo on GitHub; default branch `main`.
- GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on push to `main`: `pnpm install` → `pnpm build` → upload `dist/` artifact → deploy via the official `actions/deploy-pages@v4`.
- Settings → Pages → Source: "GitHub Actions".
- Custom domain optional. If you have one (e.g. `barborazarubova.cz`), add a `CNAME` file in `public/` and point DNS A records to GitHub's IPs.

Build is ~5 seconds. No secrets needed unless contact form requires an API key (Formspree endpoint is public; Web3Forms uses an access key that can be a public env var).

---

## 6. Images

We have no original photography yet. Plan:

1. **Reuse from psychoterapie-zarubova.cz** — only photos that are clearly hers (portrait of Barbora, Centrum Živa interior). Confirm she owns them.
2. **Stock photography from sources with permissive licenses** for background / mood imagery:
   - **Unsplash** (https://unsplash.com) — free for commercial use, no attribution required but encouraged
   - **Pexels** (https://pexels.com) — similar terms
   - **Picjumbo** for natural / Czech photographer aesthetic
3. For each image used, I'll keep `IMAGES.md` recording source URL, photographer, license — so we have a paper trail if anything changes.
4. Target search terms: *forest light Czech*, *linen texture warm*, *hands tea ceramic*, *path through woods morning*, *quiet room window light*, *botanical line drawing*. Avoid clichés (lotus flowers, mandalas, women-in-meditation-pose).
5. All raster images compressed to AVIF + WebP fallback at the build step. Astro has built-in `<Image>` for this.

Portrait photo of Barbora is the single highest-impact asset. If she can get one good professional photo taken (warm, natural light, looking off-camera or gentle smile, no clinical setting), it should anchor the hero.

---

## 7. Accessibility, SEO, legal

- WCAG AA contrast on all text. Sage on cream needs checking — may need to darken the sage for body copy.
- Semantic HTML (`<main>`, `<nav>`, `<article>`, headings in order).
- Czech `lang="cs"` on `<html>`.
- Meta: title, description, OG image per page. JSON-LD `Person` + `LocalBusiness` for SEO.
- Sitemap auto-generated by Astro.
- GDPR: no third-party fonts loaded from Google. If a contact form is used, the existing copy ("Odesláním formuláře souhlasíte se zpracováním údajů...") covers consent. No cookies unless analytics is added — and if so, prefer Plausible (no cookies, no consent banner needed).
- Footer: IČO 87665565, link to Etický kodex ČAP, link to ČAP membership page.

---

## 8. Open questions for you

Before implementation:

1. **Aesthetic direction**: (A) refined organic minimalism, (B) editorial magazine, (C) photo-driven monochrome — which?
2. **Service pages**: do you want full sub-pages for each of the 3 services, or all content on the home page?
3. **Lesní terapie** — copy is missing ("to ještě doplním"). Should we ship without it, ship with a "připravujeme" placeholder, or wait?
4. **Contact form**: Formspree / Web3Forms / just `mailto:` link? (Mailto is simpler but worse UX.)
5. **Domain**: are we publishing to `username.github.io/web-bara` (default) or a custom domain like `barborazarubova.cz`?
6. **Portrait photo**: does Barbora have a usable portrait, or should we plan around not having one initially?
7. **Analytics**: yes (Plausible) or no?
8. **Obchodní podmínky**: the PDF mentions this but has no content yet — wait for copy, or generate a draft she edits?

---

## 9. Next steps

Once decisions above are made, the implementation order is:

1. Scaffold Astro project, set up GitHub Actions deploy → confirm a blank page is live on GitHub Pages.
2. Build tokens, base layout, Nav, Footer, typography test page → confirm fonts and palette in browser.
3. Build homepage section by section: Hero → Co nabízím → Můj příběh (condensed) → Ceník → Kontakt.
4. Build /pribeh and the 3 /sluzby/* pages.
5. Wire up the contact form, test end-to-end.
6. Add images, run Lighthouse, fix any a11y/perf issues.
7. Final review with Barbora; iterate.

Estimated effort: ~1–2 focused days of work for the first publishable version, once the questions above are answered and assets (portrait, finalized Lesní terapie copy) are in hand.
