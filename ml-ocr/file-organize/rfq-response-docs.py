import os
import shutil
import json
import mysql.connector

# --- Configuration ---
SOURCE_DIR = r"C:\Users\gyan_\Downloads\uploads\rfqdocs"
DEST_BASE_DIR = r"C:\Users\gyan_\Downloads\uploads\organized"

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "gyan",
    "database": "mydb"
}

FILE_COLUMNS = [
    "quotation_document",
    "technical_documents",
    "maf_document",
    "mii_document"
]


def parse_file_list(value):
    """Parse file names from various formats the DB might store them in."""
    if value is None:
        return []

    # Handle bytes
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")

    # Convert to string
    value = str(value).strip()

    # Skip empty values
    if value in ("", "[]", "null", "None", "NULL"):
        return []

    # Try JSON parse
    try:
        files = json.loads(value)
        if isinstance(files, list):
            return [str(f).strip() for f in files if f and str(f).strip()]
        elif isinstance(files, str) and files.strip():
            return [files.strip()]
        return []
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Manual parsing fallback - remove brackets and split
    cleaned = value.strip("[]").strip()
    if not cleaned:
        return []

    files = []
    # Handle quoted comma-separated values
    in_quote = False
    current = ""
    for char in cleaned:
        if char == '"' or char == "'":
            in_quote = not in_quote
        elif char == "," and not in_quote:
            part = current.strip().strip('"').strip("'").strip()
            if part:
                files.append(part)
            current = ""
        else:
            current += char

    # Don't forget last item
    part = current.strip().strip('"').strip("'").strip()
    if part:
        files.append(part)

    return files


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Step 1: Check total row count
    cursor.execute("SELECT COUNT(*) as total FROM `rfq_responses`")
    total = cursor.fetchone()["total"]
    print(f"Total rows in rfq_responses table: {total}\n")

    # Step 2: Fetch ALL rows (no limit, no filter)
    cursor.execute(
        "SELECT `id`, `rfq_id`, `quotation_document`, `technical_documents`, "
        "`maf_document`, `mii_document` FROM `rfq_responses` ORDER BY `id`"
    )
    rows = cursor.fetchall()
    print(f"Total records fetched by query: {len(rows)}\n")

    # Step 3: List all source files for matching
    source_files_set = set()
    source_files_map = {}  # lowercase -> actual filename
    if os.path.exists(SOURCE_DIR):
        for f in os.listdir(SOURCE_DIR):
            if os.path.isfile(os.path.join(SOURCE_DIR, f)):
                source_files_set.add(f)
                source_files_map[f.lower()] = f
        print(f"Total files in source folder: {len(source_files_set)}\n")
    else:
        print(f"ERROR: Source directory does not exist: {SOURCE_DIR}")
        return

    copied_count = 0
    not_found_files = []
    empty_rows = 0

    # Step 4: Process EVERY row
    print("=" * 70)
    print("PROCESSING ALL ROWS")
    print("=" * 70)

    for row in rows:
        row_id = row["id"]
        rfq_id = row["rfq_id"]
        row_has_files = False

        for col_name in FILE_COLUMNS:
            raw_value = row.get(col_name)
            file_names = parse_file_list(raw_value)

            if not file_names:
                continue

            row_has_files = True

            # Create folder for this column
            dest_folder = os.path.join(DEST_BASE_DIR, col_name)
            os.makedirs(dest_folder, exist_ok=True)

            for file_name in file_names:
                # Try exact match
                source_file = os.path.join(SOURCE_DIR, file_name)
                found = os.path.exists(source_file)

                # Try case-insensitive match
                if not found and file_name.lower() in source_files_map:
                    actual_name = source_files_map[file_name.lower()]
                    source_file = os.path.join(SOURCE_DIR, actual_name)
                    found = True

                if found:
                    dest_file = os.path.join(dest_folder, file_name)

                    # Handle duplicate file names
                    if os.path.exists(dest_file):
                        name_part, ext = os.path.splitext(file_name)
                        dest_file = os.path.join(
                            dest_folder,
                            f"{name_part}_rfq{rfq_id}_id{row_id}{ext}"
                        )

                    shutil.copy2(source_file, dest_file)
                    copied_count += 1
                    print(f"  ✓ [id={row_id}] {col_name} → {file_name}")
                else:
                    not_found_files.append({
                        "column": col_name,
                        "id": row_id,
                        "rfq_id": rfq_id,
                        "file_name": file_name,
                        "raw_value": repr(raw_value)
                    })
                    print(f"  ✗ [id={row_id}] {col_name} → NOT FOUND: {file_name}")

        if not row_has_files:
            empty_rows += 1
            print(f"  - [id={row_id}] No files in any column")

    cursor.close()
    conn.close()

    # --- Summary ---
    print(f"\n{'=' * 70}")
    print(f"SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total rows in DB:            {total}")
    print(f"Total rows fetched:          {len(rows)}")
    print(f"Rows with no files:          {empty_rows}")
    print(f"Rows with files:             {len(rows) - empty_rows}")
    print(f"Total files copied:          {copied_count}")
    print(f"Total files not found:       {len(not_found_files)}")
    print(f"Files in source folder:      {len(source_files_set)}")

    if not_found_files:
        print(f"\n{'=' * 70}")
        print(f"MISSING FILES DETAILS")
        print(f"{'=' * 70}")
        for nf in not_found_files:
            print(f"  ID: {nf['id']}, RFQ: {nf['rfq_id']}, "
                  f"Col: {nf['column']}, File: {nf['file_name']}")
            print(f"    Raw DB value: {nf['raw_value']}")

    # Show what folders were created
    print(f"\n{'=' * 70}")
    print(f"OUTPUT FOLDERS")
    print(f"{'=' * 70}")
    if os.path.exists(DEST_BASE_DIR):
        for folder in os.listdir(DEST_BASE_DIR):
            folder_path = os.path.join(DEST_BASE_DIR, folder)
            if os.path.isdir(folder_path):
                file_count = len(os.listdir(folder_path))
                print(f"  {folder}/ → {file_count} files")


if __name__ == "__main__":
    main()
