# central csv schema definition for universal tender extraction sheet
# this schema defines column types and logical ordering suitable for DictWriter

# ==============================================================================
# Helper Columns (Not stored directly in tender_information, used for tracking)
# ==============================================================================
HELPER_COLUMNS = [
    "document_source_format",  # [helper] Identifies document origin format (e.g. GeM, CPPP, Custom)
    "extracted_by_version"     # [helper] Tracks version of extraction engine
]

# ==============================================================================
# DB-Mapped Columns (Maps 1-to-1 with public.tender_information columns)
# ==============================================================================

# 1. Document Tracking Columns
DOCUMENT_TRACKING_COLUMNS = [
    "id",                      # [auto / serial] DB Primary Key
    "tender_id",               # [auto / bigint] Internal DB foreign key tracking tender document ID
]

# 2. Tender Identity Columns
TENDER_IDENTITY_COLUMNS = [
    "tender_value"             # [auto / numeric] Estimated contract value/tender value
]

# 3. Bid Timing Columns
BID_TIMING_COLUMNS = [
    "bid_validity_days",       # [auto / int4] Offer validity days
    "physical_docs_deadline"   # [auto / timestamp] Deadline to submit paper documents offline
]

# 4. Commercial & Financial Columns
COMMERCIAL_FINANCIAL_COLUMNS = [
    "emd_amount",              # [auto / numeric] EMD security deposit amount
    "emd_mode",                # [derived / text[]] Multi-value array of accepted EMD instruments
    "tender_fee_amount",       # [auto / numeric] Tender purchase fee amount
    "tender_fee_mode",         # [derived / text[]] Accepted payment instruments for tender fee
    "processing_fee_amount",   # [auto / numeric] Portal processing transactional fee
    "processing_fee_mode",     # [derived / text[]] Accepted payment instruments for processing fee
    "pbg_percentage",          # [auto / numeric] Performance Bank Guarantee rate percentage
    "pbg_duration",            # [auto / int4] Performance Security duration in months
    "pbg_mode",                # [auto / text] Allowed instrument format for PBG
    "sd_percentage",           # [auto / numeric] Security Deposit / Retention rate percentage
    "sd_duration",             # [auto / int4] Defect liability period duration in months
    "sd_mode",                 # [auto / text] Allowed instrument format for Security Deposit
    "ld_percentage_per_week",  # [auto / numeric] Liquidated Damages penalty rate per week of delay
    "max_ld_percentage"        # [auto / numeric] Total ceiling cap on Liquidated Damages penalties
]

# 5. Eligibility Columns
ELIGIBILITY_COLUMNS = [
    "maf_required",            # [derived / varchar] Yes/No flag for Manufacturer Authorization Form
    "technical_eligibility_age",# [auto / int4] Minimum years of bidder corporate experience
    "oem_experience",          # [auto / varchar] Specific experience requirements binding on the OEM
    "avg_annual_turnover_value",# [auto / numeric] Bidder or OEM average annual turnover requirement value
    "avg_annual_turnover_type", # [auto / text] Target of the turnover constraint (Bidder vs OEM)
    "working_capital_value",   # [auto / numeric] Required liquidity or working capital limit
    "working_capital_type",    # [auto / varchar] Document format to prove working capital
    "solvency_certificate_value",# [auto / numeric] Bank solvency letter value constraint
    "solvency_certificate_type",# [auto / varchar] Tier of bank required to issue solvency letter
    "net_worth_value",         # [auto / numeric] Minimum net worth threshold required
    "net_worth_type",          # [auto / varchar] Certified net worth standards
    "order_value_1",           # [auto / numeric] Value of single similar completed work required (80%)
    "order_value_2",           # [auto / numeric] Value of two similar completed works required (50%)
    "order_value_3",           # [auto / numeric] Value of three similar completed works required (40%)
    "work_value_type",         # [auto / varchar] Classification tag defining similar work categories
    "custom_eligibility_criteria"# [auto / text] General pre-qualification text blocks
]

# 6. Delivery & Service Columns
DELIVERY_SERVICE_COLUMNS = [
    "delivery_time_supply",    # [auto / int4] Delivery window in days for materials supply
    "delivery_time_installation_days", # [auto / int4] Site setup/commissioning window in days
    "delivery_time_installation_inclusive", # [auto / bool] If installation days are inside supply days
    "payment_terms_supply",    # [auto / numeric] Percentage of payment released on material supply
    "payment_terms_installation" # [auto / numeric] Percentage of payment released on commissioning
]

