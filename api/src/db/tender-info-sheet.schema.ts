import {
    pgTable, serial, bigint, varchar, numeric, boolean,
    timestamp, pgEnum, integer, text, index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const yesNoEnum = pgEnum("yes_no", ["YES", "NO"]);
export const emdRequiredEnum = pgEnum("emd_required", ["YES", "NO", "EXEMPT"]);

export const commercialEvaluationEnum = pgEnum("commercial_evaluation_type", [
    "ITEM_WISE_GST_INCLUSIVE",
    "ITEM_WISE_PRE_GST",
    "OVERALL_GST_INCLUSIVE",
    "OVERALL_PRE_GST"
]);

export const mafRequiredEnum = pgEnum("maf_required_type", ["YES_GENERAL", "YES_PROJECT_SPECIFIC", "NO"]);

export const pbgSdFormEnum = pgEnum("pbg_sd_form", ["DD_DEDUCTION", "FDR", "PBG", "SB", "NA"]);

export const commercialEligibilityTypeEnum = pgEnum("commercial_eligibility_type", ["NOT_APPLICABLE", "AMOUNT"]);
export const commercialCapitalTypeEnum = pgEnum("commercial_capital_type", ["NOT_APPLICABLE", "POSITIVE", "AMOUNT"]);


export const tenderInformation = pgTable("tender_information", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull().unique(),

    teRecommendation: yesNoEnum("te_recommendation").notNull(),
    teRejectionReason: integer("te_rejection_reason"),
    teRejectionRemarks: text("te_rejection_remarks"),

    processingFeeAmount: numeric("processing_fee_amount", { precision: 12, scale: 2 }),
    processingFeeMode: text("processing_fee_mode").array(),
    tenderFeeAmount: numeric("tender_fee_amount", { precision: 12, scale: 2 }),
    tenderFeeMode: text("tender_fee_mode").array(),

    emdRequired: emdRequiredEnum("emd_required"),
    emdMode: text("emd_mode").array(),

    reverseAuctionApplicable: yesNoEnum("reverse_auction_applicable"),
    paymentTermsSupply: integer("payment_terms_supply"),
    paymentTermsInstallation: integer("payment_terms_installation"),
    bidValidityDays: integer("bid_validity_days"),
    commercialEvaluation: commercialEvaluationEnum("commercial_evaluation"),
    mafRequired: mafRequiredEnum("maf_required"),

    deliveryTimeSupply: integer("delivery_time_supply"),
    deliveryTimeInstallationInclusive: boolean("delivery_time_installation_inclusive"),
    deliveryTimeInstallationDays: integer("delivery_time_installation_days"),

    pbgInFormOf: pbgSdFormEnum("pbg_in_form_of"),
    pbgPercentage: numeric("pbg_percentage", { precision: 5, scale: 2 }),
    pbgDurationMonths: integer("pbg_duration_months"),

    sdInFormOf: pbgSdFormEnum("sd_in_form_of"),
    securityDepositPercentage: numeric("security_deposit_percentage", { precision: 5, scale: 2 }),
    sdDurationMonths: integer("sd_duration_months"),

    ldPercentagePerWeek: numeric("ld_percentage_per_week", { precision: 5, scale: 2 }),
    maxLdPercentage: numeric("max_ld_percentage", { precision: 5, scale: 2 }),

    physicalDocsRequired: yesNoEnum("physical_docs_required"),
    physicalDocsDeadline: timestamp("physical_docs_deadline"),

    techEligibilityAgeYears: integer("technical_eligibility_age_years"),
    orderValue1: numeric("order_value_1", { precision: 12, scale: 2 }),
    orderValue2: numeric("order_value_2", { precision: 12, scale: 2 }),
    orderValue3: numeric("order_value_3", { precision: 12, scale: 2 }),

    avgAnnualTurnoverType: commercialEligibilityTypeEnum("avg_annual_turnover_type"),
    avgAnnualTurnoverValue: numeric("avg_annual_turnover_value", { precision: 12, scale: 2 }),

    workingCapitalType: commercialCapitalTypeEnum("working_capital_type"),
    workingCapitalValue: numeric("working_capital_value", { precision: 12, scale: 2 }),

    solvencyCertificateType: commercialEligibilityTypeEnum("solvency_certificate_type"),
    solvencyCertificateValue: numeric("solvency_certificate_value", { precision: 12, scale: 2 }),

    netWorthType: commercialCapitalTypeEnum("net_worth_type"),
    netWorthValue: numeric("net_worth_value", { precision: 12, scale: 2 }),

    clientOrganisation: varchar("client_organisation", { length: 255 }),
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


export const tenderInformationRelations = relations(tenderInformation, ({ many }) => ({
    clients: many(tenderClients),
    workOrders: many(tenderTechnicalDocuments),
    financialDocuments: many(tenderFinancialDocuments),
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
