# DigiSlip Web — Context

## What This Repo Is

Static HTML/JS for the DigiSlip web surfaces, hosted on Vercel at `digislips.co.za`. There is no build step — all JS is vanilla or vendored. No framework, no bundler.

**Vercel config:** `vercel.json` — apex domain is primary (no redirect), `www` redirects to apex (required for Android App Links Google verifier).

---

## Glossary

| Term | Meaning |
|------|---------|
| **slip** | A single receipt, identified by UUID; URL is `https://digislips.co.za/slip/<uuid>` |
| **claim** | A user linking a slip to their account; can happen in-browser or via the app |
| **raw_text** | Plain-text receipt content stripped of ESC/POS control codes — must be rendered in DM Mono |
| **parsed_content** | JSONB from Supabase: `{ barcodes: [{type, value, position}], has_logo: bool }` |
| **logo_url** | Supabase Storage public URL for the merchant's logo, stored on `merchants` |
| **html2canvas** | Library that captures a DOM element to a canvas for PDF generation — **must be bundled in `vendor/`** |
| **jsPDF** | PDF generation library — **must be bundled in `vendor/`** |
| **bwip-js** | Barcode rendering library (canvas output) — **must be bundled in `vendor/`** (pending web#7) |

---

## Security Policy — No CDN

**All third-party JS must live in `vendor/` and be loaded locally.** No CDN `<script src>` tags are permitted. This policy was set May 2026 to prevent supply-chain risk on a page that handles receipt data. Applies to html2canvas, jsPDF, bwip-js, and `supabase-js` (added July 2026 for the merchant dashboard — see "Merchant Dashboard" below).

---

## File Inventory

| Path | Purpose |
|------|---------|
| `slip/index.html` | Main claim page — loads slip data from `get-slip`, renders receipt, QR-claim flow, PDF export |
| `confirm/index.html` | Email confirmation landing (success + expired/error states); `digislip://` deep-link button |
| `privacy/index.html` | Privacy policy page |
| `reset/index.html` | Password reset landing page |
| `index.html` | Root marketing/landing page — hero, how-it-works, merchants pitch (incl. paper-savings calculator) |
| `vendor/` | Bundled third-party JS (html2canvas, jsPDF) |
| `.well-known/assetlinks.json` | Android App Links verification — contains both SHA-256 fingerprints: EAS upload key (`C9:0A:...`) and Google Play app-signing key (`B9:4E:...`) |
| `favicon.ico`, `favicon-*.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` | Site icon set — see "Site Icons / Favicon" below |
| `scripts/generate-icons.js` | Regenerates the icon set from `digislip-app` source assets |
| `sitemap.xml`, `robots.txt` | SEO — see "Sitemap / robots.txt" below |
| `merchant/login/index.html` | Merchant dashboard sign-in (Supabase Auth email/password) — see "Merchant Dashboard" below |
| `CLAUDE.md` | Agent instructions for this repo |

---

## slip/index.html — Architecture

Vanilla JS, no framework. Key responsibilities:

1. Parse slip UUID from `window.location.pathname`
2. `GET /functions/v1/get-slip?id=<uuid>` — fetch slip data (no auth header required; `verify_jwt = false`)
3. Render receipt text in DM Mono monospace
4. Claim flow: in-browser sign-in/sign-up → call `claim-slip` Edge Function
5. PDF export: html2canvas captures `#pdf-target` (off-screen mirror div) → jsPDF saves

### Rendering rules

- Receipt text: always DM Mono, monospace, never serif/sans
- `parsed_content.barcodes`: render as canvas barcode (bwip-js, Code128) — **pending web#7**
- `logo_url`: render as `<img>` at top of receipt card — **pending web#8**
- Both barcode canvas and logo `<img>` must also appear in the `#pdf-target` div so pdf export captures them

---

## index.html — Paper Savings Calculator

Interactive merchant-facing calculator in the "For merchants" section (added July 2026). Pure client-side estimate — no backend call, no persisted state.

Merchant drags a slider (or types into the paired text field) for "average till slips per day"; three stat cards recompute live: trees saved/year, kg paper/year, Rand saved/year.

**Constants (all illustrative, not audited — disclosed in an on-page footnote):**

| Constant | Value | Source |
|----------|-------|--------|
| Avg till slip length | 20cm | Assumption — no source found for an SA-specific average |
| Reference thermal roll | 57mm × 40m, ~125g, ~R5/roll | SA retail pricing (Toner Corporation, MCS Office National, July 2026) |
| Paper-to-tree ratio | ~24 trees/ton → ~38kg paper/tree | Conservatree industry estimate (not freshly re-verified) |
| National "wow" banner stat | ~9.8 billion slips/year in SA | Rough extrapolation: SA population (65.45M, 2026) × ~150 receipts/person/year — not a cited/official figure, framed as an estimate on the page |

**Key design decisions:**

- **Logarithmic slider** (0–1,000,000 slips/day) — a linear slider can't usefully cover both a small café (tens/day) and a large chain (hundreds of thousands/day); log scale gives small stores drag precision without capping the top end.
- **Plain text input, not `type="number"`** — avoids the native spinner; accepts typed values beyond the slider's own range as an escape hatch for stress-testing/"wow" numbers.
- **Compact notation (K/M/B) kicks in early** (~1,000 for trees, ~10,000 for kg/rand), with values truncating to an ellipsis (full precision in a `title` tooltip) as a last-resort safety net. CSS Grid's default `min-width: auto` otherwise lets one overflowing card steal width from its siblings and break the 3-column layout — cards are pinned to `min-width: 0` and the font sized to fit realistic values without truncation.

---

## Site Icons / Favicon

Added July 2026 (previously no favicon — browsers showed the default globe). The site had no logo image asset of its own, so the icon set is **derived from `digislip-app`'s real brand assets** rather than newly designed:

- **Source of truth:** `../digislip-app/assets/images/icon.png` (1024×1024 detailed receipt-on-gradient, the actual Expo app icon) and `../digislip-app/assets/images/android-icon-monochrome.png` (receipt silhouette only, Android's themed-icon layer). `digislip-app` is a sibling repo on disk, not a dependency of this repo — these paths only matter when re-running the generator.
- **Small sizes** (favicon 16/32/48, `.ico`): the monochrome silhouette composited onto a hand-authored blue→green gradient square (matches the app icon's gradient, `#1558FF` → `#00C96A`), so it stays legible at browser-tab size.
- **Large sizes** (apple-touch-icon 180, `icon-192`/`icon-512`, manifest): the full detailed `icon.png`, resized.
- **Cropping:** both source assets bake in Android's adaptive-icon safe-zone padding — the receipt only occupies the middle ~52% of the 1024px canvas. `scripts/generate-icons.js` crops to the receipt's bounding box (`RECEIPT_CROP`, ~30% padding) before resizing, otherwise the icon reads as mostly empty gradient with a small receipt floating in the middle.
- **`favicon.ico` is hand-built**, not via a library — `png-to-ico` is ESM-only and breaks under Jest's CJS runtime, so `buildIco()` writes the (simple) modern PNG-in-ICO container format directly.
- **No `favicon.svg`** — there's no vector source for the receipt shape, so a hand-authored SVG would just wrap a raster PNG with no real crispness gain over the `.ico`/PNG set.
- **Regenerating:** `generateIconSet()` and `buildManifest()` are pure/testable (see `scripts/generate-icons.test.js`), but actually producing the files requires a one-off script pointing at the sibling `digislip-app` checkout — there's no committed runner because the source path is machine-specific. Re-derive it from `generateIconSet`'s signature if the art changes.

---

## Sitemap / robots.txt

Added July 2026 for Google discoverability. Both are static root files, no `vercel.json` change needed.

- **`sitemap.xml`** lists only `https://digislips.co.za/` and `/privacy`. Deliberately excludes `/slip/:id` (private, per-customer, one page per receipt — not indexable content) and `/confirm`, `/reset` (auth-flow pages).
- **`robots.txt`** disallows `/slip/`, `/confirm`, `/reset` and points `Sitemap:` at the apex URL.
- **Google Search Console gotcha:** the site's canonical domain is the apex (`digislips.co.za`); `www` 307-redirects to it (see the Vercel config note above). Search Console does not follow redirects when fetching a submitted sitemap — a sitemap submitted under a `www.digislips.co.za` property will permanently show "Couldn't fetch." The working setup is a **Domain-type property** for bare `digislips.co.za` (DNS TXT verification via Cloudflare), with the sitemap submitted there. Verified working July 2026 (status: Success, 2 pages discovered).

---

## Supabase Integration

The web page calls two Edge Functions directly:

| Function | When |
|----------|------|
| `GET /functions/v1/get-slip?id=<uuid>` | On page load — fetches `{ raw_text, created_at, claimed, parsed_content, logo_url }` |
| `POST /functions/v1/claim-slip` | When the user completes auth — claims the slip |

The Supabase JS client is also used directly for auth (sign-in, sign-up, OTP) in the claim flow.

---

## What Is NOT Built Yet

- **Barcode rendering** — `slip/index.html` needs `bwip-js` (bundled in `vendor/`), canvas-rendered Code128, and `#pdf-target` mirroring. Tracked: [digislips/digislip-web#7](https://github.com/digislips/digislip-web/issues/7). Blocked by `get-slip` returning `parsed_content` (backend#4).
- **Merchant logo rendering** — `slip/index.html` needs `<img src=logo_url>` at top of receipt card and in `#pdf-target`. Tracked: [digislips/digislip-web#8](https://github.com/digislips/digislip-web/issues/8). Blocked by `get-slip` returning `logo_url` (backend#6).
- **iOS Universal Links** — `apple-app-site-association` file deferred until Apple Developer account is active.
- **Rate limiting on `get-slip`** — flagged in pre-release security checklist (firmware CONTEXT.md).
- **Legacy `slip` Edge Function removal** — tracked: digislips/digislip-web#6.

---

## Feature In Progress — Barcode & Logo Rendering

PRD: [digislips/digislip-backend#1](https://github.com/digislips/digislip-backend/issues/1)

Web-specific issues:

| Issue | Title | Blocked by |
|-------|-------|------------|
| [web#7](https://github.com/digislips/digislip-web/issues/7) | Render scannable barcode via bwip-js | backend#4 |
| [web#8](https://github.com/digislips/digislip-web/issues/8) | Render merchant logo in receipt card and PDF | backend#6 |

### Key design decisions

- **bwip-js canvas output** (not SVG) — required for html2canvas PDF capture; SVG is not reliably captured.
- **Barcode section** renders below receipt text; `#pdf-target` mirrors it.
- **Logo renders as `<img>`** at the top of the card above receipt text; the `src` is the Supabase Storage public URL (no auth needed — bucket is public).
- **Graceful degradation:** if `parsed_content` is null, render receipt text only, no error. If `logo_url` is null, no logo section, no broken image placeholder.

---

## Merchant Dashboard

PRD: [digislips/digislip-web#9](https://github.com/digislips/digislip-web/issues/9)

A `/merchant/*` section where merchants self-serve their own stamp-card/coupon promotions instead of requiring a manual DB insert. New section, first page shipped July 2026:

| Issue | Title | Blocked by |
|-------|-------|------------|
| [web#10](https://github.com/digislips/digislip-web/issues/10) | Merchant login page | none — shipped |
| web#11 | Merchant password reset page | not yet built |
| web#12 | Dashboard promotions list | not yet built |
| web#13 | `promo-preview` module | not yet built |
| web#14 | Create-promotion form + preview wiring | not yet built |
| web#15 | Wire create-promotion submit | not yet built |
| web#16 | Deactivate-promotion toggle | not yet built |

### Key design decisions

- **Anon key exception, scoped to `/merchant/*` only.** The repo's blanket "no Supabase anon key in web source" rule (set May 2026, see Security Policy above) does not apply here — `merchant/login/index.html` loads `supabase-js` and the anon key directly to drive Supabase Auth (`signInWithPassword`). Public pages (`index`, `slip`, `confirm`, `reset`) are unaffected and continue to go through Edge Functions only, with no anon key or Data API access.
- **`supabase-js` is vendored**, not CDN-loaded, per the repo's no-CDN policy — `vendor/supabase-js-2.110.7.min.js` (UMD build).
- **Generic auth errors:** login failures always show "Invalid email or password" regardless of whether the account exists or the password is wrong, to avoid account enumeration.
- **No public self-signup.** Merchant accounts are provisioned by DigiSlips staff (`merchants.owner_user_id` set manually after device install) who then send a Supabase invite/magic link. `merchant/login` is sign-in only.
- **Route layout:** one folder per page, matching the existing `slip/`, `confirm/`, `reset/` convention — `merchant/login/`, `merchant/reset/` (pending), `merchant/index.html` (dashboard, pending), `merchant/new/` (pending).
- **`robots.txt`** disallows `/merchant/` — private, authenticated tool, not indexable.
