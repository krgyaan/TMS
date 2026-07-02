import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config";

const QUEUE_NAMES = [
    "followup-mail-queue",
    "checklist-mail-queue",
    "video-processing-queue"
];

async function forceClean() {
    for (const name of QUEUE_NAMES) {
        console.log(`Force cleaning queue: ${name}...`);
        const q = new Queue(name, { connection: redisConnection });
        try {
            await q.drain(true); // waiting + delayed
            await q.clean(0, 1000, "active");
            await q.clean(0, 1000, "completed");
            await q.clean(0, 1000, "failed");
            console.log(`🔥 Queue "${name}" fully nuked (including active)`);
        } catch (error) {
            console.error(`Error force cleaning queue ${name}:`, error);
        } finally {
            await q.close();
        }
    }
    process.exit(0);
}

forceClean();
