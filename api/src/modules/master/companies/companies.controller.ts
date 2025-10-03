import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { CompaniesService } from './companies.service';

const DocumentSchema = z.object({
  name: z.string().min(1),
  size: z.number().nonnegative().optional(),
  isFolder: z.boolean().optional(),
});

const CompanyDetailsSchema = z.object({
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
});

const CompanyDocumentsSchema = z.object({
  documents: z.array(DocumentSchema).default([]),
});

export type CompanyDetailsDto = z.infer<typeof CompanyDetailsSchema>;
export type CompanyDocumentsDto = z.infer<typeof CompanyDocumentsSchema>;

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async list() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const company = await this.companiesService.findOne(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CompanyDetailsSchema.parse(body) as CompanyDetailsDto;
    return this.companiesService.create(parsed);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = CompanyDetailsSchema.parse(body) as CompanyDetailsDto;
    return this.companiesService.update(id, parsed);
  }

  @Put(':id/documents')
  async updateDocuments(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    const parsed = CompanyDocumentsSchema.parse(body) as CompanyDocumentsDto;
    return this.companiesService.updateDocuments(id, parsed.documents);
  }
}