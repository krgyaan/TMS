import { Injectable } from '@nestjs/common';
import {
    AlignmentType,
    Document,
    Footer,
    Header,
    PageBreak,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from 'docx';
import { BgDocxBase } from './bg-letters.base';

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

const BASE_DIR = 'bi-dashboard/bank-guarantee/bgprefill';

/**
 * Builds the prefilled AU Bank "Application for Bank Guarantee Issuance"
 * attached to the BG create-request mail.
 */
@Injectable()
export class BgPrefilledApplicationService extends BgDocxBase {
    async buildPrefilledApplication(data: BgPrefilledApplicationData, instrumentId: number): Promise<string> {
        const watermark = await this.fadedWatermark();
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Calibri Light', size: 20 } } } },
            sections: [
                {
                    properties: this.sectionProperties(),
                    headers: { default: new Header({ children: this.headerChildren(watermark) }) },
                    footers: { default: new Footer({ children: this.footerChildren() }) },
                    children: this.prefilledApplicationBody(data),
                },
            ],
        });

        return this.save(doc, BASE_DIR, 'bgprefill', instrumentId);
    }

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
}
