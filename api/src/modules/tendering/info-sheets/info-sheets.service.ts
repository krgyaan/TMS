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
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { websites } from '@db/schemas/master/websites.schema';
import { TimersService } from '@/modules/timers/timers.service';

export type TenderInfoSheetWithRelations = TenderInformation & {
    clients: TenderClient[];
    technicalWorkOrders: TenderTechnicalDocument[];
    commercialDocuments: TenderFinancialDocument[];
};

@Injectable()
export class TenderInfoSheetsService {
    private readonly logger = new Logger(TenderInfoSheetsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
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

    /**
     * Validate YES/NO fields before database insertion
     */
    private validateYesNoFields(payload: TenderInfoSheetPayload): void {
        const yesNoFields = [
            { name: 'processingFeeRequired', value: payload.processingFeeRequired },
            { name: 'tenderFeeRequired', value: payload.tenderFeeRequired },
            { name: 'pbgRequired', value: payload.pbgRequired },
            { name: 'sdRequired', value: payload.sdRequired },
            { name: 'ldRequired', value: payload.ldRequired },
            { name: 'physicalDocsRequired', value: payload.physicalDocsRequired },
            { name: 'reverseAuctionApplicable', value: payload.reverseAuctionApplicable },
            { name: 'oemExperience', value: payload.oemExperience },
        ];

        const invalidFields: string[] = [];
        for (const field of yesNoFields) {
            if (field.value !== null && field.value !== undefined) {
                const strValue = String(field.value).trim();
                if (strValue.length > 5) {
                    invalidFields.push(`${field.name}="${strValue}" (length: ${strValue.length}, exceeds 5)`);
                } else if (strValue !== 'YES' && strValue !== 'NO') {
                    invalidFields.push(`${field.name}="${strValue}" (must be YES or NO)`);
                }
            }
        }

        // EMD can also be EXEMPT
        if (payload.emdRequired !== null && payload.emdRequired !== undefined) {
            const strValue = String(payload.emdRequired).trim();
            if (strValue.length > 10) {
                invalidFields.push(`emdRequired="${strValue}" (length: ${strValue.length}, exceeds 10)`);
            } else if (strValue !== 'YES' && strValue !== 'NO' && strValue !== 'EXEMPT') {
                invalidFields.push(`emdRequired="${strValue}" (must be YES, NO, or EXEMPT)`);
            }
        }

        // MAF Required - Database column is VARCHAR(30) as per schema
        // Valid values are: YES_GENERAL (11 chars), YES_PROJECT_SPECIFIC (20 chars), NO (2 chars)
        if (payload.mafRequired !== null && payload.mafRequired !== undefined) {
            const strValue = String(payload.mafRequired).trim();
            // Check if value exceeds VARCHAR(30) constraint
            if (strValue.length > 30) {
                invalidFields.push(`mafRequired="${strValue}" (length: ${strValue.length}) exceeds database VARCHAR(30) constraint.`);
            }
            // Validate enum values
            if (strValue !== 'YES_GENERAL' && strValue !== 'YES_PROJECT_SPECIFIC' && strValue !== 'NO') {
                invalidFields.push(`mafRequired="${strValue}" (must be YES_GENERAL, YES_PROJECT_SPECIFIC, or NO)`);
            }
        }

        // workValueType - Database column is VARCHAR(20) as per schema
        if (payload.workValueType !== null && payload.workValueType !== undefined) {
            const strValue = String(payload.workValueType).trim();
            if (strValue.length > 20) {
                invalidFields.push(`workValueType="${strValue}" (length: ${strValue.length}) exceeds database VARCHAR(20) constraint.`);
            }
            // Validate enum values
            if (strValue !== 'WORKS_VALUES' && strValue !== 'CUSTOM') {
                invalidFields.push(`workValueType="${strValue}" (must be WORKS_VALUES or CUSTOM)`);
            }
        }

        if (invalidFields.length > 0) {
            throw new BadRequestException(
                `Invalid field values: ${invalidFields.join(', ')}. Please check the field constraints.`
            );
        }
    }

    async create(
        tenderId: number,
        payload: TenderInfoSheetPayload,
        changedBy: number
    ): Promise<TenderInfoSheetWithRelations> {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        // Validate YES/NO fields before database insertion
        this.validateYesNoFields(payload);

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
                // Prepare values with logging for debugging
                const mafRequiredValue = payload.mafRequired ? String(payload.mafRequired).trim() : null;
                const processingFeeRequiredValue = payload.processingFeeRequired ? String(payload.processingFeeRequired).trim() : null;
                const tenderFeeRequiredValue = payload.tenderFeeRequired ? String(payload.tenderFeeRequired).trim() : null;
                const emdRequiredValue = payload.emdRequired ? String(payload.emdRequired).trim() : null;
                const reverseAuctionApplicableValue = payload.reverseAuctionApplicable ? String(payload.reverseAuctionApplicable).trim() : null;
                const pbgRequiredValue = payload.pbgRequired ? String(payload.pbgRequired).trim() : null;
                const sdRequiredValue = payload.sdRequired ? String(payload.sdRequired).trim() : null;
                const ldRequiredValue = payload.ldRequired ? String(payload.ldRequired).trim() : null;
                const physicalDocsRequiredValue = payload.physicalDocsRequired ? String(payload.physicalDocsRequired).trim() : null;

                // Helper function to filter invalid values from arrays
                const filterArray = (arr: string[] | null | undefined): string[] | null => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
                    const filtered = arr.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                    return filtered.length > 0 ? filtered : null;
                };

                // Convert pbgMode and sdMode arrays to JSON strings for storage
                // Filter out invalid values (undefined, null, empty strings) before stringifying
                const pbgModeValue = payload.pbgMode && Array.isArray(payload.pbgMode) && payload.pbgMode.length > 0
                    ? (() => {
                        const filtered = payload.pbgMode.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                        return filtered.length > 0 ? JSON.stringify(filtered) : null;
                    })()
                    : null;
                const sdModeValue = payload.sdMode && Array.isArray(payload.sdMode) && payload.sdMode.length > 0
                    ? (() => {
                        const filtered = payload.sdMode.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                        return filtered.length > 0 ? JSON.stringify(filtered) : null;
                    })()
                    : null;

                // Filter processingFeeModes, tenderFeeModes, and emdModes arrays
                const processingFeeModesFiltered = filterArray(payload.processingFeeModes);
                const tenderFeeModesFiltered = filterArray(payload.tenderFeeModes);
                const emdModesFiltered = filterArray(payload.emdModes);

                // Insert main info sheet
                const [infoSheet] = await tx
                    .insert(tenderInformation)
                    .values({
                        tenderId,
                        tenderValue: payload.tenderValue?.toString() ?? null,
                        teRecommendation: payload.teRecommendation,
                        teRejectionReason: payload.teRejectionReason ?? null,
                        teRejectionRemarks: payload.teRejectionRemarks ?? null,
                        processingFeeRequired: processingFeeRequiredValue,
                        processingFeeAmount: payload.processingFeeAmount?.toString() ?? null,
                        processingFeeMode: processingFeeModesFiltered,
                        tenderFeeRequired: tenderFeeRequiredValue,
                        tenderFeeAmount: payload.tenderFeeAmount?.toString() ?? null,
                        tenderFeeMode: tenderFeeModesFiltered,
                        emdRequired: emdRequiredValue,
                        emdAmount: payload.emdAmount?.toString() ?? null,
                        emdMode: emdModesFiltered,
                        reverseAuctionApplicable: reverseAuctionApplicableValue,
                        paymentTermsSupply: payload.paymentTermsSupply ?? null,
                        paymentTermsInstallation: payload.paymentTermsInstallation ?? null,
                        bidValidityDays: payload.bidValidityDays ?? null,
                        commercialEvaluation: payload.commercialEvaluation ?? null,
                        mafRequired: mafRequiredValue,
                        deliveryTimeSupply: payload.deliveryTimeSupply ?? null,
                        deliveryTimeInstallationInclusive:
                            payload.deliveryTimeInstallationInclusive ?? false,
                        deliveryTimeInstallationDays:
                            payload.deliveryTimeInstallationDays ?? null,
                        pbgRequired: pbgRequiredValue,
                        pbgMode: pbgModeValue,
                        pbgPercentage: payload.pbgPercentage?.toString() ?? null,
                        pbgDurationMonths: payload.pbgDurationMonths ?? null,
                        sdRequired: sdRequiredValue,
                        sdMode: sdModeValue,
                        sdPercentage: payload.sdPercentage?.toString() ?? null,
                        sdDurationMonths: payload.sdDurationMonths ?? null,
                        ldRequired: ldRequiredValue,
                        ldPercentagePerWeek: payload.ldPercentagePerWeek?.toString() ?? null,
                        maxLdPercentage: payload.maxLdPercentage?.toString() ?? null,
                        physicalDocsRequired: physicalDocsRequiredValue,
                        physicalDocsDeadline: payload.physicalDocsDeadline ?? null,
                        techEligibilityAge: payload.techEligibilityAge ?? null,
                        workValueType: payload.workValueType ?? null,
                        orderValue1: payload.orderValue1?.toString() ?? null,
                        orderValue2: payload.orderValue2?.toString() ?? null,
                        orderValue3: payload.orderValue3?.toString() ?? null,
                        customEligibilityCriteria: payload.customEligibilityCriteria ?? null,
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
                        oemExperience: payload.oemExperience ?? null,
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

            const result = await this.findByTenderId(tenderId) as TenderInfoSheetWithRelations;

            // Send email notification
            await this.sendInfoSheetFilledEmail(tenderId, result, changedBy);

            // TIMER TRANSITION: Stop tender_info_sheet timer and start tender_approval timer
            try {
                this.logger.log(`Transitioning timers for tender ${tenderId}`);

                // 1. Stop the tender_info_sheet timer
                try {
                    await this.timersService.stopTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'tender_info_sheet',
                        userId: changedBy,
                        reason: 'Tender info sheet completed'
                    });
                    this.logger.log(`Successfully stopped tender_info_sheet timer for tender ${tenderId}`);
                } catch (error) {
                    this.logger.warn(`Failed to stop tender_info_sheet timer for tender ${tenderId}:`, error);
                }

                // 2. Start the tender_approval timer
                try {
                    await this.timersService.startTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'tender_approval',
                        userId: changedBy,
                        timerConfig: {
                            type: 'FIXED_DURATION',
                            durationHours: 24
                        }
                    });
                    this.logger.log(`Successfully started tender_approval timer for tender ${tenderId}`);
                } catch (error) {
                    this.logger.warn(`Failed to start tender_approval timer for tender ${tenderId}:`, error);
                }

