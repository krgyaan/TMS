/// <reference types="jest" />
import { normalizeVendorName, isUniqueViolation } from "./vendor-name.util";

describe("vendor-name.util", () => {
    describe("normalizeVendorName", () => {
        it("trims leading and trailing whitespace", () => {
            expect(normalizeVendorName("  Acme Traders  ")).toBe("Acme Traders");
        });

        it("preserves inner spacing and case", () => {
            expect(normalizeVendorName("Acme  Traders Ltd")).toBe("Acme  Traders Ltd");
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
