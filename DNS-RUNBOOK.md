# DNS runbook — psychoterapie-zarubova.cz

Concrete DNS changes for the v1.0 launch, in execution order. Companion to `V1.0-TODO.md` (Phases 1, 2, 5) and `PLAN.md` §6.2. Written 2026-06-06 from live `dig` queries.

## Current state (verified 2026-06-06, DNS-admin access obtained 2026-07-11)

DNS is hosted at **Hukot** — records are editable at `admin.hukot.net` → *Domény, DNS* (access obtained 2026-07-11). Live zone:

| Type | Host | Current value | Meaning |
|---|---|---|---|
| NS | @ | `ns1.hukot.cz`, `ns3.hukot.cz`, `ns2.securitynet.cz` | zone hosted at Hukot |
| A | @ | `46.36.36.153`, `176.102.65.65` | old site hosting at Hukot |
| AAAA | @ | `2a02:25b0:aaaa:1::8`, `2a02:25b0:aaaa:1::4` | old site (IPv6) |
| CNAME | `*` | `psychoterapie-zarubova.cz` | wildcard → apex (covers www) |
| MX | @ | `10 mail.hukot.net`, `100 mx2.securitynet.cz` | inbound mail — **unused, see below** |
| CAA | @ | `0 issue "letsencrypt.org"` | cert-authority allow-list |
| TXT | @ | `v=spf1 a mx include:spf.hukot.net ~all` | SPF for the Hukot mail |

DNSSEC: **inactive** (simplifies a nameserver move — no DS record to coordinate).

> **✓ MX question resolved (2026-07-11):** Barbora uses **only** `barbora.zarubova@seznam.cz`; there is **no `@psychoterapie-zarubova.cz` mailbox**. So the Hukot MX + apex SPF + the wildcard CNAME can all be dropped at cutover, and the Hukot **webhosting + email can be cancelled together** — while keeping the domain registered at Hukot. (Cloudflare Registrar does **not** support `.cz`, so the registration stays at Hukot regardless; only DNS hosting moves.)

## Two paths

- **Path A — stay at Hukot for DNS:** edit the zone in place at `admin.hukot.net` (Steps 1–4 below, entered as Hukot records). Least effort, no nameserver change.
- **Path B — move DNS to Cloudflare (recommended, chosen 2026-07-11):** point the domain's nameservers at Cloudflare, recreate the records there (free), then cancel Hukot webhosting+email. Better tooling, already the home of the contact-form Worker + planned Web Analytics. See the next section; Steps 1–4 then apply, entered as **Cloudflare** records instead of Hukot.

## Path B — Move DNS to Cloudflare (step by step)

You are **not moving the domain registration** — it stays at Hukot (CZ.NIC). You are only changing which nameservers are *authoritative* for the zone: from Hukot's to Cloudflare's. Cloudflare then hosts the DNS records (free).

Order matters: **build the full Cloudflare zone first, switch nameservers second.** The moment the registry accepts the new nameservers, Cloudflare's zone goes live — so it must already contain everything the site + email-sending need. Because we're cutting to GitHub Pages at the same time, put the *final* record set (table below) into Cloudflare from the start; the nameserver switch then performs the cutover in one move.

**B1. Create the Cloudflare zone.**
1. Log in at dash.cloudflare.com. On *Account home*, click the top-right **+ Add** → **Connect a domain** ("Optimize web traffic speed and security"). The **Add a domain** button on the *Domains* card leads to the same flow. (In Cloudflare's docs this is currently called *"Onboard a domain"* — same thing; the dashboard label has drifted.)
   - Do **not** pick **Register a domain** (buys a brand-new domain) or **Transfer a domain** (moves the *registration* to Cloudflare — unsupported for `.cz` anyway). We only want to host DNS.
2. Enter the apex `psychoterapie-zarubova.cz`, choose the **Free** plan. Cloudflare does a quick scan of the existing Hukot zone — but its own docs warn the scan **"is not guaranteed to find all existing DNS records,"** so don't trust it. **Review the scanned records and edit them to exactly the final set in the table below** — delete the Hukot leftovers (`46.36.36.153`, `176.102.65.65`, the two AAAA, the wildcard `*` CNAME, both MX, the apex `v=spf1 a mx include:spf.hukot.net`), and add every GitHub + Resend record yourself.
3. For the GitHub records, set the **proxy status to "DNS only" (grey cloud)**, not proxied/orange. GitHub Pages provisions its own Let's Encrypt cert and does its own custom-domain check; a grey cloud lets that work cleanly. (Proxying/orange can be revisited later, but don't start with it.)

