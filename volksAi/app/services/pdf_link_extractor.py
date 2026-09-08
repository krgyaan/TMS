import logging
import re
import os
import hashlib
import socket
import time
from typing import List, Dict, Any, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

# Ensure DNS resolution + TCP connect obey a hard timeout, not just I/O.
# On Windows, getaddrinfo can block 60-120 s if the host is unreachable;
# requests timeout handling still keeps the same 15 second ceiling.
socket.setdefaulttimeout(15)

GEM_WARMUP_URL = "https://bidplus.gem.gov.in/all-bids"


def _prime_gem_session(session: requests.Session, read_timeout: int = 15, warmup_url: Optional[str] = None) -> None:
    if session.cookies:
        return
    target_url = warmup_url or GEM_WARMUP_URL
    try:
        warmup_response = session.get(target_url, timeout=read_timeout, allow_redirects=True)
        warmup_response.close()
        logger.info(
            "[ATC_RESOLVER] Warmed GeM session via '%s' | status=%s | cookies=%s",
            target_url,
            warmup_response.status_code,
            session.cookies.get_dict(),
        )
    except requests.RequestException as exc:
        logger.warning("[ATC_RESOLVER] GeM session warm-up failed for '%s': %s", target_url, exc)



def _download_with_retry(
    session: requests.Session,
    url: str,
    *,
    max_retries: int = 3,
    base_delay: float = 2.0,
    read_timeout: int = 15,
) -> tuple:
    """Download a URL with exponential-backoff retry on transient errors.

    Returns (file_bytes, status_code, resp_headers_dict, content_type).
    Raises the last exception if all retries are exhausted.
    """
    last_exc: Optional[Exception] = None
    _prime_gem_session(session, read_timeout)
    for attempt in range(max_retries):
        try:
            response = session.get(url, timeout=read_timeout, allow_redirects=True)
            try:
                if response.status_code in (429, 502, 503) and attempt < max_retries - 1:
                    wait = base_delay * (2 ** attempt)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return (
                    response.content,
                    response.status_code,
                    dict(response.headers),
                    response.headers.get("Content-Type", ""),
                )
            finally:
                response.close()
        except requests.RequestException as exc:
            last_exc = exc
            try:
                if attempt == 0:
                    response = session.get(url, timeout=read_timeout, allow_redirects=True, verify=False)
                    try:
                        if response.status_code in (429, 502, 503) and attempt < max_retries - 1:
                            wait = base_delay * (2 ** attempt)
                            time.sleep(wait)
                            continue
                        response.raise_for_status()
                        return (
                            response.content,
                            response.status_code,
                            dict(response.headers),
                            response.headers.get("Content-Type", ""),
                        )
                    finally:
                        response.close()
            except requests.RequestException:
                pass
            if attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
                continue
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                try:
                    response = session.get(url, timeout=read_timeout, allow_redirects=True, verify=False)
                    try:
                        if response.status_code in (429, 502, 503) and attempt < max_retries - 1:
                            wait = base_delay * (2 ** attempt)
                            time.sleep(wait)
                            continue
                        response.raise_for_status()
                        return (
                            response.content,
                            response.status_code,
                            dict(response.headers),
                            response.headers.get("Content-Type", ""),
                        )
                    finally:
                        response.close()
                except Exception:
                    pass
            if attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
                continue
    raise RuntimeError(f"ATC download failed after {max_retries} attempts") from last_exc

