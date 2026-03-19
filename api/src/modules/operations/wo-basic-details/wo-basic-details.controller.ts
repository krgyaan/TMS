import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoBasicDetailsService } from './wo-basic-details.service';
import { CreateWoBasicDetailSchema, UpdateWoBasicDetailSchema, AssignOeSchema, BulkAssignOeSchema, RemoveOeAssignmentSchema,  WoBasicDetailsQuerySchema } from './dto/wo-basic-details.dto';
import type { CreateWoBasicDetailDto, UpdateWoBasicDetailDto, AssignOeDto, BulkAssignOeDto, RemoveOeAssignmentDto, WoBasicDetailsQueryDto } from './dto/wo-basic-details.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('wo-basic-details')
export class WoBasicDetailsController {
    constructor(
        private readonly woBasicDetailsService: WoBasicDetailsService,
    ) {}

    // CRUD OPERATIONS
    @Get()
    async list(
        @CurrentUser() user: ValidatedUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
        @Query('projectName') projectName?: string,
        @Query('currentStage') currentStage?: string,
        @Query('oeFirst') oeFirst?: string,
        @Query('oeSiteVisit') oeSiteVisit?: string,
        @Query('oeDocsPrep') oeDocsPrep?: string,
    ) {
        const rawFilters = { page, limit, sortBy, sortOrder, search, teamId, projectName, currentStage, oeFirst, oeSiteVisit, oeDocsPrep };

        const parsed = WoBasicDetailsQuerySchema.parse(rawFilters) as WoBasicDetailsQueryDto;
        parsed.user = user;
        return this.woBasicDetailsService.findAll(parsed);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.woBasicDetailsService.findById(id);
    }

    @Get(':id/with-relations')
    async getByIdWithRelations(@Param('id', ParseIntPipe) id: number) {
        return this.woBasicDetailsService.findByIdWithRelations(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const parsed = CreateWoBasicDetailSchema.parse(body) as CreateWoBasicDetailDto;
        return this.woBasicDetailsService.create(parsed, user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const parsed = UpdateWoBasicDetailSchema.parse(body) as UpdateWoBasicDetailDto;
        return this.woBasicDetailsService.update(id, parsed, user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.woBasicDetailsService.delete(id);
    }

    // OE ASSIGNMENT OPERATIONS
    @Post(':id/assign-oe')
    @HttpCode(HttpStatus.OK)
    async assignOe(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = AssignOeSchema.parse(body) as AssignOeDto;
        return this.woBasicDetailsService.assignOe(id, parsed);
    }

    @Post(':id/bulk-assign-oe')
    @HttpCode(HttpStatus.OK)
    async bulkAssignOe(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = BulkAssignOeSchema.parse(body) as BulkAssignOeDto;
        return this.woBasicDetailsService.bulkAssignOe(id, parsed);
    }

    @Delete(':id/remove-oe-assignment')
    @HttpCode(HttpStatus.OK)
    async removeOeAssignment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = RemoveOeAssignmentSchema.parse(body) as RemoveOeAssignmentDto;
        return this.woBasicDetailsService.removeOeAssignment(id, parsed);
    }

    @Get(':id/oe-assignments')
    async getOeAssignments(@Param('id', ParseIntPipe) id: number) {
        return this.woBasicDetailsService.getOeAssignments(id);
    }

    // UTILITY OPERATIONS
    @Get('check-project-code/:projectCode')
    async checkProjectCodeExists(@Param('projectCode') projectCode: string) {
        return this.woBasicDetailsService.checkProjectCodeExists(projectCode);
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.woBasicDetailsService.findByTenderId(tenderId);
    }

    @Get('by-enquiry/:enquiryId')
    async getByEnquiryId(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.woBasicDetailsService.findByEnquiryId(enquiryId);
    }

    // DASHBOARD/REPORTING
    @Get('dashboard/summary')
    async getDashboardSummary(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        return this.woBasicDetailsService.getDashboardSummary(user, teamId ? Number(teamId) : undefined);
    }

    @Get('dashboard/pending-assignments')
    async getPendingOeAssignments(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        return this.woBasicDetailsService.getPendingOeAssignments(user, teamId ? Number(teamId) : undefined);
    }

    @Get('dashboard/workflow-status')
    async getWorkflowStatusSummary(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        return this.woBasicDetailsService.getWorkflowStatusSummary(user, teamId ? Number(teamId) : undefined);
    }
}
