import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union

logger = logging.getLogger(__name__)

# Try importing pdfplumber
HAS_PDFPLUMBER = False
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    logger.warning("pdfplumber is not installed. Table extraction will use fallback OCR clustering.")


def clean_cell_text(cell: Any) -> str:
    """
    Cleans raw cell text extracted by pdfplumber or OCR:
    - Strips CID font corruption artifacts (e.g. (cid:1))
    - Normalizes internal newlines and excess whitespace
    """
    if cell is None:
        return ""
    text = str(cell).strip()
    text = re.sub(r"\(cid:\d+\)", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", " ", text).strip()
    return text


def get_bbox(b: Any) -> Optional[Dict[str, int]]:
    """Helper to safely retrieve a bounding_box dictionary from a TextBlock or dict."""
    if hasattr(b, 'bounding_box') and b.bounding_box is not None:
        return b.bounding_box
    if isinstance(b, dict):
        if 'bounding_box' in b and b['bounding_box'] is not None:
            return b['bounding_box']
        if 'bbox' in b and b['bbox'] is not None:
            return b['bbox']
    return None


def get_text(b: Any) -> str:
    """Helper to safely retrieve text from a TextBlock or dict."""
    if hasattr(b, 'text'):
        return b.text
    if isinstance(b, dict):
        return b.get('text', '')
    return ''


def compute_iou(boxA: Dict[str, Any], boxB: Dict[str, Any]) -> float:
    """Computes Intersection over Union (IoU) between two bounding boxes."""
    xA = max(boxA["x1"], boxB["x1"])
    yA = max(boxA["y1"], boxB["y1"])
    xB = min(boxA["x2"], boxB["x2"])
    yB = min(boxA["y2"], boxB["y2"])

    inter_width = max(0, xB - xA)
    inter_height = max(0, yB - yA)
    inter_area = inter_width * inter_height

    if inter_area == 0:
        return 0.0

    areaA = (boxA["x2"] - boxA["x1"]) * (boxA["y2"] - boxA["y1"])
    areaB = (boxB["x2"] - boxB["x1"]) * (boxB["y2"] - boxB["y1"])
    union_area = areaA + areaB - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def deduplicate_tables(tables: List[Dict[str, Any]], iou_threshold: float = 0.6) -> List[Dict[str, Any]]:
    """
    Deduplicates overlapping or near-identical tables detected on the same page.
    If two tables overlap with IoU >= threshold or one is mostly contained within another,
    keeps the table with higher row/cell count.
    """
    if not tables or len(tables) <= 1:
        return tables

    surviving = []
    for t in tables:
        t_box = t.get("bbox", {})
        is_duplicate = False
        for s_idx, s in enumerate(surviving):
            s_box = s.get("bbox", {})
            iou = compute_iou(t_box, s_box)
            
            # Check overlap or containment
            inter_x = max(0, min(t_box.get("x2", 0), s_box.get("x2", 0)) - max(t_box.get("x1", 0), s_box.get("x1", 0)))
            inter_y = max(0, min(t_box.get("y2", 0), s_box.get("y2", 0)) - max(t_box.get("y1", 0), s_box.get("y1", 0)))
            inter_area = inter_x * inter_y
            
            area_t = (t_box.get("x2", 0) - t_box.get("x1", 0)) * (t_box.get("y2", 0) - t_box.get("y1", 0))
            area_s = (s_box.get("x2", 0) - s_box.get("x1", 0)) * (s_box.get("y2", 0) - s_box.get("y1", 0))
            
            containment = (inter_area / area_t) if area_t > 0 else 0.0
            
            if iou >= iou_threshold or containment >= 0.85:
                is_duplicate = True
                # Replace if candidate table has strictly more rows
                if t.get("rows", 0) > s.get("rows", 0):
                    surviving[s_idx] = t
                break
                
        if not is_duplicate:
            surviving.append(t)

    return surviving


def extract_tables_with_pdfplumber(
    pdf_path_or_page: Union[str, Path, Any],
    page_number: int = 1,
    image_width_px: Optional[int] = None,
    image_height_px: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Extracts structured tables from a born-digital PDF page using pdfplumber.
    Returns a list of structured table dictionaries containing:
      - 'table_id': identifier string
      - 'bbox': bounding box dictionary {'x1': ..., 'y1': ..., 'x2': ..., 'y2': ...}
      - 'rows': row count
      - 'cols': column count
      - 'grid': List[List[str]] structured 2D matrix (rows x columns)
      - 'cells': List of individual cell dictionaries
    """
    if not HAS_PDFPLUMBER:
        logger.warning("pdfplumber is unavailable. Cannot execute vector table extraction.")
        return []

    tables_data = []

    def _process_page(plumber_page):
        detected_tables = plumber_page.find_tables()
        if not detected_tables:
            return []

        pdf_w = plumber_page.width if plumber_page.width > 0 else 1.0
        pdf_h = plumber_page.height if plumber_page.height > 0 else 1.0
        scale_x = (image_width_px / pdf_w) if image_width_px else 1.0
        scale_y = (image_height_px / pdf_h) if image_height_px else 1.0

        raw_tables = []
        for t_idx, t in enumerate(detected_tables):
            extracted_raw = t.extract()
            if not extracted_raw:
                continue

            # Clean each row and preserve 2D list-of-lists
            grid = []
            for row in extracted_raw:
                cleaned_row = [clean_cell_text(cell) for cell in row]
                # Keep row if not entirely empty
                if any(cleaned_row):
                    grid.append(cleaned_row)

            if not grid:
                continue

            num_rows = len(grid)
            num_cols = max(len(r) for r in grid) if grid else 0

            # Scale bounding box to image pixel space if dimensions provided
            p_x0, p_top, p_x1, p_bottom = t.bbox
            bbox = {
                "x1": max(0, int(round(p_x0 * scale_x))),
                "y1": max(0, int(round(p_top * scale_y))),
                "x2": max(0, int(round(p_x1 * scale_x))),
                "y2": max(0, int(round(p_bottom * scale_y)))
            }

            cells = []
            for r_i, row in enumerate(grid):
                for c_i, cell_text in enumerate(row):
                    cells.append({
                        "row": r_i,
                        "col": c_i,
                        "text": cell_text,
                        "bounding_box": bbox
                    })

            raw_tables.append({
                "table_id": f"tbl_{page_number}_{t_idx+1:02d}",
                "bbox": bbox,
                "rows": num_rows,
                "cols": num_cols,
                "grid": grid,
                "cells": cells
            })

        return deduplicate_tables(raw_tables)

    # Handle passed pdfplumber page instance vs file path
    if hasattr(pdf_path_or_page, 'find_tables'):
        return _process_page(pdf_path_or_page)

    pdf_path = Path(pdf_path_or_page)
    if not pdf_path.exists():
        logger.error(f"PDF path does not exist: {pdf_path}")
        return []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            idx = page_number - 1
            if 0 <= idx < len(pdf.pages):
                return _process_page(pdf.pages[idx])
            else:
                logger.warning(f"Page index {idx} out of range for {pdf_path.name} (pages: {len(pdf.pages)})")
                return []
    except Exception as e:
        logger.error(f"pdfplumber table extraction failed on {pdf_path.name}: {e}")
        return []


def is_block_inside_table(
    block_bbox: Dict[str, int],
    table_bbox: Dict[str, int],
    threshold: float = 0.5
) -> bool:
    """Checks if a text block's bounding box is substantially contained inside a table bounding box."""
    if not block_bbox or not table_bbox:
        return False

    b_xA = max(block_bbox["x1"], table_bbox["x1"])
    b_yA = max(block_bbox["y1"], table_bbox["y1"])
    b_xB = min(block_bbox["x2"], table_bbox["x2"])
    b_yB = min(block_bbox["y2"], table_bbox["y2"])

    inter_width = max(0, b_xB - b_xA)
    inter_height = max(0, b_yB - b_yA)
    inter_area = inter_width * inter_height

    if inter_area == 0:
        return False

    block_area = (block_bbox["x2"] - block_bbox["x1"]) * (block_bbox["y2"] - block_bbox["y1"])
    if block_area <= 0:
        return False

    return (inter_area / block_area) >= threshold


def filter_blocks_outside_tables(
    text_blocks: List[Any],
    table_bboxes: List[Dict[str, int]],
    threshold: float = 0.5
) -> List[Any]:
    """
    Filters out text blocks that fall inside detected table bounding boxes.
    Prevents duplicate extraction of table contents in the regular paragraph text stream.
    """
    if not table_bboxes:
        return text_blocks

    outside_blocks = []
    for b in text_blocks:
        b_box = get_bbox(b)
        if b_box is None:
            outside_blocks.append(b)
            continue

        inside_any = False
        for t_box in table_bboxes:
            if is_block_inside_table(b_box, t_box, threshold=threshold):
                inside_any = True
                break

        if not inside_any:
            outside_blocks.append(b)

    return outside_blocks


def reconstruct_grid(text_blocks_or_data: Any, x_tol: int = 20, y_tol: int = 12) -> List[List[str]]:
    """
    Reconstructs an explicit 2D grid matrix (Rows x Columns) for tender_mapper.py.
    Accepts:
      - A structured table dictionary or list of grid rows (from pdfplumber)
      - A list of TextBlock objects (fallback clustering)
    """
    if not text_blocks_or_data:
        return []

    # If already a list of row lists
    if isinstance(text_blocks_or_data, list) and len(text_blocks_or_data) > 0:
        if isinstance(text_blocks_or_data[0], list):
            return text_blocks_or_data

    # If a table structure dictionary
    if isinstance(text_blocks_or_data, dict):
        if "grid" in text_blocks_or_data:
            return text_blocks_or_data["grid"]
        if "cells" in text_blocks_or_data and "rows" in text_blocks_or_data and "cols" in text_blocks_or_data:
            num_rows = text_blocks_or_data["rows"]
            num_cols = text_blocks_or_data["cols"]
            grid = [["" for _ in range(num_cols)] for _ in range(num_rows)]
            for cell in text_blocks_or_data["cells"]:
                r = cell.get("row", 0)
                c = cell.get("col", 0)
                txt = cell.get("text", "")
                if r < num_rows and c < num_cols:
                    grid[r][c] = txt
            return grid

    # Fallback spatial clustering on OCR TextBlock objects
    valid_blocks = []
    for b in text_blocks_or_data:
        bbox = get_bbox(b)
        if bbox and all(k in bbox for k in ('x1', 'y1', 'x2', 'y2')):
            valid_blocks.append(b)

    if not valid_blocks:
        return []

    sorted_blocks = sorted(valid_blocks, key=lambda b: (get_bbox(b)['y1'], get_bbox(b)['x1']))

    rows_raw = []
    for b in sorted_blocks:
        placed = False
        bbox = get_bbox(b)
        for row in rows_raw:
            avg_y = sum(get_bbox(item)['y1'] for item in row) / len(row)
            if abs(bbox['y1'] - avg_y) <= y_tol:
                row.append(b)
                placed = True
                break
        if not placed:
            rows_raw.append([b])

    all_x1s = sorted([get_bbox(b)['x1'] for b in sorted_blocks])
    col_clusters = []
    for x in all_x1s:
        if not col_clusters or abs(x - sum(col_clusters[-1])/len(col_clusters[-1])) > x_tol:
            col_clusters.append([x])
        else:
            col_clusters[-1].append(x)

    col_centroids = [int(sum(c)/len(c)) for c in col_clusters]
    num_cols = len(col_centroids)

    grid = []
    for row in rows_raw:
        grid_row = [""] * num_cols
        for block in row:
            bbox = get_bbox(block)
            bx = bbox['x1']
            col_idx = min(range(num_cols), key=lambda idx: abs(bx - col_centroids[idx]))
            text = get_text(block)
            grid_row[col_idx] = (grid_row[col_idx] + " " + text).strip()
        grid.append(grid_row)

    return grid


def build_table_structure(text_blocks_or_grid: Any, x_tol: int = 20, y_tol: int = 12) -> Dict[str, Any]:
    """
    Builds the table_structure dictionary format expected by LayoutRegion and PageResult.
    """
    # If already a 2D list-of-lists grid
    if isinstance(text_blocks_or_grid, list) and len(text_blocks_or_grid) > 0 and isinstance(text_blocks_or_grid[0], list):
        grid = text_blocks_or_grid
        num_rows = len(grid)
        num_cols = max(len(r) for r in grid) if grid else 0
        cells_list = []
        for r_idx, row in enumerate(grid):
            for c_idx, cell_text in enumerate(row):
                cells_list.append({
                    "row": r_idx,
                    "col": c_idx,
                    "text": cell_text,
                    "bounding_box": {"x1": 0, "y1": 0, "x2": 0, "y2": 0}
                })
        return {
            "rows": num_rows,
            "cols": num_cols,
            "grid": grid,
            "cells": cells_list
        }

    # If already a dictionary
    if isinstance(text_blocks_or_grid, dict) and "cells" in text_blocks_or_grid:
        return text_blocks_or_grid

    # Fallback to reconstructing from blocks
    grid = reconstruct_grid(text_blocks_or_grid, x_tol=x_tol, y_tol=y_tol)
    num_rows = len(grid)
    num_cols = max(len(r) for r in grid) if grid else 0
    cells_list = []
    for r_idx, row in enumerate(grid):
        for c_idx, cell_text in enumerate(row):
            cells_list.append({
                "row": r_idx,
                "col": c_idx,
                "text": cell_text,
                "bounding_box": {"x1": 0, "y1": 0, "x2": 0, "y2": 0}
            })
    return {
        "rows": num_rows,
        "cols": num_cols,
        "grid": grid,
        "cells": cells_list
    }
