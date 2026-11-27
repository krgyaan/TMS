import { resolveFileContext } from "./index";

describe("resolveFileContext", () => {
    it("resolves registered contexts unchanged", () => {
        expect(resolveFileContext("wo-draft")).toBe("wo-draft");
        expect(resolveFileContext("emds")).toBe("emds");
    });

    it("maps legacy context aliases to their canonical context", () => {
        expect(resolveFileContext("draftWo")).toBe("wo-draft");
    });

    it("returns undefined for unknown contexts", () => {
        expect(resolveFileContext("not-a-context")).toBeUndefined();
    });
});
