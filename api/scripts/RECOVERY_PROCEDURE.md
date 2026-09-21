# Recovery Procedure: Restoring Fallback-Logged Extractions & Token Usage

This procedure outlines how to recover extraction results and Claude token usage records that were captured by the fallback logging subsystem during a database failure (such as missing target tables).

> **IMPORTANT**:
> The recovery script defaults to `--dry-run` (read-only inspection).
> Do NOT run with `--apply` against any production database without explicit administrative review and change-window signoff.

---

## Step 1: Locate the Fallback Log Records

When a database failure occurs during extraction saving or token usage recording, the application logs structured JSON records tagged with:
- `[EXTRACTION_FALLBACK_RECOVERY]`
- `[CLAUDE_USAGE_FALLBACK_RECOVERY]`

### Extraction from Server Logs
Run the following on the log files to collect all fallback records into a temporary file:
```bash
grep -E "\[EXTRACTION_FALLBACK_RECOVERY\]|\[CLAUDE_USAGE_FALLBACK_RECOVERY\]" /path/to/logs/tms-api.log > fallback_recovery.log
```

For Tender 3665 specifically:
```bash
grep "3665" /path/to/logs/tms-api.log | grep "FALLBACK_RECOVERY" > tender_3665_fallback.log
```

---

## Step 2: Read-Only Inspection (`--dry-run` by default)

Run the recovery script against the extracted log file. The script **always defaults to `--dry-run`**, so no database writes can happen accidentally:

```bash
cd TMS/tms/api
npx tsx scripts/recover-extraction-data.ts --file fallback_recovery.log --tender 3665
```

Example output:
```text
===============================================================
   TENDER DATA RECOVERY UTILITY (Fallback Log Parser)
===============================================================
 Mode:           >>> DRY-RUN (Read-Only Preview) <<<
 Target Tender:  3665
 Log File:       fallback_recovery.log
---------------------------------------------------------------

Found 1 extraction record(s) and 1 token usage record(s).

[EXTRACTION] Tender 3665 (Job: extract-tender-3665)
  - Fields to restore:   24
  - Missing fields:      none
  - Version:             1.0.0
  - Original Failure:    relation "tender_extractions" does not exist
  -> [DRY-RUN] Would UPSERT into tender_extractions table.

[CLAUDE USAGE] Tender 3665 (Job: extract-tender-3665)
  - Records count:       1
  - Original Failure:    relation "claude_token_usage" does not exist
    * Stage: main_extraction | Model: claude-haiku-4-5-20251001 | Tokens: 12450 | Cost: $0.015200
      -> [DRY-RUN] Would INSERT into claude_token_usage.

---------------------------------------------------------------
 [COMPLETED DRY-RUN] No database modifications were made.
 To write to database (local test environment only), re-run with '--apply'.
===============================================================
```

---

## Step 3: Direct Recovery from Raw JSON (Alternative)

If you have copied the raw fallback log JSON directly from cloud watch / console logs:

```bash
npx tsx scripts/recover-extraction-data.ts --json '{"tag":"EXTRACTION_FALLBACK_RECOVERY","tenderId":3665,"rawExtraction":{"fields":{"emdAmount":{"value":100000}}...}}'
```

---

## Step 4: Applying Recovery (Post-Migration Verification)

Once database migrations have created `tender_extractions` and `claude_token_usage`, verify the tables exist:
```bash
curl http://localhost:3000/api/v1/health
```
Ensure `"database": { "status": "ok" }` and no `missingTables` are returned.

Then run the script with `--apply` in your test environment:
```bash
npx tsx scripts/recover-extraction-data.ts --file fallback_recovery.log --tender 3665 --apply
```

---

## Step 5: Manual SQL Fallback (For DBA Direct Insertion)

If preferred by DBAs, the extracted JSON payload can be inserted via direct SQL:

```sql
-- 1. Insert/Upsert Tender Extraction
INSERT INTO tender_extractions (tender_id, fields, missing_fields, extraction_version, processing_time_ms, user_id, updated_at)
VALUES (
    3665,
    '{"emdAmount": {"value": 100000, "confidence": "high"}}'::jsonb,
    ARRAY[]::text[],
    '1.0.0',
    1500,
    1,
    NOW()
)
ON CONFLICT (tender_id) DO UPDATE
SET fields = EXCLUDED.fields,
    missing_fields = EXCLUDED.missing_fields,
    updated_at = NOW();

-- 2. Insert Claude Token Usage
INSERT INTO claude_token_usage (tender_id, user_id, job_id, call_type, model, input_tokens, output_tokens, total_tokens, estimated_cost_usd, duration_ms, created_at)
VALUES (
    3665,
    1,
    'extract-tender-3665',
    'main_extraction',
    'claude-haiku-4-5-20251001',
    10000,
    800,
    10800,
    0.015200,
    1500,
    NOW()
);
```
