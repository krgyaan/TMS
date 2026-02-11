import { Module, Global } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { isRedisEnabled, redisConnection } from "@/config/redis.config";

@Global()
@Module({
    providers: [
        {
            provide: "REDIS_CONNECTION",
            useFactory: () => {
                if (!isRedisEnabled) {
                    return null;
                }

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
                if (!isRedisEnabled || !connection) {
                    // In non-production environments, return a no-op queue implementation
                    // so that the rest of the application can run without Redis.
                    return {
                        add: async () => {
                            // no-op
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
