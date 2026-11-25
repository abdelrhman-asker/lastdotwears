import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
import { mailErrorMetadata } from '../../mail/utils/mail-error.util.js';
import type {
  AdminContactListQueryDto,
  ContactSubmissionResponseDto,
  CreateContactMessageDto,
  PaginatedContactMessagesResponseDto,
  UpdateContactMessageDto,
} from '../dto/contact.dto.js';
import { ContactMessageResponseDto } from '../dto/contact.dto.js';
import {
  CONTACT_REPOSITORY,
  type ContactRepository,
} from '../interfaces/contact-repository.interface.js';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(CONTACT_REPOSITORY) private readonly repository: ContactRepository,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {}

  async submit(input: CreateContactMessageDto): Promise<ContactSubmissionResponseDto> {
    const saved = await this.repository.create({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      orderNumber: input.orderNumber || null,
      subject: input.subject,
      message: input.message,
    });
    this.logger.log({ event: 'contact.message.saved', contactMessageId: saved.id });
    const firstName = saved.name.split(/\s+/)[0] || saved.name;
    await Promise.all([
      this.deliver(saved.id, 'acknowledgment', () =>
        this.mail.sendContactAcknowledgement({ email: saved.email, firstName }, saved.subject),
      ),
      this.deliver(saved.id, 'notification', () =>
        this.mail.sendContactNotification({
          name: saved.name,
          email: saved.email,
          phone: saved.phone,
          subject: saved.subject,
          body: saved.message,
          submittedAt: saved.createdAt,
        }),
      ),
    ]);
    return { id: saved.id, message: 'Your message has been received.' };
  }

  private async deliver(
    contactMessageId: string,
    delivery: 'acknowledgment' | 'notification',
    send: () => Promise<void>,
  ): Promise<void> {
    this.logger.log({ event: 'contact.email.started', contactMessageId, delivery });
    try {
      await send();
    } catch (error) {
      this.logger.error({
        event: 'contact.email.failed',
        contactMessageId,
        delivery,
        ...mailErrorMetadata(error),
      });
    }
  }

  async list(query: AdminContactListQueryDto): Promise<PaginatedContactMessagesResponseDto> {
    const result = await this.repository.list({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
    return {
      items: result.items.map((message) => ContactMessageResponseDto.from(message)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async get(id: string): Promise<ContactMessageResponseDto> {
    const message = await this.repository.findById(id);
    if (!message) throw new NotFoundException('Contact message not found.');
    return ContactMessageResponseDto.from(message);
  }

  async update(id: string, input: UpdateContactMessageDto): Promise<ContactMessageResponseDto> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contact message not found.');
    const status = input.status ?? current.status;
    const updated = await this.repository.update(id, {
      ...(input.status ? { status } : {}),
      ...(input.adminNote !== undefined ? { adminNote: input.adminNote || null } : {}),
      resolvedAt: status === 'RESOLVED' ? (current.resolvedAt ?? new Date()) : null,
    });
    if (!updated) throw new NotFoundException('Contact message not found.');
    return ContactMessageResponseDto.from(updated);
  }
}
