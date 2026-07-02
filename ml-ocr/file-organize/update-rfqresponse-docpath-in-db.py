import psycopg2

# --- Configuration ---
PG_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "gyan",  # Change this
    "database": "tms_local"         # Change this
}

# doc_type mapping: old (lowercase) → new
DOC_TYPE_MAP = {
    "quotation": "QUOTATION",
    "technical": "TECHNICAL",
    "maf": "MAF_FORMAT",
    "mii": "MII_FORMAT"
}

# Path prefix mapping: new doc_type → prefix folder
PATH_PREFIX_MAP = {
    "QUOTATION": "rfq-response-quotation",
    "TECHNICAL": "rfq-response-technical",
    "MAF_FORMAT": "rfq-response-maf",
    "MII_FORMAT": "rfq-response-mii"
}


def clean_path(raw_path):
    """
    Clean broken JSON artifacts from path.
    Examples:
      '["398445437_MAF_(7).pdf"]'                        → '398445437_MAF_(7).pdf'
      '"252158409_file.pdf"'                              → '252158409_file.pdf'
      '"1034741108_file.pdf"]'                            → '1034741108_file.pdf'
      '["178347812_file.pdf"'                             → '178347812_file.pdf'
      '[]'                                                → ''
      'rfq-response-quotation/1772089779741_file.jpeg'   → 'rfq-response-quotation/1772089779741_file.jpeg' (unchanged)
    """
    if not raw_path:
        return ""

    cleaned = raw_path.strip()

    # Remove leading/trailing brackets and quotes
    cleaned = cleaned.strip("[").strip("]").strip('"').strip("'").strip()

    # If it's empty after cleaning (was "[]")
    if not cleaned:
        return ""

    return cleaned


