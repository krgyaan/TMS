import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoDetailsService } from './wo-details.service';
import { CreateWoDetailSchema, UpdateWoDetailSchema, AcceptWoSchema, RequestAmendmentSchema, WoAcceptanceDecisionSchema, CreateWoAmendmentSchema, CreateBulkWoAmendmentsSchema, UpdateWoAmendmentSchema, CreateWoDocumentSchema, UpdateWoDocumentSchema,CreateBulkWoDocumentsSchema, CreateWoQuerySchema, RespondToQuerySchema, CloseQuerySchema, UpdateQueryStatusSchema, WoDetailsQuerySchema, AmendmentFilterSchema, DocumentFilterSchema, QueryFilterSchema } from './dto/wo-details.dto';
import type { CreateWoDetailDto, UpdateWoDetailDto, AcceptWoDto, RequestAmendmentDto, WoAcceptanceDecisionDto, CreateWoAmendmentDto, CreateBulkWoAmendmentsDto, UpdateWoAmendmentDto, CreateWoDocumentDto, UpdateWoDocumentDto, CreateBulkWoDocumentsDto, CreateWoQueryDto, RespondToQueryDto, CloseQueryDto, UpdateQueryStatusDto, WoDetailsQueryDto, AmendmentFilterDto, DocumentFilterDto,  QueryFilterDto } from './dto/wo-details.dto';

