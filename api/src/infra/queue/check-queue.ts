import { Queue } from "bullmq";
import * as dotenv from 'dotenv';

dotenv.config();

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = Number(process.env.REDIS_PORT || 6379);

const QUEUE_NAMES = [
    "followup-mail-queue",
    "checklist-mail-queue",
    "video-processing-queue",
    "generic-mail-queue"
];

async function inspect() {
    for (const name of QUEUE_NAMES) {
        console.log(`\n=== Queue: ${name} ===`);
        const q = new Queue(name, { connection: { host, port } });
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
