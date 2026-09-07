from typing import Optional, List, Dict, Any
from PIL.Image import logger
import time
from pathlib import Path
from PIL import Image
import fitz

from app.ocr.pdf_converter import convert_pdf_to_images
from app.ocr.ocr_engine import OcrEngine
from app.ocr.extractors.field_extractor import FieldExtractor, is_contained
import re
from app.ocr.extractors.gem_field_extractor import GemFieldExtractor

# Stripped infrastructure: LayoutDetector and LayoutLmStage from ocr.layout are excluded (Neo4j sync out of scope)
class LayoutDetector:
    def detect(self, img_path, text_blocks=None, page_number=1):
        return []

class LayoutLmStage:
    def run(self, text_blocks, width, height):
        return None

# Stripped infrastructure: result_writer (pure extraction pipeline, no disk side-effects)
def write_page_json(pr, pages_dir):
    pass

def write_aggregate_json(job_id, page_results, job_dir, filename):
    pass

from app.models.models import PageResult, TextBlock, LayoutRegion
from app.schemas.schemas import (
    RawOCRResponse, OCRBlockSchema, BoundingBox,
    LayoutResponse, LayoutRegionSchema,
    ExtractedFieldsResponse, ProductItemSchema
)

def sort_blocks_by_reading_order(blocks: list[TextBlock], y_tolerance: int = 12) -> list[TextBlock]:
    """
    Groups text blocks into lines based on vertical overlap/proximity,
    then sorts columns from left-to-right (x1) within each line.
    This preserves the reading order in tables and multi-column layouts.
    """
    if not blocks:
        return []
    
    # Sort blocks primarily by top-y coordinate
    sorted_by_y = sorted(blocks, key=lambda b: b.bounding_box["y1"])
    
    lines = []
    current_line = [sorted_by_y[0]]
    
    for block in sorted_by_y[1:]:
        avg_y1 = sum(b.bounding_box["y1"] for b in current_line) / len(current_line)
        if abs(block.bounding_box["y1"] - avg_y1) <= y_tolerance:
            current_line.append(block)
        else:
            lines.append(sorted(current_line, key=lambda b: b.bounding_box["x1"]))
            current_line = [block]
    lines.append(sorted(current_line, key=lambda b: b.bounding_box["x1"]))
    
    flattened = []
    for line in lines:
        flattened.extend(line)
    return flattened

def classify_document_type(page1: str | list[TextBlock]) -> str:
    if isinstance(page1, str):
        full_text = page1
    else:
        full_text = " ".join(b.text for b in page1)
    if re.search(r'GEM/20\d{2}/[A-Z]/\d+', full_text, re.IGNORECASE) or "Bid Document" in full_text:
        return "gem_structured"
    return "generic_nit"

def serialize_page_result_to_xml(pr: PageResult) -> str:
    """
    Serializes a PageResult into structured XML showing layout tags,
    bounding boxes, confidence scores, and reading-order text.
    """
    lines = [f'<page number="{pr.page_number}" width="{pr.image_width_px}" height="{pr.image_height_px}">']
    
    # Sort layout regions by vertical position (reading order)
    sorted_regions = sorted(pr.layout_regions, key=lambda r: (r.bounding_box["y1"], r.bounding_box["x1"]))
    
    for r in sorted_regions:
        bbox_str = f"{r.bounding_box['x1']},{r.bounding_box['y1']},{r.bounding_box['x2']},{r.bounding_box['y2']}"
        conf = f"{r.confidence:.2f}" if r.confidence is not None else "1.00"
        tag = r.region_type.lower()  # 'table' or 'paragraph'
        
        lines.append(f'  <{tag} bbox="[{bbox_str}]" confidence="{conf}">')
        
        content = r.text_content or ""
        for line in content.split("\n"):
            if line.strip():
                lines.append(f"    {line.strip()}")
                
        lines.append(f"  </{tag}>")
        
    lines.append("</page>")
    return "\n".join(lines)

def is_gem_document(page_results: list[PageResult]) -> bool:
    if not page_results:
        return False
    for block in page_results[0].text_blocks:
        text = block.text.lower()
        if "bid document" in text or "bid details" in text or "government e-marketplace" in text:
            return True
        if re.search(r'gem/20\d{2}/[a-z]/\d+', text):
            return True
    return False

