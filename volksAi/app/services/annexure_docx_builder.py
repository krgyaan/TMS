"""
Deterministic .docx builder for Role 4 annexures (see annexure_resolver.py).

Takes ONE annexure's ordered, typed structural blocks and renders a real Word
document with python-docx. No LLM call, no network, no randomness -- the same
block list always produces the same document content, so this is testable in
isolation with hand-built block input.

Block types (the same five the Role 4 tool schema allows):
  {"type": "heading",        "text": str}
  {"type": "paragraph",      "text": str}
  {"type": "blank_field",    "label": str}
  {"type": "table",          "headers": [str], "rows": [[str]]}
  {"type": "signature_line", "label": str}
"""
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

BLOCK_TYPES = ("heading", "paragraph", "blank_field", "table", "signature_line")

# Assets and measured dimensions for company letterhead
ASSETS_DIR = Path(__file__).resolve().parents[2] / "assets"
DEFAULT_HEADER_IMAGE = ASSETS_DIR / "header_band.png"
DEFAULT_FOOTER_IMAGE = ASSETS_DIR / "footer_band.png"

# Measured dimensions from letterhead_volks.pdf at 300 DPI:
# - Page dimensions: standard A4 (595.3 pt x 841.9 pt / 8.27 in x 11.69 in)
# - Header band: height = 459 px at 300 DPI = 110.16 pt (1.53 in)
# - Top margin: header height (110.16 pt) + small gap (17.84 pt) = 128.0 pt (approx 1.78 in)
# - Footer band: height = 47 px at 300 DPI = 11.28 pt, positioned 32.0 pt from bottom
# - Bottom margin: footer top (43.28 pt) + small gap (21.72 pt) = 65.0 pt (approx 0.90 in)
# - Left/right margins: 36.0 pt (0.5 in) matching the letterhead logo and contact alignment
HEADER_BAND_HEIGHT_PT = 110.16
HEADER_GAP_PT = 17.84
TOP_MARGIN_PT = 128.0  # 110.16 + 17.84

FOOTER_BAND_HEIGHT_PT = 11.28
FOOTER_DISTANCE_PT = 32.0
FOOTER_GAP_PT = 21.72
BOTTOM_MARGIN_PT = 65.0  # 32.0 + 11.28 + 21.72

A4_WIDTH_PT = 595.3
A4_HEIGHT_PT = 841.9

LEFT_MARGIN_PT = 36.0
RIGHT_MARGIN_PT = 36.0
HEADER_DISTANCE_PT = 0.0


# Visible fill-in blank rendered after a blank_field label / above a signature label.
BLANK = "_" * 30

# XML 1.0 disallows most C0 control characters; python-docx raises ValueError on
# them, and PDF text extraction occasionally leaves stray ones behind.
_XML_INVALID_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _clean(value: Any) -> str:
    return _XML_INVALID_CHARS.sub("", str(value if value is not None else "")).strip()


def _add_table(doc, headers: List[Any], rows: List[Any]) -> None:
    headers = [_clean(h) for h in (headers or [])]
    rows = [r for r in (rows or []) if isinstance(r, list)]
    n_cols = len(headers) or max((len(r) for r in rows), default=0)
    if n_cols == 0:
        return

    table = doc.add_table(rows=0, cols=n_cols)
    table.style = "Table Grid"

    if headers:
        cells = table.add_row().cells
        for i, h in enumerate(headers):
            cells[i].text = h
            for run in cells[i].paragraphs[0].runs:
                run.bold = True

    for row in rows:
        # Pad short rows / truncate long ones to the header width so a slightly
        # ragged model-produced row never raises IndexError mid-document.
        values = [_clean(v) for v in row][:n_cols]
        values += [""] * (n_cols - len(values))
        cells = table.add_row().cells
        for i, v in enumerate(values):
            cells[i].text = v


