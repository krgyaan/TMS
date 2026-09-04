def classify_page(page_num: int, total_pages: int = 16) -> str:
    """
    Classifies a 1-based page number into a zone: COVER, BODY, or END.
    Useful for page-aware extraction weight prioritization.
    """
    if page_num <= 2:
        return "COVER"
    if page_num >= max(3, total_pages - 2):
        return "END"
    return "BODY"
