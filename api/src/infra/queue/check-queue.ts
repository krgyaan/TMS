import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config";

async function inspect() {
    const q = new Queue("followup-mail-queue", { connection: redisConnection });

    console.log("Waiting:", await q.getWaitingCount());
    console.log("Active:", await q.getActiveCount());
    console.log("Delayed:", await q.getDelayedCount());
    console.log("Failed:", await q.getFailedCount());
    console.log("Completed:", await q.getCompletedCount());

    process.exit(0);
}

inspect();
