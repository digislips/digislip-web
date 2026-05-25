# DigiSlips Web

Digital receipt (till slip) service for South African retail. Customers claim and store slips electronically via NFC tap or QR code at a merchant's POS device.

## Stack
- Vanilla HTML/CSS/JS — no build step, no framework
- Hosted on Vercel
- Backend/auth via Supabase (Frankfurt, EU)
- Fonts: Syne (headings) + DM Mono (body)

## Project structure
```
index.html          Landing page
slip/index.html     Receipt viewer (dynamic, loaded by /slip/:id via Vercel rewrite)
privacy/index.html  Privacy policy (POPIA-compliant)
vercel.json         Rewrite rule: /slip/:id → /slip/index.html
```

## Design system
- Warm paper palette: `--page: #E8E4DA`, `--card: #FEFDFB`, `--text: #1C1917`
- Accent: `--blue: #1558FF`, `--green: #00C96A`
- Noisy background texture via inline SVG data URI
- Max content width: 720px

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

## Branding
- Product name: **DigiSlips** (plural, capital S)
- Logo markup: `<span class="d">digi</span><span class="s">Slips</span>` (blue/green split)
