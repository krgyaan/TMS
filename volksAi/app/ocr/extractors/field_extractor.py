import re
import math
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.models.models import PageResult, TextBlock, LayoutRegion
from app.schemas.schemas import ExtractedFieldSchema, SourceBlockRef, BoundingBox
from app.services.field_registry import merge_keywords

logger = logging.getLogger(__name__)

# Utility Spatial Containment checks
def get_intersection_area(boxA: Dict[str, int], boxB: Dict[str, int]) -> int:
    xA = max(boxA["x1"], boxB["x1"])
    yA = max(boxA["y1"], boxB["y1"])
    xB = min(boxA["x2"], boxB["x2"])
    yB = min(boxA["y2"], boxB["y2"])
    
    interWidth = max(0, xB - xA)
    interHeight = max(0, yB - yA)
    return interWidth * interHeight

def get_intersection_percentage(boxA: Dict[str, int], boxB: Dict[str, int]) -> float:
    interArea = get_intersection_area(boxA, boxB)
    if interArea == 0:
        return 0.0
    areaA = (boxA["x2"] - boxA["x1"]) * (boxA["y2"] - boxA["y1"])
    if areaA == 0:
        return 0.0
    return interArea / areaA

def is_contained(boxA: Dict[str, int], boxB: Dict[str, int], threshold: float = 0.5) -> bool:
    """Check if boxA is mostly contained within boxB."""
    # Check center point
    cx = (boxA["x1"] + boxA["x2"]) / 2
    cy = (boxA["y1"] + boxA["y2"]) / 2
    if (boxB["x1"] <= cx <= boxB["x2"]) and (boxB["y1"] <= cy <= boxB["y2"]):
        return True
    return get_intersection_percentage(boxA, boxB) >= threshold

# Table block row parsing utility
def group_blocks_into_rows(blocks: List[TextBlock], y_threshold: int = 15) -> List[List[TextBlock]]:
    if not blocks:
        return []
    
    # Sort blocks primarily by top y-coordinate
    sorted_blocks = sorted(blocks, key=lambda b: b.bounding_box["y1"])
    rows = []
    current_row = [sorted_blocks[0]]
    
    for block in sorted_blocks[1:]:
        # Compare current block y1 to the average y1 of the current row
        avg_y1 = sum(b.bounding_box["y1"] for b in current_row) / len(current_row)
        if abs(block.bounding_box["y1"] - avg_y1) <= y_threshold:
            current_row.append(block)
        else:
            rows.append(sorted(current_row, key=lambda b: b.bounding_box["x1"]))
            current_row = [block]
    rows.append(sorted(current_row, key=lambda b: b.bounding_box["x1"]))
    return rows

