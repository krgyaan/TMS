import { Controller, Get, Query, Put, Param, ParseIntPipe, Body, Req, BadRequestException } from '@nestjs/common';
import { ChequeService } from './cheque.service';

@Controller('cheques')
export class ChequeController {
    constructor(private readonly chequeService: ChequeService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.chequeService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.chequeService.getDashboardCounts();
    }

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.chequeService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        return this.chequeService.getActionFormData(id);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.chequeService.getFollowupData(id);
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
        return this.chequeService.updateAction(id, body, req.user);
    }
}
