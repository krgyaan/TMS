import { resolveUploadRelativePath } from "./path-resolver";

describe("resolveUploadRelativePath", () => {
    it("prefixes the storage dir for a context path", () => {
        expect(resolveUploadRelativePath("follow-ups/file.pdf")).toBe("accounts/follow-ups/file.pdf");
    });

    it("keeps paths that already include a storage dir", () => {
        expect(resolveUploadRelativePath("accounts/file.pdf")).toBe("accounts/file.pdf");
        expect(resolveUploadRelativePath("bi-dashboard/bank-guarantee/bg/file.pdf")).toBe(
            "bi-dashboard/bank-guarantee/bg/file.pdf"
        );
    });

    it("uses the default context for bare filenames", () => {
        expect(resolveUploadRelativePath("file.pdf")).toBe("accounts/follow-ups/file.pdf");
    });

    it("keeps contexts whose storage dir is the context itself", () => {
        expect(resolveUploadRelativePath("courier/file.pdf")).toBe("courier/file.pdf");
    });

    it("supports a different default context", () => {
        expect(resolveUploadRelativePath("file.pdf", "lead-followups")).toBe("crm/lead-followups/file.pdf");
    });

    it("rejects path traversal", () => {
        expect(() => resolveUploadRelativePath("../secret.pdf")).toThrow("Invalid file path");
    });
});
