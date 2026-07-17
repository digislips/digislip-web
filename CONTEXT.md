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
| `merchant/reset/index.html` | Merchant password reset (request + landing + set-new-password) — see "Merchant Dashboard" below |
| `merchant/index.html` | Dashboard promotions list (read-only) — see "Merchant Dashboard" below |
| `merchant/new/index.html` | Create-promotion form + live preview (no submit wiring yet) — see "Merchant Dashboard" below |
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
| [web#11](https://github.com/digislips/digislip-web/issues/11) | Merchant password reset page | none — shipped |
| [web#12](https://github.com/digislips/digislip-web/issues/12) | Dashboard promotions list | none — shipped (read-only, no deactivate control yet) |
| [web#13](https://github.com/digislips/digislip-web/issues/13) | `promo-preview` module | none — shipped (no UI consumer yet) |
| [web#14](https://github.com/digislips/digislip-web/issues/14) | Create-promotion form + preview wiring | none — shipped (submit is stubbed, no network call) |
| web#15 | Wire create-promotion submit | not yet built |
| web#16 | Deactivate-promotion toggle | not yet built |

### Key design decisions

- **Anon key exception, scoped to `/merchant/*` only.** The repo's blanket "no Supabase anon key in web source" rule (set May 2026, see Security Policy above) does not apply here — `merchant/login/index.html` loads `supabase-js` and the anon key directly to drive Supabase Auth (`signInWithPassword`). Public pages (`index`, `slip`, `confirm`, `reset`) are unaffected and continue to go through Edge Functions only, with no anon key or Data API access.
- **`supabase-js` is vendored**, not CDN-loaded, per the repo's no-CDN policy — `vendor/supabase-js-2.110.7.min.js` (UMD build).
- **Generic auth errors:** login failures always show "Invalid email or password" regardless of whether the account exists or the password is wrong, to avoid account enumeration.
- **No public self-signup.** Merchant accounts are provisioned by DigiSlips staff (`merchants.owner_user_id` set manually after device install) who then send a Supabase invite/magic link. `merchant/login` is sign-in only.
- **Route layout:** one folder per page, matching the existing `slip/`, `confirm/`, `reset/` convention — `merchant/login/`, `merchant/reset/` (pending), `merchant/index.html` (dashboard, pending), `merchant/new/` (pending).
- **`robots.txt`** disallows `/merchant/` — private, authenticated tool, not indexable.
- **`merchant/reset/index.html` is a single page covering the whole password-reset flow** (web#11), not just the post-email landing step: a "request" state (email field → `resetPasswordForEmail`) is shown when the URL has no recovery hash — this is what `merchant/login`'s "Forgot password?" link goes to — and a "recovery" state (new-password form → `updateUser`) is shown when Supabase's redirect lands with a `type=recovery` hash. This differs from the consumer `reset/index.html`, which only ever renders the landing step and hands off to the app via `digislip://` deep link — merchants have no app, so the actual `updateUser({ password })` call has to happen in the browser. On success, redirects to `merchant/login` (not the consumer's app deep link).
- **`merchant/reset-logic.js`** is a colocated pure module (mirrors the `slip/slip-logic.js` convention) exposing `parseRecoveryHash` (mirrors the consumer page's inline `error`/`error_code`/`error_description` handling — same `otp_expired` vs. generic copy — to decide between the error/recovery/request states) and `validateNewPassword` (min 6 chars, must match confirm field). Tested in `merchant/reset-logic.test.js`.
- **No account-enumeration leak on the request step** — `resetPasswordForEmail` always shows the same "check your email" confirmation regardless of whether the address has an account, consistent with the login page's generic-error precedent.
- **`merchant/promo-preview.js` is a ported, DOM-free rendering-rules module** (web#13) — `merchantColor`, `computeStampLayout`, `formatExpiry`, `formatStampFooter`, `formatCouponFooter`, line-for-line ported from `digislip-app`'s `src/lib/merchant-color.ts`, `src/lib/stamp-layout.ts`, `src/lib/format-date.ts`, and the footer copy in `StampCard.tsx`/`CouponCard.tsx` (sibling repo, checked out alongside this one — not a dependency). Pure functions, plain data in/out, no DOM/React Native imports, so the merchant dashboard's live promo preview (web#14) can match the real app pixel-for-pixel instead of approximating it. `merchant/promo-preview.test.js` asserts `merchantColor` is byte-identical to the app's OKLCH output for a representative name set (including empty/short/unicode) by hardcoding hex values computed from the app's actual algorithm. Wired into `merchant/new/index.html` (web#14).
- **`merchant/promo-form-logic.js`** (web#14) — colocated pure module, same convention as `slip/slip-logic.js` and `merchant/reset-logic.js`. Exports `validatePromotionForm(values)` (required-field checks plus the `stamps_required` iff `type === 'stamp_card'` rule) and `defaultsForType(type)` (stamp card: `cooldown_hours=24, claim_cap=null`; coupon: `cooldown_hours=0, claim_cap=1`). Mirrors the rules from the PRD (web#9) and the not-yet-built backend `validatePromotionPayload` (backend#31) — there was no backend module to port byte-for-byte at the time this shipped, only the PRD's stated rules, unlike `promo-preview.js`'s pixel-exact port. Tested in `merchant/promo-form-logic.test.js`.
- **"Never expires" (added July 2026):** `expires_at` is required *unless* the merchant checks the "Never expires" checkbox next to the date field, which sets `never_expires: true` in the collected form values and disables (not clears) the date input so a previously-entered date survives an accidental toggle. `validatePromotionForm` skips the `expires_at` required-check when `never_expires` is truthy; a checked box always sends `expires_at: ''` regardless of what's left in the disabled input. The `promotions.expires_at` column is already nullable in production, so this needed no schema change. **This makes backend#31's acceptance criteria stale** — it currently states `expires_at` is "always required," which would reject a null expiry once `create-promotion` is built (web#15 wiring). Needs reconciling with backend#31 before that issue is picked up. `merchant/promotions-list-logic.js`'s `formatExpiryLabel` already renders `"No expiry"` for a null `expires_at`, so the list page (web#12) needed no change.
- **`merchant/index.html`** (web#12) — the dashboard landing page, read-only list of the merchant's own promotions. Redirects to `merchant/login` if `client.auth.getSession()` has no session (same pattern as `merchant/new`). Three mutually exclusive states in `#content`: a loading panel (shown until the fetch resolves), an error panel (network/non-2xx failure, distinct copy from empty), and either an empty-state panel (`promotions: []`, with its own "Create promotion" CTA) or the populated list — never more than one rendered at once, so there's no ambiguity between "still loading" and "genuinely has zero promotions". "Create promotion" also appears as a persistent header button linking to `merchant/new` regardless of list state, satisfying the issue's "visible entry point" criterion even while loading/erroring. Sign-out is wired the same way as `merchant/new` (`client.auth.signOut()` then redirect to `merchant/login`) and is delegated on `document.body` so it works no matter what's currently rendered in `#content`. No deactivate/toggle control — that's web#16 (formerly tracked loosely as #5b) — each row is presentational only: title, a type badge, a stamps/reward or coupon/reward summary, an active/inactive pill, and an expiry label.
- **401 vs. 403 from `list-merchant-promotions` are handled differently, not both treated as "log in again".** A 401 (no/invalid JWT) redirects to `merchant/login` — that's a real session problem. A 403 (`resolveMerchant` returned `NOT_LINKED` — valid session, but no `merchants` row has this user's `owner_user_id`) instead renders a distinct "your account isn't linked to a merchant yet, contact support.digislips@gmail.com" panel and stays put. Found July 2026: the original version of both `merchant/index.html` and `merchant/new/index.html` redirected to login on *either* status, which made an unlinked account look exactly like a broken login loop (land on the page, get silently bounced straight back) — the actual cause turned out to be that **every row in production `merchants` had `owner_user_id = null`** (no merchant had ever been manually linked), not a session bug. Fixed in both files; `merchant/new`'s equivalent failure surfaces inline in the preview column via `showNotLinked()` rather than a full-page panel, since that page's fetch only feeds the preview, not the whole page.
- **`merchant/promotions-list-logic.js`** (web#12) — colocated pure module, same convention as the other merchant modules. Exports `typeLabel(type)`, `formatStampSummary(stampsRequired, rewardDescription)`, `formatCouponSummary(rewardDescription)`, `formatPromotionSummary(promotion)` (dispatches by `type`), `formatExpiryLabel(expiresAt)` (falls back to `"No expiry"` for a null/legacy row instead of erroring — promotions can predate the self-serve form via direct DB insert), and `formatStateLabel(active)`. Deliberately has no cross-file `require`/import even though its expiry formatting overlaps with `promo-preview.js`'s `formatExpiry` — every colocated module in `merchant/` is a standalone classic `<script>` with no build step, and introducing inter-module requires would only work in Jest, not in the browser, so the ~5-line date formatter is duplicated here rather than shared.
- **`merchant/new/index.html`** (web#14) — the create-promotion form and live preview. Redirects to `merchant/login` if there's no active session (checked via `client.auth.getSession()`, same as the session-gated pages implied by web#12). Fetches `{ merchant: { name, logo_url } }` from `list-merchant-promotions` (backend#30, shipped) on load so the preview shows the real merchant identity instead of a placeholder; a 401/403 also redirects to login, any other failure shows an inline preview error without blocking the form. The preview only re-renders on inputs that actually change the rendered card (`title`, `stamps_required`, `reward_description`, `expires_at`) — `description` (the how-to-earn text) isn't shown on `StampCard`/`CouponCard` in the app today, so editing it doesn't retrigger a render. Stamp count in the preview is always 0 (a promotion being created has no customer progress yet). The Advanced section's `claim_cap`/`cooldown_hours` re-sync to `defaultsForType()` on every type switch *unless* the merchant has already hand-edited one of them (tracked via a per-field "touched" flag), so flipping the type toggle doesn't silently clobber a deliberate override. **Logo rendering is additive, not a pixel-port**: the app's real `MerchantTile` (used inside `StampCard`/`CouponCard`) is initials-only and never reads `merchant_logo_url` even though that field exists on `UserPromoRow` — but the issue's acceptance criteria explicitly call for showing the real logo in the preview, so `merchant/new` renders an `<img>` in the tile when `logo_url` is present and falls back to the initials tile (matching the app) when it's not. Submit is present and runs full client-side validation on click, but never performs a network call — wiring it to `create-promotion` is web#15.
