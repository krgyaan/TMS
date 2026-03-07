import { Module, Global } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { redisConnection } from "@/config/redis.config";

@Global()
@Module({
    providers: [
        {
            provide: "REDIS_CONNECTION",
            useFactory: () => {

                return new IORedis({
                    host: redisConnection.host,
                    port: redisConnection.port,
                });
            },
        },
        {
            provide: "FOLLOWUP_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return {
                        add: async () => {
                        },
                    } as unknown as Queue;
                }

                return new Queue("followup-mail-queue", { connection });
            },
        },
    ],
    exports: ["FOLLOWUP_QUEUE", "REDIS_CONNECTION"],
})
export class QueueModule { }
