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
import { WoAmendmentsService } from './wo-amendments.service';
import {
  CreateWoAmendmentSchema,
  UpdateWoAmendmentSchema,
  CreateBulkWoAmendmentsSchema,
  WoAmendmentsQuerySchema,
} from './dto/wo-amendments.dto';
import type {
  CreateWoAmendmentDto,
  UpdateWoAmendmentDto,
  CreateBulkWoAmendmentsDto,
  WoAmendmentsQueryDto,
} from './dto/wo-amendments.dto';

@Controller('wo-amendments')
export class WoAmendmentsController {
  constructor(private readonly woAmendmentsService: WoAmendmentsService) {}

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
    @Query('pageNo') pageNo?: string,
    @Query('clauseNo') clauseNo?: string,
    @Query('createdAtFrom') createdAtFrom?: string,
    @Query('createdAtTo') createdAtTo?: string,
  ) {
    const rawFilters = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      woDetailId,
      pageNo,
      clauseNo,
      createdAtFrom,
      createdAtTo,
    };

    const parsed = WoAmendmentsQuerySchema.parse(rawFilters) as WoAmendmentsQueryDto;
    return this.woAmendmentsService.findAll(parsed);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woAmendmentsService.findById(id);
  }

  @Get('by-wo-detail/:woDetailId')
  async getByWoDetailId(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woAmendmentsService.findByWoDetailId(woDetailId);
  }

  @Get('by-clause/:woDetailId/:clauseNo')
  async getByClause(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('clauseNo') clauseNo: string,
  ) {
    return this.woAmendmentsService.findByClause(woDetailId, clauseNo);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateWoAmendmentSchema.parse(body) as CreateWoAmendmentDto;
    return this.woAmendmentsService.create(parsed);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body() body: unknown) {
    const parsed = CreateBulkWoAmendmentsSchema.parse(body) as CreateBulkWoAmendmentsDto;
    return this.woAmendmentsService.createBulk(parsed);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateWoAmendmentSchema.parse(body) as UpdateWoAmendmentDto;
    return this.woAmendmentsService.update(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woAmendmentsService.delete(id);
  }

  @Delete('by-wo-detail/:woDetailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllByWoDetail(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    await this.woAmendmentsService.deleteAllByWoDetail(woDetailId);
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  @Get('summary/:woDetailId')
  async getAmendmentsSummary(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woAmendmentsService.getAmendmentsSummary(woDetailId);
  }

  @Get('statistics/top-clauses')
  async getTopClausesStatistics() {
    return this.woAmendmentsService.getTopClausesStatistics();
  }
}
