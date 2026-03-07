/**
 * DTOs for PDF generation
 */

export interface PdfGenerationOptions {
    /**
     * Template type identifier ('chqCret' for DD/FDR, 'bg' for BG)
     */
    templateType: string;

    /**
     * Data to be passed to the template
     */
    data: Record<string, any>;

    /**
     * Instrument ID for file path generation
     */
    instrumentId: number;

    /**
     * Instrument type (DD, FDR, BG, etc.)
     */
    instrumentType: string;
}

export interface PdfGenerationResult {
    /**
     * Array of generated PDF file paths (relative to uploads directory)
     */
    pdfPaths: string[];

    /**
     * Array of absolute file paths
     */
    absolutePaths: string[];
}
