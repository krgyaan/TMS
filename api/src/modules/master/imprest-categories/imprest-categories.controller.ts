import { Controller, Get } from '@nestjs/common';
import { ImprestCategoriesService } from './imprest-categories.service';

@Controller('imprest-categories')
export class ImprestCategoriesController {
  constructor(
    private readonly imprestCategoriesService: ImprestCategoriesService,
  ) {}

  @Get()
  async list() {
    return this.imprestCategoriesService.findAll();
  }
}
