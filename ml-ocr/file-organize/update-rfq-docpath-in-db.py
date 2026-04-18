import psycopg2

# --- Configuration ---
PG_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "gyan",  # Change this
    "database": "tms_local"         # Change this
}

# doc_type mapping: old → new
DOC_TYPE_MAP = {
    "mii": "MII_FORMAT",
    "scope": "SCOPE_OF_WORK",
    "maf": "MAF_FORMAT",
    "boq": "DETAILED_BOQ",
    "technical": "TECH_SPECS"
}

# Path prefix mapping: new doc_type → prefix folder
PATH_PREFIX_MAP = {
    "SCOPE_OF_WORK": "rfq-scope-of-work",
    "TECH_SPECS": "rfq-tech-specs",
    "DETAILED_BOQ": "rfq-detailed-boq",
    "MAF_FORMAT": "rfq-maf-format",
    "MII_FORMAT": "rfq-mii-format"
}


def main():
    conn = psycopg2.connect(**PG_CONFIG)
    cursor = conn.cursor()

    # Step 1: Check current state
    print("=" * 70)
    print("BEFORE UPDATE - Current doc_type distribution")
    print("=" * 70)
    cursor.execute("""
        SELECT doc_type, COUNT(*) as cnt
        FROM rfq_documents
        GROUP BY doc_type
        ORDER BY doc_type
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:20s} → {row[1]} rows")

    total_updated_type = 0
    total_updated_path = 0

    # Step 2: Update doc_type (old → new)
    print(f"\n{'=' * 70}")
    print("STEP 1: Updating doc_type values")
    print("=" * 70)

    for old_type, new_type in DOC_TYPE_MAP.items():
        cursor.execute("""
            UPDATE rfq_documents
            SET doc_type = %s
            WHERE LOWER(doc_type) = LOWER(%s)
        """, (new_type, old_type))

        count = cursor.rowcount
        total_updated_type += count
        if count > 0:
            print(f"  ✓ '{old_type}' → '{new_type}' : {count} rows updated")
        else:
            print(f"  - '{old_type}' → '{new_type}' : 0 rows (already updated or none exist)")

    # Step 3: Add path prefix where missing
    print(f"\n{'=' * 70}")
    print("STEP 2: Adding path prefixes")
    print("=" * 70)

    for doc_type, prefix in PATH_PREFIX_MAP.items():
        # Only update rows where path does NOT already start with the prefix
        cursor.execute("""
            UPDATE rfq_documents
            SET path = %s || '/' || path
            WHERE doc_type = %s
              AND path IS NOT NULL
              AND path != ''
              AND path NOT LIKE %s
        """, (prefix, doc_type, prefix + '/%'))

        count = cursor.rowcount
        total_updated_path += count
        if count > 0:
            print(f"  ✓ '{doc_type}' → prefix '{prefix}/' : {count} rows updated")
        else:
            print(f"  - '{doc_type}' → prefix '{prefix}/' : 0 rows (already prefixed or none exist)")

    # Step 4: Verify after update
    print(f"\n{'=' * 70}")
    print("AFTER UPDATE - doc_type distribution")
    print("=" * 70)
    cursor.execute("""
        SELECT doc_type, COUNT(*) as cnt
        FROM rfq_documents
        GROUP BY doc_type
        ORDER BY doc_type
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]:20s} → {row[1]} rows")

    # Step 5: Show sample paths to verify
    print(f"\n{'=' * 70}")
    print("SAMPLE PATHS (5 per doc_type)")
    print("=" * 70)
    for doc_type in PATH_PREFIX_MAP.keys():
        cursor.execute("""
            SELECT id, rfq_id, doc_type, path
            FROM rfq_documents
            WHERE doc_type = %s
            ORDER BY id DESC
            LIMIT 5
        """, (doc_type,))
        rows = cursor.fetchall()
        if rows:
            print(f"\n  {doc_type}:")
            for r in rows:
                print(f"    id={r[0]}, rfq_id={r[1]}, path={r[3]}")

    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"  doc_type updates:  {total_updated_type} rows")
    print(f"  path prefix adds:  {total_updated_path} rows")

    # Confirm commit
    confirm = input("\n  Commit changes? (yes/no): ").strip().lower()
    if confirm == "yes":
        conn.commit()
        print("\n  ✓ Changes COMMITTED successfully!")
    else:
        conn.rollback()
        print("\n  ✗ Changes ROLLED BACK. No changes saved.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
