import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import type { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto } from '../dto/payment-requests.dto';
import { PaymentRequestsService } from '../payment-requests.service';

@Injectable()
export class PaymentRequestsCommandService {
    private readonly logger = new Logger(PaymentRequestsCommandService.name);

    constructor(
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