**Final Cloudflare record set:**

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| AAAA | `@` | `2606:50c0:8000::153`, `:8001::153`, `:8002::153`, `:8003::153` (optional IPv6) | DNS only |
| CNAME | `www` | `ochaloup.github.io` | DNS only |
| CAA | `@` | `0 issue "letsencrypt.org"` | — |
| TXT | `_github-pages-challenge-ochaloup` | token from GitHub (Step 2) | — |
| TXT | `resend._domainkey` | DKIM key from Resend dashboard (Step 1) | — |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| MX | `send` | `feedback-smtp.<region>.amazonses.com` (prio 10) | — |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (optional, recommended) | — |

Dropped vs the old zone: the Hukot A/AAAA, the wildcard `*` CNAME, the apex MX (mail.hukot.net / mx2.securitynet.cz) and the apex Hukot SPF — all fine, because there is no `@domain` mailbox. (Optional hardening: an apex `TXT @ = v=spf1 -all` to state "nothing sends mail as @this-domain"; it doesn't affect Resend, which authenticates via the `send.` subdomain + DKIM.)

**B2. Switch the nameservers at Hukot.**
1. Cloudflare shows you **two assigned nameservers** (e.g. `xxxx.ns.cloudflare.com`, `yyyy.ns.cloudflare.com`). Copy them.
2. At `admin.hukot.net` → *Domény, DNS* → the domain → change its **nameservers / delegace** to the two Cloudflare ones (remove `ns1.hukot.cz` / `ns3.hukot.cz` / `ns2.securitynet.cz`).
   - `.cz` quirk: CZ.NIC delegates via an **NSSET** object. Hukot's panel may let you set custom nameservers directly, or you may need to ask Hukot support to create/assign an NSSET containing the two Cloudflare nameservers. If there's no self-service field, open a support ticket: *"Prosím o změnu delegace domény psychoterapie-zarubova.cz na nameservery Cloudflare: xxxx.ns.cloudflare.com, yyyy.ns.cloudflare.com."*
   - DNSSEC is inactive, so there's no DS record to remove first. (If it were active, disable it before switching, or the domain would break.)
3. Save. Registry propagation for a `.cz` NS change is typically a few hours (occasionally up to 24–48 h). Cloudflare emails you when the zone becomes **Active** (it has detected its nameservers are live).

**B3. Finish the GitHub Pages attach** — once Cloudflare is Active and `dig +short psychoterapie-zarubova.cz` returns the four GitHub IPs, do **Step 4** below (attach the custom domain in the repo, enforce HTTPS).

**B4. Cancel Hukot services** — only after the site + form are confirmed working on the new domain: at Hukot cancel the **webhosting** and the **e-mailové schránky**, but **keep the domain registration** (the yearly CZ.NIC fee). Do not click "Deaktivovat zónu" / delete the domain.

**Rollback:** in Hukot, switch the nameservers back to `ns1.hukot.cz`, `ns3.hukot.cz`, `ns2.securitynet.cz`. Until the Hukot webhosting is actually cancelled, the old zone + site return once the NS change propagates back.

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

> Note on the apex SPF (`v=spf1 a mx include:spf.hukot.net ~all`): it only matters for mail sent from `@psychoterapie-zarubova.cz` via Hukot — not for the website, and not for Resend (Resend authenticates via the `send.` subdomain SPF + DKIM). After cutover the `a` mechanism becomes stale (it would authorize GitHub's CDN IPs — harmless but meaningless). Since Barbora has no `@domain` mailbox (confirmed 2026-07-11), the apex MX + apex SPF are simply dropped at cutover (already reflected in the Path B record set above). Under Path A, remove them in the same edit or as a deliberate follow-up.

## Step 4 — GitHub Pages attach (after Step 3 propagates)

How multi-domain routing works: all domains point at the same DNS target; GitHub routes by HTTP `Host` header to whichever repo has that custom domain configured. One custom domain per repo. A project repo without its own domain is served under the user site's domain as a path — which is why staging lives at `chalda.cz/psychoterapie-zarubova/` today. Attaching `psychoterapie-zarubova.cz` to this repo detaches it from that path; `chalda.cz` on `ochaloup.github.io` stays untouched.

1. Verify propagation: `dig +short psychoterapie-zarubova.cz` → the four GitHub IPs; `dig +short www.psychoterapie-zarubova.cz` → `ochaloup.github.io.`
2. Deploy with `public/CNAME` containing exactly `psychoterapie-zarubova.cz`, no trailing newline (`V1.0-TODO.md` Phase 3).
3. Repo Settings → Pages → Custom domain → `psychoterapie-zarubova.cz` → wait for "DNS check successful".
4. Tick **Enforce HTTPS** (cert provisioning can take ~15 min).
5. Verify per `V1.0-TODO.md` Phase 5 curls.

## Rollback

Restore the screenshotted A/CNAME records at Hukot. With 300 s TTLs, the old site is back within ~10 minutes. Resend/verification TXT records need no rollback — they are invisible to site traffic.


## HUKOT DNS export

$ORIGIN psychoterapie-zarubova.cz.
$TTL 86400
@                                3600  IN SOA   (
                                                ns1.hukot.cz.   ; MNAME
                                                hukot.hukot.cz. ; RNAME
                                                1783779483      ; SERIAL
                                                28800           ; REFRESH
                                                7200            ; RETRY
                                                604800          ; EXPIRE
                                                1000            ; MINIMUM
                                                )

; NS RECORDS
                                 86400 IN NS    ns1.hukot.cz.
                                 86400 IN NS    ns2.securitynet.cz.
                                 86400 IN NS    ns3.hukot.cz.

; A RECORDS
@                                3600  IN A     185.199.108.153
@                                3600  IN A     185.199.109.153
@                                3600  IN A     185.199.110.153
@                                3600  IN A     185.199.111.153

; CNAME RECORDS
www                              3600  IN CNAME ochaloup.github.io.

; MX RECORDS
send                             86400 IN MX    10 feedback-smtp.eu-west-1.amazonses.com.

; TXT RECORDS
_dmarc                           86400 IN TXT   "v=DMARC1; p=none;"
_github-pages-challenge-ochaloup 86400 IN TXT   "9abb5a47389d7c108330b6c2afebd4"
resend._domainkey                86400 IN TXT   ( 
                                                  "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ"
                                                  "CmxBqNFfrA8u9Tf3Hcw9MvG9DxZFQXy3F8W6ioLk"
                                                  "2NSKGAsWX0XUh6FQS/Ezg/OiMEGxiKUpsjNtoqmG"
                                                  "HovNRDRjUCuVXCf8DGges5vTpET42iMb/QJv2J9h"
                                                  "oq/FQ3IiCbc9Re7Qs9drZQXGbeUAjJbbp8Lb4M9e"
                                                  "qS2MFNX5S4bQIDAQAB"
                                                )
send                             86400 IN TXT   "v=spf1 include:amazonses.com ~all"

; CAA RECORDS
@                                86400 IN CAA   0 issue "letsencrypt.org"
