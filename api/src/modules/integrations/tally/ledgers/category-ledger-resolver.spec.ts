import { deriveCategoryContext, isBusinessDevelopmentTeam, resolveAutoCategoryLedgerId, resolveEntryLedger } from "./category-ledger-resolver";

const links = { defaultLedgerId: 1, projectLedgerId: 2, businessDevelopmentLedgerId: 3, blocked: false };

describe("deriveCategoryContext", () => {
    it("uses the project team to detect BD", () => {
        expect(deriveCategoryContext({ projectId: 10, projectTeamName: "BD", employeeIsBusinessDevelopment: false })).toBe("business_development");
        expect(deriveCategoryContext({ projectId: 10, projectTeamName: "AC", employeeIsBusinessDevelopment: false })).toBe("project");
    });

    it("falls back to the employee team when there is no project", () => {
        expect(deriveCategoryContext({ projectId: null, projectTeamName: null, employeeIsBusinessDevelopment: true })).toBe("business_development");
        expect(deriveCategoryContext({ projectId: null, projectTeamName: null, employeeIsBusinessDevelopment: false })).toBe("default");
    });
});

describe("resolveAutoCategoryLedgerId", () => {
    it("applies the fallback chain", () => {
        expect(resolveAutoCategoryLedgerId(links, "business_development")).toBe(3);
        expect(resolveAutoCategoryLedgerId({ ...links, businessDevelopmentLedgerId: null }, "business_development")).toBe(2);
        expect(resolveAutoCategoryLedgerId({ ...links, businessDevelopmentLedgerId: null, projectLedgerId: null }, "business_development")).toBe(1);
        expect(resolveAutoCategoryLedgerId(links, "project")).toBe(2);
        expect(resolveAutoCategoryLedgerId({ ...links, projectLedgerId: null }, "project")).toBe(1);
        expect(resolveAutoCategoryLedgerId(links, "default")).toBe(1);
    });
});

describe("resolveEntryLedger", () => {
    it("lets a manual override win over a blocked category", () => {
        expect(resolveEntryLedger({ overrideLedgerId: 9, category: { ...links, blocked: true }, context: "project" })).toEqual({
            context: "project",
            autoLedgerId: 2,
            finalLedgerId: 9,
            source: "manual",
            blocked: false,
        });
    });

    it("blocks when there is no override and the category is blocked", () => {
        expect(resolveEntryLedger({ overrideLedgerId: null, category: { ...links, blocked: true }, context: "default" })).toMatchObject({
            finalLedgerId: null,
            blocked: true,
        });
    });

    it("uses the auto ledger when no override exists", () => {
        expect(resolveEntryLedger({ overrideLedgerId: null, category: links, context: "project" })).toMatchObject({
            finalLedgerId: 2,
            source: "auto",
            blocked: false,
        });
    });
});

describe("isBusinessDevelopmentTeam", () => {
    it("recognises the seeded names", () => {
        expect(isBusinessDevelopmentTeam("Business Development")).toBe(true);
        expect(isBusinessDevelopmentTeam("bd")).toBe(true);
        expect(isBusinessDevelopmentTeam("AC")).toBe(false);
    });
});
