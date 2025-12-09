import { Controller, Get } from '@nestjs/common';
import { Public } from '@/modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
    @Get()
    @Public()
    getHealth() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
}