def process_pdf(job_id: str, pdf_path: Path, run_layoutlm: bool = False, atc_pdf_path: Optional[Path] = None) -> list[PageResult]:
    start_pipeline_time = time.time()
    job_dir = pdf_path.parent
    pages_dir = job_dir / "pages" / job_id
    pages_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Convert PDF to images
    image_paths = convert_pdf_to_images(pdf_path, pages_dir)
    
    # 2. Init models
    ocr = OcrEngine(lang="eng+hin")
    layout = LayoutDetector()
    layoutlm = LayoutLmStage() if run_layoutlm else None
    
    page_results = []
    
    # 3. Process each page
    doc = fitz.open(pdf_path)
    total_pages_count = len(doc)
    doc.close()

    for i in range(min(total_pages_count, 50)):
        start_time = time.time()
        
        # Check native text first (fast path for digital PDFs)
        doc = fitz.open(pdf_path)
        p_page = doc.load_page(i)
        native_words = p_page.get_text("words")
        p_rect = p_page.rect
        width, height = int(p_rect.width), int(p_rect.height)
        doc.close()

        img_path = image_paths[i] if i < len(image_paths) else None
        if len(native_words) >= 5:
            # Digital page: build text blocks directly from native vector text (0.001s)
            from app.services.pdf_text_extractor import build_text_blocks_from_words
            blocks_data = build_text_blocks_from_words(native_words)
            text_blocks = [
                TextBlock(
                    block_id=b["block_id"],
                    text=b["text"],
                    confidence=b["confidence"],
                    bounding_box=b["bounding_box"],
                    language_hint=b.get("language_hint", "en")
                ) for b in blocks_data
            ]
            layout_regions = layout.detect(None, text_blocks=text_blocks, page_number=i+1)
        else:
            # Scanned page: render image and run OCR engine
            if not img_path:
                continue
            from app.services.pdf_text_extractor import preprocess_image_for_ocr
            preprocessed_path = preprocess_image_for_ocr(img_path)
            try:
                text_blocks = ocr.run(preprocessed_path)
            except Exception as ocr_err:
                logger.warning(f"OCR execution failed on page {i + 1}: {ocr_err}. Falling back to native text extraction.")
                text_blocks = []
            layout_regions = layout.detect(preprocessed_path, text_blocks=text_blocks, page_number=i+1)
            if preprocessed_path != img_path:
                try:
                    preprocessed_path.unlink()
                except Exception:
                    pass

        # If img_path is present and dimensions needed, ensure valid size
        if img_path and img_path.exists():
            try:
                with Image.open(img_path) as img:
                    width, height = img.size
            except Exception:
                pass

        # Direct Vector Table Extraction via pdfplumber
        from app.ocr.table_grid_parser import extract_tables_with_pdfplumber, filter_blocks_outside_tables, build_table_structure
        plumber_tables = extract_tables_with_pdfplumber(pdf_path, page_number=i+1, image_width_px=width, image_height_px=height)
        
        table_regions = []
        table_bboxes = []
        if plumber_tables:
            for t_idx, t_data in enumerate(plumber_tables):
                t_box = t_data["bbox"]
                table_bboxes.append(t_box)
                grid_text = "\n".join([" | ".join(row) for row in t_data.get("grid", [])])
                t_contained_blocks = [tb for tb in text_blocks if is_contained(tb.bounding_box, t_box)]
                table_regions.append(LayoutRegion(
                    region_id=f"reg_tbl_{i+1:02d}_{t_idx+1:02d}",
                    region_type="table",
                    bounding_box=t_box,
                    contained_block_ids=[b.block_id for b in t_contained_blocks],
                    table_structure=t_data,
                    text_content=grid_text,
                    confidence=1.0
                ))
            # Exclude paragraph layout regions that overlap detected table bounds to avoid duplicates
            layout_regions = [r for r in layout_regions if not any(is_contained(r.bounding_box, tb_box, threshold=0.7) for tb_box in table_bboxes)]
            layout_regions.extend(table_regions)
            layout_regions = sorted(layout_regions, key=lambda r: (r.bounding_box["y1"], r.bounding_box["x1"]))
        else:
            # Fallback table structure parsing for heuristic layout regions
            for idx, region in enumerate(layout_regions):
                if region.region_type.lower() == "table" and region.table_structure is None:
                    contained_blocks = [tb for tb in text_blocks if is_contained(tb.bounding_box, region.bounding_box)]
                    region.table_structure = build_table_structure(contained_blocks)

        # Spatial containment and reading order mapping for non-table regions
        for idx, region in enumerate(layout_regions):
            region.reading_order_index = idx + 1
            if region.region_type.lower() != "table":
                if not region.text_content:
                    contained_blocks = [tb for tb in text_blocks if is_contained(tb.bounding_box, region.bounding_box)]
                    sorted_contained = sort_blocks_by_reading_order(contained_blocks)
                    region.contained_block_ids = [b.block_id for b in sorted_contained]
                    region.text_content = "\n".join([b.text for b in sorted_contained])
                    if sorted_contained:
                        region.bounding_box = {
                            "x1": min(b.bounding_box["x1"] for b in sorted_contained),
                            "y1": min(b.bounding_box["y1"] for b in sorted_contained),
                            "x2": max(b.bounding_box["x2"] for b in sorted_contained),
                            "y2": max(b.bounding_box["y2"] for b in sorted_contained)
                        }
            
        # Run LayoutLM stage if enabled
        layoutlm_results = None
        if run_layoutlm and layoutlm:
            try:
                layoutlm_results = layoutlm.run(text_blocks, width, height)
            except Exception as e:
                import traceback
                traceback.print_exc()
                layoutlm_results = {
                    "layoutlm_inputs_preview": {"words": [], "boxes": []},
                    "entities": [],
                    "error": f"LayoutLM inference failed: {str(e)}"
                }
        
        pr = PageResult(
            job_id=job_id,
            page_number=i+1,
            image_path=str(img_path),
            image_width_px=width,
            image_height_px=height,
            processing_time_seconds=time.time() - start_time,
            text_blocks=text_blocks,
            layout_regions=layout_regions,
            layoutlm_results=layoutlm_results
        )
        page_results.append(pr)
        write_page_json(pr, pages_dir)
        
    # Write aggregate json for existing visualizer compatibility
    write_aggregate_json(job_id, page_results, job_dir, pdf_path.name)
    
    # Generate structured layout-aware XML file for downstream LLM extraction
    llm_xml_lines = []
    for pr in page_results:
        llm_xml_lines.append(serialize_page_result_to_xml(pr))
        
    with open(job_dir / "llm_layout_text.txt", "w", encoding="utf-8") as f:
        f.write("\n\n".join(llm_xml_lines))

    # 4. Automated ATC Link Detection & Downloading via pdf_link_extractor
    atc_link_present = False
    atc_link_url = None
    try:
        logger.info("[ATC_RESOLVER] Scanning main tender PDF for ATC document hyperlink annotations...")
        from app.services.pdf_link_extractor import extract_links_and_mentions
        links, mentions = extract_links_and_mentions(str(pdf_path))
        for l in links:
            anchor = l.get("anchorText", "").lower()
            name = l.get("name", "").lower()
            if "click here" in anchor or "atc" in anchor or "atc" in name or l.get("is_atc_anchor"):
                atc_link_present = True
                atc_link_url = l.get("url")
                logger.info(f"[ATC_RESOLVER] Hyperlink URL resolved: '{atc_link_url}' (anchorText='{l.get('anchorText')}')")
                if not atc_pdf_path and l.get("local_path") and Path(l["local_path"]).exists():
                    atc_pdf_path = Path(l["local_path"])
                    logger.info(f"[ATC_RESOLVER] Child PDF downloaded path: '{atc_pdf_path}'")
                break
        if not atc_link_present:
            logger.info("[ATC_RESOLVER] No ATC document hyperlink annotation detected in main tender.")
    except Exception as e:
        logger.warning(f"[ATC_RESOLVER] Failed to resolve ATC hyperlink from main tender: {e}. Continuing with main tender parsing only.")

    # 5. Deterministic Field Extraction + Product/Item extraction
    page1_blocks = page_results[0].text_blocks if page_results else []
    doc_type = classify_document_type(page1_blocks)
    
    import json
    logger.info(json.dumps({
        "event": "doc_type_classified",
        "job_id": job_id,
        "type": doc_type
    }))
    
    is_gem = (doc_type == "gem_structured")
    if is_gem:
        extractor = GemFieldExtractor()
    else:
        extractor = FieldExtractor()
        
    extracted_fields = extractor.extract_fields(page_results, doc_source="main_tender")
    extracted_products = extractor.extract_products(page_results)

    # 6. ATC Child PDF Processing & Field Merging if ATC PDF is available
    if atc_pdf_path and atc_pdf_path.exists():
        try:
            logger.info(f"[ATC_RESOLVER] Parsing ATC child PDF '{atc_pdf_path}' page-by-page (native text first, Tesseract eng+hin OCR fallback)...")
            from app.services.pdf_text_extractor import is_text_scrambled_or_garbage, build_text_blocks_from_words, preprocess_image_for_ocr

            atc_pages_dir = job_dir / "atc_pages"
            atc_image_paths = convert_pdf_to_images(atc_pdf_path, atc_pages_dir)
            atc_doc = fitz.open(str(atc_pdf_path))
            atc_page_results = []

            for page_num, img_path in enumerate(atc_image_paths):
                page = atc_doc.load_page(page_num)
                native_text = page.get_text()
                stripped = native_text.strip()
                words = stripped.split()
                word_count = len(words)

                is_digital = False
                if len(stripped) > 5 and word_count > 0:
                    if word_count > 5:
                        avg_word_len = len(stripped) / word_count
                        if 3.0 <= avg_word_len <= 15.0 and not is_text_scrambled_or_garbage(native_text):
                            is_digital = True
                    else:
                        if not is_text_scrambled_or_garbage(native_text):
                            is_digital = True

                with Image.open(img_path) as img:
                    w, h = img.size

                if is_digital:
                    logger.info(f"[ATC_RESOLVER] Page {page_num + 1} of ATC child PDF parsed using native text pass.")
                    native_words = page.get_text("words")
                    blocks_data = build_text_blocks_from_words(native_words)
                    text_blocks = [
                        TextBlock(
                            block_id=b["block_id"],
                            text=b["text"],
                            confidence=b["confidence"],
                            bounding_box=b["bounding_box"],
                            language_hint=b.get("language_hint", "en")
                        ) for b in blocks_data
                    ]
                    layout_regions = layout.detect(img_path, text_blocks=text_blocks, page_number=page_num+1)
                else:
                    logger.info(f"[ATC_RESOLVER] Page {page_num + 1} of ATC child PDF parsed using Tesseract OCR (lang='eng+hin') fallback pass.")
                    preprocessed_path = preprocess_image_for_ocr(img_path)
                    try:
                        text_blocks = ocr.run(preprocessed_path)
                    except Exception as ocr_err:
                        logger.warning(f"ATC OCR execution failed on page {page_num + 1}: {ocr_err}. Falling back to native text extraction.")
                        native_words = page.get_text("words")
                        blocks_data = build_text_blocks_from_words(native_words)
                        text_blocks = [
                            TextBlock(
                                block_id=b["block_id"],
                                text=b["text"],
                                confidence=b["confidence"],
                                bounding_box=b["bounding_box"],
                                language_hint=b.get("language_hint", "en")
                            ) for b in blocks_data
                        ]
                    layout_regions = layout.detect(preprocessed_path, text_blocks=text_blocks, page_number=page_num+1)
                    if preprocessed_path != img_path:
                        try:
                            preprocessed_path.unlink()
                        except Exception:
                            pass

                # Spatial containment and reading order mapping for ATC regions
                for idx, region in enumerate(layout_regions):
                    region.reading_order_index = idx + 1
                    if not region.text_content:
                        contained_blocks = [tb for tb in text_blocks if is_contained(tb.bounding_box, region.bounding_box)]
                        sorted_contained = sort_blocks_by_reading_order(contained_blocks)
                        region.contained_block_ids = [b.block_id for b in sorted_contained]
                        region.text_content = "\n".join([b.text for b in sorted_contained])
                        if sorted_contained:
                            region.bounding_box = {
                                "x1": min(b.bounding_box["x1"] for b in sorted_contained),
                                "y1": min(b.bounding_box["y1"] for b in sorted_contained),
                                "x2": max(b.bounding_box["x2"] for b in sorted_contained),
                                "y2": max(b.bounding_box["y2"] for b in sorted_contained)
                            }
                    if region.region_type.lower() == "table" and not region.table_structure:
                        from app.ocr.table_grid_parser import build_table_structure
                        contained_blocks = [tb for tb in text_blocks if is_contained(tb.bounding_box, region.bounding_box)]
                        region.table_structure = build_table_structure(contained_blocks)

                atc_pr = PageResult(
                    job_id=f"{job_id}_atc",
                    page_number=page_num + 1,
                    image_path=str(img_path),
                    image_width_px=w,
                    image_height_px=h,
                    processing_time_seconds=0.0,
                    text_blocks=text_blocks,
                    layout_regions=layout_regions
                )
                atc_page_results.append(atc_pr)

            atc_doc.close()

            atc_extractor = FieldExtractor()
            atc_fields = atc_extractor.extract_atc_fields(atc_page_results)
            logger.info(f"[ATC_RESOLVER] ATC parse successful: {len(atc_fields)} fields extracted from child PDF.")

            from app.ocr.extractors.field_extractor import merge_tender_and_atc_fields
            extracted_fields = merge_tender_and_atc_fields(extracted_fields, atc_fields)
        except Exception as atc_err:
            logger.warning(f"[ATC_RESOLVER] Failed to process ATC child PDF '{atc_pdf_path}': {atc_err}. Continuing with main tender parsing only.")

    # Build and serialize Pydantic response models
    raw_ocr_pages = {}
    for pr in page_results:
        raw_ocr_pages[str(pr.page_number)] = [
            OCRBlockSchema(
                block_id=tb.block_id,
                text=tb.text,
                confidence=tb.confidence,
                bounding_box=BoundingBox(**tb.bounding_box),
                page_number=pr.page_number
            ) for tb in pr.text_blocks
        ]
    raw_ocr_resp = RawOCRResponse(
        job_id=job_id,
        original_filename=pdf_path.name,
        page_count=len(page_results),
        processing_time_seconds=time.time() - start_pipeline_time,
        pages=raw_ocr_pages
    )
    
    layout_pages = {}
    for pr in page_results:
        layout_pages[str(pr.page_number)] = [
            LayoutRegionSchema(
                region_id=lr.region_id,
                region_type=lr.region_type,
                bounding_box=BoundingBox(**lr.bounding_box),
                page_number=pr.page_number,
                contained_block_ids=lr.contained_block_ids,
                reading_order_index=lr.reading_order_index,
                text_content=lr.text_content,
                confidence=lr.confidence,
                table_structure=lr.table_structure
            ) for lr in pr.layout_regions
        ]
    layout_resp = LayoutResponse(
        job_id=job_id,
        original_filename=pdf_path.name,
        page_count=len(page_results),
        processing_time_seconds=time.time() - start_pipeline_time,
        pages=layout_pages
    )
    
    needs_stage2 = False
    if is_gem:
        for f in extracted_fields:
            if f.field_name == "required_documents" and isinstance(f.value, list):
                needs_stage2 = any(item.get("needs_stage2") for item in f.value if isinstance(item, dict))

    extracted_fields_resp = ExtractedFieldsResponse(
        job_id=job_id,
        original_filename=pdf_path.name,
        page_count=len(page_results),
        extracted_fields=extracted_fields,
        extracted_products=[
            ProductItemSchema(**p) for p in extracted_products
        ],
        needs_stage2_atc_parse=needs_stage2,
        document_type=doc_type,
        atc_document_link_present=atc_link_present,
        atc_link_url=atc_link_url
    )

    # Save files to disk
    with open(job_dir / "raw_ocr.json", "w", encoding="utf-8") as f:
        f.write(raw_ocr_resp.model_dump_json(indent=2))

    with open(job_dir / "layout.json", "w", encoding="utf-8") as f:
        f.write(layout_resp.model_dump_json(indent=2))

    with open(job_dir / "extracted_fields.json", "w", encoding="utf-8") as f:
        f.write(extracted_fields_resp.model_dump_json(indent=2))

    return page_results
