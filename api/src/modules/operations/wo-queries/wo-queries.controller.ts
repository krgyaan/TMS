import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoQueriesService } from './wo-queries.service';
import { CreateWoQuerySchema, CreateBulkWoQueriesSchema, RespondToQuerySchema, CloseQuerySchema, UpdateQueryStatusSchema, WoQueriesQuerySchema } from './dto/wo-queries.dto';
import type { CreateWoQueryDto, CreateBulkWoQueriesDto, RespondToQueryDto, CloseQueryDto, UpdateQueryStatusDto, WoQueriesQueryDto } from './dto/wo-queries.dto';

@Controller('wo-queries')
export class WoQueriesController {
  constructor(private readonly woQueriesService: WoQueriesService) {}

  // ============================================
  // CRUD
  // ============================================

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const rawFilters = { page, limit, sortBy, sortOrder };

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

  @Get('statistics/summary')
  async getDashboardSummary() {
    return this.woQueriesService.getDashboardSummary();
  }

  @Get('statistics/response-time')
  async getResponseTimeStatistics() {
    return this.woQueriesService.getResponseTimeStatistics();
  }

  @Get('statistics/user/:userId')
  async getUserQueryStatistics(@Param('userId', ParseIntPipe) userId: number) {
    return this.woQueriesService.getUserQueryStatistics(userId);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woQueriesService.findById(id);
  }

  @Get('by-wo-detail/:woDetailsId')
  async getByWoDetailId(@Param('woDetailsId', ParseIntPipe) woDetailsId: number) {
    return this.woQueriesService.findByWoDetailId(woDetailsId);
  }

  @Get('by-wo-detail/:woDetailsId/pending')
  async getPendingByWoDetail(@Param('woDetailsId', ParseIntPipe) woDetailsId: number) {
    return this.woQueriesService.findPendingByWoDetail(woDetailsId);
  }

  @Get('by-wo-detail/:woDetailsId/sla-status')
  async getSlaStatus(@Param('woDetailsId', ParseIntPipe) woDetailsId: number) {
    return this.woQueriesService.getSlaStatus(woDetailsId);
  }

  @Get('by-user/:userId')
  async getByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('type') type?: 'raised' | 'received',
  ) {
    return this.woQueriesService.findByUser(userId, type || 'raised');
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
  async respond(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = RespondToQuerySchema.parse(body) as RespondToQueryDto;
    return this.woQueriesService.respond(id, parsed);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = CloseQuerySchema.parse(body) as CloseQueryDto;
    return this.woQueriesService.close(id, parsed);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(@Param('id', ParseIntPipe) id: number) {
    return this.woQueriesService.reopen(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateQueryStatusSchema.parse(body) as UpdateQueryStatusDto;
    return this.woQueriesService.updateStatus(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woQueriesService.delete(id);
  }
}
