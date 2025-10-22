import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { TenderStatusService } from './tender-status.service';

const CreateTenderStatusSchema = z.object({
  name: z.string().min(1),
  tenderCategory: z.string().min(1).optional(),
  status: z.boolean().optional(),
});

const UpdateTenderStatusSchema = z.object({
  name: z.string().min(1).optional(),
  tenderCategory: z.string().min(1).optional(),
  status: z.boolean().optional(),
});

@Controller('tender-status')
export class TenderStatusController {
  constructor(private readonly service: TenderStatusService) {}

  @Get()
  async list() {
    return this.service.findAll();
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateTenderStatusSchema.parse(body);
    return this.service.create(parsed);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = UpdateTenderStatusSchema.parse(body);
    return this.service.update(id, parsed);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
