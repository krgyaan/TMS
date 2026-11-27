import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { BankGuaranteeService } from './bank-guarantee.service';

@Controller('bank-guarantees')
export class BankGuaranteeController {
    constructor(private readonly bankGuaranteeService: BankGuaranteeService) { }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.bankGuaranteeService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/export')
    getExportData(
        @Query('tab') tab?: string,
    ) {
        return this.bankGuaranteeService.getExportData(tab);
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.bankGuaranteeService.getDashboardCounts();
    }

    @Get('dashboard/card-stats')
    getDashboardCardStats() {
        return this.bankGuaranteeService.getDashboardCardStats();
    }

    @Get('approvals')
    getBgApprovals(
        @Req() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.bankGuaranteeService.getBgApprovals(req.user, {
            status,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
        });
    }

    @Get('approvals/:instrumentId')
    getBgApprovalDetail(@Param('instrumentId', ParseIntPipe) instrumentId: number) {
        return this.bankGuaranteeService.getBgApprovalDetail(instrumentId);
    }

    @Post('instruments/:instrumentId/approval')
    actOnBgApproval(
        @Param('instrumentId', ParseIntPipe) instrumentId: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.bankGuaranteeService.actOnBgApproval(instrumentId, req.user, body);
    }

    @Post('instruments/:instrumentId/approval/resubmit')
    resubmitBgApproval(
        @Param('instrumentId', ParseIntPipe) instrumentId: number,
        @Req() req: any,
    ) {
        return this.bankGuaranteeService.resubmitBgApproval(instrumentId, req.user);
    }

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getActionFormData(id);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getFollowupData(id);
    }

    @Post('instruments/:id/mail-preview')
    async getMailPreview(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.bankGuaranteeService.getMailPreview(id, body);
    }

    @Post('instruments/:id/prefilled-format')
    async generatePrefilledFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.bankGuaranteeService.generatePrefilledFormat(id, body?.fdrNo);
    }

    @Post('instruments/:id/covering-letter')
    async generateCoveringLetter(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.bankGuaranteeService.generateCoveringLetter(id, {
            bgNo: body?.bgNo,
            bgDate: body?.bgDate,
        });
    }

    @Post('instruments/:id/authorization-letter')
    async generateAuthorizationLetter(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.bankGuaranteeService.generateAuthorizationLetter(id, body?.persons);
    }

    @Post('old-bg')
    async createOldBg(@Body() body: any, @Req() req: any) {
        return this.bankGuaranteeService.createOldBg(body, req.user);
    }

    @Get('old-bg/:requestId')
    async getOldBgForEdit(@Param('requestId', ParseIntPipe) requestId: number) {
        return this.bankGuaranteeService.getOldBgForEdit(requestId);
    }

    @Put('old-bg/:requestId')
    async updateOldBg(@Param('requestId', ParseIntPipe) requestId: number, @Body() body: any, @Req() req: any) {
        return this.bankGuaranteeService.updateOldBg(requestId, body, req.user);
    }

    @Put(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.bankGuaranteeService.update(id, body, [], req.user);
    }

    @Put('instruments/:id/action')
    async updateAction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        if (!body.action) {
            throw new BadRequestException('Action is required');
        }
        return this.bankGuaranteeService.updateAction(id, body, [], req.user);
    }
}
