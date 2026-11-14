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

export type BgAuthorizationLetterData = {
    date: string;
    /** Beneficiary / party the BG is issued for — single row in the table. */
    partyName: string;
    /** BG amount already formatted for display, e.g. "17,15,838/-". */
    bgAmount: string;
};

const AUTHORIZATION_BASE_DIR = 'bi-dashboard/bank-guarantee/bgauthletter';

/** Current/CC account the BG charges are debited from. */
const ACCOUNT_NO = '2502245699295242';
const COMPANY_NAME = 'Volks Energie Private Limited';

/**
 * Generates the "Authorization Letter for receiving of Bank Guarantee" that is
 * attached to the BG create-request mail, so the named persons can collect the
 * BG from the AU Bank branch.
 */
@Injectable()
export class BgAuthorizationLetterService extends BgDocxBase {
    async buildAuthorizationLetter(data: BgAuthorizationLetterData, instrumentId: number): Promise<string> {
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Calibri Light', size: 21 } } } },
            sections: [
                {
                    properties: this.sectionProperties(),
                    headers: { default: new Header({ children: this.headerChildren() }) },
                    footers: { default: new Footer({ children: this.footerChildren() }) },
                    children: this.authorizationLetterBody(data),
                },
            ],
        });

        return this.save(doc, AUTHORIZATION_BASE_DIR, 'bgauthletter', instrumentId);
    }

    private authorizationLetterBody(data: BgAuthorizationLetterData): Array<Paragraph | Table> {
        const headerCell = (text: string, width: number) =>
            new TableCell({
                borders: this.cellBorders(),
                width: { size: width, type: WidthType.PERCENTAGE },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [this.t(text, { bold: true })],
                    }),
                ],
            });

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
                                children: [this.p('To,', { bold: true })],
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
            this.p('Plot No.- 24, Floor, Ring Road,', { spacingAfter: 0 }),
            this.p('Lajpat Nagar 4, Lajpat Nagar, New Delhi – 110024.', { spacingAfter: 0 }),
            this.p(''),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('Subject', { bold: true }),
                    this.t(' – Authorization Letter for receiving of Bank Guarantee from Au Small Finance Bank Limited.'),
                ],
            }),
            this.p(''),
            new Paragraph({ spacing: { before: 120 }, children: [this.t('Dear Sir,', { bold: true })] }),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('We are maintaining Current/CC account no. '),
                    this.t(ACCOUNT_NO, { bold: true }),
                    this.t(` in the name of M/s ${COMPANY_NAME}. We hereby authorize the following persons to receive the following bank guarantee, from you on our behalf.`),
                ],
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            headerCell('SI No.', 15),
                            headerCell('Party’s Name', 60),
                            headerCell('BG Amount', 25),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 15, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [this.t('1.')],
                                    }),
                                ],
                            }),
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 60, type: WidthType.PERCENTAGE },
                                children: [new Paragraph({ children: [this.t(data.partyName || ' ')] })],
                            }),
                            new TableCell({
                                borders: this.cellBorders(),
                                width: { size: 25, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [this.t(data.bgAmount || ' ')],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
            this.p(''),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('Name Of Authorized Person: '),
                    this.t('                              ——', { bold: true }),
                    this.t('     (Aadhaar No.: —— —— ——).'),
                ],
            }),
            this.p(''),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('Kindly handover the above-mentioned documents pertaining to our company to the above-mentioned employees/representatives at our risk and responsibility.'),
                ],
            }),
            this.p(''),
            new Paragraph({ spacing: { before: 120 }, children: [this.t('Thanking You.', { bold: true })] }),
            new Paragraph({
                spacing: { before: 120 },
                children: [this.t('For ', { bold: true }), this.t(COMPANY_NAME)],
            }),
            this.p(''),
            this.p(''),
            this.p(''),
            this.p('Authorized Signatory'),
            new Paragraph({
                spacing: { before: 120 },
                children: [
                    this.t('Encl:', { bold: true }),
                    this.t(' Self attested copy of Valid ID cards with photo as mentioned above:'),
                ],
            }),
        ];
    }
}