# 7. Consignee & Courier Columns
CONSIGNEE_COURIER_COLUMNS = [
    "courier_name",            # [auto / varchar] Designated recipient name for offline bids
    "courier_phone",           # [auto / varchar] Contact number of receiving officer
    "courier_address",         # [auto / text] Full address block for offline envelope delivery
    "courier_address_line_1",  # [derived / text] Split first segment of destination address
    "courier_address_line_2",  # [derived / text] Split second segment of destination address
    "courier_city",            # [auto / varchar] Resolved destination city
    "courier_state",           # [auto / varchar] Resolved destination state
    "courier_pincode"          # [derived / varchar] Extracted 6-digit postal pincode
]

# 8. Derived Flags Columns
DERIVED_FLAGS_COLUMNS = [
    "emd_required",            # [derived / varchar] Yes/No EMD required status
    "tender_fee_required",     # [derived / varchar] Yes/No Tender Fee required status
    "processing_fee_required", # [derived / varchar] Yes/No Portal Processing Fee required status
    "pbg_required",            # [derived / varchar] Yes/No Performance Bank Guarantee required status
    "sd_required",             # [derived / varchar] Yes/No Security Deposit required status
    "ld_required",             # [derived / varchar] Yes/No Liquidated Damages applicability
    "physical_docs_required",  # [derived / varchar] Yes/No offline paper submission required
    "physical_doc_type",       # [auto / varchar] Classification of physical submission items
    "physical_docs_type",      # [auto / varchar] Mapping fallback array
    "client_details_present",  # [derived / varchar] Yes/No client organisation detected
    "courier_details_present", # [derived / varchar] Yes/No delivery address detected
    "reverse_auction_applicable" # [auto / varchar] Yes/No/NA Reverse Auction status
]

# 9. Manual Review Columns (Initialized to Null, Audited Later by Evaluator)
MANUAL_REVIEW_COLUMNS = [
    "te_recommendation",       # [manual / varchar] Technical evaluator verdict (Accept/Reject)
    "te_rejection_reason",     # [manual / int4] Standardized disqualification reason code
    "te_rejection_remarks",    # [manual / text] Explanatory notes by assessor
    "te_rejection_proof",      # [manual / _text] Document URLs proving disqualification
    "te_final_remark",         # [manual / text] Technical compliance summary note
    "customer_in_contact",     # [manual / varchar] Yes/No CRM sales flag
    "commercial_evaluation"    # [manual / varchar] Financial L1/L2 rank assigned after opening
]

# 10. System Audit Columns
SYSTEM_AUDIT_COLUMNS = [
    "created_at",              # [helper / timestamp] DB creation stamp
    "updated_at"               # [helper / timestamp] DB edit stamp
]

# ==============================================================================
# Complete Sheet Ordering (Combines helpers + database payload layout)
# ==============================================================================
CSV_COLUMNS = (
    DOCUMENT_TRACKING_COLUMNS +
    TENDER_IDENTITY_COLUMNS +
    BID_TIMING_COLUMNS +
    COMMERCIAL_FINANCIAL_COLUMNS +
    ELIGIBILITY_COLUMNS +
    DELIVERY_SERVICE_COLUMNS +
    CONSIGNEE_COURIER_COLUMNS +
    DERIVED_FLAGS_COLUMNS +
    MANUAL_REVIEW_COLUMNS +
    SYSTEM_AUDIT_COLUMNS +
    HELPER_COLUMNS
)

# Minimal columns subset for simple validations
MINIMAL_MVP_CSV_COLUMNS = [
    "tender_id",
    "tender_value",
    "bid_validity_days",
    "emd_required",
    "emd_amount",
    "emd_mode",
    "tender_fee_amount",
    "pbg_required",
    "pbg_percentage",
    "pbg_duration",
    "maf_required",
    "technical_eligibility_age",
    "avg_annual_turnover_value",
    "order_value_1",
    "order_value_2",
    "order_value_3",
    "delivery_time_supply",
    "physical_docs_required",
    "physical_docs_deadline",
    "courier_address",
    "courier_pincode",
    "te_recommendation",
    "te_rejection_remarks",
    "te_final_remark"
]

