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

## Still on the "before this is real" list (from README.md)

1. Real menu & prices (`src/lib/menu.ts` has placeholders)
2. SMS notifications via Twilio (`src/lib/notify.ts`)
3. Email notifications (`src/lib/notify.ts`)
4. Real online payment via Stripe Checkout (currently a "coming soon" stub)
5. Real database instead of Cloudflare KV prototype storage
6. Change the dashboard passcode for production use

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
