"""
GAIL Master Contract & ATC Concept Alias Definitions
Ground Truth Reference: GAIL General Conditions of Contract (GCC-Goods Rev.1, April 2022)
http://gailonline.com/pdf/gcc/GCC-GoodsRev1.pdf

Expanded with all GAIL/GeM BDS section tags and clause variants from live ATC analysis:
  - GAIL Rajahmundry NiCd (1) ATC
  - GGL Agra VRLA Batteries ATC (GEM/2026/B/7772525)
  - GAIL Jaipur AMC ATC
  - GAIL GCC-Goods Rev.1 (April 2022)
"""

from typing import Dict, List

ATC_CLAUSE_ALIASES: Dict[str, List[str]] = {
    # ─── Security Deposit / CPS — CLAUSE 38.0 / 39.0 ───────────────────────
    "security_deposit": [
        "Contract Performance Security",
        "CPS",
        "Security Deposit",
        "CPS/SD",
        "Contract Performance Security/ Security Deposit",
        "Performance Bank Guarantee",
        "PBG",
        "Contract Performance Guarantee",
        "CPBG",
        "Clause 38",
        "Clause 38.0",
        "Clause 39.0",
        "38.0 Contract Performance Security",
        "39.0 Contract Performance Security",
        "38. Contract Performance Security",
    ],

    # ─── Price Reduction Schedule — PRS only (NEVER "Liquidated Damages") ──
    "price_reduction_ld": [
        "Price Reduction Schedule",
        "PRS",
        "Price Reduction Schedule (PRS) for Delayed Delivery",
        "Price Reduction Schedule for Delayed Delivery",
        "PRS FOR DELAYED DELIVERY",
        "PRICE REDUCTION SCHEDULE (PRS)",
        # Note: "Liquidated Damages" is kept for legacy matching but PRS is authoritative
        "Liquidated Damages",
        "LD",
    ],

    # ─── Payment Terms — Goods/SITC: Clause 9.0/26.0 | Services: 21.0/3.1 ─
    "payment_terms": [
        "Terms of Payment",
        "Payment Terms",
        "TERMS OF PAYMENT",
        "PAYMENT TERMS",
        "Mode of Payment",
        # GAIL GCC Goods clauses
        "Clause 9.0",
        "Clause 9",
        "9.0 Terms of Payment",
        "9. Terms of Payment",
        # GAIL GCC Goods/SITC alternate
        "Clause 26.0",
        "Clause 26",
        "26.0 Terms of Payment",
        "26. Terms of Payment",
        # GAIL GCC Services/AMC
        "Clause 21.0",
        "Clause 21",
        "21.0 Terms of Payment",
        "21. Terms of Payment",
        "Clause 3.1",
        "3.1 Payment Terms",
        # Section/SCC scope keywords
        "SECTION-V",
        "SECTION-VI",
        "SPECIAL CONDITIONS OF CONTRACT",
        "SCC",
        "SCOPE OF WORK",
    ],

    # ─── MAF / BEC — SECTION-II BID EVALUATION CRITERIA ────────────────────
    "maf_bec": [
        "Manufacturer Authorization Form",
        "MAF",
        "OEM Authorization Certificate",
        "Authorized Dealer",
        "Authorized Partner/ Distributor",
        "Manufacturer Authorization",
        "BID EVALUATION CRITERIA",
        "BEC",
        "SECTION-II",
        "Section II",
        "Bid Evaluation Criteria",
        "Technical Eligibility Criteria",
    ],

    # ─── Courier/Physical Submission Address — BDS Tag (H), Clause 22.2 ────
    "courier_address": [
        "Dealing GAIL's Office Address",
        "GAIL's Office Address",
        "Office Address",
        "Address for Submission of Physical Documents",
        "Cut-Out Slip",
        "Consignee Address",
        "Owner's Address",
        # BDS Tag (H) — Section-I IFB Summary
        "(H) DEALING GAIL'S OFFICE ADDRESS",
        "(H) GAIL'S OFFICE ADDRESS",
        "BDS 8.1",
        "BDS 22.2",
        "Clause 22.2",
        "22.2 Address",
        "BIDDING DATA SHEET",
    ],

    # ─── Client Contacts — BDS Tag (G), Clause 39.2 / 39.3 ─────────────────
    "client_contacts": [
        "Nodal Officer",
        "Tender Dealing Officer",
        "Contact Details of Tender Dealing Officer",
        "Designated Authority",
        "Contact Details of Nodal Officer",
        # BDS Tag (G) — Section-I IFB Summary
        "(G) CONTACT DETAILS OF TENDER DEALING OFFICER",
        "(G) CONTACT DETAILS",
        "BDS 39.2",
        "BDS 39.3",
        "Clause 39.2",
        "Clause 39.3",
        "39.2 Nodal Officer",
        "39.3 Nodal Officer",
        "CONTACT DETAILS",
    ],

    # ─── EMD Amount — BDS Tag (E), Section-I ONLY ───────────────────────────
    # NEVER from Clause 16 (procedural boilerplate)
    "emd_amount": [
        "(E) BID SECURITY",
        "(E) BID SECURITY / EARNEST MONEY DEPOSIT",
        "(D) BID SECURITY",
        "Bid Security Amount",
        "EMD Detail",
        "Earnest Money Deposit",
        "BID SECURITY",
        # Explicit exclusion hint (negation must be handled in code, not alias)
        # "Clause 16" → DO NOT USE for EMD amount
    ],

    # ─── Delivery Time — SITC schedule / SCC / Delivery Period ─────────────
    "delivery_time": [
        "Delivery Period",
        "Delivery Schedule",
        "DELIVERY PERIOD",
        "DELIVERY SCHEDULE",
        "Supply Period",
        "Delivery Time",
        "days from the date of Purchase Order",
        "days from date of PO",
        "days from receipt of Purchase Order",
    ],

    # ─── BDS (Second Occurrence) — Section-III anchor ───────────────────────
    "bds_section": [
        "BIDDING DATA SHEET (BDS)",
        "BIDDING DATA SHEET",
        "BDS",
        "SECTION-III",
        "Section III",
        "Section-III Particular Conditions",
    ],
}
