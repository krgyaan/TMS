import { Queue } from "bullmq";
import { isRedisEnabled, redisConnection } from "../../config/redis.config";

async function inspect() {
    if (!isRedisEnabled) {
        console.log("Redis is disabled in non-production environment; skipping inspect.");
        process.exit(0);
    }

    const q = new Queue("followup-mail-queue", { connection: redisConnection });

    console.log("Waiting:", await q.getWaitingCount());
    console.log("Active:", await q.getActiveCount());
    console.log("Delayed:", await q.getDelayedCount());
    console.log("Failed:", await q.getFailedCount());
    console.log("Completed:", await q.getCompletedCount());

    process.exit(0);
}

inspect();
