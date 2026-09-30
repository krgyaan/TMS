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
from typing import Any, Dict, List, Union

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH

BLOCK_TYPES = ("heading", "paragraph", "blank_field", "table", "signature_line")

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


def build_annexure_docx(annexure: Dict[str, Any], output_path: Union[str, Path]) -> Path:
    """
    Renders one annexure's blocks to a .docx at output_path and returns that path.

    - heading        -> Word "Heading 1" paragraph
    - paragraph      -> normal paragraph
    - blank_field    -> "Label: ______________________________"
    - table          -> real Word table (Table Grid), bold header row
    - signature_line -> right-aligned "______________________________" line with the
                        label on the line below it

    annexureName is stored as the document's core title property rather than added
    to the body, because the blocks normally already include the annexure's own
    heading and repeating it would duplicate it.

    Unknown block types and non-dict blocks are skipped (the resolver's validation
    has already filtered them; this is a last line of defense, not the primary guard).
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = Document()
    doc.core_properties.title = _clean(annexure.get("annexureName"))[:255]

    for block in annexure.get("blocks") or []:
        if not isinstance(block, dict):
            continue
        btype = block.get("type")

        if btype == "heading":
            doc.add_heading(_clean(block.get("text")), level=1)
        elif btype == "paragraph":
            doc.add_paragraph(_clean(block.get("text")))
        elif btype == "blank_field":
            label = _clean(block.get("label"))
            sep = " " if label.endswith(":") else ": "
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

    doc.save(str(output_path))
    return output_path
