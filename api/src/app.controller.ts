import { Controller, Get } from "@nestjs/common";
import { AppService } from '@/app.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Public()
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    // In any controller temporarily
    @Public()
    @Get("test-error")
    testError() {
        throw new Error("Sentry test error from TMS API");
    }
}
