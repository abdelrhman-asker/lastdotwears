import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { SettingsRepository } from '../interfaces/settings-repository.interface.js';
import type {
  HomepageBannerRecord,
  HomepageBannerWriteInput,
  SocialLinkRecord,
  SocialLinkWriteInput,
  WebsiteSettingsRecord,
  WebsiteSettingsWriteInput,
} from '../interfaces/settings.interface.js';

const SETTINGS_ID = 'store';

@Injectable()
export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSettings(): Promise<WebsiteSettingsRecord | null> {
    return this.prisma.websiteSettings.findUnique({ where: { id: SETTINGS_ID } });
  }

  upsertSettings(input: WebsiteSettingsWriteInput): Promise<WebsiteSettingsRecord> {
    return this.prisma.websiteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...input },
      update: input,
    });
  }

  listSocialLinks(publicOnly: boolean): Promise<SocialLinkRecord[]> {
    return this.prisma.socialLink.findMany({
      where: publicOnly ? { isActive: true } : undefined,
      orderBy: [{ position: 'asc' }, { label: 'asc' }],
    });
  }

  findSocialLink(id: string): Promise<SocialLinkRecord | null> {
    return this.prisma.socialLink.findUnique({ where: { id } });
  }

  createSocialLink(input: SocialLinkWriteInput): Promise<SocialLinkRecord> {
    return this.prisma.socialLink.create({ data: input });
  }

  async updateSocialLink(
    id: string,
    input: Partial<SocialLinkWriteInput>,
  ): Promise<SocialLinkRecord | null> {
    const result = await this.prisma.socialLink.updateMany({ where: { id }, data: input });
    return result.count === 1 ? this.findSocialLink(id) : null;
  }

  async deleteSocialLink(id: string): Promise<boolean> {
    return (await this.prisma.socialLink.deleteMany({ where: { id } })).count === 1;
  }

  listBanners(publicOnly: boolean, now: Date): Promise<HomepageBannerRecord[]> {
    return this.prisma.homepageBanner.findMany({
      where: publicOnly
        ? {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          }
        : undefined,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findBanner(id: string): Promise<HomepageBannerRecord | null> {
    return this.prisma.homepageBanner.findUnique({ where: { id } });
  }

  createBanner(input: HomepageBannerWriteInput): Promise<HomepageBannerRecord> {
    return this.prisma.homepageBanner.create({ data: input });
  }

  async updateBanner(
    id: string,
    input: Partial<HomepageBannerWriteInput>,
  ): Promise<HomepageBannerRecord | null> {
    const result = await this.prisma.homepageBanner.updateMany({ where: { id }, data: input });
    return result.count === 1 ? this.findBanner(id) : null;
  }

  async deleteBanner(id: string): Promise<boolean> {
    return (await this.prisma.homepageBanner.deleteMany({ where: { id } })).count === 1;
  }

  async recordAudit(
    actorId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId, action, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}
