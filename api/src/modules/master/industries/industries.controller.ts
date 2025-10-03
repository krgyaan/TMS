import { Controller, Get } from '@nestjs/common';
import { IndustriesService } from './industries.service';

@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  async list() {
    return this.industriesService.findAll();
  }
}
