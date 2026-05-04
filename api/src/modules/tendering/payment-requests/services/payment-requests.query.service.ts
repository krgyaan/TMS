import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { PaymentRequestsService } from '../payment-requests.service';
import type {
    DashboardTab,
    DashboardCounts,
    PendingTabResponse,
    RequestTabResponse,
    PaymentRequestRow,
    PendingTenderRow,
} from '../dto/payment-requests.dto';

@Injectable()
export class PaymentRequestsQueryService {
    private readonly logger = new Logger(PaymentRequestsQueryService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        @Inject(forwardRef(() => PaymentRequestsService))
        private readonly paymentRequestsService: PaymentRequestsService,
    ) {}

    async getDashboardData(
        tab: DashboardTab = 'pending',
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        search?: string
    ): Promise<PendingTabResponse | RequestTabResponse> {
        return this.paymentRequestsService.getDashboardData(tab, user, teamId, pagination, sort, search);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<DashboardCounts> {
        return this.paymentRequestsService.getDashboardCounts(user, teamId);
    }

    async findByTenderId(tenderId: number) {
        return this.paymentRequestsService.findByTenderId(tenderId);
    }

    async findByTenderIdWithTender(tenderId: number) {
        return this.paymentRequestsService.findByTenderIdWithTender(tenderId);
    }

    async findById(requestId: number) {
        return this.paymentRequestsService.findById(requestId);
    }

    async findByIdWithTender(requestId: number) {
        return this.paymentRequestsService.findByIdWithTender(requestId);
    }
}