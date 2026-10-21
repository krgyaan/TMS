# TMS — Codebase Guide

## Project Overview

**TMS** (Tender Management System) is an internal operations platform for **Volks Energie** covering tendering, HR, operations, CRM, finance, and analytics. It manages procurement workflows, employee management, work orders, vendor relationships, and business intelligence across 7 teams.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | NestJS 11, TypeScript 5.4, Drizzle ORM 0.44, PostgreSQL |
| Frontend | React 19, Vite 7, Tailwind CSS 4, AG Grid 34, React Query 5 |
| Background Jobs | BullMQ 5.66, Redis, NestJS Schedule |
| ML/OCR | Python (FastAPI, Tesseract, spaCy, OpenAI) |
| Package Manager | pnpm workspaces (3 packages) |
| Monitoring | Grafana, Loki, Promtail, Sentry |
| Auth | JWT (passport-jwt), Google OAuth 2.0 |

## Directory Structure

```
TMS/
├── api/                          # NestJS backend
│   ├── src/
│   │   ├── app.module.ts         # Main module (imports all 29 feature modules)
│   │   ├── main.ts               # Bootstrap: CORS, validation pipe, static assets
│   │   ├── worker.ts             # BullMQ worker orchestration (5 workers)
│   │   ├── modules/              # 29 feature modules
│   │   │   ├── auth/             # JWT + Google OAuth, guards, permissions
│   │   │   ├── master/           # 32 shared data entities (users, roles, teams, statuses, etc.)
│   │   │   ├── operations/       # 19 POs, WOs, contracts, invoicing, inventory
│   │   │   ├── tendering/        # 12 RFQs, costing, bids, reverse auctions, TQ
│   │   │   ├── accounts/         # Imprests, loans, insurance, bank instruments
│   │   │   ├── hrms/             # Employees, training, assets, complaints
│   │   │   ├── crm/              # Leads, follow-ups, happy-calling, broadcasts
│   │   │   ├── services/         # AMCs, service visits, customer feedback
│   │   │   ├── notifications/    # Email, WhatsApp (OpenWA), public signed links
│   │   │   ├── shared/           # Finance docs, PQR, client directory
│   │   │   └── [6 more]          # Scheduler, timers, file-upload, etc.
│   │   ├── db/
│   │   │   ├── database.module.ts    # Global DB provider (Drizzle + pool)
│   │   │   ├── schemas/             # 125 schema files across 10 categories
│   │   │   │   ├── auth/            # users.schema, roles.schema
│   │   │   │   ├── master/          # 30+ shared entities
│   │   │   │   ├── operations/      # POs, WOs, inventory, contracts
│   │   │   │   ├── tendering/       # RFQs, bids, TQ, costing
│   │   │   │   ├── accounts/        # Imprests, loans, bank instruments
│   │   │   │   ├── crm/             # Leads, follow-ups, accounts
│   │   │   │   ├── services/        # AMCs, service visits
│   │   │   │   ├── hrms/            # Employees, training, assets
│   │   │   │   ├── operations/      # Finance, project closure
│   │   │   │   └── [more]
│   │   │   ├── seed.ts              # Bootstrap admin + master data
│   │   ├── config/                  # Zod-validated config modules (app, auth, db, google, redis, etc.)
│   │   ├── logger/                  # Winston logger, HTTP middleware, exception filter
│   │   ├── common/                  # Constants (roles, data scopes, statuses)
│   │   ├── decorators/              # @Public(), @Permissions(), @Role()
│   │   ├── utils/                   # Helpers, status cache
│   │   ├── mailer/                  # Transactional email (Nodemailer)
│   │   ├── infra/                   # Queue module (BullMQ setup)
│   │   ├── webhook/                 # OpenWA webhook handler
│   │   └── openwa/                  # WhatsApp integration (OpenWA client)
│   ├── drizzle/                     # Generated SQL migrations
│   ├── drizzle.config.ts            # Drizzle kit configuration
│   └── package.json
├── web/                             # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx                 # Root: providers (Auth, Theme, Query, Router)
│   │   ├── App.tsx                  # Main router setup
│   │   ├── modules/                 # 20 feature modules mirroring API
│   │   │   ├── accounts/
│   │   │   ├── auth/
│   │   │   ├── operations/
│   │   │   ├── tendering/
│   │   │   ├── crm/
│   │   │   ├── master/
│   │   │   ├── hrms/
│   │   │   ├── services/
│   │   │   ├── notifications/
│   │   │   ├── dashboard/
│   │   │   └── [more]
│   │   ├── components/              # Shared UI (Radix + Tailwind)
│   │   ├── hooks/                   # React Query hooks, custom hooks
│   │   ├── lib/                     # React Query client, utils
│   │   ├── services/                # API client instances
│   │   ├── contexts/                # Auth, theme contexts
│   │   ├── types/                   # Shared TS types
│   │   └── utils/
│   ├── tailwind.config.ts
│   ├── vite.config.ts               # Proxies /api and /uploads to localhost:3000
│   └── package.json
├── ml-ocr/                          # Python FastAPI microservice
│   ├── Dockerfile
│   ├── requirements.txt              # Tesseract, spaCy, OpenAI, FastAPI
│   └── [Python scripts]
├── docker-compose.yml               # Grafana, Loki, Promtail, volksai containers
├── AGENTS.md                        # Project conventions, commands, setup
└── README.md
```

