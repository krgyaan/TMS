# Imprest Voucher — Phased Plan: Approval-Date → Expense-Date Grouping

## Overview

Vouchers are currently derived weekly groups of `employee_imprests` (grouped by
`user_id` + ISO week of `COALESCE(approved_date, created_at)`). The end goal is
to group by **`date_of_expense` week** and lock a week once its voucher is
accounts-approved. These phases move the system there while keeping each step
verifiable.

- **Phase 0** — store imprest↔voucher links explicitly (DONE)
- **Phase 1** — switch grouping to `date_of_expense` week
- **Phase 2** — week-lock: block new entries for accounts-approved weeks
- **Phase 3** — amount / lifecycle integrity
- **Phase 4** — frontend (minimal)
- **Phase 5** — tests & rollout

---

## Phase 0 — DB Layer: Store Imprests with Voucher (DONE)

**Goal:** Make voucher ↔ imprest linkage explicit so no approved entry is ever missed.

### Schema

- `api/src/db/schemas/accounts/employee-imprest-voucher-item.schema.ts`
  - Table `employee_imprest_voucher_items`
    - `voucher_id bigint NOT NULL REFERENCES employee_imprest_vouchers(id) ON DELETE CASCADE`
    - `imprest_id integer NOT NULL REFERENCES employee_imprests(id) ON DELETE CASCADE`
    - `created_at timestamptz NOT NULL DEFAULT now()`
    - `PRIMARY KEY (voucher_id, imprest_id)`
    - indexes: `idx_voucher_items_voucher`, `idx_voucher_items_imprest`
- `api/src/db/schemas/accounts/index.ts` — export the new schema file; also export
  the previously-unexported `employee-imprest-voucher.ts`.

### Migration

- `api/drizzle/0129_add_employee_imprest_voucher_items.sql` (idempotent)
  - `CREATE TABLE IF NOT EXISTS ...`
  - Backfill `INSERT ... SELECT v.id, ei.id` joining
    `employee_imprest_vouchers v` ↔ `employee_imprests ei` on
    `ei.user_id = v.beneficiary_name::int`, `ei.approval_status = 1`,
    `COALESCE(ei.approved_date)::date BETWEEN v.valid_from::date AND v.valid_to::date`,
    with `ON CONFLICT (voucher_id, imprest_id) DO NOTHING`.
- `api/drizzle/meta/_journal.json` — appended entry `idx 86` / `0129_...`
  (original indentation preserved; validated as JSON).

> **Note:** `drizzle:generate` fails repo-wide (pre-existing enum TTY prompt).
> Follow the established pattern of hand-written idempotent SQL (as in 0058–0128).

### Scripts

- `api/scripts/backfill-voucher-items.ts` → `pnpm run backfill:voucher-items [-- --fix-amounts]`
  - Re-runs the idempotent link backfill; `--fix-amounts` also sets
    `employee_imprest_vouchers.amount` to the SUM of linked imprests.
- `api/scripts/verify-voucher-items.ts` → `pnpm run verify:voucher-items [-- --report-only]`
  - Per voucher: expected (legacy approval-date window) vs actual (join table)
    item count + amount sum; checks orphans (approved imprest covered by a
    voucher but unlinked) and strays (linked imprest outside the voucher window).
  - Exits non-zero on mismatch unless `--report-only`.

### Runtime sync (already implemented)

- `buildVoucherIfMissing()` persists item links when a voucher is created.
- `approveImprest()` links the imprest on approve, unlinks on revoke.
- `update()` re-links only when `approvalStatus`/`approvedDate`/`amount` changed.
- `delete()` unlinks before deleting (and blocks when the voucher is accounts-signed).
- `getVoucherById()` reads items via the join table instead of the date-range scan.

### Verification (dev DB)

> 1070 vouchers, 9076 imprests → 9495 links; 0 orphans, 0 strays; PASS after
> fixing 592 stale `amount` rows with `backfill:voucher-items -- --fix-amounts`.

