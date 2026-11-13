import { Injectable, Logger } from '@nestjs/common';
import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    PageBreak,
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
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as fs from 'fs/promises';
import * as path from 'path';

export type BgCoveringLetterData = {
    date: string;
    cpName: string;
    cpDesignation: string;
    courierAddress: string;
    referenceNo: string;
    purpose: string;
    bgNo: string;
    bgDate: string;
    bgExpiryDate: string;
    claimDate: string;
    amount: string;
    teamLeaderName: string;
    teamLeaderPhone: string;
    teamLeaderEmail: string;
    accountsLeaderName: string;
    accountsLeaderPhone: string;
    accountsLeaderEmail: string;
};

export type BgPrefilledApplicationData = {
    date: string;
    bgAmount: string;
    beneficiaryName: string;
    beneficiaryAddress: string;
    bgExpiryDate: string;
    claimExpiryDate: string;
    accountNo: string;
    ifsc: string;
    uniqueCode: string;
};

const COVER_LETTER_BASE_DIR = 'bi-dashboard/bank-guarantee/bgcovletter';
const PREFILLED_BASE_DIR = 'bi-dashboard/bank-guarantee/bgprefill';

const BLACK = '000000';
const GREY = '555555';

@Injectable()
export class BgDocxService {
    private readonly logger = new Logger(BgDocxService.name);
    private readonly assetsBasePath: string;
    private readonly imageCache = new Map<string, Buffer>();

    constructor() {
        const isProd = process.env.NODE_ENV === 'production';
        const rootDir = isProd ? 'dist' : 'src';
        this.assetsBasePath = path.join(process.cwd(), rootDir, 'modules', 'pdf', 'assets');
    }

    // ---------------------------------------------------------------- public API