# Evidence Sheet header schema (Layer 2)
EVIDENCE_COLUMNS = [
    "tender_id",
    "field_name",
    "extracted_value_raw",
    "normalized_value",
    "page_number",
    "confidence",
    "text_snippet",
    "extraction_timestamp"
]

# ==============================================================================
# INFOSHEET VISUAL LAYOUT (openpyxl form-style sheet) — Page 1 / Page 2
# ==============================================================================
# This section defines the *visual* form layout used by info_sheet_generator.py.
# It is fully decoupled from CSV_COLUMNS above (that list still drives the flat
# Layer-1 CSV/DB export). The visual sheet is rendered from a fixed 6-column
# grid (A-F). Every row is declared here as data so the generator stays a thin,
# generic renderer instead of hand-coded per-field openpyxl calls.
#
# Style tags below are resolved to actual PatternFill/Font objects inside
# info_sheet_generator.py (see STYLE_MAP there). Keeping the tag names here
# and the actual colors there means you can restyle without touching layout.

NA_DISPLAY = "NA"

# Style tags
STYLE_SECTION_HEADER = "section_header"     # bold, blue-gray fill, full-width banners
STYLE_SUBSECTION = "subsection_header"      # bold, light gray fill
STYLE_LABEL = "label"                       # plain white label cell
STYLE_LABEL_PINK = "label_pink"             # pink label (Bid Due Date / Recommendation rows)
STYLE_LABEL_YELLOW = "label_yellow"         # pale yellow label (PBG/SD/Physical docs rows)
STYLE_VALUE = "value"                       # plain white value cell
STYLE_VALUE_PINK = "value_pink"             # pink value cell
STYLE_VALUE_YELLOW = "value_yellow"         # pale yellow value cell
STYLE_VALUE_BLUE = "value_blue"             # light blue value cell (top identity block)
STYLE_PLAIN = "plain"                       # no fill, used for spacer/unit cells

INFOSHEET_GRID_COLUMNS = 6  # fixed column count (A-F) for both pages


def _cell(colspan, kind, text=None, key=None, style=STYLE_PLAIN, bold=False, wrap=True, align="left"):
    """
    kind: "label" | "value" | "header" (static section banner) | "spacer"
    text: static text used for kind="label"/"header"
    key:  lookup key into the flat infosheet data dict, used for kind="value"
    """
    return {
        "colspan": colspan,
        "kind": kind,
        "text": text,
        "key": key,
        "style": style,
        "bold": bold,
        "wrap": wrap,
        "align": align,
    }


def _row(cells, height=20):
    return {"height": height, "cells": cells}


