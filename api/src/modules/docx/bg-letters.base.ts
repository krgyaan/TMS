import { Logger } from '@nestjs/common';
import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeightRule,
    ImageRun,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
} from 'docx';
import { ImageWatermark } from 'docx/watermarks';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as fs from 'fs/promises';
import * as path from 'path';

export const BLACK = '000000';
export const GREY = '555555';

/** Opacity applied to the letterhead watermark (matches the PDF letters' 0.1). */
const WATERMARK_OPACITY = 0.1;

/**
 * Shared DOCX building blocks for the BG letters: A4 section setup, the
 * Volks Energie letterhead (header), the CIN/PAN/MSME footer and the watermark.
 * Both the covering-letter/prefilled-application service and the authorization
 * letter service extend this so every generated letter looks identical.
 */
export abstract class BgDocxBase {
    protected readonly logger = new Logger(this.constructor.name);
    private readonly assetsBasePath: string;
    private readonly imageCache = new Map<string, Buffer>();
    private watermarkCache: Buffer | null = null;

    constructor() {
        const isProd = process.env.NODE_ENV === 'production';
        const rootDir = isProd ? 'dist' : 'src';
        this.assetsBasePath = path.join(process.cwd(), rootDir, 'modules', 'pdf', 'assets');
    }

    // ------------------------------------------------------------ document parts

    protected sectionProperties() {
        return {
            page: {
                size: { width: 11906, height: 16838 }, // A4 in twips
                margin: {
                    top: 2286, // 1.59" — clears the letterhead
                    right: 500, // ~0.88 cm, matches the PDF letters
                    bottom: 1700,
                    left: 500,
                    header: 360,
                    footer: 600,
                },
            },
        };
    }

