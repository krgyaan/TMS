import { Queue } from "bullmq";
import { isRedisEnabled, redisConnection } from "../../config/redis.config";

async function clean() {
    if (!isRedisEnabled) {
        console.log("Redis is disabled in non-production environment; skipping clean.");
        process.exit(0);
    }

    const q = new Queue("followup-mail-queue", { connection: redisConnection });

    await q.drain(); // removes waiting & delayed
    await q.clean(0, 1000, "completed");
    await q.clean(0, 1000, "failed");

    console.log("✅ Queue cleaned");
    process.exit(0);
}

clean();
