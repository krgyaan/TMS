import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config";

const QUEUE_NAMES = [
    "followup-mail-queue",
    "checklist-mail-queue",
    "video-processing-queue"
];

async function clean() {
    for (const name of QUEUE_NAMES) {
        console.log(`Cleaning queue: ${name}...`);
        const q = new Queue(name, { connection: redisConnection });
        try {
            await q.drain(); // removes waiting & delayed
            await q.clean(0, 1000, "completed");
            await q.clean(0, 1000, "failed");
            console.log(`✅ Queue "${name}" cleaned`);
        } catch (error) {
            console.error(`Error cleaning queue ${name}:`, error);
        } finally {
            await q.close();
        }
    }
    process.exit(0);
}

clean();
