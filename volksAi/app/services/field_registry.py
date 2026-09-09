"""
Shared field keyword registry.

This module is the single source of truth for "what words identify each
tender field" (e.g. what a PDF might call the EMD amount, the tender fee,
the bid deadline, etc). It exists because the project has two separate
extraction engines that used to keep their own hand-copied keyword lists:

  * backend/app/services/field_extractor.py — the plain-text/regex engine
    used by the workspace (main app UI) upload flow.
  * ocr/extractors/field_extractor.py — the spatial/table-aware engine used
    by the automated background OCR pipeline.

Because the two engines read genuinely different data (plain page text vs.
positioned text blocks with bounding boxes), they cannot share one
extraction algorithm without a much larger rewrite. What they CAN safely
share is the list of keywords that identify a given field. Before this
registry existed, a wording fix made in one engine (e.g. adding "boli
number" as another way of saying "bid number") would silently never reach
the other engine, so the same PDF wording could be found by one pipeline
and reported missing by the other. Both engines now read their keyword
lists from here, so a future wording addition only needs to be made once.

Each entry's `keywords` list is the union of every synonym that either
engine already recognized for that concept, so wiring both engines to this
registry is purely additive (it only teaches each engine new synonyms it
didn't already have) and never removes a synonym either engine already
relied on.
"""

from typing import Dict, List, TypedDict


class FieldDefinition(TypedDict, total=False):
    keywords: List[str]
    hindi: List[str]


