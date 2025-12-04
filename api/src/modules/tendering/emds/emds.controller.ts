import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { EmdsService } from './emds.service';
import {
    CreatePaymentRequestSchema,
    UpdatePaymentRequestSchema,
    UpdateStatusSchema,
    DashboardQuerySchema,
    type DashboardResponse,
    type DashboardCounts,
} from './dto/emds.dto';
import type { Request } from 'express';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
        name: string;
        // Add other user properties as needed
    };
}

@Controller('emds')
export class EmdsController {
    constructor(private readonly emdsService: EmdsService) { }

    @Get('dashboard')
    async getDashboard(
        @Query() query: unknown,
        @Req() req: AuthenticatedRequest,
    ): Promise<DashboardResponse> {
        const parsed = DashboardQuerySchema.parse(query);
        // Use current user's ID if not provided in query
        const userId = parsed.userId ?? req.user?.id;
        return this.emdsService.getDashboardData(parsed.tab ?? 'all', userId);
    }

    @Get('dashboard/counts')
    async getDashboardCounts(
        @Req() req: AuthenticatedRequest,
    ): Promise<DashboardCounts> {
        const userId = req.user?.id;
        return this.emdsService.getDashboardCounts(userId);
    }

    @Post('tenders/:tenderId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
        @Req() req: AuthenticatedRequest,
    ) {
        const payload = CreatePaymentRequestSchema.parse(body);
        const userId = req.user?.id;
        return this.emdsService.create(tenderId, payload, userId);
    }

    @Get('tenders/:tenderId')
    async findByTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.emdsService.findByTenderId(tenderId);
    }

    @Get('tenders/:tenderId/with-details')
    async findByTenderWithDetails(
        @Param('tenderId', ParseIntPipe) tenderId: number,
    ) {
        return this.emdsService.findByTenderIdWithTender(tenderId);
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.emdsService.findById(id);
    }

    @Get(':id/with-details')
    async findByIdWithDetails(@Param('id', ParseIntPipe) id: number) {
        return this.emdsService.findByIdWithTender(id);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdatePaymentRequestSchema.parse(body);
        return this.emdsService.update(id, payload);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdateStatusSchema.parse(body);
        return this.emdsService.updateStatus(id, payload);
    }
}
