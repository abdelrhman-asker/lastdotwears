import 'reflect-metadata';

import { createInterface, type Interface } from 'node:readline';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import pg from 'pg';

import { hasPrismaCode } from '../common/utils/prisma-error.util.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { RegisterDto } from '../modules/auth/dto/auth.dto.js';
import { PasswordService } from '../modules/auth/services/password.service.js';

class AdminCliError extends Error {}

export function parseNeonTarget(
  connection: string,
  expectedHost: string,
  expectedDatabase: string,
) {
  let url: URL;
  let database: string;
  let user: string;
  let password: string;
  try {
    const pasted = connection.trim();
    if (/[\r\n\t]/u.test(pasted)) throw new Error('Multiline input');
    url = new URL(pasted);
    database = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new AdminCliError(
      'Invalid URL. Paste only the raw postgresql:// URL from Neon Connect, on one line.',
    );
  }
  const host = url.hostname.toLowerCase();
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/u.test(host) ||
    host.split('.')[0]?.endsWith('-pooler') ||
    (url.port && url.port !== '5432')
  ) {
    throw new AdminCliError('Expected a direct Neon PostgreSQL hostname on port 5432.');
  }
  if (host !== expectedHost.trim().toLowerCase() || database !== expectedDatabase || !database) {
    throw new AdminCliError('The URL hostname or database does not match the target you entered.');
  }
  if (!user || !password) throw new AdminCliError('The Neon URL is missing the role or password.');
  if (url.searchParams.getAll('schema').some((schema) => schema !== 'public')) {
    throw new AdminCliError('The admin CLI requires the public schema.');
  }
  if (
    url.searchParams
      .getAll('sslmode')
      .some((mode) => !['require', 'verify-ca', 'verify-full'].includes(mode))
  ) {
    throw new AdminCliError('Use a Neon URL with sslmode=require or sslmode=verify-full.');
  }
  if (
    url.searchParams.getAll('channel_binding').some((mode) => !['require', 'prefer'].includes(mode))
  ) {
    throw new AdminCliError('The Neon URL contains an unsupported channel_binding setting.');
  }

  // Explicit fields keep URL parameters and PGHOST from redirecting the connection.
  return {
    host,
    port: 5432,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: true, servername: host },
    enableChannelBinding: true,
    connectionTimeoutMillis: 10_000,
  };
}

type AdminStep =
  'database connection' | 'existing-account lookup' | 'password hashing' | 'admin insert';

