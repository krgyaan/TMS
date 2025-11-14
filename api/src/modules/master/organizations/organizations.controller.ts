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
import { z } from 'zod';
import { OrganizationsService } from './organizations.service';

const CreateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name cannot exceed 255 characters'),
  acronym: z
    .string()
    .max(50, 'Acronym cannot exceed 50 characters')
    .optional()
    .nullable(),
  industryId: z.number().int().positive().optional().nullable(),
  status: z.boolean().optional().default(true),
});

const UpdateOrganizationSchema = CreateOrganizationSchema.partial();

type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;
type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  async list() {
    return this.organizationsService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query?.trim()) {
      return [];
    }
    return this.organizationsService.search(query.trim());
  }

  @Get('industry/:industryId')
  async getByIndustry(@Param('industryId', ParseIntPipe) industryId: number) {
    return this.organizationsService.findByIndustry(industryId);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateOrganizationSchema.parse(body);
    const payload: CreateOrganizationDto = {
      ...parsed,
      name: parsed.name.trim(),
      acronym: parsed.acronym?.trim() || null,
      industryId: parsed.industryId ?? null,
      status: parsed.status ?? true,
    };
    return this.organizationsService.create(payload);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateOrganizationSchema.parse(body);
    const payload: UpdateOrganizationDto = {
      ...parsed,
      name: parsed.name?.trim(),
      acronym:
        parsed.acronym === undefined
          ? parsed.acronym
          : parsed.acronym?.trim() || null,
      industryId: parsed.industryId === undefined ? parsed.industryId : parsed.industryId ?? null,
    };
    return this.organizationsService.update(id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.organizationsService.delete(id);
  }
}
