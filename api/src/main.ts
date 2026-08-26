import "dotenv/config";
import "./instrument";
import { AppModule } from "@/app.module";
import { DRIZZLE } from "@/db/database.module";
import { AllExceptionsFilter } from "@/logger/all-exception.filter";
import { winstonLogger } from "@/logger/logger.config";
import { requestIdMiddleware } from "@/logger/request-id.middleware";
import { StatusCache } from "@/utils/status-cache";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { join } from "path";
import { HttpLoggerMiddleware } from "./logger/http-logger.middleware";

let app: NestExpressApplication;

async function bootstrap() {
    app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.use(requestIdMiddleware);
    app.useGlobalFilters(app.get(AllExceptionsFilter));

    const httpLoggerInstance = new HttpLoggerMiddleware(app.get(WINSTON_MODULE_PROVIDER));

    app.use((req, res, next) => httpLoggerInstance.use(req, res, next));

    app.useStaticAssets(join(process.cwd(), "uploads"), {
        prefix: "/uploads",
    });

    app.setGlobalPrefix("api/v1");

    // Global validation pipe with transform enabled
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
        })
    );

    // Enable cookies
    app.use(cookieParser());

    // Load status cache (unchanged)
    await StatusCache.load(app.get(DRIZZLE));

    // CORS (unchanged logic)
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

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
        winstonLogger.warn(`${signal} received — shutting down gracefully`);
        try {
            await app.close();
            winstonLogger.warn("Application closed");
        } catch (err) {
            winstonLogger.error("Error during shutdown", err);
        }
        process.exit(0);
    };

    process.on("SIGINT", () => {
        void gracefulShutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
        void gracefulShutdown("SIGTERM");
    });

    const port = 3000;
    await app.listen(port);

    // Increase server timeout for large uploads (10 minutes)
    app.getHttpServer().timeout = 10 * 60 * 1000;

    winstonLogger.info(`API running at http://localhost:${port}`);
}

void bootstrap();