# ------------------------------------------------------------------------
# PAGE 1
# ------------------------------------------------------------------------
INFOSHEET_PAGE1_LAYOUT = [
    # --- Identity block ---
    _row([
        _cell(2, "label", "Organization:", style=STYLE_LABEL, bold=True),
        _cell(4, "value", key="organization", style=STYLE_VALUE_BLUE),
    ]),
    _row([
        _cell(2, "label", "Tender Name:", style=STYLE_LABEL, bold=True),
        _cell(4, "value", key="tender_name", style=STYLE_VALUE_BLUE),
    ]),
    _row([
        _cell(2, "label", "Tender ID:", style=STYLE_LABEL, bold=True),
        _cell(4, "value", key="tender_id_display", style=STYLE_VALUE_BLUE),
    ]),
    _row([
        _cell(2, "label", "Website:", style=STYLE_LABEL, bold=True),
        _cell(4, "value", key="website", style=STYLE_VALUE_BLUE),
    ]),

    # --- Pink highlight rows ---
    _row([
        _cell(2, "label", "Bid Due Date and Time", style=STYLE_LABEL_PINK, bold=True, align="center"),
        _cell(4, "value", key="bid_due_date_time", style=STYLE_VALUE_PINK, bold=True, align="center"),
    ]),
    _row([
        _cell(1, "label", "Recommendation by TE", style=STYLE_LABEL_PINK, bold=True),
        _cell(1, "value", key="te_recommendation_display", style=STYLE_VALUE_PINK, align="center"),
        _cell(1, "label", "Reason", style=STYLE_LABEL_PINK, bold=True),
        _cell(3, "value", key="te_rejection_reason_display", style=STYLE_VALUE_PINK),
    ], height=32),

    # --- Section: Tender Information ---
    _row([_cell(6, "header", "Tender Information", style=STYLE_SECTION_HEADER, bold=True, align="center")], height=22),

    _row([
        _cell(2, "label", "Processing Fees"),
        _cell(1, "value", key="processing_fee_amount_display"),
        _cell(2, "label", "Processing Fees (in form of)"),
        _cell(1, "value", key="processing_fee_mode_display"),
    ]),
    _row([
        _cell(2, "label", "Tender Fees"),
        _cell(1, "value", key="tender_fee_amount_display"),
        _cell(2, "label", "Tender Fees (in form of)"),
        _cell(1, "value", key="tender_fee_mode_display"),
    ]),
    _row([
        _cell(2, "label", "EMD"),
        _cell(1, "value", key="emd_amount_display"),
        _cell(2, "label", "EMD required"),
        _cell(1, "value", key="emd_required_display"),
    ]),
    _row([
        _cell(2, "label", "Tender Value (GST Inclusive)"),
        _cell(1, "value", key="tender_value_display"),
        _cell(2, "label", "EMD (in form of)"),
        _cell(1, "value", key="emd_mode_display"),
    ]),
    _row([
        _cell(1, "label", "Bid Validity"),
        _cell(1, "value", key="bid_validity_days_display"),
        _cell(1, "label", "Commercial Evaluation"),
        _cell(1, "value", key="commercial_evaluation_display"),
        _cell(1, "label", "RA Applicable"),
        _cell(1, "value", key="reverse_auction_applicable_display"),
    ]),
    _row([
        _cell(1, "label", "Bid Type"),
        _cell(1, "value", key="bid_type_display"),
        _cell(2, "label", "ATC Document Link", style=STYLE_LABEL_YELLOW, bold=True),
        _cell(2, "value", key="atc_document_link_display", style=STYLE_VALUE_YELLOW),
    ]),
    _row([
        _cell(1, "label", "MAF required"),
        _cell(1, "value", key="maf_required_display"),
        _cell(1, "label", "Delivery Time (Supply/Total)"),
        _cell(1, "value", key="delivery_time_supply_display"),
        _cell(1, "label", "Delivery Time (Installation)"),
        _cell(1, "value", key="delivery_time_installation_display"),
    ]),
    _row([
        _cell(1, "label", "PBG (in form of)", style=STYLE_LABEL_YELLOW),
        _cell(1, "value", key="pbg_mode_display"),
        _cell(1, "label", "Payment Terms (Supply)"),
        _cell(1, "value", key="payment_terms_supply_display"),
        _cell(1, "label", "Payment Terms (Installation)"),
        _cell(1, "value", key="payment_terms_installation_display"),
    ]),
    _row([
        _cell(1, "label", "SD (in form of)", style=STYLE_LABEL_YELLOW),
        _cell(1, "value", key="sd_mode_display"),
        _cell(1, "label", "LD/PRS %age (per week)"),
        _cell(1, "value", key="ld_percentage_display"),
        _cell(1, "label", "Max LD %age"),
        _cell(1, "value", key="max_ld_percentage_display"),
    ]),
    _row([
        _cell(2, "label", "PBG Required"),
        _cell(1, "value", key="pbg_required_display"),
        _cell(3, "spacer", ""),
    ]),
    _row([
        _cell(2, "label", "PBG %age"),
        _cell(1, "value", key="pbg_percentage_display"),
        _cell(2, "label", "Security Deposit", style=STYLE_LABEL_YELLOW),
        _cell(1, "value", key="sd_percentage_display"),
    ]),
    _row([
        _cell(2, "label", "PBG Duration"),
        _cell(1, "value", key="pbg_duration_display"),
        _cell(2, "label", "SD Duration"),
        _cell(1, "value", key="sd_duration_display"),
    ]),
    _row([
        _cell(2, "label", "Physical Docs Submission Required", style=STYLE_LABEL_YELLOW, wrap=True),
        _cell(1, "value", key="physical_docs_required_display"),
        _cell(1, "label", "Physical Docs Submission Deadline", style=STYLE_LABEL_YELLOW, wrap=True),
        _cell(2, "value", key="physical_docs_deadline_display"),
    ], height=30),

    # --- Eligibility / Financial criterion header row ---
    _row([
        _cell(2, "label", "Eligibility Criterion (Years)", style=STYLE_SUBSECTION, bold=True),
        _cell(1, "value", key="experience_years_display", style=STYLE_SUBSECTION, bold=True, align="center"),
        _cell(3, "header", "Financial Criterion", style=STYLE_SECTION_HEADER, bold=True, align="center"),
    ]),

    _row([
        _cell(2, "label", "3 Works Value"),
        _cell(1, "value", key="order_value_1_display"),
        _cell(1, "label", "Annual Avg Turnover"),
        _cell(1, "value", key="avg_annual_turnover_type_display"),
        _cell(1, "value", key="avg_annual_turnover_value_display"),
    ]),
    _row([
        _cell(2, "label", "2 Works Value"),
        _cell(1, "value", key="order_value_2_display"),
        _cell(1, "label", "Working Capital"),
        _cell(1, "value", key="working_capital_type_display"),
        _cell(1, "value", key="working_capital_value_display"),
    ]),
    _row([
        _cell(2, "label", "1 work Value"),
        _cell(1, "value", key="order_value_3_display"),
        _cell(1, "label", "Net Worth"),
        _cell(1, "value", key="net_worth_type_display"),
        _cell(1, "value", key="net_worth_value_display"),
    ]),
    _row([
        _cell(2, "label", "PO selected for Technical Eligibility", wrap=True),
        _cell(1, "value", key="po_selected_documents_display"),
        _cell(1, "label", "Solvency Certificate"),
        _cell(1, "value", key="solvency_certificate_type_display"),
        _cell(1, "value", key="solvency_certificate_value_display"),
    ], height=28),
]

