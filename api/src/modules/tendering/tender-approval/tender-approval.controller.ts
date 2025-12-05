import { Controller, Get, Put, Param, Body, ParseIntPipe } from '@nestjs/common';
import { TenderApprovalService } from '@/modules/tendering/tender-approval/tender-approval.service';
import type { TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';

@Controller('tender-approvals')
export class TenderApprovalController {
    constructor(private readonly tenderApprovalService: TenderApprovalService) { }

    @Get()
    async getAll() {
        return this.tenderApprovalService.getAll();
    }

    @Get(':id/approval')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderApprovalService.getByTenderId(id);
    }

    @Put(':tenderId/approval')
    async createOrUpdateApproval(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() data: TenderApprovalPayload,
    ) {
        return this.tenderApprovalService.updateApproval(tenderId, data);
    }
}