FIELD_REGISTRY: Dict[str, FieldDefinition] = {
    "title": {
        "keywords": [
            "item category", "description /nomenclature of service", "description of service",
            "name of work",
        ],
    },
    "reference_id": {
        "keywords": [
            "bid number", "gem bid number", "gem bid no", "nit no", "nit number", "tender ref",
            "tender reference", "tender id", "tender number", "tender no", "reference no",
            "bid no", "bid ref", "boli number", "boli no",
        ],
    },
    "authority": {
        "keywords": [
            "organisation name", "organization name", "authority name", "agency name",
            "client name", "buyer office", "office of the", "organisation of", "organization of",
        ],
        "hindi": ["संगठन का नाम", "संगठन", "संस्था"],
    },
    "department": {
        "keywords": ["department name", "department", "division office", "department of"],
        "hindi": ["विभाग"],
    },
    "ministry": {
        "keywords": ["ministry/state name", "ministry name", "ministry", "ministry of"],
        "hindi": ["मंत्रालय"],
    },
    "tender_value": {
        "keywords": [
            "estimated bid value", "estimated cost", "tender value", "contract value",
            "amount of work", "estimated value", "tender cost", "work value", "total value",
            "bid value", "value of work", "work cost", "tender amount",
        ],
        "hindi": ["अनुमानित लागत", "निविदा मूल्य", "अनुमानित दर", "अनुबंध मूल्य"],
    },
    "emd_amount": {
        "keywords": ["emd amount", "emd value", "emd (rs)", "emd (inr)", "earnest money deposit", "earnest money amount", "bid security amount", "earnest money"],
        "hindi": ["धरोहर राशि", "ईएमडी", "बोली सुरक्षा"],
    },
    "tender_fee": {
        "keywords": [
            "tender fee", "document cost", "bid participation fee", "cost of document",
            "document fee", "tender document cost",
        ],
        "hindi": ["निविदा शुल्क", "दस्तावेज़ शुल्क", "निविदा दस्तावेज मूल्य"],
    },
    "bid_submission_deadline": {
        "keywords": [
            "bid end date", "bid submission deadline", "closing date", "last date of submission",
            "submission deadline", "submission end", "submission last date", "submission closing",
            "last date of bid submission", "bid end date/time", "bid end",
        ],
        "hindi": ["बोली जमा करने की अंतिम तिथि", "निविदा जमा करने की अंतिम तिथि", "जमा करने की अंतिम समय"],
    },
    "bid_opening_date": {
        "keywords": [
            "bid opening date", "date of opening", "technical bid opening", "opening date",
            "bid opening", "bid opening date/time", "opening time",
        ],
        "hindi": ["बोली खोलने की तिथि", "तकनीकी बोली खोलने की तिथि"],
    },
    "location": {
        "keywords": ["consignee address", "location of site", "location", "place of work"],
    },
    "contact_officer": {
        "keywords": [
            "consignee", "contact officer", "nodal officer", "buyer email", "executive engineer",
            "email id", "email address", "consignee email", "contact email",
        ],
    },
    "prebid_meeting": {
        "keywords": [
            "pre-bid date and time", "pre-bid meeting date", "pre bid date", "pre-bid meeting",
            "prebid meeting", "pre-bid date", "meeting date", "pre bid conference",
        ],
        "hindi": ["प्री-बिड बैठक", "निविदा पूर्व बैठक"],
    },
    "turnover_requirement": {
        "keywords": [
            "minimum average annual turnover", "bidder turnover", "average annual turnover",
            "turnover of the bidder", "annual turnover",
        ],
        "hindi": ["न्यूनतम औसत वार्षिक टर्नओवर", "वार्षिक टर्नओवर"],
    },
    "experience_requirement": {
        "keywords": [
            "years of past experience required", "experience required", "years of past experience",
            "past experience", "experience criteria", "bidder experience", "years of experience",
        ],
        "hindi": ["अनुभव", "पूर्व अनुभव"],
    },
    "solvency_certificate": {
        "keywords": [
            "solvency certificate", "solvency requirement", "bank solvency", "banker solvency certificate",
            "solvency value", "solvency criteria",
        ],
        "hindi": ["शोधन क्षमता प्रमाण पत्र", "सॉल्वेंसी प्रमाण पत्र"],
    },
    "working_capital": {
        "keywords": [
            "working capital requirement", "working capital", "fund based line of credit", "line of credit",
            "working capital value", "working capital criteria",
        ],
        "hindi": ["कार्यशील पूंजी", "वर्किंग कैपिटल"],
    },
    "net_worth": {
        "keywords": [
            "net worth requirement", "net worth value", "positive net worth", "bidder net worth",
            "minimum net worth",
        ],
        "hindi": ["नेट वर्थ", "निवल मूल्य"],
    },
    "liquidated_damages": {
        "keywords": [
            "price reduction schedule", "prs", "liquidated damages", "delay in delivery penalty",
            "prs clause", "ld percentage", "max ld percentage",
        ],
        "hindi": ["मूल्य कटौती अनुसूची", "नुकसानी"],
    },
    "payment_terms": {
        "keywords": [
            "payment terms", "terms of payment", "payment schedule", "mode of payment",
            "stage-wise payment", "payment terms supply", "payment terms installation",
        ],
        "hindi": ["भुगतान की शर्तें", "भुगतान अनुसूची"],
    },
    "maf_requirement": {
        "keywords": [
            "manufacturer authorization form", "maf required", "oem authorization",
            "manufacturer authorization", "oem authorization letter",
        ],
        "hindi": ["निर्माता प्राधिकरण पत्र"],
    },
    "courier_address": {
        "keywords": [
            "courier information", "courier address", "cut-out slip", "dealing gail's office address",
            "physical document submission address", "consignee address",
        ],
    },
    "financial_exemption": {
        "keywords": [
            "financial criteria not applicable", "financial bec not applicable", "financial criteria: not applicable",
            "relaxation of prior turnover", "financial criteria exempt",
        ],
    },
}


def get_keywords(canonical_key: str) -> List[str]:
    """Returns the English keyword synonyms registered for a canonical field."""
    return list(FIELD_REGISTRY.get(canonical_key, {}).get("keywords", []))


def get_hindi_keywords(canonical_key: str) -> List[str]:
    """Returns the Hindi keyword synonyms registered for a canonical field, if any."""
    return list(FIELD_REGISTRY.get(canonical_key, {}).get("hindi", []))


def merge_keywords(existing: List[str], canonical_key: str) -> List[str]:
    """
    Returns `existing` with any registry keywords appended that aren't already
    present (case-insensitive), preserving the original order and never
    dropping an existing entry. Used to widen an engine's own hardcoded
    keyword list with any synonyms the registry knows about but that list
    doesn't yet, without risking any behavior change to matches that already
    worked.
    """
    seen = {k.lower() for k in existing}
    merged = list(existing)
    for kw in get_keywords(canonical_key):
        if kw.lower() not in seen:
            merged.append(kw)
            seen.add(kw.lower())
    return merged
