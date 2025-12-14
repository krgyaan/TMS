import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createAuthHeader } from './auth-helpers';

/**
 * Make an authenticated request
 */
export function authenticatedRequest(
    app: INestApplication<App>,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string,
    user?: { sub: number; email?: string; teamId?: number }
): request.Test {
    const req = request(app.getHttpServer())[method](url);
    const authHeader = createAuthHeader(user || { sub: 1 });
    return req.set('Authorization', authHeader);
}

/**
 * Make an unauthenticated request (for testing 401 errors)
 */
export function unauthenticatedRequest(
    app: INestApplication<App>,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string
): request.Test {
    return request(app.getHttpServer())[method](url);
}

/**
 * Assert response structure helpers
 */
export function expectPaginatedResponse(body: any) {
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');
    expect(body.meta).toHaveProperty('totalPages');
    expect(Array.isArray(body.data)).toBe(true);
}

/**
 * Wait for async operations to complete
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
