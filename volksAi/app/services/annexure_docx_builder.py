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
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

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


def _set_table_styling(table) -> None:
    """
    Applies executive table styling:
    - Inner cell margins (5 pt top/bottom, 7 pt left/right) so text never touches borders
    - Subtle slate borders (#CBD5E1) instead of harsh dark lines
    - Repeating table header across page breaks (w:tblHeader)
    - Row-break protection (w:cantSplit) so individual rows don't break awkwardly across pages
    - Light slate header cell fill (#F1F5F9)
    """
    tblPr = table._element.tblPr

    # Cell margins (dxa = 1/20 pt)
    tblCellMar = OxmlElement("w:tblCellMar")
    for m, val in (("top", 5), ("bottom", 5), ("left", 7), ("right", 7)):
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(int(val * 20)))
        node.set(qn("w:type"), "dxa")
        tblCellMar.append(node)
    tblPr.append(tblCellMar)

    # Subtle borders
    tblBorders = OxmlElement("w:tblBorders")
    for b_name in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = OxmlElement(f"w:{b_name}")
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "CBD5E1")
        tblBorders.append(border)
    tblPr.append(tblBorders)

    for i, row in enumerate(table.rows):
        trPr = row._element.get_or_add_trPr()
        cantSplit = OxmlElement("w:cantSplit")
        trPr.append(cantSplit)
        if i == 0:
            tblHeader = OxmlElement("w:tblHeader")
            trPr.append(tblHeader)
            for cell in row.cells:
                tcPr = cell._element.get_or_add_tcPr()
                shd = OxmlElement("w:shd")
                shd.set(qn("w:val"), "clear")
                shd.set(qn("w:color"), "auto")
                shd.set(qn("w:fill"), "F1F5F9")
                tcPr.append(shd)


def _apply_document_styles(doc: Document) -> None:
    """Configures corporate typography tokens on Normal and Heading 1 styles."""
    try:
        normal = doc.styles["Normal"]
        normal.font.name = "Calibri"
        normal.font.size = Pt(10)
        normal.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
        normal.paragraph_format.line_spacing = 1.15
        normal.paragraph_format.space_after = Pt(4)
    except Exception:
        pass

    try:
        h1 = doc.styles["Heading 1"]
        h1.font.name = "Calibri"
        h1.font.size = Pt(13)
        h1.font.bold = True
        h1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        h1.paragraph_format.space_before = Pt(8)
        h1.paragraph_format.space_after = Pt(6)
        h1.paragraph_format.keep_with_next = True
    except Exception:
        pass


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
            for p in cells[i].paragraphs:
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                for run in p.runs:
                    run.bold = True
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    for row in rows:
        # Pad short rows / truncate long ones to the header width so a slightly
        # ragged model-produced row never raises IndexError mid-document.
        values = [_clean(v) for v in row][:n_cols]
        values += [""] * (n_cols - len(values))
        cells = table.add_row().cells
        for i, v in enumerate(values):
            cells[i].text = v
            for p in cells[i].paragraphs:
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                for run in p.runs:
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)

    _set_table_styling(table)