def main():
    conn = psycopg2.connect(**PG_CONFIG)
    cursor = conn.cursor()

    # ============================================================
    # BEFORE STATE
    # ============================================================
    print("=" * 70)
    print("BEFORE UPDATE - rfq_response_documents")
    print("=" * 70)

    cursor.execute("""
        SELECT doc_type, COUNT(*) as cnt
        FROM rfq_response_documents
        GROUP BY doc_type
        ORDER BY doc_type
    """)
    for row in cursor.fetchall():
        print(f"  {str(row[0]):20s} → {row[1]} rows")

    cursor.execute("SELECT COUNT(*) FROM rfq_response_documents")
    total_rows = cursor.fetchone()[0]
    print(f"\n  Total rows: {total_rows}")

    # ============================================================
    # STEP 1: Clean paths (remove JSON artifacts)
    # ============================================================
    print(f"\n{'=' * 70}")
    print("STEP 1: Cleaning broken JSON from path column")
    print("=" * 70)

    # Fetch all rows to clean
    cursor.execute("""
        SELECT id, doc_type, path, rfq_response_id
        FROM rfq_response_documents
        ORDER BY id
    """)
    all_rows = cursor.fetchall()

    cleaned_count = 0
    emptied_count = 0

    for row_id, doc_type, raw_path, rfq_response_id in all_rows:
        if raw_path is None:
            continue

        cleaned = clean_path(raw_path)

        if cleaned != raw_path:
            cursor.execute("""
                UPDATE rfq_response_documents
                SET path = %s
                WHERE id = %s
            """, (cleaned if cleaned else None, row_id))

            cleaned_count += 1

            if not cleaned:
                emptied_count += 1
                print(f"  ✓ [id={row_id}] EMPTIED (was '[]' or empty)")
            else:
                print(f"  ✓ [id={row_id}] Cleaned:")
                print(f"      BEFORE: {repr(raw_path)}")
                print(f"      AFTER:  {repr(cleaned)}")

    print(f"\n  Paths cleaned: {cleaned_count}")
    print(f"  Paths emptied: {emptied_count}")

    # ============================================================
    # STEP 2: Update doc_type (old → new)
    # ============================================================
    print(f"\n{'=' * 70}")
    print("STEP 2: Updating doc_type values")
    print("=" * 70)

    total_updated_type = 0

    for old_type, new_type in DOC_TYPE_MAP.items():
        cursor.execute("""
            UPDATE rfq_response_documents
            SET doc_type = %s
            WHERE LOWER(doc_type) = LOWER(%s)
              AND doc_type != %s
        """, (new_type, old_type, new_type))

        count = cursor.rowcount
        total_updated_type += count
        if count > 0:
            print(f"  ✓ '{old_type}' → '{new_type}' : {count} rows updated")
        else:
            print(f"  - '{old_type}' → '{new_type}' : 0 rows (already correct)")

    # ============================================================
    # STEP 3: Add path prefix where missing
    # ============================================================
    print(f"\n{'=' * 70}")
    print("STEP 3: Adding path prefixes")
    print("=" * 70)

    total_updated_path = 0

    for doc_type, prefix in PATH_PREFIX_MAP.items():
        # Only update rows where:
        #   - doc_type matches
        #   - path is not null and not empty
        #   - path does NOT already start with any known prefix
        cursor.execute("""
            UPDATE rfq_response_documents
            SET path = %s || '/' || path
            WHERE doc_type = %s
              AND path IS NOT NULL
              AND path != ''
              AND path NOT LIKE 'rfq-response-%%'
        """, (prefix, doc_type))

        count = cursor.rowcount
        total_updated_path += count
        if count > 0:
            print(f"  ✓ '{doc_type}' → prefix '{prefix}/' : {count} rows updated")
        else:
            print(f"  - '{doc_type}' → prefix '{prefix}/' : 0 rows (already prefixed)")

    # ============================================================
    # STEP 4: Handle empty paths ([] rows) - optionally delete
    # ============================================================
    print(f"\n{'=' * 70}")
    print("STEP 4: Checking empty/null path rows")
    print("=" * 70)

    cursor.execute("""
        SELECT id, doc_type, rfq_response_id
        FROM rfq_response_documents
        WHERE path IS NULL OR path = ''
        ORDER BY id
    """)
    empty_rows = cursor.fetchall()
    if empty_rows:
        print(f"  Found {len(empty_rows)} rows with empty/null paths:")
        for r in empty_rows:
            print(f"    id={r[0]}, doc_type={r[1]}, rfq_response_id={r[2]}")

        delete_empty = input("\n  Delete these empty rows? (yes/no): ").strip().lower()
        if delete_empty == "yes":
            cursor.execute("""
                DELETE FROM rfq_response_documents
                WHERE path IS NULL OR path = ''
            """)
            print(f"  ✓ Deleted {cursor.rowcount} empty rows")
    else:
        print("  No empty/null path rows found.")

    # ============================================================
    # AFTER STATE - Verification
    # ============================================================
    print(f"\n{'=' * 70}")
    print("AFTER UPDATE - doc_type distribution")
    print("=" * 70)

    cursor.execute("""
        SELECT doc_type, COUNT(*) as cnt
        FROM rfq_response_documents
        GROUP BY doc_type
        ORDER BY doc_type
    """)
    for row in cursor.fetchall():
        print(f"  {str(row[0]):20s} → {row[1]} rows")

    # Sample paths to verify
    print(f"\n{'=' * 70}")
    print("SAMPLE PATHS (3 per doc_type)")
    print("=" * 70)

    for doc_type in PATH_PREFIX_MAP.keys():
        cursor.execute("""
            SELECT id, rfq_response_id, doc_type, path
            FROM rfq_response_documents
            WHERE doc_type = %s AND path IS NOT NULL AND path != ''
            ORDER BY id
            LIMIT 3
        """, (doc_type,))
        rows = cursor.fetchall()
        if rows:
            print(f"\n  {doc_type}:")
            for r in rows:
                print(f"    id={r[0]}, resp_id={r[1]} → {r[3]}")

    # ============================================================
    # SUMMARY
    # ============================================================
    print(f"\n{'=' * 70}")
    print("SUMMARY - rfq_response_documents")
    print("=" * 70)
    print(f"  Paths cleaned (JSON artifacts removed):  {cleaned_count}")
    print(f"  doc_type updates:                        {total_updated_type}")
    print(f"  Path prefix additions:                   {total_updated_path}")

    # Confirm commit
    print(f"\n{'=' * 70}")
    confirm = input("  Commit ALL changes? (yes/no): ").strip().lower()
    if confirm == "yes":
        conn.commit()
        print("\n  ✓ All changes COMMITTED successfully!")
    else:
        conn.rollback()
        print("\n  ✗ All changes ROLLED BACK. No changes saved.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