## Essential Commands

| Task | Command |
|---|---|
| **Install** | `pnpm install` |
| **Database** | `pnpm drizzle:generate` → `pnpm drizzle:migrate` → `pnpm db:seed` |
| **Dev (all)** | `pnpm start:dev` (API), `pnpm dev` (web, proxies to API) |
| **Build** | `pnpm build` (copies templates: `src/**/*.hbs` → `dist/`) |
| **Lint** | `pnpm lint` (ESLint, fixes) |
| **Test** | `pnpm test` (jest), `pnpm test:e2e` (E2E) |
| **Worker** | `pnpm start:worker` (BullMQ: 5 queues) |
| **Format** | `pnpm format` (prettier) |

## Architecture

### Authentication & Authorization

**Flow:** Google OAuth or email/password → JWT (httpOnly cookie) → JwtStrategy validates

- **Entry:** `/api/v1/auth/login`, `/api/v1/auth/google/callback`
- **JWT Payload:** `{ id, sub, email, role, roleId, teamId, dataScope, permissions }`
- **Guards:** `@UseGuards(JwtAuthGuard)` extracts user from cookie/header
- **Permissions:** Role-based (admin, manager, user) + fine-grained permission checks
- **Data Scope:** SELF (own), TEAM (team members), ORGANIZATION (org-wide)
- **Files:** `api/src/modules/auth/`, `api/src/modules/auth/guards/`, `api/src/modules/auth/services/permission.service.ts`

### Database Layer (Drizzle ORM + PostgreSQL)

**Setup:**
- **Pool:** Created in `database.module.ts` (max 10 connections by default)
- **Provider:** Exported as `DRIZZLE` symbol, injected globally
- **Schemas:** 125 `.schema.ts` files organized by domain (auth, master, operations, tendering, etc.)
- **Types:** Generated `User`, `NewUser`, etc. via Drizzle inference
- **Migration:** `pnpm drizzle:generate` (diffs schema files), `pnpm drizzle:migrate` (applies SQL)
- **Seeding:** `pnpm db:seed` runs `src/db/seed.ts` (creates admin user, master data)

**Key Tables:**
- `users` (auth/users.schema.ts): id, name, email, password, roleId, teamId, isActive
- `roles` (auth/roles.schema.ts): permissions join table
- `teams`, `organizations`, `statuses`: shared master entities
- Domain tables: purchase_orders, work_orders, rfqs, leads, imprests, etc.

### API Module Structure

**Standard Module Pattern:**
```
src/modules/[domain]/
├── [entity].module.ts           # Imports DB, services, guards
├── [entity].controller.ts       # Routes, decorators
├── [entity].service.ts          # Business logic, repository
├── dtos/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   └── [query].dto.ts           # Pagination, filters (Zod)
├── [entity].spec.ts             # Jest unit tests
└── [guards|pipes|interceptors]/
```

