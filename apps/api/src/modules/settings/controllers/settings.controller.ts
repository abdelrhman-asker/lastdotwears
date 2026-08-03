import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import { PublicWebsiteSettingsResponseDto } from '../dto/settings.dto.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('Website Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Public()
  @ApiOkResponse({ type: PublicWebsiteSettingsResponseDto })
  get(): Promise<PublicWebsiteSettingsResponseDto> {
    return this.service.publicSettings();
  }
}
