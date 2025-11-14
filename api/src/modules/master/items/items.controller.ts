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
} from '@nestjs/common';
import { z } from 'zod';
import { ItemsService } from './items.service';

const CreateItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name cannot exceed 255 characters'),
  teamId: z
    .number()
    .int('Team must be a whole number')
    .positive('Team must be positive')
    .optional()
    .nullable(),
  headingId: z
    .number()
    .int('Heading must be a whole number')
    .positive('Heading must be positive')
    .optional()
    .nullable(),
  status: z.boolean().optional(),
});

type CreateItemDto = z.infer<typeof CreateItemSchema>;

const UpdateItemSchema = CreateItemSchema.partial();
type UpdateItemDto = z.infer<typeof UpdateItemSchema>;

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async list() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateItemSchema.parse(body);
    const payload: CreateItemDto = {
      ...parsed,
      name: parsed.name.trim(),
      status: parsed.status ?? true,
    };
    return this.itemsService.create(payload);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateItemSchema.parse(body);
    const payload: UpdateItemDto = {
      ...parsed,
      name: parsed.name?.trim(),
    };
    return this.itemsService.update(id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.itemsService.delete(id);
  }
}
