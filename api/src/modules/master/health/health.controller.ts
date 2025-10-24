import { Controller, Get } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