**Data Flow:** Request → Controller (@UseGuards, @Body(ValidationPipe)) → Service (Drizzle queries) → Response

### Frontend Module Structure

**Standard Module Pattern:**
```
web/src/modules/[domain]/
├── routes.tsx                   # React Router definitions
├── pages/
│   ├── [Entity]ListPage.tsx    # AG Grid, React Query
│   └── [Entity]DetailPage.tsx
├── components/
│   ├── [Entity]Form.tsx         # React Hook Form + Zod
│   ├── [Entity]Table.tsx
│   └── [shared components]
├── hooks/
│   ├── useCreate[Entity].ts     # useMutation
│   ├── useFetch[Entity].ts      # useQuery
│   └── [custom hooks]
└── services/
    └── [entity].api.ts          # axios instance
```

**State Management:** React Query v5 (server state), React Context (auth, theme), localStorage (user prefs)

### Background Jobs (BullMQ + Redis)

**Workers:** 5 separate NestJS contexts in `worker.ts`
1. **FollowupWorkerModule** — schedule follow-up notifications
2. **AccountChecklistWorkerModule** — checklist reminders
3. **VideoProcessingWorkerModule** — video uploads, transcoding
4. **GenericMailWorkerModule** — transactional emails
5. **LeadFollowupWorkerModule** — CRM lead follow-ups

**Queue Setup:** `infra/queue/queue.module.ts` provides BullMQ, injected by modules

**Typical Job Flow:**
```ts
// Enqueue in service
@Inject(Queue) private queue: Queue;
await this.queue.add('job-key', { data }, { delay: ms('1h') });

// Process in worker
this.queue.process('job-key', async (job) => {
  // Handle job
});
```

### Notifications (Email + WhatsApp)

**Email:**
- **Mailer:** Transactional via Nodemailer (MAIL_MODE: sandbox/production)
- **Templates:** Handlebars (`.hbs`) in `src/modules/*/` → copied to `dist/` on build
- **Dev Override:** `DEV_OVERRIDE_USER_ID` redirects all dev emails to one user
- **Fallback:** `FALLBACK_MAIL_USER_ID` for system emails

**WhatsApp:**
- **Provider:** OpenWA (WhatsApp Web API)
- **Setup:** `src/openwa/openwa.service.ts` manages client, webhooks
- **Webhook:** `POST /api/v1/webhook/openwa` receives message events
- **Init:** On bootstrap, auto-registers webhook with OpenWA session (idempotent)

**Public Notifications:** Signed links (`PUBLIC_LINK_EXPIRES_IN`: 30d default) allow unauthenticated access to notifications

## Conventions & Patterns

### Naming
- **Controllers:** `[Entity].controller.ts` (PascalCase entity)
- **Services:** `[entity].service.ts` (camelCase)
- **DTOs:** `create-[entity].dto.ts`, `update-[entity].dto.ts` (kebab-case)
- **Schemas:** `[entity].schema.ts` (camelCase in schemas/ tree)
- **Routes:** `/api/v1/[entity]` (kebab-case, plural)

### Validation
- **Backend:** Nestjs ValidationPipe + class-validator decorators, or Zod (in newer modules)
- **Frontend:** React Hook Form + Zod
- **Example:** `export class CreateUserDto { @IsEmail() email: string; }`

### Error Handling
- **Global Filter:** `AllExceptionsFilter` catches all errors, logs via Winston, returns `{ statusCode, message, timestamp }`
- **Custom Exceptions:** NestJS `BadRequestException`, `UnauthorizedException`, `NotFoundException`
- **HTTP Logging:** `HttpLoggerMiddleware` logs request/response, request ID in logs

### Testing
- **Unit:** Jest, `.spec.ts` files colocated with implementation
- **Mocking:** Dependency injection makes testing straightforward
- **E2E:** Separate `test/jest-e2e.json` config, runs integration tests
- **Coverage:** `pnpm test:cov` runs coverage report

