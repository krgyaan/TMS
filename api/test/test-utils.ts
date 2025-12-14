import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    return app;
}

export async function getAuthToken(app: INestApplication): Promise<string> {
    // Login with a test user - adjust credentials as needed
    const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
            email: 'gyan@volksenergie.in',
            password: 'gyan@ve.in',
        });

    return response.body.accessToken || response.headers['set-cookie'];
}

export function authRequest(app: INestApplication, token: string) {
    return {
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
        post: (url: string) =>
            request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
        patch: (url: string) =>
            request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${token}`),
        delete: (url: string) =>
            request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`),
    };
}
