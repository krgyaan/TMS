import * as path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const rootDir = isProd ? 'dist' : 'src';

/**
 * PDF Generation Configuration
 */
export const PDF_CONFIG = {
    /**
     * Base directory for PDF templates
     */
    templatesBasePath: path.join(process.cwd(), rootDir, 'modules', 'pdf', 'templates'),

    /**
     * Base directory for storing generated PDFs
     */
    outputBasePath: path.join(process.cwd(), 'uploads', 'tendering', 'payment-pdfs'),

    /**
     * Puppeteer PDF generation options
     */
    puppeteerOptions: {
        format: 'A4' as const,
        printBackground: true,
        margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
        },
        preferCSSPageSize: false,
    },

    /**
     * Template type mappings
     * Maps template type identifiers to their template directories and file lists
     */
    templateTypes: {
        chqCret: {
            directory: 'dd', // DD and FDR use same templates
            templates: ['receiving'],
            storagePath: 'chqcreate',
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        },
        bg: {
            directory: 'bg',
            templates: [
                'handover',
                'indicative',
                'indicative2',
                'undertaking',
                'sfms',
                'yes-authorisation',
                'set-off',
            ],
            storagePath: 'bgpdfs',
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        },
        ddCancellation: {
            directory: 'dd',
            templates: ['dd-cancellation'],
            storagePath: 'ddcancel',
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        },
        reqExtLetter: {
            directory: 'letters',
            templates: ['req-ext-letter'],
            storagePath: 'reqext',
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        },
        reqCancelLetter: {
            directory: 'letters',
            templates: ['req-cancel-letter'],
            storagePath: 'reqcancel',
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        },
        ddFormat: {
            directory: 'dd',
            templates: ['dd-format'],
            storagePath: 'ddformat',
            paperSize: [0, 0, 900, 500], // Custom size: width=900pt, height=500pt
        },
    },

    /**
     * Browser launch options for Puppeteer
     */
    browserOptions: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ],
    },
};

/**
 * Get template path for a specific template type and name
 */
export function getTemplatePath(templateType: string, templateName: string): string {
    const typeConfig = PDF_CONFIG.templateTypes[templateType as keyof typeof PDF_CONFIG.templateTypes];
    if (!typeConfig) {
        throw new Error(`Unknown template type: ${templateType}`);
    }

    return path.join(PDF_CONFIG.templatesBasePath, typeConfig.directory, `${templateName}.hbs`);
}

/**
 * Get storage path for a template type
 */
export function getStoragePath(templateType: string): string {
    const typeConfig = PDF_CONFIG.templateTypes[templateType as keyof typeof PDF_CONFIG.templateTypes];
    if (!typeConfig) {
        throw new Error(`Unknown template type: ${templateType}`);
    }
    return typeConfig.storagePath || templateType.toLowerCase();
}

/**
 * Get paper size for a template type
 */
export function getPaperSize(templateType: string): string | { width: number; height: number } | undefined {
    const typeConfig = PDF_CONFIG.templateTypes[templateType as keyof typeof PDF_CONFIG.templateTypes];
    if (!typeConfig) {
        return undefined;
    }

    if ('paperSize' in typeConfig && Array.isArray(typeConfig.paperSize)) {
        // Custom paper size: [0, 0, width, height] in points
        const [, , width, height] = typeConfig.paperSize;
        return { width, height };
    }

    return undefined; // Use default A4
}

/**
 * Get PDF margins for a template type
 * Returns template-specific margins if configured, otherwise returns default margins
 */
export function getPdfMargins(templateType: string): { top: string; right: string; bottom: string; left: string } {
    const typeConfig = PDF_CONFIG.templateTypes[templateType as keyof typeof PDF_CONFIG.templateTypes];
    if (!typeConfig) {
        return PDF_CONFIG.puppeteerOptions.margin;
    }

    if ('margin' in typeConfig && typeConfig.margin) {
        return typeConfig.margin;
    }

    return PDF_CONFIG.puppeteerOptions.margin;
}

/**
 * Get output path for a generated PDF
 */
export function getOutputPath(
    templateType: string,
    templateName: string,
    instrumentId?: number
): string {
    const timestamp = Date.now();
    const storagePath = getStoragePath(templateType);

    // Generate filename based on Laravel pattern: {prefix}_{name}_{timestamp}.pdf
    let fileName: string;
    if (templateType === 'bg' && instrumentId) {
        fileName = `bg_${instrumentId}_${templateName}_${timestamp}.pdf`;
    } else {
        const prefix = storagePath;
        fileName = `${prefix}_${templateName}_${timestamp}.pdf`;
    }

    return path.join(PDF_CONFIG.outputBasePath, storagePath, fileName);
}

/**
 * Get relative path for database storage
 */
export function getRelativePath(
    templateType: string,
    templateName: string,
    instrumentId?: number
): string {
    const timestamp = Date.now();
    const storagePath = getStoragePath(templateType);

    // Generate filename based on Laravel pattern: {prefix}_{name}_{timestamp}.pdf
    let fileName: string;
    if (templateType === 'bg' && instrumentId) {
        fileName = `bg_${instrumentId}_${templateName}_${timestamp}.pdf`;
    } else {
        const prefix = storagePath;
        fileName = `${prefix}_${templateName}_${timestamp}.pdf`;
    }

    return `payment-pdfs/${storagePath}/${fileName}`;
}