# "letterhead" / "letter head" / "letter-head"
_LETTERHEAD = re.compile(r"letter\s*-?\s*head", re.IGNORECASE)
# Parties whose letterhead a form may name instead of the bidder's ("on the bank's
# letterhead", "on letterhead of the OEM") -- those forms must NOT get our letterhead.
_THIRD_PARTY = (
    r"bank(?:er)?|manufacturer|oem|principal|supporting\s+company|guarantor|chartered\s+accountant"
    r"|c\.?\s*a\.?|auditor|company\s+secretary|vendor|supplier|sub-?\s*contractor|issuing\s+authority"
)
_THIRD_PARTY_BEFORE = re.compile(rf"\b(?:{_THIRD_PARTY})(?:'s|s'|’s)?\s+$", re.IGNORECASE)
_THIRD_PARTY_AFTER = re.compile(
    rf"^\s+(?:issued\s+)?(?:of|from|by)\s+(?:the\s+|their\s+|its\s+)?(?:issuing\s+)?(?:{_THIRD_PARTY})\b", re.IGNORECASE,
)


def requires_bidder_letterhead(annexure: Dict[str, Any]) -> bool:
    """
    True when the annexure's own text says it is to be given on (the bidder's) letterhead,
    e.g. "UNDERTAKING ON LETTERHEAD", "on the letterhead of the bidder", "on company
    letterhead". Deterministic text check over the stored name and blocks -- no Claude call.

    A letterhead mention qualified by another party ("on bank's letterhead", "letterhead
    of the OEM") does not count, and forms with no letterhead mention (stamp-paper
    agreements, bank guarantees) stay plain.
    """
    parts = [str(annexure.get("annexureName") or "")]
    for block in annexure.get("blocks") or []:
        if isinstance(block, dict):
            parts += [str(block.get(k) or "") for k in ("text", "label")]
            for row in [block.get("headers") or []] + list(block.get("rows") or []):
                if isinstance(row, list):
                    parts += [str(c) for c in row]
    for text in parts:
        for m in _LETTERHEAD.finditer(text):
            before, after = text[max(0, m.start() - 40):m.start()], text[m.end():m.end() + 50]
            if not (_THIRD_PARTY_BEFORE.search(before) or _THIRD_PARTY_AFTER.search(after)):
                return True
    return False


def _normalize_label(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (label or "").lower()).strip()


def _resolve_field_value(label: str, context: Dict[str, Any]) -> Optional[str]:
    norm = _normalize_label(label)
    if not norm:
        return None

    # Tender number / Bid number
    if any(k in norm for k in (
        "tender no", "tender number", "bid no", "bid number", "nit no", "nit number",
        "gem bid", "rfp no", "tender ref", "reference no", "enquiry no"
    )):
        val = context.get("tender_no") or context.get("tenderNo")
        if val:
            return str(val)

    # Tender / Work name
    if any(k in norm for k in (
        "name of work", "work name", "tender name", "project name", "title of work"
    )):
        val = context.get("tender_name") or context.get("tenderName")
        if val:
            return str(val)

    # Bidder / Company name
    if any(k in norm for k in (
        "name of bidder", "bidder name", "company name", "name of company",
        "firm name", "name of firm", "vendor name", "agency name"
    )):
        return str(context.get("company_name") or context.get("companyName") or "Volks Energie Private Limited")

    # Registered Address
    if any(k in norm for k in ("address", "office address", "registered office")):
        return str(
            context.get("company_address") or context.get("companyAddress")
            or "B-1/D8, 2nd floor, Mohan Cooperative Industrial Estate, New Delhi – 110044"
        )

    # Place / Station
    if norm in ("place", "station", "location"):
        return str(context.get("place") or "New Delhi")

    # Date
    if norm in ("date", "dated"):
        val = context.get("date")
        if val:
            return str(val)

    # Designation
    if any(k in norm for k in ("designation", "capacity")):
        return str(context.get("designation") or "Authorized Signatory")

    # PAN
    if "pan" in norm:
        return str(context.get("pan") or "AADCV9396C")

    # CIN
    if "cin" in norm:
        return str(context.get("cin") or "U40100DL2011PTC228907")

    # GSTIN
    if "gst" in norm:
        return str(context.get("gstin") or context.get("gst") or "07AADCV9396C1Z9")

    # Email
    if "email" in norm or "e mail" in norm:
        return str(context.get("email") or "contact@volksenergie.in")

    # Phone / Mobile
    if any(k in norm for k in ("phone", "mobile", "contact no", "telephone")):
        return str(context.get("phone") or "+91 9650393636")

    # MSME / Udyam
    if any(k in norm for k in ("msme", "udyam")):
        return str(context.get("msme") or "UDYAM-DL-090000465")

    # Signatory Name (e.g. "Name of Authorized Signatory", "Name of Signatory")
    if any(k in norm for k in ("signatory", "authorized representative")):
        val = context.get("signatory_name") or context.get("signatoryName")
        if val:
            return str(val)

    if norm == "name" and (context.get("signatory_name") or context.get("signatoryName")):
        return str(context.get("signatory_name") or context.get("signatoryName"))

    return None


