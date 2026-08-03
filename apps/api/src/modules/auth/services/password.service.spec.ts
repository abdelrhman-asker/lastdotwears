import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with Argon2id and verifies the correct value', async () => {
    const hash = await service.hash('A-production-password!42');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(hash, 'A-production-password!42')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('treats malformed hashes as failed verification', async () => {
    await expect(service.verify('not-a-valid-hash', 'password')).resolves.toBe(false);
  });
});
