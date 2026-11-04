import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
import { mailErrorDetails } from '../../mail/utils/mail-error.util.js';
import { SettingsService } from '../../settings/services/settings.service.js';
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
    private readonly settings: SettingsService,
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
    const website = await this.settings.paymentSettings();
    const firstName = input.name.split(/\s+/)[0] || input.name;
    void Promise.allSettled([
      this.mail.sendContactAcknowledgement({ email: input.email, firstName }, input.subject),
      this.mail.sendContactNotification(website.contactEmail, {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        subject: input.subject,
        body: input.message,
      }),
    ]).then((results) => {
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (failures.length > 0) {
        const details = failures.map((failure) => mailErrorDetails(failure.reason)).join('; ');
        this.logger.error(
          `Contact email delivery failed for message ${saved.id} (${failures.length}/2): ${details}`,
        );
      }
    });
    return { id: saved.id, message: 'Your message has been received.' };
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
