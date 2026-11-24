import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';

import { createApplication } from '../../src/bootstrap.js';

describe('Administrator setup HTTP security', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 for both endpoints before CSRF and body validation when disabled', async () => {
    await request(server)
      .get('/api/v1/admin/setup/status')
      .expect(404)
      .expect('Cache-Control', 'no-store');
    await request(server)
      .post('/api/v1/admin/setup')
      .set('Cookie', 'access_token=fixture')
      .send({ setupSecret: 'sensitive-fixture' })
      .expect(404)
      .expect('Cache-Control', 'no-store');
  });

  it('requires CSRF even for guests and rate-limits rejected secrets', async () => {
    const config = app.get(ConfigService);
    config.set('ADMIN_SETUP_ENABLED', true);
    config.set('ADMIN_SETUP_SECRET', '12ab'.repeat(16));
    try {
      const malformed = await request(server)
        .post('/api/v1/admin/setup?setupSecret=query-fixture')
        .set('Content-Type', 'application/json')
        .send('private-body-fixture')
        .expect(400);
      expect(malformed.text).not.toContain('query-fixture');
      expect(malformed.text).not.toContain('private-body-fixture');
      await request(server)
        .post('/api/v1/admin/setup')
        .set('X-Forwarded-For', '192.0.2.1')
        .set('Origin', 'http://localhost:3000')
        .send({})
        .expect(403);
      const agent = request.agent(server);
      const csrf = await agent.get('/api/v1/auth/csrf').expect(200);
      const { csrfToken } = csrf.body as { csrfToken: string };
      const incorrect = 'abcd'.repeat(16);
      const attempt = () =>
        agent
          .post('/api/v1/admin/setup')
          .set('X-Forwarded-For', '192.0.2.2')
          .set('Origin', 'http://localhost:3000')
          .set('X-CSRF-Token', csrfToken)
          .send({ setupSecret: incorrect, password: 'private-password-fixture' });
      for (let index = 0; index < 3; index++) {
        const result = await attempt().expect(403).expect('Cache-Control', 'no-store');
        expect(result.text).toContain('Invalid setup secret');
        expect(result.text).not.toContain(incorrect);
        expect(result.text).not.toContain('private-password-fixture');
      }
      await attempt().expect(429).expect('Cache-Control', 'no-store');
    } finally {
      config.set('ADMIN_SETUP_ENABLED', false);
      config.set('ADMIN_SETUP_SECRET', '');
    }
  });
});
