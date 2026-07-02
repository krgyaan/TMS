import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { WoContactsService } from './wo-contacts.service';
import { CreateWoContactSchema, UpdateWoContactSchema, CreateBulkWoContactsSchema, WoContactsQuerySchema } from './dto/wo-contacts.dto';
import type { CreateWoContactDto, UpdateWoContactDto, CreateBulkWoContactsDto, WoContactsQueryDto } from './dto/wo-contacts.dto';

@Controller('wo-contacts')
export class WoContactsController {
  constructor(private readonly woContactsService: WoContactsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('woBasicDetailId') woBasicDetailId?: string,
    @Query('departments') departments?: string,
    @Query('search') search?: string,
  ) {
    const rawFilters = {
      page,
      limit,
      sortBy,
      sortOrder,
      woBasicDetailId,
      departments,
      search,
    };

    const parsed = WoContactsQuerySchema.parse(rawFilters) as WoContactsQueryDto;
    return this.woContactsService.findAll(parsed);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.woContactsService.findById(id);
  }

  @Get('by-basic-detail/:woBasicDetailId')
  async getByWoBasicDetailId(@Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number) {
    return this.woContactsService.findByWoBasicDetailId(woBasicDetailId);
  }

  @Get('by-basic-detail/:woBasicDetailId/department/:department')
  async getByDepartment(
    @Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number,
    @Param('department') department: string,
  ) {
    return this.woContactsService.findByDepartment(woBasicDetailId, department);
  }

  @Get('by-basic-detail/:woBasicDetailId/summary')
  async getContactsSummary(@Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number) {
    return this.woContactsService.getContactsSummary(woBasicDetailId);
  }

  @Get('check-email')
  async checkEmailExists(
    @Query('email') email: string,
    @Query('woBasicDetailId') woBasicDetailId?: string,
  ) {
    return this.woContactsService.checkEmailExists(
      email,
      woBasicDetailId ? Number(woBasicDetailId) : undefined
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateWoContactSchema.parse(body) as CreateWoContactDto;
    return this.woContactsService.create(parsed);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body() body: unknown) {
    const parsed = CreateBulkWoContactsSchema.parse(body) as CreateBulkWoContactsDto;
    return this.woContactsService.createBulk(parsed);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateWoContactSchema.parse(body) as UpdateWoContactDto;
    return this.woContactsService.update(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.woContactsService.delete(id);
  }

  @Delete('by-basic-detail/:woBasicDetailId')
  @HttpCode(HttpStatus.OK)
  async deleteAllByBasicDetail(@Param('woBasicDetailId', ParseIntPipe) woBasicDetailId: number) {
    return this.woContactsService.deleteAllByBasicDetail(woBasicDetailId);
  }
}
