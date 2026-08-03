import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import {
  IMAGE_STORAGE,
  type ImageStorage,
} from '../../uploads/interfaces/image-storage.interface.js';
import type {
  CreateHomepageBannerDto,
  CreateSocialLinkDto,
  PublicWebsiteSettingsResponseDto,
  UpdateHomepageBannerDto,
  UpdateSocialLinkDto,
  UpdateWebsiteSettingsDto,
} from '../dto/settings.dto.js';
import {
  HomepageBannerResponseDto,
  SocialLinkResponseDto,
  WebsiteSettingsResponseDto,
} from '../dto/settings.dto.js';
import {
  SETTINGS_REPOSITORY,
  type SettingsRepository,
} from '../interfaces/settings-repository.interface.js';
import type {
  HomepageBannerWriteInput,
  WebsiteSettingsRecord,
  WebsiteSettingsWriteInput,
} from '../interfaces/settings.interface.js';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly repository: SettingsRepository,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
    private readonly config: ConfigService,
  ) {}

  async publicSettings(): Promise<PublicWebsiteSettingsResponseDto> {
    const [settings, socialLinks, banners] = await Promise.all([
      this.current(),
      this.repository.listSocialLinks(true),
      this.repository.listBanners(true, new Date()),
    ]);
    return {
      storeName: settings.storeName,
      tagline: settings.tagline,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      storeAddress: settings.storeAddress,
      businessHours: settings.businessHours,
      announcementText: settings.announcementText,
      announcementEnabled: settings.announcementEnabled,
      cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
      instaPayEnabled: settings.instaPayEnabled,
      socialLinks: socialLinks.map((link) => SocialLinkResponseDto.from(link)),
      banners: banners.map((banner) => HomepageBannerResponseDto.from(banner)),
    };
  }

  async adminSettings(): Promise<WebsiteSettingsResponseDto> {
    return WebsiteSettingsResponseDto.from(await this.current());
  }

  async paymentSettings(): Promise<WebsiteSettingsRecord> {
    return this.current();
  }

  async updateSettings(
    input: UpdateWebsiteSettingsDto,
    actorId?: string,
  ): Promise<WebsiteSettingsResponseDto> {
    const current = await this.current();
    const next: WebsiteSettingsWriteInput = {
      storeName: input.storeName ?? current.storeName,
      tagline: input.tagline ?? current.tagline,
      contactEmail: input.contactEmail ?? current.contactEmail,
      contactPhone:
        input.contactPhone === undefined ? current.contactPhone : input.contactPhone || null,
      storeAddress:
        input.storeAddress === undefined ? current.storeAddress : input.storeAddress || null,
      businessHours: input.businessHours ?? current.businessHours,
      announcementText:
        input.announcementText === undefined
          ? current.announcementText
          : input.announcementText || null,
      announcementEnabled: input.announcementEnabled ?? current.announcementEnabled,
      cashOnDeliveryEnabled: input.cashOnDeliveryEnabled ?? current.cashOnDeliveryEnabled,
      instaPayEnabled: input.instaPayEnabled ?? current.instaPayEnabled,
      instaPayId: input.instaPayId ?? current.instaPayId,
      instaPayQrValue:
        input.instaPayQrValue === undefined
          ? current.instaPayQrValue
          : input.instaPayQrValue || null,
      instaPayInstructions: input.instaPayInstructions ?? current.instaPayInstructions,
    };
    if (!next.cashOnDeliveryEnabled && !next.instaPayEnabled) {
      throw new BadRequestException('At least one checkout payment method must remain enabled.');
    }
    if (next.announcementEnabled && !next.announcementText) {
      throw new BadRequestException(
        'Announcement text is required when the announcement is enabled.',
      );
    }
    const updated = await this.repository.upsertSettings(next);
    await this.audit(actorId, 'SETTINGS_UPDATED', { fields: Object.keys(input).sort() });
    return WebsiteSettingsResponseDto.from(updated);
  }

  async listSocialLinks(): Promise<SocialLinkResponseDto[]> {
    return (await this.repository.listSocialLinks(false)).map((link) =>
      SocialLinkResponseDto.from(link),
    );
  }

  async createSocialLink(
    input: CreateSocialLinkDto,
    actorId?: string,
  ): Promise<SocialLinkResponseDto> {
    try {
      const link = await this.repository.createSocialLink({
        platform: input.platform,
        label: input.label,
        url: input.url,
        position: input.position ?? 0,
        isActive: input.isActive ?? true,
      });
      await this.audit(actorId, 'SOCIAL_LINK_CREATED', { id: link.id, platform: link.platform });
      return SocialLinkResponseDto.from(link);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A link for this social platform already exists.');
      }
      throw error;
    }
  }

  async updateSocialLink(
    id: string,
    input: UpdateSocialLinkDto,
    actorId?: string,
  ): Promise<SocialLinkResponseDto> {
    await this.requireSocialLink(id);
    try {
      const link = await this.repository.updateSocialLink(id, input);
      if (!link) throw new NotFoundException('Social link not found.');
      await this.audit(actorId, 'SOCIAL_LINK_UPDATED', { id, fields: Object.keys(input).sort() });
      return SocialLinkResponseDto.from(link);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A link for this social platform already exists.');
      }
      throw error;
    }
  }

  async removeSocialLink(id: string, actorId?: string): Promise<void> {
    const link = await this.requireSocialLink(id);
    if (!(await this.repository.deleteSocialLink(id)))
      throw new NotFoundException('Social link not found.');
    await this.audit(actorId, 'SOCIAL_LINK_DELETED', { id, platform: link.platform });
  }

  async listBanners(): Promise<HomepageBannerResponseDto[]> {
    return (await this.repository.listBanners(false, new Date())).map((banner) =>
      HomepageBannerResponseDto.from(banner),
    );
  }

  async createBanner(
    input: CreateHomepageBannerDto,
    actorId?: string,
  ): Promise<HomepageBannerResponseDto> {
    const data: HomepageBannerWriteInput = {
      eyebrow: input.eyebrow || null,
      title: input.title,
      description: input.description || null,
      imageUrl: input.imageUrl,
      imagePublicId: input.imagePublicId || null,
      altText: input.altText,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      position: input.position ?? 0,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
    this.assertBannerWindow(data.startsAt, data.endsAt);
    const banner = await this.repository.createBanner(data);
    await this.audit(actorId, 'HOMEPAGE_BANNER_CREATED', { id: banner.id });
    return HomepageBannerResponseDto.from(banner);
  }

  async updateBanner(
    id: string,
    input: UpdateHomepageBannerDto,
    actorId?: string,
  ): Promise<HomepageBannerResponseDto> {
    const current = await this.requireBanner(id);
    const data = this.updateBannerInput(input);
    this.assertBannerWindow(
      input.startsAt === undefined ? current.startsAt : data.startsAt,
      input.endsAt === undefined ? current.endsAt : data.endsAt,
    );
    const banner = await this.repository.updateBanner(id, data);
    if (!banner) throw new NotFoundException('Homepage banner not found.');
    await this.audit(actorId, 'HOMEPAGE_BANNER_UPDATED', { id, fields: Object.keys(input).sort() });
    return HomepageBannerResponseDto.from(banner);
  }

  uploadBannerImage(file: Express.Multer.File) {
    return this.imageStorage.uploadBannerImage(file.buffer);
  }

  async removeBanner(id: string, actorId?: string): Promise<void> {
    const banner = await this.requireBanner(id);
    if (banner.imagePublicId) await this.imageStorage.deleteImage(banner.imagePublicId);
    if (!(await this.repository.deleteBanner(id)))
      throw new NotFoundException('Homepage banner not found.');
    await this.audit(actorId, 'HOMEPAGE_BANNER_DELETED', { id });
  }

  private async current(): Promise<WebsiteSettingsRecord> {
    const persisted = await this.repository.getSettings();
    if (persisted) return persisted;
    const now = new Date();
    return { id: 'store', ...this.defaults(), createdAt: now, updatedAt: now };
  }

  private defaults(): WebsiteSettingsWriteInput {
    return {
      storeName: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
      tagline: 'Modern essentials, considered for life in Egypt.',
      contactEmail: this.config.getOrThrow<string>('MAIL_FROM_EMAIL'),
      contactPhone: null,
      storeAddress: null,
      businessHours: 'Sunday-Thursday, 10:00-18:00 Cairo time',
      announcementText: null,
      announcementEnabled: false,
      cashOnDeliveryEnabled: true,
      instaPayEnabled: true,
      instaPayId: this.config.getOrThrow<string>('INSTAPAY_ID'),
      instaPayQrValue: this.config.get<string>('INSTAPAY_QR_VALUE') || null,
      instaPayInstructions: this.config.getOrThrow<string>('INSTAPAY_INSTRUCTIONS'),
    };
  }

  private async requireSocialLink(id: string) {
    const link = await this.repository.findSocialLink(id);
    if (!link) throw new NotFoundException('Social link not found.');
    return link;
  }

  private async requireBanner(id: string) {
    const banner = await this.repository.findBanner(id);
    if (!banner) throw new NotFoundException('Homepage banner not found.');
    return banner;
  }

  private updateBannerInput(input: UpdateHomepageBannerDto): Partial<HomepageBannerWriteInput> {
    return {
      ...(input.eyebrow !== undefined ? { eyebrow: input.eyebrow || null } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.imagePublicId !== undefined ? { imagePublicId: input.imagePublicId || null } : {}),
      ...(input.altText !== undefined ? { altText: input.altText } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
      ...(input.ctaUrl !== undefined ? { ctaUrl: input.ctaUrl } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.endsAt !== undefined
        ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
        : {}),
    };
  }

  private assertBannerWindow(
    startsAt: Date | null | undefined,
    endsAt: Date | null | undefined,
  ): void {
    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new BadRequestException('Banner end time must be after its start time.');
    }
  }

  private async audit(
    actorId: string | undefined,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (actorId) {
      await this.repository
        .recordAudit(actorId, action, metadata)
        .catch((error: unknown) => this.logger.error(`Audit write failed for ${action}.`, error));
    }
  }
}
