import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    tenderInformation,
    tenderClients,
    tenderTechnicalDocuments,
    tenderFinancialDocuments,
    tenderPqcDocuments,
    type TenderInformation as TenderInformationRow,
    type TenderClient as TenderClientRow,
    type TenderTechnicalDocument,
    type TenderFinancialDocument,
    type TenderPqcDocument,
} from '../../../db/tender-info-sheet.schema';
import { TenderInfosService } from '../tenders/tenders.service';
import type { TenderInfoSheetPayload } from './dto/info-sheet.dto';

export interface TenderInfoSheetClient {
    id: number;
    clientName: string | null;
    clientDesignation: string | null;
    clientMobile: string | null;
    clientEmail: string | null;
}

export interface TenderInfoSheetDetails {
    id: number;
    tenderId: number;

    teRecommendation: 'YES' | 'NO';
    teRejectionReason: number | null;
    teRejectionRemarks: string | null;
    teRemark: string | null;

    tenderFeeAmount: number | null;
    tenderFeeMode: 'DD' | 'POP' | 'BT' | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdMode: 'BT' | 'POP' | 'DD' | 'FDR' | 'PBG' | 'SB' | null;

    reverseAuctionApplicable: 'YES' | 'NO' | null;
    paymentTermsSupply: 'ADVANCE' | 'AGAINST_DELIVERY' | 'CREDIT' | null;
    paymentTermsInstallation: 'ADVANCE' | 'AGAINST_DELIVERY' | 'CREDIT' | null;

    pbgRequired: 'YES' | 'NO' | null;
    pbgPercentage: number | null;
    pbgDurationMonths: number | null;

    securityDepositMode: 'NA' | 'DD' | 'DEDUCTION' | 'FDR' | 'PBG' | 'SB' | null;
    securityDepositPercentage: number | null;
    sdDurationMonths: number | null;

    bidValidityDays: number | null;
    commercialEvaluation: 'YES' | 'NO' | null;
    mafRequired: 'YES' | 'NO' | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallation: number | null;

    ldPercentagePerWeek: number | null;
    maxLdPercentage: number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | null;

    techEligibilityAgeYears: number | null;
    orderValue1: number | null;
    orderValue2: number | null;
    orderValue3: number | null;

    avgAnnualTurnoverRequired: 'YES' | 'NO' | null;
    avgAnnualTurnoverValue: number | null;

    workingCapitalRequired: 'YES' | 'NO' | null;
    workingCapitalValue: number | null;

    solvencyCertificateRequired: 'YES' | 'NO' | null;
    solvencyCertificateValue: number | null;

    netWorthRequired: 'YES' | 'NO' | null;
    netWorthValue: number | null;

    technicalEligible: boolean;
    financialEligible: boolean;

    rejectionRemark: string | null;

    clients: TenderInfoSheetClient[];
    technicalDocuments: string[];
    financialDocuments: string[];
    pqcDocuments: string[];

    createdAt: string;
    updatedAt: string;
}