---

## Phase 1 — Backend: Switch Grouping to `date_of_expense` Week (DONE)

**Goal:** Vouchers grouped by `date_of_expense` ISO week, not approval week.

**Key files:** `api/src/modules/imprest-admin/imprest-admin.service.ts`, `api/src/modules/employee-imprest/employee-imprest.service.ts`

- `listVouchersRaw()` — `effective_date = date_of_expense::date` (**strict, no fallback**);
  `validFrom = date_trunc('week', MIN(effective_date))::date`, `validTo = validFrom + 6 days`;
  `fyOptions` uses the same `effective_date`.
- `getEmployeeSummary()` — `voucher_base` selects `date_of_expense::date` (+ `WHERE date_of_expense IS NOT NULL`).
- `getVoucherProofs()` — `EXTRACT(ISOYEAR/WEEK FROM date_of_expense)`.
- `getVoucherById()` — items filter `date_of_expense::date BETWEEN valid_from::date AND valid_to::date`
  (query already reads via the Phase‑0 join table).
- `buildVoucherIfMissing()` — period predicate `date_of_expense::date BETWEEN` + `SUM(amount)` over the expense week.
- `approveImprest()` eager path — use `isoWeekBounds(date_of_expense)` instead of `approvedDate`.
- `date_of_expense` is **required** (DB `NOT NULL`, Zod create/update require it, service throws
  `400` on null). No COALESCE fallback to approval/created date.

### Cleanup / helpers

- `isoWeekBounds(date)` (existing private helper) produces Mon–Sun bounds matching PG
  `date_trunc('week')` — replaces the ad-hoc `MIN + (6 - ((DOW+6)%7))` Sunday math in SQL.
- Re-run `verify:voucher-items` (now strict on `date_of_expense`); `--legacy` audited the OLD
  approval-date grouping.

### Implemented

- `listVouchersRaw()` / `getEmployeeSummary()` / `fyOptions` / `getVoucherProofs()` /
  `getVoucherById()` ordering all use `date_of_expense` only.
- DOW Sunday math replaced with `date_trunc('week', MIN(effective_date))::date` +
  `INTERVAL '6 days'` in both list + summary SQL.
- `buildVoucherIfMissing()` period predicate is `date_of_expense::date BETWEEN from AND to`.
- `ensureVoucherForImprest({ imprestId, userId, effectiveDate, createdBy })` (renamed from
  `approvedDate`) buckets by `isoWeekBounds(effectiveDate)`; throws `400` if `effectiveDate` missing.
- `approveImprest()` / `syncVoucherLinksForUpdatedImprest()` pass `dateOfExpense` only.
- `dateOfExpense` made NOT NULL in schema; migration `0130` backfills nulls then sets `NOT NULL`.
- `verify:voucher-items` defaults to strict `date_of_expense`; `--legacy` restores the approval-date check.

### Migration 0130

```sql
UPDATE employee_imprests SET date_of_expense = COALESCE(approved_date, created_at) WHERE date_of_expense IS NULL;
ALTER TABLE employee_imprests ALTER COLUMN date_of_expense SET NOT NULL;
```
Journal entry `idx 87` (format preserved). Applied to dev DB (`UPDATE 0` — no nulls existed, `ALTER` applied; confirmed `nulls = 0`).

### Verification (dev DB)

> `pnpm build` ✓, `tsc --noEmit` ✓, `pnpm test` ✓, lint parity (services 104→99, all
> pre-existing `no-unsafe-*`). Legacy `--legacy` verify still **PASS** (1070 vouchers, 0
> mismatches/orphans/strays — pre-existing data unchanged). Strict expense-date verify surfaces
> the expected historical drift — 223 vouchers of 1070 bucketed by approval-week no longer align
> (155 orphan imprests, 891 stray links). **Historical vouchers were NOT rebucketed**;
> rebucket is a separate Phase 1b migration if historical consistency is required.

