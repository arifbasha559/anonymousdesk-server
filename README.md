# AnonymousDesk — Backend API

Production-ready REST API for AnonymousDesk, a confidential professional advice platform.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ / Express 4 |
| Database | MySQL 8 + Prisma ORM |
| Cache / Rate limiting | Redis (Upstash-compatible via `ioredis`) |
| Job queue | BullMQ |
| AI | Google Gemini API (moderation + summarization) |
| Auth | JWT access tokens + opaque rotating refresh tokens |
| Validation | Zod |
| Logging | Pino (structured, redacted) |

## Quick Start

```bash
cp .env.example .env
# fill in DATABASE_URL, REDIS_URL, and generate secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# paste output into JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ANON_ID_SALT (three different values)

npm install
npx prisma migrate dev --name init
npm run seed          # optional demo data

npm run dev            # API server (nodemon)
npm run worker         # in a second terminal — background job processor
```

Or with Docker:

```bash
docker compose up --build
```

## Project Structure

```
src/
├── server.js              # Entry point — graceful shutdown, crash handling
├── app.js                 # Express app — middleware pipeline
├── config/                 # env validation, logger, prisma, redis singletons
├── middleware/              # security, rate limiting, auth, validation, errors
├── utils/                   # crypto (anon_id derivation), jwt, response envelope
├── modules/
│   ├── auth/                # register, login, refresh, revoke, industry update
│   ├── post/                 # CRUD, upvote, feed
│   ├── reply/                 # threaded replies, helpful marks
│   ├── karma/                  # reputation ledger, trust levels
│   ├── report/                  # user reports + admin moderation queue
│   └── notification/             # in-app notification feed
├── services/
│   └── gemini.service.js     # AI moderation + summarization
├── queues/
│   ├── queue.js                # BullMQ queue definitions
│   └── workers/                # moderation, summary, notification workers
└── routes/index.js              # route aggregator
```

## Security Architecture

**Identity is never stored — it's derived.**
`anon_id = HMAC-SHA256(email + password, server_salt)`. The same credentials always
produce the same ID, so a user "recovers" their account just by logging in again —
without the server ever storing a recoverable email or password.

| Control | Implementation |
|---|---|
| Password storage | bcrypt, 12 rounds (configurable) |
| Email storage | SHA-256 hash only, used for uniqueness checks — never reversible |
| Access tokens | Short-lived JWT (15 min default), stateless, non-sensitive claims only |
| Refresh tokens | Opaque random tokens, hashed at rest, **rotated on every use** |
| Logout | Immediate — access token denylisted in Redis until natural expiry |
| Brute force | Account lockout after 5 failed logins (15 min), IP+email-keyed rate limit on `/auth/*` |
| Timing attacks | Dummy bcrypt compare on unknown-email login attempts |
| Injection | Zod validation on every input, Prisma parameterized queries, `express-mongo-sanitize` |
| XSS | All user-generated text sanitized with `xss` before storage |
| HTTP hardening | Helmet (CSP, HSTS, frame options), HPP, CORS allowlist |
| Rate limiting | Redis-backed, tiered: global / auth / per-user write actions |
| Secrets | Zod-enforced minimum length at boot — app refuses to start with weak/missing secrets |
| Error handling | Centralized — stack traces and Prisma internals never leak in production |
| AI moderation | **Fails closed** — if Gemini is unreachable, content is held for manual review, never silently published |
| Least privilege | Docker container runs as non-root user |

## API Overview

All endpoints are prefixed with `/api/v1`. Full endpoint list: Auth (7), Post (5),
Reply (4), Report (6), Karma/Profile (2), Notifications (3) — 27 total.

Authenticated requests require `Authorization: Bearer <access_token>`.
Admin endpoints (`/admin/*`) additionally require `trustLevel: expert`.

See `docs/API.md` (or the project's SRS document) for the full request/response
reference.

## Background Jobs (BullMQ)

| Queue | Trigger | Purpose |
|---|---|---|
| `moderation` | Every new post/reply, every report | Gemini safety classification; removes + deducts karma if unsafe |
| `summary` | Every new reply | Regenerates AI summary once a post has 2+ replies |
| `notification` | Karma events, replies, moderation actions | Persists in-app notifications asynchronously |

Run the worker process separately from the API (`npm run worker`) so a slow AI
call never blocks request handling.

## Trust Levels & Karma

| Level | Karma | Unlocks |
|---|---|---|
| Newcomer | 0–99 | Post, reply, upvote, report |
| Contributor | 100–999 | Priority reply sorting |
| Trusted | 1000–4999 | Replies flagged as "expert" |
| Expert | 5000+ | Admin report resolution, user bans |

## Testing

```bash
npm test
```

## License

Proprietary — AnonymousDesk project.