@Controller('wo-details')
export class WoDetailsController {
    constructor(private readonly woDetailsService: WoDetailsService) {}

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('woBasicDetailId') woBasicDetailId?: string,
        @Query('ldApplicable') ldApplicable?: string,
        @Query('isPbgApplicable') isPbgApplicable?: string,
        @Query('isContractAgreement') isContractAgreement?: string,
        @Query('woAcceptance') woAcceptance?: string,
        @Query('woAmendmentNeeded') woAmendmentNeeded?: string,
        @Query('status') status?: string,
        @Query('tlId') tlId?: string,
        @Query('ldStartDateFrom') ldStartDateFrom?: string,
        @Query('ldStartDateTo') ldStartDateTo?: string,
        @Query('createdAtFrom') createdAtFrom?: string,
        @Query('createdAtTo') createdAtTo?: string,
        @Query('woAcceptanceAtFrom') woAcceptanceAtFrom?: string,
        @Query('woAcceptanceAtTo') woAcceptanceAtTo?: string,
    ) {
        const rawFilters = {
            page,
            limit,
            sortBy,
            sortOrder,
            woBasicDetailId,
            ldApplicable,
            isPbgApplicable,
            isContractAgreement,
            woAcceptance,
            woAmendmentNeeded,
            status,
            tlId,
            ldStartDateFrom,
            ldStartDateTo,
            createdAtFrom,
            createdAtTo,
            woAcceptanceAtFrom,
            woAcceptanceAtTo,
        };

        const parsed = WoDetailsQuerySchema.parse(rawFilters) as WoDetailsQueryDto;
        return this.woDetailsService.findAll(parsed);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.woDetailsService.findById(id);
    }

    @Get(':id/with-relations')
    async getByIdWithRelations(@Param('id', ParseIntPipe) id: number) {
        return this.woDetailsService.findByIdWithRelations(id);
    }

    @Get('by-basic-detail/:woBasicDetailId')
    async getByWoBasicDetailId(
        @Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number,
    ) {
        return this.woDetailsService.findByWoBasicDetailId(woBasicDetailId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateWoDetailSchema.parse(body) as CreateWoDetailDto;
        return this.woDetailsService.create(parsed);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateWoDetailSchema.parse(body) as UpdateWoDetailDto;
        return this.woDetailsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.woDetailsService.delete(id);
    }

    // ============================================
    // WO ACCEPTANCE WORKFLOW
    // ============================================

    @Post(':id/accept')
    @HttpCode(HttpStatus.OK)
    async acceptWo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = AcceptWoSchema.parse(body) as AcceptWoDto;
        return this.woDetailsService.acceptWo(id, parsed);
    }

    @Post(':id/request-amendment')
    @HttpCode(HttpStatus.OK)
    async requestAmendment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = RequestAmendmentSchema.parse(body) as RequestAmendmentDto;
        return this.woDetailsService.requestAmendment(id, parsed);
    }

    @Post(':id/acceptance-decision')
    @HttpCode(HttpStatus.OK)
    async makeAcceptanceDecision(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = WoAcceptanceDecisionSchema.parse(body) as WoAcceptanceDecisionDto;
        return this.woDetailsService.makeAcceptanceDecision(id, parsed);
    }

    @Get(':id/acceptance-status')
    async getAcceptanceStatus(@Param('id', ParseIntPipe) id: number) {
        return this.woDetailsService.getAcceptanceStatus(id);
    }

    @Get(':id/timeline')
    async getTimeline(@Param('id', ParseIntPipe) id: number) {
        return this.woDetailsService.getTimeline(id);
    }

    // ============================================
    // AMENDMENT OPERATIONS
    // ============================================

    @Get(':id/amendments')
    async listAmendments(
        @Param('id', ParseIntPipe) id: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('pageNo') pageNo?: string,
        @Query('clauseNo') clauseNo?: string,
    ) {
        const rawFilters = { page, limit, sortBy, sortOrder, pageNo, clauseNo };
        const parsed = AmendmentFilterSchema.parse(rawFilters) as AmendmentFilterDto;
        return this.woDetailsService.listAmendments(id, parsed);
    }

    @Get(':id/amendments/:amendmentId')
    async getAmendment(
        @Param('id', ParseIntPipe) id: number,
        @Param('amendmentId', ParseIntPipe) amendmentId: number,
    ) {
        return this.woDetailsService.getAmendment(id, amendmentId);
    }

    @Post(':id/amendments')
    @HttpCode(HttpStatus.CREATED)
    async createAmendment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = CreateWoAmendmentSchema.parse(body) as CreateWoAmendmentDto;
        return this.woDetailsService.createAmendment(id, parsed);
    }

    @Post(':id/amendments/bulk')
    @HttpCode(HttpStatus.CREATED)
    async createBulkAmendments(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = CreateBulkWoAmendmentsSchema.parse(body) as CreateBulkWoAmendmentsDto;
        return this.woDetailsService.createBulkAmendments(id, parsed);
    }

    @Patch(':id/amendments/:amendmentId')
    async updateAmendment(
        @Param('id', ParseIntPipe) id: number,
        @Param('amendmentId', ParseIntPipe) amendmentId: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateWoAmendmentSchema.parse(body) as UpdateWoAmendmentDto;
        return this.woDetailsService.updateAmendment(id, amendmentId, parsed);
    }

    @Delete(':id/amendments/:amendmentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAmendment(
        @Param('id', ParseIntPipe) id: number,
        @Param('amendmentId', ParseIntPipe) amendmentId: number,
    ) {
        await this.woDetailsService.deleteAmendment(id, amendmentId);
    }

    @Delete(':id/amendments')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAllAmendments(@Param('id', ParseIntPipe) id: number) {
        await this.woDetailsService.deleteAllAmendments(id);
    }

    // ============================================
    // DOCUMENT OPERATIONS
    // ============================================

    @Get(':id/documents')
    async listDocuments(
        @Param('id', ParseIntPipe) id: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('type') type?: string,
        @Query('version') version?: string,
        @Query('uploadedFrom') uploadedFrom?: string,
        @Query('uploadedTo') uploadedTo?: string,
    ) {
        const rawFilters = {
            page,
            limit,
            sortBy,
            sortOrder,
            type,
            version,
            uploadedFrom,
            uploadedTo,
        };
        const parsed = DocumentFilterSchema.parse(rawFilters) as DocumentFilterDto;
        return this.woDetailsService.listDocuments(id, parsed);
    }

    @Get(':id/documents/:documentId')
    async getDocument(
        @Param('id', ParseIntPipe) id: number,
        @Param('documentId', ParseIntPipe) documentId: number,
    ) {
        return this.woDetailsService.getDocument(id, documentId);
    }

    @Get(':id/documents/by-type/:type')
    async getDocumentsByType(
        @Param('id', ParseIntPipe) id: number,
        @Param('type') type: string,
    ) {
        return this.woDetailsService.getDocumentsByType(id, type);
    }

    @Get(':id/documents/latest/:type')
    async getLatestDocumentByType(
        @Param('id', ParseIntPipe) id: number,
        @Param('type') type: string,
    ) {
        return this.woDetailsService.getLatestDocumentByType(id, type);
    }

    @Post(':id/documents')
    @HttpCode(HttpStatus.CREATED)
    async uploadDocument(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = CreateWoDocumentSchema.parse(body) as CreateWoDocumentDto;
        return this.woDetailsService.uploadDocument(id, parsed);
    }

    @Post(':id/documents/bulk')
    @HttpCode(HttpStatus.CREATED)
    async uploadBulkDocuments(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = CreateBulkWoDocumentsSchema.parse(body) as CreateBulkWoDocumentsDto;
        return this.woDetailsService.uploadBulkDocuments(id, parsed);
    }

    @Patch(':id/documents/:documentId')
    async updateDocument(
        @Param('id', ParseIntPipe) id: number,
        @Param('documentId', ParseIntPipe) documentId: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateWoDocumentSchema.parse(body) as UpdateWoDocumentDto;
        return this.woDetailsService.updateDocument(id, documentId, parsed);
    }

    @Delete(':id/documents/:documentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteDocument(
        @Param('id', ParseIntPipe) id: number,
        @Param('documentId', ParseIntPipe) documentId: number,
    ) {
        await this.woDetailsService.deleteDocument(id, documentId);
    }

    // ============================================
    // QUERY OPERATIONS
    // ============================================

    @Get(':id/queries')
    async listQueries(
        @Param('id', ParseIntPipe) id: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('status') status?: string,
        @Query('queryTo') queryTo?: string,
        @Query('queryBy') queryBy?: string,
        @Query('respondedBy') respondedBy?: string,
        @Query('queryRaisedFrom') queryRaisedFrom?: string,
        @Query('queryRaisedTo') queryRaisedTo?: string,
    ) {
        const rawFilters = {
            page,
            limit,
            sortBy,
            sortOrder,
            status,
            queryTo,
            queryBy,
            respondedBy,
            queryRaisedFrom,
            queryRaisedTo,
        };
        const parsed = QueryFilterSchema.parse(rawFilters) as QueryFilterDto;
        return this.woDetailsService.listQueries(id, parsed);
    }

    @Get(':id/queries/:queryId')
    async getQuery(
        @Param('id', ParseIntPipe) id: number,
        @Param('queryId', ParseIntPipe) queryId: number,
    ) {
        return this.woDetailsService.getQuery(id, queryId);
    }

    @Get(':id/queries/pending')
    async getPendingQueries(@Param('id', ParseIntPipe) id: number) {
        return this.woDetailsService.getPendingQueries(id);
    }

    @Post(':id/queries')
    @HttpCode(HttpStatus.CREATED)
    async createQuery(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = CreateWoQuerySchema.parse(body) as CreateWoQueryDto;
        return this.woDetailsService.createQuery(id, parsed);
    }

    @Post(':id/queries/:queryId/respond')
    @HttpCode(HttpStatus.OK)
    async respondToQuery(
        @Param('id', ParseIntPipe) id: number,
        @Param('queryId', ParseIntPipe) queryId: number,
        @Body() body: unknown,
    ) {
        const parsed = RespondToQuerySchema.parse(body) as RespondToQueryDto;
        return this.woDetailsService.respondToQuery(id, queryId, parsed);
    }

    @Post(':id/queries/:queryId/close')
    @HttpCode(HttpStatus.OK)
    async closeQuery(
        @Param('id', ParseIntPipe) id: number,
        @Param('queryId', ParseIntPipe) queryId: number,
        @Body() body: unknown,
    ) {
        const parsed = CloseQuerySchema.parse(body) as CloseQueryDto;
        return this.woDetailsService.closeQuery(id, queryId, parsed);
    }

    @Patch(':id/queries/:queryId/status')
    async updateQueryStatus(
        @Param('id', ParseIntPipe) id: number,
        @Param('queryId', ParseIntPipe) queryId: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateQueryStatusSchema.parse(body) as UpdateQueryStatusDto;
        return this.woDetailsService.updateQueryStatus(id, queryId, parsed);
    }

    // ============================================
    // DASHBOARD/REPORTING
    // ============================================

    @Get('dashboard/summary')
    async getDashboardSummary() {
        return this.woDetailsService.getDashboardSummary();
    }

    @Get('dashboard/pending-acceptance')
    async getPendingAcceptance() {
        return this.woDetailsService.getPendingAcceptance();
    }

    @Get('dashboard/pending-queries')
    async getAllPendingQueries() {
        return this.woDetailsService.getAllPendingQueries();
    }

    @Get('dashboard/amendments-summary')
    async getAmendmentsSummary() {
        return this.woDetailsService.getAmendmentsSummary();
    }

    @Get('dashboard/sla-compliance')
    async getSlaComplianceReport() {
        return this.woDetailsService.getSlaComplianceReport();
    }
}