class FieldExtractor:
    def __init__(self):
        # Target regex patterns
        self.date_regex = re.compile(r'\b\d{2}[-/\.]\d{2}[-/\.]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b')
        self.currency_regex = re.compile(
            r'(?:Rs\.?|INR|₹|rupees)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?)(?:\s*(?:Lakh|Crore|Lacs|Cr|/-))?\b|'
            r'\b(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?)\s*(?:Lakh|Crore|Lacs|Cr)\b',
            re.IGNORECASE
        )
        self.nit_regex = re.compile(
            r'\b(?:GEM/20\d{2}/[A-Z]/\d+|'
            r'[A-Za-z0-9]+/20\d{2}-\d{2}/[0-9]+|'
            r'[A-Za-z0-9\-]+/[A-Za-z0-9\-]+/20\d{2}/[0-9]+|'
            r'NIT[-/\s\.:]*(?:No)?[-/\s\.:]*\b([A-Za-z0-9\-#/\.]*\d[A-Za-z0-9\-#/\.]*)\b)\b',
            re.IGNORECASE
        )
        self.validity_regex = re.compile(r'\b(\d+)\s*(?:days|days\s+validity|दिन|दिवस|अवधि)\b', re.IGNORECASE)
        self.period_regex = re.compile(
            r'\b(\d+)\s*(?:months|days|weeks|year|years|महीने|दिन|वर्ष)\b|'
            r'\b(?:one|two|three|four|five|six|twelve)\s*(?:months|days|weeks|year|years)\b',
            re.IGNORECASE
        )
        
        # Explicit out of scope fields for Stage 1 (confirmed missing in parent PDF)
        self.out_of_scope_stage1 = [
            "tender_value_gst_inclusive",
            "eligibility_criterion_years",
            "annual_avg_turnover_value",
            "working_capital_value",
            "net_worth_type_value",
            "solvency_certificate_value",
            "ld_applicable",
            "payment_terms_installation_percent",
            "maf_required",
            "tender_fee_amount",
            "processing_fee_amount",
            
            # Legacy field mappers that are out of scope in parent PDF
            "Tender Value",
            "tender_value",
            "Tender Fee",
            "tender_fee_amount",
            "years_of_past_experience",
            "minimum_average_annual_turnover",
            "past_experience_required"
        ]

        # Mapping definition of fields with anchors, hindi translations, and type of regex used
        self.rules = {
            # Legacy Fields
            "EMD": {
                "anchors": ["emd amount", "emd value", "emd (rs)", "emd (inr)", "earnest money deposit", "earnest money amount", "bid security amount", "emd:", "earnest money"],
                "hindi": ["धरोहर राशि", "ईएमडी", "बोली सुरक्षा"],
                "type": "currency"
            },
            "Tender Fee": {
                "anchors": ["tender fee", "cost of document", "document fee", "tender document cost"],
                "hindi": ["निविदा शुल्क", "दस्तावेज़ शुल्क", "निविदा दस्तावेज मूल्य"],
                "type": "fee"
            },
            "Bid Submission Start Date": {
                "anchors": ["submission start", "submission opening date", "online submission start", "bid submission date"],
                "hindi": ["बोली जमा करने की प्रारंभिक तिथि", "निविदा जमा करने की तिथि"],
                "type": "date"
            },
            "Bid Submission End Date": {
                "anchors": ["submission end", "submission last date", "submission closing", "last date of bid submission", "submission deadline"],
                "hindi": ["बोली जमा करने की अंतिम तिथि", "निविदा जमा करने की अंतिम तिथि", "जमा करने की अंतिम समय"],
                "type": "date"
            },
            "Bid Opening Date": {
                "anchors": ["opening date", "bid opening", "date of opening", "technical bid opening"],
                "hindi": ["बोली खोलने की तिथि", "तकनीकी बोली खोलने की तिथि"],
                "type": "date"
            },
            "NIT No": {
                "anchors": ["nit no", "nit number", "tender ref", "tender reference", "tender id", "tender number", "bid number"],
                "hindi": ["निविदा संख्या", "एनआईटी संख्या", "निविदा आमंत्रण सूचना संख्या", "संदर्भ संख्या"],
                "type": "nit"
            },
            "Tender Value": {
                "anchors": ["tender value", "estimated cost", "estimated value", "tender cost", "work value", "amount of work", "contract value", "total value", "bid value", "value of work", "work cost", "tender amount"],
                "hindi": ["अनुमानित लागत", "निविदा मूल्य", "अनुमानित दर", "अनुबंध मूल्य"],
                "type": "currency"
            },
            "Organisation": {
                "anchors": ["ministry", "department", "corporation", "office of", "authority", "division", "board"],
                "hindi": ["विभाग", "मंत्रालय", "निगम", "कार्यालय"],
                "type": "org"
            },
            "Pre-Bid Meeting Date": {
                "anchors": ["pre-bid meeting", "prebid meeting", "pre-bid date", "meeting date", "pre bid conference"],
                "hindi": ["प्री-बिड बैठक", "निविदा पूर्व बैठक"],
                "type": "date"
            },
            "Bid Validity Period": {
                "anchors": ["validity period", "bid validity", "validity of bid", "offer validity"],
                "hindi": ["बोली वैधता अवधि", "वैधता"],
                "type": "validity"
            },
            "Period of Work": {
                "anchors": ["period of work", "completion period", "contract period", "delivery period", "completion time"],
                "hindi": ["कार्य की अवधि", "समाप्ति अवधि", "कार्य अवधि"],
                "type": "period"
            },
            
            # New Target Fields
            "bid_number": {
                "anchors": ["bid number", "bid no", "gem bid number", "gem bid no", "tender number", "tender no", "bid ref", "tender ref", "boli number", "boli no"],
                "hindi": ["बोली क्रमांक", "बोली संख्या", "निविदा संख्या"],
                "type": "nit"
            },
            "tender_date": {
                "anchors": ["bid date", "tender date", "date of bid", "date of tender", "published date", "nit date", "gem bid date", "bid start date"],
                "hindi": ["बोली दिनांक", "निविदा दिनांक", "प्रकाशन तिथि", "आरंभ तिथि"],
                "type": "date"
            },
            "bid_end_datetime": {
                "anchors": ["bid end date/time", "bid submission end", "submission end", "closing date", "last date of submission", "bid end", "submission closing", "submission deadline", "bid end date"],
                "hindi": ["बोली समाप्ति", "बोली जमा करने की अंतिम तिथि", "समाप्ति दिनांक", "जमा करने का अंतिम समय"],
                "type": "datetime"
            },
            "bid_open_datetime": {
                "anchors": ["bid opening date/time", "bid opening date", "opening date", "technical bid opening", "date of opening", "bid opening", "opening time"],
                "hindi": ["बोली खोले जाने", "बोली खोलने की तिथि", "खोलने की तिथि"],
                "type": "datetime"
            },
            "ministry_name": {
                "anchors": ["ministry name", "ministry of", "ministry:"],
                "hindi": ["मंत्रालय का नाम", "मंत्रालय"],
                "type": "org"
            },
            "department_name": {
                "anchors": ["department name", "department of", "department:"],
                "hindi": ["विभाग का नाम", "विभाग"],
                "type": "org"
            },
            "organisation_name": {
                "anchors": ["organisation name", "organization name", "organisation of", "organization of", "organisation:", "organization:", "authority"],
                "hindi": ["संगठन का नाम", "संगठन", "संस्था"],
                "type": "org"
            },
            "office_name": {
                "anchors": ["office name", "office:", "office of"],
                "hindi": ["कार्यालय का नाम", "कार्यालय"],
                "type": "org"
            },
            "buyer_email": {
                "anchors": ["buyer email", "email id", "email address", "email:", "consignee email", "contact email"],
                "hindi": ["ईमेल", "खरीदार का ईमेल"],
                "type": "email"
            },
            "item_category": {
                "anchors": ["item category", "category:", "product category", "primary product category", "major category", "service category"],
                "hindi": ["मद श्रेणी", "सामग्री श्रेणी", "उत्पाद श्रेणी"],
                "type": "text"
            },
            "similar_category": {
                "anchors": ["similar category", "similar product category", "equivalent category", "similar item category"],
                "hindi": ["समान श्रेणी", "समान उत्पाद श्रेणी"],
                "type": "text"
            },
            "contract_period": {
                "anchors": ["contract period", "period of work", "completion period", "delivery period", "duration of contract", "period of contract"],
                "hindi": ["कार्य की अवधि", "समाप्ति अवधि", "अनुबंध अवधि"],
                "type": "period"
            },
            "minimum_average_annual_turnover": {
                "anchors": [
                    "minimum average annual turnover", 
                    "average annual turnover", 
                    "annual average turnover", 
                    "annual average financial turnover", 
                    "average annual financial turnover", 
                    "average financial turnover", 
                    "annual financial turnover", 
                    "financial turnover of", 
                    "turnover of the bidder", 
                    "bidder turnover", 
                    "annual turnover", 
                    "financial turnover",
                    "turnover criteria",
                    "turnover requirement"
                ],
                "hindi": ["न्यूनतम औसत वार्षिक टर्नओवर", "वार्षिक टर्नओवर", "औसत वार्षिक वित्तीय टर्नओवर"],
                "type": "currency"
            },
            "years_of_past_experience": {
                "anchors": [
                    "years of past experience", 
                    "past experience", 
                    "experience criteria", 
                    "bidder experience", 
                    "years of experience",
                    "minimum experience (years)",
                    "past experience of",
                    "experience of having successfully",
                    "experience in similar works",
                    "similar works experience",
                    "experience period",
                    "technical eligibility criteria",
                    "experience requirement"
                ],
                "hindi": ["अनुभाव", "पूर्व अनुभव", "कार्य अनुभव"],
                "type": "experience"
            },
            "past_experience_required": {
                "anchors": ["past experience required", "past performance", "experience required", "performance required", "past experience required?"],
                "hindi": ["पूर्व प्रदर्शन", "पूर्व अनुभव आवश्यक"],
                "type": "yes_no"
            },

            # GeM Parent Tender Stage 1 Map Fields
            "tender_id": {
                "anchors": ["Bid Number"],
                "hindi": ["बोली संख्या"],
                "type": "nit"
            },
            "bid_published_date": {
                "anchors": ["Dated"],
                "hindi": ["दिनांक"],
                "type": "date"
            },
            "ministry_state_name": {
                "anchors": ["Ministry/State Name", "Ministry Name"],
                "hindi": ["मंत्रालय/राज्य नाम"],
                "type": "org"
            },
            "total_quantity": {
                "anchors": ["Total Quantity"],
                "hindi": ["कुल मात्रा"],
                "type": "integer"
            },
            "bid_opening_datetime": {
                "anchors": ["Bid Opening Date/Time"],
                "hindi": ["बोली खोले जाने का समय"],
                "type": "datetime"
            },
            "bid_validity_days": {
                "anchors": ["Bid Offer Validity", "Bid Offer Validity (From publish date)"],
                "hindi": ["बोली वैधता"],
                "type": "validity"
            },
            "auto_extension_days": {
                "anchors": ["Number of days for which Bid would be auto-extended"],
                "hindi": [],
                "type": "integer"
            },
            "auto_extension_max_count": {
                "anchors": ["Number of Auto Extension count"],
                "hindi": [],
                "type": "integer"
            },
            "min_bids_to_disable_auto_extension": {
                "anchors": ["Minimum number of bids required to disable automatic bid extension"],
                "hindi": [],
                "type": "integer"
            },
            "pre_bid_meeting": {
                "anchors": ["Pre-Bid Date and Time", "Pre-Bid Venue"],
                "hindi": [],
                "type": "text"
            },
            "emd_by_schedule": {
                "anchors": ["Schedule 1 EMD Amount", "Schedule 2 EMD Amount", "EMD Amount"],
                "hindi": [],
                "type": "emd_by_schedule"
            },
            "emd_advisory_bank": {
                "anchors": ["Advisory Bank"],
                "hindi": [],
                "type": "text"
            },
            "pbg_percentage": {
                "anchors": [
                    "ePBG Percentage(%)", 
                    "ePBG Percentage",
                    "Performance Security",
                    "Performance Guarantee",
                    "Performance Bank Guarantee",
                    "Contract Performance Security",
                    "Performance Security Deposit",
                    "Security Deposit Percentage",
                    "Percentage of Contract Value as Security",
                    "PBG Percentage",
                    "Performance Security @",
                    "PBG @"
                ],
                "hindi": ["प्रदर्शन प्रतिभूति", "कार्य निष्पादन बैंक गारंटी"],
                "type": "percentage"
            },
            "pbg_duration_months": {
                "anchors": ["Duration of ePBG required (Months)"],
                "hindi": [],
                "type": "integer"
            },
            "pbg_advisory_bank": {
                "anchors": ["Advisory Bank"],
                "hindi": [],
                "type": "text"
            },
            "beneficiary_name": {
                "anchors": ["Beneficiary"],
                "hindi": [],
                "type": "text"
            },
            "evaluation_method": {
                "anchors": ["Evaluation Method"],
                "hindi": [],
                "type": "text"
            },
            "reverse_auction_enabled": {
                "anchors": ["Bid to RA enabled"],
                "hindi": [],
                "type": "yes_no"
            },
            "bid_type": {
                "anchors": ["Type of Bid"],
                "hindi": [],
                "type": "text"
            },
            "inspection_required": {
                "anchors": ["Inspection Required"],
                "hindi": [],
                "type": "yes_no"
            },
            "arbitration_clause": {
                "anchors": ["Arbitration Clause"],
                "hindi": [],
                "type": "yes_no"
            },
            "mediation_clause": {
                "anchors": ["Mediation Clause"],
                "hindi": [],
                "type": "yes_no"
            },
            "mse_relaxation_experience_turnover": {
                "anchors": ["MSE Relaxation for Years of Experience and Turnover", "Relaxation for Years of Experience and Turnover"],
                "hindi": [],
                "type": "yes_no"
            },
            "startup_relaxation_experience_turnover": {
                "anchors": ["Startup Relaxation for Years Of Experience and Turnover"],
                "hindi": [],
                "type": "text"
            },
            "mse_purchase_preference": {
                "anchors": ["MSE Purchase Preference"],
                "hindi": [],
                "type": "yes_no"
            },
            "mse_preference_price_band_percent": {
                "anchors": ["Purchase Preference to MSE OEMs available upto price within L1+X%"],
                "hindi": [],
                "type": "currency"
            },
            "mse_preference_max_qty_percent": {
                "anchors": ["Maximum Percentage of Bid quantity for MSE purchase preference"],
                "hindi": [],
                "type": "currency"
            },
            "mii_purchase_preference": {
                "anchors": ["MII Purchase Preference"],
                "hindi": [],
                "type": "yes_no"
            },
            "mii_non_applicability_reason": {
                "anchors": ["Brief Description of the Approval Granted by Competent Authority"],
                "hindi": [],
                "type": "text"
            },
            "required_documents": {
                "anchors": ["Document required from seller"],
                "hindi": [],
                "type": "text"
            },
            "schedules": {
                "anchors": [],
                "hindi": [],
                "type": "schedules"
            },
            "atc_document_link_present": {
                "anchors": ["Buyer uploaded ATC document"],
                "hindi": [],
                "type": "yes_no"
            },
            "land_border_clause_present": {
                "anchors": ["Restrictions on procurement from a bidder of a country which shares a land border with India"],
                "hindi": [],
                "type": "yes_no"
            },
            "payment_terms_supply_percent": {
                "anchors": ["PAYMENT TERMS", "Payment Terms", "Terms of Payment", "For Supply Portion"],
                "hindi": ["भुगतान की शर्तें"],
                "type": "text"
            },
            "payment_terms_installation_percent": {
                "anchors": ["balance", "successful installation", "installation & commissioning", "Payment Terms Installation"],
                "hindi": [],
                "type": "text"
            },
            "maf_required": {
                "anchors": ["Manufacturer Authorization Form", "MAF Required", "Authorized Partner/ Distributor/ Dealer"],
                "hindi": [],
                "type": "yes_no"
            },
            "prs_ld": {
                "anchors": ["PRICE REDUCTION SCHEDULE", "Price Reduction Schedule", "PRS", "Price Reduction"],
                "hindi": ["मूल्य कटौती अनुसूची"],
                "type": "text"
            },
            "client_contact_person": {
                "anchors": ["CONTACT DETAILS OF TENDER DEALING OFFICER", "Kind Attn:", "Nodal Officer", "Contact Officer", "TENDER DEALING OFFICER"],
                "hindi": ["संपर्क अधिकारी"],
                "type": "text"
            },
            "full_courier_address_with_pincode": {
                "anchors": ["DEALING GAIL'S OFFICE ADDRESS", "GAIL Bhawan", "OFFICE ADDRESS", "Communication Address"],
                "hindi": ["कार्यालय पता"],
                "type": "text"
            },
            "eligibility_executed_value": {
                "anchors": ["Required Minimum executed Value", "executed Value"],
                "hindi": [],
                "type": "text"
            },
            "financial_avg_turnover": {
                "anchors": ["Required Minimum Turnover"],
                "hindi": [],
                "type": "text"
            },
            "financial_net_worth": {
                "anchors": ["Positive for preceding financial year", "- do -"],
                "hindi": [],
                "type": "text"
            },
            "financial_working_capital": {
                "anchors": ["Required Minimum Working Capital"],
                "hindi": [],
                "type": "text"
            },
            "nodal_officer_contact": {
                "anchors": ["Name and contact details of nodal officer"],
                "hindi": [],
                "type": "text"
            }
        }

        # Widen (never narrow) specific rules' anchors with any synonyms the
        # shared field registry knows about but this rule doesn't yet. This
        # is how keyword fixes made for the other (plain-text) extraction
        # engine also reach this engine, without touching this engine's own
        # matching/confidence logic. Rules that already show anchor-overlap
        # precision issues (e.g. "ministry_name" matching inside its own
        # value) are intentionally left out of this merge to avoid making
        # that pre-existing issue worse.
        _REGISTRY_MERGE_MAP = {
            "NIT No": "reference_id",
            "bid_number": "reference_id",
            "EMD": "emd_amount",
            "Tender Fee": "tender_fee",
            "Bid Submission End Date": "bid_submission_deadline",
            "bid_end_datetime": "bid_submission_deadline",
            "Bid Opening Date": "bid_opening_date",
            "bid_open_datetime": "bid_opening_date",
            "Tender Value": "tender_value",
            "Pre-Bid Meeting Date": "prebid_meeting",
            "minimum_average_annual_turnover": "turnover_requirement",
            "years_of_past_experience": "experience_requirement",
            "item_category": "title",
            "buyer_email": "contact_officer",
        }
        for rule_key, canonical_key in _REGISTRY_MERGE_MAP.items():
            if rule_key in self.rules:
                self.rules[rule_key]["anchors"] = merge_keywords(self.rules[rule_key]["anchors"], canonical_key)

    def _normalize_for_match(self, text: str) -> str:
        """Replace common separators with spaces and collapse whitespace for
        fuzzy anchor matching. This lets "ministry/state name" match the
        anchor "ministry name" without collapsing numbers/words into false
        substring matches (e.g. "06-06-2025" stays "06 06 2025")."""
        return re.sub(r"\s+", " ", re.sub(r"[/\\_.:\-]", " ", text.lower())).strip()

    def _anchor_matches(self, anchor: str, text: str, max_gap: int = 1) -> bool:
        """Check if the anchor words appear in order inside the text words,
        allowing small gaps (at most max_gap words between consecutive anchor words).
        This prevents broad multi-column matching like "emd" ... "value" across table headers."""
        anchor_words = self._normalize_for_match(anchor).split()
        text_words = self._normalize_for_match(text).split()
        if not anchor_words:
            return False
        for start_idx in range(len(text_words)):
            if text_words[start_idx] == anchor_words[0]:
                curr_idx = start_idx
                matched_all = True
                for aw in anchor_words[1:]:
                    found = False
                    for step in range(1, max_gap + 2):
                        next_idx = curr_idx + step
                        if next_idx < len(text_words) and text_words[next_idx] == aw:
                            curr_idx = next_idx
                            found = True
                            break
                    if not found:
                        matched_all = False
                        break
                if matched_all:
                    return True
        return False

    def _anchor_at_start_or_short(self, anchor: str, text: str) -> bool:
        """True if the anchor is at the very start of the text or the text is
        a short label. Used in the general block scan to avoid matching broad
        anchors inside paragraphs (e.g. "office of" inside a long clause)."""
        if not self._anchor_matches(anchor, text):
            return False
        if len(text.strip()) < 50:
            return True
        text_norm = self._normalize_for_match(text)
        anchor_norm = self._normalize_for_match(anchor)
        if text_norm.startswith(anchor_norm):
            return True
        # Strip common bidding clause lead-ins (e.g. 'Should have...', 'Bidder must have...', 'Shall have minimum...')
        text_clean_lead = re.sub(
            r'^(?:(?:the\s+)?(?:bidder|agency|contractor|tenderer|firm|applicant)\s+)?(?:should|must|shall|is\s+required\s+to|have\s+to)\s+(?:have|possess|submit|demonstrate|achieve)\s+(?:a\s+|an\s+|minimum\s+)?',
            '',
            text_norm
        )
        return text_clean_lead.startswith(anchor_norm)


    def _strip_noise_words(self, text: str) -> str:
        """Remove leading OCR/Hindi noise tokens from a merged label/value suffix.
        Keeps all-uppercase acronyms and words that contain a lowercase vowel."""
        words = text.split()
        for i, word in enumerate(words):
            if len(word) >= 2 and word.isupper():
                return " ".join(words[i:])
            if any(v in word for v in "aeiouy"):
                return " ".join(words[i:])
        return ""

    def _extract_suffix_after_anchor(self, text: str, anchors: List[str]) -> Optional[str]:
        """When an anchor and its value live in the same text block (common in
        GeM tables where OCR merges a label and value), return the text that
        follows the matched anchor, stripping trailing Hindi/gibberish."""
        best_suffix = None
        best_pos = -1
        for anchor in anchors:
            if not self._anchor_matches(anchor, text):
                continue
            anchor_words = self._normalize_for_match(anchor).split()
            if not anchor_words:
                continue
            # Match the anchor words in the original text, allowing flexible
            # separators (slashes, spaces, Hindi characters) between them.
            parts = [re.escape(w) for w in anchor_words]
            pattern = re.compile(r"(?:\W|\s)*".join(parts), re.IGNORECASE)
            m = pattern.search(text)
            if m and m.end() > best_pos:
                best_pos = m.end()
                best_suffix = text[m.end():]
        if best_suffix:
            # Strip leading label noise (hindi words, slashes, colons, short mixed-case tokens)
            best_suffix = re.sub(r"^[^a-zA-Z0-9\s]+", "", best_suffix)          # leading non-alphanumeric
            best_suffix = re.sub(r"^(\b\w{1,3}\b\s*)+", "", best_suffix)      # leading very short words
            # mixed-case transliterations starting with uppercase (FeadY, Avft)
            best_suffix = re.sub(r"^(\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\b\s*)+", "", best_suffix)
            best_suffix = self._strip_noise_words(best_suffix)
            best_suffix = re.sub(r"^[/\\_.:\-]+\s*", "", best_suffix)
            best_suffix = best_suffix.strip()
        return best_suffix if best_suffix else None

    def _match_value_pattern(self, text: str, field_type: str) -> Optional[str]:
        """Verify if text matches the expected pattern for field_type and return matched string."""
        text_clean = text.strip()
        if not text_clean:
            return None
            
        if field_type == "date":
            m = self.date_regex.search(text_clean)
            return m.group(0) if m else None
        elif field_type == "datetime":
            m = re.search(r'\b\d{2}[-/\.]\d{2}[-/\.]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b', text_clean)
            return m.group(0) if m else None
        elif field_type == "email":
            m = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text_clean)
            return m.group(0) if m else None
        elif field_type == "currency":
            m = self.currency_regex.search(text_clean)
            val = None
            if m:
                val = m.group(0)
            else:
                m = re.search(r'\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:Lakh|Crore|Lacs|Cr|/-)?\b', text_clean, re.IGNORECASE)
                if m:
                    val = m.group(0)
            if val:
                indicators = [r'\brs\b', r'₹', r'\blakh\b', r'\bcrore\b', r'\blac\b', r'\bcr\b', r'/-', r'\brupee\b']
                has_currency_indicator = any(re.search(pat, text_clean, re.IGNORECASE) for pat in indicators)
                if not has_currency_indicator:
                    try:
                        clean_num = re.sub(r'[^\d.]', '', val)
                        if clean_num and float(clean_num) < 100:
                            return None
                    except ValueError:
                        pass
                return val
            return None
        elif field_type == "fee":
            if any(w in text_clean.lower() for w in ["nil", "free", "exempted", "no fee", "निःशुल्क"]):
                return "Nil / Exempted"
            m = self.currency_regex.search(text_clean)
            val = m.group(0) if m else None
            if val:
                indicators = [r'\brs\b', r'₹', r'\blakh\b', r'\bcrore\b', r'\blac\b', r'\bcr\b', r'/-', r'\brupee\b']
                has_currency_indicator = any(re.search(pat, text_clean, re.IGNORECASE) for pat in indicators)
                if not has_currency_indicator:
                    try:
                        clean_num = re.sub(r'[^\d.]', '', val)
                        if clean_num and float(clean_num) < 100:
                            return None
                    except ValueError:
                        pass
                return val
            return None
        elif field_type == "nit":
            m = self.nit_regex.search(text_clean)
            if m:
                return m.group(1) if m.group(1) is not None else m.group(0)
            return None
        elif field_type == "validity":
            m = self.validity_regex.search(text_clean)
            return m.group(0) if m else None
        elif field_type == "period":
            m = self.period_regex.search(text_clean)
            return m.group(0) if m else None
        elif field_type == "experience":
            m = re.search(r'\b\d+\s*(?:year|years|yr|yrs|साल|वर्ष)\b', text_clean, re.IGNORECASE)
            return m.group(0) if m else None
        elif field_type == "yes_no":
            m = re.search(r'\b(?:yes|no|required|not required|हाँ|नहीं)\b', text_clean, re.IGNORECASE)
            return m.group(0) if m else None
        elif field_type == "percentage":
            # Match decimal values optionally followed by %
            m = re.search(r'\b\d+(?:\.\d+)?\s*%?\b', text_clean)
            if m:
                val = m.group(0)
                try:
                    clean_num = re.sub(r'[^\d.]', '', val)
                    if clean_num and float(clean_num) <= 100:
                        return val
                except ValueError:
                    pass
            return None
        elif field_type == "org":
            words = text_clean.strip()
            if len(words) > 3 and len(words) < 150:
                if not words.lower().startswith(("bid document", "bid details", "boli vivran")):
                    return words
            return None
        elif field_type == "text":
            cleaned = text_clean.strip()
            if len(cleaned) > 2 and len(cleaned) < 150:
                if not cleaned.lower().startswith(("bid document", "bid details", "boli vivran")):
                    return cleaned
            return None
        elif field_type == "integer":
            m = re.search(r'\b\d+\b', text_clean)
            return m.group(0) if m else None
        return None

    def extract_products(self, pages: List[PageResult]) -> List[Dict[str, Any]]:
        """
        Heuristic product / service line-item extraction for Indian tender docs.
        Scans OCR text for keywords aligned to Volks Energie's typical scope
        (batteries, ACs, UPS/inverters, electrical accessories, cables, panels,
        solar, HVAC, installation / maintenance). Returns structured product
        candidates with quantity, unit, and page evidence where detectable.
        """
        category_keywords = {
            "battery": ["battery", "batteries", "battery pack", "battery set", "battery unit"],
            "air_conditioner": ["air conditioner", "air conditioning", "split ac", "window ac", "cassette ac", "air cooled"],
            "ups": ["ups", "uninterruptible power supply", "online ups", "line interactive ups"],
            "inverter": ["inverter", "solar inverter", "grid tie inverter", "off-grid inverter"],
            "solar": ["solar panel", "solar module", "pv module", "solar cell", "solar power", "solar system"],
            "cable": ["cable", "cables", "wire", "wires", "power cable", "control cable", "lt cable"],
            "panel": ["distribution panel", "db panel", "switchgear panel", "control panel", "mcc panel", "panel board"],
            "transformer": ["transformer", "distribution transformer", "power transformer"],
            "stabilizer": ["stabilizer", "voltage stabilizer", "avr", "automatic voltage regulator"],
            "hvac": ["hvac", "ventilation", "duct", "air handling unit", "ahu", "cooling"],
            "electrical_accessory": ["switch", "socket", "mcb", "mccb", "rccb", "contactor", "relay", "fuse", "breaker", "distribution board", "db"],
            "maintenance_service": ["amc", "annual maintenance", "maintenance contract", "preventive maintenance", "maintenance service"],
            "installation_service": ["installation", "commissioning", "erection", "supply and installation", "supply & installation"],
            "civil_work": ["civil work", "civil works", "construction", "foundation", "shed", "room"],
        }

        products: List[Dict[str, Any]] = []
        seen: set = set()

        for page in pages:
            page_num = page.page_number
            for block in page.text_blocks:
                text = block.text
                text_lower = text.lower()
                if len(text.strip()) < 4:
                    continue
                for category, keywords in category_keywords.items():
                    if not any(re.search(rf'(?<!\w){re.escape(kw)}(?!\w)', text_lower) for kw in keywords):
                        continue
                    qty = None
                    unit = None
                    qty_match = re.search(
                        r'\b(\d+(?:\.\d+)?)\s*(?:nos|no|units|unit|sets|set|pcs|pieces|pairs|kg|m|mtr|meter|meters|sqm|each|lot|ea)\b',
                        text, re.IGNORECASE
                    )
                    if qty_match:
                        qty = qty_match.group(1)
                        tail = text[qty_match.end():].strip()[:20].lower()
                        unit_match = re.search(r'\b(?:nos|no|units|unit|sets|set|pcs|pieces|pairs|kg|m|mtr|meter|meters|sqm|each|lot|ea)\b', tail)
                        if unit_match:
                            unit = unit_match.group(0)

                    brand_match = re.search(r'\b(?:oem|make|brand|mfg|manufacturer)[:\s]+([A-Za-z][A-Za-z0-9\s&\-]{2,30})', text, re.IGNORECASE)
                    brand = brand_match.group(1).strip() if brand_match else None

                    key = (category, text[:80].strip().lower())
                    if key in seen:
                        continue
                    seen.add(key)

                    products.append({
                        "product_name": category.replace("_", " ").title(),
                        "normalized_category": category,
                        "raw_text": text,
                        "quantity": qty,
                        "unit": unit,
                        "technical_specification": text,
                        "brand_or_oem_if_present": brand,
                        "page_number": page_num,
                        "confidence": round(0.6 + min(0.35, len([k for k in keywords if re.search(rf'(?<!\w){re.escape(k)}(?!\w)', text_lower)]) * 0.05), 2),
                        "evidence_text": text,
                    })
                    break

        return products

    def extract_fields(self, pages: List[PageResult], doc_source: str = "main_tender") -> List[ExtractedFieldSchema]:
        extracted = []
        scan_pages = pages[:50] if len(pages) > 50 else pages
        print(f"\n[FIELD_EXTRACTOR_DEBUG] Starting field extraction on {len(scan_pages)}/{len(pages)} page(s) (doc_source: '{doc_source}').", flush=True)
        
        for field_name, rule in self.rules.items():
            # 1. Custom Multi-Instance Field Processing
            if field_name == "emd_by_schedule":
                emd_dict = {}
                source_blocks = []
                evidence_parts = []
                for page in scan_pages:
                    for block in page.text_blocks:

                        m_sch = re.search(r"Schedule\s*(\d+)\s*EMD\s*Amount", block.text, re.IGNORECASE)
                        if m_sch:
                            sch_num = int(m_sch.group(1))
                            val_str = self._extract_suffix_after_anchor(block.text, [m_sch.group(0)])
                            val = None
                            if val_str:
                                val = self._match_value_pattern(val_str, "currency")
                            if not val:
                                try:
                                    idx = page.text_blocks.index(block)
                                    if idx + 1 < len(page.text_blocks):
                                        val = self._match_value_pattern(page.text_blocks[idx+1].text, "currency")
                                except ValueError:
                                    pass
                            if val:
                                clean_val = re.sub(r"[^\d.]", "", val)
                                if clean_val:
                                    try:
                                        emd_dict[sch_num] = float(clean_val)
                                        evidence_parts.append(f"Schedule {sch_num}: {clean_val}")
                                        source_blocks.append(SourceBlockRef(
                                            page_number=page.page_number,
                                            block_id=block.block_id,
                                            text=block.text,
                                            bounding_box=BoundingBox(**block.bounding_box)
                                        ))
                                    except ValueError:
                                        pass
                
                # Also search table rows for Schedule N EMD Amount
                for page in scan_pages:
                    table_regions = [r for r in page.layout_regions if r.region_type.lower() == "table"]
                    for table in table_regions:
                        table_blocks = [b for b in page.text_blocks if is_contained(b.bounding_box, table.bounding_box)]
                        if not table_blocks:
                            continue
                        rows = group_blocks_into_rows(table_blocks)
                        for row in rows:
                            row_text = " ".join(b.text for b in row)
                            m_sch = re.search(r"Schedule\s*(\d+)\s*EMD\s*Amount", row_text, re.IGNORECASE)
                            if m_sch:
                                sch_num = int(m_sch.group(1))
                                if sch_num not in emd_dict:
                                    for cell in row:
                                        val = self._match_value_pattern(cell.text, "currency")
                                        if val:
                                            clean_val = re.sub(r"[^\d.]", "", val)
                                            if clean_val:
                                                try:
                                                    emd_dict[sch_num] = float(clean_val)
                                                    evidence_parts.append(f"Schedule {sch_num}: {clean_val}")
                                                    source_blocks.append(SourceBlockRef(
                                                        page_number=page.page_number,
                                                        block_id=cell.block_id,
                                                        text=cell.text,
                                                        bounding_box=BoundingBox(**cell.bounding_box)
                                                    ))
                                                    break
                                                except ValueError:
                                                    pass

                if emd_dict:
                    val_repr = str(dict(sorted(emd_dict.items())))
                    extracted.append(ExtractedFieldSchema(
                        field_name="emd_by_schedule",
                        value=val_repr,
                        confidence=0.9,
                        source_page=1,
                        evidence=" | ".join(evidence_parts),
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "emd_by_schedule" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="emd_by_schedule",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No schedule EMD amounts found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "schedules":
                schedules_data = {}
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    regions = page.layout_regions
                    
                    table_regions = [r for r in regions if r.region_type.lower() == "table"]
                    for table in table_regions:
                        table_blocks = [b for b in blocks if is_contained(b.bounding_box, table.bounding_box)]
                        if not table_blocks:
                            continue
                        
                        rows = group_blocks_into_rows(table_blocks)
                        col_indices = {}
                        
                        header_row_idx = -1
                        for idx, row in enumerate(rows):
                            row_texts = [b.text.lower() for b in row]
                            has_consignee = any("consignee" in txt or "reporting" in txt or "officer" in txt for txt in row_texts)
                            has_qty = any("quantity" in txt or "मात्रा" in txt for txt in row_texts)
                            has_days = any("delivery" in txt or "days" in txt for txt in row_texts)
                            
                            if has_consignee and (has_qty or has_days):
                                header_row_idx = idx
                                for col_idx, block in enumerate(row):
                                    txt = block.text.lower()
                                    if "consignee" in txt or "reporting" in txt or "officer" in txt:
                                        col_indices["consignee_name"] = col_idx
                                    elif "address" in txt or "पता" in txt:
                                        col_indices["consignee_address"] = col_idx
                                    elif "quantity" in txt or "मात्रा" in txt:
                                        col_indices["quantity"] = col_idx
                                    elif "delivery" in txt or "days" in txt:
                                        col_indices["delivery_days"] = col_idx
                                break
                        
                        if header_row_idx != -1 and col_indices:
                            schedule_num = 1
                            table_bbox = table.bounding_box
                            # Search back for Schedule N
                            for block in sorted(blocks, key=lambda b: b.bounding_box["y1"], reverse=True):
                                if block.bounding_box["y2"] < table_bbox["y1"]:
                                    m_sch = re.search(r"Schedule\s*(\d+)", block.text, re.IGNORECASE)
                                    if m_sch:
                                        schedule_num = int(m_sch.group(1))
                                        break
                            
                            for row in rows[header_row_idx + 1:]:
                                if len(row) < len(col_indices) - 1:
                                    continue
                                if any("total" in b.text.lower() or "योग" in b.text.lower() for b in row):
                                    continue
                                
                                entry = {
                                    "schedule_number": schedule_num,
                                    "consignee_name": "Not Found",
                                    "consignee_address": "Not Found",
                                    "quantity": "Not Found",
                                    "delivery_days": "Not Found",
                                    "item_description": "Not Found",
                                    "technical_specs": "Not Found"
                                }
                                
                                for field, col_idx in col_indices.items():
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
                                
                                desc = "Not Found"
                                specs = {}
                                for block in blocks:
                                    if block.bounding_box["y2"] < table_bbox["y1"]:
                                        if any(k in block.text.lower() for k in ["nominal battery voltage", "battery capacity", "specification", "voltage"]):
                                            parts = block.text.split(":")
                                            if len(parts) == 2:
                                                specs[parts[0].strip()] = parts[1].strip()
                                        if "pieces" in block.text or "quantity" in block.text.lower() or "schedule" in block.text.lower():
                                            desc = block.text.strip()
                                
                                entry["item_description"] = desc
                                if specs:
                                    entry["technical_specs"] = str(specs)
                                
                                schedules_data.setdefault(schedule_num, []).append(entry)
                
                if schedules_data:
                    flat_schedules = []
                    for sch_num, entries in sorted(schedules_data.items()):
                        flat_schedules.extend(entries)
                    val_repr = str(flat_schedules)
                    extracted.append(ExtractedFieldSchema(
                        field_name="schedules",
                        value=val_repr,
                        confidence=0.9,
                        source_page=1,
                        evidence=f"Extracted {len(flat_schedules)} schedules/consignees.",
                        source_blocks=[],
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "schedules" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="schedules",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No schedules found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "eligibility_executed_value":
                extracted_val = None
                source_blocks = []
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    regions = page.layout_regions
                    table_regions = [r for r in regions if r.region_type.lower() == "table"]
                    for table in table_regions:
                        table_blocks = [b for b in blocks if is_contained(b.bounding_box, table.bounding_box)]
                        if not table_blocks:
                            continue
                        table_blocks.sort(key=lambda b: (round(b.bounding_box["y1"] / 10) * 10, b.bounding_box["x1"]))
                        table_text = " ".join([b.text.strip() for b in table_blocks])
                        clause_ctx = None
                        table_bbox = table.bounding_box
                        blocks_above = [b for b in blocks if b.bounding_box["y2"] < table_bbox["y1"]]
                        blocks_above.sort(key=lambda b: table_bbox["y1"] - b.bounding_box["y2"])
                        for b in blocks_above:
                            m = re.search(r'\b(1\.2|2\.1|2\.3|2\.2)\b', b.text)
                            if m:
                                clause_ctx = m.group(1)
                                break
                        if clause_ctx == "1.2" or (clause_ctx is None and "executed" in table_text.lower() and "value" in table_text.lower()):
                            matches = re.findall(r"(Part\s*(?:-?\s*\d+|1\s*&\s*2)[\s\S]*?[\d\.]+\s*(?:Lakh|Crore|Cr))", table_text, re.IGNORECASE)
                            if matches:
                                extracted_val = "; ".join([m.strip() for m in matches])
                                source_blocks.extend([SourceBlockRef(page_number=page_num, block_id=b.block_id, text=b.text, bounding_box=BoundingBox(**b.bounding_box)) for b in table_blocks])
                                break
                if extracted_val:
                    extracted.append(ExtractedFieldSchema(
                        field_name="eligibility_executed_value",
                        value=extracted_val,
                        confidence=0.95,
                        source_page=1,
                        evidence=f"Extracted Clause 1.2 table rows: {extracted_val}",
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "eligibility_executed_value" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="eligibility_executed_value",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No technical eligibility executed value table found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "financial_avg_turnover":
                extracted_val = None
                source_blocks = []
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    regions = page.layout_regions
                    table_regions = [r for r in regions if r.region_type.lower() == "table"]
                    for table in table_regions:
                        table_blocks = [b for b in blocks if is_contained(b.bounding_box, table.bounding_box)]
                        if not table_blocks:
                            continue
                        table_blocks.sort(key=lambda b: (round(b.bounding_box["y1"] / 10) * 10, b.bounding_box["x1"]))
                        table_text = " ".join([b.text.strip() for b in table_blocks])
                        clause_ctx = None
                        table_bbox = table.bounding_box
                        blocks_above = [b for b in blocks if b.bounding_box["y2"] < table_bbox["y1"]]
                        blocks_above.sort(key=lambda b: table_bbox["y1"] - b.bounding_box["y2"])
                        for b in blocks_above:
                            m = re.search(r'\b(1\.2|2\.1|2\.3|2\.2)\b', b.text)
                            if m:
                                clause_ctx = m.group(1)
                                break
                        if clause_ctx == "2.1" or (clause_ctx is None and "turnover" in table_text.lower()):
                            matches = re.findall(r"(Part\s*(?:-?\s*\d+|1\s*&\s*2)[\s\S]*?[\d\.]+\s*(?:Lakh|Crore|Cr))", table_text, re.IGNORECASE)
                            if matches:
                                extracted_val = "; ".join([m.strip() for m in matches])
                                source_blocks.extend([SourceBlockRef(page_number=page_num, block_id=b.block_id, text=b.text, bounding_box=BoundingBox(**b.bounding_box)) for b in table_blocks])
                                break
                if extracted_val:
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_avg_turnover",
                        value=extracted_val,
                        confidence=0.95,
                        source_page=1,
                        evidence=f"Extracted Clause 2.1 table rows: {extracted_val}",
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "financial_avg_turnover" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_avg_turnover",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No financial average annual turnover table found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "financial_net_worth":
                extracted_val = None
                source_blocks = []
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    for idx, block in enumerate(blocks):
                        text_lower = block.text.lower()
                        if "2.2" in text_lower and "net" in text_lower and "worth" in text_lower:
                            val_str = block.text.strip()
                            m_prefix = re.search(r"2\.2\s*net\s*worth\s*[:\-]?\s*", val_str, re.IGNORECASE)
                            if m_prefix:
                                val_str = val_str[m_prefix.end():].strip()
                            nxt_texts = []
                            for other in blocks[idx+1:idx+4]:
                                if abs(other.bounding_box["y1"] - block.bounding_box["y1"]) < 50 or "do" in other.text.lower():
                                    nxt_texts.append(other.text.strip())
                            if nxt_texts:
                                val_str += " | " + " | ".join(nxt_texts)
                            extracted_val = val_str
                            source_blocks.append(SourceBlockRef(page_number=page_num, block_id=block.block_id, text=block.text, bounding_box=BoundingBox(**block.bounding_box)))
                            break
                    if extracted_val:
                        break
                if extracted_val:
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_net_worth",
                        value=extracted_val,
                        confidence=0.95,
                        source_page=1,
                        evidence=f"Extracted Clause 2.2 text: {extracted_val}",
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "financial_net_worth" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_net_worth",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No financial net worth clause found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "financial_working_capital":
                extracted_val = None
                source_blocks = []
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    regions = page.layout_regions
                    table_regions = [r for r in regions if r.region_type.lower() == "table"]
                    for table in table_regions:
                        table_blocks = [b for b in blocks if is_contained(b.bounding_box, table.bounding_box)]
                        if not table_blocks:
                            continue
                        table_blocks.sort(key=lambda b: (round(b.bounding_box["y1"] / 10) * 10, b.bounding_box["x1"]))
                        table_text = " ".join([b.text.strip() for b in table_blocks])
                        clause_ctx = None
                        table_bbox = table.bounding_box
                        blocks_above = [b for b in blocks if b.bounding_box["y2"] < table_bbox["y1"]]
                        blocks_above.sort(key=lambda b: table_bbox["y1"] - b.bounding_box["y2"])
                        for b in blocks_above:
                            m = re.search(r'\b(1\.2|2\.1|2\.3|2\.2)\b', b.text)
                            if m:
                                clause_ctx = m.group(1)
                                break
                        if clause_ctx == "2.3" or (clause_ctx is None and "working" in table_text.lower() and "capital" in table_text.lower()):
                            matches = re.findall(r"(Part\s*(?:-?\s*\d+|1\s*&\s*2)[\s\S]*?[\d\.]+\s*(?:Lakh|Crore|Cr))", table_text, re.IGNORECASE)
                            note_text = ""
                            blocks_below = [b for b in blocks if b.bounding_box["y1"] > table_bbox["y2"]]
                            blocks_below.sort(key=lambda b: b.bounding_box["y1"] - table_bbox["y2"])
                            for b in blocks_below[:10]:
                                if "line of credit" in b.text.lower() or "bank" in b.text.lower():
                                    note_text = b.text.strip()
                                    source_blocks.append(SourceBlockRef(page_number=page_num, block_id=b.block_id, text=b.text, bounding_box=BoundingBox(**b.bounding_box)))
                                    break
                            if matches:
                                extracted_val = "; ".join([m.strip() for m in matches])
                                if note_text:
                                    extracted_val += " [Note: " + re.sub(r"\s+", " ", note_text)[:200] + "...]"
                                source_blocks.extend([SourceBlockRef(page_number=page_num, block_id=b.block_id, text=b.text, bounding_box=BoundingBox(**b.bounding_box)) for b in table_blocks])
                                break
                if extracted_val:
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_working_capital",
                        value=extracted_val,
                        confidence=0.95,
                        source_page=1,
                        evidence=f"Extracted Clause 2.3 table rows: {extracted_val}",
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "financial_working_capital" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="financial_working_capital",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No financial working capital table found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            if field_name == "nodal_officer_contact":
                extracted_val = None
                source_blocks = []
                for page in scan_pages:
                    page_num = page.page_number
                    blocks = page.text_blocks
                    for idx, block in enumerate(blocks):
                        text_lower = block.text.lower()
                        if "39.2" in text_lower:
                            window_blocks = blocks[idx:idx+4]
                            window_texts = [b.text.lower() for b in window_blocks]
                            has_nodal = any("nodal" in txt or "contact details of nodal" in txt or "officer" in txt for txt in window_texts)
                            if has_nodal:
                                contact_parts = []
                                for other in blocks[idx+1:idx+6]:
                                    other_text = other.text.strip()
                                    if other_text:
                                        if re.match(r"^(?:40|41|42)\b", other_text):
                                            break
                                        contact_parts.append(other_text)
                                        source_blocks.append(SourceBlockRef(page_number=page_num, block_id=other.block_id, text=other.text, bounding_box=BoundingBox(**other.bounding_box)))
                                if contact_parts:
                                    temp_val = "\n".join(contact_parts)
                                    if "@" in temp_val or any(p in temp_val.lower() for p in ["tel", "phone", "email", "mobile", "contact no"]):
                                        extracted_val = temp_val
                                        source_blocks.append(SourceBlockRef(page_number=page_num, block_id=block.block_id, text=block.text, bounding_box=BoundingBox(**block.bounding_box)))
                                        break
                    if extracted_val:
                        break
                if extracted_val:
                    extracted.append(ExtractedFieldSchema(
                        field_name="nodal_officer_contact",
                        value=extracted_val,
                        confidence=0.95,
                        source_page=1,
                        evidence=f"Extracted Clause 39.2 block: {extracted_val}",
                        source_blocks=source_blocks,
                        source=doc_source
                    ))
                else:
                    default_val = "Out of Scope (Stage 1)" if "nodal_officer_contact" in self.out_of_scope_stage1 else "Not Found"
                    extracted.append(ExtractedFieldSchema(
                        field_name="nodal_officer_contact",
                        value=default_val,
                        confidence=0.0,
                        source_page=1,
                        evidence="No nodal officer contact block found.",
                        source_blocks=[],
                        source=doc_source
                    ))
                continue

            # 2. Standard Rule-Based Field Processing
            candidates: List[Dict[str, Any]] = []
            print(f"[FIELD_EXTRACTOR_DEBUG] Processing rule '{field_name}' (expected type: '{rule['type']}')", flush=True)
            
            for page in scan_pages:
                page_num = page.page_number
                blocks = page.text_blocks
                regions = page.layout_regions
                
                # Pre-process tables
                table_regions = [r for r in regions if r.region_type.lower() == "table"]
                for table in table_regions:
                    table_blocks = [b for b in blocks if is_contained(b.bounding_box, table.bounding_box)]
                    if not table_blocks:
                        continue

                    rows = group_blocks_into_rows(table_blocks)
                    for row in rows:
                        anchor_candidates = []
                        for block in row:
                            score = 0.0
                            if any(self._anchor_matches(k, block.text) for k in rule.get("hindi", [])):
                                score = 0.40
                            elif any(self._anchor_matches(k, block.text) for k in rule.get("anchors", [])):
                                score = 0.35
                            if score > 0.0:
                                anchor_candidates.append((score, block))

                        if not anchor_candidates:
                            continue

                        anchor_candidates.sort(key=lambda sb: sb[1].bounding_box["x1"])
                        anchor_score, anchor_found = anchor_candidates[0]

                        value_blocks = [b for b in row if b.bounding_box["x1"] > anchor_found.bounding_box["x1"]]
                        cell_text = " ".join(b.text for b in value_blocks).strip()
                        val = self._match_value_pattern(cell_text, rule["type"]) if cell_text else None

                        if val:
                            conf = anchor_score + 0.35 + 0.20 + 0.05
                            conf = min(1.0, conf)
                            candidates.append({
                                "value": val,
                                "confidence": round(conf, 2),
                                "source_page": page_num,
                                "evidence": f"Row match in table: '{anchor_found.text}' -> '{cell_text}'",
                                "source_blocks": [
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=anchor_found.block_id,
                                        region_id=table.region_id,
                                        text=anchor_found.text,
                                        bounding_box=BoundingBox(**anchor_found.bounding_box)
                                    )
                                ] + [
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=b.block_id,
                                        region_id=table.region_id,
                                        text=b.text,
                                        bounding_box=BoundingBox(**b.bounding_box)
                                    ) for b in value_blocks
                                ]
                            })
                        elif rule["type"] in ("text", "org"):
                            suffix = self._extract_suffix_after_anchor(anchor_found.text, rule["anchors"] + rule.get("hindi", []))
                            if suffix:
                                suffix_val = self._match_value_pattern(suffix, rule["type"])
                                print(f"    [FIELD_EXTRACTOR_DEBUG] Table anchor suffix value: {ascii(suffix)} -> matched val: {ascii(suffix_val)}", flush=True)
                                if suffix_val:
                                    candidates.append({
                                        "value": suffix_val,
                                        "confidence": round(anchor_score + 0.35 + 0.20 + 0.05, 2),
                                        "source_page": page_num,
                                        "evidence": f"Row match in table: '{anchor_found.text}' -> '{suffix_val}'",
                                        "source_blocks": [
                                            SourceBlockRef(
                                                page_number=page_num,
                                                block_id=anchor_found.block_id,
                                                region_id=table.region_id,
                                                text=anchor_found.text,
                                                bounding_box=BoundingBox(**anchor_found.bounding_box)
                                            )
                                        ]
                                    })

                # Scan general blocks
                general_anchors = [
                    k for k in rule.get("anchors", [])
                    if len(k.split()) >= 2 or (len(k) <= 5 and k.isupper())
                ]

                for idx, block in enumerate(blocks):
                    anchor_score = 0.0

                    if any(self._anchor_at_start_or_short(k, block.text) for k in rule.get("hindi", [])):
                        anchor_score = 0.40
                    elif any(self._anchor_at_start_or_short(k, block.text) for k in general_anchors):
                        anchor_score = 0.35

                    if anchor_score > 0.0:
                        is_org_preposition = False
                        if rule["type"] in ("text", "org"):
                            for anchor in (rule.get("anchors", []) + rule.get("hindi", [])):
                                if anchor.lower() in ("ministry of", "department of", "office of", "organisation of", "organization of"):
                                    if self._anchor_matches(anchor, block.text):
                                        anchor_words = self._normalize_for_match(anchor).split()
                                        parts = [re.escape(w) for w in anchor_words]
                                        pattern = re.compile(r"(?:\W|\s)*".join(parts), re.IGNORECASE)
                                        m = pattern.search(block.text)
                                        if m:
                                            suffix_part = block.text[m.end():]
                                            if not re.match(r"^\s*[:\-/\n\t|]", suffix_part):
                                                is_org_preposition = True
                                                break

                        if is_org_preposition:
                            val = block.text.strip()
                            print(f"  [FIELD_EXTRACTOR_DEBUG] Same-block match (org preposition): {ascii(block.text)} -> {ascii(val)}", flush=True)
                            conf = anchor_score + 0.35 + 0.25
                            conf = min(1.0, conf)
                            candidates.append({
                                "value": val,
                                "confidence": round(conf, 2),
                                "source_page": page_num,
                                "evidence": block.text,
                                "source_blocks": [
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=block.block_id,
                                        text=block.text,
                                        bounding_box=BoundingBox(**block.bounding_box)
                                    )
                                ]
                            })
                            continue

                        val = self._match_value_pattern(block.text, rule["type"])
                        if val and val == block.text.strip() and rule["type"] in ("text", "org"):
                            suffix = self._extract_suffix_after_anchor(block.text, rule["anchors"] + rule["hindi"])
                            if suffix:
                                val = self._match_value_pattern(suffix, rule["type"])
                        if val and val != block.text.strip():
                            print(f"  [FIELD_EXTRACTOR_DEBUG] Same-block match: {ascii(block.text)} -> {ascii(val)}", flush=True)
                            conf = anchor_score + 0.35 + 0.25
                            conf = min(1.0, conf)
                            candidates.append({
                                "value": val,
                                "confidence": round(conf, 2),
                                "source_page": page_num,
                                "evidence": block.text,
                                "source_blocks": [
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=block.block_id,
                                        text=block.text,
                                        bounding_box=BoundingBox(**block.bounding_box)
                                    )
                                ]
                            })
                            continue
                        
                        # 2. Check next block
                        if idx + 1 < len(blocks):
                            next_block = blocks[idx+1]
                            val = self._match_value_pattern(next_block.text, rule["type"])
                            if val:
                                dist_y = abs(next_block.bounding_box["y1"] - block.bounding_box["y2"])
                                if dist_y < 50:
                                    print(f"  [FIELD_EXTRACTOR_DEBUG] Next-block match: {ascii(block.text)} | {ascii(next_block.text)} -> {ascii(val)}", flush=True)
                                    conf = anchor_score + 0.35 + 0.15
                                    conf = min(1.0, conf)
                                    candidates.append({
                                        "value": val,
                                        "confidence": round(conf, 2),
                                        "source_page": page_num,
                                        "evidence": f"{block.text} | {next_block.text}",
                                        "source_blocks": [
                                            SourceBlockRef(
                                                page_number=page_num,
                                                block_id=block.block_id,
                                                text=block.text,
                                                bounding_box=BoundingBox(**block.bounding_box)
                                            ),
                                            SourceBlockRef(
                                                page_number=page_num,
                                                block_id=next_block.block_id,
                                                text=next_block.text,
                                                bounding_box=BoundingBox(**next_block.bounding_box)
                                            )
                                        ]
                                    })
                                    continue
                                    
                        # 3. Nearest-neighbor
                        cx_a = (block.bounding_box["x1"] + block.bounding_box["x2"]) / 2
                        cy_a = (block.bounding_box["y1"] + block.bounding_box["y2"]) / 2
                        
                        best_neighbor = None
                        best_neighbor_val = None
                        min_dist = float('inf')
                        
                        for other_block in blocks:
                            if other_block == block:
                                continue
                            
                            cx_o = (other_block.bounding_box["x1"] + other_block.bounding_box["x2"]) / 2
                            cy_o = (other_block.bounding_box["y1"] + other_block.bounding_box["y2"]) / 2
                            
                            is_right = other_block.bounding_box["x1"] >= block.bounding_box["x1"] and abs(cy_o - cy_a) < 30
                            is_below = other_block.bounding_box["y1"] >= block.bounding_box["y2"] and abs(cx_o - cx_a) < 150
                            
                            if is_right or is_below:
                                dist = math.sqrt((cx_o - cx_a)**2 + (cy_o - cy_a)**2)
                                if dist < 150 and dist < min_dist:
                                    val = self._match_value_pattern(other_block.text, rule["type"])
                                    if val:
                                        min_dist = dist
                                        best_neighbor = other_block
                                        best_neighbor_val = val
                                        
                        if best_neighbor:
                            print(f"  [FIELD_EXTRACTOR_DEBUG] Spatial neighbor match: {ascii(block.text)} -> {ascii(best_neighbor.text)} -> {ascii(best_neighbor_val)}", flush=True)
                            conf = anchor_score + 0.35 + 0.15
                            conf = min(1.0, conf)
                            candidates.append({
                                "value": best_neighbor_val,
                                "confidence": round(conf, 2),
                                "source_page": page_num,
                                "evidence": f"{block.text} -> {best_neighbor.text}",
                                "source_blocks": [
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=block.block_id,
                                        text=block.text,
                                        bounding_box=BoundingBox(**block.bounding_box)
                                    ),
                                    SourceBlockRef(
                                        page_number=page_num,
                                        block_id=best_neighbor.block_id,
                                        text=best_neighbor.text,
                                        bounding_box=BoundingBox(**best_neighbor.bounding_box)
                                    )
                                ]
                            })
                            
            if candidates:
                # Drop value candidates that are clearly paragraphs/sentences rather
                # than discrete field values (e.g., an org value that continues as
                # "Ministry. If the bidder wants..."). This improves table extraction
                # quality on noisy GeM PDFs without adding per-layout special cases.
                def _looks_like_paragraph(value: str) -> bool:
                    if len(value) > 100:
                        return True
                    return bool(re.search(
                        r'\.\s+(if|the|and|or|shall|for|of|to|in|with|this|that|these|those|is|are|was|were|has|have|had|be|been|being|it|they|there)\b',
                        value, re.IGNORECASE
                    ))

                candidates = [c for c in candidates if not _looks_like_paragraph(c["value"])]

                if candidates:
                    best_cand = sorted(candidates, key=lambda c: c["confidence"], reverse=True)[0]
                    print(f"[FIELD_EXTRACTOR_DEBUG] Extracted value for '{field_name}': {ascii(best_cand['value'])} (conf: {best_cand['confidence']})", flush=True)
                else:
                    print(f"[FIELD_EXTRACTOR_DEBUG] Extracted value for '{field_name}': Not Found (all candidates looked like paragraphs)", flush=True)
                    extracted.append(ExtractedFieldSchema(
                        field_name=field_name,
                        value="Not Found",
                        confidence=0.0,
                        source_page=1,
                        evidence="No matching anchors or value patterns found in document.",
                        source_blocks=[],
                        source=doc_source
                    ))
                    continue
                extracted.append(ExtractedFieldSchema(
                    field_name=field_name,
                    value=best_cand["value"],
                    confidence=best_cand["confidence"],
                    source_page=best_cand["source_page"],
                    evidence=best_cand["evidence"],
                    source_blocks=best_cand["source_blocks"],
                    source=doc_source
                ))
            else:
                print(f"[FIELD_EXTRACTOR_DEBUG] Extracted value for '{field_name}': Not Found", flush=True)
                default_val = "Out of Scope (Stage 1)" if field_name in self.out_of_scope_stage1 else "Not Found"
                evidence = "This field is out of scope for Stage 1 (Parent Tender PDF)." if default_val == "Out of Scope (Stage 1)" else "No matching anchors or value patterns found in document."
                extracted.append(ExtractedFieldSchema(
                    field_name=field_name,
                    value=default_val,
                    confidence=0.0,
                    source_page=1,
                    evidence=evidence,
                    source_blocks=[],
                    source=doc_source
                ))
                
        # Compute derived EMD fields if emd_by_schedule was processed
        emd_by_sch_field = next((f for f in extracted if f.field_name == "emd_by_schedule"), None)
        if emd_by_sch_field and emd_by_sch_field.value not in ("Not Found", "Out of Scope (Stage 1)"):
            try:
                import ast
                emd_dict = ast.literal_eval(emd_by_sch_field.value)
                total_val = sum(emd_dict.values())
                extracted.append(ExtractedFieldSchema(
                    field_name="emd_total",
                    value=f"{total_val:,.2f}" if total_val > 0 else "0",
                    confidence=0.9,
                    source_page=1,
                    evidence=f"Derived sum of schedule EMDs: {emd_by_sch_field.value}",
                    source_blocks=[],
                    source="derived"
                ))
                extracted.append(ExtractedFieldSchema(
                    field_name="emd_required",
                    value="Yes" if total_val > 0 else "No",
                    confidence=0.9,
                    source_page=1,
                    evidence=f"Derived from EMD total: {total_val}",
                    source_blocks=[],
                    source="derived"
                ))
            except Exception as e:
                print(f"[FIELD_EXTRACTOR_DEBUG] Failed to parse emd_by_schedule: {e}", flush=True)
        else:
            extracted.append(ExtractedFieldSchema(
                field_name="emd_total",
                value="Out of Scope (Stage 1)" if "emd_total" in self.out_of_scope_stage1 else "Not Found",
                confidence=0.0,
                source_page=1,
                evidence="Derived field, parent EMD details not found.",
                source_blocks=[],
                source="derived"
            ))
            extracted.append(ExtractedFieldSchema(
                field_name="emd_required",
                value="Out of Scope (Stage 1)" if "emd_required" in self.out_of_scope_stage1 else "Not Found",
                confidence=0.0,
                source_page=1,
                evidence="Derived field, parent EMD details not found.",
                source_blocks=[],
                source="derived"
            ))

        # Ensure all out of scope fields are represented in the output list
        for field_name in self.out_of_scope_stage1:
            if not any(f.field_name == field_name for f in extracted):
                extracted.append(ExtractedFieldSchema(
                    field_name=field_name,
                    value="Out of Scope (Stage 1)",
                    confidence=0.0,
                    source_page=1,
                    evidence="This field is designated as out of scope for Stage 1 (Parent Tender PDF).",
                    source_blocks=[],
                    source=doc_source
                ))

        print(f"[FIELD_EXTRACTOR_DEBUG] Finished extraction. Total extracted fields count: {len(extracted)}\n", flush=True)
        return extracted

    def extract_atc_fields(self, atc_pages: List[PageResult]) -> List[ExtractedFieldSchema]:
        """
        Extracts fields specifically from Additional Terms and Conditions (ATC) PDF
        using existing Hindi and English anchor lists.
        """
        return self.extract_fields(atc_pages, doc_source="atc")


AMBIGUOUS_MERGE_FIELDS = {
    "custom_eligibility_criteria",
    "delivery_time_installation_inclusive",
    "custom_rules"
}

MAIN_SOURCED_FIELD_NAMES = {
    "PBG Required", "PBG Percentage", "PBG Duration", "PBG Duration (Months)",
    "Eligibility Criterion (Years)", "Bid Validity (Days)", "Bid Validity Period",
    "Tender Name / Title", "Reference ID / NIT No", "Estimated Tender Value",
    "Organisation", "Authority Agency", "bid_number", "bid_validity_days", "tender_value"
}

def merge_tender_and_atc_fields(
    main_fields: List[ExtractedFieldSchema],
    atc_fields: List[ExtractedFieldSchema]
) -> List[ExtractedFieldSchema]:
    """
    Merges extracted fields from main_tender and atc documents applying priority rules.

    Priority Rules:
    1. ATC field overrides main_tender field if ATC has a valid value (explicit ATC clause wins,
       removing confidence carve-outs).
    2. Retains main tender field if only main_tender found a valid value or field belongs to MAIN_SOURCED_FIELD_NAMES.
    3. For ambiguous fields ('custom_eligibility_criteria', 'delivery_time_installation_inclusive', 'custom_rules'),
       preserves both candidates when both documents contain values without premature resolution.
    4. Derived fields recalculated on merged dataset.

    Logs winning document, text source, and page number.
    """
    merged_map: Dict[str, ExtractedFieldSchema] = {f.field_name: f for f in main_fields}

    for atc_f in atc_fields:
        fn = atc_f.field_name
        main_f = merged_map.get(fn)

        if not main_f:
            win_field = atc_f
        else:
            main_valid = main_f.value not in (None, "", "Not Found", "Out of Scope (Stage 1)", 0, 0.0, "0", "0.0", "0.00")
            atc_valid = atc_f.value not in (None, "", "Not Found", "Out of Scope (Stage 1)", 0, 0.0, "0", "0.0", "0.00")

            if fn in MAIN_SOURCED_FIELD_NAMES and main_valid:
                win_field = main_f
            elif fn in AMBIGUOUS_MERGE_FIELDS and main_valid and atc_valid:
                # Preserve both candidates without resolving prematurely
                combined_val = {
                    "main_tender": main_f.value,
                    "atc": atc_f.value
                }
                win_field = ExtractedFieldSchema(
                    field_name=fn,
                    value=combined_val,
                    confidence=min(main_f.confidence, atc_f.confidence),
                    source_page=atc_f.source_page,
                    evidence=f"Ambiguous candidates preserved: main_tender='{main_f.value}' | atc='{atc_f.value}'",
                    source_blocks=main_f.source_blocks + atc_f.source_blocks,
                    source="ambiguous_preserved"
                )
            elif atc_valid:
                # Explicit ATC clause always wins over main tender (no confidence carve-out)
                win_field = atc_f
            elif main_valid:
                win_field = main_f
            else:
                win_field = main_f

        merged_map[fn] = win_field

        text_src = "native/ocr"
        page_num = win_field.source_page
        logger.info(
            f"[FIELD_MERGE] Field: {fn} | Winning Source: {win_field.source} | "
            f"Text Source: {text_src} | Page: {page_num} | Value: {win_field.value}"
        )

    return list(merged_map.values())
