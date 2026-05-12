# GH-PAGES-HOWTO

Deployment playbook for the psychotherapist site (Astro + GitHub Pages + custom domain + contact-form email via Cloudflare Worker + Resend, plus a markdown-PR build-and-publish workflow).

This document is written to be consumed by another Claude worker. It lists what the worker can do autonomously, what the human must do (DNS at registrar, accept API keys, click some GitHub Settings buttons), and verification steps after each phase. Do **not** skip the verification steps — most failure modes here are config drift that only surface at the next phase.

Working directory: `/home/chalda/my-testing/web-bara`
Stack already chosen in `PLAN.md`: **Astro + pnpm + plain CSS**. Do not change this.
Site language: Czech. UI strings, page titles, and form labels must be Czech. Code identifiers stay English.

---

## 0. Architecture overview

```
                  ┌───────────────────────────────────────────┐
                  │  GitHub repo (private or public)          │
                  │                                           │
                  │  src/content/*.md   ←  edited via PR      │
                  │  src/pages/*.astro                        │
                  │  .github/workflows/deploy.yml             │
                  └───────────────────┬───────────────────────┘
                                      │  push to main
                                      ▼
                  ┌───────────────────────────────────────────┐
                  │  GitHub Actions: pnpm build → dist/       │
                  │  actions/deploy-pages@v4                  │
                  └───────────────────┬───────────────────────┘
                                      ▼
                  ┌───────────────────────────────────────────┐
                  │  GitHub Pages CDN                         │
                  │  served at https://<custom-domain>        │
                  └───────────────────┬───────────────────────┘
                                      │  contact form submit (fetch POST)
                                      ▼
                  ┌───────────────────────────────────────────┐
                  │  Cloudflare Worker (workers.dev subdomain)│
                  │  validates + rate-limits + calls Resend   │
                  └───────────────────┬───────────────────────┘
                                      ▼
                  ┌───────────────────────────────────────────┐
                  │  Resend API → therapist inbox             │
                  └───────────────────────────────────────────┘
```

Total recurring cost: **domain only** (~250–400 CZK / year). Everything else stays on free tiers.

---

## 1. Prerequisites — human-only tasks

The worker **cannot** do these. Before starting, ask the user to confirm each item is done and to paste the resulting identifiers/secrets into the conversation. List them up front, don't trickle requests one at a time.

| # | Task | Output needed |
|---|---|---|
| 1 | Buy domain (e.g. `barborazarubova.cz`). Suggested registrars: Forpsi, Wedos, Active24 (CZ); Namecheap, Porkbun, Cloudflare Registrar (international). | Domain name |
| 2 | Create GitHub repo (public is fine; private requires GitHub Pro for Pages). Confirm GitHub username and repo name. | `<owner>/<repo>` |
| 3 | Sign up at https://resend.com (free tier). Create an API key. | `RESEND_API_KEY` |
| 4 | Sign up at https://cloudflare.com (free). Even if DNS stays at the registrar, Cloudflare account is needed to deploy the Worker. | Cloudflare account email |
| 5 | Decide therapist's inbox address (where contact-form emails land). | `CONTACT_TO_EMAIL` |
| 6 | Decide sender address on the custom domain (e.g. `kontakt@barborazarubova.cz`). Resend needs a verified domain to send from this. | `CONTACT_FROM_EMAIL` |

Do **not** start Phase 2 (custom domain) until item 1 is confirmed. Do **not** start Phase 3 (Worker) until items 3–6 are confirmed.

---

## 2. Phase 1 — Scaffold Astro and ship a blank deploy

Goal: a blank Astro page live at `https://<owner>.github.io/<repo>/` before doing anything else. This proves the build + deploy pipeline works before any complexity is added.

### 2.1. Scaffold

Run in the working directory. Use pnpm.

```
pnpm create astro@latest . --template minimal --typescript strict --no-install --no-git
pnpm install
```

