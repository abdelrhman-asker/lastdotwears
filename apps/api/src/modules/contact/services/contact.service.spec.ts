import type {
  ContactMailDetails,
  MailRecipient,
  MailService,
} from '../../mail/interfaces/mail-service.interface.js';
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

function deferred() {
  let complete!: () => void;
  const promise = new Promise<void>((resolve) => {
    complete = resolve;
  });
  return { promise, resolve: complete };
}

describe('ContactService', () => {
  it('waits for both delivery attempts after persistence', async () => {
    const repository = { create: () => Promise.resolve(saved) } as unknown as ContactRepository;
    const acknowledgment = deferred();
    const notification = deferred();
    const started = deferred();
    const mail = {
      sendContactAcknowledgement: () => acknowledgment.promise,
      sendContactNotification: () => {
        started.resolve();
        return notification.promise;
      },
    } as unknown as MailService;
    const subject = new ContactService(repository, mail);
    let completed = false;
    const response = subject
      .submit({
        name: saved.name,
        email: saved.email,
        subject: saved.subject,
        message: saved.message,
      })
      .then((result) => {
        completed = true;
        return result;
      });
    await started.promise;
    acknowledgment.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(completed).toBe(false);
    notification.resolve();
    await expect(response).resolves.toEqual({
      id: saved.id,
      message: 'Your message has been received.',
    });
  });

  it.each(['notification', 'acknowledgment'])(
    'preserves the saved message and attempts both sends when %s fails',
    async (failure) => {
      const events: string[] = [];
      const repository = {
        create: () => {
          events.push('saved');
          return Promise.resolve(saved);
        },
      } as unknown as ContactRepository;
      const mail = {
        sendContactAcknowledgement: (recipient: MailRecipient, subject: string) => {
          events.push('acknowledgment');
          expect(recipient).toEqual({ email: saved.email, firstName: 'Mariam' });
          expect(subject).toBe(saved.subject);
          if (failure === 'acknowledgment') throw new Error('Fixture failure');
          return Promise.resolve();
        },
        sendContactNotification: (message: ContactMailDetails) => {
          events.push('notification');
          expect(message).toEqual({
            name: saved.name,
            email: saved.email,
            phone: saved.phone,
            subject: saved.subject,
            body: saved.message,
            submittedAt: saved.createdAt,
          });
          return failure === 'notification'
            ? Promise.reject(new Error('Fixture failure'))
            : Promise.resolve();
        },
      } as unknown as MailService;
      const subject = new ContactService(repository, mail);
      await expect(
        subject.submit({
          name: saved.name,
          email: saved.email,
          subject: saved.subject,
          message: saved.message,
        }),
      ).resolves.toEqual({ id: saved.id, message: 'Your message has been received.' });
      expect(events).toEqual(['saved', 'acknowledgment', 'notification']);
    },
  );

  it('records the first resolution timestamp', async () => {
    let written: { resolvedAt?: Date | null } | undefined;
    const repository = {
      findById: () => Promise.resolve(saved),
      update: (_id: string, input: { resolvedAt?: Date | null }) => {
        written = input;
        return Promise.resolve({ ...saved, status: 'RESOLVED' as const, ...input });
      },
    } as unknown as ContactRepository;
    const subject = new ContactService(repository, {} as MailService);

    await subject.update(saved.id, { status: 'RESOLVED' });
    expect(written?.resolvedAt).toBeInstanceOf(Date);
  });
});
