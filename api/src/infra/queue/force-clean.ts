import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config";

async function forceClean() {
    const q = new Queue("followup-mail-queue", { connection: redisConnection });

    await q.drain(true); // waiting + delayed
    await q.clean(0, 1000, "active");
    await q.clean(0, 1000, "completed");
    await q.clean(0, 1000, "failed");

    console.log("🔥 Queue fully nuked (including active)");
    process.exit(0);
}

forceClean();
