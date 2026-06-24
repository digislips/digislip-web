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

**All third-party JS must live in `vendor/` and be loaded locally.** No CDN `<script src>` tags are permitted. This policy was set May 2026 to prevent supply-chain risk on a page that handles receipt data. Applies to html2canvas, jsPDF, and any future library including bwip-js.

---

## File Inventory

| Path | Purpose |
|------|---------|
| `slip/index.html` | Main claim page — loads slip data from `get-slip`, renders receipt, QR-claim flow, PDF export |
| `confirm/index.html` | Email confirmation landing (success + expired/error states); `digislip://` deep-link button |
| `privacy/index.html` | Privacy policy page |
| `reset/index.html` | Password reset landing page |
| `index.html` | Root (marketing / redirects) |
| `vendor/` | Bundled third-party JS (html2canvas, jsPDF) |
| `.well-known/assetlinks.json` | Android App Links verification — contains both SHA-256 fingerprints: EAS upload key (`C9:0A:...`) and Google Play app-signing key (`B9:4E:...`) |
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