### Type Safety
- **DTO Classes:** Validated via class-validator
- **Zod Schemas:** Config validation (app.config.ts, db.config.ts, etc.)
- **Inference:** Drizzle infers types from schemas (`typeof users.$inferSelect`)
- **TypeScript:** 5.4, strict mode, path aliases `@/`, `@db/`, `@config/`

### API Response Pattern
```ts
// Standard success
{ data: T, message?: string }

// Paginated
{ data: T[], pagination: { page, limit, total, pages } }

// Errors
{ statusCode: 400, message: string, timestamp: ISO }
```

## Key Flows

### 1. User Login → Dashboard
1. User visits frontend, clicks "Login with Google" or enters email/password
2. Frontend navigates to `/api/v1/auth/google/callback` or `/api/v1/auth/login`
3. Backend validates credentials, generates JWT
4. JWT stored in httpOnly cookie (`jwt` by default)
5. Backend redirects to frontend callback URL with token
6. Frontend stores token, fetches `/api/v1/auth/me` to load user context
7. Router guards check `JwtAuthGuard`, render dashboard or redirect to login

**Files:** `api/src/modules/auth/auth.controller.ts`, `api/src/modules/auth/auth.service.ts`, `web/src/app/providers/AuthProvider.tsx`

### 2. Create Purchase Order (Operations)
1. User submits form on PO creation page (vendor, items, qty, price)
2. Frontend validates via React Hook Form + Zod, calls `POST /api/v1/operations/purchase-orders`
3. Backend controller receives `CreatePurchaseOrderDto`, validates via ValidationPipe
4. Service queries vendor, checks inventory, creates PO row + product mappings
5. Emits `po.created` event (triggers notifications, worker jobs)
6. Returns `{ data: PurchaseOrder, message: 'Created' }`
7. Frontend refetches PO list via React Query, shows success toast

**Files:** `api/src/modules/operations/purchase-orders/`, `web/src/modules/operations/`

### 3. Tender Bid Submission Workflow
1. User submits bid (RFQ, cost, technical details) on web
2. Frontend calls `POST /api/v1/tendering/bid-submissions`
3. Backend validates: RFQ exists, not closed, user authorized
4. Creates bid row, emits `bid.submitted` event
5. Worker picks up event, generates PDF (Handlebars + pdf-lib)
6. Sends email to tender owner with bid details
7. If bid triggers reverse auction rules, updates auction status
8. Frontend refetches bid list, displays updated status

**Files:** `api/src/modules/tendering/bid-submissions/`, `api/src/modules/notifications/`

### 4. Background Job: Send Follow-up Reminder
1. Follow-up created with `followUpOn: future date`
2. Job enqueued: `await queue.add('send-followup', { id }, { delay: ms until date })`
3. At scheduled time, worker process fires
4. Fetches follow-up record, loads user contact, sends email/WhatsApp
5. Updates follow-up status → completed/failed
6. If failed, requeues with exponential backoff

**Files:** `api/src/worker.ts`, `api/src/modules/follow-up/followup-worker.module.ts`

## Gotchas & Fragile Areas

### 1. Handlebars Templates Must Be in `src/`
- Templates in `src/modules/*/` are copied to `dist/` only on `pnpm build`
- Runtime edits to templates require rebuild
- Dev workaround: edit source, restart dev server

### 2. Drizzle Migrations Are Manual SQL
- Generated migrations in `api/drizzle/*.sql` should not be edited manually
- If a schema change is wrong, delete the migration file and regenerate
- `pnpm drizzle:generate` diffs schema files → generates SQL
- **Never** edit `.sql` files directly unless fixing a broken migration

### 3. Multi-Tenancy: 7 Teams, Not 100% Isolated
- Teams exist but data scopes are permission-based, not row-level security
- `DataScope.TEAM` restricts API queries to user's team members
- **Risk:** Permission bugs expose cross-team data
- Always check `req.user.teamId` and `DataScope` in resource guards

### 4. JWT Token Not Refreshed
- Access tokens expire in 7 days (`JWT_ACCESS_EXPIRATION`)
- No refresh token mechanism yet
- Long-running frontend sessions will 401 after 7 days
- **Workaround:** Implement silent refresh or re-login

