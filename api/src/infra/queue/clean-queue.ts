import { Queue } from "bullmq";
import * as dotenv from 'dotenv';

dotenv.config();

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = Number(process.env.REDIS_PORT || 6379);

const QUEUE_NAMES = [
    "followup-mail-queue",
    "checklist-mail-queue",
    "video-processing-queue"
];

async function clean() {
    for (const name of QUEUE_NAMES) {
        console.log(`Cleaning queue: ${name}...`);
        const q = new Queue(name, { connection: { host, port } });
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
