import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoDocumentsService } from './wo-documents.service';
import { CreateWoDocumentSchema, UpdateWoDocumentSchema, CreateBulkWoDocumentsSchema, ReplaceDocumentSchema, WoDocumentsQuerySchema, DocumentTypeEnum } from './dto/wo-documents.dto';
import type { CreateWoDocumentDto, UpdateWoDocumentDto, CreateBulkWoDocumentsDto, ReplaceDocumentDto, WoDocumentsQueryDto, DocumentType } from './dto/wo-documents.dto';

@Controller('wo-documents')
export class WoDocumentsController {
  constructor(private readonly woDocumentsService: WoDocumentsService) {}

  // CRUD
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const rawFilters = { page, limit, sortBy, sortOrder };

    const parsed = WoDocumentsQuerySchema.parse(rawFilters) as WoDocumentsQueryDto;
    return this.woDocumentsService.findAll(parsed);
  }

  @Get('statistics/overview')
  async getOverviewStatistics() {
    return this.woDocumentsService.getOverviewStatistics();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woDocumentsService.findById(id);
  }

  @Get('by-wo-detail/:woDetailId')
  async getByWoDetailId(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woDocumentsService.findByWoDetailId(woDetailId);
  }

  @Get('by-wo-detail/:woDetailId/type/:type')
  async getByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    const parsedType = DocumentTypeEnum.parse(type) as DocumentType;
    return this.woDocumentsService.findByType(woDetailId, parsedType);
  }

  @Get('by-wo-detail/:woDetailId/type/:type/latest')
  async getLatestByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    const parsedType = DocumentTypeEnum.parse(type) as DocumentType;
    return this.woDocumentsService.findLatestByType(woDetailId, parsedType);
  }

  @Get('by-wo-detail/:woDetailId/type/:type/versions')
  async getVersionHistory(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    const parsedType = DocumentTypeEnum.parse(type) as DocumentType;
    return this.woDocumentsService.getVersionHistory(woDetailId, parsedType);
  }

  @Get('by-wo-detail/:woDetailId/type/:type/exists')
  async checkDocumentExists(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    const parsedType = DocumentTypeEnum.parse(type) as DocumentType;
    return this.woDocumentsService.checkDocumentExists(woDetailId, parsedType);
  }

  @Get('by-wo-detail/:woDetailId/summary')
  async getSummary(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woDocumentsService.getSummary(woDetailId);
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
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateWoDocumentSchema.parse(body) as UpdateWoDocumentDto;
    return this.woDocumentsService.update(id, parsed);
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.OK)
  async replace(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = ReplaceDocumentSchema.parse(body) as ReplaceDocumentDto;
    return this.woDocumentsService.replace(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woDocumentsService.delete(id);
  }

  @Delete('by-wo-detail/:woDetailId')
  @HttpCode(HttpStatus.OK)
  async deleteAllByWoDetail(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woDocumentsService.deleteAllByWoDetail(woDetailId);
  }

  @Delete('by-wo-detail/:woDetailId/type/:type')
  @HttpCode(HttpStatus.OK)
  async deleteByType(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Param('type') type: string,
  ) {
    const parsedType = DocumentTypeEnum.parse(type) as DocumentType;
    return this.woDocumentsService.deleteByType(woDetailId, parsedType);
  }
}
