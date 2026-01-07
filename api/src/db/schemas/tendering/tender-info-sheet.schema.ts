import {
    pgTable, serial, bigint, varchar, numeric, boolean,
    timestamp, integer, text, index
} from "drizzle-orm/pg-core";


export const tenderInformation = pgTable("tender_information", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull().unique(),
    oemExperience: varchar("oem_experience", { length: 5 }),
    tenderValue: numeric("tender_value", { precision: 15, scale: 2 }),
    teRecommendation: varchar("te_recommendation", { length: 5 }).notNull(),
    teRejectionReason: integer("te_rejection_reason"),
    teRejectionRemarks: text("te_rejection_remarks"),

    processingFeeRequired: varchar("processing_fee_required", { length: 5 }),
    processingFeeAmount: numeric("processing_fee_amount", { precision: 12, scale: 2 }),
    processingFeeMode: text("processing_fee_mode").array(),
    tenderFeeRequired: varchar("tender_fee_required", { length: 5 }),
    tenderFeeAmount: numeric("tender_fee_amount", { precision: 12, scale: 2 }),
    tenderFeeMode: text("tender_fee_mode").array(),
    emdRequired: varchar("emd_required", { length: 10 }),
    emdAmount: numeric("emd_amount", { precision: 12, scale: 2 }),
    emdMode: text("emd_mode").array(),

    reverseAuctionApplicable: varchar("reverse_auction_applicable", { length: 5 }),
    paymentTermsSupply: integer("payment_terms_supply"),
    paymentTermsInstallation: integer("payment_terms_installation"),
    bidValidityDays: integer("bid_validity_days"),
    commercialEvaluation: varchar("commercial_evaluation", { length: 50 }),
    mafRequired: varchar("maf_required", { length: 30 }),

    deliveryTimeSupply: integer("delivery_time_supply"),
    deliveryTimeInstallationInclusive: boolean("delivery_time_installation_inclusive"),
    deliveryTimeInstallationDays: integer("delivery_time_installation_days"),

    pbgRequired: varchar("pbg_required", { length: 5 }),
    pbgMode: varchar("pbg_mode", { length: 20 }),
    pbgPercentage: numeric("pbg_percentage", { precision: 5, scale: 2 }),
    pbgDurationMonths: integer("pbg_duration"),

    sdRequired: varchar("sd_required", { length: 5 }),
    sdMode: varchar("sd_mode", { length: 20 }),
    sdPercentage: numeric("sd_percentage", { precision: 5, scale: 2 }),
    sdDurationMonths: integer("sd_duration"),

    ldRequired: varchar("ld_required", { length: 5 }),
    ldPercentagePerWeek: numeric("ld_percentage_per_week", { precision: 5, scale: 2 }),
    maxLdPercentage: numeric("max_ld_percentage", { precision: 5, scale: 2 }),

    physicalDocsRequired: varchar("physical_docs_required", { length: 5 }),
    physicalDocsDeadline: timestamp("physical_docs_deadline"),
    techEligibilityAge: integer("technical_eligibility_age"),

    workValueType: varchar("work_value_type", { length: 20 }), // "WORKS_VALUES" | "CUSTOM"
    orderValue1: numeric("order_value_1", { precision: 12, scale: 2 }),
    orderValue2: numeric("order_value_2", { precision: 12, scale: 2 }),
    orderValue3: numeric("order_value_3", { precision: 12, scale: 2 }),
    customEligibilityCriteria: text("custom_eligibility_criteria"),

    avgAnnualTurnoverType: varchar("avg_annual_turnover_type", { length: 20 }),
    avgAnnualTurnoverValue: numeric("avg_annual_turnover_value", { precision: 12, scale: 2 }),

    workingCapitalType: varchar("working_capital_type", { length: 20 }),
    workingCapitalValue: numeric("working_capital_value", { precision: 12, scale: 2 }),

    solvencyCertificateType: varchar("solvency_certificate_type", { length: 20 }),
    solvencyCertificateValue: numeric("solvency_certificate_value", { precision: 12, scale: 2 }),

    netWorthType: varchar("net_worth_type", { length: 20 }),
    netWorthValue: numeric("net_worth_value", { precision: 12, scale: 2 }),

    clientOrganization: varchar("client_organization", { length: 255 }),
    courierAddress: text("courier_address"),

    teFinalRemark: text("te_final_remark"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_info_tender_id_idx").on(table.tenderId),
]);

export const tenderClients = pgTable("tender_clients", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    clientName: varchar("client_name", { length: 255 }),
    clientDesignation: varchar("client_designation", { length: 255 }),
    clientMobile: varchar("client_mobile", { length: 50 }),
    clientEmail: varchar("client_email", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_clients_tender_id_idx").on(table.tenderId)
]);

export const tenderTechnicalDocuments = pgTable("tender_technical_documents", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_tech_docs_tender_id_idx").on(table.tenderId)
]);

export const tenderFinancialDocuments = pgTable("tender_financial_documents", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_fin_docs_tender_id_idx").on(table.tenderId)
]);

export type TenderInformation = typeof tenderInformation.$inferSelect;
export type TenderClient = typeof tenderClients.$inferSelect;
export type TenderTechnicalDocument = typeof tenderTechnicalDocuments.$inferSelect;
export type TenderFinancialDocument = typeof tenderFinancialDocuments.$inferSelect;
