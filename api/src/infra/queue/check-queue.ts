import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config";

const QUEUE_NAMES = [
    "followup-mail-queue",
    "checklist-mail-queue",
    "video-processing-queue"
];

async function inspect() {
    for (const name of QUEUE_NAMES) {
        console.log(`\n=== Queue: ${name} ===`);
        const q = new Queue(name, { connection: redisConnection });
        try {
            console.log("Waiting:", await q.getWaitingCount());
            console.log("Active:", await q.getActiveCount());
            console.log("Delayed:", await q.getDelayedCount());
            console.log("Failed:", await q.getFailedCount());
            console.log("Completed:", await q.getCompletedCount());
        } catch (error) {
            console.error(`Error inspecting queue ${name}:`, error);
        } finally {
            await q.close();
        }
    }

    process.exit(0);
}

inspect();
