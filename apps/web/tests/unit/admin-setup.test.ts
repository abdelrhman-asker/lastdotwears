import { afterEach, describe, expect, it, vi } from 'vitest';

import AdminSetupPage, { metadata } from '@/app/admin/setup/page';
import { adminSetupEmail, adminSetupSchema } from '@/lib/validation/auth';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/lib/env/server', () => ({
  getServerEnvironment: () => ({ INTERNAL_API_URL: 'http://api.test/api/v1' }),
}));

afterEach(() => vi.unstubAllGlobals());

describe('admin setup page', () => {
  it('does not render the form if the API disables setup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(AdminSetupPage()).rejects.toThrow('NOT_FOUND');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/admin/setup/status',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('renders an unindexed page when setup is available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(AdminSetupPage()).resolves.toBeTruthy();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('limits the form to the intended email and matching strong passwords', () => {
    const input = {
      email: adminSetupEmail.toUpperCase(),
      password: 'Secure-test-password42!',
      confirmPassword: 'Secure-test-password42!',
      setupSecret: '12ab'.repeat(16),
    };
    expect(adminSetupSchema.parse(input).email).toBe(adminSetupEmail);
    expect(adminSetupSchema.safeParse({ ...input, email: 'someone@example.com' }).success).toBe(
      false,
    );
    expect(adminSetupSchema.safeParse({ ...input, confirmPassword: 'different' }).success).toBe(
      false,
    );
  });
});
