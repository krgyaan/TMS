import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);
    const appCfg = config.get<{ port: number; apiPrefix: string }>('app', {
        infer: true,
    });

    if (appCfg?.apiPrefix) {
        app.setGlobalPrefix(appCfg.apiPrefix);
    }

    // Enable cookie parser
    app.use(cookieParser());

    app.setGlobalPrefix('api/v1');

    const allowedOrigins = [
        'http://localhost:5173'
    ];
    app.enableCors({
        origin: function (origin: string, callback: (arg0: Error | null, arg1: boolean | undefined) => void) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'), true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await app.listen(appCfg?.port ?? 3000);
    console.log(`App is Running on: http://localhost:${appCfg?.port ?? 3000}`);
}
bootstrap();
