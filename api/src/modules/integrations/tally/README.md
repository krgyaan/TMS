# TallyPrime integration

Shared foundation for pushing TMS data into TallyPrime over its XML-over-HTTP
gateway, and for reading masters back. Other modules should depend on this
module instead of building their own Tally calls.

Phase 0 contains connection/company checks and idempotent master operations.
Phase 1 adds the sync schema, money/date helpers, imprest mappings and a
read-only voucher snapshot source. Voucher posting, the queue worker and the
scheduler are still planned below.

## Configuration

All values come from the environment. `TALLY_ENABLED=false` keeps the module
inert and no other `TALLY_*` value is required. When enabled, startup fails
fast and names any missing variable.

| Variable | Default | Notes |
|---|---|---|
| `TALLY_ENABLED` | `false` | Master switch. |
| `TALLY_BASE_URL` | - | Required when enabled. HTTPS only, no credentials/query/fragment. |
| `TALLY_AUTH_TOKEN` | - | Required when enabled. Bearer token for the reverse proxy. Never logged. |
| `TALLY_COMPANY` | - | Required when enabled. Exact company name as loaded in TallyPrime. |
| `TALLY_CA_CERT_PATH` | - | Optional. Absolute path to a PEM private CA that signs the Tally proxy certificate. Validated at startup. |
| `TALLY_CONNECT_TIMEOUT_MS` | `5000` | TCP/TLS connect timeout. |
| `TALLY_HTTP_TIMEOUT_MS` | `30000` | Read timeout. |
| `TALLY_RATE_LIMIT_RPS` | `2` | Shared token-bucket rate. |
| `TALLY_MAX_CONCURRENCY` | `1` | TallyPrime is largely serial; keep at 1. |
| `TALLY_MAX_RETRIES` | `3` | Reserved for read retries in later phases. |
| `TALLY_RETRY_BASE_DELAY_MS` | `500` | Reserved for exponential backoff in later phases. |

Placeholders live in `api/.env.example`. `api/.env` stays git-ignored.

## Module layout

```
src/modules/integrations/tally/
  client/tally.client.ts          health, ping, company list/check, import/export
  masters/tally-masters.service.ts exists/get/list/ensure for group, ledger, cost centre
  masters/name.util.ts            single place for name normalisation/comparison
  transport/tally-http.transport.ts  POST-only HTTPS transport, no redirects, size cap
  transport/rate-limiter.ts       token bucket + concurrency gate (shared instance)
  xml/xml-builder.ts              escaping, envelopes, YYYYMMDD dates
  xml/master-xml.builder.ts       GROUP/LEDGER/COSTCENTRE create fragments
  xml/response-parser.ts          hardened parser + normalised results
  errors/tally.errors.ts          typed errors callers can branch on
  money/paise.ts                  integer-paise parsing, summing, formatting
  dates/ist-date.ts               IST calendar-day formatting
  mappings/imprest-tally.config.ts category->ledger, blocked categories, employee ledgers
  sources/imprest-voucher.source.ts      read-only accounts-signed voucher source
  sources/voucher-snapshot.builder.ts    posting lines, problems, sha256 fingerprint
```

## Phase 1 configuration

`mappings/imprest-tally.config.ts` is the single source for imprest mappings:

- `categoryLedgers`: imprest category id -> expense ledger and group. Empty by
  default; every category is blocked until finance populates it.
- `blockedCategoryIds`: Transfer (22) and Insurance (8). Any voucher containing
  one is not posted.
- `employeeLedgers`: optional user id -> payable ledger name. Falls back to the
  employee name when absent.
- `employeePayableGroup`: parent group for employee payables.

Cost centres are not mapped: the TMS project code is used verbatim as the
Tally cost-centre name. A missing project code blocks the line.

`ImprestVoucherSource.listSnapshots` only reads: it lists accounts-signed
vouchers with posting lines, problem codes and a fingerprint. It never calls
Tally. A voucher is postable only when `problems` is empty.

## Public API

```ts
import { TallyClient, TallyMastersService } from "@/modules/integrations/tally";

const health = await tallyClient.health();
// { enabled, reachable, companyOpen, companyMatches, latencyMs, companies, error? }

await tallyClient.assertCompanyLoaded();
// throws TallyCompanyNotOpen | TallyCompanyMismatch

const exists = await tallyMasters.exists("ledger", "Site Expenses");
const ledger = await tallyMasters.get("ledger", "site expenses"); // case-insensitive
const groups = await tallyMasters.list("group");

await tallyMasters.ensure("group", { name: "Employee Payables", parent: "Current Liabilities" });
await tallyMasters.ensure("ledger", { name: "Site Expenses", parent: "Indirect Expenses" });
await tallyMasters.ensure("costCentre", { name: "HO/2526/VEPL/OE", parent: "Primary" });
```

`ensure` is the create path. It is idempotent: it checks existence first,
treats "already exists" from Tally as success, verifies the parent matches,
and reads the master back after writing. It never resends blindly.

