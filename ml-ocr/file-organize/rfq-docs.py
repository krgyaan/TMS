import os
import shutil
import mysql.connector

# --- Configuration ---
SOURCE_DIR = r"C:\Users\gyan_\Downloads\uploads\rfqdocs"
DEST_BASE_DIR = r"C:\Users\gyan_\Downloads\uploads\organized"  # Change if needed

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "gyan",
    "database": "mydb"
}

TABLES = [
    "rfq_boqs",
    "rfq_technicals",
    "rfq_scopes",
    "rfq_miis",
    "rfq_mafs"
]

# --- Main Script ---
def main():
    # Connect to MySQL
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    not_found_files = []
    copied_count = 0

    for table_name in TABLES:
        print(f"\n{'='*60}")
        print(f"Processing table: {table_name}")
        print(f"{'='*60}")

        # Create destination folder named after the table
        dest_folder = os.path.join(DEST_BASE_DIR, table_name)
        os.makedirs(dest_folder, exist_ok=True)

        # Query file_path and name from the table
        query = f"SELECT id, rfq_id, name, file_path FROM `{table_name}` WHERE file_path IS NOT NULL"
        cursor.execute(query)
        rows = cursor.fetchall()

        print(f"  Found {len(rows)} records in {table_name}")

        for row in rows:
            file_path = row["file_path"]

            if not file_path:
                continue

            # Extract just the file name from file_path
            # file_path might be a full path or relative path or just a filename
            file_name = os.path.basename(file_path)

            source_file = os.path.join(SOURCE_DIR, file_name)
            dest_file = os.path.join(dest_folder, file_name)

            if os.path.exists(source_file):
                # Handle duplicate file names by appending id
                if os.path.exists(dest_file):
                    name_part, ext = os.path.splitext(file_name)
                    dest_file = os.path.join(dest_folder, f"{name_part}_id{row['id']}{ext}")

                shutil.copy2(source_file, dest_file)
                copied_count += 1
                print(f"  ✓ Copied: {file_name}")
            else:
                not_found_files.append({
                    "table": table_name,
                    "id": row["id"],
                    "rfq_id": row["rfq_id"],
                    "file_name": file_name,
                    "file_path": file_path
                })
                print(f"  ✗ NOT FOUND: {file_name}")

    cursor.close()
    conn.close()

    # --- Summary ---
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total files copied: {copied_count}")
    print(f"Files not found:    {len(not_found_files)}")

    if not_found_files:
        print(f"\n--- Files Not Found ---")
        for nf in not_found_files:
            print(f"  Table: {nf['table']}, ID: {nf['id']}, RFQ_ID: {nf['rfq_id']}, File: {nf['file_path']}")


if __name__ == "__main__":
    main()
