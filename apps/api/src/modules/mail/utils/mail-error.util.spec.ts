import { mailErrorDetails } from './mail-error.util.js';

describe('mailErrorDetails', () => {
  it('keeps safe SMTP diagnostics and omits raw error messages', () => {
    const error = Object.assign(new Error('Login failed with password super-secret'), {
      code: 'EAUTH',
      command: 'AUTH PLAIN',
      responseCode: 535,
    });

    const details = mailErrorDetails(error);

    expect(details).toContain('EAUTH');
    expect(details).toContain('AUTH PLAIN');
    expect(details).toContain('535');
    expect(details).not.toContain('super-secret');
    expect(details).not.toContain(error.message);
  });
});
