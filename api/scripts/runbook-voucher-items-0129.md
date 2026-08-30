Runbook: Deploy 0129_add_employee_imprest_voucher_items to Live (after 2–3 days)
Status: Changes verified on local. Do not apply to live until scheduled window. This doc is the step-by-step to follow on live.
1. What is being deployed
- New join table employee_imprest_voucher_items (api/src/db/schemas/accounts/employee-imprest-voucher-item.schema.ts:1) — PK(voucher_id, imprest_id), FK cascade to employee_imprest_vouchers (api/src/db/schemas/accounts/employee-imprest-voucher.ts:4) and employee_imprests (api/src/db/schemas/shared/employee-imprest.schema.ts:4).
- Backfill via approval-date window COALESCE(approved_date)::date BETWEEN validFrom AND validTo (api/drizzle/0129_add_employee_imprest_voucher_items.sql:10).
- Runtime sync: buildVoucherIfMissing links items (api/src/modules/imprest-admin/imprest-admin.service.ts:735), approveImprest eager link (api/src/modules/employee-imprest/employee-imprest.service.ts:614), update re-link on amount/approval change, delete unlink, getVoucherById reads via join (api/src/modules/imprest-admin/imprest-admin.service.ts:583).
- Scripts: api/scripts/backfill-voucher-items.ts:1 (--fix-amounts), api/scripts/verify-voucher-items.ts:1.
- Journal api/drizzle/meta/_journal.json:438 idx 86 tag 0129.
Local result: 1070 vouchers, 9495 links, 592 stale amounts synced, verify PASS.
2. Prerequisites (day of deploy)
- Code is on imprest branch at c15db7b4 plus the 7 modified + 4 untracked files (git status shows same diff --stat as local: 7 changed, 4 new).
- api/.env DATABASE_URL points to live DB; PGSSL set if required.
- pnpm install done (postinstall installs puppeteer chrome).
- Maintenance window announced (2–5 min write pause recommended).
3. Backup
pg_dump "$DATABASE_URL" -t employee_imprest_vouchers -t employee_imprests -t employee_imprest_voucher_items > /tmp/pre-0129-$(date +%F).sql
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM employee_imprest_vouchers"   # record: 1070 on dev, note prod count
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM employee_imprests"
4. Build
cd api
NODE_OPTIONS=--max-old-space-size=4096 pnpm build   # api/package.json:9  -> nest build + copy:templates
pnpm test                                          # 1 suite, must PASS
npx tsc --noEmit -p tsconfig.json                 # must exit 0
5. Pre-check live (read-only)
psql "$DATABASE_URL" -c "\dt employee_imprest_voucher_items"   # expect "not found" before
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) AS stale_vouchers
  FROM employee_imprest_vouchers v
  WHERE COALESCE(v.amount,0) <> COALESCE(
    (SELECT SUM(ei.amount) FROM employee_imprests ei
     WHERE ei.user_id=v.beneficiary_name::int
       AND ei.approval_status=1
       AND COALESCE(ei.approved_date)::date BETWEEN v.valid_from::date AND v.valid_to::date),0);"
# Expect ~592 (prod may differ slightly) — this is drift to be fixed
6. Apply migration (idempotent)
Option A — direct SQL (recommended, avoids drizzle-kit generate TTY issue which fails pre-existing on enumsResolver):
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f api/drizzle/0129_add_employee_imprest_voucher_items.sql
# Expected: CREATE TABLE / CREATE INDEX / CREATE INDEX / INSERT 0 <N>
Option B — via drizzle-kit (replays all journals, also idempotent):
pnpm drizzle:migrate   # api/package.json:25  reads api/drizzle/meta/_journal.json
Confirm:
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM employee_imprest_voucher_items"  # ~9495 on dev
7. Sync stale amounts (prod)
pnpm run backfill:voucher-items -- --fix-amounts   # api/package.json:29
# Expected: "linked rows inserted/skipped: 0" + "voucher amounts corrected: 592"
8. Verify (strict, must PASS)
pnpm run verify:voucher-items   # api/scripts/verify-voucher-items.ts:1
# Expected:
#   vouchers checked     : <N>
#   item-count mismatches: 0
#   orphan imprests      : 0
#   stray links          : 0
#   RESULT: PASS
Spot-check one voucher (the one you compared):
curl -s "https://tmsv2.volksenergie.in/api/v1/imprest/voucher/view?userId=64&from=2026-03-31&to=2026-04-05" | jq '.voucher.amount, (.items|length)'
# Before step 7: amount 10000, 7 items  -> MISMATCH (legacy)
# After  step 7: amount 24600, 7 items  -> matches dev, PASS
V004 sum = 5000+5000+2000+1000+800+1800+9000 = 24600.
9. Restart
pm2 restart api --update-env   # or your process manager; also restart worker if used (api/package.json:13 start:worker)
10. Rollback (if needed)
- Amount fix is reversible from backup /tmp/pre-0129-*.sql or by restoring employee_imprest_vouchers table.
- To drop the feature: DROP TABLE IF EXISTS employee_imprest_voucher_items CASCADE; and revert code; getVoucherById falls back to date-range query (prod old behavior).
- Journal entry idx 86 can stay — CREATE TABLE IF NOT EXISTS makes re-apply harmless.
11. Notes
- Do not run pnpm drizzle:generate on live — it fails pre-existing (promptNamedWithSchemasConflict TTY) on a clean tree; hand-written 0129 is the intended path (matches 0121/0122 style).
- All SQL in 0129 is IF NOT EXISTS / ON CONFLICT DO NOTHING — safe to re-run.