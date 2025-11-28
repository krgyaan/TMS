import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);
    const appCfg = config.get<{ port: number; apiPrefix: string }>("app", {
        infer: true,
    });

    if (appCfg?.apiPrefix) {
        app.setGlobalPrefix(appCfg.apiPrefix);
    }

    // Enable cookie parser
    app.use(cookieParser());

    app.setGlobalPrefix("api/v1");

    app.enableCors({
        origin: true,
        credentials: true,
    });
    await app.listen(appCfg?.port ?? 3000);
    console.log(`App is Running on: http://localhost:${appCfg?.port ?? 3000}`);
}
bootstrap();
