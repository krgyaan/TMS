"""
Smoke test for the /classify-document endpoint (STEP 4).

Builds a small synthetic native-text PDF on the fly (via PyMuPDF) rather than
relying on a large real OCR-scanned sample, so this stays fast and
deterministic -- the classification logic itself is already covered
exhaustively at the function level in app/services/test_document_classifier.py.
This test only proves the HTTP wiring (upload -> text extraction -> classify
-> JSON response shape) actually works end-to-end.
"""

import fitz
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _build_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_classify_endpoint_rejects_non_pdf():
    response = client.post(
        "/classify-document",
        files={"pdf_file": ("notes.txt", b"just some text", "text/plain")},
    )
    assert response.status_code == 400


def test_classify_endpoint_confident_main_tender():
    pdf_bytes = _build_pdf_bytes("NIT No: TEST/2025/001 Notice Inviting Tender for supply of goods.")
    response = client.post(
        "/classify-document",
        files={"pdf_file": ("nit_document.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestedType"] == "mainTender"
    assert body["needsConfirmation"] is False
    assert body["confidence"] > 0
    assert set(body["scores"].keys()) == {"mainTender", "atc", "boq"}


def test_classify_endpoint_needs_confirmation_on_blank_content():
    pdf_bytes = _build_pdf_bytes("Dear Sir/Madam,")
    response = client.post(
        "/classify-document",
        files={"pdf_file": ("cover_letter.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestedType"] == "other"
    assert body["needsConfirmation"] is True
