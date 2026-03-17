import { pgTable, serial, varchar, decimal, date, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { jsonb } from 'drizzle-orm/pg-core';

// ===================== MAIN TABLES =====================
export const loanAdvances = pgTable('loan_advances', {
  id: serial('id').primaryKey(),

  // Basic loan details
  loanPartyName: varchar('loan_party_name', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  loanAccNo: varchar('loan_acc_no', { length: 100 }).notNull().unique(),
  typeOfLoan: varchar('type_of_loan', { length: 255 }).notNull(),
  loanAmount: decimal('loan_amount', { precision: 15, scale: 2 }).notNull(),

  // Dates
  sanctionLetterDate: date('sanction_letter_date').notNull(),
  emiPaymentDate: date('emi_payment_date'), // Next EMI date
  lastEmiDate: date('last_emi_date'), // Last paid EMI date

  // Document uploads
   sanctionLetter: jsonb('sanction_letter').$type<string[]>(),
  bankLoanSchedule: jsonb('bank_loan_schedule').$type<string[]>(),
  loanSchedule: text('loan_schedule'), // Google Sheet Link or file path

  // Boolean/Enum flags
  chargeMcaWebsite: varchar('charge_mca_website', { length: 10 }).notNull().default('No'),
  tdsToBeDeductedOnInterest: varchar('tds_to_be_deducted_on_interest', { length: 10 }).notNull().default('No'),

  // Closure related
  loanCloseStatus: varchar('loan_close_status', { length: 20 }).notNull().default('Active'),
  closureCreatedMca: jsonb('closure_created_mca').$type<string[]>(),
  bankNocDocument: jsonb('bank_noc_document').$type<string[]>(),

  // Computed/Cached fields (optional - can be calculated from loanDueEmis)
  principleOutstanding: decimal('principle_outstanding', { precision: 15, scale: 2 }).default('0'),
  totalInterestPaid: decimal('total_interest_paid', { precision: 15, scale: 2 }).default('0'),
  totalPenalChargesPaid: decimal('total_penal_charges_paid', { precision: 15, scale: 2 }).default('0'),
  totalTdsToRecover: decimal('total_tds_to_recover', { precision: 15, scale: 2 }).default('0'),
  noOfEmisPaid: integer('no_of_emis_paid').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bank/NBFC Contact Details
 */
export const loanBankContacts = pgTable('loan_bank_contacts', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull().references(() => loanAdvances.id, { onDelete: 'cascade' }),

  // Contact details
  orgName: varchar('org_name', { length: 255 }).notNull(), // Auto-filled from bank_name
  personName: varchar('person_name', { length: 255 }).notNull(),
  designation: varchar('designation', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Due EMIs - Records of EMI payments
 */
export const loanDueEmis = pgTable('loan_due_emis', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull().references(() => loanAdvances.id, { onDelete: 'cascade' }),

  // EMI payment details
  emiDate: date('emi_date').notNull(),
  principlePaid: decimal('principle_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  interestPaid: decimal('interest_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  tdsToBeRecovered: decimal('tds_to_be_recovered', { precision: 15, scale: 2 }).notNull().default('0'),
  penalChargesPaid: decimal('penal_charges_paid', { precision: 15, scale: 2 }).notNull().default('0'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * TDS Recoveries - Records of actual TDS recovered
 */
export const loanTdsRecoveries = pgTable('loan_tds_recoveries', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id').notNull().references(() => loanAdvances.id, { onDelete: 'cascade' }),

  // Recovery details
  tdsAmount: decimal('tds_amount', { precision: 15, scale: 2 }).notNull(),
  tdsDocument: jsonb('tds_document').$type<string[]>(),
  tdsDate: date('tds_date').notNull(),
  tdsRecoveryBankDetails: text('tds_recovery_bank_details'), // Transaction details

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ===================== RELATIONS =====================

export const loanAdvancesRelations = relations(loanAdvances, ({ many }) => ({
  bankContacts: many(loanBankContacts),
  loanDueEmis: many(loanDueEmis),
  loanTdsRecoveries: many(loanTdsRecoveries)
}));

export const loanBankContactsRelations = relations(loanBankContacts, ({ one }) => ({
  loan: one(loanAdvances, {
    fields: [loanBankContacts.loanId],
    references: [loanAdvances.id]
  })
}));

export const loanDueEmisRelations = relations(loanDueEmis, ({ one }) => ({
  loan: one(loanAdvances, {
    fields: [loanDueEmis.loanId],
    references: [loanAdvances.id]
  })
}));

export const loanTdsRecoveriesRelations = relations(loanTdsRecoveries, ({ one }) => ({
  loan: one(loanAdvances, {
    fields: [loanTdsRecoveries.loanId],
    references: [loanAdvances.id]
  })
}));

// ===================== TYPES =====================

export type LoanAdvance = typeof loanAdvances.$inferSelect;
export type NewLoanAdvance = typeof loanAdvances.$inferInsert;

export type LoanBankContact = typeof loanBankContacts.$inferSelect;
export type NewLoanBankContact = typeof loanBankContacts.$inferInsert;

export type DueEmi = typeof loanDueEmis.$inferSelect;
export type NewDueEmi = typeof loanDueEmis.$inferInsert;

export type TdsRecovery = typeof loanTdsRecoveries.$inferSelect;
export type NewTdsRecovery = typeof loanTdsRecoveries.$inferInsert;
