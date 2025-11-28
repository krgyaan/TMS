import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { eq } from 'drizzle-orm';
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
import type { TenderInfoSheetPayload } from './dto/info-sheet.dto';

export type TenderInfoSheetWithRelations = TenderInformation & {
    clients: TenderClient[];
    technicalWorkOrders: TenderTechnicalDocument[];
    commercialDocuments: TenderFinancialDocument[];
};

@Injectable()
export class TenderInfoSheetsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findByTenderId(tenderId: number): Promise<TenderInfoSheetWithRelations | null> {
        const info = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (!info.length) {
            return null;
        }

        const [infoSheet] = info;

        // Fetch related data
        const [clients, technicalDocs, financialDocs] = await Promise.all([
            this.db
                .select()
                .from(tenderClients)
                .where(eq(tenderClients.tenderId, tenderId)),
            this.db
                .select()
                .from(tenderTechnicalDocuments)
                .where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
            this.db
                .select()
                .from(tenderFinancialDocuments)
                .where(eq(tenderFinancialDocuments.tenderId, tenderId)),
        ]);

        return {
            ...infoSheet,
            clients,
            technicalWorkOrders: technicalDocs,
            commercialDocuments: financialDocs,
        };
    }

    async create(tenderId: number, payload: TenderInfoSheetPayload): Promise<TenderInfoSheetWithRelations> {
        // Check if info sheet already exists
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            throw new Error(`Info sheet already exists for tender ${tenderId}`);
        }

        // Insert main info sheet
        const [infoSheet] = await this.db
            .insert(tenderInformation)
            .values({
                tenderId,
                teRecommendation: payload.teRecommendation,
                teRejectionReason: payload.teRejectionReason ?? null,
                teRejectionRemarks: payload.teRejectionRemarks ?? null,
                processingFeeRequired: payload.processingFeeRequired ?? null,
                processingFeeAmount: payload.processingFeeAmount?.toString() ?? null,
                processingFeeMode: payload.processingFeeModes ?? null,
                tenderFeeRequired: payload.tenderFeeRequired ?? null,
                tenderFeeAmount: payload.tenderFeeAmount?.toString() ?? null,
                tenderFeeMode: payload.tenderFeeModes ?? null,
                emdRequired: payload.emdRequired ?? null,
                emdAmount: payload.emdAmount?.toString() ?? null,
                emdMode: payload.emdModes ?? null,
                reverseAuctionApplicable: payload.reverseAuctionApplicable ?? null,
                paymentTermsSupply: payload.paymentTermsSupply ?? null,
                paymentTermsInstallation: payload.paymentTermsInstallation ?? null,
                bidValidityDays: payload.bidValidityDays ?? null,
                commercialEvaluation: payload.commercialEvaluation ?? null,
                mafRequired: payload.mafRequired ?? null,
                deliveryTimeSupply: payload.deliveryTimeSupply ?? null,
                deliveryTimeInstallationInclusive: payload.deliveryTimeInstallationInclusive ?? false,
                deliveryTimeInstallationDays: payload.deliveryTimeInstallationDays ?? null,
                pbgRequired: payload.pbgRequired ?? null,
                pbgMode: payload.pbgMode ?? null,
                pbgPercentage: payload.pbgPercentage?.toString() ?? null,
                pbgDurationMonths: payload.pbgDurationMonths ?? null,
                sdRequired: payload.sdRequired ?? null,
                sdMode: payload.sdMode ?? null,
                sdPercentage: payload.sdPercentage?.toString() ?? null,
                sdDurationMonths: payload.sdDurationMonths ?? null,
                ldRequired: payload.ldRequired ?? null,
                ldPercentagePerWeek: payload.ldPercentagePerWeek?.toString() ?? null,
                maxLdPercentage: payload.maxLdPercentage?.toString() ?? null,
                physicalDocsRequired: payload.physicalDocsRequired ?? null,
                physicalDocsDeadline: payload.physicalDocsDeadline ?? null,
                techEligibilityAge: payload.techEligibilityAge ?? null,
                workOrderValue1Required: payload.workOrderValue1Required ?? null,
                orderValue1: payload.orderValue1?.toString() ?? null,
                wo1Custom: payload.wo1Custom ?? null,
                workOrderValue2Required: payload.workOrderValue2Required ?? null,
                orderValue2: payload.orderValue2?.toString() ?? null,
                wo2Custom: payload.wo2Custom ?? null,
                workOrderValue3Required: payload.workOrderValue3Required ?? null,
                orderValue3: payload.orderValue3?.toString() ?? null,
                wo3Custom: payload.wo3Custom ?? null,
                avgAnnualTurnoverType: payload.avgAnnualTurnoverType ?? null,
                avgAnnualTurnoverValue: payload.avgAnnualTurnoverValue?.toString() ?? null,
                workingCapitalType: payload.workingCapitalType ?? null,
                workingCapitalValue: payload.workingCapitalValue?.toString() ?? null,
                solvencyCertificateType: payload.solvencyCertificateType ?? null,
                solvencyCertificateValue: payload.solvencyCertificateValue?.toString() ?? null,
                netWorthType: payload.netWorthType ?? null,
                netWorthValue: payload.netWorthValue?.toString() ?? null,
                courierAddress: payload.courierAddress ?? null,
                teFinalRemark: payload.teFinalRemark ?? null,
            })
            .returning();

        // Insert clients
        const clients = payload.clients ?? [];
        if (clients.length > 0) {
            await this.db.insert(tenderClients).values(
                clients.map((client) => ({
                    tenderId,
                    clientName: client.clientName,
                    clientDesignation: client.clientDesignation ?? null,
                    clientMobile: client.clientMobile ?? null,
                    clientEmail: client.clientEmail ?? null,
                }))
            );
        }

        // Insert technical documents
        const technicalDocs = payload.technicalWorkOrders ?? [];
        if (technicalDocs.length > 0) {
            await this.db.insert(tenderTechnicalDocuments).values(
                technicalDocs.map((docName) => ({
                    tenderId,
                    documentName: docName,
                }))
            );
        }

        // Insert financial documents
        const financialDocs = payload.commercialDocuments ?? [];
        if (financialDocs.length > 0) {
            await this.db.insert(tenderFinancialDocuments).values(
                financialDocs.map((docName) => ({
                    tenderId,
                    documentName: docName,
                }))
            );
        }

        return this.findByTenderId(tenderId) as Promise<TenderInfoSheetWithRelations>;
    }

    async update(tenderId: number, payload: TenderInfoSheetPayload): Promise<TenderInfoSheetWithRelations> {
        const existing = await this.findByTenderId(tenderId);
        if (!existing) {
            throw new NotFoundException(`Info sheet not found for tender ${tenderId}`);
        }

        // Update main info sheet
        await this.db
            .update(tenderInformation)
            .set({
                teRecommendation: payload.teRecommendation,
                teRejectionReason: payload.teRejectionReason ?? null,
                teRejectionRemarks: payload.teRejectionRemarks ?? null,
                processingFeeRequired: payload.processingFeeRequired ?? null,
                processingFeeAmount: payload.processingFeeAmount?.toString() ?? null,
                processingFeeMode: payload.processingFeeModes ?? null,
                tenderFeeRequired: payload.tenderFeeRequired ?? null,
                tenderFeeAmount: payload.tenderFeeAmount?.toString() ?? null,
                tenderFeeMode: payload.tenderFeeModes ?? null,
                emdRequired: payload.emdRequired ?? null,
                emdAmount: payload.emdAmount?.toString() ?? null,
                emdMode: payload.emdModes ?? null,
                reverseAuctionApplicable: payload.reverseAuctionApplicable ?? null,
                paymentTermsSupply: payload.paymentTermsSupply ?? null,
                paymentTermsInstallation: payload.paymentTermsInstallation ?? null,
                bidValidityDays: payload.bidValidityDays ?? null,
                commercialEvaluation: payload.commercialEvaluation ?? null,
                mafRequired: payload.mafRequired ?? null,
                deliveryTimeSupply: payload.deliveryTimeSupply ?? null,
                deliveryTimeInstallationInclusive: payload.deliveryTimeInstallationInclusive ?? false,
                deliveryTimeInstallationDays: payload.deliveryTimeInstallationDays ?? null,
                pbgRequired: payload.pbgRequired ?? null,
                pbgMode: payload.pbgMode ?? null,
                pbgPercentage: payload.pbgPercentage?.toString() ?? null,
                pbgDurationMonths: payload.pbgDurationMonths ?? null,
                sdRequired: payload.sdRequired ?? null,
                sdMode: payload.sdMode ?? null,
                sdPercentage: payload.sdPercentage?.toString() ?? null,
                sdDurationMonths: payload.sdDurationMonths ?? null,
                ldRequired: payload.ldRequired ?? null,
                ldPercentagePerWeek: payload.ldPercentagePerWeek?.toString() ?? null,
                maxLdPercentage: payload.maxLdPercentage?.toString() ?? null,
                physicalDocsRequired: payload.physicalDocsRequired ?? null,
                physicalDocsDeadline: payload.physicalDocsDeadline ?? null,
                techEligibilityAge: payload.techEligibilityAge ?? null,
                workOrderValue1Required: payload.workOrderValue1Required ?? null,
                orderValue1: payload.orderValue1?.toString() ?? null,
                wo1Custom: payload.wo1Custom ?? null,
                workOrderValue2Required: payload.workOrderValue2Required ?? null,
                orderValue2: payload.orderValue2?.toString() ?? null,
                wo2Custom: payload.wo2Custom ?? null,
                workOrderValue3Required: payload.workOrderValue3Required ?? null,
                orderValue3: payload.orderValue3?.toString() ?? null,
                wo3Custom: payload.wo3Custom ?? null,
                avgAnnualTurnoverType: payload.avgAnnualTurnoverType ?? null,
                avgAnnualTurnoverValue: payload.avgAnnualTurnoverValue?.toString() ?? null,
                workingCapitalType: payload.workingCapitalType ?? null,
                workingCapitalValue: payload.workingCapitalValue?.toString() ?? null,
                solvencyCertificateType: payload.solvencyCertificateType ?? null,
                solvencyCertificateValue: payload.solvencyCertificateValue?.toString() ?? null,
                netWorthType: payload.netWorthType ?? null,
                netWorthValue: payload.netWorthValue?.toString() ?? null,
                courierAddress: payload.courierAddress ?? null,
                teFinalRemark: payload.teFinalRemark ?? null,
                updatedAt: new Date(),
            })
            .where(eq(tenderInformation.tenderId, tenderId));

        // Delete existing related records
        await Promise.all([
            this.db.delete(tenderClients).where(eq(tenderClients.tenderId, tenderId)),
            this.db.delete(tenderTechnicalDocuments).where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
            this.db.delete(tenderFinancialDocuments).where(eq(tenderFinancialDocuments.tenderId, tenderId)),
        ]);

        // Insert updated related records
        const clients = payload.clients ?? [];
        if (clients.length > 0) {
            await this.db.insert(tenderClients).values(
                clients.map((client) => ({
                    tenderId,
                    clientName: client.clientName,
                    clientDesignation: client.clientDesignation ?? null,
                    clientMobile: client.clientMobile ?? null,
                    clientEmail: client.clientEmail ?? null,
                }))
            );
        }

        const technicalDocs = payload.technicalWorkOrders ?? [];
        if (technicalDocs.length > 0) {
            await this.db.insert(tenderTechnicalDocuments).values(
                technicalDocs.map((docName) => ({
                    tenderId,
                    documentName: docName,
                }))
            );
        }

        const financialDocs = payload.commercialDocuments ?? [];
        if (financialDocs.length > 0) {
            await this.db.insert(tenderFinancialDocuments).values(
                financialDocs.map((docName) => ({
                    tenderId,
                    documentName: docName,
                }))
            );
        }

        return this.findByTenderId(tenderId) as Promise<TenderInfoSheetWithRelations>;
    }
}
