import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, rmdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer as createTlsServer } from 'node:tls';
import { fileURLToPath } from 'node:url';

const support = 'support@last-dot.com';
const customer = 'contact-fixture@example.test';
const fixturePassword = 'local-smtp-fixture-password';
const fixtureDatabaseUrl = 'postgresql://fixture:fixture@127.0.0.1:1/fixture';
const message = {
  name: 'Contact Fixture',
  email: customer,
  phone: '+20 1000000000',
  subject: 'Sizing question',
  message: 'This private fixture asks about sizing.',
};

if (process.argv.includes('--application')) {
  assert.equal(process.env.DATABASE_URL, fixtureDatabaseUrl);
  assert.equal(typeof process.send, 'function');
  const { PrismaContactRepository } =
    await import('../dist/modules/contact/repositories/prisma-contact.repository.js');
  PrismaContactRepository.prototype.create = async function (input) {
    const now = new Date();
    const id = randomUUID();
    process.send({ event: 'fixture.saved', id });
    return {
      ...input,
      id,
      status: 'NEW',
      adminNote: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  };
  await import('../dist/main.js');
} else {
  await run();
}

async function run() {
  const implicitPort = process.argv.includes('--implicit-port');
  const directory = mkdtempSync(join(tmpdir(), 'lastdot-contact-smtp-'));
  const key = join(directory, 'key.pem');
  const cert = join(directory, 'cert.pem');
  const messages = [];
  const rejections = [];
  const saved = new Set();
  const sockets = new Set();
  let rejectedRecipient;
  let smtp;
  let app;
  try {
    execFileSync(
      process.env.OPENSSL_BIN || 'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=IP:127.0.0.1',
        '-keyout',
        key,
        '-out',
        cert,
      ],
      { stdio: 'ignore' },
    );

    smtp = createTlsServer({ key: readFileSync(key), cert: readFileSync(cert) }, (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
      socket.on('error', () => {});
      socket.setEncoding('utf8');
      socket.write('220 contact-fixture ESMTP\r\n');
      let buffer = '';
      let authenticated = false;
      let sender;
      let recipient;
      let data;
      socket.on('data', (chunk) => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf('\r\n')) !== -1) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (data) {
            if (line === '.') {
              const accepted = { sender, recipient, raw: data.join('\r\n') };
              data = undefined;
              setTimeout(() => {
                messages.push(accepted);
                socket.write('250 2.0.0 Fixture accepted\r\n');
              }, 200);
            } else data.push(line);
          } else if (line.startsWith('EHLO ')) {
            socket.write('250-contact-fixture\r\n250 AUTH PLAIN\r\n');
          } else if (line.startsWith('AUTH PLAIN ')) {
            const [, user, password] = Buffer.from(line.slice(11), 'base64').toString().split('\0');
            authenticated = user === support && password === fixturePassword;
            socket.write(authenticated ? '235 Authentication successful\r\n' : '535 Rejected\r\n');
          } else if (authenticated && line.startsWith('MAIL FROM:')) {
            sender = /<([^>]+)>/u.exec(line)?.[1];
            socket.write('250 OK\r\n');
          } else if (authenticated && line.startsWith('RCPT TO:')) {
            recipient = /<([^>]+)>/u.exec(line)?.[1];
            if (recipient === rejectedRecipient) {
              rejections.push(recipient);
              socket.write('550 5.1.1 Fixture recipient rejected\r\n');
            } else socket.write('250 OK\r\n');
          } else if (authenticated && line === 'DATA') {
            data = [];
            socket.write('354 End with a dot\r\n');
          } else if (line === 'QUIT') {
            socket.end('221 Goodbye\r\n');
          } else socket.write('503 Unexpected command\r\n');
        }
      });
    });
    smtp.on('tlsClientError', () => {});
    await listen(smtp, implicitPort ? 465 : 0);

    const probe = createServer();
    await listen(probe, 0);
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    const env = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      NODE_EXTRA_CA_CERTS: cert,
      NODE_ENV: 'production',
      PORT: String(port),
      API_PREFIX: 'api/v1',
      DATABASE_URL: fixtureDatabaseUrl,
      WEB_APP_URL: 'http://127.0.0.1:' + port,
      COOKIE_SECRET: 'c'.repeat(48),
      JWT_ACCESS_SECRET: 'j'.repeat(80),
      REFRESH_TOKEN_PEPPER: 'r'.repeat(80),
      ONE_TIME_TOKEN_PEPPER: 't'.repeat(80),
      STORAGE_PROVIDER: 'local',
      UPLOAD_ROOT: directory,
      SWAGGER_ENABLED: 'true',
      LOG_LEVEL: 'info',
      MAIL_TRANSPORT: 'smtp',
      MAIL_FROM_NAME: 'Contact Fixture',
      MAIL_FROM_EMAIL: support,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.address().port),
      ...(implicitPort ? {} : { SMTP_SECURE: 'true' }),
      SUPPORT_SMTP_USER: support,
      SUPPORT_SMTP_PASSWORD: fixturePassword,
      SUPPORT_MAIL_FROM_EMAIL: support,
      SUPPORT_NOTIFICATION_EMAIL: support,
    };
    app = spawn(process.execPath, [fileURLToPath(import.meta.url), '--application'], {
      cwd: directory,
      env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });
    let logs = '';
    app.stdout.setEncoding('utf8').on('data', (line) => {
      logs += line;
    });
    app.stderr.setEncoding('utf8').on('data', (line) => {
      logs += line;
    });
    app.on('message', (event) => {
      if (event.event === 'fixture.saved') saved.add(event.id);
    });
    const base = 'http://127.0.0.1:' + port;
    await waitForStartup(app, base);
    const docs = await fetch(base + '/docs/openapi.json').then((response) => response.json());
    assert.ok(docs.paths['/api/v1/contact'].post, 'Compiled Swagger is missing the contact route');

    async function submit() {
      const response = await fetch(base + '/api/v1/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(response.status, 201);
      const { id } = await response.json();
      assert.ok(saved.has(id), 'Contact repository must be called before the HTTP response');
      return id;
    }

    const firstId = await submit();
    assert.equal(messages.length, 2, 'HTTP response must follow both SMTP attempts');
    const notification = messages.find((entry) => entry.recipient === support);
    const acknowledgment = messages.find((entry) => entry.recipient === customer);
    assert.ok(
      notification && acknowledgment,
      'Expected one support notification and one customer acknowledgment',
    );
    assert.equal(notification.sender, support);
    assert.equal(acknowledgment.sender, support);
    assert.match(notification.raw, /^From: .*<support@last-dot\.com>/mu);
    assert.match(notification.raw, /^Reply-To: contact-fixture@example\.test\r?$/mu);
    assert.match(notification.raw, /This private fixture asks about sizing\./u);
    assert.match(acknowledgment.raw, /^From: .*<support@last-dot\.com>/mu);
    assert.match(acknowledgment.raw, /We received your message/u);

    for (const rejected of [customer, support]) {
      rejectedRecipient = rejected;
      const before = messages.length;
      await submit();
      assert.equal(
        messages.length,
        before + 1,
        'A rejected recipient must not prevent the other send',
      );
      assert.notEqual(messages.at(-1).recipient, rejected);
    }
    assert.deepEqual(rejections, [customer, support]);
    assert.equal(saved.size, 3);
    await delay(100);
    const entries = logs
      .split(/\r?\n/u)
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line));
    for (const expected of [
      'mail.transport.initialized',
      'contact.message.saved',
      'contact.email.started',
      'mail.transport.selected',
      'mail.smtp.accepted',
      'mail.smtp.rejected',
      'contact.email.failed',
    ])
      assert.ok(
        entries.some((entry) => entry.event === expected),
        'Missing structured event ' + expected,
      );
    assert.ok(
      entries.some(
        (entry) => entry.event === 'contact.message.saved' && entry.contactMessageId === firstId,
      ),
    );
    assert.ok(
      entries.some(
        (entry) =>
          entry.event === 'mail.transport.selected' &&
          entry.channel === 'support' &&
          entry.transport === 'smtp',
      ),
    );
    assert.equal(
      entries.filter(
        (entry) =>
          entry.event === 'mail.smtp.rejected' &&
          entry.code === 'EENVELOPE' &&
          entry.responseCode === 550,
      ).length,
      2,
    );
    for (const privateValue of [fixturePassword, message.message, message.subject, customer]) {
      assert.ok(!logs.includes(privateValue), 'A private value reached the application logs');
    }
    console.log(
      JSON.stringify({
        node: process.version,
        implicitPort,
        submitted: saved.size,
        firstSubmissionMessages: 2,
        independentRejections: rejections.length,
        sanitizedLogs: true,
        swagger: true,
      }),
    );
  } finally {
    if (app && app.exitCode === null) {
      app.kill();
      await once(app, 'exit');
    }
    for (const socket of sockets) socket.destroy();
    if (smtp?.listening) await new Promise((resolve) => smtp.close(resolve));
    rmSync(key, { force: true });
    rmSync(cert, { force: true });
    rmdirSync(directory);
  }
}

function listen(server, port) {
  server.listen(port, '127.0.0.1');
  return once(server, 'listening');
}

async function waitForStartup(app, base) {
  for (let attempt = 0; attempt < 140 && app.exitCode === null; attempt += 1) {
    try {
      const response = await fetch(base + '/api/v1/health/live', {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // The compiled process may still be loading dependencies.
    }
    await delay(500);
  }
  throw new Error('Compiled API did not become live');
}
