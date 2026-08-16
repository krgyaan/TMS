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
 * for the lightbox / proof viewer.
 */
export const mapProofFiles = (files: (string | ImprestProof)[]): ProofItem[] =>
    files
        .filter((file): file is string => typeof file === "string")
        .map(file => ({
            type: isPdfFile(file) ? "pdf" : "image",
            url: imprestFileUrl(file),
            name: file,
        }));