import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoDetailsService } from './wo-details.service';
import { CreateWoDetailSchema, UpdateWoDetailSchema, WoDetailsQuerySchema, PageSaveSchemas, PageSubmitSchemas, SkipPageSchema } from './dto/wo-details.dto';
import type { CreateWoDetailDto, UpdateWoDetailDto, WoDetailsQueryDto, SkipPageDto } from './dto/wo-details.dto';

@Controller('wo-details')
export class WoDetailsController {
  constructor(private readonly woDetailsService: WoDetailsService) {}

  // CRUD OPERATIONS
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const rawFilters = { page, limit, sortBy, sortOrder };
    const parsed = WoDetailsQuerySchema.parse(rawFilters) as WoDetailsQueryDto;
    return this.woDetailsService.findAll(parsed);
  }

  @Get('dashboard/summary')
  async getDashboardSummary() {
    return this.woDetailsService.getDashboardSummary();
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
  async getByWoBasicDetailId(@Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number) {
    return this.woDetailsService.findByWoBasicDetailId(woBasicDetailId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateWoDetailSchema.parse(body) as CreateWoDetailDto;
    return this.woDetailsService.create(parsed);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateWoDetailSchema.parse(body) as UpdateWoDetailDto;
    return this.woDetailsService.update(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woDetailsService.delete(id);
  }

  // WIZARD OPERATIONS
  @Get(':id/wizard/progress')
  async getWizardProgress(@Param('id', ParseIntPipe) id: number) {
    return this.woDetailsService.getWizardProgress(id);
  }

  @Get(':id/wizard/pages/:pageNum')
  async getPageData(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
  ) {
    return this.woDetailsService.getPageData(id, pageNum);
  }

  @Post(':id/wizard/pages/:pageNum/save')
  @HttpCode(HttpStatus.OK)
  async savePage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
  ) {
    const schema = PageSaveSchemas[pageNum as keyof typeof PageSaveSchemas];
    if (!schema) {
      throw new Error(`Invalid page number: ${pageNum}`);
    }
    const parsed = schema.parse(body);
    return this.woDetailsService.savePage(id, pageNum, parsed);
  }

  @Post(':id/wizard/pages/:pageNum/submit')
  @HttpCode(HttpStatus.OK)
  async submitPage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
  ) {
    const schema = PageSubmitSchemas[pageNum as keyof typeof PageSubmitSchemas];
    if (!schema) {
      throw new Error(`Invalid page number: ${pageNum}`);
    }
    const parsed = schema.parse(body);
    return this.woDetailsService.submitPage(id, pageNum, parsed);
  }

  @Post(':id/wizard/pages/:pageNum/skip')
  @HttpCode(HttpStatus.OK)
  async skipPage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
  ) {
    const parsed = SkipPageSchema.parse(body) as SkipPageDto;
    return this.woDetailsService.skipPage(id, pageNum, parsed);
  }

  @Post(':id/wizard/submit-for-review')
  @HttpCode(HttpStatus.OK)
  async submitForReview(@Param('id', ParseIntPipe) id: number) {
    return this.woDetailsService.submitForReview(id);
  }
}
