# DNS runbook — psychoterapie-zarubova.cz

Concrete DNS changes for the v1.0 launch, in execution order. Companion to `V1.0-TODO.md` (Phases 1, 2, 5) and `PLAN.md` §6.2. Written 2026-06-06 from live `dig` queries.

## Current state (verified 2026-06-06)

DNS is hosted at **Hukot** — the admin panel for these records is the Hukot/securitynet customer administration (the access Ondra is still waiting for).

| Type | Host | Current value | Meaning |
|---|---|---|---|
| NS | @ | `ns1.hukot.cz`, `ns3.hukot.cz`, `ns2.securitynet.cz` | zone hosted at Hukot |
| A | @ | `46.36.36.153`, `176.102.65.65` | old site hosting at Hukot |
| CNAME/A | www | resolves to the same two IPs | old site |
| MX | @ | `10 mail.hukot.net`, `100 mx2.securitynet.cz` | **inbound mail exists on this domain** |
| TXT | @ | `v=spf1 a mx include:spf.hukot.net ~all` | SPF for the Hukot mail |

> **⚠ MX warning:** the domain has live MX records, so a mailbox on `@psychoterapie-zarubova.cz` may be in use. Confirm with Barbora before the cutover. The apex MX and apex SPF records are **not touched** by anything in this runbook.

## How email sending works (no apex MX needed)

The contact form does not use the domain's SMTP/MX:

```
form → Cloudflare Worker → Resend HTTPS API → Amazon SES → barbora.zarubova@seznam.cz
```

- MX controls **inbound** mail only. `kontakt@psychoterapie-zarubova.cz` is a sender label without a mailbox; replies go to the visitor via `reply_to`.
- For **outbound** deliverability, Resend needs SPF + DKIM — placed on subdomains, so they don't collide with the existing apex SPF/MX.

## Step 1 — Resend records (safe anytime, zero risk to the running site)

Exact values come from the Resend dashboard after adding the domain there (region-specific) — these show the shape:

| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0...` (key from dashboard) | DKIM signature |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF for the bounce subdomain |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (prio 10) | bounce handling (Return-Path) — only MX added, on the `send.` subdomain |
| TXT (optional) | `_dmarc` | `v=DMARC1; p=none;` | deliverability hint, recommended |

Gate: Resend dashboard shows the domain as **Verified** (green badge).

## Step 2 — GitHub domain-verification record (safe anytime)

GitHub account → Settings → Pages → **Verified domains** → Add `psychoterapie-zarubova.cz`. GitHub issues a token:

| Type | Host | Value |
|---|---|---|
| TXT | `_github-pages-challenge-ochaloup` | token shown by GitHub |

Prevents any other GitHub account from claiming the domain if the Pages config ever lapses. Do the same for `chalda.cz` (that DNS is already accessible).

## Step 3 — Site cutover (the only risky step)

Before: screenshot every record, lower TTLs on the records below to 300 s a few hours ahead (rollback ≈ 10 min).

| Type | Host | New value | Replaces |
|---|---|---|---|
| A | @ | `185.199.108.153` | `46.36.36.153`, `176.102.65.65` |
| A | @ | `185.199.109.153` | |
| A | @ | `185.199.110.153` | |
| A | @ | `185.199.111.153` | |
| AAAA (optional) | @ | `2606:50c0:8000::153`, `:8001::153`, `:8002::153`, `:8003::153` | IPv6, nice-to-have |
| CNAME | www | `ochaloup.github.io.` (trailing dot) | old www record |

Cross-check the IPs against [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) at cutover time.

**Leave alone:** apex MX, apex SPF, anything else not listed.

> Note on the apex SPF (`v=spf1 a mx include:spf.hukot.net ~all`): it only matters for mail sent from `@psychoterapie-zarubova.cz` via Hukot — not for the website, and not for Resend (Resend authenticates via the `send.` subdomain SPF + DKIM). After cutover the `a` mechanism becomes stale (it would authorize GitHub's CDN IPs — harmless but meaningless). Optional tidy-up, only if the Hukot mailbox stays in use: `v=spf1 mx include:spf.hukot.net ~all`. If Barbora confirms no mail exists on the domain, MX + SPF can eventually be removed as a separate, deliberate change.

## Step 4 — GitHub Pages attach (after Step 3 propagates)

How multi-domain routing works: all domains point at the same DNS target; GitHub routes by HTTP `Host` header to whichever repo has that custom domain configured. One custom domain per repo. A project repo without its own domain is served under the user site's domain as a path — which is why staging lives at `chalda.cz/psychoterapie-zarubova/` today. Attaching `psychoterapie-zarubova.cz` to this repo detaches it from that path; `chalda.cz` on `ochaloup.github.io` stays untouched.

1. Verify propagation: `dig +short psychoterapie-zarubova.cz` → the four GitHub IPs; `dig +short www.psychoterapie-zarubova.cz` → `ochaloup.github.io.`
2. Deploy with `public/CNAME` containing exactly `psychoterapie-zarubova.cz`, no trailing newline (`V1.0-TODO.md` Phase 3).
3. Repo Settings → Pages → Custom domain → `psychoterapie-zarubova.cz` → wait for "DNS check successful".
4. Tick **Enforce HTTPS** (cert provisioning can take ~15 min).
5. Verify per `V1.0-TODO.md` Phase 5 curls.

## Rollback

Restore the screenshotted A/CNAME records at Hukot. With 300 s TTLs, the old site is back within ~10 minutes. Resend/verification TXT records need no rollback — they are invisible to site traffic.
