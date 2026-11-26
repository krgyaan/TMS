import {
    addDaysIso,
    computeEquipmentQty,
    computeItemStock,
    computeNextCleaningDue,
    generateNextCode,
    getCurrentWeekBounds,
    monthEndIso,
} from "./office-inventory.helpers";

describe("OfficeInventory helpers (exact Excel formulas)", () => {
    it("generates sequential item, equipment, and appliance codes", () => {
        expect(generateNextCode("HK", [])).toBe("HK-001");
        expect(generateNextCode("HK", ["HK-001", "HK-004", "PN-002"])).toBe("HK-005");
        expect(generateNextCode("EQ-HK", ["EQ-HK-001", "EQ-HK-002"])).toBe("EQ-HK-003");
        expect(generateNextCode("AP", ["AP-009"])).toBe("AP-010");
    });

    it("computes Item Master Current Stock and LOW STOCK status", () => {
        expect(computeItemStock(4, 3, 2, 2)).toEqual({ currentStock: 5, status: "OK" });
        expect(computeItemStock(4, 1, 3, 2)).toEqual({ currentStock: 2, status: "LOW STOCK" });
        expect(computeItemStock(4, 0, 3, 2)).toEqual({ currentStock: 1, status: "LOW STOCK" });
    });

    it("computes Equipment Register Current Qty", () => {
        expect(computeEquipmentQty(6, 2, 0)).toBe(8);
        expect(computeEquipmentQty(10, 0, 3)).toBe(7);
    });

    it("computes Pantry Appliance Next Cleaning Due across all frequencies", () => {
        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "Monthly",
                purchaseDate: "2024-06-12",
                cleaningsCount: 1,
                lastCleanedDate: "2026-07-10",
            })
        ).toBe("2026-08-09");

        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "Weekly",
                purchaseDate: "2026-01-14",
                cleaningsCount: 0,
                lastCleanedDate: null,
            })
        ).toBe("2026-01-21");

        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "Daily",
                purchaseDate: "2025-01-01",
                cleaningsCount: 2,
                lastCleanedDate: "2026-07-09",
            })
        ).toBe("2026-07-10");

        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "Fortnightly",
                purchaseDate: "2026-07-01",
                cleaningsCount: 0,
                lastCleanedDate: null,
            })
        ).toBe("2026-07-15");

        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "Quarterly",
                purchaseDate: "2026-01-01",
                cleaningsCount: 0,
                lastCleanedDate: null,
            })
        ).toBe("2026-04-01");

        expect(
            computeNextCleaningDue({
                status: "Discarded",
                cleaningFrequency: "Weekly",
                purchaseDate: "2025-01-01",
                cleaningsCount: 1,
                lastCleanedDate: "2026-07-01",
            })
        ).toBeNull();

        expect(
            computeNextCleaningDue({
                status: "In Service",
                cleaningFrequency: "As Needed",
                purchaseDate: "2025-01-01",
                cleaningsCount: 0,
                lastCleanedDate: null,
            })
        ).toBeNull();
    });

    it("computes Weekly/Monthly date ranges and Mon-Sun week bounds", () => {
        expect(addDaysIso("2026-07-06", 6)).toBe("2026-07-12");
        expect(monthEndIso("2026-02-01")).toBe("2026-02-28");
        expect(monthEndIso("2026-07-01")).toBe("2026-07-31");

        // 2026-07-15 is Wednesday -> Mon 2026-07-13 to Sun 2026-07-19
        const bounds = getCurrentWeekBounds(new Date(2026, 6, 15));
        expect(bounds.weekStart).toBe("2026-07-13");
        expect(bounds.weekEnd).toBe("2026-07-19");
    });
});
