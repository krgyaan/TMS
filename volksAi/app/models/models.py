from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

@dataclass
class TextBlock:
    block_id: str
    text: str
    confidence: float
    bounding_box: Dict[str, int]
    language_hint: str

@dataclass
class LayoutRegion:
    region_id: str
    region_type: str
    bounding_box: Dict[str, int]
    contained_block_ids: List[str]
    table_structure: Optional[Dict[str, Any]] = None
    reading_order_index: int = 0
    text_content: str = ""
    confidence: Optional[float] = None

@dataclass
class PageResult:
    job_id: str
    page_number: int
    image_path: str
    image_width_px: int
    image_height_px: int
    processing_time_seconds: float
    text_blocks: List[TextBlock]
    layout_regions: List[LayoutRegion]
    warnings: List[str] = field(default_factory=list)
    layoutlm_results: Optional[Dict[str, Any]] = None