export function describeAdminFailure(step: AdminStep, error: unknown): string {
  const candidates = [error];
  if (error instanceof Error) candidates.push(error.cause);
  if (error instanceof AggregateError) candidates.push(...(error.errors as unknown[]));
  if (typeof error === 'object' && error !== null && 'meta' in error) candidates.push(error.meta);
  const hasCode = (...codes: string[]) =>
    candidates.some((candidate) => codes.some((code) => hasPrismaCode(candidate, code)));
  const hasMessage = (pattern: RegExp) =>
    candidates.some((candidate) => candidate instanceof Error && pattern.test(candidate.message));

  let detail: string;
  if (hasCode('P2002', '23505')) {
    detail = 'A conflicting account already exists. No account was changed.';
  } else if (hasCode('28P01', 'P1000')) {
    detail =
      'PostgreSQL rejected the role or password. Copy a fresh URL for the correct Neon role.';
  } else if (hasCode('28000', '42501', 'P1010')) {
    detail =
      'The Neon role lacks access for this operation. Check its database and table permissions.';
  } else if (hasCode('3D000', 'P1003')) {
    detail = 'PostgreSQL could not find the requested database.';
  } else if (hasCode('42P01', '42703', 'P2021', 'P2022')) {
    detail =
      'The expected users table or columns are missing. Check the branch and migration history.';
  } else if (
    hasCode(
      'P1011',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'CERT_HAS_EXPIRED',
      'ERR_TLS_CERT_ALTNAME_INVALID',
    ) ||
    hasMessage(/server does not support SSL|error establishing an SSL connection|^TLS /iu)
  ) {
    detail =
      'TLS negotiation or certificate verification failed. Check the direct hostname and the Node.js trust store.';
  } else if (hasMessage(/\bSASL\b|SCRAM|channel.binding/iu)) {
    detail =
      'PostgreSQL SCRAM or channel binding negotiation failed. Check the configured Neon role and client.';
  } else if (hasCode('ENOTFOUND', 'EAI_AGAIN')) {
    detail = 'DNS could not resolve the Neon hostname.';
  } else if (
    hasCode('ETIMEDOUT', 'P1002', 'P2024') ||
    hasMessage(/connection timeout|timeout expired/iu)
  ) {
    detail = 'The PostgreSQL connection timed out. Check access to the Neon endpoint on port 5432.';
  } else if (
    hasCode('ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'P1001', 'P1017')
  ) {
    detail =
      'The PostgreSQL connection failed or closed. Check network access to Neon on port 5432.';
  } else if (step === 'password hashing') {
    detail =
      'Argon2 could not hash the password. Verify that the API dependencies are installed for this machine.';
  } else {
    detail = 'PostgreSQL or Prisma returned an unrecognized error.';
  }
  return `Admin CLI ${step} failed. ${detail}${
    step === 'admin insert' && !hasCode('P2002', '23505')
      ? ' Check whether the account exists before retrying.'
      : ''
  }`;
}

export function validateAdminInput(email: string, password: string): RegisterDto {
  const input = plainToInstance(RegisterDto, {
    email,
    password,
    firstName: 'Store',
    lastName: 'Administrator',
  });
  const errors = validateSync(input, { validationError: { target: false, value: false } });
  if (errors.length) {
    throw new AdminCliError(
      'Enter a valid email and a 12–128 character password with uppercase, lowercase, a number, and a symbol.',
    );
  }
  return input;
}

function askSecret(prompt: Interface, label: string): Promise<string> {
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    function onClose() {
      process.stdout.write('\n');
      reject(new AdminCliError('Admin creation cancelled.'));
    }
    prompt.once('close', onClose);
    prompt.question('', (answer) => {
      prompt.removeListener('close', onClose);
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const [emailArgument, expectedHost, expectedDatabase] = process.argv.slice(2);
  if (!emailArgument || !expectedHost || !expectedDatabase || process.argv.length !== 5) {
    throw new AdminCliError(
      'Usage: node apps/api/dist/cli/create-admin.js <email> <direct-neon-host> <database>',
    );
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new AdminCliError('Run the command in an interactive terminal for hidden input.');
  }

  const mutedOutput = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: mutedOutput,
    terminal: true,
    historySize: 0,
  });
  let cancelled = false;
  prompt.once('close', () => {
    cancelled = true;
  });
  prompt.on('SIGINT', () => prompt.close());
  let prisma: PrismaClient | undefined;
  let pool: pg.Pool | undefined;
  let step: AdminStep = 'database connection';
  const suppliedUrl = process.env.LASTDOT_ADMIN_NEON_URL;
  delete process.env.LASTDOT_ADMIN_NEON_URL;

  try {
    const target = parseNeonTarget(
      suppliedUrl ?? (await askSecret(prompt, 'Direct Neon connection URL (hidden): ')),
      expectedHost,
      expectedDatabase,
    );
    pool = new pg.Pool(target);
    // pg discards failed idle clients. Keep their raw error details out of terminal output.
    pool.on('error', () => {});
    const {
      rows: [identity],
    } = await pool.query<{ database: string; schema: string }>(
      'SELECT current_database()::text AS database, current_schema()::text AS schema',
    );
    if (identity?.database !== expectedDatabase || identity.schema !== 'public') {
      throw new AdminCliError('Connected database or schema does not match the expected target.');
    }
    prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema: 'public' }) });

    const email = emailArgument.trim().toLowerCase();
    console.log(`Verified database target: ${target.host}/${identity.database} (public)`);
    step = 'existing-account lookup';
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new AdminCliError('An account with that email already exists. No account was changed.');
    }

    const input = validateAdminInput(email, await askSecret(prompt, 'Admin password (hidden): '));
    const confirmation = await askSecret(prompt, 'Confirm password (hidden): ');
    if (input.password !== confirmation) {
      throw new AdminCliError('Passwords did not match. No account was created.');
    }

    step = 'password hashing';
    const passwordHash = await new PasswordService().hash(input.password);
    if (cancelled) throw new AdminCliError('Admin creation cancelled.');
    step = 'admin insert';
    const admin = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true },
    });
    console.log(`Created verified admin ${admin.email} (ID ${admin.id}).`);
  } catch (error) {
    if (error instanceof AdminCliError) throw error;
    if (cancelled && step !== 'admin insert') throw new AdminCliError('Admin creation cancelled.');
    throw new AdminCliError(describeAdminFailure(step, error));
  } finally {
    prompt.close();
    try {
      await prisma?.$disconnect();
    } finally {
      await pool?.end();
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    if (error instanceof AdminCliError) {
      console.error(error.message);
    } else {
      console.error('Admin CLI setup or connection cleanup failed.');
    }
    process.exitCode = 1;
  });
}