# ------------------------------------------------------------------------
# PAGE 2
# ------------------------------------------------------------------------
INFOSHEET_PAGE2_LAYOUT = [
    _row([
        _cell(1, "label", "PQC Documents", style=STYLE_LABEL_YELLOW, bold=True),
        _cell(2, "label",
              "Document-1, Document-2, Document-3 (Auto attach the documents from PQR "
              "dashboard, based on the name selection)",
              style=STYLE_LABEL_YELLOW),
        _cell(1, "label", "Documents for Commercial Eligibility", bold=True, wrap=True),
        _cell(2, "value", key="commercial_eligibility_documents_display"),
    ], height=55),

    _row([
        _cell(2, "label", "Custom Eligibility Criteria", bold=True, wrap=True),
        _cell(4, "value", key="custom_eligibility_criteria_display"),
    ], height=40),

    _row([_cell(6, "spacer", "")], height=10),

    _row([
        _cell(1, "label", "Client Name"),
        _cell(1, "value", key="client_name_1_display"),
        _cell(1, "label", "Email"),
        _cell(1, "value", key="client_email_1_display"),
        _cell(1, "label", "Mobile No."),
        _cell(1, "value", key="client_phone_1_display"),
    ]),
    _row([
        _cell(1, "label", "Client Name"),
        _cell(1, "value", key="client_name_2_display"),
        _cell(1, "label", "Email"),
        _cell(1, "value", key="client_email_2_display"),
        _cell(1, "label", "Mobile No."),
        _cell(1, "value", key="client_phone_2_display"),
    ]),
    _row([
        _cell(1, "label", "Client Name"),
        _cell(1, "value", key="client_name_3_display"),
        _cell(1, "label", "Email"),
        _cell(1, "value", key="client_email_3_display"),
        _cell(1, "label", "Mobile No."),
        _cell(1, "value", key="client_phone_3_display"),
    ]),

    _row([_cell(6, "spacer", "")], height=10),

    _row([_cell(6, "header", "Documents Submitted", style=STYLE_SUBSECTION, bold=True)]),
    _row([
        _cell(1, "label", "Doc 1"), _cell(1, "value", key="doc_1_display"),
        _cell(1, "label", "Doc 2"), _cell(1, "value", key="doc_2_display"),
        _cell(1, "label", "Doc 3"), _cell(1, "value", key="doc_3_display"),
    ]),
    _row([
        _cell(1, "label", "Doc 4"), _cell(1, "value", key="doc_4_display"),
        _cell(1, "label", "Doc 5"), _cell(1, "value", key="doc_5_display"),
        _cell(1, "label", "Doc 6"), _cell(1, "value", key="doc_6_display"),
    ]),
    _row([
        _cell(1, "label", "Doc 7"), _cell(1, "value", key="doc_7_display"),
        _cell(1, "label", "Doc 8"), _cell(1, "value", key="doc_8_display"),
        _cell(1, "label", "Doc 9"), _cell(1, "value", key="doc_9_display"),
    ]),
    _row([
        _cell(2, "label", "Consignee Delivery Address"),
        _cell(4, "value", key="consignee_address_display"),
    ]),
    _row([
        _cell(2, "label", "Physical Docs Courier Address"),
        _cell(4, "value", key="courier_address_display"),
    ]),
    _row([
        _cell(1, "label", "Courier Provider"),
        _cell(1, "value", key="courier_provider_display"),
        _cell(1, "label", "Courier Docket No."),
        _cell(1, "value", key="courier_docket_no_display"),
        _cell(1, "label", "Delivery time"),
        _cell(1, "value", key="courier_delivery_time_display"),
    ]),
    _row([
        _cell(2, "label", "Docket slip - Upload"),
        _cell(1, "value", key="docket_slip_upload_display"),
        _cell(2, "label", "Physical Documents Couriered - Upload", wrap=True),
        _cell(1, "value", key="physical_docs_uploaded_display"),
    ], height=30),
    _row([_cell(6, "spacer", "")], height=10),
    _row([_cell(6, "header", "Evaluation & Preference Policies", style=STYLE_SECTION_HEADER, bold=True, align="center")]),
    _row([
        _cell(2, "label", "MSE Relaxation"), _cell(1, "value", key="mse_relaxation_display"),
        _cell(2, "label", "Startup Relaxation"), _cell(1, "value", key="startup_relaxation_display"),
    ]),
    _row([
        _cell(2, "label", "MSE Purchase Preference"), _cell(1, "value", key="mse_preference_display"),
        _cell(2, "label", "MII Purchase Preference"), _cell(1, "value", key="mii_preference_display"),
    ]),
    _row([
        _cell(2, "label", "Pre-Bid Meeting Details"),
        _cell(4, "value", key="pre_bid_meeting_display"),
    ]),
    _row([_cell(6, "spacer", "")], height=10),
    _row([_cell(6, "header", "Schedule & Technical Specifications", style=STYLE_SECTION_HEADER, bold=True, align="center")]),
    _row([
        _cell(2, "label", "Schedule 1 Details"),
        _cell(4, "value", key="schedule_1_details_display"),
    ], height=40),
    _row([
        _cell(2, "label", "Schedule 2 Details"),
        _cell(4, "value", key="schedule_2_details_display"),
    ], height=40),
    _row([
        _cell(2, "label", "Schedule 3 Details"),
        _cell(4, "value", key="schedule_3_details_display"),
    ], height=40),
    _row([
        _cell(2, "label", "Schedule 4 Details"),
        _cell(4, "value", key="schedule_4_details_display"),
    ], height=40),
]

