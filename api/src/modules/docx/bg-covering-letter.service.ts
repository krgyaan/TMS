import { Injectable } from '@nestjs/common';
import {
    AlignmentType,
    Document,
    Footer,
    Header,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from 'docx';
import { BgDocxBase } from './bg-letters.base';

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

const BASE_DIR = 'bi-dashboard/bank-guarantee/bgcovletter';

/**
 * Builds the "Submission and SFMS Confirmation of Bank Guarantee" covering
 * letter attached to the BG create-request mail.
 */
@Injectable()
export class BgCoveringLetterService extends BgDocxBase {
    async buildCoveringLetter(data: BgCoveringLetterData, instrumentId: number): Promise<string> {
        const watermark = await this.fadedWatermark();
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Calibri Light', size: 21 } } } },
            sections: [
                {
                    properties: this.sectionProperties(),
                    headers: { default: new Header({ children: this.headerChildren(watermark) }) },
                    footers: { default: new Footer({ children: this.footerChildren() }) },
                    children: this.coveringLetterBody(data),
                },
            ],
        });

        return this.save(doc, BASE_DIR, 'bgcovletter', instrumentId);
    }

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
}