### 5. Redis/BullMQ Not Persisted
- Jobs stored in Redis memory only
- If Redis restarts, queued jobs are lost
- **Risk:** Unsent notifications, unprocessed uploads on outage
- Mitigation: add job persistence layer or retry via cron

### 6. Database Pool Exhaustion
- `PG_MAX_POOL=10` by default, may be insufficient under high concurrency
- Long-running queries block other requests
- **Monitor:** Check connection count, increase if needed

### 7. Dev Email Override Only Works with Valid User ID
- `DEV_OVERRIDE_USER_ID` must exist in database
- If user is inactive, email will fail silently
- **Test:** `SELECT * FROM users WHERE id = $1` before setting override

### 8. Google OAuth Scopes & Expiry
- Tokens expire in 1 hour, stored in `oauth_tokens` table
- No auto-refresh implemented; manual re-auth required
- **Impact:** Drive/Sheets integration breaks after 1 hour if not refreshed

### 9. Status Cache Loaded at Startup
- `StatusCache.load()` in `main.ts` caches all statuses
- Cache not invalidated if statuses updated via DB
- **Workaround:** Restart API to refresh

### 10. Frontend Build Output Not Versioned
- `pnpm build` outputs to `web/dist/`, not committed
- Vite may cache aggressively in browser
- **Issue:** CSS/JS updates not visible without hard refresh
- **Solution:** Client-side reload logic in `main.tsx` handles preload errors

## Current State (as of 2026-10-20)

### In Progress (feat/operation branch)
- Vendor merging functionality with preview/confirmation flow
- Vendor directory list/show pages with pagination & search
- Vendor-related route additions and permission guards

### Recent Work
- Work Order notification enhancements (basic details, creator info, team member fields)
- Notification formatting updates

### Known Issues
- [ ] JWT refresh token implementation needed
- [ ] Redis persistence for BullMQ jobs
- [ ] Row-level security for multi-tenant data
- [ ] Google OAuth auto-refresh

### Architecture Debt
- Some modules mix service + repository concerns
- Consistent error response format not enforced everywhere
- Frontend state management uses mix of React Query + Context (could consolidate)

## Rules for Working Here

### ✅ Always Do
1. **Run `pnpm lint` before committing** — ESLint blocks if errors
2. **Create DB migrations via `pnpm drizzle:generate`** — never edit `.sql` manually
3. **Validate inputs in DTOs** — class-validator or Zod
4. **Check guards before implementing features** — respect `@UseGuards(JwtAuthGuard)`, roles, permissions
5. **Test permission scenarios** — especially cross-team data access
6. **Document new guards/decorators** — custom auth logic must be clear
7. **Use `@Inject(Queue)` for async jobs** — avoid fire-and-forget without queueing
8. **Seed master data for features** — tests need valid status/role/permission rows
9. **Build before deploying** — templates and assets must be in `dist/`
10. **Check `.env.example` for new vars** — add to seed config validation

### ❌ Never Do
1. **Edit generated Drizzle SQL files** — regenerate instead
2. **Edit Handlebars templates in `dist/`** — edit source in `src/`
3. **Skip validation** — always validate at DTO layer + controller
4. **Trust user.teamId alone for multi-tenancy** — use DataScope + permission checks
5. **Fire long-running jobs synchronously** — queue them with BullMQ
6. **Hard-code credentials/secrets** — use `.env` and ConfigModule
7. **Commit `node_modules/` or `dist/`** — added to `.gitignore`
8. **Use `any` type without justification** — ESLint warns on floating promises, unsafe args
9. **Merge to `main` without tests passing** — `pnpm lint && pnpm test` required
10. **Deploy without running `pnpm build`** — API won't serve templates/assets

## Resources

- **AGENTS.md** — Full command reference, build scripts, environment setup
- **README.md** — Quick start, tech stack overview
- **docs/ARCHITECTURE.md** — Deep dive into data layer, worker orchestration (if exists)
- **Sentry Dashboard** — Error tracking and performance monitoring
- **Grafana** — Logs via Loki, dashboards for business metrics
