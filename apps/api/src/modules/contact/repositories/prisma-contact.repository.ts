import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type {
  ContactRepository,
  CreateContactMessageInput,
} from '../interfaces/contact-repository.interface.js';
import type {
  ContactListQuery,
  ContactMessageRecord,
  ContactStatus,
} from '../interfaces/contact.interface.js';

@Injectable()
export class PrismaContactRepository implements ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateContactMessageInput): Promise<ContactMessageRecord> {
    return this.prisma.contactMessage.create({ data: input });
  }

  async list(query: ContactListQuery): Promise<{ items: ContactMessageRecord[]; total: number }> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { subject: { contains: query.search, mode: 'insensitive' as const } },
              { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<ContactMessageRecord | null> {
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }

  async update(
    id: string,
    input: { status?: ContactStatus; adminNote?: string | null; resolvedAt?: Date | null },
  ): Promise<ContactMessageRecord | null> {
    const result = await this.prisma.contactMessage.updateMany({ where: { id }, data: input });
    return result.count === 1 ? this.findById(id) : null;
  }
}
