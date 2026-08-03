import type {
  HomepageBannerRecord,
  HomepageBannerWriteInput,
  SocialLinkRecord,
  SocialLinkWriteInput,
  WebsiteSettingsRecord,
  WebsiteSettingsWriteInput,
} from './settings.interface.js';

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface SettingsRepository {
  getSettings(): Promise<WebsiteSettingsRecord | null>;
  upsertSettings(input: WebsiteSettingsWriteInput): Promise<WebsiteSettingsRecord>;
  listSocialLinks(publicOnly: boolean): Promise<SocialLinkRecord[]>;
  findSocialLink(id: string): Promise<SocialLinkRecord | null>;
  createSocialLink(input: SocialLinkWriteInput): Promise<SocialLinkRecord>;
  updateSocialLink(
    id: string,
    input: Partial<SocialLinkWriteInput>,
  ): Promise<SocialLinkRecord | null>;
  deleteSocialLink(id: string): Promise<boolean>;
  listBanners(publicOnly: boolean, now: Date): Promise<HomepageBannerRecord[]>;
  findBanner(id: string): Promise<HomepageBannerRecord | null>;
  createBanner(input: HomepageBannerWriteInput): Promise<HomepageBannerRecord>;
  updateBanner(
    id: string,
    input: Partial<HomepageBannerWriteInput>,
  ): Promise<HomepageBannerRecord | null>;
  deleteBanner(id: string): Promise<boolean>;
  recordAudit(actorId: string, action: string, metadata: Record<string, unknown>): Promise<void>;
}