> **Cutover short-circuit (`2026-08-01`):** instead of rebucketing history, the list query
> now switches on `VOUCHER_MONDAY_CUTOVER` (`.env`, default `2026-08-01`): weeks with
> `MIN(effective_date) >= cutover` are bucketed to the ISO Monday (`date_trunc('week', …)`),
> while pre-cutover weeks replay their original `MIN(effective_date)`/end-of-week Sunday
> bucketing. This keeps historic mid-week `valid_from` vouchers matching (and visible as
> Approved) while guaranteeing every **new** voucher is Monday-boundary from now on.
> `listVouchersRaw` and `getEmployeeSummary` both use the branch; `createVoucher` /
> `getVoucherByPeriod` continue to normalize via `isoWeekBounds`, so new vouchers always
> start on Monday regardless of the requested `from` date.

---

## Phase 2 — Week-Lock: Block New Entries for Accounts-Approved Weeks (DONE)

**Goal:** Once `accounts_signed_by <> ''` exists for an expense-week voucher, no
`employee_imprest` may be created, updated, deleted, approved, or have proofs
changed if its `(user_id, ISOYEAR/WEEK of date_of_expense)` maps to that voucher.

**Key file:** `api/src/modules/employee-imprest/employee-imprest.service.ts`

### Guard (`assertExpenseWeekNotLocked`)

Active since Phase 0. Queries `employee_imprest_vouchers` where
`beneficiary_name = String(userId)` AND `EXTRACT(ISOYEAR/WEEK FROM valid_from)` equal to the
expense date's ISOYEAR/WEEK AND `TRIM(COALESCE(accounts_signed_by, '')) <> ''`; throws
`ForbiddenException(voucher code)`. Exempt via `WEEK_LOCK_EXEMPT_PERMISSION = { module:
"shared.imprests", action: "week-lock-exempt" }` (`SUPER_USER`/`ADMIN` auto-exempt, else
`role_permissions`/`user_permissions`, 60s cache).

### Hardening (closed bypasses)

- **`createWithTransfer()`** (guarded) — now also rejects missing/blank `remark`.
- **`update()`** (guarded) — rejects `dateOfExpense === null`; Zod rejects empty `remark` when supplied.
- **`delete(id, actorUser)`** — added week-lock guard before `removeImprestFromVoucher()` (blocks
  unlinked-but-week-locked deletions). Exempt can delete.
- **`uploadDocs()` / `deleteProof()`** — added guard; proof edits blocked on signed weeks (Q1: block).
- **`approveImprest()`** — added guard on the approve (link) path; throws `403` immediately (Q3) instead
  of silently leaving an orphaned approved imprest. `ImprestAdminService.ensureVoucherForImprest` now
  **throws** `ForbiddenException` (was `logger.warn` + skip) when the target voucher is accounts-signed.
- **`addAccountRemark()`** — left open (Q4: writes `accRemark` only, not voucher-week coupling).
- **Controller** — `delete`, `upload`, `deleteProof`, `approve` now pass `req.user as ImprestActorUser`
  (was lossy `@CurrentUser("id")`) so the exempt check has `roleId/roleName`.

### Required `remark`

- DB `remark` → `.notNull()`; migration `api/drizzle/0131_require_imprest_remark.sql` backfills
  blank rows to `'-'` then `SET NOT NULL` (journal `idx 88`; applied to dev: 10 rows backfilled).
- Backend Create Zod: `remark: z.string().trim().min(1)` (required); Update Zod: required-when-supplied
  (`min(1)` on optional). Service adds a `400` guard as defense-in-depth.
- Frontend `imprest.schema.ts` remark → required; `ImprestForm.tsx` remark field now `required` with
  `Enter remark` placeholder.

### Verification

> `pnpm build` ✓, `tsc --noEmit` ✓ (API; web errors are pre-existing in unrelated modules),
> `pnpm test` ✓, lint parity (all remaining are pre-existing `no-unsafe-*`).

### Out of scope

