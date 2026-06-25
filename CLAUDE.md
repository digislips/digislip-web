# DigiSlips Web

Digital receipt (till slip) service for South African retail. Customers claim and store slips electronically via NFC tap or QR code scan from a DigiSlip capture device installed between the merchant's existing POS machine and thermal printer.

## Stack
- Vanilla HTML/CSS/JS — no build step, no framework
- Hosted on Vercel
- Backend/auth via Supabase (Frankfurt, EU)
- Fonts: Syne (headings) + DM Mono (body)

## Project structure
```
index.html                        Landing page
slip/index.html                   Receipt viewer (dynamic, loaded by /slip/:id via Vercel rewrite)
privacy/index.html                Privacy policy (POPIA-compliant)
vendor/html2canvas-1.4.1.min.js   Bundled PDF library (do not load from CDN)
vendor/jspdf-2.5.1.umd.min.js     Bundled PDF library (do not load from CDN)
vercel.json                       Rewrite rule: /slip/:id → /slip/index.html
```

## Design system
- Warm paper palette: `--page: #E8E4DA`, `--card: #FEFDFB`, `--text: #1C1917`
- Accent: `--blue: #1558FF`, `--green: #00C96A`
- Noisy background texture via inline SVG data URI
- Max content width: 720px

## Tooling
- **Supabase CLI** is installed and linked to the project (`supabase` is on PATH). Deploy an Edge Function from `digislip-backend/` with `supabase functions deploy <function-name>`. No `--project-ref` flag needed — the project is already linked.
- **Deno** is installed via winget but is NOT on PATH. Full path: `C:\Users\SOMO-CAD\AppData\Local\Microsoft\WinGet\Packages\DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe\deno.exe`. Use `$deno = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe\deno.exe"` in PowerShell before running Deno commands.

## Legal / compliance
- Governed by POPIA (Protection of Personal Information Act, 2013), South Africa
- DigiSlips is the responsible party; merchants are operators
- Privacy policy lives at `/privacy` — update effective date whenever content changes
- Data stored in EU (Supabase Frankfurt); planned migration to SA-hosted infra at scale
- Breach notification commitment: Information Regulator + affected users within 72 hours

## Database (Supabase)
Key tables:
- `slips` — `id`, `device_id`, `merchant_id`, `raw_text`, `created_at`, `expires_at`, `claimed` (bool)
- `claims` — `id`, `slip_id`, `user_id`, `claimed_via`, `claimed_at`

Expiry rules:
- A Supabase scheduled function deletes unclaimed slips once `expires_at` passes (24h after creation)
- Claimed slips (`claimed = true`) are never deleted and must always be accessible
- The web viewer must NOT apply its own expiry gate — if Supabase returns a slip, it is valid

## Slip viewer architecture (security-hardened May 2026)
- `slip/index.html` calls the `get-slip` Edge Function — NOT the Supabase Data API directly
- Edge Function URL: `https://eivctqjisodfhaitzyiq.supabase.co/functions/v1/get-slip?id=<uuid>`
- The Supabase anon key must NOT appear anywhere in the web source — it was removed May 2026
- The Edge Function uses the service role key server-side; CORS is locked to digislips.co.za
- PDF libraries (html2canvas, jsPDF) are served from `vendor/` — never load from a CDN

## Slip viewer status display
- `claimed = true` → green status bar, label "Claimed", no expiry note
- `claimed = false` → amber status bar, label "Unclaimed", shows countdown to expiry

## Branding
- Product name: **DigiSlips** (plural, capital S)
- Logo markup: `<span class="d">digi</span><span class="s">Slips</span>` (blue/green split)
- Contact email: support.digislips@gmail.com
- No em dashes in copy — use periods or colons instead
- No emoji icons — use inline Lucide SVGs (stroke-width 1.5, 18×18)
- The DigiSlip hardware is a capture/interception device, never a "POS device" or "till screen"