def extract_links_and_mentions(pdf_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Hardened layer-based link extractor for tender PDFs.
    Layer 1: Standard machine-readable page links via page.get_links()
    Layer 2: PDF Embedded files (attachments) and link annotations check
    Layer 3: Regular expression textual file reference fallback
    Layer 4: Deduplication, confidence scoring, and mapping
    """
    import fitz
    from pathlib import Path
    
    parent_dir = Path(pdf_path).parent
    output_dir = parent_dir / "extracted_children"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    saved_paths = []
    embedded_count = 0
    annot_count = 0
    external_count = 0

    links = []
    mentions = []
    
    # Reject generic portal/homepage URLs
    def is_generic_homepage(url_str: str) -> bool:
        if not url_str:
            return True
        clean_url = url_str.strip().lower().rstrip("/")
        generic_domains = [
            "https://gem.gov.in", "http://gem.gov.in",
            "https://mkp.gem.gov.in", "http://mkp.gem.gov.in",
            "https://eprocure.gov.in", "http://eprocure.gov.in"
        ]
        if clean_url in generic_domains:
            return True
        from urllib.parse import urlparse
        parsed = urlparse(clean_url)
        if parsed.netloc in ["gem.gov.in", "mkp.gem.gov.in", "eprocure.gov.in"] and (not parsed.path or parsed.path in ["", "/"]) and not parsed.query:
            return True
        return False

    # BUG 2 FIX: Scope-protected should_download logic preventing arbitrary external HTTP downloads while allowing unverified tender document links
    def is_tender_doc_url(url_str: str) -> bool:
        if not url_str or not url_str.startswith("http"):
            return False
        if is_generic_homepage(url_str):
            return False

        url_lower = url_str.lower()
        # Exclude generic PSU corporate policy PDFs that are not tender documents
        if any(pol in url_lower for pol in ["policy_for_debarment", "fraud_prevention_policy", "policy_for_", "integrity_pact"]):
            return False

        doc_exts = [".pdf", ".xlsx", ".xls", ".doc", ".docx", ".zip"]
        if any(ext in url_lower for ext in doc_exts):
            return True

        from urllib.parse import urlparse
        parsed = urlparse(url_lower)
        domain = parsed.netloc
        path = parsed.path

        tender_domains = ["gem.gov.in", "mkp.gem.gov.in", "assets-bg.gem.gov.in", "bidplus.gem.gov.in", "eprocure.gov.in", "etenders.gov.in", "cppp.gov.in"]
        tender_path_keywords = ["/buyer-atc/", "/atc/", "/doc/", "/download/", "/tenders/", "/files/", "/documents/", "/upload/", "/resources/", "/specificationdocument/"]

        if any(td in domain for td in tender_domains):
            if any(kw in path for kw in tender_path_keywords):
                return True

        return any(kw in url_lower for kw in ["/buyer-atc/", "/atc/doc/", "download_atc", "get_document", "/upload/shared/", "/specificationdocument/"])

    # Simple regex pattern to scan for referenced assets in prose
    mention_pattern = re.compile(
        r'\b(?:annexure|corrigendum|boq|volume|schedule|specification|addendum)[-_\s]*(?:[iIIVvXx]+|\d+)?(?:\.pdf|\.xlsx?|\.docx?|\b)',
        re.IGNORECASE
    )
    
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening PDF in link extractor: {e}")
        return [], []
        
    try:
        # Layer 2a: PDF Embedded Files check (global level attachments)
        emb_count = 0
        try:
            emb_count = doc.embfile_count()
        except Exception:
            pass
            
        for idx in range(emb_count):
            try:
                info = doc.embfile_info(idx)
                filename = info.get("filename", "")
                if filename:
                    file_bytes = doc.embfile_get(idx)
                    out_path = output_dir / filename
                    with open(out_path, "wb") as f:
                        f.write(file_bytes)
                    saved_paths.append(str(out_path))
                    embedded_count += 1
                    
                    # Treat embedded attachments as high-confidence linked sources
                    links.append({
                        "name": filename,
                        "url": f"embedded://{filename}",
                        "sourcePage": 1,
                        "anchorText": info.get("desc", "") or f"Embedded file attachment: {filename}",
                        "extractionConfidence": 98.0,
                        "local_path": str(out_path)
                    })
            except Exception as e:
                print(f"[DEBUG] PyMuPDF global embedded extraction failed at index {idx}: {e}")

        # Fallback using pypdf if PyMuPDF count is 0
        if emb_count == 0:
            try:
                from pypdf import PdfReader  # type: ignore
                reader = PdfReader(pdf_path)
                if reader.attachments:
                    for name, content_list in reader.attachments.items():
                        for content in content_list:
                            out_path = output_dir / name
                            with open(out_path, "wb") as f:
                                f.write(content)
                            saved_paths.append(str(out_path))
                            embedded_count += 1
                            links.append({
                                "name": name,
                                "url": f"embedded://{name}",
                                "sourcePage": 1,
                                "anchorText": f"Embedded file attachment (pypdf fallback): {name}",
                                "extractionConfidence": 98.0,
                                "local_path": str(out_path)
                            })
            except ImportError:
                print("[WARNING] pypdf library is not installed, skipping fallback extraction.")
            except Exception as pe:
                print(f"[DEBUG] pypdf extraction failed: {pe}")

        # Iterate page by page (first 50 pages where commercial & tender links reside)
        total_link_pages = min(len(doc), 50)
        for page_num in range(total_link_pages):
            try:
                page = doc.load_page(page_num)
            except Exception:
                continue

            page_text_raw = str(page.get_text())
            page_text_lower = page_text_raw.lower()

            # BUG 1 FIX: Evaluate per-page text quality to determine if native text is reliable
            from app.services.pdf_text_extractor import is_text_scrambled_or_garbage, preprocess_image_for_ocr
            is_native_reliable = not is_text_scrambled_or_garbage(page_text_raw)

            # Check if any ATC anchor phrase is present on this page via native text
            atc_anchor_phrases = [
                "buyer uploaded atc document",
                "buyer added bid specific atc",
                "click here to view the file",
                "click here",
                "atc"
            ]
            page_has_native_atc_phrase = is_native_reliable and (
                any(phrase in page_text_lower for phrase in atc_anchor_phrases[:3]) or "atc" in page_text_lower
            )

            # Layer 1: page.get_links()
            try:
                page_links = page.get_links()
            except Exception:
                page_links = []

            found_atc_uri_on_page = False
            for l in page_links:
                try:
                    # Check LINK_URI
                    if l.get("kind") == fitz.LINK_URI:
                        uri = l.get("uri", "").strip()
                        if uri:
                            # Reconstruct anchor text by reading words in padded link bounding box
                            rect_coords = l.get("from") or l.get("rect")
                            anchor_text = ""
                            surrounding_context = ""
                            padded_rect = None
                            if rect_coords:
                                rect = fitz.Rect(rect_coords)
                                padded_rect = rect + fitz.Rect(-5, -5, 5, 5)
                                # Extended context box: inspect 45 points above and surrounding the link
                                context_rect = fitz.Rect(max(0, rect.x0 - 50), max(0, rect.y0 - 45), rect.x1 + 50, rect.y1 + 10)
                                try:
                                    anchor_text = page.get_textbox(padded_rect).strip()
                                except Exception:
                                    anchor_text = ""
                                try:
                                    surrounding_context = page.get_textbox(context_rect).strip()
                                except Exception:
                                    surrounding_context = ""
                                if not anchor_text:
                                    words = page.get_text("words")
                                    anchor_words = [w[4] for w in words if fitz.Rect(w[:4]).intersects(padded_rect)]
                                    anchor_text = " ".join(anchor_words).strip()

                            anchor_lower = anchor_text.lower()
                            context_lower = surrounding_context.lower()
                            combined_text = f"{anchor_lower} {context_lower}"
                            uri_lower = uri.lower()

                            # Exclude known false-positive non-ATC link types (BOQ sheets, Excel price bids, GTC, corporate policies)
                            NON_ATC_EXCLUSIONS = [
                                "boqdocument", "boqlineitemsdocument",
                                "excel/bid-", ".xlsx", ".xls", ".csv", "downloadomppdfile",
                                "list-of-categories", "/gtc/", "pdfbydate",
                                "policy_for_debarment", "fraud_prevention_policy", "policy_for_"
                            ]
                            is_excluded_non_atc = any(ex in uri_lower for ex in NON_ATC_EXCLUSIONS)

                            is_policy = any(pol in uri_lower for pol in ["policy_for_debarment", "fraud_prevention_policy", "policy_for_", "integrity_pact"])

                            is_gtc = (
                                "/gtc/" in uri_lower
                                or "pdfbydate" in uri_lower
                                or "general terms" in anchor_lower
                                or "gtc" in anchor_lower
                            )
                            if is_generic_homepage(uri) or is_gtc or is_excluded_non_atc or is_policy:
                                is_atc_anchor = False
                            else:
                                # Primary high-priority ATC domain and path pattern
                                is_real_atc_domain_path = (
                                    ("fulfilment.gem.gov.in" in uri_lower and "/contract/slafds" in uri_lower)
                                    or "/buyer-atc/" in uri_lower
                                    or "/atc/doc/" in uri_lower
                                    or "download_atc" in uri_lower
                                )
                                # Anchor text / preceding heading match
                                is_explicit_atc_text = (
                                    "buyer uploaded atc document" in combined_text
                                    or "buyer added bid specific atc" in combined_text
                                    or "bid specific atc" in combined_text
                                    or ("click here to view the file" in combined_text and ("atc" in page_text_lower or is_real_atc_domain_path))
                                    or any(phrase in anchor_lower for phrase in atc_anchor_phrases if phrase != "atc")
                                )
                                is_atc_anchor = (is_explicit_atc_text or is_real_atc_domain_path) and not is_excluded_non_atc and not is_policy

                            anchor_detection_method = "native text" if is_atc_anchor else None

                            # Lazy OCR fallback on scanned/image-heavy pages when native text is unreliable
                            if not is_atc_anchor and not is_native_reliable and padded_rect and not is_excluded_non_atc:
                                try:
                                    zoom = 3.0
                                    mat = fitz.Matrix(zoom, zoom)
                                    pix = page.get_pixmap(matrix=mat, clip=padded_rect, alpha=False)
                                    import tempfile
                                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
                                        tmp_img_path = Path(tmp_file.name)
                                    pix.save(str(tmp_img_path))
                                    pix = None

                                    preprocessed_tmp = preprocess_image_for_ocr(tmp_img_path)
                                    from app.ocr.ocr_engine import OcrEngine
                                    ocr_engine = OcrEngine(lang="eng+hin")
                                    try:
                                        ocr_blocks = ocr_engine.run(preprocessed_tmp)
                                        ocr_text = " ".join([b.text for b in ocr_blocks]).strip()
                                    finally:
                                        if tmp_img_path.exists():
                                            try: tmp_img_path.unlink()
                                            except Exception: pass
                                        if preprocessed_tmp and preprocessed_tmp.exists() and preprocessed_tmp != tmp_img_path:
                                            try: preprocessed_tmp.unlink()
                                            except Exception: pass

                                    ocr_lower = ocr_text.lower()
                                    if any(phrase in ocr_lower for phrase in atc_anchor_phrases):
                                        is_atc_anchor = True
                                        anchor_text = ocr_text
                                        anchor_detection_method = "OCR fallback"
                                except Exception as ocr_err:
                                    import logging
                                    logging.getLogger("backend.app.services.pdf_link_extractor").debug(
                                        f"[ATC_RESOLVER] Lazy OCR anchor check failed on Page {page_num + 1}: {ocr_err}"
                                    )

                            if is_generic_homepage(uri) or is_gtc:
                                import logging
                                logger = logging.getLogger("backend.app.services.pdf_link_extractor")
                                logger.info(f"[ATC_RESOLVER] Rejected generic portal homepage or GTC URL: '{uri}' on Page {page_num + 1}")
                                continue

                            found_atc_uri_on_page = True
                            filename = uri.split("/")[-1].split("?")[0] or f"linked_file_p{page_num+1}.pdf"
                            if not filename.lower().endswith((".pdf", ".xlsx", ".xls", ".doc", ".docx", ".zip")):
                                filename = f"{filename}.pdf" # fallback suffix

                            import logging
                            logger = logging.getLogger("backend.app.services.pdf_link_extractor")
                            if is_atc_anchor:
                                logger.info(f"[ATC_RESOLVER] ATC anchor detected via {anchor_detection_method or 'native text'} on page {page_num + 1} (text='{anchor_text}')")
                                logger.info(f"[ATC_RESOLVER] Hyperlink URL resolved: '{uri}'")

                            # Assign 98.0 confidence for verified ATC anchors, 70.0 for unverified best-effort detections
                            conf = 98.0 if is_atc_anchor else 70.0

                            links.append({
                                "name": filename,
                                "url": uri,
                                "sourcePage": page_num + 1,
                                "anchorText": anchor_text or f"Clickable Hyperlink: {uri}",
                                "extractionConfidence": conf,
                                "is_atc_anchor": is_atc_anchor
                            })

                            # Check local cached child file first
                            url_hash = hashlib.sha256(uri.encode()).hexdigest()[:16]
                            ext = Path(filename).suffix or ".pdf"
                            unique_filename = f"atc_{url_hash}{ext}"
                            out_path = output_dir / unique_filename
                            if out_path.exists() and out_path.stat().st_size > 0:
                                logger.info(
                                    "[ATC_RESOLVER] Using cached local child file at: '%s'", out_path
                                )
                                saved_paths.append(str(out_path))
                                external_count += 1
                                links[-1]["local_path"] = str(out_path)
                                continue

                            # Do not download excluded non-ATC endpoints or when OFFLINE_EXTRACTION is enabled
                            is_offline = os.getenv("OFFLINE_EXTRACTION", "false").lower() == "true"
                            is_schedule_doc = (
                                ("specificationdocument" in uri_lower or any(k in uri_lower or k in filename.lower() for k in ["sch1", "sch2", "sch3", "sch4", "sch5", "sch6", "sch7", "schedule"]))
                                and filename.lower().endswith(".pdf")
                                and not is_policy
                            )
                            should_download = (not is_offline) and (is_atc_anchor or is_schedule_doc or (is_tender_doc_url(uri) and not is_excluded_non_atc and not is_policy))
                            if should_download:
                                try:
                                    logger.info(
                                        "[ATC_RESOLVER] Downloading ATC/Schedule child document from URL: '%s' "
                                        "(verified_anchor=%s, is_schedule=%s)", uri, is_atc_anchor, is_schedule_doc
                                    )
                                    headers = {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                        'Accept': 'application/pdf,application/octet-stream,*/*',
                                        'Referer': 'https://bidplus.gem.gov.in/'
                                    }
                                    with requests.Session() as session:
                                        session.headers.update(headers)
                                        # _download_with_retry handles session warm-up + retry/backoff.
                                        file_bytes, status_code, resp_headers, content_type = _download_with_retry(session, uri)

                                    logger.info(
                                        "[ATC_RESOLVER] HTTP %s response from '%s' | "
                                        "Content-Type: '%s' | Length: %d bytes",
                                        status_code, uri, content_type, len(file_bytes)
                                    )

                                    # Validate PDF magic bytes (%PDF), Excel ZIP magic bytes (PK\x03\x04), or Content-Type
                                    is_pdf = file_bytes.startswith(b"%PDF") or "pdf" in content_type.lower()
                                    is_excel = file_bytes.startswith(b"PK\x03\x04") or any(ct in content_type.lower() for ct in ["spreadsheet", "excel", "officedocument"])
                                    if is_pdf or is_excel:
                                        out_path = output_dir / unique_filename
                                        with open(out_path, "wb") as f:
                                            f.write(file_bytes)
                                        saved_paths.append(str(out_path))
                                        external_count += 1
                                        links[-1]["local_path"] = str(out_path)
                                        logger.info(f"[ATC_RESOLVER] ATC child document saved to: '{out_path}'")
                                    else:
                                        logger.warning(
                                            f"[ATC_RESOLVER] ATC_DOWNLOAD_INVALID: URL '{uri}' returned non-document content "
                                            f"(status={status_code}, content-type={content_type}, first bytes={file_bytes[:20]!r}). Not saving."
                                        )
                                except requests.exceptions.HTTPError as http_err:
                                    logger.warning(
                                        f"[ATC_RESOLVER] ATC_DOWNLOAD_FAILED: HTTP {http_err.response.status_code if http_err.response is not None else 'error'} for URL '{uri}' "
                                        f"| Session auth or cookies may be required: {http_err}"
                                    )
                                except Exception as dl_err:
                                    logger.warning(f"[ATC_RESOLVER] ATC_DOWNLOAD_FAILED: Failed to download ATC child PDF from URL '{uri}': {dl_err}. Continuing with main tender parsing only.")

                    # Support GotoE (Embedded Document Links) or GoToR (Remote Document Links)
                    elif l.get("kind") in (fitz.LINK_GOTO, fitz.LINK_GOTOR, fitz.LINK_LAUNCH):
                        file_dest = l.get("file", "")
                        if file_dest:
                            filename = os.path.basename(file_dest)
                            links.append({
                                "name": filename,
                                "url": f"local://{file_dest}",
                                "sourcePage": page_num + 1,
                                "anchorText": f"External reference destination link on Page {page_num + 1}",
                                "extractionConfidence": 90.0
                            })
                except Exception:
                    pass

            if page_has_native_atc_phrase and not found_atc_uri_on_page:
                import logging
                logger = logging.getLogger("backend.app.services.pdf_link_extractor")
                logger.warning(f"[ATC_RESOLVER] ATC_LINK_NOT_FOUND: Anchor phrase detected on Page {page_num + 1}, but no resolvable URI link annotation found.")
            
            # Layer 2b: Annotation-aware link harvesting
            try:
                annots = page.annots()
            except Exception:
                annots = None
                
            if annots:
                for annot in annots:
                    try:
                        # 1 represents Link annotation in fitz.PDF_ANNOT_LINK
                        if annot.type[0] == 1:
                            rect_coords = annot.rect
                            # Check if we already covered this rectangle in get_links
                            words = page.get_text("words")
                            anchor_words = [w[4] for w in words if fitz.Rect(w[:4]).intersects(rect_coords)]
                            anchor_text = " ".join(anchor_words).strip()
                            # If we can fetch URI metadata from the annot dictionary
                            info = annot.info
                            subject = info.get("subject", "") or info.get("title", "")
                            if subject and ("http" in subject or ".pdf" in subject):
                                links.append({
                                    "name": os.path.basename(subject),
                                    "url": subject,
                                    "sourcePage": page_num + 1,
                                    "anchorText": anchor_text or f"Annotation link: {subject}",
                                    "extractionConfidence": 92.0
                                })
                        # 16 represents FileAttachment annotation in fitz.PDF_ANNOT_FILEATTACHMENT
                        elif annot.type[0] == 16:
                            file_data = annot.get_file()
                            info = annot.file_info
                            filename = info.get("filename") or f"annot_attachment_p{page_num+1}.bin"
                            if file_data:
                                out_path = output_dir / filename
                                with open(out_path, "wb") as f:
                                    f.write(file_data)
                                saved_paths.append(str(out_path))
                                annot_count += 1
                                links.append({
                                    "name": filename,
                                    "url": f"embedded://{filename}",
                                    "sourcePage": page_num + 1,
                                    "anchorText": info.get("desc", "") or f"Annotation attachment on Page {page_num+1}",
                                    "extractionConfidence": 96.0,
                                    "local_path": str(out_path)
                                })
                    except Exception as ae:
                        print(f"[DEBUG] Failed to extract annotation file on page {page_num+1}: {ae}")

            # Layer 3: Textual URL and file reference fallback scanning
            try:
                page_text = str(page.get_text())
            except Exception:
                page_text = ""

            # 3a. Plain-text HTTP/HTTPS URL scanner for printed links without PDF LINK_URI annotations
            raw_url_pattern = re.compile(r'https?://[^\s<>"\'\]\)]+', re.IGNORECASE)
            for url_match in raw_url_pattern.finditer(page_text):
                raw_url = url_match.group(0).rstrip(".,;)>")
                if len(raw_url) > 10:
                    already_captured = any(l.get("url", "").lower() == raw_url.lower() for l in links)
                    if not already_captured and not is_generic_homepage(raw_url) and is_tender_doc_url(raw_url):
                        import logging
                        logger = logging.getLogger("backend.app.services.pdf_link_extractor")
                        logger.info(f"[ATC_RESOLVER] Plain-text URL detected in PDF text on Page {page_num + 1}: '{raw_url}'")
                        url_hash = hashlib.sha256(raw_url.encode()).hexdigest()[:16]
                        filename = raw_url.split("/")[-1].split("?")[0] or f"text_url_p{page_num+1}.pdf"
                        if not filename.lower().endswith((".pdf", ".xlsx", ".xls", ".doc", ".docx", ".zip")):
                            filename = f"{filename}.pdf"
                        unique_filename = f"atc_txt_{url_hash}_{filename}"
                        out_path = output_dir / unique_filename

                        raw_url_lower = raw_url.lower()
                        is_policy_raw = any(pol in raw_url_lower for pol in ["policy_for_debarment", "fraud_prevention_policy", "policy_for_", "integrity_pact"])
                        is_plain_atc = (not is_policy_raw) and any(k in raw_url_lower for k in ["/buyer-atc/", "/atc/", "download_atc", "fulfilment.gem.gov.in"])
                        links.append({
                            "name": filename,
                            "url": raw_url,
                            "sourcePage": page_num + 1,
                            "anchorText": f"Plain-Text Printed Hyperlink on Page {page_num + 1}",
                            "extractionConfidence": 85.0 if is_plain_atc else 70.0,
                            "is_atc_anchor": is_plain_atc
                        })

                        try:
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/pdf,application/octet-stream,*/*',
                                'Referer': 'https://bidplus.gem.gov.in/'
                            }
                            with requests.Session() as session:
                                session.headers.update(headers)
                                file_bytes, status_code, resp_headers, content_type = _download_with_retry(session, raw_url)
                            is_pdf = file_bytes.startswith(b"%PDF") or "pdf" in content_type.lower()
                            is_excel = file_bytes.startswith(b"PK\x03\x04") or any(ct in content_type.lower() for ct in ["spreadsheet", "excel", "officedocument"])
                            if is_pdf or is_excel:
                                with open(out_path, "wb") as f:
                                    f.write(file_bytes)
                                saved_paths.append(str(out_path))
                                external_count += 1
                                links[-1]["local_path"] = str(out_path)
                                logger.info(f"[ATC_RESOLVER] Plain-text URL ATC child document saved to: '{out_path}'")
                        except Exception as dl_err:
                            logger.warning(f"[ATC_RESOLVER] Failed to download plain-text URL '{raw_url}': {dl_err}")

            # 3b. Mention pattern fallback scanning
            for match in mention_pattern.finditer(page_text):
                mention_word = match.group(0).strip()
                if len(mention_word) > 3:
                    # Extract surrounding context sentence
                    sentences = re.split(r'(?<=[.!?])\s+', page_text)
                    context = ""
                    for s in sentences:
                        if mention_word in s:
                            context = s.strip().replace("\n", " ")
                            break
                    
                    # Construct realistic file suffixes
                    ext = ".xlsx" if "boq" in mention_word.lower() else ".pdf"
                    filename = mention_word if "." in mention_word else f"{mention_word}{ext}"
                    
                    # Check if already captured in high confidence links
                    already_linked = any(l["name"].lower() in filename.lower() or filename.lower() in l["name"].lower() for l in links)
                    already_mentioned = any(m["name"].lower() == filename.lower() for m in mentions)
                    
                    if not already_linked and not already_mentioned:
                        mentions.append({
                            "name": filename,
                            "mentionText": context or f"Document reference detected in text on Page {page_num + 1}.",
                            "sourcePage": page_num + 1,
                            "resolved": False
                        })
    except Exception as ex:
        print(f"Exception encountered in link extraction: {ex}")
    finally:
        try:
            doc.close()
        except Exception:
            pass

    # Print debug summary showing extraction stats
    print("\n" + "="*60)
    print("CHILD FILE EXTRACTION SUMMARY")
    print("="*60)
    print(f"Parent PDF: {pdf_path}")
    print(f"Embedded attachments extracted: {embedded_count}")
    print(f"Annotation attachments extracted: {annot_count}")
    print(f"External PDF/document links downloaded: {external_count}")
    print(f"Total files saved locally: {len(saved_paths)}")
    print("Saved file paths:")
    for path in saved_paths:
        print(f"  - {path}")
    print("="*60 + "\n")

    # Layer 4: Deduplicate and standardize items
    deduped_links = []
    seen_links = set()
    for l in links:
        key = (l["name"].lower(), l["url"].lower())
        if key not in seen_links:
            seen_links.add(key)
            deduped_links.append(l)

    return deduped_links, mentions
