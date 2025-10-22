import { Controller, Get } from '@nestjs/common';
import { FollowupCategoriesService } from './followup-categories.service';

@Controller('followup-categories')
export class FollowupCategoriesController {
  constructor(
    private readonly followupCategoriesService: FollowupCategoriesService,
  ) {}

  @Get()
  async list() {
    return this.followupCategoriesService.findAll();
  }
}
