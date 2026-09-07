"""
GeM Platform Standard Bid Document (GEM_DOC) Concept Alias Definitions
Ground Truth Reference: GeM Standard Bid Document Layouts (Goods / Services / Works)
"""

from typing import Dict, List

MAIN_FIELD_ALIASES: Dict[str, List[str]] = {
    "pbg_percentage": [
        "PBG Percentage",
        "ePBG Percentage",
        "ePBG Detail",
        "Performance Bank Guarantee",
        "PBG %",
        "Percentage (%)",
        "pbg_percentage_display"
    ],
    "pbg_duration": [
        "PBG Duration (Months)",
        "pbg_duration_months",
        "pbg_duration",
        "Duration of ePBG required",
        "Duration of ePBG",
        "pbg_duration_display"
    ],
    "pbg_mode": [
        "PBG Mode",
        "pbg_mode",
        "pbg_mode_display"
    ],
    "sd_percentage": [
        "Security Deposit %",
        "Security Deposit Percentage",
        "SD Percentage",
        "sd_percentage",
        "sd_percentage_display"
    ],
    "sd_duration": [
        "Security Deposit Duration",
        "SD Duration (Months)",
        "sd_duration",
        "sd_duration_display"
    ],
    "sd_mode": [
        "Security Deposit Mode",
        "SD Mode",
        "sd_mode",
        "sd_mode_display"
    ],
    "payment_terms_supply": [
        "Payment Terms Supply (%)",
        "Payment Terms Supply",
        "payment_terms_supply",
        "payment_terms_supply_percent",
        "payment_terms_supply_display"
    ],
    "payment_terms_installation": [
        "Payment Terms Installation (%)",
        "Payment Terms Installation",
        "payment_terms_installation",
        "payment_terms_installation_percent",
        "payment_terms_installation_display"
    ],
    "delivery_time_supply": [
        "Delivery Time Supply (Days)",
        "Delivery Time Supply",
        "delivery_time_supply",
        "delivery_time_supply_days",
        "delivery_time_supply_display",
        "Delivery Period (In Days)",
        "Delivery Schedules",
        "Delivery Period",
        "Delivery Days",
        "Delivery Period (Days)"
    ],
    "delivery_time_installation": [
        "Delivery Time Installation (Days)",
        "Delivery Time Installation",
        "delivery_time_installation",
        "delivery_time_installation_days",
        "delivery_time_installation_display"
    ],
    "eligibility_criterion_years": [
        "Eligibility Criterion (Years)",
        "Eligibility Criterion",
        "Years of Experience",
        "Minimum Experience (Years)",
        "Years of Past Experience Required",
        "Experience Required",
        "eligibility_criterion_years"
    ],
    "bid_validity": [
        "Bid Validity (Days)",
        "Bid Validity Period",
        "Bid Validity Days",
        "Bid Validity",
        "Validity of Offer",
        "bid_validity_days"
    ],
    "emd_amount": [
        "EMD Amount",
        "Earnest Money Deposit",
        "EMD Detail",
        "EMD",
        "emd_amount",
        "emd_amount_display"
    ],
    "emd_mode": [
        "EMD Mode",
        "emd_mode",
        "emd_mode_display"
    ],
    "tender_title": [
        "Tender Name / Title",
        "Tender Name",
        "item_category",
        "similar_category",
        "Bid Title",
        "Item Title",
        "tender_name"
    ],
    "nit_number": [
        "Reference ID / NIT No",
        "bid_number",
        "tender_id",
        "Tender No",
        "Bid Number",
        "NIT No",
        "tender_id_display"
    ],
    "client_name_1": [
        "Client Contacts",
        "Client Contact Person",
        "Client Name 1",
        "client_name_1",
        "client_contact_person",
        "client_contacts",
        "Nodal Officer",
        "client_name_1_display"
    ],
    "client_email_1": [
        "Client Email",
        "Client Email 1",
        "client_email_1",
        "client_email",
        "buyer_email",
        "client_email_1_display"
    ],
    "client_phone_1": [
        "Client Phone",
        "Client Phone 1",
        "client_phone_1",
        "client_phone",
        "client_phone_1_display"
    ],
    "courier_address": [
        "Courier Address",
        "Courier Information",
        "courier_address",
        "full_courier_address_with_pincode",
        "courier_address_display"
    ],
    "custom_eligibility_criteria": [
        "Custom Eligibility Criteria",
        "custom_eligibility_criteria",
        "eligibility_executed_value",
        "required minimum executed value",
        "custom_eligibility_criteria_display"
    ],
    "ld_percentage_per_week": [
        "LD Percentage Per Week",
        "LD Percentage per Week",
        "ld_percentage_per_week",
        "prs_rate",
        "prs_ld",
        "ld_percentage_display"
    ],
    "max_ld_percentage": [
        "Max LD Percentage",
        "max_ld_percentage",
        "prs_max",
        "max_ld_percentage_display"
    ],
    "maf_required": [
        "MAF Required",
        "maf_required",
        "maf_required_display"
    ],
    "sd_required": [
        "SD Required",
        "Security Deposit Required",
        "sd_required",
        "sd_required_display"
    ],
    "pbg_required": [
        "PBG Required",
        "pbg_required",
        "pbg_required_display"
    ],
    "startup_relaxation_experience_turnover": [
        "Startup Relaxation for Years Of Experience and Turnover",
        "Startup Exemption for Years of Experience and Turnover",
        "Startup Exemption for Years Of Experience and Turnover",
        "Startup Relaxation"
    ],
    "mse_relaxation_experience_turnover": [
        "MSE Relaxation for Years of Experience and Turnover",
        "MSE Exemption for Years of Experience and Turnover",
        "MSE Relaxation"
    ],
    "mse_purchase_preference": [
        "MSE Purchase Preference",
        "MSE Purchase Preference / एमएसई खरीद वरीयता",
        "Purchase Preference to MSE"
    ],
    "mii_purchase_preference": [
        "MII Purchase Preference",
        "MII Purchase Preference / एमआईआई खरीद वरीयता",
        "Make In India Preference",
        "Preference to Make In India"
    ],
    "pre_bid_meeting": [
        "Pre-Bid Meeting Details",
        "Pre-Bid Date and Time",
        "Pre-Bid Venue",
        "pre_bid_meeting"
    ]
}
