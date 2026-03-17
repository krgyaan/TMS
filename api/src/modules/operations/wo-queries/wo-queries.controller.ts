import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WoQueriesService } from './wo-queries.service';
import {
  CreateWoQuerySchema,
  RespondToQuerySchema,
  CloseQuerySchema,
  UpdateQueryStatusSchema,
  WoQueriesQuerySchema,
  CreateBulkWoQueriesSchema,
} from './dto/wo-queries.dto';
import type {
  CreateWoQueryDto,
  RespondToQueryDto,
  CloseQueryDto,
  UpdateQueryStatusDto,
  WoQueriesQueryDto,
  CreateBulkWoQueriesDto,
} from './dto/wo-queries.dto';

@Controller('wo-queries')
export class WoQueriesController {
  constructor(private readonly woQueriesService: WoQueriesService) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('woDetailId') woDetailId?: string,
    @Query('status') status?: string,
    @Query('queryTo') queryTo?: string,
    @Query('queryBy') queryBy?: string,
    @Query('respondedBy') respondedBy?: string,
    @Query('queryRaisedFrom') queryRaisedFrom?: string,
    @Query('queryRaisedTo') queryRaisedTo?: string,
    @Query('respondedFrom') respondedFrom?: string,
    @Query('respondedTo') respondedTo?: string,
  ) {
    const rawFilters = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      woDetailId,
      status,
      queryTo,
      queryBy,
      respondedBy,
      queryRaisedFrom,
      queryRaisedTo,
      respondedFrom,
      respondedTo,
    };

    const parsed = WoQueriesQuerySchema.parse(rawFilters) as WoQueriesQueryDto;
    return this.woQueriesService.findAll(parsed);
  }

  @Get('pending')
  async getAllPending() {
    return this.woQueriesService.findAllPending();
  }

  @Get('overdue')
  async getAllOverdue() {
    return this.woQueriesService.findAllOverdue();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woQueriesService.findById(id);
  }

  @Get('by-wo-detail/:woDetailId')
  async getByWoDetailId(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woQueriesService.findByWoDetailId(woDetailId);
  }

  @Get('by-wo-detail/:woDetailId/pending')
  async getPendingByWoDetail(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woQueriesService.findPendingByWoDetail(woDetailId);
  }

  @Get('by-user/:userId')
  async getByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('type') type?: 'raised' | 'received',
  ) {
    return this.woQueriesService.findByUser(userId, type ?? 'raised');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateWoQuerySchema.parse(body) as CreateWoQueryDto;
    return this.woQueriesService.create(parsed);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body() body: unknown) {
    const parsed = CreateBulkWoQueriesSchema.parse(body) as CreateBulkWoQueriesDto;
    return this.woQueriesService.createBulk(parsed);
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = RespondToQuerySchema.parse(body) as RespondToQueryDto;
    return this.woQueriesService.respond(id, parsed);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = CloseQuerySchema.parse(body) as CloseQueryDto;
    return this.woQueriesService.close(id, parsed);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateQueryStatusSchema.parse(body) as UpdateQueryStatusDto;
    return this.woQueriesService.updateStatus(id, parsed);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(@Param('id', ParseIntPipe) id: number) {
    return this.woQueriesService.reopen(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woQueriesService.delete(id);
  }

  // ============================================
  // DASHBOARD/STATISTICS
  // ============================================

  @Get('dashboard/summary')
  async getDashboardSummary() {
    return this.woQueriesService.getDashboardSummary();
  }

  @Get('dashboard/response-times')
  async getResponseTimeStatistics() {
    return this.woQueriesService.getResponseTimeStatistics();
  }

  @Get('dashboard/by-user/:userId')
  async getUserQueryStatistics(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.woQueriesService.getUserQueryStatistics(userId);
  }

  @Get('sla/:woDetailId')
  async getSlaStatus(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woQueriesService.getSlaStatus(woDetailId);
  }
}
