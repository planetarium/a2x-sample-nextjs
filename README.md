# a2x-sample-nextjs

A production-grade Next.js 16 sample that showcases:

- Google OAuth (Web Application) via Auth.js v5
- RFC 8628 OAuth 2.0 Device Authorization Grant built on top of Google auth
- The `@a2x/sdk` A2A (Agent-to-Agent) protocol endpoint
- Fly.io deployment with a standalone Node runtime

## Getting started

```bash
cp .env.example .env.local
# Fill AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_SECRET

npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

| Name                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `AUTH_SECRET`       | 32-byte random secret (`openssl rand -base64 32`).  |
| `AUTH_GOOGLE_ID`    | Google OAuth Client ID (Web Application).           |
| `AUTH_GOOGLE_SECRET`| Google OAuth Client Secret.                         |
| `AUTH_URL`          | Public URL of the app (e.g. `https://app.fly.dev`). |
| `AUTH_TRUST_HOST`   | `true` when behind a proxy (Fly.io).                |

## Scripts

```bash
npm run dev    # Next.js dev server
npm run lint   # ESLint
npm run build  # production build
npm run start  # run production server
```

## Device Code Flow

The app exposes RFC 8628 endpoints:

- `POST /api/device/code` — start a device authorization
- `POST /api/oauth/token` — poll with `grant_type=urn:ietf:params:oauth:grant-type:device_code`
- `GET  /device` — user verification page (entered on a second screen)

The flow piggy-backs on the Google Web Application OAuth credentials and binds
the resulting identity to an Auth.js session on the back end.

## A2A protocol

The `/a2a` endpoint is implemented via `@a2x/sdk`. Agent cards are served at
`/.well-known/agent-card.json`.

## Deploy to Fly.io

```bash
fly launch --org vicoop --no-deploy
fly secrets set AUTH_SECRET=... AUTH_GOOGLE_ID=... AUTH_GOOGLE_SECRET=...
fly deploy
```
