import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ProductImageFilePipe } from '../../uploads/pipes/product-image-file.pipe.js';
import {
  BannerImageUploadResponseDto,
  CreateHomepageBannerDto,
  CreateSocialLinkDto,
  HomepageBannerResponseDto,
  SocialLinkResponseDto,
  UpdateHomepageBannerDto,
  UpdateSocialLinkDto,
  UpdateWebsiteSettingsDto,
  WebsiteSettingsResponseDto,
} from '../dto/settings.dto.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('Admin Website Settings')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOkResponse({ type: WebsiteSettingsResponseDto })
  get(): Promise<WebsiteSettingsResponseDto> {
    return this.service.adminSettings();
  }

  @Patch()
  @ApiOkResponse({ type: WebsiteSettingsResponseDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: UpdateWebsiteSettingsDto,
  ): Promise<WebsiteSettingsResponseDto> {
    return this.service.updateSettings(input, actor.id);
  }

  @Get('social-links')
  @ApiOkResponse({ type: [SocialLinkResponseDto] })
  socialLinks(): Promise<SocialLinkResponseDto[]> {
    return this.service.listSocialLinks();
  }

  @Post('social-links')
  @ApiOkResponse({ type: SocialLinkResponseDto })
  createSocialLink(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateSocialLinkDto,
  ): Promise<SocialLinkResponseDto> {
    return this.service.createSocialLink(input, actor.id);
  }

  @Patch('social-links/:id')
  @ApiOkResponse({ type: SocialLinkResponseDto })
  updateSocialLink(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateSocialLinkDto,
  ): Promise<SocialLinkResponseDto> {
    return this.service.updateSocialLink(id, input, actor.id);
  }

  @Delete('social-links/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  removeSocialLink(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.removeSocialLink(id, actor.id);
  }

  @Get('banners')
  @ApiOkResponse({ type: [HomepageBannerResponseDto] })
  banners(): Promise<HomepageBannerResponseDto[]> {
    return this.service.listBanners();
  }

  @Post('banners')
  @ApiOkResponse({ type: HomepageBannerResponseDto })
  createBanner(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateHomepageBannerDto,
  ): Promise<HomepageBannerResponseDto> {
    return this.service.createBanner(input, actor.id);
  }

  @Patch('banners/:id')
  @ApiOkResponse({ type: HomepageBannerResponseDto })
  updateBanner(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateHomepageBannerDto,
  ): Promise<HomepageBannerResponseDto> {
    return this.service.updateBanner(id, input, actor.id);
  }

  @Delete('banners/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  removeBanner(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.removeBanner(id, actor.id);
  }

  @Post('banner-images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20_000_000, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: BannerImageUploadResponseDto })
  uploadBannerImage(
    @UploadedFile(ProductImageFilePipe) file: Express.Multer.File,
  ): Promise<BannerImageUploadResponseDto> {
    return this.service.uploadBannerImage(file);
  }
}
