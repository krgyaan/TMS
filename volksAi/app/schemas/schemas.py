from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

# Schema for raw_ocr.json
class OCRBlockSchema(BaseModel):
    block_id: str
    text: str
    confidence: float
    bounding_box: BoundingBox
    page_number: int

class RawOCRResponse(BaseModel):
    job_id: str
    original_filename: str
    page_count: int
    processing_time_seconds: float
    pages: Dict[str, List[OCRBlockSchema]] # Keys are stringified page numbers like "1", "2"

# Schema for layout.json
class LayoutRegionSchema(BaseModel):
    region_id: str
    region_type: str
    bounding_box: BoundingBox
    page_number: int
    contained_block_ids: List[str]
    reading_order_index: int
    text_content: str
    confidence: Optional[float] = None
    table_structure: Optional[Dict[str, Any]] = None

class LayoutResponse(BaseModel):
    job_id: str
    original_filename: str
    page_count: int
    processing_time_seconds: float
    pages: Dict[str, List[LayoutRegionSchema]]

# Schema for extracted_fields.json
class SourceBlockRef(BaseModel):
    page_number: int
    block_id: Optional[str] = None
    region_id: Optional[str] = None
    text: str
    bounding_box: Optional[BoundingBox] = None

class ExtractedFieldSchema(BaseModel):
    field_name: str
    value: Optional[Any] = None
    confidence: float
    source_page: int
    evidence: str
    source_blocks: List[SourceBlockRef]
    source: Optional[str] = None
    likely_source: Optional[str] = None

class ProductItemSchema(BaseModel):
    product_name: str
    normalized_category: str
    raw_text: str
    quantity: Optional[str] = None
    unit: Optional[str] = None
    technical_specification: Optional[str] = None
    brand_or_oem_if_present: Optional[str] = None
    page_number: int
    confidence: float
    evidence_text: str

class ExtractedFieldsResponse(BaseModel):
    job_id: str
    original_filename: str
    page_count: int
    extracted_fields: List[ExtractedFieldSchema]
    extracted_products: List[ProductItemSchema] = []
    needs_stage2_atc_parse: Optional[bool] = None
    document_type: Optional[str] = "generic_nit"
    atc_document_link_present: Optional[bool] = None
    atc_link_url: Optional[str] = None
