import type { ImprestTallyConfig } from "../mappings/imprest-tally.config";
import { buildVoucherSnapshot, type VoucherInput, type VoucherLineInput } from "./voucher-snapshot.builder";

const WEEK_FROM = new Date("2026-01-04T18:30:00.000Z");
const WEEK_TO = new Date("2026-01-11T18:29:59.999Z");
const MONDAY_EXPENSE = new Date("2026-01-05T06:00:00.000Z");

const config: ImprestTallyConfig = {
    employeePayableGroup: "Employee Payables",
    categoryLedgers: {
        5: { ledger: "Site Expenses", group: "Indirect Expenses" },
        6: { ledger: "Local Conveyance", group: "Indirect Expenses" },
    },
    blockedCategoryIds: [22, 8],
    employeeLedgers: {
        7: "Ravi Kumar Imprest",
    },
};

function line(overrides: Partial<VoucherLineInput> = {}): VoucherLineInput {
    return {
        imprestId: 101,
        amount: "1000.00",
        categoryId: 5,
        projectCode: "HO/2526/VEPL/OE",
        dateOfExpense: MONDAY_EXPENSE,
        approvalStatus: 1,
        ...overrides,
    };
}

function voucher(overrides: Partial<VoucherInput> = {}): VoucherInput {
    return {
        voucherId: 55,
        voucherCode: "VE/2026/V001",
        employeeId: 7,
        employeeName: "Ravi Kumar",
        amount: "1250.50",
        validFrom: WEEK_FROM,
        validTo: WEEK_TO,
        accountsSignedAt: new Date("2026-01-12T05:00:00.000Z"),
        lines: [line(), line({ imprestId: 102, amount: "250.50", categoryId: 6 })],
        ...overrides,
    };
}

function codes(snapshot: ReturnType<typeof buildVoucherSnapshot>): string[] {
    return snapshot.problems.map(problem => problem.code);
}

describe("buildVoucherSnapshot", () => {
    it("builds a postable snapshot with paise totals and cost centres", () => {
        const snapshot = buildVoucherSnapshot(config, voucher());

        expect(snapshot.postable).toBe(true);
        expect(snapshot.problems).toEqual([]);
        expect(snapshot.creditLedger).toBe("Ravi Kumar Imprest");
        expect(snapshot.creditGroup).toBe("Employee Payables");
        expect(snapshot.voucherDate).toBe("20260105");
        expect(snapshot.storedAmountPaise).toBe(125050);
        expect(snapshot.totalPaise).toBe(125050);
        expect(snapshot.lines).toEqual([
            {
                imprestId: 101,
                ledger: "Site Expenses",
                ledgerGroup: "Indirect Expenses",
                costCentre: "HO/2526/VEPL/OE",
                amountPaise: 100000,
            },
            {
                imprestId: 102,
                ledger: "Local Conveyance",
                ledgerGroup: "Indirect Expenses",
                costCentre: "HO/2526/VEPL/OE",
                amountPaise: 25050,
            },
        ]);
    });

    it("produces a stable fingerprint regardless of line order", () => {
        const forward = buildVoucherSnapshot(config, voucher());
        const reordered = buildVoucherSnapshot(config, voucher({ lines: [line({ imprestId: 102, amount: "250.50", categoryId: 6 }), line()] }));

        expect(reordered.fingerprint).toBe(forward.fingerprint);
    });

    it("changes the fingerprint when a line amount changes", () => {
        const original = buildVoucherSnapshot(config, voucher());
        const changed = buildVoucherSnapshot(config, voucher({ lines: [line(), line({ imprestId: 102, amount: "300.50", categoryId: 6 })] }));

        expect(changed.fingerprint).not.toBe(original.fingerprint);
    });

    it("blocks transfer and insurance categories", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [line({ categoryId: 22 })] }));

        expect(snapshot.postable).toBe(false);
        expect(codes(snapshot)).toContain("BLOCKED_CATEGORY");
        expect(snapshot.lines).toEqual([]);
    });

    it("blocks a category with no ledger mapping", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [line({ categoryId: 999 })] }));

        expect(codes(snapshot)).toContain("UNMAPPED_CATEGORY");
    });

    it("blocks a line without a project code", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [line({ projectCode: null })] }));

        expect(codes(snapshot)).toContain("MISSING_COST_CENTRE");
        expect(snapshot.lines).toEqual([]);
    });

    it("flags drift between the stored voucher amount and its lines", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ amount: "9999.00" }));

        expect(codes(snapshot)).toContain("AMOUNT_DRIFT");
        expect(snapshot.postable).toBe(false);
    });

    it("falls back to the employee name when no override exists", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ employeeId: 9, employeeName: "Asha Rao" }));

        expect(snapshot.creditLedger).toBe("Asha Rao");
        expect(snapshot.postable).toBe(true);
    });

    it("blocks a voucher whose employee has no usable ledger name", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ employeeId: 9, employeeName: null }));

        expect(codes(snapshot)).toContain("MISSING_EMPLOYEE_LEDGER");
    });

    it("blocks a voucher that is not signed by accounts", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ accountsSignedAt: null }));

        expect(codes(snapshot)).toContain("NOT_ACCOUNTS_SIGNED");
    });

    it("blocks a line dated outside the voucher period", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [line({ dateOfExpense: new Date("2026-02-01T06:00:00.000Z") })] }));

        expect(codes(snapshot)).toContain("DATE_OUTSIDE_PERIOD");
    });

    it("blocks a linked imprest that is no longer approved", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [line({ approvalStatus: 0 })] }));

        expect(codes(snapshot)).toContain("LINE_NOT_APPROVED");
    });

    it("blocks missing and non-positive amounts", () => {
        expect(codes(buildVoucherSnapshot(config, voucher({ lines: [line({ amount: null })] })))).toContain("MISSING_AMOUNT");
        expect(codes(buildVoucherSnapshot(config, voucher({ lines: [line({ amount: "0" })] })))).toContain("NON_POSITIVE_AMOUNT");
        expect(codes(buildVoucherSnapshot(config, voucher({ lines: [line({ amount: "1.234" })] })))).toContain("INVALID_AMOUNT");
    });

    it("flags a voucher with no linked imprests", () => {
        const snapshot = buildVoucherSnapshot(config, voucher({ lines: [], amount: "0" }));

        expect(codes(snapshot)).toContain("NO_LINES");
        expect(snapshot.postable).toBe(false);
    });
});
