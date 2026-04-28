# Timewell

Collaborative digital memory-card platform.

This monorepo contains the Next.js web client and the Express + MongoDB API.

```
apps/
  web/          Next.js 14 App Router frontend
  api/          Node.js + Express backend
packages/
  shared/       Zod schemas, types, error codes shared by web + api
.github/
  workflows/    CI: lint + typecheck + tests on push/PR
docker-compose.yml   Local Mongo, Redis, LocalStack S3
```

## Build status: M1 complete

Per the milestone breakdown in the spec, this commit delivers **M1**:

- Monorepo scaffold (npm workspaces), root tooling, GitHub Actions CI, Docker Compose with Mongo + Redis + LocalStack.
- `packages/shared` — Zod schemas (auth, user, card, order), error codes + friendly messages, shared TS types.
- `apps/api` foundation — Zod-validated env config, Mongo connection helper, Winston logger, requestId / error / auth / validate / rate-limit middleware, `AppError` with code field, `asyncHandler`, JWT (access + refresh) helpers, bcrypt password helpers, magic-link / OTP token utilities, email + SMS dispatch interfaces (with in-memory test capture).
- All 8 Mongoose models exactly as Section 15 specifies: `User`, `Card`, `Contribution`, `AuthToken` (with TTL index), `SupportTicket`, `Order`, `Purchase`, `AdminAuditLog`.
- Complete auth module — all 8 endpoints, plus the embedded email-change / phone-change verification flows used by the account module:
  - `POST /api/auth/signup` — email or phone; rate-limited 5/IP/hr; no-enumeration.
  - `POST /api/auth/verify` — magic-link token or 6-digit OTP; consumes token; invalidates outstanding tokens.
  - `POST /api/auth/login` — bcrypt cost 12, soft-lock after 5 fails for 15 min, rate-limited per identifier.
  - `POST /api/auth/magic-link` — request a fresh link/code.
  - `POST /api/auth/refresh` — reads `tw_refresh` httpOnly SameSite=Strict cookie, re-issues access token.
  - `POST /api/auth/logout` — clears refresh cookie.
  - `POST /api/auth/forgot-password` / `POST /api/auth/reset-password`.
- Account module — `GET /api/users/me`, `PATCH /api/users/me` (email/phone changes are queued for verification, not committed immediately), `GET /api/users/me/quota`, `POST /api/users/me/change-password`, plus confirm-email-change and confirm-phone-change endpoints.
- Jest + Supertest tests using `mongodb-memory-server` covering: signup (email + phone + duplicate + invalid), magic-link verify, OTP verify, token reuse rejection, login + soft-lock, refresh + logout, forgot/reset password, profile read/update, change-password, plus a health smoke test.
- Minimal `apps/web` Next.js 14 App Router shell with Tailwind, Axios with auto-refresh interceptor, Zustand auth store, error-code → friendly-message mapper.

### What is NOT in M1 (planned for later milestones, per Section 21)

- M2: Card creation, Image + Message tabs, cover upload pipeline (Sharp derivatives), home dashboard UI.
- M3: Sharing tab, share modal, QR + 300 DPI print JPG, public message page viewer, password gate, Stripe checkout + webhooks.
- M4: Contributor upload + record flows, fullscreen carousel, owner moderation.
- M4b: Admin dashboard, orders list/detail, SSE, audit log; Buy More Cards.
- M5: WCAG audit, Lighthouse CI, analytics events, Sentry wiring.
- M6: Production deploy, runbooks.

These are tracked but intentionally not implemented in this commit. Each milestone is shipped as a working, tested unit before the next begins (per the spec's "Commit working, tested code at each milestone before proceeding" instruction).

## Local setup

Prerequisites: Node 20+, Docker Desktop.

```bash
npm install
npm run build -w @timewell/shared
docker compose up -d                    # mongo, redis, localstack S3
cp apps/api/.env.example apps/api/.env  # then fill in values
cp apps/web/.env.example apps/web/.env.local

npm run dev:api                          # http://localhost:4000
npm run dev:web                          # http://localhost:3000
```

Or, with Docker already running:

```bash
npm run setup:local
```

## Testing

```bash
npm test                                 # all workspaces
npm test -w @timewell/api                # API only (uses mongodb-memory-server, no Docker required)
```

CI runs the same on every push.

## Conventions

- Every API route uses `asyncHandler`. No bare `async (req, res) => …`.
- Every endpoint validates input with `validate(schema)` middleware that consumes a Zod schema.
- Every error thrown by the application is an `AppError` with a stable `code` (see `packages/shared/src/errors/codes.ts`). Frontend maps codes to friendly messages.
- Every request gets a UUID `requestId` attached by the `requestId` middleware, surfaced in logs and in every error response body.
- bcrypt cost is `12` (Section 16). Test env overrides to cost `4` for speed.
- JWT access TTL: `15m`. Refresh TTL: `7d`, in `httpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`.
- All passwords + card-page passwords go through `utils/password.ts` (bcrypt). Never store plaintext.
- Mongoose `select: false` on every secret column (`passwordHash`, `failedLoginAttempts`, `lockedUntil`).
- No-enumeration is enforced on `/auth/signup`, `/auth/login`, and `/auth/forgot-password`: the response shape is identical regardless of whether the identifier exists.
