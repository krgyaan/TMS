import { Module, Global } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { ConfigService } from "@nestjs/config";

@Global()
@Module({
    providers: [
        {
            provide: "REDIS_CONNECTION",
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const host = configService.get<string>('redis.host');
                const port = configService.get<number>('redis.port');
                return new IORedis({ host, port });
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
        {
            provide: "CHECKLIST_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return {
                        add: async () => {},
                    } as unknown as Queue;
                }
                return new Queue("checklist-mail-queue", { connection });
            },
        },
        {
            provide: "VIDEO_PROCESSING_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return {
                        add: async () => {},
                    } as unknown as Queue;
                }
                return new Queue("video-processing-queue", { connection });
            },
        },
        {
            provide: "GENERIC_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return { add: async () => {} } as unknown as Queue;
                }
                return new Queue("generic-mail-queue", { connection });
            },
        },
    ],
    exports: ["FOLLOWUP_QUEUE", "CHECKLIST_QUEUE", "VIDEO_PROCESSING_QUEUE", "GENERIC_QUEUE", "REDIS_CONNECTION"],
})
export class QueueModule { }
