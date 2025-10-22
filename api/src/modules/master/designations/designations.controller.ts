import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { DesignationsService } from './designations.service';

const CreateDesignationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

type CreateDesignationDto = z.infer<typeof CreateDesignationSchema>;

@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Get()
  async list() {
    return this.designationsService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateDesignationSchema.parse(body);
    return this.designationsService.create(parsed);
  }
}
