import {
    pgTable,
    serial,
    bigint,
    varchar,
    text,
    numeric,
    integer,
    date,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";

export const tenderInformation = pgTable("tender_information", {
    id: serial("id").primaryKey(),

    // Linking
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),

    // Recommendation
    recommendationByTE: varchar("recommendation_by_te", { length: 5 }), // YES/NO
    recommendationReason: varchar("recommendation_reason", { length: 50 }),
    recommendationRemarks: text("recommendation_remarks"),

    // Fees and amounts
    processingFees: numeric("processing_fees", { precision: 15, scale: 2 }),
    processingFeesForm: varchar("processing_fees_form", { length: 50 }),
    tenderFees: numeric("tender_fees", { precision: 15, scale: 2 }),
    tenderFeesForm: varchar("tender_fees_form", { length: 50 }),
    emd: numeric("emd", { precision: 15, scale: 2 }),
    emdRequired: varchar("emd_required", { length: 15 }), // Yes/No/Exempt
    tenderValue: numeric("tender_value", { precision: 15, scale: 2 }),
    emdForm: varchar("emd_form", { length: 50 }), // BT, POP, DD, etc.

    // Validity & evaluation
    bidValidityDays: integer("bid_validity_days"),
    commercialEvaluation: varchar("commercial_evaluation", { length: 50 }),
    raApplicable: varchar("ra_applicable", { length: 10 }), // Yes/No
    mafRequired: varchar("maf_required", { length: 10 }), // Yes/No

    // Delivery
    deliveryTimeSupply: integer("delivery_time_supply"),
    deliveryTimeInstallation: integer("delivery_time_installation"),
    deliveryInclusiveFigure: varchar("delivery_inclusive_figure", { length: 100 }),

    // PBG / SD / LD
    pbgForm: varchar("pbg_form", { length: 50 }),
    pbgPercentage: numeric("pbg_percentage", { precision: 6, scale: 2 }),
    pbgDurationMonths: integer("pbg_duration_months"),
    securityDepositForm: varchar("sd_form", { length: 50 }),
    sdPercentage: numeric("sd_percentage", { precision: 6, scale: 2 }),
    sdDurationMonths: integer("sd_duration_months"),
    ldPerWeekPercentage: numeric("ld_per_week_percentage", { precision: 6, scale: 2 }),
    maxLdPercentage: numeric("max_ld_percentage", { precision: 6, scale: 2 }),

    // Documents & deadlines
    physicalDocsRequired: varchar("physical_docs_required", { length: 10 }),
    physicalDocsDeadline: date("physical_docs_deadline"),

    // Eligibility Criteria
    eligibilityCriterion: text("eligibility_criterion"),
    eligibilityAgeYears: integer("eligibility_age_years"),
    financialCriterion: text("financial_criterion"),

    // Work values
    workValue1: numeric("work_value_1", { precision: 15, scale: 2 }),
    workValue2: numeric("work_value_2", { precision: 15, scale: 2 }),
    workValue3: numeric("work_value_3", { precision: 15, scale: 2 }),

    // Financials
    annualAvgTurnover: numeric("annual_avg_turnover", { precision: 15, scale: 2 }),
    workingCapital: numeric("working_capital", { precision: 15, scale: 2 }),
    netWorth: numeric("net_worth", { precision: 15, scale: 2 }),
    solvencyCertificate: numeric("solvency_certificate", { precision: 15, scale: 2 }),

    // Documents (list)
    pqcDocuments: text("pqc_documents"), // comma-separated or JSON
    commercialEligibilityDocuments: text("commercial_eligibility_documents"),
    documentsSubmitted: text("documents_submitted"), // Doc1-Doc9 combined

    // Clients
    clientOrganisation: varchar("client_organisation", { length: 255 }),
    courierAddress: text("courier_address"),
    teRemark: text("te_remark"),

    // Meta
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

export type TenderInformation = typeof tenderInformation.$inferSelect;
export type NewTenderInformation = typeof tenderInformation.$inferInsert;