# Patterns indicating third-party forms or stamp-paper legal instruments.
# These must NOT be printed on the bidder's (Volks Energie's) company letterhead.
_THIRD_PARTY_OR_STAMP_PATTERNS = [
    # Bank / Bank Guarantee (issued by bank on bank letterhead or stamp paper)
    re.compile(r"\bbank(?:er)?(?:'s)?\s+letter\s*-?\s*head\b", re.IGNORECASE),
    re.compile(r"\b(?:proforma|format)\s+(?:of|for)\s+(?:bank\s+guarantee|bg|pbg)\b", re.IGNORECASE),
    re.compile(r"\bbank\s+guarantee\b", re.IGNORECASE),
    re.compile(r"\bfrom\s+(?:the\s+)?issuing\s+bank\b", re.IGNORECASE),
    re.compile(r"\bissuing\s+bank\s+to\b", re.IGNORECASE),
    # OEM / Manufacturer Authorization (issued by manufacturer on OEM letterhead)
    re.compile(r"\bmanufacturer(?:'s)?\s+authorization\b", re.IGNORECASE),
    re.compile(r"\boem\s+authorization\b", re.IGNORECASE),
    re.compile(r"\boem\s+undertaking\b", re.IGNORECASE),
    re.compile(r"\bdealer\s+certificate\b", re.IGNORECASE),
    re.compile(r"\bletter\s*-?\s*head\s+of\s+(?:the\s+)?oem\b", re.IGNORECASE),
    re.compile(r"\bmanufacturer(?:'s)?\s+letter\s*-?\s*head\b", re.IGNORECASE),
    re.compile(r"\bto\s+be\s+issued\s+on\s+(?:the\s+)?manufacturer(?:'s)?\s+letter\s*-?\s*head\b", re.IGNORECASE),
    re.compile(r"\bletter\s*-?\s*head\s+issued\s+by\s+(?:the\s+)?manufacturer\b", re.IGNORECASE),
    # Chartered Accountant Certificate (issued by CA on CA letterhead)
    re.compile(r"\bturnover\s+certificate\b", re.IGNORECASE),
    re.compile(r"\bnet\s*worth\s+certificate\b", re.IGNORECASE),
    re.compile(r"\bsolvency\s+certificate\b", re.IGNORECASE),
    re.compile(r"\bletter\s*-?\s*head\s+of\s+(?:the\s+)?chartered\s+accountant\b", re.IGNORECASE),
    re.compile(r"\bchartered\s+accountant(?:'s)?\s+letter\s*-?\s*head\b", re.IGNORECASE),
    re.compile(r"\bauditor(?:'s)?\s+certificate\b", re.IGNORECASE),
    # Supporting Company / Guarantor (issued by parent or supporting company)
    re.compile(r"\bforeign\s+based\s+supporting\s+company\b", re.IGNORECASE),
    re.compile(r"\bsupporting\s+company\b", re.IGNORECASE),
    re.compile(r"\bparent\s+company\s+guarantee\b", re.IGNORECASE),
    re.compile(r"\bdeed\s+of\s+guarantee\b", re.IGNORECASE),
    # Stamp Paper / Legal instruments (printed on physical stamp paper)
    re.compile(r"\b(?:non-?\s*judicial\s+)?stamp\s+paper\b", re.IGNORECASE),
    re.compile(r"\bindian\s+stamp\s+paper\b", re.IGNORECASE),
    re.compile(r"\bformat\s+of\s+agreement\b", re.IGNORECASE),
    re.compile(r"\bcontract\s+agreement\b", re.IGNORECASE),
    re.compile(r"\bindemnity\s+bond\b", re.IGNORECASE),
]


def requires_bidder_letterhead(annexure: Dict[str, Any]) -> bool:
    """
    Determines if an annexure should be rendered with the bidder's (Volks Energie) official letterhead.

    In tender bidding, all bidder submissions (Technical Specifications compliance, GTPs,
    Schedules of Deviations, Declarations, Undertakings, Formats, and Annexures) are submitted
    on the bidder's official corporate letterhead.

    Forms that do NOT receive bidder letterhead are:
      1. Third-party documents:
         - Bank Guarantees (issued by issuing bank)
         - Manufacturer Authorization Forms / MAF (issued by OEM / manufacturer)
         - CA Turnover / Net Worth certificates (issued by Chartered Accountant)
         - Supporting company / Parent company guarantees
      2. Stamp paper legal instruments:
         - Non-judicial stamp paper undertakings, Deeds, Agreements, Indemnity Bonds
    """
    parts = [str(annexure.get("annexureName") or "")]
    for block in annexure.get("blocks") or []:
        if isinstance(block, dict):
            parts += [str(block.get(k) or "") for k in ("text", "label")]
            for row in [block.get("headers") or []] + list(block.get("rows") or []):
                if isinstance(row, list):
                    parts += [str(c) for c in row]

    combined_text = "\n".join(parts)

    for pattern in _THIRD_PARTY_OR_STAMP_PATTERNS:
        if pattern.search(combined_text):
            return False

    return True


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
    _apply_document_styles(doc)
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
            p = doc.add_paragraph()
            if label:
                lbl_run = p.add_run(f"{label}{sep}")
                lbl_run.bold = True
            if value:
                p.add_run(str(value))
            else:
                p.add_run(BLANK)
        elif btype == "table":
            _add_table(doc, block.get("headers"), block.get("rows"))
        elif btype == "signature_line":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            run = p.add_run(BLANK)
            label = _clean(block.get("label"))
            if label:
                run.add_break()
                lbl_run = p.add_run(label)
                lbl_run.bold = True
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
