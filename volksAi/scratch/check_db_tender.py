import os
import sys
import psycopg2
import json

env_file = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\.env"
db_url = None
with open(env_file, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            db_url = line.strip().split("=", 1)[1].strip("\"'")
            break

if not db_url:
    print("DATABASE_URL not found!")
    sys.exit(1)

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tender_extractions';
""")
cols = cur.fetchall()
print("Columns in tender_extractions:", cols)

cur.execute("""
    SELECT id, tender_id, created_at, updated_at, fields
    FROM tender_extractions 
    WHERE tender_id = 3642
    ORDER BY id DESC LIMIT 5;
""")
rows = cur.fetchall()
print(f"Found {len(rows)} rows for tender 3642:")
for r in rows:
    print(f"ID: {r[0]}, tender_id: {r[1]}, created_at: {r[2]}, updated_at: {r[3]}")
    f_data = r[4]
    if isinstance(f_data, dict):
        print("f_data metadata:", json.dumps(f_data.get("metadata"), indent=2))
        print("f_data top-level keys:", list(f_data.keys())[:15])
    else:
        print("fields:", f_data)

cur.close()
conn.close()
