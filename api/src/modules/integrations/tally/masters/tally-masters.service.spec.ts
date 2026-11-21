import type { TallyClient } from "../client/tally.client";
import { TallyLineError, TallyMasterConflict, TallyUnknownOutcome, TallyValidationError } from "../errors/tally.errors";
import type { MasterKind } from "../xml/master-xml.builder";
import type { TallyImportResult, TallyMasterRecord } from "../xml/response-parser";
import { TallyMastersService } from "./tally-masters.service";

const created: TallyImportResult = {
    created: 1,
    altered: 0,
    ignored: 0,
    errors: 0,
    cancelled: 0,
    lineErrors: [],
    alreadyExists: false,
};

interface ImportOptions {
    treatAlreadyExistsAsSuccess?: boolean;
}

function buildService() {
    const exportMasters = jest.fn<Promise<TallyMasterRecord[]>, [MasterKind]>();
    const importMasters = jest.fn<Promise<TallyImportResult>, [string[], ImportOptions?]>();
    const client = { exportMasters, importMasters } as unknown as TallyClient;

    return { service: new TallyMastersService(client), exportMasters, importMasters };
}

const records = (...items: TallyMasterRecord[]): TallyMasterRecord[] => items;

describe("TallyMastersService", () => {
    it("exists() matches names case-insensitively and normalises whitespace", async () => {
        const { service, exportMasters } = buildService();

        exportMasters.mockResolvedValue(records({ name: "Site Expenses", parent: "Indirect Expenses" }));

        await expect(service.exists("ledger", "  site   expenses ")).resolves.toBe(true);
        await expect(service.exists("ledger", "Local Conveyance")).resolves.toBe(false);
    });

    it("get() returns the canonical record", async () => {
        const { service, exportMasters } = buildService();

        exportMasters.mockResolvedValue(records({ name: "Site Expenses", parent: "Indirect Expenses" }));

        await expect(service.get("ledger", "site expenses")).resolves.toEqual({
            name: "Site Expenses",
            parent: "Indirect Expenses",
        });
    });

    it('ensure() returns "exists" without writing when the master is already present', async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValue(records({ name: "Site Expenses", parent: "Indirect Expenses" }));

        await expect(service.ensure("ledger", { name: "Site Expenses", parent: "Indirect Expenses" })).resolves.toBe("exists");
        expect(importMasters).not.toHaveBeenCalled();
    });

    it("ensure() rejects a conflicting parent", async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValue(records({ name: "Site Expenses", parent: "Direct Expenses" }));

        await expect(service.ensure("ledger", { name: "Site Expenses", parent: "Indirect Expenses" })).rejects.toBeInstanceOf(TallyMasterConflict);
        expect(importMasters).not.toHaveBeenCalled();
    });

    it("ensure() creates the master and verifies it by reading back", async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValueOnce([]).mockResolvedValueOnce(records({ name: "Site Expenses", parent: "Indirect Expenses" }));
        importMasters.mockResolvedValue(created);

        await expect(service.ensure("ledger", { name: "Site Expenses", parent: "Indirect Expenses" })).resolves.toBe("created");

        expect(importMasters).toHaveBeenCalledTimes(1);
        const [messages, options] = importMasters.mock.calls[0];

        expect(messages[0]).toContain('<LEDGER NAME="Site Expenses" ACTION="Create">');
        expect(options).toEqual({ treatAlreadyExistsAsSuccess: true });
        expect(exportMasters).toHaveBeenCalledTimes(2);
    });

    it("ensure() verifies an unknown write outcome instead of resending", async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValueOnce([]).mockResolvedValueOnce(records({ name: "Primary", parent: null }));
        importMasters.mockRejectedValue(new TallyUnknownOutcome("connection dropped mid-write"));

        await expect(service.ensure("group", { name: "Primary", parent: "Root" })).resolves.toBe("created");
        expect(importMasters).toHaveBeenCalledTimes(1);
    });

    it("ensure() rethrows unknown outcome when the master is confirmed absent", async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValue([]);
        importMasters.mockRejectedValue(new TallyUnknownOutcome("connection dropped mid-write"));

        await expect(service.ensure("ledger", { name: "X", parent: "P" })).rejects.toBeInstanceOf(TallyUnknownOutcome);
        expect(importMasters).toHaveBeenCalledTimes(1);
    });

    it("ensure() fails when Tally accepts the request but the master cannot be read back", async () => {
        const { service, exportMasters, importMasters } = buildService();

        exportMasters.mockResolvedValue([]);
        importMasters.mockResolvedValue(created);

        await expect(service.ensure("costCentre", { name: "HO/2526/VEPL/OE", parent: "Primary" })).rejects.toBeInstanceOf(TallyLineError);
    });

    it("ensure() validates name, parent and kind", async () => {
        const { service, importMasters } = buildService();

        await expect(service.ensure("ledger", { name: "   ", parent: "P" })).rejects.toBeInstanceOf(TallyValidationError);
        await expect(service.ensure("ledger", { name: "X", parent: "  " })).rejects.toBeInstanceOf(TallyValidationError);
        await expect(service.ensure("voucher" as never, { name: "X", parent: "P" })).rejects.toBeInstanceOf(TallyValidationError);
        expect(importMasters).not.toHaveBeenCalled();
    });

    it("list() validates the kind", async () => {
        const { service } = buildService();

        await expect(service.list("voucher" as never)).rejects.toBeInstanceOf(TallyValidationError);
    });
});
