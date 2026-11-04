import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createApplication } from '../../src/bootstrap.js';

describe('Health endpoints (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
    const server: unknown = app.getHttpServer();
    httpServer = server as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports liveness without requiring a database query', async () => {
    const response = await request(httpServer).get('/api/v1/health/live').expect(200);
    const responseBody: unknown = response.body;

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(responseBody).toMatchObject({
      status: 'ok',
      version: '0.1.0-test',
    });
    expect(
      typeof responseBody === 'object' &&
        responseBody !== null &&
        'timestamp' in responseBody &&
        typeof responseBody.timestamp === 'string',
    ).toBe(true);
  });

  it('returns API information under the versioned prefix', async () => {
    await request(httpServer).get('/api/v1').expect(200).expect({
      name: 'Egypt Fashion Commerce API',
      version: '0.1.0-test',
      status: 'ok',
    });
  });

  it('protects authenticated routes without querying the database', async () => {
    const response = await request(httpServer).get('/api/v1/auth/me').expect(401);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({
      status: 401,
      detail: 'Authentication is required.',
    });
  });

  it('rejects invalid registration data before persistence', async () => {
    const response = await request(httpServer)
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        firstName: '',
        lastName: 'Customer',
        password: 'weak',
      })
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    const responseBody: unknown = response.body;
    expect(responseBody).toMatchObject({ status: 400 });
    expect(
      typeof responseBody === 'object' &&
        responseBody !== null &&
        'errors' in responseBody &&
        Array.isArray(responseBody.errors),
    ).toBe(true);
  });

  it('does not reveal whether a refresh session exists when no cookie is provided', async () => {
    await request(httpServer)
      .post('/api/v1/auth/refresh')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 401,
          detail: 'The session is invalid or expired.',
        });
      });
  });

  it('issues a readable CSRF cookie without caching the response', async () => {
    const response = await request(httpServer).get('/api/v1/auth/csrf').expect(200);
    const responseBody: unknown = response.body;
    if (
      typeof responseBody !== 'object' ||
      responseBody === null ||
      !('csrfToken' in responseBody) ||
      typeof responseBody.csrfToken !== 'string'
    ) {
      throw new Error('Expected the CSRF endpoint to return a token.');
    }
    const { csrfToken } = responseBody;

    expect(response.headers['cache-control']).toBe('no-store');
    expect(csrfToken).toEqual(expect.stringMatching(/^[A-Za-z0-9_-]+$/u));
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`csrf_token=${String(csrfToken)};`)]),
    );
    expect(response.body).toEqual({ csrfToken });
  });

  it('rejects login CSRF when an existing cookie session has no CSRF proof', async () => {
    await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Cookie', ['access_token=attacker-controlled-session'])
      .send({ email: 'customer@example.com', password: 'A-secure-password!42' })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 403,
          detail: 'The CSRF token is missing or invalid.',
        });
      });
  });

  it('accepts an unsafe request from a configured same-site browser origin', async () => {
    await request(httpServer)
      .delete('/api/v1/cart/items/00000000-0000-4000-8000-000000000000')
      .set('Cookie', ['access_token=existing-session'])
      .set('Origin', 'http://localhost:3000')
      .set('Sec-Fetch-Site', 'same-origin')
      .expect(401);
  });

  it('rejects an unsafe request from an untrusted browser origin without CSRF proof', async () => {
    await request(httpServer)
      .delete('/api/v1/cart/items/00000000-0000-4000-8000-000000000000')
      .set('Cookie', ['access_token=existing-session'])
      .set('Origin', 'https://attacker.example')
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);
  });

  it('protects catalog administration routes', async () => {
    await request(httpServer)
      .get('/api/v1/admin/products')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 401, detail: 'Authentication is required.' });
      });
  });

  it('rejects invalid catalog pagination before accessing PostgreSQL', async () => {
    await request(httpServer)
      .get('/api/v1/products?limit=1000')
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 400 });
      });
  });

  it('rejects an inverted product price range before querying the catalog', async () => {
    await request(httpServer)
      .get('/api/v1/products?minPrice=20000&maxPrice=10000')
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 400,
          detail: 'Minimum price cannot exceed maximum price.',
        });
      });
  });

  it('returns empty guest commerce state without creating database records', async () => {
    await request(httpServer).get('/api/v1/cart').expect(200).expect({
      id: null,
      items: [],
      itemCount: 0,
      subtotalPiasters: 0,
      hasUnavailableItems: false,
      updatedAt: null,
    });
    await request(httpServer).get('/api/v1/wishlist').expect(200).expect({
      id: null,
      items: [],
      itemCount: 0,
      updatedAt: null,
    });
  });

  it('validates cart mutations before creating a guest identity', async () => {
    const response = await request(httpServer)
      .post('/api/v1/cart/items')
      .send({ variantId: 'not-a-uuid', quantity: 0 })
      .expect(400);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body).toMatchObject({ status: 400 });
  });

  it('validates wishlist product identifiers before persistence', async () => {
    await request(httpServer)
      .post('/api/v1/wishlist/items')
      .send({ productId: 'not-a-uuid' })
      .expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ status: 400 }));
  });

  it('protects checkout and customer order snapshots', async () => {
    await request(httpServer)
      .post('/api/v1/checkout/quote')
      .send({ governorateCode: 'cairo' })
      .expect(401);
    await request(httpServer).get('/api/v1/orders/LDW-20260802-ABC12345').expect(401);
    await request(httpServer).get('/api/v1/orders?page=1').expect(401);
    await request(httpServer).get('/api/v1/addresses').expect(401);
    await request(httpServer).post('/api/v1/addresses').send({ label: 'Home' }).expect(401);
  });

  it('protects coupon, shipping, and order administration', async () => {
    await request(httpServer).get('/api/v1/admin/analytics/dashboard').expect(401);
    await request(httpServer).get('/api/v1/admin/coupons').expect(401);
    await request(httpServer).get('/api/v1/admin/shipping/rates').expect(401);
    await request(httpServer).get('/api/v1/admin/orders').expect(401);
    await request(httpServer).get('/api/v1/admin/settings').expect(401);
    await request(httpServer).get('/api/v1/admin/contact-messages').expect(401);
  });

  it('validates contact submissions before persistence', async () => {
    await request(httpServer)
      .post('/api/v1/contact')
      .send({ name: '', email: 'invalid', subject: 'Hi', message: 'short' })
      .expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ status: 400 }));
  });
});
