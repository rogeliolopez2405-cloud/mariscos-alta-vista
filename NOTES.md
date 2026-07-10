# Project Notes — Mariscos Alta Vista Ordering App

## Status: Live

- **Customer ordering page:** https://mariscos-alta-vista-app.rogeliolopez2405.workers.dev
- **Owner dashboard:** https://mariscos-alta-vista-app.rogeliolopez2405.workers.dev/dashboard
  (passcode: `mariscos2026`, override via `DASHBOARD_PASSCODE` env var)

## How deploys work now

Every push to `master` automatically redeploys via GitHub Actions
(`.github/workflows/deploy.yml`) — build with `opennextjs-cloudflare`, then
`wrangler deploy`. No manual deploy steps needed going forward.

Two repo secrets power this (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Known local limitation

`wrangler` cannot run directly on this machine (Windows on ARM64 — the
`workerd` runtime has no arm64 build). That's why deploys go through GitHub
Actions (a Linux runner) instead of a local `wrangler deploy`. Local
`npm run dev` still works fine for testing.

## SMS notifications (2026-07-09/10 progress)

Twilio account created and upgraded (no longer trial). `src/lib/notify.ts`
now actually sends real texts (not just console-log stubs) via Twilio's
REST API, with phone numbers normalized to E.164. Two messages go out per
order: a customer confirmation (to the phone number entered on the order)
and an owner summary (to `OWNER_PHONE_NUMBER`).

Local testing env vars live in `.env.local` (gitignored, never committed):
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`,
`OWNER_PHONE_NUMBER`.

**Two phone numbers are purchased on the Twilio account:**
- `+15626846410` — local 562 (Long Beach) number, currently unused/idle
  (kept for later in case A2P 10DLC ever gets sorted out).
- `+18446481127` — toll-free number, **currently the active
  `TWILIO_FROM_NUMBER`**. Actually sending texts requires this number's
  **Toll-Free Verification** to be approved first (status was `IN_REVIEW`
  as of 2026-07-10 ~00:30 UTC) — until then, real sends fail with error
  30032 ("Toll-Free Number has not completed Registration"), same as the
  console-log stub behavior otherwise.

**Why toll-free instead of the local number:** tried registering the local
562 number for A2P 10DLC (required for any US long-code SMS) as a Sole
Proprietor brand — hit real dead ends in both the API (Twilio's ISV-style
Sole Proprietor bundle flow doesn't cleanly apply to a plain individual
account) and the console wizard (kept routing to the full-business EIN
form regardless of answering "no tax ID"). Toll-free verification turned
out to be a much simpler, separate process that doesn't need any of that.

**If SMS still isn't sending when picking this back up:** check the toll-free
verification status via
`GET https://messaging.twilio.com/v1/Tollfree/Verifications/HH72f228b54bcbff938800ee36f15032a4`
— if approved, real texts should just start working with no code changes.

## Still on the "before this is real" list (from README.md)

1. Real menu & prices (`src/lib/menu.ts` has placeholders)
2. Email notifications (`src/lib/notify.ts`)
3. Real online payment via Stripe Checkout (currently a "coming soon" stub)
4. Real database instead of Cloudflare KV prototype storage
5. Change the dashboard passcode for production use

## Logo work (separate track)

- Original logo designed by the client's friend — establishe­d mark, not up
  for a full redesign.
- 20 concept alternates + a flat "modernize" mockup live in
  `C:\Users\rogel\OneDrive\mariscos-logos\`.
- ChatGPT-generated alternates (15 more, 3 style directions) shared by the
  friend, pending a decision on direction.
- Next real step: vector-trace the original artwork (Illustrator Image
  Trace or vectorizer.ai) rather than reinterpreting it, to get a clean
  production file.
