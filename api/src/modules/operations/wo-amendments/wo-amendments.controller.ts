import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoAmendmentsService } from './wo-amendments.service';
import { CreateWoAmendmentSchema, UpdateWoAmendmentSchema, CreateBulkWoAmendmentsSchema, TlReviewAmendmentSchema, RecordClientResponseSchema, WoAmendmentsQuerySchema} from './dto/wo-amendments.dto';
import type { CreateWoAmendmentDto, UpdateWoAmendmentDto, CreateBulkWoAmendmentsDto, TlReviewAmendmentDto, RecordClientResponseDto, WoAmendmentsQueryDto } from './dto/wo-amendments.dto';

@Controller('wo-amendments')
export class WoAmendmentsController {
  constructor(private readonly woAmendmentsService: WoAmendmentsService) {}

  // CRUD
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const rawFilters = { page, limit, sortBy, sortOrder };

    const parsed = WoAmendmentsQuerySchema.parse(rawFilters) as WoAmendmentsQueryDto;
    return this.woAmendmentsService.findAll(parsed);
  }

  @Get('statistics/top-clauses')
  async getTopClausesStatistics() {
    return this.woAmendmentsService.getTopClausesStatistics();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woAmendmentsService.findById(id);
  }

  @Get('by-wo-detail/:woDetailId')
  async getByWoDetailId(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woAmendmentsService.findByWoDetailId(woDetailId);
  }

  @Get('by-wo-detail/:woDetailId/clause/:clauseNo')
  async getByClause(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('clauseNo') clauseNo: string,
  ) {
    return this.woAmendmentsService.findByClause(woDetailId, clauseNo);
  }

  @Get('by-wo-detail/:woDetailId/summary')
  async getSummary(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woAmendmentsService.getSummary(woDetailId);
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
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateWoAmendmentSchema.parse(body) as UpdateWoAmendmentDto;
    return this.woAmendmentsService.update(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woAmendmentsService.delete(id);
  }

  @Delete('by-wo-detail/:woDetailId')
  @HttpCode(HttpStatus.OK)
  async deleteAllByWoDetail(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woAmendmentsService.deleteAllByWoDetail(woDetailId);
  }

  // TL REVIEW
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async tlReview(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = TlReviewAmendmentSchema.parse(body) as TlReviewAmendmentDto;
    return this.woAmendmentsService.tlReview(id, parsed);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { remarks?: string },
  ) {
    return this.woAmendmentsService.approve(id, body.remarks);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { remarks: string },
  ) {
    return this.woAmendmentsService.reject(id, body.remarks);
  }

  // CLIENT COMMUNICATION
  @Post(':id/communicated')
  @HttpCode(HttpStatus.OK)
  async markCommunicated(@Param('id', ParseIntPipe) id: number) {
    return this.woAmendmentsService.markCommunicated(id);
  }

  @Post(':id/client-response')
  @HttpCode(HttpStatus.OK)
  async recordClientResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = RecordClientResponseSchema.parse(body) as RecordClientResponseDto;
    return this.woAmendmentsService.recordClientResponse(id, parsed);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  async markResolved(@Param('id', ParseIntPipe) id: number) {
    return this.woAmendmentsService.markResolved(id);
  }

  @Post(':id/reject-by-client')
  @HttpCode(HttpStatus.OK)
  async markRejectedByClient(@Param('id', ParseIntPipe) id: number) {
    return this.woAmendmentsService.markRejectedByClient(id);
  }
}