def _fill_paragraph_text(text: str, context: Dict[str, Any]) -> str:
    company_name = str(context.get("company_name") or context.get("companyName") or "Volks Energie Private Limited")
    tender_no = context.get("tender_no") or context.get("tenderNo")
    date_val = context.get("date")

    # Replace M/s ______ (Name of Bidder) or M/s _______
    text = re.sub(
        r"M/s[._\s]*_{2,}\s*(?:\((?:Name of Bidder|Bidder)\))?",
        f"M/s {company_name}",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\(Name of Bidder\)\s*_{2,}",
        f"{company_name}",
        text,
        flags=re.IGNORECASE,
    )

    if tender_no:
        text = re.sub(
            r"((?:offer/?\s*bid\s+no|bid\s+no|tender\s+no|nit\s+no|rfp\s+no)[.:\s]*)_{2,}",
            rf"\g<1>{tender_no}",
            text,
            flags=re.IGNORECASE,
        )

    if date_val:
        text = re.sub(
            r"(dated[.:\s]*)_{2,}",
            rf"\g<1>{date_val}",
            text,
            flags=re.IGNORECASE,
        )

    return text


def build_annexure_docx(
    annexure: Dict[str, Any],
    output_path: Union[str, Path],
    letterhead: bool = False,
    context: Optional[Dict[str, Any]] = None,
) -> Path:
    """
    Renders one annexure's blocks to a .docx at output_path and returns that path.
    With letterhead=True the Volks letterhead (apply_letterhead) is applied first, so the
    body flows between its header and footer bands; the default output is unchanged.

    If letterhead=True and context is provided, known blanks (Tender No, Company Name,
    Place, Date, Designation) and inline bidder placeholders are auto-filled deterministically
    without calling Claude. Forms not requiring bidder letterhead remain plain with original blanks.

    - heading        -> Word "Heading 1" paragraph
    - paragraph      -> normal paragraph
    - blank_field    -> "Label: ______________________________" (or auto-filled value)
    - table          -> real Word table (Table Grid), bold header row
    - signature_line -> right-aligned "______________________________" line with the
                        label on the line below it
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = Document()
    doc.core_properties.title = _clean(annexure.get("annexureName"))[:255]
    # Indian tender forms are A4; python-docx's default template is US Letter.
    for section in doc.sections:
        section.page_width = Pt(A4_WIDTH_PT)
        section.page_height = Pt(A4_HEIGHT_PT)
    if letterhead:
        apply_letterhead(doc)

    for block in annexure.get("blocks") or []:
        if not isinstance(block, dict):
            continue
        btype = block.get("type")

        if btype == "heading":
            doc.add_heading(_clean(block.get("text")), level=1)
        elif btype == "paragraph":
            raw_text = _clean(block.get("text"))
            if letterhead and context:
                raw_text = _fill_paragraph_text(raw_text, context)
            doc.add_paragraph(raw_text)
        elif btype == "blank_field":
            label = _clean(block.get("label"))
            sep = " " if label.endswith(":") else ": "
            value = None
            if letterhead and context:
                value = _resolve_field_value(label, context)
            if value:
                doc.add_paragraph(f"{label}{sep}{value}")
            else:
                doc.add_paragraph(f"{label}{sep}{BLANK}" if label else BLANK)
        elif btype == "table":
            _add_table(doc, block.get("headers"), block.get("rows"))
        elif btype == "signature_line":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            run = p.add_run(BLANK)
            label = _clean(block.get("label"))
            if label:
                run.add_break()
                p.add_run(label)
            if letterhead and context:
                comp_name = context.get("company_name") or context.get("companyName") or "Volks Energie Private Limited"
                run.add_break()
                p.add_run(f"(For {comp_name})")

    doc.save(str(output_path))
    return output_path


def apply_letterhead(
    document: Document,
    header_path: Union[str, Path] = DEFAULT_HEADER_IMAGE,
    footer_path: Union[str, Path] = DEFAULT_FOOTER_IMAGE,
) -> None:
    """
    Applies the Volks letterhead (header band and footer band) to document.

    - Page size is set to standard A4 (595.3 pt x 841.9 pt).
    - Page margins are adjusted so the content area flows cleanly between the header
      and footer bands without overlapping:
        * top margin = 128 pt (header height 110.16 pt + ~18 pt gap)
        * bottom margin = 65 pt (footer top 43.28 pt + ~22 pt gap)
        * left/right margins = 36 pt (0.5 in), matching the logo and footer alignment
        * header_distance = 0 pt (header band sits flush at top of page)
        * footer_distance = 32 pt (footer band sits flush with measured footer baseline)
    - header_band.png is inserted into document's header section
    - footer_band.png is inserted into document's footer section
    Word automatically repeats both bands on every page.
    """
    header_file = Path(header_path)
    footer_file = Path(footer_path)

    if not header_file.is_file():
        raise FileNotFoundError(f"Letterhead header image not found at {header_file}")
    if not footer_file.is_file():
        raise FileNotFoundError(f"Letterhead footer image not found at {footer_file}")

    for section in document.sections:
        # Standard A4 paper dimensions
        section.page_width = Pt(A4_WIDTH_PT)
        section.page_height = Pt(A4_HEIGHT_PT)

        # Content area margins
        section.left_margin = Pt(LEFT_MARGIN_PT)
        section.right_margin = Pt(RIGHT_MARGIN_PT)
        section.top_margin = Pt(TOP_MARGIN_PT)
        section.bottom_margin = Pt(BOTTOM_MARGIN_PT)
        section.header_distance = Pt(HEADER_DISTANCE_PT)
        section.footer_distance = Pt(FOOTER_DISTANCE_PT)

        # Header band: full-bleed width from left margin to right margin
        header = section.header
        header_p = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        header_p.text = ""
        header_p.paragraph_format.space_before = Pt(0)
        header_p.paragraph_format.space_after = Pt(0)
        header_p.paragraph_format.left_indent = -section.left_margin
        header_p.paragraph_format.right_indent = -section.right_margin
        header_run = header_p.add_run()
        header_run.add_picture(str(header_file), width=section.page_width)

        # Footer band: full-bleed width from left margin to right margin
        footer = section.footer
        footer_p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_p.text = ""
        footer_p.paragraph_format.space_before = Pt(0)
        footer_p.paragraph_format.space_after = Pt(0)
        footer_p.paragraph_format.left_indent = -section.left_margin
        footer_p.paragraph_format.right_indent = -section.right_margin
        footer_run = footer_p.add_run()
        footer_run.add_picture(str(footer_file), width=section.page_width)
