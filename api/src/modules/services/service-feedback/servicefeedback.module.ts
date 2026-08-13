import { Module } from "@nestjs/common";
import { ServiceFeedbackController } from "./servicefeedback.controller";
import { ServiceFeedbackService } from "./servicefeedback.service";

@Module({
    controllers: [ServiceFeedbackController],
    providers: [ServiceFeedbackService],
    exports: [ServiceFeedbackService],
})
export class ServiceFeedbackModule {}
