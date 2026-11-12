import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { OtherContactsService } from './other-contacts.service';
import { CreateOtherContactSchema } from './dto/other-contact.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('other-contacts')
export class OtherContactsController {
    constructor(private readonly otherContactsService: OtherContactsService) { }

    /** `?purpose=BG` narrows the list to a single feature's contacts. */
    @Get()
    async list(@Query('purpose') purpose?: string) {
        return this.otherContactsService.list(purpose || undefined);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown, @CurrentUser() user: ValidatedUser) {
        const payload = CreateOtherContactSchema.parse(body);
        return this.otherContactsService.create(payload, user?.sub);
    }
}
