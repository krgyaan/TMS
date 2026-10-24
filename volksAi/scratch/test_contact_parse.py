import re

text = """
(F) CONTACT DETAILS OF TENDER 
DEALING OFFICER 
Sh. Vishal Kumar 
Sr. Officer [Contract & Procurement] 
Ph: 0891-2513682/2748423 & 885-382 
E-mail: vishal1@gail.co.in   
 
Sh. Narasinga Rao Ch 
Ch. Manager [Contract & Procurement] 
Ph: 0891-2749771; Extn.: 885-380 
E-mail: narasingha.rao@gail.co.in  
"""

def _clean_cname(name_str):
    if not name_str or name_str in ("NA", "N/A", "Not Found"):
        return "NA"
    s = str(name_str).strip()
    s = re.sub(r"^(?:Name|Nodal\s+Officer|Contact\s+Person|Consignee\s+Reporting\s+Officer|Buyer\s+Name)[:\-\s]*", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(?:Shri?|Mr|Ms|Sh|Dr)\.?\s*", "", s, flags=re.IGNORECASE).strip()
    s = s.split("\n")[0].strip()
    s = re.sub(r"[,.:;]+$", "", s).strip()
    return s

def clean_phone(value):
    s = str(value).strip().split("\n")[0].strip()
    s = re.sub(r"\s*(?:&|;|Extn\.?|Ext\.|Extension)\s*.*$", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s*/\s*", " / ", s)
    s = re.sub(r"(?:[\s\-/,:]*\b(?:e|ex|ext|extn)\b\.?)+\s*$", "", s, flags=re.IGNORECASE)
    s = s.strip(" -/,:.")
    return s

officer_block_match = re.search(r"(?:CONTACT\s+DETAILS\s+OF\s+TENDER\s+DEALING\s+OFFICER|TENDER\s+DEALING\s+OFFICER)(.*?)(?=\n\s*(?:SECTION|ANNEXURE|CLAUSE|\d{2,}[\.\s]|\([A-Z]\)|\Z))", text, re.IGNORECASE | re.DOTALL)
officer_text = officer_block_match.group(1).strip()
parts = re.split(r"\n\s*(?=(?:2\.|Officer\s*2|Secondary\s*Dealing\s*Officer|(?:Shri?|Mr|Ms|Sh)\.?\s+[A-Z]))", officer_text, flags=re.IGNORECASE)
valid_parts = [p.strip() for p in parts if p.strip() and (re.search(r"@[a-zA-Z0-9\.\-]", p) or re.search(r"\d{6,}", p))]

print(f"Found {len(valid_parts)} officer parts:")
for i, p in enumerate(valid_parts, 1):
    name_m = re.search(r"(?:Name[:\-\s]+)?((?:Shri?|Mr|Ms|Sh)\.?\s*[^\n]+|[A-Za-z\.\s]{3,40})", p, re.IGNORECASE)
    email_m = re.search(r"E-?mail(?:\s*ID)?[:\-\s]+([a-zA-Z0-9\._%+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,})", p, re.IGNORECASE)
    phone_m = re.search(r"(?:Ph|Phone|Tel|Mobile)(?:\s*No|\s*and\s*Extn)?[:\-\s]+([0-9\+\-\/\(\)\sExtn\.\&;]+)", p, re.IGNORECASE)
    name = _clean_cname(name_m.group(1)) if name_m else "NA"
    email = email_m.group(1).strip() if email_m else "NA"
    phone = clean_phone(phone_m.group(1)) if phone_m else "NA"
    print(f"Officer {i}: Name={name!r}, Email={email!r}, Phone={phone!r}")
