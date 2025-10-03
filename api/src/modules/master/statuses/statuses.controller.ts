import { Controller, Get } from '@nestjs/common';
import { StatusesService } from './statuses.service';

@Controller('statuses')
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  async list() {
    return this.statusesService.findAll();
  }
}
