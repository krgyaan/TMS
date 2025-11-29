import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
    type PaymentRequest,
    type PaymentInstrument,
} from '../../../db/emds.schema';
import { tenderInfos } from '../../../db/tenders.schema';
import { tenderInformation } from '../../../db/tender-info-sheet.schema';
import { TenderInfosService } from '../tenders/tenders.service';
import type { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto } from './dto/emds.dto';

// Map frontend mode to database instrument type
const mapInstrumentType = (mode: string): 'DD' | 'FDR' | 'BG' | 'Cheque' | 'Bank Transfer' | 'Portal Payment' => {
    const mapping: Record<string, 'DD' | 'FDR' | 'BG' | 'Cheque' | 'Bank Transfer' | 'Portal Payment'> = {
        'DD': 'DD',
        'FDR': 'FDR',
        'BG': 'BG',
        'CHEQUE': 'Cheque',
        'BANK_TRANSFER': 'Bank Transfer',
        'PORTAL': 'Portal Payment',
    };
    return mapping[mode] || 'DD';
};

const PAYMENT_REQUEST_STATUS = {
    CANCELLED: 'Cancelled',
    APPROVED: 'Approved',
    RETURNED: 'Returned',
} as const;

const INSTRUMENT_ACTION = {
    REJECTED: 1,
    APPROVED_MIN: 1,
} as const;

interface TenderPaymentRow {
    tenderId: number;
    tenderNo: string | null;
    tenderName: string | null;
    teamMemberName: string | null;
    gstValues: number;
    tenderFees: number;
    emd: number;
    dueDate: Date | null;
    statusName: string;
    id: number;
}

// Type for the query result
type TenderWithRelations = {
    id: number;
    tenderNo: string | null;
    tenderName: string | null;
    gstValues: string | null;
    tenderFees: string | null;
    emd: string | null;
    dueDate: Date | null;
    teamMember: {
        name: string | null;
    } | null;
    paymentRequests: Array<{
        id: number;
        status: string | null;
        createdAt: Date | null;
        instruments: Array<{
            id: number;
            action: number | null;
        }>;
    }>;
};

type PaymentFilter = 'PENDING' | 'SENT' | 'REQUESTED' | 'REJECTED' | 'CANCELLED' | 'APPROVED' | 'RETURNED';

