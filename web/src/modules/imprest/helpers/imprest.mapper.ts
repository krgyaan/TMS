import type { ImprestProof, ProofItem } from "./imprest.types";
import { fileUploadService } from "@/services/api/file-upload.service";

const UPLOADS_BASE_URL = (import.meta.env.VITE_UPLOADS_URL as string | undefined) || "/uploads/employee-imprest";

/** Build the full URL for an uploaded imprest proof file. */
export const imprestFileUrl = (file: string): string => {
    if (file.includes("/")) return fileUploadService.getFileUrl(file);
    return `${UPLOADS_BASE_URL}/${file}`;
};

export const isPdfFile = (file: string): boolean => file.toLowerCase().endsWith(".pdf");

/** Classify a proof filename for preview rendering. */
export const getFileType = (filename: string): "image" | "pdf" | "document" => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "")) return "image";
    if (ext === "pdf") return "pdf";
    return "document";
};

/**
 * Backend stores proofs as filenames; normalize them into ProofItems
 * for the lightbox / proof viewer. Also tolerates legacy object entries.
 */
export const mapProofFiles = (files: (string | ImprestProof)[]): ProofItem[] =>
    (Array.isArray(files) ? files : [])
        .map(file => {
            if (typeof file === "string") {
                const kind = getFileType(file);

                return {
                    type: kind === "document" ? "file" : kind,
                    url: imprestFileUrl(file),
                    name: file,
                } as ProofItem;
            }

            const name = file?.name || file?.url || "Document";
            const kind = file?.type || getFileType(name);

            return {
                type: kind === "document" ? "file" : kind,
                url: file?.url || imprestFileUrl(name),
                name,
            } as ProofItem;
        })
        .filter(proof => Boolean(proof.url));