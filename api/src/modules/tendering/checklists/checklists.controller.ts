import { Controller, Get } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';

@Controller('checklists')
export class ChecklistsController {
    constructor(private readonly checklistsService: ChecklistsService) { }

    @Get()
    findAll() {
        return this.checklistsService.findAll();
    }
}