    /** Builds the "Submission and SFMS Confirmation of Bank Guarantee" letter. */
    async buildCoveringLetter(data: BgCoveringLetterData, instrumentId: number): Promise<string> {
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Calibri Light', size: 21 } } } },
            sections: [
                {
                    properties: this.sectionProperties(),
                    headers: { default: new Header({ children: this.headerChildren() }) },
                    footers: { default: new Footer({ children: this.footerChildren() }) },
                    children: this.coveringLetterBody(data),
                },
            ],
        });

        return this.save(doc, COVER_LETTER_BASE_DIR, 'bgcovletter', instrumentId);
    }

    /** Builds the prefilled AU Bank "Application for Bank Guarantee Issuance". */
    async buildPrefilledApplication(data: BgPrefilledApplicationData, instrumentId: number): Promise<string> {
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Calibri Light', size: 20 } } } },
            sections: [
                {
                    properties: this.sectionProperties(),
                    headers: { default: new Header({ children: this.headerChildren() }) },
                    footers: { default: new Footer({ children: this.footerChildren() }) },
                    children: this.prefilledApplicationBody(data),
                },
            ],
        });

        return this.save(doc, PREFILLED_BASE_DIR, 'bgprefill', instrumentId);
    }

    // ------------------------------------------------------------ document parts

    private sectionProperties() {
        return {
            page: {
                size: { width: 11906, height: 16838 }, // A4 in twips
                margin: {
                    top: 2286, // 1.59" — clears the letterhead
                    right: 1225, // ~2.2 cm
                    bottom: 1700,
                    left: 1225,
                    header: 360,
                    footer: 600,
                },
            },
        };
    }

    private headerChildren(): Array<Paragraph | Table> {
        const logo = this.image('logo.png', { height: 56 });

        return [
            // Full-width dark bar + orange rule (same as the PDF letterhead).
            new Paragraph({
                spacing: { after: 0 },
                border: {
                    top: { style: BorderStyle.SINGLE, size: 60, color: '333333', space: 0 },
                    bottom: { style: BorderStyle.SINGLE, size: 30, color: 'F04E23', space: 0 },
                },
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
                        data: this.imageData('watermark.png'),
                        transformation: this.watermarkSize(),
                        washout: true,
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

    private footerChildren(): Array<Paragraph | Table> {
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

    // ---------------------------------------------------------- cover letter body

    private coveringLetterBody(data: BgCoveringLetterData): Array<Paragraph | Table> {
        const addressLines = (data.courierAddress || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: this.noBorders(),
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 60, type: WidthType.PERCENTAGE },
                                children: [
                                    this.p('To,'),
                                    this.p(`${data.cpName},`),
                                    this.p(`${data.cpDesignation},`),
                                    ...addressLines.map((line) => this.p(line)),
                                ],
                            }),
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 40, type: WidthType.PERCENTAGE },
                                children: [this.p(`Date: ${data.date}`, { alignment: AlignmentType.RIGHT })],
                            }),
                        ],
                    }),
                ],
            }),
            this.p(''),
            new Paragraph({ spacing: { before: 120 }, children: [this.t('Tender No./Work Order No.: ', { bold: true }), this.t(data.referenceNo)] }),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('Subject: ', { bold: true }),
                    this.t(`Submission and SFMS Confirmation of Bank Guarantee for Tender No./Work Order No. ${data.referenceNo}`),
                ],
            }),
            new Paragraph({ spacing: { before: 120 }, children: [this.t('Dear Sir,')] }),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('We are pleased to confirm the submission of the Bank Guarantee against Tender No./Work Order No. '),
                    this.t(`${data.referenceNo}`, { bold: true }),
                    this.t(', for the purpose of '),
                    this.t(`${data.purpose}.`, { bold: true }),
                ],
            }),
            this.detailsTable([
                ['Bank Guarantee No.:', data.bgNo],
                ['Bank Guarantee Date:', data.bgDate, true],
                ['Bank Guarantee Expiry:', data.bgExpiryDate, true],
                ['Bank Guarantee Claim Period:', data.claimDate, true],
                ['Bank Guarantee Amount:', `Rs. ${data.amount}`],
            ]),
            this.p(
                'We would like to inform you that, along with the Bank Guarantee, our bank has sent an SFMS (Structured Financial Messaging System) confirmation to your bank branch as per the IFSC shared by you. The SFMS confirmation is an electronic transmission sent between banks, which is a confirmation of the authenticity of the Bank Guarantee. We request that you take the SFMS confirmation from your bank. In the meantime, we too are arranging the SFMS copy from our bank and will mail the same to you in a few days.',
                { spacingBefore: 160 },
            ),
            this.p(
                'Once the SFMS confirmation is submitted, no additional bank confirmation is required for the BG confirmation. However, if you still require a separate confirmation letter from the bank, you may contact the following Bank representatives',
                { spacingBefore: 160 },
            ),
            this.bankRepresentativesTable(),
            new Paragraph({ spacing: { before: 160 }, children: [this.t('Please contact the undersigned for any further clarification.')] }),
            new Paragraph({ spacing: { before: 120 }, children: [this.t('Best Regards,')] }),
            new Paragraph({
                spacing: { before: 220 },
                children: [this.t(data.teamLeaderName, { bold: true })],
            }),
            this.p('Team Leader', { spacingAfter: 0 }),
            this.p(data.teamLeaderPhone, { spacingAfter: 0 }),
            this.p(data.teamLeaderEmail, { spacingAfter: 0 }),
            new Paragraph({
                spacing: { before: 220 },
                children: [this.t(data.accountsLeaderName, { bold: true })],
            }),
            this.p('Accounts Leader', { spacingAfter: 0 }),
            this.p(data.accountsLeaderPhone, { spacingAfter: 0 }),
            this.p(data.accountsLeaderEmail, { spacingAfter: 0 }),
        ];
    }

    private detailsTable(rows: Array<[string, string, boolean?]>) {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
                ([label, value, boldValue]) =>
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 40, type: WidthType.PERCENTAGE },
                                children: [new Paragraph({ children: [this.t(label, { bold: true })] })],
                            }),
                            new TableCell({
                                borders: this.cellBorders(),
                                children: [new Paragraph({ children: [this.t(value, { bold: Boolean(boldValue) })] })],
                            }),
                        ],
                    }),
            ),
        });
    }

    private bankRepresentativesTable() {
        const header = ['Name', 'Designation', 'Phone No.', 'Email Id'];
        const reps = [
            ['Manish Kumar', 'Trade Desk Officer', '+91-9057042155', 'manish.kumar142@aubank.in'],
            ['Pratik Rathore', 'Product Sales Manager Trade Finance', '+91-9205172471', 'pratik.rathore@aubank.in'],
            ['Sourabh Kumar', 'Trade Forex Head', '+91-8130611897', 'kumar.sourabh@aubank.in'],
            ['BG Confirmation Team', '-', '-', 'bgconfirm_ctu@aubank.in'],
        ];

        const row = (cells: string[], isHeader = false) =>
            new TableRow({
                tableHeader: isHeader,
                children: cells.map(
                    (cell) =>
                        new TableCell({
                            borders: this.cellBorders(),
                            shading: isHeader ? { fill: 'F2F2F2' } : undefined,
                            children: [new Paragraph({ children: [this.t(cell, { bold: isHeader, size: 17 })] })],
                        }),
                ),
            });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [row(header, true), ...reps.map((rep) => row(rep))],
        });
    }

    // ------------------------------------------------------ prefilled application

    private prefilledApplicationBody(data: BgPrefilledApplicationData): Array<Paragraph | Table> {
        const addressLines = (data.beneficiaryAddress || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 200 },
                children: [this.t('APPLICATION FOR BANK GUARANTEE ISSUANCE', { bold: true, size: 24 })],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: this.noBorders(),
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 60, type: WidthType.PERCENTAGE },
                                children: [this.p('To,')],
                            }),
                            new TableCell({
                                borders: this.noBorders(),
                                width: { size: 40, type: WidthType.PERCENTAGE },
                                children: [this.p(`Date: ${data.date}`, { alignment: AlignmentType.RIGHT })],
                            }),
                        ],
                    }),
                ],
            }),
            this.p('The Branch Manager,', { spacingAfter: 0 }),
            this.p('AU Small Finance Bank,', { spacingAfter: 0 }),
            this.p('Plot No.- 24, Floor, Ring Road, Lajpat Nagar 4,', { spacingAfter: 0 }),
            this.p('Lajpat Nagar, New Delhi – 110024.', { spacingAfter: 0 }),
            new Paragraph({
                spacing: { before: 200 },
                children: [this.t('SUBJECT: FOR BANK GUARANTEE ISSUANCE:', { bold: true, underline: {} })],
            }),
            new Paragraph({ spacing: { before: 160 }, children: [this.t('Dear Sir/ Madam,', { bold: true })] }),
            new Paragraph({
                spacing: { before: 160 },
                children: [this.t('I/We hereby instruct you to Issue bank guarantee as per format enclosed as per details below')],
            }),
            new Paragraph({
                spacing: { before: 160, after: 120 },
                children: [this.t('The bank guarantee is to be issued against our limit sanctioned by the Bank.', { bold: true })],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    this.prefilledRow('1', 'Bank Guarantee(“BG”) amount', data.bgAmount, { center: true, bold: true }),
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 5, type: WidthType.PERCENTAGE },
                                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [this.t('2')] })],
                            }),
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 45, type: WidthType.PERCENTAGE },
                                children: [new Paragraph({ children: [this.t('Beneficiary Full name and address', { size: 17 })] })],
                            }),
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({ children: [this.t(data.beneficiaryName, { bold: true })] }),
                                    new Paragraph({
                                        children: addressLines.length
                                            ? addressLines.flatMap((line, index) => [
                                                ...(index === 0 ? [this.t('Add: ')] : []),
                                                this.t(line, { size: 18 }),
                                                ...(index < addressLines.length - 1 ? [new TextRun({ break: 1 })] : []),
                                            ])
                                            : [this.t(' ')],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    this.prefilledRow('3', 'BG Expiry Date', data.bgExpiryDate, { center: true, bold: true }),
                    this.prefilledRow('4', 'BG Claim Expiry Date\n(12 months from the BG Expiry Date)', data.claimExpiryDate, { center: true, bold: true }),
                    this.prefilledRow('5', 'A/c no to be debited for BG FD creation', data.accountNo, { center: true, bold: true }),
                    this.prefilledRow('6', 'FD No. (For Margin)', '', { center: true }),
                    this.prefilledRow('7', 'Applicant’s GSTIN No. (If any)', '07AADCV9396C1ZZ', { center: true, bold: true }),
                ],
            }),
            new Paragraph({
                spacing: { before: 200 },
                children: [this.t('Terms & conditions for BG issuance/amendment/extension/Renewal/text amendment:', { bold: true, underline: {} })],
            }),
            this.small(
                [
                    this.t('*We instruct you to debit charges (as applicable) and/or margin to our Current Account/Cash Credit Account/Saving Account No. '),
                    this.t(data.accountNo, { bold: true }),
                    this.t(' along with your charges. FD no. '),
                    this.t('          ', { bold: true }),
                    this.t(' for margin '),
                    this.t('@10%', { bold: true }),
                    this.t('.'),
                ],
                { spacingBefore: 160 },
            ),
            this.small('*I/We hereby agree and undertake to give such information/documents as will reasonably satisfy you about this transaction and that if I/We refuse to comply with any such requirement or make only unsatisfactory compliance therewith, the bank shall refuse in writing to undertake the transaction and shall if it has reason to believe that any contravention/evasion is contemplated by me/us, then report the matter to Reserve Bank of India.'),
            this.small('*I/We further declare that the undersigned has/have the authority to give this declaration and undertaking on behalf of the company or firm.'),
            this.small('*I/we also authorize you to mark lien on the aforesaid FD No till the BG is cancelled by the bank.'),
            this.small('*I/We have read the schedule of charges as applicable and agreed for such charges.'),
            this.small('* I/We confirm to submit to the bank the original bank guarantee for cancellation on completion of the purpose, for which BG was issued.', { spacingAfter: 240 }),

            // Page 2 — header/footer/watermark repeat automatically in Word.
            new Paragraph({ children: [new PageBreak()] }),

            this.small('* I/We understand that the beneficiary can invoke the bank guarantee up to the BG Claim Period and our liability to the bank will also be till the date bank is not discharged from its liabilities in accordance with terms of the BG.', { spacingBefore: 0 }),
            this.small('* In case the BG is open ended, I/We authorize the bank to extend the BG validity and recover charges from my account till the BG is not cancelled by the bank.'),
            this.small('* I have read and understood the terms of the sanction letter for issuance of BG limit and agreed to abide by the terms and conditions mentioned therein. I also understand that the terms and condition of sanction letter shall be applicable on the BG as well.', { spacingAfter: 200 }),
            this.small(
                [
                    this.t('DECLARATION-CUM-UNDERTAKING UNDER FEMA '),
                    this.t('(Required in case of Foreign Bank Guarantee only)', { bold: true }),
                    this.t(' I/We hereby declare that the transaction the details of which are specifically mentioned in this application does not involve, and is not designed for the purpose of any contravention or evasion of the provisions of the FEMA Act 1999 or of any rules, regulation, notification, direction or order made there under. I /We also hereby agree and undertake to give such information/documents as will reasonably satisfy you about this transaction in terms of the above declaration. I/We also understand that if I/We refuse to comply with any such requirement or make only unsatisfactory compliance therewith, the bank shall refuse in writing to undertake the transaction and shall if it has reason to believe that any contravention/evasion is contemplated by me/us report the matter to Reserve Bank of India. I/We further declare that the undersigned has/have the authority to give this declaration and undertaking on behalf of the company.'),
                ],
                { spacingAfter: 160 },
            ),
            this.small([this.t('DECLARATION '), this.t('(Required only for FCY BG)', { bold: true })]),
            this.small('I/we also declare that the transaction does not have linkage with any Specially Designated Nationals and Blocked Persons (SDN)/countries listed under OFAC in any manner. If the transaction involves linkage with any Specially Designated Nationals and Blocked Persons (SDN)/countries listed under OFAC in any manner, I/we undertake not to hold Au Small Finance Bank Ltd responsible for any of its action or inaction in respect of the OFAC-linked transactions.', { spacingAfter: 240 }),
            this.p('For and on behalf of VOLKS ENERGIE PRIVATE LIMITED', { bold: true }),
            this.p(''),
            this.p(''),
            this.p('AUTHORIZED SIGNATORY', { bold: true }),
            new Paragraph({
                spacing: { before: 120 },
                children: [this.t('Encl:', { bold: true }), this.t(' 1. Copy of BG Text')],
            }),
            new Paragraph({
                spacing: { before: 240, after: 120 },
                children: [this.t('-------------------------------+----------------------------------+-------------------------------------+-----------------', { size: 18 })],
            }),
            new Paragraph({
                indent: { left: 720 },
                children: [this.t('FOR OFFICIAL USE ONLY', { bold: true })],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    this.prefilledRow('1.', 'Beneficiary bank IFSC/Swift code/Advising Bank Details if any', data.ifsc, { bold: true, center: true }),
                    this.prefilledRow('2.', 'BG printing location', 'DELHI', { bold: true, center: true }),
                    this.prefilledRow('3.', 'Sanction Letter No.', '', {}),
                    this.prefilledRow('4.', 'BG Limit', '', {}),
                    this.prefilledRow('5.', 'Application Commission/Charges:', '', {}),
                    this.prefilledRow('6.', 'Unique Code for SFMS / Swift, if applicable', data.uniqueCode, {}),
                ],
            }),
            new Paragraph({
                spacing: { before: 360 },
                indent: { left: 1440 },
                children: [this.t('SIGNATURE OF BRANCH OFFICIAL', { bold: true })],
            }),
        ];
    }

    private prefilledRow(
        num: string,
        label: string,
        value: string,
        options: { center?: boolean; bold?: boolean },
    ): TableRow {
        const labelParagraphs = label.split('\n').map(
            (line) => new Paragraph({ children: [this.t(line, { size: 17 })] }),
        );

        return new TableRow({
            children: [
                new TableCell({
                    borders: this.cellBorders(),
                    width: { size: 5, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [this.t(num)] })],
                }),
                new TableCell({
                    borders: this.cellBorders(),
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: labelParagraphs,
                }),
                new TableCell({
                    borders: this.cellBorders(),
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                        new Paragraph({
                            alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
                            children: [this.t(value || ' ', { bold: options.bold })],
                        }),
                    ],
                }),
            ],
        });
    }

    // -------------------------------------------------------------------- helpers

    private p(
        text: string,
        options: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; spacingAfter?: number; spacingBefore?: number } = {},
    ): Paragraph {
        return new Paragraph({
            alignment: options.alignment,
            spacing: { before: options.spacingBefore, after: options.spacingAfter },
            children: [this.t(text, { bold: options.bold })],
        });
    }

    private small(
        text: string | TextRun[],
        options: { spacingBefore?: number; spacingAfter?: number } = {},
    ): Paragraph {
        return new Paragraph({
            spacing: { before: options.spacingBefore, after: options.spacingAfter ?? 40, line: 240 },
            children: Array.isArray(text) ? text : [this.t(text, { size: 18 })],
        });
    }

    private t(
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

    private cellBorders() {
        const border = { style: BorderStyle.SINGLE, size: 4, color: BLACK };
        return { top: border, bottom: border, left: border, right: border };
    }

    private noBorders() {
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

    private async save(doc: Document, baseDir: string, prefix: string, instrumentId: number): Promise<string> {
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
