export const realDualDocData = {
  "extraction_version": "1.0.0",
  "fields": {
    "processingFeeAmount": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "processingFeeModes": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "tenderFeeAmount": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "tenderFeeModes": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "emdAmount": {
      "value": 200000.0,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 200000.0,
          "raw_value": "200000.0",
          "page": 5,
          "snippet": "GeM Schedule Sum: Part A: EMD Amount 100000, Part B: EMD Amount 100000",
          "confidence": 0.95,
          "status": "extracted"
        },
        "atc": null
      }
    },
    "emdRequired": {
      "value": "YES",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": true,
          "raw_value": "True",
          "page": 1,
          "snippet": "Derived from EMD total: 100000.0",
          "confidence": 0.9,
          "status": "extracted"
        },
        "atc": null
      }
    },
    "emdModes": {
      "value": [
        "Bank Transfer",
        "Demand Draft",
        "Fixed Deposit",
        "Bank Guarantee"
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "['Bank Transfer', 'Demand Draft', 'Fixed Deposit', 'Bank Guarantee']",
          "raw_value": "['Bank Transfer', 'Demand Draft', 'Fixed Deposit', 'Bank Guarantee']",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "tenderValue": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "bidValidityDays": {
      "value": 90,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 90,
          "raw_value": "90",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "commercialEvaluation": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "reverseAuctionApplicable": {
      "value": "NO",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": false,
          "raw_value": "False",
          "page": 4,
          "snippet": "Cell-pair match: Label '\u092c\u0921 \u0938\u0947 9\u0930\u0935\u0938% \u0928\u0940\u0932\u093e\u092e\u0940 \u0938'H\u092f '\u0915\u092f\u093e/Bid to RA enabled' -> Value 'No'",
          "confidence": 1.0,
          "status": "extracted"
        },
        "atc": null
      }
    },
    "mafRequired": {
      "value": "YES_GENERAL",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "YES_GENERAL",
          "raw_value": "YES_GENERAL",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "deliveryTimeSupply": {
      "value": 50,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 50,
          "raw_value": "50",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "deliveryTimeInstallationDays": {
      "value": 50,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 50,
          "raw_value": "50",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "deliveryTimeInstallationInclusive": {
      "value": true,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": true,
          "raw_value": "True",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "paymentTermsSupply": {
      "value": 100,
      "confidence": "fallback",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 100,
          "raw_value": "100",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "paymentTermsInstallation": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "pbgRequired": {
      "value": "YES",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "YES",
          "raw_value": "YES",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "pbgMode": {
      "value": [
        "Bank Guarantee"
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "['Bank Guarantee']",
          "raw_value": "['Bank Guarantee']",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "pbgPercentage": {
      "value": 5.0,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": true,
        "main_tender": {
          "value": 5.0,
          "raw_value": "5.0",
          "page": 5,
          "snippet": "Cell-pair match: Label '\u0908\u092a\u0940\u092c\u0940\u091c\u0940 ?\u093f\u0924\u0936\u0924 (%)/ePBG Percentage(%)' -> Value '5.00'",
          "confidence": 1.0,
          "status": "extracted"
        },
        "atc": {
          "value": 39.0,
          "raw_value": "39",
          "page": 34,
          "snippet": "CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT | 39. PROCEDURE",
          "confidence": 0.85,
          "status": "extracted"
        }
      }
    },
    "pbgDurationMonths": {
      "value": 19,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 19,
          "raw_value": "19",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "sdMode": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "sdPercentage": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "sdDurationMonths": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "ldPercentagePerWeek": {
      "value": 0.5,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": 0.5,
          "raw_value": "0.5",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "maxLdPercentage": {
      "value": 5.0,
      "confidence": "high",
      "source": "atc",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 5.0,
          "raw_value": "5.0",
          "page": 34,
          "snippet": "...VALUE OR CREDIT  NOTE TOWARDS PRS  50. UNIQUE DOCUMENT IDENTIFICATION NUMBER BY PRACTICING  CHARTERED A...",
          "confidence": 85.0,
          "status": "extracted"
        }
      }
    },
    "physicalDocsRequired": {
      "value": "NO",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": false,
          "raw_value": "NO",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "physicalDocsDeadline": {
      "value": "2026-01-20T14:00:00",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "2026-01-20T14:00:00",
          "raw_value": "2026-01-20T14:00:00",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "orderValue1": {
      "value": 2.0,
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "orderValue2": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "orderValue3": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "avgAnnualTurnoverType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "avgAnnualTurnoverValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "workingCapitalType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "workingCapitalValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "netWorthType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "netWorthValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "solvencyCertificateType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "solvencyCertificateValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "customEligibilityCriteria": {
      "value": "Technical Eligibility Criteria: Bidders must have executed at least one purchase order for Supply, Installation, Testing and Commissioning of air-conditioners of minimum 2.0 Ton capacity. Documentary evidence acceptable includes: (i) Copy of relevant PO with stamped delivery challan, invoice, and completion certificate from End User/Owner or their duly authorized consultant; OR (ii) Any other document clearly evidencing Supply, Installation, Testing and Commissioning of air-conditioners of the submitted purchase order. Financial Criteria: NOT APPLICABLE. All bidders are required to qualify the above BEC [Technical]. Bidders not meeting the above-mentioned criteria shall be rejected without assigning any reason.",
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "techEligibilityAge": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "technicalWorkOrders": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "commercialDocuments": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "clients": {
      "value": [
        {
          "clientName": "Dean B George",
          "clientEmail": "dgeorge@gail.co.in",
          "clientMobile": "9151402637  \nE-"
        }
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "[{'clientName': 'Dean B George', 'clientEmail': 'dgeorge@gail.co.in', 'clientMobile': '9151402637  \\nE-'}]",
          "raw_value": "[{'clientName': 'Dean B George', 'clientEmail': 'dgeorge@gail.co.in', 'clientMobile': '9151402637  \\nE-'}]",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    },
    "courierAddress": {
      "value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": false,
        "has_conflict": false,
        "main_tender": {
          "value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
          "raw_value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
          "page": 1,
          "snippet": ""
        },
        "atc": null
      }
    }
  },
  "missing_fields": [
    "tenderValue",
    "commercialEvaluation",
    "paymentTermsInstallation",
    "techEligibilityAge"
  ],
  "processing_time_ms": 25987,
  "llm_usage": {
    "role1_model": "claude-haiku-4-5-20251001",
    "role2_model": "claude-sonnet-5",
    "input_tokens": 11932,
    "output_tokens": 876,
    "cache_creation_tokens": 7231,
    "cache_read_tokens": 28924,
    "raw_tokens": 48963,
    "raw_processing_tokens": 48963,
    "total_tokens": 48963,
    "budget_weighted_tokens": 22931.4,
    "cache_hit_rate_pct": 70.8,
    "role1_retries": 0,
    "estimated_cost_usd": 0.02824,
    "stages": {
      "missing_field_fallback": {
        "call_type": "missing_field_fallback",
        "model": "claude-haiku-4-5-20251001",
        "input_tokens": 11932,
        "output_tokens": 876,
        "cache_creation_tokens": 7231,
        "cache_read_tokens": 28924,
        "total_tokens": 48963,
        "estimated_cost_usd": 0.028243,
        "calls_count": 5
      },
      "ambiguity_resolution": {
        "call_type": "ambiguity_resolution",
        "model": "claude-sonnet-5",
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "total_tokens": 0,
        "estimated_cost_usd": 0.0,
        "calls_count": 0
      }
    },
    "ambiguity_dispositions": {
      "payment_terms_supply_display": "skipped_unambiguous_layer1",
      "delivery_time_supply_display": "skipped_unambiguous_layer1",
      "delivery_time_installation_display": "skipped_unambiguous_layer1"
    }
  },
  "self_classified_atc": false,
  "has_atc": true,
  "ambiguous_field_conflicts": {
    "reference id / nit no": {
      "main_tender": "GEM/2025/B/7017046",
      "atc": "GEM/2025/B/7021103",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "Same-block colon match: '\u092c\u0921 \u0938\u0902&\u092f\u093e/Bid Number: GEM/2025/B/7017046'",
      "atc_snippet": "GeM Bid No.: GEM/2025/B/7021103"
    },
    "prod-22": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "Installation , AC 9325801021 Faridabad Terminal",
      "atc_snippet": "of Industry and Internal Trade (DPIIT). Start-ups having the \u201cCertificate of Recognition\u201d which"
    },
    "Tender Name / Title": {
      "main_tender": "1789208787800 GAIL Split Noida",
      "atc": "1789208787800 GAIL Split Noida ATC",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida",
      "atc_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida ATC"
    },
    "prod-8": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 6,
      "main_tender_snippet": "Installation CGS Meerut Installation , AC 9325801021 ToP",
      "atc_snippet": "BUILDING, HMI ROOM AND FIRE CONTROL ROOM AT KAILARAS"
    },
    "prod-23": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "9380962051 , Services Installation Faridabad Terminal",
      "atc_snippet": "do not mention Domain, in such case start-ups are also required to submit the documents for the"
    },
    "prod-3": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 2,
      "main_tender_snippet": "9380962051 , Services Installation CGS KASNA Installation ,",
      "atc_snippet": "ADMIN BUILDING, HMI ROOM AND FIRE CONTROL ROOM AT KAILARAS"
    },
    "prod-6": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 3,
      "main_tender_snippet": "SV1 Sirsal 9380962051 , Services Installation SV1 Sirsal",
      "atc_snippet": "ROOM"
    },
    "prod-10": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Air Conditioner",
      "main_tender_page": 1,
      "atc_page": 8,
      "main_tender_snippet": "9380962051 Bamheta 9380962051 , Services Installation",
      "atc_snippet": "Air Conditioner along with"
    },
    "prod-14": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Air Conditioner",
      "main_tender_page": 1,
      "atc_page": 9,
      "main_tender_snippet": "Installation SV 1A Saifpurpalla Installation , AC 9325801021",
      "atc_snippet": "2.9 Lacs for Split AC."
    },
    "prod-27": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 46,
      "main_tender_snippet": "9380962051 Jatauli 9380962051 , Services Installation",
      "atc_snippet": "(ii) Start-ups as recognized by Department of Industrial Policy and Promotion (DIPP)."
    },
    "prod-19": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "DEEPAKHERI 9380962051 , Services Installation SV3",
      "atc_snippet": "required for all Start-ups [whether Micro & Small Enterprises (MSEs) or otherwise] subject to"
    },
    "PBG Percentage": {
      "main_tender": 5.0,
      "atc": "39",
      "main_tender_page": 5,
      "atc_page": 34,
      "main_tender_snippet": "Cell-pair match: Label '\u0908\u092a\u0940\u092c\u0940\u091c\u0940 ?\u093f\u0924\u0936\u0924 (%)/ePBG Percentage(%)' -> Value '5.00'",
      "atc_snippet": "CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT | 39. PROCEDURE"
    },
    "Reference ID / NIT No": {
      "main_tender": "GEM/2025/B/7017046",
      "atc": "GEM/2025/B/7021103",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "Same-block colon match: '\u092c\u0921 \u0938\u0902&\u092f\u093e/Bid Number: GEM/2025/B/7017046'",
      "atc_snippet": "GeM Bid No.: GEM/2025/B/7021103"
    },
    "prod-26": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 2,
      "atc_page": 20,
      "main_tender_snippet": "Installation , AC 9325801021 Jatauli 9325801021 , Stablizer",
      "atc_snippet": "Construction of ports and dams & river valley projects"
    },
    "prod-21": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "9380962051 , Services Installation SV4 TALIBPUR",
      "atc_snippet": "Enterprises (MSEs) or otherwise] is to be given to those start-ups who have registered to the"
    },
    "prod-0": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "DESU 9380962051 , Services Installation DESU Installation ,",
      "atc_snippet": "ELECTRICAL ROOM IN ADMIN BUILDING, HMI"
    },
    "prod-20": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "DEEPAKHERI Installation , AC 9325801021 SV4 TALIBPUR",
      "atc_snippet": "The relaxation of prior experience and prior turnover to Start-ups [whether Micro & Small"
    },
    "prod-1": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "9380962051 Bawana 9380962051 , Services Installation",
      "atc_snippet": "ROOM AND FIRE CONTROL ROOM AT"
    },
    "prod-18": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Ups",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "Installation SV2 Khyawari Installation , AC 9325801021 SV3",
      "atc_snippet": "RELAXATION TO START-UPS IS APPLICABLE IN THIS TENDER AS FOLLOWS:"
    },
    "pbg percentage": {
      "main_tender": 5.0,
      "atc": "39",
      "main_tender_page": 5,
      "atc_page": 34,
      "main_tender_snippet": "Cell-pair match: Label '\u0908\u092a\u0940\u092c\u0940\u091c\u0940 ?\u093f\u0924\u0936\u0924 (%)/ePBG Percentage(%)' -> Value '5.00'",
      "atc_snippet": "CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT | 39. PROCEDURE"
    },
    "prod-2": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 2,
      "main_tender_snippet": "Bawana Installation , AC 9325801021 CGS KASNA",
      "atc_snippet": "SUBJECT: \u201cPROCUREMENT OF 2.0 TON SPLIT ACS FOR ELECTRICAL ROOM IN"
    },
    "prod-11": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Air Conditioner",
      "main_tender_page": 1,
      "atc_page": 8,
      "main_tender_snippet": "Bamheta Installation , AC 9325801021 DT Karanpur",
      "atc_snippet": "Offered Air Conditioner\u201d valid as on"
    },
    "f-title": {
      "main_tender": "1789208787800 GAIL Split Noida",
      "atc": "1789208787800 GAIL Split Noida ATC",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida",
      "atc_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida ATC"
    },
    "prod-25": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Electrical Accessory",
      "main_tender_page": 2,
      "atc_page": 16,
      "main_tender_snippet": "9380962051 , Services Installation SV IP Station Chhainsa",
      "atc_snippet": "In case of tie between bidders, tie breaker methodology available on GeM will be followed."
    },
    "prod-7": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 6,
      "main_tender_snippet": "Installation , AC 9325801021 CGS Meerut 9325801021 ,",
      "atc_snippet": "Description: \u201cPROCUREMENT OF 2.0 TON SPLIT ACS FOR ELECTRICAL ROOM IN ADMIN"
    },
    "prod-9": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Air Conditioner | OEM: of Offered Air Conditioner",
      "main_tender_page": 1,
      "atc_page": 8,
      "main_tender_snippet": "9380962051 , Services Installation ToP Gauna Installation ,",
      "atc_snippet": "\u201cManufacturer of Offered Air Conditioner\u201d"
    },
    "prod-4": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 3,
      "main_tender_snippet": "Installation DADRI TERMINAL Installation , AC 9325801021",
      "atc_snippet": "FOR ELECTRICAL ROOM IN ADMIN"
    },
    "prod-5": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Civil Work",
      "main_tender_page": 1,
      "atc_page": 3,
      "main_tender_snippet": "9380962051 , Services Installation IP1 Sarai Installation , AC",
      "atc_snippet": "BUILDING, HMI ROOM AND FIRE"
    },
    "f-38": {
      "main_tender": "13-01-2026 14:30:00",
      "atc": "39",
      "main_tender_page": 1,
      "atc_page": 34,
      "main_tender_snippet": "Cell-pair match: Label '\u092c\u0921 \u0916\u0941\u0932\u0928\u0947 \u0915 \u0924\u093e\u0930 \u0916/\u0938\u092e\u092f /Bid Opening Date/Time' -> Value '13-01-2026 14:30:00'",
      "atc_snippet": "CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT | 39. PROCEDURE"
    },
    "tender name / title": {
      "main_tender": "1789208787800 GAIL Split Noida",
      "atc": "1789208787800 GAIL Split Noida ATC",
      "main_tender_page": 1,
      "atc_page": 1,
      "main_tender_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida",
      "atc_snippet": "Filename Title fallback: 1789208787800 GAIL Split Noida ATC"
    },
    "prod-24": {
      "main_tender": "Name: Installation Service",
      "atc": "Name: Air Conditioner | OEM: of Offered Air Conditioner",
      "main_tender_page": 2,
      "atc_page": 11,
      "main_tender_snippet": "Installation , AC 9325801021 SV IP Station Chhainsa",
      "atc_snippet": "evidencing bidder as a \u201cManufacturer of Offered Air Conditioner\u201d valid as on the due date of"
    }
  }
};

