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
                const host = configService.get<string>('redis.host') || '127.0.0.1';
                const port = configService.get<number>('redis.port') || 6379;
                const client = new IORedis({
                    host,
                    port,
                    maxRetriesPerRequest: null,
                    enableOfflineQueue: false,
                    connectTimeout: 2000,
                    retryStrategy: (times) => Math.min(times * 1000, 5000),
                });
                client.on('error', () => {
                    // Suppress unhandled error crash when Redis is offline in local development
                });
                return client;
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
        {
            provide: "LEAD_FOLLOWUP_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return { add: async () => {} } as unknown as Queue;
                }
                return new Queue("lead-followup-mail-queue", { connection });
            },
        },
        {
            provide: "PDF_EXTRACTION_QUEUE",
            inject: ["REDIS_CONNECTION"],
            useFactory: (connection: IORedis | null) => {
                if (!connection) {
                    return { add: async () => ({} as any), getJob: async () => null } as unknown as Queue;
                }
                return new Queue("pdf-extraction-queue", { connection });
            },
        },
    ],
    exports: ["FOLLOWUP_QUEUE", "CHECKLIST_QUEUE", "VIDEO_PROCESSING_QUEUE", "GENERIC_QUEUE", "LEAD_FOLLOWUP_QUEUE", "PDF_EXTRACTION_QUEUE", "REDIS_CONNECTION"],
})
export class QueueModule { }
