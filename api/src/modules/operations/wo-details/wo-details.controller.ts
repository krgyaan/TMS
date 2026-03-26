import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, BadRequestException } from '@nestjs/common';
import { WoDetailsService } from './wo-details.service';
import { CreateWoDetailSchema, UpdateWoDetailSchema, WoDetailsQuerySchema, SkipPageSchema, ImportTenderContactsSchema } from './dto/wo-details.dto';
import type { CreateWoDetailDto, UpdateWoDetailDto, WoDetailsQueryDto, SkipPageDto } from './dto/wo-details.dto';
import { SavePage1Schema, SubmitPage1Schema } from './dto/page1-handover.dto';
import { SavePage2Schema, SubmitPage2Schema } from './dto/page2-compliance.dto';
import { SavePage3Schema, SubmitPage3Schema } from './dto/page3-swot.dto';
import { SavePage4Schema, SubmitPage4Schema } from './dto/page4-billing.dto';
import { SavePage5Schema, SubmitPage5Schema } from './dto/page5-execution.dto';
import { SavePage6Schema, SubmitPage6Schema } from './dto/page6-profitability.dto';
import { SavePage7Schema, SubmitPage7Schema } from './dto/page7-acceptance.dto';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

// Schema maps - exactly matching your original pattern
const PageSaveSchemas = {
  1: SavePage1Schema,
  2: SavePage2Schema,
  3: SavePage3Schema,
  4: SavePage4Schema,
  5: SavePage5Schema,
  6: SavePage6Schema,
  7: SavePage7Schema,
} as const;

const PageSubmitSchemas = {
  1: SubmitPage1Schema,
  2: SubmitPage2Schema,
  3: SubmitPage3Schema,
  4: SubmitPage4Schema,
  5: SubmitPage5Schema,
  6: SubmitPage6Schema,
  7: SubmitPage7Schema,
} as const;

@Controller('wo-details')
export class WoDetailsController {
  constructor(private readonly woDetailsService: WoDetailsService) {}
  // CRUD OPERATIONS - EXACTLY AS ORIGINAL
  @Get()
  async list(@CurrentUser() user: ValidatedUser, @Query() query: any) {
    const parsed = WoDetailsQuerySchema.parse(query) as WoDetailsQueryDto;
    return this.woDetailsService.findAll({ ...parsed, user });
  }

  @Get('dashboard/summary')
  async getDashboardSummary(
    @CurrentUser() user: ValidatedUser,
    @Query('teamId') teamId?: string,
  ) {
    return this.woDetailsService.getDashboardSummary(
      user,
      teamId ? Number(teamId) : undefined,
    );
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
  async create(@Body() body: unknown, @CurrentUser() user: ValidatedUser) {
    const parsed = CreateWoDetailSchema.parse(body) as CreateWoDetailDto;
    return this.woDetailsService.create(parsed, user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    const parsed = UpdateWoDetailSchema.parse(body) as UpdateWoDetailDto;
    return this.woDetailsService.update(id, parsed, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woDetailsService.delete(id);
  }
  // WIZARD OPERATIONS - EXACTLY AS ORIGINAL
  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  async initializeWizard(
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    const parsed = CreateWoDetailSchema.parse(body) as CreateWoDetailDto;
    return this.woDetailsService.initializeWizard(
      parsed.woBasicDetailId,
      user.sub,
    );
  }

  @Get(':id/wizard/progress')
  async getWizardProgress(@Param('id', ParseIntPipe) id: number) {
    return this.woDetailsService.getWizardProgress(id);
  }

  @Get(':id/wizard/validate')
  async validateWizard(@Param('id', ParseIntPipe) id: number) {
    return this.woDetailsService.validateWizard(id);
  }

  @Get(':id/wizard/pages/:pageNum')
  async getPageData(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
  ) {
    this.validatePageNumber(pageNum);
    return this.woDetailsService.getPageData(id, pageNum);
  }

  @Patch(':id/wizard/pages/:pageNum/draft')
  @HttpCode(HttpStatus.OK)
  async savePageDraft(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    this.validatePageNumber(pageNum);
    const schema = PageSaveSchemas[pageNum as keyof typeof PageSaveSchemas];
    const parsed = this.parseSafe(schema, body, pageNum, 'draft');
    return this.woDetailsService.savePageDraft(id, pageNum, parsed, user.sub);
  }

  @Post(':id/wizard/pages/:pageNum/save')
  @HttpCode(HttpStatus.OK)
  async savePage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    this.validatePageNumber(pageNum);
    const schema = PageSaveSchemas[pageNum as keyof typeof PageSaveSchemas];
    const parsed = this.parseSafe(schema, body, pageNum, 'save');
    return this.woDetailsService.savePage(id, pageNum, parsed, user.sub);
  }

  @Post(':id/wizard/pages/:pageNum/submit')
  @HttpCode(HttpStatus.OK)
  async submitPage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    this.validatePageNumber(pageNum);
    const schema = PageSubmitSchemas[pageNum as keyof typeof PageSubmitSchemas];
    const parsed = this.parseSafe(schema, body, pageNum, 'submit');
    return this.woDetailsService.submitPage(id, pageNum, parsed, user.sub);
  }

  @Post(':id/wizard/pages/:pageNum/skip')
  @HttpCode(HttpStatus.OK)
  async skipPage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageNum', ParseIntPipe) pageNum: number,
    @Body() body: unknown,
    @CurrentUser() user: ValidatedUser,
  ) {
    this.validatePageNumber(pageNum);
    const parsed = SkipPageSchema.parse(body) as SkipPageDto;
    return this.woDetailsService.skipPage(id, pageNum, parsed, user.sub);
  }

  @Post(':id/wizard/submit-for-review')
  @HttpCode(HttpStatus.OK)
  async submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: ValidatedUser,
  ) {
    return this.woDetailsService.submitForReview(id, user.sub);
  }
  // IMPORT OPERATIONS
  @Post(':id/import-tender-contacts')
  @HttpCode(HttpStatus.OK)
  async importTenderContacts(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = ImportTenderContactsSchema.parse(body);
    return this.woDetailsService.importTenderContacts(
      parsed.woBasicDetailId,
      id,
    );
  }
  // HELPER METHODS
  private validatePageNumber(pageNum: number): void {
    if (pageNum < 1 || pageNum > 7) {
      throw new BadRequestException(
        `Invalid page number: ${pageNum}. Must be between 1 and 7.`,
      );
    }
  }

  /**
   * Safe parse with detailed user friendly errors
   */
  private parseSafe(schema: any, body: unknown, pageNum: number, operation: string) {
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new BadRequestException({
        message: `Validation failed on page ${pageNum}`,
        page: pageNum,
        operation,
        errors,
      });
    }

    return result.data;
  }
}
