import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, inArray, or } from 'drizzle-orm';
import { tenderInformation, tenderClients, tenderTechnicalDocuments, tenderFinancialDocuments, type TenderInformation, type TenderClient } from '@db/schemas/tendering/tender-info-sheet.schema';
import type { TenderInfoSheetPayload } from '@/modules/tendering/info-sheets/dto/info-sheet.dto';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { organizations } from '@db/schemas/master/organizations.schema';
import { websites } from '@db/schemas/master/websites.schema';
import { TimersService } from '@/modules/timers/timers.service';
import { pqrDocuments } from '@db/schemas/shared/pqr.schema';
import { financeDocuments } from '@db/schemas/shared/finance_docs.schema';

export type TechnicalDocument = {
    id: number;
    projectName: string | null;
    poDocument: string[] | null;
};
export type FinancialDocument = {
    id: number;
    documentName: string | null;
    documentPath: string[] | null;
};

export type TenderInfoSheetWithRelations = TenderInformation & {
    clients: TenderClient[];
    technicalWorkOrders: TechnicalDocument[];
    commercialDocuments: FinancialDocument[];
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

    async findByTenderId(tenderId: number): Promise<TenderInfoSheetWithRelations | null> {
        const info = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (!info.length) {
            return null;
        }

        const [infoSheetData] = info;
        
        // Safe parse for JSON fields stored in text columns
        const parseJsonField = (field: any) => {
            if (!field) return null;
            if (Array.isArray(field)) return field;
            try {
                return JSON.parse(field);
            } catch (e) {
                return [field]; // Fallback to array with single value
            }
        };

        const infoSheet = {
            ...infoSheetData,
            pbgMode: parseJsonField(infoSheetData.pbgMode),
            sdMode: parseJsonField(infoSheetData.sdMode),
        };

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

        // Separate numeric IDs from text names for technical documents
        const technicalDocIds: number[] = [];
        const technicalDocNames: string[] = [];

        technicalDocs.forEach(doc => {
            const parsed = Number(doc.documentName);
            if (!isNaN(parsed) && doc.documentName?.trim() !== '') {
                technicalDocIds.push(parsed);
            } else if (doc.documentName) {
                technicalDocNames.push(doc.documentName);
            }
        });

        // Separate numeric IDs from text names for financial documents
        const financialDocIds: number[] = [];
        const financialDocNames: string[] = [];

        financialDocs.forEach(doc => {
            const parsed = Number(doc.documentName);
            if (!isNaN(parsed) && doc.documentName?.trim() !== '') {
                financialDocIds.push(parsed);
            } else if (doc.documentName) {
                financialDocNames.push(doc.documentName);
            }
        });

        // Fetch actual documents from pqr_documents and finance_documents
        const [pqrDocumentsAll, financeDocumentsAll] = await Promise.all([
            // Fetch PQR documents by ID or by project_name
            technicalDocIds.length > 0 || technicalDocNames.length > 0
                ? this.db
                    .select({
                        id: pqrDocuments.id,
                        projectName: pqrDocuments.projectName,
                        poDocument: pqrDocuments.uploadPo,
                    })
                    .from(pqrDocuments)
                    .where(
                        or(
                            technicalDocIds.length > 0
                                ? inArray(pqrDocuments.id, technicalDocIds)
                                : undefined,
                            technicalDocNames.length > 0
                                ? inArray(pqrDocuments.projectName, technicalDocNames)
                                : undefined
                        )
                    )
                : Promise.resolve([]),

            // Fetch Finance documents by ID or by document_name
            financialDocIds.length > 0 || financialDocNames.length > 0
                ? this.db
                    .select({
                        id: financeDocuments.id,
                        documentName: financeDocuments.documentName,
                        documentPath: financeDocuments.documentPath,
                    })
                    .from(financeDocuments)
                    .where(
                        or(
                            financialDocIds.length > 0
                                ? inArray(financeDocuments.id, financialDocIds)
                                : undefined,
                            financialDocNames.length > 0
                                ? inArray(financeDocuments.documentName, financialDocNames)
                                : undefined
                        )
                    )
                : Promise.resolve([]),
        ]);

        return {
            ...infoSheet,
            clients,
            technicalWorkOrders: pqrDocumentsAll,
            commercialDocuments: financeDocumentsAll,
        };
    }

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
        await this.tenderInfosService.validateExists(tenderId);

        // Only validate YES/NO field constraints when recommending
        // When teRecommendation === 'NO', most fields will be null — skip validation
        if (payload.teRecommendation === 'YES') {
            this.validateYesNoFields(payload);
        }

        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            throw new ConflictException(
                `Info sheet already exists for tender ${tenderId}`
            );
        }

        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 2;

        try {
            await this.db.transaction(async (tx) => {
                const filterArray = (
                    arr: string[] | null | undefined
                ): string[] | null => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0)
                        return null;
                    const filtered = arr.filter(
                        (mode) =>
                            mode &&
                            mode !== 'undefined' &&
                            String(mode).trim().length > 0
                    );
                    return filtered.length > 0 ? filtered : null;
                };

                // ── When NO: nullify all YES-branch fields before insert ───────────
                const isRejection = payload.teRecommendation === 'NO';

                const pbgModeValue =
                    !isRejection &&
                    payload.pbgMode &&
                    Array.isArray(payload.pbgMode) &&
                    payload.pbgMode.length > 0
                        ? (() => {
                            const filtered = payload.pbgMode!.filter(
                                (mode) =>
                                    mode &&
                                    mode !== 'undefined' &&
                                    String(mode).trim().length > 0
                            );
                            return filtered.length > 0
                                ? JSON.stringify(filtered)
                                : null;
                        })()
                        : null;

                const sdModeValue =
                    !isRejection &&
                    payload.sdMode &&
                    Array.isArray(payload.sdMode) &&
                    payload.sdMode.length > 0
                        ? (() => {
                            const filtered = payload.sdMode!.filter(
                                (mode) =>
                                    mode &&
                                    mode !== 'undefined' &&
                                    String(mode).trim().length > 0
                            );
                            return filtered.length > 0
                                ? JSON.stringify(filtered)
                                : null;
                        })()
                        : null;

                const processingFeeModesFiltered = isRejection
                    ? null
                    : filterArray(payload.processingFeeModes);
                const tenderFeeModesFiltered = isRejection
                    ? null
                    : filterArray(payload.tenderFeeModes);
                const emdModesFiltered = isRejection
                    ? null
                    : filterArray(payload.emdModes);

                await tx
                    .insert(tenderInformation)
                    .values({
                        tenderId,
                        teRecommendation: payload.teRecommendation,

                        // Rejection fields — always from payload
                        teRejectionReason: payload.teRejectionReason ?? null,
                        teRejectionRemarks: payload.teRejectionRemarks ?? null,
                        teRejectionProof: isRejection
                            ? filterArray(payload.teRejectionProof)
                            : null,

                        // YES-branch fields — null when rejecting
                        tenderValue: isRejection
                            ? null
                            : (payload.tenderValue?.toString() ?? null),
                        oemExperience: isRejection
                            ? null
                            : (payload.oemExperience ?? null),
                        processingFeeRequired: isRejection
                            ? null
                            : (payload.processingFeeRequired
                                ? String(payload.processingFeeRequired).trim()
                                : null),
                        processingFeeAmount: isRejection
                            ? null
                            : (payload.processingFeeAmount?.toString() ?? null),
                        processingFeeMode: processingFeeModesFiltered,
                        tenderFeeRequired: isRejection
                            ? null
                            : (payload.tenderFeeRequired
                                ? String(payload.tenderFeeRequired).trim()
                                : null),
                        tenderFeeAmount: isRejection
                            ? null
                            : (payload.tenderFeeAmount?.toString() ?? null),
                        tenderFeeMode: tenderFeeModesFiltered,
                        emdRequired: isRejection
                            ? null
                            : (payload.emdRequired
                                ? String(payload.emdRequired).trim()
                                : null),
                        emdAmount: isRejection
                            ? null
                            : (payload.emdAmount?.toString() ?? null),
                        emdMode: emdModesFiltered,
                        reverseAuctionApplicable: isRejection
                            ? null
                            : (payload.reverseAuctionApplicable
                                ? String(payload.reverseAuctionApplicable).trim()
                                : null),
                        paymentTermsSupply: isRejection
                            ? null
                            : (payload.paymentTermsSupply ?? null),
                        paymentTermsInstallation: isRejection
                            ? null
                            : (payload.paymentTermsInstallation ?? null),
                        bidValidityDays: isRejection
                            ? null
                            : (payload.bidValidityDays ?? null),
                        commercialEvaluation: isRejection
                            ? null
                            : (payload.commercialEvaluation ?? null),
                        mafRequired: isRejection
                            ? null
                            : (payload.mafRequired
                                ? String(payload.mafRequired).trim()
                                : null),
                        deliveryTimeSupply: isRejection
                            ? null
                            : (payload.deliveryTimeSupply ?? null),
                        deliveryTimeInstallationInclusive: isRejection
                            ? false
                            : (payload.deliveryTimeInstallationInclusive ?? false),
                        deliveryTimeInstallationDays: isRejection
                            ? null
                            : (payload.deliveryTimeInstallationDays ?? null),
                        pbgRequired: isRejection
                            ? null
                            : (payload.pbgRequired
                                ? String(payload.pbgRequired).trim()
                                : null),
                        pbgMode: pbgModeValue,
                        pbgPercentage: isRejection
                            ? null
                            : (payload.pbgPercentage?.toString() ?? null),
                        pbgDurationMonths: isRejection
                            ? null
                            : (payload.pbgDurationMonths ?? null),
                        sdRequired: isRejection
                            ? null
                            : (payload.sdRequired
                                ? String(payload.sdRequired).trim()
                                : null),
                        sdMode: sdModeValue,
                        sdPercentage: isRejection
                            ? null
                            : (payload.sdPercentage?.toString() ?? null),
                        sdDurationMonths: isRejection
                            ? null
                            : (payload.sdDurationMonths ?? null),
                        ldRequired: isRejection
                            ? null
                            : (payload.ldRequired
                                ? String(payload.ldRequired).trim()
                                : null),
                        ldPercentagePerWeek: isRejection
                            ? null
                            : (payload.ldPercentagePerWeek?.toString() ?? null),
                        maxLdPercentage: isRejection
                            ? null
                            : (payload.maxLdPercentage?.toString() ?? null),
                        physicalDocsRequired: isRejection
                            ? null
                            : (payload.physicalDocsRequired
                                ? String(payload.physicalDocsRequired).trim()
                                : null),
                        physicalDocsDeadline: isRejection
                            ? null
                            : (payload.physicalDocsDeadline ?? null),
                        physicalDocType: isRejection
                            ? null
                            : (payload.physicalDocType ?? null),
                        techEligibilityAge: isRejection
                            ? null
                            : (payload.techEligibilityAge ?? null),
                        workValueType: isRejection
                            ? null
                            : (payload.workValueType ?? null),
                        orderValue1: isRejection
                            ? null
                            : (payload.orderValue1?.toString() ?? null),
                        orderValue2: isRejection
                            ? null
                            : (payload.orderValue2?.toString() ?? null),
                        orderValue3: isRejection
                            ? null
                            : (payload.orderValue3?.toString() ?? null),
                        customEligibilityCriteria: isRejection
                            ? null
                            : (payload.customEligibilityCriteria ?? null),
                        avgAnnualTurnoverType: isRejection
                            ? null
                            : (payload.avgAnnualTurnoverType ?? null),
                        avgAnnualTurnoverValue: isRejection
                            ? null
                            : (payload.avgAnnualTurnoverValue?.toString() ?? null),
                        workingCapitalType: isRejection
                            ? null
                            : (payload.workingCapitalType ?? null),
                        workingCapitalValue: isRejection
                            ? null
                            : (payload.workingCapitalValue?.toString() ?? null),
                        solvencyCertificateType: isRejection
                            ? null
                            : (payload.solvencyCertificateType ?? null),
                        solvencyCertificateValue: isRejection
                            ? null
                            : (payload.solvencyCertificateValue?.toString() ??
                                null),
                        netWorthType: isRejection
                            ? null
                            : (payload.netWorthType ?? null),
                        netWorthValue: isRejection
                            ? null
                            : (payload.netWorthValue?.toString() ?? null),
                        courierAddress: isRejection
                            ? null
                            : (payload.courierAddress ?? null),
                        teFinalRemark: isRejection
                            ? null
                            : (payload.teFinalRemark ?? null),
                    })
                    .returning();

                // Clients only relevant when recommending
                const clients = isRejection ? [] : (payload.clients ?? []);
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

                // Technical & financial documents only relevant when recommending
                if (!isRejection) {
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
                }

                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId,
                    newStatus,
                    changedBy,
                    prevStatus,
                    isRejection
                        ? 'Tender info sheet filled (not recommended)'
                        : 'Tender info sheet filled',
                    tx
                );
            });

            const result = (await this.findByTenderId(
                tenderId
            )) as TenderInfoSheetWithRelations;

            // Timer transition (unchanged)
            try {
                this.logger.log(
                    `Transitioning timers for tender ${tenderId}`
                );
                try {
                    await this.timersService.stopTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'tender_info_sheet',
                        userId: changedBy,
                        reason: 'Tender info sheet completed',
                    });
                } catch (error) {
                    this.logger.warn(
                        `Failed to stop tender_info_sheet timer for tender ${tenderId}:`,
                        error
                    );
                }
                try {
                    await this.timersService.startTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'tender_approval',
                        userId: changedBy,
                        timerConfig: {
                            type: 'FIXED_DURATION',
                            durationHours: 24,
                        },
                    });
                } catch (error) {
                    this.logger.warn(
                        `Failed to start tender_approval timer for tender ${tenderId}:`,
                        error
                    );
                }
            } catch (error) {
                this.logger.error(
                    `Failed to transition timers for tender ${tenderId}:`,
                    error
                );
            }

            // await this.sendInfoSheetFilledEmail(tenderId, result, changedBy);

            return result;
        } catch (error: any) {
            this._handleDbError(error, payload);
        }
    }

    async update(
        tenderId: number,
        payload: TenderInfoSheetPayload,
        changedBy: number
    ): Promise<TenderInfoSheetWithRelations> {
        await this.tenderInfosService.validateExists(tenderId);

        // Only validate YES/NO constraints when recommending
        if (payload.teRecommendation === 'YES') {
            this.validateYesNoFields(payload);
        }

        const existing = await this.findByTenderId(tenderId);
        if (!existing) {
            throw new NotFoundException(
                `Info sheet not found for tender ${tenderId}`
            );
        }

        const tender = await this.tenderInfosService.findById(tenderId);
        const isApproved = tender?.tlStatus === 1 || tender?.tlStatus === 2;

        try {
            await this.db.transaction(async (tx) => {
                const filterArray = (
                    arr: string[] | null | undefined
                ): string[] | null => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0)
                        return null;
                    const filtered = arr.filter(
                        (mode) =>
                            mode &&
                            mode !== 'undefined' &&
                            String(mode).trim().length > 0
                    );
                    return filtered.length > 0 ? filtered : null;
                };

                const isRejection = payload.teRecommendation === 'NO';

                const pbgModeValue =
                    !isRejection &&
                    payload.pbgMode &&
                    Array.isArray(payload.pbgMode) &&
                    payload.pbgMode.length > 0
                        ? (() => {
                            const filtered = payload.pbgMode!.filter(
                                (mode) =>
                                    mode &&
                                    mode !== 'undefined' &&
                                    String(mode).trim().length > 0
                            );
                            return filtered.length > 0
                                ? JSON.stringify(filtered)
                                : null;
                        })()
                        : null;

                const sdModeValue =
                    !isRejection &&
                    payload.sdMode &&
                    Array.isArray(payload.sdMode) &&
                    payload.sdMode.length > 0
                        ? (() => {
                            const filtered = payload.sdMode!.filter(
                                (mode) =>
                                    mode &&
                                    mode !== 'undefined' &&
                                    String(mode).trim().length > 0
                            );
                            return filtered.length > 0
                                ? JSON.stringify(filtered)
                                : null;
                        })()
                        : null;

                const processingFeeModesFiltered = isRejection
                    ? null
                    : filterArray(payload.processingFeeModes);
                const tenderFeeModesFiltered = isRejection
                    ? null
                    : filterArray(payload.tenderFeeModes);
                const emdModesFiltered = isRejection
                    ? null
                    : filterArray(payload.emdModes);

                await tx
                    .update(tenderInformation)
                    .set({
                        teRecommendation: payload.teRecommendation,
                        teRejectionReason: payload.teRejectionReason ?? null,
                        teRejectionRemarks: payload.teRejectionRemarks ?? null,
                        teRejectionProof: isRejection
                            ? filterArray(payload.teRejectionProof)
                            : null,

                        tenderValue: isRejection
                            ? null
                            : (payload.tenderValue?.toString() ?? null),
                        oemExperience: isRejection
                            ? null
                            : (payload.oemExperience ?? null),
                        processingFeeRequired: isRejection
                            ? null
                            : (payload.processingFeeRequired
                                ? String(
                                        payload.processingFeeRequired
                                    ).trim()
                                : null),
                        processingFeeAmount: isRejection
                            ? null
                            : (payload.processingFeeAmount?.toString() ??
                                null),
                        processingFeeMode: processingFeeModesFiltered,
                        tenderFeeRequired: isRejection
                            ? null
                            : (payload.tenderFeeRequired
                                ? String(payload.tenderFeeRequired).trim()
                                : null),
                        tenderFeeAmount: isRejection
                            ? null
                            : (payload.tenderFeeAmount?.toString() ?? null),
                        tenderFeeMode: tenderFeeModesFiltered,
                        emdRequired: isRejection
                            ? null
                            : (payload.emdRequired
                                ? String(payload.emdRequired).trim()
                                : null),
                        emdAmount: isRejection
                            ? null
                            : (payload.emdAmount?.toString() ?? null),
                        emdMode: emdModesFiltered,
                        reverseAuctionApplicable: isRejection
                            ? null
                            : (payload.reverseAuctionApplicable
                                ? String(
                                        payload.reverseAuctionApplicable
                                    ).trim()
                                : null),
                        paymentTermsSupply: isRejection
                            ? null
                            : (payload.paymentTermsSupply ?? null),
                        paymentTermsInstallation: isRejection
                            ? null
                            : (payload.paymentTermsInstallation ?? null),
                        bidValidityDays: isRejection
                            ? null
                            : (payload.bidValidityDays ?? null),
                        commercialEvaluation: isRejection
                            ? null
                            : (payload.commercialEvaluation ?? null),
                        mafRequired: isRejection
                            ? null
                            : (payload.mafRequired
                                ? String(payload.mafRequired).trim()
                                : null),
                        deliveryTimeSupply: isRejection
                            ? null
                            : (payload.deliveryTimeSupply ?? null),
                        deliveryTimeInstallationInclusive: isRejection
                            ? false
                            : (payload.deliveryTimeInstallationInclusive ??
                                false),
                        deliveryTimeInstallationDays: isRejection
                            ? null
                            : (payload.deliveryTimeInstallationDays ?? null),
                        pbgRequired: isRejection
                            ? null
                            : (payload.pbgRequired
                                ? String(payload.pbgRequired).trim()
                                : null),
                        pbgMode: pbgModeValue,
                        pbgPercentage: isRejection
                            ? null
                            : (payload.pbgPercentage?.toString() ?? null),
                        pbgDurationMonths: isRejection
                            ? null
                            : (payload.pbgDurationMonths ?? null),
                        sdRequired: isRejection
                            ? null
                            : (payload.sdRequired
                                ? String(payload.sdRequired).trim()
                                : null),
                        sdMode: sdModeValue,
                        sdPercentage: isRejection
                            ? null
                            : (payload.sdPercentage?.toString() ?? null),
                        sdDurationMonths: isRejection
                            ? null
                            : (payload.sdDurationMonths ?? null),
                        ldRequired: isRejection
                            ? null
                            : (payload.ldRequired
                                ? String(payload.ldRequired).trim()
                                : null),
                        ldPercentagePerWeek: isRejection
                            ? null
                            : (payload.ldPercentagePerWeek?.toString() ??
                                null),
                        maxLdPercentage: isRejection
                            ? null
                            : (payload.maxLdPercentage?.toString() ?? null),
                        physicalDocsRequired: isRejection
                            ? null
                            : (payload.physicalDocsRequired
                                ? String(
                                        payload.physicalDocsRequired
                                    ).trim()
                                : null),
                        physicalDocsDeadline: isRejection
                            ? null
                            : (payload.physicalDocsDeadline ?? null),
                        physicalDocType: isRejection
                            ? null
                            : (payload.physicalDocType ?? null),
                        techEligibilityAge: isRejection
                            ? null
                            : (payload.techEligibilityAge ?? null),
                        workValueType: isRejection
                            ? null
                            : (payload.workValueType ?? null),
                        orderValue1: isRejection
                            ? null
                            : (payload.orderValue1?.toString() ?? null),
                        orderValue2: isRejection
                            ? null
                            : (payload.orderValue2?.toString() ?? null),
                        orderValue3: isRejection
                            ? null
                            : (payload.orderValue3?.toString() ?? null),
                        customEligibilityCriteria: isRejection
                            ? null
                            : (payload.customEligibilityCriteria ?? null),
                        avgAnnualTurnoverType: isRejection
                            ? null
                            : (payload.avgAnnualTurnoverType ?? null),
                        avgAnnualTurnoverValue: isRejection
                            ? null
                            : (payload.avgAnnualTurnoverValue?.toString() ??
                                null),
                        workingCapitalType: isRejection
                            ? null
                            : (payload.workingCapitalType ?? null),
                        workingCapitalValue: isRejection
                            ? null
                            : (payload.workingCapitalValue?.toString() ??
                                null),
                        solvencyCertificateType: isRejection
                            ? null
                            : (payload.solvencyCertificateType ?? null),
                        solvencyCertificateValue: isRejection
                            ? null
                            : (payload.solvencyCertificateValue?.toString() ??
                                null),
                        netWorthType: isRejection
                            ? null
                            : (payload.netWorthType ?? null),
                        netWorthValue: isRejection
                            ? null
                            : (payload.netWorthValue?.toString() ?? null),
                        courierAddress: isRejection
                            ? null
                            : (payload.courierAddress ?? null),
                        teFinalRemark: isRejection
                            ? null
                            : (payload.teFinalRemark ?? null),
                        updatedAt: new Date(),
                    })
                    .where(eq(tenderInformation.tenderId, tenderId));

                // Update gstValues only when recommending and approved
                if (!isRejection && isApproved && payload.tenderValue) {
                    await tx
                        .update(tenderInfos)
                        .set({
                            gstValues: payload.tenderValue.toString(),
                            updatedAt: new Date(),
                        })
                        .where(eq(tenderInfos.id, tenderId));
                }

                // Delete existing related records (always, to clear stale data)
                await Promise.all([
                    tx
                        .delete(tenderClients)
                        .where(eq(tenderClients.tenderId, tenderId)),
                    tx
                        .delete(tenderTechnicalDocuments)
                        .where(
                            eq(tenderTechnicalDocuments.tenderId, tenderId)
                        ),
                    tx
                        .delete(tenderFinancialDocuments)
                        .where(
                            eq(tenderFinancialDocuments.tenderId, tenderId)
                        ),
                ]);

                // Re-insert related records only when recommending
                if (!isRejection) {
                    const clients = payload.clients ?? [];
                    if (clients.length > 0) {
                        await tx.insert(tenderClients).values(
                            clients.map((client) => ({
                                tenderId,
                                clientName: client.clientName,
                                clientDesignation:
                                    client.clientDesignation ?? null,
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
                }
            });

            const result = (await this.findByTenderId(
                tenderId
            )) as TenderInfoSheetWithRelations;

            const prevStatus = tender?.status ?? null;
            let newStatus = prevStatus ?? 2;

            if (prevStatus === 29) {
                newStatus = 2;
                await this.db
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));
            }

            const isRejection = payload.teRecommendation === 'NO';

            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId,
                newStatus,
                changedBy,
                prevStatus,
                prevStatus === 29
                    ? isRejection
                        ? 'Tender info sheet re-filled (not recommended)'
                        : 'Tender info sheet re-filled (was incomplete)'
                    : isRejection
                        ? 'Tender info sheet updated (not recommended)'
                        : 'Tender info sheet updated',
            );

            // await this.sendInfoSheetFilledEmail(tenderId, result, changedBy);

            return result;
        } catch (error: any) {
            this._handleDbError(error, payload);
        }
    }

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

    private async sendInfoSheetFilledEmail(
        tenderId: number,
        infoSheet: TenderInfoSheetWithRelations,
        changedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        const [websiteData, orgData] = await Promise.all([
            tender.website ? this.db.select({ name: websites.name, url: websites.url }).from(websites).where(eq(websites.id, tender.website)).limit(1) : Promise.resolve([]),
            tender.organization ? this.db.select({ name: organizations.name, shortName: organizations.acronym }).from(organizations).where(eq(organizations.id, tender.organization)).limit(1) : Promise.resolve([]),
        ]);
        const websiteName = websiteData[0]?.name || websiteData[0]?.url || 'Not specified';
        const organizationName = orgData[0]?.name || orgData[0]?.shortName || 'Not specified';

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
            return `${value}`;
        };

        // Fetch all PQR and Finance documents for mapping
        const [allPqrDocs, allFinanceDocs] = await Promise.all([
            this.db.select().from(pqrDocuments).limit(1000),
            this.db.select().from(financeDocuments).limit(1000),
        ]);

        // Create maps for document lookup
        const pqrMap = new Map<number, string>();
        allPqrDocs.forEach(pqr => {
            const label = pqr.projectName
                ? (pqr.item ? `${pqr.projectName} - ${pqr.item}` : pqr.projectName)
                : `PQR ${pqr.id}`;
            pqrMap.set(pqr.id, label);
        });

        const financeMap = new Map<number, string>();
        allFinanceDocs.forEach(doc => {
            if (doc.documentName) {
                financeMap.set(doc.id, doc.documentName);
            }
        });

        // Build document lists with mapped names
        const teDocs = infoSheet.technicalWorkOrders.length > 0
            ? infoSheet.technicalWorkOrders.map(doc =>
                `<li>${doc.projectName || `Document ${doc.id}`}</li>`
            ).join('') : '<li>None</li>';

        const ceDocs = infoSheet.commercialDocuments.length > 0
            ? infoSheet.commercialDocuments.map(doc =>
                `<li>${doc.documentName || `Document ${doc.id}`}</li>`
            ).join('') : '<li>None</li>';

        let docs = [];
        if (tender.documents) {
            try {
                docs = JSON.parse(tender.documents);
            } catch (e) {
                docs = [];
            }
        }

        const tenderDocs = docs.length > 0
            ? docs.map((doc, index) => `<li>${doc || `Document ${index + 1}`}</li>`).join('')
            : '<li>None</li>';


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
            organization: organizationName,
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
            phydocs_doc_type: infoSheet.physicalDocType?.replaceAll('_', ' ') || 'N/A',
            phydocsRequired: infoSheet.physicalDocsRequired === 'YES',
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
            te_docs: teDocs,
            tender_docs: tenderDocs,
            ce_docs: ceDocs,
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
            link: `#/tendering/tender-approvals/${tenderId}/approval`,
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

    /**
     * Centralised DB error handler — eliminates duplication between
     * create() and update().  Always throws, so callers don't need a
     * return value.
     */
    private _handleDbError(error: any, payload: TenderInfoSheetPayload): never {
        if (error?.cause?.code === '22001') {
            const message = error?.cause?.message || error?.message || '';
            this.logger.error(
                `Database constraint error:`,
                JSON.stringify(error, null, 2)
            );

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

            const invalidFields: string[] = [];
            for (const [fieldName, value] of Object.entries(yesNoFields)) {
                if (value !== null && value !== undefined) {
                    const strValue = String(value);
                    if (
                        strValue.length > 5 ||
                        (strValue !== 'YES' &&
                            strValue !== 'NO' &&
                            strValue !== 'EXEMPT')
                    ) {
                        invalidFields.push(`${fieldName}="${strValue}"`);
                    }
                }
            }

            if (message.includes('character varying(5)')) {
                throw new BadRequestException(
                    invalidFields.length > 0
                        ? `Invalid YES/NO field values: ${invalidFields.join(', ')}.`
                        : `One or more YES/NO fields have invalid values. Original error: ${message}`
                );
            }

            throw new BadRequestException(
                `Invalid data: ${message.includes('too long') ? 'One or more values exceed the maximum length. ' : ''}${message}`
            );
        }

        if (error?.code === '23505') {
            throw new BadRequestException(
                'A record with this information already exists.'
            );
        }

        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ConflictException
        ) {
            throw error;
        }

        this.logger.error('Unexpected info sheet error:', error);
        throw new InternalServerErrorException(
            'Failed to save tender information. Please check your input and try again.'
        );
    }
}
