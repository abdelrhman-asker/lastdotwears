import type { ContactListQuery, ContactMessageRecord, ContactStatus } from './contact.interface.js';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export interface CreateContactMessageInput {
  name: string;
  email: string;
  phone: string | null;
  orderNumber: string | null;
  subject: string;
  message: string;
}

export interface ContactRepository {
  create(input: CreateContactMessageInput): Promise<ContactMessageRecord>;
  list(query: ContactListQuery): Promise<{ items: ContactMessageRecord[]; total: number }>;
  findById(id: string): Promise<ContactMessageRecord | null>;
  update(
    id: string,
    input: { status?: ContactStatus; adminNote?: string | null; resolvedAt?: Date | null },
  ): Promise<ContactMessageRecord | null>;
}
