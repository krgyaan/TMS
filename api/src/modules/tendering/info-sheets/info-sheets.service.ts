import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
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
} from '@db/schemas/tendering/tender-info-sheet.schema';
import type { TenderInfoSheetPayload } from '@/modules/tendering/info-sheets/dto/info-sheet.dto';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { DrizzleError } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export type TenderInfoSheetWithRelations = TenderInformation & {
    clients: TenderClient[];
    technicalWorkOrders: TenderTechnicalDocument[];
    commercialDocuments: TenderFinancialDocument[];
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class TenderInfoSheetsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
    ) { }

    async findByTenderId(
        tenderId: number
    ): Promise<TenderInfoSheetWithRelations | null> {
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

    /**
     * Get info sheet with tender details
     * Uses shared tender service method
     */
    async findByTenderIdWithTender(tenderId: number) {
        const [infoSheet, tender] = await Promise.all([
            this.findByTenderId(tenderId),
            this.tenderInfosService.getReference(tenderId),
        ]);

        return {
            infoSheet,
            tender,
        };
    }

    async create(
        tenderId: number,
        payload: TenderInfoSheetPayload,
        changedBy: number
    ): Promise<TenderInfoSheetWithRelations> {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        // Check if info sheet already exists
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            throw new ConflictException(
                `Info sheet already exists for tender ${tenderId}`
            );
        }

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 2 (Tender Info filled) and track it
        const newStatus = 2; // Status ID for "Tender Info filled"

        try {
            await this.db.transaction(async (tx) => {
                // Insert main info sheet
                const [infoSheet] = await tx
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
                        deliveryTimeInstallationInclusive:
                            payload.deliveryTimeInstallationInclusive ?? false,
                        deliveryTimeInstallationDays:
                            payload.deliveryTimeInstallationDays ?? null,
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
                        workValueType: payload.workValueType ?? null,
                        orderValue1: payload.orderValue1?.toString() ?? null,
                        orderValue2: payload.orderValue2?.toString() ?? null,
                        orderValue3: payload.orderValue3?.toString() ?? null,
                        avgAnnualTurnoverType: payload.avgAnnualTurnoverType ?? null,
                        avgAnnualTurnoverValue:
                            payload.avgAnnualTurnoverValue?.toString() ?? null,
                        workingCapitalType: payload.workingCapitalType ?? null,
                        workingCapitalValue: payload.workingCapitalValue?.toString() ?? null,
                        solvencyCertificateType: payload.solvencyCertificateType ?? null,
                        solvencyCertificateValue:
                            payload.solvencyCertificateValue?.toString() ?? null,
                        netWorthType: payload.netWorthType ?? null,
                        netWorthValue: payload.netWorthValue?.toString() ?? null,
                        courierAddress: payload.courierAddress ?? null,
                        teFinalRemark: payload.teFinalRemark ?? null,
                    })
                    .returning();

                // Insert clients
                const clients = payload.clients ?? [];
                if (clients.length > 0) {
                    await tx.insert(tenderClients).values(
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
                    await tx.insert(tenderTechnicalDocuments).values(
                        technicalDocs.map((docName) => ({
                            tenderId,
                            documentName: docName,
                        }))
                    );
                }

                // Insert financial documents
                const financialDocs = payload.commercialDocuments ?? [];
                if (financialDocs.length > 0) {
                    await tx.insert(tenderFinancialDocuments).values(
                        financialDocs.map((docName) => ({
                            tenderId,
                            documentName: docName,
                        }))
                    );
                }

                // Update tender status
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

                // Track status change
                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId,
                    newStatus,
                    changedBy,
                    prevStatus,
                    'Tender info sheet filled',
                    tx
                );
            });

            return this.findByTenderId(
                tenderId
            ) as Promise<TenderInfoSheetWithRelations>;
        } catch (error: any) {
            // Handle database constraint errors
            if (error?.cause?.code === '22001') {
                // PostgreSQL error code for "value too long for type"
                const message = error?.cause?.message || error?.message || '';
                if (message.includes('character varying(5)')) {
                    throw new BadRequestException(
                        'One or more fields have invalid values. Please ensure YES/NO fields contain only "YES" or "NO".'
                    );
                }
                throw new BadRequestException(
                    `Invalid data: ${message.includes('too long') ? 'One or more values exceed the maximum length allowed.' : message}`
                );
            }

            // Handle other database errors
            if (error?.code === '23505') {
                throw new BadRequestException('A record with this information already exists.');
            }

            // Re-throw known exceptions
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            // Log and throw generic error for unknown cases
            console.error('Failed to create info sheet:', error);
            throw new InternalServerErrorException(
                'Failed to save tender information. Please check your input and try again.'
            );
        }
    }

    async update(
        tenderId: number,
        payload: TenderInfoSheetPayload,
        changedBy: number
    ): Promise<TenderInfoSheetWithRelations> {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        const existing = await this.findByTenderId(tenderId);
        if (!existing) {
            throw new NotFoundException(
                `Info sheet not found for tender ${tenderId}`
            );
        }

        // Update main info sheet
        try {
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
                    deliveryTimeInstallationInclusive:
                        payload.deliveryTimeInstallationInclusive ?? false,
                    deliveryTimeInstallationDays:
                        payload.deliveryTimeInstallationDays ?? null,
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
                    workValueType: payload.workValueType ?? null,
                    orderValue1: payload.orderValue1?.toString() ?? null,
                    orderValue2: payload.orderValue2?.toString() ?? null,
                    orderValue3: payload.orderValue3?.toString() ?? null,
                    avgAnnualTurnoverType: payload.avgAnnualTurnoverType ?? null,
                    avgAnnualTurnoverValue:
                        payload.avgAnnualTurnoverValue?.toString() ?? null,
                    workingCapitalType: payload.workingCapitalType ?? null,
                    workingCapitalValue: payload.workingCapitalValue?.toString() ?? null,
                    solvencyCertificateType: payload.solvencyCertificateType ?? null,
                    solvencyCertificateValue:
                        payload.solvencyCertificateValue?.toString() ?? null,
                    netWorthType: payload.netWorthType ?? null,
                    netWorthValue: payload.netWorthValue?.toString() ?? null,
                    courierAddress: payload.courierAddress ?? null,
                    teFinalRemark: payload.teFinalRemark ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(tenderInformation.tenderId, tenderId));

            // Delete existing related records
            await Promise.all([
                this.db
                    .delete(tenderClients)
                    .where(eq(tenderClients.tenderId, tenderId)),
                this.db
                    .delete(tenderTechnicalDocuments)
                    .where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
                this.db
                    .delete(tenderFinancialDocuments)
                    .where(eq(tenderFinancialDocuments.tenderId, tenderId)),
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

            return this.findByTenderId(
                tenderId
            ) as Promise<TenderInfoSheetWithRelations>;
        } catch (error: any) {
            // Same error handling as create method
            if (error?.cause?.code === '22001') {
                const message = error?.cause?.message || error?.message || '';
                if (message.includes('character varying(5)')) {
                    throw new BadRequestException(
                        'One or more fields have invalid values. Please ensure YES/NO fields contain only "YES" or "NO".'
                    );
                }
                throw new BadRequestException(
                    `Invalid data: ${message.includes('too long') ? 'One or more values exceed the maximum length allowed.' : message}`
                );
            }

            if (error?.code === '23505') {
                throw new BadRequestException('A record with this information already exists.');
            }

            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            console.error('Failed to update info sheet:', error);
            throw new InternalServerErrorException(
                'Failed to update tender information. Please check your input and try again.'
            );
        }
    }
}
