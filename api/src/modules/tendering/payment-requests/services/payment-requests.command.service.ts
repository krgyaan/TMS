import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { InstrumentStatusService } from './instrument-status.service';
import { InstrumentStatusHistoryService } from './instrument-status-history.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto } from '../dto/payment-requests.dto';
import { PaymentRequestsService } from '../payment-requests.service';

@Injectable()
export class PaymentRequestsCommandService {
    private readonly logger = new Logger(PaymentRequestsCommandService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly instrumentStatusService: InstrumentStatusService,
        private readonly historyService: InstrumentStatusHistoryService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        @Inject(forwardRef(() => PaymentRequestsService))
        private readonly paymentRequestsService: PaymentRequestsService,
    ) {}

    async create(tenderId: number, payload: CreatePaymentRequestDto, userId: number) {
        return this.paymentRequestsService.create(tenderId, payload, userId);
    }

    async update(requestId: number, payload: UpdatePaymentRequestDto) {
        return this.paymentRequestsService.update(requestId, payload);
    }

    async updateStatus(requestId: number, payload: UpdateStatusDto) {
        return this.paymentRequestsService.updateStatus(requestId, payload);
    }
}