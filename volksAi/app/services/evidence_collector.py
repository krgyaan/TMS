from datetime import datetime
from typing import List, Dict, Any, Optional
from app.services.page_classifier import classify_page

def score_occurrence(occ: Dict[str, Any], field_type: str, total_pages: int = 16) -> float:
    """
    Computes a selection score for an occurrence based on its page location and confidence.
    """
    page = occ.get("page", 1)
    confidence = occ.get("confidence", 1.0)
    zone = classify_page(page, total_pages)
    
    # Category weighting rules
    if field_type in ["identity", "emd", "fee", "timing"]:
        location_weight = 3.0 if zone == "COVER" else (2.0 if zone == "BODY" else 1.0)
    elif field_type in ["eligibility", "guarantees"]:
        location_weight = 3.0 if zone == "BODY" else (2.0 if zone == "COVER" else 1.0)
    else: # delivery, courier, signatures, general
        location_weight = 3.0 if zone == "END" else (2.0 if zone == "BODY" else 1.0)
        
    return location_weight * confidence

def resolve_best_value(occurrences: List[Dict[str, Any]], field_type: str, total_pages: int = 16) -> Optional[Dict[str, Any]]:
    """
    Evaluates all occurrences of a field and returns the one with the highest selection score.
    Returns None if occurrences list is empty.
    Applies strict validation: if multiple values conflict on highest score with low confidence (< 0.8), returns None.
    """
    if not occurrences:
        return None
        
    best_occ = None
    best_score = -1.0
    scores = []
    
    for occ in occurrences:
        score = score_occurrence(occ, field_type, total_pages)
        scores.append((score, occ))
        if score > best_score:
            best_score = score
            best_occ = occ
            
    # Check for conflicts among top scoring items
    top_candidates = [occ for score, occ in scores if score == best_score]
    if len(top_candidates) > 1:
        # Check if they have different raw values
        unique_vals = {str(c.get("value_raw")).strip().lower() for c in top_candidates}
        if len(unique_vals) > 1:
            # If highest confidence is low, return None to avoid fake certainty
            max_conf = max(c.get("confidence", 0.0) for c in top_candidates)
            if max_conf < 0.80:
                return None
                
    return best_occ

def compile_evidence_log(occurrences: List[Dict[str, Any]], tender_id: int) -> List[Dict[str, Any]]:
    """
    Transforms raw occurrences into database/CSV evidence rows matching Layer 2 structure.
    """
    evidence_rows = []
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for occ in occurrences:
        evidence_rows.append({
            "tender_id": tender_id,
            "field_name": occ.get("field_name"),
            "extracted_value_raw": occ.get("value_raw"),
            "normalized_value": occ.get("normalized_value"),
            "page_number": occ.get("page", 1),
            "confidence": occ.get("confidence", 1.0),
            "text_snippet": occ.get("text_snippet"),
            "extraction_timestamp": timestamp_str
        })
        
    return evidence_rows