@Injectable()
export class TenderInfoSheetsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
    ) { }

    async findByTenderId(tenderId: number): Promise<TenderInfoSheetDetails> {
        const [info] = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (!info) {
            throw new NotFoundException('Info sheet not found');
        }

        const [clients, technicalDocs, financialDocs, pqcDocs] = await Promise.all([
            this.db.select().from(tenderClients).where(eq(tenderClients.tenderId, tenderId)),
            this.db.select().from(tenderTechnicalDocuments).where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
            this.db.select().from(tenderFinancialDocuments).where(eq(tenderFinancialDocuments.tenderId, tenderId)),
            this.db.select().from(tenderPqcDocuments).where(eq(tenderPqcDocuments.tenderId, tenderId)),
        ]);

        return this.hydrateInfoSheet(info, clients, technicalDocs, financialDocs, pqcDocs);
    }

    async create(tenderId: number, payload: TenderInfoSheetPayload): Promise<TenderInfoSheetDetails> {
        await this.ensureTenderExists(tenderId);

        const existing = await this.db
            .select({ id: tenderInformation.id })
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (existing.length) {
            throw new ConflictException('Info sheet already exists for this tender');
        }

        await this.db.transaction(async (tx) => {
            await tx.insert(tenderInformation).values(this.buildInfoRecord(tenderId, payload));
            await this.replaceClients(tx, tenderId, payload.clients);
            await this.replaceDocuments(tx, tenderId, payload);
        });

        return this.findByTenderId(tenderId);
    }

    private async ensureTenderExists(tenderId: number) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) {
            throw new NotFoundException('Tender not found');
        }
    }

    private toNumericString(value?: number | null) {
        if (value === null || value === undefined) return null;
        return value.toString();
    }

    private buildInfoRecord(tenderId: number, payload: TenderInfoSheetPayload) {
        const toDate = (value?: string) => {
            if (!value) return null;
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        };

        return {
            tenderId,
            teRecommendation: payload.teRecommendation,
            teRejectionReason: payload.teRejectionReason ?? null,
            teRejectionRemarks: payload.teRejectionRemarks ?? null,
            teRemark: payload.teRemark ?? null,
            tenderFeeAmount: this.toNumericString(payload.tenderFeeAmount),
            tenderFeeMode: payload.tenderFeeMode ?? null,
            emdRequired: payload.emdRequired ?? null,
            emdMode: payload.emdMode ?? null,
            reverseAuctionApplicable: payload.reverseAuctionApplicable ?? null,
            paymentTermsSupply: payload.paymentTermsSupply ?? null,
            paymentTermsInstallation: payload.paymentTermsInstallation ?? null,
            pbgRequired: payload.pbgRequired ?? null,
            pbgPercentage: this.toNumericString(payload.pbgPercentage),
            pbgDurationMonths: payload.pbgDurationMonths ?? null,
            securityDepositMode: payload.securityDepositMode ?? null,
            securityDepositPercentage: this.toNumericString(payload.securityDepositPercentage),
            sdDurationMonths: payload.sdDurationMonths ?? null,
            bidValidityDays: payload.bidValidityDays ?? null,
            commercialEvaluation: payload.commercialEvaluation ?? null,
            mafRequired: payload.mafRequired ?? null,
            deliveryTimeSupply: payload.deliveryTimeSupply ?? null,
            deliveryTimeInstallation: payload.deliveryTimeInstallation ?? null,
            ldPercentagePerWeek: this.toNumericString(payload.ldPercentagePerWeek),
            maxLdPercentage: this.toNumericString(payload.maxLdPercentage),
            physicalDocsRequired: payload.physicalDocsRequired ?? null,
            physicalDocsDeadline: toDate(payload.physicalDocsDeadline),
            techEligibilityAgeYears: payload.techEligibilityAgeYears ?? null,
            orderValue1: this.toNumericString(payload.orderValue1),
            orderValue2: this.toNumericString(payload.orderValue2),
            orderValue3: this.toNumericString(payload.orderValue3),
            avgAnnualTurnoverRequired: payload.avgAnnualTurnoverRequired ?? null,
            avgAnnualTurnoverValue: this.toNumericString(payload.avgAnnualTurnoverValue),
            workingCapitalRequired: payload.workingCapitalRequired ?? null,
            workingCapitalValue: this.toNumericString(payload.workingCapitalValue),
            solvencyCertificateRequired: payload.solvencyCertificateRequired ?? null,
            solvencyCertificateValue: this.toNumericString(payload.solvencyCertificateValue),
            netWorthRequired: payload.netWorthRequired ?? null,
            netWorthValue: this.toNumericString(payload.netWorthValue),
            technicalEligible: payload.technicalEligible ?? false,
            financialEligible: payload.financialEligible ?? false,
            rejectionRemark: payload.rejectionRemark ?? null,
        };
    }

    private async replaceClients(db: DbInstance, tenderId: number, clients: TenderInfoSheetPayload['clients']) {
        await db.delete(tenderClients).where(eq(tenderClients.tenderId, tenderId));

        if (!clients?.length) return;

        await db.insert(tenderClients).values(
            clients.map((client) => ({
                tenderId,
                clientName: client.clientName?.trim() ?? '',
                clientDesignation: client.clientDesignation?.trim() || null,
                clientMobile: client.clientMobile?.trim() || null,
                clientEmail: client.clientEmail?.trim() || null,
            })),
        );
    }

    private async replaceDocuments(db: DbInstance, tenderId: number, payload: TenderInfoSheetPayload) {
        await db.delete(tenderTechnicalDocuments).where(eq(tenderTechnicalDocuments.tenderId, tenderId));
        await db.delete(tenderFinancialDocuments).where(eq(tenderFinancialDocuments.tenderId, tenderId));
        await db.delete(tenderPqcDocuments).where(eq(tenderPqcDocuments.tenderId, tenderId));

        if (payload.technicalDocuments?.length) {
            await db.insert(tenderTechnicalDocuments).values(
                payload.technicalDocuments.map((documentName) => ({
                    tenderId,
                    documentName,
                })),
            );
        }

        if (payload.financialDocuments?.length) {
            await db.insert(tenderFinancialDocuments).values(
                payload.financialDocuments.map((documentName) => ({
                    tenderId,
                    documentName,
                })),
            );
        }

        if (payload.pqcDocuments?.length) {
            await db.insert(tenderPqcDocuments).values(
                payload.pqcDocuments.map((documentName) => ({
                    tenderId,
                    documentName,
                    autoAttached: true,
                })),
            );
        }
    }

    private hydrateInfoSheet(
        info: TenderInformationRow,
        clients: TenderClientRow[],
        technicalDocs: TenderTechnicalDocument[],
        financialDocs: TenderFinancialDocument[],
        pqcDocs: TenderPqcDocument[],
    ): TenderInfoSheetDetails {
        const asNumber = (value: number | string | null | undefined) => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'number') return value;
            const parsed = Number(value);
            return Number.isNaN(parsed) ? null : parsed;
        };

        const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

        return {
            id: info.id,
            tenderId: info.tenderId,
            teRecommendation: info.teRecommendation,
            teRejectionReason: info.teRejectionReason ?? null,
            teRejectionRemarks: info.teRejectionRemarks ?? null,
            teRemark: info.teRemark ?? null,
            tenderFeeAmount: asNumber(info.tenderFeeAmount),
            tenderFeeMode: info.tenderFeeMode ?? null,
            emdRequired: info.emdRequired ?? null,
            emdMode: info.emdMode ?? null,
            reverseAuctionApplicable: info.reverseAuctionApplicable ?? null,
            paymentTermsSupply: info.paymentTermsSupply ?? null,
            paymentTermsInstallation: info.paymentTermsInstallation ?? null,
            pbgRequired: info.pbgRequired ?? null,
            pbgPercentage: asNumber(info.pbgPercentage),
            pbgDurationMonths: asNumber(info.pbgDurationMonths),
            securityDepositMode: info.securityDepositMode ?? null,
            securityDepositPercentage: asNumber(info.securityDepositPercentage),
            sdDurationMonths: asNumber(info.sdDurationMonths),
            bidValidityDays: asNumber(info.bidValidityDays),
            commercialEvaluation: info.commercialEvaluation ?? null,
            mafRequired: info.mafRequired ?? null,
            deliveryTimeSupply: asNumber(info.deliveryTimeSupply),
            deliveryTimeInstallation: asNumber(info.deliveryTimeInstallation),
            ldPercentagePerWeek: asNumber(info.ldPercentagePerWeek),
            maxLdPercentage: asNumber(info.maxLdPercentage),
            physicalDocsRequired: info.physicalDocsRequired ?? null,
            physicalDocsDeadline: toIso(info.physicalDocsDeadline),
            techEligibilityAgeYears: asNumber(info.techEligibilityAgeYears),
            orderValue1: asNumber(info.orderValue1),
            orderValue2: asNumber(info.orderValue2),
            orderValue3: asNumber(info.orderValue3),
            avgAnnualTurnoverRequired: info.avgAnnualTurnoverRequired ?? null,
            avgAnnualTurnoverValue: asNumber(info.avgAnnualTurnoverValue),
            workingCapitalRequired: info.workingCapitalRequired ?? null,
            workingCapitalValue: asNumber(info.workingCapitalValue),
            solvencyCertificateRequired: info.solvencyCertificateRequired ?? null,
            solvencyCertificateValue: asNumber(info.solvencyCertificateValue),
            netWorthRequired: info.netWorthRequired ?? null,
            netWorthValue: asNumber(info.netWorthValue),
            technicalEligible: info.technicalEligible ?? false,
            financialEligible: info.financialEligible ?? false,
            rejectionRemark: info.rejectionRemark ?? null,
            clients: clients.map((client) => ({
                id: client.id,
                clientName: client.clientName ?? null,
                clientDesignation: client.clientDesignation ?? null,
                clientMobile: client.clientMobile ?? null,
                clientEmail: client.clientEmail ?? null,
            })),
            technicalDocuments: technicalDocs.map((doc) => doc.documentName),
            financialDocuments: financialDocs.map((doc) => doc.documentName),
            pqcDocuments: pqcDocs.map((doc) => doc.documentName),
            createdAt: toIso(info.createdAt) ?? new Date().toISOString(),
            updatedAt: toIso(info.updatedAt) ?? new Date().toISOString(),
        };
    }
}
