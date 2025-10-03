import { Controller, Get } from '@nestjs/common';
import { TqTypesService } from './tq-types.service';

@Controller('tq-types')
export class TqTypesController {
  constructor(private readonly tqTypesService: TqTypesService) {}

  @Get()
  async list() {
    return this.tqTypesService.findAll();
  }
}
