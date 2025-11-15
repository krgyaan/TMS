import {
    pgTable, serial, bigint, varchar, numeric, boolean,
    timestamp, pgEnum, integer, text, index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========== ENUMS ==========
export const yesNoEnum = pgEnum("yes_no", ["YES", "NO"]);
export const feeModeEnum = pgEnum("fee_mode", ["DD", "POP", "BT"]);
export const emdRequiredEnum = pgEnum("emd_required", ["YES", "NO", "EXEMPT"]);
export const emdModeEnum = pgEnum("emd_mode", ["BT", "POP", "DD", "FDR", "PBG", "SB"]);
export const reverseAuctionEnum = pgEnum("reverse_auction", ["YES", "NO"]);
export const paymentTermsEnum = pgEnum("payment_terms", ["ADVANCE", "AGAINST_DELIVERY", "CREDIT"]);
export const sdModeEnum = pgEnum("sd_mode", ["NA", "DD", "DEDUCTION", "FDR", "PBG", "SB"]);


// ========== TABLES ==========

export const tenderInformation = pgTable("tender_information", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull().unique(),

    // TE Recommendation
    teRecommendation: yesNoEnum("te_recommendation").notNull(),
    teRejectionReason: integer("te_rejection_reason"),
    teRejectionRemarks: text("te_rejection_remarks"),

    // Fees & EMD
    tenderFeeAmount: numeric("tender_fee_amount", { precision: 12, scale: 2 }),
    tenderFeeMode: feeModeEnum("tender_fee_mode"),

    emdRequired: emdRequiredEnum("emd_required"),
    emdMode: emdModeEnum("emd_mode"),

    // Reverse Auction & Payments
    reverseAuctionApplicable: reverseAuctionEnum("reverse_auction_applicable"),
    paymentTermsSupply: paymentTermsEnum("payment_terms_supply"),
    paymentTermsInstallation: paymentTermsEnum("payment_terms_installation"),

    // PBG & SD
    pbgRequired: yesNoEnum("pbg_required"),
    pbgPercentage: numeric("pbg_percentage", { precision: 5, scale: 2 }),
    pbgDurationMonths: integer("pbg_duration_months"),

    securityDepositMode: sdModeEnum("security_deposit_mode"),
    securityDepositPercentage: numeric("security_deposit_percentage", { precision: 5, scale: 2 }),
    sdDurationMonths: integer("sd_duration_months"),

    // Bid & Delivery
    bidValidityDays: integer("bid_validity_days"),
    commercialEvaluation: yesNoEnum("commercial_evaluation"),
    mafRequired: yesNoEnum("maf_required"),

    deliveryTimeSupply: integer("delivery_time_supply"),
    deliveryTimeInstallation: integer("delivery_time_installation"),

    // LD
    ldPercentagePerWeek: numeric("ld_percentage_per_week", { precision: 5, scale: 2 }),
    maxLdPercentage: numeric("max_ld_percentage", { precision: 5, scale: 2 }),

    // Physical Docs
    physicalDocsRequired: yesNoEnum("physical_docs_required"),
    physicalDocsDeadline: timestamp("physical_docs_deadline"),

    // Technical Eligibility
    techEligibilityAgeYears: integer("technical_eligibility_age_years"),

    orderValue1: numeric("order_value_1", { precision: 12, scale: 2 }),
    orderValue2: numeric("order_value_2", { precision: 12, scale: 2 }),
    orderValue3: numeric("order_value_3", { precision: 12, scale: 2 }),

    // Financial Eligibility
    avgAnnualTurnoverRequired: yesNoEnum("avg_annual_turnover_required"),
    avgAnnualTurnoverValue: numeric("avg_annual_turnover_value", { precision: 12, scale: 2 }),

    workingCapitalRequired: yesNoEnum("working_capital_required"),
    workingCapitalValue: numeric("working_capital_value", { precision: 12, scale: 2 }),

    solvencyCertificateRequired: yesNoEnum("solvency_certificate_required"),
    solvencyCertificateValue: numeric("solvency_certificate_value", { precision: 12, scale: 2 }),

    netWorthRequired: yesNoEnum("net_worth_required"),
    netWorthValue: numeric("net_worth_value", { precision: 12, scale: 2 }),

    technicalEligible: boolean("technical_eligible").default(false).notNull(),
    financialEligible: boolean("financial_eligible").default(false).notNull(),

    // Remarks
    teRemark: text("te_remark"),
    rejectionRemark: text("rejection_remark"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_info_tender_id_idx").on(table.tenderId),
    index("tender_info_created_at_idx").on(table.createdAt)
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

export const tenderPqcDocuments = pgTable("tender_pqc_documents", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    autoAttached: boolean("auto_attached").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
    index("tender_pqc_docs_tender_id_idx").on(table.tenderId)
]);

// ========== RELATIONS ==========

export const tenderInformationRelations = relations(tenderInformation, ({ many }) => ({
    clients: many(tenderClients),
    technicalDocuments: many(tenderTechnicalDocuments),
    financialDocuments: many(tenderFinancialDocuments),
    pqcDocuments: many(tenderPqcDocuments),
}));

export const tenderClientsRelations = relations(tenderClients, ({ one }) => ({
    tender: one(tenderInformation, {
        fields: [tenderClients.tenderId],
        references: [tenderInformation.tenderId],
    }),
}));

export const tenderTechnicalDocumentsRelations = relations(tenderTechnicalDocuments, ({ one }) => ({
    tender: one(tenderInformation, {
        fields: [tenderTechnicalDocuments.tenderId],
        references: [tenderInformation.tenderId],
    }),
}));

export const tenderFinancialDocumentsRelations = relations(tenderFinancialDocuments, ({ one }) => ({
    tender: one(tenderInformation, {
        fields: [tenderFinancialDocuments.tenderId],
        references: [tenderInformation.tenderId],
    }),
}));

export const tenderPqcDocumentsRelations = relations(tenderPqcDocuments, ({ one }) => ({
    tender: one(tenderInformation, {
        fields: [tenderPqcDocuments.tenderId],
        references: [tenderInformation.tenderId],
    }),
}));

// ========== TYPE EXPORTS ==========

export type TenderInformation = typeof tenderInformation.$inferSelect;
export type NewTenderInformation = typeof tenderInformation.$inferInsert;

export type TenderClient = typeof tenderClients.$inferSelect;
export type NewTenderClient = typeof tenderClients.$inferInsert;

export type TenderTechnicalDocument = typeof tenderTechnicalDocuments.$inferSelect;
export type NewTenderTechnicalDocument = typeof tenderTechnicalDocuments.$inferInsert;

export type TenderFinancialDocument = typeof tenderFinancialDocuments.$inferSelect;
export type NewTenderFinancialDocument = typeof tenderFinancialDocuments.$inferInsert;

export type TenderPqcDocument = typeof tenderPqcDocuments.$inferSelect;
export type NewTenderPqcDocument = typeof tenderPqcDocuments.$inferInsert;