BIDDER_READINESS_SUMMARY_LAYOUT = [
    _row([
        _cell(6, "label", "BIDDER READINESS & QUALIFICATION SUMMARY", style=STYLE_SECTION_HEADER, bold=True, align="center")
    ], height=24),
    _row([
        _cell(2, "label", "Site Visit Required?", bold=True),
        _cell(4, "value", key="readiness_site_visit_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Pre-Bid Meeting", bold=True),
        _cell(4, "value", key="readiness_pre_bid_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Key Deadline Timeline", bold=True),
        _cell(4, "value", key="readiness_timeline_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Required Capital Outlay", bold=True),
        _cell(4, "value", key="readiness_capital_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Technical & Financial BEC", bold=True),
        _cell(4, "value", key="readiness_bec_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Mandatory Certifications", bold=True),
        _cell(4, "value", key="readiness_certifications_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Delivery Commitment Feasibility", bold=True),
        _cell(4, "value", key="readiness_delivery_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Buyback / Reverse-Logistics Scope", bold=True),
        _cell(4, "value", key="readiness_buyback_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Reverse Auction (RA) Risk", bold=True),
        _cell(4, "value", key="readiness_ra_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Zero-Tolerance Disqualifiers", bold=True),
        _cell(4, "value", key="readiness_disqualifiers_display"),
    ], height=22),
    _row([
        _cell(2, "label", "Penalty & Delay Risk", bold=True),
        _cell(4, "value", key="readiness_penalty_risk_display"),
    ], height=22),
]

