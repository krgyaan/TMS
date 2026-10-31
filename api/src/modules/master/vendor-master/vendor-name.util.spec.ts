/// <reference types="jest" />
import { formatVendorName, normalizeVendorName, isUniqueViolation } from "./vendor-name.util";

describe("vendor-name.util", () => {
    describe("formatVendorName", () => {
        it("title-cases words while preserving inner spacing", () => {
            expect(formatVendorName("  Acme Traders  ")).toBe("Acme Traders");
            expect(formatVendorName("Acme  Traders Ltd")).toBe("Acme  Traders Ltd");
            expect(formatVendorName("acme traders")).toBe("Acme Traders");
        });

        it("keeps a leading acronym exactly as typed", () => {
            expect(formatVendorName("ABC ENTERPRISES")).toBe("ABC Enterprises");
            expect(formatVendorName("ACME")).toBe("ACME");
            expect(formatVendorName("M/S. ACME TRADERS")).toBe("M/S. Acme Traders");
            expect(formatVendorName("3M INDIA PVT LTD")).toBe("3M India Pvt Ltd");
        });

        it("normalizes Private -> Pvt and Limited -> Ltd", () => {
            expect(formatVendorName("ABC PRIVATE LIMITED")).toBe("ABC Pvt Ltd");
            expect(formatVendorName("Acme private limited")).toBe("Acme Pvt Ltd");
            expect(formatVendorName("Acme PRIVATE LTD.")).toBe("Acme Pvt Ltd");
            expect(formatVendorName("Acme PVT. LIMITED")).toBe("Acme Pvt Ltd");
        });

        it("title-cases acronyms that are not the first word", () => {
            expect(formatVendorName("ABC HDFC BANK")).toBe("ABC Hdfc Bank");
        });

        it("handles punctuation inside words", () => {
            expect(formatVendorName("o'brien co-op")).toBe("O'Brien Co-Op");
        });

        it("returns an empty string for null/undefined", () => {
            expect(formatVendorName(null)).toBe("");
            expect(formatVendorName(undefined)).toBe("");
        });
    });

    describe("normalizeVendorName", () => {
        it("formats the name for persistence", () => {
            expect(normalizeVendorName("  ABC PRIVATE LIMITED  ")).toBe("ABC Pvt Ltd");
            expect(normalizeVendorName("ACME")).toBe("ACME");
        });

        it("returns an empty string for null/undefined", () => {
            expect(normalizeVendorName(null)).toBe("");
            expect(normalizeVendorName(undefined)).toBe("");
        });
    });

    describe("isUniqueViolation", () => {
        it("detects a top-level 23505 code", () => {
            expect(isUniqueViolation({ code: "23505" })).toBe(true);
        });

        it("detects a 23505 nested under cause (drizzle wrapping)", () => {
            expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
        });

        it("ignores other pg codes and non-objects", () => {
            expect(isUniqueViolation({ code: "23503" })).toBe(false);
            expect(isUniqueViolation(new Error("boom"))).toBe(false);
            expect(isUniqueViolation(null)).toBe(false);
        });
    });
});
