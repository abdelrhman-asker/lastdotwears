import type { ConfigService } from '@nestjs/config';

import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { AdminSetupService } from './admin-setup.service.js';
import { PasswordService } from './password.service.js';

const email = 'lastdotwears@gmail.com';
const origin = 'https://www.last-dot.com';
const secret = '12ab'.repeat(16);
const password = 'Secure-test-password42!';
const body = { email, password, confirmPassword: password, setupSecret: secret };

function fixture(initialEmails: string[] = [], enabled = true) {
  const users = initialEmails.map((address) => ({
    email: address,
    role: 'ADMIN',
  })) as Array<Record<string, unknown>>;
  let completed = false;
  let transactions = Promise.resolve();
  const passwords = new PasswordService();
  const prisma = {
    auditLog: { findUnique: () => Promise.resolve(completed ? { id: 'complete' } : null) },
    user: {
      findFirst: (query: { where: { email: { equals: string; mode: string } } }) =>
        Promise.resolve(
          users.find(
            (user) =>
              (query.where.email.mode === 'insensitive'
                ? String(user.email).toLowerCase()
                : user.email) === query.where.email.equals,
          ) ?? null,
        ),
    },
    $transaction: (callback: (tx: object) => Promise<void>) => {
      const next = transactions.then(async () => {
        let recorded = false;
        let pendingUser: Record<string, unknown> | undefined;
        await callback({
          auditLog: {
            create: () => {
              if (completed)
                return Promise.reject(Object.assign(new Error('Duplicate key'), { code: 'P2002' }));
              recorded = true;
              return Promise.resolve();
            },
            update: () => Promise.resolve(),
          },
          user: {
            create: ({ data }: { data: Record<string, unknown> }) => {
              pendingUser = data;
              return Promise.resolve({ id: 'user' });
            },
          },
        });
        if (recorded) completed = true;
        if (pendingUser) users.push(pendingUser);
      });
      transactions = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };
  const config = {
    getOrThrow: (key: string) => (key === 'ADMIN_SETUP_ENABLED' ? enabled : [origin]),
    get: () => secret,
  } as unknown as ConfigService;
  return {
    users,
    passwords,
    start: () => new AdminSetupService(config, prisma as unknown as PrismaService, passwords),
  };
}

describe('AdminSetupService', () => {
  it('returns 404 for status and creation while disabled', async () => {
    const setup = fixture([], false).start();
    await expect(setup.assertAvailable()).rejects.toMatchObject({ status: 404 });
    await expect(setup.create(body, origin)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects missing or incorrect secrets without echoing them', async () => {
    const setup = fixture().start();
    for (const supplied of [undefined, 'abcd'.repeat(16)]) {
      await expect(setup.create({ ...body, setupSecret: supplied }, origin)).rejects.toMatchObject({
        status: 403,
        message: 'Invalid setup secret.',
      });
    }
  });

  it('rejects an untrusted origin, weak or mismatched passwords and another email', async () => {
    const setup = fixture().start();
    await expect(setup.create(body, 'https://other.example')).rejects.toMatchObject({
      status: 403,
    });
    await expect(setup.create({ ...body, password: 'weak' }, origin)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      setup.create({ ...body, confirmPassword: 'different' }, origin),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      setup.create({ ...body, email: 'another@example.com' }, origin),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects a case-variant existing account', async () => {
    const db = fixture([email.toUpperCase()]);
    db.users[0]!.role = 'CUSTOMER';
    await expect(db.start().create(body, origin)).rejects.toMatchObject({ status: 409 });
    expect(db.users).toEqual([{ email: email.toUpperCase(), role: 'CUSTOMER' }]);
  });

  it('allows another admin to exist and creates only a verified admin with an Argon2id hash', async () => {
    const db = fixture(['seed@example.com']);
    await db.start().create({ ...body, email: email.toUpperCase() }, origin);
    const admin = db.users[1];
    expect(admin).toMatchObject({
      email,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
    });
    expect(admin?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(admin?.passwordHash).toMatch(/^\$argon2id\$/u);
    await expect(db.passwords.verify(String(admin?.passwordHash), password)).resolves.toBe(true);
    expect(admin).not.toHaveProperty('setupSecret');
    expect(admin).not.toHaveProperty('password');
  });

  it('allows only one concurrent success and stays closed after restarting or removing the account', async () => {
    const db = fixture();
    const outcomes = await Promise.allSettled([
      db.start().create(body, origin),
      db.start().create(body, origin),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(db.users).toHaveLength(1);
    await expect(db.start().create(body, origin)).rejects.toMatchObject({ status: 404 });
    db.users.length = 0;
    await expect(db.start().assertAvailable()).rejects.toMatchObject({ status: 404 });
    await expect(db.start().create(body, origin)).rejects.toMatchObject({ status: 404 });
  });
});
