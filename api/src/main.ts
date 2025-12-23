import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import cookieParser from "cookie-parser";

import { DRIZZLE } from "@/db/database.module";
import { StatusCache } from "@/utils/status-cache";
import type { DbInstance } from "@db";

async function bootstrap() {
    // ✅ IMPORTANT: Use NestExpressApplication
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const config = app.get(ConfigService);
    const appCfg = config.get<{ port: number; apiPrefix: string }>("app", {
        infer: true,
    });

    /**
     * ✅ Serve uploaded files
     * This makes /uploads/* accessible publicly
     * Works both locally and on VPS
     */
    app.useStaticAssets(join(process.cwd(), "uploads"), {
        prefix: "/uploads",
    });

    /**
     * Global API prefix
     * APIs → /api/v1/*
     * Files → /uploads/*
     */
    app.setGlobalPrefix(appCfg?.apiPrefix ?? "api/v1");

    // Enable cookies
    app.use(cookieParser());

    // Load status cache (unchanged)
    await StatusCache.load(app.get(DRIZZLE) as DbInstance);

    /**
     * CORS (unchanged logic)
     */
    const allowedOrigins = ["http://localhost:5173", "https://tmsv2.volksenergie.in"];

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error("Not allowed by CORS"), true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    const port = appCfg?.port ?? 3000;
    await app.listen(port);

    console.log(`🚀 API running at http://localhost:${port}`);
    console.log(`📁 Uploads served at /uploads/*`);
}

bootstrap();
