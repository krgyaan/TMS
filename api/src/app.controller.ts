import { Controller, Get } from "@nestjs/common";
import { AppService } from '@/app.service';
import { Public } from '@/modules/auth/decorators/public.decorator';
import * as Sentry from "@sentry/nestjs";

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Public()
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Public()
    @Get("test-error")
    testError() {
        const error = new Error("Sentry test error from TMS API");
        Sentry.captureException(error);
        throw error;
    }
}