## Operator check

```bash
cd api
pnpm tally:check
```

Prints reachability, whether the configured company is loaded, and master
counts. It performs reads only. Exits non-zero on any failure.

### Voucher preview

```bash
cd api
pnpm tally:preview --from=2026-04-01 --to=2026-06-30
```

Prints every accounts-signed imprest voucher in the IST date range with its
posting lines, totals and blocking problem codes. It reads the database only
and never calls TallyPrime. Exits non-zero when any voucher is not postable;
`UNMAPPED_CATEGORY` means the category is missing from `categoryLedgers`.

## Safety properties

- Every request goes through one shared limiter (`TALLY_RATE_LIMIT_RPS`,
  `TALLY_MAX_CONCURRENCY`).
- HTTPS only, redirects rejected, connect/read timeouts enforced, responses
  capped at 5 MiB.
- gzip/deflate/brotli responses are decoded with the same 5 MiB cap.
- Certificate-trust failures raise `TallyTlsError` (shown as "secure connection
  could not be verified"), never "unreachable". Set `TALLY_CA_CERT_PATH` to the
  private CA; certificate verification is never disabled.
- HTML bodies, non-`ENVELOPE`/`RESPONSE` roots, truncated XML and
  `DOCTYPE`/`ENTITY` declarations are rejected before parsing.
- HTTP 200 is not treated as success: `HEADER/STATUS`, `ERRORS` and
  `LINEERROR` are inspected.
- 401/403 raise `TallyAuthError` with a "check token" message; 429 and 503 are
  retryable.
- Logs contain request id, operation, duration, HTTP status and outcome only.
  Tokens and payloads are never logged.
- Endpoint and company come only from the environment. No request input can
  change them.

## Errors

`TallyError` subclasses expose `code` and `retryable`:

`TallyDisabledError`, `TallyUnreachable`, `TallyTimeout`, `TallyAuthError`,
`TallyRateLimited`, `TallyProtocolError`, `TallyCompanyNotOpen`,
`TallyCompanyMismatch`, `TallyLineError`, `TallyUnknownOutcome`,
`TallyMasterConflict`, `TallyValidationError`, `TallyTlsError`.

## Tests

```bash
cd api
pnpm exec jest --runInBand tally
```

No test calls a real Tally server. The transport tests use a local
`127.0.0.1` HTTP server; everything else injects a fake requester at the HTTP
layer.

## Follow-along plan

### Phase 0 - foundation (done)

- [x] Env schema, fail-fast validation, `.env.example`
- [x] Hardened XML transport, shared rate limiter
- [x] Escaping and envelope builders, hardened response parser
- [x] Connection check, company list, loaded-company check
- [x] Group/ledger/cost-centre `exists`, `get`, `list`, `ensure`
- [x] Typed errors and operator CLI (`pnpm tally:check`)
- [x] Unit tests, type-check, scoped lint

### Phase 1 - data model and mappings (delivered; finance config pending)

- [x] `tally_sync_jobs` and `tally_sync_ledger` Drizzle schemas + migration
- [x] Category -> ledger mapping and project code -> cost centre (single source)
- [x] Expense-report source adapter (`employee_imprest_vouchers` + lines)
- [x] Decimal-safe money handling (integer paise)
- [x] Read-only voucher preview CLI (`pnpm tally:preview`)
- [ ] Populate `categoryLedgers` and confirm employee payable ledger names
- [ ] Apply `0189_create_tally_sync_tables.sql` to the target database

Migrations from 0094 onward are authored as SQL plus a `_journal.json` entry:
`drizzle/meta` snapshots stop at 0093, and `pnpm drizzle:generate` prompts for
enum conflicts so it cannot run non-interactively.

### Phase 2 - vouchers

- [ ] Journal voucher builder with balance validation and narration
- [ ] Voucher lookup by number/date/type (duplicate + unknown-outcome checks)
- [ ] Trial Balance and ledger/group/cost-centre exports for reporting
- [ ] Outcome-unknown flow: query before any resend

### Phase 3 - sync modes and queue

- [ ] Postgres queue with `FOR UPDATE SKIP LOCKED`, FIFO per company
- [ ] Dependency ordering (masters before the voucher that needs them)
- [ ] Bounded retries with exponential backoff + jitter, dead-letter review
- [ ] `sync`, `flush`, `status`; `TALLY_SYNC_MODE` and per-call override
- [ ] Scheduled drain with a re-entrancy lock
- [ ] Authed flush endpoint and CLI

### Open items to confirm against the real TallyPrime

- [ ] Whether "List of Companies" includes configured-but-not-open companies
      (the company-scoped probe is the authoritative check).
- [ ] Cost centre import tag/cost category (`COSTCENTRE` + `Primary` assumed).
- [ ] Master name case sensitivity (we compare case-insensitively, send
      canonical spelling).
- [ ] Response encoding and date format in static variables.