No bulk/excel imprest route exists. Future bulk must call `assertExpenseWeekNotLocked` per record
before the insert transaction, resolve `hasPermission` once per request, and fail the batch atomically
on any locked week.

---

## Phase 3 — Amount / Lifecycle Integrity (DONE)

**Goal:** Voucher `amount` stays consistent; signed vouchers are immutable; concurrent
approval of the same (beneficiary, week) is impossible; approved-on-create orphan bypass is
closed.

### Duplicate Vouchers + Concurrency

- **Migration `api/drizzle/0132_dedup_vouchers_unique_week.sql`** (journal `idx 89`; applied to dev: 44
  zero-amount, 0-item duplicate voucher rows deleted):
  - Deletes non-canonical legacy duplicates per (beneficiary_name, valid_from::date, valid_to::date),
    keeping the row with most signatures (accounts > admin > lowest id).
  - `UNIQUE INDEX` on `(beneficiary_name, valid_from::date, valid_to::date)` **not created** (PG treats
    `timestamptz::date` as non-IMMUTABLE — index and generated-column approaches both fail).
  - Uniqueness enforced **at the application layer** instead (below).
- **`buildVoucherIfMissing()`** (`imprest-admin.service.ts`): acquires `pg_advisory_xact_lock(hashtext(...))`
  on `(beneficiary, from.getTime(), to.getTime())` before `SELECT`+`INSERT`. Lock is held until the
  enclosing transaction commits/rolls back, so concurrent approvals in the same week serialize and
  cannot create duplicate vouchers.
- **`generateVoucherCode()`** acquires a separate FY-wide advisory lock before `MAX()`, preventing
  concurrent creators from generating the same code (`VE/XX/VNNN`).
- **`createVoucher()`** and **`getVoucherByPeriod()`** are now transaction-wrapped so the advisory locks
  in `buildVoucherIfMissing` actually hold (a bare autocommit call would release immediately).

### Tx-Aware Helpers

All internal voucher helpers now accept an optional `tx` parameter (type `DbOrTx = DbInstance | PgTransaction`,
exported from `imprest-admin.service.ts`), defaulting to `this.db`. This allows callers inside a
`db.transaction()` to pass their transaction handle, keeping voucher-link mutations atomic with the
rest of the business operation.

- `linkImprestsToVoucher(voucherId, ids, tx?)`
- `recomputeVoucherAmount(voucherId, tx?)`
- `deleteVoucherIfEmpty(voucherId, tx?)`
- `buildVoucherIfMissing({ ... }, tx?)`
- `ensureVoucherForImprest({ ... }, tx?)`
- `removeImprestFromVoucher(imprestId, tx?)`
- `generateVoucherCode(tx?)`

### Atomicity: Employee-Imprest Mutations

- **`update()`**: voucher sync (`removeImprestFromVoucher` + `ensureVoucherForImprest`) is now **inside the
  same `db.transaction()`** that modifies the imprest. A `ForbiddenException` (locked week) during sync
  rolls back the imprest edit instead of leaving an orphaned approved row.
- **`approveImprest()`**: toggle + `ensureVoucherForImprest`/`removeImprestFromVoucher` run in one `db.transaction()`.
- **`delete()`**: `removeImprestFromVoucher` + insurance removal + `DELETE FROM employee_imprests` run in one
  `db.transaction()` (was split across two calls; a failed `DELETE` could leave the voucher already mutated).
- **`update()` revoke path**: setting `data.approvalStatus === 0` now explicitly sets `approvedDate = null`
  (was left stale, polluting `verify --legacy` audits).

### Approved-On-Create Rejection

- `POST /imprest/employee` with `approvalStatus: 1` is now rejected `400 "Cannot create an
  already-approved imprest. Use the approve endpoint instead."` — prevents orphaned approved rows
  that bypass voucher linking.

### Amount Integrity (Q2)

