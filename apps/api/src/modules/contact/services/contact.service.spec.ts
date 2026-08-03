import type { MailService } from '../../mail/interfaces/mail-service.interface.js';
import type { SettingsService } from '../../settings/services/settings.service.js';
import type { ContactRepository } from '../interfaces/contact-repository.interface.js';
import type { ContactMessageRecord } from '../interfaces/contact.interface.js';
import { ContactService } from './contact.service.js';

const saved: ContactMessageRecord = {
  id: '7e65d93d-b37c-4385-93d5-a91f873b503c',
  status: 'NEW',
  name: 'Mariam Hassan',
  email: 'mariam@example.com',
  phone: null,
  orderNumber: null,
  subject: 'Sizing help',
  message: 'Could you help me choose the right size?',
  adminNote: null,
  resolvedAt: null,
  createdAt: new Date('2026-08-03T00:00:00Z'),
  updatedAt: new Date('2026-08-03T00:00:00Z'),
};

describe('ContactService', () => {
  it('persists a message even if email delivery fails', async () => {
    const repository = { create: () => Promise.resolve(saved) } as unknown as ContactRepository;
    const mail = {
      sendContactAcknowledgement: () => Promise.reject(new Error('SMTP unavailable')),
      sendContactNotification: () => Promise.reject(new Error('SMTP unavailable')),
    } as unknown as MailService;
    const settings = {
      paymentSettings: () => Promise.resolve({ contactEmail: 'care@example.com' }),
    } as unknown as SettingsService;
    const subject = new ContactService(repository, mail, settings);

    await expect(
      subject.submit({
        name: saved.name,
        email: saved.email,
        subject: saved.subject,
        message: saved.message,
      }),
    ).resolves.toEqual({ id: saved.id, message: 'Your message has been received.' });
  });

  it('records the first resolution timestamp', async () => {
    let written: { resolvedAt?: Date | null } | undefined;
    const repository = {
      findById: () => Promise.resolve(saved),
      update: (_id: string, input: { resolvedAt?: Date | null }) => {
        written = input;
        return Promise.resolve({ ...saved, status: 'RESOLVED' as const, ...input });
      },
    } as unknown as ContactRepository;
    const subject = new ContactService(repository, {} as MailService, {} as SettingsService);

    await subject.update(saved.id, { status: 'RESOLVED' });
    expect(written?.resolvedAt).toBeInstanceOf(Date);
  });
});
