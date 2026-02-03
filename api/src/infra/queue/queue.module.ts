import { Module, Global } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";

@Global()
@Module({
    providers: [
        {
            provide: "REDIS_CONNECTION",
            useFactory: () => {
                return new IORedis({
                    host: "127.0.0.1",
                    port: 6379,
                });
            },
        },
        {
            provide: "FOLLOWUP_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis) => {
                return new Queue("followup-mail-queue", { connection });
            },
        },
    ],
    exports: ["FOLLOWUP_QUEUE", "REDIS_CONNECTION"],
})
export class QueueModule {}
