import { Controller, Get } from '@nestjs/common';
import { LeadIndustriesService } from './lead-industries.service';

@Controller('lead-industries')
export class LeadIndustriesController {
    constructor(private readonly leadIndustriesService: LeadIndustriesService) {}

    @Get()
    async list() {
        return this.leadIndustriesService.findAll();
    }
}