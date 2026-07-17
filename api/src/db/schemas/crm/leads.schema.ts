import { 
    pgTable, 
    bigint, 
    varchar, 
    text, 
    integer, 
    timestamp,
    pgEnum
} from "drizzle-orm/pg-core";

export const recentFollowUpEnum = pgEnum('recent_follow_up_type', ['visit', 'whatsapp', 'letter', 'mail', 'call']);

export const leads = pgTable("leads", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    companyName: varchar("company_name", { length: 255 }),
    name: varchar("name", { length: 255 }),
    designation: varchar("designation", { length: 255 }),
    phone: varchar("phone", { length: 255 }),
    email: varchar("email", { length: 255 }),
    address: varchar("address", { length: 255 }),
    country: varchar("country", { length: 2000 }),
    state: varchar("state", { length: 255 }),
    type: varchar("type", { length: 255 }),
    industry: varchar("industry", { length: 255 }),
    team: varchar("team", { length: 255 }),
    bdPerson: integer("bd_person"),
    allocatedTe: bigint("allocated_te", { mode: "number" }),
    allocatedBy: bigint("allocated_by", { mode: "number" }),          
    allocationNotes: text("allocation_notes"),
    allocatedAt: timestamp("allocated_at", { withTimezone: true }),
    pointsDiscussed: text("points_discussed"),
    veResponsibility: text("ve_responsibility"),
    mailFollowupCount: integer("mail_followup_count").default(0),
    callFollowupCount: integer("call_followup_count").default(0),
    visitFollowupCount: integer("visit_followup_count").default(0),
    letterSentCount: integer("letter_sent_count").default(0),
    whatsappFollowupCount: integer("whatsapp_followup_count").default(0),
    enquiryReceivedAt: timestamp("enquiry_received_at", { withTimezone: true }),
    lastMailSentAt: timestamp("last_mail_sent_at", { withTimezone: true }),
    lastCallAt: timestamp("last_call_at", { withTimezone: true }),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    lastLetterSentAt: timestamp("last_letter_sent_at", { withTimezone: true }),
    lastWhatsappSentAt: timestamp("last_whatsapp_sent_at", { withTimezone: true }),
    leadPriority: varchar("lead_priority", { length: 50 }),
    recentFollowUp: recentFollowUpEnum("recent_follow_up"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;