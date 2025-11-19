import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    tenderInformation,
    tenderClients,
    tenderTechnicalDocuments,
    tenderFinancialDocuments,
    type TenderInformation,
    type TenderClient,
    type TenderTechnicalDocument,
    type TenderFinancialDocument,
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

    processingFeeAmount: number | null;
    processingFeeModes: string[] | null;

    tenderFeeAmount: number | null;
    tenderFeeModes: string[] | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdModes: string[] | null;

    reverseAuctionApplicable: 'YES' | 'NO' | null;
    paymentTermsSupply: number | null;
    paymentTermsInstallation: number | null;

    pbgForm: string | null;
    pbgPercentage: number | null;
    pbgDurationMonths: number | null;

    sdForm: string | null;
    securityDepositPercentage: number | null;
    sdDurationMonths: number | null;

    bidValidityDays: number | null;
    commercialEvaluation: string | null;
    mafRequired: string | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallationInclusive: boolean;
    deliveryTimeInstallation: number | null;

    ldPercentagePerWeek: number | null;
    maxLdPercentage: number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | null;

    techEligibilityAgeYears: number | null;
    orderValue1: number | null;
    orderValue2: number | null;
    orderValue3: number | null;

    avgAnnualTurnoverCriteria: string | null;
    avgAnnualTurnoverValue: number | null;

    workingCapitalCriteria: string | null;
    workingCapitalValue: number | null;

    solvencyCertificateCriteria: string | null;
    solvencyCertificateValue: number | null;

    netWorthCriteria: string | null;
    netWorthValue: number | null;

    clientOrganization: string | null;
    courierAddress: string | null;

    rejectionRemark: string | null;

    clients: TenderInfoSheetClient[];
    technicalWorkOrders: string[];
    commercialDocuments: string[];

    createdAt: string;
    updatedAt: string;
}