@Injectable()
export class EmdsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
    ) { }

    async findAllByFilters(statusFilter?: string): Promise<TenderPaymentRow[]> {

    }

    async create(tenderId: number, payload: CreatePaymentRequestDto) {
        // Verify tender exists
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${tenderId} not found`);
        }

        // Get info sheet for processing fee amount
        const [infoSheet] = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        const createdRequests: PaymentRequest[] = [];

        await this.db.transaction(async (tx) => {
            // Create EMD request if mode is provided
            if (payload.emd?.mode && payload.emd?.details) {
                const emdAmount = Number(tender.emd) || 0;
                if (emdAmount > 0) {
                    const [request] = await tx
                        .insert(paymentRequests)
                        .values({
                            tenderId,
                            purpose: 'EMD',
                            amountRequired: emdAmount.toString(),
                            dueDate: tender.dueDate,
                            tenderNo: tender.tenderNo,
                            status: 'Pending',
                        })
                        .returning();

                    createdRequests.push(request);

                    // Create instrument
                    const instrument = await this.createInstrument(tx, request.id, 'EMD', payload.emd?.mode, payload.emd?.details, emdAmount);
                    await this.createInstrumentDetails(tx, instrument.id, payload.emd?.mode, payload.emd?.details);
                }
            }

            // Create Tender Fee request if mode is provided
            if (payload.tenderFee?.mode && payload.tenderFee?.details) {
                const tenderFeeAmount = Number(tender.tenderFees) || 0;
                if (tenderFeeAmount > 0) {
                    const [request] = await tx
                        .insert(paymentRequests)
                        .values({
                            tenderId,
                            purpose: 'Tender Fee',
                            amountRequired: tenderFeeAmount.toString(),
                            dueDate: tender.dueDate,
                            tenderNo: tender.tenderNo,
                            status: 'Pending',
                        })
                        .returning();

                    createdRequests.push(request);

                    // Create instrument
                    const instrument = await this.createInstrument(tx, request.id, 'Tender Fee', payload.tenderFee?.mode, payload.tenderFee?.details, tenderFeeAmount);
                    await this.createInstrumentDetails(tx, instrument.id, payload.tenderFee?.mode, payload.tenderFee?.details);
                }
            }

            // Create Processing Fee request if mode is provided
            if (payload.processingFee?.mode && payload.processingFee?.details && infoSheet) {
                const processingFeeAmount = infoSheet.processingFeeAmount ? Number(infoSheet.processingFeeAmount) : 0;
                if (processingFeeAmount > 0) {
                    const [request] = await tx
                        .insert(paymentRequests)
                        .values({
                            tenderId,
                            purpose: 'Processing Fee',
                            amountRequired: processingFeeAmount.toString(),
                            dueDate: tender.dueDate,
                            tenderNo: tender.tenderNo,
                            status: 'Pending',
                        })
                        .returning();

                    createdRequests.push(request);

                    // Create instrument
                    const instrument = await this.createInstrument(tx, request.id, 'Processing Fee', payload.processingFee?.mode, payload.processingFee?.details, processingFeeAmount);
                    await this.createInstrumentDetails(tx, instrument.id, payload.processingFee?.mode, payload.processingFee?.details);
                }
            }
        });

        return createdRequests;
    }

    private async createInstrument(
        tx: DbInstance,
        requestId: number,
        purpose: string,
        mode: string,
        details: any,
        amount: number,
    ): Promise<PaymentInstrument> {
        const instrumentType = mapInstrumentType(mode);

        const instrumentData: any = {
            requestId,
            instrumentType,
            amount: amount.toString(),
            status: 'Pending',
        };

        // Map common fields based on mode
        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours ? parseInt(details.ddCourierHours) : null;
            instrumentData.issueDate = details.ddDate ? new Date(details.ddDate) : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate ? new Date(details.fdrExpiryDate) : null;
            instrumentData.courierAddress = details.fdrCourierAddress;
            instrumentData.courierDeadline = details.fdrCourierHours ? parseInt(details.fdrCourierHours) : null;
            instrumentData.issueDate = details.fdrDate ? new Date(details.fdrDate) : null;
        } else if (mode === 'BG' && details.bgFavouring) {
            instrumentData.favouring = details.bgFavouring;
            instrumentData.expiryDate = details.bgExpiryDate ? new Date(details.bgExpiryDate) : null;
            instrumentData.claimExpiryDate = details.bgClaimPeriod ? new Date(details.bgClaimPeriod) : null;
            instrumentData.courierAddress = details.bgCourierAddress;
            instrumentData.courierDeadline = details.bgCourierDays || null;
        } else if (mode === 'BANK_TRANSFER' && details.btAccountName) {
            // Bank transfer details go to transferDetails table
        } else if (mode === 'PORTAL' && details.portalName) {
            // Portal details go to transferDetails table
        }

        const [instrument] = await tx
            .insert(paymentInstruments)
            .values(instrumentData)
            .returning();

        return instrument;
    }

    private async createInstrumentDetails(tx: DbInstance, instrumentId: number, mode: string, details: any) {
        if (mode === 'DD' && details.ddFavouring) {
            await tx.insert(instrumentDdDetails).values({
                instrumentId,
                ddDate: details.ddDate ? details.ddDate.toISOString() : null,
            });
        } else if (mode === 'FDR' && details.fdrFavouring) {
            await tx.insert(instrumentFdrDetails).values({
                instrumentId,
                fdrDate: details.fdrDate ? details.fdrDate.toISOString() : null,
                fdrExpiryDate: details.fdrExpiryDate ? details.fdrExpiryDate.toISOString() : null,
                fdrPurpose: details.fdrPurpose,
            });
        } else if (mode === 'BG' && details.bgFavouring) {
            await tx.insert(instrumentBgDetails).values({
                instrumentId,
                bgDate: details.bgExpiryDate ? details.bgExpiryDate.toISOString() : null,
                validityDate: details.bgExpiryDate ? details.bgExpiryDate.toISOString() : null,
                claimExpiryDate: details.bgClaimPeriod ? details.bgClaimPeriod.toISOString() : null,
                beneficiaryName: details.bgFavouring,
                beneficiaryAddress: details.bgAddress,
                bankName: details.bgBank,
                stampCharges: details.bgStampValue ? details.bgStampValue.toString() : null,
            });
        } else if (mode === 'BANK_TRANSFER' && details.btAccountName) {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                accountName: details.btAccountName,
                accountNumber: details.btAccountNo,
                ifsc: details.btIfsc,
            });
        } else if (mode === 'PORTAL' && details.portalName) {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                portalName: details.portalName,
                paymentMethod: details.portalNetBanking === 'YES' ? 'Netbanking' : details.portalDebitCard === 'YES' ? 'Debit Card' : null,
            });
        }
    }

    async findByTenderId(tenderId: number) {
        const requests = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId))
            .orderBy(paymentRequests.createdAt);

        // Get instruments for each request
        const requestsWithInstruments = await Promise.all(
            requests.map(async (request) => {
                const instruments = await this.db
                    .select()
                    .from(paymentInstruments)
                    .where(eq(paymentInstruments.requestId, request.id));

                const instrumentsWithDetails = await Promise.all(
                    instruments.map(async (instrument) => {
                        const details = await this.getInstrumentDetails(instrument.id, instrument.instrumentType);
                        return { ...instrument, details };
                    }),
                );

                return { ...request, instruments: instrumentsWithDetails };
            }),
        );

        return requestsWithInstruments;
    }

    async findById(requestId: number) {
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new NotFoundException(`Payment request with ID ${requestId} not found`);
        }

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.requestId, requestId));

        const instrumentsWithDetails = await Promise.all(
            instruments.map(async (instrument) => {
                const details = await this.getInstrumentDetails(instrument.id, instrument.instrumentType);
                return { ...instrument, details };
            }),
        );

        return { ...request, instruments: instrumentsWithDetails };
    }

    private async getInstrumentDetails(instrumentId: number, instrumentType: string) {
        switch (instrumentType) {
            case 'DD':
                const [dd] = await this.db.select().from(instrumentDdDetails).where(eq(instrumentDdDetails.instrumentId, instrumentId)).limit(1);
                return dd || null;
            case 'FDR':
                const [fdr] = await this.db.select().from(instrumentFdrDetails).where(eq(instrumentFdrDetails.instrumentId, instrumentId)).limit(1);
                return fdr || null;
            case 'BG':
                const [bg] = await this.db.select().from(instrumentBgDetails).where(eq(instrumentBgDetails.instrumentId, instrumentId)).limit(1);
                return bg || null;
            case 'Cheque':
                const [cheque] = await this.db.select().from(instrumentChequeDetails).where(eq(instrumentChequeDetails.instrumentId, instrumentId)).limit(1);
                return cheque || null;
            case 'Bank Transfer':
            case 'Portal Payment':
                const [transfer] = await this.db.select().from(instrumentTransferDetails).where(eq(instrumentTransferDetails.instrumentId, instrumentId)).limit(1);
                return transfer || null;
            default:
                return null;
        }
    }

    async update(requestId: number, payload: UpdatePaymentRequestDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Payment request with ID ${requestId} not found`);
        }

        // Get existing instrument to verify type hasn't changed
        const [existingInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.requestId, requestId))
            .limit(1);

        if (!existingInstrument) {
            throw new NotFoundException(`Payment instrument not found for request ${requestId}`);
        }

        // Determine which mode/purpose this request is for
        let mode: string | undefined;
        let details: any;

        if (existing.purpose === 'EMD' && payload.emd?.mode) {
            mode = payload.emd?.mode;
            details = payload.emd?.details;
            // Verify instrument type hasn't changed
            const newType = mapInstrumentType(mode);
            if (existingInstrument.instrumentType !== newType) {
                throw new BadRequestException('Cannot change instrument type after creation');
            }
        } else if (existing.purpose === 'Tender Fee' && payload.tenderFee?.mode) {
            mode = payload.tenderFee?.mode;
            details = payload.tenderFee?.details;
            const newType = mapInstrumentType(mode);
            if (existingInstrument.instrumentType !== newType) {
                throw new BadRequestException('Cannot change instrument type after creation');
            }
        } else if (existing.purpose === 'Processing Fee' && payload.processingFee?.mode) {
            mode = payload.processingFee?.mode;
            details = payload.processingFee?.details;
            const newType = mapInstrumentType(mode);
            if (existingInstrument.instrumentType !== newType) {
                throw new BadRequestException('Cannot change instrument type after creation');
            }
        }

        if (!mode || !details) {
            throw new BadRequestException('Invalid update payload for this payment request type');
        }

        await this.db.transaction(async (tx) => {
            // Update instrument
            const instrumentData: any = {};

            if (mode === 'DD' && details.ddFavouring) {
                instrumentData.favouring = details.ddFavouring;
                instrumentData.payableAt = details.ddPayableAt;
                instrumentData.courierAddress = details.ddCourierAddress;
                instrumentData.courierDeadline = details.ddCourierHours ? parseInt(details.ddCourierHours) : null;
                instrumentData.issueDate = details.ddDate ? new Date(details.ddDate) : null;
                instrumentData.remarks = details.ddRemarks;
            } else if (mode === 'FDR' && details.fdrFavouring) {
                instrumentData.favouring = details.fdrFavouring;
                instrumentData.expiryDate = details.fdrExpiryDate ? new Date(details.fdrExpiryDate) : null;
                instrumentData.courierAddress = details.fdrCourierAddress;
                instrumentData.courierDeadline = details.fdrCourierHours ? parseInt(details.fdrCourierHours) : null;
                instrumentData.issueDate = details.fdrDate ? new Date(details.fdrDate) : null;
            } else if (mode === 'BG' && details.bgFavouring) {
                instrumentData.favouring = details.bgFavouring;
                instrumentData.expiryDate = details.bgExpiryDate ? new Date(details.bgExpiryDate) : null;
                instrumentData.claimExpiryDate = details.bgClaimPeriod ? new Date(details.bgClaimPeriod) : null;
                instrumentData.courierAddress = details.bgCourierAddress;
                instrumentData.courierDeadline = details.bgCourierDays || null;
            }

            if (Object.keys(instrumentData).length > 0) {
                await tx
                    .update(paymentInstruments)
                    .set(instrumentData)
                    .where(eq(paymentInstruments.id, existingInstrument.id));
            }

            // Update instrument details
            await this.updateInstrumentDetails(tx, existingInstrument.id, mode, details);
        });

        return this.findById(requestId);
    }

    private async updateInstrumentDetails(tx: DbInstance, instrumentId: number, mode: string, details: any) {
        if (mode === 'DD') {
            await tx
                .update(instrumentDdDetails)
                .set({
                    ddDate: details.ddDate ? details.ddDate.toISOString() : null,
                })
                .where(eq(instrumentDdDetails.instrumentId, instrumentId));
        } else if (mode === 'FDR') {
            await tx
                .update(instrumentFdrDetails)
                .set({
                    fdrDate: details.fdrDate ? details.fdrDate.toISOString() : null,
                    fdrExpiryDate: details.fdrExpiryDate ? details.fdrExpiryDate.toISOString() : null,
                    fdrPurpose: details.fdrPurpose,
                })
                .where(eq(instrumentFdrDetails.instrumentId, instrumentId));
        } else if (mode === 'BG') {
            await tx
                .update(instrumentBgDetails)
                .set({
                    bgDate: details.bgExpiryDate ? details.bgExpiryDate.toISOString() : null,
                    validityDate: details.bgExpiryDate ? details.bgExpiryDate.toISOString() : null,
                    claimExpiryDate: details.bgClaimPeriod ? details.bgClaimPeriod.toISOString() : null,
                    beneficiaryName: details.bgFavouring,
                    beneficiaryAddress: details.bgAddress,
                    bankName: details.bgBank,
                    stampCharges: details.bgStampValue ? details.bgStampValue.toString() : null,
                })
                .where(eq(instrumentBgDetails.instrumentId, instrumentId));
        } else if (mode === 'BANK_TRANSFER') {
            await tx
                .update(instrumentTransferDetails)
                .set({
                    accountName: details.btAccountName,
                    accountNumber: details.btAccountNo,
                    ifsc: details.btIfsc,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        } else if (mode === 'PORTAL') {
            await tx
                .update(instrumentTransferDetails)
                .set({
                    portalName: details.portalName,
                    paymentMethod: details.portalNetBanking === 'YES' ? 'Netbanking' : details.portalDebitCard === 'YES' ? 'Debit Card' : null,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        }
    }

    async updateStatus(requestId: number, payload: UpdateStatusDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Payment request with ID ${requestId} not found`);
        }

        await this.db
            .update(paymentRequests)
            .set({
                status: payload.status,
                remarks: payload.remarks || existing.remarks,
            })
            .where(eq(paymentRequests.id, requestId));

        return this.findById(requestId);
    }
}