# Section headers for CSV metadata
SECTION_HEADERS = [
    "--- 1. IDENTIFIERS ---",
    "--- 2. TENDER CORE ATTRIBUTES ---",
    "--- 3. FINANCIAL/EMD/FEES ---",
    "--- 4. DATES & DEADLINES ---",
    "--- 5. BIDDER QUALIFICATIONS (BEC) ---",
    "--- 6. POST-QUALIFICATION POLICIES & COMPLIANCE ---",
    "--- 7. CLIENT DETAILS ---",
    "--- 8. PHYSICAL DOCUMENTS SUBMITTED ---",
    "--- 9. COURIER / DOCKET TRACKING ---",
    "--- 10. SYSTEM METADATA ---"
]

# Column width plan (characters) for the 6-column A-F grid used by both pages.
INFOSHEET_COLUMN_WIDTHS = [24, 16, 26, 24, 16, 20]

READINESS_DATA_KEYS = [
    "readiness_site_visit_display",
    "readiness_pre_bid_display",
    "readiness_timeline_display",
    "readiness_capital_display",
    "readiness_bec_display",
    "readiness_certifications_display",
    "readiness_delivery_display",
    "readiness_buyback_display",
    "readiness_ra_display",
    "readiness_disqualifiers_display",
    "readiness_penalty_risk_display",
]

# All flat keys the visual sheet expects to find in the data dict passed into
# generate_info_sheet_csv(). tender_mapper.build_infosheet_data() is
# responsible for populating these (falling back to NA_DISPLAY if missing).
INFOSHEET_DATA_KEYS = [
    "organization", "tender_name", "tender_id_display", "website",
    "bid_due_date_time", "te_recommendation_display", "te_rejection_reason_display",
    "processing_fee_amount_display", "processing_fee_mode_display",
    "tender_fee_amount_display", "tender_fee_mode_display",
    "emd_amount_display", "emd_required_display", "tender_value_display", "emd_mode_display",
    "bid_validity_days_display", "experience_years_display", "commercial_evaluation_display", "reverse_auction_applicable_display",
    "bid_type_display", "atc_document_link_display",
    "maf_required_display", "delivery_time_supply_display", "delivery_time_installation_display",
    "pbg_mode_display", "payment_terms_supply_display", "payment_terms_installation_display",
    "sd_mode_display", "ld_percentage_display", "max_ld_percentage_display",
    "pbg_required_display", "pbg_percentage_display", "sd_percentage_display",
    "pbg_duration_display", "sd_duration_display",
    "physical_docs_required_display", "physical_docs_deadline_display",
    "order_value_1_display", "avg_annual_turnover_type_display", "avg_annual_turnover_value_display",
    "order_value_2_display", "working_capital_type_display", "working_capital_value_display",
    "order_value_3_display", "net_worth_type_display", "net_worth_value_display",
    "po_selected_documents_display", "solvency_certificate_type_display", "solvency_certificate_value_display",
    "custom_eligibility_criteria_display", "commercial_eligibility_documents_display",
    "client_name_1_display", "client_email_1_display", "client_phone_1_display",
    "client_name_2_display", "client_email_2_display", "client_phone_2_display",
    "client_name_3_display", "client_email_3_display", "client_phone_3_display",
    "doc_1_display", "doc_2_display", "doc_3_display",
    "doc_4_display", "doc_5_display", "doc_6_display",
    "doc_7_display", "doc_8_display", "doc_9_display",
    "courier_address_display", "courier_provider_display",
    "courier_docket_no_display", "courier_delivery_time_display",
    "docket_slip_upload_display", "physical_docs_uploaded_display",
    "mse_relaxation_display", "startup_relaxation_display",
    "mse_preference_display", "mii_preference_display",
    "pre_bid_meeting_display",
    "schedule_1_details_display", "schedule_2_details_display", "schedule_3_details_display", "schedule_4_details_display",
] + READINESS_DATA_KEYS