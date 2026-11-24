import { describeAdminFailure, parseNeonTarget, validateAdminInput } from './create-admin.js';

const host = 'ep-test-123.us-east-2.aws.neon.tech';
const database = 'shop';

describe('create-admin CLI input', () => {
  it('pins the driver to the expected direct Neon target with verified TLS', () => {
    const driverConfig = parseNeonTarget(
      `postgresql://operator:example%40password@${host}/shop?sslmode=require&channel_binding=require&host=localhost\r\n`,
      host,
      database,
    );
    expect(driverConfig).toMatchObject({
      host,
      port: 5432,
      database,
      password: 'example@password',
      ssl: { rejectUnauthorized: true, servername: host },
      enableChannelBinding: true,
    });
  });

  it.each([
    'postgresql://operator:example@localhost/shop',
    'postgresql://operator:example@ep-test-123-pooler.us-east-2.aws.neon.tech/shop',
  ])('refuses a non-direct target', (connection) => {
    expect(() => parseNeonTarget(connection, host, database)).toThrow('direct Neon PostgreSQL');
  });

  it.each([
    `postgresql://operator:example@${host}/another_database`,
    'postgresql://operator:example@ep-another.us-east-2.aws.neon.tech/shop',
  ])('refuses a different target even when it is a Neon URL', (connection) => {
    expect(() => parseNeonTarget(connection, host, database)).toThrow('does not match');
  });

  it('explains common paste and option errors without echoing the input', () => {
    const url = `postgresql://operator:example@${host}/shop`;
    expect(() => parseNeonTarget(`psql '${url}'`, host, database)).toThrow('Paste only the raw');
    expect(() => parseNeonTarget(`${url}?schema=private`, host, database)).toThrow('public schema');
    expect(() => parseNeonTarget(`${url}?sslmode=disable`, host, database)).toThrow(
      'sslmode=require',
    );
  });

  it('uses registration validation to normalize the email and reject weak passwords', () => {
    expect(validateAdminInput(' Admin@Example.test ', 'Example!123456').email).toBe(
      'admin@example.test',
    );
    expect(() => validateAdminInput('admin@example.test', 'weak-password')).toThrow(
      '12–128 character password',
    );
  });
});

describe('admin CLI diagnostics', () => {
  it.each([
    ['28P01', 'rejected the role or password'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'certificate verification failed'],
    ['ENOTFOUND', 'DNS could not resolve'],
    ['ETIMEDOUT', 'timed out'],
    ['ECONNREFUSED', 'connection failed or closed'],
    ['42501', 'lacks access'],
  ])('classifies driver error %s without exposing its message', (code, expected) => {
    const error = Object.assign(new Error('sensitive fixture'), { code });
    const message = describeAdminFailure('database connection', error);
    expect(message).toContain(expected);
    expect(message).not.toContain('sensitive fixture');
  });

  it('classifies wrapped PostgreSQL errors and Prisma unique violations', () => {
    expect(
      describeAdminFailure('existing-account lookup', { code: 'P2010', meta: { code: '42P01' } }),
    ).toContain('expected users table');
    expect(describeAdminFailure('admin insert', { code: 'P2002' })).toContain(
      'conflicting account already exists',
    );
  });

  it('keeps SCRAM error details out of the message', () => {
    const message = describeAdminFailure(
      'database connection',
      new Error('SASL: sensitive fixture'),
    );
    expect(message).toContain('channel binding negotiation failed');
    expect(message).not.toContain('sensitive fixture');
  });
});
