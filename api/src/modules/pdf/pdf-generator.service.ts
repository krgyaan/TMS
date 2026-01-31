import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PDF_CONFIG, getOutputPath, getRelativePath, getPaperSize } from './config/pdf-config';

@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PdfGeneratorService.name);
    private browser: Browser | null = null;
    private readonly maxRetries = 3;
    private readonly retryDelays = [1000, 2000, 4000]; // Exponential backoff in milliseconds

    async onModuleInit() {
        try {
            this.browser = await puppeteer.launch(PDF_CONFIG.browserOptions);
            this.logger.log('Puppeteer browser launched successfully');
        } catch (error) {
            this.logger.error(`Failed to launch Puppeteer browser: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - PDF generation will fail gracefully later with retry logic
        }
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close();
            this.logger.log('Puppeteer browser closed');
        }
    }

    /**
     * Generate PDFs for a given template type
     * @param templateType - Template type identifier ('chqCret' for DD/FDR, 'bg' for BG)
     * @param data - Data object to pass to templates
     * @param instrumentId - Instrument ID for file path generation
     * @param instrumentType - Instrument type (DD, FDR, BG, etc.)
     * @returns Array of relative PDF file paths
     */
    async generatePdfs(
        templateType: string,
        data: Record<string, any>,
        instrumentId: number,
        instrumentType: string
    ): Promise<string[]> {
        const typeConfig = PDF_CONFIG.templateTypes[templateType as keyof typeof PDF_CONFIG.templateTypes];
        if (!typeConfig) {
            throw new Error(`Unknown template type: ${templateType}`);
        }

        const pdfPaths: string[] = [];
        const templateDir = typeConfig.directory === 'dd' && instrumentType === 'FDR' ? 'fdr' : typeConfig.directory;

        // Ensure output directory exists (using template-specific storage path)
        const storagePath = typeConfig.storagePath || templateType.toLowerCase();
        const outputDir = path.join(PDF_CONFIG.outputBasePath, storagePath);
        await fs.mkdir(outputDir, { recursive: true });

        // Generate each template
        for (const templateName of typeConfig.templates) {
            try {
                const relativePath = await this.generateSinglePdf(
                    templateType,
                    templateName,
                    data, 
                    instrumentId,
                    templateDir
                );
                pdfPaths.push(relativePath);
                this.logger.log(`Generated PDF: ${relativePath}`);
            } catch (error) {
                this.logger.error(
                    `Failed to generate PDF ${templateName} for ${templateType} (instrument ${instrumentId}): ${error instanceof Error ? error.message : String(error)}`
                );
                // Continue with other templates even if one fails
            }
        }

        if (pdfPaths.length === 0) {
            throw new Error(`Failed to generate any PDFs for template type: ${templateType}`);
        }

        return pdfPaths;
    }

    /**
     * Generate a single PDF from a template
     */
    private async generateSinglePdf(
        templateType: string,
        templateName: string,
        data: Record<string, any>,
        instrumentId: number,
        templateDir: string
    ): Promise<string> {
        // Render template to HTML
        const html = await this.renderTemplate(templateDir, templateName, data);

        // Convert HTML to PDF with template-specific options
        const pdfBuffer = await this.htmlToPdf(html, templateType);

        // Save PDF to disk using template-specific paths
        const absolutePath = getOutputPath(templateType, templateName, instrumentId);
        const relativePath = getRelativePath(templateType, templateName, instrumentId);

        // Ensure directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // Write PDF file
        await fs.writeFile(absolutePath, pdfBuffer);

        return relativePath;
    }

    /**
     * Render Handlebars template to HTML
     */
    private async renderTemplate(
        templateDir: string,
        templateName: string,
        data: Record<string, any>
    ): Promise<string> {
        const templatePath = path.join(PDF_CONFIG.templatesBasePath, templateDir, `${templateName}.hbs`);

        try {
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const template = Handlebars.compile(templateContent);
            // Wrap data in 'data' object to match Laravel's structure
            return template({ data });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Template not found: ${templatePath}`);
            }
            throw error;
        }
    }

    /**
     * Register Handlebars helpers for PDF templates
     */
    private registerHandlebarsHelpers() {
        // Format date helper
        Handlebars.registerHelper('formatDate', (date: Date | string | null | undefined) => {
            if (!date) return 'N/A';
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        });

        // Format currency helper
        Handlebars.registerHelper('formatCurrency', (amount: number | string | null | undefined) => {
            if (amount == null) return '₹0.00';
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        });

        // Format date time helper
        Handlebars.registerHelper('formatDateTime', (date: Date | string | null | undefined) => {
            if (!date) return 'N/A';
            return new Date(date).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        });

        // Equality helper
        Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

        // Logical helpers
        Handlebars.registerHelper('or', (a: any, b: any) => a || b);
        Handlebars.registerHelper('and', (a: any, b: any) => a && b);

        // If not empty helper
        Handlebars.registerHelper('ifNotEmpty', function (this: any, value: any, options: Handlebars.HelperOptions) {
            if (value && value !== '' && value !== null && value !== undefined) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    /**
     * Ensure browser is initialized, with retry logic and lazy initialization
     * Attempts to initialize the browser if it's null, with exponential backoff retries
     */
    private async ensureBrowser(): Promise<void> {
        if (this.browser) {
            return;
        }

        this.logger.warn('Browser not initialized, attempting to initialize with retry logic...');

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                this.browser = await puppeteer.launch(PDF_CONFIG.browserOptions);
                this.logger.log(`Puppeteer browser launched successfully (attempt ${attempt + 1}/${this.maxRetries})`);
                return;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to launch Puppeteer browser (attempt ${attempt + 1}/${this.maxRetries}): ${errorMessage}`);

                if (attempt < this.maxRetries - 1) {
                    const delay = this.retryDelays[attempt];
                    this.logger.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Last attempt failed
                    const detailedError = this.buildDetailedError(errorMessage);
                    this.logger.error(`Failed to initialize Puppeteer browser after ${this.maxRetries} attempts: ${detailedError}`);
                    throw new Error(detailedError);
                }
            }
        }
    }

    /**
     * Build a detailed error message with actionable information
     */
    private buildDetailedError(originalError: string): string {
        let message = `Puppeteer browser initialization failed: ${originalError}`;

        // Check for shared library errors (missing system dependencies)
        if (
            originalError.includes('error while loading shared libraries') ||
            originalError.includes('cannot open shared object file') ||
            (originalError.includes('No such file or directory') && originalError.includes('.so'))
        ) {
            message += '\n\nMissing system dependencies detected!';
            message += '\nChrome requires system libraries that are not installed on this server.';
            message += '\n\nTo fix this issue:';
            message += '\n1. Run the installation script on your server:';
            message += '\n   sudo bash api/scripts/install-puppeteer-deps.sh';
            message += '\n\n2. Or install manually based on your Linux distribution:';
            message += '\n   Ubuntu/Debian:';
            message += '\n     sudo apt-get update && sudo apt-get install -y \\';
            message += '\n       libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \\';
            message += '\n       libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \\';
            message += '\n       libxrandr2 libasound2 libpango-1.0-0 libcairo2 \\';
            message += '\n       libatspi2.0-0 libgtk-3-0 libnss3 libxss1 libgconf-2-4';
            message += '\n\n   CentOS/RHEL/Fedora:';
            message += '\n     sudo yum install -y atk at-spi2-atk cups-libs libdrm libgbm \\';
            message += '\n       libxkbcommon libXcomposite libXdamage libXfixes libXrandr \\';
            message += '\n       alsa-lib pango cairo at-spi2-core gtk3 nss libXScrnSaver GConf2';
            message += '\n\n3. After installing dependencies, restart your application:';
            message += '\n   pm2 restart tms-api';
            message += '\n\nSee api/docs/puppeteer-setup.md for more details.';
        } else if (originalError.includes('Could not find Chrome')) {
            message += '\n\nPossible solutions:';
            message += '\n1. Run: npx puppeteer browsers install chrome';
            message += '\n2. Ensure the postinstall script ran successfully during package installation';
            message += '\n3. Check that the cache path is correctly configured';
            message += '\n4. Verify disk space is available for browser installation';
        } else if (originalError.includes('Failed to launch')) {
            message += '\n\nPossible solutions:';
            message += '\n1. Check system permissions';
            message += '\n2. Verify required system dependencies are installed (see api/docs/puppeteer-setup.md)';
            message += '\n3. Check available memory and system resources';
            message += '\n4. Ensure Chrome binary has execute permissions';
        }

        return message;
    }

    /**
     * Convert HTML to PDF using Puppeteer
     */
    private async htmlToPdf(html: string, templateType: string): Promise<Buffer> {
        // Ensure browser is initialized before use
        await this.ensureBrowser();

        if (!this.browser) {
            throw new Error('Puppeteer browser is not initialized after retry attempts');
        }

        let page: Page | null = null;
        try {
            page = await this.browser.newPage();

            // Set content
            await page.setContent(html, {
                waitUntil: 'networkidle0',
            });

            // Get PDF options - use custom paper size if specified, otherwise use default A4
            const paperSize = getPaperSize(templateType);
            const pdfOptions: any = {
                ...PDF_CONFIG.puppeteerOptions,
            };

            // Override paper size if custom size is specified
            if (paperSize && typeof paperSize === 'object' && 'width' in paperSize && 'height' in paperSize) {
                // Custom paper size in points (1 point = 1/72 inch)
                pdfOptions.width = `${paperSize.width}px`;
                pdfOptions.height = `${paperSize.height}px`;
                delete pdfOptions.format; // Remove format when using custom size
            }

            // Generate PDF
            const pdfBuffer = await page.pdf(pdfOptions);

            return Buffer.from(pdfBuffer);
        } catch (error) {
            this.logger.error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Get browser instance (for testing/debugging)
     */
    getBrowser(): Browser | null {
        return this.browser;
    }
}
