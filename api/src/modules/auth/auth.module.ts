import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { UsersModule } from '../master/users/users.module';
import { GoogleIntegrationModule } from '../integrations/google/google.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
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
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
