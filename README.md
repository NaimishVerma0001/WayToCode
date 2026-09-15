# Way2Code — Competitive Programming Dashboard

A full-stack dashboard that aggregates a developer's progress across every major
competitive-programming platform and tracks upcoming contests in one place.

[![CI](https://github.com/ayusingh-54/WayToCode-Final/actions/workflows/ci.yml/badge.svg)](https://github.com/ayusingh-54/WayToCode-Final/actions/workflows/ci.yml)

---

## Features

- **Multi-platform aggregation** — LeetCode, Codeforces, CodeChef, AtCoder,
  GeeksforGeeks, HackerRank and GitHub. Each provider is fetched independently
  and cached, so one slow or failing platform never blocks the dashboard.
- **Contest tracking & reminders** — upcoming contests are synced every 15
  minutes; reminders are delivered in-app over WebSockets and by email.
- **Progress history** — daily snapshots power 7/30/90/365-day charts.
- **Planner** — tasks, problems of the day, blockers and links, with streaks
  and badges.
- **Admin console** — platform overview, user search, block/unblock with a
  full audit trail.
- **Secure sessions** — short-lived access tokens plus an HttpOnly refresh
  cookie, server-side revocation on logout, and immediate lockout for blocked
  accounts.

---

## Tech Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Frontend  | React 19, Vite, React Router, TanStack Query, Recharts           |
| Backend   | Node.js 22, Express 5, Mongoose 9, Socket.IO                     |
| Database  | MongoDB                                                          |
| Security  | JWT, bcrypt, Helmet, CORS allow-list, rate limiting, Zod schemas |
| Testing   | Jest + Supertest (server), Vitest + Testing Library (client)     |

---

## Getting Started

### Prerequisites

- Node.js **22 or newer**
- A MongoDB instance (local, or MongoDB Atlas)

### 1. Clone and install

```bash
git clone https://github.com/ayusingh-54/WayToCode-Final.git
cd WayToCode-Final
npm ci
```

This is an npm workspace, so a single `npm ci` at the root installs both the
client and the server from one lockfile. Do not run `npm install` inside
`client/` or `server/`.

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Then set, at minimum:

| Variable     | Notes                                                         |
| ------------ | ------------------------------------------------------------- |
| `MONGO_URI`  | Must start with `mongodb://` or `mongodb+srv://`.              |
| `JWT_SECRET` | At least 32 characters. See `server/.env.example` for a snippet. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Everything else has a working default in development. Without SMTP credentials,
verification codes and reset links are printed to the server console instead of
being emailed.

**No MongoDB installed?** Run one on port 27017 without installing anything:

```bash
npm run dev:db
```

It is in-memory, so the data is discarded when you stop it. Leave
`MONGO_URI=mongodb://127.0.0.1:27017/way2code` in your `.env` and it just works.

### 3. Configure the client

No configuration is needed for local development: Vite proxies `/api` and
`/socket.io` to the backend, which keeps development same-origin so the
HttpOnly refresh cookie behaves exactly as it does in production.

For a production build, `VITE_API_URL` **must** be set to the deployed API
(including the `/api` suffix). See `client/.env.example`.

### 4. Run

In three terminals:

```bash
npm run dev:db        # only if you are not running your own MongoDB
npm run dev:server    # API      -> http://localhost:5001
npm run dev:client    # Frontend -> http://localhost:5000
```

Open **http://localhost:5000**. The Vite dev server proxies `/api` and
`/socket.io` to the backend, so no CORS or cookie configuration is needed.

To grant yourself the admin console after signing up:

```bash
node -e "const m=require('mongoose');(async()=>{await m.connect('mongodb://127.0.0.1:27017/way2code');await m.connection.collection('users').updateOne({email:'YOUR_EMAIL'},{\$set:{role:'admin'}});await m.disconnect();})()"
```

---

## Scripts

Run these from the repository root.

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev:server`      | Start the API with auto-reload.                        |
| `npm run dev:client`      | Start the Vite dev server.                             |
| `npm run lint`            | ESLint across the client, the server and the tests.    |
| `npm test`                | Server (Jest) and client (Vitest) test suites.         |
| `npm run test:e2e`        | Boot the real server and drive it over HTTP.           |
| `npm run test:server:coverage` | Server tests with a coverage report.              |
| `npm run build:client`    | Production bundle into `client/build`.                 |
| `npm run verify`          | Lint, test, e2e and build — what CI runs.              |

---

## Testing

Tests are split so that each layer runs at the right speed and fidelity.

| Suite         | Location                  | Runner  | Needs a database |
| ------------- | ------------------------- | ------- | ---------------- |
| Server unit   | `server/tests/unit`       | Jest    | No               |
| Server API    | `server/tests/integration` | Jest    | Yes (in-memory)  |
| End-to-end    | `server/tests/e2e`        | Node    | Yes (in-memory)  |
| Client        | `client/src/**/*.test.*`  | Vitest  | No               |

Integration tests share one in-memory MongoDB started in Jest's `globalSetup`,
and each worker gets its own database so suites running in parallel cannot wipe
each other's fixtures.

The end-to-end smoke test exists because the Jest integration suites mount the
Express app directly and connect Mongoose themselves. That means a bug in the
startup path or in the global Mongoose configuration can pass a fully green
Jest run — the smoke test boots the real server and catches it.

---

## Project Structure

```
.
├── client/                     React single-page app
│   └── src/
│       ├── components/         Reusable UI
│       ├── pages/              Route-level screens
│       ├── services/           API layer (apiClient is the single entry point)
│       ├── context/            React context providers
│       └── styles/             Per-component CSS
│
├── server/
│   ├── server.js               Process entry: startup and graceful shutdown
│   ├── src/
│   │   ├── app.js              Express app: middleware and route mounting
│   │   ├── config/             Environment validation, database connection
│   │   ├── routes/             Route definitions
│   │   ├── controllers/        HTTP concerns only
│   │   ├── services/           Business logic and platform integrations
│   │   ├── models/             Mongoose schemas
│   │   ├── middlewares/        Auth, validation, rate limiting, errors
│   │   ├── validations/        Zod request schemas
│   │   ├── jobs/               Scheduled contest sync and reminders
│   │   └── utils/              Shared helpers
│   └── tests/                  unit / integration / e2e
│
└── .github/workflows/ci.yml    Lint, test, build, audit, lockfile checks
```

---

## API Overview

All routes are prefixed with `/api`. Every response uses one envelope:

```jsonc
// Success
{ "success": true, "data": { } }

// Failure
{ "success": false, "code": "VALIDATION_FAILED", "message": "…", "errors": [] }
```

| Method   | Endpoint                          | Auth   |
| -------- | --------------------------------- | ------ |
| `POST`   | `/auth/register`                  | Public |
| `POST`   | `/auth/register/request-otp`      | Public |
| `POST`   | `/auth/register/verify-otp`       | Public |
| `POST`   | `/auth/login`                     | Public |
| `POST`   | `/auth/refresh`                   | Cookie |
| `POST`   | `/auth/logout`                    | User   |
| `GET`    | `/auth/me`                        | User   |
| `POST`   | `/auth/forgot-password`           | Public |
| `POST`   | `/auth/reset-password`            | Public |
| `GET`    | `/dashboard`                      | User   |
| `GET`    | `/dashboard/progress?days=30`     | User   |
| `GET`    | `/profile`                        | User   |
| `PUT`    | `/profile`                        | User   |
| `PUT`    | `/profile/coding-profiles`        | User   |
| `GET`    | `/contests`                       | Public |
| `GET`    | `/daily-problems`                 | Public |
| `GET`    | `/planner`                        | User   |
| `POST`   | `/planner`                        | User   |
| `PUT`    | `/planner/:id`                    | User   |
| `DELETE` | `/planner/:id`                    | User   |
| `GET`    | `/reminders`                      | User   |
| `POST`   | `/reminders`                      | User   |
| `DELETE` | `/reminders/:contestId`           | User   |
| `GET`    | `/suggestions`                    | Public |
| `POST`   | `/suggestions`                    | Public |
| `PUT`    | `/suggestions/:id/upvote`         | Public |
| `GET`    | `/admin/overview`                 | Admin  |
| `GET`    | `/admin/users`                    | Admin  |
| `GET`    | `/admin/users/:userId`            | Admin  |
| `PATCH`  | `/admin/users/:userId/block`      | Admin  |
| `PATCH`  | `/admin/users/:userId/unblock`    | Admin  |
| `GET`    | `/admin/audit-logs`               | Admin  |

`GET /health` sits outside `/api` and returns **503** when MongoDB is
unreachable, so a degraded instance is pulled out of rotation.

---

## Security Notes

- Access tokens are short-lived; the refresh token lives in an HttpOnly,
  `SameSite` cookie and never reaches JavaScript.
- Logout revokes both tokens server-side. A revoked token is rejected on the
  next request, not merely forgotten by the browser.
- Blocking an account revokes API access immediately, and a password reset
  invalidates every token issued before it.
- Request bodies are parsed by strict Zod schemas, so unknown keys are rejected
  rather than forwarded to Mongoose.
- Admin search escapes regular-expression metacharacters before querying.
- Upvote de-duplication stores a salted HMAC of the client address, never the
  address itself.
- Rate limits apply per route group; authentication is additionally limited per
  account identifier, not just per IP.

---

## Deployment

**API (Render)** — `server/render.yaml` is a ready blueprint. It builds from
the repository root so the single workspace lockfile is honoured, and uses
`/health` for health checks. Set `MONGO_URI`, `CLIENT_URL` and the SMTP
variables in the dashboard; `JWT_SECRET` and `REGISTRATION_OTP_SECRET` are
generated on first deploy.

**Client (Vercel)** — `client/vercel.json` rewrites all paths to `index.html`
for client-side routing. Set `VITE_API_URL` to the deployed API.

The server refuses to start in production if `CLIENT_URL` is missing or
non-HTTPS, if `REGISTRATION_OTP_SECRET` is too short, or if the SMTP variables
are incomplete — each of those would otherwise fail silently at runtime.

---

## License

MIT