If `create astro` complains about non-empty directory, pass `--force` after confirming with the user (the directory contains `PLAN.md`, `TODO.md`, `webovky.pdf`, `GH-PAGES-HOWTO.md` — none should be overwritten by Astro's scaffold, but verify the diff before committing).

### 2.2. Configure Astro for GitHub Pages

Edit `astro.config.mjs`:

```
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://<owner>.github.io',
  base: '/<repo>',
  trailingSlash: 'ignore',
})
```

Once a custom domain is attached (Phase 2), `site` becomes `https://barborazarubova.cz` and `base` is removed. Note this in code as a TODO so the next phase can find it.

### 2.3. GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```
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

The build runs on PRs (catches errors) but only main deploys.

### 2.4. First commit + ask user to push

```
git add -A
git commit -m "scaffold Astro site with GitHub Pages workflow"
```

**Do not push.** Ask the user to push (`git push -u origin main`) — the worker must not run remote-writing git commands per the user's standing instruction in `~/.claude/CLAUDE.md`.

### 2.5. User does in GitHub UI (ask them, with exact path)

- Repo → Settings → Pages → Source → **GitHub Actions** (not "Deploy from a branch").
- Repo → Actions → enable workflows if prompted.

### 2.6. Verification

- Action run is green in `Actions` tab.
- `https://<owner>.github.io/<repo>/` returns 200 with the blank Astro page.

If 404: source likely still set to "Deploy from branch". If build fails on `pnpm install`: lockfile mismatch — re-run `pnpm install` locally, commit, ask user to push.

---

## 3. Phase 2 — Custom domain

Assume the domain is `barborazarubova.cz`. Replace throughout if different.

### 3.1. Decide apex vs www

Recommend **apex** (`barborazarubova.cz`) as the canonical URL with `www.barborazarubova.cz` redirecting to it. GitHub Pages serves both and issues an HTTPS certificate for both automatically once DNS resolves.

### 3.2. DNS records — user must add at the registrar

GitHub's apex IPs (verify against https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site — these are stable but should be cross-checked at execution time):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Records to add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | 185.199.108.153 | 3600 |
| A | `@` | 185.199.109.153 | 3600 |
| A | `@` | 185.199.110.153 | 3600 |
| A | `@` | 185.199.111.153 | 3600 |
| CNAME | `www` | `<owner>.github.io.` | 3600 |

The worker writes a clean copy-paste block for the user (no markdown formatting on the actual records — the user will paste these one row at a time into their registrar UI). Tell the user to remove any existing conflicting A or CNAME records on `@` and `www` first.

DNS propagation: typically minutes, occasionally up to 24 h. Use `dig +short barborazarubova.cz` and `dig +short www.barborazarubova.cz` to verify. Do not proceed until both resolve correctly.

### 3.3. Add CNAME file to the site

Create `public/CNAME` with one line, no trailing newline:

```
barborazarubova.cz
```

Astro copies `public/` verbatim into `dist/`. This file tells GitHub Pages the canonical host. **Required** — without it, deploys can wipe the custom-domain setting on each push.

### 3.4. Update astro.config.mjs

```
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://barborazarubova.cz',
  trailingSlash: 'ignore',
})
```

Remove the `base` option entirely (apex domain serves from `/`).

### 3.5. User does in GitHub UI

- Repo → Settings → Pages → Custom domain → enter `barborazarubova.cz` → Save.
- Wait until "DNS check successful" appears (refresh every ~30 s).
- Tick **Enforce HTTPS**. This greys out for up to ~15 min while GitHub provisions the Let's Encrypt cert. Do not proceed until enforced.

### 3.6. Commit, ask user to push

```
git add public/CNAME astro.config.mjs
git commit -m "configure custom domain barborazarubova.cz"
```

### 3.7. Verification

- `curl -I https://barborazarubova.cz` returns 200, `server: GitHub.com`.
- `curl -I http://barborazarubova.cz` returns 301 → https.
- `curl -I https://www.barborazarubova.cz` returns 301 → apex.
- Browser shows valid cert, no mixed-content warnings.

---

## 4. Phase 3 — Contact form via Cloudflare Worker + Resend

### 4.1. Verify the sending domain in Resend

User-side:

1. Resend dashboard → Domains → Add Domain → `barborazarubova.cz`.
2. Resend gives ~3 DNS records (SPF, DKIM, optionally MX for replies). User adds them at the registrar alongside the GitHub A records — they don't conflict.
3. Wait for Resend dashboard to show "Verified" (usually minutes).

Without this, Resend will only let the account send to its own signup email. **Don't skip.**

### 4.2. Worker code

Create a separate folder (worker is its own deployable). Recommended layout: keep the Worker in the same repo under `worker/`, so the site code and email code are versioned together but deployed separately.

```
mkdir -p worker
cd worker
pnpm init
pnpm add -D wrangler typescript @cloudflare/workers-types
```

`worker/wrangler.toml`:

```
name = "barborazarubova-contact"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ALLOWED_ORIGIN = "https://barborazarubova.cz"
CONTACT_TO_EMAIL = "REPLACE_WITH_THERAPIST_INBOX"
CONTACT_FROM_EMAIL = "kontakt@barborazarubova.cz"
```

`worker/src/index.ts`:

```
export interface Env {
  RESEND_API_KEY: string
  ALLOWED_ORIGIN: string
  CONTACT_TO_EMAIL: string
  CONTACT_FROM_EMAIL: string
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

Notes:
- Strict origin check **and** explicit CORS header — both required, neither sufficient alone.
- Honeypot field (`hp`) accepted silently to avoid telling bots they've been caught.
- `reply_to` set to the visitor's email so the therapist can reply directly.
- Server-side length and email-shape validation. Don't trust client validation.

### 4.3. Set secrets and deploy

User-side commands (worker can guide step-by-step but the user runs them, since they involve their Cloudflare login):

```
cd worker
pnpm exec wrangler login
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler deploy
```

`wrangler deploy` prints the Worker URL, something like `https://barborazarubova-contact.<account-subdomain>.workers.dev`. Capture it — the site needs it.

### 4.4. Rate limiting (do this, not optional)

Cloudflare's free tier includes one rate-limiting rule per zone. **However**, that requires the Worker to live on a custom domain route, which requires the site to use Cloudflare DNS. Two paths:

- **(A) Stay on workers.dev** — no built-in rate limit. Mitigate in-Worker with a KV-based counter (10 req / IP / hour). Adds a KV namespace. Acceptable for a low-traffic personal site.
- **(B) Move DNS to Cloudflare** — free, gains CDN/DDoS/rate-limit. Required if you want clean `api.barborazarubova.cz` URL and per-zone rate limiting. The domain's nameservers change at the registrar; existing A records (incl. GitHub Pages IPs) are mirrored into Cloudflare DNS first.

Default to **(A)** unless the user explicitly wants (B). Keep this decision visible to the user, don't pick silently.

If (A): add to `worker/src/index.ts` after the origin check, before validation:

```
const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
const key = `rl:${ip}`
const count = parseInt((await env.RL.get(key)) ?? '0', 10)
if (count >= 10) return bad(429, 'rate_limited', origin)
await env.RL.put(key, String(count + 1), { expirationTtl: 3600 })
```

And bind a KV namespace in `wrangler.toml`:

```
[[kv_namespaces]]
binding = "RL"
id = "REPLACE_AFTER_wrangler_kv_namespace_create"
```

Create it with `pnpm exec wrangler kv namespace create RL` (user runs), paste the id.

### 4.5. Wire up the form in Astro

In `src/components/ContactForm.astro`, the form posts to the Worker URL (store as a build-time env var). Add to `.env`:

```
PUBLIC_CONTACT_ENDPOINT=https://barborazarubova-contact.<account-subdomain>.workers.dev
```

`PUBLIC_` prefix makes it accessible in client-side code via `import.meta.env.PUBLIC_CONTACT_ENDPOINT`. The endpoint URL is not a secret (browsers will see it anyway) — it's only env-var'd to avoid hardcoding.

Also add this env var as a repo secret/variable in GitHub: Settings → Secrets and variables → Actions → Variables (not Secrets, since it's not sensitive) → `PUBLIC_CONTACT_ENDPOINT`. Then in `deploy.yml`'s build step:

```
      - run: pnpm build
        env:
          PUBLIC_CONTACT_ENDPOINT: ${{ vars.PUBLIC_CONTACT_ENDPOINT }}
```

Form must include a hidden honeypot input named `hp`:

```
<input type="text" name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" />
```

Client-side submit handler: `fetch(import.meta.env.PUBLIC_CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message, hp }) })`. Show Czech success / error states. Disable button while in-flight.

### 4.6. Verification

- `curl -X OPTIONS https://barborazarubova-contact.<sub>.workers.dev -H "Origin: https://barborazarubova.cz" -i` → 204 with CORS headers.
- Same URL with wrong Origin → 403.
- Submit the form from the live site → email arrives in the therapist inbox, with `reply_to` set so reply goes to the visitor.
- Submit with `hp` populated → returns ok but no email is sent.
- (If rate limit installed) Submit 11 times in an hour from same IP → 11th returns 429.

---

## 5. Phase 4 — Markdown-PR build-and-publish workflow

The PR workflow piece is already mostly handled by `deploy.yml` (build runs on PRs, deploy runs only on main). What's left is making it actually safe and pleasant for non-Claude editors to use.

### 5.1. Content collections — markdown lives here

In Astro, configure content collections so markdown files have a typed schema. `src/content/config.ts`:

```
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

Editors create / edit files like `src/content/sluzby/psychoterapie.md`:

```
---
title: "Psychoterapie"
summary: "Krátký popis."
order: 1
---

Tady je obsah v markdownu...
```

The frontmatter is validated at build time. A missing field fails the build → fails the PR check → can't be merged. This is the safety net.

### 5.2. Branch protection — ask user to enable

In GitHub UI:

- Repo → Settings → Branches → Add branch protection rule → `main`
- Require a pull request before merging (yes)
- Require status checks to pass: select **build** (the job from `deploy.yml`)
- Require branches to be up to date before merging (yes)
- Optionally: require linear history, require signed commits

Without this, anyone with write access could push directly to main and bypass the build check.

### 5.3. PR template

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```
## Co se mění

-

## Checklist

- [ ] Build prošel (zelená fajfka u PR)
- [ ] Texty zkontrolovány (překlepy, diakritika)
- [ ] Změny dávají smysl pro běžného návštěvníka
```

### 5.4. CODEOWNERS

Create `.github/CODEOWNERS`:

```
src/content/**     @<owner>
src/pages/**       @<owner>
worker/**          @<owner>
.github/**         @<owner>
```

Auto-assigns review on PRs touching these paths. With one-person operation this is mostly future-proofing; useful if a copy-editor collaborator is added later.

### 5.5. Optional — PR preview deploys

GitHub Pages serves only one branch per repo (the artifact from the deploy job). True PR previews require a different host (Cloudflare Pages, Netlify, Vercel) or a separate repo per PR.

Recommend **skipping previews for v1**. Local `pnpm dev` is enough for content editors during PR review. Revisit if it becomes a friction point.

### 5.6. Verification

- Open a PR that adds an invalid frontmatter field (e.g. missing `title`). The build job fails. PR cannot merge.
- Open a PR that adds a valid markdown file. Build job passes. Merge to main triggers the deploy job. New page is live within ~1 min.
- Try to push to main directly → rejected by branch protection.

---

## 6. Verification matrix — run all of these before declaring done

| Check | Command / action | Expected |
|---|---|---|
| Apex resolves to GH Pages IPs | `dig +short barborazarubova.cz` | 4 lines, 185.199.108–111.153 |
| www CNAME to GH user site | `dig +short www.barborazarubova.cz` | `<owner>.github.io.` |
| HTTPS works on apex | `curl -I https://barborazarubova.cz` | 200, GH server |
| HTTPS works on www | `curl -I https://www.barborazarubova.cz` | 301 → apex |
| HTTP redirects to HTTPS | `curl -I http://barborazarubova.cz` | 301 → https |
| Pages build succeeds | latest Actions run | green |
| Worker rejects unknown origin | `curl -X POST <worker> -H "Origin: https://evil.example"` | 403 |
| Worker accepts site origin | curl with correct Origin and valid JSON | 200, email arrives |
| Honeypot silently drops | curl with `hp: "x"` | 200 returned, no email arrives |
| Resend domain verified | Resend dashboard | "Verified" badge |
| Branch protection enforced | attempt direct push to main from a clean clone | rejected |
| PR with invalid frontmatter fails | open such a PR | build red, merge blocked |

---

## 7. Things to NOT do

- **Don't** commit `RESEND_API_KEY`, `.env` with real keys, or Cloudflare tokens. `.env` must be in `.gitignore`. Only `PUBLIC_*` vars belong in client code.
- **Don't** set CORS to `*` on the Worker. Always pin to the site origin.
- **Don't** put the Worker URL inside the Worker code's `ALLOWED_ORIGIN` (typo trap — the origin is the **site**, not the Worker).
- **Don't** push to main without a PR once branch protection is on — even fixups go through PRs.
- **Don't** use `actions/configure-pages@v...` — `deploy-pages@v4` doesn't need it.
- **Don't** remove `public/CNAME` "to clean things up". Removing it on a deploy can revert the Pages custom-domain setting.
- **Don't** use `git push --force` to main, ever.
- **Don't** run `pnpm install` without `--frozen-lockfile` in CI; that masks lockfile drift.
- **Don't** add Google Fonts via `<link>` — fetches from Google servers, GDPR issue. Self-host woff2 in `public/fonts/` per `PLAN.md` §3.
- **Don't** skip the Resend domain verification. Sending from an unverified domain works for the account's own email only and will silently fail for any other recipient.

---

## 8. Secrets and variables — single source of truth

| Where | Name | Value source | Sensitive? |
|---|---|---|---|
| Cloudflare Worker secret | `RESEND_API_KEY` | Resend dashboard | **Yes** |
| Cloudflare Worker var | `ALLOWED_ORIGIN` | `https://barborazarubova.cz` | No |
| Cloudflare Worker var | `CONTACT_TO_EMAIL` | from user | Mildly (don't print in logs) |
| Cloudflare Worker var | `CONTACT_FROM_EMAIL` | `kontakt@barborazarubova.cz` | No |
| GitHub Actions variable | `PUBLIC_CONTACT_ENDPOINT` | workers.dev URL after deploy | No |
| Local `.env` | `PUBLIC_CONTACT_ENDPOINT` | same | No |
| `.gitignore` must include | `.env` and `.env.*` (except `.env.example`) | — | — |

Provide a `.env.example` checked into the repo with the variable names and dummy values, so future contributors know what to set.

---

## 9. Phasing summary — execution order

1. **Phase 1** — scaffold + deploy blank page to `<owner>.github.io/<repo>`. Stop. Verify green build and accessible URL.
2. **Phase 2** — buy domain (human), configure DNS (human), add `public/CNAME`, switch `astro.config.mjs`. Stop. Verify HTTPS works on apex and www.
3. **Phase 4** — branch protection, content collections, PR template. Stop. Verify PR with bad frontmatter fails.
4. **Build the actual site content per PLAN.md.** This howto does not cover that.
5. **Phase 3** — Resend domain verification (human), deploy Worker, wire form. Stop. Verify end-to-end email submission.

Phase 4 before Phase 3 is intentional: once content editing starts, the safety net should be in place. The Worker can be wired up after the site already has shape — the contact form is one component among many.

---

## 10. What to do when something breaks

- **Build fails on `pnpm install`**: lockfile drift. Run `pnpm install` locally, commit `pnpm-lock.yaml`.
- **Pages deploy succeeds but 404**: usually `base` mismatch in `astro.config.mjs` (custom domain set but `base: '/<repo>'` still there), or missing `public/CNAME`.
- **HTTPS cert won't enforce**: DNS not fully propagated, or A records incomplete. Wait, re-check with `dig`, re-save the custom-domain field in GH Settings.
- **Worker returns 403 on legit submit**: `Origin` header doesn't match `ALLOWED_ORIGIN`. Compare exactly — `http` vs `https`, trailing slash, www vs apex.
- **Email not arriving**: check Resend dashboard logs first. If 200 from Resend but no email: spam folder, then verify the sending domain is fully verified (SPF + DKIM both green).
- **Form submit succeeds in browser but no email**: honeypot field is being autofilled by browser password manager. Confirm `autocomplete="off"` and `tabindex="-1"`.

Always read the Actions log fully before reporting failure. Most issues say exactly what's wrong if you scroll.

---

End of plan.
