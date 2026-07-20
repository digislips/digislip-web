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
| `merchant/new/index.html` | Create-promotion form + live preview, submit wired to `create-promotion` — see "Merchant Dashboard" below |
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
| [web#12](https://github.com/digislips/digislip-web/issues/12) | Dashboard promotions list | none — shipped (deactivate control added in web#16) |
| [web#13](https://github.com/digislips/digislip-web/issues/13) | `promo-preview` module | none — shipped (no UI consumer yet) |
| [web#14](https://github.com/digislips/digislip-web/issues/14) | Create-promotion form + preview wiring | none — shipped (submit is stubbed, no network call) |
| [web#15](https://github.com/digislips/digislip-web/issues/15) | Wire create-promotion submit | none — shipped |
| [web#16](https://github.com/digislips/digislip-web/issues/16) | Deactivate-promotion toggle | none — shipped |

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
- **`merchant/index.html`** (web#12) — the dashboard landing page, read-only list of the merchant's own promotions. Redirects to `merchant/login` if `client.auth.getSession()` has no session (same pattern as `merchant/new`). Three mutually exclusive states in `#content`: a loading panel (shown until the fetch resolves), an error panel (network/non-2xx failure, distinct copy from empty), and either an empty-state panel (`promotions: []`, with its own "Create promotion" CTA) or the populated list — never more than one rendered at once, so there's no ambiguity between "still loading" and "genuinely has zero promotions". "Create promotion" also appears as a persistent header button linking to `merchant/new` regardless of list state, satisfying the issue's "visible entry point" criterion even while loading/erroring. Sign-out is wired the same way as `merchant/new` (`client.auth.signOut()` then redirect to `merchant/login`) and is delegated on `document.body` so it works no matter what's currently rendered in `#content`. Each row shows title, a type badge, a stamps/reward or coupon/reward summary, an active/inactive pill, and an expiry label — the deactivate/reactivate toggle described below (web#16) is layered onto this same row markup, not a separate control.
- **`merchant/new/index.html` submit wiring (web#15)** — the "Create promotion" button now calls `POST create-promotion` (backend#31, deployed) with the session's access token. `merchant/promo-form-logic.js` gained `buildCreatePromotionPayload(values)`, a pure function taking the same collected-values shape `validatePromotionForm` already consumes (now extended with `claim_cap`/`cooldown_hours` strings from the Advanced section) and producing the exact wire body: `stamps_required`/`claim_cap`/`cooldown_hours` numeric-coerced, `stamps_required` omitted entirely for coupons (the backend ignores it either way, but the client doesn't send a field its own type doesn't use), and `expires_at` sent as `null` — not `''` — when "Never expires" is checked, matching `validatePromotionPayload`'s `undefined | null` acceptance. **The backend's `expires_at`-optional fix (commit `6b08922`, closing the gap flagged in backend#31's July 17 update) was one commit ahead of what was checked out locally when this issue was picked up** — the local `digislip-backend` clone still had the pre-fix version requiring a non-empty `expires_at` string. Caught by reading `git log`/`git show` against the pushed commit rather than the on-disk file, per this repo's guidance to treat a stale sibling checkout as a trap; no code in this repo needed to change as a result; it just confirms `null`/omitted is the correct never-expires wire value. On submit: validates client-side first (unchanged from web#14), then disables the button (text flips to "Creating…") and sets a `submitting` guard flag for the duration of the request so it can't be double-fired. Response handling: `201` navigates to `/merchant` (the list picks up the new row via its own `list-merchant-promotions` fetch on load, so no client-side list-splicing is needed); `401` redirects to `/merchant/login` (session expired mid-fill); `403` shows the same not-linked copy as the preview's `showNotLinked()`, as a defensive case even though a merchant that loaded the preview successfully shouldn't hit this; `400` (`INVALID_INPUT`) shows a generic "check the fields above" note rather than per-field errors, because `validatePromotionPayload` returns one flat error code with no field breakdown — true defense-in-depth here means catching payload shapes the client-side validator missed, not mirroring backend field errors that don't exist; anything else (network failure, `500`) shows a generic retry note. The submit button re-enables on every non-navigating outcome.
- **401 vs. 403 from `list-merchant-promotions` are handled differently, not both treated as "log in again".** A 401 (no/invalid JWT) redirects to `merchant/login` — that's a real session problem. A 403 (`resolveMerchant` returned `NOT_LINKED` — valid session, but no `merchants` row has this user's `owner_user_id`) instead renders a distinct "your account isn't linked to a merchant yet, contact support.digislips@gmail.com" panel and stays put. Found July 2026: the original version of both `merchant/index.html` and `merchant/new/index.html` redirected to login on *either* status, which made an unlinked account look exactly like a broken login loop (land on the page, get silently bounced straight back) — the actual cause turned out to be that **every row in production `merchants` had `owner_user_id = null`** (no merchant had ever been manually linked), not a session bug. Fixed in both files; `merchant/new`'s equivalent failure surfaces inline in the preview column via `showNotLinked()` rather than a full-page panel, since that page's fetch only feeds the preview, not the whole page.
- **`merchant/promotions-list-logic.js`** (web#12) — colocated pure module, same convention as the other merchant modules. Exports `typeLabel(type)`, `formatStampSummary(stampsRequired, rewardDescription)`, `formatCouponSummary(rewardDescription)`, `formatPromotionSummary(promotion)` (dispatches by `type`), `formatExpiryLabel(expiresAt)` (falls back to `"No expiry"` for a null/legacy row instead of erroring — promotions can predate the self-serve form via direct DB insert), and `formatStateLabel(active)`. Deliberately has no cross-file `require`/import even though its expiry formatting overlaps with `promo-preview.js`'s `formatExpiry` — every colocated module in `merchant/` is a standalone classic `<script>` with no build step, and introducing inter-module requires would only work in Jest, not in the browser, so the ~5-line date formatter is duplicated here rather than shared.
- **`merchant/new/index.html`** (web#14) — the create-promotion form and live preview. Redirects to `merchant/login` if there's no active session (checked via `client.auth.getSession()`, same as the session-gated pages implied by web#12). Fetches `{ merchant: { name, logo_url } }` from `list-merchant-promotions` (backend#30, shipped) on load so the preview shows the real merchant identity instead of a placeholder; a 401/403 also redirects to login, any other failure shows an inline preview error without blocking the form. The preview only re-renders on inputs that actually change the rendered card (`title`, `stamps_required`, `reward_description`, `expires_at`) — `description` (the how-to-earn text) isn't shown on `StampCard`/`CouponCard` in the app today, so editing it doesn't retrigger a render. Stamp count in the preview is always 0 (a promotion being created has no customer progress yet). The Advanced section's `claim_cap`/`cooldown_hours` re-sync to `defaultsForType()` on every type switch *unless* the merchant has already hand-edited one of them (tracked via a per-field "touched" flag), so flipping the type toggle doesn't silently clobber a deliberate override. **Logo rendering is additive, not a pixel-port**: the app's real `MerchantTile` (used inside `StampCard`/`CouponCard`) is initials-only and never reads `merchant_logo_url` even though that field exists on `UserPromoRow` — but the issue's acceptance criteria explicitly call for showing the real logo in the preview, so `merchant/new` renders an `<img>` in the tile when `logo_url` is present and falls back to the initials tile (matching the app) when it's not. Submit runs full client-side validation on click before doing anything else; the actual network call to `create-promotion` was wired in web#15 (see below).
- **Deactivate/reactivate toggle (web#16)** — each row in `merchant/index.html` now carries a per-row toggle button wired to `update-promotion` (backend#32, deployed at `2cefddc`). `active: true → false` (deactivate) requires an inline confirmation step first — a `confirm-box` appended to the row with `deactivateConfirmMessage()`'s copy (from `merchant/promotions-list-logic.js`) plus "Yes, deactivate"/"Cancel" buttons — because deactivating a stamp card freezes *all* further stamping immediately, including customers already mid-card (the corrected behaviour from PRD #9 / backend#32). `active: false → true` (reactivate) fires immediately with no confirmation, since re-enabling isn't destructive. Per-row UI state (`idle` / `confirm` / `saving`, plus an optional `error` string) lives in a `rowUi` map keyed by promotion id in the page's closure, separate from the `promotions` array itself, so a full-list re-render (`renderList()`, no args — the array is now closure-scoped rather than passed in) can redraw just the affected row's controls without disturbing the others' state. On success, the row is updated in place from the response's `promotion` object (no re-fetch of the whole list); on failure, `rowUi[id].error` is set and rendered as inline copy on that row while every other row and the merchant's scroll position are untouched — satisfying the issue's "without losing the merchant's place in the list" criterion. `update-promotion`'s contract (confirmed against the deployed source in `digislip-backend`, commit `2cefddc`, matching the linked production ref) takes the promotion id as `?id=<uuid>` (not in the body) and a body of only `{ active }` here — `expires_at` shortening exists in the same endpoint but has no UI yet, since this issue only covers the toggle. Response handling mirrors `merchant/new`'s create flow: `401` redirects to `merchant/login`; `403` (cross-merchant or not-yet-linked) and any other non-200 surface the same generic retry copy inline via `toggleErrorMessage()`, since `update-promotion` returns one flat `error` code with no field-level detail to mirror. Two new pure functions were added to `merchant/promotions-list-logic.js` (TDD'd against `merchant/promotions-list-logic.test.js` before implementation): `toggleActionLabel(active)` (button text) and `deactivateConfirmMessage()` (the confirmation copy, unit-tested for the "immediately" / "already partway" / "redeemable" phrasing the issue called for, so the consequence-clarity acceptance criterion has a regression check instead of resting on eyeballing the HTML). **Not verified via a live browser click-through**: no credentials for the `reviewer@digislips.co.za` account that owns the production `Test Merchant` row (`0fa9f01d-...`, currently linked, with one live promotion — a "coffee" stamp card, `c48db1c9-...`) were available in this session, so end-to-end confirmation that deactivating blocks `claim-promotion` and that `redeem-promotion` still honors an already-issued reward is deferred to a manual pass by someone with that login; `update-promotion`'s own request/response contract was instead confirmed by reading the deployed handler and validator source directly (`digislip-backend` commit `2cefddc`, matching the linked production ref) rather than assumed from the PRD.
- **NFC payload URL expand panel (July 2026, no tracked issue)** — each row in `merchant/index.html` is now clickable on its title/summary area (`.promo-row-main`, `data-action="toggle-expand"`) to reveal a detail panel showing `https://digislips.co.za/promo/<id>`, the App Link a merchant programs onto an NFC chip so a tap opens `digislip-app`'s existing `src/app/promo/[id].tsx` redirect stub straight into the claim flow — that Android App Link handler and its `.well-known/assetlinks.json` verification already existed before this change; this feature only exposes the URL, it adds nothing new to the app or backend. Deliberately narrow scope: no `/promo/:id` fallback page was added to this repo (so the URL still 404s in a browser if the app isn't installed or App Link verification hasn't completed) and iOS has no associated-domains config in `digislip-app` at all, so the tap-to-claim path is Android-only today — both are known, deliberately deferred gaps, not oversights. The expand click target is `.promo-row-main` specifically (not the whole `.promo-row`), so it can't be triggered by the Deactivate/Reactivate button or its confirm/cancel sub-flow, which live in sibling elements outside it. Per-row expand state (`expanded`/`copied` booleans) lives in a new `expandUi` map, keyed by promotion id and structured exactly like the existing `rowUi` map, so multiple rows can be expanded simultaneously and toggling one row's Deactivate button (a `rowUi`-only change) doesn't collapse any other row's open detail panel. The Copy button calls `navigator.clipboard.writeText` (silently no-ops if unsupported, since this is a desktop merchant tool over HTTPS) and flips its icon/label to a checkmark and "Copied" for 2 seconds via a `copyTimers` map of per-id `setTimeout` handles, clearing any prior pending reset on rapid re-clicks so two quick copies of the same row don't race. Three new pure functions were added to `merchant/promotions-list-logic.js`, TDD'd against `merchant/promotions-list-logic.test.js` before implementation: `buildPromoPayloadUrl(promotionId)` (the URL string), `nfcPayloadExplainer()` (the panel's explanatory copy, unit-tested for mentioning NFC/tap/claim and containing no em dash per house style), and `copyButtonLabel(copied)` (button text). Available uniformly on active and inactive promotions with no special-casing or warning copy, even though tapping the URL for an inactive promotion will currently fail at `claim-promotion` (which rejects `!active`) — a deliberate simplicity choice, not an oversight. Not verified via a live browser click-through in this session (consistent with this repo's "user is the eyes" preference for merchant-dashboard UI changes) — only unit tests and a Node `Function()` parse check of the inline script were run.
- **Cancel link on `merchant/new/index.html`** — a plain `<a href="/merchant">` styled as a bordered secondary button (`.btn-secondary`), sitting next to the submit button in a new `.submit-row` flex wrapper. No JS wiring, no confirmation prompt — just navigation back to the dashboard list.
- **Deactivate/reactivate control is now a slider switch, not a text button** — superseding the button described in the web#16 entry above (that entry's description of the confirm/saving state machine, `rowUi`, and `update-promotion` wiring is all still accurate; only the visual control changed). `.switch` is a `role="switch" aria-checked` button with a `.switch-knob` span, green/on when `promo.active`, grey/off otherwise, disabled during the `confirm` and `saving` `rowUi` states (a `.switch-label` shows "Deactivating…"/"Reactivating…" only in the `saving` state, since the switch position alone doesn't convey in-flight vs. settled). Click handling, the confirm-before-deactivate box, and the `toggleActionLabel`/`deactivateConfirmMessage` functions are unchanged — only the markup/CSS producing `actionHtml` in `renderRow` changed.
- **Expand panel now shows full promo detail, not just the NFC URL** — extends the "NFC payload URL expand panel" entry above. Compared against `digislip-app`'s `PromoDetailSheet` (shown when a customer taps a promo card in the Promotions tab): that sheet renders a *per-customer claimed instance* (`UserPromoRow`), including `claimed_at`/`last_stamp_at`, which have no merchant-dashboard equivalent since a promotion definition has no single value across every customer who claimed it. The two fields that *do* carry over are `description` ("How to earn") — fetched by `list-merchant-promotions` since backend#30 but never rendered anywhere in this dashboard until now — and `reward_description` ("Reward"), previously only visible squeezed into the one-line row summary. Also added, going beyond app parity since the app's detail sheet never shows these either: **Claim limit** (`formatClaimCap`: `"Unlimited"` for a null cap, else `"N time(s) per customer"`) and **Cooldown** (`formatCooldownHours`: `"No cooldown"` for 0, else `"N hour(s)"`) — the Advanced-section settings a merchant sets once at creation and could otherwise never see again. All four render inside a new `.promo-detail-fields` block (a `detailFieldHtml(label, value)` helper skips a field entirely when its value is falsy — relevant for the optional `description`/`reward_description`, moot for the two formatter-backed fields which always return a truthy string), separated from the NFC URL section below it by a `.promo-detail-divider`.
- **Landing-page links to `/merchant/login`** — added because there was previously no way for an already-provisioned merchant to find the dashboard from `digislips.co.za` at all (the nav is deliberately logo-only, and the merchants-pitch section's CTA is aimed at prospects, not existing merchants). Two links, both intentionally lightweight: a `<a href="/merchant/login">Merchant login</a>` in the footer alongside the Privacy Policy link, and an "Already a merchant? Log in" `.merchant-login-link` directly under the pitch section's CTA button. That CTA button itself was renamed from generic "Get in touch →" to "Become a merchant →" with a `.merchant-cta-note` line above it ("We set up every merchant personally, no self-signup...") clarifying that provisioning is staff-mediated, not a self-service form, before a prospect clicks through expecting one.
