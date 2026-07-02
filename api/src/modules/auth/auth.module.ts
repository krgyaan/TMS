import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import authConfig, { type AuthConfig } from '@/config/auth.config';
import { UsersModule } from '@/modules/master/users/users.module';
import { GoogleIntegrationModule } from '@/modules/integrations/google/google.module';
import { DatabaseModule } from '@db/database.module';

import { AuthService } from '@/modules/auth/auth.service';
import { AuthController } from '@/modules/auth/auth.controller';
import { PermissionService } from '@/modules/auth/services/permission.service';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PermissionGuard } from '@/modules/auth/guards/permission.guard';
import { ResourceAccessGuard } from '@/modules/auth/guards/resource-access.guard';

import type { StringValue } from 'ms';


@Global()
@Module({
    imports: [
        DatabaseModule,
        PassportModule,
        ConfigModule.forFeature(authConfig),
        JwtModule.registerAsync({
            imports: [ConfigModule.forFeature(authConfig)],
            inject: [authConfig.KEY],
            useFactory: (config: AuthConfig) => ({
                secret: config.jwtAccessSecret,
                signOptions: { expiresIn: config.jwtAccessExpiresIn as StringValue },
            }),
        }),
        UsersModule,
        GoogleIntegrationModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PermissionService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        PermissionGuard,
        ResourceAccessGuard,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [
        AuthService,
        PermissionService,
        JwtAuthGuard,
        RolesGuard,
        PermissionGuard,
        ResourceAccessGuard,
        JwtModule,
    ],
})
export class AuthModule { }
