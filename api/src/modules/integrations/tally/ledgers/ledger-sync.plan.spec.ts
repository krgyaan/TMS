import { planLedgerSync, type ExistingLedger, type IncomingLedger } from "./ledger-sync.plan";

function existing(overrides: Partial<ExistingLedger> = {}): ExistingLedger {
    return {
        id: 1,
        name: "Site Expenses",
        nameNormalized: "site expenses",
        parent: "Indirect Expenses",
        guid: null,
        isActive: true,
        ...overrides,
    };
}

function incoming(overrides: Partial<IncomingLedger> = {}): IncomingLedger {
    return {
        name: "Site Expenses",
        parent: "Indirect Expenses",
        guid: null,
        ...overrides,
    };
}

describe("planLedgerSync", () => {
    it("inserts unseen ledgers", () => {
        const plan = planLedgerSync([], [incoming()]);

        expect(plan.inserts).toEqual([incoming()]);
        expect(plan.updates).toEqual([]);
        expect(plan.deactivateIds).toEqual([]);
    });

    it("updates an existing ledger matched by name", () => {
        const plan = planLedgerSync([existing()], [incoming({ parent: "Direct Expenses" })]);

        expect(plan.updates).toEqual([
            { id: 1, name: "Site Expenses", nameNormalized: "site expenses", parent: "Direct Expenses", guid: null },
        ]);
        expect(plan.inserts).toEqual([]);
    });

    it("matches by GUID and follows a rename", () => {
        const plan = planLedgerSync([existing({ guid: "g-1" })], [incoming({ name: "Site Expense", guid: "g-1" })]);

        expect(plan.updates).toEqual([
            { id: 1, name: "Site Expense", nameNormalized: "site expense", parent: "Indirect Expenses", guid: "g-1" },
        ]);
        expect(plan.conflicts).toEqual([]);
    });

    it("adopts a GUID when the existing row has none", () => {
        const plan = planLedgerSync([existing()], [incoming({ guid: "g-1" })]);

        expect(plan.updates[0].guid).toBe("g-1");
    });

    it("reports a rename that collides with another ledger", () => {
        const other = existing({ id: 2, name: "Site Expense", nameNormalized: "site expense" });
        const plan = planLedgerSync([existing({ id: 1, guid: "g-1" }), other], [incoming({ name: "Site Expense", guid: "g-1" })]);

        expect(plan.updates).toEqual([]);
        expect(plan.conflicts).toEqual([{ name: "Site Expense", reason: "renamed name collides with ledger #2" }]);
    });

    it("reports a GUID mismatch for the same name", () => {
        const plan = planLedgerSync([existing({ guid: "g-old" })], [incoming({ guid: "g-new" })]);

        expect(plan.updates).toEqual([]);
        expect(plan.conflicts[0].reason).toMatch(/GUID differs/);
    });

    it("deactivates ledgers that are absent from the export", () => {
        const plan = planLedgerSync([existing({ id: 1 }), existing({ id: 2, name: "Bank", nameNormalized: "bank" })], [incoming()]);

        expect(plan.updates.map(update => update.id)).toEqual([1]);
        expect(plan.deactivateIds).toEqual([2]);
    });

    it("rejects duplicate names in the export", () => {
        const plan = planLedgerSync([], [incoming(), incoming({ parent: "Other" })]);

        expect(plan.inserts).toHaveLength(1);
        expect(plan.conflicts).toHaveLength(1);
    });
});