export const realSingleAtcData = {
  "extraction_version": "1.0.0",
  "fields": {
    "processingFeeAmount": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "processingFeeModes": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "tenderFeeAmount": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "tenderFeeModes": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "emdAmount": {
      "value": 0.0,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 0.0,
          "raw_value": "0.0",
          "page": 1,
          "snippet": "No schedule EMD amounts found.",
          "confidence": 0.0,
          "status": "extracted"
        }
      }
    },
    "emdRequired": {
      "value": "NO",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": false,
          "raw_value": "False",
          "page": 1,
          "snippet": "No schedule EMD amounts found.",
          "confidence": 0.0,
          "status": "extracted"
        }
      }
    },
    "emdModes": {
      "value": [
        "Bank Transfer",
        "Demand Draft",
        "Fixed Deposit",
        "Bank Guarantee"
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "['Bank Transfer', 'Demand Draft', 'Fixed Deposit', 'Bank Guarantee']",
          "raw_value": "['Bank Transfer', 'Demand Draft', 'Fixed Deposit', 'Bank Guarantee']",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "tenderValue": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "bidValidityDays": {
      "value": 16,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 16,
          "raw_value": "16",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "commercialEvaluation": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "reverseAuctionApplicable": {
      "value": "NO",
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": false,
          "raw_value": "NO",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "mafRequired": {
      "value": "NO",
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "NO",
          "raw_value": "NO",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "deliveryTimeSupply": {
      "value": 90,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 90,
          "raw_value": "90",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "deliveryTimeInstallationDays": {
      "value": 90,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 90,
          "raw_value": "90",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "deliveryTimeInstallationInclusive": {
      "value": true,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": true,
          "raw_value": "True",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "paymentTermsSupply": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "paymentTermsInstallation": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "pbgRequired": {
      "value": "YES",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "YES",
          "raw_value": "YES",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "pbgMode": {
      "value": [
        "Bank Guarantee"
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "['Bank Guarantee']",
          "raw_value": "['Bank Guarantee']",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "pbgPercentage": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "pbgDurationMonths": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "sdMode": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "sdPercentage": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "sdDurationMonths": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "ldPercentagePerWeek": {
      "value": 0.5,
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 0.5,
          "raw_value": "0.5",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "maxLdPercentage": {
      "value": 5.0,
      "confidence": "high",
      "source": "atc",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 5.0,
          "raw_value": "5.0",
          "page": 34,
          "snippet": "...VALUE OR CREDIT  NOTE TOWARDS PRS  50. UNIQUE DOCUMENT IDENTIFICATION NUMBER BY PRACTICING  CHARTERED A...",
          "confidence": 85.0,
          "status": "extracted"
        }
      }
    },
    "physicalDocsRequired": {
      "value": "NO",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": false,
          "raw_value": "NO",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "physicalDocsDeadline": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "orderValue1": {
      "value": 500000.0,
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": 500000.0,
          "raw_value": "500000.0",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "orderValue2": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "orderValue3": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "avgAnnualTurnoverType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "avgAnnualTurnoverValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "workingCapitalType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "workingCapitalValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "netWorthType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "netWorthValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "solvencyCertificateType": {
      "value": "NOT_APPLICABLE",
      "confidence": "not_applicable",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "NOT_APPLICABLE",
          "raw_value": "NOT_APPLICABLE",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "solvencyCertificateValue": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "customEligibilityCriteria": {
      "value": "Supply, Installation, Testing and Commissioning of 2.0 Ton Split Air-Conditioners. Bidder must have executed at least one (1) purchase order for supply, installation, testing and commissioning of air-conditioners with capacity in the range of 1.5 to 2.5 tons of not less than Rs. 5.00 Lac value.",
      "confidence": "fallback",
      "source": "llm",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "Supply, Installation, Testing and Commissioning of 2.0 Ton Split Air-Conditioners. Bidder must have executed at least one (1) purchase order for supply, installation, testing and commissioning of air-conditioners with capacity in the range of 1.5 to 2.5 tons of not less than Rs. 5.00 Lac value.",
          "raw_value": "Supply, Installation, Testing and Commissioning of 2.0 Ton Split Air-Conditioners. Bidder must have executed at least one (1) purchase order for supply, installation, testing and commissioning of air-conditioners with capacity in the range of 1.5 to 2.5 tons of not less than Rs. 5.00 Lac value.",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "techEligibilityAge": {
      "value": null,
      "confidence": "missing",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "technicalWorkOrders": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "commercialDocuments": {
      "value": null,
      "confidence": "not_applicable",
      "source": null,
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": null
      }
    },
    "clients": {
      "value": [
        {
          "clientName": "Dean B George",
          "clientEmail": "dgeorge@gail.co.in",
          "clientMobile": "9151402637  \nE-"
        }
      ],
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "[{'clientName': 'Dean B George', 'clientEmail': 'dgeorge@gail.co.in', 'clientMobile': '9151402637  \\nE-'}]",
          "raw_value": "[{'clientName': 'Dean B George', 'clientEmail': 'dgeorge@gail.co.in', 'clientMobile': '9151402637  \\nE-'}]",
          "page": 1,
          "snippet": ""
        }
      }
    },
    "courierAddress": {
      "value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
      "confidence": "high",
      "source": "regex",
      "sources": {
        "self_classified_atc": true,
        "has_conflict": false,
        "main_tender": null,
        "atc": {
          "value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
          "raw_value": "GAIL (India) Limited, GAIL complex post Vijaipur, Guna District, Madhya Pradesh- 473112.",
          "page": 1,
          "snippet": ""
        }
      }
    }
  },
  "missing_fields": [
    "tenderValue",
    "commercialEvaluation",
    "paymentTermsSupply",
    "paymentTermsInstallation",
    "pbgPercentage",
    "pbgDurationMonths",
    "techEligibilityAge"
  ],
  "processing_time_ms": 17218,
  "llm_usage": {
    "role1_model": "claude-haiku-4-5-20251001",
    "role2_model": "claude-sonnet-5",
    "input_tokens": 14091,
    "output_tokens": 922,
    "cache_creation_tokens": 0,
    "cache_read_tokens": 43386,
    "raw_tokens": 58399,
    "raw_processing_tokens": 58399,
    "total_tokens": 58399,
    "budget_weighted_tokens": 19351.6,
    "cache_hit_rate_pct": 75.5,
    "role1_retries": 0,
    "estimated_cost_usd": 0.02304,
    "stages": {
      "missing_field_fallback": {
        "call_type": "missing_field_fallback",
        "model": "claude-haiku-4-5-20251001",
        "input_tokens": 14091,
        "output_tokens": 922,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 43386,
        "total_tokens": 58399,
        "estimated_cost_usd": 0.023039,
        "calls_count": 6
      },
      "ambiguity_resolution": {
        "call_type": "ambiguity_resolution",
        "model": "claude-sonnet-5",
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "total_tokens": 0,
        "estimated_cost_usd": 0.0,
        "calls_count": 0
      }
    },
    "ambiguity_dispositions": {
      "delivery_time_supply_display": "skipped_unambiguous_layer1",
      "delivery_time_installation_display": "skipped_unambiguous_layer1"
    }
  },
  "self_classified_atc": true,
  "has_atc": true,
  "ambiguous_field_conflicts": {}
};