- **`getVoucherById()`**: compares stored `v.amount` vs `SUM(items.amount)` (approved linked imprests).
  - If mismatch and unsigned: **auto-recompute** `recomputeVoucherAmount()` + `logger.warn`.
  - If mismatch and signed (`TRIM(accounts_signed_by) <> ''`): throw `409 ConflictException` — the
    week is locked and the drift cannot be silently corrected.
- **`accountApproveVoucher()` / `adminApproveVoucher()`**: call `recomputeVoucherAmount()` **inside the signing
  transaction** before setting `accountsSignedBy` / `adminSignedBy`, ensuring the locked `amount` is fresh.

### `deleteVoucherIfEmpty()` (Q4)

- Now retains vouchers approved by **admin** (`admin_signed_by <> ''`) in addition to accounts-signed.
  An empty voucher is only auto-deleted when both `TRIM(accounts_signed_by) = ''` AND
  `TRIM(admin_signed_by) = ''`.

### `syncVoucherLinksForUpdatedImprest()` refactored

Old logic: `wasModified = approvalStatus === 1 || approvedDate` — confused when `update` set `approvedDate`
on revoke. New logic: if `updated.approvalStatus === 1` → rebuild (remove + ensure); otherwise
(unconditionally) → remove. No dependency on `approvedDate` (which is now properly cleared on revoke).

### Verification

> `pnpm build` ✓, `tsc --noEmit` ✓, `pnpm test` ✓, `verify --report-only` shows same historical drift
> as before (orphans/strays unchanged; 44 zero-amount shells removed by dedup). 96 lint problems in
> the two service files — all pre-existing `no-unsafe-*`/`no-unused-vars`; no new lint errors.

---

## Phase 4 — Frontend (Minimal)

**Key files:** `web/src/modules/imprest/VoucherListPage.tsx`, `web/src/modules/imprest/VoucherViewPage.tsx`, `web/src/services/api/imprest.service.ts`

- No API contract change: still `GET /imprest/voucher`, `GET /imprest/voucher/view?userId&from&to`,
  `GET /imprest/voucher/proofs?userId&year&week`.
- List already renders `week / validFrom / validTo / amount` from the API — no change needed.
- View already fetches via `getVoucherById` (now join-backed) — no change needed.
- Optional: show the number of linked imprest items per voucher.

---

## Phase 5 — Tests & Rollout

### Checks

1. `pnpm build` (compiles schema + services)
2. `pnpm lint` (repo lint is slow / pre-existing errors — lint only touched files)
3. `pnpm test` and `pnpm test:e2e`

### Suggested tests

- Unit: `isoWeekBounds` Monday–Sunday boundaries; per-voucher amount aggregation.
- Unit: week-lock — blocked when `accounts_signed_by <> ''` in same ISO week;
  allowed when unsigned, different week, or `week-lock-exempt` permission.
- E2E: `POST /imprest/employee` with expense date inside a locked week → 403;
  `POST` outside → 201/200.
- Idempotency: run `backfill:voucher-items` twice → unchanged counts.

### Runbook

```bash
# Apply migrations (all files are idempotent)
pnpm drizzle:migrate          # or: psql -f api/drizzle/0129_add_employee_imprest_voucher_items.sql

# Backfill + verify (dev/staging before prod)
pnpm run backfill:voucher-items -- --fix-amounts
pnpm run verify:voucher-items

# Deploy API, then web. Week-lock becomes effective with Phase 2.
```

---

## References

- Schemas: `api/src/db/schemas/shared/employee-imprest.schema.ts`,
  `api/src/db/schemas/accounts/employee-imprest-voucher.ts`,
  `api/src/db/schemas/accounts/employee-imprest-voucher-item.schema.ts`
- Services: `api/src/modules/imprest-admin/imprest-admin.service.ts`,
  `api/src/modules/employee-imprest/employee-imprest.service.ts`
- Frontend: `web/src/modules/imprest/VoucherListPage.tsx`, `web/src/modules/imprest/VoucherViewPage.tsx`