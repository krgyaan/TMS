import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { CompaniesService } from './companies.service';

const DocumentSchema = z.object({
  name: z.string().min(1),
  size: z.number().nonnegative().optional(),
  isFolder: z.boolean().optional(),
});

const CreateCompanySchema = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
  registeredAddress: z.string().min(1),
  branchAddresses: z.array(z.string()).default([]),
  about: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  fax: z.string().optional(),
  signatoryName: z.string().optional(),
  designation: z.string().optional(),
  tenderKeywords: z.array(z.string()).default([]),
  documents: z.array(DocumentSchema).default([]),
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async list() {
    return this.companiesService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateCompanySchema.parse(body) as CreateCompanyDto;
    return this.companiesService.create(parsed);
  }
}
