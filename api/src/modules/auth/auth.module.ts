import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { UsersModule } from '../master/users/users.module';
import { GoogleIntegrationModule } from '../integrations/google/google.module';
import { DatabaseModule } from '../../db/database.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PermissionService } from './services/permission.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionGuard } from './guards/permission.guard';
import { ResourceAccessGuard } from './guards/resource-access.guard';

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
                signOptions: { expiresIn: config.jwtAccessExpiresIn },
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