    protected headerChildren(watermarkData?: Buffer): Array<Paragraph | Table> {
        const logo = this.image('logo.png', { height: 56 });

        // The dark bar + orange rule are drawn as solid shaded rows with exact
        // heights: paragraph borders leave the default line-height gap between
        // the top and bottom rule, which showed up as two separated lines.
        const barRow = (height: number, fill: string) =>
            new TableRow({
                height: { value: height, rule: HeightRule.EXACT },
                children: [
                    new TableCell({
                        borders: this.noBorders(),
                        shading: { fill },
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
                    }),
                ],
            });

        return [
            // Full-width dark bar + orange rule (same as the PDF letterhead).
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: this.noBorders(),
                rows: [barRow(60, '333333'), barRow(30, 'F04E23')],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: this.noBorders(),
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.CENTER,
                                children: [
                                    new Paragraph({
                                        children: logo ? [logo] : [new TextRun({ text: ' ' })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                children: this.letterheadContact(),
                            }),
                        ],
                    }),
                ],
            }),
            // Rule under the letterhead.
            new Paragraph({
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } },
                children: [new TextRun({ text: '', size: 2 })],
            }),
            // Watermark lives in the header so it repeats on every page.
            new Paragraph({
                children: [
                    new ImageWatermark({
                        type: 'png',
                        data: watermarkData ?? this.imageData('watermark.png'),
                        transformation: this.watermarkSize(),
                        // The PNG itself is pre-faded to WATERMARK_OPACITY;
                        // Word's washout would lighten it a second time.
                        washout: false,
                    }),
                ],
            }),
        ];
    }

    private letterheadContact(): Paragraph[] {
        const contactLine = (icon: string, text: string) => {
            const iconRun = this.image(icon, { height: 10 });
            return new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [
                    ...(iconRun ? [iconRun, new TextRun({ text: ' ' })] : []),
                    new TextRun({ text, size: 15, color: '333333' }),
                ],
            });
        };

        return [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [new TextRun({ text: 'B-1/D8, 2nd floor,', size: 15, color: '333333' })],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [new TextRun({ text: 'Mohan Cooperative Industrial Estate,', size: 15, color: '333333' })],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [new TextRun({ text: 'New Delhi 110044', size: 15, color: '333333' })],
            }),
            contactLine('phone.png', '+91 9650393636, +91 9654551781'),
            contactLine('phone.png', 'Accounts: +91 8882591733'),
            contactLine('email.png', 'contact@volksenergie.in'),
            contactLine('web.png', 'www.volksenergie.in'),
        ];
    }

    protected footerChildren(): Array<Paragraph | Table> {
        const footerText = (value: string) => new TextRun({ text: value, size: 18, color: GREY });

        return [
            new Paragraph({
                spacing: { after: 40 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLACK, space: 1 } },
                children: [new TextRun({ text: '', size: 2 })],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: this.noBorders(),
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 33, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: 'CIN: ', size: 18, color: GREY, bold: true }),
                                            footerText('U40100DL2011PTC228907'),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 34, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [
                                            new TextRun({ text: 'PAN: ', size: 18, color: GREY, bold: true }),
                                            footerText('AADCV9386C'),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 33, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [
                                            new TextRun({ text: 'MSME: ', size: 18, color: GREY, bold: true }),
                                            footerText('UDYAM-DL-0900000465'),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ];
    }

    // -------------------------------------------------------------------- helpers

    protected p(
        text: string,
        options: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; spacingAfter?: number; spacingBefore?: number } = {},
    ): Paragraph {
        return new Paragraph({
            alignment: options.alignment,
            spacing: { before: options.spacingBefore, after: options.spacingAfter },
            children: [this.t(text, { bold: options.bold })],
        });
    }

    protected small(
        text: string | TextRun[],
        options: { spacingBefore?: number; spacingAfter?: number } = {},
    ): Paragraph {
        return new Paragraph({
            spacing: { before: options.spacingBefore, after: options.spacingAfter ?? 40, line: 240 },
            children: Array.isArray(text) ? text : [this.t(text, { size: 18 })],
        });
    }

    protected t(
        text: string,
        options: { bold?: boolean; size?: number; underline?: object } = {},
    ): TextRun {
        return new TextRun({
            text,
            bold: options.bold,
            size: options.size,
            underline: options.underline,
        });
    }

    protected cellBorders() {
        const border = { style: BorderStyle.SINGLE, size: 4, color: BLACK };
        return { top: border, bottom: border, left: border, right: border };
    }

    protected noBorders() {
        const border = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
    }

    private imageData(fileName: string): Buffer {
        const cached = this.imageCache.get(fileName);
        if (cached) return cached;

        // Synchronous read is fine here: assets are tiny and cached after first use.
        const buffer = readFileSync(path.join(this.assetsBasePath, fileName));
        this.imageCache.set(fileName, buffer);
        return buffer;
    }

    /**
     * Watermark image pre-faded to WATERMARK_OPACITY so it matches the PDF
     * letters (`opacity: 0.1`). `ImageWatermark` only exposes Word's binary
     * washout, so the alpha channel is scaled here instead. Cached per instance.
     */
    protected async fadedWatermark(): Promise<Buffer> {
        if (this.watermarkCache) return this.watermarkCache;

        const source = this.imageData('watermark.png');
        const { data, info } = await sharp(source)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        for (let i = 3; i < data.length; i += 4) {
            data[i] = Math.round(data[i] * WATERMARK_OPACITY);
        }

        this.watermarkCache = await sharp(data, {
            raw: { width: info.width, height: info.height, channels: 4 },
        })
            .png()
            .toBuffer();

        return this.watermarkCache;
    }

    private image(fileName: string, options: { height: number }): ImageRun | null {
        try {
            const data = this.imageData(fileName);
            const { width, height } = this.pngSize(data);
            const scaledHeight = options.height;
            const scaledWidth = Math.round((width / height) * scaledHeight);

            return new ImageRun({
                type: 'png',
                data,
                transformation: { width: scaledWidth, height: scaledHeight },
            });
        } catch (error) {
            this.logger.warn(`DOCX image ${fileName} unavailable: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    private watermarkSize(): { width: number; height: number } {
        try {
            const { width, height } = this.pngSize(this.imageData('watermark.png'));
            const targetWidth = 500;
            return { width: targetWidth, height: Math.round((height / width) * targetWidth) };
        } catch {
            return { width: 500, height: 500 };
        }
    }

    /** Reads pixel dimensions from a PNG header (IHDR). */
    private pngSize(buffer: Buffer): { width: number; height: number } {
        if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) {
            throw new Error('Not a PNG file');
        }
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    protected async save(doc: Document, baseDir: string, prefix: string, instrumentId: number): Promise<string> {
        const buffer = await Packer.toBuffer(doc);
        const fileName = `${prefix}_${instrumentId}_${randomUUID()}.docx`;
        const absoluteDir = path.join(process.cwd(), 'uploads', baseDir);
        await fs.mkdir(absoluteDir, { recursive: true });

        const absolutePath = path.join(absoluteDir, fileName);
        await fs.writeFile(absolutePath, buffer);

        const relativePath = path.posix.join(baseDir, fileName);
        this.logger.log(`Generated DOCX: ${relativePath}`);
        return relativePath;
    }
}
