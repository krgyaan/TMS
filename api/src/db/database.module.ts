import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import dbConfig from '@/config/db.config';
import { createDb, createPool } from '@db';

export const DB_POOL = Symbol('DB_POOL');
export const DRIZZLE = Symbol('DRIZZLE_DB');

@Global()
@Module({
    imports: [ConfigModule.forFeature(dbConfig)],
    providers: [
        {
            provide: DB_POOL,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const cfg = config.get<{ url: string; ssl: boolean; maxPool: number }>(
                    'db',
                    { infer: true },
                );
                if (!cfg?.url) throw new Error('DATABASE_URL not configured');
                return createPool(cfg.url, cfg.maxPool, cfg.ssl);
            },
        },
        {
            provide: DRIZZLE,
            inject: [DB_POOL],
            useFactory: (pool) => createDb(pool),
        },
    ],
    exports: [DB_POOL, DRIZZLE],
})
export class DatabaseModule { }
