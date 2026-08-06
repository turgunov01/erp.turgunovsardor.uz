# TTR ONE — Web (Nuxt frontend)

Nuxt 3 SPA frontend for the TTR ONE ERP. Talks to the Fastify API (`../`) — the backend is
API-first and unchanged.

## Run (two terminals, no Docker)

**Terminal 1 — API + local Postgres** (from `ttr-one/`):
```bash
npm run dev        # Fastify API on http://localhost:3000 (boots embedded Postgres)
```

**Terminal 2 — Nuxt UI** (from `ttr-one/web/`):
```bash
npm install        # first time only
npm run dev        # Nuxt on http://localhost:3001
```

Open **http://localhost:3001**. Demo login: `admin@demo-factory.com` / `Admin123!`.

The API base is configurable: `NUXT_PUBLIC_API_BASE` (default `http://localhost:3000/api/v1`).

## Architecture
- **SPA** (`ssr: false`) — JWT stored client-side, calls the API cross-origin (API CORS allows it).
- **Pinia** stores: `stores/auth.ts` (tokens, user, login/register/accept/boot/logout + API client with
  refresh), `stores/lock.ts` (PIN app-lock).
- **PIN crypto-vault** (`utils/crypto.ts`, `stores/auth.ts`, `components/PinLock.vue`): tokens are **never
  stored in plaintext** — they live in memory and are persisted **encrypted** in `localStorage.ttr_vault`
  (PBKDF2-SHA256 → AES-GCM-256, key derived from the PIN). On any reload the app is locked; the correct PIN
  decrypts the vault, a wrong PIN cryptographically fails (AES-GCM auth tag) → no token → no API access.
  Fail-secure: deleting/forging localStorage can only lock harder. Requires a secure context (localhost/https).
  **Grace:** a per-tab warm session (`sessionStorage.ttr_sess`, holds the working key+tokens with an expiry
  bumped on activity) lets a **reload skip the PIN**. The PIN screen appears only for **(1) 5-min inactivity**
  or **(2) manual lock** (plain "L" key outside inputs, or the "Заблокировать" button) — both wipe the warm
  session. Closing the tab also drops it (cold state = encrypted vault only).
- **Layouts**: `default` (landing/auth), `app` (sidebar + topbar shell, nav filtered by permissions +
  enabled modules + platform-admin).
- **Pages**: landing, login, register, accept-invite, dashboard, inventory, products, warehouses,
  movements, companies, audit (functional) + users/roles/billing/settings/platform (stubs — being ported).

## Porting status — COMPLETE
All screens are on Nuxt: landing, login (+MFA +forgot/reset), register, accept-invite, PIN lock (grace),
app shell/nav, dashboard, inventory (stock actions), products, warehouses, movements, companies, audit,
**billing** (plans/subscribe bank-transfer|card/invoices/requisites/details/doc), **super-admin**
(tenants/pending-invoice confirm/didox/seller requisites), **settings** (modules + white-label),
**users** (invite/invitations/scope/manual), **roles** (permission builder), **Security modal**
(MFA setup/enable/disable, PIN, sessions), **change password**.

Note: concurrent 401s share a single refresh (refresh tokens are single-use) — see `stores/auth.ts`.
The classic vanilla app in `../public/` is retained as a fallback but is no longer needed.

## Production
`npm run generate` → static SPA in `.output/public`, served by any static host (or Fastify);
set `NUXT_PUBLIC_API_BASE` to the API URL.
