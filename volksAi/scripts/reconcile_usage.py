"""
Reconciliation Script: Internal Telemetry vs. Anthropic Organization Usage API
VolksAI / Tender Volks Extraction Pipeline

Cross-checks internal `_llm_usage` telemetry recorded across tender extraction runs
against Anthropic's official Usage API:
  GET https://api.anthropic.com/v1/organizations/usage_report/messages

Reference: https://docs.claude.com/en/api/usage-cost-api

Requirements:
  1. Uses Admin API key from ANTHROPIC_ADMIN_KEY (distinct from regular ANTHROPIC_API_KEY).
  2. Respects documented 5-minute data freshness lag (rejects windows ending < 10m ago).
  3. Groups by model (claude-haiku-4-5-20251001 vs claude-sonnet-5).
  4. Compares token totals side-by-side with a strict 2.0% discrepancy threshold.
  5. If ANTHROPIC_ADMIN_KEY is not set, explicitly reports NOT YET VERIFIED without fabricating results.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import httpx
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load environment
load_dotenv(PROJECT_ROOT / ".env.dev")
load_dotenv(PROJECT_ROOT / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("reconcile_usage")

USAGE_REPORT_URL = "https://api.anthropic.com/v1/organizations/usage_report/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_TOLERANCE_PCT = 2.0
MIN_FRESHNESS_LAG_MINUTES = 10

ROLE_1_MODEL = os.getenv("ANTHROPIC_ROLE1_MODEL", "claude-haiku-4-5-20251001")
ROLE_2_MODEL = os.getenv("ANTHROPIC_ROLE2_MODEL", "claude-sonnet-5")


def parse_iso_datetime(dt_str: str) -> datetime:
    """Parse ISO 8601 string to timezone-aware UTC datetime."""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        raise ValueError(f"Invalid ISO 8601 timestamp '{dt_str}': {e}")


def collect_internal_usage(
    jobs_dir: Path,
    start_dt: datetime,
    end_dt: datetime,
) -> Tuple[Dict[str, Dict[str, int]], int]:
    """
    Scans jobs directory for processed tender details within [start_dt, end_dt]
    and aggregates recorded _llm_usage tokens per model.
    """
    aggregated: Dict[str, Dict[str, int]] = {
        ROLE_1_MODEL: {
            "uncached_input_tokens": 0,
            "cached_input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        },
        ROLE_2_MODEL: {
            "uncached_input_tokens": 0,
            "cached_input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        },
    }
    tenders_count = 0

    if not jobs_dir.exists():
        logger.warning("Jobs directory %s does not exist.", jobs_dir)
        return aggregated, 0

    for job_path in jobs_dir.glob("**/tender_detail.json"):
        try:
            mtime = datetime.fromtimestamp(job_path.stat().st_mtime, tz=timezone.utc)
            if not (start_dt <= mtime <= end_dt):
                continue

            with open(job_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            infosheet = data.get("infosheet_data") or {}
            usage = infosheet.get("_llm_usage")
            if not usage:
                continue

            tenders_count += 1

            # Determine models used
            r1_model = usage.get("role1_model") or ROLE_1_MODEL
            r2_model = usage.get("role2_model") or ROLE_2_MODEL

            if r1_model not in aggregated:
                aggregated[r1_model] = {
                    "uncached_input_tokens": 0, "cached_input_tokens": 0,
                    "cache_creation_input_tokens": 0, "output_tokens": 0, "total_tokens": 0
                }
            if r2_model not in aggregated:
                aggregated[r2_model] = {
                    "uncached_input_tokens": 0, "cached_input_tokens": 0,
                    "cache_creation_input_tokens": 0, "output_tokens": 0, "total_tokens": 0
                }

            in_tok = usage.get("input_tokens", 0)
            out_tok = usage.get("output_tokens", 0)
            cache_create = usage.get("cache_creation_tokens", 0)
            cache_read = usage.get("cache_read_tokens", 0)
            raw_tot = usage.get("raw_processing_tokens") or (in_tok + out_tok + cache_create + cache_read)

            # Attribute tokens to primary model (Role 1 for missing fields, Role 2 for ambiguity)
            aggregated[r1_model]["uncached_input_tokens"] += in_tok
            aggregated[r1_model]["cached_input_tokens"] += cache_read
            aggregated[r1_model]["cache_creation_input_tokens"] += cache_create
            aggregated[r1_model]["output_tokens"] += out_tok
            aggregated[r1_model]["total_tokens"] += raw_tot

        except Exception as err:
            logger.debug("Could not read usage from %s: %s", job_path, err)

    return aggregated, tenders_count


def fetch_anthropic_usage_report(
    admin_key: str,
    start_dt: datetime,
    end_dt: datetime,
    bucket_width: str = "1h",
) -> Dict[str, Dict[str, int]]:
    """
    Calls Anthropic's Organization Usage API to retrieve official message token counts.
    Endpoint: GET https://api.anthropic.com/v1/organizations/usage_report/messages
    """
    headers = {
        "x-api-key": admin_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    params = {
        "starting_at": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ending_at": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "bucket_width": bucket_width,
        "group_by[]": "model",
    }

    results: Dict[str, Dict[str, int]] = {}

    with httpx.Client(timeout=30.0) as client:
        response = client.get(USAGE_REPORT_URL, headers=headers, params=params)
        if response.status_code != 200:
            raise RuntimeError(
                f"Anthropic Usage API request failed (HTTP {response.status_code}): {response.text}"
            )

        payload = response.json()
        data_records = payload.get("data", [])

        for record in data_records:
            model = record.get("model", "unknown")
            if model not in results:
                results[model] = {
                    "uncached_input_tokens": 0,
                    "cached_input_tokens": 0,
                    "cache_creation_input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0,
                }

            uncached_in = record.get("uncached_input_tokens", 0)
            cached_in = record.get("cached_input_tokens", 0)
            cache_create = record.get("cache_creation_input_tokens", 0)
            out_tok = record.get("output_tokens", 0)
            tot_tok = uncached_in + cached_in + cache_create + out_tok

            results[model]["uncached_input_tokens"] += uncached_in
            results[model]["cached_input_tokens"] += cached_in
            results[model]["cache_creation_input_tokens"] += cache_create
            results[model]["output_tokens"] += out_tok
            results[model]["total_tokens"] += tot_tok

    return results


def reconcile(
    start_str: Optional[str] = None,
    end_str: Optional[str] = None,
    tolerance_pct: float = DEFAULT_TOLERANCE_PCT,
    bucket_width: str = "1h",
    jobs_dir_path: Optional[str] = None,
    output_path: Optional[str] = None,
) -> int:
    """
    Executes reconciliation. Returns exit code (0 on match, 1 on discrepancy, 2 on unverified/missing admin key).
    """
    now_utc = datetime.now(timezone.utc)

    # 1. Resolve Time Window
    if end_str:
        end_dt = parse_iso_datetime(end_str)
    else:
        # Default: window ending 15 minutes ago to safely clear the 10-minute lag guard
        end_dt = now_utc - timedelta(minutes=15)

    if start_str:
        start_dt = parse_iso_datetime(start_str)
    else:
        # Default: 2 hours prior to end_dt
        start_dt = end_dt - timedelta(hours=2)

    # 2. Enforce 10-minute data freshness lag guard
    freshness_threshold = now_utc - timedelta(minutes=MIN_FRESHNESS_LAG_MINUTES)
    if end_dt > freshness_threshold:
        logger.error(
            "[FRESHNESS_LAG_GUARD] Window end time %s is less than %d minutes ago (Current UTC: %s).\n"
            "Anthropic's organization usage reporting pipeline has up to 5-minute aggregation latency.\n"
            "To prevent false mismatches from incomplete provider metrics, please specify an ending_at timestamp at least %d minutes in the past.",
            end_dt.isoformat(), MIN_FRESHNESS_LAG_MINUTES, now_utc.isoformat(), MIN_FRESHNESS_LAG_MINUTES
        )
        return 2

    print("\n" + "=" * 95)
    print("ANTHROPIC USAGE API RECONCILIATION AUDIT")
    print(f"Time Window: {start_dt.isoformat()}  -->  {end_dt.isoformat()}")
    print(f"Tolerance Threshold: +/-{tolerance_pct:.1f}%")
    print("=" * 95)

    # 3. Check for Admin API Key
    admin_key = os.getenv("ANTHROPIC_ADMIN_KEY", "").strip()
    if not admin_key or "placeholder" in admin_key.lower():
        print("\n" + "#" * 95)
        print("STATUS: NOT YET VERIFIED — requires ANTHROPIC_ADMIN_KEY")
        print("#" * 95)
        print("\nNotice:")
        print("  - The Anthropic Organization Usage Report API (/v1/organizations/usage_report/messages)")
        print("    requires an Organization Admin API Key (starts with 'sk-ant-admin...').")
        print("  - Standard workspace inference API keys (ANTHROPIC_API_KEY) do not have organization-level")
        print("    usage audit permissions.")
        print("  - Rather than fabricating a 'passing' reconciliation, this status remains explicitly")
        print("    UNVERIFIED until an Admin API key is provisioned.")
        print("\nTo perform live reconciliation:")
        print("  1. In Anthropic Console: Navigate to Settings > Organization Settings > Admin Keys.")
        print("  2. Create an Admin Key and set it in your environment: ANTHROPIC_ADMIN_KEY=<key>")
        print("  3. Run: python scripts/reconcile_usage.py --start <ISO_TIME> --end <ISO_TIME>\n")
        print("=" * 95 + "\n")
        return 2

    # 4. Collect Internal Usage
    jobs_dir = Path(jobs_dir_path) if jobs_dir_path else PROJECT_ROOT / "backend" / "app" / "storage" / "jobs"
    internal_usage, tenders_count = collect_internal_usage(jobs_dir, start_dt, end_dt)
    print(f"\nInternal Telemetry: Scanned {tenders_count} tender jobs in {jobs_dir}")

    # 5. Fetch Anthropic Usage API
    try:
        api_usage = fetch_anthropic_usage_report(admin_key, start_dt, end_dt, bucket_width=bucket_width)
    except Exception as exc:
        logger.error("[API_ERROR] Failed to query Anthropic Usage API: %s", exc)
        return 1

    # 6. Compare side-by-side per model
    all_models = sorted(set(list(internal_usage.keys()) + list(api_usage.keys())))
    has_discrepancy = False
    comparison_results = []

    print("\n" + "-" * 95)
    print(f"{'Model / Metric':<30} | {'Internal Telemetry':<18} | {'Anthropic API':<18} | {'Delta':<10} | {'Status':<10}")
    print("-" * 95)

    for model in all_models:
        int_data = internal_usage.get(model, {"uncached_input_tokens": 0, "cached_input_tokens": 0, "cache_creation_input_tokens": 0, "output_tokens": 0, "total_tokens": 0})
        api_data = api_usage.get(model, {"uncached_input_tokens": 0, "cached_input_tokens": 0, "cache_creation_input_tokens": 0, "output_tokens": 0, "total_tokens": 0})

        metrics = [
            ("Uncached Input Tokens", int_data["uncached_input_tokens"], api_data["uncached_input_tokens"]),
            ("Cached Input Tokens (Read)", int_data["cached_input_tokens"], api_data["cached_input_tokens"]),
            ("Cache Creation Tokens (Write)", int_data["cache_creation_input_tokens"], api_data["cache_creation_input_tokens"]),
            ("Output Tokens", int_data["output_tokens"], api_data["output_tokens"]),
            ("TOTAL RAW TOKENS", int_data["total_tokens"], api_data["total_tokens"]),
        ]

        print(f"\n[{model}]")
        for metric_name, int_val, api_val in metrics:
            diff = int_val - api_val
            delta_pct = ((diff / api_val) * 100) if api_val > 0 else (0.0 if int_val == 0 else 100.0)

            is_fail = abs(delta_pct) > tolerance_pct
            if is_fail and (int_val > 0 or api_val > 0):
                has_discrepancy = True
                status_str = "DISCREPANCY"
            else:
                status_str = "MATCH"

            delta_str = f"{delta_pct:+.1f}%"
            print(f"  {metric_name:<28} | {int_val:>18,d} | {api_val:>18,d} | {delta_str:>10} | {status_str:<10}")

            comparison_results.append({
                "model": model,
                "metric": metric_name,
                "internal_tokens": int_val,
                "anthropic_tokens": api_val,
                "delta_tokens": diff,
                "delta_pct": round(delta_pct, 2),
                "status": status_str,
            })

    print("-" * 95)
    overall_status = "DISCREPANCY DETECTED" if has_discrepancy else "RECONCILED (WITHIN TOLERANCE)"
    print(f"\nOVERALL RECONCILIATION RESULT: {overall_status}")
    print("=" * 95 + "\n")

    report_payload = {
        "timestamp_utc": now_utc.isoformat(),
        "window_starting_at": start_dt.isoformat(),
        "window_ending_at": end_dt.isoformat(),
        "tolerance_pct": tolerance_pct,
        "tenders_scanned": tenders_count,
        "overall_status": overall_status,
        "comparisons": comparison_results,
    }

    out_file = Path(output_path) if output_path else PROJECT_ROOT / "gold_standard" / "reconciliation_report.json"
    try:
        out_file.parent.mkdir(parents=True, exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(report_payload, f, indent=2)
        logger.info("Saved reconciliation report to %s", out_file)
    except Exception as e:
        logger.warning("Could not write reconciliation report to %s: %s", out_file, e)

    return 1 if has_discrepancy else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reconcile internal _llm_usage with Anthropic Organization Usage API.")
    parser.add_argument("--start", help="Starting UTC ISO timestamp (e.g. 2026-09-07T08:00:00Z)")
    parser.add_argument("--end", help="Ending UTC ISO timestamp (e.g. 2026-09-07T14:00:00Z)")
    parser.add_argument("--tolerance", type=float, default=DEFAULT_TOLERANCE_PCT, help="Discrepancy tolerance percentage (default: 2.0)")
    parser.add_argument("--bucket", default="1h", choices=["1m", "1h", "1d"], help="Aggregation bucket width (default: 1h)")
    parser.add_argument("--jobs-dir", help="Path to jobs storage directory")
    parser.add_argument("--output", help="Path to save report json")

    args = parser.parse_args()
    code = reconcile(
        start_str=args.start,
        end_str=args.end,
        tolerance_pct=args.tolerance,
        bucket_width=args.bucket,
        jobs_dir_path=args.jobs_dir,
        output_path=args.output,
    )
    sys.exit(code)
