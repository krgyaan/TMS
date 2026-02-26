import { pgTable, bigserial, bigint, varchar, date, timestamp, jsonb, boolean, decimal } from "drizzle-orm/pg-core";
import { users } from "@db/schemas/auth/users.schema";

// JSONB Type Definitions (imported/defined similarly to before)
export interface Address {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export interface EmployeeAddresses {
    current: Address;
    permanent: Address & { sameAsCurrent: boolean };
}

export interface EmergencyContact {
    contactName: string;
    relationship: string;
    phoneNumber: string;
    alternatePhone?: string;
    email?: string;
}

export interface BankDetails {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
    branchAddress?: string;
}

export interface EducationalQualification {
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    yearOfCompletion: string;
    grade?: string;
    certificateUrl?: string;
}

export interface WorkExperience {
    companyName: string;
    designation: string;
    fromDate: string;
    toDate: string;
    currentlyWorking: boolean;
    responsibilities?: string;
    experienceLetterUrl?: string;
}

export const userProfiles = pgTable("user_profiles", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),

    // Name & Identity
    firstName: varchar("first_name", { length: 255 }).notNull(),
    middleName: varchar("middle_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    employeeCode: varchar("employee_code", { length: 50 }).unique(),

    // Personal Info
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 20 }),
    maritalStatus: varchar("marital_status", { length: 50 }),
    nationality: varchar("nationality", { length: 100 }),
    personalEmail: varchar("personal_email", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    alternatePhone: varchar("alternate_phone", { length: 20 }),
    aadharNumber: varchar("aadhar_number", { length: 20 }),
    panNumber: varchar("pan_number", { length: 20 }),

    // JSON Details
    addresses: jsonb("addresses").$type<EmployeeAddresses>(),
    emergencyContacts: jsonb("emergency_contacts").$type<EmergencyContact[]>().default([]),
    bankDetails: jsonb("bank_details").$type<BankDetails>(),
    education: jsonb("education").$type<EducationalQualification[]>().default([]),
    experience: jsonb("experience").$type<WorkExperience[]>().default([]),

    // Employment
    designationId: bigint("designation_id", { mode: "number" }),
    primaryTeamId: bigint("primary_team_id", { mode: "number" }),
    employeeType: varchar("employee_type", { length: 50 }),
    employeeStatus: varchar("employee_status", { length: 50 }).default("Active"),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    reportingManagerId: bigint("reporting_manager_id", { mode: "number" }),
    workLocation: varchar("work_location", { length: 100 }),

    // Compensation
    salaryType: varchar("salary_type", { length: 50 }),
    basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }),

    // Joining & Assets (Metadata in profile, actual files/items in separate tables)
    dateOfJoining: date("date_of_joining"),
    dateOfExit: date("date_of_exit"),
    offerLetterDate: date("offer_letter_date"),
    joiningLetterIssued: boolean("joining_letter_issued").default(false),
    inductionCompleted: boolean("induction_completed").default(false),
    inductionDate: date("induction_date"),
    officialEmail: varchar("official_email", { length: 255 }),
    idCardIssued: boolean("id_card_issued").default(false),

    // App Preferences (Retained)
    image: varchar("image", { length: 255 }),
    signature: varchar("signature", { length: 255 }),
    timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
    locale: varchar("locale", { length: 10 }).notNull().default("en"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
