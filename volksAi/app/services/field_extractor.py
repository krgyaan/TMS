import logging
import re
from typing import List, Dict, Any, Optional

from app.models.models import PageResult, TextBlock
from app.ocr.extractors.field_extractor import FieldExtractor
from app.ocr.extractors.gem_field_extractor import GemFieldExtractor

logger = logging.getLogger(__name__)

def extract_tender_fields(
    pages: List[Dict[str, Any]],
    filename_title: str,
    document_type: Optional[str] = "generic_nit"
) -> List[Dict[str, Any]]:
    """
    Unified extractor entrypoint for the background pipeline.
    Routes raw PyMuPDF text pages through the advanced spatial FieldExtractor.
    """
    logger.info("Routing %d pages through unified FieldExtractor...", len(pages))
    
    # 1. Map raw text to PageResults for the spatial engine
    mock_results = []
    for p in pages:
        lines = p.get("text", "").split('\n')
        blocks = []
        # Use real blocks from page_data if available
        raw_blocks = p.get("blocks", [])
        if raw_blocks and all(isinstance(b, dict) and "bounding_box" in b for b in raw_blocks):
            for b in raw_blocks:
                text = b.get("text", "").strip()
                if not text:
                    continue
                blocks.append(TextBlock(
                    block_id=b.get("block_id", f"native_{len(blocks)}"),
                    text=text,
                    confidence=b.get("confidence", 1.0),
                    language_hint=b.get("language_hint", "en"),
                    bounding_box=b["bounding_box"]
                ))
        else:
            # Fallback synthetic boxes only when no block data
            for i, line in enumerate(lines):
                line_str = line.strip()
                if not line_str:
                    continue
                blocks.append(TextBlock(
                    block_id=f"line_{i}",
                    text=line_str,
                    confidence=1.0,
                    language_hint="en",
                    bounding_box={"x1": 0, "y1": i * 20, "x2": 500, "y2": (i * 20) + 15}
                ))
        mock_results.append(PageResult(
            job_id="background-ingest",
            page_number=p.get("page", 1),
            image_path="",
            image_width_px=600,
            image_height_px=max(800, len(lines) * 20),
            processing_time_seconds=0.0,
            text_blocks=blocks,
            layout_regions=[]
        ))
        
    # 2. Run advanced FieldExtractor or GemFieldExtractor based on document type
    is_gem = False
    if pages:
        for p in pages:
            text = p.get("text", "").lower()
            if "bid document" in text or "bid details" in text or "government e-marketplace" in text:
                is_gem = True
                break
            if re.search(r'gem/20\d{2}/[a-z]/\d+', text):
                is_gem = True
                break

    GEM_DOC_TYPES = {"gem_structured", "gem_parent", "gem"}
    if document_type in GEM_DOC_TYPES:
        extractor = GemFieldExtractor()
    elif document_type is not None:
        # Explicit caller document_type wins over content-sniffing heuristic
        extractor = FieldExtractor()
    elif is_gem:
        # Fallback to content-sniffing ONLY when caller passed document_type=None
        extractor = GemFieldExtractor()
    else:
        extractor = FieldExtractor()
    extracted = extractor.extract_fields(mock_results)
    
    # 3. Map extracted fields back to legacy sections structure expected by tender_mapper
    label_mapping = {
        "Tender Value": "Estimated Tender Value",
        "tender_value": "Estimated Tender Value",
        "EMD": "EMD Amount",
        "emd_amount": "EMD Amount",
        "emd_total": "EMD Amount",
        "emd_required": "EMD Required",
        "bid_validity_days": "Bid Validity Period",
        "reverse_auction_enabled": "Reverse Auction Applicable",
        "ra_qualification_rule": "RA Qualification Rule",
        "pbg_percentage": "PBG Percentage",
        "pbg_duration_months": "PBG Duration (Months)",
        "evaluation_method": "Commercial Evaluation Type",
        "NIT No": "Reference ID / NIT No",
        "bid_number": "Reference ID / NIT No",
        "tender_id": "Reference ID / NIT No",
        "Bid Submission End Date": "Bid Submission Deadline",
        "bid_end_datetime": "Bid Submission Deadline",
        "Organisation": "Organisation",
        "organisation_name": "Organisation",
        "organization_name": "Organisation",
        "ministry_name": "Organisation",
        "ministry_state_name": "Organisation",
        "department_name": "Organisation",
        "office_name": "Organisation",
        "Tender Fee": "Tender Fee",
        "tender_fee_amount": "Tender Fee",
        "prs_ld": "Price Reduction Schedule (PRS)",
        "price_reduction_schedule": "Price Reduction Schedule (PRS)",
        "prs_rate": "LD Percentage per Week",
        "prs_max": "Max LD Percentage",
        "payment_terms": "Payment Terms",
        "payment_terms_supply_percent": "Payment Terms %",
        "payment_terms_installation_percent": "Payment Terms Installation (%)",
        "maf_required": "MAF Required",
        "client_contact_person": "Client Contacts",
        "client_contacts": "Client Contacts",
        "full_courier_address_with_pincode": "Courier Address",
        "courier_address": "Courier Address",
        "courier_info": "Courier Information",
        "eligibility_executed_value": "Custom Eligibility Criteria",
        "financial_avg_turnover": "Annual Avg Turnover",
        "minimum_average_annual_turnover": "Annual Avg Turnover",
        "financial_net_worth": "Net Worth",
        "financial_working_capital": "Working Capital",
        "nodal_officer_contact": "Client Contacts 2"
    }
    
    fields = []
    
    # Force include Title as it's typically derived from filename in the simple pipeline
    fields.append({
        "id": "f-title",
        "label": "Tender Name / Title",
        "value": filename_title,
        "confidence": 90.0,
        "critical": False,
        "sourcePage": 1,
        "sourceSnippet": f"Filename Title fallback: {filename_title}",
        "status": "extracted",
        "source": "main_tender"
    })
    
    # Deduplicate fields by label, prioritizing valid values and higher confidence
    label_to_field = {}
    for i, f in enumerate(extracted):
        label = label_mapping.get(f.field_name, f.field_name)
        status = "missing" if (f.value is None or f.value == "Not Found") else "extracted"
        
        # Determine and normalize source tag per canonical set
        raw_source = getattr(f, "source", None) or "main_tender"
        if raw_source in ("gem_parent_pdf", "not_available_stage1"):
            canonical_source = "main_tender"
        elif raw_source in ("main_tender", "atc", "derived", "ambiguous_preserved"):
            canonical_source = raw_source
        else:
            canonical_source = "main_tender"

        field_dict = {
            "id": f"f-{i}",
            "label": label,
            "value": f.value,
            "confidence": f.confidence,
            "critical": getattr(f, "critical", False),
            "sourcePage": getattr(f, "page", getattr(f, "source_page", 1)),
            "sourceSnippet": getattr(f, "source_snippet", getattr(f, "evidence", "")),
            "status": status,
            "source": canonical_source
        }
        existing = label_to_field.get(label)
        if not existing:
            label_to_field[label] = field_dict
        else:
            if field_dict["status"] == "extracted" and existing["status"] == "missing":
                label_to_field[label] = field_dict
            elif field_dict["status"] == existing["status"]:
                if field_dict["confidence"] > existing["confidence"]:
                    label_to_field[label] = field_dict
 
    for label, field_dict in label_to_field.items():
        fields.append(field_dict)
        
    # 4. Handle products
    products = extractor.extract_products(mock_results)
    for idx, p in enumerate(products):
        fields.append({
            "id": f"prod-{idx}",
            "label": f"Requirement: {p.get('category', '').upper()}",
            "value": f"Name: {p.get('product_name', '')} | Qty: {p.get('qty', '')} {p.get('unit', '')} | OEM: {p.get('brand', '')}",
            "confidence": 90.0,
            "critical": False,
            "sourcePage": p.get("page_number", 1),
            "sourceSnippet": p.get("evidence", ""),
            "status": "extracted",
            "source": "main_tender"
        })

    return [{"id": "sec-unified", "title": "Unified Extraction", "fields": fields}]
