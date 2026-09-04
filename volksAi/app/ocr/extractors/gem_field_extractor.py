import re
import yaml
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from rapidfuzz import fuzz

from app.ocr.extractors.field_extractor import FieldExtractor, group_blocks_into_rows
from app.ocr.table_grid_parser import clean_cell_text
from app.models.models import PageResult, TextBlock, LayoutRegion
from app.schemas.schemas import ExtractedFieldSchema, SourceBlockRef, BoundingBox

logger = logging.getLogger("tender_ocr")

DEVANAGARI_RANGE = re.compile(r'[\u0900-\u097F]+')
TENDER_ID_RE = re.compile(r"GEM/20\d{2}/[A-Z]/\d+")

def validate_tender_id(candidate: str | None) -> bool:
    return bool(TENDER_ID_RE.search(candidate or ""))

def strip_devanagari(text: str) -> str:
    """Improves fuzzy match reliability — mixed Hindi/English label text
    dilutes ratio scores even with partial_ratio; stripping Hindi glyphs
    before comparison against English-only anchors reduces false negatives."""
    return DEVANAGARI_RANGE.sub(' ', text).strip()

def detect_column_split(text_blocks: List[TextBlock]) -> int:
    """
    Find the x-coordinate that best separates the label column from the
    value column.
    
    Strategy:
      1. Filter out blocks that span too wide (likely titles, footers, full-width notes)
         to prevent them from skewing the column boundary detection.
      2. Bin block x1 positions into 20px-wide buckets.
      3. Pick the two most populated bins that are >= 4 bins (80px) apart.
      4. Compute a preliminary split from the geometric gap between the
         left-group right edge and the right-group left edge.
      5. **Balance guard**: if the split puts >85% of blocks in one side (i.e. <15% on the other),
         reject it and fall through to gap-based detection.
      6. Gap-based fallback: find the largest x1 gap that satisfies the 15% balance guard.
    """
    if not text_blocks:
        return 300

    total = len(text_blocks)
    
    # Filter out blocks that span too wide (e.g. full width text/paragraphs)
    max_x = max(b.bounding_box["x2"] for b in text_blocks)
    min_x = min(b.bounding_box["x1"] for b in text_blocks)
    page_width = max_x - min_x or 1
    
    filtered_blocks = [
        b for b in text_blocks
        if (b.bounding_box["x2"] - b.bounding_box["x1"]) < 0.5 * page_width
    ]
    if not filtered_blocks:
        filtered_blocks = text_blocks
    
    # ── 1. Try x1 binning ─────────────────────────────────────────────
    bins: Dict[int, int] = {}
    for b in filtered_blocks:
        key = b.bounding_box["x1"] // 20
        bins[key] = bins.get(key, 0) + 1

    sorted_bins = sorted(bins.items(), key=lambda kv: kv[1], reverse=True)

    if len(sorted_bins) >= 2:
        top2 = sorted(sorted_bins[:2], key=lambda kv: kv[0])
        bin1, bin2 = top2[0][0], top2[1][0]
        if bin2 - bin1 >= 4:
            mid_bin_x = (bin1 + bin2) * 10
            left_col_blocks = [b for b in filtered_blocks if b.bounding_box["x1"] < mid_bin_x]
            right_col_blocks = [b for b in filtered_blocks if b.bounding_box["x1"] >= mid_bin_x]

            max_left_x2 = max(b.bounding_box["x2"] for b in left_col_blocks) if left_col_blocks else (bin1 * 20 + 20)
            min_right_x1 = min(b.bounding_box["x1"] for b in right_col_blocks) if right_col_blocks else (bin2 * 20)

            col_split = (max_left_x2 + min_right_x1) // 2

            # ── Balance guard: reject lopsided splits ──────
            n_left = sum(1 for b in text_blocks if b.bounding_box["x1"] < col_split)
            n_right = total - n_left
            minority = min(n_left, n_right)
            if minority / total >= 0.15:          # at least 15% on each side
                return int(col_split)
            # else: lopsided — fall through to gap-based detection

    # ── 2. Gap-based fallback ──────────────────────────────────────────
    # Use *unique* x1 positions to avoid duplicate-heavy bins biasing gaps
    x1_positions = sorted(set(b.bounding_box["x1"] for b in filtered_blocks))
    if len(x1_positions) < 2:
        return 300
    gaps = [(x1_positions[i+1] - x1_positions[i], x1_positions[i])
            for i in range(len(x1_positions) - 1)]
    page_width_fallback = x1_positions[-1] - x1_positions[0] or 1
    
    # We check candidate gaps using the midpoint of the gap relative to page margins
    candidate_gaps = [
        g for g in gaps
        if 0.15 * page_width_fallback < (g[1] + g[0] // 2 - x1_positions[0]) < 0.85 * page_width_fallback
    ]
    
    gaps_to_check = candidate_gaps or gaps
    balanced_gaps = []
    for gap_size, gap_start in gaps_to_check:
        split = gap_start + gap_size // 2
        n_left = sum(1 for b in text_blocks if b.bounding_box["x1"] < split)
        n_right = total - n_left
        minority = min(n_left, n_right)
        if minority / total >= 0.15:
            balanced_gaps.append((gap_size, gap_start))
            
    if balanced_gaps:
        best_gap = max(balanced_gaps, key=lambda g: g[0])
    else:
        best_gap = max(gaps_to_check, key=lambda g: g[0])
        
    return best_gap[1] + best_gap[0] // 2

def merge_into_cells(blocks: List[TextBlock], y_gap_tolerance: int = 20) -> List[Dict[str, Any]]:
    """
    Merge vertically-stacked blocks within ONE column into a single logical
    cell when they are close enough vertically to be a wrapped label/value
    (not a new row). Returns list of {"text": str, "bbox": {...}, "blocks": [...]}.
    """
    is_digital_page = all(b.confidence >= 1.0 for b in blocks) if blocks else False
    if is_digital_page and y_gap_tolerance == 20:
        y_gap_tolerance = 5

    blocks_sorted = sorted(blocks, key=lambda b: b.bounding_box["y1"])
    cells: List[Dict[str, Any]] = []
    for block in blocks_sorted:
        if cells:
            last = cells[-1]
            last_y2 = last["bbox"]["y2"]
            if block.bounding_box["y1"] - last_y2 <= y_gap_tolerance:
                # Same cell — merge text, extend bbox
                last["text"] += " " + block.text
                last["bbox"]["y2"] = max(last["bbox"]["y2"], block.bounding_box["y2"])
                last["bbox"]["x2"] = max(last["bbox"]["x2"], block.bounding_box["x2"])
                last["blocks"].append(block)
                continue
        cells.append({
            "text": block.text,
            "bbox": dict(block.bounding_box),
            "blocks": [block],
        })
    return cells

def pair_cells_by_row(left_cells: List[Dict[str, Any]], right_cells: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """
    Pair a left-column cell to a right-column cell when their y-ranges
    overlap (not just when y1 matches exactly — wrapped cells of different
    line-counts on each side will have different total heights).
    """
    pairs = []
    used_right = set()
    for l_cell in left_cells:
        ly1, ly2 = l_cell["bbox"]["y1"], l_cell["bbox"]["y2"]
        best_match, best_overlap = None, 0
        for i, r_cell in enumerate(right_cells):
            if i in used_right:
                continue
            ry1, ry2 = r_cell["bbox"]["y1"], r_cell["bbox"]["y2"]
            overlap = min(ly2, ry2) - max(ly1, ry1)
            if overlap > best_overlap:
                best_match, best_overlap = i, overlap
        if best_match is not None and best_overlap > 0:
            pairs.append((l_cell, right_cells[best_match]))
            used_right.add(best_match)
    return pairs

def pair_labels_to_values(text_blocks: List[TextBlock]) -> List[Tuple[Dict[str, Any], Dict[str, Any]]]:
    col_split = detect_column_split(text_blocks)
    left_blocks = [b for b in text_blocks if b.bounding_box["x1"] < col_split]
    right_blocks = [b for b in text_blocks if b.bounding_box["x1"] >= col_split]
    left_cells = merge_into_cells(left_blocks)
    right_cells = merge_into_cells(right_blocks)
    return pair_cells_by_row(left_cells, right_cells)

# Backward compatibility wrappers
def merge_blocks_into_cells(blocks: List[TextBlock], y_threshold: int = 30) -> List[Dict[str, Any]]:
    cells = merge_into_cells(blocks, y_threshold)
    for c in cells:
        c["bounding_box"] = c["bbox"]
    return cells

def find_paired_right_cell(left_cell: Dict[str, Any], right_cells: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    lc = dict(left_cell)
    lc["bbox"] = lc.get("bounding_box", lc.get("bbox", {}))
    rcs = []
    for r in right_cells:
        rc = dict(r)
        rc["bbox"] = rc.get("bounding_box", rc.get("bbox", {}))
        rcs.append(rc)
    pairs = pair_cells_by_row([lc], rcs)
    if pairs:
        matched_text = pairs[0][1]["text"]
        for r in right_cells:
            if r["text"] == matched_text:
                return r
    return None

SECTION_HEADERS = [
    "EMD Detail",
    "ePBG Detail",
    "Bid Details",
    "MSE Purchase Preference",
    "MII Purchase Preference"
]

FIELD_ANCHORS = {
    # namespaced fields — resolved only within the matching section
    "emd_advisory_bank": {"section": "EMD Detail", "anchors": ["Advisory Bank"]},
    "pbg_advisory_bank": {"section": "ePBG Detail", "anchors": ["Advisory Bank"]},
    "emd_amount": {"section": None, "anchors": ["EMD Amount", "EMD Amount (In INR)"]},
    "emd_required": {"section": "EMD Detail", "anchors": ["Required", "Required/आवश्यकता"]},
    "pbg_percentage": {"section": None, "anchors": ["ePBG Percentage", "Percentage (%)", "ePBG Percentage(%)"]},
    "pbg_duration_months": {"section": None, "anchors": ["Duration of ePBG required", "Duration of ePBG required (Months)", "Duration of ePBG"]},
    # unnamespaced (single occurrence per document)
    "tender_id": {"section": None, "anchors": ["Bid Number", "Bid Number/बोली क्रमांक"]},
    "bid_end_datetime": {"section": None, "anchors": ["Bid End Date/Time", "Bid End Date", "Bid End Date/Time / बोली समाप्ति दिनांक/समय"]},
    "bid_validity_days": {"section": None, "anchors": ["Bid Offer Validity", "Bid Offer Validity (Days)", "Bid Validity Period", "Bid Validity"]},
    "reverse_auction_enabled": {"section": None, "anchors": ["Bid to RA enabled", "Bid to RA enabled / बोली से RA सक्षम"]},
    "ra_qualification_rule": {"section": None, "anchors": ["RA Qualification Rule", "Reverse Auction Qualification Rule"]},
    "evaluation_method": {"section": None, "anchors": ["Evaluation Method"]},
    "organization_name": {"section": None, "anchors": ["Organisation Name", "Organization Name"]},
    "department_name": {"section": None, "anchors": ["Department Name"]},
    "ministry_state_name": {"section": None, "anchors": ["Ministry/State Name"]},
    "office_name": {"section": None, "anchors": ["Office Name"]},
    "total_quantity": {"section": None, "anchors": ["Total Quantity"]},
    "bid_type": {"section": None, "anchors": ["Type of Bid"]},
    "bid_published_date": {"section": None, "anchors": ["Dated"]},
    "item_category": {"section": None, "anchors": ["Item Category", "Primary product category"]},
    "bid_opening_datetime": {"section": None, "anchors": ["Bid Opening Date/Time"]},
    "auto_extension_days": {"section": None, "anchors": ["Number of days for which Bid would be auto-extended"]},
    "auto_extension_max_count": {"section": None, "anchors": ["Number of Auto Extension count"]},
    "min_bids_to_disable_auto_extension": {"section": None, "anchors": ["Minimum number of bids required to disable automatic bid extension"]},
    "pre_bid_meeting": {"section": None, "anchors": ["Pre-Bid Date and Time", "Pre-Bid Venue"]},
    "beneficiary_name": {"section": None, "anchors": ["Beneficiary"]},
    "inspection_required": {"section": None, "anchors": ["Inspection Required"]},
    "arbitration_clause": {"section": None, "anchors": ["Arbitration Clause"]},
    "mediation_clause": {"section": None, "anchors": ["Mediation Clause"]},
    "mse_relaxation_experience_turnover": {"section": None, "anchors": ["MSE Relaxation for Years of Experience and Turnover", "MSE Exemption for Years of Experience and Turnover", "MSE Relaxation"]},
    "startup_relaxation_experience_turnover": {"section": None, "anchors": ["Startup Relaxation for Years Of Experience and Turnover", "Startup Exemption for Years of Experience and Turnover", "Startup Exemption for Years Of Experience and Turnover", "Startup Relaxation"]},
    "mse_purchase_preference": {"section": None, "anchors": ["MSE Purchase Preference", "MSE Purchase Preference / एमएसई खरीद वरीयता"]},
    "mse_preference_price_band_percent": {"section": None, "anchors": ["Purchase Preference to MSE OEMs available upto price within L1+X%"]},
    "mse_preference_max_qty_percent": {"section": None, "anchors": ["Maximum Percentage of Bid quantity for MSE purchase preference"]},
    "mii_purchase_preference": {"section": None, "anchors": ["MII Purchase Preference", "MII Purchase Preference / एमआईआई खरीद वरीयता"]},
    "mii_non_applicability_reason": {"section": None, "anchors": ["Brief Description of the Approval Granted by Competent Authority"]},
    "required_documents": {"section": None, "anchors": ["Document required from seller"]},
    "pre_bid_meeting": {"section": None, "anchors": ["Pre-Bid Date and Time", "Pre-Bid Venue", "Pre-Bid Meeting Details"]},
    "atc_document_link_present": {"section": None, "anchors": ["Buyer uploaded ATC document"]},
    "land_border_clause_present": {"section": None, "anchors": ["Restrictions on procurement from a bidder of a country which shares a land border with India"]},
    
    # Out of scope mappings
    "tender_value_gst_inclusive": {"section": None, "anchors": ["Estimated Bid Value", "Tender Value (GST Inclusive)", "Estimated Bid Value / अनुमानित बिड मूल्य"]},
    "eligibility_criterion_years": {"section": None, "anchors": ["Minimum Experience (Years)", "Experience Criteria", "Years of Past Experience Required"]},
    "annual_avg_turnover_value": {"section": None, "anchors": ["Annual Turnover Limit", "Annual Avg Turnover"]},
    "working_capital_value": {"section": None, "anchors": ["Working Capital Value", "Working Capital"]},
    "net_worth_type_value": {"section": None, "anchors": ["Net Worth Value", "Net Worth"]},
    "solvency_certificate_value": {"section": None, "anchors": ["Solvency Certificate Value", "Solvency Certificate"]},
    "ld_applicable": {"section": None, "anchors": ["LD Required"]},
    "ld_percentage_per_week": {"section": None, "anchors": ["LD Percentage Per Week"]},
    "max_ld_percentage": {"section": None, "anchors": ["Max LD Percentage"]},
    "payment_terms_supply_percent": {"section": None, "anchors": ["Payment Terms Supply"]},
    "payment_terms_installation_percent": {"section": None, "anchors": ["Payment Terms Installation"]},
    "maf_required": {"section": None, "anchors": ["MAF Required"]},
    "client_contact_person": {"section": None, "anchors": ["Client Contact Person"]},
    "full_courier_address_with_pincode": {"section": None, "anchors": ["Courier Delivery Address"]},
    "tender_fee_amount": {"section": None, "anchors": ["Tender Fee"]},
    "processing_fee_amount": {"section": None, "anchors": ["Processing Fee Amount"]}
}

def match_field(label_text: str, current_section: str | None, threshold: int = 80) -> str | None:
    clean_label = strip_devanagari(label_text).lower()
    best_field, best_score = None, 0
    for field_name, spec in FIELD_ANCHORS.items():
        if spec["section"] is not None and spec["section"] != current_section:
            continue
        for anchor in spec["anchors"]:
            score = fuzz.partial_ratio(anchor.lower(), clean_label)
            if score > best_score:
                best_field, best_score = field_name, score
    return best_field if best_score >= threshold else None

LAKH_CRORE_PATTERN = re.compile(r'([\d,]+(?:\.\d+)?)\s*(lakh|crore|cr|lacs)', re.IGNORECASE)

def normalize_indian_currency(value: str) -> str:
    value = value.strip()
    m = LAKH_CRORE_PATTERN.search(value)
    if m:
        num = float(m.group(1).replace(",", ""))
        unit = m.group(2).lower()
        multiplier = 100_000 if unit in ("lakh", "lacs") else 10_000_000
        return str(int(num * multiplier))
    ret = value.replace("₹", "").replace(",", "").strip()
    if ret.endswith("/-"):
        ret = ret[:-2].strip()
    return ret

VALIDATORS = {
    "emd_amount": lambda v: bool(re.match(r'^\d+(\.\d+)?$', v.strip())),
    "bid_end_datetime": lambda v: bool(re.search(r'\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}', v)),
    "pbg_percentage": lambda v: bool(re.match(r'^\d+(\.\d+)?%?$', v.strip())),
    "bid_validity_days": lambda v: bool(re.search(r'\d+', v)),
}

def validate_field(field_name: str, value: str) -> bool:
    validator = VALIDATORS.get(field_name)
    return validator(value) if validator else True

def field_confidence(label_cell: dict, value_cell: dict, match_score: int) -> float:
    label_conf = min(b.confidence for b in label_cell["blocks"]) if label_cell.get("blocks") else 1.0
    value_conf = min(b.confidence for b in value_cell["blocks"]) if value_cell.get("blocks") else 1.0
    ocr_conf = min(label_conf, value_conf)
    return round(ocr_conf * (match_score / 100), 4)

def is_schedule_header(text: str) -> bool:
    t = text.strip()
    if not re.match(r'^Schedule\s+\d+', t, re.IGNORECASE):
        return False
    lower = t.lower()
    # If it contains names of fields, it's not a schedule boundary header itself
    if any(w in lower for w in ["amount", "emd", "quantity", "validity", "consignee", "delivery"]):
        return False
    return True

def segment_by_schedule(layout_regions: List[LayoutRegion], text_blocks: List[TextBlock]) -> Dict[int, List[TextBlock]]:
    def get_region_text(region):
        return getattr(region, "text_content", "") or ""

    schedule_headers = sorted(
        [r for r in layout_regions if is_schedule_header(get_region_text(r))],
        key=lambda r: r.bounding_box["y1"]
    )
    if not schedule_headers:
        # Fallback to text_blocks if layout_regions has no schedule headers
        schedule_headers_blocks = sorted(
            [b for b in text_blocks if is_schedule_header(b.text)],
            key=lambda b: b.bounding_box["y1"]
        )
        if schedule_headers_blocks:
            segments = {}
            for i, header in enumerate(schedule_headers_blocks):
                m = re.search(r'\d+', header.text)
                schedule_num = int(m.group()) if m else (i + 1)
                y_start = header.bounding_box["y1"]
                y_end = (schedule_headers_blocks[i + 1].bounding_box["y1"]
                         if i + 1 < len(schedule_headers_blocks) else float("inf"))
                segments[schedule_num] = [
                    b for b in text_blocks if y_start <= b.bounding_box["y1"] < y_end
                ]
            return segments
        return {0: text_blocks}

    segments: Dict[int, List[TextBlock]] = {}
    for i, header in enumerate(schedule_headers):
        m = re.search(r'\d+', get_region_text(header))
        schedule_num = int(m.group()) if m else (i + 1)
        y_start = header.bounding_box["y1"]
        y_end = (schedule_headers[i + 1].bounding_box["y1"]
                 if i + 1 < len(schedule_headers) else float("inf"))
        segments[schedule_num] = [
            b for b in text_blocks if y_start <= b.bounding_box["y1"] < y_end
        ]
    return segments

class GemFieldExtractor(FieldExtractor):
    def __init__(self):
        super().__init__()
        # Candidate paths for extraction map
        current_dir = Path(__file__).resolve().parent
        candidate_paths = [
            current_dir.parent / "gem_parent_tender_extraction_map.yaml",  # ocr/gem_parent_tender_extraction_map.yaml
            current_dir / "gem_parent_tender_extraction_map.yaml",         # ocr/extractors/gem_parent_tender_extraction_map.yaml
            Path("/app/gem_parent_tender_extraction_map.yaml"),            # Docker /app mount root
            current_dir.parent.parent / "gem_parent_tender_extraction_map.yaml"  # Project root
        ]
        
        yaml_path = None
        for path in candidate_paths:
            if path.exists():
                yaml_path = path
                break
                
        if not yaml_path:
            raise FileNotFoundError(
                f"Could not find gem_parent_tender_extraction_map.yaml in any of the searched locations: {candidate_paths}"
            )
            
        logger.info(f"Loading GeM extraction spec from: {yaml_path}")
        with open(yaml_path, "r", encoding="utf-8") as f:
            self.spec = yaml.safe_load(f)
        self.fields_spec = self.spec.get("fields", {})
        self.out_of_scope_spec = self.spec.get("out_of_scope_stage1", [])


    def extract_fields(self, pages: List[PageResult], doc_source: str = "main_tender") -> List[ExtractedFieldSchema]:
        extracted = []
        logger.info(f"Starting GeM field extraction on {len(pages)} page(s).")

        # 1. Build out-of-scope stubs first
        for entry in self.out_of_scope_spec:
            field_name = entry.get("field")
            likely_source = entry.get("likely_source")
            notes = entry.get("notes", "")
            evidence = f"This field lives in: {likely_source}."
            if notes:
                evidence += f" Note: {notes}"
            extracted.append(ExtractedFieldSchema(
                field_name=field_name,
                value=None,
                confidence=0.0,
                source_page=1,
                evidence=evidence,
                source_blocks=[],
                source="not_available_stage1",
                likely_source=likely_source
            ))

        # 2. Extract schedules (consignees, quantities, delivery days, and technical specs) via cell-level grid mapping
        schedules_list = []
        
        # A. Collect all item headers across all pages
        item_headers = []
        page1_cat = "Not Found"
        for page in pages:
            if page.page_number == 1:
                for b in page.text_blocks:
                    t = b.text.strip()
                    m_cat = re.search(r"(?:Item Category|वस्तु\s*श्रेणी)\s*[:\n]?\s*([^\n\r]+)", t, re.IGNORECASE)
                    if m_cat:
                        page1_cat = m_cat.group(1).strip()

            sorted_blocks = sorted(page.text_blocks, key=lambda b: (b.bounding_box["y1"], b.bounding_box["x1"]))
            for b in sorted_blocks:
                t = b.text.strip()
                m_item = re.search(r"^(.{3,150}?)\s*\(\s*(\d+)\s*(?:pieces|piece|pcs|nos|no|qty|meter|set|pair|packet|kg|unit|litre)\s*\)", t, re.IGNORECASE)
                if m_item:
                    if not any(k in t.lower() for k in ["margin of purchase", "option clause", "make in india", "past performance", "relaxation", "clause", "evaluation method"]):
                        item_headers.append({
                            "page_number": page.page_number,
                            "y1": b.bounding_box["y1"],
                            "item_description": m_item.group(0).strip(),
                            "item_name": m_item.group(1).strip(),
                            "item_qty": int(m_item.group(2).strip())
                        })

        # B. Track technical specs associated with item headers or pages
        tech_specs_by_item = {}
        for page in pages:
            for region in page.layout_regions:
                if region.region_type.lower() == "table" and region.table_structure:
                    grid = region.table_structure.get("grid", [])
                    if not grid or len(grid) < 2:
                        continue
                    cleaned_grid = [[clean_cell_text(c) for c in r] for r in grid if any(r)]
                    if len(cleaned_grid) < 2:
                        continue
                    h_text = " ".join(cleaned_grid[0]).lower()
                    if ("specification" in h_text or "विशिष्ट" in h_text or "parameter" in h_text) and not any(k in h_text for k in ["consignee", "reporting", "officer", "परेषती"]):
                        t_y = region.bounding_box.get("y1", 0)
                        preceding = [it for it in item_headers if (it["page_number"] < page.page_number) or (it["page_number"] == page.page_number and it["y1"] <= t_y)]
                        item_desc = preceding[-1]["item_description"] if preceding else page1_cat
                        specs = tech_specs_by_item.setdefault(item_desc, {})
                        for r_idx in range(1, len(cleaned_grid)):
                            row = cleaned_grid[r_idx]
                            if len(row) >= 2:
                                p_name = row[-2].strip() if len(row) >= 3 else row[0].strip()
                                p_val = row[-1].strip()
                                if p_name and p_val and not any(k in p_name.lower() for k in ["download", "view document", "buyer"]):
                                    specs[p_name] = p_val

        # C. Extract consignee tables from table layout regions
        sch_idx = 1
        current_item = item_headers[0] if item_headers else {
            "page_number": 1, "y1": 0, "item_description": page1_cat, "item_qty": "Not Found"
        }

        for page in pages:
            tbl_regions = [r for r in page.layout_regions if r.region_type.lower() == "table" and r.table_structure]
            tbl_regions = sorted(tbl_regions, key=lambda r: (r.bounding_box.get("y1", 0), r.bounding_box.get("x1", 0)))
            
            for region in tbl_regions:
                grid = region.table_structure.get("grid", [])
                if not grid or len(grid) < 2:
                    continue

                cleaned_grid = [[clean_cell_text(c) for c in r] for r in grid if any(r)]
                if len(cleaned_grid) < 2:
                    continue

                header_row_idx = None
                col_map = {}
                for r_i in range(min(3, len(cleaned_grid))):
                    r_text = " ".join(cleaned_grid[r_i]).lower()
                    has_consignee_kw = any(k in r_text for k in ["consignee", "reporting", "officer", "परेषती", "अधिकारी"])
                    has_qty_kw = any(k in r_text for k in ["quantity", "मात्रा", "qty", "delivery", "दिन", "days"])

                    if has_consignee_kw and has_qty_kw:
                        header_row_idx = r_i
                        for c_i, col_text in enumerate(cleaned_grid[r_i]):
                            c_low = col_text.lower()
                            if any(k in c_low for k in ["s.n", "क्र.सं", "s.no", "sl.no", "s no"]):
                                col_map["sno"] = c_i
                            elif any(k in c_low for k in ["consignee", "reporting", "officer", "परेषती", "अधिकारी"]):
                                col_map["consignee_name"] = c_i
                            elif any(k in c_low for k in ["address", "पता"]):
                                col_map["consignee_address"] = c_i
                            elif any(k in c_low for k in ["quantity", "मात्रा", "qty"]):
                                col_map["quantity"] = c_i
                            elif any(k in c_low for k in ["delivery", "दिन", "days"]):
                                col_map["delivery_days"] = c_i
                        break

                if header_row_idx is None:
                    continue

                t_y = region.bounding_box.get("y1", 0)
                preceding = [
                    it for it in item_headers 
                    if (it["page_number"] < page.page_number) or 
                       (it["page_number"] == page.page_number and it["y1"] <= t_y)
                ]
                if preceding:
                    current_item = preceding[-1]

                item_desc = current_item.get("item_description", page1_cat)
                specs_for_item = tech_specs_by_item.get(item_desc, {})

                for r_i in range(header_row_idx + 1, len(cleaned_grid)):
                    row = cleaned_grid[r_i]
                    r_str = " ".join(row).lower()
                    if not r_str or any(k in r_str for k in ["total", "कुल", "योग", "buyer added", "disclaimer", "generic"]):
                        continue

                    def _get_val(k):
                        if k in col_map and col_map[k] < len(row):
                            return row[col_map[k]].strip()
                        return "Not Found"

                    c_name = _get_val("consignee_name") or "Not Found"
                    c_addr = _get_val("consignee_address") or "Not Found"
                    c_qty_raw = _get_val("quantity")
                    c_days_raw = _get_val("delivery_days")

                    c_qty = "Not Found"
                    if c_qty_raw != "Not Found":
                        m_q = re.search(r"\d+", c_qty_raw.replace(",", ""))
                        if m_q:
                            c_qty = int(m_q.group(0))

                    c_days = "Not Found"
                    if c_days_raw != "Not Found":
                        m_d = re.search(r"\d+", c_days_raw.replace(",", ""))
                        if m_d:
                            c_days = int(m_d.group(0))

                    if c_name == "Not Found" and c_addr == "Not Found" and c_qty == "Not Found":
                        continue

                    if c_qty == "Not Found" and isinstance(current_item.get("item_qty"), int):
                        c_qty = current_item["item_qty"]

                    schedules_list.append({
                        "schedule_number": sch_idx,
                        "consignee_name": c_name,
                        "consignee_address": c_addr,
                        "quantity": c_qty,
                        "delivery_days": c_days,
                        "item_description": item_desc,
                        "technical_specs": dict(specs_for_item)
                    })
                    sch_idx += 1

        # D. Evaluation Schedules pass if no consignee tables were detected
        if not schedules_list:
            full_tender_text = "\n".join("\n".join(b.text for b in p.text_blocks) for p in pages)
            eval_sched_m = re.search(r"(?:Evaluation\s+Schedules|मूVयांकन\s+अनुसूिचयां)[\s\S]+?(?=(?:Consignees|\n\s*[A-Z\s]{4,}\s*\(\s*\d+\s*(?:set|pieces|nos|meter|foot)\s*\)|Buyer\s+Added|तकनीक|\Z))", full_tender_text, re.IGNORECASE)
            if eval_sched_m:
                sched_block = eval_sched_m.group(0)
                sched_pattern = r"(?:Schedule\s+(\d+)|Schedule-(\d+))\s*\n\s*([\s\S]+?)\n\s*(\d{1,6})\b"
                for m_eval in re.finditer(sched_pattern, sched_block, re.IGNORECASE):
                    s_num = int(m_eval.group(1) or m_eval.group(2))
                    raw_desc = re.sub(r"\s+", " ", m_eval.group(3)).strip()
                    raw_desc = re.sub(r"^(?:Item/Category|वस्तु/श्रेणी|Item\s+Description)\s*", "", raw_desc, flags=re.IGNORECASE).strip()
                    try:
                        s_qty = int(m_eval.group(4))
                    except ValueError:
                        s_qty = "Not Found"
                    schedules_list.append({
                        "schedule_number": s_num,
                        "consignee_name": "Not Found",
                        "consignee_address": "Not Found",
                        "quantity": s_qty,
                        "delivery_days": "Not Found",
                        "item_description": raw_desc or page1_cat,
                        "technical_specs": {}
                    })

        # E. Text-block row grouping fallback if no layout region tables were detected
        if not schedules_list:
            schedules_data = {}
            for page in pages:
                sorted_blocks = sorted(page.text_blocks, key=lambda b: (b.bounding_box["y1"], b.bounding_box["x1"]))
                all_rows = group_blocks_into_rows(sorted_blocks)
                current_schedule_num = 1
                consignee_headers = None
                for row in all_rows:
                    row_text = " ".join(b.text for b in row)
                    m_sch = re.search(r"Schedule\s*(\d+)", row_text, re.IGNORECASE)
                    if m_sch:
                        current_schedule_num = int(m_sch.group(1))

                    is_tech_spec = False
                    if len(row) >= 2:
                        c1_text = row[0].text.strip()
                        c2_text = " ".join(b.text.strip() for b in row[1:])
                        spec_keywords = [
                            "battery capacity", "nominal battery voltage", "battery voltage",
                            "capacity at 10-h", "voltage", "capacity", "specification", "oem"
                        ]
                        if any(kw in c1_text.lower() for kw in spec_keywords):
                            if not any(k in c1_text.lower() for k in ["dated", "schedule", "consignee", "delivery"]):
                                is_tech_spec = True

                    if is_tech_spec:
                        schedules_data.setdefault(current_schedule_num, {
                            "schedule_number": current_schedule_num,
                            "consignee_name": "Not Found",
                            "consignee_address": "Not Found",
                            "quantity": "Not Found",
                            "delivery_days": "Not Found",
                            "item_description": page1_cat,
                            "technical_specs": {}
                        })
                        clean_param = re.sub(r"^[^a-zA-Z0-9\s]+", "", c1_text)
                        clean_param = re.sub(r"^[/\\_.:\-]+\s*", "", clean_param).strip()
                        schedules_data[current_schedule_num]["technical_specs"][clean_param] = c2_text.strip()
                        continue

                    row_texts_lower = [b.text.lower() for b in row]
                    has_consignee = any("consignee" in txt or "reporting" in txt or "officer" in txt for txt in row_texts_lower)
                    has_qty = any("quantity" in txt or "मात्रा" in txt for txt in row_texts_lower)
                    has_days = any("delivery" in txt or "days" in txt for txt in row_texts_lower)

                    if has_consignee and (has_qty or has_days):
                        consignee_headers = {}
                        for col_idx, block in enumerate(row):
                            txt = block.text.lower()
                            if "consignee" in txt or "reporting" in txt or "officer" in txt:
                                consignee_headers["consignee_name"] = col_idx
                            elif "address" in txt or "पता" in txt:
                                consignee_headers["consignee_address"] = col_idx
                            elif "quantity" in txt or "मात्रा" in txt:
                                consignee_headers["quantity"] = col_idx
                            elif "delivery" in txt or "days" in txt:
                                consignee_headers["delivery_days"] = col_idx
                        continue

                    if consignee_headers and len(row) >= 2:
                        if any("total" in b.text.lower() or "योग" in b.text.lower() or "schedule" in b.text.lower() for b in row):
                            consignee_headers = None
                            continue

                        schedules_data.setdefault(current_schedule_num, {
                            "schedule_number": current_schedule_num,
                            "consignee_name": "Not Found",
                            "consignee_address": "Not Found",
                            "quantity": "Not Found",
                            "delivery_days": "Not Found",
                            "item_description": page1_cat,
                            "technical_specs": {}
                        })

                        entry = schedules_data[current_schedule_num]
                        for field, col_idx in consignee_headers.items():
                            if col_idx < len(row):
                                val = row[col_idx].text.strip()
                                if field in ("quantity", "delivery_days"):
                                    clean_val = re.sub(r"\D", "", val)
                                    if clean_val:
                                        try:
                                            entry[field] = int(clean_val)
                                        except ValueError:
                                            pass
                                else:
                                    entry[field] = val
                        continue

            if schedules_data:
                schedules_list = list(schedules_data.values())

        if schedules_list:
            extracted.append(ExtractedFieldSchema(
                field_name="schedules",
                value=schedules_list,
                confidence=0.95,
                source_page=1,
                evidence=f"Extracted {len(schedules_list)} schedules/consignees via cell-level grid parsing.",
                source_blocks=[],
                source="gem_parent_pdf"
            ))
        else:
            extracted.append(ExtractedFieldSchema(
                field_name="schedules",
                value=[],
                confidence=0.0,
                source_page=1,
                evidence="No schedules found.",
                source_blocks=[],
                source="gem_parent_pdf"
            ))

        # 3. Two-Stage Spatial Key-Value Extraction for Standard Fields & EMD Amounts
        candidates = {}  # field_name -> list of dicts
        emd_dict = {}    # schedule_number -> float
        global_emd_amount = None

        for page in pages:
            # Same-block label-value matches (e.g. colon split, prefix/suffix match fallback)
            for block in page.text_blocks:
                text = block.text.strip()
                # 1. Colon-based split
                parts = text.split(":", 1)
                if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                    l_text, r_text = parts[0].strip(), parts[1].strip()
                    field_name = match_field(l_text, None)
                    if field_name:
                        sch_num = None
                        m_sch = re.search(r"Schedule\s*(\d+)", l_text, re.IGNORECASE)
                        if not m_sch:
                            m_sch = re.search(r"अनुसूची\s*(\d+)", l_text)
                        if m_sch:
                            sch_num = int(m_sch.group(1))
                        
                        spec = FIELD_ANCHORS[field_name]
                        best_score = 0
                        for anchor in spec["anchors"]:
                            score = fuzz.partial_ratio(anchor.lower(), strip_devanagari(l_text).lower())
                            if score > best_score:
                                best_score = score
                                
                        candidates.setdefault(field_name, []).append({
                            "value": r_text,
                            "confidence": block.confidence * (best_score / 100),
                            "source_page": page.page_number,
                            "schedule_number": sch_num,
                            "evidence": f"Same-block colon match: '{text}'",
                            "source_blocks": [
                                SourceBlockRef(
                                    page_number=page.page_number,
                                    block_id=block.block_id,
                                    text=block.text,
                                    bounding_box=BoundingBox(**block.bounding_box)
                                )
                            ]
                        })
                # 2. Prefix-based split (for strings like "Bid Validity Period 90 Days"
                #    or mixed Devanagari+English like "ईपीबीजी 9ितशत (%)/ePBG Percentage(%) 3.00")
                for field_name, spec in FIELD_ANCHORS.items():
                    # Sort anchors by length descending so most specific matches are tried first
                    for anchor in sorted(spec["anchors"], key=len, reverse=True):
                        clean_anchor = anchor.lower()
                        clean_text = strip_devanagari(text).lower()
                        # Use 'contains' instead of 'startswith' to handle blocks starting with Devanagari
                        if clean_anchor in clean_text:
                            # when anchor and value in same block
                            idx = text.lower().find(anchor.lower())
                            if idx != -1:
                                suffix = text[idx + len(anchor):].strip()
                                suffix = re.sub(r"^[:\-/\s\u0900-\u097F]+", "", suffix).strip()
                                # Guard: skip long paragraphs — real field values are short
                                if suffix and len(suffix) < 200:
                                    sch_num = None
                                    m_sch = re.search(r"Schedule\s*(\d+)", text, re.IGNORECASE)
                                    if not m_sch:
                                        m_sch = re.search(r"अनुसूची\s*(\d+)", text)
                                    if m_sch:
                                        sch_num = int(m_sch.group(1))
                                    
                                    candidates.setdefault(field_name, []).append({
                                        "value": suffix,
                                        "confidence": block.confidence * 0.85,
                                        "source_page": page.page_number,
                                        "schedule_number": sch_num,
                                        "evidence": f"Same-block prefix match: '{text}'",
                                        "source_blocks": [
                                            SourceBlockRef(
                                                page_number=page.page_number,
                                                block_id=block.block_id,
                                                text=block.text,
                                                bounding_box=BoundingBox(**block.bounding_box)
                                            )
                                        ]
                                    })
            # Segment text blocks by schedule
            segments = segment_by_schedule(page.layout_regions, page.text_blocks)
            for seg_num, seg_blocks in segments.items():
                col_split = detect_column_split(seg_blocks)
                left_blocks = [b for b in seg_blocks if b.bounding_box["x1"] < col_split]
                right_blocks = [b for b in seg_blocks if b.bounding_box["x1"] >= col_split]
                
                left_cells = merge_into_cells(left_blocks)
                right_cells = merge_into_cells(right_blocks)

                # ── Fix 2: Same-cell prefix/suffix extraction on merged cells ──
                for cell in left_cells + right_cells:
                    cell_text = cell["text"].strip()
                    # 1. Colon-based split
                    parts = cell_text.split(":", 1)
                    if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                        l_text, r_text = parts[0].strip(), parts[1].strip()
                        field_name = match_field(l_text, None)
                        if field_name:
                            sch_num = None
                            m_sch = re.search(r"Schedule\s*(\d+)", l_text, re.IGNORECASE)
                            if not m_sch:
                                m_sch = re.search(r"अनुसूची\s*(\d+)", l_text)
                            if m_sch:
                                sch_num = int(m_sch.group(1))
                            elif seg_num > 0:
                                sch_num = seg_num
                            
                            spec = FIELD_ANCHORS[field_name]
                            best_score = 0
                            for anchor in spec["anchors"]:
                                score = fuzz.partial_ratio(anchor.lower(), strip_devanagari(l_text).lower())
                                if score > best_score:
                                    best_score = score
                                    
                            candidates.setdefault(field_name, []).append({
                                "value": r_text,
                                "confidence": (cell["blocks"][0].confidence if cell["blocks"] else 1.0) * (best_score / 100),
                                "source_page": page.page_number,
                                "schedule_number": sch_num,
                                "evidence": f"Same-cell colon match: '{cell_text}'",
                                "source_blocks": [
                                    SourceBlockRef(
                                        page_number=page.page_number,
                                        block_id=b.block_id,
                                        text=b.text,
                                        bounding_box=BoundingBox(**b.bounding_box)
                                    ) for b in cell["blocks"]
                                ]
                            })
                    # 2. Prefix-based split (for strings like "EMD Amount/ 73880"
                    #    or mixed Devanagari+English merged cells)
                    for field_name, spec in FIELD_ANCHORS.items():
                        # Sort anchors by length descending so most specific matches are tried first
                        for anchor in sorted(spec["anchors"], key=len, reverse=True):
                            clean_anchor = anchor.lower()
                            clean_text = strip_devanagari(cell_text).lower()
                            # Use 'contains' instead of 'startswith' to handle cells starting with Devanagari
                            if clean_anchor in clean_text:
                                idx = cell_text.lower().find(anchor.lower())
                                if idx != -1:
                                    suffix = cell_text[idx + len(anchor):].strip()
                                    suffix = re.sub(r"^[:\-/\s\u0900-\u097F]+", "", suffix).strip()
                                    # Guard: skip long paragraphs — real field values are short
                                    if suffix and len(suffix) < 200:
                                        sch_num = None
                                        m_sch = re.search(r"Schedule\s*(\d+)", cell_text, re.IGNORECASE)
                                        if not m_sch:
                                            m_sch = re.search(r"अनुसूची\s*(\d+)", cell_text)
                                        if m_sch:
                                            sch_num = int(m_sch.group(1))
                                        elif seg_num > 0:
                                            sch_num = seg_num
                                        
                                        candidates.setdefault(field_name, []).append({
                                            "value": suffix,
                                            "confidence": (cell["blocks"][0].confidence if cell["blocks"] else 1.0) * 0.85,
                                            "source_page": page.page_number,
                                            "schedule_number": sch_num,
                                            "evidence": f"Same-cell prefix match: '{cell_text}'",
                                            "source_blocks": [
                                                SourceBlockRef(
                                                    page_number=page.page_number,
                                                    block_id=b.block_id,
                                                    text=b.text,
                                                    bounding_box=BoundingBox(**b.bounding_box)
                                                ) for b in cell["blocks"]
                                            ]
                                        })
                
                section_headers_y = []
                for l_cell in left_cells:
                    l_text = l_cell["text"].strip()
                    for sec_header in SECTION_HEADERS:
                        score = fuzz.partial_ratio(sec_header.lower(), strip_devanagari(l_text).lower())
                        if score >= 85:
                            section_headers_y.append((l_cell["bbox"]["y1"], sec_header))
                            break
                section_headers_y.sort(key=lambda x: x[0])
                
                pairs = pair_cells_by_row(left_cells, right_cells)
                sorted_pairs = sorted(pairs, key=lambda p: p[0]["bbox"]["y1"])
                
                for left, right in sorted_pairs:
                    l_text = left["text"].strip()
                    r_text = right["text"].strip()
                    
                    # Skip section headers from standard field matching
                    is_header = False
                    for sec_header in SECTION_HEADERS:
                        score = fuzz.partial_ratio(sec_header.lower(), strip_devanagari(l_text).lower())
                        if score >= 85:
                            is_header = True
                            break
                    if is_header:
                        continue
                        
                    current_section = None
                    ly1 = left["bbox"]["y1"]
                    for sy1, sec_name in section_headers_y:
                        if sy1 < ly1:
                            current_section = sec_name
                        else:
                            break
                    
                    # Match fields
                    field_name = match_field(l_text, current_section)
                    if field_name:
                        # Determine schedule number
                        sch_num = None
                        m_sch = re.search(r"Schedule\s*(\d+)", l_text, re.IGNORECASE)
                        if not m_sch:
                            m_sch = re.search(r"अनुसूची\s*(\d+)", l_text)
                        if m_sch:
                            sch_num = int(m_sch.group(1))
                        elif seg_num > 0:
                            sch_num = seg_num
                        
                        # Match score
                        spec = FIELD_ANCHORS[field_name]
                        best_score = 0
                        for anchor in spec["anchors"]:
                            score = fuzz.partial_ratio(anchor.lower(), strip_devanagari(l_text).lower())
                            if score > best_score:
                                best_score = score
                        
                        conf = field_confidence(left, right, best_score)
                        candidates.setdefault(field_name, []).append({
                            "value": r_text,
                            "confidence": conf,
                            "source_page": page.page_number,
                            "schedule_number": sch_num,
                            "evidence": f"Cell-pair match: Label '{l_text}' -> Value '{r_text}'",
                            "source_blocks": [
                                SourceBlockRef(
                                    page_number=page.page_number,
                                    block_id=b.block_id,
                                    text=b.text,
                                    bounding_box=BoundingBox(**b.bounding_box)
                                ) for b in left["blocks"] + right["blocks"]
                            ]
                        })

        # Process EMD candidates
        emd_cands = candidates.get("emd_amount", [])
        for cand in emd_cands:
            val_clean = normalize_indian_currency(cand["value"])
            if validate_field("emd_amount", val_clean):
                try:
                    val_float = float(val_clean)
                    if cand["schedule_number"] is not None and cand["schedule_number"] > 0:
                        emd_dict[cand["schedule_number"]] = val_float
                    else:
                        global_emd_amount = val_float
                except ValueError:
                    pass

        # Append EMD schemas
        if emd_dict:
            extracted.append(ExtractedFieldSchema(
                field_name="emd_by_schedule",
                value=emd_dict,
                confidence=0.9,
                source_page=1,
                evidence=f"Extracted schedule EMDs: {emd_dict}",
                source_blocks=[],
                source="gem_parent_pdf"
            ))
            total_val = sum(emd_dict.values())
            extracted.append(ExtractedFieldSchema(
                field_name="emd_total",
                value=total_val,
                confidence=0.9,
                source_page=1,
                evidence=f"Derived sum of schedule EMDs: {emd_dict}",
                source_blocks=[],
                source="derived"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_required",
                value=total_val > 0,
                confidence=0.9,
                source_page=1,
                evidence=f"Derived from EMD total: {total_val}",
                source_blocks=[],
                source="derived"
            ))
        elif global_emd_amount is not None:
            extracted.append(ExtractedFieldSchema(
                field_name="emd_by_schedule",
                value={},
                confidence=0.9,
                source_page=1,
                evidence="Global EMD amount extracted, no schedule split.",
                source_blocks=[],
                source="gem_parent_pdf"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_total",
                value=global_emd_amount,
                confidence=0.9,
                source_page=1,
                evidence=f"Derived from global EMD amount: {global_emd_amount}",
                source_blocks=[],
                source="derived"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_required",
                value=global_emd_amount > 0,
                confidence=0.9,
                source_page=1,
                evidence=f"Derived from EMD total: {global_emd_amount}",
                source_blocks=[],
                source="derived"
            ))
        else:
            extracted.append(ExtractedFieldSchema(
                field_name="emd_by_schedule",
                value={},
                confidence=0.0,
                source_page=1,
                evidence="No schedule EMD amounts found.",
                source_blocks=[],
                source="gem_parent_pdf"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_total",
                value=0.0,
                confidence=0.0,
                source_page=1,
                evidence="No schedule EMD amounts found.",
                source_blocks=[],
                source="derived"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_required",
                value=False,
                confidence=0.0,
                source_page=1,
                evidence="No schedule EMD amounts found.",
                source_blocks=[],
                source="derived"
            ))

        # Process all other standard fields
        out_of_scope_names = {entry.get("field") for entry in self.out_of_scope_spec}
        for field_name in FIELD_ANCHORS:
            if field_name in ("emd_amount", "emd_by_schedule", "emd_total", "emd_required", "schedules"):
                continue
            if field_name in out_of_scope_names:
                continue
                
            field_cands = candidates.get(field_name, [])
            if field_name == "tender_id":
                valid_cands = [c for c in field_cands if validate_tender_id(c["value"])]
                if valid_cands:
                    field_cands = valid_cands
                else:
                    # Run fallback scan across all page block texts
                    fallback_val = None
                    fallback_page = 1
                    fallback_block = None
                    for page in pages:
                        for b in page.text_blocks:
                            m = TENDER_ID_RE.search(b.text)
                            if m:
                                fallback_val = m.group(0)
                                fallback_page = page.page_number
                                fallback_block = b
                                break
                        if fallback_val:
                            break
                    if fallback_val:
                        field_cands = [{
                            "value": fallback_val,
                            "confidence": 1.0,
                            "source_page": fallback_page,
                            "schedule_number": None,
                            "evidence": f"Fallback scan across block texts: '{fallback_val}'",
                            "source_blocks": [
                                SourceBlockRef(
                                    page_number=fallback_page,
                                    block_id=fallback_block.block_id,
                                    text=fallback_block.text,
                                    bounding_box=BoundingBox(**fallback_block.bounding_box)
                                )
                            ] if fallback_block else []
                        }]
                    else:
                        field_cands = []

            if field_cands:
                # Prioritize candidates that pass validation
                valid_cands = [c for c in field_cands if validate_field(field_name, c["value"].strip())]
                best_cand = sorted(valid_cands if valid_cands else field_cands, key=lambda c: c["confidence"], reverse=True)[0]
                val_raw = best_cand["value"]
                
                # Normalize and Validate
                spec = self.fields_spec.get(field_name, {})
                field_type = spec.get("type", "text")
                val_clean = val_raw.strip()
                
                if field_name in ("tender_value_gst_inclusive", "annual_avg_turnover_value", "working_capital_value", "net_worth_type_value", "solvency_certificate_value", "tender_fee_amount", "processing_fee_amount"):
                    val_clean = normalize_indian_currency(val_clean)
                
                validation_passed = validate_field(field_name, val_clean)
                needs_review = not validation_passed
                
                val_cast = None
                if validation_passed:
                    try:
                        if field_type == "integer":
                            digits = re.sub(r"\D", "", val_clean)
                            val_cast = int(digits) if digits else None
                        elif field_type == "float" or field_type == "number":
                            digits = re.sub(r"[^\d.]", "", val_clean)
                            val_cast = float(digits) if digits else None
                        elif field_type == "boolean" or field_type == "yes_no":
                            lower_val = val_clean.lower()
                            val_cast = "yes" in lower_val or "true" in lower_val or "हाँ" in lower_val or "required" in lower_val
                        elif field_type == "list":
                            split_on = spec.get("split_on", ",")
                            items = [item.strip() for item in val_clean.split(split_on) if item.strip()]
                            formatted_items = []
                            for item in items:
                                needs_stage2 = "(Requested in ATC)" in item
                                formatted_items.append({
                                    "document_name": item,
                                    "needs_stage2": needs_stage2
                                })
                            val_cast = formatted_items
                        else:
                            val_cast = val_clean
                    except Exception:
                        needs_review = True
                        val_cast = None
                
                extracted.append(ExtractedFieldSchema(
                    field_name=field_name,
                    value=val_cast,
                    confidence=best_cand["confidence"],
                    source_page=best_cand["source_page"],
                    evidence=best_cand["evidence"],
                    source_blocks=best_cand["source_blocks"],
                    source=doc_source,
                    needs_review=needs_review
                ))
            else:
                # Stub out field as None
                extracted.append(ExtractedFieldSchema(
                    field_name=field_name,
                    value=None,
                    confidence=0.0,
                    source_page=1,
                    evidence="No matching values found in document.",
                    source_blocks=[],
                    source=doc_source
                ))

        logger.info(f"Finished GeM field extraction. Total fields: {len(extracted)}")
        return extracted
