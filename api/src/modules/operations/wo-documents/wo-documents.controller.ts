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
import { WoDocumentsService } from './wo-documents.service';
import {
  CreateWoDocumentSchema,
  UpdateWoDocumentSchema,
  CreateBulkWoDocumentsSchema,
  WoDocumentsQuerySchema,
  ReplaceDocumentSchema,
} from './dto/wo-documents.dto';
import type {
  CreateWoDocumentDto,
  UpdateWoDocumentDto,
  CreateBulkWoDocumentsDto,
  WoDocumentsQueryDto,
  ReplaceDocumentDto,
} from './dto/wo-documents.dto';

@Controller('wo-documents')
export class WoDocumentsController {
  constructor(private readonly woDocumentsService: WoDocumentsService) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('woDetailId') woDetailId?: string,
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
      woDetailId,
      type,
      version,
      uploadedFrom,
      uploadedTo,
    };

    const parsed = WoDocumentsQuerySchema.parse(rawFilters) as WoDocumentsQueryDto;
    return this.woDocumentsService.findAll(parsed);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woDocumentsService.findById(id);
  }

  @Get('by-wo-detail/:woDetailId')
  async getByWoDetailId(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woDocumentsService.findByWoDetailId(woDetailId);
  }

  @Get('by-type/:woDetailId/:type')
  async getByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    return this.woDocumentsService.findByType(woDetailId, type);
  }

  @Get('latest/:woDetailId/:type')
  async getLatestByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    return this.woDocumentsService.findLatestByType(woDetailId, type);
  }

  @Get('versions/:woDetailId/:type')
  async getVersionHistory(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    return this.woDocumentsService.getVersionHistory(woDetailId, type);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(@Body() body: unknown) {
    const parsed = CreateWoDocumentSchema.parse(body) as CreateWoDocumentDto;
    return this.woDocumentsService.upload(parsed);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async uploadBulk(@Body() body: unknown) {
    const parsed = CreateBulkWoDocumentsSchema.parse(body) as CreateBulkWoDocumentsDto;
    return this.woDocumentsService.uploadBulk(parsed);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateWoDocumentSchema.parse(body) as UpdateWoDocumentDto;
    return this.woDocumentsService.update(id, parsed);
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.CREATED)
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = ReplaceDocumentSchema.parse(body) as ReplaceDocumentDto;
    return this.woDocumentsService.replace(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woDocumentsService.delete(id);
  }

  @Delete('by-wo-detail/:woDetailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllByWoDetail(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    await this.woDocumentsService.deleteAllByWoDetail(woDetailId);
  }

  @Delete('by-type/:woDetailId/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    await this.woDocumentsService.deleteByType(woDetailId, type);
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  @Get('summary/:woDetailId')
  async getDocumentsSummary(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
  ) {
    return this.woDocumentsService.getDocumentsSummary(woDetailId);
  }

  @Get('check-exists/:woDetailId/:type')
  async checkDocumentExists(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    return this.woDocumentsService.checkDocumentExists(woDetailId, type);
  }

  @Get('statistics/overview')
  async getOverviewStatistics() {
    return this.woDocumentsService.getOverviewStatistics();
  }
}