@Injectable()
export class TenderInfoSheetsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
    ) { }

    async findAll(): Promise<TenderInfoSheetDetails[]> {
        const info = (await this.db.select().from(tenderInformation)) as unknown as TenderInformation[];
        return info.map((info) => this.hydrateInfoSheet(info, [], [], []));
    }

    async findByTenderId(tenderId: number): Promise<TenderInfoSheetDetails | null> {
        const [info] = (await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1)) as unknown as TenderInformation[];

        if (!info) {
            throw new NotFoundException('Info sheet not found');
        }

        const [clients, technicalDocs, financialDocs] = await Promise.all([
            this.db.select().from(tenderClients).where(eq(tenderClients.tenderId, tenderId)),
            this.db.select().from(tenderTechnicalDocuments).where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
            this.db.select().from(tenderFinancialDocuments).where(eq(tenderFinancialDocuments.tenderId, tenderId)),
        ]);

        return this.hydrateInfoSheet(info, clients, technicalDocs, financialDocs);
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

        const sheet = await this.findByTenderId(tenderId);
        if (!sheet) {
            throw new NotFoundException('Info sheet not found for this tender');
        }
        return sheet;
    }

    async update(tenderId: number, payload: TenderInfoSheetPayload): Promise<TenderInfoSheetDetails> {
        await this.ensureTenderExists(tenderId);

        const existing = await this.db
            .select({ id: tenderInformation.id })
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (!existing.length) {
            throw new NotFoundException('Info sheet not found for this tender');
        }

        await this.db.transaction(async (tx) => {
            await tx
                .update(tenderInformation)
                .set(this.buildInfoRecord(tenderId, payload))
                .where(eq(tenderInformation.tenderId, tenderId));
            await this.replaceClients(tx, tenderId, payload.clients);
            await this.replaceDocuments(tx, tenderId, payload);
        });

        const sheet = await this.findByTenderId(tenderId);
        if (!sheet) {
            throw new NotFoundException('Info sheet not found for this tender');
        }
        return sheet;
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
            teFinalRemark: payload.teRemark ?? null,
            processingFeeAmount: this.toNumericString(payload.processingFeeAmount),
            processingFeeMode: payload.processingFeeModes ?? null,
            tenderFeeAmount: this.toNumericString(payload.tenderFeeAmount),
            tenderFeeMode: payload.tenderFeeModes ?? null,
            emdRequired: payload.emdRequired ?? null,
            emdMode: payload.emdModes ?? null,
            reverseAuctionApplicable: payload.reverseAuctionApplicable ?? null,
            paymentTermsSupply: payload.paymentTermsSupply ?? null,
            paymentTermsInstallation: payload.paymentTermsInstallation ?? null,
            pbgInFormOf: payload.pbgForm ?? null,
            pbgPercentage: this.toNumericString(payload.pbgPercentage),
            pbgDurationMonths: payload.pbgDurationMonths ?? null,
            sdInFormOf: payload.sdForm ?? null,
            securityDepositPercentage: this.toNumericString(payload.securityDepositPercentage),
            sdDurationMonths: payload.sdDurationMonths ?? null,
            bidValidityDays: payload.bidValidityDays ?? null,
            commercialEvaluation: payload.commercialEvaluation ?? null,
            mafRequired: payload.mafRequired ?? null,
            deliveryTimeSupply: payload.deliveryTimeSupply ?? null,
            deliveryTimeInstallationInclusive: payload.deliveryTimeInstallationInclusive ?? false,
            deliveryTimeInstallationDays: payload.deliveryTimeInstallation ?? null,
            ldPercentagePerWeek: this.toNumericString(payload.ldPercentagePerWeek),
            maxLdPercentage: this.toNumericString(payload.maxLdPercentage),
            physicalDocsRequired: payload.physicalDocsRequired ?? null,
            physicalDocsDeadline: toDate(payload.physicalDocsDeadline),
            techEligibilityAgeYears: payload.techEligibilityAgeYears ?? null,
            orderValue1: this.toNumericString(payload.orderValue1),
            orderValue2: this.toNumericString(payload.orderValue2),
            orderValue3: this.toNumericString(payload.orderValue3),
            avgAnnualTurnoverType: payload.avgAnnualTurnoverCriteria ?? null,
            avgAnnualTurnoverValue: this.toNumericString(payload.avgAnnualTurnoverValue),
            workingCapitalType: payload.workingCapitalCriteria ?? null,
            workingCapitalValue: this.toNumericString(payload.workingCapitalValue),
            solvencyCertificateType: payload.solvencyCertificateCriteria ?? null,
            solvencyCertificateValue: this.toNumericString(payload.solvencyCertificateValue),
            netWorthType: payload.netWorthCriteria ?? null,
            netWorthValue: this.toNumericString(payload.netWorthValue),
            clientOrganisation: payload.clientOrganization ?? null,
            courierAddress: payload.courierAddress ?? null,
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

        if (payload.technicalWorkOrders?.length) {
            await db.insert(tenderTechnicalDocuments).values(
                payload.technicalWorkOrders.map((documentName) => ({
                    tenderId,
                    documentName,
                })),
            );
        }

        if (payload.commercialDocuments?.length) {
            await db.insert(tenderFinancialDocuments).values(
                payload.commercialDocuments.map((documentName) => ({
                    tenderId,
                    documentName,
                })),
            );
        }
    }

    private hydrateInfoSheet(
        info: TenderInformation,
        clients: TenderClient[],
        technicalDocs: TenderTechnicalDocument[],
        financialDocs: TenderFinancialDocument[],
    ): TenderInfoSheetDetails {
        return {
            id: info.id,
            tenderId: info.tenderId,
            teRecommendation: info.teRecommendation as 'YES' | 'NO',
            teRejectionReason: info.teRejectionReason ?? null,
            teRejectionRemarks: info.teRejectionRemarks ?? null,
            teRemark: info.teFinalRemark ?? null,
            processingFeeAmount: info.processingFeeAmount ? Number(info.processingFeeAmount) : null,
            processingFeeModes: info.processingFeeMode ?? null,
            tenderFeeAmount: info.tenderFeeAmount ? Number(info.tenderFeeAmount) : null,
            tenderFeeModes: info.tenderFeeMode ?? null,
            emdRequired: info.emdRequired as 'YES' | 'NO' | 'EXEMPT' | null,
            emdModes: info.emdMode ?? null,
            reverseAuctionApplicable: info.reverseAuctionApplicable as 'YES' | 'NO' | null,
            paymentTermsSupply: info.paymentTermsSupply ? Number(info.paymentTermsSupply) : null,
            paymentTermsInstallation: info.paymentTermsInstallation ? Number(info.paymentTermsInstallation) : null,
            pbgForm: info.pbgInFormOf ?? null,
            pbgPercentage: info.pbgPercentage ? Number(info.pbgPercentage) : null,
            pbgDurationMonths: info.pbgDurationMonths ? Number(info.pbgDurationMonths) : null,
            sdForm: info.sdInFormOf ?? null,
            securityDepositPercentage: info.securityDepositPercentage ? Number(info.securityDepositPercentage) : null,
            sdDurationMonths: info.sdDurationMonths ? Number(info.sdDurationMonths) : null,
            bidValidityDays: info.bidValidityDays ? Number(info.bidValidityDays) : null,
            commercialEvaluation: info.commercialEvaluation ?? null,
            mafRequired: info.mafRequired ?? null,
            deliveryTimeSupply: info.deliveryTimeSupply ? Number(info.deliveryTimeSupply) : null,
            deliveryTimeInstallationInclusive: info.deliveryTimeInstallationInclusive ?? false,
            deliveryTimeInstallation: info.deliveryTimeInstallationDays ? Number(info.deliveryTimeInstallationDays) : null,
            ldPercentagePerWeek: info.ldPercentagePerWeek ? Number(info.ldPercentagePerWeek) : null,
            maxLdPercentage: info.maxLdPercentage ? Number(info.maxLdPercentage) : null,
            physicalDocsRequired: info.physicalDocsRequired as 'YES' | 'NO' | null,
            physicalDocsDeadline: info.physicalDocsDeadline ? info.physicalDocsDeadline.toISOString() : null,
            techEligibilityAgeYears: info.techEligibilityAgeYears ? Number(info.techEligibilityAgeYears) : null,
            orderValue1: info.orderValue1 ? Number(info.orderValue1) : null,
            orderValue2: info.orderValue2 ? Number(info.orderValue2) : null,
            orderValue3: info.orderValue3 ? Number(info.orderValue3) : null,
            avgAnnualTurnoverCriteria: info.avgAnnualTurnoverType ?? null,
            avgAnnualTurnoverValue: info.avgAnnualTurnoverValue ? Number(info.avgAnnualTurnoverValue) : null,
            workingCapitalCriteria: info.workingCapitalType ?? null,
            workingCapitalValue: info.workingCapitalValue ? Number(info.workingCapitalValue) : null,
            solvencyCertificateCriteria: info.solvencyCertificateType ?? null,
            solvencyCertificateValue: info.solvencyCertificateValue ? Number(info.solvencyCertificateValue) : null,
            netWorthCriteria: info.netWorthType ?? null,
            netWorthValue: info.netWorthValue ? Number(info.netWorthValue) : null,
            clientOrganization: info.clientOrganisation ?? null,
            courierAddress: info.courierAddress ?? null,
            rejectionRemark: info.teRejectionRemarks ?? null,
            clients: clients.map((client) => ({
                id: client.id,
                clientName: client.clientName ?? null,
                clientDesignation: client.clientDesignation ?? null,
                clientMobile: client.clientMobile ?? null,
                clientEmail: client.clientEmail ?? null,
            })),
            technicalWorkOrders: technicalDocs.map((doc) => doc.documentName),
            commercialDocuments: financialDocs.map((doc) => doc.documentName),
            createdAt: info.createdAt.toISOString(),
            updatedAt: info.updatedAt.toISOString(),
        };
    }
}