                this.logger.log(`Successfully transitioned timers for tender ${tenderId}`);
            } catch (error) {
                this.logger.error(`Failed to transition timers for tender ${tenderId}:`, error);
                // Don't fail the entire operation if timer transition fails
            }


            return result;
        } catch (error: any) {
            // Handle database constraint errors
            if (error?.cause?.code === '22001') {
                // PostgreSQL error code for "value too long for type"
                const message = error?.cause?.message || error?.message || '';

                // Log the full error structure for debugging
                this.logger.error(`Database constraint error - Full error object:`, JSON.stringify(error, null, 2));
                this.logger.error(`Error message: ${message}`);

                // Validate YES/NO fields and find the problematic one
                const yesNoFields = {
                    processingFeeRequired: payload.processingFeeRequired,
                    tenderFeeRequired: payload.tenderFeeRequired,
                    emdRequired: payload.emdRequired,
                    pbgRequired: payload.pbgRequired,
                    sdRequired: payload.sdRequired,
                    ldRequired: payload.ldRequired,
                    physicalDocsRequired: payload.physicalDocsRequired,
                    reverseAuctionApplicable: payload.reverseAuctionApplicable,
                    oemExperience: payload.oemExperience,
                };

                // Check each field for invalid values
                const invalidFields: string[] = [];
                for (const [fieldName, value] of Object.entries(yesNoFields)) {
                    if (value !== null && value !== undefined) {
                        const strValue = String(value);
                        if (strValue.length > 5) {
                            invalidFields.push(`${fieldName}="${strValue}" (length: ${strValue.length})`);
                        } else if (strValue !== 'YES' && strValue !== 'NO' && strValue !== 'EXEMPT') {
                            invalidFields.push(`${fieldName}="${strValue}"`);
                        }
                    }
                }

                this.logger.error(`YES/NO field values:`, JSON.stringify(yesNoFields));
                if (invalidFields.length > 0) {
                    this.logger.error(`Invalid fields detected: ${invalidFields.join(', ')}`);
                }

                if (message.includes('character varying(5)')) {
                    const errorMsg = invalidFields.length > 0
                        ? `Invalid YES/NO field values detected: ${invalidFields.join(', ')}. Please ensure YES/NO fields contain only "YES" or "NO".`
                        : `One or more YES/NO fields have invalid values. Please ensure YES/NO fields contain only "YES" or "NO". Original error: ${message}`;
                    throw new BadRequestException(errorMsg);
                }
                throw new BadRequestException(
                    `Invalid data: ${message.includes('too long') ? 'One or more values exceed the maximum length allowed. ' : ''}${message}`
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

        // Validate YES/NO fields before database insertion
        this.validateYesNoFields(payload);

        const existing = await this.findByTenderId(tenderId);
        if (!existing) {
            throw new NotFoundException(
                `Info sheet not found for tender ${tenderId}`
            );
        }

        // Get tender to check approval status
        const tender = await this.tenderInfosService.findById(tenderId);
        const isApproved = tender?.tlStatus === 1 || tender?.tlStatus === 2;
        // 1 = approved, 2 = rejected (both mean approval process completed)

        // Update main info sheet
        try {
            await this.db.transaction(async (tx) => {
                // Helper function to filter invalid values from arrays
                const filterArray = (arr: string[] | null | undefined): string[] | null => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
                    const filtered = arr.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                    return filtered.length > 0 ? filtered : null;
                };

                // Convert pbgMode and sdMode arrays to JSON strings for storage
                // Filter out invalid values (undefined, null, empty strings) before stringifying
                const pbgModeValue = payload.pbgMode && Array.isArray(payload.pbgMode) && payload.pbgMode.length > 0
                    ? (() => {
                        const filtered = payload.pbgMode.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                        return filtered.length > 0 ? JSON.stringify(filtered) : null;
                    })()
                    : null;
                const sdModeValue = payload.sdMode && Array.isArray(payload.sdMode) && payload.sdMode.length > 0
                    ? (() => {
                        const filtered = payload.sdMode.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
                        return filtered.length > 0 ? JSON.stringify(filtered) : null;
                    })()
                    : null;

                // Filter processingFeeModes, tenderFeeModes, and emdModes arrays
                const processingFeeModesFiltered = filterArray(payload.processingFeeModes);
                const tenderFeeModesFiltered = filterArray(payload.tenderFeeModes);
                const emdModesFiltered = filterArray(payload.emdModes);

                await tx
                    .update(tenderInformation)
                    .set({
                        tenderValue: payload.tenderValue?.toString() ?? null,
                        teRecommendation: payload.teRecommendation,
                        teRejectionReason: payload.teRejectionReason ?? null,
                        teRejectionRemarks: payload.teRejectionRemarks ?? null,
                        processingFeeRequired: payload.processingFeeRequired ? String(payload.processingFeeRequired).trim() : null,
                        processingFeeAmount: payload.processingFeeAmount?.toString() ?? null,
                        processingFeeMode: processingFeeModesFiltered,
                        tenderFeeRequired: payload.tenderFeeRequired ? String(payload.tenderFeeRequired).trim() : null,
                        tenderFeeAmount: payload.tenderFeeAmount?.toString() ?? null,
                        tenderFeeMode: tenderFeeModesFiltered,
                        emdRequired: payload.emdRequired ? String(payload.emdRequired).trim() : null,
                        emdAmount: payload.emdAmount?.toString() ?? null,
                        emdMode: emdModesFiltered,
                        reverseAuctionApplicable: payload.reverseAuctionApplicable ? String(payload.reverseAuctionApplicable).trim() : null,
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
                        pbgRequired: payload.pbgRequired ? String(payload.pbgRequired).trim() : null,
                        pbgMode: pbgModeValue,
                        pbgPercentage: payload.pbgPercentage?.toString() ?? null,
                        pbgDurationMonths: payload.pbgDurationMonths ?? null,
                        sdRequired: payload.sdRequired ? String(payload.sdRequired).trim() : null,
                        sdMode: sdModeValue,
                        sdPercentage: payload.sdPercentage?.toString() ?? null,
                        sdDurationMonths: payload.sdDurationMonths ?? null,
                        ldRequired: payload.ldRequired ? String(payload.ldRequired).trim() : null,
                        ldPercentagePerWeek: payload.ldPercentagePerWeek?.toString() ?? null,
                        maxLdPercentage: payload.maxLdPercentage?.toString() ?? null,
                        physicalDocsRequired: payload.physicalDocsRequired ? String(payload.physicalDocsRequired).trim() : null,
                        physicalDocsDeadline: payload.physicalDocsDeadline ?? null,
                        techEligibilityAge: payload.techEligibilityAge ?? null,
                        workValueType: payload.workValueType ?? null,
                        orderValue1: payload.orderValue1?.toString() ?? null,
                        orderValue2: payload.orderValue2?.toString() ?? null,
                        orderValue3: payload.orderValue3?.toString() ?? null,
                        customEligibilityCriteria: payload.customEligibilityCriteria ?? null,
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
                        oemExperience: payload.oemExperience ?? null,
                        updatedAt: new Date(),
                    })
                    .where(eq(tenderInformation.tenderId, tenderId));

                // Update tenderInfo table's gstValues if tender is approved
                if (isApproved && payload.tenderValue) {
                    await tx
                        .update(tenderInfos)
                        .set({
                            gstValues: payload.tenderValue.toString(),
                            updatedAt: new Date(),
                        })
                        .where(eq(tenderInfos.id, tenderId));
                }

                // Delete existing related records
                await Promise.all([
                    tx
                        .delete(tenderClients)
                        .where(eq(tenderClients.tenderId, tenderId)),
                    tx
                        .delete(tenderTechnicalDocuments)
                        .where(eq(tenderTechnicalDocuments.tenderId, tenderId)),
                    tx
                        .delete(tenderFinancialDocuments)
                        .where(eq(tenderFinancialDocuments.tenderId, tenderId)),
                ]);

                // Insert updated related records
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

                const technicalDocs = payload.technicalWorkOrders ?? [];
                if (technicalDocs.length > 0) {
                    await tx.insert(tenderTechnicalDocuments).values(
                        technicalDocs.map((docName) => ({
                            tenderId,
                            documentName: docName,
                        }))
                    );
                }

                const financialDocs = payload.commercialDocuments ?? [];
                if (financialDocs.length > 0) {
                    await tx.insert(tenderFinancialDocuments).values(
                        financialDocs.map((docName) => ({
                            tenderId,
                            documentName: docName,
                        }))
                    );
                }
            });

            const result = await this.findByTenderId(tenderId) as TenderInfoSheetWithRelations;

            // Send email notification
            await this.sendInfoSheetFilledEmail(tenderId, result, changedBy);

            return result;
        } catch (error: any) {
            // Same error handling as create method
            if (error?.cause?.code === '22001') {
                const message = error?.cause?.message || error?.message || '';

                // Log the full error structure for debugging
                this.logger.error(`Database constraint error - Full error object:`, JSON.stringify(error, null, 2));
                this.logger.error(`Error message: ${message}`);

                // Validate YES/NO fields and find the problematic one
                const yesNoFields = {
                    processingFeeRequired: payload.processingFeeRequired,
                    tenderFeeRequired: payload.tenderFeeRequired,
                    emdRequired: payload.emdRequired,
                    pbgRequired: payload.pbgRequired,
                    sdRequired: payload.sdRequired,
                    ldRequired: payload.ldRequired,
                    physicalDocsRequired: payload.physicalDocsRequired,
                    reverseAuctionApplicable: payload.reverseAuctionApplicable,
                    oemExperience: payload.oemExperience,
                };

                // Check each field for invalid values
                const invalidFields: string[] = [];
                for (const [fieldName, value] of Object.entries(yesNoFields)) {
                    if (value !== null && value !== undefined) {
                        const strValue = String(value);
                        if (strValue.length > 5) {
                            invalidFields.push(`${fieldName}="${strValue}" (length: ${strValue.length})`);
                        } else if (strValue !== 'YES' && strValue !== 'NO' && strValue !== 'EXEMPT') {
                            invalidFields.push(`${fieldName}="${strValue}"`);
                        }
                    }
                }

                this.logger.error(`YES/NO field values:`, JSON.stringify(yesNoFields));
                if (invalidFields.length > 0) {
                    this.logger.error(`Invalid fields detected: ${invalidFields.join(', ')}`);
                }

                if (message.includes('character varying(5)')) {
                    const errorMsg = invalidFields.length > 0
                        ? `Invalid YES/NO field values detected: ${invalidFields.join(', ')}. Please ensure YES/NO fields contain only "YES" or "NO".`
                        : `One or more YES/NO fields have invalid values. Please ensure YES/NO fields contain only "YES" or "NO". Original error: ${message}`;
                    throw new BadRequestException(errorMsg);
                }
                throw new BadRequestException(
                    `Invalid data: ${message.includes('too long') ? 'One or more values exceed the maximum length allowed. ' : ''}${message}`
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

    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send info sheet filled email
     */
    private async sendInfoSheetFilledEmail(
        tenderId: number,
        infoSheet: TenderInfoSheetWithRelations,
        changedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        const [websiteData] = await Promise.all([
            tender.website ? this.db.select({ name: websites.name, url: websites.url }).from(websites).where(eq(websites.id, tender.website)).limit(1) : Promise.resolve([]),
        ]);
        const websiteName = websiteData[0]?.name || websiteData[0]?.url || 'Not specified';

        // Format due date
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Format currency values
        const formatCurrency = (value: string | null) => {
            if (!value) return '0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        // Format percentage
        const formatPercent = (value: string | null) => {
            if (!value) return '0';
            return `${value}%`;
        };

        // Build document lists
        const teDocs = infoSheet.technicalWorkOrders.map(doc => `<li>${doc.documentName}</li>`).join('');
        const tenderDocs = infoSheet.commercialDocuments.map(doc => `<li>${doc.documentName}</li>`).join('');
        const ceDocs = infoSheet.commercialDocuments.map(doc => `<li>${doc.documentName}</li>`).join('');

        // Format array fields (modes) as comma-separated strings
        const formatArray = (arr: string[] | null | undefined): string => {
            if (!arr || arr.length === 0) return 'Not specified';
            return arr.join(', ');
        };

        // Format physical docs deadline
        const formatPhysicalDocsDeadline = (deadline: Date | string | null): string => {
            if (!deadline) return 'N/A';
            const date = deadline instanceof Date ? deadline : new Date(deadline);
            return date.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        // Build email data matching template
        const emailData: Record<string, any> = {
            organization: tender.organizationName || 'Not specified',
            tender_name: tender.tenderName,
            tender_no: tender.tenderNo,
            website: websiteName,
            dueDate,
            recommendation_by_te: infoSheet.teRecommendation || 'Not specified',
            reason: infoSheet.teRejectionReason || infoSheet.teRejectionRemarks || 'N/A',
            // Processing Fee fields
            processing_fee_required: infoSheet.processingFeeRequired || 'No',
            processing_fee_amount: formatCurrency(infoSheet.processingFeeAmount),
            processing_fee_modes: formatArray(infoSheet.processingFeeMode),
            // Tender Fee fields
            tender_fee_required: infoSheet.tenderFeeRequired || 'No',
            tender_fees: formatCurrency(infoSheet.tenderFeeAmount),
            tender_fees_in_form_of: formatArray(infoSheet.tenderFeeMode),
            // EMD fields
            emd: formatCurrency(infoSheet.emdAmount),
            emd_required: infoSheet.emdRequired || 'No',
            emd_in_form_of: formatArray(infoSheet.emdMode),
            // Tender Value
            tender_value: formatCurrency(tender.gstValues),
            // OEM Experience
            oem_experience: infoSheet.oemExperience || 'Not specified',
            // Bid & Commercial
            bid_validity: infoSheet.bidValidityDays?.toString() || 'Not specified',
            commercial_evaluation: infoSheet.commercialEvaluation || 'Not specified',
            ra_applicable: infoSheet.reverseAuctionApplicable || 'No',
            maf_required: infoSheet.mafRequired || 'No',
            // Delivery Time
            delivery_time: infoSheet.deliveryTimeSupply?.toString() || 'Not specified',
            delivery_time_ic_inclusive: infoSheet.deliveryTimeInstallationInclusive ? 'Yes' : 'No',
            delivery_time_ic: infoSheet.deliveryTimeInstallationDays?.toString() || 'Not specified',
            // PBG fields
            pbg_required: infoSheet.pbgRequired || 'No',
            pbg_form: formatArray(infoSheet.pbgMode ? JSON.parse(infoSheet.pbgMode) : null),
            pbg_percentage: formatPercent(infoSheet.pbgPercentage),
            pbg_duration: infoSheet.pbgDurationMonths?.toString() || 'Not specified',
            // SD fields
            sd_required: infoSheet.sdRequired || 'No',
            sd_form: formatArray(infoSheet.sdMode ? JSON.parse(infoSheet.sdMode) : null),
            sd_percentage: formatPercent(infoSheet.sdPercentage),
            sd_duration: infoSheet.sdDurationMonths?.toString() || 'Not specified',
            // Payment Terms
            payment_terms: formatPercent(infoSheet.paymentTermsSupply?.toString() || null),
            payment_terms_ic: formatPercent(infoSheet.paymentTermsInstallation?.toString() || null),
            // LD fields
            ld_required: infoSheet.ldRequired || 'No',
            ld_percentage: formatPercent(infoSheet.ldPercentagePerWeek),
            max_ld: formatPercent(infoSheet.maxLdPercentage),
            // Physical Docs
            phydocs_submission_required: infoSheet.physicalDocsRequired || 'No',
            phydocsRequired: infoSheet.physicalDocsRequired === 'Yes',
            phydocs_submission_deadline: formatPhysicalDocsDeadline(infoSheet.physicalDocsDeadline),
            // Technical Eligibility
            eligibility_criterion: infoSheet.techEligibilityAge?.toString() || 'Not specified',
            work_value_type: infoSheet.workValueType || 'Not specified',
            custom_eligibility_criteria: infoSheet.customEligibilityCriteria || '',
            work_value1: formatCurrency(infoSheet.orderValue1),
            name1: infoSheet.workValueType === 'orderValue1' ? 'Selected' : '',
            work_value2: formatCurrency(infoSheet.orderValue2),
            name2: infoSheet.workValueType === 'orderValue2' ? 'Selected' : '',
            work_value3: formatCurrency(infoSheet.orderValue3),
            name3: infoSheet.workValueType === 'orderValue3' ? 'Selected' : '',
            // Financial Criterion
            aat_display: infoSheet.avgAnnualTurnoverType || 'Not specified',
            aat_amt: formatCurrency(infoSheet.avgAnnualTurnoverValue),
            wc_display: infoSheet.workingCapitalType || 'Not specified',
            wc_amt: formatCurrency(infoSheet.workingCapitalValue),
            nw_display: infoSheet.netWorthType || 'Not specified',
            nw_amt: formatCurrency(infoSheet.netWorthValue),
            sc_display: infoSheet.solvencyCertificateType || 'Not specified',
            sc_amt: formatCurrency(infoSheet.solvencyCertificateValue),
            // Documents
            te_docs: teDocs || '<li>None</li>',
            tender_docs: tenderDocs || '<li>None</li>',
            ce_docs: ceDocs || '<li>None</li>',
            // Clients
            clients: infoSheet.clients.map(client => ({
                client_name: client.clientName,
                client_designation: client.clientDesignation || '',
                client_email: client.clientEmail || '',
                client_mobile: client.clientMobile || '',
            })),
            // Courier & Remarks
            courier_address: infoSheet.courierAddress || 'Not specified',
            te_final_remark: infoSheet.teFinalRemark || '',
            // Link & Assignee
            link: `#/tendering/tender-approvals/${tenderId}/approval`, // TODO: Update with actual frontend URL
            assignee: assignee.name,
        };

        await this.sendEmail(
            'info-sheet.filled',
            tenderId,
            changedBy,
            `Tender Info - ${tender.tenderName}`,
            'tender-info-sheet-filled',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tender.team },
                    { type: 'role', role: 'Coordinator', teamId: tender.team },
                ],
            }
        );
    }
}
